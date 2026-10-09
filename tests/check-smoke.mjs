// 엔진 틀 점검(T1): 실제 크롬으로 시험 자료(tests/fixtures/smoke-places.js)를 놀며 본다.
//  1. PC(마우스·키보드): 타이틀 → 설정(글자 크기·움직임 줄이기) → 시작 → 맵 → 위치 표시(화면 밖 화살표·가까이 빛)
//     → 방향키·마우스 끌기로 걷기 → E로 말 걸기 → 사건 화면(표시 칩) → 구역 밟기 → 고르기(Tab 차례) → 한 줄 쓰기(빈칸 막힘)
//     → 등록되지 않은 단계('준비 중') → 순서 없는 할 일·열림 조건(need)·되풀이 구역·마침 조건 → 다시 열어 이어 하기
//     → 빈 거점('준비 중') → 결과 화면 틀(같은 그리기로 화면 SVG와 저장 그림) → 처음부터
//  2. 휴대폰 가로(터치): 누를 곳 44px, 터치 조이스틱으로 걷기, 말 걸기 단추, 고르기
//  3. 낮은 휴대폰 가로 640×360에서 화면 키보드를 흉내 내어(높이를 줄여) 쓰기 칸과 완료 단추가 보이는가
//  4. 세로 화면: 돌려 달라는 안내
//  모든 맥락에서: 콘솔 오류 0, 바깥 요청 0, 저장 열쇠가 모두 'isaeng-gyujang:'로 시작, 게이지·선생님 단추·방식 고르기·수첩 없음
import path from 'node:path';
import { base } from './serve.mjs';
import { HERE, KEY_PREFIX, VIEWS, checker, launch, open, fresh, startGame, reloadContinue, state, storageKeys, advance, talkTo, smallTargets } from './lib.mjs';

const c = checker();
const url = await base();
const FIX = path.join(HERE, 'fixtures', 'smoke-places.js');
const inject = (page) => page.addScriptTag({ path: FIX });
const browser = await launch();

const FORBID = /수첩|선생님|게이지|처음 배우기|깊이 읽기|이어 하기 글자|방식 고르기/;
const BANNED = '.gauge, .gauges, .st-gauges, .gstrip .gbar, .teacher-only, .skip-goal, .skip-scene, .mode-sheet, .mode-card, .notebook-mini, [class*="notebook"], .pocket, .tokens, .frags, .oldmap';
async function noSibling(page, where) {
  const r = await page.evaluate((sel) => ({ n: document.querySelectorAll(sel).length, text: document.body.innerText, teacher: document.documentElement.classList.contains('teacher') }), BANNED);
  const word = (r.text.match(FORBID) || [])[0];
  c.ok(r.n === 0 && !word && !r.teacher, `${where}: 게이지·선생님 단추·방식 고르기·수첩이 화면에 없다` + (r.n ? ` (요소 ${r.n}개)` : '') + (word ? ` (글 「${word}」)` : '') + (r.teacher ? ' (선생님용 표시)' : ''));
}
async function keysOk(page, where) {
  const keys = await storageKeys(page);
  c.ok(keys.length > 0 && keys.every((k) => k.startsWith(KEY_PREFIX)), `${where}: 저장 열쇠가 모두 ${KEY_PREFIX}로 시작 (${keys.join(', ') || '없음'})`);
}
const goal = (page) => page.evaluate(() => G.world.test.goal());
const targets = (page) => page.evaluate(() => G.world.test.targets().map((t) => t.id).sort());
const pos = (page) => page.evaluate(() => { const s = G.world.test.state(); return { x: s.x, y: s.y }; });
const ind = (page) => page.evaluate(() => G.world.test.indicator());
const waitGoal = (page) => page.waitForFunction(() => G.world && G.world.test && G.world.test.goal() && !G.world.test.state().busy, null, { timeout: 8000 });
async function openCard(page, how = 'click') {
  await page.waitForSelector('.event.cardmode .place-card', { timeout: 8000 });
  if (how === 'enter') await page.keyboard.press('Enter');
  else await page.click('.event.cardmode .ev-tray .btn.primary');
  await page.waitForSelector('.world canvas.wcv', { timeout: 8000 });
  await waitGoal(page);
}
// 사건 화면이 닫힐 때까지 Enter로 넘긴다
async function enterThrough(page, max = 30) {
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('.event.on').count()) || (await page.locator('.event.on .place-card').count())) return true; // 다음 거점 첫 장에서 멈춘다
    await page.keyboard.press('Enter');
    await page.waitForTimeout(110);
  }
  return !(await page.locator('.event.on').count()) || !!(await page.locator('.event.on .place-card').count());
}
async function writeVisible(page, H) {
  return page.evaluate((H) => {
    const inp = document.querySelector('.wfield input'), btn = document.querySelector('.wfield .wf-done');
    if (!inp || !btn) return { input: false, button: false, why: '쓰기 칸 없음' };
    const vis = (el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return r.height > 0 && r.top >= -0.5 && r.bottom <= H + 0.5 && (hit === el || el.contains(hit));
    };
    const ri = inp.getBoundingClientRect(), rb = btn.getBoundingClientRect();
    return { input: vis(inp), button: vis(btn), focused: document.activeElement === inp, docked: !!inp.closest('.wf-docked'), why: `칸 ${Math.round(ri.top)}~${Math.round(ri.bottom)} · 단추 ${Math.round(rb.top)}~${Math.round(rb.bottom)} / 높이 ${H}` };
  }, H);
}

