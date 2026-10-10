# tests — 점검 실행기와 점검들

완료 판정은 이 폴더의 `node tests/run-all.mjs`가 종료 0으로 끝나는 것이다. 점검은 세 갈래다: 브라우저 없이 자료·규칙·저장소를 보는 것, 설치된 Chrome으로 실제 놀이를 몰아 보는 것, 글꼴을 Python으로 읽는 것.

## 맡는 것

- `run-all.mjs` — `check-*.mjs`를 스스로 찾아 이름 차례로 하나씩 자식 프로세스로 돌리고, 하나라도 0이 아니면 종료 1. 인자를 주면 파일 이름에 그 낱말이 든 점검만(`node tests/run-all.mjs data rules`). 고른 낱말에 맞는 파일이 없으면 종료 1.
- 브라우저 없는 점검
  - `check-data.mjs` — 자료 파일을 `lib-data.mjs`로 엔진 없이 읽어 본다: 담 앞 순간 다섯과 원작에 맞는 수단, 반응 세 겹, 카드·빈칸의 때, 옥루춘 여덟 구와 회상 짝, 마무리 자료, 모든 글의 표시·출처·상태(`확인 전`), 원문 한자가 원문 사본(`design/sources/wikisource-geumosinhwa-raw.txt`)에 그대로 있음, 글 길이 상한, 넘지 않는 선의 말.
  - `check-rules.mjs` — `js/core/save.js`·`js/game/rules.js`와 실제 자료를 Node `vm`에 싣고 `G.rules`의 함수를 평범한 상태 객체로 부른다. 새로고침 되돌리기는 `app.runSteps`와 같은 방식으로 흉내 낸다.
  - `check-review-doc.mjs` — 글 확인 문서가 도구로 다시 만든 것과 한 글자도 같은지, 그리고 도구의 훑기 코드를 쓰지 않고 따로 모은 모든 글이 그 '자리' 항목에 있는지.
  - `check-limits.mjs` — 학생 화면에 나올 수 있는 모든 문자열(자료 전부, 엔진·화면 코드의 문자열에서 주석을 뺀 것, `index.html`, CSS `content`)에 점수·게임 오버·맞고 틀림의 말이 없음, 암전 장면에 그림 자리 없음.
  - `check-rights.mjs` — git으로 저장소에 올라갈 수 있는 파일(추적 + 무시되지 않은 새 파일)·커밋 글·모든 커밋의 변경 내용·브랜치/태그 이름에 출판사 이름이 없음, 게임 코드에 바깥 요청 없음, PDF·추출본·생성 원본 미추적, `assets/` 전부가 `credits/*.tsv`에 상업 이용 가능으로.
  - `check-assets.mjs` — 배경음 파일·출처 목록·`bgm.js`·거점의 `music`이 서로 맞음, 효과음·낭송·합성 곡 자리 없음.
  - `check-fonts.mjs` — `python`으로 fontTools를 불러 woff2 7개의 글자표를 읽고, `js/**`·`css/**`·`index.html`의 모든 글자(주석 포함)가 바탕·한자·드문 한자 글꼴에 있는지, 붓글씨가 제목·거점 이름을 담는지, OFL 고지와 출처 목록.
- 크롬 점검(Playwright + 설치된 Chrome, 각 수십 초~4분)
  - `check-smoke.mjs` — 엔진 틀(시험 자료 `fixtures/smoke-places.js`로 실제 `PLACES`·`FLOW.order`를 바꿔 끼움).
  - `check-act1.mjs`·`check-act2.mjs`·`check-act3.mjs` — 막별 실제 자료와 화면(담 화면의 1막에 없는 꼴은 `fixtures/walls-places.js`로).
  - `check-finale.mjs` — 저장 기록을 직접 넣어 '다 지나온 학생'을 만든 뒤 마무리 화면·결과 화면·원전으로 나가는 문.
  - `check-flow.mjs` — 키보드만·마우스(배경음 파일 막음)·터치(배경음 끔)로 각각 처음부터 결과까지, 다시 열기 넷, `?act=2`·`?act=3`, 세로 안내. 걸린 시간을 `shots/flow/timing.json`에 남긴다.
- 도우미: `lib.mjs`(크롬 손잡이), `lib-data.mjs`(자료를 엔진 없이 읽기 — `check-`로 시작하지 않아 실행기가 돌리지 않는다), `serve.mjs`(빈 포트 정적 서버), `fixtures/`(시험 자료), `package.json`(Playwright 하나).

## 맡지 않는 것

- 게임 코드·자료를 고치지 않는다. 점검이 실패하면 고칠 곳은 게임 쪽이다. 기대값을 실제 결과에 맞춰 바꾸는 것은 규칙이 바뀌었을 때만, 사용자에게 알리고 한다.
- 글 확인 문서와 글꼴은 만들지 않고 비교만 한다(만드는 것은 `tools/`).
- `node_modules`는 이 폴더의 것이 아니다: 형제 게임 `../choecheok-jeon/tests/node_modules`로 가는 디렉터리 연결이다. 여기서 `npm install`을 돌리지 않는다(연결을 따라 형제 설치본을 바꾼다). 설치가 필요하면 사용자에게 묻는다.
- `shots/`는 결과물(git 제외)이다. 점검마다 자기 폴더를 지우고 다시 만든다.

