'use strict';
// 3막 끝 화면(plan T6, spec 6-2) — 단계 'mind'(마음 둔 곳)와 'okru'(옥루춘).
//  { type:'mind', q, note, options:[{ id:'treasure'|'rites'|'poems', t, mark… }] }
//   - "남은 날 가운데 어디에 마음을 가장 두었나?" 하나를 고른다. G.rules.mindOn으로 곧바로 확정 기록(한 번만, 채점하지 않음).
//   - 첫 고르기에 포커스, Tab 차례 = 화면 차례, 44px. 맞음·틀림 표시 없음. 고르면 때 딱지가 '서너 해 뒤'로(G.tasks.syncTime).
//  { type:'okru', music? }
//   - 옥루춘 여덟 구(OKRU.lines, 원문+풀이)를 두 구씩 네 대목으로. 대목마다 떠오르는 장면(OKRU.recall)을 삽화 자리와 글로 보인다.
//     0-1 고정(2막을 건너뛰었으면 default), 2-3·4-5는 마음 둔 곳(byMind), 6-7 고정 — G.okru.recallFor(st, 대목).
//   - 조작은 없다(넘기기 단추만). 노래 동안 배경음 'okru', 끝나면 3막 곡(G.world.music)으로 돌아간다.
//  글은 js/data/okru.js·places/act3.js, 모양은 css/okru.css.
(function () {
  const { h, boldNodes, T } = G.util;
  const S = () => G.save.state;
  const R = () => G.rules;
  const O = () => window.OKRU || {};
  const okru = (G.okru = {});
  okru.PARTS = ['0-1', '2-3', '4-5', '6-7'];
  const textOf = (x) => (x == null ? '' : typeof x === 'string' ? x : x.t || '');
  const save = (ctx) => { G.save.write(); if (ctx && ctx.refresh) ctx.refresh(); };

  // 대목의 회상(순수): { t, scene, mark, src, status, kind:'fixed'|'default'|'mind', mind? }
  okru.recallFor = function (st, part) {
    const r = (O().recall || {})[part] || {};
    if (r.byMind) {
      const keys = Object.keys(r.byMind);
      const m = st && st.mind && r.byMind[st.mind] ? st.mind : keys.includes('rites') ? 'rites' : keys[0];
      return Object.assign({ kind: 'mind', mind: m }, r.byMind[m] || {});
    }
    const skipped2 = !!(st && Array.isArray(st.skipped) && st.skipped.includes('act2'));
    if (skipped2 && r.default) return Object.assign({ kind: 'default' }, r.default);
    return Object.assign({ kind: 'fixed' }, r.fixed || r.default || {});
  };

  // ───────── 마음 둔 곳 ─────────
  G.steps.register('mind', async function (step, ctx) {
    const st = S();
    if (step.scene && ctx.setScene) ctx.setScene(step.scene);
    if (step.q) { const el = G.steps.line(step.q, ctx); if (el) { ctx.main.appendChild(el); G.ui.reveal(el); } }
    const opts = step.options || [];
    let picked = st.mind && opts.some((o) => o.id === st.mind) ? st.mind : null;
    if (!picked) {
      const list = h('div.options.mind-opts.n' + Math.min(3, opts.length), { role: 'group', 'aria-label': textOf(step.q) || '' });
      picked = await new Promise((res) => {
        let done = false;
        opts.forEach((o, i) => {
          const b = h('button.opt.mind-opt', { type: 'button', 'data-mind': o.id }, h('span.ot', boldNodes(textOf(o))));
          b.addEventListener('click', () => {
            if (done) return;
            done = true;
            list.querySelectorAll('.mind-opt').forEach((x) => { x.disabled = true; x.classList.add(x === b ? 'picked' : 'dim'); });
            res(o.id);
          });
          list.appendChild(b);
          if (i === 0) setTimeout(() => b.isConnected && !done && b.focus({ preventScroll: true }), 30);
        });
        ctx.tray(h('div.choice-tray.mind-tray', list));
      });
      R().mindOn(S(), picked); // 넷 + 경계를 마치지 않았으면 기록하지 않는다(규칙이 막는다) — 진행은 막지 않는다
      save(ctx);
      await G.util.wait(200);
      ctx.tray(null);
    }
    if (G.tasks && G.tasks.syncTime) G.tasks.syncTime(); // 때 딱지: 서너 해 뒤
    const o = opts.find((x) => x.id === picked) || {};
    ctx.main.appendChild(h('div.para.picked-line.show', '▸ ', boldNodes(textOf(o))));
    const lines = [step.note].filter(Boolean);
    if (lines.length) await G.steps.lines(lines, ctx);
    else await G.steps.nextButton(ctx, '다음 ▶');
  });

  // ───────── 옥루춘 ─────────
  G.steps.register('okru', async function (step, ctx) {
    const st = S();
    const D = O();
    const lines = D.lines || [];
    const back = (G.world && G.world.music) || (window.PLACES && PLACES.act3 && PLACES.act3.music) || null;
    G.audio.play(step.music || 'okru');
    const ev = ctx.el;
    if (ev) ev.classList.add('okrumode');
    try {
      const head = () => h('div.okru-head', D.title ? h('h2.okru-title', T(D.title)) : null);
      if (D.intro) { ctx.main.appendChild(head()); await G.steps.lines([D.intro], ctx, '▶'); }
      for (let k = 0; k < okru.PARTS.length; k++) {
        const part = okru.PARTS[k];
        const rec = okru.recallFor(st, part);
        if (ctx.setScene) ctx.setScene(rec.scene || null);
        ctx.main.innerHTML = '';
        const [a, b] = part.split('-').map(Number);
        const verse = h('div.okru-verse', { 'data-part': part },
          h('div.okru-no', { 'aria-hidden': 'true' }, (D.title ? T(D.title) + ' · ' : '') + (k + 1) + ' / ' + okru.PARTS.length),
          [lines[a], lines[b]].filter(Boolean).map((q, j, all) => G.steps.quote(j < all.length - 1 ? Object.assign({}, q, { src: null }) : q)));
        const recall = h('div.okru-recall', { 'data-part': part, 'data-kind': rec.kind, 'data-mind': rec.mind || '', 'data-scene': rec.scene || '', 'aria-live': 'polite' },
          h('div.okru-recall-k', rec.mark ? G.steps.mark(rec.mark) : null, h('span', (D.recallLabel || '떠오르는 장면'))),
          h('p.okru-recall-t', boldNodes(textOf(rec))));
        ctx.main.appendChild(verse);
        ctx.main.appendChild(recall);
        G.ui.reveal(verse);
        await G.steps.nextButton(ctx, k < okru.PARTS.length - 1 ? '다음 대목 ▶' : '다음 ▶');
      }
      ctx.main.innerHTML = '';
      if (ctx.setScene) ctx.setScene(null);
      const tail = [D.after, D.note].filter(Boolean);
      if (tail.length) await G.steps.lines(tail, ctx);
    } finally {
      if (ev) ev.classList.remove('okrumode');
      G.audio.play(back);
    }
  });
})();
