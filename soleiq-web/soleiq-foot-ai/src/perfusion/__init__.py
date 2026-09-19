"""Remote-PPG (rPPG) perfusion analysis for foot video.

PHASE 0 SCOPE: classical signal processing only. There is no learned model
here and nothing in this package is wired into the serving layer.

The purpose of this package right now is to answer one question honestly:
*is a pulsatile signal extractable from foot video at all?* If CHROM/POS
cannot find a stable peak in 0.75-2.5 Hz on a well-captured clip, a deep
model trained on the same input will not do better, and we need to know
that before building one.

Scientific caveats that the code is built to respect:

  * rPPG requires video. A still photo carries no temporal information and
    can never yield blood flow.
  * Every published TS-CAN / MetaPhys result is on FACES. The pulsatile
    component in an extremity is far weaker, and in peripheral arterial
    disease reduced perfusion is itself the pathology being screened for.
  * The system must be able to say "no reliable perfusion signal". It must
    never emit a plausible-looking number it cannot support.

Reference:
  Liu et al., "MetaPhys: Few-Shot Adaptation for Non-Contact Physiological
  Measurement", ACM CHIL 2021.
"""

from __future__ import annotations

__all__ = [
    "video_io",
    "roi",
    "classical_rppg",
    "quality",
]
