"""Perfusion (rPPG) Phase 0 tests.

Key contract, and the reason most of this file exists: **the harness must
refuse to report a pulse rate when there is no pulse.** A clip generated
with zero modulation contains no cardiac signal by construction; if the
pipeline returns a confident bpm for it, every number the feature ever
produces is worthless. `test_no_pulse_clip_is_rejected` is the honesty
test for perfusion, the same role `test_patient_disjoint_split_no_leakage`
plays for the classifier.

The secondary contract is that fps must be *measured*, never assumed —
every bpm is scaled by it.
"""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from make_synthetic_perfusion_clip import ppg_waveform, synthesize  # noqa: E402

from src.perfusion import roi as roi_mod  # noqa: E402
from src.perfusion.classical_rppg import (  # noqa: E402
    METHODS,
    SignalParams,
    bandpass,
    detrend_signal,
    extract_pulse,
    peak_frequency,
    snr_spectrum,
    welch_psd,
)
from src.perfusion.quality import (  # noqa: E402
    CaptureQuality,
    MotionStats,
    QualityThresholds,
    SignalQuality,
    _phase_correlate,
    assess_clip,
    illumination_stability,
    motion_score,
    snr_db,
)
from src.perfusion.video_io import VideoReadError, load_video  # noqa: E402

# Small and short so the suite stays fast, but still above the 8 s
# min_duration_s gate so clips are not rejected for length alone.
CLIP_KW = dict(duration_s=12.0, size=(160, 120), fps=30.0, codec="ffv1")
TRUE_BPM = 72.0


@pytest.fixture(scope="module")
def clean_clip(tmp_path_factory) -> Path:
    """Lossless clip with a strong, clean 72 bpm pulse."""
    d = tmp_path_factory.mktemp("perfusion")
    meta = synthesize(d / "clean", bpm=TRUE_BPM, modulation=0.02, **CLIP_KW)
    return Path(meta["path"])


@pytest.fixture(scope="module")
def nopulse_clip(tmp_path_factory) -> Path:
    """Negative control: identical rendering, zero cardiac modulation."""
    d = tmp_path_factory.mktemp("perfusion")
    meta = synthesize(d / "nopulse", modulation=0.0, **CLIP_KW)
    return Path(meta["path"])


# --------------------------------------------------------------------------
# video_io
# --------------------------------------------------------------------------

def test_load_video_shape_and_range(clean_clip):
    clip = load_video(clean_clip, max_width=None, max_frames=None)
    assert clip.frames.ndim == 4 and clip.frames.shape[-1] == 3
    assert clip.frames.dtype == np.float32
    assert 0.0 <= float(clip.frames.min()) and float(clip.frames.max()) <= 1.0
    assert clip.n_frames == 360


def test_fps_is_measured_not_assumed(clean_clip):
    clip = load_video(clean_clip, max_width=None, max_frames=None)
    # Written at 30 fps; the timestamp-derived value must land on it.
    assert clip.fps == pytest.approx(30.0, abs=0.2)
    assert clip.fps_source in {"timestamps", "container"}
    assert clip.duration_s == pytest.approx(12.0, abs=0.3)


def test_downscale_preserves_aspect_ratio(clean_clip):
    clip = load_video(clean_clip, max_width=80, max_frames=None)
    assert clip.analysis_size[0] == 80
    assert clip.analysis_size[1] == 60  # 160x120 -> 80x60


def test_max_frames_truncates_and_flags(clean_clip):
    clip = load_video(clean_clip, max_width=80, max_frames=60)
    assert clip.n_frames == 60
    assert clip.truncated is True
    assert any("truncated" in w for w in clip.warnings)


def test_missing_video_raises(tmp_path):
    with pytest.raises(VideoReadError):
        load_video(tmp_path / "does_not_exist.mp4")


# --------------------------------------------------------------------------
# roi
# --------------------------------------------------------------------------

def test_segment_foot_finds_the_synthetic_foot(clean_clip):
    clip = load_video(clean_clip, max_width=None, max_frames=None)
    foot = roi_mod.segment_foot(clip.frames)
    assert foot.n_pixels > 0
    assert foot.bbox is not None
    # The generator draws an ellipse with semi-axes 0.36h x 0.24w, so the
    # area fraction is pi*0.36*0.24 ~= 0.27 of the frame.
    assert 0.20 < foot.coverage < 0.35
    assert foot.ok is True


