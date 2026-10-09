'use strict';
// 2막 「전란의 담」(1) — 피란길 한 판(산벼랑, 긴 풀 들). 한 방향 길.
//  흐름(spec 5-3): 들어가기 카드(1361 홍건적, 임금 복주 피난) → 피란길을 짧게 걷기(이생은 혼자 달아나 숨는다)
//   → 붙잡힘(조작 없는 사건) → 담 앞 w2-bandit → 꾸짖음(원문 카드) → 암전(도적의 폭력은 한 줄 서술, 그림 없음)
//   → 해석 카드(절의·정절은 그 시대의 가치) → 이생 쪽 카드 셋 → 밤의 최 씨 집(act2night.js)으로.
//  민감한 장면(spec 12절): 위협은 서술 한 줄(w2-bandit의 intro), 꾸짖음 다음 바로 암전, '살을 발라냄'은 암전의 원문 카드(펼침)에만.
//  낱말 카드: 홍건적의 난(들어가기 카드) · 피란(피란길) · 꿈(누각의 탄식).
window.PLACES = window.PLACES || {};
(function () {
  const ST = '확인 전';
  const ORIG = '「이생규장전」 원문(위키문헌 「번역:금오신화」 李生窺牆傳)';
  const p = (t, basis, who) => Object.assign({ t, mark: '풀이', src: '「이생규장전」 ' + (basis || '줄거리') + '(새로 옮김)', status: ST }, who ? { who } : {});
  const g = (t, who, basis) => Object.assign({ t, mark: '게임 설정', src: '게임 설정' + (basis ? ' — 근거: ' + basis : ''), status: ST }, who ? { who } : {});
  const w = (han, ko, who) => Object.assign({ han, ko, mark: '원문', src: ORIG, status: ST }, who ? { who } : {});
  const PS = (basis) => ({ mark: '풀이', src: '「이생규장전」 ' + basis + '(새로 옮김)', status: ST });

  const mk = (wd, hgt, base, ops) => {
    if (window.G && G.world && G.world.mk) return G.world.mk(wd, hgt, base, ops);
    const gr = Array.from({ length: hgt }, () => Array(wd).fill(base));
    for (const [k, x, y, rw, rh, c] of ops || []) if (k === 'rect') for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (gr[j] && gr[j][i] != null) gr[j][i] = c;
    return gr.map((r) => r.join(''));
  };
  // 자리 표시 격자(30×8): 서쪽에서 동쪽으로 한 방향 길. 2막 작업이 실제 피란길로 바꾼다.
  const grid = mk(30, 8, '.', [['rect', 0, 0, 30, 2, '#'], ['rect', 0, 6, 30, 2, '#']]);

  PLACES.act2 = {
    name: '2막 「전란의 담」', act: 'act2', year: '1361 신축년',
    music: 'flight', cover: 'sc_act2_history',
    map: 'road', spawn: [2, 4, 'right'],
    maps: {
      road: {
        name: '피란길', grid, spawn: [2, 4, 'right'],
        spots: {
          cliff: { x: 26, y: 2, w: 3, h: 4, name: '산벼랑' },
          grass: { x: 14, y: 2, w: 4, h: 4, name: '긴 풀 들', look: [g('허리까지 차는 풀이 바람에 눕는다.')] },
        },
      },
    },
    cast: {
      road: {
        isaeng: { who: 'isaeng', x: 6, y: 4, dir: 'right' },
      },
    },
    beats: [
      { id: 'b-intro', auto: true, steps: ['a2-history', 'a2-flee'] },
      { id: 'b-walk', goal: '피란길을 따라 산벼랑 쪽으로 가자', go: 'cliff', steps: ['a2-cliff'] },
      { id: 'b-caught', auto: true, steps: ['a2-caught', 'w2-bandit', 'a2-rebuke', 'a2-dark', 'a2-era', 'a2-isaeng1', 'a2-isaeng2', 'a2-isaeng3'] },
    ],
    steps: [
      {
        id: 'a2-history', type: 'card', fx: { word: '홍건적의 난' },
        card: {
          title: '신축년(1361), 홍건적의 난', ...PS('辛丑年, 紅賊據京城, 王移福州'),
          body: '1361년(공민왕 10년, 신축년), 원나라 말에 일어난 홍건적이 고려에 쳐들어와 서울 개경을 손에 넣었다. 공민왕은 남쪽 복주(오늘날 안동)까지 몸을 피했다.\n마을마다 불길이 오르고 사람도 짐승도 무사하지 못했다.',
          quote: w('紅賊據京城, 王移福州.', '홍건적이 서울을 차지하자, 임금은 복주로 옮겨 갔다.'),
        },
      },
      {
        id: 'a2-flee', type: 'say', fx: { word: '피란' },
        lines: [
          p('부부도 친척도 서로를 지켜 주지 못했다. 사람들은 동서로 흩어져 저마다 살길을 찾았다.', '夫婦親戚,不能相保, 東奔西竄, 各自逃生'),
          p('이생도 식구들과 함께 인적 드문 산벼랑 아래로 몸을 숨겼다.', '生挈家,隱匿窮崖'),
          g('피란길을 따라 걸어 보자. 이생이 앞서 간다.'),
        ],
      },
      {
        id: 'a2-cliff', type: 'say', scene: 'sc_act2_cliff',
        lines: [
          p('그런데 칼을 뽑아 든 도적 하나가 뒤를 쫓아왔다.', '有一賊, 拔劍而逐'),
          p('이생은 혼자 달음질쳐 빠져나갔다.', '生奔走得脫'),
          g('최 씨는 산벼랑 너머로 멀어지는 이생의 뒷모습을 보았다.'),
        ],
      },
      {
        id: 'a2-caught', type: 'say',
        lines: [g('도적이 앞을 가로막았다. 달아날 길이 없다.')],
      },
      { id: 'w2-bandit', type: 'wall' },
      {
        id: 'a2-rebuke', type: 'card', rebuke: true,
        card: {
          title: '최 씨의 꾸짖음', ...PS('女大罵曰'),
          body: '최 씨는 굽히지 않고 도적에게 호통을 쳤다. 목숨보다 절의를 무겁게 여긴 말이었다.',
          quote: w('寧死葬於豺狼之腹中, 安能作狗彘之匹乎?', '승냥이와 이리에게 먹혀 죽는 한이 있어도, 개돼지 같은 너의 짝이 되지는 않겠다!', 'choi'),
        },
      },
      {
        // 암전: 그림 자리 없음. 도적의 폭력은 이 한 줄뿐. 원문 카드는 눌러서 펼친다(fold).
        id: 'a2-dark', type: 'blackout', ...PS('賊怒, 殺而剮之'),
        t: '도적은 성이 나 최 씨의 목숨을 빼앗았다.',
        fold: true,
        quote: w('賊怒, 殺而剮之.', '도적은 분을 못 이겨 최 씨의 목숨을 끊고 살을 발라냈다.'),
      },
      {
        id: 'a2-era', type: 'card', mark: '해석', src: '게임 해석 카드(새로 씀)', status: ST,
        card: {
          title: '절의와 정절', mark: '해석', src: '게임 해석 카드(새로 씀)', status: ST,
          body: '절의와 정절은 최 씨가 살던 그 시대가 무엇보다 무겁게 여긴 가치였다. 최 씨의 꾸짖음을 그 시대의 눈과 오늘의 눈으로 함께 읽어 보자.',
        },
      },
      {
        id: 'a2-isaeng1', type: 'card',
        card: {
          title: '그 무렵 이생은', ...PS('生竄于荒野, 僅保餘軀'),
          body: '이생은 거친 들판 풀숲에 엎드려 숨은 덕에 목숨만은 건졌다.',
          quote: w('生竄于荒野, 僅保餘軀.', '이생은 황량한 들로 숨어들어, 간신히 제 한 몸만 건사했다.'),
        },
      },
      {
        id: 'a2-isaeng2', type: 'card', scene: 'sc_act2_ruin',
        card: {
          title: '불탄 집, 빈집', ...PS('聞賊已滅…鼠喞鳥喧'),
          body: '난리가 끝났다는 말을 듣고 이생은 먼저 부모의 집으로 가 보았다. 남은 것은 불탄 자리뿐이었다.\n최 씨의 집도 텅 비어 있었다. 쥐 소리와 새 소리만 들렸다.',
          quote: w('廊廡荒凉, 鼠喞鳥喧.', '행랑은 거칠고 쓸쓸한데, 쥐가 찍찍대고 새가 시끄럽게 울었다.'),
        },
      },
      {
        id: 'a2-isaeng3', type: 'card', scene: 'sc_act2_ruin', fx: { word: '꿈' },
        card: {
          title: '누각에서 홀로', ...PS('登于小樓, 收淚長噓…宛如一夢'),
          body: '이생은 작은 누각에 올라 울음을 삼키며 한숨만 쉬었다. 해가 지도록 그 자리를 떠나지 못했다. 함께 지낸 날들이 꿈결처럼 아득했다.',
          quote: w('佇思前遊, 宛如一夢.', '함께 거닐던 날들을 가만히 되새기니, 마치 꿈속의 일인 듯했다.'),
        },
      },
    ],
    summary: {
      title: '30초 요약 — 2막 「전란의 담」', scene: 'sc_act2_summary',
      lines: [
        p('1361년 홍건적이 개경을 차지했다. 이생 부부는 산벼랑으로 피란했지만, 도적이 쫓아오자 이생은 홀로 몸을 피했고 최 씨는 사로잡혔다.'),
        p('최 씨는 도적을 꾸짖으며 끝까지 뜻을 굽히지 않다가 목숨을 잃었다. 홀로 살아남은 이생은 텅 빈 최 씨 집 누각에서 탄식했다.'),
        p('그날 밤, 죽은 최 씨가 이생 앞에 다시 나타났다. 하늘이 잠시 몸을 빌려준 것이었다(환신). 최 씨는 재물을 묻은 곳과 부모의 유골이 버려진 곳을 알려 주었다.'),
      ],
    },
    // 폭력·죽음 장면에는 그림 자리를 두지 않는다(암전 a2-dark는 scene이 없다).
    scenes: {
      sc_act2_history: { caption: '1361년, 개경을 떠나는 피란 행렬', prompt_hint: 'Distant view of the Goryeo capital Gaegyeong under a smoky sky, long lines of refugees with bundles leaving through mountain passes, small figures, no fighting shown, muted colors, no text' },
      sc_act2_cliff: { caption: '산벼랑 피란길, 멀어지는 이생의 뒷모습', prompt_hint: 'A narrow mountain cliff path, a young scholar seen from behind running away into tall grass, a young woman standing alone looking after him; no weapons or violence visible, windy grey sky, no text' },
      sc_act2_ruin: { caption: '불탄 옛집과 텅 빈 누각', prompt_hint: 'A burned-down Korean house with charred beams and an empty overgrown mansion with a small pavilion at dusk, a lone scholar sitting in the pavilion with his head bowed, birds on the roof, no text' },
      sc_act2_summary: { caption: '전란과 피란(2막 요약)', prompt_hint: 'Picture-book composition of a war-torn landscape at dusk: smoke on the horizon, an empty mountain path, a small pavilion with faint moonlight; symbolic, no violence, no text' },
    },
  };
})();
