'use strict';
// 막 끝 빈칸 화면(모든 막이 쓴다, plan T4·spec 7절) — 단계 종류 'blank'.
//  { type:'blank', act:'act1'|'act2' }  그 막의 빈칸 둘(CARDS[막].blanks)을 낱말 카드로 채운다. 표 전체(CARDS.table 세 줄)를 늘 함께 보인다.
//   - 카드는 G.rules.cardsFor(막)(그 막까지 사건에서 저절로 얻는 카드 + 헷갈릴 카드). 가나다 차례로 늘어놓는다.
//   - 고르면 곧바로 확정 기록(G.rules.blankOn — 칸마다 처음 고른 낱말 first, 맞으면 final).
//     맞지 않는 카드: 이생이나 최 씨가 작품 속 말로 짧게 답하고(CARDS.replies) 학생은 다시 고른다. 오답 표시는 없다.
//  { type:'blank', act:'act3' }  3막 끝: 표 전체(채운 낱말)를 보이고 그 아래 '반복의 뜻' 한 문장(FINALE.repeat, 필수, 채점 없음)
//   → G.rules.lineOn(st, 'repeat', 글). 쓰기 칸은 G.steps.writeLine(G.ui.writeField: 화면 키보드가 열려도 칸과 완료 단추가 보임).
//  표 문장의 {빈칸 열쇠:조사}: 조사는 받침 있는 꼴(을·이·으로)로 적고, 넣은 낱말에 받침이 없으면 를·가·로로 바꾼다(G.blank.josa).
//  화면 글(이름표)은 TEXTS.BLANK, 이야기 글은 js/data/cards.js·finale.js. 모양은 css/wall.css.
(function () {
  const { h, boldNodes, T } = G.util;
  const S = () => G.save.state;
  const R = () => G.rules;
  const TX = () => ((window.TEXTS || {}).BLANK) || {};
  const C = () => window.CARDS || {};
  const blank = (G.blank = {});
  const save = (ctx) => { G.save.write(); if (ctx && ctx.refresh) ctx.refresh(); };

  // ───────── 조사 ─────────
  //  blank.josa('담장', '을') → '담장을' · ('과거 급제', '을') → '과거 급제를' · ('서울', '으로') → '서울로'(ㄹ 받침)
  //  을/를·이/가·은/는·과/와·으로/로(·아/야 …)를 받침에 맞춘다. 한글로 끝나지 않는 낱말은 적힌 꼴 그대로.
  blank.josa = function (word, p) {
    word = String(word == null ? '' : word);
    p = String(p || '');
    if (!p || G.util.jong(word.trim()) == null) return word + p;
    return word + G.util.josa(word.trim(), p);
  };
  // 비어 있는 칸 뒤에 보일 조사(두 꼴을 함께): '을' → '을/를'
  const ALT = { 을: '를', 를: '을', 이: '가', 가: '이', 은: '는', 는: '은', 과: '와', 와: '과', 으로: '로', 로: '으로' };
  blank.both = (p) => (ALT[p] ? (['을', '이', '은', '과', '으로'].includes(p) ? p + '/' + ALT[p] : ALT[p] + '/' + p) : p || '');
  // 표 문장을 조각으로: [{ text } | { key, p }]
  blank.parse = function (t) {
    const out = [];
    const re = /\{([A-Za-z0-9_-]+)(?::([^}]*))?\}/g;
    let last = 0, m;
    t = String(t || '');
    while ((m = re.exec(t))) {
      if (m.index > last) out.push({ text: t.slice(last, m.index) });
      out.push({ key: m[1], p: m[2] || '' });
      last = re.lastIndex;
    }
    if (last < t.length) out.push({ text: t.slice(last) });
    return out;
  };
  // 표 문장을 글자로 채운다(결과 화면·그림 저장에도 쓸 수 있다). 빈 칸은 '○○' + 두 꼴 조사
  blank.fill = function (t, words) {
    return blank.parse(t).map((x) => (x.key == null ? x.text : words && words[x.key] ? blank.josa(words[x.key], x.p) : '○○' + blank.both(x.p))).join('');
  };
  // 기록에서 칸마다 최종 낱말
  blank.finals = function (st) {
    const out = {};
    for (const k in (st && st.blanks) || {}) if (st.blanks[k] && st.blanks[k].final) out[k] = st.blanks[k].final;
    return out;
  };

  // ───────── 표 그리기 ─────────
  //  o: { active:'지금 채울 칸', keys:['이 막의 칸'…] }. 채운 칸 .filled, 지금 칸 .active, 이 막의 빈 칸 .empty, 뒤 막의 칸 .later
  blank.table = function (st, o = {}) {
    const words = blank.finals(st);
    const keys = o.keys || [];
    const list = C().table || [];
    // 표시 칩: 세 줄이 같은 표시면 제목에 한 번, 다르면 줄마다
    const one = list.length && list.every((r) => r.mark === list[0].mark) ? list[0].mark : null;
    const rows = list.map((r) => h('div.bt-row',
      h('div.bt-label', !one && r.mark ? G.steps.mark(r.mark) : null, T(r.label || '')),
      h('p.bt-text', blank.parse(r.t).map((x) => {
        if (x.key == null) return T(x.text);
        const w = words[x.key];
        if (w) return [h('span.bt-slot.filled', { 'data-blank': x.key }, w), blank.josa(w, x.p).slice(String(w).length)];
        const cls = x.key === o.active ? '.active' : keys.includes(x.key) ? '.empty' : '.later';
        return [h('span.bt-slot' + cls, { 'data-blank': x.key, 'aria-label': TX().slot || '빈칸' }, '  '), h('span.bt-p', blank.both(x.p))];
      }))));
    return h('div.blank-table', h('div.bt-title', one ? G.steps.mark(one) : null, TX().title || ''), rows);
  };

  // ───────── 막 끝 빈칸 둘 ─────────
  function cardButtons(cards) {
    return cards.map((w) => h('button.opt.word-card', { type: 'button', 'data-word': w }, h('span.ot', w)));
  }
  function pickCard(ctx, hint, cards) {
    return new Promise((res) => {
      let done = false;
      const list = h('div.options.cards', { role: 'group', 'aria-label': TX().cards || '' }, cardButtons(cards));
      for (const b of list.querySelectorAll('button')) b.addEventListener('click', () => {
        if (done) return;
        done = true;
        for (const x of list.querySelectorAll('button')) x.disabled = true;
        res(b.dataset.word);
      });
      ctx.tray(h('div.blank-tray', hint ? h('div.tray-hint', boldNodes(hint)) : null, list));
      const first = list.querySelector('button');
      if (first) setTimeout(() => first.isConnected && !done && first.focus({ preventScroll: true }), 30);
    });
  }

  // 사건에서 막 얻은 낱말 카드 알림(G.hud.got)이 표를 덮은 채 카드를 고르지 않게, 알림이 다 지나간 뒤 카드를 늘어놓는다
  async function toastsSettle(maxMs = 9000) {
    const t0 = Date.now();
    let quiet = 0;
    while (Date.now() - t0 < maxMs && quiet < 2) {
      quiet = document.querySelector('.gettoast') ? 0 : quiet + 1;
      await G.util.wait(quiet ? 200 : 300);
    }
  }

  async function fillAct(step, ctx, act) {
    const keys = ((C()[act] || {}).blanks) || [];
    const cards = R().cardsFor(act).slice().sort((a, b) => a.localeCompare(b, 'ko'));
    const tableBox = h('div.blank-table-box');
    const replyBox = h('div.blank-reply-box');
    ctx.main.innerHTML = '';
    ctx.main.append(tableBox, replyBox);
    const draw = (active) => {
      tableBox.innerHTML = '';
      tableBox.appendChild(blank.table(S(), { active, keys }));
      const a = tableBox.querySelector('.bt-slot.active');
      if (a) G.ui.reveal(a);
    };
    let hint = TX().pick;
    draw(keys.find((k) => !((S().blanks || {})[k] || {}).final));
    await toastsSettle();
    for (let guard = 0; guard < 300; guard++) {
      const st = S();
      const active = keys.find((k) => !(st.blanks && st.blanks[k] && st.blanks[k].final));
      draw(active);
      if (!active) break;
      const card = await pickCard(ctx, hint, cards);
      const r = R().blankOn(S(), active, card);
      save(ctx);
      replyBox.innerHTML = '';
      if (r.error) continue;
      if (r.ok) { hint = TX().pick; continue; }
      // 맞지 않는 카드: 인물의 말(작품 속 말로 짧게). 오답 표시 없이 다시 고른다
      const line = r.reply ? G.steps.line(r.reply, ctx) : null;
      replyBox.appendChild(h('div.blank-reply', { 'data-card': card, 'aria-live': 'polite' }, line));
      G.ui.reveal(replyBox, true);
      hint = TX().again;
    }
    ctx.tray(null);
    replyBox.innerHTML = '';
    if (TX().done) replyBox.appendChild(h('p.blank-done', TX().done));
    await G.steps.nextButton(ctx, step.next || '다음 ▶');
  }

  // ───────── 3막 끝: 표 전체 + 반복의 뜻 한 문장 ─────────
  async function repeatLine(step, ctx) {
    const F = (window.FINALE || {}).repeat || {};
    ctx.main.innerHTML = '';
    ctx.main.appendChild(h('div.blank-table-box', blank.table(S(), { keys: [] })));
    for (const l of [F.t ? F : null, F.help || null]) {
      if (!l) continue;
      const el = G.steps.line(l, ctx);
      if (el) { el.classList.add('blank-q'); ctx.main.appendChild(el); }
    }
    const prev = ((S().lines || {}).repeat) || '';
    let text = await G.steps.writeLine(ctx, {
      label: TX().repeatLabel, placeholder: TX().placeholder, done: TX().write, need: TX().need,
      value: prev, required: true, maxlength: 160,
    });
    for (let guard = 0; guard < 20; guard++) {
      const r = R().lineOn(S(), 'repeat', text);
      if (!r.error) break;
      text = await G.steps.writeLine(ctx, { label: TX().repeatLabel, placeholder: TX().placeholder, done: TX().write, need: TX().need, required: true, maxlength: 160 });
    }
    save(ctx);
  }

  blank.run = async function (step, ctx) {
    const act = step.act || S().act || 'act1';
    if (ctx.setScene) ctx.setScene(step.scene || null); // 앞 장면의 삽화 설명이 표를 가리지 않게
    if (ctx.el) ctx.el.classList.add('blankmode');
    try {
      if (act === 'act3') return await repeatLine(step, ctx);
      return await fillAct(step, ctx, act);
    } finally {
      if (ctx.el) ctx.el.classList.remove('blankmode');
    }
  };
  G.steps.register('blank', (step, ctx) => blank.run(step, ctx));
})();