def test_segment_foot_rejects_a_background_only_clip(tmp_path):
    # Uniform grey: nothing skin-coloured anywhere.
    frames = np.full((20, 64, 64, 3), 0.3, dtype=np.float32)
    foot = roi_mod.segment_foot(frames)
    assert foot.n_pixels == 0
    assert foot.ok is False
    assert foot.reasons


def test_tiles_cover_the_foot_and_exclude_background(clean_clip):
    clip = load_video(clean_clip, max_width=None, max_frames=None)
    foot = roi_mod.segment_foot(clip.frames)
    tiles = roi_mod.build_tiles(foot, rows=8, cols=8, min_fill_fraction=0.5)
    assert 0 < len(tiles) <= 64
    for t in tiles:
        assert t.fill_fraction >= 0.5
        assert t.mask.shape == (t.y1 - t.y0, t.x1 - t.x0)


def test_rgb_trace_matches_naive_mean(clean_clip):
    clip = load_video(clean_clip, max_width=64, max_frames=40)
    foot = roi_mod.segment_foot(clip.frames)
    trace = roi_mod.rgb_trace(clip.frames, foot.mask)
    naive = clip.frames[:, foot.mask, :].mean(axis=1)
    assert trace.shape == (clip.n_frames, 3)
    np.testing.assert_allclose(trace, naive, rtol=1e-4, atol=1e-6)


def test_rgb_trace_rejects_mismatched_mask(clean_clip):
    clip = load_video(clean_clip, max_width=64, max_frames=10)
    with pytest.raises(ValueError):
        roi_mod.rgb_trace(clip.frames, np.ones((5, 5), dtype=bool))


# --------------------------------------------------------------------------
# classical_rppg
# --------------------------------------------------------------------------

def test_bandpass_keeps_in_band_kills_out_of_band():
    fs, n = 30.0, 900
    t = np.arange(n) / fs
    in_band = np.sin(2 * np.pi * 1.2 * t)      # 72 bpm
    out_band = np.sin(2 * np.pi * 6.0 * t)     # 360 bpm, far above the band
    assert np.std(bandpass(in_band, fs)) > 0.5 * np.std(in_band)
    assert np.std(bandpass(out_band, fs)) < 0.1 * np.std(out_band)


def test_smoothness_priors_removes_slow_drift():
    fs, n = 30.0, 900
    t = np.arange(n) / fs
    pulse = np.sin(2 * np.pi * 1.2 * t)
    drift = 8.0 * np.sin(2 * np.pi * 0.02 * t) + 3.0
    out = detrend_signal(pulse + drift, "smoothness_priors", lam=100.0)
    # The drift is ~11x the pulse amplitude; after detrending the residual
    # must be dominated by the pulse, not the drift.
    assert abs(out.mean()) < 0.1
    assert np.std(out) < 2.0 * np.std(pulse)
    assert np.corrcoef(out, pulse)[0, 1] > 0.9


def test_detrend_rejects_unknown_kind():
    with pytest.raises(ValueError):
        detrend_signal(np.zeros(50), "wavelet-magic")


def test_peak_frequency_finds_a_planted_tone():
    fs, n = 30.0, 900
    t = np.arange(n) / fs
    x = np.sin(2 * np.pi * 1.35 * t)
    f, p, nperseg = welch_psd(x, fs, segment_s=8.0, band=(0.7, 4.0))
    peak, _ = peak_frequency(f, p, (0.75, 2.5))
    assert peak == pytest.approx(1.35, abs=0.05)
    assert nperseg == 240  # 8 s @ 30 fps — the resolution we report


@pytest.mark.parametrize("method", sorted(METHODS))
def test_every_method_recovers_a_planted_pulse(method):
    """Each method must find 72 bpm in a synthetic RGB trace built from Pbv."""
    fs, n, bpm = 30.0, 900, 72.0
    t = np.arange(n) / fs
    wave = ppg_waveform(t, bpm)
    pbv = np.array([0.33, 0.77, 0.53])
    pbv = pbv / np.linalg.norm(pbv)
    rng = np.random.default_rng(0)
    base = np.array([0.78, 0.59, 0.51])
    rgb = base * (1.0 + 0.01 * wave[:, None] * pbv[None, :])
    rgb += rng.normal(0, 1e-4, rgb.shape)

    ps = extract_pulse(rgb, fs, method)
    assert ps.pulse_rate_bpm == pytest.approx(bpm, abs=3.0)
    assert ps.signal.shape == (n,)
    assert np.isfinite(ps.signal).all()


