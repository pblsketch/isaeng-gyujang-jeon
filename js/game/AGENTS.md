# js/game — 게임 엔진과 이 게임의 화면(css/ 포함)

형제 게임 「최척전」(`../choecheok-jeon`)의 걷는 지도 엔진을 가져와, 그 게임에만 있던 것(연·생 게이지, 쓰러짐, 결말 넷, 원작 궤적, 이어 하기 글자, 두 방식, 선생님 모드, 고지도, 퉁소·시구 맞추기·뱃길, 수첩, 효과음·합성 음악, 파일로 열기)을 걷어 내고 이 게임에 필요한 지도 기능과 화면을 더했다. 화면 모양(`css/`)도 이 폴더의 일로 함께 다룬다.

## 맡는 것

- `steps.js`: 단계 실행기(`G.steps.register/run/has`), 조건(`conds`)·효과(`effects`)·줄 종류(`lineKinds`), 기본 단계 `say`·`choice`·`card`, 표시 칩 `G.steps.mark(표시)`, 원문+풀이 `G.steps.quote({ han, ko, src, fold })`, 카드 한 장 `cardMoment`·`infoCard`, 한 줄 쓰기 `G.steps.writeLine(ctx, o)`, '다음' 단추 `nextButton`.
- `rules.js`: 규칙의 바닥(한 번만 반영 장부 `onceOn`·`applyStep`·`applied`, 종류별 규칙 자리 `G.rules.stepRules`, `snapKeys`에 `applied`를 더함, 거점 들어서기 기록과 `attach`)과 이 게임의 규칙(아래 '규칙(G.rules)' 절). 저장 칸 `words`를 `extend`로 더하고 `COMMITTED`에 넣으며, 모양 점검 `G.save.valid = validSave`를 단다.
- `tiles.js`·`world.js`: 코드로 그리는 땅 타일과 테마, 탑다운 맵(카메라·충돌·조이스틱·말 걸기·목표 진행·대화창·맵 사이 입구), 지금 할 일의 위치 표시(은은한 빛·가장자리 화살표, 다른 맵이면 그리로 가는 입구), 순서 없는 할 일·열림 조건·되풀이 구역, 바깥에서 부르는 `G.world.waitGoal`, 손잡이 `G.world.test`.
- `app.js`: 화면 흐름(타이틀 → 거점 차례 → 끝), 바로가기, 사건 화면, 단계 실행(`runSteps` — 되돌리기 값 뜨기·다시 펼치기), 거점 첫 장(`titleCard`), '준비 중' 거점, 설정(글자 크기 3단계·배경음·움직임 줄이기·전체 화면), 가로 안내, 전체 화면 `G.app.fs`, 걸이 `G.app.hooks.credits/finish`, 출처 화면, 그림 내려받기 `downloadCanvas`, 장부 열쇠 `G.app.key`.
- 이 게임의 화면: `wall.js`(담 앞 순간·답 고르기), `blank.js`(빈칸·반복의 뜻), `hon.js`(혼·발소리 줄·암전), `tasks.js`(3막 할 일 목록·때 딱지·짧은 길), `okru.js`(마음 둔 곳·옥루춘), `finale.js`(전기적 요소 한 줄·「만복사저포기」), `result.js`(결과 화면·원전으로 나가는 문).
- `css/`: 공통 `style.css`(팔레트, 글꼴 `@font-face`, 한지 판·쪽빛 판 두 벌의 부품, `--fs` 글자 크기, 움직임 줄이기), 화면별 `wall.css`·`hon.css`·`okru.css`(3막 화면 전부)·`finale.css`·`result.css`.

## 맡지 않는 것

