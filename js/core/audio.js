'use strict';
// 소리: 배경음만 튼다(spec 13절 — 효과음·누름 소리·합성 음악·낭송 없음).
//  곡 목록은 js/data/bgm.js의 BGM.tracks.이름 = { src:'assets/bgm/….mp3', gain }. 장면 자료의 music: '이름'이 그 곡을 고른다.
//  목록에 없거나 파일을 못 읽으면 조용히 소리 없이 간다(오류를 내지 않는다). 소리를 꺼도 끝까지 갈 수 있다.
//  audio 요소 두 개를 번갈아 써서 곡을 바꿀 때 겹쳐 흐르게 한다. 브라우저가 손대기 전 재생을 막으면 다음 손댐(unlock)에 다시 튼다.
(function () {
  const VOL = 0.5;
  const A = (G.audio = { track: null });
  const S = () => G.save.state;
  const decks = [];
  const failed = {};
  let cur = null; // { name, d }
  const fileOf = (name) => (window.BGM && window.BGM.tracks && name && window.BGM.tracks[name]) || null;

  function makeDecks() {
    if (decks.length || typeof Audio === 'undefined') return;
    for (let i = 0; i < 2; i++) {
      const el = new Audio();
      el.loop = true; el.preload = 'auto'; el.volume = 0;
      decks.push({ el, busy: false, fade: null });
    }
  }
  // 음량을 to로 secs초 동안 옮긴다(움직임 줄이기와 상관없이 소리는 부드럽게)
  function fade(d, to, secs, done) {
    clearInterval(d.fade);
    const from = d.el.volume, goal = Math.max(0, Math.min(1, to)), t0 = Date.now();
    const tick = () => {
      const k = secs > 0 ? Math.min(1, (Date.now() - t0) / (secs * 1000)) : 1;
      try { d.el.volume = from + (goal - from) * k; } catch (e) { /* 음량을 못 바꾸는 기기 */ }
      if (k >= 1) { clearInterval(d.fade); d.fade = null; if (done) done(); }
    };
    d.fade = setInterval(tick, 50);
    tick();
  }
  function start(name) {
    makeDecks();
    const t = fileOf(name);
    const d = decks.find((x) => !x.busy) || decks[0];
    if (!d || !t) return;
    const me = { name, d };
    cur = me;
    d.busy = true;
    d.el.onerror = () => { if (cur !== me) return; failed[name] = true; stop(true); };
    d.el.src = t.src;
    d.el.volume = 0;
    fade(d, VOL * (t.gain || 1), 1.2);
    const pr = d.el.play();
    if (pr && pr.catch) pr.catch(() => { /* 손대기 전이면 다음 손댐 때 다시(unlock) */ });
  }
  function stop(fast) {
    if (!cur) return;
    const d = cur.d;
    cur = null;
    d.el.onerror = null;
    fade(d, 0, fast ? 0.6 : 1.4, () => {
      if (cur && cur.d === d) return;
      try { d.el.pause(); d.el.removeAttribute('src'); d.el.load(); } catch (e) { /* 무시 */ }
      d.busy = false;
    });
  }
  // 지금 들려야 할 곡을 맞춘다
  function sync() {
    const want = S().music && A.track && fileOf(A.track) && !failed[A.track] ? A.track : null;
    if (!want) { if (cur) stop(false); return; }
    if (!cur || cur.name !== want) { if (cur) stop(true); start(want); }
  }

  // 첫 손댐(누름·키)마다 부른다: 막혔던 재생을 다시 시도
  A.unlock = function () {
    if (cur && cur.d.el.paused && !document.hidden) { const pr = cur.d.el.play(); if (pr && pr.catch) pr.catch(() => {}); }
    sync();
  };
  // 장면의 곡 정하기(같은 곡이면 그대로 이어서). 이름이 없으면 멈춘다
  A.play = function (name) { A.track = name || null; sync(); };
  // 배경음 켜기/끄기(설정)
  A.music = function () { sync(); };
  // 점검용: 지금 흐르는 곡
  A.now = () => (cur ? { name: cur.name, src: cur.d.el.currentSrc, paused: cur.d.el.paused } : null);
})();
