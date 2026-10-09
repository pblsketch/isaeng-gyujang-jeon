'use strict';
// 담 앞 순간·빈칸 화면 점검용 작은 거점(tests/check-act1.mjs가 타이틀이 뜬 뒤 page.addScriptTag로 넣는다).
//  1막에서 쓰지 않는 꼴을 실제 자료(WALLS·CARDS·FINALE)로 본다. 맵 없는 거점이라 단계가 사건 화면에서 차례로 펼쳐진다.
//  - fx-border: 통과가 없는 순간(w3-border). 혼이 잠겨 있으면 이름 없는 잠긴 칸, 같은 수단 두 번 → 다른 반응, 두 번째 실패부터 실마리, '돌아서기'로 떠남
//  - fx-border-open: 혼이 열린 뒤 같은 순간(칸 이름이 '혼'으로 보임). 바로 돌아선다
//  - fx-propose: 답 고르기 꼴(w3-propose). 고르기 앞 together 대화, '함께 가자' 단추 없음, '남겠다' → 반응·담이 높아짐 → 다시 고름
//  - fx-repeat: 3막 끝 빈칸(표 전체 + '반복의 뜻' 한 문장, 필수)
(function () {
  window.PLACES = Object.assign({}, window.PLACES, {
    fx_walls: {
      name: '시험 담', act: 'act3',
      steps: [
        { id: 'fx-border', type: 'wall', wall: 'w3-border' },
        { id: 'fx-border-open', type: 'wall', wall: 'w3-border' },
        { id: 'fx-propose', type: 'propose', wall: 'w3-propose' },
        { id: 'fx-repeat', type: 'blank', act: 'act3' },
      ],
    },
  });
  window.FLOW.order = ['fx_walls'];
  window.FLOW.places = Object.assign({}, window.FLOW.places, { fx_walls: { name: '시험 담', act: 'act3' } });
})();