def test_extract_pulse_rejects_bad_shape():
    with pytest.raises(ValueError):
        extract_pulse(np.zeros((100, 4)), 30.0, "pos")


def test_extract_pulse_rejects_unknown_method():
    with pytest.raises(ValueError):
        extract_pulse(np.zeros((100, 3)), 30.0, "nope")


def test_short_clip_reports_coarse_resolution():
    fs, n = 30.0, 120  # 4 s
    t = np.arange(n) / fs
    rgb = np.tile((0.5 + 0.01 * np.sin(2 * np.pi * 1.2 * t))[:, None], (1, 3))
    ps = extract_pulse(rgb, fs, "green")
    assert ps.freq_resolution_hz * 60.0 > 6.0
    assert any("resolution" in note for note in ps.notes)


# --------------------------------------------------------------------------
# quality
# --------------------------------------------------------------------------

def test_snr_is_high_for_a_tone_and_low_for_noise():
    fs, n = 30.0, 900
    t = np.arange(n) / fs
    params = SignalParams()
    rng = np.random.default_rng(1)

    def measure(x):
        wf, wp, _ = welch_psd(x, fs, band=params.snr_band_hz)
        peak, _ = peak_frequency(wf, wp, params.pulse_band_hz)
        sf, sp = snr_spectrum(x, fs, band=params.snr_band_hz)
        return snr_db(sf, sp, peak, params.harmonic_halfwidth_hz, params.snr_band_hz)

    snr_tone = measure(np.sin(2 * np.pi * 1.2 * t))
    snr_noise = measure(bandpass(rng.normal(0, 1, n), fs))

    assert snr_tone > 10.0
    assert snr_noise < snr_tone - 10.0


def test_snr_does_not_saturate_on_strong_signals():
    """Regression guard for the zero-padded-Welch SNR ceiling.

    Measuring SNR on the zero-padded Welch estimate scored a noiseless tone
    and a 3x-amplitude tone-in-noise at ~6.7 and ~6.3 dB — indistinguishable,
    because leakage smeared across ~450 padded noise bins dominated the
    27-bin signal template. On the periodogram those separate cleanly.
    """
    fs, n = 30.0, 900
    t = np.arange(n) / fs
    params = SignalParams()
    rng = np.random.default_rng(1)
    tone = np.sin(2 * np.pi * 1.2 * t) + 0.45 * np.sin(2 * np.pi * 2.4 * t - 0.9)

    def measure(x):
        wf, wp, _ = welch_psd(x, fs, band=params.snr_band_hz)
        peak, _ = peak_frequency(wf, wp, params.pulse_band_hz)
        sf, sp = snr_spectrum(x, fs, band=params.snr_band_hz)
        return snr_db(sf, sp, peak, params.harmonic_halfwidth_hz, params.snr_band_hz)

    strong = measure(tone * 3.0 + bandpass(rng.normal(0, 1, n), fs))
    weak = measure(tone * 0.3 + bandpass(rng.normal(0, 1, n), fs))
    assert strong > 15.0, "SNR must not saturate around the old ~6.7 dB ceiling"
    assert strong - weak > 10.0


def test_snr_returns_neg_inf_without_a_peak():
    f = np.linspace(0.7, 4.0, 100)
    assert snr_db(f, np.ones_like(f), peak_hz=0.0) == float("-inf")


def test_phase_correlate_has_no_zero_shift_bias():
    """Guards the OpenCV 4.10 phaseCorrelate +0.5 px bug we work around."""
    rng = np.random.default_rng(0)
    img = rng.normal(0, 1, (64, 48))
    win = np.outer(np.hanning(64), np.hanning(48))
    dx, dy = _phase_correlate(img, img.copy(), win)
    assert abs(dx) < 1e-6 and abs(dy) < 1e-6


