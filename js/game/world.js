'use strict';
// 탑다운 맵 엔진(형제 게임 「최척전」에서 가져왔다. 그 엔진은 「영웅의 길」에서 싸움을 뺀 것이다)
//  - 캔버스에 도트 맵(한 칸 32px)을 그리고, 학생(최 씨)을 움직여 사람에게 말을 걸고 자리를 살핀다.
//  - 거점(PLACES[id]) 하나 = 맵 몇 장 + 사람(cast) + 목표(beats) + 단계(steps).
//    목표를 이루면 그 목표에 묶인 단계가 사건 화면(전체 삽화 + 짧은 글 + 고르기)에서 펼쳐진다(js/game/app.js).
//  - 맵은 화면 전체(.mapwrap)에 그리고, 미션·지금 할 일·아이콘은 구석에 얹는다(js/core/hud.js).
//    왼쪽 아래 가상 조이스틱(누른 채 끌기), 오른쪽 아래 행동 단추(말 걸기·살피기), 방향키·WASD와 E·Enter·Space.
//  - 지금 할 일의 위치 표시: 목표 대상(사람·물건·구역, 다른 맵이면 그리로 가는 입구)에 은은한 빛, 화면 밖이면 가장자리 화살표.
//  - 맵의 바닥 무늬·빛은 맵 정의의 theme으로 고른다(js/game/tiles.js 맨 위 설명). night:true면 밤.
//  - 그림이 아직 없다(첫 판): 사람은 단색 사람 모양, 소품은 SPRITES의 shape(나무·버드나무·집·누각·그네·꽃밭·바위·상자)로 그린다.
//  - 맵 사이 입구(doors): 맵 정의에 doors: { id: { x, y, w, h, to:'맵 id', spawn:[x, y, '방향'], name } } — 걸어 들어가면 그 맵으로 옮겨 간다.
(function () {
  const T = 32;
  const { h, boldNodes } = G.util;
  const W = (G.world = {});
  const S = () => G.save.state;
  const SP = () => window.SPRITES || {};
  const fill = (s) => G.util.T(s);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // ───────── 맵 격자 만들기(거점 파일에서 쓴다) ─────────
  //  G.world.mk(가로, 세로, 바탕 글자, [ ['rect',x,y,w,h,'글자'], ['frame',x,y,w,h,'글자'], ['border','글자'], ['dots','글자',[[x,y],…]] ])
  W.mk = function (w, hgt, base, ops) {
    const g = Array.from({ length: hgt }, () => Array(w).fill(base));
    const set = (x, y, c) => { if (y >= 0 && y < hgt && x >= 0 && x < w) g[y][x] = c; };
    for (const op of ops || []) {
      const [k] = op;
      if (k === 'rect') { const [, x, y, rw, rh, c] = op; for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) set(i, j, c); }
      else if (k === 'frame') { const [, x, y, rw, rh, c] = op; for (let i = x; i < x + rw; i++) { set(i, y, c); set(i, y + rh - 1, c); } for (let j = y; j < y + rh; j++) { set(x, j, c); set(x + rw - 1, j, c); } }
      else if (k === 'border') { const [, c] = op; for (let i = 0; i < w; i++) { set(i, 0, c); set(i, hgt - 1, c); } for (let j = 0; j < hgt; j++) { set(0, j, c); set(w - 1, j, c); } }
      else if (k === 'dots') { const [, c, pts] = op; for (const [x, y] of pts) set(x, y, c); }
    }
    return g.map((r) => r.join(''));
  };

  // ───────── 맵 찾기 ─────────
  //  거점 파일의 maps에 적은 맵을 모두 한 곳에서 찾는다(바다 거점의 섬 맵 'island'처럼).
  //  엔진에 든 시험 맵(test)도 있다.
  W.maps = {
    test: {
      name: '시험 마당', spawn: [6, 6, 'down'],
      grid: W.mk(14, 11, '.', [['rect', 2, 7, 10, 1, ':'], ['rect', 6, 2, 1, 6, ':'], ['rect', 10, 2, 3, 3, '~'], ['dots', ',', [[2, 2], [3, 3], [11, 8]]], ['border', 'h']]),
      props: [['pr_test_box', 3, 4, { w: 1, h: 1 }]],
      spots: { sign: { x: 2, y: 8, w: 1, h: 1, name: '푯말', act: '살피기', look: ['시험 맵이에요. 방향키나 조이스틱으로 걸어 보세요.'] } },
      npcs: { tester: { who: 'hyanga', x: 9, y: 6, dir: 'left', talk: [['시험 삼아 말을 걸어 보세요.']] }, nosprite: { name: '그림 없는 사람', x: 12, y: 8, dir: 'down' } },
    },
  };
  // 바다·섬처럼 둥근 물가가 필요하면 G.world.blobGrid(가로, 세로, { 씨앗, 가운데:[x,y], 반지름:[rx,ry] })를 쓴다
  W.blobGrid = function (w, hgt, o = {}) {
    const R = G.tiles.rnd, seed = o.seed || 3;
    const [cx, cy] = o.center || [w / 2, hgt / 2], [rx, ry] = o.radius || [w * 0.36, hgt * 0.36];
    const rows = [];
    for (let y = 0; y < hgt; y++) {
      let row = '';
      for (let x = 0; x < w; x++) {
        const a = Math.atan2(y - cy, x - cx);
        const wob = 1 + 0.16 * Math.sin(a * 3 + seed) + 0.09 * Math.sin(a * 7 + seed * 2) + (R(x, y, seed) - 0.5) * 0.08;
        const d = Math.hypot((x - cx) / rx, (y - cy) / ry) / wob;
        row += d < 0.5 ? (d < 0.32 ? 'm' : '.') : d < 0.9 ? 's' : d < 1.25 ? '~' : 'w';
      }
      rows.push(row);
    }
    return rows;
  };
  W.mapDef = function (id) {
    if (W.maps[id]) return W.maps[id];
    const P = window.PLACES || {};
    for (const k in P) { const p = P[k]; if (p && p.maps && p.maps[id]) return p.maps[id]; }
    return null;
  };

  // ───────── 그림 불러오기 ─────────
  const imgs = {};
  function img(key) {
    let im = imgs[key];
    if (!im) { const m = SP()[key]; if (!m || !m.img) return null; im = imgs[key] = new Image(); im.src = m.img; }
    return im.complete && im.naturalWidth ? im : null;
  }
  W.preload = function (keys) {
    return Promise.all(keys.map((k) => new Promise((res) => {
      const m = SP()[k]; if (!m || !m.img) return res();
      let im = imgs[k];
      if (im && im.complete && im.naturalWidth) return res();
      if (!im) im = imgs[k] = new Image();
      const done = () => res();
      im.addEventListener('load', done, { once: true }); im.addEventListener('error', done, { once: true });
      if (!im.src) im.src = m.img;
      setTimeout(done, 4000);
    })));
  };
  // 대화창 얼굴: 도트 인물의 윗몸을 크게
  W.spriteFace = function (sp) {
    // 머리와 어깨만 26×26으로 잘라 정수배로 키운다(초상 그림이 생기기 전의 대신 얼굴)
    const c = document.createElement('canvas'); c.width = 26; c.height = 26; c.className = 'pxface';
    const draw = () => {
      const m = SP()[sp], im = img(sp); if (!m || !im || !m.anims) return false;
      const g2 = c.getContext('2d'); g2.imageSmoothingEnabled = false;
      const a = m.anims.walk_down || Object.values(m.anims)[0]; const i = a.start;
      const sx = (i % m.cols) * m.fw, sy = Math.floor(i / m.cols) * m.fh;
      g2.drawImage(im, sx + m.px - 13, sy + m.py - 50, 26, 26, 0, 0, 26, 26);
      return true;
    };
    if (!draw()) W.preload([sp]).then(draw);
    return c;
  };

  // ───────── 상태 ─────────
  let M = null;              // 지금 맵
  let P = null;              // 학생(최 씨)
  let cv, g0, buf, g, dark, gd, root, padEl, joyEl, fadeEl, hintEl, talkBtn, bannerEl, labelsOn = true;
  let scale = 2, vw = 320, vh = 240, dpr = 1;
  const cam = { x: 0, y: 0 };
  let time = 0;
  const parts = [];
  W.busy = 0; W.closedAt = 0;
  let goal = null;           // { text, targets:[id], zones:[id], repeat:[id], locked:{id:[줄]}, hit(id) }
  let calm = false;          // 움직임 줄이기(G.ui.calm): 표시가 출렁이지 않고 떠다니는 것을 그리지 않는다
  let lastInd = { glow: [], arrows: [], via: {} }; // 마지막으로 그린 위치 표시(점검용)
  let running = false, last = 0, acc = 0, ro = null;

  // 세상이 멈추는 때: 대화창·사건 화면·판이 떠 있거나 세로 화면일 때
  W.paused = () => W.busy > 0 || !!document.querySelector('.overlay, .sheet-back, .event.on') || !!(G.app && G.app.portrait);

  // ───────── 입력 ─────────
  const keys = new Set();
  const inp = { jx: 0, jy: 0, talk: false };
  const KEYMAP = { ArrowUp: 'u', KeyW: 'u', ArrowDown: 'd', KeyS: 'd', ArrowLeft: 'l', KeyA: 'l', ArrowRight: 'r', KeyD: 'r' };
  function typing(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable); }
  function onKeyDown(e) {
    if (!running || typing(e) || !cv || !cv.isConnected) return;
    if (W.paused()) { keys.clear(); return; }
    const k = KEYMAP[e.code];
    if (k) { keys.add(k); e.preventDefault(); return; }
    if (e.repeat) return;
    if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space' || e.code === 'KeyZ') {
      if (performance.now() - W.closedAt > 300) inp.talk = true;
      e.preventDefault();
    }
  }
  function onKeyUp(e) { const k = KEYMAP[e.code]; if (k) keys.delete(k); }
  function onBlur() { keys.clear(); inp.jx = inp.jy = 0; }

  // 떠다니는 가상 조이스틱(맵 왼쪽 아래 어디든 누른 자리에서 시작)
  //  쉬고 있을 때는 왼쪽 아래에 옅은 조이스틱이 놓여 있다(터치 기기만). 누르면 그 자리에서 진한 조이스틱이 뜬다.
  function setupJoystick(zone) {
    const base = h('div.joy-base'), knob = h('div.joy-knob');
    joyEl = h('div.joy', base, knob);
    zone.appendChild(h('div.joy-rest', { 'aria-hidden': 'true' }, h('div.joy-base', h('i.n'), h('i.e'), h('i.s'), h('i.w')), h('div.joy-knob')));
    zone.appendChild(joyEl);
    let id = null, ox = 0, oy = 0;
    const R = 44;
    zone.addEventListener('pointerdown', (e) => {
      if (id !== null || W.paused()) return;
      id = e.pointerId; ox = e.clientX; oy = e.clientY;
      try { zone.setPointerCapture(id); } catch (err) { /* 무시 */ }
      joyEl.classList.add('on'); zone.classList.add('active');
      joyEl.style.left = ox + 'px'; joyEl.style.top = oy + 'px';
      knob.style.transform = 'translate(-50%,-50%)';
      G.audio.unlock();
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== id) return;
      let dx = e.clientX - ox, dy = e.clientY - oy;
      const d = Math.hypot(dx, dy);
      if (d > R) { dx = dx / d * R; dy = dy / d * R; }
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      if (Math.min(1, d / R) < 0.18) { inp.jx = inp.jy = 0; return; }
      inp.jx = dx / R; inp.jy = dy / R;
    });
    const end = (e) => { if (e.pointerId !== id) return; id = null; inp.jx = inp.jy = 0; joyEl.classList.remove('on'); zone.classList.remove('active'); };
    zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  }

  const ACT_ICON = {
    talk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5h-8l-4.5 3.5V16.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5z"/><path d="M7.5 11h.01M12 11h.01M16.5 11h.01" stroke-width="2.6"/></svg>',
    look: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5.5 5.5"/><path d="M8 8.5a3 3 0 0 1 2.5-1" /></svg>',
  };
  // 맵에 들어서면 위쪽 가운데에 잠깐 뜨는 땅 이름: 거점 이름(붓글씨) + 그 아래 맵 이름
  //  plain:true면 붓글씨 대신 명조로(붓글씨 부분 글꼴에 없는 글자일 때)
  W.banner = function (title, sub, plain) {
    if (!bannerEl) return;
    bannerEl.innerHTML = '';
    if (!title && !sub) return;
    G.util.append(bannerEl, [h('strong' + (plain ? '.plain' : ''), title || ''), sub ? h('small', sub) : null]);
    bannerEl.classList.remove('show'); void bannerEl.offsetWidth; bannerEl.classList.add('show');
    clearTimeout(W._bannerT);
    W._bannerT = setTimeout(() => bannerEl && bannerEl.classList.remove('show'), 2800);
  };

  // ───────── 화면 만들기(화면 전체 맵 자리 안에) ─────────
  W.mount = function (container) {
    container.innerHTML = '';
    cv = h('canvas.wcv');
    const zone = h('div.joy-zone');
    // 행동 단추: 늘 오른쪽 아래에 있고, 가까이에 말 걸 사람·살필 자리가 있으면 등불처럼 밝아진다
    talkBtn = h('button.pbtn.talk', { type: 'button', tabindex: -1, 'aria-label': '말 걸기' }, h('span.pic', { html: ACT_ICON.talk }), h('span.pl', '말 걸기'), h('kbd', 'E'));
    talkBtn.addEventListener('pointerdown', (e) => { e.preventDefault(); G.audio.unlock(); inp.talk = true; talkBtn.classList.add('down'); });
    const up = () => talkBtn.classList.remove('down');
    talkBtn.addEventListener('pointerup', up); talkBtn.addEventListener('pointerleave', up); talkBtn.addEventListener('pointercancel', up);
    padEl = h('div.pad', talkBtn);
    hintEl = h('div.keyhint', ((window.TEXTS || {}).KEYHINT) || '이동 ← ↑ → ↓ / WASD · 말 걸기·살피기 E / Enter / Space');
    fadeEl = h('div.wfade');
    bannerEl = h('div.area-banner', { 'aria-live': 'polite' });
    root = h('div.world', cv, zone, padEl, hintEl, bannerEl, fadeEl);
    container.appendChild(root);
    setupJoystick(zone);
    g0 = cv.getContext('2d');
    buf = document.createElement('canvas'); g = buf.getContext('2d');
    dark = document.createElement('canvas'); gd = dark.getContext('2d');
    resize();
    if (ro) ro.disconnect();
    if (window.ResizeObserver) { ro = new ResizeObserver(() => resize()); ro.observe(root); }
    if (!W._listening) {
      W._listening = true;
      window.addEventListener('resize', () => { if (running) resize(); });
      document.addEventListener('keydown', onKeyDown);
      document.addEventListener('keyup', onKeyUp);
      window.addEventListener('blur', onBlur);
    }
    setTimeout(() => hintEl && hintEl.classList.add('fade'), 9000);
    if (!running) { running = true; last = performance.now(); acc = 0; requestAnimationFrame(loop); }
    return root;
  };

  function resize() {
    if (!cv || !root) return;
    dpr = window.devicePixelRatio || 1;
    const cw = root.clientWidth || 320, ch = root.clientHeight || 240;
    const Wd = Math.max(1, Math.round(cw * dpr)), Hd = Math.max(1, Math.round(ch * dpr));
    // 정수 배율: 세로로 12칸 안팎이 보이게
    scale = Math.max(1, Math.round(Math.min(Wd / 400, Hd / 360)));
    if (cv.width === Wd && cv.height === Hd && buf.width === Math.ceil(Wd / scale)) { measureSafe(); return; }
    cv.width = Wd; cv.height = Hd;
    vw = Math.ceil(Wd / scale); vh = Math.ceil(Hd / scale);
    buf.width = vw; buf.height = vh; dark.width = vw; dark.height = vh;
    g.imageSmoothingEnabled = false; g0.imageSmoothingEnabled = false;
    measureSafe();
    snapCam();
  }

  // ───────── 맵 ─────────
  function tileAt(tx, ty) { const r = M.grid[ty]; return r ? r[tx] : undefined; }
  function feet(tx, ty) { return [(tx + 0.5) * T, (ty + 0.78) * T]; }

  function build(id) {
    const def = W.mapDef(id);
    if (!def) throw new Error('맵 없음: ' + id);
    const grid = def.grid;
    const m = {
      id, def, grid, gw: grid[0].length, gh: grid.length,
      ground: G.tiles.render(grid, def.theme), props: [], boxes: [], chars: [], spots: {}, npcs: {},
      theme: def.theme || 'village', fires: [], lights: [],
    };
    m.pal = G.tiles.THEMES[m.theme] || G.tiles.THEMES.village;
    m.night = def.night != null ? !!def.night : !!m.pal.night;
    m.w = m.gw * T; m.h = m.gh * T;
    for (const p of def.props || []) {
      const [key, tx, ty, o = {}] = p;
      const sm = SP()[key];
      // 그림이 아직 없는 소품: SPRITES의 shape(없으면 나무 상자)를 w·h(픽셀) 또는 o.w·o.h(칸)만 하게 코드로 그린다
      const w = sm && sm.w ? sm.w : Math.round((o.w || 1) * T), hh = sm && sm.h ? sm.h : Math.round((o.h || 1) * T);
      const x = Math.round(tx * T), y = Math.round((ty + 1) * T - hh);
      const e = { kind: 'prop', key, x, y, w, h: hh, flat: !!(o.flat || (sm && sm.flat)), missing: !(sm && sm.img), shape: (sm && sm.shape) || 'box', color: (sm && sm.color) || null };
      const f = sm && sm.foot ? sm.foot : [2, Math.round(hh * 0.4), w - 2, hh - 2];
      e.sortY = y + (f[3] > f[1] ? f[3] : hh);
      if (f[2] > f[0] && !o.walk && !o.flat) { e.box = [x + f[0], y + f[1], x + f[2], y + f[3]]; m.boxes.push(e.box); }
      // 빛을 내는 소품: [반지름, 등불 높이(위에서 비율), 불길인가]
      const LL = LIGHTS[key] || (sm && sm.light) || null;
      const lr = o.light || (LL ? LL[0] : 0);
      if (lr) m.lights.push({ x: x + w / 2, y: y + hh * (LL ? LL[1] : 0.6), r: lr, fire: !!(LL && LL[2]), foot: y + hh });
      m.props.push(e);
    }
    for (const l of def.lights || []) m.lights.push({ x: (l[0] + 0.5) * T, y: (l[1] + 0.5) * T, r: l[2] || 64, fire: !!l[3], foot: (l[1] + 1) * T });
    for (const sid in def.spots || {}) {
      const s = def.spots[sid];
      m.spots[sid] = Object.assign({ id: sid, w: 1, h: 1 }, s, { rx: s.x * T, ry: s.y * T, rw: (s.w || 1) * T, rh: (s.h || 1) * T });
    }
    m.doors = {};
    for (const did in def.doors || {}) {
      const d = def.doors[did];
      m.doors[did] = Object.assign({ id: did, w: 1, h: 1 }, d, { rx: d.x * T, ry: d.y * T, rw: (d.w || 1) * T, rh: (d.h || 1) * T, armed: false });
    }
    return m;
  }

  // 빛을 내는 소품: [반지름, 등불 높이(위에서 비율), 불길인가]. SPRITES의 light: [반지름, 높이]로도 단다
  const LIGHTS = { pr_lantern: [56, 0.32], pr_lantern_stone: [46, 0.42], pr_bonfire: [90, 0.6, true] };

  function addNpc(id, d) {
    if (!d || (d.when && !G.steps.ok(d.when))) return;
    const old = M.npcs[id];
    if (old) M.chars.splice(M.chars.indexOf(old), 1);
    const [x, y] = freeSpot(...feet(d.x, d.y), 6);
    const who = d.who || null;
    const e = {
      kind: 'npc', id, sp: d.sp || (who && (G.util.person(who) || {}).sp) || null, x, y, hx: x, hy: y, dir: d.dir || 'down', t: 0, moving: false, alpha: d.alpha,
      who, name: d.name || (who ? G.util.who(who) : ''), talk: d.talk || null, ti: 0, solid: true, hw: 6,
      wander: d.wander || 0, wt: Math.random() * 3, color: d.color || G.util.colorOf(who || d.sp || id),
    };
    M.npcs[id] = e; M.chars.push(e);
  }
  function removeNpc(id) { const e = M.npcs[id]; if (!e) return; M.chars.splice(M.chars.indexOf(e), 1); delete M.npcs[id]; }

  // 학생(최 씨)의 모습(도트 id): 목표·거점·인물 기본값 순(예: 2막 밤의 혼). 다른 파일이 G.world.avatarOf를 바꿔 정할 수 있다
  W.avatarOf = (place) => {
    const a = place && place.avatar;
    const me = G.util.person(G.util.playerId()) || {};
    return (typeof a === 'function' ? a(S()) : a) || me.sp || 'sp_choi';
  };
  W.avatar = function () { return W.avatarOverride || W.avatarOf(W.place); };
  function refreshAvatar() {
    if (!P) return;
    P.sp = W.avatar();
    P.speed = 88;
    if (G.hud && G.hud.syncFace) G.hud.syncFace(); // 모습이 바뀌면 HUD 얼굴도 그 모습으로
  }

  function placePlayer(sp) {
    const s = sp || M.def.spawn || [Math.floor(M.gw / 2), Math.floor(M.gh / 2), 'down'];
    const [x, y] = freeSpot(...feet(s[0], s[1]), 6);
    P.x = x; P.y = y; P.dir = s[2] || 'down';
    snapCam();
  }

  async function loadMap(id, spawn, cast) {
    const def = W.mapDef(id);
    if (!def) throw new Error('맵 없음: ' + id);
    const keys = new Set([W.avatar()]);
    for (const p of def.props || []) keys.add(p[0]);
    for (const n of Object.values(def.npcs || {})) keys.add(n.sp);
    for (const n of Object.values(cast || {})) if (n) keys.add(n.sp);
    await W.preload([...keys].filter(Boolean));
    M = build(id);
    if (!P) P = { kind: 'player', x: 0, y: 0, dir: 'down', t: 0, moving: false, hw: 6, dust: 0, color: G.util.colorOf(G.util.playerId()) };
    refreshAvatar();
    M.chars.push(P);
    const amb = def.npcs || {};
    for (const nid in amb) if (!amb[nid].places || amb[nid].places.includes(W.placeId)) addNpc(nid, amb[nid]);
    for (const nid in cast || {}) addNpc(nid, cast[nid]);
    placePlayer(spawn);
    for (const did in M.doors) M.doors[did].armed = !inRect(M.doors[did]); // 들어선 자리의 입구는 한 번 벗어난 뒤에야 다시 열린다
    W.setMusic(def.music);
    if (G.hud) G.hud.where(def.name || '', def.year || null);
    // 회상 맵(memory:true): 놀이 화면을 바랜 빛으로(css .play.memory)
    const playEl = root && root.closest('.play');
    if (playEl) playEl.classList.toggle('memory', !!def.memory);
    amb.length = 0;
    const pn = G.hud && G.hud.info && G.hud.info.name;
    if (pn) W.banner(pn, def.name && def.name !== pn ? def.name : '');
    else if (def.name) W.banner(def.name, '', true);
  }
  async function changeMap(id, spawn, cast) {
    W.busy++;
    try {
      if (fadeEl) fadeEl.classList.add('on');
      await G.util.wait(calm ? 60 : 260);
      await loadMap(id, spawn, cast);
      if (W.place) applyCastHere(W.place, id);
      if (fadeEl) fadeEl.classList.remove('on');
    } finally { W.busy = Math.max(0, W.busy - 1); }
  }
  W.changeMap = (id, spawn) => changeMap(id, spawn, W.place ? castFor(W.place, id) : {});
  // 사각 자리 안에 학생이 서 있는가
  function inRect(s) { return !!(P && s && P.x > s.rx && P.x < s.rx + s.rw && P.y > s.ry && P.y < s.ry + s.rh); }
  W.setMusic = function (name) { if (name) { W.music = name; G.audio.play(name); } };

  // ───────── 충돌 ─────────
  function blocked(x0, y0, x1, y1, self) {
    const tx0 = Math.floor(x0 / T), tx1 = Math.floor((x1 - 0.01) / T), ty0 = Math.floor(y0 / T), ty1 = Math.floor((y1 - 0.01) / T);
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      const c = tileAt(tx, ty);
      if (c === undefined || G.tiles.SOLID.has(c)) return true;
    }
    for (const b of M.boxes) if (x1 > b[0] && x0 < b[2] && y1 > b[1] && y0 < b[3]) return true;
    if (self === P) for (const e of M.chars) if (e.kind === 'npc' && e.solid) { if (x1 > e.x - 7 && x0 < e.x + 7 && y1 > e.y - 6 && y0 < e.y + 1) return true; }
    return false;
  }
  function move(e, dx, dy) {
    const hw = e.hw || 6, hh = 5;
    let mx = false, my = false;
    if (dx) { const nx = e.x + dx; if (!blocked(nx - hw, e.y - hh, nx + hw, e.y, e)) { e.x = nx; mx = true; } }
    if (dy) { const ny = e.y + dy; if (!blocked(e.x - hw, ny - hh, e.x + hw, ny, e)) { e.y = ny; my = true; } }
    // 모서리에 걸리면 살짝 비켜 준다(학생만)
    if (e === P && dx && !mx && !dy) {
      for (const o of [3, 6, 9]) for (const s of [-1, 1]) {
        if (!blocked(e.x + dx - hw, e.y + s * o - hh, e.x + dx + hw, e.y + s * o, e)) { e.y += s * Math.min(1.5, o); return; }
      }
    }
    if (e === P && dy && !my && !dx) {
      for (const o of [3, 6, 9]) for (const s of [-1, 1]) {
        if (!blocked(e.x + s * o - hw, e.y + dy - hh, e.x + s * o + hw, e.y + dy, e)) { e.x += s * Math.min(1.5, o); return; }
      }
    }
  }
  function faceTo(e, tx, ty) {
    const dx = tx - e.x, dy = ty - e.y;
    e.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : (dy < 0 ? 'up' : 'down');
  }
  // 막힌 자리에 서게 되면 가까운 빈자리를 찾는다
  function freeSpot(x, y, hw) {
    const ok = (a, b) => !blocked(a - hw, b - 5, a + hw, b, null);
    if (ok(x, y)) return [x, y];
    for (let r = 4; r <= 96; r += 4) for (let k = 0; k < 16; k++) {
      const a = (k / 16) * Math.PI * 2, nx = x + Math.cos(a) * r, ny = y + Math.sin(a) * r;
      if (ok(nx, ny)) return [nx, ny];
    }
    return [x, y];
  }

  // ───────── 효과(발밑 먼지·불티) ─────────
  function puff(x, y, c = 'rgba(214,196,160,.9)') { parts.push({ x: x + (Math.random() * 6 - 3), y, z: 1, vx: (Math.random() - 0.5) * 20, vy: -4, vz: 14, t: 0, life: 0.35, c, s: 2, grav: 0 }); }

  // ───────── 갱신 ─────────
  function update(dt) {
    time += dt;
    safe.t -= dt;
    if (safe.t <= 0) { safe.t = 0.5; measureSafe(); calm = !!(G.ui && G.ui.calm && G.ui.calm()); }
    updateFx(dt);
    if (!calm) updateAmbient(dt); else amb.length = 0;
    if (W.paused()) { keys.clear(); inp.jx = inp.jy = 0; idleNpcs(dt); P.moving = false; return; }
    let ix = inp.jx, iy = inp.jy;
    if (keys.has('l')) ix -= 1; if (keys.has('r')) ix += 1; if (keys.has('u')) iy -= 1; if (keys.has('d')) iy += 1;
    const im = Math.hypot(ix, iy);
    if (im > 1) { ix /= im; iy /= im; }
    P.moving = im > 0.05 && !P.frozen;
    if (P.moving) {
      P.dir = Math.abs(ix) > Math.abs(iy) ? (ix < 0 ? 'left' : 'right') : (iy < 0 ? 'up' : 'down');
      move(P, ix * P.speed * dt, iy * P.speed * dt);
      P.t += dt * Math.min(1, im + 0.2);
      P.dust -= dt;
      if (P.dust <= 0) { P.dust = 0.16; puff(P.x, P.y); }
    }
    idleNpcs(dt);
    const near = nearest();
    W.near = near;
    if (inp.talk) { inp.talk = false; if (near) interact(near); }
    // 저절로 밟는 자리(목표 지점)
    if (goal && goal.zones) for (const sid of goal.zones) {
      if (inRect(M.spots[sid])) { goal.hit(sid); return; }
    }
    // 되풀이 구역: 목표가 이어지는 동안 몇 번이든 들어갈 수 있다(한 번 벗어나야 다시 열린다)
    if (goal && goal.repeat) for (const sid of goal.repeat) {
      const s = M.spots[sid]; if (!s) continue;
      const inside = inRect(s);
      if (inside && goal.armed[sid]) { goal.armed[sid] = false; goal.hit(sid); return; }
      if (!inside) goal.armed[sid] = true;
    }
    // 맵 사이 입구
    for (const did in M.doors) {
      const d = M.doors[did];
      const inside = inRect(d);
      if (inside && d.armed && d.to && W.mapDef(d.to)) { d.armed = false; W.changeMap(d.to, d.spawn || null); return; }
      if (!inside) d.armed = true;
    }
    padState(near);
  }

  function idleNpcs(dt) {
    for (const e of M.chars) {
      if (e.kind !== 'npc') continue;
      if (!e.wander || W.paused()) { e.moving = false; continue; }
      e.wt -= dt;
      if (e.wt <= 0) {
        e.wt = 1.5 + Math.random() * 3;
        const r = e.wander * T;
        e.goal = Math.random() < 0.4 ? null : [e.hx + (Math.random() * 2 - 1) * r, e.hy + (Math.random() * 2 - 1) * r];
      }
      if (e.goal && Math.hypot(P.x - e.x, P.y - e.y) > 40) {
        const dx = e.goal[0] - e.x, dy = e.goal[1] - e.y, d = Math.hypot(dx, dy);
        if (d < 2) { e.goal = null; e.moving = false; continue; }
        const ox = e.x, oy = e.y;
        move(e, dx / d * 30 * dt, dy / d * 30 * dt);
        if (ox === e.x && oy === e.y) { e.goal = null; e.moving = false; continue; }
        faceTo(e, e.goal[0], e.goal[1]); e.moving = true; e.t += dt;
      } else e.moving = false;
    }
  }

  function updateFx(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.t += dt;
      if (p.t >= p.life) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= p.grav * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.35; p.vx *= 0.6; p.vy *= 0.6; }
    }
    // 불길: 불덩이 + 튀는 불티 + 연기(남원 함락처럼 불빛으로만 보여 주는 장면)
    for (const f of M.fires) {
      if (Math.random() < dt * 40) parts.push({ x: f[0] + (Math.random() - 0.5) * 40, y: f[1], z: 10 + Math.random() * 20, vx: (Math.random() - 0.5) * 14, vy: 0, vz: 30 + Math.random() * 40, t: 0, life: 0.5 + Math.random() * 0.4, c: ['#ffd24a', '#ff8a2a', '#e04a1a', '#ffe9a0'][Math.floor(Math.random() * 4)], s: 3 + Math.floor(Math.random() * 3), grav: -30, glow: true });
      if (Math.random() < dt * 14) parts.push({ x: f[0] + (Math.random() - 0.5) * 30, y: f[1], z: 30 + Math.random() * 20, vx: (Math.random() - 0.5) * 30, vy: 0, vz: 70 + Math.random() * 60, t: 0, life: 0.8 + Math.random() * 0.6, c: '#ffe9a0', s: 1, grav: 10, glow: true });
      if (Math.random() < dt * 6) parts.push({ x: f[0] + (Math.random() - 0.5) * 30, y: f[1], z: 50 + Math.random() * 20, vx: 8 + Math.random() * 10, vy: 0, vz: 24, t: 0, life: 1.6, c: 'rgba(60,50,50,.55)', s: 5, grav: 0 });
    }
    const tx = P.x - vw / 2, ty = P.y - 20 - vh / 2;
    const k = Math.min(1, dt * 9);
    cam.x += (camClampX(tx) - cam.x) * k; cam.y += (camClampY(ty) - cam.y) * k;
  }
  // HUD 안전 여백(맵 픽셀): 위쪽 HUD(초상·미션·아이콘)와 아래쪽 조작부(조이스틱·행동 단추)가 차지하는 높이.
  //  카메라는 맵 위·아래 끝에서 이만큼 더 물러설 수 있어서, 맵 가장자리의 사람·자리·이름표가 HUD 밑에 숨지 않는다.
  //  (물러선 자리는 맵 가장자리를 거울처럼 비춰 어둡게 채운다) · 목표 표시도 이 안쪽에서만 그리고, 밖이면 가장자리 화살표.
  const safe = { top: 0, bottom: 0, t: 0 };
  W.safe = safe;
  function measureSafe() {
    if (!root || !root.isConnected) return;
    const rb = root.getBoundingClientRect();
    const k = dpr / scale;
    const shown = (e) => e && e.offsetParent !== null && getComputedStyle(e).visibility !== 'hidden';
    let top = 0, bottom = 0;
    for (const sel of ['.hud-tl', '.mission', '.hud-tr']) {
      const e = document.querySelector('.play ' + sel);
      if (shown(e)) top = Math.max(top, e.getBoundingClientRect().bottom - rb.top);
    }
    for (const e of [padEl && padEl.querySelector('.pbtn'), root.querySelector('.joy-rest')]) {
      if (shown(e)) bottom = Math.max(bottom, rb.bottom - e.getBoundingClientRect().top);
    }
    // 사건 화면·대화창으로 HUD가 잠깐 숨으면 앞의 값을 그대로 둔다(카메라가 들썩이지 않게)
    if (top) safe.top = Math.ceil(top * k) + 4;
    if (bottom) safe.bottom = Math.ceil(bottom * k) + 2;
  }
  const camClampX = (x) => (M.w <= vw ? (M.w - vw) / 2 : clamp(x, 0, M.w - vw));
  const camClampY = (y) => {
    const lo = -safe.top, hi = M.h - vh + safe.bottom;
    return hi <= lo ? (lo + hi) / 2 : clamp(y, lo, hi);
  };
  function snapCam() { if (!P || !M) return; cam.x = camClampX(P.x - vw / 2); cam.y = camClampY(P.y - 20 - vh / 2); }

  // ───────── 말 걸기·살피기 ─────────
  function nearest() {
    let best = null, bd = 1e9;
    const isGoal = (id) => (goal && goal.targets && goal.targets.includes(id)) || false;
    const isLocked = (id) => !!(goal && goal.locked && goal.locked[id]);
    for (const id in M.npcs) {
      const e = M.npcs[id];
      if (!e.talk && !isGoal(id) && !isLocked(id)) continue;
      const d = Math.hypot(e.x - P.x, (e.y - P.y) * 1.3);
      if (d < 36) { const s = d - (isGoal(id) ? 100 : 0); if (s < bd) { bd = s; best = { type: 'npc', id, e }; } }
    }
    for (const id in M.spots) {
      const s = M.spots[id];
      if (goal && ((goal.zones && goal.zones.includes(id)) || (goal.repeat && goal.repeat.includes(id)))) continue;
      if (!s.look && !isGoal(id) && !s.hint && !isLocked(id)) continue;
      const pad = 14;
      if (P.x > s.rx - pad && P.x < s.rx + s.rw + pad && P.y > s.ry - pad && P.y < s.ry + s.rh + pad + 6) {
        const d = Math.hypot(s.rx + s.rw / 2 - P.x, s.ry + s.rh / 2 - P.y) - (isGoal(id) ? 100 : 0) + 20;
        if (d < bd) { bd = d; best = { type: 'spot', id, s }; }
      }
    }
    return best;
  }
  async function interact(n) {
    const id = n.id;
    if (n.type === 'npc') { faceTo(n.e, P.x, P.y); faceTo(P, n.e.x, n.e.y); }
    if (goal && goal.targets && goal.targets.includes(id)) { goal.hit(id); return; }
    // 아직 열리지 않은 할 일(need): 열림 조건 안내만 보인다
    if (goal && goal.locked && goal.locked[id]) return chat({ name: (n.e && n.e.name) || (n.s && n.s.name) || '', sp: n.e && n.e.sp, who: n.e && n.e.who, color: n.e && n.e.color, lines: [].concat(goal.locked[id]) });
    if (n.type === 'npc' && n.e.talk) return chat(n.e);
    if (n.type === 'spot') {
      if (n.s.look) return chat({ name: n.s.name || '', lines: [].concat(n.s.look) });
      if (n.s.hint) G.ui.toast(fill(n.s.hint));
    }
  }

  // 대화창: 맵 자리 아래쪽에 뜨는 작은 창(단계 실행기가 그대로 그린다)
  function openDlg(o = {}) {
    const main = h('div.dlg-main.main-inner');
    const tray = h('div.dlg-tray.hide');
    const box = h('div.dlg-box', h('div.dlg-scroll', main), tray);
    const back = h('div.dlg' + (o.small ? '.small' : ''), box);
    root.appendChild(back);
    W.busy++; keys.clear(); inp.jx = inp.jy = 0;
    if (joyEl) joyEl.classList.remove('on');
    root.classList.add('talking');
    return {
      main, dlg: back, mode: 'dlg', place: W.place, placeId: W.placeId,
      tray(content) { G.ui.fillTray(tray, content); },
      trayEl: () => tray,
      refresh() { if (G.hud) G.hud.refresh(); },
      close() { closeDlg(this); },
    };
  }
  function closeDlg(ctx) {
    if (ctx.dlg.isConnected) ctx.dlg.remove();
    W.busy = Math.max(0, W.busy - 1);
    if (!W.busy && root) root.classList.remove('talking');
    W.closedAt = performance.now();
    refreshAvatar();
  }
  W.openDlg = openDlg; W.closeDlg = closeDlg;

  function npcLine(npc, t) {
    if (npc.who) return G.steps.line({ who: npc.who, t, sp: npc.sp }, null);
    return h('div.para.say.show', { style: { '--pc': '#5a4a3a' } },
      h('div.who', npc.sp && SP()[npc.sp] ? W.spriteFace(npc.sp) : h('span.face-blank', { style: { background: npc.color || '#8b7a64' } }, (npc.name || '').slice(0, 1))),
      h('div.bubble', h('span.nm', npc.name), boldNodes(fill(t))));
  }
  // 늘 하는 말: talk:[ [말, 말…], [말…] ] — 말을 걸 때마다 다음 묶음. 말 하나는 문자열 또는 { when, t } 또는 { card } 등
  async function chat(npc) {
    let lines;
    if (npc.lines) lines = npc.lines;
    else {
      const all = npc.talk;
      const pick = all[npc.ti % all.length]; npc.ti++; lines = [].concat(pick);
    }
    lines = lines.filter((l) => typeof l === 'string' || G.steps.ok(l.when));
    const ctx = openDlg({ small: true });
    const box = h('div.says'); ctx.main.appendChild(box);
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      let el;
      if (typeof l === 'string') el = npc.sp || npc.who ? npcLine(npc, l) : h('div.para.narr.show', boldNodes(fill(l)));
      else if (l.t != null && !l.who && (npc.sp || npc.who)) el = npcLine(npc, l.t);
      else el = G.steps.line(l, ctx);
      if (!el) continue;
      box.appendChild(el);
      G.ui.reveal(el);
      await G.steps.nextButton(ctx, i === lines.length - 1 ? '닫기' : '▶');
    }
    closeDlg(ctx);
  }
  W.chat = chat;
  // 맵 위 작은 대화창에 줄 몇 개를 보여 준다(목표의 say)
  async function sayLines(lines, ctx0) {
    const ctx = ctx0 || openDlg({ small: true });
    await G.steps.lines(lines, ctx);
    if (!ctx0) closeDlg(ctx);
  }
  W.sayLines = sayLines;

  // ───────── 그리기 ─────────
  // 스프라이트가 아직 없는 사람: 단색 사람 모양(머리·몸·그림자)으로 대신 그린다
  function drawFallback(e, x, y) {
    const c = e.color || '#5a4a3a';
    const bob = e.moving ? (Math.floor(e.t * 8) % 2) : 0;
    g.fillStyle = c;
    g.beginPath(); g.moveTo(x - 8, y - 2); g.lineTo(x + 8, y - 2); g.lineTo(x + 5, y - 22 - bob); g.lineTo(x - 5, y - 22 - bob); g.closePath(); g.fill();
    g.fillStyle = '#e9d3b0';
    g.beginPath(); g.arc(x, y - 28 - bob, 6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a2119';
    g.fillRect(x - 6, y - 35 - bob, 12, 4); // 머리카락·관
    // 바라보는 쪽 표시(눈)
    const ex = e.dir === 'left' ? -3 : e.dir === 'right' ? 3 : 0;
    if (e.dir !== 'up') { g.fillRect(x - 2 + ex, y - 29 - bob, 1, 2); g.fillRect(x + 2 + ex, y - 29 - bob, 1, 2); }
  }
  function drawChar(e, cx, cy) {
    const m = e.sp ? SP()[e.sp] : null, im = m ? img(e.sp) : null;
    const x = Math.round(e.x - cx), y = Math.round(e.y - cy);
    if (x < -70 || x > vw + 70 || y < -10 || y > vh + 80) return;
    g.fillStyle = 'rgba(26,18,40,.18)';
    g.beginPath(); g.ellipse(x + 1, y - 1, 11, 4, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(26,18,40,.26)';
    g.beginPath(); g.ellipse(x, y - 1, 7, 2.5, 0, 0, Math.PI * 2); g.fill();
    const al = e.alpha != null ? e.alpha : (m && m.alpha != null ? m.alpha : 1);
    if (al < 1) g.globalAlpha = al;
    if (!m || !im || !m.anims) { drawFallback(e, x, y); g.globalAlpha = 1; return; }
    let dir = e.dir, flip = 1;
    if (dir === 'right' && !m.anims.walk_right) { dir = 'left'; flip = -1; }
    const a = m.anims['walk_' + dir] || m.anims.walk_down || Object.values(m.anims)[0];
    const f = e.moving ? Math.floor(e.t * (a.fps || 8)) % a.n : 0;
    const i = a.start + f, sx = (i % m.cols) * m.fw, sy = Math.floor(i / m.cols) * m.fh;
    g.save();
    g.translate(x, y);
    g.scale(flip, 1);
    g.drawImage(im, sx, sy, m.fw, m.fh, -m.px, -m.py, m.fw, m.fh);
    g.restore();
    g.globalAlpha = 1;
  }
  function drawProp(p, cx, cy) {
    const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
    if (x > vw || y > vh || x + p.w < 0 || y + p.h < 0) return;
    if (p.missing) { drawShape(p, x, y); return; }
    const im = img(p.key); if (!im) return;
    g.drawImage(im, x, y);
  }
  // 그림이 아직 없는 소품: 단순한 도형으로 그린다(시안을 고르기 전 임시 그림, spec 13절).
  //  SPRITES의 shape: 'tree' 나무 · 'willow' 버드나무 · 'house' 집 · 'pavilion' 누각 · 'swing' 그네 · 'flowers' 꽃밭
  //   · 'rock' 바위 · 'mound' 봉분 · 'lantern' 등 · 'box' 상자(기본). color로 주된 색을 바꾼다.
  function drawShape(p, x, y) {
    const w = p.w, hh = p.h, c = p.color;
    const R = (cx, cy, rx, ry, col) => { g.fillStyle = col; g.beginPath(); g.ellipse(Math.round(cx), Math.round(cy), Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2); g.fill(); };
    const B = (bx, by, bw, bh, col) => { g.fillStyle = col; g.fillRect(Math.round(bx), Math.round(by), Math.round(bw), Math.round(bh)); };
    switch (p.shape) {
      case 'tree':
        B(x + w / 2 - 3, y + hh * 0.55, 6, hh * 0.45, '#6e4a2c');
        R(x + w / 2, y + hh * 0.38, w * 0.46, hh * 0.36, '#2f5a2a');
        R(x + w / 2 - 3, y + hh * 0.33, w * 0.36, hh * 0.27, c || '#4f7d3a');
        R(x + w / 2 - 6, y + hh * 0.26, w * 0.16, hh * 0.1, '#7ba556');
        break;
      case 'willow': {
        B(x + w / 2 - 3, y + hh * 0.45, 6, hh * 0.55, '#6b4a30');
        R(x + w / 2, y + hh * 0.28, w * 0.45, hh * 0.24, c || '#6f9a4a');
        g.strokeStyle = '#86b25c'; g.lineWidth = 1;
        for (let i = 0; i < 9; i++) {
          const sx = x + w * (0.12 + i * 0.095);
          g.beginPath(); g.moveTo(Math.round(sx) + 0.5, y + hh * 0.3); g.lineTo(Math.round(sx + 2) + 0.5, y + hh * (0.62 + (i % 3) * 0.06)); g.stroke();
        }
        break;
      }
      case 'house':
        B(x + 3, y + hh * 0.45, w - 6, hh * 0.55, c || '#d9c7a2');
        B(x + w / 2 - 5, y + hh * 0.66, 10, hh * 0.34, '#6e4a2c');
        g.fillStyle = '#3a3d45'; g.beginPath(); g.moveTo(x - 2, y + hh * 0.5); g.lineTo(x + w + 2, y + hh * 0.5); g.lineTo(x + w - 8, y + hh * 0.12); g.lineTo(x + 8, y + hh * 0.12); g.closePath(); g.fill();
        B(x + 6, y + hh * 0.12, w - 12, 2, '#545964');
        break;
      case 'pavilion':
        B(x + 2, y + hh * 0.72, w - 4, hh * 0.12, '#8a6a48');
        for (const k of [0.12, 0.42, 0.72]) B(x + w * k, y + hh * 0.38, 4, hh * 0.36, c || '#9b3a2e');
        g.fillStyle = '#33363c'; g.beginPath(); g.moveTo(x - 4, y + hh * 0.4); g.quadraticCurveTo(x + w / 2, y + hh * 0.3, x + w + 4, y + hh * 0.4); g.lineTo(x + w - 10, y + hh * 0.08); g.lineTo(x + 10, y + hh * 0.08); g.closePath(); g.fill();
        B(x + 2, y + hh * 0.84, w - 4, hh * 0.16, '#6e5236');
        break;
      case 'swing':
        B(x + 3, y + 4, 3, hh - 4, '#6e4a2c'); B(x + w - 6, y + 4, 3, hh - 4, '#6e4a2c'); B(x + 1, y + 3, w - 2, 3, '#5a3a1f');
        g.strokeStyle = '#e9dcbc'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x + w * 0.35 + 0.5, y + 6); g.lineTo(x + w * 0.35 + 0.5, y + hh * 0.72); g.moveTo(x + w * 0.65 + 0.5, y + 6); g.lineTo(x + w * 0.65 + 0.5, y + hh * 0.72); g.stroke();
        B(x + w * 0.3, y + hh * 0.72, w * 0.4, 3, c || '#b3342a');
        break;
      case 'flowers': {
        const cols = c ? [c, '#f6f1e2'] : ['#e39aa6', '#f2d667', '#f6f1e2', '#d36a7a'];
        for (let i = 0; i < 14; i++) { const fx = x + 3 + G.tiles.rnd(i, 1, 7) * (w - 6), fy = y + 3 + G.tiles.rnd(i, 2, 7) * (hh - 6); B(fx, fy, 2, 2, cols[i % cols.length]); B(fx, fy + 2, 1, 2, '#4c6f2d'); }
        break;
      }
      case 'rock':
        R(x + w / 2, y + hh * 0.62, w * 0.46, hh * 0.36, '#6f6a62'); R(x + w / 2 - 3, y + hh * 0.55, w * 0.34, hh * 0.24, c || '#9b958a');
        break;
      case 'mound':
        R(x + w / 2, y + hh * 0.65, w * 0.48, hh * 0.33, '#4c6f2d'); R(x + w / 2, y + hh * 0.6, w * 0.4, hh * 0.24, c || '#6f9a4a');
        break;
      case 'lantern':
        B(x + w / 2 - 1, y + hh * 0.35, 3, hh * 0.65, '#3a2a1c'); R(x + w / 2, y + hh * 0.28, w * 0.28, hh * 0.16, c || '#f2a541');
        break;
      default:
        B(x + 2, y + 2, w - 4, hh - 4, c || '#8a5d33');
        B(x + 2, y + hh / 2 - 1, w - 4, 2, '#6e4726'); B(x + w / 2 - 1, y + 2, 2, hh - 4, '#6e4726');
        g.strokeStyle = '#2a2119'; g.lineWidth = 1; g.strokeRect(x + 2.5, y + 2.5, w - 5, hh - 5);
    }
  }
  function marker(x, y, kind) {
    const b = calm ? 0 : Math.round(Math.sin(time * 5) * 2);
    y = Math.round(y + b); x = Math.round(x);
    if (kind === 'goal') {
      g.fillStyle = '#1b1612'; g.fillRect(x - 5, y - 13, 11, 13);
      g.fillStyle = '#f2c94c'; g.fillRect(x - 4, y - 12, 9, 11);
      g.fillStyle = '#1b1612'; g.fillRect(x - 1, y - 11, 3, 6); g.fillRect(x - 1, y - 4, 3, 2);
      g.fillStyle = '#1b1612'; g.fillRect(x - 1, y, 3, 2);
    } else {
      g.fillStyle = '#1b1612'; g.fillRect(x - 6, y - 9, 13, 9);
      g.fillStyle = '#f7efdc'; g.fillRect(x - 5, y - 8, 11, 7);
      g.fillStyle = '#5a4a3a'; g.fillRect(x - 3, y - 5, 1, 1); g.fillRect(x, y - 5, 1, 1); g.fillRect(x + 3, y - 5, 1, 1);
      g.fillStyle = '#1b1612'; g.fillRect(x - 1, y, 3, 2);
    }
  }
  function headY(e) { const m = e.sp ? SP()[e.sp] : null; return e.y - (m && m.img && m.py != null ? m.py - 6 : 42) + 4; }
  // 이름표 높이(맵 픽셀). 머리 위 표시·이름표가 위쪽 HUD에 닿으면 발밑으로 내려 그린다
  const labelH = () => (24.5 * dpr) / scale;
  const flipBelow = (headWy, cy, withLabel) => headWy - cy - 16 - (withLabel ? labelH() : 0) <= safe.top;
  function targetPos(id) {
    if (M.npcs[id]) { const e = M.npcs[id]; return [e.x, headY(e), e.name, e.y]; }
    const s = M.spots[id] || M.doors[id]; if (s) return [s.rx + s.rw / 2, s.ry + s.rh / 2 - (s.mh || 20), s.name || '', s.ry + s.rh];
    return null;
  }
  // 대상이 있는 맵(지금 거점의 맵들에서 찾는다). 지금 맵에 있으면 지금 맵
  function mapOf(id) {
    if (M.npcs[id] || M.spots[id] || M.doors[id]) return M.id;
    const pl = W.place || {};
    for (const mid in pl.maps || {}) {
      const d = pl.maps[mid] || {};
      if ((d.spots && d.spots[id]) || (d.npcs && d.npcs[id]) || (pl.cast && pl.cast[mid] && pl.cast[mid][id])) return mid;
    }
    return null;
  }
  // 다른 맵에 있는 대상으로 가는 지금 맵의 입구(입구를 따라 가장 짧게 이어지는 첫 입구)
  function doorToward(mapId) {
    if (!mapId || mapId === M.id) return null;
    const pl = W.place || {};
    const doorsOf = (mid) => (mid === M.id ? M.def.doors : ((pl.maps || {})[mid] || W.mapDef(mid) || {}).doors) || {};
    const seen = new Set([M.id]);
    let frontier = Object.keys(M.def.doors || {}).map((did) => ({ first: did, at: (M.def.doors[did] || {}).to }));
    while (frontier.length) {
      const nextF = [];
      for (const f of frontier) {
        if (!f.at || seen.has(f.at)) continue;
        if (f.at === mapId) return f.first;
        seen.add(f.at);
        for (const did in doorsOf(f.at)) nextF.push({ first: f.first, at: doorsOf(f.at)[did].to });
      }
      frontier = nextF;
    }
    return null;
  }
  // 은은한 빛: 사람은 발밑, 자리·입구는 그 자리 전체를 둥글게
  function glowAt(id, cx, cy) {
    const k = calm ? 0.85 : 0.72 + 0.28 * Math.sin(time * 2.6);
    let x, y, rx, ry;
    if (M.npcs[id]) { const e = M.npcs[id]; x = e.x; y = e.y - 12; rx = 24; ry = 22; }
    else { const s = M.spots[id] || M.doors[id]; if (!s) return; x = s.rx + s.rw / 2; y = s.ry + s.rh / 2; rx = s.rw / 2 + 12; ry = s.rh / 2 + 12; }
    x -= cx; y -= cy;
    g.save();
    g.globalCompositeOperation = 'lighter';
    g.translate(x, y); g.scale(1, ry / rx);
    const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx);
    gr.addColorStop(0, `rgba(255,214,120,${0.42 * k})`); gr.addColorStop(0.55, `rgba(255,190,90,${0.2 * k})`); gr.addColorStop(1, 'rgba(255,170,60,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  // ───────── 그림자·빛·떠다니는 것 ─────────
  // 소품 그림자: 그림의 실루엣을 납작하게 눕혀 오른쪽 아래로 드리운다(낮에만). 한 번 만든 실루엣은 다시 쓴다
  const sils = {};
  function silhouette(key) {
    if (sils[key]) return sils[key];
    const im = img(key); if (!im) return null;
    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(im, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#1a1430'; x.fillRect(0, 0, c.width, c.height);
    return (sils[key] = c);
  }
  function propShadow(p, cx, cy) {
    const x = Math.round(p.x - cx), base = Math.round(p.sortY - cy);
    if (x > vw + 120 || base < -20 || x + p.w < -160 || base - p.h > vh + 60) return;
    // 발밑 접지 그림자
    const fw = p.box ? (p.box[2] - p.box[0]) : p.w * 0.6;
    g.fillStyle = 'rgba(26,20,40,.22)';
    g.beginPath(); g.ellipse(x + p.w / 2, base - 1, Math.max(6, fw * 0.55), Math.max(3, Math.min(8, fw * 0.12)), 0, 0, Math.PI * 2); g.fill();
    if (M.night || p.missing || p.noShadow) return;
    const s = silhouette(p.key); if (!s) return;
    const hb = base - (p.y - cy);
    g.save();
    g.globalAlpha = 0.24;
    g.translate(x, base);
    g.transform(1, 0, -0.42, -0.3, 0, 0);
    g.drawImage(s, 0, -hb);
    g.restore();
  }
  // 떠다니는 것: motes(햇빛 먼지) · petals(꽃잎) · fireflies(반딧불) · gulls(갈매기와 그 그림자)
  const amb = [];
  function spawnAmb(kind, anywhere) {
    const r = Math.random;
    const x = cam.x + r() * vw, y = anywhere ? cam.y + r() * vh : cam.y - 8;
    if (kind === 'gulls') return { kind, x: cam.x - 30, y: cam.y + 40 + r() * (vh - 80), z: 70 + r() * 40, vx: 28 + r() * 14, vy: (r() - 0.5) * 6, t: r() * 5, life: 99 };
    return { kind, x, y, z: 0, vx: (r() - 0.5) * 8, vy: kind === 'petals' ? 10 + r() * 8 : (r() - 0.5) * 5, t: r() * 6, life: 5 + r() * 6, ph: r() * 6 };
  }
  function updateAmbient(dt) {
    const kind = M.pal && M.pal.ambient;
    if (!kind) return;
    if (kind === 'gulls') {
      if (amb.length < 3 && Math.random() < dt * 0.25) { const b = spawnAmb('gulls'); amb.push(b); if (Math.random() < 0.6) amb.push(Object.assign({}, b, { x: b.x - 18, y: b.y + 10, t: b.t + 0.4 })); }
    } else {
      const want = kind === 'fireflies' ? 18 : kind === 'petals' ? 16 : 12;
      while (amb.length < want) amb.push(spawnAmb(kind, true));
    }
    for (let i = amb.length - 1; i >= 0; i--) {
      const p = amb[i]; p.t += dt;
      if (p.kind === 'petals') { p.x += (p.vx + Math.sin(p.t * 1.6 + p.ph) * 10) * dt; p.y += p.vy * dt; }
      else if (p.kind === 'gulls') { p.x += p.vx * dt; p.y += p.vy * dt; }
      else { p.x += (p.vx + Math.sin(p.t * 0.9 + p.ph) * 4) * dt; p.y += (p.vy + Math.cos(p.t * 0.7 + p.ph) * 3) * dt; }
      const out = p.x < cam.x - 60 || p.x > cam.x + vw + 60 || p.y < cam.y - 60 || p.y > cam.y + vh + 30;
      if ((p.kind !== 'gulls' && p.t > p.life) || out) { amb.splice(i, 1); if (p.kind !== 'gulls') amb.push(spawnAmb(p.kind, p.kind !== 'petals')); }
    }
  }
  function drawAmbient(cx, cy, glowPass) {
    for (const p of amb) {
      const x = Math.round(p.x - cx), y = Math.round(p.y - cy);
      const fade = p.kind === 'gulls' ? 1 : Math.max(0, Math.min(1, p.t / 1.2, (p.life - p.t) / 1.2));
      if (p.kind === 'fireflies') {
        if (!glowPass) continue;
        const a = fade * (0.55 + 0.45 * Math.sin(p.t * 3 + p.ph));
        g.globalCompositeOperation = 'lighter';
        const gr = g.createRadialGradient(x, y, 0, x, y, 7); gr.addColorStop(0, `rgba(255,214,120,${0.55 * a})`); gr.addColorStop(1, 'rgba(255,180,80,0)');
        g.fillStyle = gr; g.fillRect(x - 7, y - 7, 14, 14);
        g.globalCompositeOperation = 'source-over';
        g.fillStyle = `rgba(255,240,190,${a})`; g.fillRect(x, y, 1, 1);
        continue;
      }
      if (glowPass) continue;
      if (p.kind === 'motes') { g.fillStyle = `rgba(255,244,210,${0.65 * fade * (0.5 + 0.5 * Math.sin(p.t * 2 + p.ph))})`; g.fillRect(x, y, 1, 1); }
      else if (p.kind === 'petals') { g.fillStyle = `rgba(246,178,198,${fade})`; if (Math.sin(p.t * 5 + p.ph) > 0) g.fillRect(x, y, 2, 1); else g.fillRect(x, y, 1, 2); g.fillStyle = `rgba(255,224,232,${fade})`; g.fillRect(x, y, 1, 1); }
      else if (p.kind === 'gulls') {
        const flap = Math.floor(p.t * 6) % 2;
        // 땅에 진 그림자
        g.fillStyle = 'rgba(20,20,40,.16)'; g.fillRect(x - 2, y, 5, 1);
        const by = y - Math.round(p.z);
        g.fillStyle = '#f6f4ee';
        if (flap) { g.fillRect(x - 3, by - 1, 2, 1); g.fillRect(x + 2, by - 1, 2, 1); g.fillRect(x - 1, by, 3, 1); }
        else { g.fillRect(x - 3, by + 1, 2, 1); g.fillRect(x - 1, by, 3, 1); g.fillRect(x + 2, by + 1, 2, 1); }
        g.fillStyle = '#3a3a44'; g.fillRect(x - 4, by + (flap ? -1 : 1), 1, 1); g.fillRect(x + 4, by + (flap ? -1 : 1), 1, 1);
      }
    }
  }
  // 구름 그늘(낮): 땅 위를 천천히 지나간다
  function drawClouds(cx, cy) {
    const L = M.pal.light || {};
    if (M.night || !L.cloud) return;
    for (let i = 0; i < 3; i++) {
      const span = M.w + 700;
      const wx = ((i * 0.37 * span + time * (7 + i * 2)) % span) - 350;
      const wy = (0.2 + 0.3 * i) * M.h + Math.sin(time * 0.05 + i) * 20;
      const x = wx - cx, y = wy - cy;
      if (x < -260 || x > vw + 260 || y < -200 || y > vh + 200) continue;
      g.save(); g.translate(x, y); g.scale(1.8, 1);
      const gr = g.createRadialGradient(0, 0, 10, 0, 0, 110);
      gr.addColorStop(0, 'rgba(30,36,70,.13)'); gr.addColorStop(1, 'rgba(30,36,70,0)');
      g.fillStyle = gr; g.fillRect(-110, -110, 220, 220);
      g.restore();
    }
  }
  // 화면 빛: 낮은 햇빛·그늘·가장자리, 밤은 쪽빛 어둠에 등불 구멍과 따뜻한 빛 번짐
  function drawLight(cx, cy) {
    const L = M.pal.light || {};
    if (M.night) {
      gd.globalCompositeOperation = 'source-over';
      gd.clearRect(0, 0, vw, vh);
      gd.fillStyle = 'rgba(12,16,48,.74)'; gd.fillRect(0, 0, vw, vh);
      gd.globalCompositeOperation = 'destination-out';
      const hole = (x, y, r, k = 1) => { const gr = gd.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(0,0,0,${k})`); gr.addColorStop(0.5, `rgba(0,0,0,${0.62 * k})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); gd.fillStyle = gr; gd.fillRect(x - r, y - r, r * 2, r * 2); };
      hole(P.x - cx, P.y - cy - 16, 66, 0.8);
      M.lights.forEach((l, i) => { l._k = 1 + 0.04 * Math.sin(time * 7 + i * 1.7) + (l.fire ? Math.random() * 0.06 : 0.015 * Math.sin(time * 23 + i)); hole(l.x - cx, l.y - cy, l.r * 1.25 * l._k); });
      for (const f of M.fires) hole(f[0] - cx, f[1] - cy - 10, 120 + Math.random() * 12);
      g.drawImage(dark, 0, 0);
      // 따뜻한 빛 번짐(더하기 섞기)
      g.save();
      g.globalCompositeOperation = 'lighter';
      const glow = (x, y, r, a) => { const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,176,86,${a})`); gr.addColorStop(0.45, `rgba(255,140,60,${a * 0.4})`); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); };
      M.lights.forEach((l) => {
        const x = l.x - cx, y = l.y - cy;
        if (x < -l.r * 2 || x > vw + l.r * 2 || y < -l.r * 2 || y > vh + l.r * 2) return;
        glow(x, y, l.r * (l._k || 1), l.fire ? 0.36 : 0.26);
        // 물에 비친 등불: 아래쪽 물칸에 흔들리는 빛줄기
        for (let k = 1; k <= 4; k++) {
          const ty = Math.floor((l.foot + k * T * 0.8) / T), tx = Math.floor(l.x / T);
          const c = M.grid[ty] && M.grid[ty][tx];
          if (!c || !G.tiles.WATER.has(c)) continue;
          const yy = Math.round(l.foot - cy + k * T * 0.8);
          for (let j = 0; j < 3; j++) {
            const ww = 10 - k * 1.5 + Math.sin(time * 3 + j * 2 + k) * 3;
            g.fillStyle = `rgba(255,190,100,${0.32 - k * 0.05})`;
            g.fillRect(Math.round(x - ww / 2 + Math.sin(time * 2.4 + j + k) * 2), yy + j * 6 - 6, Math.max(2, Math.round(ww)), 1);
          }
        }
      });
      for (const f of M.fires) glow(f[0] - cx, f[1] - cy - 10, 130, 0.3);
      g.restore();
    } else {
      g.save();
      g.globalCompositeOperation = 'soft-light';
      const lg = g.createLinearGradient(0, 0, vw, vh);
      lg.addColorStop(0, L.sun || 'rgba(255,214,150,.2)'); lg.addColorStop(1, L.shade || 'rgba(70,50,110,.2)');
      g.fillStyle = lg; g.fillRect(0, 0, vw, vh);
      g.restore();
    }
    // 가장자리를 살짝 어둡게(그림책 장면처럼 가운데로 눈이 가게)
    const v = L.vignette != null ? L.vignette : 0.3;
    if (v > 0) {
      const r = Math.hypot(vw, vh) / 2;
      const vg = g.createRadialGradient(vw / 2, vh / 2, r * 0.45, vw / 2, vh / 2, r);
      vg.addColorStop(0, 'rgba(20,14,40,0)'); vg.addColorStop(1, `rgba(20,14,40,${v})`);
      g.fillStyle = vg; g.fillRect(0, 0, vw, vh);
    }
  }

  function render() {
    const cx = Math.round(cam.x), cy = Math.round(cam.y);
    G.tiles.use(M.theme);
    g.fillStyle = '#14161c'; g.fillRect(0, 0, vw, vh);
    const gx = Math.max(0, cx), gy = Math.max(0, cy);
    const gw = Math.min(M.w - gx, vw - (gx - cx)), gh = Math.min(M.h - gy, vh - (gy - cy));
    if (gw > 0 && gh > 0) g.drawImage(M.ground.canvas, gx, gy, gw, gh, gx - cx, gy - cy, gw, gh);
    // 맵 위·아래 바깥: 가장자리 땅을 거울처럼 비춰 어둡게(HUD 안전 여백만큼 물러섰을 때)
    if (gw > 0) {
      const edge = (h, srcY, dstY, fromTop) => {
        h = Math.min(h, M.h); if (h <= 0) return;
        g.save(); g.translate(0, dstY + h); g.scale(1, -1);
        g.drawImage(M.ground.canvas, gx, srcY, gw, h, gx - cx, 0, gw, h);
        g.restore();
        const gr = g.createLinearGradient(0, dstY, 0, dstY + h);
        gr.addColorStop(fromTop ? 0 : 1, 'rgba(14,16,34,.82)'); gr.addColorStop(fromTop ? 1 : 0, 'rgba(14,16,34,.45)');
        g.fillStyle = gr; g.fillRect(0, dstY, vw, h);
      };
      if (cy < 0) edge(-cy, 0, 0, true);
      if (cy + vh > M.h) edge(cy + vh - M.h, M.h - Math.min(M.h, cy + vh - M.h), M.h - cy, false);
    }
    // 물결·반짝임·물거품
    G.tiles.animate(g, M.ground, cx, cy, vw, vh, time);
    for (const p of M.props) if (p.flat) drawProp(p, cx, cy);
    for (const p of M.props) if (!p.flat) propShadow(p, cx, cy);
    const list = [];
    for (const p of M.props) if (!p.flat) list.push([p.sortY, p]);
    for (const e of M.chars) list.push([e.y, e]);
    list.sort((a, b) => a[0] - b[0]);
    for (const [, o] of list) (o.kind === 'prop' ? drawProp : drawChar)(o, cx, cy);
    const drawParts = (glow) => {
      for (const p of parts) {
        if (!!p.glow !== glow) continue;
        g.globalAlpha = Math.min(1, (1 - p.t / p.life) * 1.6);
        g.fillStyle = p.c;
        g.fillRect(Math.round(p.x - cx), Math.round(p.y - cy - p.z), p.s, p.s);
      }
      g.globalAlpha = 1;
    };
    drawParts(false);
    if (!calm) { drawAmbient(cx, cy, false); drawClouds(cx, cy); }
    drawLight(cx, cy);
    drawParts(true);
    if (!calm) drawAmbient(cx, cy, true);
    // 지금 할 일의 위치 표시: 화면 안이면 은은한 빛 + 표지, 밖이면 가장자리 화살표.
    //  다른 맵에 있는 대상은 그리로 가는 입구를 가리킨다
    const labels = [];
    const ind = { glow: [], arrows: [], via: {} };
    if (goal && goal.targets && !W.busy) {
      const points = [];
      for (const id of goal.targets) {
        const here = mapOf(id) === M.id;
        const pid = here ? id : doorToward(mapOf(id));
        if (!pid) continue;
        if (!here) (ind.via[pid] = ind.via[pid] || []).push(id);
        if (!points.includes(pid)) points.push(pid);
      }
      for (const id of points) {
        const tp = targetPos(id); if (!tp) continue;
        const [x, y, nm, fy] = tp;
        const inView = x - cx > 8 && x - cx < vw - 8 && fy - cy > safe.top + 4 && y - cy < vh - safe.bottom - 8;
        if (inView) {
          glowAt(id, cx, cy);
          ind.glow.push(id);
          const withLabel = goal.labels !== false;
          const text = M.doors[id] ? (M.doors[id].name || nm) : goal.labelOf ? goal.labelOf(id) || nm : nm;
          if (!flipBelow(y, cy, withLabel)) { marker(x - cx, y - cy, 'goal'); if (withLabel) labels.push([x - cx, y - cy - 16, text]); }
          else { marker(x - cx, fy - cy + 16, 'goal'); if (withLabel) labels.push([x - cx, fy - cy + 18 + labelH(), text]); }
        } else { edgeArrow(x - cx, y - cy); ind.arrows.push(id); }
      }
    }
    lastInd = ind;
    if (!W.busy) for (const id in M.npcs) {
      const e = M.npcs[id];
      if (!e.talk || (goal && goal.targets && goal.targets.includes(id))) continue;
      if (Math.hypot(e.x - P.x, e.y - P.y) < 70) marker(e.x - cx, (flipBelow(headY(e), cy, false) ? e.y + 16 : headY(e)) - cy, 'talk');
    }
    g0.drawImage(buf, 0, 0, vw, vh, 0, 0, vw * scale, vh * scale);
    // 이름표(또렷하게 원래 해상도로): 쪽빛 판에 상아색 글, 둘레에 등불빛 실선
    if (labels.length && labelsOn) {
      const fs = Math.round(12.5 * dpr);
      g0.font = `700 ${fs}px ${W.font || (W.font = getComputedStyle(document.documentElement).getPropertyValue('--serif') || 'serif')}`;
      g0.textAlign = 'center'; g0.textBaseline = 'middle';
      for (const [x, y, s] of labels) {
        if (!s) continue;
        const X = x * scale, Y = y * scale;
        const tw = g0.measureText(s).width + 16 * dpr, th = fs + 10 * dpr;
        const bx = X - tw / 2, by = Y - th - 2 * dpr;
        g0.fillStyle = 'rgba(28,36,66,.9)';
        g0.beginPath(); if (g0.roundRect) g0.roundRect(bx, by, tw, th, th / 2); else g0.rect(bx, by, tw, th); g0.fill();
        g0.strokeStyle = 'rgba(255,214,140,.55)'; g0.lineWidth = Math.max(1, dpr); g0.stroke();
        g0.fillStyle = '#f7eedb';
        g0.fillText(s, X, by + th / 2 + 0.5 * dpr);
      }
    }
  }
  function edgeArrow(x, y) {
    const m = 14;
    const ex = clamp(x, m, vw - m), ey = clamp(y, safe.top + m, vh - safe.bottom - m);
    const a = Math.atan2(y - ey, x - ex);
    g.save(); g.translate(Math.round(ex), Math.round(ey)); g.rotate(a);
    const b = calm ? 0 : Math.sin(time * 6) * 2;
    g.fillStyle = '#1b1612'; g.beginPath(); g.moveTo(9 + b, 0); g.lineTo(-6 + b, -8); g.lineTo(-6 + b, 8); g.closePath(); g.fill();
    g.fillStyle = '#f2c94c'; g.beginPath(); g.moveTo(6 + b, 0); g.lineTo(-4 + b, -5); g.lineTo(-4 + b, 5); g.closePath(); g.fill();
    g.restore();
  }

  function loop(now) {
    if (!running) return;
    if (!cv || !cv.isConnected) { running = false; keys.clear(); return; }
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000; last = now;
    if (!M || !P) return; // 맵을 불러오는 중
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    const step = 1 / 60;
    let n = 0;
    try {
      while (acc >= step && n < 6) { update(step); acc -= step; n++; }
      if (n === 6) acc = 0;
      render();
    } catch (e) {
      if (!W._err) { W._err = true; console.error(e); } // 한 번만 알리고 계속 돈다
    }
  }

  function padState(near) {
    if (!talkBtn) return;
    const lab = near ? (near.type === 'npc' ? '말 걸기' : (near.s.act || '살피기')) : '';
    talkBtn.classList.toggle('on', !!near);
    if (talkBtn._lab !== lab) {
      talkBtn._lab = lab;
      talkBtn.querySelector('.pl').textContent = lab || '말 걸기';
      talkBtn.setAttribute('aria-label', lab || '말 걸기');
      talkBtn.querySelector('.pic').innerHTML = ACT_ICON[near && near.type === 'spot' ? 'look' : 'talk'];
    }
  }

  // ───────── 목표 기다리기 ─────────
  //  G.world.waitGoal({ text, targets:[id], zones:[id], repeat:[id], locked:{ id:[줄] }, labels, labelOf }) → Promise<이룬 대상 id>
  //   - targets: 말 걸기·살피기로 이루는 대상(사람·자리). 위치 표시(빛·화살표)가 이것을 가리킨다
  //   - zones: 밟으면 저절로 이루는 자리(targets에도 넣는다)
  //   - repeat: 목표가 이어지는 동안 몇 번이든 들어갈 수 있는 구역(밟으면 이룸, 한 번 벗어나야 다시 열림. 위치 표시는 targets에 넣을 때만)
  //   - locked: 아직 열리지 않은 대상 → 다가가 누르면 그 줄(열림 조건 안내)만 보인다
  //  바깥(다른 작업의 화면)에서도 부를 수 있다. 새 목표를 걸면 앞 목표는 버려진다(약속은 풀리지 않는다).
  function waitGoal(o) {
    return new Promise((res) => {
      const armed = {};
      for (const sid of o.repeat || []) armed[sid] = !(M && inRect(M.spots[sid]));
      goal = Object.assign({}, o, {
        armed,
        hit(id) { if (goal !== this) return; goal = null; if (G.hud) G.hud.goal(''); res(id); },
      });
      if (G.hud) G.hud.goal(fill(o.text || ''));
    });
  }
  W.waitGoal = waitGoal;
  W.goal = () => goal;

  // ───────── 거점 진행 ─────────
  //  목표(beat): { id, goal:'화면에 보일 할 일', 할 일 하나, steps:['단계 id'…], 그 밖 }
  //   할 일: talk:'사람 id'(말 걸기) · at:'자리 id'(살피기) · go:'자리 id'(밟기) · pick:{ 자리·사람 id: 선택지 번호 } · auto:true(바로)
  //   그 밖: map·spawn(맵 옮기기) · show:{id:{사람}} · hide:['id'] · night · fire:[[x,y]] · say:[줄…](먼저 할 말) · music · avatar
  //          then:{ show·hide·night·fire }(단계가 끝난 뒤) · when(조건) · inline:true(단계를 맵 위 작은 창에서)
  //  순서 없는 할 일(3막): { id, goal, tasks:[할 일…], repeat:[구역…], finish?:조건, finishGoal?:'글' }
  //   할 일 하나: { id, talk|at|go:'대상 id', steps:[…], need?:['다른 할 일 id'…] 또는 조건(when 꼴·함수), lockHint?:[줄…],
  //               label?, say?, fx?(마친 뒤 효과), then?, when?, inline? }
  //    - 열린 할 일(need가 찬 것)은 모두 함께 목표가 되고 어느 것부터 해도 된다. 마친 할 일은 장부 'b:거점:목표.할 일'에 남는다.
  //   구역 하나: { id, go:'자리 id', steps:[…], back?:[x, y, '방향'](끝난 뒤 설 자리), say?, fx?, when? }
  //    - 목표가 이어지는 동안 몇 번이든 들어갈 수 있다(단계는 매번 다시 펼친다 — runSteps의 again).
  //   finish: 할 일을 모두 마친 뒤에도 더 채워야 할 조건(예: 경계를 겪음). 차지 않았으면 지금 할 일이 구역을 가리킨다(finishGoal).
  function castFor(place, mapId) { return (place.cast && place.cast[mapId]) || {}; }
  function applyCast(b) {
    if (b.hide) for (const id of [].concat(b.hide)) removeNpc(id);
    if (b.show) for (const id in b.show) addNpc(id, b.show[id]);
    if (b.fire) M.fires = b.fire.map(([x, y]) => [(x + 0.5) * T, (y + 0.8) * T]);
    if (b.night != null) M.night = b.night;
  }
  // 이 맵에 이미 지난 목표들의 사람 바꾸기(show·hide·then)를 다시 얹는다(입구로 돌아왔을 때·이어 하기)
  function applyCastHere(place, mapId) {
    const st = S();
    const pid = place.id || W.placeId;
    let here = place.map;
    for (const b of place.beats || []) {
      if (!G.steps.ok(b.when)) continue;
      if (b.map) here = b.map;
      if (!st.done[G.app.key.beat(pid, b.id)]) break;
      if (here !== mapId) continue;
      applyCast(b);
      if (b.then) applyCast(b.then);
    }
  }
  const textOf = (t) => (typeof t === 'function' ? t(S()) : t) || '';
  const targetOf = (t) => t.talk || t.at || t.go || null;

  async function runTasks(b, place) {
    const st = S();
    const pid = place.id || W.placeId;
    const token = G.app._playToken;
    const kOf = (t) => G.app.key.task(pid, b.id, typeof t === 'string' ? t : t.id);
    const needOk = (t) => {
      if (!t.need) return true;
      if (typeof t.need === 'string' || Array.isArray(t.need)) return [].concat(t.need).every((n) => !!st.done[kOf(n)]);
      return G.steps.ok(t.need);
    };
    for (let guard = 0; guard < 500; guard++) {
      const tasks = (b.tasks || []).filter((t) => G.steps.ok(t.when));
      const reps = (b.repeat || []).filter((r) => r.go && G.steps.ok(r.when));
      const left = tasks.filter((t) => !st.done[kOf(t)]);
      const allDone = !left.length;
      if (allDone && (!b.finish || G.steps.ok(b.finish))) return true;
      const open = left.filter(needOk), shut = left.filter((t) => !needOk(t));
      const locked = {};
      for (const t of shut) locked[targetOf(t)] = [].concat(t.lockHint || ((window.TEXTS || {}).LOCKED) || '아직 할 수 없어요.');
      const labelOf = (id) => { const t = tasks.find((x) => targetOf(x) === id); return t && t.label ? textOf(t.label) : null; };
      const hit = await waitGoal({
        text: textOf(allDone ? b.finishGoal || b.goal : b.goal),
        targets: allDone ? reps.map((r) => r.go) : open.map(targetOf),
        zones: allDone ? [] : open.filter((t) => t.go).map(targetOf),
        repeat: reps.map((r) => r.go),
        locked, labels: b.label !== false, labelOf,
      });
      if (G.app._playToken !== token) return false;
      const task = open.find((t) => targetOf(t) === hit);
      const rep = !task && reps.find((r) => r.go === hit);
      const it = task || rep;
      if (!it) continue;
      if (it.say) await sayLines(it.say);
      if (it.steps && it.steps.length) await G.app.runSteps(place, it.steps, { inline: !!it.inline, again: !!rep });
      if (G.app._playToken !== token) return false;
      if (task) st.done[kOf(task)] = true;
      if (it.fx) G.steps.apply(it.fx);
      if (it.then) applyCast(it.then);
      if (rep && rep.back) placePlayer(rep.back);
      G.save.write();
    }
    return true;
  }

  async function runBeat(b, place) {
    W.avatarOverride = b.avatar || null;
    if (b.map && b.map !== M.id) await changeMap(b.map, b.spawn, castFor(place, b.map));
    else if (b.spawn && !b.map) placePlayer(b.spawn);
    refreshAvatar();
    applyCast(b);
    if (b.music) W.setMusic(b.music);
    const text = textOf(b.goal);
    let preset = null;
    if (b.say) await sayLines(b.say);
    if (b.tasks || b.repeat) {
      const ok = await runTasks(b, place);
      if (!ok) return false;
    } else if (b.pick) {
      const id = await waitGoal({ text, targets: Object.keys(b.pick), labelOf: (id) => (M.spots[id] || M.npcs[id] || {}).name });
      if (b.steps && b.steps.length) preset = { [b.steps[0]]: b.pick[id] };
    } else if (b.talk || b.at) {
      await waitGoal({ text, targets: [b.talk || b.at], labels: b.label !== false });
    } else if (b.go) {
      await waitGoal({ text, targets: [b.go], zones: [b.go] });
    }
    if (b.steps && b.steps.length) await G.app.runSteps(place, b.steps, { preset, inline: !!b.inline });
    if (b.then) applyCast(b.then);
    return true;
  }

  W.play = async function (placeId) {
    const place = (window.PLACES || {})[placeId];
    const st = S();
    const token = G.app._playToken;
    W.placeId = placeId; W.place = place; W.avatarOverride = null;
    goal = null; W.busy = 0;
    parts.length = 0;
    const beats = place.beats || [];
    let start = beats.findIndex((b) => !st.done[G.app.key.beat(placeId, b.id)] && G.steps.ok(b.when));
    if (start < 0) start = beats.length;
    // 이어 하기: 맵은 그 앞 목표들이 옮겨 둔 곳(다음 할 일이 있는 지도)의 시작 지점에서
    let mapId = place.map, spawn = place.spawn;
    for (let i = 0; i <= Math.min(start, beats.length - 1); i++) { const b = beats[i]; if (!b || !G.steps.ok(b.when)) continue; if (b.map && b.map !== mapId) { mapId = b.map; spawn = b.spawn || null; } }
    P = null;
    W.mount(G.app.mapArea());
    await loadMap(mapId, spawn, castFor(place, mapId));
    applyCastHere(place, mapId);
    W.setMusic(place.music || (W.mapDef(mapId) || {}).music);
    if (G.hud) { G.hud.goal(''); G.hud.refresh(); }
    if (G.app._playToken !== token) return false;
    for (let i = start; i < beats.length; i++) {
      const b = beats[i];
      if (!G.steps.ok(b.when)) continue;
      const ok = await runBeat(b, place);
      if (ok === false || G.app._playToken !== token) return false;
      st.done[G.app.key.beat(placeId, b.id)] = true; G.save.write();
    }
    goal = null;
    if (G.hud) G.hud.goal('');
    return true;
  };

  // 시험 맵 들어가기(자동 점검·맵 만들 때 확인용): 목표 없이 걷기만 한다
  //  info를 주면 그 거점 이름·막·미션으로 HUD를 채운다(화면 사진용): { name, actName, mission }
  W.enterTest = async function (mapId = 'test', info) {
    const A = ((window.FLOW || {}).acts || {}).act1 || {};
    G.app.explore(info || { name: '시험 맵', actName: '시험', mission: A.mission || '' });
    W.placeId = null; W.place = null; W.avatarOverride = (W.mapDef(mapId) || {}).avatar || null; goal = null; W.busy = 0; P = null;
    W.mount(G.app.mapArea());
    await loadMap(mapId, null, {});
    if (G.hud) { G.hud.goal(''); G.hud.refresh(); }
    return true;
  };

  // ───────── 시험용 손잡이(자동 점검이 목표를 대신 이루거나 상태를 읽는다) ─────────
  W.test = {
    state: () => ({ map: M && M.id, goal: goal && { text: goal.text, targets: goal.targets }, busy: W.busy, paused: W.paused(), x: P && P.x, y: P && P.y, dir: P && P.dir, sp: P && P.sp, scale, vw, vh }),
    goal: () => (goal ? { text: goal.text, targets: (goal.targets || []).slice(), zones: (goal.zones || []).slice(), repeat: (goal.repeat || []).slice(), locked: Object.keys(goal.locked || {}) } : null),
    // 마지막으로 그린 위치 표시: { glow:[id], arrows:[id], via:{ 입구 id:[대상 id] } }
    indicator: () => JSON.parse(JSON.stringify(lastInd)),
    complete() {
      if (!goal || W.busy) return false;
      const t = goal.targets && goal.targets[Math.floor(Math.random() * goal.targets.length)];
      if (t) { goal.hit(t); return true; }
      return false;
    },
    targets: () => ((goal && goal.targets) || []).map((id) => {
      const e = M.npcs[id], s = M.spots[id], tp = targetPos(id);
      return { id, kind: e ? 'npc' : 'spot', x: e ? e.x : s ? s.rx + s.rw / 2 : tp && tp[0], y: e ? e.y : s ? s.ry + s.rh / 2 : tp && tp[1] + 40, zone: !!(goal.zones && goal.zones.includes(id)) };
    }),
    blocked: (x0, y0, x1, y1) => blocked(x0, y0, x1, y1, P),
    near: () => (W.near ? { type: W.near.type, id: W.near.id } : null),
    map: () => ({ id: M.id, T, w: M.gw, h: M.gh, grid: M.grid, night: M.night }),
    npcs: () => Object.values(M.npcs).map((e) => ({ id: e.id, name: e.name, x: e.x, y: e.y, talk: !!e.talk, sp: e.sp, spriteMissing: !SP()[e.sp] })),
    teleport(id) { const tp = targetPos(id); if (tp) { P.x = tp[0]; P.y = tp[1] + 30; snapCam(); } return !!tp; },
    doors: () => Object.keys((M && M.doors) || {}),
    labels(on) { labelsOn = on; },
    enter: (mapId, info) => W.enterTest(mapId, info),
    // 학생을 칸 (tx, ty)로 옮기고 카메라를 맞춘다
    // 사람(이름표 포함)의 화면 자리(CSS px, 맵 화면 기준): HUD에 가리는지 점검할 때
    screenOf(id) {
      const e = M.npcs[id]; if (!e || !root) return null;
      const k = scale / dpr, rb = root.getBoundingClientRect();
      // 몸 + 머리 위 표시·이름표(위쪽 HUD에 닿으면 발밑으로 내려 그리는 규칙을 그대로 따른다)
      const hy = headY(e), below = flipBelow(hy, Math.round(cam.y), true);
      const top = below ? hy - 4 : hy - 18 - labelH(), bot = below ? e.y + 18 + labelH() : e.y, x0 = e.x - 20, x1 = e.x + 20;
      return { l: rb.left + (x0 - cam.x) * k, r: rb.left + (x1 - cam.x) * k, t: rb.top + (top - cam.y) * k, b: rb.top + (bot - cam.y) * k };
    },
    safe: () => ({ top: safe.top, bottom: safe.bottom }),
    look(tx, ty, dir) { const [x, y] = freeSpot(...feet(tx, ty), 6); P.x = x; P.y = y; if (dir) P.dir = dir; snapCam(); },
  };
})();
