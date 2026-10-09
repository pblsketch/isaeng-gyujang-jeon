// 2막 「전란의 담」 점검(plan T5, spec 5-3·5-4·12절). 실제 크롬으로 본다.
//  [1] 휴대폰 가로 844×390 — 2막을 바로 시작(상태를 바로가기 규칙으로 맞춤: G.rules.shortcutOn(st, 2))해 끝까지:
//      피란길은 한 방향 길(맵 격자로 확인) · 이생은 앞서 가다 혼자 달아남(뒷모습이 멀어짐) · 붙잡힘은 조작 없는 사건
//      · 도적 앞: 말·시는 처음부터 고를 수 있으나 통하지 않고 결단(꾸짖음)만 나아감 · 혼 칸은 이름 없이 잠김
//      · 꾸짖음 뒤 암전: 그림(삽화·그림 자리)이 없고 한 줄 서술, '살을 발라냄'은 접힌 원문 안에만 · 해석 카드 · 이생 쪽 카드
//      · 밤의 낭하: 발소리가 다가옴(글 + 화면 표시) · 걷기 전에는 혼의 이름이 보이지 않음 → 걷기 시작하면 '혼' + '전기적 요소' + 짧은 설명
//        → 원문의 까닭(天帝…假以幻體, 원문·풀이) · 게임 설정 표시 · 밤의 최 씨 집(행랑채·낭하·작은 누각)을 혼으로 걸어 이생에게
//      · 재회 · 재물과 유골의 실마리 · 2막 끝 빈칸(홍건적의 난, 환신)
//  [2] 낮은 휴대폰 가로 640×360 — 밤의 최 씨 집부터(상태: 도적 앞을 꾸짖음으로 지남):
//      걷기 판이 화면 안에 보임(글자 '아주 크게'·움직임 줄이기 포함) · 걷기 전에 닫았다 열어도 이름은 감춰진 채 · 걷기 시작 뒤 열림
//      · 연 뒤 닫았다 열어도 열린 채 · 누를 곳 44px · 첫 단추에 포커스
//  모든 맥락: 콘솔 오류 0, 바깥 요청 0, '틀렸다'·점수 투의 말 없음, '준비 중' 화면 없음
import { base } from './serve.mjs';
import { VIEWS, checker, launch, open, fresh, reloadContinue, state, smallTargets } from './lib.mjs';

const c = checker();
const url = await base();
const browser = await launch();
const BAD_WORDS = /틀렸|틀림|오답|정답|점수|등급|게임 오버|잘못|시간 제한/;

