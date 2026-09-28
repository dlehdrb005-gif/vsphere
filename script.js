const $ = (selector) => document.querySelector(selector);
const config = window.VSPHERE_FIREBASE_CONFIG;
const adminEmail = (window.VSPHERE_ADMIN_EMAILS || [])[0]?.toLowerCase();
let auth, db, currentUser = null, mode = 'login', postType = 'messages', editingPost = null;
const ready = Boolean(window.firebase?.auth && window.firebase?.firestore && config?.apiKey);

function setMenu(open) {
  $('#sidebar').classList.toggle('open', open);
  $('#sidebar').inert = !open;
  $('#sidebar').setAttribute('aria-hidden', String(!open));
  $('#sidebarBackdrop').hidden = !open;
  $('#menuButton').setAttribute('aria-expanded', String(open));
  $('#menuButton').setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  document.body.style.overflow = open ? 'hidden' : '';
  (open ? $('#closeSidebar') : $('#menuButton')).focus();
}
$('#menuButton').addEventListener('click', () => setMenu(!$('#sidebar').classList.contains('open')));
$('#closeSidebar').addEventListener('click', () => setMenu(false));
$('#sidebarBackdrop').addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && $('#sidebar').classList.contains('open')) setMenu(false); });

function isAdmin(user = currentUser) { return Boolean(user?.emailVerified && user.email?.toLowerCase() === adminEmail); }
function setEmpty(target, message) { target.replaceChildren(Object.assign(document.createElement('p'), { className: 'empty', textContent: message })); }
function friendlyError(error) {
  const messages = {
    'auth/email-already-in-use': '이미 가입된 이메일입니다. 로그인해 주세요.',
    'auth/invalid-email': '이메일 주소를 확인해 주세요.',
    'auth/weak-password': '비밀번호는 6자 이상 입력해 주세요.',
    'auth/invalid-credential': '이메일 또는 비밀번호를 확인해 주세요.',
    'auth/wrong-password': '이메일 또는 비밀번호를 확인해 주세요.',
    'auth/user-not-found': '가입된 계정을 찾을 수 없습니다.',
    'auth/operation-not-allowed': '이메일 회원가입이 아직 준비되지 않았습니다.',
    'auth/unauthorized-domain': '이 도메인에서 로그인이 허용되지 않았습니다.',
    'permission-denied': '게시판 권한 설정이 아직 완료되지 않았습니다.'
  };
  return messages[error?.code] || '처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
function displayName(user) { return user?.displayName || user?.email?.split('@')[0] || '회원'; }
function refreshAccount() {
  $('#userLabel').textContent = currentUser ? displayName(currentUser) : '비회원';
  $('#loginButton').classList.toggle('hidden', Boolean(currentUser));
  $('#signupButton').classList.toggle('hidden', Boolean(currentUser));
  $('#logoutButton').classList.toggle('hidden', !currentUser);
  $('#writeNotice').classList.toggle('hidden', !isAdmin());
}
function setAuthMode(next) {
  mode = next;
  $('#authForm').reset();
  $('#authError').textContent = '';
  $('#authTitle').textContent = next === 'signup' ? '회원가입' : '로그인';
  $('#authDescription').textContent = next === 'signup' ? '이메일, 비밀번호, 닉네임만 입력하면 됩니다.' : '계정으로 로그인하세요.';
  $('#nicknameField').classList.toggle('hidden', next !== 'signup');
  $('#nickname').required = next === 'signup';
  $('#password').autocomplete = next === 'signup' ? 'new-password' : 'current-password';
  $('#authSubmit').textContent = next === 'signup' ? '가입하기' : '로그인';
  $('#authSwitch').textContent = next === 'signup' ? '이미 계정이 있나요? 로그인' : '처음 오셨나요? 회원가입';
}
function openAuth(next) {
  setAuthMode(next);
  $('#authDialog').showModal();
  (next === 'signup' ? $('#nickname') : $('#email')).focus();
}
$('#loginButton').addEventListener('click', () => openAuth('login'));
$('#signupButton').addEventListener('click', () => openAuth('signup'));
$('#authSwitch').addEventListener('click', () => setAuthMode(mode === 'login' ? 'signup' : 'login'));
$('#logoutButton').addEventListener('click', async () => { if (auth) await auth.signOut(); });
document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
$('#authForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!auth) { $('#authError').textContent = '로그인 설정이 아직 준비되지 않았습니다.'; return; }
  const button = $('#authSubmit'); button.disabled = true; $('#authError').textContent = '';
  try {
    const email = $('#email').value.trim();
    const password = $('#password').value;
    if (mode === 'signup') {
      const name = $('#nickname').value.trim();
      if (!name) throw new Error('닉네임을 입력해 주세요.');
      const result = await auth.createUserWithEmailAndPassword(email, password);
      await result.user.updateProfile({ displayName: name });
      currentUser = auth.currentUser;
      refreshAccount();
    } else await auth.signInWithEmailAndPassword(email, password);
    $('#authDialog').close();
  } catch (error) { $('#authError').textContent = error.code ? friendlyError(error) : error.message; }
  finally { button.disabled = false; }
});
$('#googleLogin').addEventListener('click', async () => {
  if (!auth) { $('#authError').textContent = '로그인 설정이 아직 준비되지 않았습니다.'; return; }
  try { await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); $('#authDialog').close(); }
  catch (error) { $('#authError').textContent = friendlyError(error); }
});

