# Congressional App Challenge 2026 — answers

**Submission:** SoleIQ — app.soleiqhealth.com
**Submitter:** Eshaan Naik (solo)

Written against the official 2026 CAC Rules, plus the judging rubric guidance
and past district-winner submissions.

## Rules that shaped these answers

**The three judging criteria (§7.2).** Apps are judged on (a) quality of the
idea, including creativity and originality, (b) implementation of the idea,
including user experience and design, and (c) demonstrated excellence of coding
and programming skills.

**The AI rule (§3, AI USAGE) — read this one.** AI tools are permitted "provided
that all AI usage is fully disclosed," but: *"AI may only be used to support
specific aspects of the project and must not constitute the entirety of the
technical development. Participants are expected to demonstrate significant
individual contributions and technical understanding of their app."* Q5 is
written to that standard — it names specific areas where AI helped instead of
saying "throughout," and it demonstrates understanding. **If the truthful
account is that AI wrote essentially all of it, the rules require you to say so
and this answer has to shrink. Read Q5 and make it exactly true.**

**Originality (§3).** You must "clearly document" open-source libraries,
frameworks and external tools. Q1 and Q5 now name them.

**Judges can demand proof (§7.3).** They may "request access to the App and
source code in person or via any reasonable manner to verify that the App
functions and operates as stated." Refusing means immediate disqualification.
Every claim below is verifiable in the live app — the 18 languages, PDF export,
care circle, the authorization test suite. Be ready to demo all of it and to
open the repo.

**Also in the rules, not covered by these answers:**

- Deadline: **12:00 pm EDT, Monday, October 26, 2026.** Submissions cannot be
  modified afterward.
- Demonstration video, 1-3 minutes, which the rules call "the most critical
  component." It must give your name, the app name, the purpose **in one clear
  sentence**, the target audience, the tools and coding languages used, and show
  the app working. Over-length videos may be penalized.
- Eligible: the app was created after October 30, 2025 (first commit May 2026).

---

## 1. Please briefly describe what your app does?

SoleIQ Health lets a person with diabetes screen their own feet for ulcer detection using the
phone they already own, and sends the result to a doctor who can act on it.

Someone with diabetes can develop a foot ulcer they cannot feel, because the
same disease destroys sensation in the feet. Those ulcers precede up to 80
percent of diabetes-related amputations, and the standard of care is a foot exam
about once a year. That leaves eleven months in which a wound can form, grow,
and become unsalvageable with nobody looking. The burden falls hardest on rural
and uninsured patients, who are furthest from a podiatrist to begin with.

A patient opens the app and answers a guided health questionnaire — diabetes
history, A1c, prior ulcers, circulation, a tap-to-mark pain map, shoe fit — then
is walked through photographing both feet from four angles. The app checks each
photo for blur, lighting, and framing before uploading, so a bad photo is caught
while the person is still holding the phone.

One screening produces two different reports. The patient gets plain language:
what was found, and whether to see someone today, this week, or at their next
routine visit. It is always a recommendation, never a diagnosis. Their doctor
gets the clinical version — an estimated wound severity grade, findings outlined
on the photo, and lesion measurements in millimeters. Because those measurements
are repeatable, the app compares each visit to the last and shows whether a
wound is healing or growing.

Patients can invite family into a care circle, ask questions about their results
through a built-in assistant, export reports to PDF or email, and connect to or
disconnect from a hospital at will. Verified doctors get a worklist of their
assigned patients. Hospital administrators invite staff, verify doctors, assign
care teams, and review a log of every access to patient data.

It is about 28,000 lines of TypeScript on Next.js and React, with Supabase for
the database and a Python computer-vision service, translated into 18 languages.
The decision I am proudest of is that permissions are enforced inside the
database itself rather than in the interface, so a request sent straight to the
server returns nothing for a patient the requester has no right to see.

SoleIQ is live at app.soleiqhealth.com. It is a screening aid, not an
FDA-cleared medical device, and every report says so.

---

## 2. What inspired you to create this app?

