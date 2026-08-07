import { motion, useReducedMotion } from 'framer-motion'

/**
 * The team.
 *
 * TODO(soleiq): add anyone else who should be listed here — name, role, and one
 * honest line each. Nobody goes on this page who isn't real.
 */
const TEAM = [
  {
    name: 'Eshaan Naik',
    role: 'Founder & CEO, SoleIQ Health',
    line: 'Leads the platform end to end: the screening model, the product, and the research programme behind it. Published on AI-guided prevention for the diabetic foot with Dr. David G. Armstrong.',
    photo: '/eshaan-naik.png',
  },
]

export default function About() {
  const reduce = useReducedMotion()
  const reveal = reduce
    ? {}
    : {
        initial: { opacity: 0, y: 16 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-80px' },
      }

  return (
    <section id="about" className="section-pad" aria-labelledby="about-heading">
      <div className="shell">
        <motion.div {...reveal} transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}>
          <p className="eyebrow">About</p>
          <h2 id="about-heading" className="h-section mt-5 max-w-3xl">
            Most diabetic foot ulcers are found late. Not because they are
            hidden, but because nobody was looking.
          </h2>
        </motion.div>

        <motion.div
          {...reveal}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.22, 0.61, 0.36, 1] }}
          className="mt-12 grid gap-10 md:grid-cols-2 md:gap-16"
        >
          <div className="space-y-5 text-[1.0625rem] leading-relaxed text-clr-muted">
            <p>
              Diabetic neuropathy removes the signal that would normally make
              someone look at their foot. Pressure, a blister, a crack in the
              skin: none of it hurts, so none of it prompts a check. By the
              time the foot is examined, the question has usually stopped being
              “is this something?” and become “how much of this can be saved?”
            </p>
            <p>
              A clinical foot exam solves this, and it is not the bottleneck we
              can fix. Appointments are scarce, travel is expensive, and the
              interval between visits is exactly where the problem develops.
            </p>
            <p>
              SoleIQ closes that interval with the thing every patient already
              has: a phone camera, and a few minutes. Four photos, read
              alongside the history that determines risk, produce a screening
              level a person can act on, and a record a clinician can trust
              enough to work from.
            </p>
          </div>

          <div className="space-y-5 text-[1.0625rem] leading-relaxed text-clr-muted">
            <p>
              We are careful about what we claim. SoleIQ screens; it does not
              diagnose. It is built to send people to care earlier and with
              better information, not to keep them away from it.
            </p>
            <p>
              That constraint shapes the product. The model never sees a photo
              the phone judged unusable. Findings are shown on the patient's own
              images, so a person can see what the system saw. Every screening
              stays in a timeline, because a single frame is a weaker signal
              than a series. And the record belongs to the patient, who decides
              which clinician sees it.
            </p>
            {/* TODO(soleiq): if you want prevalence, cost, or outcome figures
                here, send me the sources and I'll add them with citations.
                Nothing unsourced goes on this page. */}
          </div>
        </motion.div>

        <div className="mt-20 md:mt-28">
          <h3 className="h-sub">Team</h3>
          <ul className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {TEAM.map((member) => (
              <li key={member.name + member.role}>
                {member.photo && (
                  <div className="portrait">
                    <img
                      src={member.photo}
                      alt={`${member.name}, ${member.role}`}
                      width={641}
                      height={800}
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                )}
                <p className="mt-6 font-display text-[1.125rem] font-medium tracking-tight text-clr-text">
                  {member.name}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--clr-accent-2)' }}>
                  {member.role}
                </p>
                <p className="mt-3 max-w-sm text-[0.9375rem] leading-relaxed text-clr-muted">
                  {member.line}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
