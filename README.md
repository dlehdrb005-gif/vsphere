# VSPHERE App

SOOP 버튜버 콘텐츠, 클립 저장소, 일정 홍보, 커뮤니티 기능을 위한 Next.js MVP입니다.

## 실행

```bash
pnpm install
pnpm dev
```

브라우저에서 `http://localhost:3000`으로 확인합니다.

## Supabase 연결

이 앱은 Supabase 프로젝트 `vsphere`와 연결되어 있습니다.

필요한 환경변수:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
VSPHERE_ADMIN_PASSWORD=
```

DB 스키마와 초기 데이터는 `supabase/schema.sql`에 있습니다.

현재 연결 테이블:

- `vsphere_hero_slides`
- `vsphere_clips`
- `vsphere_contents`

홈페이지와 `/api/clips`, `/api/contents`는 Supabase 데이터를 우선 사용하고, Supabase가 설정되지 않았거나 데이터가 없으면 `lib/data.ts`의 기본 데이터를 사용합니다.

## 관리자 페이지

관리자 콘솔은 `/admin`에 있습니다. 로컬 테스트 비밀번호는 `.env.local`의 `VSPHERE_ADMIN_PASSWORD` 값입니다.
