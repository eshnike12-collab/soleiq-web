import { PostEditor } from "@/components/blog/PostEditor";

export default function EditPostPage({ params }: { params: { id: string } }) {
  return <PostEditor postId={params.id} />;
}