- 이야기 글·고르기·카드 문안은 `js/data/`에 있다. 엔진에는 대체 글('준비 중', 기본 단추 이름, `hon.js`의 `DEF`)만 둔다. 엔진 공통 글은 `TEXTS`(표시 이름·색, 전체 화면, 가로 안내, 얻은 것 알림 틀, 잠긴 할 일 안내, 접은 원문 단추, `TEXTS.WALL`·`TEXTS.BLANK`). `TEXTS.HON`·`TEXTS.MEANS`가 있으면 `hon.js`의 `DEF`와 규칙의 수단 이름보다 먼저 쓰인다(지금은 없다).
- 저장소 접근은 `G.save`만 쓴다(`localStorage` 직접 접근 금지). HUD·소리·화면 부품은 `js/core/`의 공개 함수로만 부른다.
- 점검 실행기·시험 자료(`tests/`)와 글 확인·글꼴 도구(`tools/`)는 이 폴더 밖이다. 다만 엔진의 목표 꼴을 바꾸면 시험 자료(`tests/fixtures/smoke-places.js`, `tests/fixtures/walls-places.js`)도 함께 바꾼다.
- `index.html`의 스크립트 차례는 core → `steps` → `rules` → `tiles` → `world` → `app` → `wall` → `blank` → `hon` → `tasks` → `okru` → `finale` → `result` → 자료 → 거점 → `main.js`로 정해져 있다. 새 파일은 이 차례에 맞춰 더한다.

## 지켜야 할 것

- **넘지 않는 선**: 점수·등급·순위·시간 제한·게임 오버·맞고 틀림 표시를 어떤 화면에도 두지 않는다. 화면 문자열에 '점수·등급·순위·정답·오답·실패·게임 오버' 같은 말을 쓰지 않는다(엔진 안내 글 포함, 주석은 괜찮다). 게이지·선생님 단추·방식 고르기·수첩을 되살리지 않는다. 바깥 주소로 요청하지 않는다(SVG 이름공간 문자열만 예외, `fetch`·`XMLHttpRequest`도 쓰지 않는다).
- **규칙은 순수 함수 한 벌**: 상태를 바꾸는 규칙은 `…On(st, …)` 꼴로 평범한 객체에 대해 짠다(브라우저·저장 없이 돈다). 화면 코드 안에서 기록 칸을 직접 고치지 말고 규칙 함수를 부른 뒤 `G.save.write()`.
- **한 번만 반영**: 단계 효과는 `G.rules.applyStep(step, { place, decision })`로 적용한다. 열쇠는 `s:거점:단계`. 같은 열쇠로 두 번 적용되지 않는다.
- **확정 기록과 되돌리기**: 단계 도중 새로고침하면 `runSteps`가 `G.save.snapKeys`(`flags`·`applied`)를 단계 시작 값으로 되돌리고 그 단계를 다시 펼친다. 반응을 본 시도(수단·빈칸 카드·제안의 답·만복사 고르기)는 그 자리에서 확정하고, 그 칸(`G.save.COMMITTED`: walls·propose·blanks·tasks·border·hon·mind·lines·jeongiScene·mbs·skipped·name·words)은 **snapKeys에 넣지 않는다**. 같은 시도가 두 번 들어가지 않게 시도 번호(`n`)를 둔다 — `applied`는 되돌리기에 들어 있어 장부로 막으면 두 번 들어갈 수 있다.
- **담 높이·반응 겹·때 딱지는 저장하지 않는다.** 늘 기록에서 다시 구한다(새로고침 뒤에도 같은 반응).
- **'함께 가자'는 고르기에 없다**: `proposeChoices`는 `together`를 어떤 경우에도 넣지 않는다. `together` 자료는 고르기 앞의 대화로만 그린다.
- **혼은 걷기 시작한 뒤에만 열린다**: `hon.js`는 학생 자리가 10px 넘게 바뀌기 전에는 `honOpenOn`을 부르지 않는다. 그 전에는 혼 칸이 이름 없는 잠긴 칸이다. 꾸짖음 직후에 혼을 드러내는 연결을 두지 않는다.
- **암전 장면에 그림 자리를 두지 않는다**: `blackout`은 `setScene(null)` 뒤 한 줄 + 접힌 원문 카드. 폭력·죽음은 그리지 않는다.
- 등록되지 않은 단계 종류·비어 있는 거점·없는 걸이는 오류 없이 '준비 중'으로 넘긴다. 단계 함수가 던지면 `runSteps`가 오류 카드를 보이고 다음으로 넘어간다.
- `app.play`·`app.next`를 감쌀 때는 원래 함수를 반드시 부른다(`G.rules.attach`가 이미 감싼다).
- 대화창을 닫은 뒤 300ms(`W.closedAt`) 동안 E·Enter·Space·Z를 말 걸기로 받지 않는다.
- 전체 화면은 사용자 누름 안에서만 부른다. 지원하지 않으면 `fs.button()`이 `null`. 콘솔 오류를 내지 않는다(크롬 점검은 콘솔 오류 하나로도 실패한다).
- **소리**: 배경음만(`G.audio.play(장면 id)`, `BGM.tracks`). 효과음·합성 음악·낭송을 더하지 않는다. 파일이 없으면 조용히 소리 없이 간다.
- **누를 곳·키보드·글자 크기·움직임**: 단추·고르기·쓰기 칸은 44px 이상(`max(44px, …)`), 첫 고르기에 포커스, Tab 차례가 화면 차례와 같게. 크기는 rem으로(`--fs`), 움직임은 animation·transition으로(`html.reduce-motion`이 멈춘다). 캔버스·JS 움직임은 `G.ui.calm()`을 본다.
- **한 줄 쓰기는 `G.ui.writeField`(또는 `G.steps.writeLine`)만 쓴다**: 화면 키보드가 보이는 화면을 줄여도(가로 높이 320~390px) 입력 칸과 완료 단추가 함께 보인다(`.wf-docked`). 빈칸이면 넘어가지 않는다.
- 글 칸의 줄을 보이게 할 때는 `G.ui.reveal(el)`만 쓴다. `scrollIntoView`는 놀이 화면 틀까지 굴려 HUD가 잘린다.
- **그림은 아직 없다**: 그림 목록(`window.ART`)에 없는 그림을 요청하지 않는다(404 → 콘솔 오류). 사람은 단색 사람 모양, 소품은 `SPRITES`의 `shape`, 삽화 자리는 빈 종이 판. 화면은 그림책풍 방향(전체 화면 맵 + 구석 HUD, 사건 화면은 삽화 + 한지 판 + 엄지 자리 트레이)을 따른다.
- 이 폴더와 `css/`의 모든 글자(주석 포함)가 부분 글꼴에 들어간다. 원본 글꼴에 없는 기호(✎ ▸ ✕ 등)를 쓰지 말고 `—`·`›`·`▶`를 쓴다. 닫기 같은 아이콘은 `G.app.ICON`의 SVG로 그린다.

