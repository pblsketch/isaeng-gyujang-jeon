# 구조

## 전체 모양

게임은 정적 파일 묶음이다. 브라우저가 `index.html`을 받아 `<script>`를 적힌 차례대로 실행하고, 모든 파일은 전역 하나에 붙는다 — 엔진은 `window.G`(`G.util`·`G.save`·`G.audio`·`G.ui`·`G.hud`·`G.steps`·`G.rules`·`G.world`·`G.app` …), 자료는 파일마다 전역 하나(`FLOW`·`PEOPLE`·`SPRITES`·`BGM`·`TEXTS`·`NOTES`·`CREDITS`·`WALLS`·`CARDS`·`OKRU`·`FINALE`·`PLACES[id]`). 번들러·모듈 시스템·패키지 의존성이 없다.

```
브라우저(한 사람, 한 기기)
  index.html ── css/style.css + 화면별 css(wall·hon·okru·finale·result) ── assets/fonts/*.woff2
     │ <script> 차례
     ├─ js/core      util → save → audio → ui → hud
     ├─ js/game      steps → rules → tiles → world → app          (엔진)
     │               wall → blank → hon → tasks → okru → finale → result   (이 게임의 화면)
     ├─ js/data      flow → people → sprites → bgm → texts → notes → credits → walls → cards → okru → finale
     ├─ js/data/places  prologue → act1 → act2 → act2night → act3 → epilogue
     └─ js/main.js   시작
  localStorage   isaeng-gyujang:progress · isaeng-gyujang:settings
  <audio>        assets/bgm/*.mp3 (두 덱을 번갈아 겹쳐 바꿈)
  내려받기       결과 그림 PNG(캔버스 → blob 링크)
```

엔진 파일은 자료 파일보다 먼저 실린다. 그래서 엔진은 자료 전역을 **불릴 때** 읽고(실릴 때 읽지 않는다), 자료 파일은 엔진이 있으면 그 도우미(`G.world.mk` 등)를 쓰고 없으면 스스로 대신한다 — 같은 자료 파일을 엔진 없이 Node에서 읽는 점검·도구가 있기 때문이다. `main.js`는 맨 끝에 실려 저장 불러오기 → 규칙 걸기(`G.rules.attach`) → 설정 적용·세로 안내 감시 → 주소 바로가기(`G.boot.routes`) → 타이틀 차례로 시작한다.

## 구성 요소와 의존 방향

| 구성 요소 | 하는 일 | 기대는 쪽 |
| --- | --- | --- |
| `js/core` | DOM 도구·조사 맞추기(`util`), localStorage 저장·불러오기·처음부터(`save`), 배경음 두 덱(`audio`), 판·알림·한 줄 쓰기 칸(`ui`), 구석 HUD(`hud`) | 아무것도 기대지 않음(자료 `BGM`·`TEXTS`는 불릴 때 읽음) |
| `js/game` 엔진 | 단계 실행기(`steps`), 순수 규칙과 한 번만 반영 장부(`rules`), 코드로 그린 타일(`tiles`), 탑다운 지도·조이스틱·말 걸기·목표·입구(`world`), 화면 흐름·사건 화면·설정·바로가기(`app`) | `js/core`, 자료 전역 |
| `js/game` 화면 | 담 앞 순간(`wall`), 빈칸·반복의 뜻(`blank`), 혼·발소리·암전(`hon`), 3막 할 일 목록·때 딱지(`tasks`), 마음 둔 곳·옥루춘(`okru`), 전기적 요소 한 줄·만복사(`finale`), 결과 화면·원전으로 나가는 문(`result`) | 엔진의 `G.steps.register`·`G.rules`·`G.world`·`G.app` |
| `js/data` | 이야기 글·담 앞 순간·카드·옥루춘·마무리·거점(지도 격자, 사람, 목표, 단계, 장면 설명) | 없음(엔진이 있으면 도우미를 씀) |
| `js/main.js` | 시작 차례와 `?act=` 바로가기 | 전부 |

화면 파일끼리는 서로 부르지 않고 엔진을 거친다. 예외는 공용 단계 하나다: 암전(`blackout`)은 `hon.js`와 `tasks.js`가 모두 등록할 수 있게 짜여 있고, 먼저 등록한 쪽(`hon.js`)이 쓰인다.

## 대표 흐름 — 1막 담 앞에서 수단을 고를 때

