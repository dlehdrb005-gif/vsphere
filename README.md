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
- `vsphere_profiles`
- `vsphere_posts`

홈페이지와 `/api/clips`, `/api/contents`는 Supabase 데이터를 우선 사용하고, Supabase가 설정되지 않았거나 데이터가 없으면 `lib/data.ts`의 기본 데이터를 사용합니다.

## 회원 기능

지원하는 페이지:

- `/login` 로그인
- `/signup` 회원가입
- `/auth/callback` OAuth 콜백
- `/boards` 게시글 목록
- `/boards/[id]` 게시글 상세
- `/write` 게시글 작성

Supabase Auth URL 설정에 로컬 콜백을 추가하세요.

```text
http://localhost:3000/auth/callback
```

배포 후에는 배포 도메인의 `/auth/callback`도 추가해야 합니다.

게시글 작성은 로그인한 사용자만 가능하고, RLS 정책으로 작성자 본인만 자기 글을 삭제할 수 있습니다.

## 관리자 페이지

관리자 콘솔은 `/admin`에 있습니다. 로컬 테스트 비밀번호는 `.env.local`의 `VSPHERE_ADMIN_PASSWORD` 값입니다.

## 정적 홈페이지 마이페이지 (무료 Spark)

상단 계정 메뉴와 사이드바에서 마이페이지를 엽니다.
닉네임은 Firebase Auth에, 사진은 Firestore `profilePhotos/{uid}`에 저장합니다.
사진은 JPG/PNG/WebP 5MB 이하를 받아 중앙 정사각형 192×192 JPEG로 변환하며
데이터 URL 문자열은 최대 60,000바이트입니다. 본인만 읽고 저장할 수 있습니다.
사진을 기본으로 바꾸면 빈 문자열로 저장되어 Google 기본 사진도 표시하지 않습니다.

Storage 및 Blaze 결제 연결은 사용하지 않습니다. Spark 무료 할당량을 넘으면
요청이 제한될 수 있습니다. 가입자 로그인 시 사진 문서 1회 읽기, 사진 저장 시
1회 쓰기를 사용합니다. 게시판의 기존 작성자 이름은 작성 당시 이름을 유지합니다.

운영 전 기존 Firestore 규칙을 보존하면서 `profilePhotos` 경로 규칙을 적용하세요.
사진과 닉네임은 다른 서비스이므로 사진 저장 후 닉네임만 실패하면 부분 저장을
명확히 안내합니다. 닉네임만 변경할 때는 사진 쓰기를 수행하지 않습니다.