// ═════════ 1. PC: 마우스·키보드로 처음부터 결과 화면 틀까지 ═════════
{
  console.log('\n[1] PC 1366×860 — 마우스·키보드');
  const D = await open(browser, VIEWS.desktop);
  const p = D.page;
  await fresh(p, url + '?teacher=1');
  const t = await p.evaluate(() => ({ h1: document.querySelector('.title-screen h1').textContent, want: FLOW.title, buttons: [...document.querySelectorAll('.title-side button')].map((b) => b.textContent.trim()) }));
  c.ok(t.h1 === t.want && t.want === '세 번의 담', `타이틀 제목이 이 게임 것 (${t.h1})`);
  c.ok(t.buttons.includes('시작') && !t.buttons.includes('이어 하기') && !t.buttons.includes('처음부터'), `저장이 없으면 '시작'만 (${t.buttons.join(' · ')})`);
  await noSibling(p, '타이틀(?teacher=1)');
  // 설정: 글자 크기 3단계, 움직임 줄이기
  await p.click('.title-tools button[aria-label="설정"]');
  await p.waitForSelector('.sheet.settings-sheet');
  await noSibling(p, '설정 판');
  const segs = await p.$$eval('.settings-sheet .seg-l', (a) => a.map((x) => x.textContent));
  c.ok(['글자 크기', '배경음', '움직임'].every((s) => segs.includes(s)) && !segs.some((s) => /효과음|방식|선생님/.test(s)), `설정 줄: ${segs.join(' · ')}`);
  const fs0 = await p.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
  await p.click('.settings-sheet .seg-opts button:has-text("아주 크게")');
  await p.click('.settings-sheet .seg-opts button:has-text("줄이기")');
  const after = await p.evaluate(() => ({ fs: parseFloat(getComputedStyle(document.documentElement).fontSize), rm: document.documentElement.classList.contains('reduce-motion'), sizes: [...document.querySelectorAll('.settings-sheet .seg')].find((s) => s.textContent.includes('글자 크기')).querySelectorAll('button').length }));
  c.ok(after.sizes === 3 && after.fs > fs0 * 1.2, `글자 크기 3단계, '아주 크게'면 글자가 커짐 (${fs0}px → ${after.fs}px)`);
  c.ok(after.rm, "'움직임 줄이기'를 고르면 html.reduce-motion");
  await p.click('.settings-sheet .seg-opts button:has-text("보통")');
  await p.click('.settings-sheet .actions button:has-text("닫기")');
  await keysOk(p, '설정을 바꾼 뒤');

  await inject(p);
  await startGame(p);
  await openCard(p, 'enter');
  const hud = await p.evaluate(() => ({ mission: document.querySelector('.mission .mi-text').textContent, want: FLOW.acts.act1.mission, goal: document.querySelector('.pl-goal strong').textContent }));
  c.ok(hud.mission === hud.want && !!hud.want, `가운데 위 미션 = 1막 미션 (${hud.mission})`);
  c.ok(hud.goal === '향아에게 말을 걸자', `미션 아래 지금 할 일 (${hud.goal})`);
  await noSibling(p, '맵 화면');
  await p.waitForTimeout(400);
  let I = await ind(p);
  c.ok(I.arrows.includes('hyanga') && !I.glow.includes('hyanga'), `목표가 화면 밖이면 가장자리 화살표 (화살표 ${I.arrows.join(',') || '없음'} · 빛 ${I.glow.join(',') || '없음'})`);
  // 방향키로 걷기
  let a = await pos(p);
  await p.keyboard.down('ArrowRight'); await p.waitForTimeout(500); await p.keyboard.up('ArrowRight');
  let b = await pos(p);
  c.ok(b.x > a.x + 20, `방향키로 걷는다 (x ${Math.round(a.x)} → ${Math.round(b.x)})`);
  // 마우스로 조이스틱 끌기
  const zone = await p.locator('.joy-zone').boundingBox();
  await p.mouse.move(zone.x + 120, zone.y + zone.height - 120);
  await p.mouse.down();
  await p.mouse.move(zone.x + 180, zone.y + zone.height - 120, { steps: 5 });
  await p.waitForTimeout(500);
  await p.mouse.up();
  a = await pos(p);
  c.ok(a.x > b.x + 20, `마우스로 조이스틱을 끌어 걷는다 (x ${Math.round(b.x)} → ${Math.round(a.x)})`);
  // 가까이 가면 은은한 빛
  await p.evaluate(() => G.world.test.look(31, 6, 'right'));
  await p.waitForTimeout(300);
  I = await ind(p);
  c.ok(I.glow.includes('hyanga') && !I.arrows.includes('hyanga'), `목표가 화면 안이면 은은한 빛 (빛 ${I.glow.join(',') || '없음'})`);
  // E로 말 걸기 → 사건 화면
  const r1 = await talkTo(p, 'hyanga');
  c.ok(r1.event, 'E로 말 걸면 목표의 사건 화면이 열린다');
  const ev = await p.evaluate(() => ({ text: document.querySelector('.event.on').innerText, chip: [...document.querySelectorAll('.event.on .rchip')].map((x) => x.textContent) }));
  c.ok(/담 너머/.test(ev.text), '사건 화면에 글이 보인다');
  await noSibling(p, '사건 화면');
  c.ok(await enterThrough(p), 'Enter로 사건 화면을 끝까지 넘긴다');
  // 구역 밟기(방향키로 걸어 들어간다)
  await waitGoal(p);
  c.ok((await goal(p)).text === '그네 쪽으로 가 보자', '다음 목표: 그네 쪽으로');
  await p.evaluate(() => G.world.test.look(4, 8, 'right'));
  await p.keyboard.down('ArrowRight');
  const walkedIn = await p.waitForSelector('.event.on', { timeout: 3000 }).then(() => true, () => false);
  await p.keyboard.up('ArrowRight');
  c.ok(walkedIn, '걸어서 구역에 들어서면 사건 화면이 열린다');
  // 고르기: 첫 고르기에 포커스, Tab으로 다음, Enter로 고름
  await p.waitForSelector('.choice-tray .opt');
  const f1 = await p.evaluate(() => document.activeElement && document.activeElement.textContent);
  await p.keyboard.press('Tab');
  const f2 = await p.evaluate(() => document.activeElement && document.activeElement.textContent);
  await p.keyboard.press('Enter');
  await p.waitForSelector('.opt.picked');
  const picked = await p.textContent('.opt.picked');
  c.ok(f1 === '말' && f2 === '시' && picked === '시', `고르기 포커스 차례 (첫 ${f1} → Tab ${f2} → Enter로 「${picked}」)`);
  await p.waitForSelector('.event.on .ev-tray .btn.primary');
  await p.keyboard.press('Enter');
  // 한 줄 쓰기: 빈칸이면 넘어가지 않음, Tab으로 완료 단추
  await p.waitForSelector('.wfield input');
  const focusedIn = await p.evaluate(() => document.activeElement && document.activeElement.matches('.wfield input'));
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  const blocked = await p.evaluate(() => ({ still: !!document.querySelector('.wfield input'), need: !!document.querySelector('.wfield .wf-need:not([hidden])') }));
  c.ok(focusedIn && blocked.still && blocked.need, '쓰기 칸: 처음에 포커스, 빈칸으로 완료하면 넘어가지 않고 안내');
  await p.keyboard.type('그대를 기다리겠습니다');
  await p.keyboard.press('Tab');
  const onDone = await p.evaluate(() => document.activeElement && document.activeElement.matches('.wfield .wf-done'));
  await p.keyboard.press('Enter');
  await p.waitForFunction(() => window.__fx.wrote, null, { timeout: 3000 }).catch(() => {});
  const wrote = await p.evaluate(() => window.__fx.wrote);
  c.ok(onDone && wrote === '그대를 기다리겠습니다', `Tab으로 완료 단추, Enter로 마침 (${wrote})`);
  // 등록되지 않은 단계 종류(fxNotYet)는 '준비 중'으로 넘어간다
  await p.waitForSelector('.card.notready', { timeout: 4000 }).catch(() => {});
  const nr = await p.evaluate(() => (document.querySelector('.event.on .card.notready') || {}).textContent || '');
  c.ok(/준비 중/.test(nr), '등록되지 않은 단계는 오류 없이 \'준비 중\'');
  c.ok(await enterThrough(p), '\'준비 중\' 단계를 넘긴다');

  // ── 순서 없는 할 일·열림 조건·되풀이 구역 ──
  await openCard(p);
  const m3 = await p.evaluate(() => ({ mission: document.querySelector('.mission .mi-text').textContent, want: FLOW.acts.act3.mission }));
  c.ok(m3.mission === m3.want, `3막 미션 (${m3.mission})`);
  let tg = await targets(p);
  c.ok(tg.join(',') === 'bones,isaeng,treasure', `할 일 셋이 함께 목표(장사는 잠김): ${tg.join(',')}`);
  let r = await talkTo(p, 'isaeng');
  c.ok(r.event, '시 주고받기(이생) — 먼저 해도 된다');
  await advance(p);
  await waitGoal(p);
  r = await talkTo(p, 'burial');
  c.ok(!r.event && /재물과 유골/.test(r.text), `잠긴 장사 자리를 살피면 열림 조건 안내만 (${r.text.replace(/\s+/g, ' ').slice(0, 40)})`);
  tg = await targets(p);
  c.ok(!tg.includes('burial'), '장사는 아직 목표가 아니다');
  r = await talkTo(p, 'bones');
  c.ok(r.event, '유골 수습');
  await advance(p);
  await waitGoal(p);
  let st = await state(p);
  c.ok(st.done['b:fx_tasks:b-tasks.poems'] && st.done['b:fx_tasks:b-tasks.bones'] && !st.done['b:fx_tasks:b-tasks.treasure'], '마친 할 일이 장부에 남는다(b:거점:목표.할 일)');
  // 닫았다 열어도 마친 할 일이 남는다
  await reloadContinue(p, inject);
  await openCard(p);
  tg = await targets(p);
  c.ok(tg.join(',') === 'treasure', `다시 열면 남은 할 일만 (${tg.join(',')})`);
  // 경계: 몇 번이든 들어간다
  for (let k = 1; k <= 2; k++) {
    await p.evaluate(() => G.world.test.teleport('border'));
    const opened = await p.waitForSelector('.event.on', { timeout: 3000 }).then(() => true, () => false);
    await advance(p);
    await waitGoal(p);
    const pp = await pos(p);
    c.ok(opened && (await p.evaluate(() => window.__fx.count)) === k && pp.x < 29 * 32, `경계 구역에 ${k}번째로 들어가면 다시 열리고, 끝나면 경계 밖으로 물러선다`);
  }
  r = await talkTo(p, 'treasure');
  await advance(p);
  await waitGoal(p);
  tg = await targets(p);
  c.ok(tg.join(',') === 'burial', `재물·유골을 마치면 장사가 열린다 (${tg.join(',')})`);
  r = await talkTo(p, 'burial');
  c.ok(r.event, '장사 지내기');
  await advance(p);
  await waitGoal(p);
  tg = await targets(p);
  const g3 = await goal(p);
  c.ok(tg.join(',') === 'border' && g3.text === '보이지 않는 경계에 가 보자', `할 일을 다 했어도 마침 조건이 남으면 지금 할 일이 경계를 가리킨다 (${tg.join(',')} · ${g3.text})`);
  await p.evaluate(() => G.world.test.look(20, 7, 'right'));
  await p.waitForTimeout(300);
  I = await ind(p);
  c.ok(I.arrows.includes('border') || I.glow.includes('border'), `경계에 위치 표시 (빛 ${I.glow.join(',') || '-'} · 화살표 ${I.arrows.join(',') || '-'})`);
  await p.evaluate(() => G.world.test.teleport('border'));
  await p.waitForSelector('.event.on', { timeout: 3000 });
  await advance(p);
  // 빈 거점 → 결과 화면 틀
  await p.waitForSelector('.place-card.notready', { timeout: 6000 });
  c.ok(/준비 중/.test(await p.textContent('.place-card.notready')), '마침 조건이 차면 목표가 끝나고, 비어 있는 거점은 \'준비 중\'');
  await p.click('.event.on .ev-tray .btn.primary');
  await p.waitForSelector('.scr-result .rs-sheet', { timeout: 6000 });
  await noSibling(p, '결과 화면 틀');
  await p.fill('.rs-name-in', '1반 3번 시험');
  await p.waitForTimeout(150);
  const rs = await p.evaluate(() => ({ svg: !!document.querySelector('.rs-sheet svg.rs-card'), text: (document.querySelector('.rs-sheet svg.rs-card') || {}).textContent || '', name: G.save.state.name }));
  c.ok(rs.svg && rs.text.includes('1반 3번 시험') && rs.name === '1반 3번 시험', '결과 화면 틀: 이름 칸이 화면 그림(SVG)에 들어가고 이 브라우저에 저장');
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 6000 }).catch(() => null), p.click('.rs-save-btn')]);
  c.ok(dl && /\.png$/.test(dl.suggestedFilename()), `같은 그리기로 그림 파일 저장 (${dl ? dl.suggestedFilename() : '내려받기 없음'})`);
  await keysOk(p, '결과 화면');
  // 처음부터: 확인 뒤 기록과 이름을 지우고 설정은 남긴다
  await p.click('.rs-nav button:has-text("타이틀로")');
  await p.waitForSelector('.title-screen h1');
  const tb = await p.$$eval('.title-side button', (a) => a.map((x) => x.textContent.trim()));
  c.ok(tb.includes('이어 하기') && tb.includes('처음부터'), `기록이 있으면 '이어 하기 / 처음부터' (${tb.join(' · ')})`);
  await p.click('.title-side button:has-text("처음부터")');
  await p.waitForSelector('.sheet');
  await p.click('.sheet .actions button:has-text("처음부터")');
  await p.waitForSelector('.title-side button:has-text("시작")');
  const after2 = await p.evaluate(() => ({ name: G.save.state.name, done: Object.keys(G.save.state.done).length, keys: Object.keys(localStorage), rm: G.save.state.motion }));
  c.ok(after2.name === '' && after2.done === 0 && after2.rm === 'less', `처음부터: 기록·이름은 지우고 설정은 남김 (열쇠 ${after2.keys.join(', ')})`);
  await keysOk(p, '처음부터 뒤');
  c.ok(D.errs.length === 0, `PC: 콘솔·페이지·요청 오류 없음${D.errs.length ? ' — ' + D.errs.slice(0, 4).join(' | ') : ''}`);
  c.ok(D.outside.length === 0, `PC: 바깥 주소 요청 없음${D.outside.length ? ' — ' + D.outside.slice(0, 3).join(', ') : ''}`);
  await D.ctx.close();
}

