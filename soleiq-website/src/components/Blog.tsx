import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Calendar, Clock, X } from 'lucide-react'
import { marked } from 'marked'
import { listPublishedPosts, type PublicBlogPost } from '../lib/blog'

interface MockPost {
  id: string
  category: string
  title: string
  excerpt: string
  body_markdown: string
  date: string
  readMin: number
  tone: string
}

const FALLBACK_POSTS: MockPost[] = [
  {
    id: 'p1',
    category: 'Research',
    title: 'Why Early Thermal Asymmetry Predicts Ulceration Weeks Before It Appears',
    excerpt:
      'A 2025 review of plantar thermography studies suggests a 2.2°C asymmetry threshold can flag at-risk feet up to four weeks earlier than visual inspection.',
    body_markdown:
      'Sample post body. Sign in to /admin/blog to author your own posts.',
    date: 'Apr 26, 2026',
    readMin: 7,
    tone: 'from-[#3b82f6] to-[#06b6d4]',
  },
  {
    id: 'p2',
    category: 'Patient Stories',
    title: 'How Daily Home Scans Helped James Avoid a Second Amputation',
    excerpt:
      'After losing two toes in 2023, James started using SoleIQ at home. Two early-stage callus alerts later, he\'s walked 1,800 km without a single new wound.',
    body_markdown: 'Sample post body.',
    date: 'Apr 18, 2026',
    readMin: 5,
    tone: 'from-[#a855f7] to-[#ec4899]',
  },
  {
    id: 'p3',
    category: 'Engineering',
    title: 'Building a Plantar 3D Scanner That Fits in Your Pocket',
    excerpt:
      'How we married time-of-flight depth, photogrammetry fallback, and on-device fusion to deliver sub-millimeter foot meshes from any modern phone.',
    body_markdown: 'Sample post body.',
    date: 'Apr 4, 2026',
    readMin: 9,
    tone: 'from-[#10b981] to-[#14b8a6]',
  },
  {
    id: 'p4',
    category: 'Clinical',
    title: 'A Field Note on Integrating SoleIQ Into Outpatient Podiatry Visits',
    excerpt:
      'Three clinics, twelve weeks, and what we learned about charting, billing codes, and getting clinicians to trust an AI second opinion.',
    body_markdown: 'Sample post body.',
    date: 'Mar 22, 2026',
    readMin: 6,
    tone: 'from-[#f97316] to-[#ef4444]',
  },
]

interface DisplayPost {
  id: string
  category: string
  title: string
  excerpt: string
  body_markdown: string
  date: string
  readMin: number
  tone: string
}

function toDisplay(p: PublicBlogPost): DisplayPost {
  return {
    id: p.id,
    category: p.category ?? 'General',
    title: p.title,
    excerpt: p.excerpt ?? '',
    body_markdown: p.body_markdown,
    date: p.published_at
      ? new Date(p.published_at).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '',
    readMin: p.read_min,
    tone: p.cover_gradient ?? 'from-[#3b82f6] to-[#06b6d4]',
  }
}

export default function Blog() {
  const [posts, setPosts] = useState<DisplayPost[]>(FALLBACK_POSTS)
  const [readPost, setReadPost] = useState<DisplayPost | null>(null)

  useEffect(() => {
    listPublishedPosts().then((rows) => {
      if (rows.length > 0) setPosts(rows.map(toDisplay))
    })
  }, [])

  if (posts.length === 0) return null

  const featured = posts[0]
  const supporting = posts.slice(1, 3)
  const wide = posts.slice(3, 5)

  return (
    <section
      id="blog"
      className="section-pad"
      style={{ background: 'var(--clr-surface-1)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-14"
        >
          <span
            className="inline-block text-sm font-medium px-3 py-1 rounded-full mb-6"
            style={{
              background: 'var(--clr-glow)',
              border: '1px solid var(--clr-border)',
              color: 'var(--clr-accent)',
            }}
          >
            From the Lab
          </span>
          <h2 className="section-heading mb-4">
            Insights, Stories &{' '}
            <span className="text-gradient">Research</span>
          </h2>
          <p
            className="text-base max-w-2xl mx-auto leading-relaxed"
            style={{ color: 'var(--clr-text-muted)' }}
          >
            Notes from our engineers, clinicians, and the people who use SoleIQ
            every day.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          <FeaturedCard post={featured} onRead={() => setReadPost(featured)} />
          <div className="grid grid-cols-1 gap-6">
            {supporting.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                delay={0.1 + i * 0.1}
                onRead={() => setReadPost(post)}
              />
            ))}
          </div>
        </div>

        {wide.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-6 mt-6">
            {wide.map((post, i) => (
              <PostCard
                key={post.id}
                post={post}
                delay={0.3 + i * 0.1}
                wide
                onRead={() => setReadPost(post)}
              />
            ))}
          </div>
        )}
      </div>

      <ReadModal post={readPost} onClose={() => setReadPost(null)} />
    </section>
  )
}

