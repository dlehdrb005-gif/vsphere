/* Shared rules: the host calculates every multiplayer move. */
(function (root) {
  'use strict';
  const COLS = 23, ROWS = 17, COUNT = 200, DURATION = 120000;
  const colors = ['#ed4264','#009eaa','#7253cf','#238fea','#31a15a','#e47a14','#ce4eaf','#aa652b','#798596','#edbb13'];
  function makeBoard(random = Math.random) {
    const cells = Array.from({length: COLS * ROWS}, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const board = Array(COLS * ROWS).fill(-1);
    for (let i = 0; i < COUNT; i++) board[cells[i]] = i % colors.length;
    return board;
  }
  function matches(board, index) {
    if (!Number.isInteger(index) || index < 0 || index >= board.length || board[index] !== -1) return [];
    const groups = new Map();
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      let x = index % COLS + dx, y = Math.floor(index / COLS) + dy;
      while (x >= 0 && x < COLS && y >= 0 && y < ROWS) {
        const i = y * COLS + x, color = board[i];
        if (color !== -1) { if (!groups.has(color)) groups.set(color, []); groups.get(color).push(i); break; }
        x += dx; y += dy;
      }
    }
    return [...groups.values()].filter(group => group.length >= 2).flat();
  }
  function move(player, index, now) {
    if (player.done || now >= player.deadline || !Number.isInteger(index) || index < 0 || index >= COLS * ROWS) return null;
    const removed = matches(player.board, index);
    if (removed.length) {
      for (const i of removed) player.board[i] = -1;
      player.score += removed.length;
    } else player.deadline -= 10000;
    if (player.score === COUNT || now >= player.deadline) { player.done = true; player.finishedAt = now; }
    return removed.length;
  }
  const encode = board => board.map(x => x < 0 ? '.' : String(x)).join('');
  const decode = text => typeof text === 'string' && /^[.0-9]{391}$/.test(text) ? [...text].map(x => x === '.' ? -1 : Number(x)) : null;
  function rank(players) {
    return [...players].sort((a,b) => b.score - a.score || (a.score === COUNT ? a.finishedAt - b.finishedAt : 0));
  }
  const api = {COLS, ROWS, COUNT, DURATION, colors, makeBoard, matches, move, encode, decode, rank};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ColorTilesCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