1. 타이틀 '시작' → `G.app.play('prologue')` → `FLOW.order` 차례로 거점을 연다. `G.rules.attach`가 `app.play`를 감싸 지금 거점과 막(`st.place`·`st.act`)을 저장한다.
2. `G.world.play('act1')`이 거점의 목표(beats)를 차례로 돈다. 목표 하나는 `waitGoal`로 대상(사람·자리)에 닿기를 기다린 뒤 `G.app.runSteps(place, steps)`로 단계들을 사건 화면에 펼친다. 단계를 시작할 때 `G.save.snapKeys`(`flags`·`applied`)의 값을 떠 둔다.
3. 단계 `{ type:'wall', id:'w1-poem' }` → `wall.js`가 `G.rules.meansFor`로 수단 칸을 그리고, 단추마다 `G.rules.nextAttempt`로 받은 시도 번호를 단다.
4. 학생이 '말'을 누름 → `G.rules.useMeansOn(st, 'w1-poem', 'mal', n)`이 `st.walls['w1-poem']`에 `{ n, m:'mal' }`을 더하고 반응 겹(첫 반응·다시·실마리)과 담 높이를 기록에서 다시 구해 돌려준다 → `G.save.write()`가 localStorage `isaeng-gyujang:progress`에 쓴다 → 화면이 반응 글과 담 높이를 보인다.
5. 원작에 맞는 수단('시')이면 `G.rules.applyStep(step)`이 장부 `applied['s:act1:w1-poem']`에 한 번만 남기고 다음 단계로 간다. 맞지 않으면 진행은 그대로이고 학생이 다시 고른다.
6. 거점의 목표가 끝나면 `app.next` → 다음 거점. 맺음(`epilogue`)이 끝나면 `app.finish` → `app.hooks.finish`(`finale.js`)가 기록이 덜 찬 마무리 화면(전기적 요소 한 줄, 「만복사저포기」)만 거점 'finale'로 펼친 뒤 `G.result`가 결과 화면을 연다.

## 경계 — 무엇이 넘나드는가

- **넘는 것**: 같은 출처의 정적 파일 받기(HTML·JS·CSS·woff2·mp3), localStorage 읽기·쓰기, 결과 그림의 blob 내려받기.
- **넘지 않는 것**: 다른 출처로 가는 요청 전부(글꼴 CDN, 분석 도구, 원문 사이트 포함), `fetch`·`XMLHttpRequest`·`sendBeacon`·`WebSocket` 같은 코드 요청(같은 출처라도 쓰지 않는다), 서버로 가는 학생 기록. 원전 안내의 위키문헌 주소는 글로만 보이고 링크로 열지 않는다.
- **웹 주소로만 연다**: `file://`로 열면 지원하지 않는다(배경음·글꼴을 내장해 두지 않았다). GitHub Pages나 간이 서버가 필요하다.

## 게임 밖의 구성 요소(만들고 점검할 때만)

| 구성 요소 | 하는 일 | 기대는 쪽 |
| --- | --- | --- |
| `tests/run-all.mjs` + `tests/check-*.mjs` | 점검 실행기가 `check-*.mjs`를 찾아 하나씩 자식 프로세스로 돌림 | Node 18+ |
| 자료 점검(`check-data`·`check-review-doc`·`check-limits`의 자료 부분) | 자료 파일을 Node `vm` 맥락에서 엔진 없이 실행해 전역을 읽음(`tests/lib-data.mjs`) | `js/data` |
| 크롬 점검(`check-smoke`·`check-act1~3`·`check-finale`·`check-flow`) | `tests/serve.mjs`가 빈 포트에 저장소를 서빙 → Playwright가 설치된 Chrome(`channel:'chrome'`)을 띄움 → 바깥 요청은 끊고 기록 | `tests/node_modules`(형제 게임 「최척전」 설치본으로 가는 디렉터리 연결), 설치된 Chrome |
| 저장소 점검(`check-rights`) | `git ls-files`·`git log --all -p`로 파일·이력·브랜치를 훑음 | git |
| `tools/review-doc.mjs` | 자료를 엔진 없이 읽어 글 확인 문서를 만듦 | `tests/lib-data.mjs` |
| `tools/build_fonts.py` | `js/**`·`css/**`·`index.html`의 모든 글자로 부분 글꼴 7개를 만듦 | Python 3, fontTools, brotli, `tools/fonts_src/`의 원본 글꼴(git 제외) |
| `tools/gen.ps1`·`tools/drafts.py` | 그림 시안 생성(Codex CLI)과 줄이기·비교 한 장(Pillow) | Codex CLI 로그인, `assets/raw/`(git 제외) |

## 바깥에 기대는 것

- **형제 게임 「최척전」(`../choecheok-jeon`)**: 엔진의 출처, 배경음 8곡의 출처(파일을 바이트 그대로 복사해 옴), 점검용 Playwright 설치본(`tests/node_modules` 연결). 게임 실행 중에는 기대지 않는다.
- **원문 사본**: `design/sources/wikisource-geumosinhwa-raw.txt`(위키문헌 「번역:금오신화」 원본 글). 자료 점검이 원문 한자를 이 사본과 대조한다.
- **글꼴 원본**: google/fonts 저장소의 고운바탕, Noto Serif KR·SC, 나눔손글씨 붓(모두 OFL). `tools/fonts_src/`에 두고 저장소에는 부분 글꼴만 올린다.
- **배포**: GitHub 저장소 `pblsketch/isaeng-gyujang-jeon`(`main`, 비공개). 공개 주소는 GitHub Pages로 낼 계획이며, 시리즈의 다른 게임과 같은 출처(같은 Pages 주소)에 올라갈 수 있다.
