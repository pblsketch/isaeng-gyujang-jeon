// 3막 「저승의 담」과 맺음 점검(plan T6, spec 6절·4절·14절). 실제 크롬으로 본다.
//  [0] 배치(자료): 세 구역이 입구 하나씩으로 이어짐, 할 일이 구역마다 한곳에 모임, 할 일 사이 왕복 두 번 이내
//  [1] 휴대폰 가로 844×390 — 3막 바로가기 상태로 들어가 끝까지:
//      할 일 목록 → 위치 표시(다른 구역의 대상은 그리로 가는 입구) → 입구로 구역 오가기 → 장사 잠김(안내만) →
//      재물 → 닫았다 열기(기록 남음) → 유골(장사 열림) → 시 → 닫았다 열기(장사만 남음 → 오관산에서) →
//      장사(때 딱지 '장사 뒤', 노복의 귀환·이생의 두문불출) → 경계를 겪지 않았으니 3막이 끝나지 않고 지금 할 일이 경계를 가리킴(짧은 길) →
//      닫았다 열기(경계만 남음 → 들에서) → 경계(혼으로도 못 넘음, 돌아서기) → 마음 둔 곳(키보드) → 어느 날 저녁 →
//      옥루춘(배경음 okru → 다시 3막 곡, 2막을 건너뛰었으니 1~2구는 기본 장면) → 이생의 제안('함께 가자' 없음) →
//      맺음(최 씨가 사라짐, 이생의 죽음 한 줄 + 암전 — 그림 없음, 맺음, 반복의 뜻 한 문장)
//  [2] 낮은 휴대폰 가로 640×360 — 옥루춘 회상이 마음 둔 곳에 따라 둘만 바뀜, 글자 크기·움직임 줄이기,
//      보이지 않는 경계는 몇 번이든(할 일이 남아 있으면 3막이 끝나지 않음)
//  모든 맥락: 콘솔 오류 0, 바깥 요청 0, 누를 곳 44px, 점수·'틀렸다' 투의 말 없음
import { base } from './serve.mjs';
import { VIEWS, checker, launch, open, fresh, reloadContinue, state, smallTargets, talkTo } from './lib.mjs';

const c = checker();
const url = await base();
const browser = await launch();
const BAD_WORDS = /틀렸|틀림|오답|정답|점수|등급|순위|실패|게임 오버|잘못|시간 제한/;
const PARTS = ['0-1', '2-3', '4-5', '6-7'];