## 규칙(G.rules) — 화면이 부르는 함수

모두 `…(st, …)` 꼴 순수 함수다(`st` = `G.save.state`). 기록을 바꾸는 함수(…On)를 부른 뒤 화면이 `G.save.write()`로 저장한다. 오류는 `{ error:'…' }`로 돌려주고 기록하지 않는다. 자료(`WALLS`·`CARDS`·`FINALE`·`FLOW`·`PLACES`)는 부를 때 읽는다.

| 함수 | 하는 일 | 저장 칸 |
| --- | --- | --- |
| `meansFor(st, 순간)` | 수단 칸 `[{ id, name, locked, used, uses }]`. 혼이 잠겼으면 맨 끝에 `name:null` 잠긴 칸 | 읽기 |
| `nextAttempt(st, 순간)` | 다음 시도 번호. 고르기 단추를 그릴 때 받아 두고 아래 두 함수에 넘긴다(두 번 눌러도 한 번) | 읽기 |
| `useMeansOn(st, 순간, 수단, n)` | 수단 쓰기 → `{ n, means, pass, layers, react:[글…], height, recorded }`. 맞지 않으면 반응만(진행 안 막음). 통과한 순간·이미 있는 번호는 다시 안 적음(`recorded:false`). 경계는 늘 `pass:false`, 쓰면 `border:true`. 잠긴 혼은 `error:'locked'` | `walls`, `border` |
| `reactionFor(st, 순간, n)` | 시도 n의 반응을 기록에서 다시 구함(새로고침 뒤 같은 반응) | 읽기 |
| `wallPassed(st, 순간)` · `wallHeight(st, 막)` · `canLeave(순간)` | 통과했나 · 담 높이(그 막의 맞지 않는 시도 + 3막 `stay`, 저장 안 함) · 통과 없는 순간(경계)에서 '돌아서기' | 읽기 |
| `borderOn(st)` | 경계 앞 순간을 겪음(구역에 들어서면) | `border` |
| `proposeChoices()` · `answerOn(st, 답, n)` | 제안의 고르기(`stay`·`entrust`, `together`는 없음) · 답하기(`useMeansOn`과 같은 꼴). 첫 답은 `propose[0]` | `propose` |
| `honOpenOn(st, { walking:true })` | 도적 앞 통과(또는 2막 건너뜀) + 걷기 시작 뒤에만 `open` | `hon` |
| `wordOn(st, 낱말)` | 낱말 카드 얻기(`fx:{ word }` 효과가 부른다, 한 번만) | `words` |
| `cardsFor(막)` · `blankOn(st, 빈칸, 카드)` · `blanksDone(st, 막)` | 그 막 빈칸의 카드(앞 막 카드 포함) · 넣기 → `{ ok, final }` 또는 `{ ok:false, reply }`(첫 카드는 `first`에 한 번만, 채운 뒤 안 바뀜) · 다 찼나 | `blanks` |
| `taskOpen(st, 할 일)` · `taskOn(st, 할 일)` | 열렸나(`burial`은 `treasure`·`bones` 뒤) · 마침 | `tasks` |
| `act3Goal(st)` · `act3Done(st)` | 지금 할 일 `{ tasks, locked, border, done }`(넷을 마쳤고 경계가 남으면 `border:true`) · 넷 + 경계 | 읽기 |
| `mindOn(st, 곳)` | 마음 둔 곳(`act3Done` 뒤, 한 번만) | `mind` |
| `jeongiSceneOn(st, 장면)` · `canWrite(st, 쓰기)` · `lineOn(st, 쓰기, 글)` | 근거 장면(한 줄을 쓰기 전까지 바꿀 수 있음) · 쓰기 칸이 열렸나(`jeongi`는 장면 뒤) · 쓰기(빈 글이면 `error:'empty'`) | `jeongiScene`, `lines` |
| `mbsOn(st, 'q1'\|'q2', 보기)` | 사실을 보이기 전에 부른다. 한 번만 → `{ choice, fact, quote }`(맞고 틀림 없음) | `mbs` |
| `hasProgress(st)` · `shortcutOn(st, 1\|2\|3)` | 기록이 있나 · 새로 시작이나 '이 막부터': 앞 막 기록은 두고 그 막부터 기록·장부를 지움, 빈칸 덜 찬 앞 막은 `skipped` + 원작 낱말, 앞 거점은 끝낸 것으로, 3막부터면 혼 열림 | 모두 |
| `resumePoint(st)` · `act3Map(st)` | 이어 하기 지점 `{ place, act, beat, map, spawn }`(엔진 `world.play`와 같은 셈을 순수 함수로 — 단 목표의 `when`은 보지 않는다) · 3막 할 일이 시작할 지도 `{ map, spawn }` | 읽기 |
| `validSave(o)` | 저장 모양 점검. `G.save.valid`로 걸려 깨진 기록이면 처음부터 | — |

