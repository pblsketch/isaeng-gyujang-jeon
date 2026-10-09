'use strict';
// 화면 흐름: 타이틀 → 거점 차례대로(js/data/flow.js의 order) → 끝(결과 화면, js/game/result.js).
//  화면 모드 두 가지
//   - 탐색 모드: 맵이 화면 전체를 채우고 구석에 HUD(js/core/hud.js)
//       왼쪽 위 얼굴·지금 있는 곳 · 가운데 위 미션과 지금 할 일 · 오른쪽 위 배경음·전체 화면·설정 · 왼쪽 아래 조이스틱 · 오른쪽 아래 행동 단추
//   - 사건 모드: 전체 삽화 한 폭 + 짧은 글 + 아래쪽 고르기 칸. HUD는 위쪽 얇은 띠로 접힌다
//  세로 화면이면 "가로로 돌려 주세요" 안내만 보이고 게임은 멈춘다(spec 15절).
//  선생님 모드·방식 고르기·수첩·고지도·이어 하기 글자는 이 게임에 없다(spec 14절).
(function () {
  const { h, $$, boldNodes } = G.util;
  const ui = G.ui;
  const app = (G.app = {});
  const S = () => G.save.state;
  const root = () => document.getElementById('app');
  const FL = () => window.FLOW || { order: [], acts: {}, places: {} };
  const TX = () => window.TEXTS || {};

  // 다른 작업이 채우는 화면: 등록되어 있으면 부르고, 없으면 기본 화면 또는 '준비 중'
  //  G.app.hooks.credits() · G.app.hooks.finish()(이야기의 끝 → 마무리 화면들 → 결과 화면)
  app.hooks = { credits: null, finish: null };
  const HOOK_NAME = { credits: '만든 사람·출처', finish: '이야기의 끝' };
  app.openHook = function (name, ...args) {
    const f = app.hooks[name];
    if (typeof f === 'function') return f(...args);
    if (name === 'credits') return creditsSheet();
    return ui.notReady(HOOK_NAME[name] || name);
  };
  // 만든 사람·출처(기본): NOTES.credits(만든이·원문 출처 줄)와 CREDITS.sections(소재 출처, js/data/credits.js)
  function creditsSheet() {
    const N = ((window.NOTES || {}).credits) || {};
    const C = window.CREDITS || {};
    return ui.sheet([h('h3', '만든 사람·출처'),
      N.maker ? h('p', N.maker) : null,
      ...[].concat(N.lines || []).map((l) => h('p.small', boldNodes(l))),
      ...[].concat(C.sections || []).map((sec) => h('div.cr-sec', h('h4', sec.title || ''),
        h('ul', [].concat(sec.items || []).map((it) => h('li', h('b', it.title || ''), it.by ? ' — ' + it.by : '', it.license ? h('small', ' · ' + it.license) : null))))),
    ], undefined, { cls: 'credits-sheet' });
  }

  // 저장 열쇠 이름(엔진 장부)
  app.key = {
    place: (p) => 'p:' + p,
    beat: (p, b) => 'b:' + p + ':' + b,
    task: (p, b, t) => 'b:' + p + ':' + b + '.' + t,
    step: (p, s) => 's:' + p + ':' + s,
  };
  app.isDone = (p, stepId) => !!S().done[stepId ? app.key.step(p, stepId) : app.key.place(p)];

  // 아이콘: 둥근 끝 선으로 그린 손그림 느낌(색은 글자색을 따른다)
  const SV = (body) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">' + body + '</svg>';
  const ICON = {
    gear: SV('<circle cx="12" cy="12" r="3.2"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/><circle cx="12" cy="12" r="6.6"/>'),
    home: SV('<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>'),
    ear: SV('<path d="M4 14v-2a8 8 0 0 1 16 0v2"/><rect x="3" y="14" width="4" height="6" rx="1.5"/><rect x="17" y="14" width="4" height="6" rx="1.5"/>'),
    musicOn: SV('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
    musicOff: SV('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/>'),
    close: SV('<path d="M6 6l12 12M18 6 6 18"/>'),
    fsEnter: SV('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'),
    fsExit: SV('<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/>'),
  };
  app.ICON = ICON;
  const iconBtn = (name, label, fn, cls = '') => h('button.icon-btn' + cls, { type: 'button', 'aria-label': label, title: label, html: ICON[name], on: { click: (e) => { e.currentTarget.blur(); fn(); } } });
  app.iconBtn = iconBtn;

  // ───────── 학생(최 씨)의 지금 모습(도트 id) ─────────
  //  얼굴(G.util.pt의 looks)과 HUD 얼굴이 이것을 따른다. 차례: 지금 단계의 avatar → 맵 위(목표·거점의 avatar, G.world.avatar)
  //  → 지금 거점의 avatar(맵 없는 거점). 거점 자료의 avatar는 'sp_…' 또는 (state) => 'sp_…'(예: 2막 밤의 혼)
  app._stepAvatar = null;
  app.avatar = function () {
    if (app._stepAvatar) return app._stepAvatar;
    const W = G.world;
    if (!W || !W.avatarOf) return null;
    const pid = S().place;
    if (W.placeId ? W.placeId === pid : W.avatarOverride) return W.avatar();
    return W.avatarOf((window.PLACES || {})[pid]);
  };
  G.util.lookNow = (id) => (id === G.util.playerId() ? app.avatar() : null);

  // ───────── 전체 화면(Fullscreen API, 옛 웹킷 이름도) ─────────
  //  누름(사용자 손짓) 안에서만 부른다. 지원하지 않는 브라우저에서는 단추를 만들지 않고, 설정에 홈 화면 안내를 보인다.
  //  휴대폰에서 전체 화면에 들어가면 가로로 고정해 본다(안 되면 그냥 둔다). 글은 js/data/texts.js의 TEXTS.FULLSCREEN
  const fsText = () => TX().FULLSCREEN || {};
  const fs = (app.fs = {
    supported() {
      const d = document, e = d.documentElement;
      return !!((d.fullscreenEnabled || d.webkitFullscreenEnabled) && (e.requestFullscreen || e.webkitRequestFullscreen));
    },
    active() { return !!(document.fullscreenElement || document.webkitFullscreenElement); },
    standalone() { return !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches)); },
    async enter() {
      const e = document.documentElement;
      try {
        const r = e.requestFullscreen ? e.requestFullscreen({ navigationUI: 'hide' }) : e.webkitRequestFullscreen();
        if (r && typeof r.then === 'function') await r;
      } catch (err) { ui.toast(fsText().fail || '전체 화면으로 바꾸지 못했어요'); return false; }
      fs.lockLandscape();
      return true;
    },
    async exit() {
      const d = document;
      try {
        const r = d.exitFullscreen ? d.exitFullscreen() : (d.webkitExitFullscreen ? d.webkitExitFullscreen() : null);
        if (r && typeof r.then === 'function') await r;
      } catch (err) { return false; }
      return true;
    },
    toggle() { return fs.active() ? fs.exit() : fs.enter(); },
    lockLandscape() {
      const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      const o = screen.orientation;
      if (!coarse || !o || typeof o.lock !== 'function') return;
      try { const r = o.lock('landscape'); if (r && typeof r.catch === 'function') r.catch(() => {}); } catch (err) { /* 고정하지 못해도 괜찮다 */ }
    },
    sync() {
      const on = fs.active();
      document.documentElement.classList.toggle('is-fullscreen', on);
      for (const b of $$('.fs-toggle')) paintFs(b, on);
      for (const g of $$('.fs-seg')) for (const b of $$('.btn', g)) {
        const mine = (b.dataset.fs === 'on') === on;
        b.classList.toggle('primary', mine); b.setAttribute('aria-pressed', mine ? 'true' : 'false');
      }
    },
    // 아이콘 단추(타이틀·HUD 오른쪽 위). 지원하지 않으면 null(단추를 두지 않는다)
    button() {
      if (!fs.supported()) return null;
      const b = h('button.icon-btn.fs-toggle', { type: 'button', on: { click: (e) => { e.currentTarget.blur(); G.audio.unlock(); fs.toggle(); } } });
      paintFs(b, fs.active());
      return b;
    },
  });
  function paintFs(b, on) {
    const T = fsText();
    const label = on ? (T.exit || '전체 화면 끝내기') : (T.enter || '전체 화면');
    b.innerHTML = ICON[on ? 'fsExit' : 'fsEnter'];
    b.setAttribute('aria-label', label); b.title = label;
    b.classList.toggle('on', on);
  }
  if (typeof document !== 'undefined') for (const ev of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(ev, () => fs.sync());

  // ───────── 설정 적용·세로 화면 ─────────
  //  글자 크기(--fs: 1 · 1.15 · 1.3)와 움직임 줄이기(html.reduce-motion)는 공용 스타일이라 새 화면에도 똑같이 적용된다
  app.applySettings = function () {
    const st = S();
    document.documentElement.style.setProperty('--fs', st.font || 1);
    document.documentElement.classList.toggle('reduce-motion', st.motion === 'less');
    if (G.hud) G.hud.refresh();
  };
  app.portrait = false;
  app.watchOrientation = function () {
    const mq = window.matchMedia ? window.matchMedia('(orientation: portrait)') : null;
    const upd = () => {
      app.portrait = mq ? mq.matches : window.innerHeight > window.innerWidth;
      document.documentElement.classList.toggle('portrait', app.portrait);
    };
    if (mq) { if (mq.addEventListener) mq.addEventListener('change', upd); else if (mq.addListener) mq.addListener(upd); }
    window.addEventListener('resize', upd);
    upd();
    if (!document.getElementById('rotate')) {
      const R = TX().ROTATE || {};
      document.body.appendChild(h('div#rotate', { role: 'alert' },
        h('div.rot-phone', h('i')),
        h('strong', R.title || '가로로 돌려 주세요'),
        h('p', R.body || '이 게임은 가로 화면에서 해요. 기기를 옆으로 눕혀 주세요.')));
    }
  };

  // ───────── 거점 정보 ─────────
  app.order = () => FL().order.slice();
  // 미션: 거점 자료의 missions: [{ when, text }] 가운데 지금 맞는 첫 문장, 없으면 기본 미션(HUD가 그때그때 다시 읽는다)
  function missionOf(p, base) {
    if (!p.missions || !p.missions.length) return base;
    return () => { for (const m of p.missions) if (G.steps.ok(m.when)) return m.text; return base; };
  }
  // 거점 이름·막·미션을 한데 모은다(거점 파일 값이 먼저, 없으면 flow.js). 막 열쇠: 'act1' | 'act2' | 'act3'
  app.placeInfo = function (id) {
    const base = (FL().places || {})[id] || {};
    const p = (window.PLACES || {})[id] || {};
    const act = p.act || base.act || null;
    const A = (act && (FL().acts || {})[act]) || {};
    return {
      id, name: p.name || base.name || id, act,
      actName: A.name ? A.name + (A.title ? ' 「' + A.title + '」' : '') : '',
      mission: missionOf(p, p.mission != null ? p.mission : (base.mission != null ? base.mission : A.mission || '')),
      year: p.year || base.year || '',
      // 막 미션은 이 게임이 지은 말(flow.js의 mark — '게임 설정')
      missionMark: p.mission != null ? (p.missionMark || null) : base.mission != null ? (base.mark || null) : (A.mark || null),
      ready: !!(window.PLACES || {})[id],
    };
  };

  // ───────── 타이틀 ─────────
  function leavePlay() {
    app._playToken = null;
    closeEvent();
    if (G.world) G.world.busy = 0;
  }
  //  o.act(1|2|3): 바로가기 주소(?act=)로 열었을 때(spec 14절) — 저장 기록이 있으면 '이어 하기 / 이 막부터',
  //   없으면 그 막에서 바로 시작하는 단추 하나. 선생님용 단추(정답 보기·장면 건너뛰기)는 없다.
  app.title = function (o = {}) {
    ui.unpop();
    leavePlay();
    const F = FL();
    const started = G.save.started();
    const n = [1, 2, 3].includes(Number(o.act)) ? Number(o.act) : 0;
    const SC = F.shortcut || {};
    const A = n ? (F.acts || {})['act' + n] || {} : {};
    const actLabel = n ? (A.name || n + '막') + (A.title ? ' 「' + A.title + '」' : '') : '';
    G.audio.play(F.titleMusic || 'title');
    const r = root(); r.innerHTML = '';
    r.className = 'scr-title';
    const btn = (label, cls, fn) => h('button.btn' + (cls ? '.' + cls : ''), { type: 'button', on: { click: () => { G.audio.unlock(); fn(); } } }, label);
    let menu;
    if (n) {
      menu = h('div.menu',
        started ? btn(SC.resume || '이어 하기', 'primary.big', () => app.continue()) : btn(fill(SC.start || '{act}부터 시작', actLabel), 'primary.big', () => app.startAct(n)),
        started ? h('div.menu-row', btn(SC.from || '이 막부터', 'dark', () => app.startAct(n))) : null,
        h('div.menu-row', btn('만든 사람·출처', 'dark.small', () => app.openHook('credits'))));
    } else {
      menu = h('div.menu',
        started ? btn('이어 하기', 'primary.big', () => app.continue()) : btn('시작', 'primary.big', () => app.newGame()),
        started ? h('div.menu-row', btn('처음부터', 'dark', () => app.resetAll())) : null,
        h('div.menu-row', btn('만든 사람·출처', 'dark.small', () => app.openHook('credits'))));
    }
    const hint = n ? fill(started ? (SC.noteSaved || SC.note || '{act} 바로가기') : (SC.note || '{act} 바로가기'), actLabel) : F.hint;
    r.appendChild(h('div.title-screen' + (n ? '.shortcut' : ''), n ? { 'data-act': String(n) } : {},
      h('div.title-art', { 'aria-hidden': 'true' }),
      h('div.title-main',
        h('div.logo', h('div.pre', F.pre || ''), h('h1', F.title || ''), h('div.sub', F.subtitle || ''), F.tagline ? h('div.tagline', F.tagline) : null),
        h('div.title-side', menu)),
      h('div.title-foot',
        hint ? h('div.hint', h('span.ic', { html: ICON.ear }), hint) : h('span'),
        h('div.credits-line', h('div.credit.maker', ((window.NOTES || {}).credits || {}).maker || ''))),
      h('div.title-tools', musicToggle(), fs.button(), iconBtn('gear', '설정', () => app.settings()))));
  };
  const fill = (t, actLabel) => String(t || '').replace('{act}', actLabel);
  function musicToggle() {
    const b = h('button.icon-btn.music-toggle', { type: 'button' });
    const draw = () => { const on = S().music; b.innerHTML = ICON[on ? 'musicOn' : 'musicOff']; b.setAttribute('aria-label', on ? '배경음 끄기' : '배경음 켜기'); b.title = on ? '배경음 끄기' : '배경음 켜기'; b.classList.toggle('off', !on); };
    b.addEventListener('click', () => { const st = S(); st.music = !st.music; G.save.write(); G.audio.unlock(); G.audio.music(st.music); draw(); });
    draw();
    return b;
  }
  app.musicToggle = musicToggle;

  // 시작: 첫 거점부터(방식 고르기 없음)
  app.newGame = function () {
    const st = S();
    if (!st.startedAt) st.startedAt = Date.now();
    G.save.write();
    app.play(app.order()[0]);
  };
  // 이어 하기: 끝내지 않은 첫 거점(그 거점의 다음 할 일부터 — 목표·단계 장부)
  app.continue = function () {
    const st = S();
    const order = app.order();
    const id = st.place && order.includes(st.place) && !st.done[app.key.place(st.place)] ? st.place : order.find((p) => !st.done[app.key.place(p)]);
    if (!id) return app.finish();
    app.play(id);
  };
  // 처음부터: 한 번 확인한 뒤 기록과 이름을 지우고 설정은 남긴다
  app.resetAll = async function () {
    const R = TX().RESET || {};
    const ok = await ui.sheet([h('h3', R.title || '처음부터 다시 할까요?'), h('p', R.body || '지금까지의 기록과 적어 둔 이름이 모두 지워져요. 글자 크기·소리 같은 설정은 그대로예요.')],
      [{ label: R.cancel || '그만두기', value: false }, { label: R.go || '처음부터', value: true, cls: 'seal' }]);
    if (!ok) return false;
    leavePlay();
    G.save.reset();
    app.title();
    ui.toast(R.done || '처음부터 시작할 수 있어요');
    return true;
  };

  // ───────── 바로가기(?act=1|2|3, spec 14절) ─────────
  //  새로 시작이든 '이 막부터'든 G.rules.shortcutOn이 기록을 맞춘다(앞 막 기록은 두고 그 막부터 새로, 빈칸 덜 찬 앞 막은 건너뜀 + 원작 낱말,
  //  3막부터면 혼 열림). 건너뛴 막은 30초 요약 카드(거점 자료의 summary)로 차례로 보인 뒤 그 막의 첫 거점을 연다.
  //  요약 카드는 기록하지 않는다(요약을 보다 닫았다 열면 그 막부터 이어 한다).
  const ACTS = ['act1', 'act2', 'act3'];
  app.summaryPlace = (act) => app.order().find((p) => { const P = (window.PLACES || {})[p]; return P && P.act === act && P.summary; }) || null;
  app.startAct = async function (n) {
    const st = S();
    const r = G.rules && G.rules.shortcutOn ? G.rules.shortcutOn(st, n) : { error: 'rules' };
    if (!r || r.error) return app.title();
    G.save.write();
    const token = (app._playToken = {});
    const acts = (r.skipped || []).filter((a) => ACTS.indexOf(a) >= 0 && ACTS.indexOf(a) < n - 1);
    if (acts.length) {
      const info = app.placeInfo(r.place);
      app.explore(info);
      blankStage(info.name);
      const P = (window.PLACES || {})[r.place];
      if (P && P.music) G.audio.play(P.music);
      for (const a of acts) {
        const pid = app.summaryPlace(a);
        if (!pid) continue;
        const ctx = app.openEvent({});
        await G.steps.run({ id: 'summary-' + a, type: 'summary', place: pid }, ctx);
        ctx.close();
        if (app._playToken !== token) return;
      }
    }
    if (app._playToken !== token) return;
    app.play(r.place);
  };
  // 단계 { type:'summary', place:'거점 id' } — 그 거점의 30초 요약 카드(summary: { title, scene, lines:[글 덩이] }) 한 장
  G.steps.register('summary', async function (step, ctx) {
    const P = (window.PLACES || {})[step.place || ctx.placeId] || {};
    const sm = P.summary;
    if (!sm) return G.steps.notReady(step, ctx);
    if (ctx.setScene) ctx.setScene(sm.scene || null);
    const SC = FL().shortcut || {};
    const card = h('div.card.rcard.note.summary-card', { 'data-act': P.act || '' },
      h('span.kind', SC.kind || '건너뛴 막'),
      sm.title ? h('h3', G.util.T(sm.title)) : null,
      ...(sm.lines || []).map((l) => G.steps.line(l, ctx)).filter(Boolean));
    await G.steps.cardMoment(ctx, card, step.next || SC.next || '다음 ▶');
  });

  // ───────── 놀이 화면 틀(탐색 모드) ─────────
  let playEl = null;
  app.explore = function (info) {
    const r = root();
    if (!playEl || !playEl.isConnected) {
      r.innerHTML = '';
      r.className = 'scr-play';
      const els = G.hud.build();
      const stage = h('div.mapstage');
      playEl = h('div.play', h('div.mapwrap', stage), h('div.hud', els.panel, els.mission, els.tools), els.strip);
      // 놀이 화면 틀은 굴러가지 않는다(포커스·끌기로 밀려도 되돌린다)
      playEl.addEventListener('scroll', () => { if (playEl.scrollTop || playEl.scrollLeft) { playEl.scrollTop = 0; playEl.scrollLeft = 0; } });
      r.appendChild(playEl);
      G.hud.tools([musicToggle(), fs.button(), iconBtn('gear', '설정', () => app.settings())], [iconBtn('gear', '설정', () => app.settings())]);
    }
    G.hud.setPlace(info || {});
    G.hud.refresh(true);
    return playEl;
  };
  app.mapArea = function () {
    if (!playEl || !playEl.isConnected) app.explore(G.hud.info || {});
    return playEl.querySelector('.mapstage');
  };
  // 맵 자리를 빈 종이로(맵이 없는 거점)
  function blankStage(text) {
    const a = app.mapArea();
    a.innerHTML = '';
    a.appendChild(h('div.stage-blank', text ? h('p', text) : null));
  }

  // ───────── 사건 모드 ─────────
  //  ctx = app.openEvent({ place, scene }) → 단계 실행기가 쓰는 자리. 다 쓰면 ctx.close()
  let evEl = null;
  function closeEvent() {
    if (evEl) { evEl.remove(); evEl = null; }
    if (playEl) playEl.classList.remove('evmode');
  }
  app.openEvent = function (o = {}) {
    closeEvent();
    if (!playEl || !playEl.isConnected) app.explore(G.hud.info || {});
    const art = h('div.ev-art');
    const main = h('div.ev-main.main-inner');
    const tray = h('div.ev-tray.hide');
    const box = h('div.ev-box', h('div.ev-scroll', main), tray);
    evEl = h('div.event.on', { role: 'dialog', 'aria-label': '사건' }, art, box);
    playEl.appendChild(evEl);
    playEl.classList.add('evmode');
    const el = evEl;
    const ctx = {
      main, mode: 'event', place: o.place || null, placeId: o.place ? o.place.id : null, el,
      tray(content) { G.ui.fillTray(tray, content); },
      trayEl: () => tray,
      refresh() { G.hud.refresh(); },
      // 전체 삽화 바꾸기: 그림 파일이 목록에 있으면 그림, 없으면 빈 종이 판(+ 그림 설명)
      setScene(id) {
        art.innerHTML = '';
        art.dataset.scene = id || '';
        if (!id) return;
        const src = G.util.art('sc', id);
        let cap = '';
        const P = window.PLACES || {};
        for (const k in P) { const p = P[k]; if (p && p.scenes && p.scenes[id]) { cap = p.scenes[id].caption || p.scenes[id].alt || ''; break; } }
        art.appendChild(src ? h('img', { src, alt: cap }) : h('div.blank-paper', cap ? h('span.cap', cap) : null));
      },
      close() { if (evEl === el) closeEvent(); else el.remove(); },
    };
    ctx.setScene(o.scene || null);
    return ctx;
  };

  // 단계 여럿을 사건 화면에서 차례로 펼친다(맵 없는 거점·목표에 묶인 단계 모두 이것을 쓴다)
  //  - 끝낸 단계는 건너뛴다(이어 하기). 하다 말고 껐으면 그 단계를 시작할 때의 값(G.save.snapKeys)으로 되돌리고 다시 한다
  //  - o.again: 끝낸 단계도 다시 펼친다(되풀이 구역). o.inline: 맵 위 작은 대화창에서. o.preset: 고르기 미리 정하기
  app.runSteps = async function (place, ids, o = {}) {
    const st = S();
    const pid = place.id;
    const all = place.steps || [];
    const list = (ids || all.map((s) => s.id)).map((id) => all.find((s) => s.id === id)).filter(Boolean)
      .filter((s) => o.again || !st.done[app.key.step(pid, s.id)]);
    if (!list.some((s) => G.steps.ok(s.when))) return true;
    const token = app._playToken;
    const ctx = o.inline && G.world && G.world.openDlg ? G.world.openDlg() : app.openEvent({ place, scene: o.scene });
    if (G.world && ctx.mode === 'event') G.world.busy++;
    ctx.preset = o.preset || null;
    try {
      for (const step of list) {
        if (!G.steps.ok(step.when)) continue;
        ctx.main.innerHTML = ''; ctx.tray(null);
        if (step.music) G.audio.play(step.music);
        const sk = app.key.step(pid, step.id);
        if (o.again) delete st.done[sk];
        app._stepAvatar = step.avatar || null; // 이 단계 동안 학생의 모습
        if (st.snap[sk]) Object.assign(st, JSON.parse(JSON.stringify(st.snap[sk])));
        else { const snap = {}; for (const k of G.save.snapKeys) snap[k] = st[k]; st.snap[sk] = JSON.parse(JSON.stringify(snap)); }
        G.save.write(); G.hud.refresh();
        try { await G.steps.run(step, ctx); }
        catch (e) {
          console.error('단계 오류', pid, step.id, e);
          ctx.main.innerHTML = '';
          ctx.main.appendChild(h('div.card.note', h('span.kind', '오류'), h('h3', '이 장면을 펼치다가 문제가 생겼어요'), h('p.small', '다음으로 넘어가요.')));
          await G.steps.nextButton(ctx, '넘어가기 ▶');
        }
        if (app._playToken !== token) return false;
        st.done[sk] = true;
        delete st.snap[sk];
        if (step.fx) G.steps.apply(step.fx, ctx);
        G.save.write(); G.hud.refresh();
      }
    } finally {
      app._stepAvatar = null;
      if (G.hud) G.hud.syncFace();
      if (G.world && ctx.mode === 'event') G.world.busy = Math.max(0, G.world.busy - 1);
      if (ctx.mode === 'event') ctx.close(); else if (G.world) G.world.closeDlg(ctx);
      if (G.world && G.world.music) G.audio.play(G.world.music);
    }
    return true;
  };

  // 거점 첫 화면: 막·거점 이름·미션·소개
  app.titleCard = async function (place, info, resumed) {
    const ctx = app.openEvent({ place, scene: place && place.cover });
    ctx.el.classList.add('cardmode');
    ctx.main.appendChild(h('div.place-card',
      info.actName && info.actName !== info.name ? h('div.pc-act', info.actName) : null,
      h('h2.pc-name', info.name),
      info.mission ? h('div.pc-mission', info.missionMark ? G.steps.mark(info.missionMark) : null, typeof info.mission === 'function' ? info.mission() : info.mission) : null,
      place && place.intro ? h('p.pc-intro', boldNodes(place.intro)) : null));
    await G.steps.nextButton(ctx, resumed ? '이어서 ▶' : '펼치기 ▶');
    ctx.close();
  };

  // ───────── 거점 진행 ─────────
  app.play = async function (placeId) {
    ui.unpop();
    closeEvent();
    const token = (app._playToken = {});
    const st = S();
    const info = app.placeInfo(placeId);
    st.place = placeId; G.save.write();
    app.explore(info);
    const place = (window.PLACES || {})[placeId];
    if (!place) { await app.notReadyPlace(placeId, info, token); return; }
    place.id = place.id || placeId;
    const beats = place.beats || [];
    const resumed = beats.some((b) => st.done[app.key.beat(placeId, b.id)]) || (place.steps || []).some((s) => st.done[app.key.step(placeId, s.id)]);
    let ok;
    if (place.map && G.world && G.world.mapDef(place.map)) {
      blankStage();
      if (place.music) G.audio.play(place.music); // 거점 첫 장부터 그 거점의 곡(앞 거점·타이틀의 곡이 남지 않게)
      await app.titleCard(place, info, resumed);
      if (app._playToken !== token) return;
      ok = await G.world.play(placeId);
    } else {
      blankStage(info.name);
      if (place.music) G.audio.play(place.music);
      await app.titleCard(place, info, resumed);
      if (app._playToken !== token) return;
      ok = await app.playEvents(place, token);
    }
    if (!ok || app._playToken !== token) return;
    st.done[app.key.place(placeId)] = true; G.save.write();
    app.next(placeId);
  };
  // 맵 없는 거점: 목표가 있으면 목표마다, 없으면 단계를 차례로
  app.playEvents = async function (place, token) {
    const st = S();
    const beats = place.beats || [];
    if (!beats.length) return app.runSteps(place, null);
    for (const b of beats) {
      if (!G.steps.ok(b.when) || st.done[app.key.beat(place.id, b.id)]) continue;
      if (b.music) G.audio.play(b.music);
      if (b.say) { const ctx = app.openEvent({ place, scene: b.scene }); await G.steps.lines(b.say, ctx); ctx.close(); }
      if (app._playToken !== token) return false;
      if (b.steps) await app.runSteps(place, b.steps, { scene: b.scene });
      if (app._playToken !== token) return false;
      st.done[app.key.beat(place.id, b.id)] = true; G.save.write();
    }
    return true;
  };
  // 아직 비어 있는 거점: '준비 중' 안내 후 다음 거점으로 넘어갈 수 있다
  app.notReadyPlace = async function (placeId, info, token) {
    blankStage(info.name);
    const ctx = app.openEvent({});
    ctx.el.classList.add('cardmode');
    ctx.main.appendChild(h('div.place-card.notready',
      info.actName ? h('div.pc-act', info.actName) : null,
      h('h2.pc-name', info.name),
      h('div.pc-mission', '준비 중'),
      h('p.pc-intro', '이 장면은 아직 만드는 중이에요. 다음으로 넘어가거나 타이틀로 돌아갈 수 있어요.')));
    const go = await new Promise((res) => {
      ctx.tray(h('div.actions',
        G.steps.actionBtn('타이틀로', '', () => res('title')),
        G.steps.actionBtn('다음 ▶', 'primary', () => res('next'))));
      setTimeout(() => { const b = ctx.trayEl().querySelector('.btn.primary'); if (b) b.focus({ preventScroll: true }); }, 30);
    });
    ctx.close();
    if (app._playToken !== token) return;
    if (go === 'title') return app.title();
    S().done[app.key.place(placeId)] = true; G.save.write();
    app.next(placeId);
  };
  // 다음 거점
  app.next = async function (placeId) {
    const order = app.order();
    const nextId = order[order.indexOf(placeId) + 1];
    const token = (app._playToken = {});
    if (!nextId) return app.finish();
    S().place = nextId; G.save.write();
    await app.travel(placeId, nextId);
    if (app._playToken !== token) return;
    app.play(nextId);
  };
  // 거점 사이 옮겨 가기(막 사이 전환). 기본은 아무것도 하지 않는다. 흐름 작업이 바꿀 수 있다: G.app.travel = async (from, to) => {}
  app.travel = async function () {};
  // 이야기의 끝: 걸이(hooks.finish)가 있으면 그것(마무리 화면들), 없으면 결과 화면 틀(js/game/result.js)
  app.finish = function () {
    const st = S();
    if (!st.finishedAt) { st.finishedAt = Date.now(); G.save.write(); }
    closeEvent();
    if (typeof app.hooks.finish === 'function') return app.hooks.finish();
    if (G.result && G.result.open) return G.result.open();
    const ctx = app.openEvent({});
    ctx.el.classList.add('cardmode');
    ctx.main.appendChild(h('div.place-card', h('h2.pc-name', '이야기의 끝')));
    ctx.tray(h('div.actions', G.steps.actionBtn('타이틀로', 'primary', () => app.title())));
  };

  // ───────── 설정 ─────────
  //  글자 크기 3단계 · 배경음 · 움직임 줄이기 · 전체 화면(지원할 때). 선생님용·방식·효과음 줄은 없다
  app.settings = async function () {
    const st = S();
    const seg = (label, key, opts) => h('div.seg', h('div.seg-l', label),
      h('div.seg-opts', { role: 'group', 'aria-label': label }, opts.map(([v, t]) => {
        const b = h('button.btn.small' + (st[key] === v ? '.primary' : ''), { type: 'button', 'aria-pressed': st[key] === v ? 'true' : 'false' }, t);
        b.addEventListener('click', () => {
          st[key] = v; G.save.write(); app.applySettings();
          if (key === 'music') { G.audio.unlock(); G.audio.music(st.music); for (const mb of $$('.music-toggle')) mb.replaceWith(musicToggle()); }
          $$('.btn', b.parentNode).forEach((x) => { x.classList.toggle('primary', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        });
        return b;
      })));
    // 전체 화면: 저장하는 설정이 아니라 지금 화면 상태를 켜고 끈다(지원하지 않으면 줄을 두지 않고 아래에 안내)
    const fsSeg = () => {
      if (!fs.supported()) return null;
      const T = fsText();
      const b = (v, t) => { const mine = (v === 'on') === fs.active(); return h('button.btn.small' + (mine ? '.primary' : ''), { type: 'button', 'data-fs': v, 'aria-pressed': mine ? 'true' : 'false', on: { click: () => { if ((v === 'on') !== fs.active()) fs.toggle(); } } }, t); };
      return h('div.seg', h('div.seg-l', T.label || '전체 화면'),
        h('div.seg-opts.fs-seg', { role: 'group', 'aria-label': T.label || '전체 화면' }, b('off', T.off || '끄기'), b('on', T.on || '켜기')));
    };
    const inGame = !!(playEl && playEl.isConnected);
    const res = await ui.sheet([
      h('h3', '설정'),
      h('div.seg-grid',
        seg('글자 크기', 'font', [[1, '보통'], [1.15, '크게'], [1.3, '아주 크게']]),
        seg('배경음', 'music', [[true, '켜기'], [false, '끄기']]),
        seg('움직임', 'motion', [['full', '보통'], ['less', '줄이기']]),
        fsSeg()),
      h('div.set-notes',
        !fs.supported() && !fs.standalone() && fsText().hint ? h('p.small.muted.fs-hint', fsText().hint) : null,
        h('p.small.muted', '진행 상황은 이 브라우저에만 저장돼요(서버로 보내지 않아요).')),
    ], inGame ? [{ label: '타이틀로', value: 'title' }, { label: '닫기', value: true, cls: 'primary' }] : [{ label: '닫기', value: true, cls: 'primary' }], { cls: 'settings-sheet' });
    if (res === 'title') app.title();
  };

  // ───────── 저장 도구: 캔버스를 그림 파일로 내려받기(결과 화면에서 쓴다) ─────────
  //  파일은 학생 기기에만 저장된다(서버로 보내지 않는다)
  app.downloadCanvas = function (canvas, filename) {
    canvas.toBlob((blob) => {
      if (!blob) { ui.toast('이 기기에서는 저장이 안 돼요. 화면을 캡처해 주세요.'); return; }
      const url = URL.createObjectURL(blob);
      const a = h('a', { href: url, download: filename || '세번의담.png' });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }, 'image/png');
  };
  // 캔버스 줄바꿈(글자 단위). 다음 줄의 y를 돌려준다. dry면 그리지 않고 재기만 한다
  app.wrapText = function (g, text, x, y, maxW, lh, maxLines, dry) {
    const put = (t, yy) => { if (!dry) g.fillText(t, x, yy); };
    let line = '', n = 0;
    for (const ch of String(text)) {
      if (g.measureText(line + ch).width > maxW) {
        n++;
        if (n >= maxLines) { put(line.slice(0, -1) + '…', y); return y + lh; }
        put(line, y); y += lh; line = ch;
      } else line += ch;
    }
    if (line) put(line, y);
    return y + lh;
  };
})();
