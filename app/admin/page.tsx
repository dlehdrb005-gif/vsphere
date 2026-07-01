import { cookies } from "next/headers";
import Link from "next/link";
import { loginAdmin, logoutAdmin } from "./actions";
import { ADMIN_COOKIE, isAdminCookieValid } from "./auth";

const adminCards = [
  {
    label: "회원 관리",
    title: "권한 변경 / 인증 처리",
    text: "일반 회원, 인증 스트리머, 관리자 권한을 빠르게 조정하는 영역입니다.",
  },
  {
    label: "게시글 관리",
    title: "숨김 / 삭제 / 고정",
    text: "문제가 있는 글은 목록에서 즉시 숨김 처리하고, 중요한 공지는 상단에 고정합니다.",
  },
  {
    label: "신고 관리",
    title: "접수 / 확인중 / 완료",
    text: "신고 상태를 단순한 단계로 추적해서 1인 운영 피로도를 줄입니다.",
  },
  {
    label: "배너 관리",
    title: "운영자 Pick 편집",
    text: "메인 슬라이드와 추천 콘텐츠 순서를 관리하는 영역입니다.",
  },
];

type AdminPageProps = {
  searchParams?: {
    error?: string;
  };
};

function getErrorMessage(error?: string) {
  if (error === "missing-password") {
    return "관리자 비밀번호가 아직 설정되지 않았습니다. .env.local에 VSPHERE_ADMIN_PASSWORD를 추가하세요.";
  }

  if (error === "invalid-password") {
    return "관리자 비밀번호가 맞지 않습니다.";
  }

  return null;
}

export default function AdminPage({ searchParams }: AdminPageProps) {
  const isAuthed = isAdminCookieValid(cookies().get(ADMIN_COOKIE)?.value);
  const errorMessage = getErrorMessage(searchParams?.error);

  if (!isAuthed) {
    return (
      <main className="admin-page">
        <section className="admin-shell auth-shell">
          <p className="eyebrow">ADMIN ONLY</p>
          <h1>관리자 로그인</h1>
          <p>
            이 화면은 관리자 전용입니다. 일반 사용자는 홈 화면에서 관리자 메뉴를 볼 수 없고, 직접
            주소로 들어와도 로그인 전에는 관리 기능이 노출되지 않습니다.
          </p>
          <form className="admin-login-form" action={loginAdmin}>
            <label>
              <span>관리자 비밀번호</span>
              <input name="password" type="password" autoComplete="current-password" />
            </label>
            {errorMessage ? <strong className="form-error">{errorMessage}</strong> : null}
            <div className="admin-actions">
              <button className="primary-button" type="submit">
                로그인
              </button>
              <Link className="ghost-button" href="/">
                홈으로
              </Link>
            </div>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-title-row">
          <div>
            <p className="eyebrow">ADMIN CONSOLE</p>
            <h1>VSPHERE 관리자 콘솔</h1>
          </div>
          <form action={logoutAdmin}>
            <button className="ghost-button" type="submit">
              로그아웃
            </button>
          </form>
        </div>
        <p>
          관리자 전용 화면입니다. 다음 단계에서는 Supabase 계정 권한, 게시글 CRUD, 배너 업로드,
          신고 처리 API를 이 콘솔에 연결하면 됩니다.
        </p>
        <div className="admin-grid">
          {adminCards.map((card) => (
            <article key={card.label}>
              <span>{card.label}</span>
              <strong>{card.title}</strong>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