- `stepRules.wall`·`propose`는 기록을 읽기만 한다(되돌린 뒤 다시 적용해도 기록이 늘지 않게). 새 확정 칸을 만들면 `COMMITTED`와 `validSave`에 함께 더한다.
- 손잡이 `G.rules.test.set({ 칸: 값 })`·`state()`는 점검이 기록을 넣고 읽을 때 쓴다.

## 담 앞 순간·빈칸 화면 — `wall.js`·`blank.js`, 모양은 `css/wall.css`

모든 막이 이 두 화면을 고치지 않고 아래 꼴로 쓴다.

- **담 앞 순간** `{ id, type:'wall', wall?:'순간', tip?:글 덩이, leave?:글 덩이, scene?, next? }` — 순간 열쇠는 `wall`, 없으면 `id`.
  - 담 높이 그림(`.wall-stage[data-height]`, 보이기만) → `intro` 한 줄씩(마지막 줄은 고르기와 함께) → 수단 칸(`meansFor`: 혼이 잠겼으면 이름 없는 잠긴 칸, 써 본 칸에 '써 봄') → 고르면 `useMeansOn`으로 곧바로 기록(단추를 그릴 때 받은 `nextAttempt` 번호) → 반응(겹은 규칙이 고름) → 원작에 맞으면 `applyStep` 후 '다음', 아니면 담만 높아지고 다시 고른다.
  - `tip`은 처음 고를 때 칸 위 안내(없으면 `TEXTS.WALL.pick`). 단계가 시작되면 삽화를 `scene`(없으면 비움)으로 바꾼다.
  - 통과가 없는 순간(`canLeave`, `w3-border`): 들어서면 `borderOn`을 부르고 '돌아서기' 칸이 붙는다. 떠날 때 글은 `leave` → 거점 자료의 `border.leave` → `TEXTS.WALL.leaveLine`. 단계는 `{ left:true }`로 끝난다(되풀이 구역이면 `runSteps`의 `again`으로 다시 열린다).
  - 하다 말고 껐다 켜면: 기록은 그대로, 마지막 반응을 다시 보이고 이어 고른다. 이미 통과했으면 통과 반응과 '다음'만.