function FeaturedCard({ post, onRead }: { post: DisplayPost; onRead: () => void }) {
  return (
    <motion.button
      onClick={onRead}
      type="button"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      whileHover={{ y: -4 }}
      className="group lg:col-span-2 glass rounded-3xl overflow-hidden flex flex-col text-left"
    >
      <div className={`h-64 sm:h-80 relative bg-gradient-to-br ${post.tone}`}>
        <div className="absolute inset-0 opacity-30 mix-blend-overlay [background-image:radial-gradient(circle_at_30%_30%,white,transparent_50%)]" />
        <div className="absolute bottom-4 left-4">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
            {post.category}
          </span>
        </div>
      </div>
      <div className="p-6 sm:p-8 flex-1 flex flex-col">
        <Meta post={post} />
        <h3
          className="font-syne font-bold text-2xl sm:text-3xl mt-3 mb-3 leading-tight"
          style={{ color: 'var(--clr-text)' }}
        >
          {post.title}
        </h3>
        <p className="text-base leading-relaxed flex-1" style={{ color: 'var(--clr-text-muted)' }}>
          {post.excerpt}
        </p>
        <span
          className="inline-flex items-center gap-1.5 mt-5 font-medium text-sm group-hover:gap-2.5 transition-all"
          style={{ color: 'var(--clr-accent)' }}
        >
          Read article <ArrowRight size={16} />
        </span>
      </div>
    </motion.button>
  )
}

function PostCard({
  post,
  delay,
  wide,
  onRead,
}: {
  post: DisplayPost
  delay: number
  wide?: boolean
  onRead: () => void
}) {
  return (
    <motion.button
      onClick={onRead}
      type="button"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], delay }}
      whileHover={{ y: -4 }}
      className="group glass rounded-2xl overflow-hidden flex flex-col text-left"
    >
      <div className={`relative bg-gradient-to-br ${post.tone} ${wide ? 'h-44' : 'h-32'}`}>
        <div className="absolute inset-0 opacity-25 mix-blend-overlay [background-image:radial-gradient(circle_at_70%_30%,white,transparent_50%)]" />
        <span className="absolute top-3 left-3 inline-block text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
          {post.category}
        </span>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <Meta post={post} small />
        <h3
          className="font-syne font-semibold text-lg mt-2 mb-2 leading-snug"
          style={{ color: 'var(--clr-text)' }}
        >
          {post.title}
        </h3>
        <p
          className="text-sm leading-relaxed flex-1 line-clamp-2"
          style={{ color: 'var(--clr-text-muted)' }}
        >
          {post.excerpt}
        </p>
        <span
          className="inline-flex items-center gap-1.5 mt-3 font-medium text-xs group-hover:gap-2.5 transition-all"
          style={{ color: 'var(--clr-accent)' }}
        >
          Read article <ArrowRight size={14} />
        </span>
      </div>
    </motion.button>
  )
}

function Meta({ post, small }: { post: DisplayPost; small?: boolean }) {
  const cls = small ? 'text-xs' : 'text-sm'
  return (
    <div className={`${cls} flex items-center gap-3`} style={{ color: 'var(--clr-text-muted)' }}>
      <span className="inline-flex items-center gap-1">
        <Calendar size={small ? 12 : 14} /> {post.date}
      </span>
      <span className="inline-flex items-center gap-1">
        <Clock size={small ? 12 : 14} /> {post.readMin} min read
      </span>
    </div>
  )
}

function ReadModal({ post, onClose }: { post: DisplayPost | null; onClose: () => void }) {
  const html = useMemo(
    () => (post ? (marked.parse(post.body_markdown, { breaks: true, async: false }) as string) : ''),
    [post]
  )

  useEffect(() => {
    if (!post) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [post, onClose])

  return (
    <AnimatePresence>
      {post && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-x-3 bottom-3 top-12 sm:inset-x-8 sm:top-16 lg:left-1/2 lg:right-auto lg:top-12 lg:bottom-12 lg:w-[min(900px,90vw)] lg:-translate-x-1/2 z-50 overflow-hidden rounded-3xl shadow-2xl"
            style={{ background: 'var(--clr-surface-1)' }}
          >
            <div
              className={`relative h-40 sm:h-56 bg-gradient-to-br ${post.tone}`}
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm hover:bg-black/50"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <div className="absolute bottom-4 left-6">
                <span className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full bg-white/20 text-white backdrop-blur-sm">
                  {post.category}
                </span>
              </div>
            </div>
            <div className="overflow-y-auto px-6 py-8 sm:px-10 sm:py-10" style={{ maxHeight: 'calc(100% - 10rem)' }}>
              <h1
                className="font-syne font-bold text-3xl sm:text-4xl leading-tight mb-3"
                style={{ color: 'var(--clr-text)' }}
              >
                {post.title}
              </h1>
              <Meta post={post} />
              {post.excerpt && (
                <p
                  className="mt-4 text-base sm:text-lg leading-relaxed italic"
                  style={{ color: 'var(--clr-text-muted)' }}
                >
                  {post.excerpt}
                </p>
              )}
              <article
                className="prose prose-invert mt-6 max-w-none text-base leading-relaxed"
                style={{ color: 'var(--clr-text)' }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
