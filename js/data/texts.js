'use strict';
// 엔진 공통 글(선생님이 고쳐도 되는 파일). 이야기 글은 거점 파일과 walls·cards·okru·finale에 있다.
//  - MARKS: 표시 다섯의 이름과 색(설명은 js/data/notes.js의 NOTES.marks — 있으면 그쪽 색이 먼저)
//  - FULLSCREEN: 전체 화면 단추·설정 줄 · ROTATE: 세로 화면 안내 · RESET: 처음부터 확인
//  - GOT: 얻은 것 알림 틀(G.hud.got('word', '담장') → 「낱말 카드를 얻었다 — 담장」)
//  - LOCKED: 아직 열리지 않은 할 일을 누를 때 기본 안내(할 일마다 lockHint가 있으면 그것) · KEYHINT: 맵 아래 키 안내
window.TEXTS = window.TEXTS || {};

TEXTS.MARKS = {
  원문: { name: '원문', color: '#b3342a' },
  풀이: { name: '풀이', color: '#6a5a4a' },
  '게임 설정': { name: '게임 설정', color: '#1f7474' },
  '이본 노트': { name: '이본 노트', color: '#9a6b22' },
  해석: { name: '해석', color: '#6b3f8c' },
};

TEXTS.FULLSCREEN = {
  label: '전체 화면', enter: '전체 화면', exit: '전체 화면 끝내기', on: '켜기', off: '끄기',
  hint: '이 브라우저에는 전체 화면 단추가 없어요. 공유 메뉴에서 ‘홈 화면에 추가’를 하면 전체 화면으로 열려요.',
  fail: '전체 화면으로 바꾸지 못했어요',
};

TEXTS.ROTATE = { title: '가로로 돌려 주세요', body: '이 게임은 가로 화면에서 해요. 기기를 옆으로 눕혀 주세요.' };

TEXTS.RESET = {
  title: '처음부터 다시 할까요?',
  body: '지금까지의 기록과 적어 둔 이름이 모두 지워져요. 글자 크기·배경음 같은 설정은 그대로예요.',
  cancel: '그만두기', go: '처음부터', done: '처음부터 시작할 수 있어요',
};

TEXTS.GOT = {
  word: { label: '낱말 카드를 얻었다', desc: '막 끝 빈칸에 쓸 수 있어요.' },
  note: { label: '알게 되었다', desc: '' },
};

// 접어 둔 원문(quote의 fold:true): 누르면 펼친다
TEXTS.FOLD = { open: '원문 펼치기', close: '원문 접기', note: '' };

TEXTS.LOCKED = '아직 할 수 없어요. 먼저 해야 할 일이 있어요.';
TEXTS.KEYHINT = '이동 ← ↑ → ↓ / WASD · 말 걸기·살피기 E / Enter / Space';