// 대화창·사건 화면의 '다음'을 stop()이 참이 될 때까지 누른다(고르기 화면에서는 stop이 멈춘다)
async function pump(page, stop, max = 90, seen) {
  for (let i = 0; i < max; i++) {
    if (seen) await seen();
    if (await stop()) return true;
    const b = page.locator('.dlg .dlg-tray .btn.primary, .event.on .ev-tray .btn.primary');
    if (await b.count()) await b.first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(110);
  }
  return stop();
}
const has = (page, sel) => async () => (await page.locator(sel).count()) > 0;
const goalText = (page) => page.evaluate(() => (G.world.test.goal() || {}).text || null);
const evText = (page) => page.evaluate(() => { const e = document.querySelector('.event.on, .dlg'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
const npc = (page, id) => page.evaluate((id) => (G.world.test.npcs().find((n) => n.id === id) || null), id);
const me = (page) => page.evaluate(() => G.world.test.state());
const slots = (page) => page.evaluate(() => [...document.querySelectorAll('.means-tray .means-slot')].map((b) => ({
  id: b.dataset.means, name: (b.querySelector('.ot') || {}).textContent || '', disabled: b.disabled, locked: b.classList.contains('locked'), label: b.getAttribute('aria-label') || '',
})));
const reactText = (page) => page.evaluate(() => { const r = [...document.querySelectorAll('.wall-react')].pop(); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
const stepOf = (page, place, id) => page.evaluate(([p, s]) => JSON.parse(JSON.stringify(PLACES[p].steps.find((x) => x.id === s))), [place, id]);
async function noBadWords(page, where) {
  const t = await page.evaluate(() => (document.querySelector('.event.on') || document.body).innerText);
  const m = t.match(BAD_WORDS);
  c.ok(!m, `${where}: '틀렸다'·점수 투의 말이 없다${m ? ' (「' + m[0] + '」)' : ''}`);
}
async function targets44(page, where) {
  const small = await smallTargets(page);
  c.ok(small.length === 0, `${where}: 누를 곳 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
}
// 방향키를 누른 채 걷다가 대화창·사건 화면이 뜨면(또는 cond가 참이면) 뗀다
async function walkUntil(page, key, cond, ms = 14000) {
  await page.keyboard.down(key);
  const t0 = Date.now();
  let hit = false;
  while (Date.now() - t0 < ms) {
    if (await cond()) { hit = true; break; }
    // 대화창·사건 화면이 걷기를 멈추게 하면 키가 지워진다 → 다시 누른다
    if (!(await page.locator('.dlg, .event.on').count())) { await page.keyboard.up(key); await page.keyboard.down(key); }
    await page.waitForTimeout(120);
  }
  await page.keyboard.up(key);
  return hit;
}
// 혼의 이름·'전기적 요소'가 화면 어디에도 보이지 않나(잠긴 칸은 이름이 없다)
const honHidden = (page) => page.evaluate(() => {
  const t = document.body.innerText;
  return !/혼(?!인)/.test(t.replace(/혼인/g, '')) && !t.includes('전기적 요소');
});

// 피란길이 한 방향 길인지 맵 격자로 본다: 걸을 수 있는 칸이 서→동으로 끊김 없이 이어지고, 칸 줄(세로)마다 한 덩어리(갈림길·막다른 옆길 없음)
const roadShape = (page) => page.evaluate(() => {
  const m = G.world.test.map();
  const walk = (x, y) => { const ch = (m.grid[y] || '')[x]; return ch !== undefined && !G.tiles.SOLID.has(ch); };
  const cols = [];
  for (let x = 0; x < m.w; x++) {
    const ys = [];
    for (let y = 0; y < m.h; y++) if (walk(x, y)) ys.push(y);
    if (!ys.length) continue;
    let runs = 1; for (let i = 1; i < ys.length; i++) if (ys[i] !== ys[i - 1] + 1) runs++;
    cols.push({ x, top: ys[0], bot: ys[ys.length - 1], runs, n: ys.length });
  }
  let gaps = 0, joined = true;
  for (let i = 1; i < cols.length; i++) {
    if (cols[i].x !== cols[i - 1].x + 1) gaps++;
    if (cols[i].top > cols[i - 1].bot || cols[i].bot < cols[i - 1].top) joined = false; // 옆 줄과 맞닿지 않으면 길이 끊긴다
  }
  const def = PLACES.act2.maps[m.id] || {};
  return { id: m.id, w: m.w, h: m.h, cols: cols.length, x0: cols.length ? cols[0].x : -1, x1: cols.length ? cols[cols.length - 1].x : -1, maxRuns: Math.max(...cols.map((q) => q.runs)), maxWide: Math.max(...cols.map((q) => q.n)), gaps, joined, spawn: def.spawn, spots: def.spots, doors: G.world.test.doors().length };
});

// ═════════ [1] 2막 처음부터 끝까지(휴대폰 가로) ═════════
{
  console.log('\n[1] 휴대폰 가로 844×390 — 2막 「전란의 담」');
  const V = VIEWS.phone;
  const O = await open(browser, V);
  const p = O.page;
  await fresh(p, url);
  // 2막 바로 시작: 바로가기 규칙으로 상태를 맞춘다(1막은 건너뛴 것으로, 혼은 잠김)
  const sc = await p.evaluate(() => { const r = G.rules.shortcutOn(G.save.state, 2); G.save.write(); G.app.play(r.place); return Object.assign(r, { hon: G.save.state.hon }); });
  c.ok(sc.place === 'act2' && sc.hon === 'locked', `2막을 상태로 바로 연다 (${sc.place}, 혼 ${sc.hon})`);
  await p.waitForSelector('.event.cardmode .place-card');
  const pc = await p.textContent('.place-card .pc-name');
  c.ok(/전란의 담|피란길/.test(pc), `2막 거점 첫 장 (${pc})`);
  await p.click('.event.cardmode .ev-tray .btn.primary');
  await p.waitForSelector('.world canvas.wcv, canvas.wcv');

  // ── 피란길 지도: 한 방향 길 ──
  const R = await roadShape(p);
  const cliff = (R.spots || {}).cliff || {}, grass = (R.spots || {}).grass || {};
  c.ok(R.id === 'road', `피란길 맵 (${R.id}, ${R.w}×${R.h})`);
  c.ok(R.gaps === 0 && R.joined && R.maxRuns === 1, `걸을 수 있는 칸이 서→동으로 한 줄기(갈림길·끊김 없음: 줄마다 덩어리 ${R.maxRuns}, 빈 줄 ${R.gaps})`);
  c.ok(R.x1 - R.x0 >= 24 && R.maxWide <= 5, `길이 ${R.x1 - R.x0 + 1}칸, 폭 ${R.maxWide}칸 이하의 긴 한 방향 길`);
  c.ok(R.doors === 0, '피란길에 다른 맵으로 가는 입구가 없다');
  c.ok(R.spawn && R.spawn[0] - R.x0 <= 3 && R.spawn[2] === 'right', `시작은 서쪽 끝, 동쪽을 본다 (${JSON.stringify(R.spawn)})`);
  c.ok(cliff.x >= R.x0 + 18 && grass.x > R.spawn[0] && grass.x < cliff.x, `긴 풀 들(x ${grass.x}) → 산벼랑(x ${cliff.x}) 차례로 동쪽`);
  const grid = await p.evaluate(() => G.world.test.map().grid);
  const tilesUsed = new Set(grid.join(''));
  c.ok(tilesUsed.has('c') && tilesUsed.has('m'), `산벼랑(바위 절벽 c)과 긴 풀 들(짙은 풀 m)이 지도에 있다 (${[...tilesUsed].join('')})`);

  // ── 들어가기 카드 → 걷기: 이생이 앞서 간다 ──
  const beats = await p.evaluate(() => PLACES.act2.beats.map((b) => ({ id: b.id, goal: b.goal || null, go: b.go || null, show: b.show ? Object.keys(b.show) : [], then: b.then ? b.then.hide || null : null })));
  const firstWalk = beats.find((b) => b.goal);
  c.ok(await pump(p, async () => (await goalText(p)) === firstWalk.goal && !(await p.locator('.event.on, .dlg').count())), `지금 할 일: ${firstWalk.goal}`);
  let st = await state(p);
  c.ok((st.words || []).includes('홍건적의 난') && (st.words || []).includes('피란'), `낱말 카드: 홍건적의 난·피란 (${(st.words || []).join(', ')})`);
  let I = await npc(p, 'isaeng'), P0 = await me(p);
  c.ok(I && I.x > P0.x + 40, `이생은 앞서 간다 (이생 x ${I && Math.round(I.x)} > 최 씨 x ${Math.round(P0.x)})`);
  const ind = await p.evaluate(() => G.world.test.indicator());
  c.ok(ind.glow.length + ind.arrows.length > 0, `가야 할 곳에 위치 표시 (빛 ${ind.glow.join(',') || '-'} · 화살표 ${ind.arrows.join(',') || '-'})`);
  // 방향키로 걸어 산벼랑까지(앞서 가는 이생을 따라) — 도중 대화창은 넘긴다
  let walkedTo = false, sawAhead = 0, lastIx = I ? I.x : 0;
  for (let k = 0; k < 8 && !walkedTo; k++) {
    await walkUntil(p, 'ArrowRight', async () => (await p.locator('.dlg, .event.on').count()) > 0);
    const ni = await npc(p, 'isaeng');
    if (ni && ni.x > lastIx + 32) { sawAhead++; lastIx = ni.x; }
    if (await p.locator('.event.on').count()) walkedTo = true;
    else await pump(p, async () => !(await p.locator('.dlg').count()), 20);
  }
  const P1 = await me(p);
  c.ok(walkedTo && P1.x > P0.x + (cliff.x - R.spawn[0] - 4) * 32, `방향키로 동쪽 한 길을 걸어 산벼랑에 닿는다 (${Math.round(P0.x)} → ${Math.round(P1.x)})`);
  c.ok(sawAhead >= 1, `걷는 동안 이생은 늘 앞쪽으로 멀어진다 (앞으로 옮겨 간 번 ${sawAhead})`);

  // ── 산벼랑: 도적이 쫓아오고 이생은 혼자 달아난다 → 뒷모습이 멀어진다 ──
  let awayGap = 0, awayDlg = false;
  const goneAt = await pump(p, async () => !(await npc(p, 'isaeng')) && (await p.locator('.event.on').count()) > 0, 60, async () => {
    if (await p.locator('.dlg').count()) {
      const ni = await npc(p, 'isaeng'), pm = await me(p);
      if (ni) { awayDlg = true; awayGap = Math.max(awayGap, ni.x - pm.x); }
    }
  });
  c.ok(awayDlg && awayGap >= 6 * 32, `맵 위에서 이생의 뒷모습이 멀리(${Math.round(awayGap / 32)}칸 앞) 보인다`);
  c.ok(goneAt, '이생은 혼자 달아나 지도에서 사라진다');

  // ── 붙잡힘: 조작 없는 사건 ──
  const caught = await stepOf(p, 'act2', 'a2-caught');
  let caughtSeen = false, caughtCtl = -1;
  c.ok(await pump(p, has(p, '.means-tray .means-slot'), 40, async () => {
    const t = await evText(p);
    if (!caughtSeen && caught.lines.some((l) => t.includes(l.t))) {
      caughtSeen = true;
      caughtCtl = await p.evaluate(() => document.querySelectorAll('.event.on .opt, .event.on input, .dlg').length + (G.world.test.state().paused ? 0 : 1));
    }
  }), '도적 앞 순간: 수단 칸');
  c.ok(caughtSeen && caughtCtl === 0, `붙잡힘은 고르기·걷기 없는 사건 화면 (조작 ${caughtCtl})`);

  // ── 도적 앞(w2-bandit): 말·시는 통하지 않고 결단(꾸짖음)만 ──
  const WB = await p.evaluate(() => JSON.parse(JSON.stringify(WALLS['w2-bandit'])));
  let S = await slots(p);
  c.ok(S.map((s) => s.id).join(',') === 'mal,si,gyeoldan,hon', `수단 칸: 말·시·결단 + 잠긴 칸 (${S.map((s) => s.name || '(잠김)').join(' · ')})`);
  const lk = S.find((s) => s.id === 'hon') || {};
  c.ok(lk.locked && lk.disabled && !/혼/.test(lk.name + lk.label), '혼은 이름 없는 잠긴 칸');
  c.ok(['mal', 'si', 'gyeoldan'].every((m) => !(S.find((s) => s.id === m) || {}).disabled), '말·시·결단 모두 처음부터 고를 수 있다');
  const threat = (WB.intro || []).filter((l) => /욕보|위협|겁박/.test(l.t || ''));
  c.ok(threat.length === 1, `도적의 위협은 서술 한 줄 (${threat.map((l) => l.t).join(' / ')})`);
  await noBadWords(p, '도적 앞');
  await targets44(p, '도적 앞');
  await p.click('.means-tray .means-slot[data-means="mal"]');
  await p.waitForFunction(() => (G.save.state.walls['w2-bandit'] || []).length === 1);
  await p.waitForSelector('.means-tray .means-slot');
  let rt = await reactText(p);
  st = await state(p);
  c.ok(rt.includes(WB.react.mal.first.t) && !st.done['s:act2:w2-bandit'], `말 → 도적은 들은 체도 않는다, 이야기는 나아가지 않는다`);
  await p.click('.means-tray .means-slot[data-means="si"]');
  await p.waitForFunction(() => (G.save.state.walls['w2-bandit'] || []).length === 2);
  await p.waitForSelector('.means-tray .means-slot');
  rt = await reactText(p);
  st = await state(p);
  c.ok(rt.includes(WB.react.si.first.t) && rt.includes(WB.react.si.hint.t) && !st.done['s:act2:w2-bandit'], '시 → 통하지 않는다(두 번째 실패부터 실마리), 다시 고른다');
  c.ok(st.hon === 'locked', '말·시를 써도 혼은 잠긴 채');
  await noBadWords(p, '도적 앞 반응');
  await p.click('.means-tray .means-slot[data-means="gyeoldan"]');
  await p.waitForSelector('.event.on .ev-tray .btn.primary');
  st = await state(p);
  c.ok(st.walls['w2-bandit'].map((e) => e.m).join(',') === 'mal,si,gyeoldan', `결단(꾸짖음)으로만 나아간다 (${st.walls['w2-bandit'].map((e) => e.m).join(' → ')})`);
  c.ok(st.hon === 'locked', '꾸짖음 직후에도 혼은 아직 잠김(꾸짖어 얻는 능력이 아니다)');

  // ── 꾸짖음 → 암전(그림 없음, 한 줄) → 해석 카드 → 이생 쪽 카드 ──
  const dark = await stepOf(p, 'act2', 'a2-dark');
  c.ok(dark.type === 'blackout' && !dark.scene, '암전 단계에 그림 자리가 없다(자료)');
  let darkInfo = null, rebukeSeen = false;
  c.ok(await pump(p, async () => !!darkInfo, 30, async () => {
    const t = await evText(p);
    if (t.includes('寧死葬於豺狼之腹中')) rebukeSeen = true;
    if (!darkInfo && t.includes(dark.t)) {
      darkInfo = await p.evaluate(() => {
        const ev = document.querySelector('.event.on');
        const art = ev.querySelector('.ev-art');
        const imgs = ev.querySelectorAll('img, svg image, canvas, .scene, .blank-paper, .wall-stage').length;
        const bg = getComputedStyle(art).backgroundImage + ' ' + getComputedStyle(ev).backgroundImage;
        const body = ev.querySelector('.rq-body');
        return { cls: ev.className, imgs, artScene: art.dataset.scene || '', bgUrl: /url\(/.test(bg), notready: !!ev.querySelector('.notready'), text: ev.innerText, folded: !!body && body.hidden, unfold: !!ev.querySelector('.rq-unfold') };
      });
    }
  }), '암전 화면');
  c.ok(rebukeSeen, '꾸짖음(원문 대사) 카드가 암전 앞에 나온다');
  if (darkInfo) {
    c.ok(!darkInfo.notready, `암전이 '준비 중'이 아니라 실제 화면 (${darkInfo.cls})`);
    c.ok(darkInfo.imgs === 0 && !darkInfo.artScene && !darkInfo.bgUrl, `암전: 삽화·그림 자리 없음 (그림 ${darkInfo.imgs}, 장면 「${darkInfo.artScene}」)`);
    c.ok(darkInfo.text.includes(dark.t) && !/살을 발라/.test(darkInfo.text), `한 줄 서술만 보이고 '살을 발라냄'은 보이지 않는다 (${dark.t})`);
    c.ok(darkInfo.folded && darkInfo.unfold, '원문 카드는 접혀 있고 눌러야 펼쳐진다');
    await p.click('.event.on .rq-unfold');
    const unf = await p.evaluate(() => document.querySelector('.event.on').innerText);
    c.ok(/殺而剮之/.test(unf) && /살을 발라/.test(unf), "펼치면 원문과 풀이('살을 발라냄'은 여기에만)");
  }
  const cards = await p.evaluate(() => PLACES.act2.steps.filter((s) => /^a2-isaeng/.test(s.id)).map((s) => s.card.title));
  const era = await stepOf(p, 'act2', 'a2-era');
  let sawEra = false; const sawCards = new Set();
  await pump(p, async () => !!(await state(p)).done['p:act2'], 40, async () => {
    const t = await evText(p);
    if (t.includes(era.card.title) && /그 시대/.test(t)) sawEra = true;
    for (const ti of cards) if (t.includes(ti)) sawCards.add(ti);
  });
  c.ok(sawEra, "'절의·정절은 그 시대의 가치' 해석 카드 한 장");
  c.ok(cards.length >= 2 && cards.length <= 3 && sawCards.size === cards.length, `이생 쪽 이야기는 카드 ${cards.length}장 (${[...sawCards].join(' / ')})`);
  st = await state(p);
  c.ok(!!st.done['p:act2'] && st.hon === 'locked', `피란길이 끝나도 혼은 잠김 (${st.hon})`);

  // ═══ 밤의 최 씨 집 ═══
  await p.waitForSelector('.event.cardmode .place-card', { timeout: 8000 });
  const pc2 = await p.textContent('.place-card .pc-name');
  c.ok(/밤의 최 씨 집/.test(pc2), `밤의 최 씨 집 첫 장 (${pc2})`);
  await p.click('.event.cardmode .ev-tray .btn.primary');
  await p.waitForFunction(() => G.world.test.map().id === 'house');
  const H = await p.evaluate(() => { const m = G.world.test.map(); const d = PLACES.act2night.maps[m.id]; return { night: m.night, spots: Object.values(d.spots || {}).map((s) => s.name), props: (d.props || []).map((x) => x[0]) }; });
  c.ok(H.night && ['행랑채', '낭하', '작은 누각'].every((n) => H.spots.includes(n)), `밤의 맵: 행랑채·낭하·작은 누각 (${H.spots.join(', ')})`);
  c.ok(H.props.includes('pr_pavilion'), '작은 누각이 지도에 그려진다');
  const IP = await npc(p, 'isaeng');
  const pav = await p.evaluate(() => { const s = PLACES.act2night.maps.house.spots.pavilion; return { x0: s.x * 32, x1: (s.x + s.w) * 32 }; });
  c.ok(IP && IP.x >= pav.x0 - 16 && IP.x <= pav.x1 + 16, '이생은 작은 누각에 있다');

  // ── 발소리가 다가온다(글 + 화면 표시) ──
  const nsteps = await stepOf(p, 'act2night', 'n-steps');
  const footLv = [];
  c.ok(await pump(p, has(p, '.hon-panel'), 30, async () => {
    const lv = await p.evaluate(() => [...document.querySelectorAll('.event.on .hon-foot')].map((e) => Number(e.dataset.near)));
    for (const v of lv) if (!footLv.includes(v)) footLv.push(v);
  }), '혼 단계: 맵 위 걷기 판');
  c.ok(nsteps.lines.some((l) => /跫然之音/.test(l.han || '')), '발소리 원문(跫然之音)이 글로 나온다');
  c.ok(footLv.length >= 2 && footLv.every((v, i) => i === 0 || v > footLv[i - 1]), `발소리 화면 표시가 차츰 가까워진다 (${footLv.join(' → ')})`);

  // ── 걷기 전: 이름 없는 잠긴 칸 ──
  const panel = await p.evaluate(() => {
    const pn = document.querySelector('.hon-panel');
    const slot = pn.querySelector('.hon-slot[data-means="hon"]');
    return { phase: pn.dataset.phase, slot: slot ? slot.dataset.state : null, slotText: slot ? slot.innerText.trim() : null, label: slot ? slot.getAttribute('aria-label') : null, foot: Number((pn.querySelector('.hon-foot') || { dataset: {} }).dataset.near || 0), event: !!document.querySelector('.event.on'), paused: G.world.test.state().paused, text: pn.innerText };
  });
  c.ok(panel.phase === 'walk' && !panel.event && !panel.paused, `사건 화면이 걷히고 맵에서 걸을 수 있다 (판 ${panel.phase}, 멈춤 ${panel.paused})`);
  c.ok(panel.slot === 'locked' && !/혼/.test(panel.slotText + panel.label), `혼 칸은 이름 없이 잠긴 채 (글 「${panel.slotText}」, 이름표 「${panel.label}」)`);
  c.ok(panel.foot > Math.max(...footLv), `걷기 판의 발소리 표시가 가장 가깝다 (${panel.foot})`);
  c.ok(await honHidden(p), "걷기 전에는 화면 어디에도 '혼'·'전기적 요소'가 보이지 않는다");
  const hon = await stepOf(p, 'act2night', 'n-hon');
  c.ok(panel.text.includes(hon.walk.t), `걷기 안내 (${hon.walk.t})`);
  await p.waitForTimeout(1500);
  st = await state(p);
  c.ok(st.hon === 'locked' && (await honHidden(p)), '가만히 있으면 열리지 않는다(시간이 지나도 잠김)');
  await targets44(p, '혼 걷기 판');

  // ── 걷기 시작 → '혼' + '전기적 요소' + 짧은 설명 → 원문의 까닭 ──
  const before = await me(p);
  await walkUntil(p, 'ArrowRight', async () => (await p.locator('.event.on .hon-reveal').count()) > 0, 6000);
  const after = await me(p);
  const rv = await p.evaluate(() => {
    const r = document.querySelector('.event.on .hon-reveal');
    if (!r) return null;
    const s = r.querySelector('.hon-slot[data-means="hon"]');
    return { state: s && s.dataset.state, name: (r.querySelector('.hon-name') || {}).textContent || '', tag: (r.querySelector('.hon-tag') || {}).textContent || '', text: r.innerText.replace(/\s+/g, ' ') };
  });
  st = await state(p);
  c.ok(after.x - before.x > 8, `학생이 걷기 시작했다 (${Math.round(before.x)} → ${Math.round(after.x)})`);
  c.ok(!!rv && st.hon === 'open', `걷기 시작한 뒤에야 혼이 열린다 (기록 ${st.hon})`);
  if (rv) {
    c.ok(rv.state === 'open' && rv.name === '혼', `잠긴 칸의 이름이 '혼'으로 드러난다 (${rv.name})`);
    c.ok(rv.tag === '전기적 요소', `'전기적 요소' 표시 (${rv.tag})`);
    c.ok(rv.text.includes(hon.reveal.explain.t) && /기이한/.test(rv.text), '짧은 설명(현실을 벗어난 기이한 사건)');
  }
  let sawReason = 0, sawSetting = false, sawNote = false;
  await pump(p, async () => !(await p.locator('.event.on').count()), 30, async () => {
    const t = await evText(p);
    if (/天帝/.test(t) && /하늘/.test(t)) sawReason |= 1;
    if (/假以幻體/.test(t) && /빌려/.test(t)) sawReason |= 2;
    if (t.includes(hon.setting.t)) sawSetting = true;
    if (t.includes(hon.note.t)) sawNote = true;
  });
  c.ok(sawReason === 3, '원문의 까닭(天帝…假以幻體)을 원문·풀이로 보인다');
  c.ok(sawSetting && sawNote, "혼으로 걷는 길·혼을 수단으로 쓰는 것은 '게임 설정'이라 밝히고, 원작에서의 자리를 알린다");
  const settingMark = await p.evaluate(() => PLACES.act2night.steps.find((s) => s.type === 'hon').setting.mark);
  c.ok(settingMark === '게임 설정' && /하늘이 허락/.test(hon.setting.t) && /꾸짖어 얻은 힘이 아니라/.test(hon.setting.t), '혼은 꾸짖음의 보상이 아니라 하늘의 허락(자료 표시: 게임 설정)');
  st = await state(p);
  c.ok((st.words || []).includes('환신'), `낱말 카드 환신 (${(st.words || []).join(', ')})`);

  // ── 혼으로 걸어 작은 누각의 이생에게 → 재회 ──
  const meet = await p.evaluate(() => PLACES.act2night.beats.find((b) => b.talk === 'isaeng').goal);
  c.ok(await pump(p, async () => (await goalText(p)) === meet && !(await p.locator('.event.on, .dlg').count()), 20), `지금 할 일: ${meet}`);
  const ghost = await me(p);
  c.ok(ghost.sp === 'sp_choi_hon', `혼으로 걷는다(비치는 모습 ${ghost.sp})`);
  const g0 = ghost.x;
  await walkUntil(p, 'ArrowRight', async () => (await me(p)).x > g0 + 5 * 32, 6000);
  c.ok((await me(p)).x > g0 + 4 * 32, '낭하를 따라 동쪽(작은 누각 쪽)으로 걷는다');
  await p.evaluate(() => G.world.test.teleport('isaeng'));
  await p.waitForTimeout(250);
  await p.keyboard.press('KeyE');
  c.ok(await p.waitForSelector('.event.on', { timeout: 3000 }).then(() => true, () => false), '이생에게 말을 건다(E)');
  let sawReunion = false, sawHints = 0;
  const reunion = await stepOf(p, 'act2night', 'n-reunion');
  c.ok(await pump(p, has(p, '.blank-tray .word-card'), 60, async () => {
    const t = await evText(p);
    if (t.includes(reunion.lines[0].t)) sawReunion = true;
    if (/某山某谷/.test(t)) sawHints |= 1;
    if (/暴棄某處/.test(t)) sawHints |= 2;
  }), '2막 끝 빈칸 화면');
  c.ok(sawReunion, '재회(작은 누각에서 다시 만남)');
  c.ok(sawHints === 3, '최 씨가 재물 묻은 골짜기와 유골이 버려진 곳을 알려 준다(3막 실마리)');
  await noBadWords(p, '재회');

  // ── 2막 끝 빈칸: 홍건적의 난, 환신 ──
  const tbl = await p.evaluate(() => ({ active: (document.querySelector('.bt-slot.active') || { dataset: {} }).dataset.blank, cards: [...document.querySelectorAll('.blank-tray .word-card')].map((b) => b.dataset.word) }));
  c.ok(tbl.active === 'b2-war' && ['홍건적의 난', '환신', '피란', '꿈'].every((w) => tbl.cards.includes(w)), `빈칸 b2-war부터, 2막 카드와 헷갈릴 카드 (${tbl.cards.join(' · ')})`);
  await p.click('.blank-tray .word-card[data-word="피란"]');
  await p.waitForSelector('.blank-reply');
  await p.click('.blank-tray .word-card[data-word="홍건적의 난"]');
  await p.waitForFunction(() => (document.querySelector('.bt-slot.active') || { dataset: {} }).dataset.blank === 'b3-hwanshin');
  await p.click('.blank-tray .word-card[data-word="환신"]');
  await p.waitForSelector('.event.on .ev-tray .btn.primary');
  st = await state(p);
  c.ok(st.blanks['b2-war'].first === '피란' && st.blanks['b2-war'].final === '홍건적의 난' && st.blanks['b3-hwanshin'].final === '환신', `빈칸 기록 (${JSON.stringify({ war: st.blanks['b2-war'], hw: st.blanks['b3-hwanshin'] })})`);
  await p.click('.event.on .ev-tray .btn.primary');
  await p.waitForFunction(() => G.save.state.done['p:act2night'], null, { timeout: 8000 }).catch(() => {});
  st = await state(p);
  c.ok(!!st.done['p:act2night'] && st.hon === 'open', '2막이 끝나고 혼은 열린 채 3막으로');
  c.ok(O.errs.length === 0, `2막: 콘솔·페이지·요청 오류 없음${O.errs.length ? ' — ' + O.errs.slice(0, 4).join(' | ') : ''}`);
  c.ok(O.outside.length === 0, `2막: 바깥 주소 요청 없음${O.outside.length ? ' — ' + O.outside.slice(0, 3).join(', ') : ''}`);
  await O.ctx.close();
}

// ═════════ [2] 밤의 최 씨 집(낮은 휴대폰 가로): 화면 안, 이어 하기 ═════════
{
  console.log('\n[2] 낮은 휴대폰 가로 640×360 — 밤의 최 씨 집(혼 걷기 판·이어 하기)');
  const V = VIEWS.low;
  const O = await open(browser, V);
  const p = O.page;
  await fresh(p, url);
  // 상태: 2막 피란길을 마치고 도적 앞을 꾸짖음으로 지남(혼은 잠김)
  const setNight = () => p.evaluate(() => {
    const st = G.save.state;
    G.rules.shortcutOn(st, 2);
    st.walls['w2-bandit'] = [{ n: 1, m: 'gyeoldan' }];
    st.done['p:act2'] = true; st.place = 'act2night';
    G.save.write();
    G.app.play('act2night');
  });
  await setNight();
  await p.waitForSelector('.event.cardmode .place-card');
  await p.click('.event.cardmode .ev-tray .btn.primary');
  c.ok(await pump(p, has(p, '.hon-panel'), 30), '혼 걷기 판');
  const inView = () => p.evaluate(() => {
    const pn = document.querySelector('.hon-panel'); const r = pn.getBoundingClientRect();
    const pad = document.querySelector('.pbtn.talk'); const q = pad ? pad.getBoundingClientRect() : null;
    const over = q && !(r.right <= q.left || r.left >= q.right || r.bottom <= q.top || r.top >= q.bottom);
    return { ok: r.top >= 0 && r.bottom <= innerHeight + 0.5 && r.left >= 0 && r.right <= innerWidth + 0.5, over, pe: getComputedStyle(pn).pointerEvents, h: Math.round(r.height) };
  });
  let v = await inView();
  c.ok(v.ok && !v.over, `높이 360: 걷기 판이 화면 안에 있고 말 걸기 단추를 가리지 않는다 (높이 ${v.h})`);
  c.ok(v.pe === 'none', '걷기 판은 조이스틱 누름을 막지 않는다(pointer-events: none)');
  await p.evaluate(() => { G.save.state.font = 1.3; G.save.state.motion = 'less'; G.app.applySettings(); });
  await p.waitForTimeout(250);
  v = await inView();
  c.ok(v.ok && !v.over, `글자 '아주 크게'·움직임 줄이기에서도 화면 안 (높이 ${v.h})`);
  const anim = await p.evaluate(() => [...document.querySelectorAll('.hon-panel *')].every((e) => { const cs = getComputedStyle(e); return parseFloat(cs.animationDuration) <= 0.001 || cs.animationName === 'none'; }));
  c.ok(anim, '움직임 줄이기: 걷기 판의 움직임이 멈춘다');
  c.ok(await honHidden(p), '걷기 전: 이름이 보이지 않는다');
  // 걷기 전에 닫았다 열기 → 이름은 여전히 감춰진 채, 다시 걷기 판
  await reloadContinue(p);
  await p.waitForSelector('.event.cardmode .place-card');
  await p.click('.event.cardmode .ev-tray .btn.primary');
  c.ok(await pump(p, has(p, '.hon-panel'), 30), '다시 열면 그 단계(걷기 판)부터');
  let st = await state(p);
  c.ok(st.hon === 'locked' && (await honHidden(p)), '닫았다 열어도 걷기 전이면 잠긴 채, 이름은 감춰진 채');
  // 터치(조이스틱)로 걷기 시작
  const zone = await p.locator('.joy-zone').boundingBox();
  const sx = zone.x + zone.width * 0.35, sy = zone.y + zone.height * 0.6;
  const cdp = await p.context().newCDPSession(p);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: sx, y: sy, id: 1 }] });
  for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: sx + i * 6, y: sy, id: 1 }] }); await p.waitForTimeout(60); }
  const opened = await p.waitForSelector('.event.on .hon-reveal', { timeout: 5000 }).then(() => true, () => false);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  st = await state(p);
  c.ok(opened && st.hon === 'open', `터치로 걷기 시작해도 열린다 (${st.hon})`);
  const foc = await p.evaluate(() => { const a = document.activeElement; return a && a.closest('.ev-tray') ? a.textContent.trim() : null; });
  c.ok(!!foc, `열린 뒤 '다음' 단추에 포커스 (${foc})`);
  await targets44(p, '혼이 열림');
  await noBadWords(p, '혼이 열림');
  // 연 뒤 닫았다 열기 → 열린 채(확정 기록), 걷지 않아도 이름이 보인다
  await reloadContinue(p);
  await p.waitForSelector('.event.cardmode .place-card');
  await p.click('.event.cardmode .ev-tray .btn.primary');
  const again = await pump(p, has(p, '.event.on .hon-reveal'), 30);
  st = await state(p);
  c.ok(again && st.hon === 'open' && !(await p.locator('.hon-panel[data-phase="walk"]').count()), '연 뒤 닫았다 열어도 혼은 열린 채(다시 걷게 하지 않는다)');
  c.ok(O.errs.length === 0, `밤: 콘솔·페이지·요청 오류 없음${O.errs.length ? ' — ' + O.errs.slice(0, 4).join(' | ') : ''}`);
  c.ok(O.outside.length === 0, `밤: 바깥 주소 요청 없음${O.outside.length ? ' — ' + O.outside.slice(0, 3).join(', ') : ''}`);
  await O.ctx.close();
}

await browser.close();
c.finish();
