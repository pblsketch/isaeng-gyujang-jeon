'use strict';
// 담 앞 순간 화면(모든 막이 쓴다, plan T4·spec 5절·6-3) — 단계 종류 'wall'과 'propose'.
//  { type:'wall', id|wall:'순간 열쇠', tip?:글 덩이, leave?:글 덩이 }   수단 고르기(WALLS[순간].means)
//  { type:'propose', wall:'w3-propose' } 또는 kind:'answer'인 순간의 'wall'      답 고르기(WALLS[순간].answers·labels·together)
//
//  흐름(수단 고르기): 담 높이 연출 → 들어가는 글(intro) → 수단 칸 → 고르면 곧바로 확정 기록(G.rules.useMeansOn, 시도 번호)
//   → 인물·세계의 반응(첫 반응 / 다시 쓸 때 / 두 번째 실패부터 실마리 — 규칙이 고른다) → 원작에 맞으면 '다음', 아니면 담만 높아지고 다시 고른다.
//   - 혼이 열리기 전에는 이름 없는 잠긴 칸(누를 수 없음). 써 본 수단에는 작은 표시가 남지만 다시 고를 수 있다.
//   - 통과가 없는 순간(G.rules.canLeave, 3막 경계)은 '돌아서기'로 떠난다. 들어서기만 해도 경계를 겪은 것으로 기록한다(borderOn).
//  흐름(답 고르기): together 대화(이생의 말 + 최 씨의 원작 답 — 고르기가 아니다) → 들어가는 글 → 답 단추(labels, '함께 가자'는 없다)
//   → 답하면 확정 기록(G.rules.answerOn) → 'stay'는 반응·담이 높아짐·다시 고름, 원작의 답은 '다음'.
//  담 높이는 보이기만 한다(벌·진행 차이 없음). 점수·맞음·틀림 표시를 하지 않는다. 반응은 인물·세계의 말이다.
//  단추를 그릴 때 받은 시도 번호(G.rules.nextAttempt)로 기록하므로 두 번 눌러도 한 번만 들어간다.
//  화면 글(단추 이름표)은 TEXTS.WALL, 이야기 글은 js/data/walls.js. 모양은 css/wall.css.
(function () {
  const { h, boldNodes, T } = G.util;
  const S = () => G.save.state;
  const R = () => G.rules;
  const TX = () => ((window.TEXTS || {}).WALL) || {};
  const wall = (G.wall = {});

  const textOf = (x) => (x == null ? '' : typeof x === 'string' ? x : x.t || x.ko || '');
  const save = (ctx) => { G.save.write(); if (ctx && ctx.refresh) ctx.refresh(); };

  // ───────── 담 높이 연출(보이기만) ─────────
  //  사건 화면이면 삽화 자리 위쪽에, 맵 위 대화창이면 글 칸 위에 둔다. data-height는 점검이 읽는다.
  function makeStage(ctx, moment, W) {
    const el = h('div.wall-stage', { 'aria-hidden': 'true', 'data-moment': moment, 'data-height': '0' },
      h('div.ws-scene',
        h('i.ws-me'),
        h('div.ws-wall', h('i.ws-cap'), h('i.ws-face')),
        h('i.ws-far')),
      W.title ? h('div.ws-title', T(W.title)) : null,
      h('div.ws-note', TX().rise || ''));
    if (ctx.mode === 'event' && ctx.el) ctx.el.appendChild(el);
    else if (ctx.main && ctx.main.parentNode) ctx.main.parentNode.insertBefore(el, ctx.main);
    let last = null;
    return {
      el,
      set(level, animate) {
        const lv = Math.max(0, level | 0);
        el.dataset.height = String(lv);
        el.style.setProperty('--lv', String(Math.min(lv, 8)));
        if (animate && last != null && lv > last) { el.classList.remove('rise'); void el.offsetWidth; el.classList.add('rise'); }
        else if (!animate) el.classList.remove('rise');
        last = lv;
      },
      remove() { el.remove(); },
    };
  }

  // 들어가는 글: 마지막 줄 앞까지는 한 줄씩 넘기고, 마지막 줄은 고르기 칸과 함께 남긴다
  async function intro(lines, ctx) {
    const list = (lines || []).slice();
    if (!list.length) return;
    const last = list.pop();
    if (list.length) await G.steps.lines(list, ctx, '▶');
    ctx.main.innerHTML = '';
    const el = G.steps.line(last, ctx);
    if (el) { ctx.main.appendChild(el); G.ui.reveal(el); }
  }

  // 반응 한 묶음(글 덩이 여럿 — 인물이면 말풍선). 담이 높아졌다는 연출 글은 담 그림 아래(.ws-note)에 잠깐 뜬다
  function reactionBox(res, ctx) {
    return h('div.wall-react', { 'data-n': String(res.n), 'data-layers': (res.layers || []).join(' '), 'data-means': res.means, 'aria-live': 'polite' },
      (res.react || []).map((l) => G.steps.line(l, ctx)).filter(Boolean));
  }

  // 단추 묶음을 아래 트레이에 그리고 하나를 고를 때까지 기다린다(두 번 눌러도 한 번)
  function trayPick(ctx, cls, hint, label, buttons) {
    return new Promise((res) => {
      let done = false;
      const list = h('div.options.wall-opts.n' + Math.min(buttons.length, 5), { role: 'group', 'aria-label': label || '' });
      for (const b of buttons) {
        if (!b.el.disabled) b.el.addEventListener('click', () => {
          if (done || b.el.disabled) return;
          done = true;
          for (const x of list.querySelectorAll('button')) { x.disabled = true; x.classList.add(x === b.el ? 'picked' : 'dim'); }
          res(b.value);
        });
        list.appendChild(b.el);
      }
      ctx.tray(h('div.choice-tray.' + cls, hint ? h('div.tray-hint', boldNodes(textOf(hint))) : null, list));
      const first = list.querySelector('button:not([disabled])');
      if (first) setTimeout(() => first.isConnected && !done && first.focus({ preventScroll: true }), 30);
    });
  }

  // 수단 칸 하나
  function meansButton(slot, W) {
    if (slot.locked) {
      return h('button.opt.means-slot.locked', { type: 'button', disabled: true, 'data-means': slot.id, 'aria-label': TX().locked || '잠긴 칸', title: TX().lockedHint || '' },
        h('span.ot', { 'aria-hidden': 'true' }, ''),
        h('span.od', TX().lockedHint || ''),
        h('i.lock-ic', { 'aria-hidden': 'true' }));
    }
    const act = (W.opts || {})[slot.id];
    const used = slot.used ? (TX().used || '') : '';
    return h('button.opt.means-slot' + (slot.used ? '.used' : ''), { type: 'button', 'data-means': slot.id, 'aria-label': slot.name + (act ? ' — ' + textOf(act) : '') + (used ? ' (' + used + ')' : '') },
      h('span.ot', slot.name),
      act ? h('span.od', boldNodes(textOf(act))) : null,
      used ? h('span.used-mark', { 'aria-hidden': 'true' }, used) : null);
  }

  // 떠날 때의 글: 단계의 leave → 거점 자료의 border.leave(그 순간을 가리키는 것) → 화면 기본 글
  function leaveLine(step, moment) {
    if (step.leave) return step.leave;
    const P = window.PLACES || {};
    for (const k in P) { const b = P[k] && P[k].border; if (b && b.wall === moment && b.leave) return b.leave; }
    return { t: TX().leaveLine || '', mark: '게임 설정' };
  }

  // 이미 통과한 순간(통과를 기록한 뒤 단계를 마치기 전에 껐다 켰을 때): 통과한 반응을 다시 보이고 넘어간다
  function passedResult(moment, W) {
    const st = S();
    if (W.kind === 'answer') return R().answerOn(st, (W.ok || [])[0]);
    return R().useMeansOn(st, moment, (W.ok || [])[0]);
  }

  // ───────── 수단 고르기 ─────────
  async function meansMoment(step, ctx, moment, W, stage) {
    const st = S();
    const act = W.act;
    if (R().canLeave(moment)) { R().borderOn(st); save(ctx); }
    stage.set(R().wallHeight(st, act));
    if (R().wallPassed(st, moment)) return finishPass(step, ctx, passedResult(moment, W), stage);
    await intro(W.intro, ctx);
    // 하다 말고 껐다 켠 경우: 마지막으로 본 반응을 다시 보인다(기록은 그대로)
    const prev = R().reactionFor(st, moment);
    if (prev) ctx.main.appendChild(reactionBox(prev, ctx));
    let hint = prev ? TX().again : (step.tip || TX().pick);
    for (let guard = 0; guard < 200; guard++) {
      const n = R().nextAttempt(S(), moment);            // 단추를 그릴 때 받아 둔다(두 번 눌러도 한 번)
      const slots = R().meansFor(S(), moment);
      const buttons = slots.map((s) => ({ el: meansButton(s, W), value: { means: s.id } }));
      if (R().canLeave(moment)) {
        buttons.push({ el: h('button.opt.wall-leave', { type: 'button', 'data-means': 'leave' }, h('span.ot', TX().leave || ''), TX().leaveDesc ? h('span.od', TX().leaveDesc) : null), value: { leave: true } });
      }
      const pick = await trayPick(ctx, 'means-tray', hint, TX().group, buttons);
      await G.util.wait(160);
      ctx.tray(null);
      if (pick.leave) {
        ctx.main.innerHTML = '';
        await G.steps.lines([leaveLine(step, moment)], ctx);
        return { left: true };
      }
      const res = R().useMeansOn(S(), moment, pick.means, n);
      save(ctx);
      if (res.error) continue;
      const after = R().wallHeight(S(), act);
      ctx.main.innerHTML = '';
      const actText = (W.opts || {})[pick.means];
      ctx.main.appendChild(h('div.para.picked-line.show', '▸ ', R().meansName(pick.means), actText ? ' — ' + textOf(actText) : ''));
      if (res.pass) return finishPass(step, ctx, res, stage, true);
      const box = reactionBox(res, ctx);
      ctx.main.appendChild(box);
      stage.set(after, true);
      G.ui.reveal(box, true);
      hint = guard === 0 && !prev ? TX().again : null; // '다시 골라 보자'는 처음 다시 고를 때만(글 칸을 반응에 내준다)
    }
    return null;
  }

  // 원작에 맞는 수단·답: 반응을 보이고 단계 효과를 한 번만 적용한 뒤 '다음'
  async function finishPass(step, ctx, res, stage, fresh) {
    if (!fresh) ctx.main.innerHTML = '';
    const box = reactionBox(res, ctx);
    box.classList.add('pass');
    ctx.main.appendChild(box);
    G.ui.reveal(box, true);
    stage.set(R().wallHeight(S(), (R().wallOf(res.moment) || {}).act));
    if (R().applyStep) R().applyStep(step, { place: ctx.placeId || S().place || null });
    await G.steps.nextButton(ctx, step.next || '다음 ▶');
    return { pass: true, means: res.means };
  }

  // ───────── 답 고르기(이생의 제안) ─────────
  async function answerMoment(step, ctx, moment, W, stage) {
    const st = S();
    stage.set(R().wallHeight(st, W.act));
    if (R().wallPassed(st, moment)) return finishPass(step, ctx, passedResult(moment, W), stage);
    // together: 이생의 '함께 저승에' 말과 최 씨의 원작 답. 고르기가 아니라 고르기 앞의 대화다
    const T0 = W.together || {};
    const tlines = [T0.isaeng, T0.isaengAfter, T0.reply, T0.note].filter(Boolean);
    if (tlines.length) {
      const wrap = h('div.wall-together');
      ctx.main.appendChild(wrap);
      await G.steps.lines(tlines, Object.assign({}, ctx, { main: wrap }), '▶');
    }
    await intro(W.intro, ctx);
    const prev = R().reactionFor(st, moment);
    if (prev) ctx.main.appendChild(reactionBox(prev, ctx));
    let hint = prev ? null : TX().answer;
    for (let guard = 0; guard < 200; guard++) {
      const n = R().nextAttempt(S(), moment);
      const tried = Array.isArray(S().propose) ? S().propose : [];
      const buttons = R().proposeChoices().map((a) => {
        const lab = (W.labels || {})[a];
        const used = tried.includes(a);
        return {
          value: a,
          el: h('button.opt.answer-slot' + (used ? '.used' : ''), { type: 'button', 'data-answer': a },
            h('span.ot', boldNodes(textOf(lab) || a)),
            used ? h('span.used-mark', { 'aria-hidden': 'true' }, TX().used || '') : null),
        };
      });
      const a = await trayPick(ctx, 'answer-tray', hint, TX().answers, buttons);
      await G.util.wait(160);
      ctx.tray(null);
      const res = R().answerOn(S(), a, n);
      save(ctx);
      if (res.error) continue;
      const after = R().wallHeight(S(), W.act);
      ctx.main.innerHTML = '';
      ctx.main.appendChild(h('div.para.picked-line.show', '▸ ', boldNodes(textOf((W.labels || {})[a]) || a)));
      if (res.pass) return finishPass(step, ctx, res, stage, true);
      const box = reactionBox(res, ctx);
      ctx.main.appendChild(box);
      stage.set(after, true);
      G.ui.reveal(box, true);
      hint = null;
    }
    return null;
  }

  // ───────── 단계 실행 ─────────
  wall.run = async function (step, ctx, moment) {
    moment = moment || step.wall || step.id;
    const W = R().wallOf(moment);
    if (!W) return G.steps.notReady(step, ctx);
    if (ctx.setScene) ctx.setScene(step.scene || null); // 앞 장면의 삽화 대신 담 그림
    const stage = makeStage(ctx, moment, W);
    if (ctx.el) ctx.el.classList.add('wallmode');
    try {
      if (W.kind === 'answer') return await answerMoment(step, ctx, moment, W, stage);
      return await meansMoment(step, ctx, moment, W, stage);
    } finally {
      stage.remove();
      if (ctx.el) ctx.el.classList.remove('wallmode');
    }
  };

  G.steps.register('wall', (step, ctx) => wall.run(step, ctx));
  G.steps.register('propose', (step, ctx) => {
    const m = step.wall || Object.keys(window.WALLS || {}).find((k) => (WALLS[k] || {}).kind === 'answer') || 'w3-propose';
    return wall.run(step, ctx, m);
  });
})();
