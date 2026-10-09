'use strict';
// HUD: 화면 구석에 얹는 게임 정보(게이지·점수는 없다).
//  - 왼쪽 위: 최 씨의 작은 얼굴 + 지금 있는 곳(거점·맵 이름)과 때 딱지
//  - 가운데 위: 막마다 한 문장 미션과 그 아래 '지금 할 일'(목표) — 늘 떠 있다(spec 4절)
//  - 오른쪽 위: 배경음·전체 화면·설정 아이콘(js/game/app.js가 hud.tools로 채운다)
//  - 사건 모드에서는 위쪽 얇은 띠(.gstrip)에 미션·때 딱지·설정만 남는다.
//  얻은 것 알림(hud.announce): 낱말 카드처럼 이야기에서 저절로 얻는 것을 화면 가운데에 크게(글 틀: TEXTS.GOT).
(function () {
  const { h } = G.util;
  const hud = (G.hud = {});
  let els = null; // { panel, strip, mission, missionText, stripMission, goal, where, place, tools, stripTools, face, year, stripYear }

  const ICON = {
    word: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="7" width="30" height="34" rx="3" fill="currentColor" fill-opacity=".14"/><path d="M16 17h16M16 24h16M16 31h10"/></svg>',
    note: '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="15" fill="currentColor" fill-opacity=".14"/><path d="M24 17v9M24 31v1"/></svg>',
  };
  hud.ICON = ICON;

  // 왼쪽 위 얼굴: 학생이 맡은 인물(최 씨)의 지금 모습. 그림이 없으면 이름 첫 글자 동그라미
  function faceEl() { return G.ui.face(G.util.playerId()); }
  hud.syncFace = function () {
    if (!els || !els.face) return;
    const pid = G.util.playerId();
    const key = (G.util.ptId(pid) || '') + '|' + (G.util.lookNow(pid) || '');
    if (els.face._key === key) return;
    els.face._key = key;
    els.face.innerHTML = '';
    els.face.appendChild(faceEl());
  };

  // HUD를 새로 만든다(app.explore가 부른다)
  hud.build = function () {
    const place = h('div.pl-place');
    const where = h('div.pl-where');
    const goal = h('div.pl-goal.hide', h('span.k', '지금 할 일'), h('strong'));
    const face = h('div.hud-face', { 'aria-hidden': 'true' });
    const year = h('span.hud-year', { hidden: true });
    const panel = h('aside.panel.hud-tl', { 'aria-label': '지금 있는 곳' },
      face, year,
      h('div.hud-tl-body', h('div.pl-head', place, where)));
    const tools = h('div.pl-tools.hud-tr');
    const missionText = h('strong.mi-text');
    const mission = h('div.mission', { role: 'status' }, h('div.mi-line', h('i.mi-orn', { 'aria-hidden': 'true' }), missionText, h('i.mi-orn', { 'aria-hidden': 'true' })), goal);
    const stripMission = h('div.st-mission');
    const stripYear = h('span.st-year', { hidden: true });
    const stripTools = h('div.st-tools');
    const strip = h('div.gstrip', stripYear, stripMission, stripTools);
    els = { panel, strip, mission, missionText, stripMission, goal, where, place, tools, stripTools, face, year, stripYear };
    hud.refresh(true);
    return els;
  };
  hud.els = () => els;

  hud.refresh = function () {
    if (!els) return;
    hud.syncFace();
    hud.mission();
  };

  // 얻은 것 알림 글(js/data/texts.js의 TEXTS.GOT)
  const got = (kind) => (((window.TEXTS || {}).GOT) || {})[kind] || {};
  hud.gotText = got;

  // ───────── 얻은 것 알림: 화면 가운데에 크게(차례로, 저절로 사라진다. 누르는 것을 막지 않는다) ─────────
  //  hud.announce({ kind:'word'|'note', label:'낱말 카드를 얻었다', name:'담장', desc:'…', ms })
  //  hud.got('word', '담장') — TEXTS.GOT.word의 틀로 알린다
  const queue = [];
  let showing = false;
  hud.announce = function (o) {
    queue.push(o);
    if (!showing) next();
  };
  hud.got = function (kind, name, desc) {
    const g = got(kind);
    hud.announce({ kind, label: String(g.label || '').replace('{name}', name || ''), name: name || '', desc: desc != null ? desc : g.desc || '' });
  };
  // 고르는 중인 선택지·쓰기 칸이 떠 있으면 그 글을 덮지 않게, 닫힐 때까지 기다렸다 띄운다
  const busyView = () => !!document.querySelector('.event.rcardmode, .choice-tray .opt:not([disabled]), .wfield');
  function next(waited = 0) {
    if (queue.length && busyView() && waited < 60000) { showing = true; setTimeout(() => next(waited + 250), 250); return; }
    const o = queue.shift();
    if (!o) { showing = false; return; }
    showing = true;
    const el = h('div.gettoast.' + (o.kind || 'note'), { role: 'status', 'aria-live': 'polite' },
      h('div.gt-card',
        h('div.gt-ic', { html: ICON[o.kind] || ICON.note, 'aria-hidden': 'true' }),
        h('div.gt-body',
          h('small', o.label || ''),
          h('strong', G.util.T(o.name || '')),
          o.desc ? h('p', G.util.boldNodes(o.desc)) : null)));
    document.body.appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => { el.remove(); next(); }, 420); }, o.ms || 2600);
  }

  // 지금 할 일(목표)
  hud.goal = function (text) {
    if (!els) return;
    els.goal.querySelector('strong').textContent = text || '';
    els.goal.classList.toggle('hide', !text);
  };
  // 지금 있는 자리(맵 이름)와 때(거점·맵 자료의 year: '재회 이튿날' 같은 딱지)
  hud.where = function (name, year) {
    if (!els) return;
    els.where.textContent = name || '';
    if (year !== undefined) hud._year = year || null;
    const y = hud._year || (hud.info && hud.info.year) || '';
    for (const e of [els.year, els.stripYear]) { e.textContent = y; e.hidden = !y; }
  };
  hud.setPlace = function (info) {
    hud.info = info || {};
    hud._mission = null;
    hud._year = null;
    if (!els) return;
    els.place.innerHTML = '';
    const act = info && info.actName;
    G.util.append(els.place, [act ? h('small', act) : null, h('strong', (info && info.name) || '')]);
    hud.mission();
    hud.where(els.where.textContent);
  };
  // 한 문장 미션(탐색 화면 가운데 위와 사건 화면 띠에 늘 보인다). 함수일 수 있다(거점 자료의 missions)
  hud.mission = function (text) {
    if (text !== undefined) hud._mission = text;
    if (!els) return;
    let t = hud._mission != null ? hud._mission : (hud.info && hud.info.mission) || '';
    if (typeof t === 'function') t = t() || '';
    els.missionText.textContent = t;
    els.mission.classList.toggle('hide', !t);
    els.stripMission.textContent = t;
  };
  // 오른쪽 위 아이콘들과 사건 띠의 단추들(app이 채운다)
  hud.tools = function (buttons, stripButtons) {
    if (!els) return;
    els.tools.innerHTML = ''; G.util.append(els.tools, buttons || []);
    els.stripTools.innerHTML = ''; G.util.append(els.stripTools, stripButtons || []);
  };
})();
