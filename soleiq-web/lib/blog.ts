"use client";

import { getSupabase } from "./supabase";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_markdown: string;
  category: string | null;
  cover_gradient: string | null;
  read_min: number;
  published: boolean;
  published_at: string | null;
  author_id: string | null;
  created_at: string;
  updated_at: string;
}

export type NewBlogPost = Omit<
  BlogPost,
  "id" | "created_at" | "updated_at" | "author_id"
>;

export async function listAllPosts(): Promise<BlogPost[]> {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) {
    console.warn("[soleiq] listAllPosts failed:", error.message);
    return [];
  }
  return (data ?? []) as BlogPost[];
}

export async function getPost(id: string): Promise<BlogPost | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("blog_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    console.warn("[soleiq] getPost failed:", error.message);
    return null;
  }
  return (data as BlogPost) ?? null;
}

export async function createPost(post: NewBlogPost): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  const { data: u } = await sb.auth.getUser();
  const { data, error } = await sb
    .from("blog_posts")
    .insert({ ...post, author_id: u.user?.id ?? null })
    .select("id")
    .single();
  if (error) {
    console.warn("[soleiq] createPost failed:", error.message);
    throw error;
  }
  return data.id;
}

export async function updatePost(
  id: string,
  patch: Partial<NewBlogPost>
): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("blog_posts").update(patch).eq("id", id);
  if (error) {
    console.warn("[soleiq] updatePost failed:", error.message);
    throw error;
  }
}

export async function deletePost(id: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("blog_posts").delete().eq("id", id);
  if (error) {
    console.warn("[soleiq] deletePost failed:", error.message);
    throw error;
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export const GRADIENT_PRESETS = [
  { label: "Blue", value: "from-[#3b82f6] to-[#06b6d4]" },
  { label: "Purple", value: "from-[#a855f7] to-[#ec4899]" },
  { label: "Teal", value: "from-[#10b981] to-[#14b8a6]" },
  { label: "Sunset", value: "from-[#f97316] to-[#ef4444]" },
  { label: "Indigo", value: "from-[#6366f1] to-[#8b5cf6]" },
];
