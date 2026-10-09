'use strict';
// 시작: 저장 불러오기 → 규칙 걸기 → 설정 적용·세로 안내 → 주소 바로가기 → 타이틀
//  바로가기는 G.boot.routes에 더한다(흐름·규칙 작업이 ?act=1|2|3을 여기에 단다):
//   G.boot.routes.push((q, st) => { if (q.get('act')) { …; return true; } return false; })
//   (true를 돌려주면 그 바로가기가 화면을 맡고 타이틀은 띄우지 않는다)
//  선생님 모드·장면 건너뛰기 같은 주소는 없다(spec 14절).
(function () {
  const boot = (G.boot = { routes: [] });
  G.save.load();
  if (G.rules && G.rules.attach) G.rules.attach();
  G.app.applySettings();
  G.app.watchOrientation();
  // 손댈 때마다 소리를 풀어 준다(막혔던 배경음을 이때 다시 튼다)
  document.addEventListener('pointerdown', () => G.audio.unlock(), { passive: true });
  document.addEventListener('keydown', () => G.audio.unlock());
  const q = new URLSearchParams(location.search);
  // 바로가기 ?act=1|2|3(spec 14절): 그 막의 타이틀(저장 기록이 있으면 '이어 하기 / 이 막부터', 없으면 그 막에서 바로 시작).
  //  다른 값이면 보통 타이틀. 선생님 모드·장면 건너뛰기 같은 주소는 없다.
  boot.routes.push((q0) => {
    const n = Number(q0.get('act'));
    if (![1, 2, 3].includes(n)) return false;
    G.app.title({ act: n });
    return true;
  });
  // 다른 파일이 바로가기를 더할 틈을 준 뒤(같은 차례로 실린 스크립트가 모두 끝난 다음) 시작한다
  const go = () => {
    for (const r of boot.routes) { try { if (r(q, G.save.state)) return; } catch (e) { console.error(e); } }
    G.app.title();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go, { once: true });
  else go();
})();
