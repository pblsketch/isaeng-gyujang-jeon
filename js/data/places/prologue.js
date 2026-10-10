'use strict';
// 들어가기 — 송도(맵 없음: 사건 화면으로만 펼친다. 흐름 작업(T8)이 맵 없이 두기로 정했다 — spec 3절 '1분', 조작 익히기는 1막 첫머리)
//  송도의 두 사람 → 세상 사람들의 칭찬 노래(원문+풀이) → 미션 → 게임 설정 안내(수단과 담) → 표시 다섯과 '게임 설정'의 뜻.
//  글 덩이 꼴은 js/data/AGENTS.md. 원문은 design/sources/wikisource-geumosinhwa-raw.txt에서만.
window.PLACES = window.PLACES || {};
(function () {
  const ST = '확인 전';
  const ORIG = '「이생규장전」 원문(위키문헌 「번역:금오신화」 李生窺牆傳)';
  const p = (t, basis, who) => Object.assign({ t, mark: '풀이', src: '「이생규장전」 ' + (basis || '줄거리') + '(새로 옮김)', status: ST }, who ? { who } : {});
  const g = (t, who) => Object.assign({ t, mark: '게임 설정', src: '게임 설정', status: ST }, who ? { who } : {});
  const w = (han, ko, who) => Object.assign({ han, ko, mark: '원문', src: ORIG, status: ST }, who ? { who } : {});

  PLACES.prologue = {
    name: '들어가기 — 송도', act: 'prologue', year: '고려 말',
    music: 'prologue', cover: 'sc_prologue_songdo',
    beats: [
      { id: 'b-intro', auto: true, steps: ['p-songdo', 'p-praise', 'p-mission', 'p-means', 'p-marks'] },
    ],
    steps: [
      {
        id: 'p-songdo', type: 'say', scene: 'sc_prologue_songdo',
        lines: [
          p('고려의 서울 송도, 낙타교 곁에 이생이라는 열여덟 살 선비가 살았다. 풍채가 맑고 재주가 빼어나, 국학에 다니며 길을 가면서도 시를 읽었다.', '松都有李生者…讀詩路傍'),
          p('선죽리의 이름난 집안에는 열대여섯 살쯤 된 최 씨 처녀가 있었다. 자태가 곱고 수를 잘 놓았으며, 시와 글에도 뛰어났다.', '善竹里, 有巨室處崔氏…長於詩賦'),
        ],
      },
      {
        id: 'p-praise', type: 'say', scene: 'sc_prologue_songdo',
        lines: [
          p('사람들은 두 사람을 두고 이렇게 노래했다.', '世稱'),
          w('風流李氏子. 窈窕崔家娘.', '멋을 아는 이씨 댁 도령, 곱고 얌전한 최씨 댁 낭자.'),
          w('才色若可餐, 可以療飢腸.', '그 재주와 고운 모습을 먹을 수만 있다면, 주린 배도 채울 수 있겠네.'),
        ],
      },
      {
        id: 'p-mission', type: 'say', mark: '게임 설정', src: '게임 설정(게임의 미션)', status: ST,
        lines: [
          g('너는 최 씨다. 담 너머에 그 사람이 있다.'),
          g('무엇이 우리를 가로막든 넘어가라.'),
        ],
      },
      {
        id: 'p-means', type: 'card',
        card: {
          title: '담과 수단', mark: '게임 설정', src: '게임 설정', status: ST,
          body: '담 앞에서 말·시·결단 가운데 무엇이든 골라 맞서 보자. 원작의 흐름과 맞으면 담이 낮아지고, 맞지 않으면 그 세상의 사람들이 원작의 논리로 답한다.\n수단 칸 하나는 아직 이름 없이 잠겨 있다.',
        },
      },
      {
        // 표시 다섯과 '게임 설정'의 뜻(spec 11절). 원작에 없는 것을 게임이 지었다는 것을 처음에 밝힌다
        id: 'p-marks', type: 'say', mark: '게임 설정', src: '게임 설정(글의 표시 다섯)', status: ST,
        lines: [
          g('글마다 표시가 붙는다. 원문 · 풀이 · 게임 설정 · 이본 노트 · 해석.'),
          g('‘게임 설정’은 원작에 없는 것을 이 게임이 지어낸 것이다. 수단과 담, 낱말 카드, 막마다의 미션이 그렇다. 큰 줄거리와 결말은 원작 그대로다.'),
        ],
      },
    ],
    scenes: {
      sc_prologue_songdo: { caption: '고려의 서울 송도, 낙타교와 선죽리의 큰 집', prompt_hint: 'Goryeo-era capital Songdo in spring, a small stone bridge over a stream, a young scholar in a blue-collared robe walking with a book, a large tiled-roof mansion with a long earthen wall and willows behind; gentle morning light, no text' },
    },
  };
})();
