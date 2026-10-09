// 1막 「부모의 담」과 모든 막이 쓰는 두 화면(담 앞 순간 js/game/wall.js, 빈칸 js/game/blank.js) 점검(plan T4).
//  실제 크롬으로 본다.
//  [1] 휴대폰 가로 844×390 — 실제 1막 자료를 처음 하는 학생처럼:
//      조작 익히기(걷기 → 향아에게 말 걸기 → 담 너머 시에 답하기), 원작과 다른 수단을 써도 담만 높아지고 다시 고름,
//      같은 수단 두 번째의 다른 반응과 실마리, 두 번 눌러도 한 번, 반응 직후 닫았다 열어도 기록이 남음,
//      부모 앞 순간, 낱말 카드는 사건에서 저절로, 막 끝 빈칸(맞지 않는 카드 → 인물의 말, 다시 고름, 첫 시도가 남음)
//  [2] 낮은 휴대폰 가로 640×360 — 시험 자료(tests/fixtures/walls-places.js)로 1막에서 쓰지 않는 꼴:
//      이름 없는 잠긴 혼 칸, 통과 없는 순간에서 '돌아서기', 혼이 열리면 칸 이름, 답 고르기 꼴(together는 대화로만, 단추 없음),
//      3막 끝 표 전체 + '반복의 뜻' 한 문장(빈칸이면 넘어가지 않음, 화면 키보드가 열려도 칸과 완료 단추가 보임)
//  [3] 조사 바꾸기(을/를·이/가·으로/로) 단위 점검
//  모든 맥락에서: 콘솔 오류 0, 바깥 요청 0, 누를 곳 44px, '틀렸다'·점수 투의 말 없음
import path from 'node:path';
import { base } from './serve.mjs';
import { HERE, VIEWS, checker, launch, open, fresh, reloadContinue, state, smallTargets } from './lib.mjs';

const c = checker();
const url = await base();
const browser = await launch();
const FIX = path.join(HERE, 'fixtures', 'walls-places.js');
const BAD_WORDS = /틀렸|틀림|오답|정답|점수|등급|실패|게임 오버|잘못/;

