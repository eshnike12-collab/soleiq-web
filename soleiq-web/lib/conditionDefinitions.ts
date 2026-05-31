/**
 * Structured clinical definitions for every medical-history checkbox.
 *
 * Each entry powers:
 *   - The "?" help dialog beside the checkbox in 05-MedicalHistory
 *   - The condition reference section in the PDF export
 *   - The condition reference section on the /clinical doctor-facing view
 *   - Plain-text reference appended to the share-via-email body
 *
 * All thresholds and ranges are guideline-sourced and cited at the bottom of
 * each entry. Diagnostic cutoffs are the same across sex / race / ethnicity
 * unless explicitly noted (e.g. HDL low-cutoff for sex; hs-troponin 99th
 * percentile for sex). Treatment thresholds may use age/sex via risk
 * calculators — those notes appear in `treatmentNotes`.
 */

export interface ConditionTableRow {
  category: string;
  range: string;
  meaning: string;
}

export interface ConditionTable {
  title: string;
  columns?: string[];
  rows: ConditionTableRow[];
}

export interface ConditionDefinition {
  id: string;
  name: string;
  patientSummary: string;
  tables: ConditionTable[];
  treatmentNotes?: string[];
  ageNotes?: string;
  sexNotes?: string;
  ethnicityNotes?: string;
  dfuImplication: string;
  citations: string[];
}

