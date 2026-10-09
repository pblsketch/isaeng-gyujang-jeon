// 흐름 점검(plan T8, spec 17절 '흐름'·'소리 없이' + 이번 검토로 더한 것). 실제 크롬으로 처음부터 결과 화면까지 간다.
//  [1] 키보드만(PC 1366×860) — 타이틀 '시작' → 들어가기 → 1막 두 순간 → 2막 도적과 혼 → 3막 할 일 넷과 경계 → 이생에게 답하기
//      → 맺음(반복의 뜻) → 전기적 요소 한 줄 → 「만복사저포기」 → 결과. 그 사이에:
//      수단 반응 직후 다시 열기(써 본 차례가 남음) · 막 도중 창을 닫았다 열기(그 막의 다음 할 일부터) ·
//      빈칸에 맞지 않는 카드 → 다시 열기(첫 시도가 남음) → 다시 고름 → 결과에 첫 시도 · 3막 할 일 일부를 마친 뒤 다시 열기.
//      배경음: 거점마다 장면 자료의 music 열쇠가 고른 곡이 실제로 흐른다(첫 화면·옥루춘·마무리·결과 포함).
//      끝난 뒤 같은 기록으로 `?act=2`: '이어 하기 / 이 막부터' — 이어 하기는 결과로, 이 막부터는 1막 기록을 두고 2막부터 새로.
//  [2] 마우스(PC) — 배경음 파일을 모두 막은 채(route abort) 끝까지. 막은 요청 말고는 콘솔 오류 없음.
//  [3] 터치(휴대폰 가로 844×390) — 배경음을 끈 채 끝까지(곡 요청 0). 도중에 세로로 돌리면 돌려 달라는 안내.
//  [4] `?act=3`(새 기록) — 건너뛴 1·2막 30초 요약 카드 → 혼이 열린 채 3막 → 옥루춘 1~2구는 기본 장면 → 결과에 1·2막 '하지 않음'.
//  [5] 세로 화면 → 돌려 달라는 안내.
//  모든 맥락: 콘솔 오류 0, 바깥 요청 0, 저장 열쇠는 모두 'isaeng-gyujang:'로 시작. 선생님 기능(정답 보기·장면 건너뛰기·선생님 모드) 없음.
//  움직임은 그 판의 입력(방향키 / 마우스로 조이스틱 끌기 / 손가락으로 조이스틱 끌기)으로 걷는다. 말 걸 대상 곁으로는
//  시험 손잡이(G.world.test.teleport)로 옮기고, 말 걸기는 그 판의 입력(E / 말 걸기 단추 누름 / 손가락)으로 한다.
//  구역(밟기)·입구는 실제로 걸어 들어간다. 기록은 손대지 않는다(상태 주입 없음).
//  걸린 시간(자동 진행 기준)은 tests/shots/flow/timing.json에 남긴다 — docs/시범-플레이-시간.md의 바탕.
import fs from 'node:fs';
import path from 'node:path';
import { base } from './serve.mjs';
import { VIEWS, checker, launch, KEY_PREFIX, HERE } from './lib.mjs';

const c = checker();
const url = await base();
const browser = await launch();
const SHOTS = path.join(HERE, 'shots', 'flow');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
const T_ALL = Date.now();
const LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//;
const BGM_RE = /\/assets\/bgm\/[\w-]+\.mp3(\?.*)?$/;
const TEACHER = /선생님|교사 모드|정답 보기|정답|장면 건너뛰기|건너뛰기/;
const sec = (ms) => (ms / 1000).toFixed(1);

// ───────── 맥락 열기: 오류 모으기(배경음 파일을 일부러 막았을 때 그 요청만 정확히 뺀다) ─────────
async function openCtx(vp, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.dpr || 1, acceptDownloads: true });
  const R = { ctx, vp, errs: [], outside: [], blocked: [], bgmReq: [], page: null, cdp: null };
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (LOCAL.test(u) || /^(data|blob):/.test(u)) return route.continue();
    R.outside.push(u);
    return route.abort();
  });
  // 나중에 단 길이 먼저 돈다: 배경음 파일만 끊는다
  if (o.blockBgm) await ctx.route('**/assets/bgm/*.mp3', (route) => { R.blocked.push(route.request().url()); return route.abort(); });
  R.attach = async (page) => {
    R.page = page;
    page.on('request', (r) => { if (BGM_RE.test(r.url())) R.bgmReq.push(r.url()); });
    page.on('console', (m) => {
      if (m.type() !== 'error') return;
      const loc = (m.location() || {}).url || '';
      // 일부러 막은 배경음 파일의 '불러오지 못함'만 뺀다(주소가 배경음 파일일 때만)
      if (o.blockBgm && BGM_RE.test(loc) && /Failed to load resource/.test(m.text())) return;
      R.errs.push('console: ' + m.text() + (loc ? ' @' + loc : ''));
    });
    page.on('pageerror', (e) => R.errs.push('pageerror: ' + e.message));
    page.on('requestfailed', (r) => {
      const u = r.url(), why = (r.failure() || {}).errorText || '';
      if (/^blob:/.test(u) || !LOCAL.test(u)) return;
      if (BGM_RE.test(u) && o.blockBgm && R.blocked.includes(u) && /ERR_FAILED/.test(why)) return; // 일부러 막은 곡
      if (BGM_RE.test(u) && /ERR_ABORTED/.test(why)) return; // 다시 열기·창 닫기가 받던 곡을 끊음(게임 오류가 아님)
      R.errs.push('requestfailed: ' + u + ' ' + why);
    });
    page.on('response', (r) => { if (r.status() >= 400) R.errs.push('http ' + r.status() + ': ' + r.url()); });
    R.cdp = vp.hasTouch ? await ctx.newCDPSession(page) : null;
    return page;
  };
  await R.attach(await ctx.newPage());
  return R;
}
const keysOf = (page) => page.evaluate(() => Object.keys(localStorage));
const stateOf = (page) => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
async function shot(R, label) { try { await R.page.screenshot({ path: path.join(SHOTS, `${R.name || 'x'}_${label.replace(/[^\w가-힣-]+/g, '_')}.png`) }); } catch (e) { /* 무시 */ } }

