import { describe, expect, it } from "vitest";
import {
  escapeHtml,
  formatAssessmentDate,
  renderReportSummaryHtml,
  renderReportSummaryText,
  reportSummarySubject,
  riskTone,
  type ReportSummaryEmailData,
} from "@/server/email/templates/reportSummary";

/**
 * The template is pure string building, which is why it is testable at all:
 * no Resend account, no network, no DOM. What is asserted here is the part
 * that would be embarrassing to get wrong in a patient's inbox — escaping,
 * the link, the disclaimer, and the promise that no findings leak into the
 * body.
 */

const SAMPLE: ReportSummaryEmailData = {
  patientName: "Jordan Ellis",
  patientEmail: "jordan.ellis@example.com",
  reportId: "8f1c2d34-5b6a-4c7d-9e01-2f3a4b5c6d7e",
  assessmentDate: "2026-08-24T09:30:00.000Z",
  overallStatus: "Assessment complete",
  riskLevel: "watch",
  summaryText:
    "Your check finished. There are a couple of things worth keeping an eye on before your next visit.",
  metrics: [
    { label: "Care team", value: "St Mary's Podiatry" },
    { label: "Report reference", value: "8f1c2d34" },
  ],
  reportUrl: "https://app.soleiqhealth.com/records/8f1c2d34-5b6a-4c7d-9e01-2f3a4b5c6d7e",
};

describe("report summary email", () => {
  it("puts the patient, date and status in the subject and body", () => {
    const subject = reportSummarySubject(SAMPLE);
    expect(subject).toContain("24 August 2026");

    const html = renderReportSummaryHtml(SAMPLE);
    expect(html).toContain("Jordan Ellis");
    expect(html).toContain("Assessment complete");
    expect(html).toContain("24 August 2026");
  });

  it("links to the full report with the brand button colour", () => {
    const html = renderReportSummaryHtml(SAMPLE);
    expect(html).toContain(`href="${SAMPLE.reportUrl}"`);
    expect(html).toContain("See my full results");
    // #1F4E79 is --c-primary (31 78 121) from app/globals.css.
    expect(html).toContain("#1F4E79");
  });

  it("renders every metric as a label/value row, escaped", () => {
    const html = renderReportSummaryHtml(SAMPLE);
    for (const metric of SAMPLE.metrics) {
      expect(html).toContain(escapeHtml(metric.label));
      expect(html).toContain(escapeHtml(metric.value));
    }
    // "St Mary's Podiatry" must reach the inbox escaped, not raw — this is
    // the assertion that caught the apostrophe when it was written naively.
    expect(html).toContain("St Mary&#39;s Podiatry");
    expect(html).not.toContain("St Mary's Podiatry");
  });

  it("omits the metrics table entirely when there are none", () => {
    const html = renderReportSummaryHtml({ ...SAMPLE, metrics: [] });
    expect(html).not.toContain("Report reference");
    // No empty bordered table left behind.
    expect(html).not.toContain("border-top:1px solid #E4DFD3;\">\n              </table>");
  });

  it("escapes names and summary text rather than emitting raw markup", () => {
    const html = renderReportSummaryHtml({
      ...SAMPLE,
      patientName: 'Aoife <script>alert("x")</script> O\'Neill',
      summaryText: "Redness & swelling <observed>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Redness &amp; swelling &lt;observed&gt;");
    expect(html).toContain("&#39;Neill");
  });

  it("carries the medical disclaimer in both parts", () => {
    const disclaimer = "not a diagnosis";
    expect(renderReportSummaryHtml(SAMPLE)).toContain(disclaimer);
    expect(renderReportSummaryText(SAMPLE)).toContain(disclaimer);
  });

  it("always produces a plain-text alternative with the link in it", () => {
    const text = renderReportSummaryText(SAMPLE);
    expect(text).toContain(SAMPLE.reportUrl);
    expect(text).toContain("Jordan Ellis");
    expect(text).not.toContain("<");
  });

  it("maps known risk levels to their palette and degrades gracefully", () => {
    expect(riskTone("clear").label).toBe("Clear");
    expect(riskTone("urgent").fg).toBe("#A94F3F");
    // An unrecognised level must still render something readable.
    expect(riskTone("something_new").label).toBe("something new");
  });

  it("does not fail on an unparseable assessment date", () => {
    expect(formatAssessmentDate("not-a-date")).toBe("Recently");
    expect(() =>
      renderReportSummaryHtml({ ...SAMPLE, assessmentDate: "not-a-date" })
    ).not.toThrow();
  });

  it("escapes the five characters that matter", () => {
    expect(escapeHtml(`<>&"'`)).toBe("&lt;&gt;&amp;&quot;&#39;");
  });
});