This one is personal for me. My grandfather lived with diabetes, and I watched
him go through a severe foot ulcer and eventually lose part of his leg to an
amputation. I was young and did not understand the medicine at the time, but I
understood what it did to him and to our family. Losing a limb is not only a
medical event. It changes how a person moves through the world, how independent
they feel, and how they see themselves. That stayed with me.

Years later I started reading the literature, and the numbers shocked me.
Roughly one in three people with diabetes will develop a foot ulcer in their
lifetime. Ulcers precede up to 80 percent of diabetes-related lower-limb
amputations. Five-year mortality after an ulcer is around 30 percent —
comparable to the pooled five-year mortality across all cancers — and climbs
higher after a major amputation. About 40 percent of patients ulcerate again
within a year. I could not reconcile those figures with how little attention
this gets. A disease with that mortality and that recurrence rate would be a
household conversation if it were a cancer.

Two things turned that into an app. The first is where amputations actually
happen. Rural communities and patients without reliable insurance carry a
disproportionate share of the burden, not because the science is missing but
because the standard of care is not reaching them. Researchers call these places
amputation deserts, and that phrase says everything.

The second is frequency. The standard recommendation is a comprehensive foot
exam about once a year. For a patient with neuropathy who cannot feel a wound
forming, once a year is a very long time to go unmonitored. So I kept asking:
why once a year? What if someone could photograph their own feet regularly,
using a device they already own as simple as a phone, and get a recommendation on whether something
warrants clinical attention — not a diagnosis, and not a replacement for their
clinician, but a bridge across the eleven months when nobody is looking?

That bridge is what SoleIQ is. I went far enough into the research to write a
narrative review on AI-guided ulcer prevention with Dr. David G. Armstrong at
USC, published in Curieux Academic Review in July 2026. Writing it taught me the
remaining obstacle is not scientific but translational. So I built the
translation.

---

## 3. What technical difficulties did you face programming your app?

**Authorization, and my first version was wrong.** The login screen asked what
kind of account you were and routed you based on your answer. That is not authorization — anyone could have claimed to be a doctor. I fixed it in two layers. Routing now reads only from active membership records
in the database, and the role chosen at login is never trusted. Then I pushed
the real boundary into PostgreSQL row-level security, so the database checks permission on every query and the API cannot leak a record even if the interface is bypassed. To prove it rather than assume it, I wrote a SQL test
suite asserting denial for patient-to-patient access, unassigned doctors,
doctors at another hospital, expired care-team assignments, revoked consent,
suspended memberships, and admins without permission to see patient data.

**My wound measurement was biased against darker skin.** The first version found
the wound by brightness, which works on light skin and fails on dark skin,
because melanin shifts brightness far more than it shifts the ratio of red to
green. I rewrote it to compare each pixel's red/green ratio against the
surrounding skin of that same foot, so the measurement is relative to the
patient rather than to an assumed baseline. Shipping a tool that measured some
people's wounds worse than others was not acceptable.

**Analysis could not finish inside a web request.** Running it inline hit
serverless timeouts on slow uploads. I moved it into a queue: saving writes a
job record, a worker picks it up with retries and a dead-letter path, and one
atomic database function writes the finished report — so a failed analysis can
never be stored as a completed one. I also rate-limited the image endpoints,
which accept uploads and cost money per call.

**Then a long tail I did not see coming.** Phone cameras rotate photos through
EXIF metadata, so feet arrived sideways until I read and corrected the
orientation myself. iPhones upload HEIC, which browsers cannot decode, so I
convert it before analysis. The 3D scan video could not pass through the app
server without uploading twice, so the browser now posts straight to the
reconstruction service with a signed token. And Web Bluetooth silently rejects
the entire device request if a service is named with a vendor alias instead of
an official name or full UUID, which took a night to find.

---

## 4. What improvements would you make if you were to create a 2.0 version of your app?
Feasibility study
**Train and validate on real data.** This is the honest gap and it outranks
everything else here. The classifier architecture, patient-disjoint
cross-validation, recall-targeted thresholding, calibration, and Grad-CAM are
all built, but it is not trained on a large body of real, consented patient
photographs. Doing that properly means an IRB pathway, a consent and storage
pipeline that satisfies HIPAA, a dataset deliberately stratified across skin
tones, and a prospective study — because test metrics on a development set do not
predict performance on real patients in real clinics with real cameras and real
lighting.