function formatDate(value) {
  const date = value?.toDate?.();
  return date ? new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date) : '방금';
}
function renderEntries(target, snapshot, kind) {
  target.replaceChildren();
  if (snapshot.empty) { setEmpty(target, kind === 'notices' ? '아직 등록된 공지가 없습니다.' : '아직 남겨진 글이 없습니다. 첫 글을 남겨주세요.'); return; }
  snapshot.forEach(doc => {
    const data = doc.data();
    const article = document.createElement('details'); article.className = 'entry';
    const summary = document.createElement('summary'); summary.className = 'entry-summary';
    const title = document.createElement('h3'); title.textContent = data.title;
    const body = document.createElement('p'); body.textContent = data.body;
    body.className = 'entry-body';
    const meta = document.createElement('div'); meta.className = 'entry-meta';
    const author = document.createElement('span'); author.textContent = kind === 'notices' ? 'VSPHERE 운영자' : data.authorName;
    const date = document.createElement('time'); date.textContent = formatDate(data.createdAt);
    meta.append(author, date);
    summary.append(title, meta);
    article.append(summary, body);
    const ownsEntry = currentUser?.uid === data.authorUid;
    if (ownsEntry) {
      const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '수정';
      edit.addEventListener('click', () => openPost(kind, { id: doc.id, ...data }));
      article.append(edit);
    }
    if (ownsEntry || isAdmin()) {
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제';
      remove.addEventListener('click', async () => {
        if (!confirm('이 글을 삭제할까요?')) return;
        try { await db.collection(kind).doc(doc.id).delete(); } catch (error) { alert(friendlyError(error)); }
      });
      article.append(remove);
    }
    target.append(article);
  });
}
let snapshots = {};
function subscribe(kind) {
  const target = kind === 'notices' ? $('#noticeList') : $('#messageList');
  db.collection(kind).orderBy('createdAt', 'desc').limit(50).onSnapshot(
    snapshot => { snapshots[kind] = snapshot; renderEntries(target, snapshot, kind); },
    error => setEmpty(target, friendlyError(error))
  );
}
function openPost(kind, entry = null) {
  if (!currentUser) { openAuth('signup'); return; }
  if (entry && entry.authorUid !== currentUser.uid) return;
  if (kind === 'notices' && !isAdmin()) return;
  postType = kind; editingPost = entry;
  $('#postForm').reset(); $('#postError').textContent = '';
  $('#postTitle').textContent = entry ? (kind === 'notices' ? '공지 수정' : '글 수정') : (kind === 'notices' ? '공지 쓰기' : '글 남기기');
  $('#postSubmit').textContent = entry ? '수정 저장' : '등록하기';
  if (entry) { $('#entryTitle').value = entry.title; $('#entryBody').value = entry.body; }
  $('#postDialog').showModal(); $('#entryTitle').focus();
}
$('#writeNotice').addEventListener('click', () => openPost('notices'));
$('#writeMessage').addEventListener('click', () => openPost('messages'));
$('#postForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!db || !currentUser) { $('#postError').textContent = '게시판이 아직 준비되지 않았습니다.'; return; }
  const button = $('#postSubmit'); button.disabled = true; $('#postError').textContent = '';
  try {
    const title = $('#entryTitle').value.trim(), body = $('#entryBody').value.trim();
    if (!title || !body) throw new Error('제목과 내용을 입력해 주세요.');
    if (editingPost) {
      if (editingPost.authorUid !== currentUser.uid) throw new Error('본인이 쓴 글만 수정할 수 있습니다.');
      await db.collection(postType).doc(editingPost.id).update({ title, body });
    } else await db.collection(postType).add({
      title, body, authorUid: currentUser.uid, authorName: displayName(currentUser),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    $('#postDialog').close();
  } catch (error) { $('#postError').textContent = error.code ? friendlyError(error) : error.message; }
  finally { button.disabled = false; }
});

if (ready) {
  firebase.initializeApp(config);
  auth = firebase.auth(); db = firebase.firestore();
  auth.onAuthStateChanged(user => {
    currentUser = user; refreshAccount();
    for (const kind of ['notices', 'messages']) if (snapshots[kind]) renderEntries(kind === 'notices' ? $('#noticeList') : $('#messageList'), snapshots[kind], kind);
  });
  subscribe('notices'); subscribe('messages');
} else {
  setEmpty($('#noticeList'), '공지사항 설정이 아직 완료되지 않았습니다.');
  setEmpty($('#messageList'), '게시판 설정이 아직 완료되지 않았습니다.');
}
