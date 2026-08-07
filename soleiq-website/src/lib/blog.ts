export interface PublicBlogPost {
  id: string
  slug: string
  title: string
  excerpt: string | null
  body_markdown: string
  category: string | null
  cover_gradient: string | null
  read_min: number
  published_at: string | null
}

/**
 * Published posts, authored in the app's admin CMS and read straight from
 * Supabase. The client is imported lazily so the SDK never lands in the entry
 * chunk — the blog is well below the fold.
 */
export async function listPublishedPosts(): Promise<PublicBlogPost[]> {
  const { getSupabase } = await import('./supabase')
  const sb = getSupabase()
  if (!sb) return []
  const { data, error } = await sb
    .from('blog_posts')
    .select(
      'id, slug, title, excerpt, body_markdown, category, cover_gradient, read_min, published_at'
    )
    .eq('published', true)
    .order('published_at', { ascending: false, nullsFirst: false })
  if (error) {
    console.warn('[soleiq-website] listPublishedPosts failed:', error.message)
    return []
  }
  return (data ?? []) as PublicBlogPost[]
}
