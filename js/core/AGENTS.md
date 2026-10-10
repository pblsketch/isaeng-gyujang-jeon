# js/core — 엔진 바닥(공용 도구·저장·배경음·화면 부품·HUD)

형제 게임 「최척전」 엔진의 바닥을 가져와 줄인 것이다. `index.html`에서 맨 먼저 `util → save → audio → ui → hud` 차례로 실리고, 모두 `window.G`에 붙는다.

## 맡는 것

- `util.js` — `G.util`: 요소 만들기 `h('div.cls#id', attrs, …kids)`, `$`·`$$`, `esc`, `bold`/`boldNodes`(`**굵게**`와 줄바꿈), 받침 판정 `jong`과 조사 맞추기 `josa(낱말, '이 …')`(이/가·은/는·을/를·과/와·으로/로(ㄹ 받침은 로)·아/야·이여/여·이라/라), 글 속 자리 채우기 `T('{학생:이} …')`(자리 값은 `G.util.vars`), 씨앗 섞기 `shuffle`, 그림 찾기 `art(kind, id)`(`window.ART`와 거점 `scenes[id].img`만 본다), 인물 `person`·`who`·`pt`·`ptId`·`colorOf`·`playerId`(PEOPLE의 `player:true`, 없으면 `choi`).
- `save.js` — `G.save`: localStorage 열쇠 둘(`isaeng-gyujang:progress`, `isaeng-gyujang:settings`), 처음 값 `fresh()`, `load()`·`write()`·`reset()`·`started()`, 새 칸 더하기 `extend({ 칸: 처음 값 })`, 확정 칸 목록 `COMMITTED`, 되돌리기 칸 목록 `snapKeys`, 모양 점검 걸이 `valid`(규칙 파일이 단다).
- `audio.js` — `G.audio`: 배경음만. `play(장면 id)`(같은 곡이면 이어서, 이름이 없으면 멈춤), `music()`(설정 반영), `unlock()`(첫 손댐에 막힌 재생 다시 시도 — `main.js`가 pointerdown·keydown에 건다), 점검용 `now()`. `<audio>` 두 개를 번갈아 써서 1.2초 겹쳐 바꾼다.
- `ui.js` — `G.ui`: 알림 `toast`, 풍선 `pop`/`unpop`, 가운데 판 `sheet(content, buttons, { dismiss, cls })`(Promise로 누른 값), 트레이 채우기 `fillTray`, 글 칸 굴리기 `reveal`·`keepLast`·`snapRows`·`checkMore`, 움직임 줄이기 판정 `calm()`, `notReady`, 도장 `stamp`·`inkBurst`·`shake`, 카드 `card(c)`와 표시 칩 `tag(kind)`(`KIND`: orig 원문·history 역사·fiction 게임 설정·interp 해석·variant 이본 노트·note 알아 두기), 얼굴 `face(id)`, 한 줄 쓰기 칸 `writeField(o)`.
- `hud.js` — `G.hud`: 구석 HUD(왼쪽 위 얼굴·곳·때 딱지, 가운데 위 막 미션과 지금 할 일, 오른쪽 위 도구 단추), 사건 모드의 위쪽 띠, 얻은 것 알림 `got(kind, name, desc)`/`announce`, `goal`·`where(name, year)`·`setPlace`·`mission`·`tools`·`refresh`·`els()`.

## 맡지 않는 것

- 게임 규칙(담 높이, 반응 겹, 혼, 빈칸, 할 일, 바로가기)은 이 폴더에 두지 않는다. 확정 칸 이름과 모양 점검의 내용은 규칙 파일(`js/game/rules.js`)이 정하고 여기 `COMMITTED`·`valid`에 단다.
- 화면 흐름·사건 화면·지도는 `js/game/`의 일이다. 이 폴더는 `G.app`·`G.rules`를 부르지 않는다. 예외는 하나: `ui.face`가 인물 도트 그림이 있을 때만 `G.world.spriteFace`를 있는지 확인한 뒤 부른다. HUD의 도구 단추는 `G.app`이 `hud.tools`로 넘겨준 것을 그리기만 한다.
- 이야기 글은 `js/data/`의 일이다. 여기 있는 글은 대체 글('준비 중', '닫기', 저장이 안 될 때의 안내)뿐이다.

## 지켜야 할 것

