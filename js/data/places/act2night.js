'use strict';
// 2막 「전란의 담」(2) — 밤의 최 씨 집(행랑채, 낭하, 작은 누각). 학생은 최 씨의 혼으로 걷는다.
//  흐름(spec 5-3·5-4): 이경, 낭하의 발소리가 다가옴 → [혼(type:'hon')] 학생이 걷기 시작해야 잠긴 칸의 이름이 '혼'으로 드러나고
//   '전기적 요소' 표시와 짧은 설명, 이어 원문의 까닭(天帝…假以幻體)을 원문·풀이로 → 작은 누각의 이생에게 감 → 재회(교과서 본문 수준)
//   → 재물을 묻은 골짜기와 유골이 버려진 곳을 알려 줌(3막 실마리) → 막 끝 빈칸.
//  혼을 수단으로 쓰는 것과 혼으로 걷는 길은 '게임 설정'. 혼이 열리는 것은 꾸짖어 얻은 능력이 아니라 원작이 말하는 하늘의 허락이다.
//  낱말 카드: 환신(혼이 열릴 때).
window.PLACES = window.PLACES || {};
(function () {
  const ST = '확인 전';
  const ORIG = '「이생규장전」 원문(위키문헌 「번역:금오신화」 李生窺牆傳)';
  const p = (t, basis, who) => Object.assign({ t, mark: '풀이', src: '「이생규장전」 ' + (basis || '줄거리') + '(새로 옮김)', status: ST }, who ? { who } : {});
  const g = (t, who, basis) => Object.assign({ t, mark: '게임 설정', src: '게임 설정' + (basis ? ' — 근거: ' + basis : ''), status: ST }, who ? { who } : {});
  const w = (han, ko, who) => Object.assign({ han, ko, mark: '원문', src: ORIG, status: ST }, who ? { who } : {});

  const mk = (wd, hgt, base, ops) => {
    if (window.G && G.world && G.world.mk) return G.world.mk(wd, hgt, base, ops);
    const gr = Array.from({ length: hgt }, () => Array(wd).fill(base));
    for (const [k, x, y, rw, rh, c] of ops || []) if (k === 'rect') for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) if (gr[j] && gr[j][i] != null) gr[j][i] = c;
    return gr.map((r) => r.join(''));
  };
  // 자리 표시 격자(20×10): 서쪽 행랑채 → 가운데 낭하 → 동쪽 작은 누각. 2막 작업이 실제 집으로 바꾼다.
  const grid = mk(20, 10, '#', [['rect', 1, 4, 18, 2, '=']]);

  PLACES.act2night = {
    name: '2막 「전란의 담」 — 밤의 최 씨 집', act: 'act2', year: '그날 밤 이경',
    music: 'night', cover: 'sc_act2night_corridor',
    map: 'house', spawn: [2, 4, 'right'],
    maps: {
      house: {
        name: '밤의 최 씨 집', grid, spawn: [2, 4, 'right'],
        spots: {
          wing: { x: 1, y: 4, w: 3, h: 2, name: '행랑채', look: [g('행랑채는 비어 있다. 난리 뒤의 먼지가 쌓였다.', null, '廊廡荒凉')] },
          corridor: { x: 8, y: 4, w: 4, h: 2, name: '낭하' },
          pavilion: { x: 16, y: 4, w: 3, h: 2, name: '작은 누각' },
        },
      },
    },
    cast: {
      house: {
        isaeng: { who: 'isaeng', x: 17, y: 4, dir: 'left' },
      },
    },
    beats: [
      { id: 'b-steps', auto: true, steps: ['n-steps', 'n-hon'] },
      { id: 'b-meet', goal: '낭하를 따라 작은 누각의 이생에게 가자', talk: 'isaeng', steps: ['n-reunion', 'n-plea', 'n-accept', 'n-hints', 'n-night', 'n-blank'] },
    ],
    steps: [
      {
        id: 'n-steps', type: 'say', scene: 'sc_act2night_corridor',
        lines: [
          p('밤이 이경에 가까울 무렵, 엷은 달빛이 대들보에 어렸다.', '將及二更, 月色微吐, 光照屋梁'),
          w('漸聞廊下, 有跫然之音,', '낭하에서 사박사박 발소리가 조금씩 들려오기 시작했다.'),
          p('발소리가 한 걸음씩 누각 쪽으로 다가온다.', '自遠而近'),
        ],
      },
      {
        // 혼이 열리는 순간 = 전기적 요소. 학생이 걷기 시작한 뒤에 reveal을 보인다(규칙과 화면은 다른 작업).
        id: 'n-hon', type: 'hon', scene: 'sc_act2night_corridor', fx: { word: '환신' },
        mark: '게임 설정', src: '게임 설정 — 근거: 天帝…假以幻體', status: ST,
        walk: g('발소리의 주인은 너다. 낭하를 걸어 보자.'),
        reveal: {
          name: '혼', tag: '전기적 요소',
          explain: { t: '현실에서는 일어날 수 없는 기이한 사건을 전기적 요소라 한다. 전기 소설은 이런 사건으로 이야기를 펼친다.', mark: '해석', src: '갈래 설명(새로 씀)', status: ST },
        },
        reason: [
          w('天帝以妾與生, 緣分未斷,', '하늘의 임금께서 저와 낭군의 인연이 아직 다하지 않았다고 여기시고,', 'choi'),
          w('又無罪障, 假以幻體,', '지은 죄의 걸림도 없다 하시어, 잠시 머물 몸을 빌려주셨어요.', 'choi'),
        ],
        note: g('원작에서 최 씨는 이 까닭을 3막의 마지막 저녁에 털어놓는다. 게임은 혼이 열리는 이 자리에서 먼저 보인다.'),
        setting: g('혼을 수단으로 쓰는 것과 혼으로 걷는 이 길은 게임이 지은 설정이다. 혼은 꾸짖어 얻은 힘이 아니라 하늘이 허락한 것이다.'),
      },
      {
        id: 'n-reunion', type: 'say', scene: 'sc_act2night_reunion',
        lines: [
          p('작은 누각의 이생이 고개를 들었다. 다가온 사람은 바로 최 씨였다.', '至則崔氏也'),
          p('이생은 최 씨가 이미 죽은 것을 알았다. 그래도 사랑이 워낙 깊어 조금도 의심하지 않았다.', '生雖知已死, 愛之甚篤, 不復疑訝'),
          w('避於何處, 全其軀命?', '어디로 피해 목숨을 건졌소?', 'isaeng'),
        ],
      },
      {
        id: 'n-plea', type: 'say',
        lines: [
          p('최 씨는 이생의 손을 쥐고 목 놓아 울었다. 그러고는 그간의 일을 하나하나 들려주었다.', '女執生手, 慟哭一聲. 乃敍情曰'),
          p('저는 끝내 도적에게 몸을 맡기지 않았어요. 목숨보다 절의가 무거웠으니까요. 그러나 산벼랑에서 헤어진 뒤로 짝 잃은 새처럼 홀로 떠돌았어요.', '終不委身於豺虎…義重命輕…竟作分飛之匹鳥', 'choi'),
          p('이제 다시 돌아왔어요. 지난 맹세를 저버리지 않고, 끝까지 함께하고 싶어요.', '重契闊於此時, 期不負乎前盟', 'choi'),
          w('李郞其許之乎?', '낭군께서는 허락해 주시겠어요?', 'choi'),
        ],
      },
      {
        id: 'n-accept', type: 'say',
        lines: [
          w('固所願也.', '바라고말고요. 내 소원이 바로 그것이오.', 'isaeng'),
          p('이생은 기쁘고도 가슴이 벅찼다.', '生喜且感'),
        ],
      },
      {
        id: 'n-hints', type: 'say',
        lines: [
          p('도적에게 재물을 빼앗기지는 않았소?', '言及家産被寇掠有無', 'isaeng'),
          w('一分不失, 埋於某山某谷也.', '한 푼도 잃지 않았어요. 어느 산 어느 골짜기에 묻어 두었답니다.', 'choi'),
          p('두 집 부모님의 유골은 어디 있소?', '兩家父母骸骨安在', 'isaeng'),
          w('暴棄某處.', '어느 곳에 내버려진 채 있어요.', 'choi'),
          g('(내일 할 일이 정해졌다. 묻어 둔 재물을 찾고, 부모님의 유골을 거두자.)', 'choi', '3막 할 일의 실마리'),
        ],
      },
      {
        id: 'n-night', type: 'say',
        lines: [p('두 사람은 밤이 깊도록 그동안 쌓인 정을 나누었다.', '敍情罷')],
      },
      { id: 'n-blank', type: 'blank', act: 'act2' },
    ],
    scenes: {
      sc_act2night_corridor: { caption: '이경, 달빛 비친 낭하로 다가오는 발소리', prompt_hint: 'A long wooden corridor of a ruined Korean mansion at night, faint moonlight on the roof beams, a translucent pale silhouette of a young woman walking from far away, soft blue light; eerie but tender, no text' },
      sc_act2night_reunion: { caption: '작은 누각에서 다시 만난 두 사람', prompt_hint: 'A small pavilion at night, a young scholar rising in surprise as a pale, softly glowing young woman takes his hand; moonlight, tearful but gentle, modest, no text' },
    },
  };
})();
