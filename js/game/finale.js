'use strict';
// 마무리 화면(spec 8·9절): 전기적 요소 한 줄 → 「만복사저포기」 함께 보기 → 결과 화면(js/game/result.js).
//  단계 종류 둘을 등록한다(어느 거점의 steps에도 넣을 수 있다):
//   - { type:'jeongi' } 2막에서 '전기적 요소' 표시가 떴던 장면(FINALE.jeongi.ref)을 위에 다시 보이고 → 근거 장면 넷 가운데 하나를 누르면
//     → 도움말과 함께 한 줄 쓰기 칸이 열린다(필수, 채점 없음). 근거 장면을 고르기 전에는 쓰기 칸이 없다.
//   - { type:'mbs' } 새로 쓴 줄거리 카드 → 두 고르기(보기 셋씩). 고른 답을 기록(G.rules.mbsOn + 저장)한 **뒤에** 원작의 사실을 보인다.
//     맞고 틀림 표시는 없다 → 기능을 묻는 한 줄(필수).
//  흐름: G.app.hooks.finish = G.finale.finish — 이야기의 끝(app.finish)에서 마무리 기록이 덜 찬 화면만 펼치고 결과 화면을 연다.
//   마무리 화면은 맺음 거점(FINALE.ui.after, 기본 'epilogue')이 흐름(FLOW.order)에 있을 때만 연다(시험용 흐름이면 곧바로 결과 화면).
//   거점처럼 '마무리'(id 'finale')로 단계를 펼치므로 단계 장부(s:finale:f-jeongi·f-mbs)와 새로고침 되돌리기가 그대로 돈다.
//  기록은 모두 G.rules의 순수 함수(jeongiSceneOn·lineOn·mbsOn)로만 바꾼다. 화면 글은 js/data/finale.js(FINALE, 화면 이름표는 FINALE.ui).
(function () {
  const { h, boldNodes } = G.util;
  const ui = G.ui;
  const steps = G.steps;
  const app = G.app;
  const S = () => G.save.state;
  const F = () => window.FINALE || {};
  const U = () => F().ui || {};
  const RL = () => G.rules;
  const fin = (G.finale = {});

  // 글 덩이 한 줄(표시 칩 + 글)
  const para = (o, cls = '') => (o && o.t ? h('div.para.narr.show' + cls, o.mark ? steps.mark(o.mark) : null, boldNodes(o.t)) : null);
  const focusSoon = (el) => setTimeout(() => el && el.isConnected && el.focus({ preventScroll: true }), 30);
  const sceneOf = (id) => (F().scenes || []).find((x) => x.id === id) || null;

  // 2막에서 '전기적 요소' 표시가 떴던 단계(FINALE.jeongi.ref = { place, step })
  fin.refStep = function () {
    const ref = (F().jeongi || {}).ref || {};
    const p = (window.PLACES || {})[ref.place];
    return (p && (p.steps || []).find((s) => s.id === ref.step)) || null;
  };
  function recallCard(ctx) {
    const s = fin.refStep();
    if (!s) return null;
    if (s.scene && ctx.setScene) ctx.setScene(s.scene);
    const rv = s.reveal || {};
    return h('div.card.rcard.fn-recall',
      h('div.fn-recall-head', rv.tag ? h('span.fn-tag', rv.tag) : null, rv.name ? h('strong.fn-name', rv.name) : null, U().recallTitle ? h('small', U().recallTitle) : null),
      para(rv.explain),
      ...(s.reason || []).map((q) => steps.quote(q)));
  }

  // 한 줄 쓰기 칸을 트레이에(G.ui.writeField — 화면 키보드가 열려도 칸과 완료 단추가 보인다). extra가 먼저 끝나면 그 값.
  //  show: 쓰는 동안 보여야 할 물음·도움말(칸이 화면 아래에 붙은 뒤 그 위로 굴려 보인다)
  function writeIn(ctx, extra, show) {
    const wf = ui.writeField({ label: U().writeLabel, placeholder: U().placeholder, done: U().done || '완료', need: U().need, maxlength: 120 });
    ctx.tray(h('div.write-tray', wf.el));
    wf.focus();
    if (show) setTimeout(() => ui.reveal(show), 80);
    return Promise.race([wf.result.then((t) => ({ text: t })), extra || new Promise(() => {})]);
  }

  // ═════════ 전기적 요소 한 줄 ═════════
  steps.register('jeongi', async function (step, ctx) {
    const st = S();
    const J = F().jeongi || {};
    const box = h('div.fn-jeongi', recallCard(ctx), para(J.q, '.fn-q'));
    ctx.main.appendChild(box);
    const chosenEl = h('div.fn-chosen', { 'aria-live': 'polite' });
    box.appendChild(chosenEl);
    let repick = null;
    const paint = () => {
      chosenEl.innerHTML = '';
      const sc = sceneOf(st.jeongiScene);
      if (!sc) return;
      repick = h('button.btn.small.fn-repick', { type: 'button' }, U().repick || '장면 다시 고르기');
      chosenEl.appendChild(h('div.fn-chosen-row', h('span.fn-chosen-l', (U().chosen || '고른 장면') + ' · '), h('strong', sc.name), RL().lineDone(st, 'jeongi') ? null : repick));
      chosenEl.appendChild(para(J.help, '.fn-help'));
      ui.reveal(chosenEl);
    };
    // 근거 장면 넷(트레이). 고르면 G.rules.jeongiSceneOn → 저장
    const pick = () => new Promise((res) => {
      const list = h('div.options.fn-scenes', { role: 'group', 'aria-label': U().sceneHint || '근거 장면' },
        (F().scenes || []).map((sc) => {
          const b = h('button.opt', { type: 'button', 'data-scene': sc.id, 'aria-pressed': st.jeongiScene === sc.id ? 'true' : 'false' }, h('span.ot', sc.name), sc.t ? h('span.od', sc.t) : null);
          b.addEventListener('click', () => res(sc.id));
          return b;
        }));
      ctx.tray(h('div.choice-tray.fn-scene-tray', J.pick ? h('div.tray-hint', steps.mark(J.pick.mark), ' ', J.pick.t) : null, list));
      focusSoon(list.querySelector('[aria-pressed="true"]') || list.querySelector('.opt'));
    });
    const choose = async () => {
      const id = await pick();
      // 고른 칸을 잠깐 보인 뒤 쓰기 칸을 연다(손가락이 떨어지기 전에 같은 자리의 완료 단추가 눌리지 않게)
      ctx.trayEl().querySelectorAll('.fn-scenes .opt').forEach((b) => { b.disabled = true; b.classList.add(b.dataset.scene === id ? 'picked' : 'dim'); });
      await G.util.wait(260);
      const r = RL().jeongiSceneOn(st, id);
      if (!r.error) G.save.write();
      paint();
    };
    if (!RL().lineDone(st, 'jeongi')) {
      if (!RL().canWrite(st, 'jeongi')) await choose(); // 근거 장면을 고르기 전에는 쓰기 칸을 열지 않는다
      else paint();
      for (;;) {
        const again = new Promise((res) => { if (repick) repick.onclick = () => res({ repick: true }); });
        const r = await writeIn(ctx, again, chosenEl.lastChild);
        if (r.repick) { await choose(); continue; }
        const out = RL().lineOn(st, 'jeongi', r.text);
        if (out.error === 'scene') { await choose(); continue; }
        if (out.error) continue;
        G.save.write();
        break;
      }
      ctx.tray(null);
    }
    paint();
    box.appendChild(h('div.para.picked-line.show.fn-line', '— ', st.lines.jeongi));
    ui.reveal(box.lastChild);
    await steps.nextButton(ctx, U().toMbs || U().next || '다음 ▶');
  });

  // ═════════ 「만복사저포기」 함께 보기 ═════════
  //  보기 차례는 학생마다 고정된 섞음(시작 시각을 씨앗으로 — 다시 열어도 같은 차례). 원작의 사실 쪽 보기가 늘 첫째에 오지 않게
  function shuffled(list, seed) {
    const a = list.slice();
    let x = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
    for (let i = a.length - 1; i > 0; i--) { x = (x * 48271) % 2147483647; const j = x % (i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  steps.register('mbs', async function (step, ctx) {
    const st = S();
    const M = F().mbs || {};
    const root = h('div.fn-mbs');
    ctx.main.appendChild(root);
    const sum = M.summary || {};
    if (sum.scene && ctx.setScene) ctx.setScene(sum.scene);
    // 1. 소개 + 새로 쓴 줄거리 카드
    if (M.title) root.appendChild(h('h2.stitle', M.title));
    root.appendChild(para(M.intro));
    const lines = (sum.lines || []).filter((l) => l && l.t);
    root.appendChild(h('div.card.rcard.note.mbs-summary',
      h('span.kind', steps.mark((lines[0] || {}).mark || '풀이'), U().summaryKind || ''),
      sum.title ? h('h3', sum.title) : null,
      ...lines.map((l) => h('p', boldNodes(l.t))),
      lines[0] && lines[0].src ? h('p.src', lines[0].src) : null));
    await steps.nextButton(ctx, U().next || '다음 ▶');
    // 2. 두 고르기 — 기록 먼저, 그다음에 원작의 사실(맞고 틀림 표시 없음)
    let seed = st.startedAt || 7;
    for (const pk of M.picks || []) {
      root.innerHTML = '';
      const sec = h('section.mbs-q-sec', { 'data-q': pk.id }, para(pk.q, '.mbs-q'));
      root.appendChild(sec);
      ui.reveal(sec);
      if (!st.mbs || !st.mbs[pk.id]) {
        const opts = shuffled(pk.options || [], seed++);
        const list = h('div.options.n1.mbs-opts', { role: 'group', 'aria-label': (pk.q && pk.q.t) || '' });
        const choice = await new Promise((res) => {
          for (const o of opts) {
            const b = h('button.opt', { type: 'button', 'data-opt': o.id }, h('span.ot', boldNodes(o.t)));
            b.addEventListener('click', () => { if (!b.disabled) res(o.id); });
            list.appendChild(b);
          }
          ctx.tray(h('div.choice-tray.mbs-pick', { 'data-q': pk.id }, list));
          focusSoon(list.querySelector('.opt'));
        });
        list.querySelectorAll('.opt').forEach((b) => { b.disabled = true; b.classList.add(b.dataset.opt === choice ? 'picked' : 'dim'); });
        const r = RL().mbsOn(st, pk.id, choice); // 사실을 보이기 전에 기록한다(spec 9절)
        if (!r.error) G.save.write();
        await G.util.wait(260);
      } else seed++;
      const mine = (pk.options || []).find((o) => o.id === st.mbs[pk.id]);
      sec.appendChild(h('div.para.picked-line.show.mbs-mine', h('span.mbs-mine-l', (U().myPick || '내가 고른 것') + ' · '), mine ? boldNodes(mine.t) : ''));
      sec.appendChild(h('div.mbs-fact', { 'data-q': pk.id }, h('div.mbs-fact-h', U().fact || '원작에서는'), para(pk.fact), steps.quote(pk.quote)));
      ui.reveal(sec.lastChild);
      ctx.tray(null);
      await steps.nextButton(ctx, U().next || '다음 ▶');
    }
    // 3. 맺음과 기능을 묻는 한 줄(필수)
    root.innerHTML = '';
    root.appendChild(para(M.ending));
    if (U().pickNote) root.appendChild(h('p.small.muted.mbs-note', U().pickNote));
    const q = para(F().mbsSame, '.fn-q');
    root.appendChild(q);
    if (!RL().lineDone(st, 'mbsSame')) {
      for (;;) {
        const r = await writeIn(ctx, null, q);
        const out = RL().lineOn(st, 'mbsSame', r.text);
        if (out.error) continue;
        G.save.write();
        break;
      }
      ctx.tray(null);
    }
    root.appendChild(h('div.para.picked-line.show.fn-line', '— ', st.lines.mbsSame));
    ui.reveal(root.lastChild);
    await steps.nextButton(ctx, U().toResult || '결과 보기 ▶');
  });

  // ═════════ 흐름: 이야기의 끝 → 마무리 화면들 → 결과 화면 ═════════
  const mbsDone = (st) => !!(st.mbs && (F().mbs && F().mbs.picks || []).every((p) => st.mbs[p.id])) && RL().lineDone(st, 'mbsSame');
  fin.steps = [
    { id: 'f-jeongi', type: 'jeongi', when: (st) => !(st.jeongiScene && RL().lineDone(st, 'jeongi')) },
    { id: 'f-mbs', type: 'mbs', when: (st) => !mbsDone(st) },
  ];
  fin.PLACE = 'finale';
  fin.place = () => ({ id: fin.PLACE, name: U().placeName || '마무리', steps: fin.steps });
  fin.needed = (st) => fin.steps.some((s) => s.when(st || S()));
  // 맺음 거점이 흐름에 있나(시험용 흐름이면 마무리 화면 없이 결과 화면)
  fin.reached = () => (((window.FLOW || {}).order) || []).includes(U().after || 'epilogue');
  // 마무리 화면들을 펼치고 결과 화면을 연다. 기록이 덜 찬 화면만(다시 열거나 '이 막부터'로 기록이 지워졌어도 맞게)
  fin.run = async function () {
    const st = S();
    const token = (app._playToken = {});
    if (fin.needed(st)) {
      for (const s of fin.steps) if (s.when(st)) delete st.done[app.key.step(fin.PLACE, s.id)];
      G.save.write();
      const place = fin.place();
      app.explore({ id: place.id, name: place.name, act: null, actName: '', mission: '' });
      G.audio.play('farewell');
      const ok = await app.runSteps(place, null);
      if (!ok || app._playToken !== token) return;
    }
    if (G.result && G.result.open) G.result.open();
  };
  fin.finish = function () {
    if (!fin.reached()) return G.result && G.result.open ? G.result.open() : null;
    return fin.run();
  };
  app.hooks.finish = fin.finish;
})();