// ───────── 지금 화면을 한 번에 읽기 ─────────
const SNAP = () => {
  const vis = (el) => !!el && el.isConnected && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const one = (s) => [...document.querySelectorAll(s)].find(vis) || null;
  const all = (s) => [...document.querySelectorAll(s)].filter(vis);
  const G0 = window.G;
  const out = { kind: 'wait' };
  if (!G0 || !G0.save) return out;
  const st = G0.save.state;
  out.place = st.place || null;
  out.hon = st.hon;
  out.audio = G0.audio ? { track: G0.audio.track || null, now: G0.audio.now() } : null;
  out.hud = G0.hud && G0.hud.info ? G0.hud.info.id || null : null;
  out.okru = all('.okru-recall').map((r) => ({ part: r.dataset.part, kind: r.dataset.kind }));
  out.rotate = vis(document.getElementById('rotate'));
  if (one('.result-screen')) { out.kind = 'result'; out.section = 'result'; return out; }
  if (one('.sheet-back .sheet')) { out.kind = 'sheet'; out.buttons = all('.sheet .actions .btn').map((b) => b.textContent.trim()); return out; }
  if (one('.title-screen')) { out.kind = 'title'; out.section = 'title'; out.buttons = all('.title-screen button').map((b) => b.textContent.trim()).filter(Boolean); return out; }
  out.section = one('.fn-mbs') ? 'finale-mbs' : one('.fn-jeongi') ? 'finale-jeongi' : (out.hud || out.place);
  if (one('.hon-panel[data-phase="walk"]')) { out.kind = 'hon'; out.honText = one('.hon-panel').innerText; return out; }
  const wf = one('.wfield .wf-in');
  if (wf && !wf.disabled) { out.kind = 'write'; return out; }
  if (one('.means-tray .opt:not([disabled])')) {
    out.kind = 'means';
    const ws = one('.wall-stage');
    out.moment = ws ? ws.dataset.moment : null;
    out.react = !!one('.wall-react');
    out.slots = all('.means-tray .opt').map((b) => ({ id: b.dataset.means, disabled: b.disabled, locked: b.classList.contains('locked'), name: ((b.querySelector('.ot') || {}).textContent || '').trim() }));
    return out;
  }
  if (one('.answer-tray .opt:not([disabled])')) { out.kind = 'answer'; out.answers = all('.answer-tray .answer-slot').map((b) => b.dataset.answer); return out; }
  if (one('.blank-tray .word-card:not([disabled])')) {
    out.kind = 'card';
    const a = one('.bt-slot.active');
    out.blank = a ? a.dataset.blank : null;
    out.reply = !!one('.blank-reply');
    out.cards = all('.blank-tray .word-card').map((b) => b.dataset.word);
    return out;
  }
  if (one('.mind-tray .mind-opt:not([disabled])')) { out.kind = 'mind'; out.minds = all('.mind-tray .mind-opt').map((b) => b.dataset.mind); return out; }
  if (one('.fn-scenes .opt:not([disabled])')) { out.kind = 'scene'; return out; }
  if (one('.mbs-pick .opt:not([disabled])')) { out.kind = 'mbs'; return out; }
  const nb = one('.event.on .ev-tray .btn.primary, .dlg .dlg-tray .btn.primary');
  if (nb) {
    out.kind = 'next';
    out.label = nb.textContent.trim();
    const sc = one('.summary-card');
    out.summary = sc ? { act: sc.dataset.act || '', title: ((sc.querySelector('h3') || {}).textContent || '').trim() } : null;
    const pc = one('.event.on .place-card');
    out.placeCard = pc ? pc.innerText.replace(/\s+/g, ' ').trim() : null;
    out.eventText = (one('.event.on, .dlg') || {}).innerText || '';
    return out;
  }
  const W = G0.world && G0.world.test;
  if (W && W.state().map && !document.querySelector('.event.on, .dlg')) {
    const s = W.state();
    const g = W.goal();
    if (g && !s.busy && !s.paused) {
      out.kind = 'map';
      out.map = s.map; out.pos = [s.x, s.y]; out.goal = g;
      out.targets = W.targets(); out.ind = W.indicator(); out.doors = W.doors();
      out.T = W.map().T;
    }
  }
  return out;
};

// ───────── 그 판의 입력으로 누르기·쓰기·걷기 ─────────
function mkInput(R, mode, stats) {
  const page = () => R.page;
  // 키보드: 그 단추에 포커스가 갈 때까지 Tab, 그다음 Enter(단추를 직접 누르지 않는다)
  async function kbFocus(loc) {
    await loc.evaluate((el) => { document.querySelectorAll('[data-kt]').forEach((x) => x.removeAttribute('data-kt')); el.setAttribute('data-kt', '1'); });
    await page().waitForTimeout(50);
    for (let i = 0; i < 45; i++) {
      if (await page().evaluate(() => !!document.activeElement && document.activeElement.hasAttribute('data-kt'))) return true;
      await page().keyboard.press('Tab');
    }
    return false;
  }
  async function press(sel, nth = 0) {
    const loc = page().locator(sel).nth(nth);
    if (mode === 'mouse') return loc.click({ timeout: 4000 });
    if (mode === 'touch') return loc.tap({ timeout: 4000 });
    if (await kbFocus(loc)) return page().keyboard.press('Enter');
    stats.kbMiss.push(sel);
    return loc.click({ timeout: 4000 });
  }
  async function write(text) {
    const inp = page().locator('.wfield .wf-in').last();
    if (mode === 'keyboard') {
      if (!(await kbFocus(inp))) { stats.kbMiss.push('wf-in'); await inp.click(); }
      await page().keyboard.type(text);
      return page().keyboard.press('Enter');
    }
    if (mode === 'mouse') await inp.click(); else await inp.tap();
    await page().keyboard.type(text);
    const done = page().locator('.wfield .wf-done').last();
    return mode === 'mouse' ? done.click() : done.tap();
  }
  // 걷기: 방향키 누른 채 / 마우스로 조이스틱 끌기 / 손가락으로 조이스틱 끌기. until()이 참이면 뗀다
  const KEY = { l: 'ArrowLeft', r: 'ArrowRight', u: 'ArrowUp', d: 'ArrowDown' };
  const VEC = { l: [-42, 0], r: [42, 0], u: [0, -42], d: [0, 42] };
  async function hold(dir, until, maxMs = 7000) {
    const p = page();
    let st0 = null;
    if (mode === 'keyboard') await p.keyboard.down(KEY[dir]);
    else {
      const z = await p.locator('.joy-zone').boundingBox();
      if (!z) return false;
      st0 = [z.x + Math.min(150, z.width / 2), z.y + z.height - Math.min(120, z.height / 2)];
      const [vx, vy] = VEC[dir];
      if (mode === 'mouse') {
        await p.mouse.move(st0[0], st0[1]); await p.mouse.down();
        await p.mouse.move(st0[0] + vx, st0[1] + vy, { steps: 4 });
      } else {
        await R.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: st0[0], y: st0[1] }] });
        for (let i = 1; i <= 4; i++) await R.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: st0[0] + vx * i / 4, y: st0[1] + vy * i / 4 }] });
      }
    }
    const t0 = Date.now();
    let hit = false;
    try {
      while (Date.now() - t0 < maxMs) {
        if (await until()) { hit = true; break; }
        await p.waitForTimeout(60);
      }
    } finally {
      if (mode === 'keyboard') await p.keyboard.up(KEY[dir]);
      else if (mode === 'mouse') await p.mouse.up();
      else await R.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    }
    return hit;
  }
  async function talk() {
    const p = page();
    for (let k = 0; k < 4; k++) {
      if (mode === 'keyboard') await p.keyboard.press('KeyE');
      else if (mode === 'mouse') await p.locator('.pbtn.talk').click({ timeout: 2000 }).catch(() => {});
      else await p.locator('.pbtn.talk').tap({ timeout: 2000 }).catch(() => {});
      const ok = await p.waitForSelector('.event.on, .dlg', { timeout: 1200 }).then(() => true, () => false);
      if (ok) return true;
      await p.waitForTimeout(250);
    }
    return false;
  }
  return { press, write, hold, talk };
}

