'use strict';
// 단계 실행기: 단계 하나를 화면에 펼치고, 끝나면 resolve 한다(형제 게임 「최척전」 엔진에서 가져와 줄였다).
//  ctx = { main, tray(content), trayEl(), refresh(), setScene(id), place, placeId, mode:'event'|'dlg', preset, el }
//   - main: 글·카드가 쌓이는 자리 / tray: 화면 아래 엄지 닿는 곳(단추·고르기·쓰기 칸) / setScene: 사건 화면 전체 삽화 바꾸기
//  단계 종류는 G.steps.register('종류', async (step, ctx) => { … })로 등록한다. 여기에는 기본 단계 say·choice·card만 둔다.
//  이 게임의 단계(wall·blank·hon·tasks·mind·okru·propose·summary·blackout 등)는 각 작업의 파일(js/game/*.js)이 등록한다.
//  등록되지 않은 종류는 오류 없이 '준비 중' 카드를 보여 주고 넘어간다.
(function () {
  const { h, T, boldNodes } = G.util;
  const ui = G.ui;
  const steps = (G.steps = {});
  const S = () => G.save.state;
  const TX = () => window.TEXTS || {};

  // ───────── 단계 종류 등록 ─────────
  steps.types = {};
  steps.register = function (type, fn) {
    if (typeof fn !== 'function') throw new Error('단계 함수가 아님: ' + type);
    steps.types[type] = fn;
  };
  steps.has = (type) => typeof steps.types[type] === 'function';
  steps.run = async function (step, ctx) {
    const fn = steps.types[step.type];
    if (fn) return fn(step, ctx);
    return steps.notReady(step, ctx);
  };
  steps.notReady = async function (step, ctx) {
    ctx.main.appendChild(h('div.card.note.notready',
      h('span.kind', '준비 중'),
      h('h3', `「${step.type || '이름 없음'}」 단계는 아직 준비 중이에요`),
      h('p.small', '이 장면을 만드는 작업이 끝나면 여기에 나타나요. 지금은 넘어가도 돼요.')));
    await nextButton(ctx, '넘어가기 ▶');
  };

  // ───────── 공통: 아래 트레이의 버튼 ─────────
  function actionBtn(label, cls, onClick) {
    return h('button.btn' + (cls ? '.' + cls : ''), { type: 'button', on: { click: () => onClick() } }, label);
  }
  steps.actionBtn = actionBtn;
  // Enter를 게임 진행에 써도 되는 때: 판이 떠 있지 않고, 다른 버튼·입력 칸에 포커스가 없을 때
  function enterFree(e, own) {
    if (document.querySelector('.sheet-back, .overlay')) return false;
    const t = e.target;
    if (t && t !== own && t !== document.body && t.closest && t.closest('button, a, input, textarea, select, [role="button"], [tabindex]')) return false;
    return true;
  }
  steps.enterFree = enterFree;
  function nextButton(ctx, label = '다음 ▶', extra) {
    return new Promise((res) => {
      // 누르면 트레이를 비운다(다음 화면에 눌러도 아무 일 없는 단추가 남지 않게)
      const b = actionBtn(label, 'primary', () => { cleanup(); if (b.isConnected) ctx.tray(null); res(); });
      const key = (e) => {
        if (!b.isConnected) { cleanup(); return; } // 다른 화면으로 떠났으면 손을 뗀다
        // Enter는 어디서나, Space는 포커스가 아무 데도 없을 때만(단추 위의 Space는 브라우저가 알아서 누른다)
        if (e.key === 'Enter' && enterFree(e, b)) { e.preventDefault(); b.click(); }
        else if (e.key === ' ' && (e.target === document.body || !e.target) && enterFree(e, b)) { e.preventDefault(); b.click(); }
      };
      document.addEventListener('keydown', key);
      function cleanup() { document.removeEventListener('keydown', key); }
      ctx.tray(h('div.actions', extra || null, b));
      setTimeout(() => b.isConnected && b.focus({ preventScroll: true }), 30);
    });
  }
  steps.nextButton = nextButton;
  function feedback(box, kind, text) {
    box.innerHTML = '';
    box.appendChild(h('div.feedback.' + kind, boldNodes(text)));
    G.ui.reveal(box, true);
  }
  steps.feedback = feedback;

  // 글 사이에 끼우는 작은 삽화. 그림 파일이 목록에 없으면 빈 종이 판(요청을 보내지 않는다)
  steps.scene = function (name, cls = '') {
    if (!name) return document.createDocumentFragment();
    const src = G.util.art('sc', name);
    return h('div.scene' + cls, src ? h('img', { src, alt: '' }) : h('div.blank-paper', { 'aria-hidden': 'true' }));
  };

  // ───────── 조건 ─────────
  //  when: { flag:{k:v}, done:'키'|[…], act:'act2', not:{…}, any:[{…},{…}] } 또는 (state) => true|false
  //  다른 파일이 조건을 더할 수 있다: G.steps.conds.이름 = (값, state) => true|false
  steps.conds = {
    flag: (v, st) => Object.keys(v).every((k) => (st.flags || {})[k] === v[k]),
    done: (v, st) => [].concat(v).every((k) => !!(st.done || {})[k]),
    act: (v, st) => [].concat(v).includes(st.act),
    not: (v) => !steps.ok(v),
    any: (v) => [].concat(v).some((w) => steps.ok(w)),
  };
  steps.ok = function (when) {
    if (!when) return true;
    if (typeof when === 'function') return !!when(S());
    const st = S();
    for (const k in when) {
      const f = steps.conds[k];
      if (f && !f(when[k], st)) return false;
    }
    return true;
  };

  // ───────── 상태 바꾸기 ─────────
  //  fx: { set:{…}(최상위 값), flags:{…} } — 다른 파일이 효과를 더할 수 있다: G.steps.effects.이름 = (값, ctx, state) => {}
  //  (예: 낱말 카드 fx:{ word:'담장' }은 규칙 작업이 effects.word로 단다. 등록되지 않은 효과 이름은 조용히 건너뛴다)
  steps.effects = {
    set: (v, ctx, st) => Object.assign(st, JSON.parse(JSON.stringify(v))),
    flags: (v, ctx, st) => Object.assign(st.flags, v),
  };
  steps.apply = function (fx, ctx) {
    if (!fx) return;
    const st = S();
    for (const k in fx) { const f = steps.effects[k]; if (f) f(fx[k], ctx, st); }
    G.save.write();
    if (ctx && ctx.refresh) ctx.refresh();
  };

  // ───────── 표시 다섯(원문·풀이·게임 설정·이본 노트·해석) ─────────
  //  이름·색: TEXTS.MARKS(엔진 공통) → NOTES.marks(설명 포함)가 있으면 그것이 먼저
  steps.marks = () => Object.assign({}, TX().MARKS || {}, (window.NOTES && NOTES.marks) || {});
  steps.mark = function (k) {
    const m = steps.marks()[k] || { name: k };
    return h('span.rchip', { style: m.color ? '--mk:' + m.color : null, title: m.desc || null }, m.name || k);
  };
  const mark = steps.mark;
  // 원문 한 구절은 늘 풀이와 함께: { han, ko, src?, fold? } (또는 { 원문, 풀이 })
  //  fold:true면 접어 두고 '원문 펼치기' 단추(44px, aria-expanded)를 누르면 원문과 풀이가 보인다(민감한 원문 줄 — spec 12절)
  steps.quote = function (q) {
    if (!q) return null;
    const han = q.han || q.원문, ko = q.ko || q.풀이;
    if (!han && !ko) return null;
    const rows = [
      han ? h('div.rq-row', mark('원문'), h('p.han', han)) : null,
      ko ? h('div.rq-row', mark('풀이'), h('p.ko', boldNodes(ko))) : null,
      q.src ? h('p.src', q.src) : null];
    if (!q.fold) return h('div.rquote', rows);
    const body = h('div.rq-body', { hidden: true }, rows);
    const btn = h('button.btn.small.rq-unfold', { type: 'button', 'aria-expanded': 'false' }, (TX().FOLD || {}).open || '원문 펼치기');
    btn.addEventListener('click', () => {
      body.hidden = !body.hidden;
      btn.setAttribute('aria-expanded', body.hidden ? 'false' : 'true');
      btn.textContent = body.hidden ? ((TX().FOLD || {}).open || '원문 펼치기') : ((TX().FOLD || {}).close || '원문 접기');
      if (!body.hidden) G.ui.reveal(body);
    });
    return h('div.rquote.folded', (TX().FOLD || {}).note ? h('p.rq-note', TX().FOLD.note) : null, btn, body);
  };

  // ───────── 한 줄(대사·서술·원문·카드) ─────────
  //  line: '서술' | { t, mark?, src? }(글 한 덩이) | { who:'인물 id', t, mark? } | { han, ko, src, fold?, who? }(원문 + 풀이 짝, who면 그 사람 말풍선 안에)
  //        | { card:{kind,title,body,han,ko,src} } | { fx:{…} } | { scene:'sc_x' } | { when:{…}, … }
  //  다른 파일이 줄 종류를 더할 수 있다: G.steps.lineKinds.이름 = (line, ctx) => 요소|null
  steps.lineKinds = {};
  steps.line = function (line, ctx) {
    if (typeof line === 'string') line = { t: line };
    if (line.when && !steps.ok(line.when)) return null;
    if (line.fx) { steps.apply(line.fx, ctx); if (line.t == null && !line.who && !line.card && !line.scene && !line.han && !line.원문) return null; }
    for (const k in steps.lineKinds) if (line[k] != null) return steps.lineKinds[k](line, ctx);
    if (line.scene) {
      if (ctx && ctx.setScene) { ctx.setScene(line.scene); if (line.t == null && !line.who) return null; }
      else return steps.scene(line.scene, '.short');
    }
    if (line.card) return ui.card(line.card);
    const isHan = !!(line.han || line.원문);
    if (isHan && !line.who) return h('div.para.show.qline', steps.quote(line));
    const chip = line.mark && !isHan ? mark(line.mark) : null;
    const body = isHan ? steps.quote(line) : boldNodes(line.t);
    if (!line.who) return h('div.para.narr.show', chip, body);
    const p = G.util.person(line.who);
    const me = line.who === G.util.playerId();
    return h('div.para.say.show' + (me ? '.me' : '') + (isHan ? '.qline' : ''), { style: { '--pc': (p && p.color) || '#5a4a3a' } },
      h('div.who', ui.face(line.who, line.sp)),
      h('div.bubble', h('span.nm', G.util.who(line.who) || line.name || ''), chip, body));
  };
  // 여러 줄을 한 줄씩 넘기며 보여 준다
  steps.lines = async function (lines, ctx, lastLabel = '다음 ▶') {
    let box = h('div.says');
    ctx.main.appendChild(box);
    const list = (lines || []).filter((l) => typeof l === 'string' || steps.ok(l.when));
    for (let i = 0; i < list.length; i++) {
      const el = steps.line(list[i], ctx);
      if (!el) continue;
      const lastOne = !list.slice(i + 1).some((l) => typeof l === 'string' || !l.fx || l.t != null || l.who || l.card || l.han || l.원문);
      // 이야기 줄 속 카드({ card })는 좁은 글 칸에 끼우지 않고 사건 화면 가운데 한 장으로 크게 보인 뒤, 글 칸을 새로 시작한다
      if (typeof list[i] === 'object' && list[i].card && ctx.mode === 'event' && ctx.el) {
        el.classList.add('linecard');
        await steps.cardMoment(ctx, el, lastOne ? lastLabel : '▶');
        ctx.main.innerHTML = '';
        box = h('div.says');
        ctx.main.appendChild(box);
        continue;
      }
      box.appendChild(el);
      G.ui.reveal(el, true);
      await nextButton(ctx, lastOne ? lastLabel : '▶');
    }
  };

  // 카드는 사건 화면 가운데에 한 장으로 크게(거점 첫 장과 같은 .cardmode 모습). 다음을 누르면 원래 모습으로
  steps.cardMoment = async function (ctx, el, label) {
    const on = ctx.mode === 'event' && ctx.el;
    ctx.main.innerHTML = '';
    if (on) ctx.el.classList.add('cardmode', 'rcardmode');
    ctx.main.appendChild(el);
    if (ctx.main.parentNode) ctx.main.parentNode.scrollTop = 0;
    await nextButton(ctx, label || '다음 ▶');
    if (on) ctx.el.classList.remove('cardmode', 'rcardmode');
  };
  // 이야기 카드 한 장: { kind?, title, body|t, mark?, han?, ko?, quote:{ han, ko, fold? }?, src? }
  steps.infoCard = function (c, kind) {
    c = c || {};
    const k = c.kind || kind || 'note';
    return h('div.card.rcard.' + k,
      h('span.kind', c.mark ? mark(c.mark) : null, c.kindLabel || (ui.KIND || {})[k] || ''),
      c.title ? h('h3', T(c.title)) : null,
      ...String(c.body || c.t || '').split('\n').filter((x) => x !== '').map((line) => h('p', boldNodes(line))),
      steps.quote(c.quote || (c.han ? c : null)),
      c.src && !c.han ? h('p.src', c.src) : null);
  };

  // ───────── 한 줄 쓰기(공용 도우미) ─────────
  //  const 글 = await G.steps.writeLine(ctx, { q:'물음', placeholder, done:'완료', label, need, required:true, maxlength })
  //  물음은 글 자리에, 쓰기 칸(G.ui.writeField)은 아래 트레이에. 빈칸이면 넘어가지 않는다(required:false면 빈칸도 됨).
  steps.writeLine = async function (ctx, o = {}) {
    if (o.q) { const el = steps.line(typeof o.q === 'string' ? { t: o.q, mark: o.mark } : o.q, ctx); if (el) { ctx.main.appendChild(el); G.ui.reveal(el); } }
    const wf = G.ui.writeField(o);
    ctx.tray(h('div.write-tray', wf.el));
    wf.focus(); // 키보드로도 바로 쓸 수 있게(Tab 차례: 입력 칸 → 완료 단추)
    const v = await wf.result;
    ctx.tray(null);
    ctx.main.appendChild(h('div.para.picked-line.show', '— ', v));
    return v;
  };

  // ───────── say: 한 줄씩 넘기며 읽기 ─────────
  //  { id, type:'say', scene:'sc_x', title:'…', lines:[…], next:'마지막 단추 글' }
  steps.register('say', async function (step, ctx) {
    if (step.scene) { if (ctx.setScene) ctx.setScene(step.scene); else ctx.main.appendChild(steps.scene(step.scene)); }
    if (step.title) ctx.main.appendChild(h('h2.stitle', T(step.title)));
    await steps.lines(step.lines, ctx, step.next || '다음 ▶');
  });

  // ───────── choice: 고르기(선택지는 화면 아래 엄지 닿는 곳에) ─────────
  //  { id, type:'choice', scene, pre:[줄…], q:'물음', who:'인물', options:[{ t, d, when, fx…, reply:[줄…] }], after:[줄…] }
  //  선택지에 set·flags 같은 효과를 적으면 고른 뒤 적용된다. 고른 번호는 flags['pick:단계 id']에 남는다.
  //  키보드: 첫 고르기에 포커스, Tab/Shift+Tab으로 옮기고 Enter·Space로 고른다.
  steps.register('choice', async function (step, ctx) {
    const st = S();
    if (step.scene) { if (ctx.setScene) ctx.setScene(step.scene); else ctx.main.appendChild(steps.scene(step.scene, '.short')); }
    for (const l of step.pre || []) { const el = steps.line(l, ctx); if (el) ctx.main.appendChild(el); }
    if (step.q) { const el = steps.line(step.who ? { who: step.who, t: step.q } : { t: step.q }, ctx); if (el) { ctx.main.appendChild(el); G.ui.reveal(el); } }
    const opts = step.options.filter((o) => steps.ok(o.when));
    const preset = ctx.preset && ctx.preset[step.id] != null ? step.options[ctx.preset[step.id]] : null;
    const list = h('div.options.n' + Math.min(3, opts.length), { role: 'group', 'aria-label': step.q ? T(step.q) : '고르기' });
    const pick = await new Promise((res) => {
      opts.forEach((o, i) => {
        const b = h('button.opt', { type: 'button' }, h('span.ot', boldNodes(o.t)), o.d ? h('span.od', boldNodes(o.d)) : null);
        b.addEventListener('click', () => { if (b.disabled) return; res(o); });
        if (preset) b.disabled = true;
        list.appendChild(b);
        if (i === 0 && !preset) setTimeout(() => b.isConnected && b.focus({ preventScroll: true }), 30);
      });
      ctx.tray(h('div.choice-tray', step.hint ? h('div.tray-hint', boldNodes(step.hint)) : null, list));
      if (preset && opts.includes(preset)) setTimeout(() => res(preset), 450);
    });
    list.querySelectorAll('.opt').forEach((b, i) => { b.disabled = true; b.classList.add(opts[i] === pick ? 'picked' : 'dim'); });
    // 고른 것을 글 자리에 남긴다
    ctx.main.appendChild(h('div.para.picked-line.show', '› ', boldNodes(pick.t)));
    await G.util.wait(260);
    ctx.tray(null);
    steps.apply(Object.assign({}, pick, pick.fx || {}), ctx); // 선택지에 바로 적은 효과(set·flags…)와 fx 안의 효과
    if (step.id) st.flags['pick:' + step.id] = step.options.indexOf(pick);
    G.save.write();
    const reply = (pick.reply || []).concat(step.after || []);
    if (reply.length) await steps.lines(reply, ctx);
    else await nextButton(ctx, '다음 ▶');
  });

  // ───────── card: 이야기 카드 한 장 ─────────
  //  { id, type:'card', lines?:[줄…], card:{ kind, title, body, mark, han, ko, quote, src }, fx?:{ word:'담장' } }
  //  카드는 한 번만 반영 장부(G.rules.applyStep)에 적는다. 단계의 fx(낱말 카드 등)는 단계가 끝난 뒤 엔진이 적용한다.
  steps.register('card', async function (step, ctx) {
    if (step.lines && step.lines.length) await steps.lines(step.lines, ctx, '▶');
    if (G.rules && G.rules.applyStep) G.rules.applyStep(step, { place: (ctx && ctx.placeId) || S().place || null });
    await steps.cardMoment(ctx, steps.infoCard(step.card, 'note'), step.next || '다음 ▶');
  });
})();
