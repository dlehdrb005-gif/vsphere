"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Clip, ContentSchedule } from "@/lib/data";

type HeroSlide = {
  title: string;
  text: string;
  signal: string;
};

type HomeExperienceProps = {
  clips: Clip[];
  contents: ContentSchedule[];
  heroSlides: HeroSlide[];
};

const filters = [
  { label: "전체", value: "all" },
  { label: "웃긴장면", value: "funny" },
  { label: "노래", value: "sing" },
  { label: "합방", value: "collab" },
  { label: "이슈", value: "issue" },
] as const;

export function HomeExperience({ clips, contents, heroSlides }: HomeExperienceProps) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [activeFilter, setActiveFilter] = useState<(typeof filters)[number]["value"]>("all");
  const [keyword, setKeyword] = useState("");
  const slide = heroSlides[activeSlide];

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroSlides.length);
    }, 6200);

    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const visibleClips = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return clips.filter((clip) => {
      const matchesFilter = activeFilter === "all" || clip.category === activeFilter;
      const searchable = `${clip.streamer} ${clip.title} ${clip.tags.join(" ")}`.toLowerCase();

      return matchesFilter && searchable.includes(normalizedKeyword);
    });
  }, [activeFilter, clips, keyword]);

  return (
    <>
      <header className="site-header">
        <Link className="brand" href="#home" aria-label="VSPHERE 홈">
          <Image src="/assets/vsphere-logo-reference.png" alt="" width={46} height={46} priority />
          <span>
            <strong>VSPHERE</strong>
            <small>SOOP VTUBER SUPPORT PROJECT</small>
          </span>
        </Link>
        <nav className="top-nav" aria-label="주요 메뉴">
          <a href="#clips">클립</a>
          <a href="#contents">콘텐츠</a>
          <a href="#boards">게시판</a>
          <a href="#notice">공지</a>
        </nav>
        <div className="header-actions">
          <label className="search-box">
            <span>검색</span>
            <input
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              type="search"
              placeholder="스트리머, 클립, 태그 검색"
            />
          </label>
          <button className="ghost-button" type="button">
            로그인
          </button>
          <button className="primary-button" type="button">
            회원가입
          </button>
        </div>
      </header>

      <main id="home">
        <section className="hero" aria-label="운영자 Pick 히어로">
          <div className="hero-copy">
            <p className="eyebrow">OPERATOR PICK</p>
            <h1>{slide.title}</h1>
            <p>{slide.text}</p>
            <div className="hero-actions">
              <a className="primary-button" href="#clips">
                클립 보러가기
              </a>
              <a className="ghost-button" href="#contents">
                예정 콘텐츠
              </a>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orb">
              <Image src="/assets/vsphere-logo-reference.png" alt="" width={320} height={320} priority />
            </div>
            <div className="signal-card">
              <span>LIVE SIGNAL</span>
              <strong>{slide.signal}</strong>
            </div>
          </div>
          <div className="hero-tabs" role="tablist" aria-label="히어로 슬라이드">
            {heroSlides.map((item, index) => (
              <button
                aria-selected={activeSlide === index}
                className={`hero-tab ${activeSlide === index ? "active" : ""}`}
                key={item.title}
                onClick={() => setActiveSlide(index)}
                role="tab"
                type="button"
              >
                Pick {String(index + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        </section>

        <section className="quick-stats" aria-label="사이트 현황">
          <article>
            <span>저장된 클립</span>
            <strong>1,284</strong>
          </article>
          <article>
            <span>예정 콘텐츠</span>
            <strong>36</strong>
          </article>
          <article>
            <span>인증 스트리머</span>
            <strong>42</strong>
          </article>
          <article>
            <span>운영자 Pick</span>
            <strong>12</strong>
          </article>
        </section>

        <section id="clips" className="section-grid">
          <div className="section-heading">
            <p className="eyebrow">CLIP ARCHIVE</p>
            <h2>클립 저장소</h2>
            <p>버튜버 생태계의 클립을 스트리머명, 태그, 카테고리로 간단하게 찾습니다.</p>
          </div>
          <div className="filter-bar" aria-label="클립 필터">
            {filters.map((filter) => (
              <button
                className={`filter-chip ${activeFilter === filter.value ? "active" : ""}`}
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>
          <div className="clip-grid">
            {visibleClips.map((clip) => (
              <article className="clip-card" key={clip.id}>
                <div className="clip-thumb">
                  <strong>{clip.streamer}</strong>
                </div>
                <div className="clip-card-body">
                  <span>{clip.views} views</span>
                  <h3>{clip.title}</h3>
                  <div className="clip-meta">
                    {clip.tags.map((tag) => (
                      <b key={tag}>#{tag}</b>
                    ))}
                  </div>
                </div>
              </article>
            ))}
            {!visibleClips.length && (
              <article className="clip-card">
                <div className="clip-card-body">
                  <h3>검색 결과가 없습니다.</h3>
                  <p>다른 스트리머명이나 태그로 검색해보세요.</p>
                </div>
              </article>
            )}
          </div>
        </section>

        <section id="contents" className="two-column">
          <div>
            <div className="section-heading compact">
              <p className="eyebrow">CONTENTS</p>
              <h2>진행중/예정 콘텐츠</h2>
            </div>
            <div className="content-list">
              {contents.map((content) => (
                <article className="content-item" key={content.id}>
                  <div className="content-date">
                    <span>{content.day}</span>
                    <strong>{content.time}</strong>
                  </div>
                  <div>
                    <span>CONTENT PROMO</span>
                    <h3>{content.title}</h3>
                    <p>{content.desc}</p>
                  </div>
                  <div className={`status ${content.status === "진행중" ? "live" : "scheduled"}`}>
                    {content.status}
                  </div>
                </article>
              ))}
            </div>
          </div>
          <aside className="notice-panel" id="notice">
            <div className="section-heading compact">
              <p className="eyebrow">NOTICE</p>
              <h2>공지사항</h2>
            </div>
            <article className="notice important">
              <span>중요</span>
              <strong>클립 업로드 가이드 개정 안내</strong>
              <p>영상 출처, 스트리머명, 태그를 필수로 입력하도록 운영 기준을 정리합니다.</p>
            </article>
            <article className="notice pinned">
              <span>고정</span>
              <strong>VSPHERE 베타 운영 정책</strong>
              <p>신고 접수 게시글은 관리자 확인 전까지 임시 숨김 처리됩니다.</p>
            </article>
          </aside>
        </section>

        <section id="boards" className="board-section">
          <div className="section-heading">
            <p className="eyebrow">COMMUNITY</p>
            <h2>게시판</h2>
            <p>자유게시판, 클립, 콘텐츠 홍보, 공지를 중심으로 구성합니다.</p>
          </div>
          <div className="board-toolbar">
            <button className="primary-button" type="button">
              글쓰기
            </button>
            <button className="ghost-button" type="button">
              이미지 업로드
            </button>
            <button className="ghost-button" type="button">
              신고 내역
            </button>
          </div>
          <div className="board-table" role="table" aria-label="최신 게시글">
            <div className="board-row board-head" role="row">
              <span>분류</span>
              <span>제목</span>
              <span>작성자</span>
              <span>추천</span>
              <span>조회</span>
            </div>
            <div className="board-row" role="row">
              <span>클립</span>
              <strong>새벽 텐션 터졌던 리액션 모음</strong>
              <span>유저A</span>
              <span>128</span>
              <span>3,421</span>
            </div>
            <div className="board-row" role="row">
              <span>콘텐츠</span>
              <strong>금요일 8시 합방 예정 일정 공유</strong>
              <span>관리자</span>
              <span>74</span>
              <span>1,602</span>
            </div>
            <div className="board-row" role="row">
              <span>자유</span>
              <strong>이번 주 입문자에게 추천할 방송 리스트</strong>
              <span>유저B</span>
              <span>39</span>
              <span>940</span>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <strong>VSPHERE</strong>
        <span>A world for VTubers. Built for archive, discovery, and support.</span>
      </footer>
    </>
  );
}
