"""Signal quality, motion, and the reject decision.

This module exists so the system can say **"no reliable perfusion signal"**.
That is the single most important behaviour in the whole perfusion feature.
A remote-PPG pipeline will always return *a* number — the PSD always has a
maximum somewhere in 0.75-2.5 Hz, even for a video of a wall — and printing
that number as a heart rate would be fabrication. Everything here is the
machinery for refusing to do that.

Four independent checks, because no single one is sufficient:

1. **SNR** (De Haan & Jeanne 2013 definition). Power within +/-0.1 Hz of the
   pulse peak and its second harmonic, divided by all remaining power in the
   analysis band. A harmonic-shaped spectrum is the signature of a real
   pulse; broadband noise with a lucky maximum is not.

2. **Rate stability.** A real pulse holds roughly the same rate for the
   whole clip. Estimating it independently in sub-windows and requiring
   agreement rejects artifacts that produce one tall spurious peak. The
   test is resolution-aware: a clip is never failed for scatter smaller
   than the sub-window spectral resolution, because that scatter is not
   measurable.

3. **Cross-method agreement.** CHROM and POS use different colour
   projections with different artifact sensitivities. When they land on the
   same frequency, that frequency is much more likely to be haemodynamic
   than an illumination or motion artifact both happen to share.

4. **Capture quality** — ROI coverage, motion, and illumination stability.
   Motion is measured by phase correlation between consecutive frames.
   Illumination stability is the coefficient of variation of ROI luma over
   time; it is the number that tells us how much the Phase 1 exposure-lock
   work actually buys, since auto-exposure hunting is the single largest
   confound in hand-held rPPG.

Thresholds live in config.yaml (`perfusion.quality`). They are inherited
from facial rPPG practice and are NOT calibrated for feet. Recalibrate them
against pulse-oximeter ground truth before trusting any of this.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Sequence, Tuple

import cv2
import numpy as np

from .classical_rppg import PulseSignal, SignalParams, extract_pulse, welch_psd

_EPS = 1e-12


@dataclass
class QualityThresholds:
    """config.yaml `perfusion.quality`, in one object."""

    snr_db_min: float = 3.0
    snr_db_marginal: float = 0.0
    rate_stability_windows: int = 3
    rate_stability_bpm_max: float = 6.0
    method_agreement_bpm_max: float = 5.0
    motion_jitter_frac_max: float = 0.004
    motion_drift_frac_max: float = 0.02
    illumination_cv_max: float = 0.05
    require_all: bool = True
    min_duration_s: float = 8.0
    min_fps: float = 20.0
    min_roi_coverage: float = 0.06

    @classmethod
    def from_config(cls, cfg: Any) -> "QualityThresholds":
        q = dict(cfg["perfusion"]["quality"])
        cap = dict(cfg["perfusion"]["capture"])
        roi_cfg = dict(cfg["perfusion"]["roi"])
        return cls(
            snr_db_min=float(q["snr_db_min"]),
            snr_db_marginal=float(q["snr_db_marginal"]),
            rate_stability_windows=int(q["rate_stability_windows"]),
            rate_stability_bpm_max=float(q["rate_stability_bpm_max"]),
            method_agreement_bpm_max=float(q["method_agreement_bpm_max"]),
            motion_jitter_frac_max=float(q["motion_jitter_frac_max"]),
            motion_drift_frac_max=float(q["motion_drift_frac_max"]),
            illumination_cv_max=float(q["illumination_cv_max"]),
            require_all=bool(q["require_all"]),
            min_duration_s=float(cap["min_duration_s"]),
            min_fps=float(cap["min_fps"]),
            min_roi_coverage=float(roi_cfg["min_coverage"]),
        )


@dataclass
class CaptureQuality:
    """Method-independent properties of the clip itself."""

    duration_s: float
    fps: float
    fps_source: str
    roi_coverage: float
    motion: MotionStats
    motion_jitter_frac: float       # as a fraction of the foot bbox diagonal
    motion_drift_frac: float
    illumination_cv: float
    low_freq_power_ratio: float     # sub-pulse-band power / in-band power
    ok: bool
    reasons: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "duration_s": float(self.duration_s),
            "fps": float(self.fps),
            "fps_source": self.fps_source,
            "roi_coverage": float(self.roi_coverage),
            "motion": self.motion.to_dict(),
            "motion_jitter_frac": float(self.motion_jitter_frac),
            "motion_drift_frac": float(self.motion_drift_frac),
            "illumination_cv": float(self.illumination_cv),
            "low_freq_power_ratio": float(self.low_freq_power_ratio),
            "ok": bool(self.ok),
            "reasons": list(self.reasons),
        }


@dataclass
class SignalQuality:
    """Per-method verdict on one extracted waveform."""

    method: str
    pulse_rate_bpm: float
    peak_hz: float
    snr_db: float
    rate_stability_bpm: float
    rate_stability_resolution_bpm: float
    per_window_bpm: List[float]
    freq_resolution_bpm: float
    reliable: bool
    grade: str                      # "reliable" | "marginal" | "rejected"
    reasons: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        # +/-inf is a legitimate SNR outcome (a noiseless tone, or no peak at
        # all) but json.dumps would emit bare `Infinity`, which is not valid
        # JSON and breaks any strict parser downstream. Serialise as null;
        # `grade` and `reasons` already carry the meaning.
        return {
            "method": self.method,
            "pulse_rate_bpm": float(self.pulse_rate_bpm),
            "peak_hz": float(self.peak_hz),
            "snr_db": float(self.snr_db) if np.isfinite(self.snr_db) else None,
            "rate_stability_bpm": float(self.rate_stability_bpm),
            "rate_stability_resolution_bpm": float(self.rate_stability_resolution_bpm),
            "per_window_bpm": [float(v) for v in self.per_window_bpm],
            "freq_resolution_bpm": float(self.freq_resolution_bpm),
            "reliable": bool(self.reliable),
            "grade": self.grade,
            "reasons": list(self.reasons),
        }


@dataclass
class PerfusionAssessment:
    """The clip-level answer, including the refusal path."""

    capture: CaptureQuality
    signals: Dict[str, SignalQuality]
    method_agreement_bpm: Optional[float]
    best_method: Optional[str]
    pulse_rate_bpm: Optional[float]      # None whenever `reliable` is False
    reliable: bool
    reasons: List[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "reliable": bool(self.reliable),
            "pulse_rate_bpm": (
                float(self.pulse_rate_bpm) if self.pulse_rate_bpm is not None else None
            ),
            "best_method": self.best_method,
            "method_agreement_bpm": (
                float(self.method_agreement_bpm)
                if self.method_agreement_bpm is not None else None
            ),
            "reasons": list(self.reasons),
            "capture": self.capture.to_dict(),
            "signals": {k: v.to_dict() for k, v in self.signals.items()},
        }


# --------------------------------------------------------------------------
# SNR
# --------------------------------------------------------------------------

def snr_db(
    freqs: np.ndarray,
    psd: np.ndarray,
    peak_hz: float,
    halfwidth_hz: float = 0.1,
    band: Optional[Sequence[float]] = None,
) -> float:
    """De Haan & Jeanne (2013) rPPG SNR, in dB.

    Signal = power in [f0 +/- w] plus [2*f0 +/- w]. Noise = the rest of the
    band. The second harmonic is included because a genuine PPG waveform is
    not a sinusoid — its harmonic is part of the signal, and counting it as
    noise systematically under-reports true pulses.

    Returns -inf when there is no in-band power at all.
    """
    freqs = np.asarray(freqs, dtype=np.float64)
    psd = np.asarray(psd, dtype=np.float64)
    if freqs.size == 0 or peak_hz <= 0:
        return float("-inf")

    in_band = np.ones_like(freqs, dtype=bool)
    if band is not None:
        in_band = (freqs >= band[0]) & (freqs <= band[1])
    if not np.any(in_band):
        return float("-inf")

    template = np.zeros_like(freqs, dtype=bool)
    for harmonic in (1.0, 2.0):
        f0 = harmonic * peak_hz
        template |= (freqs >= f0 - halfwidth_hz) & (freqs <= f0 + halfwidth_hz)
    template &= in_band

    sig = float(psd[template].sum())
    noise = float(psd[in_band & ~template].sum())
    if noise <= _EPS:
        return float("inf") if sig > _EPS else float("-inf")
    if sig <= _EPS:
        return float("-inf")
    return float(10.0 * np.log10(sig / noise))


# --------------------------------------------------------------------------
# Capture-level measurements
# --------------------------------------------------------------------------

def _phase_correlate(a: np.ndarray, b: np.ndarray, win: np.ndarray) -> Tuple[float, float]:
    """Sub-pixel translation of `b` relative to `a`, via phase correlation.

    Implemented directly rather than with `cv2.phaseCorrelate`, which in
    OpenCV 4.10 returns a systematic dx=+0.5 px for a ZERO shift — its
    weighted-centroid refinement reads a 5x5 neighbourhood that is clipped
    when the correlation peak sits at index 0, which is precisely the case
    for a still clip. That 0.5 px floor is larger than the real motion we
    are trying to measure. Here the surface is fftshift-ed so the zero-shift
    peak lands in the middle, away from any edge, and refinement is a plain
    1-D parabolic fit per axis.

    Measured against synthetic warps: exact 0.000 px on identical frames,
    and within 0.03 px for shifts of 0.5-3 px. Below ~0.5 px the parabolic
    fit under-reads (a known bias of the method) — callers only ever use the
    magnitude, and only against a threshold well above that floor. Sign
    convention is `a` relative to `b`; magnitude is what callers consume.
    """
    fa = np.fft.rfft2(a * win)
    fb = np.fft.rfft2(b * win)
    r = fa * np.conj(fb)
    r /= np.abs(r) + _EPS
    surf = np.fft.fftshift(np.fft.irfft2(r, s=a.shape))

    h, w = surf.shape
    iy, ix = np.unravel_index(int(np.argmax(surf)), surf.shape)

    def _refine(vals: np.ndarray, i: int) -> float:
        if i <= 0 or i >= vals.size - 1:
            return 0.0
        y0, y1, y2 = float(vals[i - 1]), float(vals[i]), float(vals[i + 1])
        denom = y0 - 2.0 * y1 + y2
        if abs(denom) < _EPS:
            return 0.0
        return float(np.clip(0.5 * (y0 - y2) / denom, -1.0, 1.0))

    dy = (iy - h // 2) + _refine(surf[:, ix], iy)
    dx = (ix - w // 2) + _refine(surf[iy, :], ix)
    return float(dx), float(dy)


@dataclass
class MotionStats:
    """Two different kinds of movement, which fail rPPG in different ways."""

    jitter_median_px: float     # consecutive-frame displacement
    jitter_p95_px: float
    drift_p95_px: float         # displacement from the clip's middle frame
    drift_max_px: float

    def to_dict(self) -> dict:
        return {
            "jitter_median_px": float(self.jitter_median_px),
            "jitter_p95_px": float(self.jitter_p95_px),
            "drift_p95_px": float(self.drift_p95_px),
            "drift_max_px": float(self.drift_max_px),
        }


def motion_score(
    frames: np.ndarray,
    bbox: Optional[Tuple[int, int, int, int]],
    max_pairs: int = 900,
) -> MotionStats:
    """ROI displacement in pixels, measured two ways.

    **Jitter** is consecutive-frame displacement — tremor, camera shake.
    **Drift** is displacement from the middle frame — the slow postural
    slide of a foot over 20 s.

    Both are needed, and jitter alone is not enough. A foot that travels
    20 px across the clip has a per-frame displacement of only ~0.03 px,
    far below what sub-pixel phase correlation can even resolve, so a
    jitter-only metric scores it as perfectly still. But the ROI mask is
    computed once for the whole clip (see roi.segment_foot), so that same
    slow slide walks the foot out from under its own mask and contaminates
    every tile trace with background. Drift is what catches it.

    Phase correlation is used rather than optical flow because we only need
    a rigid translation estimate for the ROI as a whole, and it is robust
    to the illumination changes we separately measure.
    """
    t = int(frames.shape[0])
    if t < 2:
        return MotionStats(0.0, 0.0, 0.0, 0.0)

    if bbox is not None:
        x0, y0, x1, y1 = bbox
    else:
        y0, x0 = 0, 0
        y1, x1 = int(frames.shape[1]), int(frames.shape[2])
    if (y1 - y0) < 8 or (x1 - x0) < 8:
        return MotionStats(0.0, 0.0, 0.0, 0.0)

    # Subsample on very long clips; displacement stats are not improved by
    # measuring every one of 1800 pairs.
    stride = max(1, (t - 1) // max_pairs + 1)

    # Separable Hann window suppresses the wrap-around edge discontinuity
    # that would otherwise dominate the correlation surface.
    win = np.outer(np.hanning(y1 - y0), np.hanning(x1 - x0))

    def _gray(k: int) -> np.ndarray:
        crop = np.clip(frames[k, y0:y1, x0:x1] * 255.0, 0, 255).astype(np.uint8)
        g = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY).astype(np.float64)
        return g - g.mean()

    jitter: List[float] = []
    for i in range(0, t - 1, stride):
        dx, dy = _phase_correlate(_gray(i), _gray(i + 1), win)
        jitter.append(float(np.hypot(dx, dy)))

    # Drift is measured against the middle frame so a monotonic slide is
    # split either side of the reference instead of accumulating from one end.
    ref = _gray(t // 2)
    drift: List[float] = []
    for i in range(0, t, stride):
        dx, dy = _phase_correlate(ref, _gray(i), win)
        drift.append(float(np.hypot(dx, dy)))

    j = np.asarray(jitter or [0.0], dtype=np.float64)
    d = np.asarray(drift or [0.0], dtype=np.float64)
    return MotionStats(
        jitter_median_px=float(np.median(j)),
        jitter_p95_px=float(np.percentile(j, 95)),
        drift_p95_px=float(np.percentile(d, 95)),
        drift_max_px=float(np.max(d)),
    )


def illumination_stability(rgb_trace: np.ndarray) -> float:
    """Coefficient of variation of ROI luminance over the clip.

    Auto-exposure hunting and ambient flicker both show up here. A locked
    exposure on a still foot should sit well under 1%.
    """
    trace = np.asarray(rgb_trace, dtype=np.float64)
    if trace.ndim != 2 or trace.shape[0] < 2:
        return 0.0
    luma = 0.299 * trace[:, 0] + 0.587 * trace[:, 1] + 0.114 * trace[:, 2]
    mu = float(np.mean(luma))
    if abs(mu) < _EPS:
        return 0.0
    return float(np.std(luma) / mu)


def low_frequency_power_ratio(
    rgb_trace: np.ndarray, fs: float, params: SignalParams
) -> float:
    """Baseline-wander power below the pulse band, relative to in-band power.

    A large ratio means the trace is dominated by slow drift — postural
    movement, exposure hunting, shadow crossing the foot. Diagnostic only;
    the bandpass removes it, but a huge ratio means the bandpass is doing
    almost all the work and little real signal survives.
    """
    trace = np.asarray(rgb_trace, dtype=np.float64)
    if trace.ndim != 2 or trace.shape[0] < 8:
        return 0.0
    luma = 0.299 * trace[:, 0] + 0.587 * trace[:, 1] + 0.114 * trace[:, 2]
    luma = luma - luma.mean()
    f, p, _ = welch_psd(
        luma, fs, params.welch_segment_s, params.welch_overlap, params.welch_nfft
    )
    lo, hi = params.pulse_band_hz
    low = (f > 0.02) & (f < lo)
    band = (f >= lo) & (f <= hi)
    p_band = float(p[band].sum())
    if p_band <= _EPS:
        return float("inf") if float(p[low].sum()) > _EPS else 0.0
    return float(p[low].sum() / p_band)


def assess_capture(
    duration_s: float,
    fps: float,
    fps_source: str,
    roi_coverage: float,
    bbox_diagonal_px: float,
    frames: np.ndarray,
    bbox: Optional[Tuple[int, int, int, int]],
    roi_rgb_trace: np.ndarray,
    params: SignalParams,
    thresholds: QualityThresholds,
) -> CaptureQuality:
    """Everything that can disqualify a clip before signal extraction."""
    motion = motion_score(frames, bbox)
    diag = float(bbox_diagonal_px)
    jitter_frac = float(motion.jitter_p95_px / diag) if diag > 0 else 0.0
    drift_frac = float(motion.drift_p95_px / diag) if diag > 0 else 0.0
    illum_cv = illumination_stability(roi_rgb_trace)
    lfr = low_frequency_power_ratio(roi_rgb_trace, fps, params)

    reasons: List[str] = []
    if duration_s < thresholds.min_duration_s:
        reasons.append(
            f"clip is {duration_s:.1f} s; need >={thresholds.min_duration_s:.0f} s "
            "for a stable spectrum"
        )
    if fps < thresholds.min_fps:
        reasons.append(f"frame rate {fps:.1f} fps is below the {thresholds.min_fps:.0f} fps floor")
    if fps_source == "fallback":
        reasons.append("frame rate could not be determined — bpm would be meaningless")
    if roi_coverage < thresholds.min_roi_coverage:
        reasons.append(
            f"foot covers {roi_coverage * 100:.1f}% of frame "
            f"(need >={thresholds.min_roi_coverage * 100:.0f}%)"
        )
    if jitter_frac > thresholds.motion_jitter_frac_max:
        reasons.append(
            f"camera/foot shake (p95 frame-to-frame {motion.jitter_p95_px:.2f} px = "
            f"{jitter_frac * 100:.2f}% of foot size, limit "
            f"{thresholds.motion_jitter_frac_max * 100:.2f}%)"
        )
    if drift_frac > thresholds.motion_drift_frac_max:
        reasons.append(
            f"foot drifted during the clip (p95 {motion.drift_p95_px:.2f} px, max "
            f"{motion.drift_max_px:.2f} px = {drift_frac * 100:.2f}% of foot size, "
            f"limit {thresholds.motion_drift_frac_max * 100:.1f}%) — the fixed ROI "
            "no longer covers the same tissue"
        )
    if illum_cv > thresholds.illumination_cv_max:
        reasons.append(
            f"lighting/exposure unstable (luma CV {illum_cv * 100:.2f}%, "
            f"limit {thresholds.illumination_cv_max * 100:.1f}%) — "
            "likely auto-exposure hunting"
        )

    return CaptureQuality(
        duration_s=duration_s,
        fps=fps,
        fps_source=fps_source,
        roi_coverage=roi_coverage,
        motion=motion,
        motion_jitter_frac=jitter_frac,
        motion_drift_frac=drift_frac,
        illumination_cv=illum_cv,
        low_freq_power_ratio=lfr,
        ok=len(reasons) == 0,
        reasons=reasons,
    )


# --------------------------------------------------------------------------
# Per-method assessment
# --------------------------------------------------------------------------

def rate_stability(
    rgb: np.ndarray,
    fs: float,
    method: str,
    params: SignalParams,
    n_windows: int = 3,
) -> Tuple[float, List[float], float]:
    """Re-estimate the rate in `n_windows` disjoint sub-windows.

    Returns (std_bpm, per_window_bpm, window_resolution_bpm). The third
    value is what the sub-windows can actually resolve — scatter below it
    is not measurable and must not be treated as a failure.
    """
    rgb = np.asarray(rgb, dtype=np.float64)
    t = rgb.shape[0]
    n_windows = max(1, int(n_windows))
    win = t // n_windows
    if win < int(4 * fs):  # <4 s per window resolves nothing useful
        return 0.0, [], float("inf")

    rates: List[float] = []
    res_bpm = 0.0
    for w in range(n_windows):
        seg = rgb[w * win: (w + 1) * win]
        ps = extract_pulse(seg, fs, method, params)
        if ps.pulse_rate_bpm > 0:
            rates.append(float(ps.pulse_rate_bpm))
            res_bpm = max(res_bpm, ps.freq_resolution_hz * 60.0)
    if len(rates) < 2:
        return 0.0, rates, float("inf")
    return float(np.std(rates)), rates, float(res_bpm)


def assess_signal(
    pulse: PulseSignal,
    rgb: np.ndarray,
    params: SignalParams,
    thresholds: QualityThresholds,
) -> SignalQuality:
    """Grade one method's waveform: reliable / marginal / rejected."""
    # SNR on the sharp periodogram, NOT the zero-padded Welch estimate that
    # located the peak — see PulseSignal's docstring for why.
    snr = snr_db(
        pulse.snr_freqs, pulse.snr_psd, pulse.peak_hz,
        params.harmonic_halfwidth_hz, params.snr_band_hz,
    )
    stab, per_win, res_bpm = rate_stability(
        rgb, pulse.fs, pulse.method, params, thresholds.rate_stability_windows
    )

    reasons: List[str] = []
    if pulse.peak_hz <= 0:
        reasons.append("no spectral peak inside the pulse band")
    if not np.isfinite(snr) or snr < thresholds.snr_db_min:
        shown = f"{snr:.2f}" if np.isfinite(snr) else "-inf"
        reasons.append(
            f"SNR {shown} dB is below the {thresholds.snr_db_min:.1f} dB threshold"
        )
    # Never fail a clip for scatter finer than the sub-windows can resolve.
    stab_limit = max(thresholds.rate_stability_bpm_max, res_bpm if np.isfinite(res_bpm) else 0.0)
    if per_win and stab > stab_limit:
        reasons.append(
            f"pulse rate unstable across the clip (std {stab:.1f} bpm across "
            f"{len(per_win)} windows, limit {stab_limit:.1f} bpm)"
        )
    elif not per_win:
        reasons.append("clip too short to check rate stability across sub-windows")

    if not reasons:
        grade = "reliable"
    elif np.isfinite(snr) and snr >= thresholds.snr_db_marginal and pulse.peak_hz > 0:
        grade = "marginal"
    else:
        grade = "rejected"

    return SignalQuality(
        method=pulse.method,
        pulse_rate_bpm=pulse.pulse_rate_bpm,
        peak_hz=pulse.peak_hz,
        snr_db=float(snr),
        rate_stability_bpm=float(stab),
        rate_stability_resolution_bpm=float(res_bpm),
        per_window_bpm=per_win,
        freq_resolution_bpm=float(pulse.freq_resolution_hz * 60.0),
        reliable=len(reasons) == 0,
        grade=grade,
        reasons=reasons,
    )


