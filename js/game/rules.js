'use strict';
// 게임 규칙: 바닥(형제 게임 「최척전」의 rules.js에서 가져온 한 번만 반영 장부·새로고침 대비·attach)과
//  이 게임의 규칙(담 앞 순간·담 높이·반응 세 겹·혼·빈칸·3막 할 일·제안·쓰기·만복사·바로가기·이어 하기 — 아래 '이 게임의 규칙').
//  화면이 부르는 함수 목록과 건드리는 저장 칸은 js/game/AGENTS.md의 '규칙(G.rules)' 절.
//
//  상태를 바꾸는 규칙은 '평범한 상태 객체(st)'에 대해 …On(st, …) 꼴 순수 함수로 짠다(브라우저 없이도 돈다).
//   - R.onceOn(st, key, fn): 같은 열쇠로는 한 번만 적용(장부 st.applied)
//   - R.stepOn(st, step, place, decision): 단계 하나의 효과(순수). 종류별 규칙은 R.stepRules.종류 = (st, step, place, decision) => 결과
//   - R.applyStep(step, { place, key?, decision? }): 게임 중 적용(한 번만) + 저장
//  새로고침 대비: 엔진(app.runSteps)이 단계를 시작할 때 G.save.snapKeys의 값을 st.snap[단계 열쇠]에 떠 두고,
//   그 단계 도중 다시 열면 그 값으로 되돌린 뒤 단계를 다시 펼친다. 이 파일이 장부(applied)를 snapKeys에 넣는다.
//   확정 기록 칸(G.save.COMMITTED: walls·propose·blanks·tasks·mbs·lines …)은 snapKeys에 넣지 않는다(plan 1-3).
(function (root) {
  const G = (root.G = root.G || {});
  const R = (G.rules = {});
  const S = () => G.save.state;
  const clone = (o) => (o == null ? o : JSON.parse(JSON.stringify(o)));
  const hasDOM = () => typeof document !== 'undefined' && !!document.body;

  if (G.save && G.save.snapKeys && !G.save.snapKeys.includes('applied')) G.save.snapKeys.push('applied');

  // ───────── 단계 하나의 효과(순수) ─────────
  //  종류별 규칙: R.stepRules.wall = (st, step, place, decision) => ({ … })  — 오류면 { error:'…' }를 돌려준다(장부에 남지 않음)
  R.stepRules = {};
  R.stepOn = function (st, step, placeId, decision) {
    const f = R.stepRules[step && step.type];
    const r = f ? f(st, step, placeId, decision) : {};
    const res = r || {};
    if (decision != null && res.choice == null && !res.error) res.choice = decision && decision.id ? decision.id : decision;
    return res;
  };

  // 한 번만: 같은 열쇠(거점·단계)로는 한 번만 적용한다
  R.onceOn = function (st, key, fn) {
    st.applied = st.applied || {};
    if (key && st.applied[key]) return { again: true, skipped: true, prev: st.applied[key] };
    const r = fn();
    if (key && r && !r.error) st.applied[key] = r.choice != null ? { choice: r.choice } : true;
    return r;
  };
  R.applied = (key, st) => ((st || S()).applied || {})[key] || null;

  const save = () => { if (G.save && G.save.write) G.save.write(); };
  const stepKey = (place, id) => (G.app && G.app.key ? G.app.key.step(place, id) : 's:' + place + ':' + id);

  // 단계 효과를 한 번만 적용(게임 중): R.applyStep(step, { place, key?, decision? }) → 결과
  R.applyStep = function (step, o = {}) {
    const st = S();
    const place = o.place || st.place || null;
    const key = o.key || stepKey(place, step.id);
    const r = R.onceOn(st, key, () => R.stepOn(st, step, place, o.decision));
    if (r && !r.error && !r.again) save();
    return r;
  };

  // 거점 들어서기·떠나기(게임 중). 지금 거점과 막(act)을 기록한다
  R.enterPlace = function (id) {
    const st = S();
    if (id) st.place = id;
    const info = G.app && G.app.placeInfo ? G.app.placeInfo(id) : null;
    if (info && info.act) st.act = info.act;
    if (!st.startedAt) st.startedAt = Date.now();
    save();
  };
  R.leavePlace = function () { save(); };

  // ═════════ 이 게임의 규칙(T3) ═════════
  //  모두 평범한 상태 객체 st에 대한 함수다(브라우저·저장 없이 돈다). 화면은 이 함수를 부른 뒤 G.save.write()로 저장한다.
  //  자료(WALLS·CARDS·FINALE·FLOW·PLACES)는 부를 때 전역에서 읽는다(이 파일이 자료보다 먼저 실린다).
  //
  //  확정 기록 원칙(plan 1-3, spec 14절): 반응을 본 시도(수단·제안의 답·빈칸 카드·만복사 고르기)와 3막 할 일·마음 둔 곳·쓴 글은
  //   저장 칸(G.save.COMMITTED)에 곧바로 적고, 한 번만 장부(applied)·applyStep을 거치지 않는다.
  //   applied는 새로고침 되돌리기(snapKeys)에 들어 있어 단계 도중 새로고침하면 지워지므로, 시도를 장부로 막으면
  //   '장부는 지워지고 시도는 남아' 두 번 들어갈 수 있다. 그래서 시도마다 번호(n)를 두고 같은 번호는 다시 적지 않는다.
  //   그 밖의 칸은 '한 번 정해지면 그대로'(first·final·mind·mbs·tasks·hon) 꼴이라 몇 번 불러도 같다.
  //   단계 효과(R.stepRules.wall·propose)는 기록을 읽기만 하므로 되돌린 뒤 다시 적용해도 기록이 늘지 않는다.
  const D = () => ({
    walls: root.WALLS || {}, cards: root.CARDS || {}, finale: root.FINALE || {},
    flow: root.FLOW || {}, places: root.PLACES || {},
  });
  const ACTS = ['act1', 'act2', 'act3'];
  R.ACTS = ACTS;
  R.MEANS = ['mal', 'si', 'gyeoldan', 'hon'];
  R.TASKS = ['treasure', 'bones', 'poems', 'burial'];
  R.MINDS = ['treasure', 'rites', 'poems'];
  R.LINES = ['repeat', 'jeongi', 'mbsSame'];
  const SCENES0 = ['reunion', 'rites', 'okru', 'farewell'];
  const NAMES0 = { mal: '말', si: '시', gyeoldan: '결단', hon: '혼' }; // 대체 이름(TEXTS.MEANS가 있으면 그것)
  const isObj = (o) => !!o && typeof o === 'object' && !Array.isArray(o);
  const uniq = (a) => a.filter((x, i) => a.indexOf(x) === i);

  // 담 앞 순간 자료
  R.wallOf = (moment) => D().walls[moment] || null;
  R.momentsOf = (act) => Object.keys(D().walls).filter((m) => D().walls[m].act === act);
  const answerMoment = () => Object.keys(D().walls).find((m) => D().walls[m].kind === 'answer') || 'w3-propose';
  R.meansName = (id) => (((root.TEXTS || {}).MEANS || {})[id]) || NAMES0[id] || id;

  // 한 순간의 기록을 [{ n, m }] 꼴로(답 고르기 순간은 st.propose의 차례가 곧 시도 번호)
  function recOf(st, moment) {
    const w = R.wallOf(moment);
    if (w && w.kind === 'answer') return (Array.isArray(st.propose) ? st.propose : []).map((m, i) => ({ n: i + 1, m }));
    const r = st.walls && st.walls[moment];
    return Array.isArray(r) ? r : [];
  }
  const okOf = (w) => (w && w.ok) || [];
  // 다음 시도 번호(화면은 고르기 단추를 그릴 때 이 번호를 받아 두었다가 useMeansOn/answerOn에 넘긴다 — 두 번 눌러도 한 번)
  R.nextAttempt = function (st, moment) {
    return recOf(st, moment).reduce((mx, e) => Math.max(mx, e.n || 0), 0) + 1;
  };
  R.wallPassed = (st, moment) => { const ok = okOf(R.wallOf(moment)); return recOf(st, moment).some((e) => ok.includes(e.m)); };

  // 반응 세 겹 고르기(기록에서 다시 구한다): 그 순간에서 같은 수단을 전에 썼으면 again, 아니면 first.
  //  그 순간의 실패가(이번 것까지) 두 번 이상이면 hint를 더한다. 통과한 수단은 first 하나.
  function derive(st, moment, idx) {
    const w = R.wallOf(moment);
    const rec = recOf(st, moment);
    const e = rec[idx];
    const ok = okOf(w);
    const pass = ok.includes(e.m);
    let layers;
    if (pass) layers = ['first'];
    else {
      const before = rec.slice(0, idx);
      layers = [before.some((x) => x.m === e.m) ? 'again' : 'first'];
      const fails = rec.slice(0, idx + 1).filter((x) => !ok.includes(x.m)).length;
      if (fails >= 2) layers.push('hint');
    }
    const r = ((w && w.react) || {})[e.m] || {};
    return {
      moment, n: e.n, means: e.m, pass, layers,
      react: layers.map((k) => r[k] || (k === 'again' ? r.first : null)).filter(Boolean),
      height: R.wallHeight(st, w ? w.act : null),
    };
  }
  // 시도 n의 반응(새로고침 뒤 같은 반응을 다시 보일 때). 없으면 null
  R.reactionFor = function (st, moment, n) {
    const rec = recOf(st, moment);
    const i = n == null ? rec.length - 1 : rec.findIndex((e) => e.n === n);
    return i < 0 ? null : derive(st, moment, i);
  };

  // 담 높이: 그 막의 순간들에서 ok에 없는 수단을 쓴 수(+ 3막은 '남겠다' 답의 수). 저장하지 않고 기록에서 다시 센다(막마다 처음부터)
  R.wallHeight = function (st, act) {
    let h = 0;
    for (const m of R.momentsOf(act)) { const ok = okOf(R.wallOf(m)); h += recOf(st, m).filter((e) => !ok.includes(e.m)).length; }
    return h;
  };

  // 수단 칸: [{ id, name, locked, used, uses }]. 혼은 열리기 전 이름 없는 잠긴 칸(name:null)으로 맨 끝에 보인다
  R.meansFor = function (st, moment) {
    const w = R.wallOf(moment);
    if (!w || w.kind === 'answer') return [];
    const rec = recOf(st, moment);
    const shut = st.hon !== 'open';
    const slot = (id) => {
      const locked = id === 'hon' && shut;
      const uses = rec.filter((e) => e.m === id).length;
      return { id, name: locked ? null : R.meansName(id), locked, used: uses > 0, uses };
    };
    const list = (w.means || []).map(slot);
    if (shut && !(w.means || []).includes('hon')) list.push(slot('hon'));
    return list;
  };

  // 수단 쓰기: R.useMeansOn(st, 순간, 수단, n?) → { moment, n, means, pass, layers, react:[글 덩이], height, recorded }
  //  - 맞지 않는 수단: pass:false, 반응 글. 진행은 막지 않는다(다시 고른다). 담 높이만 오른다.
  //  - n(시도 번호)을 주면 그 번호가 이미 있을 때 다시 적지 않고 그때의 결과를 돌려준다(recorded:false).
  //  - 이미 통과한 순간에는 더 적지 않는다(recorded:false, again:true). 경계(ok가 빈 순간)는 늘 통과하지 못한다.
  //  - 오류: { error:'moment'|'means'|'locked' } (기록하지 않음)
  R.useMeansOn = function (st, moment, means, n) {
    const w = R.wallOf(moment);
    if (!w || w.kind === 'answer') return { error: 'moment' };
    if (!(w.means || []).includes(means)) return { error: 'means' };
    if (means === 'hon' && st.hon !== 'open') return { error: 'locked' };
    if (!isObj(st.walls)) st.walls = {};
    if (!Array.isArray(st.walls[moment])) st.walls[moment] = [];
    const rec = st.walls[moment];
    if (n != null) { const i = rec.findIndex((e) => e.n === n); if (i >= 0) return Object.assign(derive(st, moment, i), { recorded: false }); }
    if (moment === 'w3-border' || !okOf(w).length) st.border = true;
    if (R.wallPassed(st, moment)) {
      const i = rec.findIndex((e) => okOf(w).includes(e.m));
      return Object.assign(derive(st, moment, i), { recorded: false, again: true });
    }
    const next = R.nextAttempt(st, moment);
    rec.push({ n: n != null && n > next ? n : next, m: means });
    return Object.assign(derive(st, moment, rec.length - 1), { recorded: true });
  };
  // 경계 앞 순간을 겪음(경계 구역에 들어서면 화면이 부른다). 수단을 쓰지 않고 돌아서도 겪은 것이다
  R.borderOn = function (st) { const again = st.border === true; st.border = true; return { border: true, again }; };
  // 통과가 없는 순간(경계)은 '돌아서기'로 떠날 수 있다
  R.canLeave = (moment) => { const w = R.wallOf(moment); return !!w && w.kind !== 'answer' && !okOf(w).length; };

  // ───────── 이생의 제안(답 고르기) ─────────
  //  고르기는 answers뿐이고 'together'(함께 가자)는 어떤 경우에도 넣지 않는다(이생의 대사·최 씨의 원작 답으로만 나온다).
  R.proposeChoices = function () {
    const w = R.wallOf(answerMoment()) || {};
    return (w.answers || []).filter((a) => a !== 'together');
  };
  // R.answerOn(st, 답, n?) → useMeansOn과 같은 꼴. stay는 반응 뒤 다시 고르고, 답한 차례는 st.propose(첫 답 = propose[0])
  R.answerOn = function (st, ans, n) {
    const moment = answerMoment();
    if (!R.proposeChoices().includes(ans)) return { error: 'answer' };
    if (!Array.isArray(st.propose)) st.propose = [];
    if (n != null && n >= 1 && n <= st.propose.length) return Object.assign(derive(st, moment, n - 1), { recorded: false });
    if (R.wallPassed(st, moment)) {
      const ok = okOf(R.wallOf(moment));
      return Object.assign(derive(st, moment, st.propose.findIndex((a) => ok.includes(a))), { recorded: false, again: true });
    }
    st.propose.push(ans);
    return Object.assign(derive(st, moment, st.propose.length - 1), { recorded: true });
  };

  // ───────── 혼(환체) ─────────
  //  잠김('locked') → 도적 앞(w2-bandit)을 꾸짖음으로 지난 뒤, hon 단계에서 학생이 걷기 시작하면 열림('open').
  //  2막을 건너뛰었으면(바로가기) 열 수 있다. R.honOpenOn(st, { walking:true }) → { open } | { error:'bandit'|'walk' }
  R.honOpenOn = function (st, o) {
    if (st.hon === 'open') return { open: true, again: true };
    const skipped2 = Array.isArray(st.skipped) && st.skipped.includes('act2');
    if (!R.wallPassed(st, 'w2-bandit') && !skipped2) return { error: 'bandit' };
    if (!(o && o.walking)) return { error: 'walk' };
    st.hon = 'open';
    return { open: true };
  };

  // ───────── 낱말 카드와 빈칸 ─────────
  // 낱말 카드 얻기(사건을 지나면 저절로, fx:{ word }) — 한 번만
  R.wordOn = function (st, word) {
    if (!Array.isArray(st.words)) st.words = [];
    if (st.words.includes(word)) return { again: true, word };
    st.words.push(word);
    return { word };
  };
  // 그 막 빈칸에서 고를 수 있는 카드(그 막까지 얻는 카드 모두 — 2막 빈칸은 1막 카드까지)
  R.cardsFor = function (act) {
    const C = D().cards, out = [];
    for (const a of ACTS) {
      const c = C[a] || {};
      out.push(...(c.give || []), ...(c.decoy || []));
      if (a === act) break;
    }
    return uniq(out);
  };
  // R.blankOn(st, 빈칸, 카드) → 맞으면 { ok:true, final, first }, 아니면 { ok:false, reply:글 덩이, first }
  //  처음 넣은 카드는 first에 한 번만 남는다. 채운 뒤에는 바뀌지 않는다({ again:true }).
  R.blankOn = function (st, key, card) {
    const C = D().cards;
    const ans = (C.answer || {})[key];
    if (ans == null) return { error: 'blank' };
    if (!isObj(st.blanks)) st.blanks = {};
    const b = isObj(st.blanks[key]) ? st.blanks[key] : (st.blanks[key] = { first: null, final: null });
    if (b.final) return { ok: true, again: true, final: b.final, first: b.first };
    if (b.first == null) b.first = card;
    if (card === ans) { b.final = card; return { ok: true, final: card, first: b.first }; }
    const rep = (C.replies || {})[key] || {};
    return { ok: false, reply: rep[card] || rep.default || null, first: b.first };
  };
  R.blanksDone = function (st, act) {
    const keys = ((D().cards[act] || {}).blanks) || [];
    return keys.every((k) => st.blanks && st.blanks[k] && st.blanks[k].final);
  };

  // ───────── 3막 할 일 ─────────
  const needOf = (id) => {
    const t = (((D().places.act3 || {}).tasks) || {})[id];
    if (t && Array.isArray(t.need)) return t.need;
    return id === 'burial' ? ['treasure', 'bones'] : [];
  };
  const done = (st, id) => !!(st.tasks && st.tasks[id]);
  // 열렸나: 장사(burial)는 재물(treasure)·유골(bones)을 마친 뒤에만
  R.taskOpen = (st, id) => R.TASKS.includes(id) && needOf(id).every((n) => done(st, n));
  // R.taskOn(st, 할 일) → { done } | { again } | { error:'task'|'locked', need }
  R.taskOn = function (st, id) {
    if (!R.TASKS.includes(id)) return { error: 'task' };
    if (done(st, id)) return { done: true, again: true };
    if (!R.taskOpen(st, id)) return { error: 'locked', need: needOf(id).filter((n) => !done(st, n)) };
    if (!isObj(st.tasks)) st.tasks = {};
    st.tasks[id] = true;
    return { done: true };
  };
  R.tasksDone = (st) => R.TASKS.every((id) => done(st, id));
  // 3막을 마치는 조건: 할 일 넷 + 경계 앞 순간을 한 번 이상 겪음
  R.act3Done = (st) => R.tasksDone(st) && st.border === true;
  // 지금 할 일: { tasks:[열린 남은 할 일], locked:[잠긴 남은 할 일], border:넷을 마쳤고 경계가 남음, done }
  R.act3Goal = function (st) {
    const left = R.TASKS.filter((id) => !done(st, id));
    return {
      tasks: left.filter((id) => R.taskOpen(st, id)),
      locked: left.filter((id) => !R.taskOpen(st, id)),
      border: !left.length && st.border !== true,
      done: R.act3Done(st),
    };
  };
  // 마음 둔 곳: 3막 할 일을 마친 뒤(넷 + 경계) 한 번만 고른다. 채점하지 않는다
  R.mindOn = function (st, key) {
    if (!R.MINDS.includes(key)) return { error: 'mind' };
    if (!R.act3Done(st)) return { error: 'tasks' };
    if (st.mind) return { mind: st.mind, again: true };
    st.mind = key;
    return { mind: key };
  };

  // ───────── 쓰기 셋·근거 장면·만복사 ─────────
  const sceneIds = () => { const s = D().finale.scenes; return Array.isArray(s) && s.length ? s.map((x) => x.id) : SCENES0; };
  // 전기적 요소의 근거 장면(한 줄을 쓰기 전에 고른다. 한 줄을 쓴 뒤에는 바뀌지 않는다)
  R.jeongiSceneOn = function (st, id) {
    if (!sceneIds().includes(id)) return { error: 'scene' };
    if (st.lines && st.lines.jeongi && st.jeongiScene) return { scene: st.jeongiScene, again: true };
    st.jeongiScene = id;
    return { scene: id };
  };
  // 쓰기 칸이 열렸나(전기적 요소는 근거 장면을 고른 뒤에만)
  R.canWrite = (st, key) => R.LINES.includes(key) && (key !== 'jeongi' || !!st.jeongiScene);
  // R.lineOn(st, 'repeat'|'jeongi'|'mbsSame', 글) → { line } | { error:'line'|'scene'|'empty' } — 빈칸이면 넘어갈 수 없다
  R.lineOn = function (st, key, text) {
    if (!R.LINES.includes(key)) return { error: 'line' };
    if (!R.canWrite(st, key)) return { error: 'scene' };
    const t = String(text == null ? '' : text).trim();
    if (!t) return { error: 'empty' };
    if (!isObj(st.lines)) st.lines = {};
    st.lines[key] = t;
    return { line: t };
  };
  R.lineDone = (st, key) => !!(st.lines && String(st.lines[key] || '').trim());
  // 「만복사저포기」 두 고르기: 사실을 보이기 전에 한 번만 기록한다. → { choice, fact, quote } (맞고 틀림은 돌려주지 않는다)
  R.mbsOn = function (st, q, opt) {
    const picks = ((D().finale.mbs || {}).picks) || [];
    const p = picks.find((x) => x.id === q);
    if (!p) return { error: 'pick' };
    if (!(p.options || []).some((o) => o.id === opt)) return { error: 'option' };
    if (!isObj(st.mbs)) st.mbs = {};
    const res = (choice, again) => Object.assign({ q, choice, fact: p.fact || null, quote: p.quote || null }, again ? { again: true } : {});
    if (st.mbs[q]) return res(st.mbs[q], true);
    st.mbs[q] = opt;
    return res(opt, false);
  };

  // ───────── 바로가기·이어 하기 ─────────
  const order = () => (Array.isArray(D().flow.order) ? D().flow.order : []);
  const actOf = (p) => ((D().places[p] || {}).act) || (((D().flow.places || {})[p] || {}).act) || null;
  const keyPlace = (k) => { const m = /^[psb]:([^:]+)/.exec(k); return m ? m[1] : null; };
  const defaults = () => (G.save && G.save.fresh ? G.save.fresh() : {
    walls: {}, propose: [], blanks: {}, tasks: {}, border: false, hon: 'locked', mind: null,
    lines: { repeat: '', jeongi: '', mbsSame: '' }, jeongiScene: null, mbs: { q1: null, q2: null }, skipped: [], words: [],
  });
  // 저장 기록에 진행이 있나(있으면 바로가기에서 '이어 하기 / 이 막부터'를 묻는다)
  R.hasProgress = (st) => Object.keys(st.done || {}).length > 0 || !!st.place || !!st.startedAt;
  // R.shortcutOn(st, 1|2|3, { now? }) → { act, place, skipped } — 새 기록에도, 저장 기록의 '이 막부터'에도 쓴다('이어 하기'는 부르지 않는다)
  //  - 앞 막의 기록은 남기고, 그 막과 뒤 막(3막 뒤 마무리 포함)의 기록·장부(done·applied·snap)를 지운다.
  //  - 앞 막 가운데 빈칸을 다 채우지 않은 막(안 했거나 하다 만 막)은 skipped에 넣고 빈칸을 원작 낱말로 채운다.
  //  - 앞 거점들은 끝낸 것으로 장부에 남긴다(이어 하기가 앞으로 돌아가지 않게). 혼: 3막부터면 열림, 아니면 잠김.
  R.shortcutOn = function (st, n, o = {}) {
    n = Number(n);
    if (!(n >= 1 && n <= 3) || Math.floor(n) !== n) return { error: 'act' };
    const act = 'act' + n;
    const later = ACTS.slice(n - 1), earlier = ACTS.slice(0, n - 1);
    const ord = order();
    const first = ord.findIndex((p) => actOf(p) === act);
    if (first < 0) return { error: 'place' };
    const after = ord.slice(first), before = ord.slice(0, first);
    const D0 = defaults(), C = D().cards;
    // 장부: 그 막부터의 거점 열쇠를 지우고, 앞 거점은 끝낸 것으로
    for (const led of ['done', 'applied', 'snap']) {
      if (!isObj(st[led])) st[led] = {};
      for (const k of Object.keys(st[led])) if (after.includes(keyPlace(k))) delete st[led][k];
    }
    for (const p of before) st.done['p:' + p] = true;
    // 기록: 그 막과 뒤 막
    if (!isObj(st.walls)) st.walls = {};
    for (const m of Object.keys(D().walls)) if (later.includes(D().walls[m].act)) delete st.walls[m];
    if (!isObj(st.blanks)) st.blanks = {};
    for (const a of later) for (const k of ((C[a] || {}).blanks || [])) delete st.blanks[k];
    if (Array.isArray(st.words)) {
      const keep = earlier.length ? R.cardsFor(earlier[earlier.length - 1]) : [];
      st.words = st.words.filter((w) => keep.includes(w));
    }
    for (const k of ['propose', 'tasks', 'border', 'mind', 'lines', 'jeongiScene', 'mbs']) st[k] = clone(D0[k]);
    st.hon = n === 3 ? 'open' : 'locked';
    // 건너뛴 앞 막: 빈칸을 원작 낱말로(하다 만 막의 첫 시도는 남긴다)
    const sk = (Array.isArray(st.skipped) ? st.skipped : []).filter((a) => earlier.includes(a));
    for (const a of earlier) {
      if (!sk.includes(a)) { if (R.blanksDone(st, a)) continue; sk.push(a); }
      for (const k of ((C[a] || {}).blanks || [])) {
        const b = isObj(st.blanks[k]) ? st.blanks[k] : {};
        const ans = (C.answer || {})[k];
        if (!b.final) st.blanks[k] = { first: b.first != null ? b.first : ans, final: ans };
      }
    }
    st.skipped = ACTS.filter((a) => sk.includes(a));
    st.place = ord[first];
    st.act = act;
    st.finishedAt = 0;
    if (!st.startedAt) st.startedAt = o.now || Date.now();
    return { act, place: st.place, skipped: st.skipped.slice() };
  };
  // 3막 할 일 목표가 시작할 지도(순수): 남은 할 일이 한 구역에만 있으면 그 구역의 시작 지점,
  //  넷을 마치고 경계만 남았으면 경계 가까이(border.map·border.spawn — 짧은 길), 여러 구역에 나뉘었거나 다 마쳤으면 거점 지도(최 씨 집).
  //  거점 자료의 순서 없는 할 일 목표(b-tasks)가 map·spawn으로 이것을 읽는다(엔진 world.play가 이어 하기 지도를 정할 때). → { map, spawn }
  R.act3Map = function (st) {
    const P = D().places.act3 || {};
    const maps = P.maps || {};
    const at = (m, sp) => ({ map: m || null, spawn: sp || (m && maps[m] && maps[m].spawn) || (m === P.map ? P.spawn : null) || null });
    const g = R.act3Goal(st);
    // 기록(st.tasks)은 확정됐지만 엔진의 할 일 장부에는 아직 안 끝난 할 일(장사는 t-burial에서 먼저 확정되고 t-after가 남는다):
    //  그 단계 도중 닫았다면 엔진은 그 할 일을 다시 펼치므로 그 할 일의 구역에서 이어 한다.
    const beat = ((P.beats || []).find((b) => b && b.tasks) || {}).id || 'b-tasks';
    const open = Object.keys(P.tasks || {}).filter((id) => (st.tasks || {})[id] && !(st.done || {})['b:act3:' + beat + '.' + id] && !(st.done || {})['b:act3:' + beat]);
    const pending = uniq([...g.tasks, ...open]);
    if (g.done && !open.length) return at(P.map);
    if (g.border && !open.length) { const b = P.border || {}; return b.map && maps[b.map] ? at(b.map, b.spawn) : at(P.map); }
    const ms = uniq(pending.map((id) => (((P.tasks || {})[id]) || {}).map).filter((m) => m && maps[m]));
    return ms.length === 1 ? at(ms[0]) : at(P.map);
  };
  // 이어 하기 지점(순수): 끝내지 않은 거점(지금 거점이 먼저)의 끝내지 않은 첫 목표, 그 목표 앞까지 옮겨 온 지도와 그 시작 지점.
  //  걷던 자리는 남기지 않는다(엔진 world.play가 같은 셈으로 그 지도의 시작 지점에 세운다). 목표의 when 조건은 보지 않는다.
  //  3막의 순서 없는 할 일 목표(tasks가 있는 목표)는 R.act3Map(st)이 정한다(다음 할 일이 한 구역에만 있으면 그 구역).
  //  → { place, act, beat, map, spawn } | { done:true }
  R.resumePoint = function (st) {
    const ord = order(), dn = st.done || {};
    const place = st.place && ord.includes(st.place) && !dn['p:' + st.place] ? st.place : ord.find((p) => !dn['p:' + p]);
    if (!place) return { done: true };
    const P = D().places[place] || {};
    const beats = P.beats || [];
    let start = beats.findIndex((b) => !dn['b:' + place + ':' + b.id]);
    if (start < 0) start = beats.length;
    let map = P.map || null, spawn = P.spawn || null;
    for (let i = 0; i <= Math.min(start, beats.length - 1); i++) {
      const b = beats[i];
      if (!b) continue;
      // 3막 할 일 목표의 map은 지금 기록(G.save.state)을 읽는 값이라, 여기서는 넘겨받은 st로 다시 구한다
      const bm = actOf(place) === 'act3' && Array.isArray(b.tasks) ? R.act3Map(st) : { map: b.map, spawn: b.spawn };
      if (bm.map && bm.map !== map) { map = bm.map; spawn = bm.spawn || null; }
    }
    if (!spawn && map && P.maps && P.maps[map]) spawn = P.maps[map].spawn || null;
    return { place, act: actOf(place), beat: beats[start] ? beats[start].id : null, map, spawn };
  };

  // ───────── 저장 기록의 모양 ─────────
  //  깨진 기록(모양이 맞지 않는 칸)이면 false → G.save.load가 처음부터 시작한다.
  R.validSave = function (o) {
    if (!isObj(o)) return false;
    const str = (v) => typeof v === 'string';
    const strOrNull = (v) => v == null || str(v);
    const objOf = (v, f) => isObj(v) && Object.keys(v).every((k) => f(v[k]));
    const has = (k) => k in o && o[k] !== undefined;
    for (const k of ['done', 'applied', 'flags', 'snap']) if (has(k) && !isObj(o[k])) return false;
    if (has('place') && !strOrNull(o.place)) return false;
    if (has('act') && !(o.act == null || ACTS.includes(o.act))) return false;
    if (has('walls') && !objOf(o.walls, (r) => Array.isArray(r) && r.every((e) => isObj(e) && Number.isInteger(e.n) && e.n > 0 && str(e.m)))) return false;
    if (has('propose') && !(Array.isArray(o.propose) && o.propose.every(str))) return false;
    if (has('blanks') && !objOf(o.blanks, (b) => isObj(b) && strOrNull(b.first) && strOrNull(b.final))) return false;
    if (has('tasks') && !objOf(o.tasks, (v) => typeof v === 'boolean')) return false;
    if (has('border') && typeof o.border !== 'boolean') return false;
    if (has('hon') && !['locked', 'open'].includes(o.hon)) return false;
    if (has('mind') && !strOrNull(o.mind)) return false;
    if (has('lines') && !objOf(o.lines, str)) return false;
    if (has('jeongiScene') && !strOrNull(o.jeongiScene)) return false;
    if (has('mbs') && !objOf(o.mbs, strOrNull)) return false;
    for (const k of ['skipped', 'words']) if (has(k) && !(Array.isArray(o[k]) && o[k].every(str))) return false;
    return true;
  };

  // ───────── 엔진에 잇기 ─────────
  //  단계 효과(applyStep)는 기록을 읽기만 한다(확정 기록을 늘리지 않음 — 되돌린 뒤 다시 적용해도 같다).
  R.stepRules.wall = (st, step) => {
    const m = step.wall || step.id;
    const ok = okOf(R.wallOf(m));
    const e = recOf(st, m).find((x) => ok.includes(x.m));
    return e ? { choice: e.m } : {};
  };
  R.stepRules.propose = (st, step) => R.stepRules.wall(st, { wall: step.wall || answerMoment() });
  if (G.save) {
    if (G.save.extend) G.save.extend({ words: [] });            // 얻은 낱말 카드
    if (Array.isArray(G.save.COMMITTED) && !G.save.COMMITTED.includes('words')) G.save.COMMITTED.push('words');
    G.save.valid = R.validSave;                                   // 깨진 기록이면 처음부터(save.js load)
  }
  if (G.steps && G.steps.effects) {
    G.steps.effects.word = (v, ctx, st) => {
      for (const w of [].concat(v)) { const r = R.wordOn(st, w); if (!r.again && G.hud && G.hud.got) G.hud.got('word', w); }
    };
  }

  // ───────── 엔진에 걸기 ─────────
  //  main.js가 부른다(app.js가 실린 뒤). app.play·app.next를 감쌀 때는 원래 함수를 반드시 부른다.
  R.attach = function () {
    const app = G.app;
    if (!app || app.__rules) return;
    app.__rules = true;
    const play0 = app.play, next0 = app.next;
    app.play = function (id) { R.enterPlace(id); return play0.apply(this, arguments); };
    app.next = function (id) { R.leavePlace(id); return next0.apply(this, arguments); };
  };

  // ───────── 시험용 손잡이 ─────────
  //  G.rules.test.set({ 저장 칸: 값, … }) · G.rules.test.state()
  R.test = {
    set(o = {}) {
      const st = S();
      for (const k in o) st[k] = clone(o[k]);
      save();
      if (hasDOM() && G.hud) G.hud.refresh();
      return st;
    },
    state: () => clone(S()),
  };
})(typeof window !== 'undefined' ? window : globalThis);