def test_motion_score_detects_a_slowly_drifting_foot(tmp_path):
    """Slow drift must be caught even though per-frame jitter stays tiny.

    `--motion-px 3` sweeps the foot +/-3 px at 0.25 Hz, so consecutive-frame
    displacement peaks at only 3*2*pi*0.25/30 ~= 0.16 px — under the sub-pixel
    floor of phase correlation. A jitter-only metric scores this clip as
    perfectly still, which is exactly the failure this test pins down.
    """
    still = synthesize(tmp_path / "still", modulation=0.01, motion_px=0.0,
                       duration_s=8.0, size=(160, 120), codec="ffv1")
    moving = synthesize(tmp_path / "moving", modulation=0.01, motion_px=3.0,
                        duration_s=8.0, size=(160, 120), codec="ffv1")
    stats = []
    for meta in (still, moving):
        clip = load_video(Path(meta["path"]), max_width=None, max_frames=None)
        foot = roi_mod.segment_foot(clip.frames)
        stats.append(motion_score(clip.frames, foot.bbox))
    still_m, moving_m = stats

    assert still_m.drift_p95_px < 0.5
    # Amplitude is 3 px in x and 1.2 px in y, so the excursion from the
    # middle frame reaches roughly 3 px.
    assert moving_m.drift_max_px > 2.0
    assert moving_m.drift_p95_px > still_m.drift_p95_px * 5.0


def test_illumination_stability_flags_exposure_swing():
    t = np.arange(600) / 30.0
    steady = np.tile(np.array([0.7, 0.55, 0.5]), (600, 1))
    swinging = steady * (1.0 + 0.10 * np.sin(2 * np.pi * 0.07 * t))[:, None]
    assert illumination_stability(steady) < 1e-6
    assert illumination_stability(swinging) > 0.05


# --------------------------------------------------------------------------
# End to end — the contract that matters
# --------------------------------------------------------------------------

def _run(clip_path: Path):
    from src.perfusion.cli import analyze_clip
    from src.config import load_config

    cfg = load_config(REPO_ROOT / "config.yaml")
    return analyze_clip(clip_path, cfg)


def test_clean_clip_recovers_the_true_rate(clean_clip):
    result = _run(clean_clip)
    a = result["assessment"]
    assert a["reliable"] is True, a["reasons"]
    assert a["pulse_rate_bpm"] == pytest.approx(TRUE_BPM, abs=4.0)
    for s in a["signals"].values():
        assert s["snr_db"] > 3.0


def test_no_pulse_clip_is_rejected(nopulse_clip):
    """THE honesty test: no pulse in, no number out.

    The PSD of this clip still has a maximum somewhere in 0.75-2.5 Hz —
    it always does. The pipeline must not report it as a heart rate.
    """
    result = _run(nopulse_clip)
    a = result["assessment"]
    assert a["reliable"] is False
    assert a["pulse_rate_bpm"] is None
    assert a["reasons"], "a rejection must always explain itself"


def test_assessment_never_reports_a_rate_when_unreliable(clean_clip):
    """Even on a good clip, a failed capture gate must suppress the number."""
    result = _run(clean_clip)
    a = result["assessment"]
    signals = {}
    for name, s in a["signals"].items():
        sq = SignalQuality(
            method=name, pulse_rate_bpm=s["pulse_rate_bpm"], peak_hz=s["peak_hz"],
            snr_db=s["snr_db"], rate_stability_bpm=s["rate_stability_bpm"],
            rate_stability_resolution_bpm=s["rate_stability_resolution_bpm"],
            per_window_bpm=s["per_window_bpm"],
            freq_resolution_bpm=s["freq_resolution_bpm"],
            reliable=True, grade="reliable", reasons=[],
        )
        signals[name] = sq

    failed_capture = CaptureQuality(
        duration_s=3.0, fps=30.0, fps_source="timestamps", roi_coverage=0.3,
        motion=MotionStats(0.0, 0.0, 0.0, 0.0),
        motion_jitter_frac=0.0, motion_drift_frac=0.0,
        illumination_cv=0.0, low_freq_power_ratio=0.0,
        ok=False, reasons=["clip is 3.0 s; need >=8 s"],
    )
    out = assess_clip(failed_capture, signals, QualityThresholds())
    assert out.reliable is False
    assert out.pulse_rate_bpm is None


def test_result_carries_version_and_disclaimer(clean_clip):
    result = _run(clean_clip)
    assert result["method_version"]
    assert "not a diagnosis" in result["disclaimer"].lower()
