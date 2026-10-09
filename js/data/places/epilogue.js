'use strict';
// 거점 'epilogue': 맺음 — T2(글)·T6가 채운다. 지금은 빈 틀(PLACES.epilogue가 없으면 엔진이 '준비 중'으로 보이고 넘어간다).
//  꼴(최척전 형식): PLACES.epilogue = { name, act, map, maps:{ 맵 id:{ name, theme, spawn, grid, props, spots, doors } }, cast, beats:[…], steps:[…], scenes:{…} }
//  맵 격자는 G.world.mk(가로, 세로, 바탕, ops)로 만든다(엔진 없이 실릴 때를 위해 대체 함수를 둘 수 있다). js/game/AGENTS.md 참고
window.PLACES = window.PLACES || {};
