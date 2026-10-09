'use strict';
// 인물(선생님이 고쳐도 되는 파일)
//  - id: 거점 파일의 대사 { who:'isaeng', t:'…' }와 사람 배치 { who:'hyanga', … }에 쓰는 이름
//  - name: 화면에 보이는 이름 · color: 말풍선 이름 색, 그림이 없을 때 대신 그리는 사람 모양·얼굴 동그라미 색
//  - sp: 맵에서 쓰는 도트 인물 자리(js/data/sprites.js — 지금은 그림 없이 단색 사람 모양) · pt: 초상 그림 자리(그림이 생기면 window.ART.pt)
//  - player: true인 사람이 학생이 맡는 인물(최 씨) · looks: 모습이 여러 벌인 인물의 { 도트 id: 초상 id }(예: 2막 밤의 혼)
//  - role: 누구인가(인물 설명 글은 글 자료 작업이 채울 수 있다)
//  이생의 아버지는 서술로만 나온다(대사 줄의 who로 쓸 수는 있지만 맵에 세우지 않는다).
window.PEOPLE = Object.assign(window.PEOPLE || {}, {
  choi: { name: '최 씨', player: true, sp: 'sp_choi', pt: 'pt_choi', color: '#b3342a', role: '학생이 맡는 인물. 송도에 사는 최씨 집안의 딸', looks: { sp_choi: 'pt_choi', sp_choi_hon: 'pt_choi_hon' } },
  isaeng: { name: '이생', sp: 'sp_isaeng', pt: 'pt_isaeng', color: '#36548f', role: '송도의 젊은 선비. 최 씨와 함께 움직이는 인물' },
  hyanga: { name: '향아', sp: 'sp_hyanga', pt: 'pt_hyanga', color: '#2f6b45', role: '최 씨의 몸종' },
  choi_father: { name: '최 씨 아버지', sp: 'sp_choi_father', pt: 'pt_choi_father', color: '#6d5a2a', role: '최 씨의 아버지' },
  choi_mother: { name: '최 씨 어머니', sp: 'sp_choi_mother', pt: 'pt_choi_mother', color: '#8a5a6a', role: '최 씨의 어머니' },
  isaeng_father: { name: '이생의 아버지', sp: null, pt: null, color: '#4a5a6a', role: '이생의 아버지. 서술로만 나온다' },
  maepa: { name: '매파', sp: 'sp_maepa', pt: 'pt_maepa', color: '#8a6a2a', role: '혼인을 맺어 주는 중매인' },
  servant: { name: '노복', sp: 'sp_servant', pt: 'pt_servant', color: '#5a4a3a', role: '난리 뒤 돌아오는 집안 종' },
  bandit: { name: '도적', sp: 'sp_bandit', pt: null, color: '#4a3a3a', role: '홍건적. 위협은 서술 한 줄로만 다룬다' },
});
