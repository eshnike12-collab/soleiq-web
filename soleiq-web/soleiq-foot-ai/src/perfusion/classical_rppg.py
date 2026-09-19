"""Classical rPPG baselines: CHROM, POS, and green-channel.

These are the Phase 0 yardstick. Any learned model we build later has to
beat them on held-out clips or it is not worth shipping.

Methods
-------
green   Simplest possible baseline. Haemoglobin absorbs green strongly, so
        the green channel carries the most blood-volume modulation of the
        three. It also carries the most motion and illumination artifact,
        because nothing separates them out.

CHROM   De Haan & Jeanne (2013), "Robust pulse rate from chrominance-based
        rPPG". Projects normalised RGB onto two chrominance axes chosen so
        that the specular (motion) component cancels:
            Xs = 3Rn - 2Gn
            Ys = 1.5Rn + Gn - 1.5Bn
        then combines them as S = Xf - alpha*Yf with alpha = std(Xf)/std(Yf),
        which cancels the residual motion under a standardised skin-tone
        assumption. Applied in 1.6 s windows with 50% overlap-add.

POS     Wang et al. (2017), "Algorithmic Principles of Remote PPG". Same
        idea, different plane: projects temporally-normalised RGB onto the
        plane *orthogonal* to the skin-tone vector,
            P = [[0, 1, -1], [-2, 1, 1]]
        then alpha-tunes the two projections against each other. Generally
        the strongest of the three under motion, and the usual default in
        recent literature.

Shared preprocessing
--------------------
Detrending, then a 1st-order Butterworth bandpass at 0.75-2.5 Hz applied
with `filtfilt` (zero phase). The band and the filter order are the same
ones MetaPhys uses to filter its PPG labels — `butter(1, [0.75/fs*2,
2.5/fs*2], 'bandpass')` — so a Phase 0 signal and a Phase 2 label live in
the same band by construction.

Default detrending is smoothness priors (Tarvainen et al. 2002) rather
than a linear fit: the baseline wander in a hand-held foot clip is a slow
curve from auto-exposure and postural drift, not a straight line, and a
linear detrend leaves most of it behind for the bandpass to fight.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

import numpy as np
from scipy import sparse
from scipy.signal import butter, filtfilt, get_window, periodogram, welch
from scipy.sparse.linalg import spsolve

_EPS = 1e-12


@dataclass
class SignalParams:
    """Everything in config.yaml `perfusion.signal`, in one object."""

    pulse_band_hz: Tuple[float, float] = (0.75, 2.5)
    snr_band_hz: Tuple[float, float] = (0.70, 4.0)
    butter_order: int = 1
    detrend: str = "smoothness_priors"
    detrend_lambda: float = 100.0
    window_s: float = 1.6
    welch_segment_s: float = 8.0
    welch_overlap: float = 0.5
    welch_nfft: int = 4096
    harmonic_halfwidth_hz: float = 0.1
    methods: Tuple[str, ...] = ("chrom", "pos", "green")

    @classmethod
    def from_config(cls, cfg: Any) -> "SignalParams":
        s = dict(cfg["perfusion"]["signal"])
        return cls(
            pulse_band_hz=tuple(s["pulse_band_hz"]),
            snr_band_hz=tuple(s["snr_band_hz"]),
            butter_order=int(s["butter_order"]),
            detrend=str(s["detrend"]),
            detrend_lambda=float(s["detrend_lambda"]),
            window_s=float(s["window_s"]),
            welch_segment_s=float(s["welch_segment_s"]),
            welch_overlap=float(s["welch_overlap"]),
            welch_nfft=int(s["welch_nfft"]),
            harmonic_halfwidth_hz=float(s["harmonic_halfwidth_hz"]),
            methods=tuple(s["methods"]),
        )


@dataclass
class PulseSignal:
    """A pulse waveform plus the two spectra it is measured from.

    Two spectral estimates, deliberately, because peak *location* and peak
    *sharpness* want opposite things:

      welch (freqs/psd)      Segment-averaged and zero-padded. Low variance,
                             so the argmax is stable — this is what locates
                             the rate, and what gets plotted.
      periodogram (snr_*)    Full-length, single Hann window, no padding.
                             Higher variance but the harmonic peaks stay
                             sharp, which is what an SNR ratio needs.

    Measured on synthetic signals: the zero-padded Welch estimate saturates
    around +6.7 dB — a noiseless tone and a tone at 3x the noise amplitude
    both read ~6.5 dB, because Hann leakage spread across ~450 zero-padded
    noise bins swamps the ~27-bin signal template. The periodogram scores
    those same two cases at +inf and +17.9 dB. Using Welch for SNR would
    compress every strong signal into a single indistinguishable band.
    """

    method: str
    signal: np.ndarray            # [T] detrended + bandpassed
    fs: float
    freqs: np.ndarray             # [F] Hz (Welch), restricted to snr_band
    psd: np.ndarray               # [F] power (Welch)
    snr_freqs: np.ndarray         # [G] Hz (periodogram), restricted to snr_band
    snr_psd: np.ndarray           # [G] power (periodogram)
    peak_hz: float
    pulse_rate_bpm: float
    freq_resolution_hz: float     # TRUE resolution (fs/nperseg), not the
                                  # zero-padded grid spacing
    welch_nperseg: int
    notes: List[str]

    def to_dict(self) -> dict:
        return {
            "method": self.method,
            "pulse_rate_bpm": float(self.pulse_rate_bpm),
            "peak_hz": float(self.peak_hz),
            "freq_resolution_hz": float(self.freq_resolution_hz),
            "welch_nperseg": int(self.welch_nperseg),
            "n_samples": int(self.signal.size),
            "notes": list(self.notes),
        }


# --------------------------------------------------------------------------
# Preprocessing primitives
# --------------------------------------------------------------------------

def detrend_smoothness_priors(x: np.ndarray, lam: float = 100.0) -> np.ndarray:
    """Tarvainen et al. (2002) smoothness-priors detrending.

        z_stat = (I - (I + lam^2 * D2' D2)^-1) z

    D2 is the second-order difference operator, so the removed trend is the
    smoothest curve that still tracks the data. Larger `lam` removes only
    slower components (a higher-pass effect). Built sparse and solved with
    a banded solver — the dense form is an N x N inverse and N is ~900.
    """
    x = np.asarray(x, dtype=np.float64).ravel()
    n = x.size
    if n < 3:
        return x - x.mean()

    ones = np.ones(n)
    d2 = sparse.spdiags(
        np.vstack([ones, -2.0 * ones, ones]), [0, 1, 2], n - 2, n, format="csc"
    )
    a = sparse.eye(n, format="csc") + (lam ** 2) * (d2.T @ d2)
    trend = spsolve(a.tocsc(), x)
    return x - trend


def detrend_signal(x: np.ndarray, kind: str = "smoothness_priors",
                   lam: float = 100.0) -> np.ndarray:
    """Dispatch detrending by name. `kind` in {smoothness_priors, linear, none}."""
    x = np.asarray(x, dtype=np.float64).ravel()
    if kind == "smoothness_priors":
        return detrend_smoothness_priors(x, lam)
    if kind == "linear":
        t = np.arange(x.size, dtype=np.float64)
        coeffs = np.polyfit(t, x, 1)
        return x - np.polyval(coeffs, t)
    if kind == "none":
        return x - x.mean()
    raise ValueError(f"unknown detrend kind: {kind!r}")


def bandpass(
    x: np.ndarray,
    fs: float,
    lo: float = 0.75,
    hi: float = 2.5,
    order: int = 1,
) -> np.ndarray:
    """Zero-phase Butterworth bandpass. Same band/order as the MetaPhys labels.

    Returns the input unchanged (mean-removed) when the clip is too short
    for `filtfilt`'s edge padding, rather than raising — a caller measuring
    a 2 s clip should get a useless-but-finite answer and a quality flag,
    not a traceback.
    """
    x = np.asarray(x, dtype=np.float64).ravel()
    nyq = fs / 2.0
    lo_n = max(lo / nyq, 1e-6)
    hi_n = min(hi / nyq, 0.999)
    if not (0 < lo_n < hi_n < 1):
        return x - x.mean()

    b, a = butter(order, [lo_n, hi_n], btype="bandpass")
    padlen = 3 * max(len(a), len(b))
    if x.size <= padlen:
        return x - x.mean()
    return filtfilt(b, a, x)


def welch_psd(
    x: np.ndarray,
    fs: float,
    segment_s: float = 8.0,
    overlap: float = 0.5,
    nfft: int = 4096,
    band: Optional[Sequence[float]] = None,
) -> Tuple[np.ndarray, np.ndarray, int]:
    """Welch PSD, optionally restricted to `band`. Returns (freqs, psd, nperseg).

    `nfft` zero-pads for a visually smooth curve. It does NOT create
    resolution — the real resolution is fs/nperseg and callers report it.
    """
    x = np.asarray(x, dtype=np.float64).ravel()
    nperseg = int(min(x.size, max(16, round(segment_s * fs))))
    noverlap = int(nperseg * float(overlap))
    f, p = welch(
        x,
        fs=fs,
        nperseg=nperseg,
        noverlap=min(noverlap, nperseg - 1),
        nfft=max(nfft, nperseg),
        detrend=False,
        scaling="density",
    )
    if band is not None:
        sel = (f >= band[0]) & (f <= band[1])
        f, p = f[sel], p[sel]
    return f, p, nperseg


def snr_spectrum(
    x: np.ndarray, fs: float, band: Optional[Sequence[float]] = None
) -> Tuple[np.ndarray, np.ndarray]:
    """Full-length Hann periodogram, for SNR only.

    No segment averaging and no zero-padding: both smear the harmonic peaks
    that the SNR template is trying to isolate, and the smearing is what
    caps the Welch-based estimate at ~6.7 dB regardless of true signal
    strength. Resolution here is fs/N — the best the clip length allows.
    """
    x = np.asarray(x, dtype=np.float64).ravel()
    if x.size < 8:
        return np.zeros(0), np.zeros(0)
    f, p = periodogram(x, fs=fs, window="hann", nfft=x.size, detrend=False)
    if band is not None:
        sel = (f >= band[0]) & (f <= band[1])
        f, p = f[sel], p[sel]
    return f, p


def peak_frequency(
    freqs: np.ndarray, psd: np.ndarray, band: Sequence[float]
) -> Tuple[float, float]:
    """Dominant frequency inside `band`, with parabolic sub-bin refinement.

    Returns (peak_hz, peak_power). (0.0, 0.0) if the band is empty.
    """
    sel = (freqs >= band[0]) & (freqs <= band[1])
    if not np.any(sel):
        return 0.0, 0.0
    f_b, p_b = freqs[sel], psd[sel]
    i = int(np.argmax(p_b))
    peak_f, peak_p = float(f_b[i]), float(p_b[i])

    # Parabolic interpolation on log power. Matters when nfft is small; a
    # no-op in practice on a heavily zero-padded grid.
    if 0 < i < len(p_b) - 1:
        y0, y1, y2 = np.log(np.maximum(p_b[i - 1: i + 2], _EPS))
        denom = y0 - 2.0 * y1 + y2
        if abs(denom) > _EPS:
            delta = 0.5 * (y0 - y2) / denom
            if abs(delta) <= 1.0:
                step = float(f_b[i + 1] - f_b[i])
                peak_f = float(f_b[i] + delta * step)
    return peak_f, peak_p


# --------------------------------------------------------------------------
# The three methods. Each takes [T, 3] RGB and returns an unfiltered [T]
# pulse estimate; shared post-filtering happens in extract_pulse().
# --------------------------------------------------------------------------

def _temporal_normalize(c: np.ndarray) -> np.ndarray:
    """Divide each channel by its temporal mean over the window."""
    mu = c.mean(axis=0)
    mu = np.where(np.abs(mu) < _EPS, _EPS, mu)
    return c / mu


def green(rgb: np.ndarray, fs: float, params: SignalParams) -> np.ndarray:
    """Green-channel baseline.

    Negated so the waveform peaks at systole: more blood volume means more
    green absorbed, hence *less* reflected. Polarity is cosmetic — the PSD
    and every metric downstream are sign-invariant.
    """
    g = np.asarray(rgb, dtype=np.float64)[:, 1]
    return -detrend_signal(g, params.detrend, params.detrend_lambda)


def chrom(rgb: np.ndarray, fs: float, params: SignalParams) -> np.ndarray:
    """CHROM (De Haan & Jeanne 2013) with 1.6 s Hann overlap-add."""
    rgb = np.asarray(rgb, dtype=np.float64)
    t = rgb.shape[0]
    l = int(round(params.window_s * fs))
    if l < 8 or t < l:
        # Too short to window — run the projection over the whole clip.
        return _chrom_window(rgb, fs, params, apply_window=False)

    step = max(1, l // 2)
    win = get_window("hann", l, fftbins=False)
    out = np.zeros(t, dtype=np.float64)
    for m in range(0, t - l + 1, step):
        seg = _chrom_window(rgb[m:m + l], fs, params, apply_window=False)
        out[m:m + l] += (seg - seg.mean()) * win
    return out


def _chrom_window(
    seg: np.ndarray, fs: float, params: SignalParams, apply_window: bool
) -> np.ndarray:
    cn = _temporal_normalize(seg)
    xs = 3.0 * cn[:, 0] - 2.0 * cn[:, 1]
    ys = 1.5 * cn[:, 0] + cn[:, 1] - 1.5 * cn[:, 2]
    lo, hi = params.pulse_band_hz
    xf = bandpass(xs, fs, lo, hi, params.butter_order)
    yf = bandpass(ys, fs, lo, hi, params.butter_order)
    sy = float(np.std(yf))
    alpha = (float(np.std(xf)) / sy) if sy > _EPS else 0.0
    return xf - alpha * yf


# Projection onto the plane orthogonal to the standardised skin-tone vector.
_POS_P = np.array([[0.0, 1.0, -1.0], [-2.0, 1.0, 1.0]], dtype=np.float64)


def pos(rgb: np.ndarray, fs: float, params: SignalParams) -> np.ndarray:
    """POS (Wang et al. 2017), Algorithm 1 with a stride-1 sliding window."""
    rgb = np.asarray(rgb, dtype=np.float64)
    t = rgb.shape[0]
    l = int(round(params.window_s * fs))
    if l < 8 or t < l:
        l = t

    out = np.zeros(t, dtype=np.float64)
    for n in range(l - 1, t):
        m = n - l + 1
        cn = _temporal_normalize(rgb[m:n + 1])
        s = cn @ _POS_P.T                       # [l, 2]
        s0, s1 = s[:, 0], s[:, 1]
        sd1 = float(np.std(s1))
        alpha = (float(np.std(s0)) / sd1) if sd1 > _EPS else 0.0
        h = s0 + alpha * s1
        out[m:n + 1] += h - h.mean()
    return out


METHODS: Dict[str, Callable[[np.ndarray, float, SignalParams], np.ndarray]] = {
    "green": green,
    "chrom": chrom,
    "pos": pos,
}


def extract_pulse(
    rgb: np.ndarray,
    fs: float,
    method: str,
    params: Optional[SignalParams] = None,
) -> PulseSignal:
    """Run one method end to end: projection -> detrend -> bandpass -> PSD."""
    params = params or SignalParams()
    if method not in METHODS:
        raise ValueError(f"unknown method {method!r}; have {sorted(METHODS)}")

    rgb = np.asarray(rgb, dtype=np.float64)
    if rgb.ndim != 2 or rgb.shape[1] != 3:
        raise ValueError(f"expected [T, 3] RGB trace, got {rgb.shape}")

    notes: List[str] = []
    if fs <= 2 * params.pulse_band_hz[1]:
        notes.append(
            f"fps {fs:.1f} is below 2x the {params.pulse_band_hz[1]} Hz band edge — "
            "fast pulses will alias"
        )

    raw = METHODS[method](rgb, fs, params)
    # CHROM/POS bandpass inside their windows; a second pass over the full
    # trace removes the overlap-add seams and the DC each window reintroduces.
    detrended = detrend_signal(raw, params.detrend, params.detrend_lambda)
    lo, hi = params.pulse_band_hz
    sig = bandpass(detrended, fs, lo, hi, params.butter_order)

    freqs, psd, nperseg = welch_psd(
        sig, fs, params.welch_segment_s, params.welch_overlap,
        params.welch_nfft, band=params.snr_band_hz,
    )
    snr_freqs, snr_psd = snr_spectrum(sig, fs, band=params.snr_band_hz)
    # Locate the peak on the low-variance Welch estimate, then measure its
    # SNR on the sharp periodogram. Mixing the two is the point.
    peak_hz, _ = peak_frequency(freqs, psd, params.pulse_band_hz)
    res = fs / float(nperseg) if nperseg else 0.0
    if res * 60.0 > 6.0:
        notes.append(
            f"spectral resolution is {res * 60:.1f} bpm — the clip is too short "
            "to resolve the rate more finely"
        )

    return PulseSignal(
        method=method,
        signal=sig,
        fs=float(fs),
        freqs=freqs,
        psd=psd,
        snr_freqs=snr_freqs,
        snr_psd=snr_psd,
        peak_hz=float(peak_hz),
        pulse_rate_bpm=float(peak_hz * 60.0),
        freq_resolution_hz=float(res),
        welch_nperseg=int(nperseg),
        notes=notes,
    )
