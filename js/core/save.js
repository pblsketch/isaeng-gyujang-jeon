'use strict';
// 진행 저장: 이 브라우저(localStorage)에만 저장하고 서버로 보내지 않는다(spec 14절).
//  열쇠는 모두 머리말 'isaeng-gyujang:'로 시작한다.
//   - 'isaeng-gyujang:progress' 진행·기록·이름(처음부터 하면 지운다)
//   - 'isaeng-gyujang:settings' 설정(글자 크기·배경음·움직임 줄이기 — 처음부터 해도 남는다)
//  저장 기록이 깨져 읽을 수 없으면 조용히 처음부터 시작한다.
//  게임 규칙에 쓰는 새 칸은 다른 파일에서 G.save.extend({ 이름: 처음 값 })으로 더한다.
(function () {
  const PREFIX = 'isaeng-gyujang:';
  const KEY = PREFIX + 'progress';
  const SKEY = PREFIX + 'settings';
  const extra = {}; // extend()로 더한 처음 값들
  // 설정(처음부터에도 남는 칸)
  const SETTINGS = ['font', 'music', 'motion'];
  const base = () => ({
    v: 1,
    // 설정
    font: 1,                // 글자 크기 배율(보통 1 · 크게 1.15 · 아주 크게 1.3)
    music: true,            // 배경음
    motion: 'full',         // 움직임: 'full' | 'less'(움직임 줄이기)
    // 학생
    name: '',               // 결과 화면에 적는 이름(반·번호 포함, 선택)
    // 진행(엔진 장부)
    place: null,            // 지금(마지막으로) 있던 거점 id
    done: {},               // 끝낸 것: 'p:거점' · 'b:거점:목표' · 'b:거점:목표.할 일' · 's:거점:단계'
    applied: {},            // 한 번만 반영 장부(js/game/rules.js)
    flags: {},              // 고른 것들(자유롭게 쓰는 칸, 장면 진행)
    snap: {},               // 단계 하다 말고 껐을 때 되돌릴 값
    startedAt: 0,
    finishedAt: 0,
    // 이 게임의 기록 칸(plan 1-3 — 규칙은 js/game/rules.js, 화면은 각 작업). 모두 '확정 기록'이라 되돌리지 않는다
    act: null,              // 지금 막: 'act1' | 'act2' | 'act3'
    walls: {},              // { 'w1-poem': [{ n:1, m:'mal' }, …] } 담 앞 순간마다 써 본 수단(시도 번호 n)
    propose: [],            // 이생의 제안에 답한 차례
    blanks: {},             // { 'b1-wall': { final, first } }
    tasks: {},              // { treasure:true, … } 3막 할 일
    border: false,          // 3막 경계를 겪었는가
    hon: 'locked',          // 'locked' | 'open'
    mind: null,             // 마음 둔 곳: 'treasure' | 'rites' | 'poems'
    lines: { repeat: '', jeongi: '', mbsSame: '' }, // 쓴 글
    jeongiScene: null,      // 전기적 요소 한 줄의 근거 장면
    mbs: { q1: null, q2: null }, // 「만복사저포기」 두 고르기(사실 공개 전)
    skipped: [],            // 바로가기로 건너뛴 막
  });
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const fresh = () => Object.assign(base(), clone(extra));
  let S = fresh();
  const ls = () => { try { return window.localStorage; } catch (e) { return null; } };
  G.save = {
    PREFIX, KEY, SKEY,
    get state() { return S; },
    fresh,
    SETTINGS,
    // 확정 기록 칸: 반응을 본 시도는 그 자리에서 확정한다. 단계 도중 새로고침 되돌리기(snapKeys)에 넣지 않는다(plan 1-3)
    COMMITTED: ['walls', 'propose', 'blanks', 'tasks', 'border', 'hon', 'mind', 'lines', 'jeongiScene', 'mbs', 'skipped', 'name'],
    // 단계를 하다 말고 껐을 때 그 단계를 시작할 때의 값으로 되돌릴 칸(장면 진행만). 다른 파일이 더할 수 있다
    snapKeys: ['flags'],
    // 새 칸 더하기: 이미 불러온 저장에 그 칸이 없으면 처음 값을 넣는다
    extend(defaults) {
      Object.assign(extra, clone(defaults));
      for (const k in defaults) if (!(k in S)) S[k] = clone(defaults[k]);
    },
    load() {
      S = fresh();
      const L = ls();
      if (!L) return S;
      try {
        const raw = L.getItem(KEY);
        if (raw) {
          const o = JSON.parse(raw);
          if (o && typeof o === 'object' && !Array.isArray(o)) S = Object.assign(fresh(), o);
        }
      } catch (e) { S = fresh(); /* 깨진 기록: 처음부터 */ }
      try {
        const raw = L.getItem(SKEY);
        const o = raw ? JSON.parse(raw) : null;
        if (o && typeof o === 'object') for (const k of SETTINGS) if (k in o) S[k] = o[k];
      } catch (e) { /* 설정이 깨졌으면 기본값 */ }
      return S;
    },
    write() {
      const L = ls();
      if (!L) return;
      const set = {}, prog = {};
      for (const k in S) (SETTINGS.includes(k) ? set : prog)[k] = S[k];
      try { L.setItem(SKEY, JSON.stringify(set)); } catch (e) { /* 무시 */ }
      // 진행이 하나도 없으면(처음 화면에서 설정만 바꿈) 진행 열쇠를 만들지 않는다
      if (!G.save.started() && !S.name) { try { L.removeItem(KEY); } catch (e) { /* 무시 */ } return; }
      try { L.setItem(KEY, JSON.stringify(prog)); } catch (e) { /* 무시 */ }
    },
    // 처음부터: 진행과 이름은 지우고 설정(글자 크기·배경음·움직임)은 남긴다
    reset() {
      const keep = {};
      for (const k of SETTINGS) keep[k] = S[k];
      S = Object.assign(fresh(), keep);
      const L = ls();
      try { if (L) L.removeItem(KEY); } catch (e) { /* 무시 */ }
      this.write();
      return S;
    },
    started() { return Object.keys(S.done || {}).length > 0 || !!S.place || !!S.startedAt; },
  };
})();
