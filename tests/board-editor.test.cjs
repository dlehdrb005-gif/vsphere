// Minimal DOM model for data validation tests; this is not a browser UI test.
const fs = require('node:fs'), vm = require('node:vm'), assert = require('node:assert/strict');
class Node {
  constructor(tag, value = '') { this.tagName = tag?.toUpperCase(); this.nodeType = tag === '#text' ? 3 : 1; this.childNodes = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.value = ''; this._text = value; }
  append(...nodes) { for (const node of nodes) { if (node.tagName === '#FRAGMENT') this.append(...node.childNodes); else { node.parentNode = this; this.childNodes.push(node); } } }
  replaceChildren(...nodes) { this.childNodes = []; this._text = ''; this.append(...nodes); }
  get textContent() { return this.nodeType === 3 ? this._text : this.childNodes.map(n => n.textContent).join(''); }
  set textContent(value) { if (this.nodeType === 3) this._text = value; else this.replaceChildren(new Node('#text', value)); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? this[k] ?? null; }
  addEventListener(k, fn) { (this.listeners[k] ||= []).push(fn); }
  querySelectorAll(selector) { return this.childNodes.flatMap(n => [...(n.tagName?.toLowerCase() === selector ? [n] : []), ...n.querySelectorAll(selector)]); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
}
const elements = new Map();
const get = id => { if (!elements.has(id)) elements.set(id, new Node('div')); return elements.get(id); };
const dialog = get('#postDialog'), close = new Node('button'); dialog.querySelector = () => close;
const document = {querySelector: get, querySelectorAll: () => [], addEventListener() {}, createElement: tag => new Node(tag), createTextNode: text => new Node('#text', text), createDocumentFragment: () => new Node('#fragment')};
const window = {VSPHERE_FIREBASE_CONFIG: {storageBucket: 'test.firebasestorage.app'}, addEventListener() {}};
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname, '../board-editor.js'), 'utf8'), {window, document, URL, console, confirm: () => true});
const editor = get('#entryBody'), api = window.BoardEditor, prefix = 'VSPHERE-RICH-1\n';
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS', name); }
test('Legacy posts preserve literal HTML and line breaks', () => { api.reset('<img onerror=alert(1)>\n안녕하세요'); assert.equal(editor.textContent, '<img onerror=alert(1)>\n안녕하세요'); assert.equal(editor.querySelector('img'), null); });
test('50,000 Korean characters save; 50,001 rejected', () => { api.reset('가'.repeat(50000)); assert.ok(api.serialize().startsWith(prefix)); api.reset('가'.repeat(50001)); assert.throws(() => api.serialize(), /50,000/); });
test('Empty body rejected', () => { api.reset('  '); assert.throws(() => api.serialize(), /내용/); });
test('Rich formatting round trip', () => { const value = prefix + JSON.stringify([{tag:'p',children:['안녕 ',{tag:'b',children:['브이스피어']}]}]); api.reset(value); assert.equal(api.serialize(), value); });
test('Script, iframe and unsafe link rejected by renderer', () => { const target = new Node('div'); api.render(target, prefix + JSON.stringify([{tag:'script',children:['alert(1)']},{tag:'iframe',children:[]},{tag:'a',href:'javascript:alert(1)',children:['링크']} ])); assert.equal(target.querySelector('script'), null); assert.equal(target.querySelector('iframe'), null); assert.equal(target.querySelector('a').href, undefined); });
test('Untrusted media hosts rejected', () => { const target = new Node('div'); api.render(target, prefix + JSON.stringify([{kind:'image',src:'https://evil.example/a.png'},{kind:'video',src:'https://firebasestorage.googleapis.com.evil.example/a.mp4'}])); assert.equal(target.querySelector('img'), null); assert.equal(target.querySelector('video'), null); });
test('Own-bucket image serializes and renders', () => { const src = 'https://firebasestorage.googleapis.com/v0/b/test.firebasestorage.app/o/boardMedia%2Fu%2Ffile?alt=media&token=x'; api.reset(prefix + JSON.stringify([{kind:'image',src,name:'test.png'}])); assert.equal(editor.querySelector('img').src, src); assert.ok(api.serialize().includes('test.png')); });
test('Malformed rich payload falls back to literal text', () => { const input = prefix + '{broken'; api.reset(input); assert.equal(editor.textContent, input); });
test('Malicious editable DOM is omitted on serialization', () => { api.reset('safe'); const script = new Node('script'); script.textContent = 'evil'; editor.append(script); assert.ok(!api.serialize().includes('evil')); });
test('More than 20 media items rejected', () => { api.reset(prefix + JSON.stringify(Array.from({length:21}, () => ({kind:'youtube',src:'dQw4w9WgXcQ'})))); assert.throws(() => api.serialize(), /20개/); });
console.log(`${passed} data tests passed. Browser and live Firebase tests still required.`);
