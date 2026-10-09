'use strict';
// 이야기 흐름(선생님이 고쳐도 되는 파일)
//  - order: 거점을 밟는 차례. 거점 내용은 js/data/places/*.js(PLACES[id])에 있다. 비어 있는 거점은 '준비 중'으로 지나간다.
//  - acts: 막 열쇠('act1'·'act2'·'act3')마다 이름·제목과 늘 보이는 한 문장 미션. 거점 파일에 mission을 적으면 그것이 먼저다.
//  - places: 거점 이름·막. 거점 파일이 아직 비어 있어도 이 이름으로 보인다.
//  막 미션은 이 게임이 지은 말(게임 설정)이다. 흐름 작업(T8)이 고칠 수 있다.
window.FLOW = {
  title: '세 번의 담',
  subtitle: '이생규장전',
  pre: '김시습 「이생규장전」',
  tagline: '담 너머에 그 사람이 있다',
  hint: '이어폰을 끼면 배경음이 더 잘 들려요',
  mission: '담 너머에 그 사람이 있다. 무엇이 우리를 가로막든 넘어가라.',
  order: ['prologue', 'act1', 'act2', 'act2night', 'act3', 'epilogue'],
  acts: {
    act1: { name: '1막', title: '부모의 담', mission: '부모의 반대를 넘어 그 사람과 맺어져라.' },
    act2: { name: '2막', title: '전란의 담', mission: '난리 속에서도 그 사람을 다시 만나라.' },
    act3: { name: '3막', title: '저승의 담', mission: '남은 날 동안 해야 할 일을 마쳐라.' },
  },
  places: {
    prologue: { name: '들어가기', mission: '담 너머에 그 사람이 있다. 무엇이 우리를 가로막든 넘어가라.' },
    act1: { name: '최 씨 집 정원', act: 'act1' },
    act2: { name: '피란길', act: 'act2' },
    act2night: { name: '밤의 최 씨 집', act: 'act2' },
    act3: { name: '남은 날', act: 'act3' },
    epilogue: { name: '맺음', act: 'act3' },
  },
};
