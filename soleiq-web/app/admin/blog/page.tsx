"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { listAllPosts, deletePost, type BlogPost } from "@/lib/blog";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/SignOutButton";

const fmt = (ts: string | null) =>
  ts ? new Date(ts).toLocaleDateString() : "—";

export default function BlogAdminPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    setLoading(true);
    listAllPosts().then((p) => {
      setPosts(p);
      setLoading(false);
    });
  };

  useEffect(refresh, []);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this post permanently?")) return;
    try {
      await deletePost(id);
      refresh();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-warmGray-50/40">
      <header className="border-b border-warmGray-100 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-xs text-warmGray-600 hover:text-brand">
              ← Admin
            </Link>
            <span className="text-warmGray-100">|</span>
            <h1 className="text-xl font-semibold text-warmGray-800">Blog posts</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/admin/blog/new">
              <Button size="sm">
                <Plus className="mr-1 h-4 w-4" /> New post
              </Button>
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {loading ? (
          <p className="text-sm text-warmGray-600">Loading…</p>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-warmGray-100 bg-white p-10 text-center">
            <p className="text-sm text-warmGray-600">No posts yet.</p>
            <Link href="/admin/blog/new" className="mt-3 inline-block">
              <Button size="sm">Write your first post</Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-warmGray-100 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-warmGray-50/60 text-xs uppercase tracking-wide text-warmGray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Updated</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-t border-warmGray-100">
                    <td className="px-4 py-3 text-warmGray-800">
                      <Link href={`/admin/blog/${p.id}`} className="hover:text-brand">
                        {p.title}
                      </Link>
                      <p className="mt-0.5 font-mono text-[10px] text-warmGray-600">
                        /{p.slug}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-warmGray-600">
                      {p.category ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      {p.published ? (
                        <span className="rounded-full bg-teal-50 px-2 py-0.5 text-xs font-medium text-teal-800">
                          Published
                        </span>
                      ) : (
                        <span className="rounded-full bg-warmGray-50 px-2 py-0.5 text-xs font-medium text-warmGray-600">
                          Draft
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-warmGray-600">
                      {fmt(p.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <Link
                          href={`/admin/blog/${p.id}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-warmGray-600 hover:bg-warmGray-50"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => onDelete(p.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-warmGray-600 hover:bg-warmGray-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-6 text-xs text-warmGray-600">
          Published posts appear at <span className="font-mono">soleiq-website</span>{" "}
          → Blog section.{" "}
          <a
            href="https://soleiq-website-fd4ykh9en-eshnike12-4913s-projects.vercel.app/#blog"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-brand hover:underline"
          >
            View live <ExternalLink className="ml-0.5 h-3 w-3" />
          </a>
        </p>
      </main>
    </div>
  );
}
