'use strict';
// 3막 할 일(plan T6, spec 6-1) — 단계 'tasks'(할 일 목록), 효과 task·taskPath, 때 딱지, 단계 'blackout'(없으면).
//  할 일 넷을 도는 고리는 엔진의 순서 없는 할 일 목표(js/game/world.js의 runTasks — 거점 자료 PLACES.act3의 b-tasks)가 맡는다:
//   열린 할 일이 모두 함께 목표(위치 표시는 다른 구역이면 그리로 가는 입구), 장사는 재물·유골 뒤(need → G.rules.taskOn의 기록),
//   잠긴 할 일에 다가가면 열림 조건 안내만, 보이지 않는 경계는 되풀이 구역(repeat), 넷 + 경계를 겪어야 끝(finish).
//  이 파일이 더하는 것
//   - 단계 { type:'tasks', list:[…] }: 할 일 목록 한 장(이름·곳·원작에서의 때·마침/아직). 순서는 자유, 장사는 잠김 까닭을 보인다.
//   - 효과 fx:{ task:'treasure' }: G.rules.taskOn으로 확정 기록(G.save.COMMITTED의 tasks) + 때 딱지 맞추기.
//   - 효과 fx:{ taskPath:true }: 넷을 마쳤는데 경계를 아직 겪지 않았으면 경계 가까이로 옮겨 준다(짧은 길, 거점 자료 border.path·spawn).
//   - 때 딱지 G.tasks.timeOf(st): 재회 이튿날 → 장사 뒤(장사를 마치면) → 서너 해 뒤(마음 둔 곳을 고르면). 앞으로만 흐른다.
//   - 단계 'blackout'(암전 한 줄, 그림 없음): 다른 작업이 먼저 등록했으면 그것을 쓴다.
//  화면 이름표는 PLACES.act3.board, 모양은 css/okru.css(3막 화면 모양을 함께 둔다).
(function () {
  const { h, boldNodes } = G.util;
  const S = () => G.save.state;
  const R = () => G.rules;
  const A3 = () => ((window.PLACES || {}).act3) || {};
  const tasks = (G.tasks = {});
  const ORDER = ['treasure', 'bones', 'poems', 'burial'];
  const TIMES0 = ['재회 이튿날', '장사 뒤', '서너 해 뒤'];
  const textOf = (x) => (x == null ? '' : typeof x === 'string' ? x : x.t || '');

  // ───────── 때 딱지 ─────────
  tasks.times = () => { const t = A3().times; return Array.isArray(t) && t.length >= 3 ? t : TIMES0; };
  tasks.timeOf = function (st) {
    const T = tasks.times();
    if (st && st.mind) return T[2];
    if (st && st.tasks && st.tasks.burial) return T[1];
    return T[0];
  };
  // 지금 3막이면 HUD의 때 딱지를 기록에 맞춘다(맵을 옮기지 않아도)
  tasks.syncTime = function () {
    const st = S();
    if (st.place !== 'act3' || !G.hud || !G.hud.els || !G.hud.els()) return;
    G.hud.where(G.hud.els().where.textContent, tasks.timeOf(st));
  };

  // ───────── 효과 ─────────
  G.steps.effects.task = (v, ctx, st) => {
    for (const id of [].concat(v)) R().taskOn(st, id);
    tasks.syncTime();
  };
  G.steps.effects.taskPath = (v, ctx, st) => { if (v && R().act3Goal(st).border) tasks.openPath(); };

  // 짧은 길: 경계가 있는 구역의 경계 가까이로 옮기고 한 줄(path)과 부추김(nudge)을 보인다.
  //  엔진의 할 일 고리는 곧바로 경계를 가리키는 목표(finishGoal)를 건다. 옮기는 동안은 세상이 멈춘다(G.world.busy).
  tasks.openPath = function () {
    const B = A3().border || {};
    if (!B.map || !G.world || !G.world.changeMap || !G.world.mapDef(B.map)) return null;
    tasks._path = (async () => {
      await G.world.changeMap(B.map, B.spawn || null);
      const lines = [B.path, B.nudge].filter(Boolean);
      if (lines.length) await G.world.sayLines(lines);
    })();
    return tasks._path;
  };

  // ───────── 할 일 목록 ─────────
  const mapName = (id) => ((A3().maps || {})[id] || {}).name || '';
  const spotName = (t) => ((((A3().maps || {})[t.map] || {}).spots || {})[t.spot] || {}).name || '';
  tasks.board = function (st, list) {
    const P = A3(), L = P.board || {}, T = P.tasks || {};
    const rows = (list || ORDER).filter((id) => T[id]).map((id) => {
      const t = T[id];
      const done = !!(st.tasks && st.tasks[id]);
      const open = R().taskOpen(st, id);
      const state = done ? 'done' : open ? 'open' : 'locked';
      const where = mapName(t.map);
      return h('li.task-row.' + state, { 'data-task': id },
        h('div.tk-head', h('strong.tk-name', t.name || id), done ? h('span.tk-state.done', L.done || '') : !open ? h('span.tk-state.locked', L.locked || '') : null),
        h('div.tk-meta',
          where ? h('span.tk-where', { title: spotName(t) || null }, where) : null,
          t.time ? h('span.tk-time', (L.time ? L.time + ': ' : '') + t.time) : null));
    });
    // 잠긴 할 일의 까닭은 목록 아래 한 줄로(칸이 길어지지 않게)
    const locks = (list || ORDER).filter((id) => T[id] && T[id].locked && !(st.tasks && st.tasks[id]) && !R().taskOpen(st, id))
      .map((id) => h('p.tk-lock', { 'data-lock': id }, G.steps.mark(T[id].locked.mark || '게임 설정'), h('b', (T[id].name || id) + ' — '), boldNodes(textOf(T[id].locked))));
    return h('div.task-board', { role: 'group', 'aria-label': L.title || '' },
      L.title ? h('h3.tk-title', L.title) : null,
      h('ol.tk-list', rows), locks);
  };
  G.steps.register('tasks', async function (step, ctx) {
    if (step.scene && ctx.setScene) ctx.setScene(step.scene);
    const el = tasks.board(S(), step.list);
    if (ctx.el) ctx.el.classList.add('tasksmode');
    ctx.main.appendChild(el);
    G.ui.reveal(el);
    tasks.syncTime();
    try { await G.steps.nextButton(ctx, step.next || '다음 ▶'); }
    finally { if (ctx.el) ctx.el.classList.remove('tasksmode'); }
  });

  // ───────── 암전(한 줄, 그림 없음) ─────────
  //  { type:'blackout', t:'한 줄', mark, src, status, quote?:{ han, ko, src, fold? }, fold? } — 삽화 자리를 비우고 어둡게, 한 줄과(있으면) 접은 원문 카드.
  //  2막 작업이 먼저 등록했으면 그것을 쓴다(모든 막이 같은 암전).
  if (!G.steps.has('blackout')) {
    G.steps.register('blackout', async function (step, ctx) {
      if (ctx.setScene) ctx.setScene(null);
      const el = ctx.el;
      if (el) el.classList.add('blackout');
      try {
        const line = G.steps.line({ t: step.t || '', mark: step.mark, src: step.src, status: step.status }, ctx);
        const box = h('div.blackout-line', line);
        ctx.main.appendChild(box);
        if (step.quote) ctx.main.appendChild(h('div.blackout-quote', G.steps.quote(Object.assign({}, step.quote, step.fold != null && step.quote.fold == null ? { fold: step.fold } : {}))));
        G.ui.reveal(box);
        await G.steps.nextButton(ctx, step.next || '다음 ▶');
      } finally {
        if (el) el.classList.remove('blackout');
      }
    });
  }
})();
