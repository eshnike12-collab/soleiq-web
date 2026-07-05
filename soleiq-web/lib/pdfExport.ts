"use client";

import type { PatientSummary } from "./exportSummary";

/**
 * Generate a multi-page PDF from a patient summary. Dynamic-imports jspdf so
 * it's only loaded client-side.
 */
export async function downloadPatientSummaryPdf(s: PatientSummary): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });

  const margin = 48;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const lineH = 14;
  let y = margin;

  const newPage = () => {
    doc.addPage();
    y = margin;
  };
  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) newPage();
  };
  const heading = (text: string, size = 16) => {
    ensureSpace(size + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    doc.setTextColor(31, 78, 121); // brand
    doc.text(text, margin, y);
    y += size + 4;
    doc.setTextColor(28, 28, 28);
  };
  const subheading = (text: string) => {
    ensureSpace(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(31, 78, 121);
    doc.text(text.toUpperCase(), margin, y);
    y += 12;
    doc.setTextColor(28, 28, 28);
  };
  const body = (text: string, indent = 0, size = 10) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(size);
    const wrapped = doc.splitTextToSize(text, pageW - margin * 2 - indent);
    wrapped.forEach((line: string) => {
      ensureSpace(lineH);
      doc.text(line, margin + indent, y);
      y += lineH;
    });
  };
  const bullet = (text: string) => {
    const wrapped = doc.splitTextToSize(text, pageW - margin * 2 - 16);
    wrapped.forEach((line: string, i: number) => {
      ensureSpace(lineH);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      if (i === 0) doc.text("•", margin, y);
      doc.text(line, margin + 14, y);
      y += lineH;
    });
  };
  const hr = () => {
    ensureSpace(8);
    doc.setDrawColor(211, 209, 199);
    doc.line(margin, y, pageW - margin, y);
    y += 10;
  };
  const tag = (label: string, value: string | number | undefined) => {
    if (value == null || value === "") return;
    ensureSpace(lineH);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    doc.text(String(value), margin + 110, y);
    y += lineH;
  };

  // ---------- Header ----------
  heading("SoleIQ — Foot Risk Screening", 18);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(95, 94, 90);
  doc.text(
    `Generated ${new Date(s.generatedAt).toLocaleString()}  ·  Visit ${s.visit.id}`,
    margin,
    y
  );
  y += lineH;
  doc.setTextColor(28, 28, 28);
  hr();

  // ---------- Patient ----------
  subheading("Patient");
  tag("Name", s.patient.fullName);
  tag("Age", s.patient.age);
  tag("Sex", s.patient.sex);
  tag(
    "Location",
    [s.patient.city, s.patient.state].filter(Boolean).join(", ")
  );
  tag("Ethnicity", s.patient.ethnicity);
  tag(
    "Shoe size",
    s.patient.shoeSizeUS
      ? `US ${s.patient.shoeSizeUS}${s.patient.footLengthMm ? ` (${s.patient.footLengthMm} mm)` : ""}`
      : undefined
  );
  hr();

  // ---------- Risk ----------
  subheading("Risk assessment");
  if (s.visit.riskLevel) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    const colors: Record<string, [number, number, number]> = {
      low: [84, 130, 53],
      medium: [191, 143, 0],
      high: [192, 0, 0],
    };
    const c = colors[s.visit.riskLevel] ?? [28, 28, 28];
    doc.setTextColor(...c);
    doc.text(`OVERALL: ${s.visit.riskLevel.toUpperCase()}`, margin, y);
    doc.setTextColor(28, 28, 28);
    y += 18;
  }
  if (s.riskFactors.length) {
    body("Top contributing factors:");
    s.riskFactors.forEach((f) => bullet(f));
  }
  hr();

  // ---------- Medical history ----------
  subheading("Medical history");
  if (s.medicalHistory.length === 0) body("(none reported)");
  else s.medicalHistory.forEach((c) => bullet(c));

  if (s.diabetes) {
    y += 4;
    body("Diabetes:");
    bullet(
      `${s.diabetes.type.replace("_", " ")} — diagnosed ${s.diabetes.yearDiagnosed} (${s.diabetes.yearsSinceDiagnosis} years ago)`
    );
    if (s.diabetes.hba1c != null)
      bullet(
        `HbA1c ${s.diabetes.hba1c.toFixed(1)}% (eAG ≈ ${s.diabetes.eAGmgdl} mg/dL)`
      );
    if (s.diabetes.glucoseLabel)
      bullet(`Latest glucose meter reading: ${s.diabetes.glucoseLabel}`);
  }

  if (s.pad) {
    y += 4;
    body("Peripheral artery disease:");
    bullet(`Status: ${s.pad.status}`);
    if (s.pad.abi != null) bullet(`ABI: ${s.pad.abi.toFixed(2)}`);
    if (s.pad.claudication) bullet("Intermittent claudication: yes");
    if (s.pad.restPain) bullet("Rest pain: yes");
    if (s.pad.signs.length)
      bullet(`Clinical signs: ${s.pad.signs.join("; ")}`);
  }

  if (s.priorEvents.length) {
    y += 4;
    body("Prior foot events:");
    s.priorEvents.forEach((e) =>
      bullet(`${e.year} — ${e.side} ${e.region.replace("_", " ")} ${e.type}`)
    );
  }

  if (s.recentSurgery.flag && s.recentSurgery.procedures.length) {
    y += 4;
    body("Recent foot surgery (12 mo):");
    s.recentSurgery.procedures.forEach((p) =>
      bullet(p.replace(/_/g, " "))
    );
  }
  hr();

  // ---------- Symptoms ----------
  subheading("Symptoms & lifestyle");
  tag("Numbness", s.numbness);
  tag("Pain reported", s.painPresent ? "yes" : "no");
  if (s.painPoints.length)
    bullet(`Pain regions: ${s.painPoints.length} marked`);
  tag("Alcohol", s.alcohol ? "yes" : "no");
  tag("Smoking", s.smoking ? "yes" : "no");
  hr();

  // ---------- Findings ----------
  subheading("Detected findings");
  if (s.detections.length === 0) body("(no skin/wound findings detected)");
  else
    s.detections.forEach((d) =>
      bullet(
        `${d.type} — ${d.side} ${d.view} (confidence ${(d.confidence * 100).toFixed(0)}%)`
      )
    );
  hr();

  // ---------- Volumetrics ----------
  if (s.volumetrics.length) {
    subheading("Volumetric metrics");
    s.volumetrics.forEach((v) => {
      body(
        `${v.side.toUpperCase()} foot — length ${v.footLengthMm} mm, plantar area ${v.plantarAreaCm2} cm², arch ${v.archProfileMm} mm, asymmetry ${v.bilateralAsymmetryIndex.toFixed(2)}`
      );
      if (v.woundVolumeMm3 != null)
        bullet(
          `Wound volume ${v.woundVolumeMm3} mm³${v.woundDepthMm != null ? `, depth ${v.woundDepthMm.toFixed(1)} mm` : ""}`
        );
    });
    hr();
  }

  // ---------- Clinical detail ----------
  if (s.clinicalDetail) {
    subheading("Clinical detail — risk axes");
    s.clinicalDetail.riskAxes.forEach((axis) => {
      body(`${axis.label} — ${axis.score.toUpperCase()} (weight ${(axis.weight * 100).toFixed(0)}%)`);
      axis.signals.forEach((sig) => bullet(sig));
      y += 2;
    });

    subheading("Recommended follow-up");
    body(`Cadence: ${s.clinicalDetail.followUp.cadence}`);
    body(s.clinicalDetail.followUp.rationale);

    subheading("Differential considerations");
    s.clinicalDetail.differential.forEach((d) => bullet(d));

    subheading("Citations");
    s.clinicalDetail.citations.forEach((c) => bullet(c.label));
  }

  // ---------- Condition reference appendix ----------
  if (s.conditionDefinitions.length > 0) {
    hr();
    heading("Condition reference", 14);
    s.conditionDefinitions.forEach((c, idx) => {
      if (idx > 0) y += 4;
      subheading(c.name);
      body(c.patientSummary);
      y += 2;
      // Diagnostic tables — collapsed to short bullet lines.
      c.tables.forEach((tbl) => {
        body(`${tbl.title}:`, 0, 9);
        tbl.rows.forEach((r) =>
          bullet(`${r.category} — ${r.range}${r.meaning ? ` (${r.meaning})` : ""}`)
        );
      });
      if (c.treatmentNotes && c.treatmentNotes.length > 0) {
        body("Clinical notes:", 0, 9);
        c.treatmentNotes.forEach((n) => bullet(n));
      }
      if (c.ageNotes) {
        body("By age:", 0, 9);
        body(c.ageNotes, 14, 9);
      }
      if (c.sexNotes) {
        body("By sex:", 0, 9);
        body(c.sexNotes, 14, 9);
      }
      if (c.ethnicityNotes) {
        body("By race / ethnicity:", 0, 9);
        body(c.ethnicityNotes, 14, 9);
      }
      body("Why it matters for foot-ulcer risk:", 0, 9);
      body(c.dfuImplication, 14, 9);
      if (c.citations.length > 0) {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(95, 94, 90);
        const wrapped = doc.splitTextToSize(
          `Source: ${c.citations.join("; ")}`,
          pageW - margin * 2
        );
        wrapped.forEach((line: string) => {
          ensureSpace(11);
          doc.text(line, margin, y);
          y += 11;
        });
        doc.setTextColor(28, 28, 28);
      }
    });
  }

  // ---------- Capture quality ----------
  hr();
  subheading("Capture quality");
  body(
    `${s.captureCounts.images} 2D image${s.captureCounts.images === 1 ? "" : "s"} (mean detection confidence ${(s.captureCounts.meanImageConfidence * 100).toFixed(0)}%)`
  );

  // ---------- Footer ----------
  hr();
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(95, 94, 90);
  const disclaimer =
    "Decision support only. Not a diagnosis. Final clinical judgment rests with the treating provider. SoleIQ is a wellness monitoring tool and is not a substitute for professional medical examination.";
  const wrapped = doc.splitTextToSize(disclaimer, pageW - margin * 2);
  wrapped.forEach((line: string) => {
    ensureSpace(11);
    doc.text(line, margin, y);
    y += 11;
  });

  const name =
    s.patient.fullName?.replace(/\s+/g, "_") ?? `visit_${s.visit.id}`;
  const date = new Date(s.generatedAt).toISOString().slice(0, 10);
  doc.save(`SoleIQ_${name}_${date}.pdf`);
}