- **답 고르기** `{ id, type:'propose', wall:'w3-propose' }`(또는 `kind:'answer'`인 순간의 `wall` 단계) — `together`(이생의 말·최 씨의 원작 답·note, 고르기 아님)를 먼저 한 줄씩 → `intro` → `labels`의 답 단추(`proposeChoices`) → `answerOn` 기록 → `stay`는 반응·담이 높아짐·다시 고름, 원작의 답은 '다음'.
- **막 끝 빈칸** `{ id, type:'blank', act:'act1'|'act2' }` — 표 전체(`CARDS.table`) + 그 막의 빈칸(`CARDS[막].blanks`)을 차례로. 카드는 `cardsFor(막)`(가나다 차례). 맞지 않는 카드는 `replies`의 인물 말 + 다시 고름(오답 표시 없음), 기록은 `blankOn`. 막 얻은 낱말 알림이 지나간 뒤 카드를 늘어놓는다.
- **3막 끝** `{ id, type:'blank', act:'act3' }` — 표 전체 + `FINALE.repeat`(물음·help) + 한 문장 쓰기(필수, `lineOn('repeat')`).
- 도우미: `G.blank.josa(낱말, '을'|'이'|'으로'…)`(받침 없으면 를·가·로, ㄹ 받침은 로), `G.blank.fill(표 문장, { 빈칸: 낱말 })`, `G.blank.table(st, { active, keys })`(결과 화면에서 같은 표를 그릴 때).

## 혼·암전 화면 — `hon.js`, 모양은 `css/hon.css`

