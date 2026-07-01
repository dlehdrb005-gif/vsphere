export type ClipCategory = "funny" | "sing" | "collab" | "issue";

export type Clip = {
  id: number;
  streamer: string;
  title: string;
  category: ClipCategory;
  tags: string[];
  views: string;
};

export type ContentSchedule = {
  id: number;
  day: string;
  time: string;
  title: string;
  desc: string;
  status: "진행중" | "예정";
};

export const heroSlides = [
  {
    title: "버튜버 콘텐츠가 모이는 VSPHERE",
    text: "SOOP 버튜버의 진행 중인 콘텐츠, 예정 일정, 하이라이트 클립을 한곳에서 찾는 큐레이션 허브입니다.",
    signal: "이번 주 합방/이벤트 집중 홍보",
  },
  {
    title: "클립을 빠르게 찾는 아카이브",
    text: "스트리머명, 태그, 카테고리 중심 검색으로 흩어진 클립을 간단하게 정리합니다.",
    signal: "클립 저장소 베타 오픈",
  },
  {
    title: "1인 운영에 맞춘 관리자 콘솔",
    text: "공지, 신고, 배너, 콘텐츠 등록처럼 운영자가 매일 쓰는 기능부터 차근차근 제공합니다.",
    signal: "운영자 Pick 슬라이드 관리",
  },
];

export const clips: Clip[] = [
  {
    id: 1,
    streamer: "아리아",
    title: "노래방 중 갑자기 터진 고음 하이라이트",
    category: "sing",
    tags: ["노래", "하이라이트", "감동"],
    views: "12.4K",
  },
  {
    id: 2,
    streamer: "리온",
    title: "채팅창까지 멈춘 반전 리액션",
    category: "funny",
    tags: ["웃긴장면", "리액션", "입문추천"],
    views: "8.8K",
  },
  {
    id: 3,
    streamer: "미루",
    title: "8인 합방에서 나온 레전드 순간",
    category: "collab",
    tags: ["합방", "게임", "레전드"],
    views: "5.6K",
  },
  {
    id: 4,
    streamer: "은하",
    title: "이번 주 버튜버 이슈 3분 요약",
    category: "issue",
    tags: ["이슈", "소식", "요약"],
    views: "4.1K",
  },
  {
    id: 5,
    streamer: "유나",
    title: "처음 보는 게임에서 나온 천재 플레이",
    category: "funny",
    tags: ["게임", "웃긴장면", "센스"],
    views: "9.3K",
  },
  {
    id: 6,
    streamer: "하린",
    title: "팬들이 다시 찾는 새벽 감성 토크",
    category: "sing",
    tags: ["토크", "노래", "추억"],
    views: "6.7K",
  },
];

export const contents: ContentSchedule[] = [
  {
    id: 1,
    day: "오늘",
    time: "20:00",
    title: "여름맞이 버튜버 노래 릴레이",
    desc: "참가 스트리머 12명, 운영자 Pick 메인 노출",
    status: "진행중",
  },
  {
    id: 2,
    day: "금",
    time: "21:30",
    title: "공포게임 4인 합방",
    desc: "예정 콘텐츠 게시판 등록, 클립 저장소 연동",
    status: "예정",
  },
  {
    id: 3,
    day: "토",
    time: "18:00",
    title: "신규 버튜버 소개 방송",
    desc: "입문자 추천 큐레이션 콘텐츠",
    status: "예정",
  },
];