def assess_clip(
    capture: CaptureQuality,
    signals: Dict[str, SignalQuality],
    thresholds: QualityThresholds,
) -> PerfusionAssessment:
    """Fuse capture quality, per-method grades, and cross-method agreement.

    `pulse_rate_bpm` is None unless the whole chain passes. That is the
    contract: no number is better than a wrong number.
    """
    reasons: List[str] = list(capture.reasons)

    agreement: Optional[float] = None
    if "chrom" in signals and "pos" in signals:
        a, b = signals["chrom"].pulse_rate_bpm, signals["pos"].pulse_rate_bpm
        if a > 0 and b > 0:
            agreement = float(abs(a - b))
            if agreement > thresholds.method_agreement_bpm_max:
                reasons.append(
                    f"CHROM and POS disagree by {agreement:.1f} bpm "
                    f"(limit {thresholds.method_agreement_bpm_max:.1f}) — the peak is "
                    "probably an artifact, not a pulse"
                )

    ranked = sorted(
        (s for s in signals.values() if np.isfinite(s.snr_db)),
        key=lambda s: s.snr_db,
        reverse=True,
    )
    best = ranked[0] if ranked else None

    if best is None:
        reasons.append("no method produced a measurable spectrum")
    elif not best.reliable:
        reasons.extend(f"[{best.method}] {r}" for r in best.reasons)

    reliable = len(reasons) == 0 if thresholds.require_all else (
        best is not None and best.reliable
    )

    return PerfusionAssessment(
        capture=capture,
        signals=signals,
        method_agreement_bpm=agreement,
        best_method=best.method if best else None,
        pulse_rate_bpm=(best.pulse_rate_bpm if (reliable and best) else None),
        reliable=reliable,
        reasons=reasons,
    )
