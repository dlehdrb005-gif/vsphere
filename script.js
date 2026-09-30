const $ = (selector) => document.querySelector(selector);
const config = window.VSPHERE_FIREBASE_CONFIG;
const adminEmail = (window.VSPHERE_ADMIN_EMAILS || [])[0]?.toLowerCase();
let auth, db, storage, currentUser = null, mode = 'login', postType = 'messages', editingPost = null;
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
function displayName(user) { return (user?.uid === currentUser?.uid ? currentProfile?.nickname : null) || user?.displayName || user?.email?.split('@')[0] || '회원'; }
function refreshAccount() {
  setAvatar($('#accountPhoto'), currentProfile?.photoURL || currentUser?.photoURL);
  $('#accountPhoto').classList.toggle('hidden', !currentUser);
  for (const id of ['profileButton', 'sidebarProfile']) $('#' + id).classList.toggle('hidden', !currentUser);
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
  const expanded = new Set([...target.querySelectorAll('details[open]')].map(entry => entry.dataset.id));
  target.replaceChildren();
  if (snapshot.empty) { setEmpty(target, kind === 'notices' ? '아직 등록된 공지가 없습니다.' : '아직 남겨진 글이 없습니다. 첫 글을 남겨주세요.'); return; }
  snapshot.forEach(doc => {
    const data = doc.data();
    const article = document.createElement('details'); article.className = 'entry'; article.dataset.id = doc.id; article.open = expanded.has(doc.id);
    const summary = document.createElement('summary'); summary.className = 'entry-summary';
    const title = document.createElement('h3'); title.textContent = data.title;
    const body = document.createElement('p'); body.textContent = data.body;
    body.className = 'entry-body';
    const meta = document.createElement('div'); meta.className = 'entry-meta';
    const author = document.createElement('span'); author.className = 'entry-author';
    paintAuthor(author, profiles.get(data.authorUid), data.authorName, kind === 'notices');
    watchProfile(data.authorUid);
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

let currentProfile = null, selectedPhoto = null, deletePhoto = false, previewURL = null;
const profiles = new Map(), profileSubscriptions = new Map();
const placeholder = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect width="96" height="96" fill="#25344b"/><circle cx="48" cy="34" r="17" fill="#aeb8ca"/><path d="M16 96v-12a32 32 0 0 1 64 0v12" fill="#aeb8ca"/></svg>');
function safePhoto(url) { return typeof url === 'string' && /^https:\/\//.test(url) ? url : placeholder; }
function setAvatar(img, url) { img.src = safePhoto(url); img.onerror = () => { img.onerror = null; img.src = placeholder; }; }
function paintAuthor(node, profile, fallback, admin) {
  const img = document.createElement('img'); img.className = 'avatar'; img.alt = ''; setAvatar(img, profile?.photoURL);
  const name = document.createElement('span'); name.textContent = profile?.nickname || fallback || '회원';
  node.replaceChildren(img, name);
  if (admin) { const badge = document.createElement('span'); badge.className = 'admin-badge'; badge.textContent = '운영자'; node.append(badge); }
}
function rerenderBoards() {
  for (const kind of ['notices', 'messages']) if (snapshots[kind]) renderEntries(kind === 'notices' ? $('#noticeList') : $('#messageList'), snapshots[kind], kind);
}
function watchProfile(uid) {
  if (!uid || profileSubscriptions.has(uid)) return;
  profileSubscriptions.set(uid, null);
  const unsubscribe = db.collection('users').doc(uid).onSnapshot(doc => {
    profiles.set(uid, doc.exists ? doc.data() : null);
    if (currentUser?.uid === uid) { currentProfile = profiles.get(uid); refreshAccount(); }
    rerenderBoards();
  }, () => { /* Existing boards remain usable before profile rules are deployed. */ });
  profileSubscriptions.set(uid, unsubscribe);
}
function openProfile() {
  if (!currentUser) return;
  selectedPhoto = null; deletePhoto = false; $('#profileForm').reset();
  $('#profileNickname').value = displayName(currentUser);
  $('#profileError').textContent = ''; $('#profileStatus').textContent = '';
  setAvatar($('#profilePreview'), currentProfile?.photoURL || currentUser.photoURL);
  $('#profileDialog').showModal(); $('#profileNickname').focus();
}
$('#profileButton').addEventListener('click', openProfile);
$('#sidebarProfile').addEventListener('click', () => { setMenu(false); openProfile(); });
$('#profileDialog').addEventListener('close', () => { if (previewURL) URL.revokeObjectURL(previewURL); previewURL = null; });
$('#profileFile').addEventListener('change', () => {
  const file = $('#profileFile').files[0]; $('#profileError').textContent = '';
  selectedPhoto = null;
  if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
    $('#profileError').textContent = '5MB 이하의 JPG·PNG·WebP 사진을 선택해 주세요.'; $('#profileFile').value = ''; return;
  }
  selectedPhoto = file; deletePhoto = false;
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = URL.createObjectURL(file); $('#profilePreview').src = previewURL;
});
$('#removePhoto').addEventListener('click', () => { selectedPhoto = null; deletePhoto = true; $('#profileFile').value = ''; setAvatar($('#profilePreview'), null); });
async function resizePhoto(file) {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const side = Math.min(bitmap.width, bitmap.height);
    canvas.getContext('2d').drawImage(bitmap, (bitmap.width-side)/2, (bitmap.height-side)/2, side, side, 0, 0, 256, 256);
    return await new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('사진을 처리하지 못했습니다.')), 'image/jpeg', .85));
  } finally { bitmap.close(); }
}
$('#profileForm').addEventListener('submit', async event => {
  event.preventDefault(); if (!currentUser) return;
  const user = currentUser, name = $('#profileNickname').value.trim(), button = $('#profileSubmit');
  $('#profileError').textContent = ''; $('#profileStatus').textContent = '';
  if (name.length < 2 || name.length > 20 || /[\u0000-\u001f\u007f]/.test(name)) { $('#profileError').textContent = '닉네임은 2~20자로 입력해 주세요.'; return; }
  if (!isAdmin() && /^(관리자|운영자|vsphere)$/i.test(name)) { $('#profileError').textContent = '사용할 수 없는 닉네임입니다.'; return; }
  button.disabled = true;
  const controls = [...$('#profileForm').querySelectorAll('input, button')]; controls.forEach(control => control.disabled = true);
  let uploaded = null;
  try {
    let photoURL = deletePhoto ? '' : currentProfile?.photoURL || user.photoURL || '';
    if (selectedPhoto) {
      const blob = await resizePhoto(selectedPhoto);
      uploaded = storage.ref(`avatars/${user.uid}/${crypto.randomUUID()}.jpg`);
      await uploaded.put(blob, { contentType: 'image/jpeg' }); photoURL = await uploaded.getDownloadURL();
    }
    if (auth.currentUser?.uid !== user.uid) throw new Error('다시 로그인한 후 저장해 주세요.');
    const oldPath = currentProfile?.photoPath;
    const profile = { nickname: name, photoURL, photoPath: uploaded?.fullPath || (deletePhoto ? '' : oldPath || ''), updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
    await db.collection('users').doc(user.uid).set(profile);
    currentProfile = profile; profiles.set(user.uid, profile); refreshAccount(); rerenderBoards();
    // Firestore is authoritative; sync Auth for legacy screens without failing a saved profile.
    await user.updateProfile({ displayName: name, photoURL }).catch(() => {});
    if (oldPath && oldPath !== profile.photoPath && oldPath.startsWith(`avatars/${user.uid}/`)) storage.ref(oldPath).delete().catch(() => {});
    selectedPhoto = null; deletePhoto = false; $('#profileFile').value = ''; $('#profileStatus').textContent = '프로필을 저장했습니다.';
  } catch (error) {
    if (uploaded) uploaded.delete().catch(() => {});
    $('#profileError').textContent = ['permission-denied', 'storage/unauthorized', 'storage/unknown', 'storage/bucket-not-found'].includes(error.code) ? '프로필 저장 권한 또는 사진 저장소 설정이 필요합니다. 운영자에게 문의해 주세요.' : error.code ? friendlyError(error) : error.message;
  } finally { controls.forEach(control => control.disabled = false); }
});

if (ready) {
  firebase.initializeApp(config);
  auth = firebase.auth(); db = firebase.firestore(); storage = firebase.storage();
  auth.onAuthStateChanged(user => {
    currentUser = user; currentProfile = profiles.get(user?.uid) || null; refreshAccount();
    if (user) watchProfile(user.uid);
    for (const kind of ['notices', 'messages']) if (snapshots[kind]) renderEntries(kind === 'notices' ? $('#noticeList') : $('#messageList'), snapshots[kind], kind);
  });
  subscribe('notices'); subscribe('messages');
} else {
  setEmpty($('#noticeList'), '공지사항 설정이 아직 완료되지 않았습니다.');
  setEmpty($('#messageList'), '게시판 설정이 아직 완료되지 않았습니다.');
}