**Go native on mobile.** The browser will not give me locked exposure, reliable
focus distance, or offline capture. A native app would let a community health
worker screen patients in a clinic with no connectivity and in underserved communities connect to the website anytime, anywhere.

**Learn from the clinicians using it.** When a doctor disagrees with a reading,
that correction should become a labeled training example instead of disappearing
into a database.

---

## 5. Did you use AI in the creation, development, or functionality of your app?

Yes, and I want to be precise about where.

**Tools used in development:** Claude Code and Claude (Anthropic). **AI inside
the product:** Claude's vision API generates the plain-language patient reading
and the clinician reading from the foot photographs, and powers the assistant
that answers a patient's questions about their own report.

**Open-source frameworks and libraries I built on:** Next.js and React, Supabase
for authentication, PostgreSQL and storage, Tailwind CSS, Zod for validation,
Three.js for the 3D foot viewer, and PyTorch with timm for the classifier.

**The specific areas where AI helped.** I used it to move faster in places where
I knew the behavior I needed but not the idiom yet: PostgreSQL row-level-security
policy syntax, Next.js App Router boilerplate, the Web Bluetooth
service-discovery code, and the 18 locale files. It also helped me draft database
migrations. In each case I specified the behavior, read what came back, tested
it, and corrected it.

**What I contributed.** The product, the clinical model, and the architecture are
mine: which intake questions to ask, which risk factors matter, the wound
severity estimate, the triage thresholds, and the decision to generate two
different readings — patient and clinician — from one screening. I set the
deliberate tradeoff of accepting more false positives in order to catch nearly
every true ulcer, because a missed ulcer is the dangerous error here.

I also found and fixed the failures that mattered, which is where I learned the
most. I recognized that routing users by the role they picked at login was a
security hole, designed the membership-plus-database-permission model that
replaced it, and wrote the test suite that proves it holds. I worked out that
brightness-based wound detection would measure darker skin worse, and derived
the red/green ratio approach instead. I diagnosed the serverless timeouts and
chose the queue design. I debugged the EXIF rotation, the HEIC decoding, and the
Web Bluetooth rejection myself.

I can explain any part of this codebase and why it is built the way it is, which
is the test I hold myself to. AI let me build more than I could have alone in
the time I had. It did not decide what to build, catch the mistakes that
mattered, or know anything about diabetic feet.

---

## 6. What did you learn or take away from participating in the Congressional App Challenge?

That in healthcare software, the model is the small part.

I started thinking this was a computer vision project. Most of what I actually
built is not computer vision. It is consent, authorization, audit logging,
atomic writes, and failure handling. I spent more time on who is allowed to see
a photograph than on what the photograph means, and that turned out to be the
right allocation — a screening tool that shows one patient's record to the wrong
doctor does more harm than a screening tool that is three percent less accurate.
Learning to enforce that in the database, where the interface cannot be routed
around, is the most transferable thing I now know how to do.

I also learned what building for people who are not me actually requires. Two
moments changed how I work. The first was realizing my wound measurement was
less accurate on darker skin — not from a bug report, but from asking what my
brightness threshold was quietly assuming. The second was translating the app
into 18 languages after noticing that the populations carrying the highest
diabetic foot ulcer burden are largely not English-speaking. Neither problem
announces itself. You only find them if you deliberately go looking for whoever
your defaults are failing.

Writing research alongside the code taught me the most about scope. I wanted to
believe I was close to something clinically useful. The literature is clear that
I am not — the gap is prospective validation on real patients, and no amount of
good engineering substitutes for it. So the app states on every report that it
is a screening aid and not a medical device. Learning to say a limitation
plainly instead of burying it in a footer felt more like real engineering
maturity than anything else I did.

What the Challenge itself gave me was a deadline and an audience outside my own
head. A project like this can expand forever — there is always another feature,
another refactor. Having to present it as finished to people who do not already
believe in it forced me to decide what actually mattered, cut what did not, and
be able to say in plain English why a web app about feet is worth anyone's
attention.
