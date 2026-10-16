/* Structured rich text: stored data is never assigned to innerHTML. */
window.BoardEditor = (() => {
  'use strict';
  const PREFIX = 'VSPHERE-RICH-1\n', MAX_TEXT = 50000, MAX_BODY = 200000, MAX_MEDIA = 20;
  const tags = new Set(['p', 'div', 'br', 'b', 'strong', 'i', 'em', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'blockquote', 'a']);
  const editor = document.querySelector('#entryBody'), dialog = document.querySelector('#postDialog');
  const preview = document.querySelector('#editorPreviewBody');
  const status = document.querySelector('#editorStatus'), error = document.querySelector('#postError');
  let locked = false, uploading = false, range = null, initial = '', initialTitle = '', pending = [], isPreview = false;
  function safeLink(value) {
    try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; }
  }
  function storageURL(value) {
    try {
      const u = new URL(value), bucket = window.VSPHERE_FIREBASE_CONFIG?.storageBucket;
      if (u.protocol !== 'https:' || u.hostname !== 'firebasestorage.googleapis.com' || u.port || u.username || u.password) return '';
      const prefix = '/v0/b/' + bucket + '/o/';
      return u.pathname.startsWith(prefix) && /^boardMedia\/[^/]+\/[^/]+$/.test(decodeURIComponent(u.pathname.slice(prefix.length))) && u.searchParams.get('alt') === 'media' ? u.href : '';
    } catch { return ''; }
  }
  function youtubeID(value) {
    try {
      const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password) return '';
      let id = '';
      if (u.hostname === 'youtu.be') id = u.pathname.slice(1);
      if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(u.hostname)) {
        id = u.pathname === '/watch' ? u.searchParams.get('v') : u.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)\/?$/)?.[1];
      }
      return /^[\w-]{11}$/.test(id || '') ? id : '';
    } catch { return ''; }
  }
  function textNode(value) { return document.createTextNode(value); }
  function mediaNode(item, editing) {
    const figure = document.createElement('figure'); figure.dataset.kind = item.kind; figure.dataset.src = item.src;
    if (editing) figure.contentEditable = 'false';
    if (item.kind === 'youtube') {
      if (!/^[\w-]{11}$/.test(item.src)) return textNode('[잘못된 영상 주소]');
      const play = document.createElement('button'); play.type = 'button'; play.className = 'youtube-play'; play.textContent = '▶ 유튜브 영상 재생';
      play.addEventListener('click', () => {
        const frame = document.createElement('iframe'); frame.title = '유튜브 영상';
        frame.src = 'https://www.youtube-nocookie.com/embed/' + item.src;
        frame.allow = 'encrypted-media; picture-in-picture; fullscreen'; frame.allowFullscreen = true;
        frame.referrerPolicy = 'strict-origin-when-cross-origin'; play.replaceWith(frame);
      });
      figure.append(play);
    } else {
      const src = storageURL(item.src); if (!src || !['image', 'video'].includes(item.kind)) return textNode('[사용할 수 없는 첨부]');
      const media = document.createElement(item.kind === 'image' ? 'img' : 'video'); media.src = src;
      if (item.kind === 'image') { media.alt = String(item.name || '첨부 이미지').slice(0, 200); media.loading = 'lazy'; }
      else { media.controls = true; media.preload = 'none'; media.playsInline = true; }
      figure.append(media);
      const link = document.createElement('a'); link.href = src; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = item.kind === 'video' ? '영상 원본 열기' : '이미지 원본 열기';
      figure.append(link);
    }
    figure.dataset.name = String(item.name || '').slice(0, 200);
    if (editing) {
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove-media'; remove.textContent = '첨부 제거';
      remove.addEventListener('click', () => { if (!locked && !uploading) { figure.remove(); changed(); } }); figure.append(remove);
    }
    return figure;
  }
  function build(nodes, editing, depth = 0, budget = { left: 10000 }) {
    const fragment = document.createDocumentFragment();
    if (!Array.isArray(nodes) || depth > 30) return fragment;
    for (const item of nodes) {
      if (--budget.left < 0) break;
      if (typeof item === 'string') { fragment.append(textNode(item)); continue; }
      if (!item || typeof item !== 'object') continue;
      if (item.kind) { fragment.append(mediaNode(item, editing)); continue; }
      if (!tags.has(item.tag)) continue;
      const el = document.createElement(item.tag);
      if (item.tag === 'a') { const href = safeLink(item.href); if (href) { el.href = href; el.target = '_blank'; el.rel = 'noopener noreferrer'; } }
      el.append(build(item.children, editing, depth + 1, budget)); fragment.append(el);
    }
    return fragment;
  }
  function render(target, body, editing = false) {
    target.replaceChildren();
    const value = typeof body === 'string' ? body : '';
    if (value.startsWith(PREFIX) && value.length <= MAX_BODY) {
      try {
        const nodes = JSON.parse(value.slice(PREFIX.length));
        if (Array.isArray(nodes)) { target.append(build(nodes, editing)); return; }
      } catch { /* Legacy or malformed content is displayed as literal text. */ }
    }
    target.textContent = value;
  }
  function collect(parent, depth = 0) {
    if (depth > 30) throw new Error('본문 서식이 너무 복잡합니다. 일부를 일반 텍스트로 다시 붙여넣어 주세요.');
    const result = [];
    for (const node of parent.childNodes) {
      if (node.nodeType === 3) { result.push(node.textContent); continue; }
      if (node.nodeType !== 1) continue;
      if (node.tagName === 'FIGURE' && node.dataset.kind) {
        const kind = node.dataset.kind, src = node.dataset.src;
        if (kind === 'youtube' ? /^[\w-]{11}$/.test(src) : ['image', 'video'].includes(kind) && storageURL(src)) result.push({kind, src, name: node.dataset.name || ''});
        continue;
      }
      const tag = node.tagName.toLowerCase();
      if (['script', 'style', 'iframe', 'object', 'svg', 'math'].includes(tag)) continue;
      const children = collect(node, depth + 1);
      if (tags.has(tag)) result.push({ tag, ...(tag === 'a' ? {href: safeLink(node.getAttribute('href'))} : {}), children });
      else result.push(...children);
    }
    return result;
  }
  function plainLength(nodes) {
    return nodes.reduce((sum, node) => sum + (typeof node === 'string' ? node.length : plainLength(node.children || [])), 0);
  }
  function raw() { return PREFIX + JSON.stringify(collect(editor)); }
  function changed() {
    const count = plainLength(collect(editor));
    document.querySelector('#editorCount').textContent = count.toLocaleString('ko-KR') + ' / 50,000자';
  }
  function serialize() {
    const nodes = collect(editor), length = plainLength(nodes), body = PREFIX + JSON.stringify(nodes);
    if (!editor.textContent.trim() && !editor.querySelector('figure')) throw new Error('내용 또는 첨부를 입력해 주세요.');
    let count = 0; const countNodes = list => list.forEach(node => { count++; if (node && typeof node === 'object') countNodes(node.children || []); }); countNodes(nodes);
    if (count > 10000) throw new Error('본문 서식이 너무 많습니다. 일부 서식을 줄여 주세요.');
    if (length > MAX_TEXT) throw new Error('본문은 50,000자까지 작성할 수 있습니다.');
    if (body.length > MAX_BODY) throw new Error('본문 서식 용량을 초과했습니다. 일부 서식을 줄여 주세요.');
    if (editor.querySelectorAll('figure').length > MAX_MEDIA) throw new Error('첨부는 최대 20개입니다.');
    return body;
  }
  function remember() {
    const selection = window.getSelection();
    if (selection.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)) range = selection.getRangeAt(0).cloneRange();
  }
  function restore() {
    editor.focus(); const selection = window.getSelection();
    if (!range || !editor.contains(range.commonAncestorContainer)) { range = document.createRange(); range.selectNodeContents(editor); range.collapse(false); }
    selection.removeAllRanges(); selection.addRange(range);
  }
  function insert(node) {
    restore(); range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); changed();
  }
  function setPreview(show) {
    isPreview = show; editor.hidden = show; preview.hidden = !show;
    document.querySelector('#editorPreview').textContent = show ? '편집으로 돌아가기' : '미리보기';
    if (show) render(preview, raw()); else preview.replaceChildren();
    updateLock();
  }
  function updateLock() {
    const busy = locked || uploading;
    dialog.querySelectorAll('button,input').forEach(el => { el.disabled = busy || (isPreview && el.closest('.editor-toolbar') && el.id !== 'editorPreview'); });
    editor.contentEditable = String(!busy && !isPreview); dialog.setAttribute('aria-busy', String(busy));
  }
  async function cleanPending(keep = new Set()) {
    const toClean = pending; pending = [];
    await Promise.allSettled(toClean.filter(item => !keep.has(item.url)).map(item => item.ref.delete()));
  }
  function reset(body) {
    render(editor, body, true); range = null; status.textContent = ''; setPreview(false); changed(); initial = raw(); initialTitle = document.querySelector('#entryTitle').value;
  }
  function saved() {
    const keep = new Set([...editor.querySelectorAll('figure')].map(el => el.dataset.src));
    void cleanPending(keep); initial = raw(); initialTitle = document.querySelector('#entryTitle').value;
  }
  function dirty() { return raw() !== initial || document.querySelector('#entryTitle').value !== initialTitle; }
  function canClose() { return !locked && !uploading && (!dirty() || confirm('작성 중인 내용을 버리고 닫을까요?')); }
  dialog.addEventListener('cancel', event => { if (!canClose()) event.preventDefault(); });
  dialog.querySelector('[data-close]').addEventListener('click', event => { if (!canClose()) event.stopImmediatePropagation(); });
  dialog.addEventListener('close', () => { preview.replaceChildren(); void cleanPending(); });
  window.addEventListener('beforeunload', event => { if (dialog.open && (uploading || locked || dirty())) { event.preventDefault(); event.returnValue = ''; } });
  document.addEventListener('selectionchange', remember);
  editor.addEventListener('input', changed);
  document.querySelectorAll('[data-command]').forEach(button => button.addEventListener('click', () => {
    restore(); document.execCommand(button.dataset.command, false, button.dataset.value || null); remember(); changed();
  }));
  document.querySelector('#editorLink').addEventListener('click', () => {
    const input = prompt('연결할 주소를 입력하세요 (https://...)'); if (!input) return;
    const href = safeLink(input.trim()); if (!href) { error.textContent = 'http 또는 https 주소를 입력해 주세요.'; return; }
    restore(); const link = document.createElement('a'); link.href = href; link.textContent = window.getSelection().toString() || href; insert(link);
  });
  document.querySelector('#editorYoutube').addEventListener('click', () => {
    const value = prompt('유튜브 영상 주소를 붙여넣으세요'); if (!value) return;
    const id = youtubeID(value.trim());
    if (!id) { error.textContent = '올바른 유튜브 영상 주소를 입력해 주세요.'; return; }
    if (editor.querySelectorAll('figure').length >= MAX_MEDIA) { error.textContent = '첨부는 최대 20개입니다.'; return; }
    addMedia({kind: 'youtube', src: id});
  });
  function addMedia(item) { const figure = mediaNode(item, true); insert(figure); const paragraph = document.createElement('p'); paragraph.append(document.createElement('br')); insert(paragraph); range.selectNodeContents(paragraph); range.collapse(true); restore(); }
  document.querySelector('#editorPreview').addEventListener('click', () => setPreview(!isPreview));
  const picker = document.querySelector('#editorFiles');
  function pick(accept) { remember(); picker.accept = accept; picker.value = ''; picker.click(); }
  document.querySelector('#editorImage').addEventListener('click', () => pick('image/jpeg,image/png,image/webp,image/gif'));
  document.querySelector('#editorVideo').addEventListener('click', () => pick('video/mp4,video/webm'));
  picker.addEventListener('change', () => upload([...picker.files]));
  const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm']);
  async function upload(files) {
    if (!files.length || locked || uploading || isPreview) return;
    error.textContent = ''; const user = window.firebase?.auth().currentUser;
    if (!user) { error.textContent = '파일을 첨부하려면 로그인해 주세요.'; return; }
    try {
      if (files.length + editor.querySelectorAll('figure').length > MAX_MEDIA) throw new Error('첨부는 최대 20개입니다.');
      for (const file of files) {
        if (!allowedTypes.has(file.type)) throw new Error('JPG·PNG·WebP·GIF·MP4·WebM 파일만 첨부할 수 있습니다.');
        if (!file.size || file.size > (file.type.startsWith('image/') ? 10 : 50) * 1024 * 1024) throw new Error('사진은 10MB, 영상은 50MB 이하로 첨부해 주세요.');
      }
      if (!window.firebase.storage) throw new Error('파일 저장 기능을 불러오지 못했습니다. 새로고침해 주세요.');
      uploading = true; updateLock();
      const storage = firebase.storage();
      for (let i = 0; i < files.length; i++) {
        if (firebase.auth().currentUser?.uid !== user.uid) throw new Error('로그인이 변경되어 업로드를 중단했습니다.');
        const file = files[i], ref = storage.ref('boardMedia/' + user.uid + '/' + crypto.randomUUID());
        const item = {ref, url: ''}; pending.push(item);
        const task = ref.put(file, {contentType: file.type});
        await new Promise((resolve, reject) => task.on('state_changed', snapshot => {
          status.textContent = `첨부 ${i + 1}/${files.length} 업로드 중 · ${Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)}%`;
        }, reject, resolve));
        item.url = await ref.getDownloadURL();
        if (firebase.auth().currentUser?.uid !== user.uid) throw new Error('로그인이 변경되어 업로드를 중단했습니다.');
        addMedia({kind: file.type.startsWith('image/') ? 'image' : 'video', src: item.url, name: file.name});
      }
      status.textContent = '첨부 완료. 본문을 확인한 뒤 등록해 주세요.';
    } catch (err) {
      status.textContent = '';
      error.textContent = err.code?.startsWith('storage/') ? '파일 업로드에 실패했습니다. 네트워크 또는 Firebase Storage 설정·용량·권한을 확인해 주세요. 작성한 내용은 유지됩니다.' : err.message;
    } finally { uploading = false; updateLock(); }
  }
  editor.addEventListener('paste', event => {
    event.preventDefault();
    if (locked || uploading) return;
    const files = [...(event.clipboardData?.files || [])];
    if (files.length) { void upload(files); return; }
    insert(textNode(event.clipboardData?.getData('text/plain') || ''));
  });
  editor.addEventListener('dragover', event => event.preventDefault());
  editor.addEventListener('drop', event => {
    event.preventDefault(); if (locked || uploading) return;
    if (event.dataTransfer?.files.length) void upload([...event.dataTransfer.files]);
    else insert(textNode(event.dataTransfer?.getData('text/plain') || ''));
  });
  return {render, reset, serialize, saved, lock(value) { locked = value; updateLock(); }, busy: () => locked || uploading};
})();
