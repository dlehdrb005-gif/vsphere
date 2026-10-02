// Comments are loaded only while a visitor post is expanded.
const commentSubscriptions = new Map();
function clearComments() {
  for (const stop of commentSubscriptions.values()) stop();
  commentSubscriptions.clear();
}
function attachComments(article, postId) {
  const section = document.createElement('section'); section.className = 'comments';
  const heading = document.createElement('h4'); heading.textContent = '댓글';
  const list = document.createElement('div');
  const feedback = document.createElement('p'); feedback.className = 'form-error'; feedback.setAttribute('role', 'status');
  const form = document.createElement('form'); form.className = 'comment-form';
  const label = document.createElement('label'); label.textContent = '댓글 남기기';
  const input = document.createElement('textarea'); input.maxLength = 1000; input.required = true; input.rows = 3;
  input.placeholder = '댓글을 입력하세요. (최대 1,000자)'; label.append(input);
  const submit = document.createElement('button'); submit.type = 'submit'; submit.className = 'accent-button'; submit.textContent = '댓글 등록';
  if (currentUser) form.append(label, submit);
  else { const login = document.createElement('button'); login.type = 'button'; login.className = 'outline-button'; login.textContent = '로그인하고 댓글 달기'; login.onclick = () => openAuth('login'); form.append(login); }
  section.append(heading, list, form, feedback); article.append(section);
  const ref = db.collection('messages').doc(postId).collection('comments');
  const errorText = error => error.code === 'permission-denied' ? '댓글 권한 규칙이 아직 적용되지 않았거나 게시글이 삭제되었습니다.' : friendlyError(error);
  function render(snapshot) {
    list.replaceChildren(); heading.textContent = `댓글 ${snapshot.size}${snapshot.size === 100 ? ' (최근 100개)' : ''}`;
    if (snapshot.empty) { setEmpty(list, '첫 댓글을 남겨주세요.'); return; }
    [...snapshot.docs].reverse().forEach(doc => {
      const data = doc.data(), item = document.createElement('div'); item.className = 'comment-item';
      const meta = document.createElement('div'); meta.className = 'entry-meta';
      const name = document.createElement('strong'); name.textContent = data.authorName;
      const date = document.createElement('time'); date.textContent = formatDate(data.createdAt); meta.append(name, date);
      const body = document.createElement('p'); body.textContent = data.body;
      item.append(meta, body);
      if (currentUser?.uid === data.authorUid) {
        const edit = document.createElement('button'); edit.type = 'button'; edit.textContent = '수정';
        edit.onclick = () => {
          const editor = document.createElement('form'); editor.className = 'comment-form';
          const field = document.createElement('textarea'); field.value = data.body; field.maxLength = 1000; field.required = true; field.setAttribute('aria-label', '댓글 수정');
          const save = document.createElement('button'); save.textContent = '저장'; save.type = 'submit';
          const cancel = document.createElement('button'); cancel.textContent = '취소'; cancel.type = 'button';
          cancel.onclick = () => { editor.remove(); body.hidden = false; edit.disabled = false; };
          editor.append(field, save, cancel); item.append(editor); body.hidden = true; edit.disabled = true; field.focus();
          editor.onsubmit = async event => { event.preventDefault(); const value = field.value.trim(); if (!value) return; save.disabled = true; feedback.textContent = ''; try { await doc.ref.update({body:value}); editor.remove(); body.textContent=value;body.hidden=false;edit.disabled=false; } catch(error) {feedback.textContent=errorText(error);} finally {save.disabled=false;} };
        }; item.append(edit);
      }
      if (currentUser?.uid === data.authorUid || isAdmin()) {
        const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '삭제';
        remove.onclick = async () => { if (!confirm('이 댓글을 삭제할까요?')) return; remove.disabled = true; feedback.textContent=''; try {await doc.ref.delete();} catch(error) {feedback.textContent=errorText(error);remove.disabled=false;} }; item.append(remove);
      }
      list.append(item);
    });
  }
  article.addEventListener('toggle', () => {
    if (!article.isConnected) return;
    if (article.open && !commentSubscriptions.has(postId)) {
      setEmpty(list, '댓글을 불러오는 중입니다.');
      commentSubscriptions.set(postId, ref.orderBy('createdAt','desc').limit(100).onSnapshot(render, error => setEmpty(list,errorText(error))));
    } else if (!article.open) { commentSubscriptions.get(postId)?.(); commentSubscriptions.delete(postId); }
  });
  form.onsubmit = async event => {
    event.preventDefault(); if (!currentUser) {openAuth('login');return;}
    const body = input.value.trim(); if (!body) {feedback.textContent='댓글 내용을 입력해주세요.';return;}
    submit.disabled=true;feedback.textContent='';
    try {await ref.add({body,authorUid:currentUser.uid,authorName:displayName(currentUser).slice(0,60),createdAt:firebase.firestore.FieldValue.serverTimestamp()});input.value='';}
    catch(error) {feedback.textContent=errorText(error);} finally {submit.disabled=false;}
  };
}
