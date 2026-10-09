'use strict';
// 게임 규칙의 바닥(형제 게임 「최척전」의 rules.js에서 한 번만 반영 장부·새로고침 대비·attach만 남긴 작은 판).
//  이 게임의 규칙(담 앞 순간·담 높이·혼·빈칸·3막 할 일·제안·바로가기·이어 하기)은 T3이 이 파일에 더한다.
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
