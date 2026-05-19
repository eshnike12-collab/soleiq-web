"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { marked } from "marked";
import {
  GRADIENT_PRESETS,
  createPost,
  deletePost,
  getPost,
  slugify,
  updatePost,
  type BlogPost,
  type NewBlogPost,
} from "@/lib/blog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { cn } from "@/lib/utils";

interface Props {
  postId?: string;
}

const CATEGORIES = [
  "Research",
  "Patient Stories",
  "Engineering",
  "Clinical",
  "Company",
];

export function PostEditor({ postId }: Props) {
  const router = useRouter();
  const editing = !!postId;
  const [loading, setLoading] = useState(editing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [gradient, setGradient] = useState(GRADIENT_PRESETS[0].value);
  const [readMin, setReadMin] = useState(5);
  const [published, setPublished] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!postId) return;
    getPost(postId).then((p) => {
      if (!p) {
        setError("Post not found");
        setLoading(false);
        return;
      }
      setTitle(p.title);
      setSlug(p.slug);
      setSlugDirty(true);
      setExcerpt(p.excerpt ?? "");
      setBody(p.body_markdown);
      setCategory(p.category ?? CATEGORIES[0]);
      setGradient(p.cover_gradient ?? GRADIENT_PRESETS[0].value);
      setReadMin(p.read_min);
      setPublished(p.published);
      setLoading(false);
    });
  }, [postId]);

  // Auto-slug on title until user manually edits.
  useEffect(() => {
    if (!slugDirty) setSlug(slugify(title));
  }, [title, slugDirty]);

  const renderedHtml = useMemo(
    () => marked.parse(body, { breaks: true, async: false }) as string,
    [body]
  );

  const submit = async (overrides?: Partial<NewBlogPost>) => {
    setError(null);
    setBusy(true);
    try {
      const payload: NewBlogPost = {
        slug: slug.trim() || slugify(title),
        title: title.trim(),
        excerpt: excerpt.trim() || null,
        body_markdown: body,
        category,
        cover_gradient: gradient,
        read_min: readMin,
        published,
        published_at:
          (overrides?.published ?? published)
            ? new Date().toISOString()
            : null,
        ...overrides,
      };
      if (!payload.title) throw new Error("Title required");
      if (editing && postId) {
        await updatePost(postId, payload);
      } else {
        const id = await createPost(payload);
        if (id) router.push(`/admin/blog/${id}`);
        else router.push("/admin/blog");
        return;
      }
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async () => {
    if (!postId) return;
    if (!confirm("Delete this post permanently?")) return;
    setBusy(true);
    try {
      await deletePost(postId);
      router.push("/admin/blog");
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-warmGray-600">Loading…</div>;

  return (
    <div className="min-h-screen bg-warmGray-50/40">
      <header className="border-b border-warmGray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/blog"
              className="text-xs text-warmGray-600 hover:text-brand"
            >
              ← Posts
            </Link>
            <span className="text-warmGray-100">|</span>
            <h1 className="text-xl font-semibold text-warmGray-800">
              {editing ? "Edit post" : "New post"}
            </h1>
            {editing && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  published
                    ? "bg-teal-50 text-teal-800"
                    : "bg-warmGray-50 text-warmGray-600"
                )}
              >
                {published ? "Published" : "Draft"}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview((v) => !v)}
              className="text-sm font-medium text-warmGray-600 hover:text-warmGray-800"
            >
              {showPreview ? "Edit" : "Preview"}
            </button>
            {editing && (
              <Button
                size="sm"
                variant="outline"
                onClick={onDelete}
                disabled={busy}
              >
                Delete
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => submit({ published: false })}
              disabled={busy || !title}
            >
              Save draft
            </Button>
            <Button
              size="sm"
              onClick={() => submit({ published: true })}
              disabled={busy || !title}
            >
              {published ? "Update" : "Publish"}
            </Button>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-5 px-6 py-8">
        {error && (
          <div className="rounded-xl border border-risk-medium/40 bg-amber-50 p-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {showPreview ? (
          <article className="rounded-3xl bg-white p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand">
              {category}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-warmGray-800">
              {title || "Untitled"}
            </h1>
            <p className="mt-1 text-xs text-warmGray-600">
              {readMin} min read
            </p>
            {excerpt && (
              <p className="mt-4 text-base leading-relaxed text-warmGray-600">
                {excerpt}
              </p>
            )}
            <div
              className="prose prose-sm mt-6 max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </article>
        ) : (
          <div className="grid gap-5 md:grid-cols-3">
            <div className="space-y-4 md:col-span-2">
              <div>
                <label className="field-label">Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="The story you want to tell"
                />
              </div>
              <div>
                <label className="field-label">Slug (URL)</label>
                <Input
                  value={slug}
                  onChange={(e) => {
                    setSlug(slugify(e.target.value));
                    setSlugDirty(true);
                  }}
                  className="font-mono text-sm"
                />
              </div>
              <div>
                <label className="field-label">Excerpt (1–2 sentences)</label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  rows={2}
                  className="w-full rounded-2xl border border-warmGray-100 bg-warmGray-50/60 p-3 text-sm outline-none focus:border-brand focus:bg-white"
                />
              </div>
              <div>
                <label className="field-label">Body (Markdown)</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={20}
                  className="w-full rounded-2xl border border-warmGray-100 bg-warmGray-50/60 p-3 font-mono text-sm leading-relaxed outline-none focus:border-brand focus:bg-white"
                  placeholder={`# Heading\n\nWrite your post in markdown.\n\n## Subhead\n\n- Bullets\n- Work too\n\n[Links](https://example.com) and **bold** also work.`}
                />
              </div>
            </div>

            <aside className="space-y-4">
              <div>
                <label className="field-label">Category</label>
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <label className="field-label">Cover gradient</label>
                <div className="grid grid-cols-2 gap-2">
                  {GRADIENT_PRESETS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setGradient(g.value)}
                      className={cn(
                        "h-12 rounded-xl bg-gradient-to-br border-2 transition-all",
                        g.value,
                        gradient === g.value
                          ? "border-warmGray-800 ring-2 ring-warmGray-100"
                          : "border-transparent"
                      )}
                      aria-label={g.label}
                    />
                  ))}
                </div>
              </div>
              <div>
                <label className="field-label">Read time (min)</label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={readMin}
                  onChange={(e) => setReadMin(Number(e.target.value) || 5)}
                />
              </div>
              <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-warmGray-100 bg-white p-3">
                <span className="text-sm font-medium text-warmGray-800">
                  Published
                </span>
                <input
                  type="checkbox"
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  className="h-5 w-5 accent-brand"
                />
              </label>
              <div className="rounded-2xl border border-warmGray-100 bg-white p-3 text-xs text-warmGray-600">
                <p className="mb-1 font-semibold text-warmGray-800">Cover preview</p>
                <div
                  className={cn(
                    "h-20 rounded-xl bg-gradient-to-br",
                    gradient
                  )}
                />
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}