// ───────── 도우미 ─────────
async function pump(page, stop, max = 120) {
  for (let i = 0; i < max; i++) {
    if (await stop()) return true;
    const b = page.locator('.dlg .dlg-tray .btn.primary, .event.on .ev-tray .btn.primary');
    if (await b.count()) await b.first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(110);
  }
  return stop();
}
const has = (page, sel) => async () => (await page.locator(sel).count()) > 0;
// 맵 위에서 목표를 기다리는 상태(대화창·사건 화면 없음). text를 주면 그 글일 때만
const settled = (page, text) => async () => page.evaluate((t) => {
  const W = window.G && G.world && G.world.test; if (!W) return false;
  const g = W.goal();
  return !!g && !W.state().busy && !document.querySelector('.dlg, .event.on') && (!t || g.text === t);
}, text || null);
const goal = (page) => page.evaluate(() => G.world.test.goal());
const mapId = (page) => page.evaluate(() => G.world.test.state().map);
const ind = async (page) => { await page.waitForTimeout(120); return page.evaluate(() => G.world.test.indicator()); };
const year = (page) => page.evaluate(() => { const e = document.querySelector('.hud-year'); return e && !e.hidden ? e.textContent : ''; });
const stripYear = (page) => page.evaluate(() => { const e = document.querySelector('.st-year'); return e && !e.hidden ? e.textContent : ''; });
const P3 = (page) => page.evaluate(() => {
  const P = PLACES.act3;
  return JSON.parse(JSON.stringify({ tasks: P.tasks, border: P.border, times: P.times, maps: Object.fromEntries(Object.entries(P.maps).map(([k, m]) => [k, { name: m.name, spawn: m.spawn, doors: m.doors, spots: m.spots }])), evening: P.beats.find((b) => b.id === 'b-evening') }));
});
// 칸 (tx, ty)에 서서 key를 누른 채 맵이 to가 될 때까지 걷는다(맵 사이 입구)
async function walkDoor(page, tx, ty, key, to) {
  await page.evaluate(([x, y]) => G.world.test.look(x, y), [tx, ty]);
  await page.waitForTimeout(80);
  await page.keyboard.down(key);
  const ok = await page.waitForFunction((m) => G.world.test.state().map === m && !G.world.test.state().busy, to, { timeout: 6000 }).then(() => true, () => false);
  await page.keyboard.up(key);
  await page.waitForTimeout(150);
  return ok;
}
// 사람·자리에 다가가 E — 목표면 사건 화면, 아니면 대화창(끝까지 넘김)
async function doTask(page, spot) {
  const r = await talkTo(page, spot);
  if (!r.event) return false;
  return pump(page, settled(page));
}
async function noBadWords(page, where) {
  const t = await page.evaluate(() => (document.querySelector('.event.on') || document.body).innerText);
  const m = t.match(BAD_WORDS);
  c.ok(!m, `${where}: 점수·'틀렸다' 투의 말이 없다${m ? ' (「' + m[0] + '」)' : ''}`);
}
async function targets44(page, where) {
  const small = await smallTargets(page);
  c.ok(small.length === 0, `${where}: 누를 곳 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
}
// 다시 열기(fresh의 reload)가 받는 중이던 배경음 파일을 끊으면 크롬이 net::ERR_ABORTED를 남긴다 — 게임 오류가 아니라 빼고 센다
const realErrs = (O) => O.errs.filter((e) => !/requestfailed: \S+\.mp3 net::ERR_ABORTED/.test(e));
async function readOkru(page) {
  const out = {};
  for (const k of PARTS) {
    const ok = await page.waitForSelector(`.okru-recall[data-part="${k}"]`, { timeout: 8000 }).then(() => true, () => false);
    if (!ok) { out[k] = null; continue; }
    out[k] = await page.evaluate((k) => {
      const r = document.querySelector(`.okru-recall[data-part="${k}"]`);
      const v = document.querySelector(`.okru-verse[data-part="${k}"]`);
      return { kind: r.dataset.kind, mind: r.dataset.mind || '', scene: r.dataset.scene || '', text: (r.querySelector('.okru-recall-t') || r).textContent.trim(), han: v ? [...v.querySelectorAll('.han')].map((x) => x.textContent) : [], music: G.audio.track, controls: [...document.querySelectorAll('.event.on .ev-tray button, .event.on .opt')].map((b) => b.textContent.trim()) };
    }, k);
    if (k === '2-3') out.font = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.okru-verse .han')).fontSize));
    if (k === '6-7') out.anim = await page.evaluate(() => getComputedStyle(document.querySelector('.okru-recall')).animationDuration);
    await page.click('.event.on .ev-tray .btn.primary');
    await page.waitForTimeout(150);
  }
  return out;
}

// ═════════ [0] 배치: 세 구역, 입구 하나씩, 할 일 사이 왕복 두 번 이내 ═════════
{
  console.log('\n[0] 3막 배치(자료)');
  const O = await open(browser, VIEWS.desktop);
  const p = O.page;
  await fresh(p, url);
  const L = await p.evaluate(() => {
    const P = PLACES.act3;
    const maps = P.maps || {};
    const ids = Object.keys(maps);
    const edges = {};
    const doorCount = {};
    for (const m of ids) { edges[m] = new Set(); doorCount[m] = 0; }
    for (const m of ids) for (const d of Object.values(maps[m].doors || {})) { edges[m].add(d.to); doorCount[m]++; }
    const pairs = {};
    for (const m of ids) for (const t of edges[m]) pairs[[m, t].sort().join('~')] = (pairs[[m, t].sort().join('~')] || 0) + 1;
    // 구역 사이 최단 경로(입구를 따라)
    const path = (a, b) => { const q = [[a]]; const seen = new Set([a]); while (q.length) { const r = q.shift(); const x = r[r.length - 1]; if (x === b) return r; for (const y of edges[x] || []) if (!seen.has(y)) { seen.add(y); q.push([...r, y]); } } return null; };
    // 할 일 순서(장사는 재물·유골 뒤, 경계는 아무 때나)마다 걸어 다니는 구역 차례를 만들고 '되돌아옴'(이미 떠난 구역에 다시 들어감)을 센다.
    //  학생은 한 구역에 들어서면 그곳의 열린 할 일을 모두 한다(할 일을 한곳에 모았으니). 세는 것은 그 구역을 고르는 차례 전부의 최댓값.
    const need = (id) => ((P.tasks[id] || {}).need || []);
    const jobs = Object.keys(P.tasks).map((id) => ({ id, map: P.tasks[id].map })).concat([{ id: 'border', map: P.border.map }]);
    let worst = 0, best = 99, routes = 0;
    const start = P.map;
    (function dfs(at, done, trail) {
      // 이 구역에서 할 수 있는 것을 모두 한다(장사가 열리면 그것도)
      let grew = true; done = new Set(done);
      while (grew) { grew = false; for (const j of jobs) if (!done.has(j.id) && j.map === at && need(j.id).every((n) => done.has(n))) { done.add(j.id); grew = true; } }
      if (done.size === jobs.length) {
        routes++;
        let back = 0; const left = new Set();
        for (let i = 1; i < trail.length; i++) { left.add(trail[i - 1]); if (left.has(trail[i])) back++; }
        worst = Math.max(worst, back); best = Math.min(best, back); return;
      }
      const targets = [...new Set(jobs.filter((j) => !done.has(j.id) && need(j.id).every((n) => done.has(n))).map((j) => j.map))].filter((m) => m !== at);
      for (const t of targets) { const r = path(at, t); if (!r) { worst = 99; continue; } dfs(t, done, trail.concat(r.slice(1))); }
    })(start, new Set(), [start]);
    // 같은 구역의 할 일끼리 거리(칸)
    const spot = (id) => { const t = P.tasks[id]; const s = maps[t.map].spots[t.spot]; return [s.x + (s.w || 1) / 2, s.y + (s.h || 1) / 2]; };
    const tb = Math.hypot(spot('treasure')[0] - spot('bones')[0], spot('treasure')[1] - spot('bones')[1]);
    const spotsOk = Object.values(P.tasks).every((t) => maps[t.map] && maps[t.map].spots && maps[t.map].spots[t.spot]);
    const edge = maps[P.border.map].spots[P.border.spot];
    const gw = (maps[P.border.map].grid[0] || '').length;
    return { ids, pairs, doorCount, worst, best, routes, tb: Math.round(tb), spotsOk, edgeAtRim: !!edge && edge.x + (edge.w || 1) >= gw, edgeRepeat: !!edge, homeMap: P.map };
  });
  c.ok(L.ids.length === 3 && ['home', 'valley', 'mountain'].every((m) => L.ids.includes(m)), `세 구역: 최 씨 집·골짜기와 들·오관산 기슭 (${L.ids.join(',')})`);
  const pairList = Object.entries(L.pairs);
  c.ok(pairList.length === 2 && pairList.every(([, n]) => n === 2) && Object.values(L.doorCount).every((n) => n >= 1 && n <= 2),
    `구역 사이는 입구 하나씩(양방향)으로 잇는다 (${pairList.map(([k, n]) => k + '×' + n).join(', ')})`);
  c.ok(L.spotsOk, '할 일 넷의 자리가 맵 자료에 있다');
  c.ok(L.tb <= 10, `재물과 유골은 한 구역 안에 가까이 모여 있다 (${L.tb}칸)`);
  c.ok(L.edgeAtRim, '보이지 않는 경계는 지도 가장자리에 있다');
  c.ok(L.routes > 0 && L.worst <= 2, `할 일 사이 왕복 두 번 이내 (차례 ${L.routes}가지, 가장 많이 되돌아옴 ${L.worst}번, 가장 적게 ${L.best}번)`);
  c.ok(realErrs(O).length === 0, '오류 없음' + (realErrs(O).length ? ' — ' + realErrs(O).slice(0, 3).join(' / ') : ''));
  await O.ctx.close();
}

let okruA = null;
// ═════════ [1] 휴대폰 가로: 3막을 끝까지 ═════════
{
  console.log('\n[1] 휴대폰 가로 844×390 — 3막 「저승의 담」(바로가기 상태로 들어감)');
  const O = await open(browser, VIEWS.phone);
  const p = O.page;
  await fresh(p, url);
  await p.evaluate(() => { G.rules.shortcutOn(G.save.state, 3); G.save.write(); G.app.play('act3'); });
  await p.waitForSelector('.event.cardmode .place-card');
  await p.click('.event.cardmode .ev-tray .btn.primary');
  await p.waitForSelector('.world canvas.wcv');
  const D = await P3(p);
  const years = [];
  const noteYear = (y) => { if (y && years[years.length - 1] !== y) years.push(y); };

  // ── 할 일 목록 ──
  c.ok(await pump(p, has(p, '.event.on .task-board')), '할 일 목록이 사건 화면에 뜬다');
  const board = await p.evaluate(() => [...document.querySelectorAll('.task-board .task-row[data-task]')].map((r) => ({ id: r.dataset.task, cls: r.className, text: r.textContent + ' ' + ((document.querySelector('.tk-lock[data-lock="' + r.dataset.task + '"]') || {}).textContent || '') })));
  c.ok(board.map((b) => b.id).join(',') === 'treasure,bones,poems,burial', `할 일 넷 (${board.map((b) => b.id).join(',')})`);
  const bur = board.find((b) => b.id === 'burial') || {};
  c.ok(/locked/.test(bur.cls) && bur.text.includes(D.tasks.burial.locked.t), '장사는 잠겨 있고 까닭이 보인다(재물·유골 뒤)');
  await targets44(p, '할 일 목록');
  await noBadWords(p, '할 일 목록');
  c.ok(await pump(p, settled(p)), '할 일 목록 뒤 맵에서 지금 할 일');
  noteYear(await year(p));
  c.ok((await year(p)) === D.times[0], `때 딱지: ${await year(p)}`);

  // ── 위치 표시와 입구 ──
  let g = await goal(p);
  c.ok((await mapId(p)) === 'home', '최 씨 집에서 시작');
  c.ok(eq3(g.targets, ['cache', 'field', 'pavilion']) && g.locked.includes('grave'), `열린 할 일 셋이 목표, 장사는 잠김 (목표 ${g.targets.join(',')} · 잠김 ${g.locked.join(',')})`);
  c.ok(['재물', '유골', '시'].every((w) => g.text.includes(w)), `지금 할 일 글 (${g.text})`);
  let I = await ind(p);
  const toValley = Object.entries(D.maps.home.doors).find(([, d]) => d.to === 'valley');
  c.ok(!!toValley && (I.via[toValley[0]] || []).includes('cache') && (I.via[toValley[0]] || []).includes('field'),
    `다른 구역의 할 일은 그리로 가는 입구를 가리킨다 (via ${JSON.stringify(I.via)})`);
  c.ok(I.glow.includes('pavilion') || I.arrows.includes('pavilion'), '같은 구역의 할 일(작은 누각)은 그 자리를 가리킨다');
  const hd = D.maps.home.doors[toValley[0]];
  c.ok(await walkDoor(p, hd.x, hd.y - 2, 'ArrowDown', 'valley'), '최 씨 집 입구로 걸어 들어가면 골짜기와 들로');
  const sv = await p.evaluate(() => G.world.test.state());
  c.ok(Math.abs(sv.x / 32 - (hd.spawn[0] + 0.5)) < 1.2 && Math.abs(sv.y / 32 - (hd.spawn[1] + 0.78)) < 1.2, `들의 입구 곁에 선다 (${(sv.x / 32).toFixed(1)}, ${(sv.y / 32).toFixed(1)})`);
  I = await ind(p);
  c.ok((I.glow.includes('cache') || I.arrows.includes('cache')) && Object.values(I.via).some((l) => l.includes('pavilion')), `들에서는 바위 밑을 가리키고, 누각은 집으로 가는 입구로 (빛 ${I.glow} · 화살표 ${I.arrows} · via ${JSON.stringify(I.via)})`);
  const vHome = Object.values(D.maps.valley.doors).find((d) => d.to === 'home');
  c.ok(await walkDoor(p, vHome.x + 2, vHome.y, 'ArrowLeft', 'home'), '들의 입구로 최 씨 집에 돌아간다');
  c.ok(await walkDoor(p, hd.x, hd.y - 2, 'ArrowDown', 'valley'), '다시 들로');
  const vMt = Object.values(D.maps.valley.doors).find((d) => d.to === 'mountain');
  c.ok(await walkDoor(p, vMt.x, vMt.y + 2, 'ArrowUp', 'mountain'), '들의 입구로 오관산 기슭에');

  // ── 장사 잠김 ──
  g = await goal(p);
  c.ok(!g.targets.includes('grave') && g.locked.includes('grave'), '오관산: 합장할 자리는 아직 목표가 아니다(잠김)');
  const lockedTalk = await talkTo(p, 'grave');
  c.ok(!lockedTalk.event && lockedTalk.text.includes(D.tasks.burial.locked.t), `다가가면 열림 조건 안내만 (${lockedTalk.text.slice(0, 40)}…)`);
  c.ok(!((await state(p)).tasks || {}).burial, '장사는 기록되지 않는다');
  const mV = Object.values(D.maps.mountain.doors).find((d) => d.to === 'valley');
  c.ok(await walkDoor(p, mV.x, mV.y - 2, 'ArrowDown', 'valley'), '오관산 입구로 들에 돌아온다');

  // ── 재물 ──
  c.ok(await doTask(p, 'cache'), '바위 밑에서 재물 찾기');
  let st = await state(p);
  c.ok(st.tasks.treasure === true && st.done['b:act3:b-tasks.treasure'], '재물 찾기가 기록된다');

  // ── 닫았다 열기(할 일 일부를 마친 뒤) ──
  await reloadContinue(p);
  await p.waitForSelector('.event.cardmode .place-card');
  await p.click('.event.cardmode .ev-tray .btn.primary');
  c.ok(await pump(p, settled(p)), '이어 하기: 3막 지금 할 일부터');
  st = await state(p);
  g = await goal(p);
  c.ok(st.tasks.treasure === true && !g.targets.includes('cache') && eq3(g.targets, ['field', 'pavilion']), `닫았다 열어도 재물 찾기 기록이 남고 남은 할 일만 (목표 ${g.targets})`);
  c.ok((await mapId(p)) === 'home', '남은 할 일이 두 구역에 나뉘어 있으면 최 씨 집에서');
  c.ok(await walkDoor(p, hd.x, hd.y - 2, 'ArrowDown', 'valley'), '들로');

  // ── 유골 → 장사 열림 ──
  c.ok(await doTask(p, 'field'), '들에서 유골 수습');
  g = await goal(p);
  c.ok(g.targets.includes('grave') && !g.locked.length, `재물·유골 뒤 장사가 열린다 (목표 ${g.targets})`);
  I = await ind(p);
  const vMtId = Object.entries(D.maps.valley.doors).find(([, d]) => d.to === 'mountain')[0];
  c.ok((I.via[vMtId] || []).includes('grave'), `합장할 자리는 오관산으로 가는 입구가 가리킨다 (via ${JSON.stringify(I.via)})`);
  c.ok((await year(p)) === D.times[0], '장사 전에는 때 딱지가 그대로');

  // ── 시 ──
  c.ok(await walkDoor(p, vHome.x + 2, vHome.y, 'ArrowLeft', 'home'), '집으로');
  const poemsEv = await talkTo(p, 'pavilion');
  c.ok(poemsEv.event, '작은 누각에서 시 주고받기');
  c.ok(await pump(p, async () => (await p.evaluate(() => (document.querySelector('.event.on') || {}).innerText || '')).includes('常與崔氏')), '시 한 구(원문)가 풀이와 함께');
  c.ok(await pump(p, settled(p)), '시 주고받기를 마침');

  // ── 닫았다 열기: 장사만 남음 → 오관산에서 ──
  await reloadContinue(p);
  await p.waitForSelector('.event.cardmode .place-card');
  await p.click('.event.cardmode .ev-tray .btn.primary');
  c.ok(await pump(p, settled(p)), '이어 하기');
  const rp1 = await p.evaluate(() => G.rules.resumePoint(G.save.state));
  c.ok((await mapId(p)) === 'mountain' && rp1.map === 'mountain', `장사만 남았으면 오관산 기슭에서 이어 한다 (맵 ${await mapId(p)}, resumePoint ${rp1.map})`);
  st = await state(p);
  c.ok(st.tasks.treasure && st.tasks.bones && st.tasks.poems && !st.tasks.burial, '앞서 마친 할 일 셋이 남아 있다');

  // ── 장사 ──
  const bt = await talkTo(p, 'grave');
  c.ok(bt.event, '합장할 자리에서 장사 지내기');
  let afterSeen = false;
  const afterLine = await p.evaluate(() => PLACES.act3.steps.find((s) => s.id === 't-after').lines[0].t);
  c.ok(await pump(p, async () => {
    const t = await p.evaluate(() => (document.querySelector('.event.on') || {}).innerText || '');
    if (t.includes(afterLine)) { afterSeen = true; noteYear(await stripYear(p)); }
    return settled(p)();
  }), '장사를 마침');
  c.ok(afterSeen, '장사 뒤: 이생이 벼슬하지 않고 노복이 돌아오며 문을 닫는 짧은 사건(고르기 없음)');
  c.ok(years.includes(D.times[1]), `장사 뒤 때 딱지 (${years.join(' → ')})`);

  // ── 경계를 겪지 않으면 끝나지 않음 ──
  st = await state(p);
  g = await goal(p);
  c.ok(['treasure', 'bones', 'poems', 'burial'].every((k) => st.tasks[k]) && !st.border && !st.done['b:act3:b-tasks'], '할 일 넷을 마쳤어도 경계를 겪지 않으면 3막이 끝나지 않는다');
  c.ok(g.text === D.border.goal && eq3(g.targets, [D.border.spot]), `지금 할 일이 경계를 가리킨다 (${g.text} · ${g.targets})`);
  c.ok((await mapId(p)) === D.border.map, '경계로 가는 짧은 길: 경계가 있는 들로 옮겨 와 있다');
  const pos = await p.evaluate(() => G.world.test.state());
  const edge = D.maps[D.border.map].spots[D.border.spot];
  const dist = Math.abs(pos.x / 32 - edge.x);
  c.ok(dist <= 4.5, `경계까지 몇 걸음 (${dist.toFixed(1)}칸)`);
  I = await ind(p);
  c.ok(I.glow.includes(D.border.spot) || I.arrows.includes(D.border.spot), `위치 표시가 경계를 가리킨다 (빛 ${I.glow} · 화살표 ${I.arrows})`);
  c.ok(await p.evaluate(() => !G.rules.act3Done(G.save.state)), '규칙: act3Done이 아직 거짓');

  // ── 닫았다 열기: 경계만 남음 → 들에서 ──
  await reloadContinue(p);
  await p.waitForSelector('.event.cardmode .place-card');
  await p.click('.event.cardmode .ev-tray .btn.primary');
  c.ok(await pump(p, settled(p, D.border.goal)), '이어 하기: 지금 할 일은 경계');
  const rp2 = await p.evaluate(() => G.rules.resumePoint(G.save.state));
  const pos2 = await p.evaluate(() => G.world.test.state());
  c.ok((await mapId(p)) === D.border.map && rp2.map === D.border.map && Math.abs(pos2.x / 32 - edge.x) <= 4.5, `경계만 남았으면 들, 경계 가까이에서 이어 한다 (resumePoint ${rp2.map})`);

  // ── 경계 앞 순간(혼으로도 못 넘음) ──
  await p.keyboard.down('ArrowRight');
  const atBorder = await p.waitForSelector('.wall-stage[data-moment="w3-border"]', { timeout: 6000 }).then(() => true, () => false);
  await p.keyboard.up('ArrowRight');
  c.ok(atBorder, '들 끝으로 걸어가면 경계 앞 순간이 열린다');
  c.ok(await pump(p, has(p, '.means-tray .means-slot')), '수단 칸');
  st = await state(p);
  c.ok(st.border === true, '경계에 닿기만 해도 겪은 것으로 기록된다');
  const slotsB = await p.evaluate(() => [...document.querySelectorAll('.means-tray .means-slot')].map((b) => ({ id: b.dataset.means, name: (b.querySelector('.ot') || {}).textContent, locked: b.classList.contains('locked') })));
  const honSlot = slotsB.find((s) => s.id === 'hon') || {};
  c.ok(honSlot.name === '혼' && !honSlot.locked, '3막에서 혼은 이름이 드러난 칸');
  await p.click('.means-tray .means-slot[data-means="hon"]');
  await p.waitForSelector('.wall-react');
  await p.waitForSelector('.means-tray .means-slot');
  const r1 = await p.evaluate(() => [...document.querySelectorAll('.wall-react')].pop().innerText);
  await p.click('.means-tray .means-slot[data-means="hon"]');
  await p.waitForFunction(() => document.querySelectorAll('.wall-react[data-n="2"]').length > 0, null, { timeout: 4000 }).catch(() => {});
  await p.waitForSelector('.means-tray .means-slot');
  const r2 = await p.evaluate(() => [...document.querySelectorAll('.wall-react')].pop().innerText);
  st = await state(p);
  c.ok(!(await p.evaluate(() => G.rules.wallPassed(G.save.state, 'w3-border'))) && r1 !== r2 && (st.walls['w3-border'] || []).length === 2, '혼을 두 번 써도 경계를 넘지 못한다(반응만 바뀜)');
  c.ok(Number(await p.evaluate(() => document.querySelector('.wall-stage').dataset.height)) === 2, '담 높이는 보이기만(2)');
  await noBadWords(p, '경계 앞');
  await targets44(p, '경계 앞');
  await p.click('.means-tray [data-means="leave"]');

  // ── 마음 둔 곳(키보드) ──
  c.ok(await pump(p, has(p, '.event.on .mind-opt')), '넷을 마치고 경계를 겪으면 마음 둔 곳을 고른다');
  st = await state(p);
  c.ok(st.done['b:act3:b-tasks'] && st.border, '3막 할 일 목표가 끝남');
  const mopts = await p.evaluate(() => [...document.querySelectorAll('.mind-opt')].map((b) => b.dataset.mind));
  c.ok(mopts.join(',') === 'treasure,rites,poems', `마음 둔 곳 셋 (${mopts})`);
  const f0 = await p.evaluate(() => document.activeElement && document.activeElement.dataset.mind);
  c.ok(f0 === 'treasure', '첫 고르기에 포커스');
  await targets44(p, '마음 둔 곳');
  await noBadWords(p, '마음 둔 곳');
  await p.keyboard.press('Tab');
  const f1 = await p.evaluate(() => document.activeElement && document.activeElement.dataset.mind);
  c.ok(f1 === 'rites', `Tab 차례가 화면 차례와 같다 (${f1})`);
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => G.save.state.mind === 'rites', null, { timeout: 4000 }).catch(() => {});
  st = await state(p);
  c.ok(st.mind === 'rites', '키보드로 고른 마음 둔 곳이 기록된다(채점하지 않음)');
  await p.waitForTimeout(200);
  noteYear(await stripYear(p));

  // ── 어느 날 저녁(최 씨 집) ──
  c.ok(await pump(p, settled(p, D.evening.goal)), `지금 할 일: ${D.evening.goal}`);
  c.ok((await mapId(p)) === 'home', '어느 날 저녁은 최 씨 집');
  noteYear(await year(p));
  const npcs = await p.evaluate(() => G.world.test.npcs().map((n) => n.id));
  c.ok(npcs.includes('servant'), '장사 뒤 최 씨 집에 돌아온 노복이 있다');
  const servantTalk = await talkTo(p, 'servant');
  c.ok(!servantTalk.event && servantTalk.text.length > 0, '노복에게 말을 걸 수 있다');
  c.ok(JSON.stringify(years) === JSON.stringify(D.times), `때 딱지 차례: ${years.join(' → ')}`);
  const ev = await talkTo(p, 'isaeng');
  c.ok(ev.event, '이생에게 가면 어느 날 저녁');

  // ── 옥루춘 ──
  c.ok(await pump(p, has(p, '.okru-recall')), '옥루춘이 펼쳐진다');
  okruA = await readOkru(p);
  const OK = await p.evaluate(() => JSON.parse(JSON.stringify(OKRU)));
  c.ok(PARTS.every((k) => okruA[k]), '여덟 구를 두 구씩 네 대목으로');
  c.ok(PARTS.every((k, i) => okruA[k] && okruA[k].han.length === 2 && okruA[k].han[0] === OK.lines[i * 2].han && okruA[k].han[1] === OK.lines[i * 2 + 1].han), '대목마다 원문 두 구(풀이와 함께)');
  c.ok(okruA['0-1'] && okruA['0-1'].kind === 'default' && okruA['0-1'].text === OK.recall['0-1'].default.t, '2막을 건너뛰었으니 1~2구 회상은 기본 장면');
  c.ok(okruA['2-3'] && okruA['2-3'].mind === 'rites' && okruA['2-3'].text === OK.recall['2-3'].byMind.rites.t && okruA['4-5'].text === OK.recall['4-5'].byMind.rites.t, '3~6구 회상은 마음 둔 곳(유골 수습과 장사)의 장면');
  c.ok(okruA['6-7'] && okruA['6-7'].kind === 'fixed' && okruA['6-7'].text === OK.recall['6-7'].fixed.t, '7~8구 회상은 고정(다가오는 이별)');
  c.ok(PARTS.every((k) => okruA[k] && okruA[k].music === 'okru'), '옥루춘 동안 배경음은 okru');
  c.ok(PARTS.every((k) => okruA[k] && okruA[k].controls.length === 1), `옥루춘에는 넘기기 말고 조작이 없다 (${okruA['2-3'] && okruA['2-3'].controls.join('|')})`);

  // ── 이생의 제안 ──
  c.ok(await pump(p, has(p, '.answer-tray .answer-slot')), '이생의 제안에 답하기');
  const music = await p.evaluate(() => G.audio.track);
  c.ok(music === 'act3', `옥루춘 뒤 3막 배경음으로 돌아온다 (${music})`);
  const answers = await p.evaluate(() => [...document.querySelectorAll('.answer-tray button')].map((b) => ({ a: b.dataset.answer || '', t: b.textContent })));
  c.ok(answers.map((x) => x.a).join(',') === 'stay,entrust' && !answers.some((x) => /together/.test(x.a) || /함께\s*(가|저승|황천|죽)/.test(x.t)), `고를 수 있는 답은 둘, '함께 가자'는 없다 (${answers.map((x) => x.t).join(' / ')})`);
  c.ok(await p.evaluate(() => !G.rules.proposeChoices().includes('together')), "규칙에도 'together'가 없다");
  await targets44(p, '이생의 제안');
  await p.click('.answer-tray .answer-slot[data-answer="stay"]');
  await p.waitForSelector('.wall-react');
  await p.waitForSelector('.answer-tray .answer-slot');
  await p.click('.answer-tray .answer-slot[data-answer="entrust"]');
  await p.waitForSelector('.wall-react.pass');
  st = await state(p);
  c.ok(JSON.stringify(st.propose) === '["stay","entrust"]', `답한 차례 기록 (${JSON.stringify(st.propose)})`);

  // ── 맺음 ──
  const E = await p.evaluate(() => JSON.parse(JSON.stringify(PLACES.epilogue.steps)));
  const farewell = E.find((s) => s.id === 'e-farewell');
  const death = E.find((s) => s.id === 'e-death');
  let sawFare = false, deathView = null;
  c.ok(await pump(p, async () => {
    const t = await p.evaluate(() => (document.querySelector('.event.on') || {}).innerText || '');
    if (t.includes(farewell.lines[1].ko)) sawFare = true;
    if (!deathView && t.includes(death.t)) deathView = await p.evaluate(() => ({ imgs: document.querySelectorAll('.event.on img').length, scene: (document.querySelector('.event.on .ev-art') || {}).dataset ? document.querySelector('.event.on .ev-art').dataset.scene : '', paper: document.querySelectorAll('.event.on .ev-art .blank-paper').length, dark: getComputedStyle(document.querySelector('.event.on')).backgroundColor }));
    return (await p.locator('.event.on .wfield input').count()) > 0;
  }, 160), '맺음: 반복의 뜻 한 문장 쓰기까지');
  c.ok(sawFare, '최 씨가 "낭군님, 부디 몸…" 하고 사라진다');
  c.ok(!!deathView && deathView.imgs === 0 && !deathView.scene && deathView.paper === 0, `이생의 장사와 죽음은 한 줄 + 암전(그림 없음) ${JSON.stringify(deathView)}`);
  const deathCount = (death.t.match(/[.。]/g) || []).length;
  c.ok(deathCount <= 2 && death.t.length <= 90, '죽음은 한 줄 서술');
  await p.click('.event.on .wfield .wf-done');
  c.ok(await p.isVisible('.event.on .wf-need'), '반복의 뜻은 빈칸이면 넘어가지 않는다');
  await p.fill('.event.on .wfield input', '두 사람의 인연이 얼마나 질긴지 드러나기 어렵다.');
  await p.click('.event.on .wfield .wf-done');
  await p.waitForFunction(() => !!(G.save.state.lines && G.save.state.lines.repeat), null, { timeout: 4000 }).catch(() => {});
  st = await state(p);
  c.ok(/인연/.test(st.lines.repeat || ''), '반복의 뜻 한 문장이 기록된다');
  await pump(p, async () => !(await p.locator('.event.on .ev-tray .btn.primary').count()) || (await p.evaluate(() => G.save.state.done['p:epilogue'])), 20);
  st = await state(p);
  c.ok(st.done['p:act3'] && st.done['p:epilogue'], '3막과 맺음이 끝남');
  c.ok(realErrs(O).length === 0, '콘솔 오류 없음' + (realErrs(O).length ? ' — ' + realErrs(O).slice(0, 4).join(' / ') : ''));
  c.ok(O.outside.length === 0, '바깥 요청 없음' + (O.outside.length ? ' — ' + O.outside.slice(0, 3).join(' / ') : ''));
  await O.ctx.close();
}

// ═════════ [2] 낮은 휴대폰 가로: 옥루춘 회상 짝·글자 크기·움직임 줄이기·경계는 몇 번이든 ═════════
{
  console.log('\n[2] 낮은 휴대폰 가로 640×360 — 옥루춘 회상·글자 크기·움직임·되풀이 경계');
  const V = VIEWS.low;
  const O = await open(browser, V);
  const p = O.page;
  await fresh(p, url);
  // 3막 끝 상태를 바로 만든다(2막을 한 학생: skipped 없음)
  const runOkru = async (mind, set) => {
    await p.evaluate(([mind, set]) => {
      const st = G.save.state;
      G.rules.test.set(Object.assign({ place: 'act3', act: 'act3', hon: 'open', skipped: [], tasks: { treasure: true, bones: true, poems: true, burial: true }, border: true, mind }, set || {}));
      G.app.applySettings();
      G.app.explore(G.app.placeInfo('act3'));
      window.__okruDone = false;
      G.app.runSteps(PLACES.act3, ['t-okru'], { again: true }).then(() => { window.__okruDone = true; });
      return st.mind;
    }, [mind, set]);
    c.ok(await pump(p, has(p, '.okru-recall')), `옥루춘(${mind})`);
    const r = await readOkru(p);
    await p.waitForFunction(() => window.__okruDone, null, { timeout: 5000 }).catch(() => {});
    return r;
  };
  const pPoems = await runOkru('poems', { font: 1, motion: 'full' });
  const pTreas = await runOkru('treasure', { font: 1.3, motion: 'less' });
  const diff = PARTS.filter((k) => pPoems[k] && pTreas[k] && pPoems[k].text !== pTreas[k].text);
  c.ok(diff.join(',') === '2-3,4-5', `마음 둔 곳에 따라 넷 가운데 둘만 바뀐다 (바뀐 대목 ${diff.join(',')})`);
  c.ok(pPoems['0-1'] && pPoems['0-1'].kind === 'fixed' && okruA && okruA['0-1'] && pPoems['0-1'].text !== okruA['0-1'].text, '2막을 한 학생은 1~2구가 고정 장면(건너뛴 학생과 다름)');
  c.ok(okruA && pPoems['6-7'] && pPoems['6-7'].text === okruA['6-7'].text, '7~8구는 누구나 같다');
  c.ok(['treasure', 'rites', 'poems'].every((m) => [pPoems, pTreas, { '2-3': okruA && okruA['2-3'] }].some((x) => x['2-3'] && x['2-3'].mind === m)) || (pPoems['2-3'].mind === 'poems' && pTreas['2-3'].mind === 'treasure'), '회상 장면이 고른 마음 둔 곳을 따른다');
  c.ok(pTreas.font > pPoems.font * 1.15, `글자 크기 3단계가 옥루춘에도 적용된다 (${pPoems.font}px → ${pTreas.font}px)`);
  c.ok(/^(0s|1e-05s|0\.00001s)$/.test(pTreas.anim || '') && pPoems.anim !== pTreas.anim, `움직임 줄이기가 회상 장면의 움직임을 멈춘다 (${pPoems.anim} → ${pTreas.anim})`);

  // 낮은 화면에서 옥루춘 한 대목이 다 보이고 넘기기 단추가 화면 안에
  await p.evaluate(() => { G.rules.test.set({ font: 1.3, motion: 'full', mind: 'rites' }); G.app.applySettings(); window.__okruDone = false; G.app.runSteps(PLACES.act3, ['t-okru'], { again: true }).then(() => { window.__okruDone = true; }); });
  await pump(p, has(p, '.okru-recall'));
  const vis = await p.evaluate((H) => { const b = document.querySelector('.event.on .ev-tray .btn.primary').getBoundingClientRect(); const r = document.querySelector('.okru-recall').getBoundingClientRect(); return { btn: b.top >= 0 && b.bottom <= H + 0.5, recall: r.height > 0 && r.top >= 0 }; }, V.height);
  c.ok(vis.btn && vis.recall, `640×360·아주 크게: 회상 장면과 넘기기 단추가 화면 안 ${JSON.stringify(vis)}`);
  await targets44(p, '옥루춘(640×360)');
  for (let i = 0; i < 12 && !(await p.evaluate(() => window.__okruDone)); i++) { await p.click('.event.on .ev-tray .btn.primary').catch(() => {}); await p.waitForTimeout(150); }
  await p.evaluate(() => { G.rules.test.set({ font: 1, motion: 'full' }); G.app.applySettings(); });

  c.ok(realErrs(O).length === 0, '콘솔 오류 없음(옥루춘)' + (realErrs(O).length ? ' — ' + realErrs(O).slice(0, 4).join(' / ') : ''));
  await O.ctx.close();
}
{
  // 보이지 않는 경계: 몇 번이든, 할 일이 남아 있으면 3막이 끝나지 않음
  const O = await open(browser, VIEWS.low);
  const p = O.page;
  await fresh(p, url);
  await p.evaluate(() => { G.rules.shortcutOn(G.save.state, 3); G.save.write(); G.app.play('act3'); });
  await p.waitForSelector('.event.cardmode .place-card');
  await p.click('.event.cardmode .ev-tray .btn.primary');
  c.ok(await pump(p, settled(p)), '3막 할 일');
  const B = await p.evaluate(() => JSON.parse(JSON.stringify(PLACES.act3.border)));
  await p.evaluate((B) => G.world.changeMap(B.map, B.spawn), B);
  await p.waitForFunction((m) => G.world.test.state().map === m && !G.world.test.state().busy, B.map, { timeout: 5000 });
  let visits = 0;
  for (let k = 0; k < 2; k++) {
    await p.evaluate((B) => G.world.test.look(B.spawn[0], B.spawn[1], 'right'), B);
    await p.keyboard.down('ArrowRight');
    const ok = await p.waitForSelector('.wall-stage[data-moment="w3-border"]', { timeout: 6000 }).then(() => true, () => false);
    await p.keyboard.up('ArrowRight');
    if (ok) visits++;
    await pump(p, has(p, '.means-tray [data-means="leave"]'));
    if (k === 0) {
      const f = await p.evaluate(() => document.activeElement && document.activeElement.dataset.means);
      c.ok(f === 'mal', `경계 앞: 첫 수단 칸에 포커스 (${f})`);
    }
    await p.click('.means-tray [data-means="leave"]');
    await pump(p, settled(p));
  }
  const st = await state(p);
  const g2 = await goal(p);
  c.ok(visits === 2 && st.border === true, `보이지 않는 경계는 몇 번이든 열린다 (${visits}번)`);
  c.ok(!st.done['b:act3:b-tasks'] && g2.targets.includes('cache') && !g2.targets.includes(B.spot), '경계를 겪어도 할 일이 남아 있으면 3막은 끝나지 않고 지금 할 일은 할 일');
  c.ok(await p.evaluate(() => !!G.rules.mindOn(JSON.parse(JSON.stringify(G.save.state)), 'rites').error), '할 일을 마치기 전에는 마음 둔 곳을 고를 수 없다(규칙)');
  c.ok(realErrs(O).length === 0, '콘솔 오류 없음' + (realErrs(O).length ? ' — ' + realErrs(O).slice(0, 4).join(' / ') : ''));
  c.ok(O.outside.length === 0, '바깥 요청 없음');
  await O.ctx.close();
}

await browser.close();
c.finish();

function eq3(a, b) { return JSON.stringify((a || []).slice().sort()) === JSON.stringify((b || []).slice().sort()); }
