"""HTML eval report writer.

Plots ROC, PR, calibration, and a Grad-CAM example grid. Embeds plots
as base64 PNGs so the HTML file is self-contained.
"""

from __future__ import annotations

import base64
import io
from pathlib import Path
from typing import Optional

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from jinja2 import Template

from src.eval.metrics import EvalResult


HTML = Template(r"""<!doctype html>
<html><head>
<meta charset="utf-8">
<title>SoleIQ foot-AI — Eval report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif;
         margin: 24px; color: #222; max-width: 920px; }
  h1 { color: #1F4E79; }
  h2 { color: #1F4E79; border-bottom: 1px solid #ddd; padding-bottom: 4px;
       margin-top: 28px; }
  table { border-collapse: collapse; margin: 8px 0 20px; }
  th, td { padding: 6px 12px; border-bottom: 1px solid #eee; text-align: left; }
  th { color: #555; }
  .pill { display:inline-block; padding: 2px 10px; border-radius: 999px;
          background: #1F4E79; color:#fff; font-weight:600; font-size: 12px; }
  .warn { background: #FAEEDA; border: 1px solid #BF8F00; padding: 10px;
          border-radius: 8px; margin: 12px 0; color: #633806; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  img { max-width: 100%; }
  small { color: #5F5E5A; }
</style></head><body>

<h1>SoleIQ foot-AI — eval report</h1>
<small>Model version {{ model_version }} · Reference bank {{ rb_version }}</small>

<div class="warn">
<b>Decision support — not a diagnosis.</b> These numbers come from the held-out
test set described below. They do not constitute clinical validation. Any
deployment for patient use requires prospective validation and applicable
regulatory review.
</div>

<h2>Headline</h2>
<p>Operating threshold: <span class="pill">{{ "%.3f"|format(threshold) }}</span>
tuned to target sensitivity ≥ {{ "%.2f"|format(target_recall) }}.</p>
<table>
  <tr><th>Metric</th><th>Value</th></tr>
  {% for k, v in metrics.items() %}
  <tr><td>{{ k }}</td><td>{{ "%.3f"|format(v) }}</td></tr>
  {% endfor %}
</table>

{% if notes %}
<div class="warn">
<b>Notes</b>
<ul>{% for n in notes %}<li>{{ n }}</li>{% endfor %}</ul>
</div>
{% endif %}

<h2>Dataset</h2>
<p>Test-set size: <b>{{ test_size }}</b></p>
<p>Class distribution on test:</p>
<table>
  <tr><th>Class</th><th>Count</th></tr>
  {% for c, n in class_distribution.items() %}
  <tr><td>{{ c }}</td><td>{{ n }}</td></tr>
  {% endfor %}
</table>

<h2>Confusion matrix (rows=true, cols=pred)</h2>
<table>
  <tr><th></th><th>pred no_ulcer</th><th>pred ulcer</th></tr>
  <tr><th>true no_ulcer</th><td>{{ confusion[0][0] }}</td><td>{{ confusion[0][1] }}</td></tr>
  <tr><th>true ulcer</th><td>{{ confusion[1][0] }}</td><td>{{ confusion[1][1] }}</td></tr>
</table>

<div class="grid">
  <div><h2>ROC</h2><img src="data:image/png;base64,{{ roc_png }}"></div>
  <div><h2>PR</h2><img src="data:image/png;base64,{{ pr_png }}"></div>
  <div><h2>Calibration</h2><img src="data:image/png;base64,{{ cal_png }}"></div>
</div>

{% if gradcam_png %}
<h2>Grad-CAM grid</h2>
<p><small>Heatmaps overlaid on a sample of correctly + incorrectly classified
test images. Inspect these — if attention is focused on the floor instead
of the foot, the model is cheating on backgrounds.</small></p>
<img src="data:image/png;base64,{{ gradcam_png }}">
{% endif %}

</body></html>
""")


def _png_b64(fig) -> str:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", bbox_inches="tight", dpi=110)
    plt.close(fig)
    return base64.b64encode(buf.getvalue()).decode("ascii")


def _plot_roc(result: EvalResult) -> str:
    fig, ax = plt.subplots(figsize=(4.5, 4.5))
    ax.plot(result.roc["fpr"], result.roc["tpr"], label=f"AUROC={result.metrics['auroc']:.3f}")
    ax.plot([0, 1], [0, 1], "--", color="#999")
    ax.set_xlabel("FPR (1-specificity)")
    ax.set_ylabel("TPR (sensitivity)")
    ax.set_title("ROC")
    ax.legend(loc="lower right")
    return _png_b64(fig)


def _plot_pr(result: EvalResult) -> str:
    fig, ax = plt.subplots(figsize=(4.5, 4.5))
    ax.plot(result.pr["recall"], result.pr["precision"], label=f"AUPRC={result.metrics['auprc']:.3f}")
    ax.set_xlabel("Recall (sensitivity)")
    ax.set_ylabel("Precision (PPV)")
    ax.set_title("PR")
    ax.legend(loc="lower left")
    return _png_b64(fig)


def _plot_calibration(result: EvalResult) -> str:
    fig, ax = plt.subplots(figsize=(4.5, 4.5))
    rel = result.reliability
    ax.plot([0, 1], [0, 1], "--", color="#999", label="perfect")
    if rel["confidences"]:
        ax.plot(rel["confidences"], rel["accuracies"], "o-", label=f"ECE={rel['ece'][0]:.3f}")
    ax.set_xlabel("Predicted probability")
    ax.set_ylabel("Empirical accuracy")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.set_title("Calibration")
    ax.legend(loc="upper left")
    return _png_b64(fig)


def write_report(
    result: EvalResult,
    out_path: Path,
    model_version: str,
    rb_version: str,
    gradcam_png_b64: Optional[str] = None,
) -> Path:
    html = HTML.render(
        threshold=result.threshold,
        target_recall=result.target_recall,
        metrics=result.metrics,
        notes=result.notes,
        test_size=result.test_size,
        class_distribution=result.class_distribution,
        confusion=result.confusion,
        roc_png=_plot_roc(result),
        pr_png=_plot_pr(result),
        cal_png=_plot_calibration(result),
        gradcam_png=gradcam_png_b64,
        model_version=model_version,
        rb_version=rb_version,
    )
    out_path.write_text(html)
    return out_path