- **혼** `{ id, type:'hon', scene, walk, reveal:{ name, tag, explain }, reason:[원문…], note, setting }`(`act2night`의 `n-hon`): 사건 화면(또는 대화창)을 잠시 걷고(`.hon-away`, 멈춤 `W.busy`를 걷는 동안만 푼다) 맵 위 걷기 판(`.hon-panel[data-phase=walk]`: 발소리 표시 + `walk` + 수단 칸, 혼은 이름 없는 잠긴 칸)을 띄운다 → 80ms마다 `G.world.test.state()`를 읽어 학생 자리가 같은 맵에서 10px 이상 바뀌면 그때만 `honOpenOn(st, { walking:true })` → 사건 화면 가운데 한 장(`.hon-reveal`: 칸이 '혼'으로 드러남 + `.hon-tag` '전기적 요소' + `explain`) → `reason`·`note`·`setting`을 한 줄씩. 이미 열린 기록이면 걷기 판 없이 드러남부터. 시간 제한 없음, 가만히 있으면 열리지 않는다. 맵이 없는 자리(시험 자료)에서는 '걸어 본다' 단추로 대신한다.
- `G.world.test.state()`는 점검 전용이 아니다 — 혼 판정이 기댄다. 이름·꼴을 바꾸면 혼이 열리지 않는다.
- **발소리 줄** `{ …대사 줄, foot:1|2|3 }`(줄 종류 `foot`): 그 줄 앞에 발자국 표시(`.hon-foot[data-near]`, 1 멀리 → 3 바로 곁). 글은 그대로.
- **암전** `{ id, type:'blackout', t, mark, src, quote, fold }`: 삽화를 비우고(`setScene(null)`, `.event.blackout`) 한 줄 + 접힌 원문 카드. `hon.js`만 등록한다. 3막 맺음(`e-death`)도 같은 꼴.

## 3막 화면 — `tasks.js`·`okru.js`, 모양은 `css/okru.css`

- **할 일 고리는 엔진 것**: 3막 할 일 넷은 거점 자료 `PLACES.act3`의 목표 `b-tasks`(엔진의 순서 없는 할 일 꼴, `world.js` `runTasks`)가 돈다. `tasks.js`는 고리를 따로 짜지 않는다. 장사의 `need`는 `st.tasks`(규칙 `taskOpen`과 같은 기록)를 본다. 경계는 `repeat`(되풀이 구역 `edge` → 단계 `t-border` = `{ type:'wall', wall:'w3-border' }`), `finish`는 `st.border`.
- 단계 `{ type:'tasks', list }`는 할 일 목록 한 장(이름·구역·원작의 때·잠김 까닭)이다.
- 효과 `fx:{ task:'burial' }` → `taskOn` 확정 + 때 딱지. `fx:{ taskPath:true }` → 넷을 마쳤는데 경계를 안 겪었으면 `G.tasks.openPath()`: `G.world.changeMap(border.map, border.spawn)`으로 경계 몇 걸음 앞으로 **옮기고** `border.path`·`nudge` 두 줄을 보인다. 새 통로를 만드는 것이 아니다 — 입구(`doors`)는 맵을 불러올 때 한 번 만들어지므로 게임 도중 더해도 생기지 않는다.
- 장사는 `t-burial` 단계의 fx로 먼저 확정해 `t-after`가 '장사 뒤'로 보인다.
- 때 딱지 `G.tasks.timeOf(st)`: 재회 이튿날 → 장사 뒤(`tasks.burial`) → 서너 해 뒤(`mind`). 거점·맵의 `year`가 getter로 이것을 읽고, 바뀔 때 `G.tasks.syncTime()`이 HUD를 맞춘다.
- 이어 하기 지도: `b-tasks`의 `map`·`spawn`은 getter로 `G.rules.act3Map(지금 기록)`을 읽는다(남은 할 일이 한 구역에만 있으면 그 구역, 경계만 남으면 경계 가까이, 아니면 최 씨 집). 기록(`st.tasks`)에는 확정됐지만 엔진 장부(`b:act3:b-tasks.<할 일>`)에는 아직 안 끝난 할 일도 남은 것으로 센다 — 장사는 `t-burial`에서 먼저 확정되므로 `t-after` 도중 닫으면 장사가 남은 것으로 세어져, 시 주고받기까지 마쳤다면 오관산 기슭에서, 시가 남았다면 최 씨 집에서 이어 한다.
- `okru.js`: 단계 `mind`(`mindOn`, 첫 고르기 포커스, 채점 없음)·`okru`(두 구씩 네 대목 + 회상 `G.okru.recallFor(st, '2-3')` — `0-1`은 2막을 건너뛰었으면 `default`, `2-3`·`4-5`는 `byMind`, `6-7` 고정. 조작 없음, 배경음 `okru` → 끝나면 `G.world.music`).