- **저장 열쇠는 둘뿐이고 모두 `isaeng-gyujang:`로 시작한다.** 같은 출처에 형제 게임이 올라갈 수 있으므로 머리말 없는 열쇠를 만들거나 다른 열쇠를 지우지 않는다(`localStorage.clear()` 금지).
- **설정 칸(`font`·`music`·`motion`)은 `settings` 열쇠에, 나머지는 모두 `progress` 열쇠에** 쓴다. `reset()`은 진행과 이름만 지우고 설정을 남긴다.
- **진행이 없으면 `progress`를 만들지 않는다**: `write()`는 `started()`가 거짓이고 이름도 없으면 `progress`를 지운다(타이틀에서 설정만 바꿔도 '이어 하기'가 뜨지 않게).
- **깨진 기록은 처음부터**: `load()`는 JSON이 깨졌거나 `valid(o)`가 거짓이면 조용히 `fresh()`로 시작한다. 오류를 던지거나 콘솔 오류를 내지 않는다. localStorage를 못 쓰는 브라우저에서는 저장 없이 돈다.
- **`snapKeys`에 확정 칸을 넣지 않는다.** 지금 `snapKeys`는 `flags`(+ 규칙 파일이 더하는 `applied`)뿐이다. 반응을 본 시도·고른 것은 `COMMITTED`에 있고 단계 도중 새로고침에도 되돌리지 않는다.
- **소리는 배경음만**: 효과음·누름 소리·합성 음악·낭송을 더하지 않는다. 곡이 목록에 없거나 파일을 못 읽으면(`onerror`) 그 곡을 실패로 표시하고 조용히 소리 없이 간다. 브라우저가 손대기 전 재생을 막는 것은 오류가 아니다(다음 손댐에 다시).
- **한 줄 쓰기 칸**: `writeField`는 포커스가 칸 안에 있고 보이는 화면(`visualViewport`) 높이가 420px 이하이면 칸 전체를 보이는 화면 맨 아래에 붙인다(`.wf-docked`). `required`(기본)면 빈칸으로 마치지 못하고 안내를 보인다. 칸·단추는 44px 이상, Tab 차례는 입력 칸 → 완료.
- **굴리기는 `reveal`로**: 요소를 담은 글 칸(overflow가 auto/scroll인 가장 가까운 조상)만 굴린다. `scrollIntoView`는 놀이 화면 틀까지 굴려 HUD를 자르므로 쓰지 않는다.
- **그림 요청**: `art()`는 목록에 있는 그림만 돌려준다. 없는 파일을 부르면 404가 콘솔 오류가 되므로, 목록에 없으면 `null`을 돌려받고 대신 그린다(빈 종이 판, 이름 첫 글자 동그라미, `colorOf` 색).
- **HUD에 점수·게이지 칸을 두지 않는다.**
- 이 폴더의 글자(주석 포함)도 부분 글꼴에 들어간다. 원본 글꼴에 없는 기호(✎ ▸ ✕ 등)를 쓰지 않는다.

## 이 폴더의 방식

- 파일마다 즉시 실행 함수 하나로 감싸고 `G.이름 = {}`에 붙인다. 다른 파일이 부를 것만 붙이고 나머지는 함수 안에 둔다.
- 게임 규칙이 새 저장 칸을 쓰면 `save.js`의 `base()`에 적거나, 규칙 파일에서 `G.save.extend({ 칸: 처음 값 })`으로 더한다(이미 불러온 기록에 그 칸이 없으면 처음 값이 들어간다). 확정 칸이면 `COMMITTED`에도 넣는다.
- 글은 `G.util.T`를 거쳐 그린다(자리 채우기). 사람 글은 `boldNodes`로 `**굵게**`와 줄바꿈을 살린다. HTML 문자열을 그대로 넣지 않는다(`esc`).
- 크기는 rem, 움직임은 CSS 쪽에 두어 글자 크기 3단계와 움직임 줄이기가 저절로 따르게 한다. JS로 움직이는 것은 `G.ui.calm()`을 보고 줄인다.

## 점검

- `node tests/run-all.mjs smoke` — 타이틀·설정(글자 크기·배경음·움직임)·쓰기 칸과 화면 키보드(낮은 높이)·44px·콘솔 오류·바깥 요청·저장 열쇠 머리말·처음부터.
- `node tests/run-all.mjs rules` — 저장 모양 점검(깨진 기록이면 처음부터), 확정 칸이 되돌리기에 지워지지 않음.
- `node tests/run-all.mjs flow` — 곡 파일을 막거나 소리를 끈 판에서도 끝까지, 거점별 곡 배정, 다시 열기.
- 바꾼 뒤 꼭 볼 가장자리: localStorage를 막은 브라우저, 깨진 JSON이 든 `progress`, 설정만 바꾸고 다시 연 타이틀, 가로 높이 360px에서 쓰기 칸에 포커스.
