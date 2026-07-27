const STORAGE_KEYS = {
  user: "vsphere:user",
  posts: "vsphere:posts",
};

const heroSlides = [
  {
    title: "버튜버 콘텐츠가 모이는 VSPHERE",
    text: "숲 버추얼 스트리머의 진행중 콘텐츠, 예정 일정, 하이라이트 클립을 한곳에서 찾는 큐레이션 허브.",
    signal: "이번 주 합방/이벤트 집중 홍보",
  },
  {
    title: "클립을 저장하고 빠르게 찾는 아카이브",
    text: "스트리머명, 태그, 카테고리 중심 검색으로 흩어진 클립을 단순하게 정리합니다.",
    signal: "클립 저장소 베타 오픈",
  },
  {
    title: "1인 운영에 맞춘 가벼운 관리자 콘솔",
    text: "공지, 신고, 배너, 콘텐츠 등록을 우선 배치해 운영자가 매일 쓰는 기능부터 챙깁니다.",
    signal: "운영자 Pick 슬라이드 관리",
  },
];

const clips = [];
const contents = [];

const heroTitle = document.querySelector("#heroTitle");
const heroText = document.querySelector("#heroText");
const heroSignal = document.querySelector("#heroSignal");
const heroTabs = document.querySelectorAll(".hero-tab");
const clipGrid = document.querySelector("#clipGrid");
const filterChips = document.querySelectorAll(".filter-chip");
const contentList = document.querySelector("#contentList");
const globalSearch = document.querySelector("#globalSearch");
const adminOnlyElements = document.querySelectorAll(".admin-only");
const userStatus = document.querySelector("#userStatus");
const loginButton = document.querySelector("#loginButton");
const signupButton = document.querySelector("#signupButton");
const logoutButton = document.querySelector("#logoutButton");
const writePostButton = document.querySelector("#writePostButton");
const boardRows = document.querySelector("#boardRows");
const authModal = document.querySelector("#authModal");
const authForm = document.querySelector("#authForm");
const authTitle = document.querySelector("#authTitle");
const authUsername = document.querySelector("#authUsername");
const authPassword = document.querySelector("#authPassword");
const authPhone = document.querySelector("#authPhone");
const authCode = document.querySelector("#authCode");
const authHelp = document.querySelector("#authHelp");
const phoneVerification = document.querySelector("#phoneVerification");
const sendCodeButton = document.querySelector("#sendCodeButton");
const verifyCodeButton = document.querySelector("#verifyCodeButton");
const verifyStatus = document.querySelector("#verifyStatus");
const googleLoginButton = document.querySelector("#googleLoginButton");
const postModal = document.querySelector("#postModal");
const postForm = document.querySelector("#postForm");
const postCategory = document.querySelector("#postCategory");
const postTitle = document.querySelector("#postTitle");
const postBody = document.querySelector("#postBody");

let authMode = "login";
let pendingPhoneCode = "";
let isPhoneVerified = false;

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCurrentUser() {
  return readStorage(STORAGE_KEYS.user, null);
}

function setCurrentUser(user) {
  if (user) {
    writeStorage(STORAGE_KEYS.user, user);
  } else {
    localStorage.removeItem(STORAGE_KEYS.user);
  }
  renderAuthState();
}

function getPosts() {
  return readStorage(STORAGE_KEYS.posts, []);
}

function setPosts(posts) {
  writeStorage(STORAGE_KEYS.posts, posts);
  renderPosts();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#039;",
    };
    return entities[char];
  });
}

function setHeroSlide(index) {
  const slide = heroSlides[index];
  heroTitle.textContent = slide.title;
  heroText.textContent = slide.text;
  heroSignal.textContent = slide.signal;
  heroTabs.forEach((tab) => tab.classList.toggle("active", Number(tab.dataset.slide) === index));
}