## 마무리·결과 — `finale.js`·`result.js`, 모양은 `css/finale.css`·`css/result.css`

- `finale.js` `G.finale`: 단계 `jeongi`(2막 장면 다시 보기 → 근거 장면 → 한 줄)·`mbs`(줄거리 → 두 고르기, `mbsOn`으로 기록한 뒤에 사실 → 한 줄). `G.app.hooks.finish = G.finale.finish`: 맺음이 끝나면 기록이 덜 찬 마무리 화면만 거점 'finale'(단계 `f-jeongi`·`f-mbs`)로 펼친 뒤 결과 화면. 배경음 `farewell`.
- `result.js` `G.result`: 기록 한 벌 `record(st)`을 화면 `fill`과 그림 `layers`가 함께 쓰고, 같은 그리기 함수 `draw(pen, D)`(펜은 rect·line·text 셋)로 화면 SVG와 저장 캔버스·PNG를 만든다. 건너뛴 막은 '하지 않음'. 원전으로 나가는 문 `openDoor()`(대목 모음 `passages()` — 흐름 차례대로 거점·담·옥루춘의 원문+풀이, 주소는 글로만). 학생 화면에서 접혀 있던 원문(2막 암전)은 여기서도 접힌 채다 — 암전 단계의 `fold`는 `quote` 밖에 있으므로 `passages()`가 가져온 원문에 옮겨 붙인다. 이것을 빼면 '살을 발라냄'이 펼쳐진 채 보인다. 그림 저장 파일 이름은 `세번의담_<이름>.png`. 배경음 `result`.
- 결과 화면에 그릴 것을 더하려면 `G.result.layers.push((pen, D, box) => 높이)`, 화면 내용은 `G.result.fill = (bodyEl, st) => { … }`.

## 흐름 — `app.js`·`main.js`·`js/data/flow.js`

- **차례**: 타이틀 → `FLOW.order`(들어가기 → 1막 → 2막 피란길 → 2막 밤 → 3막 → 맺음) → `app.finish` → `hooks.finish` → 결과 화면. 막 사이 전환은 거점 첫 장(`titleCard`: 막 이름·거점 이름·막 미션 + 표시 칩 '게임 설정')이 맡는다. `app.travel`은 비워 둔다.
- **타이틀**: 저장 기록이 있으면 '이어 하기 / 처음부터'('처음부터'는 한 번 확인한 뒤 `G.save.reset`). 이어 하기는 끝내지 않은 거점의 끝내지 않은 첫 목표부터(`app.continue` → `world.play`가 장부를 본다).
- **바로가기 `?act=1|2|3`**: `main.js`가 `G.boot.routes`에 단다 → `app.title({ act })`. 저장 기록이 없으면 그 막에서 바로 시작하는 단추 하나, 있으면 '이어 하기 / 이 막부터'(글은 `FLOW.shortcut`). 다른 값은 보통 타이틀.
  - `app.startAct(n)`: `shortcutOn`으로 기록을 맞춘 뒤 건너뛴 막마다 30초 요약 카드를 보이고 그 막의 첫 거점을 연다. 요약 카드는 기록하지 않는다.
  - 단계 `{ type:'summary', place:'거점 id' }`: 그 거점 자료의 `summary`(`title`·`scene`·`lines`)를 한 장으로(`.summary-card[data-act]`). 요약을 가진 거점은 `app.summaryPlace(막)`.
- **배경음 배정**: 거점에 들어서면 거점 첫 장부터 그 거점의 `music`(앞 거점·타이틀의 곡이 남지 않게). 타이틀 `title`, 옥루춘 `okru`, 마무리 `farewell`, 결과 `result`. 곡을 바꾸면 받던 곡 요청이 끊겨 크롬이 `ERR_ABORTED`를 남기는데, 이것은 오류가 아니다.
- 선생님용 기능(정답 보기·장면 건너뛰기·선생님 모드)은 두지 않는다.