## 지켜야 할 것

- **새 점검은 `check-<이름>.mjs`로 두고 실패하면 0이 아닌 값으로 끝낸다**(`checker()`의 `finish`, 또는 `process.exit(1)`). 실행기는 파일을 스스로 찾으므로 따로 등록하지 않는다.
- **크롬 맥락은 `lib.mjs`의 `open()`으로만 만든다.** `open()`이 콘솔 오류·페이지 오류·실패한 요청·400 이상 응답을 모으고, 이 컴퓨터 주소와 `data:`·`blob:` 말고는 모든 요청을 끊고 기록한다. 점검은 `errs`와 `outside`가 비었는지 반드시 본다.
- **오류 거르기를 넓히지 않는다**: `open()`이 빼는 것은 `assets/bgm/*.mp3` 요청이 `ERR_ABORTED`로 끊긴 경우 하나뿐이다(거점에 들어서며 곡을 바꿀 때 받던 곡을 크롬이 끊는 것). 없는 파일(404)이나 다른 파일의 끊김은 그대로 오류로 센다.
- **저장 열쇠**: 크롬 점검은 `storageKeys()`로 모든 열쇠가 `isaeng-gyujang:`로 시작하는지 본다. `fresh()`는 새 크롬 맥락에서만 `localStorage.clear()`를 부른다.
- **출판사 이름을 점검 코드에도 글자 그대로 쓰지 않는다.** `String.fromCodePoint(0xc9c0, 0xd559, 0xc0ac)`로 메모리에서만 만든다.
- **음성 사례를 둔다**: 금지어·바깥 주소·누락을 실제로 잡는지 먼저 확인하는 사례를 점검 안에 둔다(권리·넘지 않는 선·글 확인 문서 점검이 그렇게 되어 있다). 잡지 못하는 점검은 통과해도 뜻이 없다.
- 자료 점검은 엔진 없이 자료를 읽는다. 자료 파일이 `G`에 기대면 여기서 실행 오류가 난다 — 고칠 곳은 자료 파일이다.
- 점검에서 대화창을 닫은 뒤 곧바로 E를 누르면 먹지 않는다(엔진이 300ms 동안 받지 않음). `talkTo()`처럼 380ms 기다린다.
- 말 걸 대상 곁으로 옮길 때는 `G.world.test.teleport(id)`를 쓰되, 걷기 입력 자체를 확인하는 곳(혼이 걷기 시작한 뒤 열림, 조이스틱)은 실제 입력(방향키·마우스 끌기·터치 끌기)으로 걷는다. teleport도 자리를 바꾸므로 혼을 열어 버린다.

## 크롬 점검의 방식

- `const url = await base()`(`serve.mjs`) → `const browser = await launch()`(`channel:'chrome'`, headless) → `const { page, errs, outside, shot } = await open(browser, VIEWS.phone, { shots })`.
- 화면 크기: `VIEWS.phone` 844×390(터치), `VIEWS.low` 640×360(터치, 화면 키보드 흉내), `VIEWS.desktop` 1366×860, `VIEWS.portrait` 390×844.
- 진행 손잡이: `fresh(page, url)`(저장을 지우고 타이틀), `startGame(page)`, `reloadContinue(page, before)`(다시 열어 '이어 하기' — `before`에서 시험 자료를 넣는다), `advance(page)`(사건 화면 '다음'을 끝까지), `talkTo(page, id)`, `state(page)`, `smallTargets(page)`(44px 미만 누를 곳).
- 상태 넣기: `page.evaluate(() => G.rules.test.set({ … }))` 또는 `G.rules.shortcutOn(G.save.state, n)` 뒤 `G.save.write()`. 지도 상태 읽기: `G.world.test.state()`·`goal()`·`indicator()`·`targets()`·`doors()`.
- `BASE=http://127.0.0.1:8000/index.html node tests/check-smoke.mjs`처럼 `BASE`를 주면 내장 서버 대신 그 주소를 연다.

## 점검을 바꿀 때 볼 것

- 엔진의 목표 꼴·단계 꼴을 바꾸면 `fixtures/smoke-places.js`·`fixtures/walls-places.js`와 그 점검을 함께 바꾼다.
- 글 상태 `확인됨`을 허용하려면 `check-data.mjs`의 `STATUS` 검사를 바꾼다(지금은 모두 `확인 전`을 요구).
- 이어 하기 자리를 바꾸면 엔진(`G.world.play`)과 순수 함수(`G.rules.resumePoint`)가 같은 셈인지 `check-rules`·`check-act3`·`check-flow`로 함께 본다. `resumePoint`는 목표의 `when`을 보지 않는다.
- 전체는 이 컴퓨터에서 약 6~7분이고 그 가운데 `check-flow`가 약 4분이다. 고친 곳에 맞는 점검만 먼저 돌리고(`node tests/run-all.mjs act3`), 끝낼 때 전체를 돌린다.