function renderAuthState() {
  const user = getCurrentUser();
  const isAdmin = user?.role === "admin";

  adminOnlyElements.forEach((element) => element.classList.toggle("is-hidden", !isAdmin));
  userStatus.textContent = user ? `${user.name} (${isAdmin ? "관리자" : "회원"})` : "비회원";
  loginButton.classList.toggle("is-hidden", Boolean(user));
  signupButton.classList.toggle("is-hidden", Boolean(user));
  logoutButton.classList.toggle("is-hidden", !user);

  if (!isAdmin && location.hash === "#admin") {
    location.hash = "#home";
  }
}

function openAuthModal(mode) {
  authMode = mode;
  pendingPhoneCode = "";
  isPhoneVerified = false;
  authTitle.textContent = mode === "signup" ? "회원가입" : "로그인";
  authHelp.textContent =
    mode === "signup"
      ? "휴대폰 인증 후 일반회원으로 가입됩니다. 이 시안에서는 인증번호가 화면에 표시됩니다."
      : "관리자 테스트 계정: admin / admin1234";
  phoneVerification.classList.toggle("is-hidden", mode !== "signup");
  verifyStatus.textContent = "휴대폰 인증이 필요합니다.";
  verifyStatus.className = "verify-status";
  authForm.reset();
  authModal.showModal();
  authUsername.focus();
}

function closeModal(modal) {
  modal.close();
}

