'use strict';
// 맺음 — 최 씨가 사라짐 → 이생의 장사와 죽음(한 줄 + 암전, 그림 없음) → 원작의 맺음(절의를 사모함) → 3막 끝 '반복의 뜻' 한 문장.
//  이어서 전기적 요소 한 줄 · 「만복사저포기」 · 결과 화면(js/data/finale.js)으로 간다(흐름은 흐름 작업).
//  맵 자리는 두지 않는다(사건 화면만). 맵이 필요하면 3막 작업이 더한다.
window.PLACES = window.PLACES || {};
(function () {
  const ST = '확인 전';
  const ORIG = '「이생규장전」 원문(위키문헌 「번역:금오신화」 李生窺牆傳)';
  const p = (t, basis, who) => Object.assign({ t, mark: '풀이', src: '「이생규장전」 ' + (basis || '줄거리') + '(새로 옮김)', status: ST }, who ? { who } : {});
  const w = (han, ko, who) => Object.assign({ han, ko, mark: '원문', src: ORIG, status: ST }, who ? { who } : {});

  PLACES.epilogue = {
    name: '맺음', act: 'act3', year: '서너 해 뒤',
    music: 'farewell', cover: 'sc_epilogue_farewell',
    beats: [
      { id: 'b-end', auto: true, steps: ['e-farewell', 'e-death', 'e-coda', 'e-repeat'] },
    ],
    steps: [
      {
        id: 'e-farewell', type: 'say', scene: 'sc_epilogue_farewell',
        lines: [
          p('두 사람은 마주 본 채 하염없이 눈물을 쏟았다.', '相視泣下數行'),
          w('李郞珍重.', '낭군님, 부디 몸 보살피세요.', 'choi'),
          p('그 말을 끝으로 최 씨의 모습은 차츰 옅어지더니, 이내 흔적 없이 사라졌다.', '言訖漸滅,了無踪迹'),
        ],
      },
      {
        // 암전: 그림 자리 없음. 이생의 죽음은 이 한 줄로만.
        id: 'e-death', type: 'blackout', mark: '풀이', src: '「이생규장전」 生拾骨, 附葬于親墓傍…得病數月而卒(새로 옮김)', status: ST,
        t: '이생은 최 씨의 뼈를 수습해 부모 무덤 옆에 함께 묻었다. 그리움을 끝내 이기지 못한 그도 병이 들어, 몇 달 뒤 숨을 거두었다.',
      },
      {
        id: 'e-coda', type: 'say',
        lines: [
          w('聞者莫不傷歎, 而慕其義焉.', '소식을 전해 들은 이들은 하나같이 가슴 아파하며, 그 절의를 마음 깊이 기렸다.'),
        ],
      },
      // 3막 끝: 만남과 이별 표 전체를 보고 '반복의 뜻' 한 문장(필수, 채점하지 않음). 물음은 FINALE.repeat.
      { id: 'e-repeat', type: 'blank', act: 'act3' },
    ],
    scenes: {
      sc_epilogue_farewell: { caption: '"낭군님, 부디 몸 보살피세요" — 사라지는 최 씨', prompt_hint: 'A softly glowing young woman slowly fading into moonlight in a pavilion, a scholar reaching out with tears, petals drifting; sorrowful and beautiful, no text' },
    },
  };
})();