// 맵 위 목표: 지금 맵의 대상이면 곁으로 옮겨 말 걸기, 밟는 구역이면 걸어 들어가기, 다른 맵이면 그리로 가는 입구로 걸어가기
async function mapStep(R, inp, s, stats) {
  const page = R.page;
  const T = s.T || 16;
  const here = (s.targets || []).filter((t) => t.x != null);
  const isZone = (id) => (s.goal.zones || []).includes(id) || (s.goal.repeat || []).includes(id);
  let tx, ty, zoneId = null, doorId = null;
  if (here.length) {
    const t = here.find((x) => !isZone(x.id)) || here[0];
    if (!isZone(t.id)) {
      await page.evaluate((id) => G.world.test.teleport(id), t.id);
      await page.waitForTimeout(140);
      if (!(await inp.talk())) stats.talkMiss.push(t.id);
      return;
    }
    zoneId = t.id; tx = t.x; ty = t.y;
  } else {
    doorId = Object.keys((s.ind || {}).via || {})[0] || (s.ind.arrows || []).concat(s.ind.glow || []).find((id) => (s.doors || []).includes(id));
    if (!doorId) { await page.waitForTimeout(150); return; }
    const d = await page.evaluate(([m, id]) => { const D = ((G.world.place.maps || {})[m] || {}).doors || {}; const x = D[id]; return x ? { x: x.x, y: x.y, w: x.w || 1, h: x.h || 1 } : null; }, [s.map, doorId]);
    if (!d) { await page.waitForTimeout(150); return; }
    tx = (d.x + d.w / 2) * T; ty = (d.y + d.h / 2) * T;
  }
  const startMap = s.map;
  const done = () => page.evaluate((m) => {
    const W = G.world.test, st = W.state();
    return !!document.querySelector('.event.on, .dlg, .hon-panel') || st.map !== m || !W.goal() || st.busy > 0;
  }, startMap);
  const pos = () => page.evaluate(() => { const st = G.world.test.state(); return { x: st.x, y: st.y }; });
  for (let seg = 0; seg < 10; seg++) {
    if (await done()) return;
    const p0 = await pos();
    const dx = tx - p0.x, dy = ty - p0.y;
    const horiz = Math.abs(dx) >= Math.abs(dy);
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) break;
    const dir = horiz ? (dx > 0 ? 'r' : 'l') : (dy > 0 ? 'd' : 'u');
    let last = null, still = 0;
    await inp.hold(dir, async () => {
      if (await done()) return true;
      const p = await pos();
      if (horiz ? (dir === 'r' ? p.x >= tx : p.x <= tx) : (dir === 'd' ? p.y >= ty : p.y <= ty)) return true;
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.4) { if (++still >= 5) return true; } else still = 0;
      last = p;
      return false;
    });
  }
  if (await done()) return;
  // 걸어서 닿지 못했으면(막힘) 그 칸으로 옮겨 마저 밟는다 — 몇 번인지 센다
  stats.walkMiss.push((zoneId || doorId) + '@' + startMap);
  await page.evaluate(([x, y]) => G.world.test.look(x, y), [Math.floor(tx / T), Math.floor(ty / T)]);
  await page.waitForTimeout(200);
}

