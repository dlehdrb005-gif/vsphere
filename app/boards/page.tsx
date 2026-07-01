import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getPosts } from "@/lib/posts";

const categoryLabels = {
  free: "자유",
  clip: "클립",
  promo: "홍보",
  notice: "공지",
};

export default async function BoardsPage() {
  const posts = await getPosts();

  return (
    <>
      <SiteHeader />
      <main className="admin-page board-page">
        <section className="admin-shell">
          <div className="admin-title-row">
            <div>
              <p className="eyebrow">COMMUNITY</p>
              <h1>게시판</h1>
            </div>
            <div className="admin-actions">
              <Link className="ghost-button" href="/">홈</Link>
              <Link className="primary-button" href="/write">글쓰기</Link>
            </div>
          </div>

          <div className="post-list">
            {posts.map((post) => (
              <Link className="post-card" href={`/boards/${post.id}`} key={post.id}>
                <span>{categoryLabels[post.category]}</span>
                <strong>{post.title}</strong>
                <p>{post.content}</p>
                <small>{post.author_name ?? "VSPHERE 회원"} · {new Date(post.created_at).toLocaleString("ko-KR")}</small>
              </Link>
            ))}
            {!posts.length ? (
              <article className="post-card empty">
                <strong>아직 게시글이 없습니다.</strong>
                <p>첫 번째 글을 작성해 VSPHERE 커뮤니티를 열어보세요.</p>
              </article>
            ) : null}
          </div>
        </section>
      </main>
    </>
  );
}
