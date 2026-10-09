'use strict';
// 3막 「저승의 담」 — 세 구역: 최 씨 집(home), 재물 묻은 골짜기와 유골이 버려진 들(valley), 오관산 기슭(mountain).
//  흐름(spec 6절): 할 일 넷(tasks) — 재물 찾기·유골 수습·시 주고받기는 순서 자유(게임 설정), 장사는 재물·유골 뒤에만(원작의 인과)
//   → 장사 뒤 노복의 귀환과 이생의 두문불출(짧은 사건) · 보이지 않는 경계(border → 담 앞 w3-border, 몇 번이든)
//   → 넷을 마치고 경계를 한 번 이상 겪으면 → 마음 둔 곳(mind) → 어느 날 저녁(옥루춘 okru) → 이생의 제안(propose, w3-propose)
//   → epilogue.js(이별, 이생의 죽음 한 줄 + 암전, 맺음, 반복의 뜻).
//  때 딱지(time): 재회 이튿날 → 장사 뒤 → 서너 해 뒤. 할 일마다 그 일이 일어나는 때를 적는다(after: 마친 뒤 바뀌는 때).
//  맵 격자·사람 자리는 자리 표시(3막 작업이 고친다).
window.PLACES = window.PLACES || {};
(function () {
  const ST = '확인 전';
  const ORIG = '「이생규장전」 원문(위키문헌 「번역:금오신화」 李生窺牆傳)';
  const p = (t, basis, who) => Object.assign({ t, mark: '풀이', src: '「이생규장전」 ' + (basis || '줄거리') + '(새로 옮김)', status: ST }, who ? { who } : {});
  const g = (t, who, basis) => Object.assign({ t, mark: '게임 설정', src: '게임 설정' + (basis ? ' — 근거: ' + basis : ''), status: ST }, who ? { who } : {});
  const w = (han, ko, who) => Object.assign({ han, ko, mark: '원문', src: ORIG, status: ST }, who ? { who } : {});
  const i = (t) => ({ t, mark: '해석', src: '게임 해석(새로 씀)', status: ST });

  const mk = (wd, hgt, base, ops) => {
    if (window.G && G.world && G.world.mk) return G.world.mk(wd, hgt, base, ops);
    const gr = Array.from({ length: hgt }, () => Array(wd).fill(base));
    for (const [k, x, y, rw, rh, c] of ops || []) if (k === 'rect') for (let j = y; j < y + rh; j++) for (let i2 = x; i2 < x + rw; i2++) if (gr[j] && gr[j][i2] != null) gr[j][i2] = c;
    return gr.map((r) => r.join(''));
  };

  PLACES.act3 = {
    name: '3막 「저승의 담」', act: 'act3', year: '재회 이튿날',
    music: 'act3', cover: 'sc_act3_valley',
    map: 'home', spawn: [8, 6, 'down'],
    // 자리 표시 격자 셋. 구역 사이는 입구(gate) 하나로 잇는다.
    maps: {
      home: {
        name: '최 씨 집', grid: mk(16, 12, '.', [['rect', 0, 0, 16, 1, '#']]), spawn: [8, 6, 'down'],
        spots: {
          pavilion: { x: 11, y: 2, w: 3, h: 2, name: '작은 누각' },
          gate: { x: 7, y: 11, w: 2, h: 1, name: '골짜기로 가는 길', to: ['valley', 2, 5] },
        },
      },
      valley: {
        name: '골짜기와 들', grid: mk(24, 12, '.', []), spawn: [2, 5, 'right'],
        spots: {
          cache: { x: 6, y: 2, w: 2, h: 2, name: '골짜기 바위 밑' },
          field: { x: 12, y: 7, w: 3, h: 2, name: '버려진 들' },
          edge: { x: 23, y: 0, w: 1, h: 12, name: '들 끝', repeat: true },
          home: { x: 0, y: 5, w: 1, h: 2, name: '최 씨 집으로', to: ['home', 8, 10] },
          gate: { x: 11, y: 0, w: 2, h: 1, name: '오관산 기슭으로', to: ['mountain', 8, 10] },
        },
      },
      mountain: {
        name: '오관산 기슭', grid: mk(16, 12, '.', [['rect', 0, 0, 16, 2, '#']]), spawn: [8, 10, 'up'],
        spots: {
          grave: { x: 7, y: 4, w: 3, h: 2, name: '합장할 자리' },
          gate: { x: 7, y: 11, w: 2, h: 1, name: '골짜기로', to: ['valley', 11, 1] },
        },
      },
    },
    cast: {
      home: {
        isaeng: { who: 'isaeng', x: 12, y: 4, dir: 'down', talk: [[g('오늘은 무엇부터 할까요, 낭자?', 'isaeng')]] },
        // 장사를 마친 뒤에만 나타난다(3막 작업이 when을 단다)
        servant: { who: 'servant', x: 4, y: 8, dir: 'up', after: 'burial', talk: [[g('나리, 마님… 무사하셨군요. 저희도 돌아왔습니다.', 'servant', '幹僕之逃生者, 亦自來赴')]] },
      },
    },
    // 할 일 넷(spec 6-1). steps는 그 할 일을 마칠 때 펼치는 단계들.
    tasks: {
      treasure: { name: '재물 찾기', goal: '골짜기에서 묻어 둔 금은을 찾자', map: 'valley', spot: 'cache', time: '재회 이튿날', steps: ['t-treasure'] },
      bones: { name: '유골 수습', goal: '들에 버려진 두 집 부모님의 유골을 거두자', map: 'valley', spot: 'field', time: '재회 이튿날', steps: ['t-bones'] },
      poems: { name: '이생과 시 주고받기', goal: '작은 누각에서 이생과 시를 주고받자', map: 'home', spot: 'pavilion', time: '서너 해 뒤', steps: ['t-poems'] },
      burial: {
        name: '장사 지내기', goal: '오관산 기슭에 부모님을 합장하자', map: 'mountain', spot: 'grave', time: '재회 이튿날', after: '장사 뒤',
        need: ['treasure', 'bones'],
        locked: g('재물과 부모님의 유골을 먼저 찾아야 장사를 치를 수 있다.', null, '貿金賣財, 各合葬於五冠山麓'),
        steps: ['t-burial', 't-after'],
      },
    },
    times: ['재회 이튿날', '장사 뒤', '서너 해 뒤'],
    // 보이지 않는 경계: 몇 번이든 들어갈 수 있는 구역. 3막을 마치려면 한 번 이상 겪어야 한다.
    border: {
      wall: 'w3-border', map: 'valley', spot: 'edge',
      goal: '들 끝, 보이지 않는 경계까지 가 보자',
      nudge: g('(들 끝에 무언가 있다. 한 번 가 보자.)', 'choi'),
      leave: g('돌아선다. 남은 날에 할 일이 있다.'),
    },
    beats: [
      { id: 'b-morning', auto: true, steps: ['t-arrive'] },
      { id: 'b-tasks', auto: true, steps: ['t-tasks', 't-treasure', 't-bones', 't-poems', 't-burial', 't-after'] },
      { id: 'b-mind', auto: true, steps: ['t-mind'] },
      { id: 'b-evening', goal: '해 질 녘, 작은 누각의 이생에게 가자', talk: 'isaeng', steps: ['t-evening', 't-okru', 't-propose'] },
    ],
    steps: [
      {
        id: 't-arrive', type: 'say', scene: 'sc_act3_valley',
        lines: [
          p('이튿날, 두 사람은 최 씨가 말한 곳을 함께 찾아 나섰다.', '明日, 與生俱往尋瘞處'),
          g('할 일은 넷이다. 재물 찾기, 유골 수습, 시 주고받기는 어느 것부터 해도 된다. 장사는 재물과 유골을 찾은 뒤에 치를 수 있다.'),
          g('원작에서는 재물·유골·장사가 이튿날 차례로 이어지고, 시를 주고받은 것은 그 뒤 여러 해의 일이다. 순서를 자유롭게 한 것은 게임 설정이다.'),
        ],
      },
      { id: 't-tasks', type: 'tasks', list: ['treasure', 'bones', 'poems', 'burial'] },
      {
        id: 't-treasure', type: 'say', scene: 'sc_act3_treasure',
        lines: [
          p('골짜기 바위 밑의 흙을 헤치자, 묻어 둔 금은 덩이와 재물이 그대로 나왔다.', '果得金銀數錠及財物若干'),
          w('果得金銀數錠及財物若干.', '말한 그대로 금은 몇 덩이와 재물 약간이 나왔다.'),
        ],
      },
      {
        id: 't-bones', type: 'say', scene: 'sc_act3_field',
        lines: [
          p('들에 흩어진 두 집 부모님의 유골을 하나하나 정성껏 거두었다.', '又得收拾兩家父母骸骨'),
          w('又得收拾兩家父母骸骨.', '또 두 집 부모의 유골을 거둘 수 있었다.'),
        ],
      },
      {
        id: 't-poems', type: 'say', scene: 'sc_act3_poems',
        lines: [
          p('이생은 늘 최 씨와 마주 앉아, 한 사람이 시구를 지으면 다른 사람이 화답하며 지냈다.', '常與崔氏, 或酬或和'),
          w('常與崔氏, 或酬或和,', '늘 최 씨와 함께, 시를 지어 건네기도 하고 화답하기도 했다.'),
          p('두 사람의 금슬은 거문고와 비파처럼 잘 어울렸고, 어느덧 몇 해가 지났다.', '琴瑟偕和, 荏苒數年'),
        ],
      },
      {
        id: 't-burial', type: 'say', scene: 'sc_act3_burial',
        lines: [
          p('찾은 금은을 팔아 장례 비용을 마련하고, 두 집 부모를 오관산 기슭에 각각 합장했다. 봉분을 올리고 나무를 심고 제사를 지내며 예법을 빠짐없이 지켰다.', '貿金賣財, 各合葬於五冠山麓, 封樹祭獻, 皆盡其禮'),
          w('各合葬於五冠山麓, 封樹祭獻,', '각각 오관산 기슭에 합장하고, 봉분을 쌓고 나무를 심어 제사를 올렸다.'),
          i('부모가 살아 계실 때도, 돌아가신 뒤에도 예로 모시는 것. 그 시대 유교가 가르친 효였다.'),
          w('生事之以禮, 死葬之以禮.', '살아 계시면 예로 섬기고, 돌아가시면 예로 장사 지낸다(뒷날 이생이 옛사람의 말을 빌려 한 말).'),
        ],
      },
      {
        id: 't-after', type: 'say',
        lines: [
          p('이생은 다시 벼슬길에 나서지 않고 최 씨와 둘이 살았다. 난리 통에 흩어졌던 노복들도 하나둘 스스로 찾아왔다.', '其後, 生亦不求仕官…亦自來赴'),
          p('이생은 바깥일에 마음이 떠나, 친척이나 손님 집에 기쁜 일 궂은 일이 있어도 대문을 닫아 둔 채 찾아가지 않았다.', '懶於人事, 雖親戚賓客賀弔, 杜門不出'),
          w('雖親戚賓客賀弔, 杜門不出,', '친척과 손님의 축하나 조문이 있어도, 문을 닫고 나가지 않았다.'),
        ],
      },
      {
        id: 't-mind', type: 'mind',
        q: g('남은 날 가운데 어디에 마음을 가장 두었나?'),
        note: g('고른 것은 기록으로만 남는다. 옥루춘을 들을 때 떠오르는 장면이 달라진다.'),
        options: [
          { id: 'treasure', ...g('재물 찾기') },
          { id: 'rites', ...g('유골 수습과 장사') },
          { id: 'poems', ...g('이생과 시 주고받기') },
        ],
      },
      {
        id: 't-evening', type: 'say', scene: 'sc_act3_evening', year: '서너 해 뒤',
        lines: [
          p('어느 날 저녁, 최 씨가 이생에게 말했다.', '一夕, 女謂生曰'),
          w('三遇佳期, 世事蹉跎,', '세 차례나 기쁜 인연을 맞았지만, 세상일이 번번이 뜻대로 되지 않네요.', 'choi'),
          w('歡娛不厭, 哀別遽至.', '즐거움에 아직 물리지도 않았는데, 서러운 헤어짐이 성큼 다가왔어요.', 'choi'),
          p('무슨 까닭이오?', '生驚問曰', 'isaeng'),
          w('冥數不可躱也,', '저승이 정한 수명은 비켜 갈 수 없어요.', 'choi'),
          p('하늘이 잠시 몸을 빌려주었을 뿐이니, 이승에 오래 머물며 산 사람을 홀릴 수는 없다고 최 씨는 말했다.', '非久留人世, 以惑陽人'),
        ],
      },
      { id: 't-okru', type: 'okru' },
      { id: 't-propose', type: 'propose', wall: 'w3-propose' },
    ],
    summary: {
      title: '30초 요약 — 3막 「저승의 담」', scene: 'sc_act3_burial',
      lines: [
        p('재회 이튿날, 두 사람은 묻어 둔 재물을 찾고 두 집 부모의 유골을 거두어 오관산 기슭에 장사 지냈다. 그 뒤 서너 해를 시를 주고받으며 함께 살았다.'),
        p('어느 저녁 최 씨는 옥루춘을 부르며 이별을 알렸다. 이 세상에 남아 달라는 이생에게, 명부에 이름이 실려 머물 수 없다며 유해를 부탁하고 사라졌다.'),
        p('이생은 최 씨의 유골을 부모 곁에 묻고, 병을 얻어 몇 달 뒤 세상을 떠났다. 사람들은 두 사람의 절의를 우러렀다.'),
      ],
    },
    scenes: {
      sc_act3_valley: { caption: '재회 이튿날, 골짜기로 나서는 두 사람', prompt_hint: 'Morning in a quiet mountain valley after war, a young scholar and a softly glowing young woman walking side by side on a path through tall grass; hopeful light, no text' },
      sc_act3_treasure: { caption: '골짜기 바위 밑에서 찾은 금은', prompt_hint: 'Hands brushing earth away under a mossy rock in a valley, revealing a small wrapped bundle with silver and gold ingots; close-up, warm light, no text' },
      sc_act3_field: { caption: '들에서 부모님의 유골을 거두는 두 사람(멀리서)', prompt_hint: 'A wide autumn field seen from far away, two small figures kneeling respectfully with a white cloth bundle; solemn and calm, nothing gruesome visible, no text' },
      sc_act3_poems: { caption: '작은 누각에서 시를 주고받는 두 사람', prompt_hint: 'A small pavilion at evening, a young scholar and a softly glowing young woman sitting across a low table with brush, ink and poem papers, smiling; peaceful, no text' },
      sc_act3_burial: { caption: '오관산 기슭의 합장과 제사', prompt_hint: 'Two grave mounds at the foot of Ogwan mountain with newly planted trees, a simple ritual table with offerings, a scholar and a young woman bowing; respectful, quiet, no text' },
      sc_act3_evening: { caption: '어느 저녁, 옥루춘을 부르는 최 씨', prompt_hint: 'An evening pavilion lit by a lamp, a softly glowing young woman singing with tears while offering a cup of wine to a scholar, maid in the background; melancholic, no text' },
    },
  };
})();
