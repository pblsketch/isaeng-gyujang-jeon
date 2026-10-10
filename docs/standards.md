# 규칙

## 완료 관문

- **완료는 `node tests/run-all.mjs` 종료 0이다.** 점검 13개(`tests/check-*.mjs`)가 모두 통과해야 한다. 점검을 지우거나 기대값을 실제 결과에 맞춰 고쳐서 통과시키지 않는다. 점검 기대값을 바꿔야 하는 변경(예: 글 상태 `확인됨` 허용)은 그 까닭을 사용자에게 알리고 바꾼다.
- `js/data/`의 글이나 엔진 자료(`flow`·`texts`·`notes`·`people`·`credits`·`bgm`)의 글이 바뀌면 같은 변경 안에서 `node tools/review-doc.mjs`로 글 확인 문서를 다시 만든다. 다시 만든 결과와 한 글자라도 다르면 글 확인 문서 점검이 실패한다. 글 확인 문서를 손으로 고치지 않는다.
- `js/**`·`css/**`·`index.html`에 새 글자(주석 안 글자 포함)가 생기면 같은 변경 안에서 `python tools/build_fonts.py`로 부분 글꼴을 다시 만든다. 글꼴에 없는 글자가 하나라도 있으면 글꼴 점검이 실패한다.

## 의존성과 구조

- 게임은 빌드 없는 정적 파일이다. 번들러·트랜스파일러·npm 런타임 의존성·ES 모듈(`import`/`type="module"`)을 들이지 않는다. 점검 도구의 의존성은 Playwright 하나이고 새로 설치하지 않는다(`tests/node_modules`는 형제 게임 설치본으로 가는 연결).
- **스크립트 차례는 `index.html` 하나가 정한다**: core → 엔진(steps·rules·tiles·world·app) → 화면(wall·blank·hon·tasks·okru·finale·result) → 자료 → 거점 → `main.js`. 새 파일은 이 차례의 알맞은 자리에 더한다. 엔진·화면 파일은 자료 전역을 실릴 때 읽지 않고 불릴 때 읽는다(자료가 뒤에 실리므로 실릴 때는 아직 없다).
- **자료 파일은 엔진 없이도 실행되어야 한다.** 점검과 글 확인 도구가 자료 파일을 Node `vm`에서 `window`만 있는 맥락으로 실행한다. 자료 파일 안에서 `G`를 쓰려면 있는지 먼저 보고(`window.G && G.world && G.world.mk`) 없을 때 대신할 값을 둔다. 지금 기록을 읽는 값은 getter로 두고 엔진이 없으면 처음 값을 돌려준다.
- 자료 파일마다 전역 하나만 채우고(`window.WALLS`, `window.PLACES.act1` …) 파일 안 도우미는 즉시 실행 함수 안에 둔다.
- **한 전역 배열에 두 파일이 차례로 더하지 않는다.** 글 확인 도구가 엔진 자료 파일을 하나씩 따로 실행하므로 두 파일이 같은 배열의 같은 자리(`[0]`)를 차지해 문서 자리가 겹친다. 다른 파일이 더하는 칸은 이름 있는 칸으로 둔다(예: 글꼴 출처 `CREDITS.fonts`, 배경음 출처는 `CREDITS.sections`의 `id:'bgm'`).

## 모듈 경계

- 저장소(localStorage)는 `G.save`만 만진다. 다른 파일이 `localStorage`를 직접 읽고 쓰지 않는다.
- 기록을 바꾸는 규칙은 `G.rules`의 `…On(st, …)` 순수 함수로만 바꾼다. 화면 코드는 그 함수를 부른 뒤 `G.save.write()`를 부른다. 화면 코드가 `st.walls`·`st.blanks` 같은 칸을 직접 고치지 않는다.
- **확정 기록 칸은 되돌리기 목록에 넣지 않는다**: `G.save.COMMITTED`(walls·propose·blanks·tasks·border·hon·mind·lines·jeongiScene·mbs·skipped·name·words)는 `G.save.snapKeys`(지금 `flags`·`applied`)에 들어가면 안 된다. 반응을 본 시도는 `applyStep`의 한 번만 장부가 아니라 시도 번호 `n`으로 막는다. 새 확정 칸을 만들면 `COMMITTED`와 저장 모양 점검(`G.rules.validSave`)에 함께 더한다.
- 단계의 효과는 `G.rules.applyStep(step, { place, key?, decision? })`로만 적용한다(장부 열쇠 `s:거점:단계`).
- 새 화면이 필요한 단계 종류는 자기 파일에서 `G.steps.register`로 등록한다. 다른 화면 파일의 함수를 직접 부르지 않는다. 두 파일이 같은 종류를 등록할 수 있으면 `G.steps.has`로 먼저 확인한다.
- `G.app.play`·`G.app.next`를 감쌀 때는 원래 함수를 반드시 부른다(`G.rules.attach`가 이미 감싸 지금 거점과 막을 저장한다).
- 소리는 `G.audio.play(장면 id)`와 `BGM.tracks`로만 낸다.

## 이름과 자리

