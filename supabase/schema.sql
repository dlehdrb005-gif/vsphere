create table if not exists public.vsphere_hero_slides (
  id bigint generated always as identity primary key,
  sort_order integer not null unique,
  title text not null,
  text text not null,
  signal text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vsphere_clips (
  id integer primary key,
  streamer text not null,
  title text not null,
  category text not null check (category in ('funny', 'sing', 'collab', 'issue')),
  tags text[] not null default '{}',
  views text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.vsphere_contents (
  id integer primary key,
  day text not null,
  time text not null,
  title text not null,
  description text not null,
  status text not null check (status in ('진행중', '예정')),
  created_at timestamptz not null default now()
);

alter table public.vsphere_hero_slides enable row level security;
alter table public.vsphere_clips enable row level security;
alter table public.vsphere_contents enable row level security;

drop policy if exists "Anyone can read vsphere hero slides" on public.vsphere_hero_slides;
drop policy if exists "Anyone can read vsphere clips" on public.vsphere_clips;
drop policy if exists "Anyone can read vsphere contents" on public.vsphere_contents;

create policy "Anyone can read vsphere hero slides"
on public.vsphere_hero_slides
for select
to anon, authenticated
using (true);

create policy "Anyone can read vsphere clips"
on public.vsphere_clips
for select
to anon, authenticated
using (true);

create policy "Anyone can read vsphere contents"
on public.vsphere_contents
for select
to anon, authenticated
using (true);

insert into public.vsphere_hero_slides (sort_order, title, text, signal)
values
  (1, '버튜버 콘텐츠가 모이는 VSPHERE', 'SOOP 버튜버의 진행 중인 콘텐츠, 예정 일정, 하이라이트 클립을 한곳에서 찾는 큐레이션 허브입니다.', '이번 주 합방/이벤트 집중 홍보'),
  (2, '클립을 빠르게 찾는 아카이브', '스트리머명, 태그, 카테고리 중심 검색으로 흩어진 클립을 간단하게 정리합니다.', '클립 저장소 베타 오픈'),
  (3, '1인 운영에 맞춘 관리자 콘솔', '공지, 신고, 배너, 콘텐츠 등록처럼 운영자가 매일 쓰는 기능부터 차근차근 제공합니다.', '운영자 Pick 슬라이드 관리')
on conflict (sort_order) do update
set title = excluded.title,
    text = excluded.text,
    signal = excluded.signal;

insert into public.vsphere_clips (id, streamer, title, category, tags, views)
values
  (1, '아리아', '노래방 중 갑자기 터진 고음 하이라이트', 'sing', array['노래', '하이라이트', '감동'], '12.4K'),
  (2, '리온', '채팅창까지 멈춘 반전 리액션', 'funny', array['웃긴장면', '리액션', '입문추천'], '8.8K'),
  (3, '미루', '8인 합방에서 나온 레전드 순간', 'collab', array['합방', '게임', '레전드'], '5.6K'),
  (4, '은하', '이번 주 버튜버 이슈 3분 요약', 'issue', array['이슈', '소식', '요약'], '4.1K'),
  (5, '유나', '처음 보는 게임에서 나온 천재 플레이', 'funny', array['게임', '웃긴장면', '센스'], '9.3K'),
  (6, '하린', '팬들이 다시 찾는 새벽 감성 토크', 'sing', array['토크', '노래', '추억'], '6.7K')
on conflict (id) do update
set streamer = excluded.streamer,
    title = excluded.title,
    category = excluded.category,
    tags = excluded.tags,
    views = excluded.views;

insert into public.vsphere_contents (id, day, time, title, description, status)
values
  (1, '오늘', '20:00', '여름맞이 버튜버 노래 릴레이', '참가 스트리머 12명, 운영자 Pick 메인 노출', '진행중'),
  (2, '금', '21:30', '공포게임 4인 합방', '예정 콘텐츠 게시판 등록, 클립 저장소 연동', '예정'),
  (3, '토', '18:00', '신규 버튜버 소개 방송', '입문자 추천 큐레이션 콘텐츠', '예정')
on conflict (id) do update
set day = excluded.day,
    time = excluded.time,
    title = excluded.title,
    description = excluded.description,
    status = excluded.status;
