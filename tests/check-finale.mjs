// 마무리 화면 점검(T7): 실제 크롬으로 전기적 요소 한 줄 → 「만복사저포기」 함께 보기 → 결과 화면 → 원전으로 나가는 문.
//  1·2·3막 화면은 다른 작업이 만들므로, 저장 기록(G.save.state)을 직접 넣어 '이야기를 다 지나온 학생'을 만든 뒤
//  타이틀의 '이어 하기'로 들어간다(모든 거점을 끝냈으면 엔진이 G.app.finish → G.app.hooks.finish를 부른다).
//  1. PC(마우스·키보드): 근거 장면을 고르기 전에는 쓰기 칸이 없음, 빈 한 줄로 못 넘어감, 만복사 고르기는 사실을 보이기 전에 저장,
//     맞고 틀림 표시 없음, 고른 뒤 다시 열면 그 답이 그대로, 결과 화면 spec 10절 항목 전부(첫 시도 표시), 점수·등급 낱말 없음,
//     그림 저장(PNG 파일), 원전으로 나가는 문(원문·풀이 대목을 장면 차례로)
//  2. 바로가기로 1·2막을 건너뛴 기록: 결과 화면에 '하지 않음'
//  3. 낮은 휴대폰 가로 640×360(터치): 누를 곳 44px, 화면 키보드를 흉내 낸 높이에서 쓰기 칸과 완료 단추가 보임
//  모든 맥락에서: 콘솔 오류 0, 바깥 요청 0
import fs from 'node:fs';
import { base } from './serve.mjs';
import { VIEWS, checker, launch, open, fresh, state, smallTargets } from './lib.mjs';

const c = checker();
const url = await base();
const browser = await launch();

const NO_MARK = /정답|오답|맞았|맞아요|맞혔|틀렸|틀린|틀려|실패|✓|✔|✗|✘|❌|⭕|○|×/;
const SCORE = /점수|등급|순위|랭킹|시간 제한|제한 시간|남은 시간|게임 오버|게임오버|정답|오답|감점|득점|만점|실패|몇 점/;

// '이야기를 다 지나온' 기록을 넣고 타이틀에서 '이어 하기'
async function injectAndContinue(page, extra) {
  await fresh(page, url);
  await page.evaluate((extra) => {
    const st = G.save.state;
    const base = {
      startedAt: Date.now() - 60000, act: 'act3', hon: 'open', border: true, mind: 'rites',
      tasks: { treasure: true, bones: true, poems: true, burial: true },
      walls: {
        'w1-poem': [{ n: 1, m: 'mal' }, { n: 2, m: 'si' }],
        'w1-parents': [{ n: 1, m: 'mal' }],
        'w2-bandit': [{ n: 1, m: 'mal' }, { n: 2, m: 'si' }, { n: 3, m: 'gyeoldan' }],
        'w3-border': [{ n: 1, m: 'hon' }, { n: 2, m: 'mal' }],
      },
      propose: ['stay', 'entrust'],
      blanks: {
        'b1-wall': { first: '울주', final: '담장' },
        'b2-marriage': { first: '혼인', final: '혼인' },
        'b2-war': { first: '홍건적의 난', final: '홍건적의 난' },
        'b3-hwanshin': { first: '꿈', final: '환신' },
      },
      lines: { repeat: '반복은 두 사람의 사랑이 얼마나 끈질긴지 보여 준다', jeongi: '', mbsSame: '' },
      jeongiScene: null, mbs: { q1: null, q2: null }, skipped: [],
    };
    Object.assign(st, JSON.parse(JSON.stringify(base)), JSON.parse(JSON.stringify(extra || {})));
    for (const p of FLOW.order) st.done['p:' + p] = true;
    st.place = FLOW.order[FLOW.order.length - 1];
    G.save.write();
  }, extra || null);
  await page.reload();
  await page.waitForSelector('.title-screen h1');
  await page.click('.title-side button:has-text("이어 하기")');
}
const text = (page, sel) => page.evaluate((sel) => { const e = document.querySelector(sel); return e ? e.innerText : ''; }, sel);
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
    return { input: vis(inp), button: vis(btn), focused: document.activeElement === inp, why: `칸 ${Math.round(ri.top)}~${Math.round(ri.bottom)} · 단추 ${Math.round(rb.top)}~${Math.round(rb.bottom)} / 높이 ${H}` };
  }, H);
}
// 사실이 화면에 붙는 순간의 저장 상태를 잡아 둔다(사실 공개 전에 기록했는가)
const watchFacts = (page) => page.evaluate(() => {
  window.__factSeen = [];
  new MutationObserver((ms) => {
    for (const m of ms) for (const n of m.addedNodes) {
      if (!(n instanceof Element)) continue;
      const f = n.matches('.mbs-fact') ? n : n.querySelector('.mbs-fact');
      if (f) window.__factSeen.push({ q: f.dataset.q, mbs: JSON.parse(JSON.stringify(G.save.state.mbs)), stored: (JSON.parse(localStorage.getItem('isaeng-gyujang:progress') || '{}').mbs) || null });
    }
  }).observe(document.body, { childList: true, subtree: true });
});
const nextBtn = (page) => page.locator('.event.on .ev-tray .btn.primary:not(.wf-done)');

