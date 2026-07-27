const STORAGE_KEYS = {
  user: "vsphere:user",
  posts: "vsphere:posts",
};

const heroSlides = [
  {
    title: "버튜버 콘텐츠가 모이는 VSPHERE",
    text: "SOOP 버추얼 스트리머의 진행중 콘텐츠, 예정 일정, 하이라이트 클립을 한곳에서 찾는 큐레이션 허브.",
    signal: "이번 주 합방/이벤트 집중 홍보",
  },
  {
    title: "클립을 저장하고 빠르게 찾는 아카이브",
    text: "스트리머명, 태그, 카테고리 중심 검색으로 흩어진 클립을 단순하게 정리합니다.",
    signal: "클립 저장소 준비중",
  },
  {
    title: "1인 운영에 맞춘 가벼운 관리자 콘솔",
    text: "공지, 신고, 배너, 콘텐츠 등록처럼 운영자가 매일 쓰는 기능부터 차근차근 배치합니다.",
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

const recaptchaContainer = document.createElement("div");
recaptchaContainer.id = "recaptchaContainer";
verifyStatus.before(recaptchaContainer);

const firebaseConfig = window.VSPHERE_FIREBASE_CONFIG ?? {};
const adminEmails = (window.VSPHERE_ADMIN_EMAILS ?? []).map((email) => email.toLowerCase());
const firebaseConfigured = Boolean(
  window.firebase &&
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.startsWith("PASTE_") &&
    firebaseConfig.authDomain &&
    !firebaseConfig.authDomain.startsWith("PASTE_"),
);

let authMode = "login";
let auth = null;
let googleProvider = null;
let recaptchaVerifier = null;
let confirmationResult = null;

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
  return String(value).replace(/[&<>"']/g, (char) => {
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

function showAuthMessage(message, type = "") {
  authHelp.textContent = message;
  authHelp.className = `form-help ${type}`.trim();
}

function showPhoneMessage(message, type = "") {
  verifyStatus.textContent = message;
  verifyStatus.className = `verify-status ${type}`.trim();
}

function getRole(email) {
  return email && adminEmails.includes(email.toLowerCase()) ? "admin" : "member";
}

function toUser(firebaseUser) {
  const email = firebaseUser.email ?? "";
  const name = firebaseUser.displayName || email || firebaseUser.phoneNumber || "회원";

  return {
    uid: firebaseUser.uid,
    name,
    email,
    phone: firebaseUser.phoneNumber ?? "",
    provider: firebaseUser.providerData?.[0]?.providerId ?? "firebase",
    role: getRole(email),
  };
}

function initFirebaseAuth() {
  if (!firebaseConfigured) {
    localStorage.removeItem(STORAGE_KEYS.user);
    renderAuthState();
    return;
  }

  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  googleProvider = new firebase.auth.GoogleAuthProvider();
  auth.onAuthStateChanged((firebaseUser) => {
    setCurrentUser(firebaseUser ? toUser(firebaseUser) : null);
  });
}

function requireFirebaseAuth() {
  if (firebaseConfigured && auth) {
    return true;
  }

  showAuthMessage("Firebase 설정값이 아직 없습니다. firebase-config.js에 실제 프로젝트 설정을 넣어야 로그인과 휴대폰 인증이 작동합니다.", "error");
  showPhoneMessage("Firebase 설정 후 실제 SMS 인증을 사용할 수 있습니다.", "error");
  return false;
}

function formatKoreanPhoneNumber(rawPhone) {
  const digits = rawPhone.replace(/\D/g, "");
  if (!/^01[016789]\d{7,8}$/.test(digits)) {
    return "";
  }
  return `+82${digits.slice(1)}`;
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
  confirmationResult = null;
  authTitle.textContent = mode === "signup" ? "회원가입" : "로그인";
  phoneVerification.classList.toggle("is-hidden", mode !== "signup");
  authUsername.required = mode === "login";
  authPassword.required = mode === "login";
  authForm.reset();

  if (mode === "signup") {
    showAuthMessage("구글 계정으로 가입하거나, 휴대폰 번호로 SMS 인증을 완료하세요.");
    showPhoneMessage("휴대폰 번호를 입력하면 실제 인증 문자가 발송됩니다.");
  } else {
    showAuthMessage("구글 로그인 또는 Firebase 이메일/비밀번호 로그인을 사용할 수 있습니다.");
    showPhoneMessage("");
  }

  if (!firebaseConfigured) {
    showAuthMessage("Firebase 설정값이 아직 없습니다. firebase-config.js 설정 후 실제 인증이 켜집니다.", "error");
  }

  authModal.showModal();
  if (mode === "signup") {
    authPhone.focus();
  } else {
    authUsername.focus();
  }
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

function ensureRecaptchaVerifier() {
  if (recaptchaVerifier) {
    return recaptchaVerifier;
  }

  recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptchaContainer", {
    size: "normal",
    callback: () => {
      showPhoneMessage("reCAPTCHA 확인 완료. 인증번호를 받을 수 있습니다.", "success");
    },
    "expired-callback": () => {
      showPhoneMessage("reCAPTCHA가 만료되었습니다. 다시 확인해 주세요.", "error");
      recaptchaVerifier = null;
      recaptchaContainer.innerHTML = "";
    },
  });

  return recaptchaVerifier;
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
logoutButton.addEventListener("click", async () => {
  if (auth?.currentUser) {
    await auth.signOut();
    return;
  }
  setCurrentUser(null);
});
writePostButton.addEventListener("click", createPost);

sendCodeButton.addEventListener("click", async () => {
  if (!requireFirebaseAuth()) {
    return;
  }

  const phoneNumber = formatKoreanPhoneNumber(authPhone.value);
  if (!phoneNumber) {
    showPhoneMessage("휴대폰 번호를 숫자로 입력해 주세요. 예: 01012345678", "error");
    return;
  }

  sendCodeButton.disabled = true;
  showPhoneMessage("인증 문자를 발송하는 중입니다. reCAPTCHA 확인이 필요할 수 있습니다.", "pending");

  try {
    confirmationResult = await auth.signInWithPhoneNumber(phoneNumber, ensureRecaptchaVerifier());
    showPhoneMessage("문자로 받은 6자리 인증번호를 입력하고 확인을 눌러 주세요.", "success");
    authCode.focus();
  } catch (error) {
    showPhoneMessage(`SMS 인증 요청 실패: ${error.message}`, "error");
    if (recaptchaVerifier) {
      recaptchaVerifier.clear();
      recaptchaVerifier = null;
      recaptchaContainer.innerHTML = "";
    }
  } finally {
    sendCodeButton.disabled = false;
  }
});

verifyCodeButton.addEventListener("click", async () => {
  if (!requireFirebaseAuth()) {
    return;
  }

  if (!confirmationResult) {
    showPhoneMessage("먼저 인증번호 받기를 눌러 주세요.", "error");
    return;
  }

  const code = authCode.value.trim();
  if (!/^\d{6}$/.test(code)) {
    showPhoneMessage("문자로 받은 6자리 숫자를 입력해 주세요.", "error");
    return;
  }

  verifyCodeButton.disabled = true;
  try {
    const result = await confirmationResult.confirm(code);
    setCurrentUser(toUser(result.user));
    showPhoneMessage("휴대폰 인증과 회원가입이 완료되었습니다.", "success");
    closeModal(authModal);
  } catch (error) {
    showPhoneMessage(`인증번호 확인 실패: ${error.message}`, "error");
  } finally {
    verifyCodeButton.disabled = false;
  }
});

googleLoginButton.addEventListener("click", async () => {
  if (!requireFirebaseAuth()) {
    return;
  }

  googleLoginButton.disabled = true;
  showAuthMessage("Google 로그인 창을 여는 중입니다.");

  try {
    const result = await auth.signInWithPopup(googleProvider);
    setCurrentUser(toUser(result.user));
    closeModal(authModal);
  } catch (error) {
    showAuthMessage(`Google 로그인 실패: ${error.message}`, "error");
  } finally {
    googleLoginButton.disabled = false;
  }
});

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => {
    const modal = button.closest("dialog");
    closeModal(modal);
  });
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!requireFirebaseAuth()) {
    return;
  }

  if (authMode === "signup") {
    showPhoneMessage("휴대폰 가입은 인증번호 받기와 확인 버튼으로 완료됩니다.", "pending");
    return;
  }

  const email = authUsername.value.trim();
  const password = authPassword.value.trim();

  if (!email || !password) {
    showAuthMessage("이메일과 비밀번호를 입력해 주세요.", "error");
    return;
  }

  try {
    const result = await auth.signInWithEmailAndPassword(email, password);
    setCurrentUser(toUser(result.user));
    closeModal(authModal);
  } catch (error) {
    showAuthMessage(`로그인 실패: ${error.message}`, "error");
  }
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

initFirebaseAuth();
renderAuthState();
renderClips();
renderContents();
renderPosts();
