import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, X } from 'lucide-react'
import { marked } from 'marked'
import { listPublishedPosts, type PublicBlogPost } from '../lib/blog'

/**
 * Posts come from Supabase (`blog_posts`, published only) and are authored in
 * the app's admin CMS — that integration is untouched. If there are no
 * published posts, the section renders nothing rather than showing samples.
 */

interface DisplayPost {
  id: string
  category: string
  title: string
  excerpt: string
  body_markdown: string
  date: string
  readMin: number
}

function toDisplay(p: PublicBlogPost): DisplayPost {
  return {
    id: p.id,
    category: p.category ?? 'Notes',
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
  }
}

export default function Blog() {
  const [posts, setPosts] = useState<DisplayPost[]>([])
  const [reading, setReading] = useState<DisplayPost | null>(null)

  useEffect(() => {
    let alive = true
    listPublishedPosts().then((rows) => {
      if (alive) setPosts(rows.map(toDisplay))
    })
    return () => {
      alive = false
    }
  }, [])

  if (posts.length === 0) return null

  return (
    <section
      id="blog"
      className="section-pad"
      aria-labelledby="blog-heading"
    >
      <div className="shell">
        <p className="eyebrow">Writing</p>
        <h2 id="blog-heading" className="h-section mt-5 max-w-2xl">
          Notes from the people building it.
        </h2>

        <ul className="mt-12 border-t border-clr-border">
          {posts.map((post) => (
            <li key={post.id} className="border-b border-clr-border">
              <button
                type="button"
                onClick={() => setReading(post)}
                className="group grid w-full gap-3 py-7 text-left md:grid-cols-[9rem_1fr_auto] md:items-baseline md:gap-8"
              >
                <span className="text-sm text-clr-muted">
                  {post.date}
                  {post.category ? ` · ${post.category}` : ''}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-[1.25rem] font-medium leading-snug tracking-tight text-clr-text group-hover:underline">
                    {post.title}
                  </span>
                  {post.excerpt && (
                    <span className="clamp-2 mt-2 block max-w-2xl text-[0.9375rem] leading-relaxed text-clr-muted">
                      {post.excerpt}
                    </span>
                  )}
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-clr-muted">
                  {post.readMin} min
                  <ArrowRight size={15} aria-hidden="true" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <ReadModal post={reading} onClose={() => setReading(null)} />
    </section>
  )
}

function ReadModal({ post, onClose }: { post: DisplayPost | null; onClose: () => void }) {
  const reduce = useReducedMotion()
  const html = useMemo(
    () =>
      post ? (marked.parse(post.body_markdown, { breaks: true, async: false }) as string) : '',
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
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-clr-text/25"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={post.title}
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 0.61, 0.36, 1] }}
            className="fixed inset-x-0 bottom-0 top-8 z-[70] mx-auto w-full max-w-3xl overflow-hidden rounded-t-2xl bg-clr-bg sm:inset-x-6 sm:top-12 lg:rounded-2xl"
            style={{ boxShadow: '0 -12px 60px -20px rgba(11,42,60,0.3)' }}
          >
            <div className="flex items-center justify-between border-b border-clr-border px-6 py-4 sm:px-10">
              <span className="text-sm text-clr-muted">
                {post.date}
                {post.category ? ` · ${post.category}` : ''} · {post.readMin} min
              </span>
              <button
                type="button"
                onClick={onClose}
                autoFocus
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-clr-muted hover:text-clr-text"
                aria-label="Close article"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div
              className="overflow-y-auto px-6 py-10 sm:px-10"
              style={{ maxHeight: 'calc(100% - 3.75rem)' }}
            >
              <h2 className="max-w-2xl text-[clamp(1.75rem,4vw,2.5rem)]">{post.title}</h2>
              {post.excerpt && (
                <p className="lede mt-5 max-w-prose">{post.excerpt}</p>
              )}
              <article
                className="prose-soleiq mt-10 max-w-prose"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