// ═════════ 1. PC: 마우스·키보드로 마무리 화면 전부 ═════════
{
  console.log('\n[1] PC 1366×860 — 전기적 요소 한 줄 → 만복사 → 결과 → 원전 문');
  const D = await open(browser, VIEWS.desktop);
  const p = D.page;
  await injectAndContinue(p);
  // ── 전기적 요소 한 줄
  const got = await p.waitForSelector('.fn-jeongi', { timeout: 8000 }).then(() => true, () => false);
  c.ok(got, "이야기를 다 지나오면 '이어 하기'가 전기적 요소 한 줄 화면으로 (G.app.hooks.finish)");
  const recall = await p.evaluate(() => {
    const r = document.querySelector('.fn-recall');
    const art = document.querySelector('.event.on .ev-art');
    return { text: r ? r.innerText : '', scene: art ? art.dataset.scene : '', want: (PLACES.act2night.steps.find((s) => s.id === FINALE.jeongi.ref.step) || {}).scene };
  });
  c.ok(/전기적 요소/.test(recall.text) && /혼/.test(recall.text) && /天帝以妾與生/.test(recall.text), `2막 '전기적 요소' 장면의 글(표시·이름·원문 까닭)을 위에 다시 보인다 (${recall.text.replace(/\s+/g, ' ').slice(0, 40)}…)`);
  c.ok(recall.scene && recall.scene === recall.want, `그 장면의 그림 자리를 다시 보인다 (${recall.scene} = ${recall.want})`);
  const sc = await p.$$eval('.fn-scenes .opt', (a) => a.map((b) => b.dataset.scene));
  c.ok(sc.join(',') === 'reunion,rites,okru,farewell', `근거 장면 넷을 누를 수 있다 (${sc.join(',')})`);
  c.ok((await p.locator('.wfield').count()) === 0, '근거 장면을 고르기 전에는 쓰기 칸이 열리지 않는다');
  const qText = await text(p, '.fn-jeongi');
  c.ok(qText.includes('최 씨가 혼이 되어 돌아오지 않았다면'), '전기적 요소 물음이 보인다');
  // 키보드: 첫 고르기에 포커스, Tab으로 옮겨 Enter
  await p.waitForTimeout(120);
  const f0 = await p.evaluate(() => document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.scene : null);
  c.ok(f0 === 'reunion', `첫 근거 장면에 포커스 (${f0})`);
  await p.keyboard.press('Tab');
  await p.keyboard.press('Tab');
  const f2 = await p.evaluate(() => document.activeElement.dataset.scene);
  c.ok(f2 === 'okru', `Tab 차례가 화면 차례와 같다 (${f2})`);
  await p.keyboard.press('Enter');
  await p.waitForSelector('.wfield input', { timeout: 3000 });
  const js = await state(p);
  c.ok(js.jeongiScene === 'okru', `고른 근거 장면을 기록 (${js.jeongiScene})`);
  c.ok((await text(p, '.event.on')).includes('환신이 무엇을 가능하게 했고'), '쓰기 칸과 함께 도움말이 보인다');
  // 빈칸으로는 넘어가지 않는다
  await p.click('.wfield .wf-done');
  await p.waitForTimeout(250);
  const need = await p.evaluate(() => { const n = document.querySelector('.wfield .wf-need'); return { shown: !!n && !n.hidden, still: !!document.querySelector('.wfield input') }; });
  c.ok(need.shown && need.still && !(await state(p)).lines.jeongi, '한 줄이 빈칸이면 넘어가지 않고 안내가 뜬다');
  await p.fill('.wfield input', '   ');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(200);
  c.ok((await p.locator('.wfield input').count()) === 1 && !(await state(p)).lines.jeongi, '빈칸(띄어쓰기만)도 넘어가지 않는다');
  await p.fill('.wfield input', '죽음을 넘어선 사랑을 말할 수 없었을 것이다');
  await p.keyboard.press('Enter');
  await p.waitForTimeout(250);
  const js2 = await state(p);
  c.ok(js2.lines.jeongi === '죽음을 넘어선 사랑을 말할 수 없었을 것이다' && js2.jeongiScene === 'okru', '한 줄과 근거 장면을 함께 기록');
  c.ok(!NO_MARK.test(await text(p, '.event.on')), '한 줄을 쓴 뒤 채점·맞고 틀림 표시가 없다');
  await nextBtn(p).first().click();
  // ── 만복사
  await p.waitForSelector('.fn-mbs', { timeout: 5000 });
  await watchFacts(p);
  const sum = await text(p, '.event.on');
  c.ok(/만복사저포기/.test(sum) && /양생/.test(sum), `새로 쓴 줄거리 카드 (${sum.replace(/\s+/g, ' ').slice(0, 30)}…)`);
  for (let i = 0; i < 6 && !(await p.locator('.mbs-pick .opt').count()); i++) { await nextBtn(p).first().click().catch(() => {}); await p.waitForTimeout(150); }
  let opts = await p.$$eval('.mbs-pick .opt', (a) => a.map((b) => b.dataset.opt));
  c.ok(opts.length === 3 && opts.includes('death') && opts.includes('parents'), `첫 고르기 보기 셋 (${opts.join(',')})`);
  let small = await smallTargets(p);
  c.ok(small.length === 0, `만복사 고르기 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
  await p.click('.mbs-pick .opt[data-opt="parents"]');
  await p.waitForSelector('.mbs-fact[data-q="q1"]', { timeout: 3000 });
  let seen = await p.evaluate(() => window.__factSeen);
  c.ok(seen.length && seen[0].mbs.q1 === 'parents' && seen[0].stored && seen[0].stored.q1 === 'parents', `원작의 사실이 뜨기 전에 답을 저장 (화면에 사실이 붙는 순간 기록 ${JSON.stringify(seen[0] && seen[0].stored)})`);
  let mt = await text(p, '.event.on');
  c.ok(!NO_MARK.test(mt), `만복사: 맞고 틀림 표시가 없다${(mt.match(NO_MARK) || [])[0] ? ' — 「' + mt.match(NO_MARK)[0] + '」' : ''}`);
  c.ok((await p.locator('.event.on .correct, .event.on .wrong, .event.on .right, .event.on .ok-mark').count()) === 0, '맞음·틀림 모양(요소)도 없다');
  c.ok(/여인은 왜구의 난리 때 죽어/.test(mt), '고른 뒤 원작의 사실이 드러난다');
  // 다시 열어도 첫 고르기 답이 남고 다시 고르지 않는다
  await p.reload();
  await p.waitForSelector('.title-screen h1');
  await p.click('.title-side button:has-text("이어 하기")');
  await p.waitForSelector('.fn-mbs', { timeout: 6000 });
  await watchFacts(p);
  for (let i = 0; i < 8 && !(await p.locator('.mbs-pick[data-q="q2"] .opt:not([disabled])').count()); i++) { await nextBtn(p).first().click().catch(() => {}); await p.waitForTimeout(150); }
  const re = await p.evaluate(() => ({ q1: G.save.state.mbs.q1, enabled1: document.querySelectorAll('.mbs-pick[data-q="q1"] .opt:not([disabled])').length, q2opts: document.querySelectorAll('.mbs-pick[data-q="q2"] .opt').length }));
  c.ok(re.q1 === 'parents' && re.enabled1 === 0 && re.q2opts === 3, `다시 열면 첫 고르기 답이 그대로이고 다시 고르지 않는다 (q1=${re.q1})`);
  await p.click('.mbs-pick[data-q="q2"] .opt[data-opt="dream"]');
  await p.waitForSelector('.mbs-fact[data-q="q2"]', { timeout: 3000 });
  seen = await p.evaluate(() => window.__factSeen);
  const s2 = seen.find((x) => x.q === 'q2');
  c.ok(s2 && s2.stored && s2.stored.q2 === 'dream', '두 번째 고르기도 사실을 보이기 전에 저장');
  mt = await text(p, '.event.on');
  c.ok(!NO_MARK.test(mt), '두 번째 사실에도 맞고 틀림 표시가 없다');
  for (let i = 0; i < 6 && !(await p.locator('.wfield input').count()); i++) { await nextBtn(p).first().click().catch(() => {}); await p.waitForTimeout(150); }
  c.ok((await text(p, '.event.on')).includes('두 작품에서 비현실적인 재회는 사랑과 이별을 어떻게 드러내나?'), '만복사 한 줄 물음');
  await p.click('.wfield .wf-done');
  await p.waitForTimeout(200);
  c.ok((await p.locator('.wfield input').count()) === 1 && !(await state(p)).lines.mbsSame, '만복사 한 줄도 빈칸이면 넘어가지 않는다');
  await p.fill('.wfield input', '두 작품 모두 이별을 더 아프게 만든다');
  await p.click('.wfield .wf-done');
  for (let i = 0; i < 6 && !(await p.locator('.scr-result').count()); i++) { await p.waitForTimeout(150); if (await nextBtn(p).count()) await nextBtn(p).first().click().catch(() => {}); }
  // ── 결과 화면
  const rsOk = await p.waitForSelector('.scr-result .rs-body .rs-sec', { timeout: 6000 }).then(() => true, () => false);
  c.ok(rsOk, '마무리 화면 다음에 결과 화면');
  const R = await p.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const t = (s) => (q(s) ? q(s).innerText : '');
    return {
      all: q('.rs-sheet').innerText,
      rows: [...document.querySelectorAll('.rs-table .rs-row')].map((r) => r.innerText),
      words: [...document.querySelectorAll('.rs-table .rs-word')].map((w) => ({ key: w.dataset.blank, word: (w.querySelector('.rs-w') || w).innerText, first: (w.querySelector('.rs-first') || {}).innerText || '' })),
      repeat: t('.rs-repeat'),
      walls: [...document.querySelectorAll('.rs-walls .rs-wall')].map((r) => ({ m: r.dataset.moment, t: r.innerText })),
      act3: t('.rs-act3'), lines: t('.rs-lines'), review: t('.rs-review'), reviewInputs: document.querySelectorAll('.rs-review input, .rs-review textarea').length,
      kim: t('.rs-kim'), door: t('.rs-door'), doorLinks: document.querySelectorAll('.rs-door a[href], .src-door a[href]').length,
      svg: (q('.rs-sheet svg.rs-card') || {}).textContent || '',
    };
  });
  c.ok(R.rows.length === 3, `만남과 이별 표 세 줄 (${R.rows.length})`);
  const w1 = R.words.find((w) => w.key === 'b1-wall') || {}, w2 = R.words.find((w) => w.key === 'b2-marriage') || {}, w4 = R.words.find((w) => w.key === 'b3-hwanshin') || {};
  c.ok(/담장/.test(w1.word) && /울주/.test(w1.first), `칸마다 최종 낱말과, 다르면 처음 고른 낱말(작게) — 담장 / 처음 ${w1.first}`);
  c.ok(/혼인/.test(w2.word) && !w2.first, `처음과 최종이 같으면 첫 시도 표시를 두지 않는다 (${w2.word} / ${w2.first || '없음'})`);
  c.ok(/환신/.test(w4.word) && /꿈/.test(w4.first), `셋째 줄 빈칸도 첫 시도 표시 (${w4.word} / ${w4.first})`);
  c.ok(R.repeat.includes('반복은 두 사람의 사랑이 얼마나 끈질긴지 보여 준다'), '표 아래 반복의 뜻 문장');
  const wall = (m) => (R.walls.find((x) => x.m === m) || {}).t || '';
  c.ok(/말 → 시/.test(wall('w1-poem')) && /1막/.test(wall('w1-poem')), `세 담과 수단: 1막 — 말 → 시 (${wall('w1-poem').replace(/\s+/g, ' ')})`);
  c.ok(/말 → 시 → 결단/.test(wall('w2-bandit')) && /2막/.test(wall('w2-bandit')), `2막 — 말 → 시 → 결단 (${wall('w2-bandit').replace(/\s+/g, ' ')})`);
  c.ok(/혼 → 말/.test(wall('w3-border')), `3막 경계 — 혼 → 말 (${wall('w3-border').replace(/\s+/g, ' ')})`);
  c.ok(R.walls.length === 4 && !R.walls.some((x) => x.m === 'w3-propose'), `담 앞 순간마다(이생의 제안 앞 제외) 네 줄 (${R.walls.map((x) => x.m).join(',')})`);
  c.ok(/유골 수습과 장사/.test(R.act3) && /남겠어요/.test(R.act3), `3막: 마음 둔 곳과 이생에게 처음 한 답 (${R.act3.replace(/\s+/g, ' ')})`);
  c.ok(R.lines.includes('죽음을 넘어선 사랑을 말할 수 없었을 것이다') && R.lines.includes('옥루춘') && R.lines.includes('두 작품 모두 이별을 더 아프게 만든다'), '쓴 글: 전기적 요소 한 줄과 근거 장면, 만복사 한 줄');
  c.ok(R.lines.includes('양생의 집안이 두 사람의 혼인을 반대했다') && R.lines.includes('꿈속에서만'), '만복사 두 고르기(사실이 드러나기 전의 답)');
  c.ok(R.review.includes('세 개의 담 가운데 사람이 넘을 수 있었던 것은') && R.review.includes('두 사람은 어떻게 다른가') && R.reviewInputs === 0, '되짚기 질문 둘(답 칸 없음)');
  c.ok(R.kim.includes('김현의 호랑이 처녀는 하늘의 뜻을 받아들였다'), '「김현감호」 한 줄');
  c.ok(/위키문헌/.test(R.door) && /ko\.wikisource\.org/.test(R.door) && R.doorLinks === 0, '원전으로 나가는 문 안내(주소는 글로만, 링크 없음)');
  c.ok(!SCORE.test(R.all), `결과 화면에 점수·등급·맞고 틀림 낱말이 없다${(R.all.match(SCORE) || [])[0] ? ' — 「' + R.all.match(SCORE)[0] + '」' : ''}`);
  c.ok(!NO_MARK.test(R.all), '결과 화면에 맞고 틀림 표시가 없다');
  c.ok(R.svg.includes('담장') && R.svg.includes('울주') && R.svg.includes('죽음을 넘어선') && R.svg.includes('말 → 시 → 결단'), '같은 그리기로 그린 결과 그림(SVG)에 표·수단·쓴 글이 들어간다');
  // 이름(선택): 이 브라우저에만
  await p.fill('.rs-name-in', '2학년 3반 7번 시험');
  await p.waitForTimeout(150);
  const nm = await p.evaluate(() => ({ svg: document.querySelector('.rs-sheet svg.rs-card').textContent, saved: JSON.parse(localStorage.getItem('isaeng-gyujang:progress')).name }));
  c.ok(nm.svg.includes('2학년 3반 7번 시험') && nm.saved === '2학년 3반 7번 시험', '이름 칸: 그림에 들어가고 이 브라우저에만 저장');
  // 그림 저장
  const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 8000 }).catch(() => null), p.click('.rs-save-btn')]);
  let png = false, fname = '';
  if (dl) { fname = dl.suggestedFilename(); const f = await dl.path(); const b = f ? fs.readFileSync(f) : Buffer.alloc(0); png = b.length > 1000 && b.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])); }
  c.ok(dl && /\.png$/.test(fname) && png, `그림 저장 단추가 PNG 그림 파일을 만든다 (${fname || '내려받기 없음'})`);
  const cv = await p.evaluate(async () => { const cn = await G.result.saveImage({ download: false }); return { w: cn.width, h: cn.height }; });
  c.ok(cv.w === 1200 && cv.h > 675, `저장 그림이 내용만큼 길어진다 (${cv.w}×${cv.h})`);
  // 원전으로 나가는 문
  await p.click('.rs-door-btn');
  const sdOk = await p.waitForSelector('.src-door .sd-item', { timeout: 3000 }).then(() => true, () => false);
  c.ok(sdOk, '원전으로 나가는 문: 대목 모음 화면');
  const sd = await p.evaluate(() => {
    const items = [...document.querySelectorAll('.src-door .sd-item')];
    const all = document.querySelector('.src-door').innerText;
    return { n: items.length, links: document.querySelectorAll('.src-door a[href]').length, paired: items.every((it) => it.querySelector('.han') && it.querySelector('.ko')), all, groups: [...document.querySelectorAll('.src-door .sd-group h3')].map((x) => x.innerText) };
  });
  const iA = sd.all.indexOf('將子無疑'), iB = sd.all.indexOf('天帝以妾與生'), iC = sd.all.indexOf('果得金銀數錠'), iD = sd.all.indexOf('李郞珍重');
  c.ok(sd.n >= 15 && sd.paired, `게임에 나온 원문 대목이 풀이와 짝으로 (${sd.n}개)`);
  c.ok(iA >= 0 && iB > iA && iC > iB && iD > iC, `장면 차례(1막 → 2막 밤 → 3막 → 맺음) (${iA} < ${iB} < ${iC} < ${iD})`);
  c.ok(/위키문헌/.test(sd.all) && /ko\.wikisource\.org/.test(sd.all) && sd.links === 0, '대목 모음 화면에도 전문을 읽을 곳 안내(글로만)');
  c.ok(sd.groups.length >= 4, `거점마다 묶음 (${sd.groups.join(' · ')})`);
  const folded = await p.evaluate(() => { const it = [...document.querySelectorAll('.src-door .sd-item')].find((x) => x.textContent.includes('殺而剮之')); return it ? { shown: /살을 발라/.test(it.innerText), btn: !!it.querySelector('button[aria-expanded]') } : null; });
  c.ok(!!folded && !folded.shown && folded.btn, '원전 문에서도 2막 암전의 원문 카드는 접힌 채(누르면 펼침)');
  small = await smallTargets(p);
  c.ok(small.length === 0, `원전 문 화면의 누를 곳 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
  await p.click('.src-door .sd-back');
  c.ok((await p.locator('.src-door').count()) === 0 && (await p.locator('.scr-result .rs-sheet').count()) === 1, '원전 문에서 결과 화면으로 돌아온다');
  // 다시 열면 마무리를 다시 하지 않고 결과 화면으로
  await p.reload();
  await p.waitForSelector('.title-screen h1');
  await p.click('.title-side button:has-text("이어 하기")');
  const back = await p.waitForSelector('.scr-result .rs-sheet', { timeout: 5000 }).then(() => true, () => false);
  c.ok(back && (await p.locator('.fn-jeongi, .fn-mbs').count()) === 0, '마무리를 마친 뒤 다시 열면 곧바로 결과 화면');
  c.ok(D.errs.length === 0, `PC: 콘솔·페이지·요청 오류 없음${D.errs.length ? ' — ' + D.errs.slice(0, 4).join(' | ') : ''}`);
  c.ok(D.outside.length === 0, `PC: 바깥 주소 요청 없음${D.outside.length ? ' — ' + D.outside.slice(0, 3).join(', ') : ''}`);
  await D.ctx.close();
}

// ═════════ 2. 바로가기로 1·2막을 건너뛴 기록 ═════════
{
  console.log("\n[2] 1·2막을 건너뛴 기록 — '하지 않음'");
  const D = await open(browser, VIEWS.desktop);
  const p = D.page;
  await injectAndContinue(p, {
    skipped: ['act1', 'act2'],
    walls: { 'w3-border': [{ n: 1, m: 'mal' }] }, propose: ['entrust'],
    blanks: { 'b1-wall': { first: '담장', final: '담장' }, 'b2-marriage': { first: '혼인', final: '혼인' }, 'b2-war': { first: '홍건적의 난', final: '홍건적의 난' }, 'b3-hwanshin': { first: '환신', final: '환신' } },
    lines: { repeat: '한 번뿐이면 사랑의 깊이가 드러나지 않는다', jeongi: '혼이 없었다면 재회도 없었다', mbsSame: '재회가 이별을 더 깊게 한다' },
    jeongiScene: 'reunion', mbs: { q1: 'death', q2: 'ghost' },
  });
  const direct = await p.waitForSelector('.scr-result .rs-body .rs-sec', { timeout: 6000 }).then(() => true, () => false);
  c.ok(direct && (await p.locator('.fn-jeongi, .fn-mbs').count()) === 0, '마무리 기록이 다 있으면 곧바로 결과 화면');
  const R = await p.evaluate(() => ({
    walls: [...document.querySelectorAll('.rs-walls .rs-wall')].map((r) => ({ m: r.dataset.moment, t: r.innerText })),
    words: [...document.querySelectorAll('.rs-table .rs-word')].map((w) => ({ key: w.dataset.blank, t: w.innerText, skip: !!w.querySelector('.rs-skip') })),
    all: document.querySelector('.rs-sheet').innerText,
    svg: document.querySelector('.rs-sheet svg.rs-card').textContent,
  }));
  const wt = (m) => (R.walls.find((x) => x.m === m) || {}).t || '';
  c.ok(/하지 않음/.test(wt('w1-poem')) && /하지 않음/.test(wt('w1-parents')) && /하지 않음/.test(wt('w2-bandit')), "건너뛴 1·2막의 담 앞 순간은 '하지 않음'");
  c.ok(!/하지 않음/.test(wt('w3-border')) && /말/.test(wt('w3-border')), `한 3막은 써 본 수단 (${wt('w3-border').replace(/\s+/g, ' ')})`);
  c.ok(R.words.length === 4 && R.words.every((w) => w.skip && /하지 않음/.test(w.t)), `건너뛴 막의 빈칸은 '하지 않음' (${R.words.map((w) => w.t.replace(/\s+/g, ' ')).join(' / ')})`);
  c.ok(/하지 않음/.test(R.svg), "결과 그림에도 '하지 않음'");
  c.ok(!SCORE.test(R.all) && !NO_MARK.test(R.all), '점수·등급·맞고 틀림 없음');
  c.ok(D.errs.length === 0 && D.outside.length === 0, `오류·바깥 요청 없음${D.errs.length ? ' — ' + D.errs.slice(0, 3).join(' | ') : ''}`);
  await D.ctx.close();
}

// ═════════ 3. 낮은 휴대폰 가로 640×360 — 터치·화면 키보드 ═════════
{
  console.log('\n[3] 640×360 — 터치, 화면 키보드가 열린 높이에서 쓰기 칸');
  const L = await open(browser, VIEWS.low);
  const p = L.page;
  const tap = async (sel) => { const bx = await p.locator(sel).first().boundingBox(); await p.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); };
  await injectAndContinue(p);
  await p.waitForSelector('.fn-scenes .opt', { timeout: 8000 });
  let small = await smallTargets(p);
  c.ok(small.length === 0, `근거 장면 단추 44px 이상${small.length ? ' — ' + small.join(' / ') : ''}`);
  c.ok((await p.locator('.wfield').count()) === 0, '낮은 화면에서도 장면을 고르기 전에는 쓰기 칸이 없다');
  await tap('.fn-scenes .opt[data-scene="farewell"]');
  await p.waitForSelector('.wfield input');
  let v = await writeVisible(p, 360);
  c.ok(v.input && v.button, `높이 360: 쓰기 칸과 완료 단추가 보인다 (${v.why})`);
  await tap('.wfield input');
  for (const H of [200, 170]) {
    await p.setViewportSize({ width: 640, height: H });
    await p.waitForTimeout(350);
    v = await writeVisible(p, H);
    c.ok(v.input && v.button && v.focused, `전기적 요소 한 줄 — 화면 키보드 흉내(보이는 높이 ${H}): 입력 칸과 완료 단추가 보인다 (${v.why})`);
  }
  await p.keyboard.type('마지막 이별의 슬픔');
  await tap('.wfield .wf-done');
  await p.setViewportSize({ width: 640, height: 360 });
  await p.waitForTimeout(250);
  c.ok((await state(p)).lines.jeongi === '마지막 이별의 슬픔', '키보드가 열린 높이에서 완료를 누른다');
  for (let i = 0; i < 12 && !(await p.locator('.mbs-pick[data-q="q1"] .opt:not([disabled])').count()); i++) { await tap('.event.on .ev-tray .btn.primary').catch(() => {}); await p.waitForTimeout(160); }
  small = await smallTargets(p);
  c.ok(small.length === 0, `만복사 고르기 44px 이상(낮은 화면)${small.length ? ' — ' + small.join(' / ') : ''}`);
  await tap('.mbs-pick[data-q="q1"] .opt[data-opt="death"]');
  await p.waitForSelector('.mbs-fact[data-q="q1"]');
  for (let i = 0; i < 8 && !(await p.locator('.mbs-pick[data-q="q2"] .opt:not([disabled])').count()); i++) { await tap('.event.on .ev-tray .btn.primary').catch(() => {}); await p.waitForTimeout(160); }
  await tap('.mbs-pick[data-q="q2"] .opt[data-opt="ghost"]');
  await p.waitForSelector('.mbs-fact[data-q="q2"]');
  for (let i = 0; i < 8 && !(await p.locator('.wfield input').count()); i++) { await tap('.event.on .ev-tray .btn.primary').catch(() => {}); await p.waitForTimeout(160); }
  await tap('.wfield input');
  await p.setViewportSize({ width: 640, height: 170 });
  await p.waitForTimeout(350);
  v = await writeVisible(p, 170);
  c.ok(v.input && v.button && v.focused, `만복사 한 줄 — 화면 키보드 흉내(보이는 높이 170): 입력 칸과 완료 단추가 보인다 (${v.why})`);
  await p.keyboard.type('비현실적 재회가 이별을 드러낸다');
  await tap('.wfield .wf-done');
  await p.setViewportSize({ width: 640, height: 360 });
  for (let i = 0; i < 6 && !(await p.locator('.scr-result').count()); i++) { await p.waitForTimeout(160); if (await p.locator('.event.on .ev-tray .btn.primary').count()) await tap('.event.on .ev-tray .btn.primary').catch(() => {}); }
  await p.waitForSelector('.scr-result .rs-sec', { timeout: 5000 });
  small = await smallTargets(p);
  c.ok(small.length === 0, `결과 화면의 누를 곳 44px 이상(낮은 화면)${small.length ? ' — ' + small.join(' / ') : ''}`);
  const big = await p.evaluate(async () => {
    const st = G.save.state; const was = st.font; st.font = 1.3; G.app.applySettings();
    const a = parseFloat(getComputedStyle(document.querySelector('.rs-sec h2')).fontSize);
    st.font = 1; G.app.applySettings();
    const b = parseFloat(getComputedStyle(document.querySelector('.rs-sec h2')).fontSize);
    st.font = was; G.app.applySettings();
    return { a, b };
  });
  c.ok(big.a > big.b * 1.2, `결과 화면 글자도 글자 크기 3단계를 따른다 (${big.b}px → ${big.a}px)`);
  c.ok(L.errs.length === 0, `낮은 휴대폰: 오류 없음${L.errs.length ? ' — ' + L.errs.slice(0, 4).join(' | ') : ''}`);
  c.ok(L.outside.length === 0, '낮은 휴대폰: 바깥 주소 요청 없음');
  await L.ctx.close();
}

await browser.close();
c.finish();