// ═════════ 2. 휴대폰 가로: 터치 ═════════
{
  console.log('\n[2] 휴대폰 가로 844×390 — 터치');
  const P = await open(browser, VIEWS.phone);
  const p = P.page;
  await fresh(p, url);
  let small = await smallTargets(p);
  c.ok(small.length === 0, `타이틀의 누를 곳이 모두 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
  await inject(p);
  const tap = async (sel) => { const bx = await p.locator(sel).first().boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); };
  await tap('.title-side button:has-text("시작")');
  await p.waitForSelector('.event.cardmode .place-card');
  small = await smallTargets(p);
  c.ok(small.length === 0, `거점 첫 장의 누를 곳 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
  await tap('.event.cardmode .ev-tray .btn.primary');
  await p.waitForSelector('.world canvas.wcv');
  await waitGoal(p);
  small = await smallTargets(p);
  c.ok(small.length === 0, `맵 화면의 누를 곳 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
  // 터치로 조이스틱 끌기
  const cdp = await P.ctx.newCDPSession(p);
  const a = await pos(p);
  const zone = await p.locator('.joy-zone').boundingBox();
  const x0 = zone.x + 110, y0 = zone.y + zone.height - 90;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (let i = 1; i <= 6; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x0 + i * 10, y: y0 }] });
  await p.waitForTimeout(600);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const b = await pos(p);
  c.ok(b.x > a.x + 20, `터치로 조이스틱을 끌어 걷는다 (x ${Math.round(a.x)} → ${Math.round(b.x)})`);
  // 말 걸기 단추(터치)
  await p.evaluate(() => G.world.test.teleport('hyanga'));
  await p.waitForTimeout(250);
  await tap('.pbtn.talk');
  const ev = await p.waitForSelector('.event.on', { timeout: 3000 }).then(() => true, () => false);
  c.ok(ev, '말 걸기 단추를 손가락으로 누르면 사건 화면');
  small = await smallTargets(p);
  c.ok(small.length === 0, `사건 화면의 누를 곳 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
  for (let i = 0; i < 20 && (await p.locator('.event.on').count()); i++) { await tap('.event.on .ev-tray .btn.primary').catch(() => {}); await p.waitForTimeout(120); }
  await waitGoal(p);
  await p.evaluate(() => G.world.test.teleport('swing'));
  await p.waitForSelector('.choice-tray .opt');
  small = await smallTargets(p);
  c.ok(small.length === 0, `고르기의 누를 곳 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
  await tap('.choice-tray .opt:has-text("결단")');
  await p.waitForSelector('.opt.picked');
  c.ok((await p.textContent('.opt.picked')) === '결단', '손가락으로 고른다');
  await noSibling(p, '휴대폰 사건 화면');
  await keysOk(p, '휴대폰');
  c.ok(P.errs.length === 0, `휴대폰: 오류 없음${P.errs.length ? ' — ' + P.errs.slice(0, 4).join(' | ') : ''}`);
  c.ok(P.outside.length === 0, `휴대폰: 바깥 주소 요청 없음${P.outside.length ? ' — ' + P.outside.slice(0, 3).join(', ') : ''}`);
  await P.ctx.close();
}

// ═════════ 3. 낮은 휴대폰 가로 + 화면 키보드 흉내 ═════════
{
  console.log('\n[3] 640×360 — 화면 키보드가 열린 높이에서 쓰기 칸');
  const L = await open(browser, VIEWS.low);
  const p = L.page;
  await fresh(p, url);
  await inject(p);
  await p.click('.title-side button:has-text("시작")');
  await openCard(p);
  await p.evaluate(() => G.world.test.teleport('hyanga'));
  await p.keyboard.press('KeyE');
  await p.waitForSelector('.event.on');
  await advance(p);
  await waitGoal(p);
  await p.evaluate(() => G.world.test.teleport('swing'));
  await p.click('.choice-tray .opt >> nth=0');
  await p.waitForSelector('.event.on .ev-tray .btn.primary');
  await p.click('.event.on .ev-tray .btn.primary');
  await p.waitForSelector('.wfield input');
  let v = await writeVisible(p, 360);
  c.ok(v.input && v.button, `높이 360: 쓰기 칸과 완료 단추가 보인다 (${v.why})`);
  let small = await smallTargets(p);
  c.ok(small.length === 0, `쓰기 칸·완료 단추 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
  await p.click('.wfield input');
  for (const H of [200, 170]) {
    await p.setViewportSize({ width: 640, height: H }); // 화면 키보드가 아래 절반을 덮은 셈
    await p.waitForTimeout(350);
    v = await writeVisible(p, H);
    c.ok(v.input && v.button && v.focused, `화면 키보드 흉내(보이는 높이 ${H}): 입력 칸과 완료 단추가 모두 보인다 (${v.why}${v.docked ? ', 키보드 위에 붙음' : ''})`);
  }
  await p.keyboard.type('낮은 화면에서 쓴 한 줄');
  await p.click('.wfield .wf-done');
  await p.waitForFunction(() => window.__fx.wrote, null, { timeout: 3000 }).catch(() => {});
  c.ok((await p.evaluate(() => window.__fx.wrote)) === '낮은 화면에서 쓴 한 줄', '키보드가 열린 높이에서 완료를 누른다');
  await p.setViewportSize({ width: 640, height: 360 });
  await keysOk(p, '낮은 휴대폰');
  c.ok(L.errs.length === 0, `낮은 휴대폰: 오류 없음${L.errs.length ? ' — ' + L.errs.slice(0, 4).join(' | ') : ''}`);
  c.ok(L.outside.length === 0, '낮은 휴대폰: 바깥 주소 요청 없음');
  await L.ctx.close();
}

// ═════════ 4. 세로 화면 ═════════
{
  console.log('\n[4] 세로 390×844');
  const R = await open(browser, VIEWS.portrait);
  const p = R.page;
  await p.goto(url);
  await p.waitForTimeout(400);
  const ro = await p.evaluate(() => {
    const el = document.getElementById('rotate');
    return { shown: !!el && getComputedStyle(el).display !== 'none', text: el ? el.innerText : '', app: getComputedStyle(document.getElementById('app')).visibility };
  });
  c.ok(ro.shown && /돌려/.test(ro.text) && ro.app === 'hidden', `세로로 들면 돌려 달라는 안내 (${ro.text.replace(/\s+/g, ' ').slice(0, 30)})`);
  c.ok(R.errs.length === 0 && R.outside.length === 0, '세로: 오류·바깥 요청 없음');
  await R.ctx.close();
}

await browser.close();
c.finish();
