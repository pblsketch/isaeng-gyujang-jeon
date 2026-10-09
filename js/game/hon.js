'use strict';
// 혼이 열리는 순간(plan T5, spec 5-3·5-4) — 단계 종류 'hon', 줄 종류 'foot'(발소리 화면 표시), 단계 종류 'blackout'(암전).
//
//  { id, type:'hon', scene, walk:글 덩이, reveal:{ name:'혼', tag:'전기적 요소', explain:글 덩이 }, reason:[원문 덩이…], note, setting }
//   1) 걷기 판: 사건 화면(또는 맵 위 대화창)을 잠시 걷고 맵에서 걷게 한다. 판에는 발소리 표시(가장 가까움)와 걷기 안내,
//      수단 칸(말·시·결단 + 이름 없는 잠긴 칸)이 보인다. 혼의 이름은 아직 어디에도 없다.
//   2) 학생이 걷기 시작하면(맵에서 자리가 바뀌면) 그때 G.rules.honOpenOn(st, { walking:true })을 부른다(확정 기록 st.hon).
//      걷기 전에는 부르지 않는다. 가만히 있으면 열리지 않는다(시간 제한 없음).
//   3) 사건 화면을 다시 펼쳐 잠긴 칸이 '혼'으로 드러나는 모습 + '전기적 요소' 표시 + 짧은 설명(reveal.explain)
//      → 원문의 까닭(reason, 원문·풀이) → 원작에서의 자리(note) → 게임 설정 밝힘(setting).
//   - 이미 열렸으면(연 뒤 닫았다 열기) 걷기 판 없이 3)부터. 도적 앞을 지나지 않았으면(규칙이 error) 열지 않고 넘긴다.
//   - 혼은 꾸짖음의 보상이 아니다: 화면은 꾸짖음과 잇지 않고, 자료의 setting(게임 설정)이 하늘의 허락임을 밝힌다.
//  줄 종류 foot: 대사 줄에 foot:1|2|3을 적으면 그 줄 앞에 발소리 표시(멀리 → 바로 곁)를 붙인다(글은 그대로).
//  단계 종류 blackout: { t:'한 줄', mark, src, quote:원문 덩이, fold:true } — 삽화를 비우고 검은 화면에 한 줄만.
//   원문은 접어 두고 눌러야 펼쳐진다(spec 12절). 다른 작업이 먼저 등록했으면 그것을 쓴다.
//  화면 이름표의 대체 글은 아래 DEF(TEXTS.HON이 있으면 그것이 먼저). 모양은 css/hon.css.
(function () {
  const { h, boldNodes } = G.util;
  const S = () => G.save.state;
  const R = () => G.rules;
  const DEF = {
    group: '수단 칸',
    foot: '발소리',
    footNear: ['발소리가 멀리서 들린다', '발소리가 가까워진다', '발소리가 바로 곁에서 난다'],
    walkTry: '걸어 본다',
    open: '열린 칸',
  };
  const TX = () => Object.assign({}, DEF, (window.TEXTS || {}).HON || {});
  const WT = () => ((window.TEXTS || {}).WALL) || {};
  const textOf = (x) => (x == null ? '' : typeof x === 'string' ? x : x.t || x.ko || '');
  const hon = (G.hon = {});

  // ───────── 발소리 표시(1 멀리 → 3 바로 곁) ─────────
  hon.foot = function (near) {
    const n = Math.max(1, Math.min(3, near | 0));
    const label = TX().footNear[n - 1] || TX().foot;
    return h('div.hon-foot', { 'data-near': String(n), role: 'img', 'aria-label': label, title: label },
      [1, 2, 3].map((i) => h('i.hf' + (i <= n ? '.on' : ''), { style: '--i:' + i })),
      h('span.hf-l', { 'aria-hidden': 'true' }, TX().foot));
  };
  G.steps.lineKinds.foot = function (line, ctx) {
    const rest = Object.assign({}, line);
    delete rest.foot;
    const el = G.steps.line(rest, ctx);
    if (!el) return null;
    el.classList.add('has-foot');
    el.insertBefore(hon.foot(line.foot), el.firstChild);
    return el;
  };

  // ───────── 수단 칸(보이기만, 누르지 않는다) ─────────
  //  open이면 혼 칸에 이름. fresh면 잠긴 모습에서 열리는 움직임(움직임 줄이기면 css가 멈춘다)
  function slotRow(open, fresh) {
    const ids = (R() && R().MEANS) || ['mal', 'si', 'gyeoldan', 'hon'];
    const name = (id) => (R() && R().meansName ? R().meansName(id) : id);
    return h('div.hon-slots', { role: 'group', 'aria-label': TX().group },
      ids.map((id) => {
        if (id !== 'hon') return h('span.hon-slot', { 'data-means': id, 'data-state': 'plain' }, h('span.hs-n', name(id)));
        if (!open) {
          return h('span.hon-slot.locked', { 'data-means': 'hon', 'data-state': 'locked', role: 'img', 'aria-label': WT().locked || '잠긴 칸' },
            h('i.lock-ic', { 'aria-hidden': 'true' }));
        }
        return h('span.hon-slot.open' + (fresh ? '.fresh' : ''), { 'data-means': 'hon', 'data-state': 'open', 'aria-label': (TX().open || '') + ' ' + name('hon') },
          h('i.lock-ic', { 'aria-hidden': 'true' }),
          h('span.hs-n.hon-name', name('hon')));
      }));
  }

  // ───────── 1) 걷기 판 ─────────
  function walkPanel(step) {
    return h('div.hon-panel', { 'data-phase': 'walk', 'aria-live': 'polite' },
      h('div.hp-row', hon.foot(3), h('p.hp-walk', boldNodes(textOf(step.walk)))),
      h('div.hp-row', h('span.hp-l', TX().group), slotRow(false)));
  }
  // 학생이 걷기 시작할 때까지(맵에서 자리가 10px 넘게 바뀌면) 기다린다. 놀이를 떠나면 false
  function waitWalk(W, token) {
    return new Promise((res) => {
      const s0 = W.test.state();
      const iv = setInterval(() => {
        if (G.app._playToken !== token) { clearInterval(iv); res(false); return; }
        const s = W.test.state();
        if (!s || s.map !== s0.map || s.x == null) return;
        if (Math.hypot(s.x - s0.x, s.y - s0.y) >= 10) { clearInterval(iv); res(true); }
      }, 80);
    });
  }
  async function walkPhase(step, ctx) {
    const W = G.world;
    const holder = ctx.el || ctx.dlg || null;
    const playEl = holder && holder.closest ? holder.closest('.play') : null;
    const mapOk = !!(W && W.test && W.test.state && W.test.state().map && playEl);
    if (!mapOk) {
      // 맵이 없는 자리(시험 자료 등): 걷기 대신 '걸어 본다' 단추
      ctx.main.appendChild(walkPanel(step));
      await G.steps.nextButton(ctx, TX().walkTry);
      return true;
    }
    const token = G.app._playToken;
    const panel = walkPanel(step);
    const wasOn = holder.classList.contains('on');
    const hadEv = playEl.classList.contains('evmode');
    holder.classList.add('hon-away');
    holder.classList.remove('on');
    playEl.classList.remove('evmode');
    playEl.appendChild(panel);
    W.busy = Math.max(0, W.busy - 1);           // 단계 실행기가 올려 둔 멈춤을 걷기 동안만 푼다
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    let walked = false;
    try {
      walked = await waitWalk(W, token);
    } finally {
      panel.remove();
      W.busy++;
      holder.classList.remove('hon-away');
      if (wasOn) holder.classList.add('on');
      if (hadEv && playEl.isConnected) playEl.classList.add('evmode');
    }
    return walked;
  }

  // ───────── 3) 드러남 → 원문의 까닭 → 원작에서의 자리 → 게임 설정 ─────────
  async function revealPhase(step, ctx, fresh) {
    const rv = step.reveal || {};
    ctx.main.innerHTML = '';
    ctx.tray(null);
    const explain = rv.explain ? G.steps.line(rv.explain, ctx) : null;
    const card = h('div.card.rcard.hon-reveal' + (fresh ? '.fresh' : ''),
      h('div.hr-head', slotRow(true, fresh), rv.tag ? h('span.hon-tag', rv.tag) : null),
      explain);
    // 한 장으로 크게(사건 화면 가운데 — 이야기 카드와 같은 모습). 맵 위 대화창이면 글 자리에
    if (ctx.mode === 'event' && ctx.el) await G.steps.cardMoment(ctx, card, '▶');
    else { ctx.main.appendChild(card); G.ui.reveal(card); await G.steps.nextButton(ctx, '▶'); }
    const rest = [].concat(step.reason || [], step.note || [], step.setting || []);
    if (rest.length) {
      ctx.main.innerHTML = '';
      await G.steps.lines(rest, ctx, step.next || '다음 ▶');
    }
  }

  G.steps.register('hon', async function (step, ctx) {
    if (ctx.setScene) ctx.setScene(step.scene || null);
    if (S().hon !== 'open') {
      const walked = await walkPhase(step, ctx);
      if (!walked) return;
    }
    // 걷기 시작한 뒤에만(또는 이미 열린 기록이면) 연다
    const res = R().honOpenOn(S(), { walking: true });
    G.save.write();
    if (ctx.refresh) ctx.refresh();
    if (G.hud && G.hud.syncFace) G.hud.syncFace();
    if (res.error) { await G.steps.nextButton(ctx, step.next || '다음 ▶'); return; }
    await revealPhase(step, ctx, !res.again);
  });

  // ───────── 암전 ─────────
  hon.blackout = async function (step, ctx) {
    if (ctx.setScene) ctx.setScene(null); // 그림 자리를 두지 않는다(폭력·죽음은 그리지 않는다)
    const el = ctx.el || ctx.dlg || null;
    if (el) el.classList.add('blackout');
    try {
      const line = step.t ? G.steps.line(typeof step.t === 'string' ? { t: step.t, mark: step.mark, src: step.src } : step.t, ctx) : null;
      const q = step.quote ? G.steps.quote(Object.assign({}, step.quote, { fold: step.fold != null ? step.fold : step.quote.fold })) : null;
      const box = h('div.blackout-box', line, q);
      ctx.main.appendChild(box);
      G.ui.reveal(box);
      await G.steps.nextButton(ctx, step.next || '다음 ▶');
    } finally {
      if (el) el.classList.remove('blackout');
    }
  };
  if (!G.steps.has('blackout')) G.steps.register('blackout', (step, ctx) => hon.blackout(step, ctx));
})();
