import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="VSPHERE 홈">
        <Image src="/assets/vsphere-logo-reference.png" alt="" width={46} height={46} priority />
        <span>
          <strong>VSPHERE</strong>
          <small>SOOP VTUBER SUPPORT PROJECT</small>
        </span>
      </Link>
      <nav className="top-nav" aria-label="주요 메뉴">
        <Link href="/#clips">클립</Link>
        <Link href="/#contents">콘텐츠</Link>
        <Link href="/boards">게시판</Link>
        <Link href="/#notice">공지</Link>
      </nav>
      <div className="header-actions">
        <Link className="ghost-button" href="/login">
          로그인
        </Link>
        <Link className="primary-button" href="/write">
          글쓰기
        </Link>
      </div>
    </header>
  );
}
