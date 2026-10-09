'use strict';
// 배경음 목록(T9). 소리는 배경음만 — 낭송·효과음·합성 음악은 두지 않는다(spec 13절). 곡이 없거나 못 읽으면 소리 없이 간다.
//  꼴: BGM = { credit:'…', tracks:{ 장면 id:{ src:'assets/bgm/….mp3', gain, from:'곡 이름' } }, credits:[출처 줄] }
//  장면 자료의 music:'장면 id'(거점·목표·단계)나 엔진의 G.audio.play('장면 id')가 이 곡을 고른다.
//  음원: 형제 게임 「최척전」이 이미 쓰는 국립국악원 「디지털 이음」 악구 이음 곡(공공누리 제1유형)을 그대로 옮겨 왔다.
//   새로 내려받지 않았다. 파일 이름은 이 게임의 장면 이름으로 바꿨다(옛 이름·악구 코드는 credits/bgm.tsv).
//  gain: 곡마다 소리 크기(1이 기본). 곡은 모두 -17 LUFS인데 act3.mp3만 -22 LUFS로 만들어진 곡이라 크게 키운다.
window.BGM = {
  credit: '배경음: 국립국악원 「디지털 이음」 국악기 악구를 이어 붙인 곡(공공누리 제1유형, 출처표시)',
  tracks: {
    // 첫 화면(엔진 기본 이름 'title')과 들어가기(송도)는 같은 곡을 이어서 튼다
    title: { src: 'assets/bgm/prologue.mp3', gain: 1, from: '소금 연례악 — 수제천' },
    prologue: { src: 'assets/bgm/prologue.mp3', gain: 1, from: '소금 연례악 — 수제천' },
    garden: { src: 'assets/bgm/garden.mp3', gain: 1, from: '성금련류 가야금 산조 — 늦은중중모리' },
    flight: { src: 'assets/bgm/flight.mp3', gain: 1, from: '한갑득류 거문고 산조 — 엇모리' },
    night: { src: 'assets/bgm/night.mp3', gain: 1, from: '지영희류 해금 산조 — 진양조' },
    act3: { src: 'assets/bgm/act3.mp3', gain: 1.75, from: '한갑득류 거문고 산조 — 중모리' },
    okru: { src: 'assets/bgm/okru.mp3', gain: 1, from: '윤윤석류 아쟁 산조 — 진양조' },
    farewell: { src: 'assets/bgm/farewell.mp3', gain: 1, from: '대금 산조(이영섭류) — 진양조' },
    result: { src: 'assets/bgm/result.mp3', gain: 1, from: '가야금 경기민요 — 천안삼거리·한강수타령·창부타령' },
  },
  // 게임 안 '만든 사람·출처' 화면에 보이는 배경음 출처 줄(장면 · 곡 · 출처 · 이용 조건)
  credits: [
    { scene: '첫 화면·들어가기', title: '소금 연례악 「수제천」', file: 'prologue.mp3' },
    { scene: '1막 정원', title: '성금련류 가야금 산조 늦은중중모리', file: 'garden.mp3' },
    { scene: '2막 피란', title: '한갑득류 거문고 산조 엇모리', file: 'flight.mp3' },
    { scene: '밤의 재회', title: '지영희류 해금 산조 진양조', file: 'night.mp3' },
    { scene: '3막', title: '한갑득류 거문고 산조 중모리', file: 'act3.mp3' },
    { scene: '옥루춘', title: '윤윤석류 아쟁 산조 진양조', file: 'okru.mp3' },
    { scene: '이별', title: '대금 산조(이영섭류) 진양조', file: 'farewell.mp3' },
    { scene: '결과', title: '가야금 경기민요 천안삼거리·한강수타령·창부타령', file: 'result.mp3' },
  ].map((c) => Object.assign(c, { by: '국립국악원 「디지털 이음」 악구', license: '공공누리 제1유형(출처표시)' })),
};

// 출처 화면(app.js creditsSheet)은 CREDITS.sections를 그린다. credits.js는 있는 CREDITS를 그대로 두므로(|| 꼴) 여기서 배경음 칸을 더한다.
(function () {
  const C = (window.CREDITS = window.CREDITS || { sections: [] });
  C.sections = C.sections || [];
  if (C.sections.some((s) => s && s.id === 'bgm')) return;
  C.sections.push({
    id: 'bgm',
    title: '배경음',
    items: window.BGM.credits.map((c) => ({ title: c.scene + ' — ' + c.title, by: c.by, license: c.license })),
  });
})();
