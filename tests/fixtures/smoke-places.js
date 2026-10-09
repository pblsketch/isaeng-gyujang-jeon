'use strict';
// 엔진 틀 점검용 작은 거점 자료(tests/check-smoke.mjs가 타이틀이 뜬 뒤 page.addScriptTag로 넣는다).
//  실제 거점(js/data/places/*)과 상관없이 엔진만 본다: 실제 PLACES와 FLOW.order를 이 자료로 바꿔 끼운다.
//  - fx_walk: 걷기·말 걸기(목표가 화면 밖 → 가장자리 화살표, 가까이 → 은은한 빛)·사건 화면·고르기·한 줄 쓰기·등록되지 않은 단계
//  - fx_tasks: 순서 없는 할 일 넷(장사는 재물·유골 뒤에만 열림) + 몇 번이든 들어가는 경계 구역(세 번째에 마침 조건이 찬다)
//  - fx_empty: 비어 있는 거점('준비 중')
//  그다음은 결과 화면 틀이다.
(function () {
  window.__fx = { count: 0, wrote: null };
  // 경계 구역에 들어갈 때마다 하나씩 센다(되풀이 구역 점검)
  G.steps.register('fxCount', async function (step, ctx) {
    window.__fx.count++;
    await G.steps.lines(['보이지 않는 경계에 닿았다. (' + window.__fx.count + '번째)'], ctx);
  });
  // 한 줄 쓰기(화면 키보드 배치 점검): 빈칸이면 넘어가지 않는다
  G.steps.register('fxWrite', async function (step, ctx) {
    const v = await G.steps.writeLine(ctx, { q: '담 너머 그 사람에게 한 줄을 써 보자.', placeholder: '여기에 한 줄', done: '다 썼다', label: '한 줄 쓰기' });
    window.__fx.wrote = v;
  });

  const mk = G.world.mk;
  window.PLACES = {
    fx_walk: {
      name: '시험 정원', act: 'act1', map: 'fx_garden', year: '어느 봄날',
      maps: {
        fx_garden: {
          name: '정원', theme: 'village', spawn: [3, 8, 'right'],
          grid: mk(40, 12, '.', [['rect', 1, 1, 38, 1, 'h'], ['rect', 10, 6, 6, 1, ':'], ['dots', ',', [[12, 3], [13, 3], [20, 9]]], ['border', '#']]),
          props: [['pr_willow', 10, 3], ['pr_pavilion', 18, 4], ['pr_flowers', 24, 9]],
          spots: {
            swing: { x: 6, y: 7, w: 2, h: 2, name: '그네' },
            stone: { x: 2, y: 3, name: '돌', look: ['평평한 돌이다.'] },
          },
        },
      },
      cast: { fx_garden: { hyanga: { who: 'hyanga', x: 34, y: 6, dir: 'left', talk: [['아씨, 무슨 일이세요?']] } } },
      beats: [
        { id: 'b-talk', goal: '향아에게 말을 걸자', talk: 'hyanga', steps: ['s-hello'] },
        { id: 'b-swing', goal: '그네 쪽으로 가 보자', go: 'swing', steps: ['s-pick', 's-write', 's-later'] },
      ],
      steps: [
        { id: 's-hello', type: 'say', lines: [{ who: 'hyanga', t: '아씨, 담 너머에서 누가 시를 읊어요.' }, { t: '담 너머로 시 한 수가 들려왔다.', mark: '게임 설정' }] },
        { id: 's-pick', type: 'choice', q: '무엇으로 답할까?', options: [{ t: '말' }, { t: '시' }, { t: '결단' }] },
        { id: 's-write', type: 'fxWrite' },
        { id: 's-later', type: 'fxNotYet' }, // 등록되지 않은 단계 종류('준비 중'). 'wall'은 1막 작업이 등록했다
      ],
    },
    fx_tasks: {
      name: '시험 들판', act: 'act3', map: 'fx_fields',
      maps: {
        fx_fields: {
          name: '들판', theme: 'village', spawn: [8, 7, 'down'],
          grid: mk(32, 14, '.', [['rect', 2, 2, 5, 3, ':'], ['rect', 2, 9, 5, 3, 'e'], ['border', 'h']]),
          props: [['pr_tree', 12, 3], ['pr_tree', 20, 10]],
          spots: {
            treasure: { x: 4, y: 3, name: '골짜기' },
            bones: { x: 4, y: 10, name: '들' },
            burial: { x: 16, y: 6, name: '오관산 기슭' },
            border: { x: 29, y: 1, w: 2, h: 12, name: '경계' },
          },
        },
      },
      cast: { fx_fields: { isaeng: { who: 'isaeng', x: 10, y: 7, dir: 'left' } } },
      beats: [
        {
          id: 'b-tasks', goal: '남은 날의 할 일',
          tasks: [
            { id: 'treasure', at: 'treasure', steps: ['s-treasure'] },
            { id: 'bones', at: 'bones', steps: ['s-bones'] },
            { id: 'poems', talk: 'isaeng', steps: ['s-poems'] },
            { id: 'burial', at: 'burial', need: ['treasure', 'bones'], lockHint: ['재물과 유골을 먼저 거두어야 장사를 지낼 수 있다.'], steps: ['s-burial'] },
          ],
          repeat: [{ id: 'border', go: 'border', steps: ['s-border'], back: [26, 7, 'left'] }],
          finish: () => window.__fx.count >= 3,
          finishGoal: '보이지 않는 경계에 가 보자',
        },
      ],
      steps: [
        { id: 's-treasure', type: 'say', lines: ['묻어 둔 금은을 찾았다.'] },
        { id: 's-bones', type: 'say', lines: ['부모의 유골을 거두었다.'] },
        { id: 's-poems', type: 'say', lines: [{ who: 'isaeng', t: '시 한 구를 지어 보았소.' }] },
        { id: 's-burial', type: 'say', lines: ['오관산 기슭에 장사 지냈다.'] },
        { id: 's-border', type: 'fxCount' },
      ],
    },
    // fx_empty: 일부러 비워 둔다('준비 중')
  };
  window.FLOW.order = ['fx_walk', 'fx_tasks', 'fx_empty'];
  window.FLOW.places = Object.assign({}, window.FLOW.places, { fx_empty: { name: '빈 거점', act: 'act2' } });
})();
