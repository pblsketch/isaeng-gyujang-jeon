'use strict';
// 1막 「부모의 담」 — 최 씨 집 정원 한 판(북쪽 담과 버드나무, 누각, 꽃밭, 그네). 돌아다니기는 거의 없고 장면이 이어진다.
//  흐름(원문 순서): 이생이 담 안을 엿봄 → 최 씨가 턱을 괴고 시를 읊음 → 이생이 시를 써 던짐
//   → [조작 익히기: 그네 쪽으로 걷기 → 향아에게 말 걸기] → 담 앞 w1-poem(시에 답하기, 여덟 글자) → 그넷줄로 담을 넘게 함
//   → "밤마다 몰래 만났다" 한 줄 → 아버지가 알고 울주로 보냄 → 향아를 시켜 물음 → 앓아누움 → 부모가 시를 찾아냄
//   → 담 앞 w1-parents → 중매와 이 씨 집의 두 번 거절, 최 씨 집의 고집 → 혼인 → 급제 → 막 끝 빈칸.
//  낱말 카드는 단계의 fx.word로 저절로 얻는다: 담장(그넷줄) · 울주(아버지) · 혼인(혼례) · 과거 급제(급제).
//  맵 격자와 사람 자리는 자리 표시다(1막 작업이 고친다). 엔진 없이 읽혀도 격자가 만들어지게 mk를 대신한다.
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

  // 자리 표시 격자(20×12): 맨 위 줄이 북쪽 담. 1막 작업이 실제 정원으로 바꾼다.
  const grid = mk(20, 12, '.', [['rect', 0, 0, 20, 1, '#']]);

  PLACES.act1 = {
    name: '1막 「부모의 담」', act: 'act1', year: '고려 말',
    music: 'garden', cover: 'sc_act1_wall',
    map: 'garden', spawn: [10, 8, 'up'],
    maps: {
      garden: {
        name: '최 씨 집 정원', grid, spawn: [10, 8, 'up'],
        spots: {
          swing: { x: 4, y: 3, w: 2, h: 2, name: '그네' },
          wallfoot: { x: 8, y: 1, w: 3, h: 1, name: '북쪽 담 밑' },
          pavilion: { x: 14, y: 3, w: 3, h: 3, name: '작은 누각' },
          flowers: { x: 9, y: 6, w: 3, h: 2, name: '꽃밭', look: [g('온갖 꽃이 한창이다. 벌 소리, 새 소리가 시끄럽다.', null, '名花盛開, 蜂鳥爭喧')] },
        },
      },
    },
    cast: {
      garden: {
        hyanga: { who: 'hyanga', x: 7, y: 2, dir: 'down', talk: [[g('아씨, 무슨 일이든 저를 부르세요.', 'hyanga')]] },
      },
    },
    beats: [
      { id: 'b-peek', auto: true, inline: true, steps: ['a1-peek', 'a1-recite', 'a1-toss'] },
      { id: 'b-walk', goal: '그네 쪽으로 몇 걸음 걸어 보자', go: 'swing', inline: true, steps: ['a1-walk'] },
      { id: 'b-hyang', goal: '향아에게 말을 걸어 보자', talk: 'hyanga', steps: ['a1-paper'] },
      { id: 'b-answer', auto: true, steps: ['w1-poem', 'a1-eight', 'a1-swing', 'a1-nights'] },
      { id: 'b-father', auto: true, steps: ['a1-father', 'a1-wait'] },
      { id: 'b-ask', goal: '향아에게 그 사람 소식을 알아봐 달라고 하자', talk: 'hyanga', steps: ['a1-ask'] },
      { id: 'b-ill', auto: true, steps: ['a1-ill', 'w1-parents', 'a1-vow', 'a1-match', 'a1-wed', 'a1-exam', 'a1-blank'] },
    ],
    steps: [
      {
        id: 'a1-peek', type: 'say', scene: 'sc_act1_wall',
        lines: [
          p('국학에 다니던 이생의 길은 늘 최 씨 집 앞을 지났다. 그는 북쪽 담 밖, 줄지어 선 버드나무 그늘에서 쉬어 가곤 했다.', '李生嘗挾冊詣學…憩於其下'),
          p('어느 날 그는 담 너머를 엿보았다. 정원 가득 꽃이 피어 벌이 붕붕대고 새가 지저귀었고, 꽃떨기 사이로 작은 누각이 언뜻 비쳤다.', '一日窺牆內…隱映於花叢之間'),
          { t: '‘이생규장전’은 ‘이생이 담 안을 엿본 이야기’라는 뜻이다(窺 엿볼 규, 墻 담 장).', mark: '풀이', src: '작품 제목 李生窺牆傳 풀이(새로 씀)', status: ST },
          g('그 누각에 최 씨가 있다. 이제부터 최 씨는 바로 너다.'),
        ],
      },
      {
        id: 'a1-recite', type: 'say', scene: 'sc_act1_pavilion',
        lines: [
          p('수를 놓던 최 씨는 바늘을 멈추고 턱을 괸 채 시를 읊었다.', '倦繡停針, 支頥而吟'),
          w('獨倚紗窓刺繡遲, 百花叢裏囀黃鸝.', '비단 창에 홀로 기대어 수놓는 손이 더딘데, 온갖 꽃 사이에서 꾀꼬리가 지저귀네.', 'choi'),
          w('路上誰家白面郞, 靑衿大帶映垂楊.', '길 위의 저 고운 도령은 뉘 집 사람일까. 푸른 깃 넓은 띠가 늘어진 버들 사이로 비치네.', 'choi'),
          w('何方可化堂中燕, 低掠珠簾斜度墻.', '어찌하면 집 안의 제비가 되어, 구슬발을 스치고 비스듬히 담을 넘어갈까.', 'choi'),
        ],
      },
      {
        id: 'a1-toss', type: 'say',
        lines: [
          p('담 밖의 이생이 그 시를 들었다. 그러나 대문은 높고 안채는 깊어, 서운한 마음으로 돌아섰다.', '生聞之…但怏怏而去'),
          p('돌아오는 길에 그는 흰 종이에 시 세 수를 적어 기와 조각에 매달아 담 안으로 던졌다.', '還時以白紙一幅, 作詩三首, 繫瓦礫投之'),
        ],
      },
      {
        id: 'a1-walk', type: 'say',
        lines: [g('그넷줄이 바람에 흔들린다. 담 밑에서 향아가 무언가를 주워 들고 손짓한다.')],
      },
      {
        id: 'a1-paper', type: 'say',
        lines: [
          g('아씨, 담 너머에서 이게 날아왔어요. 아까 버드나무 아래 계시던 그 선비님 같아요.', 'hyanga', '命侍婢香兒, 往取見之'),
          p('최 씨는 시를 두 번 세 번 거듭 읽었다. 마음속으로 기뻤다.', '披讀再三, 心自喜之'),
        ],
      },
      { id: 'w1-poem', type: 'wall' },
      {
        id: 'a1-eight', type: 'card',
        card: {
          title: '최 씨가 던진 여덟 글자', mark: '풀이', src: '「이생규장전」 以片簡, 又書八字, 投之(새로 옮김)', status: ST,
          body: '최 씨는 작은 종이쪽에 여덟 글자만 적어 담 너머로 던졌다.',
          quote: w('將子無疑, 昏以爲期.', '그대여, 의심하지 마세요. 해 질 녘을 만날 때로 정해요.'),
        },
      },
      {
        id: 'a1-swing', type: 'say', scene: 'sc_act1_swing', fx: { word: '담장' },
        lines: [
          p('해 질 녘, 이생이 담 밑에 이르자 복사꽃 한 가지가 담 위로 흔들거렸다.', '乘昏而往, 忽見桃花一枝, 過墻而有搖裊之影'),
          p('다가가 보니 그넷줄에 대바구니를 매어 늘어뜨려 두었다. 이생은 그 줄을 붙잡고 담을 넘었다.', '以鞦韆絨索, 繫竹兜下垂. 生攀緣而踰'),
          g('담 하나를 넘었다.'),
        ],
      },
      {
        id: 'a1-nights', type: 'say',
        lines: [p('그 뒤로 두 사람은 밤마다 몰래 만났다.', '生自是以後, 無已不往')],
      },
      {
        id: 'a1-father', type: 'say', scene: 'sc_act1_father', fx: { word: '울주' },
        lines: [
          p('어느 저녁, 이생의 아버지가 아들을 불러 세웠다.', '一夕, 李生之父, 問曰'),
          w('昏出而曉還, 當爲何事?', '해 질 녘에 나가 새벽에야 돌아오니, 대체 무슨 짓을 하는 게냐?', 'isaeng_father'),
          w('速去嶺南, 率奴隷監農,', '당장 영남으로 내려가 종들을 거느리고 농사일이나 살펴라.', 'isaeng_father'),
          p('이튿날, 이생은 울주로 쫓겨 갔다.', '卽於翌日, 謫送蔚州'),
        ],
      },
      {
        id: 'a1-wait', type: 'say',
        lines: [p('최 씨는 저녁마다 정원에서 기다렸다. 그러나 몇 달이 지나도 이생은 오지 않았다.', '女每夕, 於花園待之, 數月不還')],
      },
      {
        id: 'a1-ask', type: 'say',
        lines: [
          g('향아야, 그분 이웃에 가서 무슨 일이 있는지 몰래 알아봐 주렴.', 'choi', '命香兒, 密問於李生之鄰'),
          g('다녀왔어요, 아씨. 이웃 사람이 이렇게 말했어요.', 'hyanga'),
          w('得罪於家君, 去嶺南,', '아버님께 죄를 지어 영남으로 내려갔다오.'),
        ],
      },
      {
        id: 'a1-ill', type: 'say', scene: 'sc_act1_ill',
        lines: [
          p('최 씨는 그만 자리에 눕고 말았다. 물 한 모금 넘기지 못하고, 말은 두서가 없어지고, 몸은 날로 야위었다.', '臥疾在床…肌膚憔悴'),
          p('부모가 까닭을 물어도 최 씨는 입을 열지 않았다.', '問其病狀, 喑喑不言'),
        ],
      },
      { id: 'w1-parents', type: 'wall' },
      {
        id: 'a1-vow', type: 'say',
        lines: [
          w('誓不登他門也.', '맹세코 다른 집 문턱은 넘지 않겠어요.', 'choi'),
          p('부모는 딸의 뜻을 알았다. 더는 병을 캐묻지 않고, 달래고 타이르며 마음을 놓게 했다.', '於是, 父母已知其志…以寬其心'),
        ],
      },
      {
        id: 'a1-match', type: 'card',
        lines: [
          p('최 씨 집은 매파를 보내 이 씨 집에 혼인을 청했다.', '復修媒妁之禮, 問于李家'),
          p('이 씨 댁에서는 아드님이 아직 어리고 공부에 힘쓸 때라, 혼인을 서두를 생각이 없다 하옵니다.', '不願速求婚媾也', 'maepa'),
        ],
        card: {
          title: '두 번 거절당한 혼담', mark: '풀이', src: '「이생규장전」 매파가 오가는 대목(새로 옮김)', status: ST,
          body: '최 씨 집은 다시 청했다. 이 씨 집은 또 거절했다. 가난한 선비 집안이 큰 집안과 짝할 수 없다는 것이었다.\n최 씨 집은 물러서지 않았다. 혼례 채비는 모두 맡을 테니 좋은 날만 받자고 거듭 청했다.',
          quote: w('宜差穀旦,以定花燭之期.', '좋은 날을 가려 혼례 날짜를 정합시다.'),
        },
      },
      {
        id: 'a1-wed', type: 'say', scene: 'sc_act1_wedding', fx: { word: '혼인' },
        lines: [
          p('마침내 이 씨 집도 마음을 돌렸다. 길일을 받아 두 사람은 혼례를 올렸다.', '李家至是, 稍回其意…擇吉日, 遂定婚禮'),
          w('夫婦愛而敬之, 相待如賓,', '부부는 서로 아끼고 받들어, 귀한 손님을 대하듯 예를 지켰다.'),
        ],
      },
      {
        id: 'a1-exam', type: 'say', fx: { word: '과거 급제' },
        lines: [p('이듬해 이생은 과거에 급제해 높은 벼슬에 올랐고, 그 이름이 조정에 알려졌다.', '生翌年, 捷高科, 登顯仕, 聲價聞于朝著')],
      },
      { id: 'a1-blank', type: 'blank', act: 'act1' },
    ],
    // 바로가기(?act=2·3)로 이 막을 건너뛸 때 보이는 30초 요약 카드
    summary: {
      title: '30초 요약 — 1막 「부모의 담」', scene: 'sc_act1_summary',
      lines: [
        p('송도의 선비 이생이 최 씨 집 담 안을 엿보았다. 두 사람은 담 너머로 시를 주고받았고, 최 씨가 “의심 말고 해 질 녘에 오세요”라고 답해 둘은 만났다.'),
        p('이생의 아버지가 이를 알고 아들을 울주로 보냈다. 앓아누운 최 씨는 부모에게 모두 털어놓고, 이생이 아니면 다른 집에 가지 않겠다고 했다.'),
        p('최 씨 집안이 거듭 청한 끝에 두 사람은 혼인했고, 이생은 이듬해 과거에 급제했다.'),
      ],
    },
    scenes: {
      sc_act1_wall: { caption: '버드나무 아래에서 담 안을 엿보는 이생', prompt_hint: 'A young Korean scholar under weeping willows peeking over a long earthen garden wall with tiled coping; inside, a garden in full bloom and a small pavilion half hidden by flowers; spring afternoon, no text' },
      sc_act1_pavilion: { caption: '누각에서 수를 놓다 턱을 괸 최 씨', prompt_hint: 'A young Goryeo noblewoman in a small garden pavilion, embroidery frame in front of her, resting her chin on her hand and gazing outside, bead curtain half rolled up, flowers and orioles; quiet and gentle, no text' },
      sc_act1_swing: { caption: '해 질 녘, 담 위로 늘어뜨린 그넷줄과 대바구니', prompt_hint: 'Dusk at a garden wall, a branch of peach blossoms swaying over the wall, a swing rope with a small bamboo basket hanging down the outside of the wall, moon rising; romantic but modest, no people embracing, no text' },
      sc_act1_father: { caption: '아들을 꾸짖는 이생의 아버지(뒷모습)', prompt_hint: 'Interior of a modest scholar house at night, an older father seen from behind standing stiffly, a young son bowing his head, an oil lamp; tense but restrained, no text' },
      sc_act1_ill: { caption: '병석의 최 씨와 상자에서 나온 시', prompt_hint: 'A young woman lying ill under a quilt in a women\'s quarters, her worried parents kneeling beside her, an open lacquered box with folded poem papers; soft lamplight, no text' },
      sc_act1_wedding: { caption: '두 집안의 혼례', prompt_hint: 'A Goryeo-era wedding ceremony in a courtyard, bride and groom bowing to each other across a table with ceremonial items, family members watching; bright and festive, no text' },
      sc_act1_summary: { caption: '담 너머로 오가는 시와 혼례(1막 요약)', prompt_hint: 'Two-panel picture-book composition: left, a poem paper flying over a garden wall between a scholar and a young woman; right, the same couple at a wedding; warm tones, no text' },
    },
  };
})();
