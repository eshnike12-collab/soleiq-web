#!/usr/bin/env python3
"""Phase 0 feasibility harness.

    python -m src.perfusion.cli --video clips/foot_left_01.mov
    python -m src.perfusion.cli --video clips/ --reference-bpm 72 --tiles

Runs the classical rPPG stack end to end on a clip (or a directory of
clips) and prints exactly what was measured: true fps, duration, ROI
coverage, per-method pulse rate and SNR, motion, illumination stability,
and the reliability verdict with its reasons.

This tool answers one question — *is a pulsatile signal extractable from
foot video at all?* — and it is built to be able to answer "no". When the
verdict is unreliable it prints the reasons and NO pulse rate, because a
number the pipeline cannot support is worse than no number.

Pass `--reference-bpm` with the reading from a fingertip pulse oximeter
taken during the clip to get the absolute error. Without a reference,
agreement between CHROM and POS is the only corroboration available, and
that is weaker evidence — two methods can share an artifact.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.config import load_config, project_root  # noqa: E402
from src.perfusion import roi as roi_mod  # noqa: E402
from src.perfusion.classical_rppg import SignalParams, extract_pulse  # noqa: E402
from src.perfusion.quality import (  # noqa: E402
    QualityThresholds,
    assess_capture,
    assess_clip,
    assess_signal,
    snr_db,
)
from src.perfusion.video_io import VideoReadError, load_video  # noqa: E402

VIDEO_SUFFIXES = {".mp4", ".mov", ".m4v", ".webm", ".avi", ".mkv"}


# --------------------------------------------------------------------------
# Analysis
# --------------------------------------------------------------------------

def analyze_clip(
    video_path: Path,
    cfg: Any,
    with_tiles: bool = False,
    reference_bpm: Optional[float] = None,
) -> Dict[str, Any]:
    """Full Phase 0 analysis of a single clip. Returns a JSON-ready dict."""
    cap_cfg = dict(cfg["perfusion"]["capture"])
    roi_cfg = dict(cfg["perfusion"]["roi"])
    params = SignalParams.from_config(cfg)
    thresholds = QualityThresholds.from_config(cfg)

    clip = load_video(
        video_path,
        max_width=int(cap_cfg["max_analysis_width"]),
        max_frames=int(cap_cfg["max_frames"]),
        fps_disagreement_tolerance=float(cap_cfg["fps_disagreement_tolerance"]),
    )

    foot = roi_mod.segment_foot(
        clip.frames,
        cr_range=roi_cfg["ycrcb_cr"],
        cb_range=roi_cfg["ycrcb_cb"],
        v_min=int(roi_cfg["hsv_v_min"]),
        s_max=int(roi_cfg["hsv_s_max"]),
        morph_kernel=int(roi_cfg["morph_kernel"]),
        fill_holes=bool(roi_cfg["fill_holes"]),
        largest_component_only=bool(roi_cfg["largest_component_only"]),
        vote_frames=int(roi_cfg["mask_vote_frames"]),
        vote_fraction=float(roi_cfg["mask_vote_fraction"]),
        min_coverage=float(roi_cfg["min_coverage"]),
    )

    tiles_cfg = dict(roi_cfg["tiles"])
    tiles = roi_mod.build_tiles(
        foot,
        rows=int(tiles_cfg["rows"]),
        cols=int(tiles_cfg["cols"]),
        min_fill_fraction=float(tiles_cfg["min_fill_fraction"]),
        min_pixels=int(tiles_cfg["min_pixels"]),
    )

    result: Dict[str, Any] = {
        "method_version": str(cfg["perfusion"]["method_version"]),
        "disclaimer": str(cfg["perfusion"]["disclaimer"]),
        "video": clip.to_dict(),
        "roi": foot.to_dict(),
        "n_tiles": len(tiles),
        "reference_bpm": reference_bpm,
    }

    if foot.n_pixels == 0:
        result["assessment"] = {
            "reliable": False,
            "pulse_rate_bpm": None,
            "reasons": foot.reasons or ["no foot region found"],
        }
        result["_artifacts"] = {"clip": clip, "roi": foot, "tiles": [], "pulses": {}}
        return result

    trace = roi_mod.rgb_trace(clip.frames, foot.mask)

    capture = assess_capture(
        duration_s=clip.duration_s,
        fps=clip.fps,
        fps_source=clip.fps_source,
        roi_coverage=foot.coverage,
        bbox_diagonal_px=foot.bbox_diagonal,
        frames=clip.frames,
        bbox=foot.bbox,
        roi_rgb_trace=trace,
        params=params,
        thresholds=thresholds,
    )
    capture.reasons = list(foot.reasons) + capture.reasons
    capture.ok = len(capture.reasons) == 0

    pulses = {}
    signals = {}
    for method in params.methods:
        p = extract_pulse(trace, clip.fps, method, params)
        pulses[method] = p
        signals[method] = assess_signal(p, trace, params, thresholds)

    assessment = assess_clip(capture, signals, thresholds)
    result["assessment"] = assessment.to_dict()

    if reference_bpm is not None:
        errs = {}
        for m, s in signals.items():
            errs[m] = {
                "estimate_bpm": float(s.pulse_rate_bpm),
                "abs_error_bpm": float(abs(s.pulse_rate_bpm - reference_bpm)),
                "within_resolution": bool(
                    abs(s.pulse_rate_bpm - reference_bpm) <= s.freq_resolution_bpm
                ),
            }
        result["reference_comparison"] = {
            "reference_bpm": float(reference_bpm),
            "per_method": errs,
        }

    if with_tiles and tiles:
        result["tiles"] = _tile_analysis(
            clip, foot, tiles, params, assessment.best_method or params.methods[0]
        )

    result["_artifacts"] = {
        "clip": clip, "roi": foot, "tiles": tiles, "pulses": pulses,
    }
    return result


def _tile_analysis(clip, foot, tiles, params: SignalParams, method: str) -> Dict[str, Any]:
    """Per-tile SNR / rate for the winning method — the seed of a perfusion map.

    No stability check per tile: it triples the cost and a single tile is
    too small to survive one anyway. These numbers are exploratory, which is
    exactly why they are reported separately from the clip verdict.
    """
    traces = roi_mod.tile_traces(clip.frames, tiles)
    rows: List[Dict[str, Any]] = []
    snrs: List[float] = []
    for tile, tr in zip(tiles, traces):
        p = extract_pulse(tr, clip.fps, method, params)
        s = snr_db(
            p.snr_freqs, p.snr_psd, p.peak_hz,
            params.harmonic_halfwidth_hz, params.snr_band_hz,
        )
        rows.append({
            **tile.to_dict(),
            "pulse_rate_bpm": float(p.pulse_rate_bpm),
            "snr_db": float(s) if np.isfinite(s) else None,
        })
        if np.isfinite(s):
            snrs.append(float(s))
    return {
        "method": method,
        "n_tiles": len(rows),
        "snr_db_median": float(np.median(snrs)) if snrs else None,
        "snr_db_max": float(np.max(snrs)) if snrs else None,
        "rate_spread_bpm": (
            float(np.std([r["pulse_rate_bpm"] for r in rows])) if rows else None
        ),
        "per_tile": rows,
    }


# --------------------------------------------------------------------------
# Reporting
# --------------------------------------------------------------------------

def print_report(result: Dict[str, Any]) -> None:
    v = result["video"]
    print()
    print("=" * 74)
    print(f"CLIP  {Path(v['path']).name}")
    print("=" * 74)

    print(f"  resolution     {v['source_size'][0]}x{v['source_size'][1]} "
          f"(analysed at {v['analysis_size'][0]}x{v['analysis_size'][1]})")
    fps_eff = v["fps_effective"]
    eff_txt = f"{fps_eff:.3f}" if fps_eff is not None else "unavailable"
    print(f"  fps            {v['fps']:.3f}  (source: {v['fps_source']}; "
          f"container {v['fps_container']:.3f}, timestamps {eff_txt})")
    print(f"  duration       {v['duration_s']:.2f} s  ({v['n_frames']} frames, "
          f"jitter {v['frame_interval_jitter_ms']:.1f} ms)")
    for w in v["warnings"]:
        print(f"  ! {w}")

    r = result["roi"]
    print(f"  ROI coverage   {r['coverage'] * 100:.1f}% of frame "
          f"({r['n_pixels']} px, bbox {r['bbox']})")
    print(f"  usable tiles   {result['n_tiles']}")

    a = result["assessment"]
    if "capture" in a:
        c = a["capture"]
        m = c["motion"]
        print(f"  shake          p95 {m['jitter_p95_px']:.3f} px/frame "
              f"({c['motion_jitter_frac'] * 100:.2f}% of foot size)")
        print(f"  drift          p95 {m['drift_p95_px']:.3f} px, max "
              f"{m['drift_max_px']:.3f} px "
              f"({c['motion_drift_frac'] * 100:.2f}% of foot size)")
        print(f"  illumination   luma CV {c['illumination_cv'] * 100:.2f}%, "
              f"sub-band drift ratio {c['low_freq_power_ratio']:.1f}")

    print()
    print(f"  {'method':<8} {'bpm':>8} {'SNR dB':>9} {'stability':>11} "
          f"{'res bpm':>9}  grade")
    print(f"  {'-' * 8} {'-' * 8} {'-' * 9} {'-' * 11} {'-' * 9}  {'-' * 9}")
    for name, s in (a.get("signals") or {}).items():
        snr = s["snr_db"]
        snr_txt = f"{snr:9.2f}" if snr is not None else f"{'n/a':>9}"
        stab = (f"{s['rate_stability_bpm']:11.1f}"
                if s["per_window_bpm"] else f"{'n/a':>11}")
        print(f"  {name:<8} {s['pulse_rate_bpm']:8.1f} {snr_txt} {stab} "
              f"{s['freq_resolution_bpm']:9.1f}  {s['grade']}")

    if a.get("method_agreement_bpm") is not None:
        print(f"\n  CHROM vs POS   {a['method_agreement_bpm']:.1f} bpm apart")

    rc = result.get("reference_comparison")
    if rc:
        print(f"\n  reference (pulse oximeter): {rc['reference_bpm']:.1f} bpm")
        for m, e in rc["per_method"].items():
            flag = "within spectral resolution" if e["within_resolution"] else "OUTSIDE resolution"
            print(f"    {m:<8} est {e['estimate_bpm']:6.1f}  "
                  f"abs err {e['abs_error_bpm']:6.1f} bpm   ({flag})")

    t = result.get("tiles")
    if t:
        med = f"{t['snr_db_median']:.2f}" if t["snr_db_median"] is not None else "n/a"
        mx = f"{t['snr_db_max']:.2f}" if t["snr_db_max"] is not None else "n/a"
        spread = (f"{t['rate_spread_bpm']:.1f} bpm"
                  if t["rate_spread_bpm"] is not None else "n/a")
        print(f"\n  per-tile ({t['method']}): {t['n_tiles']} tiles · "
              f"SNR median {med} dB, max {mx} dB · rate spread {spread}")

    print()
    if a["reliable"]:
        print(f"  VERDICT: RELIABLE — pulse {a['pulse_rate_bpm']:.1f} bpm "
              f"via {a['best_method']}")
    else:
        print("  VERDICT: NO RELIABLE PERFUSION SIGNAL")
        for reason in a["reasons"]:
            print(f"    - {reason}")
    print()


# --------------------------------------------------------------------------
# Plot
# --------------------------------------------------------------------------

def save_plot(result: Dict[str, Any], out_png: Path) -> None:
    """ROI overlay + waveform + PSD for every method, in one PNG."""
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    art = result["_artifacts"]
    clip, foot, tiles, pulses = art["clip"], art["roi"], art["tiles"], art["pulses"]
    methods = list(pulses.keys())
    n = max(1, len(methods))

    fig = plt.figure(figsize=(15, 2.6 * n + 3.4))
    gs = fig.add_gridspec(n + 1, 3, height_ratios=[2.2] + [1.0] * n, hspace=0.55,
                          wspace=0.25)

    ax = fig.add_subplot(gs[0, 0])
    mid = clip.frames[clip.n_frames // 2]
    ax.imshow(roi_mod.overlay_mask(mid, foot, tiles))
    ax.set_title(f"ROI {foot.coverage * 100:.1f}% · {len(tiles)} tiles", fontsize=9)
    ax.axis("off")

    trace = roi_mod.rgb_trace(clip.frames, foot.mask) if foot.n_pixels else None
    t_axis = np.arange(clip.n_frames) / clip.fps
    ax = fig.add_subplot(gs[0, 1])
    if trace is not None:
        for i, (c, lbl) in enumerate(zip("rgb", ["R", "G", "B"])):
            ax.plot(t_axis, trace[:, i], color=c, lw=0.7, label=lbl)
        ax.legend(fontsize=7, loc="upper right")
    ax.set_title("raw ROI mean RGB (pre-filter)", fontsize=9)
    ax.set_xlabel("s", fontsize=8)
    ax.tick_params(labelsize=7)

    a = result["assessment"]
    ax = fig.add_subplot(gs[0, 2])
    ax.axis("off")
    verdict = (
        f"RELIABLE — {a['pulse_rate_bpm']:.1f} bpm ({a['best_method']})"
        if a["reliable"] else "NO RELIABLE SIGNAL"
    )
    lines = [
        Path(result["video"]["path"]).name,
        f"{clip.duration_s:.1f} s @ {clip.fps:.2f} fps ({clip.fps_source})",
        "",
        verdict,
        "",
    ] + [f"· {r}" for r in a["reasons"][:6]]
    ax.text(0, 1, "\n".join(lines), va="top", ha="left", fontsize=8,
            family="monospace", transform=ax.transAxes, wrap=True)

    for i, m in enumerate(methods):
        p = pulses[m]
        sig_q = (a.get("signals") or {}).get(m, {})

        ax = fig.add_subplot(gs[i + 1, 0:2])
        show = min(p.signal.size, max(2, int(10 * clip.fps)))  # first 10 s, readable
        ax.plot(t_axis[:show], p.signal[:show], lw=0.8, color="#1f77b4")
        ax.set_title(f"{m} — filtered waveform (first {show / clip.fps:.0f} s)",
                     fontsize=9)
        ax.set_xlabel("s", fontsize=8)
        ax.tick_params(labelsize=7)

        ax = fig.add_subplot(gs[i + 1, 2])
        ax.semilogy(p.freqs * 60.0, np.maximum(p.psd, 1e-18), lw=0.9, color="#333")
        if p.peak_hz > 0:
            ax.axvline(p.peak_hz * 60.0, color="crimson", lw=1.0, ls="--")
        if p.freqs.size:
            ax.set_xlim(float(p.freqs.min()) * 60.0, float(p.freqs.max()) * 60.0)
        snr_val = sig_q.get("snr_db")
        snr_txt = f"{snr_val:.1f} dB" if snr_val is not None else "n/a"
        ax.set_title(f"{m} PSD — {p.pulse_rate_bpm:.1f} bpm, SNR {snr_txt}",
                     fontsize=9)
        ax.set_xlabel("bpm", fontsize=8)
        ax.tick_params(labelsize=7)

    fig.suptitle(
        f"SoleIQ perfusion Phase 0 · {result['method_version']} · "
        "EXPERIMENTAL — not a diagnosis",
        fontsize=10,
    )
    out_png.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(out_png, dpi=110, bbox_inches="tight")
    plt.close(fig)


# --------------------------------------------------------------------------

def _collect_videos(target: Path) -> List[Path]:
    if target.is_dir():
        return sorted(
            p for p in target.iterdir()
            if p.suffix.lower() in VIDEO_SUFFIXES and not p.name.startswith(".")
        )
    return [target]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--video", required=True, help="video file or directory of clips")
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--out", default=None, help="output dir (default artifacts/perfusion)")
    ap.add_argument("--tiles", action="store_true", help="also compute per-tile SNR")
    ap.add_argument("--reference-bpm", type=float, default=None,
                    help="pulse-oximeter reading taken during the clip")
    ap.add_argument("--no-plot", action="store_true")
    args = ap.parse_args()

    cfg = load_config(args.config)
    out_dir = Path(args.out) if args.out else (
        project_root() / cfg["paths"]["artifacts"] / "perfusion"
    )
    out_dir.mkdir(parents=True, exist_ok=True)

    videos = _collect_videos(Path(args.video))
    if not videos:
        raise SystemExit(f"no video files found at {args.video}")

    summary: List[Dict[str, Any]] = []
    for path in videos:
        try:
            result = analyze_clip(path, cfg, args.tiles, args.reference_bpm)
        except VideoReadError as e:
            print(f"\n[perfusion] SKIP {path.name}: {e}")
            summary.append({"clip": path.name, "error": str(e)})
            continue

        print_report(result)

        stem = path.stem
        if not args.no_plot:
            png = out_dir / f"{stem}.png"
            save_plot(result, png)
            print(f"  plot -> {png}")

        result.pop("_artifacts", None)
        json_path = out_dir / f"{stem}.json"
        json_path.write_text(json.dumps(result, indent=2))
        print(f"  json -> {json_path}\n")

        a = result["assessment"]
        summary.append({
            "clip": path.name,
            "duration_s": round(result["video"]["duration_s"], 2),
            "fps": round(result["video"]["fps"], 2),
            "roi_coverage": round(result["roi"]["coverage"], 4),
            "reliable": a["reliable"],
            "pulse_rate_bpm": a["pulse_rate_bpm"],
            "best_method": a.get("best_method"),
            "snr_db": {
                k: (round(v["snr_db"], 2) if v["snr_db"] is not None else None)
                for k, v in (a.get("signals") or {}).items()
            },
            "reasons": a["reasons"],
        })

    if len(summary) > 1:
        print("=" * 74)
        print("SUMMARY")
        print("=" * 74)
        print(f"  {'clip':<28} {'dur':>6} {'fps':>6} {'ROI%':>6} {'reliable':>9} {'bpm':>7}")
        for s in summary:
            if "error" in s:
                print(f"  {s['clip']:<28} {'ERROR':>6}  {s['error'][:30]}")
                continue
            bpm = f"{s['pulse_rate_bpm']:.1f}" if s["pulse_rate_bpm"] else "-"
            print(f"  {s['clip']:<28} {s['duration_s']:6.1f} {s['fps']:6.1f} "
                  f"{s['roi_coverage'] * 100:6.1f} {str(s['reliable']):>9} {bpm:>7}")
        (out_dir / "summary.json").write_text(json.dumps(summary, indent=2))
        print(f"\n  summary -> {out_dir / 'summary.json'}")

    n_ok = sum(1 for s in summary if s.get("reliable"))
    print(f"\n[perfusion] {n_ok}/{len(summary)} clip(s) produced a reliable signal.")
    print("[perfusion] EXPERIMENTAL research harness — not a medical device.\n")


if __name__ == "__main__":
    main()