// ───────── 처음부터 끝까지 몰기 ─────────
//  o.policy: 'full'(원작과 다른 수단·답·카드를 먼저 써 보고) | 'direct'
//  o.title: 타이틀에서 누를 단추 글(배열, 앞에서부터 찾는다) · o.on(s): 화면마다 부른다(참을 돌려주면 그 화면을 이미 다룬 것)
async function drive(R, mode, o = {}) {
  const stats = R.stats = R.stats || { kbMiss: [], talkMiss: [], walkMiss: [], sections: [], tracks: {}, playing: {}, okru: {}, summaries: [], titles: [], moves: 0 };
  const inp = mkInput(R, mode, stats);
  const mem = R.mem = R.mem || { tries: {}, cards: {}, answers: 0 };
  const DATA = await R.page.evaluate(() => ({ ok: Object.fromEntries(Object.entries(WALLS).map(([k, w]) => [k, w.ok || []])), answer: CARDS.answer }));
  const t0 = Date.now();
  let lastKind = '', sameSince = Date.now(), lastSig = '';
  for (let guard = 0; guard < 4000; guard++) {
    if (Date.now() - t0 > (o.maxMs || 240000)) { await shot(R, 'timeout'); return { ok: false, why: 'timeout', last: lastKind }; }
    let s;
    try { s = await R.page.evaluate(SNAP); } catch (e) { await R.page.waitForTimeout(150); continue; }
    // 기록: 장면 차례와 시각, 장면마다 고른 곡·실제로 흐르는 곡
    const now = Date.now();
    if (s.section && (!stats.sections.length || stats.sections[stats.sections.length - 1].id !== s.section)) stats.sections.push({ id: s.section, t: now });
    if (s.section && s.audio) {
      (stats.tracks[s.section] = stats.tracks[s.section] || new Set()).add(s.audio.track);
      if (s.audio.now && !s.audio.now.paused) (stats.playing[s.section] = stats.playing[s.section] || new Set()).add(s.audio.now.name + '|' + s.audio.now.src.replace(/^.*\/assets\//, 'assets/'));
    }
    for (const r of s.okru || []) stats.okru[r.part] = r.kind;
    if (s.summary && !stats.summaries.some((x) => x.title === s.summary.title)) stats.summaries.push(s.summary);
    if (s.placeCard && !stats.titles.includes(s.placeCard)) stats.titles.push(s.placeCard);
    const sig = s.kind + '|' + (s.label || '') + '|' + (s.moment || '') + '|' + (s.goal ? s.goal.text : '') + '|' + (s.pos ? s.pos.map(Math.round).join(',') : '');
    if (sig !== lastSig) { lastSig = sig; sameSince = now; } else if (now - sameSince > 20000) { await shot(R, 'stuck'); return { ok: false, why: 'stuck at ' + sig }; }
    lastKind = s.kind;
    if (o.on && (await o.on(s, inp))) continue;
    if (s.kind === 'result') return { ok: true, s };
    if (o.until && o.until(s)) return { ok: true, s };
    try {
      if (s.kind === 'title') {
        const want = [].concat(o.title || ['이어 하기', '시작']).find((w) => s.buttons.some((b) => b.includes(w)));
        if (!want) return { ok: false, why: 'title buttons: ' + s.buttons.join('/') };
        const idx = s.buttons.findIndex((b) => b.includes(want));
        await inp.press('.title-screen button', idx);
        await R.page.waitForTimeout(150);
      } else if (s.kind === 'sheet') {
        await inp.press('.sheet .actions .btn.primary, .sheet .actions .btn.seal');
      } else if (s.kind === 'hon') {
        await inp.hold('r', () => R.page.evaluate(() => !document.querySelector('.hon-panel')), 4000);
      } else if (s.kind === 'write') {
        await inp.write(o.text || '두 사람의 사랑이 죽음도 넘을 만큼 깊었다는 것');
        await R.page.waitForTimeout(120);
      } else if (s.kind === 'means') {
        const m = s.moment;
        const tried = (mem.tries[m] = mem.tries[m] || []);
        const ok = DATA.ok[m] || [];
        const free = s.slots.filter((x) => !x.disabled && !x.locked && x.id !== 'leave');
        let pick;
        if (!ok.length) pick = o.policy === 'full' && !tried.length && free.some((x) => x.id === 'hon') ? 'hon' : 'leave';
        else {
          const wrongWanted = o.policy === 'full' ? (m === 'w2-bandit' ? 2 : 1) : 0;
          const wrong = free.find((x) => !ok.includes(x.id) && !tried.includes(x.id));
          pick = tried.length < wrongWanted && wrong ? wrong.id : ok.find((x) => free.some((f) => f.id === x)) || ok[0];
        }
        tried.push(pick);
        await inp.press(`.means-tray .opt[data-means="${pick}"]`);
        await R.page.waitForTimeout(200);
        if (o.afterMeans) await o.afterMeans(m, pick, inp);
      } else if (s.kind === 'answer') {
        const a = o.policy === 'full' && mem.answers === 0 ? 'stay' : 'entrust';
        mem.answers++;
        await inp.press(`.answer-tray .answer-slot[data-answer="${a}"]`);
        await R.page.waitForTimeout(200);
      } else if (s.kind === 'card') {
        const k = s.blank;
        const n = (mem.cards[k] = (mem.cards[k] || 0) + 1);
        const ans = DATA.answer[k];
        const word = o.policy === 'full' && k === 'b1-wall' && n === 1 ? '울주' : ans;
        await inp.press(`.blank-tray .word-card[data-word="${word}"]`);
        await R.page.waitForTimeout(160);
        if (o.afterCard) await o.afterCard(k, word, inp);
      } else if (s.kind === 'mind') {
        await inp.press(`.mind-tray .mind-opt[data-mind="${o.policy === 'full' ? 'poems' : 'rites'}"]`);
      } else if (s.kind === 'scene') {
        await inp.press('.fn-scenes .opt');
      } else if (s.kind === 'mbs') {
        await inp.press('.mbs-pick .opt');
      } else if (s.kind === 'next') {
        await inp.press('.event.on .ev-tray .btn.primary, .dlg .dlg-tray .btn.primary');
        await R.page.waitForTimeout(40);
      } else if (s.kind === 'map') {
        stats.moves++;
        await mapStep(R, inp, s, stats);
      } else await R.page.waitForTimeout(90);
    } catch (e) {
      await R.page.waitForTimeout(120); // 화면이 바뀌는 중이었다 — 다시 읽는다
    }
  }
  return { ok: false, why: 'guard' };
}

// 장면별 걸린 시간(자동 진행): 들어가기 · 1막 · 2막(피란길 + 밤) · 3막 · 반복의 뜻과 전기적 요소 한 줄 · 만복사 · (결과)
const GROUPS = [
  ['들어가기', ['prologue']], ['1막', ['act1']], ['2막', ['act2', 'act2night']], ['3막', ['act3']],
  ['반복의 뜻·전기적 요소 한 줄', ['epilogue', 'finale-jeongi']], ['「만복사저포기」', ['finale-mbs']],
];
function timing(stats, endT) {
  const per = {};
  const list = stats.sections;
  for (let i = 0; i < list.length; i++) {
    const a = list[i], b = list[i + 1];
    const d = (b ? b.t : endT) - a.t;
    per[a.id] = (per[a.id] || 0) + d;
  }
  const out = {};
  for (const [name, ids] of GROUPS) out[name] = ids.reduce((s, id) => s + (per[id] || 0), 0);
  return out;
}

const report = {};
async function finalChecks(R, label, o = {}) {
  const p = R.page;
  const keys = await keysOf(p);
  c.ok(keys.length > 0 && keys.every((k) => k.startsWith(KEY_PREFIX)), `${label}: 저장 열쇠가 모두 '${KEY_PREFIX}'로 시작 (${keys.join(', ')})`);
  c.ok(R.outside.length === 0, `${label}: 바깥 주소 요청 없음${R.outside.length ? ' — ' + R.outside.slice(0, 3).join(', ') : ''}`);
  c.ok(R.errs.length === 0, `${label}: 콘솔·페이지 오류 없음${R.errs.length ? ' — ' + R.errs.slice(0, 4).join(' | ') : ''}`);
  if (o.walk !== false) c.ok(R.stats.walkMiss.length <= (o.walkMissMax || 0), `${label}: 구역·입구까지 그 판의 입력으로 걸어 닿음 (못 닿아 옮긴 곳 ${R.stats.walkMiss.length}: ${R.stats.walkMiss.join(', ') || '없음'})`);
  c.ok(R.stats.talkMiss.length === 0, `${label}: 말 걸기가 모두 열림${R.stats.talkMiss.length ? ' — ' + R.stats.talkMiss.join(', ') : ''}`);
}
async function resultChecks(R, label) {
  const r = await R.page.evaluate(() => {
    const t = document.querySelector('.result-screen').innerText;
    return { text: t, buttons: [...document.querySelectorAll('.result-screen button')].map((b) => b.textContent.trim()) };
  });
  c.ok(!TEACHER.test(r.buttons.join(' ')), `${label}: 결과 화면에 선생님 기능 단추가 없다 (${r.buttons.join(' · ')})`);
  return r;
}

// ═════════ [1] 키보드만 — 처음부터 결과까지(다시 열기 넷) + 배경음 배정 ═════════
let kbCtx = null;
{
  console.log('\n[1] 키보드만 · PC 1366×860 · 처음부터 결과까지');
  const R = await openCtx(VIEWS.desktop);
  R.name = 'keyboard';
  kbCtx = R;
  await R.page.goto(url);
  await R.page.evaluate(() => localStorage.clear());
  await R.page.reload();
  await R.page.waitForSelector('.title-screen h1');
  const tb = await R.page.evaluate(() => [...document.querySelectorAll('.title-screen button')].map((b) => b.textContent.trim()));
  c.ok(tb.some((b) => b.includes('시작')) && !tb.some((b) => b.includes('이어 하기')), `저장이 없으면 타이틀에 '시작' (${tb.filter(Boolean).join(' · ')})`);
  c.ok(!TEACHER.test(tb.join(' ')), '타이틀에 선생님 기능이 없다');
  // 첫 화면의 곡: 고른 곡은 'title', 처음 손댄(키를 누른) 뒤에 실제로 흐른다(브라우저가 손대기 전 재생을 막을 수 있다)
  await R.page.keyboard.press('Shift');
  await R.page.waitForTimeout(400);
  const ta = await R.page.evaluate(() => ({ track: G.audio.track, now: G.audio.now(), src: BGM.tracks.title.src }));
  c.ok(ta.track === 'title' && !!ta.now && ta.now.name === 'title' && !ta.now.paused && ta.now.src.endsWith(ta.src), `첫 화면 곡 'title'(${ta.src})이 키를 누른 뒤 흐른다 (${JSON.stringify(ta.now)})`);
  const P = {};
  const flags = { meansReload: false, closeOpen: false, blankReload: false, tasksReload: false };
  // 다시 열기: 같은 창 새로고침 → 타이틀 '이어 하기'(키보드)
  async function reopen(how) {
    if (how === 'close') {
      await R.page.close();
      await R.attach(await R.ctx.newPage());
      await R.page.goto(url);
    } else await R.page.reload();
    await R.page.waitForSelector('.title-screen h1');
    const b = await R.page.evaluate(() => [...document.querySelectorAll('.title-screen button')].map((x) => x.textContent.trim()));
    return b;
  }
  const t0 = Date.now();
  let honSeenMap = false;
  const res = await drive(R, 'keyboard', {
    policy: 'full', title: ['이어 하기', '시작'],
    async afterMeans(m, pick) {
      // 수단 반응 직후 다시 열기: 1막 시에 답하기에서 처음 써 본 수단(원작과 다른 것)
      if (flags.meansReload || m !== 'w1-poem') return;
      flags.meansReload = true;
      await R.page.waitForSelector('.wall-react', { timeout: 4000 }).catch(() => {});
      const before = (await stateOf(R.page)).walls['w1-poem'];
      const b = await reopen('reload');
      P.meansReload = { before, buttons: b, pick };
    },
    async afterCard(k, word) {
      if (flags.blankReload || k !== 'b1-wall' || word !== '울주') return;
      flags.blankReload = true;
      await R.page.waitForSelector('.blank-reply', { timeout: 4000 }).catch(() => {});
      const before = (await stateOf(R.page)).blanks['b1-wall'];
      await reopen('reload');
      P.blankReload = { before };
    },
    async on(s) {
      // 다시 연 뒤 1막 시에 답하기: 써 본 차례가 남고, 마지막 반응을 다시 보인다
      if (flags.meansReload && !P.meansAfter && s.kind === 'means' && s.moment === 'w1-poem') {
        P.meansAfter = { walls: (await stateOf(R.page)).walls['w1-poem'], react: s.react };
      }
      if (flags.blankReload && !P.blankAfter && s.kind === 'card' && s.blank === 'b1-wall') {
        P.blankAfter = { blank: (await stateOf(R.page)).blanks['b1-wall'] };
      }
      // 막 도중 창을 닫았다 열기: 1막 '향아에게 소식을 알아봐 달라고 하자'(b-ask) 목표에서
      if (!flags.closeOpen && s.kind === 'map' && s.place === 'act1' && /소식/.test(s.goal.text || '')) {
        flags.closeOpen = true;
        P.closeGoal = s.goal.text;
        P.closeDone = Object.keys((await stateOf(R.page)).done).filter((k) => k.startsWith('b:act1:')).sort();
        await reopen('close');
        P.closeWatch = { events: [], firstMap: null };
        return true;
      }
      if (P.closeWatch && !P.closeWatch.firstMap) {
        if (s.kind === 'next') P.closeWatch.events.push((s.placeCard || s.eventText || '').slice(0, 40));
        if (s.kind === 'map') P.closeWatch.firstMap = { place: s.place, goal: s.goal.text, done: Object.keys((await stateOf(R.page)).done).filter((k) => k.startsWith('b:act1:')).sort() };
      }
      // 3막 할 일 일부(재물)를 마친 직후 다시 열기
      if (!flags.tasksReload && s.kind === 'map' && s.place === 'act3') {
        const st = await stateOf(R.page);
        if (st.tasks.treasure && !st.tasks.bones) {
          flags.tasksReload = true;
          P.tasksBefore = { tasks: st.tasks, goal: s.goal.text };
          await reopen('reload');
          P.tasksWatch = { events: [] };
          return true;
        }
      }
      if (P.tasksWatch && !P.tasksWatch.firstMap) {
        if (s.kind === 'next') P.tasksWatch.events.push((s.placeCard || s.eventText || '').replace(/\s+/g, ' ').slice(0, 40));
        if (s.kind === 'map') P.tasksWatch.firstMap = { tasks: (await stateOf(R.page)).tasks, goal: s.goal.text };
      }
      if (s.kind === 'map' && s.place === 'act2night') honSeenMap = true;
      return false;
    },
  });
  const tEnd = Date.now();
  c.ok(res.ok, `키보드만으로 결과 화면까지 간다${res.ok ? '' : ' — ' + res.why}`);
  await shot(R, 'result');
  const st = await stateOf(R.page);
  const S = R.stats;
  // 흐름: 거점 차례
  const order = S.sections.map((x) => x.id).filter((id, i, a) => a.indexOf(id) === i);
  const want = ['title', 'prologue', 'act1', 'act2', 'act2night', 'act3', 'epilogue', 'finale-jeongi', 'finale-mbs', 'result'];
  c.ok(want.every((id, i) => order.indexOf(id) >= 0 && (i === 0 || order.indexOf(id) > order.indexOf(want[i - 1]))), `막 차례: 들어가기 → 1막 → 2막 → 밤 → 3막 → 맺음 → 마무리 → 결과 (${order.join(' → ')})`);
  c.ok(S.titles.some((t) => /1막/.test(t)) && S.titles.some((t) => /2막/.test(t)) && S.titles.some((t) => /3막/.test(t)), `막이 바뀔 때 막 이름·미션 첫 장 (${S.titles.length}장)`);
  const missions = await R.page.evaluate(() => ({ all: FLOW.mission, acts: Object.fromEntries(Object.entries(FLOW.acts).map(([k, a]) => [k, { m: a.mission, mark: a.mark }])) }));
  c.ok(missions.all === '담 너머에 그 사람이 있다. 무엇이 우리를 가로막든 넘어가라.', '전체 미션이 spec 2절 그대로');
  c.ok(Object.values(missions.acts).every((a) => a.m && a.mark === '게임 설정' && a.m.length <= 60), `막마다 미션 한 문장(게임 설정): ${Object.values(missions.acts).map((a) => a.m).join(' / ')}`);
  c.ok(S.titles.some((t) => t.includes(missions.acts.act1.m)), '1막 첫 장에 막 미션이 보인다');
  // 1막 두 순간 · 2막 도적과 혼 · 3막 할 일 넷과 경계 · 이생에게 답하기 · 한 줄 · 만복사
  c.ok((st.walls['w1-poem'] || []).map((e) => e.m).join() === 'mal,si' && (st.walls['w1-parents'] || []).map((e) => e.m).join() === 'si,mal', `1막 두 순간을 지남 (시에 답하기 ${JSON.stringify((st.walls['w1-poem'] || []).map((e) => e.m))} · 부모 앞 ${JSON.stringify((st.walls['w1-parents'] || []).map((e) => e.m))})`);
  c.ok((st.walls['w2-bandit'] || []).map((e) => e.m).join() === 'mal,si,gyeoldan' && st.hon === 'open' && honSeenMap, `2막 도적 앞(말 → 시 → 결단)과 혼이 열림 (${JSON.stringify((st.walls['w2-bandit'] || []).map((e) => e.m))}, hon ${st.hon})`);
  c.ok(['treasure', 'bones', 'poems', 'burial'].every((t) => st.tasks[t]) && st.border === true && (st.walls['w3-border'] || []).some((e) => e.m === 'hon'), `3막 할 일 넷과 경계(혼으로도 못 넘음) (${JSON.stringify(st.tasks)}, 경계 ${JSON.stringify((st.walls['w3-border'] || []).map((e) => e.m))})`);
  c.ok(st.propose.join() === 'stay,entrust' && st.mind === 'poems', `이생에게 답하기(처음 '남겠다' → 떠나며 부탁)·마음 둔 곳 (${st.propose.join(',')}, ${st.mind})`);
  c.ok(['repeat', 'jeongi', 'mbsSame'].every((k) => st.lines[k]) && st.jeongiScene && st.mbs.q1 && st.mbs.q2, '반복의 뜻·전기적 요소 한 줄(근거 장면)·만복사 두 고르기와 한 줄');
  // 다시 열기 넷
  c.ok(!!P.meansReload && (P.meansReload.before || []).length === 1 && P.meansReload.buttons.some((b) => b.includes('이어 하기')), `수단 반응 직후 다시 열면 타이틀에 '이어 하기' (기록 ${JSON.stringify(P.meansReload && P.meansReload.before)})`);
  c.ok(!!P.meansAfter && JSON.stringify(P.meansAfter.walls) === JSON.stringify(P.meansReload.before) && P.meansAfter.react, `다시 연 뒤 써 본 수단이 그대로 남고 마지막 반응을 다시 보인다 (${JSON.stringify(P.meansAfter)})`);
  c.ok(!!P.closeWatch && !!P.closeWatch.firstMap && P.closeWatch.firstMap.place === 'act1' && P.closeWatch.firstMap.goal === P.closeGoal && JSON.stringify(P.closeWatch.firstMap.done) === JSON.stringify(P.closeDone) && P.closeWatch.events.length <= 1,
    `1막 도중 창을 닫았다 열면 그 막의 다음 할 일부터 (목표 「${P.closeGoal}」, 다시 본 장면 ${P.closeWatch ? P.closeWatch.events.length : '?'}: ${P.closeWatch ? P.closeWatch.events.join(' / ') : ''})`);
  c.ok(!!P.blankReload && P.blankReload.before && P.blankReload.before.first === '울주' && !P.blankReload.before.final, `빈칸에 맞지 않는 카드를 넣은 직후의 기록 (${JSON.stringify(P.blankReload && P.blankReload.before)})`);
  c.ok(!!P.blankAfter && P.blankAfter.blank.first === '울주' && !P.blankAfter.blank.final, `빈칸 첫 시도 직후 다시 열어도 첫 시도가 남는다 (${JSON.stringify(P.blankAfter)})`);
  c.ok(st.blanks['b1-wall'].first === '울주' && st.blanks['b1-wall'].final === '담장', '맞지 않는 카드 뒤 다시 골라 채움(첫 시도 울주 · 최종 담장)');
  c.ok(!!P.tasksWatch && !!P.tasksWatch.firstMap && P.tasksWatch.firstMap.tasks.treasure === true && !/재물/.test(P.tasksWatch.firstMap.goal) && /유골/.test(P.tasksWatch.firstMap.goal) && P.tasksWatch.events.length <= 1,
    `3막 할 일 일부를 마친 직후 다시 열어도 기록이 남고 남은 할 일부터 (${P.tasksWatch && P.tasksWatch.firstMap ? P.tasksWatch.firstMap.goal : '?'}, 다시 본 장면 ${P.tasksWatch ? P.tasksWatch.events.join(' / ') : '?'})`);
  // 결과: 첫 시도, 하지 않음 없음
  const rr = await resultChecks(R, '키보드');
  const first = await R.page.evaluate(() => { const e = document.querySelector('.rs-word[data-blank="b1-wall"]'); return e ? e.innerText : ''; });
  c.ok(/담장/.test(first) && /울주/.test(first), `결과 화면에 빈칸의 첫 시도가 남는다 (${first.replace(/\s+/g, ' ')})`);
  c.ok(!/하지 않음/.test(rr.text), '처음부터 한 판에는 \'하지 않음\'이 없다');
  const wallSeq = await R.page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.rs-wall')].map((e) => [e.dataset.moment, (e.querySelector('.rs-seq') || e).textContent.trim()])));
  c.ok(/말 → 시 → 결단/.test(wallSeq['w2-bandit'] || ''), `결과에 담마다 써 본 수단의 차례 (2막: ${wallSeq['w2-bandit']})`);
  // 배경음: 장면 자료의 music 열쇠 → 실제로 흐르는 곡
  const BG = await R.page.evaluate(() => ({ tracks: Object.fromEntries(Object.entries(BGM.tracks).map(([k, v]) => [k, v.src])), music: Object.fromEntries(FLOW.order.map((p) => [p, (PLACES[p] || {}).music || null])) }));
  const WANT = Object.assign({ 'finale-jeongi': 'farewell', 'finale-mbs': 'farewell', result: 'result' }, BG.music);
  for (const [secId, track] of Object.entries(WANT)) {
    const playing = [...(S.playing[secId] || [])];
    const okPlay = playing.some((x) => x === track + '|' + BG.tracks[track]);
    c.ok(okPlay, `배경음 ${secId} → '${track}'(${BG.tracks[track]})이 실제로 흐른다 (들린 곡: ${playing.join(', ') || '없음'})`);
  }
  // 거점마다 그 거점의 곡만(앞 거점·타이틀의 곡이 첫 장에 남지 않게. 3막은 옥루춘 동안만 'okru')
  const mixed = [];
  for (const [pid, track] of Object.entries(BG.music)) for (const x of S.playing[pid] || []) { const n = x.split('|')[0]; if (n !== track && !(pid === 'act3' && n === 'okru')) mixed.push(pid + ':' + n); }
  c.ok(mixed.length === 0, `거점마다 장면 자료의 곡만 흐른다(다른 곡이 섞이지 않음)${mixed.length ? ' — ' + mixed.join(', ') : ''}`);
  c.ok([...(S.playing.act3 || [])].some((x) => x.startsWith('okru|')), `옥루춘 동안 배경음 'okru' (3막에서 들린 곡: ${[...(S.playing.act3 || [])].join(', ')})`);
  c.ok(S.kbMiss.length === 0, `키보드만으로 모든 단추에 닿음(Tab·Enter)${S.kbMiss.length ? ' — 못 닿음: ' + S.kbMiss.slice(0, 5).join(', ') : ''}`);
  await finalChecks(R, '키보드');
  report.keyboard = { total: tEnd - t0, per: timing(S, tEnd), reloads: 4 };
  console.log('  · 키보드 판 걸린 시간 ' + sec(tEnd - t0) + '초(다시 열기 넷 포함) — ' + Object.entries(report.keyboard.per).map(([k, v]) => k + ' ' + sec(v)).join(' · '));

  // ── 같은 기록으로 ?act=2: '이어 하기 / 이 막부터'
  console.log('\n[1b] 끝까지 한 기록으로 ?act=2');
  const p = R.page;
  await p.goto(url + '?act=2');
  await p.waitForSelector('.title-screen h1');
  let b2 = await p.evaluate(() => [...document.querySelectorAll('.title-screen button')].map((x) => x.textContent.trim()).filter(Boolean));
  c.ok(b2.some((b) => b.includes('이어 하기')) && b2.some((b) => b.includes('이 막부터')) && !b2.some((b) => b === '시작'), `저장이 있으면 '이어 하기 / 이 막부터' (${b2.join(' · ')})`);
  c.ok(!TEACHER.test(b2.join(' ')), '바로가기 타이틀에 선생님 기능이 없다');
  await p.click('.title-screen button:has-text("이어 하기")');
  const toResult = await p.waitForSelector('.result-screen', { timeout: 8000 }).then(() => true, () => false);
  const keep = await stateOf(p);
  c.ok(toResult && keep.tasks.burial && keep.lines.mbsSame, `'이어 하기'는 기록 그대로 이어 간다(끝낸 판이면 결과 화면)`);
  await p.goto(url + '?act=2');
  await p.waitForSelector('.title-screen h1');
  b2 = await p.evaluate(() => [...document.querySelectorAll('.title-screen button')].map((x) => x.textContent.trim()).filter(Boolean));
  await p.click('.title-screen button:has-text("이 막부터")');
  const card2 = await p.waitForSelector('.event.on .place-card', { timeout: 8000 }).then(() => true, () => false);
  const pc = card2 ? await p.evaluate(() => document.querySelector('.event.on .place-card').innerText) : '';
  const s2 = await stateOf(p);
  const sum2 = await p.evaluate(() => !!document.querySelector('.summary-card'));
  c.ok(card2 && /2막/.test(pc) && !sum2, `'이 막부터': 1막을 한 기록이면 요약 카드 없이 2막 첫 장 (${pc.replace(/\s+/g, ' ').slice(0, 30)})`);
  c.ok(s2.place === 'act2' && JSON.stringify(s2.walls['w1-poem'].map((e) => e.m)) === '["mal","si"]' && s2.blanks['b1-wall'].first === '울주' && s2.blanks['b2-marriage'].final === '혼인' && s2.skipped.length === 0,
    `'이 막부터': 앞 막(1막) 기록은 그대로 (${JSON.stringify(s2.walls['w1-poem'])}, 빈칸 첫 시도 ${s2.blanks['b1-wall'].first}, 건너뜀 ${JSON.stringify(s2.skipped)})`);
  c.ok(!s2.walls['w2-bandit'] && !s2.walls['w3-border'] && !s2.blanks['b2-war'] && !s2.blanks['b3-hwanshin'] && JSON.stringify(s2.tasks) === '{}' && s2.border === false && s2.propose.length === 0 && !s2.mind && !s2.lines.repeat && !s2.lines.mbsSame && s2.hon === 'locked',
    `'이 막부터': 그 막과 뒤 막은 새로(2·3막 기록·쓴 글 지움, 혼 잠김) (hon ${s2.hon}, tasks ${JSON.stringify(s2.tasks)})`);
  // 그 자리에서 2막을 끝까지 하면 3막까지 이어진다(혼은 도적 앞을 지나야 열림)
  await finalChecks(R, '?act=2', { walk: false });
  await R.ctx.close();
}

// ═════════ [2] 마우스 · 배경음 파일을 모두 막은 채 ═════════
{
  console.log('\n[2] 마우스 · PC · 배경음 파일을 모두 막음(소리 없이)');
  const R = await openCtx(VIEWS.desktop, { blockBgm: true });
  R.name = 'mouse';
  await R.page.goto(url);
  await R.page.waitForSelector('.title-screen h1');
  const t0 = Date.now();
  const res = await drive(R, 'mouse', { policy: 'direct', title: ['시작'] });
  const tEnd = Date.now();
  c.ok(res.ok, `배경음 파일이 없어도 마우스로 결과 화면까지 간다${res.ok ? '' : ' — ' + res.why}`);
  await shot(R, 'result');
  const au = await R.page.evaluate(() => ({ now: G.audio.now(), track: G.audio.track }));
  c.ok(R.blocked.length > 0 && !au.now, `배경음 요청은 막혔고(${R.blocked.length}건) 소리 없이 조용히 간다 (지금 곡 ${au.track}, 재생 ${JSON.stringify(au.now)})`);
  await resultChecks(R, '마우스');
  await finalChecks(R, '마우스');
  report.mouse = { total: tEnd - t0, per: timing(R.stats, tEnd) };
  console.log('  · 마우스 판 걸린 시간 ' + sec(tEnd - t0) + '초 — ' + Object.entries(report.mouse.per).map(([k, v]) => k + ' ' + sec(v)).join(' · '));
  await R.ctx.close();
}

// ═════════ [3] 터치 · 휴대폰 가로 · 배경음 끔 ═════════
{
  console.log('\n[3] 터치 · 휴대폰 가로 844×390 · 배경음 끔');
  const R = await openCtx(VIEWS.phone);
  R.name = 'touch';
  await R.page.goto(url);
  await R.page.waitForSelector('.title-screen h1');
  await R.page.locator('.title-screen .music-toggle').tap();
  const off = await R.page.evaluate(() => ({ music: G.save.state.music, now: G.audio.now() }));
  c.ok(off.music === false && !off.now, `타이틀의 배경음 단추를 손가락으로 눌러 끄면 곡이 멈춘다 (${JSON.stringify(off)})`);
  const reqBefore = R.bgmReq.length; // 끄기 전 첫 화면이 곡을 받기 시작했을 수 있다
  let rotated = null;
  const t0 = Date.now();
  const res = await drive(R, 'touch', {
    policy: 'direct', title: ['시작'],
    async on(s) {
      // 놀이 도중 세로로 돌리면 돌려 달라는 안내, 세상이 멈춘다 → 가로로 돌아오면 그대로 이어 간다
      if (!rotated && s.kind === 'map' && s.place === 'act1') {
        await R.page.setViewportSize({ width: 390, height: 844 });
        await R.page.waitForTimeout(250);
        const r = await R.page.evaluate(() => { const el = document.getElementById('rotate'); return { shown: !!el && getComputedStyle(el).display !== 'none', text: el ? el.innerText : '', paused: G.world.test.state().paused }; });
        await R.page.setViewportSize({ width: 844, height: 390 });
        await R.page.waitForTimeout(250);
        const back = await R.page.evaluate(() => ({ shown: getComputedStyle(document.getElementById('rotate')).display !== 'none', paused: G.world.test.state().paused }));
        rotated = { r, back };
        return true;
      }
      return false;
    },
  });
  const tEnd = Date.now();
  c.ok(res.ok, `배경음을 끄고 손가락만으로 결과 화면까지 간다${res.ok ? '' : ' — ' + res.why}`);
  await shot(R, 'result');
  c.ok(!!rotated && rotated.r.shown && /돌려/.test(rotated.r.text) && rotated.r.paused && !rotated.back.shown && !rotated.back.paused, `놀이 도중 세로로 들면 돌려 달라는 안내(세상이 멈춤), 가로로 돌아오면 이어 감 (${JSON.stringify(rotated)})`);
  c.ok(R.bgmReq.length === reqBefore, `배경음을 끈 뒤로는 곡 파일을 하나도 받지 않는다 (끈 뒤 ${R.bgmReq.length - reqBefore}건)`);
  c.ok(Object.values(R.stats.playing).every((x) => !x.size), '배경음을 끄면 어떤 장면에서도 소리가 나지 않는다');
  await resultChecks(R, '터치');
  await finalChecks(R, '터치');
  report.touch = { total: tEnd - t0, per: timing(R.stats, tEnd) };
  console.log('  · 터치 판 걸린 시간 ' + sec(tEnd - t0) + '초 — ' + Object.entries(report.touch.per).map(([k, v]) => k + ' ' + sec(v)).join(' · '));
  await R.ctx.close();
}

// ═════════ [4] ?act=3 — 새 기록으로 3막부터 결과까지 ═════════
{
  console.log('\n[4] ?act=3 · 새 기록 · 마우스');
  const R = await openCtx(VIEWS.desktop);
  R.name = 'act3';
  await R.page.goto(url + '?act=3');
  await R.page.waitForSelector('.title-screen h1');
  const tb = await R.page.evaluate(() => [...document.querySelectorAll('.title-screen button')].map((x) => x.textContent.trim()).filter(Boolean));
  c.ok(tb.some((b) => /3막/.test(b)) && !tb.some((b) => b.includes('이어 하기')), `?act=3, 저장이 없으면 그 막에서 바로 시작하는 단추 (${tb.join(' · ')})`);
  let honAt3 = null, firstBorder = null;
  const res = await drive(R, 'mouse', {
    policy: 'direct', title: ['3막'],
    async on(s) {
      if (honAt3 == null && s.section === 'act3') honAt3 = s.hon;
      if (!firstBorder && s.kind === 'means' && s.moment === 'w3-border') firstBorder = s.slots.find((x) => x.id === 'hon') || { none: true };
      return false;
    },
  });
  c.ok(res.ok, `?act=3으로 들어가 결과 화면까지 간다${res.ok ? '' : ' — ' + res.why}`);
  await shot(R, 'result');
  const S = R.stats;
  c.ok(S.summaries.length === 2 && /1막/.test(S.summaries[0].title) && /2막/.test(S.summaries[1].title), `건너뛴 1·2막은 30초 요약 카드로 (${S.summaries.map((x) => x.title).join(' / ')})`);
  c.ok(honAt3 === 'open' && firstBorder && !firstBorder.locked && firstBorder.name === '혼', `2막을 건너뛰면 혼이 열린 채 3막 (hon ${honAt3}, 경계의 혼 칸 ${JSON.stringify(firstBorder)})`);
  c.ok(S.okru['0-1'] === 'default', `옥루춘 1~2구 회상은 기본 장면 (${S.okru['0-1']})`);
  const rs = await R.page.evaluate(() => ({
    walls: Object.fromEntries([...document.querySelectorAll('.rs-wall')].map((e) => [e.dataset.moment, e.innerText.replace(/\s+/g, ' ')])),
    words: Object.fromEntries([...document.querySelectorAll('.rs-word')].map((e) => [e.dataset.blank, e.innerText.replace(/\s+/g, ' ')])),
    act3: (document.querySelector('.rs-act3') || {}).innerText || '',
  }));
  c.ok(['w1-poem', 'w1-parents', 'w2-bandit'].every((m) => /하지 않음/.test(rs.walls[m] || '')) && !/하지 않음/.test(rs.walls['w3-border'] || ''), `결과: 1·2막 담은 '하지 않음', 3막 경계는 기록 (${JSON.stringify(rs.walls)})`);
  c.ok(['b1-wall', 'b2-marriage', 'b2-war', 'b3-hwanshin'].every((k) => /하지 않음/.test(rs.words[k] || '')) && /담장/.test(rs.words['b1-wall'] || '') && /환신/.test(rs.words['b3-hwanshin'] || ''), `결과: 건너뛴 막의 빈칸은 원작 낱말 + '하지 않음' (${JSON.stringify(rs.words)})`);
  c.ok(!/하지 않음/.test(rs.act3), '결과: 3막(마음 둔 곳·처음 한 답)은 기록대로');
  const st = await stateOf(R.page);
  c.ok(JSON.stringify(st.skipped) === '["act1","act2"]' && st.hon === 'open', `건너뛴 막 기록 ${JSON.stringify(st.skipped)}`);
  await resultChecks(R, '?act=3');
  await finalChecks(R, '?act=3');
  await R.ctx.close();
}

// ═════════ [5] 세로 화면 ═════════
{
  console.log('\n[5] 세로 390×844');
  const R = await openCtx(VIEWS.portrait);
  await R.page.goto(url);
  await R.page.waitForTimeout(400);
  const ro = await R.page.evaluate(() => { const el = document.getElementById('rotate'); return { shown: !!el && getComputedStyle(el).display !== 'none', text: el ? el.innerText : '' }; });
  c.ok(ro.shown && /돌려/.test(ro.text), `세로 화면이면 돌려 달라는 안내 (${ro.text.replace(/\s+/g, ' ').slice(0, 24)})`);
  c.ok(R.errs.length === 0 && R.outside.length === 0, '세로: 오류·바깥 요청 없음');
  await R.ctx.close();
}

await browser.close();
report.checkFlowSec = (Date.now() - T_ALL) / 1000;
fs.writeFileSync(path.join(SHOTS, 'timing.json'), JSON.stringify(report, null, 2));
console.log(`\n점검 전체 ${report.checkFlowSec.toFixed(1)}초`);
c.finish();