## 이 폴더의 방식

- 새 화면이 필요한 단계는 자기 파일에서 `G.steps.register('종류', async (step, ctx) => { … })`로 등록한다. `ctx`: `main`(글 자리), `tray(el)`(아래 트레이), `setScene(id)`, `placeId`, `mode:'event'|'dlg'`, `el`, `preset`. 끝나면 resolve.
- 새 조건·효과·줄 종류: `G.steps.conds/effects/lineKinds.이름 = …`(예: 낱말 카드 `fx:{ word:'담장' }`은 `G.steps.effects.word`). 종류별 규칙은 `G.rules.stepRules.종류 = (st, step, place, decision) => 결과`.
- 대사 줄: `'서술'`, `{ t, mark, src, status }`, `{ who, t, mark }`, `{ han, ko, src, status, who?, fold? }`(원문은 늘 풀이와 짝 — 표시 칩 '원문'·'풀이', who가 있으면 그 사람 말풍선 안에), `{ card:{ title, body, quote:{ han, ko, fold } } }`, `{ when, … }`, `{ fx }`, `{ scene }`. `fold:true`인 원문은 '원문 펼치기' 단추를 눌러야 보인다.
- 맵 정의는 `G.world.mk(가로, 세로, 바탕, ops)`(`rect`·`frame`·`border`·`dots`)로 격자를 만들고, 타일 글자·테마는 `tiles.js` 머리 설명을 따른다. 맵 사이 입구: `doors:{ id:{ x, y, w, h, to:'맵 id', spawn:[x, y, '방향'], name } }` — 들어선 자리의 입구는 한 번 벗어난 뒤에야 다시 열린다.
- 목표(beat)의 꼴은 `world.js`의 '거점 진행' 설명. 순서 없는 할 일: `{ id, goal, tasks:[{ id, talk|at|go, steps, need, lockHint, label, fx }], repeat:[{ id, go, steps, back }], finish, finishGoal }`. 마친 할 일의 장부 열쇠는 `b:거점:목표.할 일`(`G.app.key.task`).
- 화면 CSS는 `style.css`의 변수(`--fs`, 팔레트)와 rem을 쓴다. 그러면 글자 크기 3단계와 움직임 줄이기가 저절로 따른다.

## 점검

- `node tests/run-all.mjs rules` — 규칙 함수 전부(브라우저 없이): 담 높이 무벌·막마다 처음, 반응 세 겹, 혼 열림 조건, 장사 잠김, 경계, '함께 가자' 없음, 빈칸 첫 시도, 확정 기록이 되돌리기에 지워지지 않고 두 번 들어가지 않음, 바로가기·이어 하기, 깨진 저장.
- `node tests/run-all.mjs smoke` — 엔진 틀(시험 자료 `tests/fixtures/smoke-places.js`): 타이틀·설정·맵·위치 표시·걷기 셋·말 걸기·사건 화면·고르기 Tab 차례·쓰기 칸과 화면 키보드·'준비 중'·순서 없는 할 일·열림 조건·되풀이 구역·이어 하기·결과 화면 틀·처음부터·세로 안내·44px·콘솔 오류·바깥 요청·저장 열쇠.
- `node tests/run-all.mjs act1 act2 act3 finale` — 막별 실제 자료와 화면(담 화면의 경계·답 고르기·반복의 뜻은 `tests/fixtures/walls-places.js`로도).
- `node tests/run-all.mjs flow` — 키보드만·마우스·터치로 처음부터 결과까지, 다시 열기 넷, `?act=2`·`?act=3`, 배경음 배정, 곡 파일을 막음·소리 끔, 세로 안내.
- 엔진의 목표 꼴이나 단계 꼴을 바꾸면 두 시험 자료와 그 점검도 함께 바꾼다. 화면 문자열을 바꾸면 `node tools/review-doc.mjs`(엔진 자료의 글이 바뀐 경우)와 `python tools/build_fonts.py`(새 글자)를 거쳐 `node tests/run-all.mjs` 전체로 끝낸다.