// 대화창·사건 화면의 '다음'을 stop()이 참이 될 때까지 누른다(고르기·쓰기 화면에서는 멈춘다)
async function pump(page, stop, max = 80) {
  for (let i = 0; i < max; i++) {
    if (await stop()) return true;
    const b = page.locator('.dlg .dlg-tray .btn.primary, .event.on .ev-tray .btn.primary');
    if (await b.count()) await b.first().click({ timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(110);
  }
  return stop();
}
const has = (page, sel) => async () => (await page.locator(sel).count()) > 0;
const goalText = (page) => page.evaluate(() => (G.world.test.goal() || {}).text || null);
const waitGoal = (page, text) => page.waitForFunction((t) => { const g = G.world && G.world.test && G.world.test.goal(); return g && !G.world.test.state().busy && (!t || g.text === t); }, text || null, { timeout: 10000 }).then(() => true, () => false);
const stage = (page) => page.evaluate(() => { const s = document.querySelector('.wall-stage'); return s ? { moment: s.dataset.moment, height: Number(s.dataset.height) } : null; });
const slots = (page) => page.evaluate(() => [...document.querySelectorAll('.means-tray .means-slot')].map((b) => ({
  id: b.dataset.means, name: (b.querySelector('.ot') || {}).textContent || '', disabled: b.disabled, locked: b.classList.contains('locked'),
  used: !!b.querySelector('.used-mark'), label: b.getAttribute('aria-label') || '',
})));
const reactText = (page) => page.evaluate(() => { const r = [...document.querySelectorAll('.wall-react')].pop(); return r ? r.innerText.replace(/\s+/g, ' ') : ''; });
const pick = (page, means) => page.click(`.means-tray .means-slot[data-means="${means}"]`);
const W = (page, m) => page.evaluate((m) => JSON.parse(JSON.stringify(WALLS[m])), m);
async function noBadWords(page, where) {
  const t = await page.evaluate(() => (document.querySelector('.event.on') || document.body).innerText);
  const m = t.match(BAD_WORDS);
  c.ok(!m, `${where}: '틀렸다'·점수 투의 말이 없다${m ? ' (「' + m[0] + '」)' : ''}`);
}
async function targets44(page, where) {
  const small = await smallTargets(page);
  c.ok(small.length === 0, `${where}: 누를 곳 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
}
async function inView(page, sel, H) {
  return page.evaluate(([sel, H]) => [...document.querySelectorAll(sel)].every((el) => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= -0.5 && r.bottom <= H + 0.5; }), [sel, H]);
}

// ═════════ [1] 실제 1막: 처음 하는 학생 ═════════
{
  console.log('\n[1] 휴대폰 가로 844×390 — 1막 「부모의 담」(실제 자료)');
  const V = VIEWS.phone;
  const O = await open(browser, V);
  const p = O.page;
  await fresh(p, url);
  // 들어가기는 흐름 작업의 몫이라 1막 거점부터 연다(저장 없는 새 학생)
  await p.evaluate(() => { G.save.state.startedAt = Date.now(); G.save.write(); G.app.play('act1'); });
  await p.waitForSelector('.event.cardmode .place-card');
  const pc = await p.textContent('.place-card .pc-name');
  c.ok(/정원|부모의 담/.test(pc), `1막 거점 첫 장 (${pc})`);
  await p.click('.event.cardmode .ev-tray .btn.primary');
  await p.waitForSelector('.world canvas.wcv');
  const mapInfo = await p.evaluate(() => { const m = G.world.test.map(); return { id: m.id, w: m.w, h: m.h, top: m.grid[0], wallRow: m.grid.findIndex((r) => /^#+$/.test(r.slice(1, -1)) || r.split('').filter((ch) => ch === '#').length >= r.length - 2) }; });
  const props = await p.evaluate(() => (PLACES.act1.maps.garden.props || []).map((x) => x[0]));
  c.ok(mapInfo.id === 'garden' && mapInfo.wallRow >= 0 && ['pr_willow', 'pr_pavilion', 'pr_swing', 'pr_flowers'].every((k) => props.includes(k)),
    `정원 한 판: 북쪽 담(격자 ${mapInfo.wallRow}번째 줄)·버드나무·누각·꽃밭·그네 (${props.join(',')})`);

  // ── 조작 익히기 1: 걷기 ──
  const beats = await p.evaluate(() => PLACES.act1.beats.map((b) => ({ id: b.id, goal: b.goal || null, say: (b.say || []).map((l) => l.t || l) })));
  const bWalk = beats.find((b) => b.id === 'b-walk'), bHyang = beats.find((b) => b.id === 'b-hyang');
  c.ok(bWalk.say.length > 0 && bHyang.say.length > 0, '걷기·말 걸기 목표에 조작 안내 글이 있다(자료)');
  let sawWalkTip = false;
  await pump(p, async () => {
    const t = await p.evaluate(() => (document.querySelector('.dlg') || {}).innerText || '');
    if (t.includes(bWalk.say[0])) sawWalkTip = true;
    return (await goalText(p)) === bWalk.goal && !(await p.locator('.dlg').count());
  });
  c.ok(sawWalkTip, `걷기 전에 이야기 안에서 조작 안내 (${bWalk.say[0]})`);
  c.ok(await waitGoal(p, bWalk.goal), `지금 할 일: ${bWalk.goal}`);
  const ind = await p.evaluate(() => G.world.test.indicator());
  c.ok(ind.glow.includes('swing') || ind.arrows.includes('swing'), `그네에 위치 표시 (빛 ${ind.glow.join(',') || '-'} · 화살표 ${ind.arrows.join(',') || '-'})`);
  const p0 = await p.evaluate(() => G.world.test.state());
  const sw = await p.evaluate(() => G.world.test.targets().find((t) => t.id === 'swing'));
  const dir = Math.abs(sw.x - p0.x) >= Math.abs(sw.y - p0.y) ? (sw.x < p0.x ? 'ArrowLeft' : 'ArrowRight') : (sw.y < p0.y ? 'ArrowUp' : 'ArrowDown');
  const tiles = Math.round(Math.hypot(sw.x - p0.x, sw.y - p0.y) / 32);
  c.ok(tiles >= 2 && tiles <= 7, `그네는 몇 걸음 거리 (${tiles}칸)`);
  await p.keyboard.down(dir);
  const walked = await p.waitForSelector('.dlg, .event.on', { timeout: 6000 }).then(() => true, () => false);
  await p.keyboard.up(dir);
  const p1 = await p.evaluate(() => G.world.test.state());
  c.ok(walked && Math.hypot(p1.x - p0.x, p1.y - p0.y) > 40, `방향키로 걸어 그네에 닿으면 이야기가 이어진다 (${dir})`);

  // ── 조작 익히기 2: 향아에게 말 걸기 ──
  let sawTalkTip = false;
  await pump(p, async () => {
    const t = await p.evaluate(() => (document.querySelector('.dlg') || {}).innerText || '');
    if (t.includes(bHyang.say[0])) sawTalkTip = true;
    return (await goalText(p)) === bHyang.goal && !(await p.locator('.dlg').count());
  });
  c.ok(sawTalkTip, `말 걸기 전에 조작 안내 (${bHyang.say[0]})`);
  c.ok(await waitGoal(p, bHyang.goal), `지금 할 일: ${bHyang.goal}`);
  await p.evaluate(() => G.world.test.teleport('hyanga'));
  await p.waitForTimeout(250);
  const tb = await p.locator('.pbtn.talk').boundingBox();
  await p.touchscreen.tap(tb.x + tb.width / 2, tb.y + tb.height / 2);
  c.ok(await p.waitForSelector('.event.on', { timeout: 3000 }).then(() => true, () => false), '말 걸기 단추로 향아에게 말을 건다');

  // ── 조작 익히기 3: 수단 고르기(w1-poem) ──
  c.ok(await pump(p, has(p, '.means-tray .means-slot')), '담 앞 순간(시에 답하기): 수단 칸이 뜬다');
  const w1 = await W(p, 'w1-poem');
  const tip = await p.evaluate(() => (PLACES.act1.steps.find((s) => s.id === 'w1-poem').tip || {}).t || '');
  const trayHint = await p.evaluate(() => (document.querySelector('.means-tray .tray-hint') || {}).textContent || '');
  c.ok(!!tip && trayHint.includes(tip), `처음 수단을 고를 때 안내 (${trayHint})`);
  let S = await slots(p);
  c.ok(S.map((s) => s.id).join(',') === 'mal,si,gyeoldan,hon', `수단 칸: 말·시·결단 + 잠긴 칸 (${S.map((s) => s.name || '(이름 없음)').join(' · ')})`);
  const lockSlot = S.find((s) => s.id === 'hon') || {};
  c.ok(lockSlot.locked && lockSlot.disabled && !/혼/.test(lockSlot.name + lockSlot.label), `혼은 열리기 전 이름 없는 잠긴 칸 (글 「${lockSlot.name}」, 이름표 「${lockSlot.label}」)`);
  c.ok((await stage(p)).moment === 'w1-poem' && (await stage(p)).height === 0, '담 높이 연출: 처음 높이 0');
  const focus0 = await p.evaluate(() => document.activeElement && document.activeElement.dataset.means);
  c.ok(focus0 === 'mal', `첫 수단 칸에 포커스 (${focus0})`);
  await targets44(p, '담 앞 순간');
  await noBadWords(p, '담 앞 순간');
  // 원작과 다른 수단(말) → 반응, 담만 높아지고 다시 고른다
  await pick(p, 'mal');
  await p.waitForSelector('.wall-react');
  await p.waitForSelector('.means-tray .means-slot');
  let st = await state(p);
  let rt = await reactText(p);
  S = await slots(p);
  c.ok(rt.includes(w1.react.mal.first.t) && !rt.includes(w1.react.mal.hint.t), `말을 쓰면 향아의 첫 반응 (${rt.slice(0, 40)}…)`);
  c.ok((await stage(p)).height === 1 && !st.done['s:act1:w1-poem'] && S.filter((s) => !s.locked).every((s) => !s.disabled), '원작과 다른 수단: 담만 높아지고(0→1) 진행은 그대로, 모든 칸을 다시 고를 수 있다');
  c.ok(S.find((s) => s.id === 'mal').used && !S.find((s) => s.id === 'si').used, '써 본 수단에 작은 표시(다시 고를 수 있음)');
  c.ok(JSON.stringify(st.walls['w1-poem']) === JSON.stringify([{ n: 1, m: 'mal' }]), `시도가 곧바로 기록된다 (${JSON.stringify(st.walls['w1-poem'])})`);
  await noBadWords(p, '수단 반응');
  // 반응을 본 직후 닫았다 열어도 기록이 남는다
  await reloadContinue(p);
  await p.waitForSelector('.event.cardmode .place-card');
  await p.click('.event.cardmode .ev-tray .btn.primary');
  c.ok(await pump(p, has(p, '.means-tray .means-slot')), '다시 열면 그 담 앞 순간부터');
  st = await state(p);
  S = await slots(p);
  c.ok(st.walls['w1-poem'].length === 1 && (await stage(p)).height === 1 && S.find((s) => s.id === 'mal').used, '닫았다 열어도 써 본 수단과 담 높이가 남는다');
  // 같은 수단을 다시 → 다른 반응 + 두 번째 실패부터 실마리
  await pick(p, 'mal');
  await p.waitForFunction(() => document.querySelectorAll('.wall-react').length && G.save.state.walls['w1-poem'].length === 2);
  rt = await reactText(p);
  c.ok(rt.includes(w1.react.mal.again.t) && !rt.includes(w1.react.mal.first.t), `같은 수단을 다시 쓰면 다른 반응 (${w1.react.mal.again.t})`);
  c.ok(rt.includes(w1.react.mal.hint.t), `두 번째 실패부터 실마리 (${w1.react.mal.hint.t})`);
  c.ok((await stage(p)).height === 2, '담이 한 칸 더 높아진다(2)');
  // 두 번 눌러도 한 번
  await p.waitForSelector('.means-tray .means-slot[data-means="gyeoldan"]');
  await p.evaluate(() => { const b = document.querySelector('.means-tray .means-slot[data-means="gyeoldan"]'); b.click(); b.click(); });
  await p.waitForTimeout(400);
  st = await state(p);
  c.ok(st.walls['w1-poem'].length === 3 && st.walls['w1-poem'][2].m === 'gyeoldan', `같은 단추를 두 번 눌러도 시도는 한 번 (${st.walls['w1-poem'].map((e) => e.n + e.m).join(' ')})`);
  // 원작의 수단(시) → 통과
  await p.waitForSelector('.means-tray .means-slot[data-means="si"]');
  await pick(p, 'si');
  await p.waitForSelector('.event.on .ev-tray .btn.primary');
  rt = await reactText(p);
  st = await state(p);
  c.ok(rt.includes(w1.react.si.first.t) && st.walls['w1-poem'].map((e) => e.m).join(',') === 'mal,mal,gyeoldan,si', `시로 답하면 이야기가 나아간다 (${st.walls['w1-poem'].map((e) => e.m).join(' → ')})`);
  c.ok((await stage(p)).height === 3, '통과해도 담 높이는 그대로(벌 없음, 보이기만)');

  // ── 1막 이어서: 소식 묻기(향아) → 부모 앞 ──
  const ask = beats.find((b) => b.id === 'b-ask');
  await pump(p, async () => (await goalText(p)) === ask.goal && !(await p.locator('.event.on, .dlg').count()));
  c.ok(await waitGoal(p, ask.goal), `지금 할 일: ${ask.goal}`);
  await p.evaluate(() => G.world.test.teleport('hyanga'));
  await p.waitForTimeout(250);
  await p.keyboard.press('KeyE');
  c.ok(await p.waitForSelector('.event.on', { timeout: 3000 }).then(() => true, () => false), '향아에게 소식을 부탁한다(E)');
  c.ok(await pump(p, async () => (await stage(p) || {}).moment === 'w1-parents' && (await p.locator('.means-tray .means-slot').count()) > 0), '담 앞 순간(부모 앞)');
  const w2 = await W(p, 'w1-parents');
  c.ok((await stage(p)).height === 3, `같은 막의 두 번째 순간: 담 높이는 막마다 하나(${(await stage(p)).height})`);
  await pick(p, 'si');
  await p.waitForFunction(() => (G.save.state.walls['w1-parents'] || []).length === 1);
  rt = await reactText(p);
  c.ok(rt.includes(w2.react.si.first.t) && (await stage(p)).height === 4, '부모 앞에서 시 → 아버지의 말, 담이 높아진다');
  await p.waitForSelector('.means-tray .means-slot[data-means="mal"]');
  await pick(p, 'mal');
  await p.waitForSelector('.event.on .ev-tray .btn.primary');
  st = await state(p);
  c.ok(st.walls['w1-parents'].map((e) => e.m).join(',') === 'si,mal', '털어놓으면(말) 이야기가 나아간다');

  // ── 막 끝 빈칸 ──
  c.ok(await pump(p, has(p, '.blank-tray .word-card')), '1막 끝 빈칸 화면');
  st = await state(p);
  c.ok(['담장', '울주', '혼인', '과거 급제'].every((w) => (st.words || []).includes(w)), `낱말 카드는 사건을 지나며 저절로 얻었다 (${(st.words || []).join(', ')})`);
  const tbl = await p.evaluate(() => ({ rows: document.querySelectorAll('.blank-table .bt-row').length, active: (document.querySelector('.bt-slot.active') || {}).dataset ? document.querySelector('.bt-slot.active').dataset.blank : null, cards: [...document.querySelectorAll('.blank-tray .word-card')].map((b) => b.dataset.word) }));
  c.ok(tbl.rows === 3 && tbl.active === 'b1-wall', `표 전체(세 줄)가 보이고 첫 빈칸이 지금 칸 (${tbl.rows}줄, ${tbl.active})`);
  c.ok(['담장', '혼인', '울주', '과거 급제'].every((w) => tbl.cards.includes(w)), `막의 낱말 카드 + 헷갈릴 카드 (${tbl.cards.join(' · ')})`);
  await targets44(p, '빈칸 화면');
  const rep = await p.evaluate(() => CARDS.replies['b1-wall']['울주'].t);
  await p.click('.blank-tray .word-card[data-word="울주"]');
  await p.waitForSelector('.blank-reply');
  const br = await p.evaluate(() => ({ t: document.querySelector('.blank-reply').innerText.replace(/\s+/g, ' '), active: document.querySelector('.bt-slot.active').dataset.blank, wrongMark: document.querySelectorAll('.wrong, .bad, .feedback.bad').length }));
  st = await state(p);
  c.ok(br.t.includes(rep) && br.wrongMark === 0, `맞지 않는 카드 → 인물이 작품 속 말로 답한다, 오답 표시 없음 (${rep})`);
  c.ok(br.active === 'b1-wall' && st.blanks['b1-wall'].first === '울주' && !st.blanks['b1-wall'].final, '다시 고른다(첫 시도 울주가 기록됨)');
  await noBadWords(p, '빈칸 답');
  await p.click('.blank-tray .word-card[data-word="담장"]');
  await p.waitForFunction(() => document.querySelector('.bt-slot[data-blank="b1-wall"].filled'));
  const row1 = await p.evaluate(() => document.querySelectorAll('.blank-table .bt-row')[0].innerText.replace(/\s+/g, ' '));
  c.ok(row1.includes('담장을'), `채운 낱말에 조사가 붙는다 (${row1.slice(0, 24)}…)`);
  await p.waitForFunction(() => (document.querySelector('.bt-slot.active') || {}).dataset && document.querySelector('.bt-slot.active').dataset.blank === 'b2-marriage');
  await p.click('.blank-tray .word-card[data-word="혼인"]');
  await p.waitForFunction(() => document.querySelector('.bt-slot[data-blank="b2-marriage"].filled'));
  st = await state(p);
  c.ok(st.blanks['b1-wall'].final === '담장' && st.blanks['b1-wall'].first === '울주' && st.blanks['b2-marriage'].final === '혼인' && st.blanks['b2-marriage'].first === '혼인', `기록: 칸마다 최종 낱말과 첫 낱말 (${JSON.stringify(st.blanks)})`);
  await p.waitForSelector('.event.on .ev-tray .btn.primary');
  await p.click('.event.on .ev-tray .btn.primary');
  await p.waitForFunction(() => G.save.state.done['p:act1'], null, { timeout: 8000 }).catch(() => {});
  st = await state(p);
  c.ok(!!st.done['p:act1'], '빈칸을 채우면 1막이 끝난다');
  await reloadContinue(p);
  st = await state(p);
  c.ok(st.blanks['b1-wall'].first === '울주' && st.blanks['b1-wall'].final === '담장', '닫았다 열어도 첫 시도가 결과용 기록에 남는다');
  c.ok(O.errs.length === 0, `1막: 콘솔·페이지·요청 오류 없음${O.errs.length ? ' — ' + O.errs.slice(0, 4).join(' | ') : ''}`);
  c.ok(O.outside.length === 0, `1막: 바깥 주소 요청 없음${O.outside.length ? ' — ' + O.outside.slice(0, 3).join(', ') : ''}`);
  await O.ctx.close();
}

// ═════════ [2] 시험 자료: 1막에서 쓰지 않는 꼴(낮은 휴대폰 가로) ═════════
{
  console.log('\n[2] 낮은 휴대폰 가로 640×360 — 시험 자료(경계·답 고르기·반복의 뜻)');
  const V = VIEWS.low;
  const O = await open(browser, V);
  const p = O.page;
  await fresh(p, url);
  await p.addScriptTag({ path: FIX });
  // 3막 끝 표를 보이려고 앞 막 빈칸을 채워 둔다(혼은 잠김)
  await p.evaluate(() => G.rules.test.set({ blanks: { 'b1-wall': { first: '울주', final: '담장' }, 'b2-marriage': { first: '혼인', final: '혼인' }, 'b2-war': { first: '피란', final: '홍건적의 난' }, 'b3-hwanshin': { first: '환신', final: '환신' } }, hon: 'locked' }));
  await p.click('.title-side button:has-text("시작")');
  await p.waitForSelector('.event.cardmode .place-card');
  await p.click('.event.cardmode .ev-tray .btn.primary');
  c.ok(await pump(p, has(p, '.means-tray .means-slot')), '통과 없는 순간(경계): 수단 칸');
  const wb = await W(p, 'w3-border');
  let S = await slots(p);
  const lk = S.find((s) => s.id === 'hon') || {};
  c.ok(S.map((s) => s.id).join(',') === 'mal,si,gyeoldan,hon' && lk.locked && lk.disabled && !/혼/.test(lk.name + lk.label), `잠긴 혼 칸은 이름 없이 (${S.map((s) => s.name || '(잠김)').join(' · ')})`);
  let st = await state(p);
  c.ok(st.border === true, '경계 앞 순간에 들어서면 겪은 것으로 기록(border)');
  const leaveBtn = await p.evaluate(() => { const b = document.querySelector('.means-tray .wall-leave'); return b ? b.textContent.trim() : null; });
  c.ok(!!leaveBtn, `'돌아서기' 단추 (${leaveBtn})`);
  c.ok(await inView(p, '.means-tray .means-slot, .means-tray .wall-leave', 360), '높이 360: 수단 칸과 돌아서기가 화면 안에 보인다');
  await targets44(p, '경계 앞(640×360)');
  // 글자 크기 '아주 크게'와 움직임 줄이기에서도 수단 칸이 화면 안에
  await p.evaluate(() => { G.save.state.font = 1.3; G.save.state.motion = 'less'; G.app.applySettings(); });
  await p.waitForTimeout(250);
  c.ok(await inView(p, '.means-tray .means-slot, .means-tray .wall-leave', 360), "글자 크기 '아주 크게'·움직임 줄이기: 수단 칸과 돌아서기가 화면 안에 보인다");
  await targets44(p, "경계 앞(아주 크게)");
  await p.evaluate(() => { G.save.state.font = 1; G.save.state.motion = 'full'; G.app.applySettings(); });
  await pick(p, 'mal');
  await p.waitForFunction(() => (G.save.state.walls['w3-border'] || []).length === 1);
  let rt = await reactText(p);
  c.ok(rt.includes(wb.react.mal.first.t) && !rt.includes(wb.react.mal.hint.t), '첫 반응(실마리 없음)');
  await p.waitForSelector('.means-tray .means-slot[data-means="mal"]');
  await pick(p, 'mal');
  await p.waitForFunction(() => (G.save.state.walls['w3-border'] || []).length === 2);
  rt = await reactText(p);
  c.ok(rt.includes(wb.react.mal.again.t) && rt.includes(wb.react.mal.hint.t), `같은 수단 두 번째: 다른 반응 + 실마리 (${rt.slice(0, 50)}…)`);
  c.ok((await stage(p)).height === 2, `담이 높아진다(보이기만, ${(await stage(p)).height})`);
  await noBadWords(p, '경계 반응');
  // 혼이 열린 뒤 같은 순간에서 칸 이름이 드러나는지 보려고, 돌아서기 전에 혼을 연다(다음 단계에서 본다)
  await p.evaluate(() => G.rules.test.set({ hon: 'open' }));
  await p.click('.means-tray .wall-leave');
  c.ok(await pump(p, async () => (await state(p)).done['s:fx_walls:fx-border']), "'돌아서기'로 통과 없는 순간을 떠난다");
  st = await state(p);
  c.ok(st.walls['w3-border'].length === 2, '떠나도 써 본 수단은 남는다');
  c.ok(await pump(p, has(p, '.means-tray .means-slot')), '혼이 열린 뒤 같은 순간');
  S = await slots(p);
  const hs = S.find((s) => s.id === 'hon');
  c.ok(hs && !hs.locked && !hs.disabled && hs.name === '혼', `혼이 열리면 칸 이름이 '혼' (${hs && hs.name})`);
  await p.click('.means-tray .wall-leave');

  // ── 답 고르기(이생의 제안) ──
  const wp = await W(p, 'w3-propose');
  let sawTogether = false, togetherBeforeButtons = true;
  c.ok(await pump(p, async () => {
    const t = await p.evaluate(() => (document.querySelector('.event.on') || {}).innerText || '');
    const btns = await p.locator('.answer-tray .answer-slot').count();
    if (t.includes(wp.together.reply.ko) && t.includes(wp.together.isaeng.ko)) sawTogether = true;
    if (btns && !sawTogether) togetherBeforeButtons = false;
    return btns > 0;
  }), '답 고르기 화면');
  c.ok(sawTogether && togetherBeforeButtons, '고르기 앞에 together 대화(이생의 말 + 최 씨의 원작 답)가 먼저 나온다');
  const ans = await p.evaluate(() => [...document.querySelectorAll('.answer-tray .answer-slot')].map((b) => ({ id: b.dataset.answer, t: b.innerText.replace(/\s+/g, ' ') })));
  c.ok(ans.map((a) => a.id).join(',') === 'stay,entrust' && !ans.some((a) => /together|함께 (가|저승)/.test(a.id + a.t)), `답은 둘뿐, '함께 가자' 단추 없음 (${ans.map((a) => a.t).join(' / ')})`);
  c.ok(ans[0].t.includes(wp.labels.stay.t) && ans[1].t.includes(wp.labels.entrust.t), '단추 글은 자료의 labels');
  const h0 = (await stage(p)).height;
  await p.click('.answer-tray .answer-slot[data-answer="stay"]');
  await p.waitForFunction(() => (G.save.state.propose || []).length === 1);
  await p.waitForSelector('.answer-tray .answer-slot');
  rt = await reactText(p);
  c.ok(rt.includes(wp.react.stay.first.t) && (await stage(p)).height === h0 + 1, `'남겠다' → 저승의 법이 답하고 담이 높아진다 (${h0}→${(await stage(p)).height})`);
  c.ok((await p.locator('.answer-tray .answer-slot').count()) === 2, '다시 고른다');
  await p.click('.answer-tray .answer-slot[data-answer="entrust"]');
  await p.waitForSelector('.event.on .ev-tray .btn.primary');
  st = await state(p);
  c.ok(st.propose.join(',') === 'stay,entrust', `답한 차례가 기록된다(첫 답 ${st.propose[0]})`);

  // ── 3막 끝: 표 전체 + 반복의 뜻 한 문장 ──
  c.ok(await pump(p, has(p, '.wfield input')), '3막 끝: 쓰기 칸');
  const fin = await p.evaluate(() => ({ q: FINALE.repeat.t, rows: [...document.querySelectorAll('.blank-table .bt-row')].map((r) => r.innerText.replace(/\s+/g, ' ')), text: document.querySelector('.event.on').innerText }));
  c.ok(fin.rows.length === 3 && fin.rows[0].includes('담장을') && fin.rows[1].includes('홍건적의 난이') && fin.rows[2].includes('환신으로'), `표 전체가 낱말과 조사로 채워져 보인다 (${fin.rows.map((r) => r.slice(0, 14)).join(' / ')})`);
  c.ok(fin.text.includes(fin.q), `반복의 뜻 물음 (${fin.q})`);
  await p.click('.wfield .wf-done');
  await p.waitForTimeout(200);
  const blockedW = await p.evaluate(() => ({ still: !!document.querySelector('.wfield input'), need: !!document.querySelector('.wfield .wf-need:not([hidden])') }));
  c.ok(blockedW.still && blockedW.need && !(await state(p)).lines.repeat, '빈칸이면 넘어가지 않는다(필수)');
  await targets44(p, '반복의 뜻 쓰기');
  await p.click('.wfield input');
  await p.setViewportSize({ width: 640, height: 200 });
  await p.waitForTimeout(350);
  const vis = await p.evaluate(() => {
    const ok = (el) => { const r = el.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return r.height > 0 && r.top >= -0.5 && r.bottom <= innerHeight + 0.5 && (hit === el || el.contains(hit)); };
    return { input: ok(document.querySelector('.wfield input')), done: ok(document.querySelector('.wfield .wf-done')) };
  });
  c.ok(vis.input && vis.done, '화면 키보드 흉내(보이는 높이 200): 쓰기 칸과 완료 단추가 보인다');
  await p.keyboard.type('여러 번 헤어져도 다시 만나려 한 마음의 깊이');
  await p.keyboard.press('Enter');
  await p.setViewportSize({ width: 640, height: 360 });
  await p.waitForFunction(() => G.save.state.lines && G.save.state.lines.repeat);
  st = await state(p);
  c.ok(st.lines.repeat === '여러 번 헤어져도 다시 만나려 한 마음의 깊이', `반복의 뜻 한 문장이 기록된다 (${st.lines.repeat})`);
  await pump(p, async () => !!(await state(p)).done['s:fx_walls:fx-repeat']);
  c.ok(!!(await state(p)).done['s:fx_walls:fx-repeat'], '쓰고 나면 넘어간다');

  // ── [3] 조사 바꾸기 ──
  console.log('\n[3] 조사 바꾸기');
  const J = await p.evaluate(() => {
    const j = G.blank && G.blank.josa;
    if (!j) return null;
    return {
      a: j('담장', '을'), b: j('과거 급제', '을'), c: j('혼인', '이'), d: j('울주', '이'), e: j('환신', '으로'), f: j('꿈', '으로'),
      g: j('피란', '으로'), h: j('서울', '으로'), i: j('바다', '으로'), k: j('홍건적의 난', '이'), l: j('담장', '를'), m: j('바다', '은'),
      fill: G.blank.fill('{b1-wall:을} 넘고 {b2-war:이} 나고 {b3-hwanshin:으로}', { 'b1-wall': '과거 급제', 'b2-war': '울주', 'b3-hwanshin': '서울' }),
    };
  });
  c.ok(!!J, 'G.blank.josa가 있다');
  if (J) {
    c.ok(J.a === '담장을' && J.b === '과거 급제를' && J.l === '담장을', `을/를 (${J.a}, ${J.b}, ${J.l})`);
    c.ok(J.c === '혼인이' && J.d === '울주가' && J.k === '홍건적의 난이', `이/가 (${J.c}, ${J.d}, ${J.k})`);
    c.ok(J.e === '환신으로' && J.f === '꿈으로' && J.g === '피란으로' && J.h === '서울로' && J.i === '바다로', `으로/로, ㄹ 받침은 로 (${J.e}, ${J.f}, ${J.g}, ${J.h}, ${J.i})`);
    c.ok(J.m === '바다는', `은/는 (${J.m})`);
    c.ok(J.fill === '과거 급제를 넘고 울주가 나고 서울로', `표 문장 채우기 (${J.fill})`);
  }
  c.ok(O.errs.length === 0, `시험 자료: 콘솔·페이지·요청 오류 없음${O.errs.length ? ' — ' + O.errs.slice(0, 4).join(' | ') : ''}`);
  c.ok(O.outside.length === 0, `시험 자료: 바깥 주소 요청 없음${O.outside.length ? ' — ' + O.outside.slice(0, 3).join(', ') : ''}`);
  await O.ctx.close();
}

await browser.close();
c.finish();
