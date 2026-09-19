# Perfusion (rPPG) capture protocol — Phase 0

**Status: research feasibility. Not a medical procedure, not a diagnostic test.**

This document tells you exactly how to record the clips that decide whether
remote photoplethysmography works on a foot at all. Follow it literally —
almost every failure mode in rPPG is a capture failure, not an algorithm
failure, and if the clips are sloppy the answer to the Phase 0 question will
be "we don't know" rather than yes or no.

Read [Why this is hard](#why-this-is-hard) first. It explains what each rule
is defending against, which matters more than the rules themselves.

---

## 1. What you need

| Item | Required? | Notes |
|---|---|---|
| iPhone (or any phone that shoots 1080p30) | yes | |
| Tripod, phone clamp, or a stack of books | **yes** | Handheld will fail the drift gate. This is not optional. |
| Fingertip pulse oximeter | strongly recommended | Any drugstore model works for Phase 0. See [§5](#5-reference-pulse). |
| Diffuse, steady light source | yes | See [§3](#3-lighting). |
| Rolled towel or small cushion | yes | To support the ankle. |
| Room thermometer | recommended | Cold feet vasoconstrict; record the temperature. |

---

## 2. Camera settings (iPhone)

Use the **native Camera app in Video mode**. Do not use a third-party app
unless it lets you lock exposure numerically.

1. **Settings → Camera → Formats → "Most Compatible"** (H.264, not HEVC).
   HEVC `.mov` files decode inconsistently across OpenCV builds; H.264 is safe.
2. **Settings → Camera → Record Video → 1080p at 30 fps.** Not 60 fps — it
   halves the per-frame exposure and adds sensor noise for no benefit, since
   the entire pulse band tops out at 2.5 Hz.
3. **Settings → Camera → Record Video → HDR Video: OFF.** This is important.
   Dolby Vision HDR applies per-frame tone mapping, so frame brightness
   becomes a function of scene content rather than of incident light. That is
   precisely the signal we are trying to measure, destroyed at the encoder.
4. **If you have an iPhone 13 Pro or later: turn ON Apple ProRes** for at
   least the first few clips. See [§7](#7-the-compression-problem) — this is
   the single highest-value setting on the list, and worth the ~1.7 GB per
   30 s clip.
5. **Lock exposure and focus.** Frame the foot, then **press and hold** on it
   until the yellow `AE/AF LOCK` banner appears. Verify the banner is visible
   before you start recording. If the brightness visibly shifts mid-clip,
   discard and redo.
6. Turn off any "Enhanced Stabilization" / "Action mode" — digital
   stabilisation warps and resamples the frame, which moves tissue across
   pixels in a way that mimics and masks the pulse.

---

## 3. Lighting

**Use:** north-facing window daylight, an overcast day, a large softbox, or
a lamp bounced off a white ceiling or wall.

**Avoid:**

- **Direct sunlight** — blows out highlights and casts hard shadows that move
  with the tiniest foot motion.
- **Dimmable LED bulbs** — most dim by PWM at a few hundred Hz to a few kHz.
  Sampled at 30 fps this aliases to an essentially arbitrary frequency, and
  it can land inside the 45–150 bpm pulse band. A "pulse" from a light
  dimmer is indistinguishable from a real one on the spectrum. **If the
  fixture has a dimmer, set it to 100% or use a different light.**
- **Mixed sources** (window + lamp) — the mix ratio changes if anything in
  the room moves.
- **The phone's torch/flash** — directional, produces specular hotspots on
  skin, and heats the sensor over 30 s.

Mains flicker at 100/120 Hz mostly aliases harmlessly at 30 fps, but only if
the frame rate is genuinely constant. It usually is not (see [§8](#8-the-frame-rate-problem)),
so prefer daylight when you can.

---

## 4. Positioning and the subject

- **Foot 30–50 cm from the lens**, filling **at least a third of the frame**.
  The harness rejects clips where the foot covers under 6% of the frame, but
  more skin means more averaging and a better signal.
- **Support the ankle and calf** on a rolled towel so no muscle is holding
  the foot in position. An unsupported foot micro-corrects continuously.
- Camera roughly **perpendicular to the skin surface** being filmed.
- Sit or lie still. **Do not talk.** Breathe normally — respiration sits near
  0.2–0.3 Hz, well below the pulse band, and the filter handles it.
- **Sock off for at least 5 minutes** before recording. A just-removed sock
  leaves compression marks and reactive hyperaemia that change perfusion.
- **Room at roughly 22–24 °C.** Cold feet vasoconstrict, which is the exact
  thing we are trying to measure. **Record the room temperature for each clip.**
- No caffeine, nicotine, or exercise in the 30 minutes beforehand — all three
  move peripheral perfusion substantially.
- Clean, dry skin. No lotion or oil (specular reflection).

**Duration: 30 seconds per clip.** The minimum the harness accepts is 8 s,
but frequency resolution improves with length and 30 s is cheap. Start
recording, then hold still for a beat before and after so you can trim.

---

## 5. Reference pulse

You need something to check the answer against. Both options below are
acceptable; they answer different questions and you should use both.

### Option A — fingertip pulse oximeter (use this for ground truth)

This is a genuine independent physical measurement, and it is what makes an
accuracy claim possible at all.

**How to synchronise it, which is the part people get wrong:** put the
**oximeter display inside the camera frame**, next to the foot, so its
reading is recorded in the same video. Then the heart rate is timestamped
against the clip automatically with no clock alignment needed. Rest the
oximeter hand on the same surface so it does not add motion.

Note the reading at the start and end of each clip and write both down; if
they differ by more than ~5 bpm the rate was not stable and the clip is a
poor accuracy reference even if the video is good.

> **Limitation you need to know about now, because it affects Phase 2.**
> A drugstore oximeter displays an *averaged heart rate*, updated every
> second or two. It does not export a *waveform*. That is sufficient for
> Phase 0, where the question is only "is there a peak at the right
> frequency?". It is **not** sufficient to train the Phase 2 model, whose
> labels are per-frame PPG waveforms. If Phase 0 succeeds and you want to
> collect your own training data, you will need an oximeter with waveform
> output over Bluetooth or serial (the Contec CMS50D+/CMS50E and Berry
> BM1000C families are the usual low-cost research choices). Don't buy one
> yet — wait for the Phase 0 result.

### Option B — simultaneous or adjacent face video (use this as a positive control)

Record a 30-second clip of your **face** with the same camera, same lighting,
same settings, immediately before or after each foot clip.

This is *not* ground truth — face rPPG is itself an estimate, so using it as
a reference would be measuring one estimate against another. Its value is
different and, for Phase 0, arguably greater: **it separates "the method
fails here" from "the rig is broken."** Every published TS-CAN and MetaPhys
result is on faces. If the face clip from your setup also shows no pulse,
the problem is your lighting, your exposure lock, or your camera — not the
foot, and not the algorithm. If the face clip shows a clean pulse and the
foot clip does not, that is a real and meaningful negative result about
extremity rPPG.

---

## 6. The clips to record

Record them in this order. It is a difficulty ladder, and where it breaks
tells you *why* it broke.

| # | Filename | What | Why |
|---|---|---|---|
| 1 | `01_face_control.mov` | Your face, 30 s | Positive control. Proves the rig works. |
| 2 | `02_palm_control.mov` | Palm of your hand, 30 s | Intermediate: an extremity, but a well-perfused one. |
| 3 | `03_dorsum_left.mov` | Top of left foot, 30 s | The real target. |
| 4 | `04_dorsum_right.mov` | Top of right foot, 30 s | Left/right asymmetry is clinically interesting. |
| 5 | `05_sole_left.mov` | Sole of left foot, 30 s | Thicker stratum corneum — expected to be harder. |
| 6 | `06_negative_control.mov` | A beige cushion or a bag of rice, 30 s | **Must be rejected.** If the harness reports a heart rate for a cushion, the thresholds are wrong. |
| 7 | `07_dorsum_left_warm.mov` | Left foot after warming, 30 s | See the safety note below. |

**Clip 7 (warming) — safety.** Warming the foot vasodilates it and should
strengthen the signal, which is a strong positive control: it demonstrates
any recovered signal is genuinely vascular. Warm with a **warm (not hot)
towel for 2 minutes**, tested on your inner wrist first.

> **Do not do this on a patient with diabetic neuropathy, and do not build it
> into any patient-facing flow.** A neuropathic foot cannot feel heat and
> burns are a recognised cause of ulceration. This step is for your own
> healthy foot during development only.

For each clip write down: date/time, which foot, room temperature, oximeter
HR at start and end, lighting used, and whether `AE/AF LOCK` was engaged.
A plain text file next to the clips is fine.

**If anyone other than you appears in a clip, you need their informed
consent, and the clip is PHI.** Keep every clip on your own machine. Do not
upload any of this to a third-party API.

---

## 7. The compression problem

This is the finding most likely to decide the outcome, so it gets its own
section.

The pulsatile component of skin reflectance is on the order of **0.1–1% of
the total intensity** — a change of one or two values in an 8-bit channel.
Lossy video codecs are specifically designed to discard changes that small,
because human viewers cannot see them.

Measured on synthetic clips containing an exactly-known pulse
(`scripts/make_synthetic_perfusion_clip.py`, 20 s, 78 bpm):

| Pulse modulation | Lossless (FFV1) SNR | MPEG-4 SNR | Verdict change |
|---|---|---|---|
| 0.1% | +13.2 dB | −5.5 dB | reliable → **rejected** |
| 0.2% | +18.7 dB | −3.4 dB | reliable → **rejected** |
| 0.4% | +24.2 dB | +1.7 dB | reliable → **rejected** |
| 0.8% | +29.2 dB | +4.0 dB | both pass, bpm error 2.3 |
| 1.6% | +33.3 dB | +12.3 dB | both pass |

Lossless encoding recovers the exact rate at every depth tested, down to
0.1%. Compressed, the detection floor rises roughly eightfold.

Two caveats, because these numbers are easy to over-read. The compressed
clips came from OpenCV's default encoder settings at roughly 100 kbps, far
below what a phone produces — so this establishes the *mechanism* and the
*direction*, not a bitrate threshold you can transfer to an iPhone. And the
synthetic clips have spatially independent per-pixel noise, which spatial
averaging suppresses far better than real correlated sensor and compression
noise; the true detection floor on real video will be worse than shown here.

**What to do about it:** shoot **ProRes** if your phone supports it, for at
least clips 1, 3 and 6. If it does not, shoot at the highest quality setting
available and expect this to be a live confound in interpreting the result.

---

## 8. The frame-rate problem

iPhones record **variable-frame-rate** video. The container declares 30 fps;
the actual spacing between frames wanders, and in dim light iOS will quietly
drop the capture rate to keep exposure up.

Every bpm number is fps × 60 × (peak bin). Analysing a 24 fps clip as 30 fps
gives a heart rate that is wrong by 25% and looks entirely plausible.

The harness handles this: it reads per-frame timestamps, derives an effective
fps, compares it against the container's declared value, and reports both
plus the frame-interval jitter. Check the `fps` line it prints. If it says
`source: fallback`, the clip has no usable timing and its bpm is meaningless.

The practical mitigation is **plenty of light** — well-lit scenes keep the
capture rate pinned at the nominal value.

---

## 9. Running the analysis

```bash
cd ~/Documents/soleiq-foot-ai

# One clip, with the oximeter reading you noted
python -m src.perfusion.cli --video clips/03_dorsum_left.mov --reference-bpm 72

# A whole session at once, with per-tile detail
python -m src.perfusion.cli --video clips/ --tiles
```

Each clip produces a printed report, a JSON blob, and a PNG showing the ROI,
the raw RGB trace, and each method's waveform and spectrum. A summary table
is printed when you pass a directory.

**How to read the verdict.** `RELIABLE` requires *all* of: SNR above 3 dB,
CHROM and POS agreeing within 5 bpm, a rate that is stable across sub-windows
of the clip, and the capture gates (duration, fps, ROI coverage, motion,
illumination) passing. Any failure suppresses the number entirely and prints
the reason. **A missing bpm is a result, not a bug** — it is the harness
declining to make something up.

The thresholds live in `config.yaml` under `perfusion.quality`. They are
inherited from facial rPPG practice and have **not** been calibrated on feet.
Once we have clips with oximeter ground truth, they should be re-tuned
against it rather than left at their current values.

---

## Why this is hard

Four things make foot rPPG substantially harder than the face work these
methods were built for.

**The signal is weak, and its weakness is the finding.** Facial rPPG works
because the face is superficially and richly vascularised. Extremities are
not. In peripheral arterial disease, reduced perfusion is the pathology being
screened for — so the very population this feature targets is the population
where the signal is smallest. A clean negative result on healthy feet would
be strong evidence against the whole approach.

**Nothing here is validated on feet.** TS-CAN and MetaPhys report facial
results exclusively. There is no published foot-rPPG benchmark, and no
public dataset. We are extrapolating.

**Auto-exposure is the classic killer.** Modern phone cameras continuously
adjust gain and white balance. Those adjustments are slow, smooth, and
periodic-looking — they land in or near the pulse band, and they are much
larger than the pulse. Locking exposure is the single highest-value thing
you can do while recording. (This is also why Phase 1 spends effort trying to
lock exposure programmatically, and why it warns the user when the browser
will not let it.)

**Any spectrum has a maximum.** The power spectrum of a video of a wall has a
peak somewhere in 0.75–2.5 Hz. A pipeline that reports its argmax as a heart
rate will produce confident, precise, meaningless numbers forever. This is
why the harness cross-checks SNR, harmonic structure, temporal stability, and
agreement between two independent colour projections before it will print a
rate — and why clip 6, the cushion, is a required part of the protocol.

---

## References

- De Haan & Jeanne (2013), *Robust pulse rate from chrominance-based rPPG*,
  IEEE TBME — CHROM, and the SNR definition used here.
- Wang et al. (2017), *Algorithmic Principles of Remote PPG*, IEEE TBME — POS.
- Tarvainen et al. (2002), *An advanced detrending method with application to
  HRV analysis*, IEEE TBME — smoothness-priors detrending.
- Liu et al. (2021), *MetaPhys: Few-Shot Adaptation for Non-Contact
  Physiological Measurement*, ACM CHIL — the Phase 2 modelling target.