export const CONDITION_DEFINITIONS: Record<string, ConditionDefinition> = {
  diabetes: {
    id: "diabetes",
    name: "Diabetes",
    patientSummary:
      "Diabetes is a condition where blood sugar (glucose) runs too high because the body either does not make enough insulin (Type 1) or does not respond to it well (Type 2). Long-term high glucose damages nerves and blood vessels, which is why diabetes is the leading cause of diabetic foot ulcers and amputations.",
    tables: [
      {
        title: "Lab-based diagnostic ranges (ADA 2025/2026)",
        columns: ["Test", "Normal", "Prediabetes", "Diabetes"],
        rows: [
          {
            category: "Fasting Plasma Glucose",
            range: "<100 mg/dL",
            meaning: "100–125 mg/dL prediabetes; ≥126 mg/dL diabetes",
          },
          {
            category: "HbA1c",
            range: "<5.7%",
            meaning: "5.7–6.4% prediabetes; ≥6.5% diabetes",
          },
          {
            category: "2-hr OGTT (75 g)",
            range: "<140 mg/dL",
            meaning: "140–199 mg/dL prediabetes; ≥200 mg/dL diabetes",
          },
          {
            category: "Random plasma glucose",
            range: "—",
            meaning: "≥200 mg/dL + symptoms = diabetes",
          },
        ],
      },
      {
        title: "ADA home-monitoring targets (most non-pregnant adults)",
        rows: [
          { category: "Fasting / pre-meal", range: "80–130 mg/dL", meaning: "Personalize for older / frail" },
          { category: "1–2 hr post-meal peak", range: "<180 mg/dL", meaning: "Measure 1–2 h after start of meal" },
          { category: "HbA1c", range: "<7.0%", meaning: "Standard adult target" },
          { category: "Time-in-range (CGM)", range: ">70%", meaning: "70–180 mg/dL" },
          { category: "Time below 70 mg/dL", range: "<4%", meaning: "Hypoglycemia exposure cap" },
        ],
      },
    ],
    treatmentNotes: [
      "Diabetes type and duration are independent risk modifiers — duration ≥10 years sharply increases ulcer risk.",
      "HbA1c ethnic variation: ~+0.26% in Black, +0.24% in Asian, +0.08% in Hispanic patients at the same actual glucose (RBC turnover differences).",
      "Hemoglobinopathies (sickle-cell, thalassemia) make A1C unreliable — use fructosamine or CGM-derived GMI.",
    ],
    ageNotes:
      "Older adults: A1C target loosens to <7.5–8.5% for frail/complex patients to avoid hypoglycemia. Pediatric A1C targets typically <7.0% (T1D).",
    sexNotes:
      "Diagnostic cutoffs identical. Pregnancy uses tighter gestational targets (fasting <95, 1-hr postprandial <140, 2-hr <120).",
    ethnicityNotes:
      "ADA screens Asian Americans for diabetes at BMI ≥23 (vs ≥25). A1C overestimates glycemia in Black > Asian > Hispanic at the same blood glucose.",
    dfuImplication:
      "The dominant DFU risk factor. Higher A1C and longer duration both amplify ulcer and amputation risk independent of vascular status.",
    citations: ["ADA Standards of Care 2025/2026, Section 2 & 12"],
  },

  hypertension: {
    id: "hypertension",
    name: "Hypertension (high blood pressure)",
    patientSummary:
      "Hypertension is sustained high blood pressure in the arteries. Most of the time it has no symptoms. Over years it damages blood vessels everywhere — the heart, brain, kidneys, eyes, and the small arteries that feed the feet. Untreated hypertension accelerates atherosclerosis (the main process behind PAD) and raises stroke and heart-failure risk.",
    tables: [
      {
        title: "ACC/AHA 2017 categories (in-office, properly measured)",
        columns: ["Category", "Systolic (mm Hg)", "Diastolic (mm Hg)"],
        rows: [
          { category: "Normal", range: "<120", meaning: "and <80" },
          { category: "Elevated", range: "120–129", meaning: "and <80" },
          { category: "Stage 1 hypertension", range: "130–139", meaning: "or 80–89" },
          { category: "Stage 2 hypertension", range: "≥140", meaning: "or ≥90" },
          { category: "Hypertensive crisis", range: "≥180", meaning: "and/or ≥120 — urgent care" },
        ],
      },
      {
        title: "Treatment BP targets",
        rows: [
          { category: "General adult", range: "<130/80 mm Hg", meaning: "ACC/AHA 2017" },
          { category: "Diabetes / CKD / known ASCVD", range: "<130/80 mm Hg", meaning: "Aggressive control" },
          { category: "Older adults (≥65) without frailty", range: "<130 systolic", meaning: "SPRINT-supported" },
          { category: "Post-stroke secondary prevention", range: "<130/80 mm Hg", meaning: "AHA 2021" },
        ],
      },
    ],
    treatmentNotes: [
      "First-line therapy: thiazide, ACE inhibitor / ARB, calcium channel blocker. Black patients often start with thiazide or CCB rather than ACE inhibitor.",
      "Home BP monitoring is more accurate than office readings — confirm Stage 1 with home or 24-hour ambulatory readings.",
    ],
    ageNotes:
      "BP rises with age (systolic especially). Treatment targets do not relax until evidence of frailty or orthostatic symptoms.",
    sexNotes:
      "Same categories. Premenopausal women have lower BP on average; rises after menopause.",
    ethnicityNotes:
      "Black Americans have ~40% prevalence (highest in U.S.), earlier onset, more end-organ damage; respond preferentially to thiazides and CCBs.",
    dfuImplication:
      "Hypertension drives PAD and small-vessel disease in the lower extremity, both DFU risk amplifiers. Stroke risk from uncontrolled HTN compounds DFU outcomes in patients with neuropathy.",
    citations: [
      "ACC/AHA 2017 Hypertension Guideline",
      "SPRINT Trial (NEJM 2015)",
    ],
  },

  "high cholesterol": {
    id: "high cholesterol",
    name: "High cholesterol",
    patientSummary:
      "Cholesterol is a fat carried in the blood by lipoprotein particles. LDL (\"bad\") cholesterol builds up in artery walls, causing atherosclerosis — the underlying disease behind heart attacks, strokes, and peripheral artery disease. HDL (\"good\") cholesterol clears LDL away. The lab measures both, plus triglycerides and a calculated total.",
    tables: [
      {
        title: "Lipid panel categories (mg/dL)",
        columns: ["Marker", "Optimal", "Borderline", "High"],
        rows: [
          { category: "Total cholesterol", range: "<200", meaning: "200–239 / ≥240" },
          { category: "LDL (\"bad\")", range: "<100", meaning: "100–159 / ≥160 (very high ≥190)" },
          { category: "HDL (\"good\")", range: "≥60 protective", meaning: "40–59 / <40 men, <50 women" },
          { category: "Triglycerides", range: "<150", meaning: "150–199 / 200–499 (very high ≥500)" },
          { category: "Non-HDL", range: "<130", meaning: "130–159 / ≥160" },
        ],
      },
      {
        title: "What an LDL reading means",
        rows: [
          { category: "<70 mg/dL", range: "Excellent", meaning: "Goal in high-risk / secondary prevention" },
          { category: "70–99", range: "Good", meaning: "" },
          { category: "100–129", range: "Above optimal", meaning: "Lifestyle review" },
          { category: "130–159", range: "Borderline high", meaning: "Lifestyle urgent, possible statin" },
          { category: "160–189", range: "High", meaning: "Statin consideration" },
          { category: "≥190", range: "Very high", meaning: "Statin regardless of other risk" },
        ],
      },
    ],
    treatmentNotes: [
      "LDL ≥190 mg/dL: high-intensity statin regardless of risk.",
      "Diabetes + age 40–75: at least moderate-intensity statin.",
      "10-year ASCVD risk ≥7.5%: moderate-to-high intensity statin.",
      "Secondary prevention (prior MI, stroke, PAD): high-intensity statin, LDL goal <70 mg/dL (or <55 in very high risk).",
      "Lp(a) ≥50 mg/dL is an inherited risk factor — test once in patients with family history of premature ASCVD or in South Asian / African / Hispanic populations.",
    ],
    ageNotes:
      "LDL diagnostic cutoffs don't change with age. PCE/PREVENT risk calculators apply to adults 40–75; outside that, decisions individualized. After 75, statin evidence weaker.",
    sexNotes:
      "Same numbers except HDL: <40 mg/dL low in men, <50 mg/dL low in women. Women have higher HDL pre-menopause; postmenopause HDL drops and LDL/triglycerides rise.",
    ethnicityNotes:
      "Diagnostic cutoffs identical. South Asian Americans have higher ASCVD risk at lower LDL — AHA recommends Lp(a) testing and earlier statin consideration. 2023 PREVENT calculator removed race as an input variable.",
    dfuImplication:
      "High LDL accelerates lower-extremity atherosclerosis (PAD), which independently raises DFU risk and worsens wound healing. Statin therapy is part of comprehensive vascular care in any patient with documented PAD.",
    citations: [
      "2018 ACC/AHA Cholesterol Guideline",
      "AHA 2023 PREVENT Calculator",
    ],
  },

  "peripheral artery disease": {
    id: "peripheral artery disease",
    name: "Peripheral artery disease (PAD)",
    patientSummary:
      "PAD is the buildup of fatty plaques in the arteries supplying the legs and feet. As blood flow to the feet drops, wounds heal slowly, infections spread faster, and tissue can die. PAD is one of the strongest independent predictors of foot ulcers and amputations, and it often coexists with diabetes.",
    tables: [
      {
        title: "Ankle-Brachial Index (ABI) — 2024 AHA/ACC PAD Guideline",
        columns: ["ABI", "Interpretation"],
        rows: [
          { category: ">1.40", range: "Non-compressible / calcified vessels", meaning: "ABI unreliable — use Toe-Brachial Index" },
          { category: "1.00–1.40", range: "Normal", meaning: "" },
          { category: "0.91–0.99", range: "Borderline", meaning: "" },
          { category: "0.70–0.90", range: "Mild PAD", meaning: "" },
          { category: "0.40–0.69", range: "Moderate PAD", meaning: "" },
          { category: "<0.40", range: "Severe PAD / critical limb ischemia", meaning: "Urgent vascular referral" },
        ],
      },
      {
        title: "Rutherford-Becker symptom severity",
        rows: [
          { category: "0", range: "Asymptomatic", meaning: "" },
          { category: "1–3", range: "Claudication", meaning: "mild / moderate / severe" },
          { category: "4", range: "Ischemic rest pain", meaning: "Chronic limb-threatening ischemia" },
          { category: "5", range: "Minor tissue loss", meaning: "Non-healing ulcer — urgent" },
          { category: "6", range: "Major tissue loss", meaning: "Gangrene — urgent" },
        ],
      },
    ],
    treatmentNotes: [
      "Doppler waveform: triphasic = normal, biphasic = mild, monophasic = significant disease.",
      "Toe-Brachial Index (TBI) <0.70 is abnormal — use when ABI is unreliable (diabetes, CKD calcified vessels).",
      "Self-report signals: calf pain on walking that resolves with rest (claudication), cold or pale feet, slow-healing sores, prior angioplasty/stent/bypass/amputation, blood thinner use.",
    ],
    ageNotes:
      "ABI cutoffs do not change with age. Prevalence: ~5% at 50, ~20% at 65+, ~30% at 80+. Targeted screening recommended at ≥65 or 50+ with diabetes or smoking history.",
    sexNotes:
      "Same ABI cutoffs. Prevalence roughly equal. Women historically underdiagnosed because they present with atypical leg fatigue rather than classic claudication, and have worse outcomes after revascularization.",
    ethnicityNotes:
      "Black Americans: ~2× higher PAD prevalence, 3–4× higher amputation rates than white Americans even after adjustment. Native Americans have very high amputation rates from diabetes-driven PAD. Hispanic Americans have similar prevalence but worse outcomes.",
    dfuImplication:
      "PAD is the dominant vascular driver of diabetic foot ulcers and amputations. PAD + neuropathy is the highest-risk combination (IWGDF Category 2 minimum). Critical limb ischemia (ABI <0.4 or rest pain or tissue loss) requires urgent vascular consult.",
    citations: [
      "2024 AHA/ACC PAD Guideline",
      "IWGDF 2023 Guidelines on Prevention & Management of Diabetes-Related Foot Disease",
    ],
  },

  neuropathy: {
    id: "neuropathy",
    name: "Peripheral neuropathy",
    patientSummary:
      "Peripheral neuropathy is nerve damage in the feet (and sometimes hands). Most common in long-standing diabetes. Patients lose protective sensation — they can step on a tack, develop a blister inside a shoe, or burn a foot on a hot floor without feeling it. Painless injuries, repeated, become ulcers.",
    tables: [
      {
        title: "Clinical exam — Loss of Protective Sensation (LOPS)",
        rows: [
          { category: "10-g monofilament", range: "5.07 Semmes-Weinstein", meaning: "Inability to feel ≥1 of 10 plantar sites = LOPS positive" },
          { category: "128 Hz tuning fork", range: "Great toe dorsum", meaning: "Reduced vibration sense often precedes monofilament loss" },
          { category: "Ipswich touch test", range: "1st / 3rd / 5th toe tips", meaning: "≥2 insensate toes = LOPS positive" },
          { category: "Vibration perception (VPT)", range: "<15 V normal", meaning: "15–24 V increased risk; ≥25 V high risk (7× ulcer rate)" },
        ],
      },
      {
        title: "IWGDF Risk Stratification (2023)",
        columns: ["Category", "Risk factors", "Re-exam frequency"],
        rows: [
          { category: "0 — Very low", range: "No LOPS and no PAD", meaning: "Annual" },
          { category: "1 — Low", range: "LOPS or PAD", meaning: "Every 6–12 months" },
          { category: "2 — Moderate", range: "LOPS + PAD, LOPS + deformity, or PAD + deformity", meaning: "Every 3–6 months" },
          { category: "3 — High", range: "LOPS or PAD + prior ulcer, amputation, or ESRD", meaning: "Every 1–3 months" },
        ],
      },
    ],
    treatmentNotes: [
      "LOPS positive = patient cannot feel injury — aggressive prevention warranted (footwear, daily inspection, prompt evaluation of any new lesion).",
      "Painful neuropathy + intact sensation: treat pain (duloxetine, pregabalin, gabapentin) — lower ulcer risk.",
      "Painless neuropathy with LOPS: highest danger.",
    ],
    ageNotes:
      "Same thresholds. Prevalence rises sharply with age and diabetes duration: 10–15% at T2D diagnosis, ~50% after 10+ years.",
    sexNotes:
      "Women: higher rates of painful neuropathy. Men: higher rates of asymptomatic LOPS, and 2–4× higher DFU/amputation rates.",
    ethnicityNotes:
      "Same thresholds. Black adults with diabetes have ~2× higher LOPS rates than white adults after adjustment. Black and Native American populations have significantly worse DFU outcomes.",
    dfuImplication:
      "The single most actionable DFU risk factor on intake. LOPS + foot deformity or PAD triggers IWGDF Category 2+. Add prior ulcer or ESRD and the patient is in the highest risk class — reassess every 1–3 months.",
    citations: [
      "IWGDF 2023 Risk Stratification",
      "ADA Standards of Care 2025, Section 12",
    ],
  },

  "heart disease": {
    id: "heart disease",
    name: "Heart disease",
    patientSummary:
      "\"Heart disease\" covers several conditions: coronary artery disease (plaque in the heart's arteries that can cause angina or a heart attack), heart failure (the heart cannot pump or fill properly), and atrial fibrillation (irregular rhythm that raises stroke risk). All three share atherosclerosis risk factors and frequently coexist with PAD and diabetes.",
    tables: [
      {
        title: "Coronary Artery Calcium (CAC) score",
        rows: [
          { category: "0", range: "No calcification", meaning: "Very low 10-year ASCVD risk" },
          { category: "1–99", range: "Mild plaque", meaning: "Low–intermediate risk" },
          { category: "100–299", range: "Moderate plaque", meaning: "Intermediate–high risk" },
          { category: "300–999", range: "Severe plaque", meaning: "High risk" },
          { category: "≥1000", range: "Very high", meaning: "Strong statin indication" },
        ],
      },
      {
        title: "Heart failure — LVEF and biomarkers",
        rows: [
          { category: "LVEF ≥50%", range: "Preserved (HFpEF)", meaning: "" },
          { category: "LVEF 41–49%", range: "Mildly reduced (HFmrEF)", meaning: "" },
          { category: "LVEF ≤40%", range: "Reduced (HFrEF)", meaning: "ACEi/ARB/ARNI + beta-blocker + MRA + SGLT2i" },
          { category: "BNP", range: "<100 / >400 pg/mL", meaning: "HF unlikely / HF likely" },
          { category: "NT-proBNP", range: "<450 / <900 / <1800", meaning: "Age-adjusted normal: <50y / 50–75y / >75y" },
        ],
      },
      {
        title: "AFib — CHA₂DS₂-VASc stroke risk",
        rows: [
          { category: "0", range: "~0.2%/year", meaning: "" },
          { category: "1", range: "~0.6%/year", meaning: "" },
          { category: "2", range: "~2.2%/year", meaning: "Anticoagulation in men" },
          { category: "3", range: "~3.2%/year", meaning: "Anticoagulation in women" },
          { category: "≥4", range: "≥4.8%/year", meaning: "Strong anticoagulation indication" },
        ],
      },
    ],
    treatmentNotes: [
      "High-sensitivity troponin uses sex-specific 99th percentile cutoffs (men >34 ng/L, women >16 ng/L hs-TnT) — reduces missed MI in women.",
      "CAC = 0 is so reassuring that statin therapy is often deferred even with intermediate calculator risk.",
      "Heart failure with reduced EF requires guideline-directed medical therapy: ACEi/ARB/ARNI + beta-blocker + MRA + SGLT2i.",
    ],
    ageNotes:
      "Risk rises sharply after 45 (men) and 55 (women). HF prevalence: ~1% at 50, ~10% at 75+. AFib: ~1% under 60, ~10% at 80+.",
    sexNotes:
      "Women more likely to have HFpEF and atypical MI presentations (fatigue, jaw/back pain). Men more likely to have HFrEF. AFib stroke risk: female sex adds 1 point in CHA₂DS₂-VASc.",
    ethnicityNotes:
      "Black Americans: more HFrEF, earlier onset, worse outcomes. South Asian Americans: ~2× ASCVD risk at lower BMI/LDL — Lp(a) testing recommended. Hispanic paradox: lower CVD mortality despite higher risk factor prevalence.",
    dfuImplication:
      "Heart disease is a marker of diffuse atherosclerosis — strongly correlated with PAD. Heart failure adds to lower-extremity edema and slows wound healing. AFib on anticoagulation changes wound-management planning.",
    citations: [
      "ACC/AHA Guidelines for Heart Failure (2022)",
      "AHA Guideline for the Management of CAD (2023)",
    ],
  },

  "kidney disease": {
    id: "kidney disease",
    name: "Chronic kidney disease (CKD)",
    patientSummary:
      "Chronic kidney disease is gradual loss of kidney filtering capacity. Most common causes are diabetes and high blood pressure. CKD is often silent until late stages. It significantly raises the risk of foot ulcers and amputation independent of diabetes severity — patients on dialysis are in the highest amputation-risk category of any single comorbidity.",
    tables: [
      {
        title: "KDIGO CKD staging by eGFR (mL/min/1.73 m²)",
        columns: ["Stage", "eGFR", "Description"],
        rows: [
          { category: "G1", range: "≥90", meaning: "Normal — CKD only if kidney damage marker present" },
          { category: "G2", range: "60–89", meaning: "Mildly decreased" },
          { category: "G3a", range: "45–59", meaning: "Mild–moderate decrease" },
          { category: "G3b", range: "30–44", meaning: "Moderate–severe decrease" },
          { category: "G4", range: "15–29", meaning: "Severe — nephrology referral mandatory" },
          { category: "G5", range: "<15", meaning: "Kidney failure — dialysis prep / transplant" },
        ],
      },
      {
        title: "KDIGO Albuminuria staging (UACR mg/g)",
        rows: [
          { category: "A1", range: "<30", meaning: "Normal to mildly increased" },
          { category: "A2", range: "30–300", meaning: "Moderately increased" },
          { category: "A3", range: ">300", meaning: "Severely increased (nephrotic ≥2200)" },
        ],
      },
    ],
    treatmentNotes: [
      "CKD diagnosis = eGFR <60 OR markers of kidney damage (albuminuria, abnormal imaging/biopsy) for ≥3 months.",
      "2021 CKD-EPI equation is race-free (creatinine, age, sex). Combined creatinine-cystatin equation is most accurate.",
      "UACR ≥30: ACE inhibitor / ARB indicated. UACR ≥300 with diabetes: add SGLT2 inhibitor.",
    ],
    ageNotes:
      "eGFR declines ~1 mL/min/1.73 m² per year after 30–40. An eGFR of 60 is age-expected in an 80-year-old; pathological in a 30-year-old.",
    sexNotes:
      "Same KDIGO cutoffs. Women have lower creatinine (lower muscle mass) — accounted for in equation. Men have faster progression.",
    ethnicityNotes:
      "Same cutoffs. Black Americans: ~4× higher kidney failure rate (APOL1 genetics + access). Hispanic: ~1.3×. Native American: ~1.5×. The 2021 race-free eGFR equation reclassified many Black patients into earlier CKD stages — accelerated access to nephrology and transplant evaluation.",
    dfuImplication:
      "CKD stage ≥3 significantly raises DFU and amputation risk independent of diabetes severity. Dialysis patients are in the highest single-comorbidity amputation-risk class. IWGDF Category 3 (highest) applies to LOPS or PAD + ESRD.",
    citations: [
      "KDIGO 2024 Clinical Practice Guideline for CKD",
      "ADA Standards of Care 2025, Section 11",
    ],
  },

  "history of stroke": {
    id: "history of stroke",
    name: "History of stroke",
    patientSummary:
      "A stroke is sudden loss of blood flow to part of the brain — either a blocked artery (ischemic, ~87%) or a bleed (hemorrhagic, ~10%). A TIA (\"mini-stroke\") is a stroke whose symptoms resolve within 24 hours. Having had a stroke means your blood vessels have already been damaged — strong evidence of diffuse atherosclerosis that affects the legs and feet too.",
    tables: [
      {
        title: "NIH Stroke Scale (acute severity, 0–42)",
        rows: [
          { category: "0", range: "No deficit", meaning: "" },
          { category: "1–4", range: "Minor", meaning: "" },
          { category: "5–15", range: "Moderate", meaning: "" },
          { category: "16–20", range: "Moderate–severe", meaning: "" },
          { category: "21–42", range: "Severe", meaning: "" },
        ],
      },
      {
        title: "Secondary prevention targets",
        rows: [
          { category: "Blood pressure", range: "<130/80 mm Hg", meaning: "" },
          { category: "LDL cholesterol", range: "<70 mg/dL", meaning: "High-intensity statin" },
          { category: "HbA1c (if diabetes)", range: "<7%", meaning: "Individualized" },
          { category: "Anticoagulation", range: "If AFib", meaning: "DOAC preferred over warfarin in most" },
          { category: "Antiplatelet", range: "Non-cardioembolic ischemic", meaning: "Aspirin or clopidogrel" },
        ],
      },
    ],
    treatmentNotes: [
      "ABCD² score predicts short-term stroke risk after TIA — score ≥4 warrants hospitalization.",
      "10-year recurrence after ischemic stroke is ~25%. Post-TIA: 5% at 48 hours, 10% at 90 days untreated.",
      "Hemorrhagic stroke recurrence higher in patients with uncontrolled hypertension or anticoagulation.",
    ],
    ageNotes:
      "Stroke incidence doubles each decade after 55. ~75% of strokes occur at age ≥65. Strokes in adults <55 warrant workup for PFO, dissection, hypercoagulable states.",
    sexNotes:
      "Same diagnostic criteria. Women have higher lifetime stroke risk (longer lifespan, AFib later), worse functional outcomes, higher mortality. AFib stroke risk: female sex adds 1 point in CHA₂DS₂-VASc.",
    ethnicityNotes:
      "Black Americans: ~2× higher incidence, strokes 7–10 years earlier, higher mortality. Hispanic Americans: ~1.5× higher incidence, more lacunar strokes. Native Americans: highest U.S. prevalence. East Asian Americans: elevated intracerebral hemorrhage rates.",
    dfuImplication:
      "Prior stroke = diffuse atherosclerosis. Stroke + diabetes places the patient in the highest DFU risk class. Anticoagulation or antiplatelet status materially affects wound-management planning.",
    citations: [
      "AHA/ASA 2021 Stroke Prevention Guidelines",
      "AHA Stroke Statistics 2024 Update",
    ],
  },

  "rheumatoid arthritis": {
    id: "rheumatoid arthritis",
    name: "Rheumatoid arthritis (RA)",
    patientSummary:
      "Rheumatoid arthritis is an autoimmune disease where the body attacks the lining of its own joints, causing pain, swelling, and progressive deformity. Roughly 90% of RA patients develop foot or ankle involvement. RA-related foot deformities — hammer toes, claw toes, bunions, dislocated metatarsals — create abnormal pressure points that drive callus and ulcer formation, even without diabetes.",
    tables: [
      {
        title: "DAS28 disease activity (28-joint score with ESR or CRP)",
        rows: [
          { category: "<2.6", range: "Remission", meaning: "" },
          { category: "2.6–3.2", range: "Low", meaning: "" },
          { category: "3.2–5.1", range: "Moderate", meaning: "" },
          { category: ">5.1", range: "High", meaning: "" },
        ],
      },
      {
        title: "Lab markers",
        rows: [
          { category: "RF (Rheumatoid Factor)", range: "<14 IU/mL", meaning: "Positive in 70–80% of RA; not specific" },
          { category: "Anti-CCP", range: "<20 U/mL", meaning: "Positive in 70–80% of RA; ~95% specific" },
          { category: "ESR", range: "<20 (M), <30 (F)", meaning: "Inflammation marker" },
          { category: "CRP", range: "<10 mg/L", meaning: "Inflammation; rises faster than ESR" },
        ],
      },
    ],
    treatmentNotes: [
      "Treat-to-target: remission preferred, low disease activity acceptable. Assess every 1–3 months until target reached, then every 6–12 months.",
      "DMARD therapy (methotrexate, biologics) controls inflammation and prevents joint destruction.",
      "Foot deformities benefit from custom orthotics, accommodative shoe wear, and podiatric care.",
    ],
    ageNotes:
      "Same diagnostic criteria. Most common onset 30–60. Elderly-onset RA (>60) often more acute with higher inflammatory markers — can resemble polymyalgia rheumatica.",
    sexNotes:
      "Women ~3× higher prevalence. Pregnancy often improves RA; postpartum often triggers flares. Men get RA less often but often more severe disease.",
    ethnicityNotes:
      "Native Americans (Pima, Chippewa): up to 5–7% prevalence vs ~1% general. Black and Hispanic Americans: similar prevalence but more severe at diagnosis, less access to biologic therapy.",
    dfuImplication:
      "Foot involvement in ~90% of RA cases creates abnormal plantar pressure distribution — a known ulceration mechanism. Forefoot deformity (hallux valgus, hammer/claw toes, MTP subluxation) raises ulcer and callus risk even without diabetes. RA + diabetes is high DFU risk.",
    citations: [
      "2010 ACR/EULAR RA Classification Criteria",
      "ACR 2021 Guideline for the Treatment of RA",
    ],
  },

  obesity: {
    id: "obesity",
    name: "Obesity",
    patientSummary:
      "Obesity is excess body fat that increases risk of diabetes, heart disease, stroke, kidney disease, and many other conditions. The standard screening metric is BMI (weight in kg divided by height in meters squared). For diabetic foot risk specifically: obesity raises plantar pressure, alters gait, increases callus formation, and worsens diabetes control — all amplifiers of ulcer risk.",
    tables: [
      {
        title: "BMI categories — Adult (kg/m²)",
        rows: [
          { category: "<18.5", range: "Underweight", meaning: "" },
          { category: "18.5–24.9", range: "Normal weight", meaning: "" },
          { category: "25.0–29.9", range: "Overweight", meaning: "" },
          { category: "30.0–34.9", range: "Obesity Class I", meaning: "" },
          { category: "35.0–39.9", range: "Obesity Class II", meaning: "" },
          { category: "≥40.0", range: "Obesity Class III", meaning: "Severe / morbid" },
        ],
      },
      {
        title: "Asian-specific BMI cutoffs (WHO/AHA)",
        rows: [
          { category: "<18.5", range: "Underweight", meaning: "" },
          { category: "18.5–22.9", range: "Normal", meaning: "" },
          { category: "23.0–24.9", range: "Overweight", meaning: "" },
          { category: "25.0–29.9", range: "Obesity Class I", meaning: "" },
          { category: "≥30.0", range: "Obesity Class II–III", meaning: "" },
        ],
      },
      {
        title: "Waist circumference (abdominal obesity)",
        columns: ["Population", "Men", "Women"],
        rows: [
          { category: "White / Black / Middle Eastern", range: "≥40 in (102 cm)", meaning: "≥35 in (88 cm)" },
          { category: "South Asian / Chinese / Japanese", range: "≥35 in (90 cm)", meaning: "≥31 in (80 cm)" },
          { category: "Hispanic", range: "≥35 in (90 cm)", meaning: "≥31 in (80 cm)" },
        ],
      },
    ],
    treatmentNotes: [
      "Waist-to-height ratio ≥0.5 is increased metabolic risk and works across populations.",
      "5–10% weight loss produces meaningful improvements in BP, glycemia, and lipids.",
      "ADA screens Asian Americans for diabetes at BMI ≥23 (vs ≥25 for others).",
    ],
    ageNotes:
      "BMI cutoffs apply to adults ≥20. Children: BMI percentile for age and sex. Older adults (≥65): \"obesity paradox\" — modest excess weight may be protective; aggressive weight loss often inappropriate.",
    sexNotes:
      "Same BMI cutoffs. Women have higher body-fat percentage at same BMI; waist cutoffs differ. Postmenopausal women: increased central adiposity at stable weight.",
    ethnicityNotes:
      "Black Americans: highest U.S. obesity prevalence (women > men). Hispanic Americans: metabolic complications at lower BMI. Asian Americans: lower BMI but higher diabetes / CVD risk at any given BMI — use Asian-specific cutoffs.",
    dfuImplication:
      "Obesity raises plantar pressure, alters gait mechanics, increases callus formation, and worsens glycemic control — all DFU risk amplifiers. Weight loss reduces plantar pressure and improves diabetes severity.",
    citations: [
      "NIH/NHLBI Clinical Guidelines on Obesity",
      "WHO Expert Consultation on Asian BMI Cutoffs",
    ],
  },

  "smoking-related illness": {
    id: "smoking-related illness",
    name: "Smoking-related illness",
    patientSummary:
      "Smoking damages every artery in the body. It is the single largest modifiable risk factor for PAD, accelerates atherosclerosis throughout the legs, slows wound healing, and raises infection risk. Quitting is the highest-yield single intervention for reducing foot-ulcer and amputation risk in patients with diabetes or vascular disease.",
    tables: [
      {
        title: "Smoking exposure — pack-years",
        rows: [
          { category: "0", range: "Never smoker", meaning: "" },
          { category: "1–9", range: "Light", meaning: "" },
          { category: "10–19", range: "Moderate", meaning: "" },
          { category: "20–29", range: "Heavy", meaning: "USPSTF lung cancer screening threshold" },
          { category: "≥30", range: "Very heavy", meaning: "High cancer and COPD risk" },
        ],
      },
      {
        title: "COPD severity — GOLD stages (FEV1 % predicted)",
        rows: [
          { category: "GOLD 1 (Mild)", range: "≥80%", meaning: "" },
          { category: "GOLD 2 (Moderate)", range: "50–79%", meaning: "" },
          { category: "GOLD 3 (Severe)", range: "30–49%", meaning: "" },
          { category: "GOLD 4 (Very severe)", range: "<30%", meaning: "" },
        ],
      },
      {
        title: "Cardiovascular and vascular risk",
        rows: [
          { category: "MI / stroke risk", range: "~2× higher", meaning: "Drops ~50% after 1 year cessation" },
          { category: "PAD risk", range: "~4× higher", meaning: "" },
          { category: "Normalization", range: "~10–15 years", meaning: "Approaches non-smoker risk" },
        ],
      },
    ],
    treatmentNotes: [
      "USPSTF lung cancer screening: age 50–80, ≥20 pack-years, currently smoke or quit within past 15 years — annual low-dose CT.",
      "COPD requires FEV1/FVC <0.70 post-bronchodilator.",
      "Cessation strategies: behavioral counseling + pharmacotherapy (nicotine replacement, varenicline, bupropion).",
    ],
    ageNotes:
      "Pack-year thresholds don't change with age. Lung cancer and COPD risk rise with cumulative exposure; both rare under 40 unless very heavy exposure.",
    sexNotes:
      "Same criteria. Women develop COPD at lower pack-year exposure than men (greater small-airway susceptibility). Lung cancer rates still rising in women, declining in men.",
    ethnicityNotes:
      "Black Americans smoke fewer cigarettes per day but have higher lung-cancer rates per pack-year (metabolism + menthol exposure). The 2021 USPSTF update from 30 to 20 pack-years partly addresses this disparity. Native Americans have highest smoking prevalence in the U.S.",
    dfuImplication:
      "Smoking is a major PAD and DFU risk factor — accelerates atherosclerosis, impairs wound healing, raises infection risk. Cessation is the single highest-yield intervention for DFU risk reduction; meaningful risk drops within months. Capture pack-year exposure AND current status separately in the model.",
    citations: [
      "GOLD 2024 COPD Report",
      "USPSTF Lung Cancer Screening Recommendation (2021)",
    ],
  },
};

/** Get definition by condition id (case-insensitive). */
export function getCondition(id: string): ConditionDefinition | undefined {
  return CONDITION_DEFINITIONS[id.toLowerCase()];
}

/** Plain-text rendering for email body — compact appendix. */
export function conditionToText(c: ConditionDefinition): string {
  const lines: string[] = [];
  lines.push(`${c.name.toUpperCase()}`);
  lines.push(c.patientSummary);
  lines.push("");
  lines.push(`DFU relevance: ${c.dfuImplication}`);
  if (c.citations.length) {
    lines.push("");
    lines.push(`Source: ${c.citations.join("; ")}`);
  }
  return lines.join("\n");
}
