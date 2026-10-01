'use strict';
(() => {
  const COLS = 23, ROWS = 17, CELL = 40, COUNT = 200;
  const colors = ['#ed4264','#009eaa','#7253cf','#238fea','#31a15a','#e47a14','#ce4eaf','#aa652b','#798596','#edbb13'];
  const canvas = document.getElementById('board'), ctx = canvas.getContext('2d');
  const timer = document.getElementById('timer'), scoreEl = document.getElementById('score');
  const overlay = document.getElementById('overlay'), status = document.getElementById('status');
  const restart = document.getElementById('restart');
  let board = [], running = false, score = 0, deadline = 0, tickId = null, best = 0;
  let selected = null, flash = null, flashId = null;
  try { best = Math.max(0, Math.min(COUNT, Number(localStorage.getItem('vsphere-color-tiles-best')) || 0)); } catch (_) {}
  document.getElementById('best').textContent = best;
  function makeBoard() {
    const cells = Array.from({length: COLS * ROWS}, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    board = Array(COLS * ROWS).fill(-1);
    for (let i = 0; i < COUNT; i++) board[cells[i]] = i % colors.length;
  }
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#ffedb3' : '#fff6d4';
      ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
      const color = board[y * COLS + x];
      if (color < 0) continue;
      ctx.fillStyle = '#6a401330';
      ctx.fillRect(x * CELL + 5, y * CELL + 7, 31, 31);
      ctx.fillStyle = colors[color];
      ctx.fillRect(x * CELL + 4, y * CELL + 4, 31, 31);
      ctx.fillStyle = '#ffffff44';
      ctx.fillRect(x * CELL + 7, y * CELL + 7, 25, 3);
    }
    if (selected !== null) {
      ctx.strokeStyle = '#63330d'; ctx.lineWidth = 3;
      ctx.strokeRect((selected % COLS) * CELL + 2, Math.floor(selected / COLS) * CELL + 2, CELL - 4, CELL - 4);
    }
    if (flash !== null) {
      ctx.fillStyle = '#ef482677';
      ctx.fillRect((flash % COLS) * CELL, Math.floor(flash / COLS) * CELL, CELL, CELL);
    }
  }
  function matches(index) {
    if (board[index] !== -1) return [];
    const groups = new Map();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      let x = index % COLS + dx, y = Math.floor(index / COLS) + dy;
      while (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
        const i = y * COLS + x, color = board[i];
        if (color !== -1) { if (!groups.has(color)) groups.set(color, []); groups.get(color).push(i); break; }
        x += dx; y += dy;
      }
    }
    return [...groups.values()].filter(group => group.length >= 2).flat();
  }
  function finish() {
    running = false; clearInterval(tickId); restart.disabled = true;
    if (score > best) {
      best = score; document.getElementById('best').textContent = best;
      try { localStorage.setItem('vsphere-color-tiles-best', String(best)); } catch (_) {}
    }
    document.getElementById('resultTitle').textContent = score === COUNT ? '모두 지웠어요!' : '게임 종료!';
    document.getElementById('resultText').textContent = `내 점수 ${score} / ${COUNT} · 최고 점수 ${best}`;
    document.getElementById('start').textContent = '다시 도전 →';
    status.textContent = `게임 종료. ${score}점을 얻었습니다.`;
    overlay.hidden = false; document.getElementById('start').focus();
  }
  function tick() {
    if (!running) return;
    const seconds = Math.max(0, Math.ceil((deadline - performance.now()) / 1000));
    timer.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    timer.classList.toggle('urgent', seconds <= 20);
    if (seconds === 0) finish();
  }
  function choose(index) {
    if (!running || index < 0 || index >= board.length) return;
    tick(); if (!running) return;
    selected = index;
    const removed = matches(index);
    if (removed.length) {
      for (const i of removed) board[i] = -1;
      score += removed.length; scoreEl.textContent = score;
      status.textContent = `+${removed.length}점! ${COUNT - score}개 남았어요.`;
      if (score === COUNT) finish();
    } else {
      deadline -= 10000; flash = index;
      clearTimeout(flashId); flashId = setTimeout(() => { flash = null; draw(); }, 200);
      status.textContent = '매치가 없어요. −10초!'; tick();
    }
    draw();
  }
  function start() {
    clearInterval(tickId); clearTimeout(flashId);
    makeBoard(); score = 0; selected = null; flash = null; scoreEl.textContent = '0';
    deadline = performance.now() + 120000; running = true; overlay.hidden = true; restart.disabled = false;
    status.textContent = '같은 색 타일 사이의 빈칸을 눌러보세요.';
    draw(); tick(); tickId = setInterval(tick, 100); canvas.focus({preventScroll:true});
  }
  canvas.addEventListener('click', event => {
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - r.left) / r.width * COLS);
    const y = Math.floor((event.clientY - r.top) / r.height * ROWS);
    if (x >= 0 && x < COLS && y >= 0 && y < ROWS) choose(y * COLS + x);
  });
  canvas.addEventListener('keydown', event => {
    if (!running) return;
    const directions = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
    if (directions[event.key]) {
      event.preventDefault();
      if (selected === null) selected = Math.floor(ROWS / 2) * COLS + Math.floor(COLS / 2);
      else { const [dx,dy] = directions[event.key]; selected = Math.max(0,Math.min(ROWS-1,Math.floor(selected/COLS)+dy))*COLS + Math.max(0,Math.min(COLS-1,selected%COLS+dx)); }
      draw();
    } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); if (selected !== null) choose(selected); }
  });
  document.getElementById('start').addEventListener('click', start);
  restart.addEventListener('click', () => { if (window.confirm('현재 게임을 끝내고 새로 시작할까요?')) start(); });
  document.addEventListener('visibilitychange', tick);
  makeBoard(); draw();
})();
