import Link from "next/link";
import { notFound } from "next/navigation";
import { PostActions } from "@/components/post-actions";
import { SiteHeader } from "@/components/site-header";
import { getPost } from "@/lib/posts";

const categoryLabels = {
  free: "자유",
  clip: "클립",
  promo: "홍보",
  notice: "공지",
};

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const post = await getPost(Number(params.id));

  if (!post) notFound();

  return (
    <>
      <SiteHeader />
      <main className="admin-page board-page">
        <article className="admin-shell post-detail">
          <p className="eyebrow">{categoryLabels[post.category]}</p>
          <h1>{post.title}</h1>
          <small>{post.author_name ?? "VSPHERE 회원"} · {new Date(post.created_at).toLocaleString("ko-KR")}</small>
          <div className="post-content">{post.content}</div>
          <PostActions postId={post.id} userId={post.user_id} />
          <div className="admin-actions">
            <Link className="ghost-button" href="/boards">목록</Link>
            <Link className="primary-button" href="/write">글쓰기</Link>
          </div>
        </article>
      </main>
    </>
  );
}
