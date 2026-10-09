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

// ───────── 담 앞 순간·빈칸 화면 글(1막 작업이 더함 — js/game/wall.js·blank.js) ─────────
//  화면 이름표다. 이야기 글(반응·대사·카드)은 walls.js·cards.js·finale.js에 있다. 점수·맞음·틀림 투의 말을 쓰지 않는다.
TEXTS.WALL = {
  pick: '어떤 수단으로 맞설까?',          // 수단 칸 위 안내(단계에 tip이 없을 때)
  again: '다시 골라 보자. 같은 수단을 또 써도 된다.', // 반응을 본 뒤 수단 칸 위 안내
  answer: '어떻게 답할까?',               // 답 고르기 칸 위 안내
  group: '수단 칸',                        // 수단 칸 묶음 이름(화면 읽기)
  answers: '답 고르기',
  locked: '잠긴 칸',                       // 혼이 열리기 전 이름 없는 칸(무엇인지 알려 주지 않는다)
  lockedHint: '아직 열리지 않았다.',
  used: '써 봄',                           // 써 본 수단의 작은 표시
  leave: '돌아서기',                       // 통과가 없는 순간에서 떠나기
  leaveDesc: '이 자리를 떠난다',
  leaveLine: '돌아선다.',                  // 자료에 떠날 때의 글이 없을 때
  rise: '담이 조금 더 높아 보인다.',       // 담 높이 연출(보이기만, 벌 없음)
};
TEXTS.BLANK = {
  title: '만남과 이별',                    // 표 제목
  pick: '빈칸에 들어갈 낱말 카드를 골라 보자.',
  again: '다른 카드를 골라 보자.',
  cards: '낱말 카드',
  slot: '빈칸',
  done: '빈칸을 모두 채웠다.',
  repeatLabel: '반복의 뜻 한 문장',
  placeholder: '한 문장으로 써 보자',
  need: '한 문장을 써야 넘어갈 수 있어요.',
  write: '다 썼다',
};