function renderClips(filter = "all", keyword = "") {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const visibleClips = clips.filter((clip) => {
    const matchesFilter = filter === "all" || clip.category === filter;
    const searchable = `${clip.streamer} ${clip.title} ${clip.tags.join(" ")}`.toLowerCase();
    return matchesFilter && searchable.includes(normalizedKeyword);
  });

  clipGrid.innerHTML = visibleClips
    .map(
      (clip) => `
        <article class="clip-card">
          <div class="clip-thumb">
            <strong>${escapeHtml(clip.streamer)}</strong>
          </div>
          <div class="clip-card-body">
            <span>${escapeHtml(clip.views)} views</span>
            <h3>${escapeHtml(clip.title)}</h3>
            <div class="clip-meta">
              ${clip.tags.map((tag) => `<b>#${escapeHtml(tag)}</b>`).join("")}
            </div>
          </div>
        </article>
      `,
    )
    .join("");

  if (!visibleClips.length) {
    clipGrid.innerHTML = `<article class="clip-card empty-card"><div class="clip-card-body"><span>CLIP ARCHIVE</span><h3>아직 등록된 클립이 없습니다.</h3><p>운영자 또는 회원이 클립을 등록하면 이곳에 표시됩니다.</p></div></article>`;
  }
}

function renderContents() {
  if (!contents.length) {
    contentList.innerHTML = `
      <article class="content-item empty-content">
        <div>
          <span>CONTENT PROMO</span>
          <h3>아직 등록된 콘텐츠 일정이 없습니다.</h3>
          <p>진행중 또는 예정 콘텐츠가 등록되면 이곳에 표시됩니다.</p>
        </div>
      </article>
    `;
    return;
  }

  contentList.innerHTML = contents
    .map(
      (content) => `
        <article class="content-item">
          <div class="content-date">
            <span>${escapeHtml(content.day)}</span>
            <strong>${escapeHtml(content.time)}</strong>
          </div>
          <div>
            <span>CONTENT PROMO</span>
            <h3>${escapeHtml(content.title)}</h3>
            <p>${escapeHtml(content.desc)}</p>
          </div>
          <div class="status ${content.statusClass}">${escapeHtml(content.status)}</div>
        </article>
      `,
    )
    .join("");
}

function renderPosts() {
  const posts = getPosts();

  if (!posts.length) {
    boardRows.innerHTML = `
      <div class="board-row empty-row" role="row">
        <span>대기</span>
        <strong>아직 등록된 게시글이 없습니다.</strong>
        <span>-</span>
        <span>0</span>
        <span>0</span>
      </div>
    `;
    return;
  }

  boardRows.innerHTML = posts
    .map(
      (post) => `
        <article class="board-row" role="row">
          <span>${escapeHtml(post.category)}</span>
          <strong>
            ${escapeHtml(post.title)}
            <small>${escapeHtml(post.body)}</small>
          </strong>
          <span>${escapeHtml(post.author)}</span>
          <span>${post.likes}</span>
          <span>${post.views}</span>
        </article>
      `,
    )
    .join("");
}

function createPost() {
  const user = getCurrentUser();

  if (!user) {
    openAuthModal("login");
    return;
  }

  postForm.reset();
  postModal.showModal();
  postTitle.focus();
}

heroTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setHeroSlide(Number(tab.dataset.slide));
  });
});

filterChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    filterChips.forEach((item) => item.classList.remove("active"));
    chip.classList.add("active");
    renderClips(chip.dataset.filter, globalSearch.value);
  });
});

globalSearch.addEventListener("input", () => {
  const activeFilter = document.querySelector(".filter-chip.active")?.dataset.filter ?? "all";
  renderClips(activeFilter, globalSearch.value);
});

loginButton.addEventListener("click", () => openAuthModal("login"));
signupButton.addEventListener("click", () => openAuthModal("signup"));
logoutButton.addEventListener("click", () => setCurrentUser(null));
writePostButton.addEventListener("click", createPost);

sendCodeButton.addEventListener("click", () => {
  const phone = authPhone.value.trim();

  if (!/^01[016789]\d{7,8}$/.test(phone)) {
    verifyStatus.textContent = "휴대폰 번호를 숫자만 입력해주세요. 예: 01012345678";
    verifyStatus.className = "verify-status error";
    return;
  }

  pendingPhoneCode = String(Math.floor(100000 + Math.random() * 900000));
  isPhoneVerified = false;
  verifyStatus.textContent = `인증번호가 발급되었습니다. 테스트 인증번호: ${pendingPhoneCode}`;
  verifyStatus.className = "verify-status pending";
  authCode.focus();
});

verifyCodeButton.addEventListener("click", () => {
  if (!pendingPhoneCode) {
    verifyStatus.textContent = "먼저 인증번호를 받아주세요.";
    verifyStatus.className = "verify-status error";
    return;
  }

  if (authCode.value.trim() !== pendingPhoneCode) {
    verifyStatus.textContent = "인증번호가 일치하지 않습니다.";
    verifyStatus.className = "verify-status error";
    return;
  }

  isPhoneVerified = true;
  verifyStatus.textContent = "휴대폰 인증이 완료되었습니다.";
  verifyStatus.className = "verify-status success";
});

googleLoginButton.addEventListener("click", () => {
  setCurrentUser({
    name: "google_user",
    role: "member",
    provider: "google",
  });
  closeModal(authModal);
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const modal = button.closest("dialog");
    closeModal(modal);
  });
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = authUsername.value.trim();
  const password = authPassword.value.trim();

  if (!name || !password) {
    return;
  }

  if (authMode === "signup" && !isPhoneVerified) {
    verifyStatus.textContent = "회원가입을 완료하려면 휴대폰 인증을 먼저 해주세요.";
    verifyStatus.className = "verify-status error";
    return;
  }

  const isAdminLogin = authMode === "login" && name === "admin" && password === "admin1234";
  const user = {
    name,
    role: isAdminLogin ? "admin" : "member",
    phone: authMode === "signup" ? authPhone.value.trim() : "",
    provider: "password",
  };

  setCurrentUser(user);
  closeModal(authModal);
});

postForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const user = getCurrentUser();
  if (!user) {
    closeModal(postModal);
    openAuthModal("login");
    return;
  }

  const post = {
    id: crypto.randomUUID(),
    category: postCategory.value,
    title: postTitle.value.trim(),
    body: postBody.value.trim(),
    author: user.name,
    likes: 0,
    views: 0,
    createdAt: new Date().toISOString(),
  };

  setPosts([post, ...getPosts()]);
  closeModal(postModal);
});

let activeSlide = 0;
setInterval(() => {
  activeSlide = (activeSlide + 1) % heroSlides.length;
  setHeroSlide(activeSlide);
}, 6200);

renderAuthState();
renderClips();
renderContents();
renderPosts();