- **id는 바꾸지 않는다**: 거점·목표·단계·담 앞 순간(`w1-poem` …)·빈칸(`b1-wall` …)·할 일·마음 둔 곳·근거 장면·수단 열쇠. 저장 기록의 장부 열쇠(`p:거점`, `b:거점:목표`, `b:거점:목표.할 일`, `s:거점:단계`)와 점검이 id에 묶여 있어, 바꾸면 이어 하기가 엉뚱한 자리에서 시작하고 점검이 깨진다. 새 것은 새 id로 더한다.
- 장면 그림 id는 `sc_<거점>_<무엇>`. 거점의 `scenes`에 `caption`(한국어 설명)과 `prompt_hint`(영어, 그림 안에 글자 없음)를 적는다. 폭력·죽음 장면(암전)에는 그림 자리(`scene`)를 두지 않는다.
- 저장 열쇠는 모두 `isaeng-gyujang:`로 시작한다(지금 `progress`·`settings` 둘).
- `window.ART`에 없는 그림 파일을 요청하지 않는다(없는 파일 요청은 404로 콘솔 오류가 되어 크롬 점검이 실패한다).

## 글 자료

- 모든 글 덩이는 `{ t, mark, src, status }`, 원문 덩이는 `{ han, ko, mark:'원문', src, status }`다. `mark`는 다섯 표시 가운데 하나, `status`는 지금 모두 `확인 전`(글 자료 점검이 이것을 요구한다).
- 원문 한자는 원문 사본에 그대로 있는 글자만 쓴다(글 자료 점검이 사본과 대조한다). 원문 한 덩이는 1~2구.
- 글 길이 상한: 사건 화면 글 180자, 반응 글(`react`·`replies`) 70자. 넘으면 글 자료 점검이 실패한다.
- 학생이 보는 문자열(자료 전부, 엔진·화면 코드의 문자열, CSS `content`)에 다음 말이 들어가면 넘지 않는 선 점검이 실패한다: 점수, 등급, 순위, 랭킹, 시간 제한, 제한 시간, 남은 시간, 시간 초과, 게임 오버, 정답, 오답, 틀렸, '틀린 ', 감점, 득점, 만점, 실패, 맞았습니다, 맞혔, 채점 결과, score, rank. '정답이 없는'처럼 부정하는 꼴만 빠진다. 코드 주석은 보지 않는다.
- 교과서 출판사 이름을 어떤 파일에도 글자 그대로 쓰지 않는다. 찾는 코드가 필요하면 `String.fromCodePoint(0xc9c0, 0xd559, 0xc0ac)`로 만든다. 저장소에 올라갈 수 있는 파일(추적 중이거나 무시되지 않은 새 파일)과 모든 커밋의 변경 내용·커밋 글·브랜치·태그 이름을 권리 점검이 훑는다.

## 화면

- 단추·고르기·쓰기 칸은 44px 이상(`max(44px, …)`), 첫 고르기에 포커스, Tab 차례가 화면 차례와 같게.
- 크기는 rem으로(글자 크기 3단계 `--fs`), 움직임은 CSS animation·transition으로(움직임 줄이기 `html.reduce-motion`이 멈춘다). 캔버스·JS 움직임은 `G.ui.calm()`을 보고 줄인다.
- 한 줄 쓰기는 `G.ui.writeField`(또는 `G.steps.writeLine`)만 쓴다. 가로 높이 320~390px에서 화면 키보드가 열려도 입력 칸과 완료 단추가 함께 보여야 한다(크롬 점검이 360px에서 본다).
- 글 칸 안의 요소를 보이게 굴릴 때는 `G.ui.reveal(el)`만 쓴다. `scrollIntoView`를 쓰지 않는다.
- 게이지·선생님 단추·방식 고르기·수첩(형제 게임에서 걷어 낸 것)을 되살리지 않는다(엔진 틀 점검이 화면에 없는지 본다).

## 자산

- `assets/` 아래 모든 파일(OFL·LICENSE 글 제외)은 `credits/*.tsv`에 한 줄씩, '상업적 이용' 칸이 `가능`으로 있어야 한다. 목록에만 있고 파일이 없는 줄도 실패다.
- 생성 원본(`assets/raw/`, `tools/fonts_src/`, `tools/music_src/`, `tools/voice_cache/`), `.ttf·.otf·.ttc·.wav·.flac·.psd` 파일, PDF, 교과서·지도서 추출본은 추적하지 않는다.
- 배경음은 `BGM.tracks`에 있는 국립국악원 공공누리 제1유형 곡만 쓴다. 효과음·누름 소리·합성 음악·낭송을 더하지 않는다. 곡 파일이 없거나 소리를 꺼도 끝까지 갈 수 있어야 한다.

## 커밋과 브랜치

- 기본 브랜치는 `main`. 커밋 글은 한국어로 쓰고 맨 끝 줄에 `Co-Authored-By:`를 둔다.
- 이 컴퓨터에는 전역 git 저자 설정이 없다. 저장소 설정의 저자(`pblsketch`, `239486537+pblsketch@users.noreply.github.com`)를 바꾸지 않는다.
- `git push`, 저장소 공개 전환, GitHub Pages 켜기, 이력 다시 쓰기는 사용자 승인 뒤에만 한다.
