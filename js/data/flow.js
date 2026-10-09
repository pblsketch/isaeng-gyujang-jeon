'use strict';
// 이야기 흐름(선생님이 고쳐도 되는 파일)
//  - order: 거점을 밟는 차례(들어가기 → 1막 → 2막 피란길 → 2막 밤 → 3막 → 맺음). 맺음이 끝나면 마무리 화면(전기적 요소 한 줄 ·
//    「만복사저포기」, js/game/finale.js)을 거쳐 결과 화면(js/game/result.js)으로 간다. 거점 내용은 js/data/places/*.js(PLACES[id]).
//    비어 있는 거점은 '준비 중'으로 지나간다.
//  - mission: 첫 1분의 미션(spec 2절 그대로). acts: 막 열쇠('act1'·'act2'·'act3')마다 이름·제목과 늘 보이는 한 문장 미션.
//    거점 파일에 mission을 적으면 그것이 먼저다. 막 미션은 이 게임이 지은 말이라 표시가 '게임 설정'이다(거점 첫 장에 표시 칩).
//  - places: 거점 이름·막. 거점 파일이 아직 비어 있어도 이 이름으로 보인다.
//  - shortcut: 바로가기 주소(?act=1|2|3, spec 14절)로 열었을 때 타이틀 글. {act}는 '2막 「전란의 담」'처럼 바뀐다.
//    저장 기록이 있으면 '이어 하기 / 이 막부터', 없으면 그 막에서 바로 시작. 건너뛴 막은 30초 요약 카드(거점 자료의 summary).
window.FLOW = (function () {
  const MISSION_SRC = { mark: '게임 설정', src: '게임 설정 — spec 2절 미션과 선택의 세 갈래(수단으로 맞섬·마음 둠·답함)', status: '확인 전' };
  return {
    title: '세 번의 담',
    subtitle: '이생규장전',
    pre: '김시습 「이생규장전」',
    tagline: '담 너머에 그 사람이 있다',
    hint: '이어폰을 끼면 배경음이 더 잘 들려요',
    mission: '담 너머에 그 사람이 있다. 무엇이 우리를 가로막든 넘어가라.',
    order: ['prologue', 'act1', 'act2', 'act2night', 'act3', 'epilogue'],
    acts: {
      act1: Object.assign({ name: '1막', title: '부모의 담', mission: '부모의 반대라는 담 앞에서, 수단을 골라 그 사람과 맺어져라.' }, MISSION_SRC),
      act2: Object.assign({ name: '2막', title: '전란의 담', mission: '난리가 둘을 갈라놓아도, 다시 그 사람 곁으로 가라.' }, MISSION_SRC),
      act3: Object.assign({ name: '3막', title: '저승의 담', mission: '남은 날에 할 일을 마치고, 마지막 담 앞에서 답하라.' }, MISSION_SRC),
    },
    places: {
      prologue: Object.assign({ name: '들어가기', mission: '담 너머에 그 사람이 있다. 무엇이 우리를 가로막든 넘어가라.' }, MISSION_SRC, { src: '게임 설정 — spec 2절 첫 1분의 미션' }),
      act1: { name: '최 씨 집 정원', act: 'act1' },
      act2: { name: '피란길', act: 'act2' },
      act2night: { name: '밤의 최 씨 집', act: 'act2' },
      act3: { name: '남은 날', act: 'act3' },
      epilogue: { name: '맺음', act: 'act3' },
    },
    shortcut: {
      start: '{act}부터 시작',
      resume: '이어 하기',
      from: '이 막부터',
      note: '바로가기 — {act}부터 시작해요. 건너뛴 막은 30초 요약으로 봐요.',
      noteSaved: '바로가기 — {act}. 이 막부터 하면 앞 막 기록은 남아요.',
      kind: '건너뛴 막 · 30초 요약',
      next: '다음 ▶',
    },
  };
})();
