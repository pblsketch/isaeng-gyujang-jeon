# js/game — 게임 엔진

형제 게임 「최척전」(`../choecheok-jeon`)의 걷는 지도 엔진을 가져와, 그 게임에만 있던 것(연·생 게이지, 쓰러짐, 결말 넷, 원작 궤적, 이어 하기 글자, 두 방식, 선생님 모드, 고지도, 퉁소·시구 맞추기·뱃길, 수첩, 효과음·합성 음악, 파일로 열기)을 걷어 내고 이 게임에 필요한 지도 기능을 더했다.

## 맡는 것
- `steps.js`: 단계 실행기(`G.steps.register/run`), 조건(`conds`)·효과(`effects`)·줄 종류(`lineKinds`), 기본 단계 `say`·`choice`·`card`, 표시 칩 `G.steps.mark(표시)`, 원문+풀이 `G.steps.quote({ han, ko, src, fold })`, 카드 한 장 `cardMoment`·`infoCard`, 한 줄 쓰기 `G.steps.writeLine(ctx, o)`.
- `rules.js`: 규칙의 바닥(한 번만 반영 장부 `onceOn`·`applyStep`·`applied`, 종류별 규칙 자리 `G.rules.stepRules`, 새로고침 대비 `snapKeys`에 `applied`, 거점 기록과 `attach`)과 이 게임의 규칙(아래 '규칙(G.rules)' 절).
- `tiles.js`·`world.js`: 코드로 그리는 땅 타일과 테마, 탑다운 맵(카메라·충돌·조이스틱·말 걸기·목표 진행·대화창·맵 사이 입구), 지금 할 일의 위치 표시(은은한 빛·가장자리 화살표), 순서 없는 할 일·열림 조건·되풀이 구역, 바깥에서 부르는 `G.world.waitGoal`, 시험 손잡이 `G.world.test`.
- `app.js`: 화면 흐름(타이틀 '시작'/'이어 하기'·'처음부터' → 거점 차례 → 끝), 사건 화면, 단계 실행(`runSteps`), 거점 첫 장, '준비 중' 거점, 설정(글자 크기 3단계·배경음·움직임 줄이기·전체 화면), 가로 안내, 전체 화면 `G.app.fs`, 걸이 `G.app.hooks.credits/finish`, 그림 내려받기 `downloadCanvas`.
- `result.js`: 결과 화면 `G.result`(spec 10절 — 기록 한 벌 `record(st)`을 화면 `fill`과 그림 `layers`가 함께 쓰고, 같은 그리기 함수 `draw(pen, D)`로 화면 SVG와 저장 캔버스·PNG), 원전으로 나가는 문 `openDoor()`(대목 모음 `passages()` — 흐름 차례대로 거점·담·옥루춘의 원문+풀이).
- `finale.js`: 마무리 화면 `G.finale` — 단계 `jeongi`(전기적 요소 한 줄: 2막 장면 다시 보기 → 근거 장면 → 한 줄)·`mbs`(「만복사저포기」: 줄거리 → 두 고르기, 기록 뒤 사실 → 한 줄). `G.app.hooks.finish = G.finale.finish`: 맺음(`FINALE.ui.after`)이 흐름에 있으면 기록이 덜 찬 마무리 화면만 거점 'finale'(단계 `f-jeongi`·`f-mbs`)로 펼친 뒤 결과 화면.
- 이 게임의 화면: `wall.js`(T4 담 앞 순간·답 고르기 — 아래 절), `blank.js`(T4 빈칸·반복의 뜻), `hon.js`(T5 혼), `tasks.js`·`okru.js`(T6).
- 글 칸의 줄을 보이게 할 때는 `G.ui.reveal(el)`만 쓴다. `scrollIntoView`는 놀이 화면 틀까지 굴려 HUD가 잘린다.

## 맡지 않는 것
- 이야기 글·고르기·카드 문안은 `js/data/`에 있다. 엔진에는 대체 글('준비 중', 기본 단추 이름)만 둔다. 엔진 공통 글은 `TEXTS`(표시 이름·색, 전체 화면, 가로 안내, 얻은 것 알림 틀, 잠긴 할 일 안내, 접은 원문 단추).
- 저장소 접근은 `G.save`만 쓴다(`localStorage` 직접 접근 금지). HUD·소리 내부는 `js/core/`의 공개 함수로만 부른다.
- `index.html`의 스크립트 차례는 T1이 정했다. 뒤 작업은 자기 파일만 채우고 `index.html`을 고치지 않는다. 공통 CSS는 `css/style.css`, 화면별 CSS는 `css/wall.css`·`hon.css`·`okru.css`·`finale.css`·`result.css`.

## 지켜야 할 것
- **넘지 않는 선**: 점수·등급·순위·시간 제한·게임 오버를 어떤 화면에도 두지 않는다. 게이지·선생님 단추·방식 고르기·수첩을 되살리지 않는다(`tests/check-smoke.mjs`가 본다). 바깥 주소로 요청하지 않는다(SVG 이름공간 문자열만 예외).
- **규칙은 순수 함수 한 벌**: 상태를 바꾸는 규칙은 `…On(st, …)` 꼴로 평범한 객체에 대해 짠다. 화면 코드 안에서 기록을 직접 고치지 말고 규칙 함수를 부른다.
- **한 번만 반영**: 단계 효과는 `G.rules.applyStep(step, { place, decision })`로 적용한다. 열쇠는 `s:거점:단계`. 같은 열쇠로 두 번 적용되지 않는다.
- **확정 기록과 되돌리기**: 단계 도중 새로고침하면 `runSteps`가 `G.save.snapKeys`(지금 `flags`·`applied`)를 단계 시작 값으로 되돌리고 그 단계를 다시 펼친다. 반응을 본 시도(수단·빈칸 카드·제안의 답·만복사 고르기)는 그 자리에서 확정하고, 그 칸(`G.save.COMMITTED`: walls·propose·blanks·tasks·border·hon·mind·lines·jeongiScene·mbs·skipped·name·words)은 **snapKeys에 넣지 않는다**. 같은 시도가 두 번 들어가지 않게 시도 번호(`n`)를 둔다.
- 등록되지 않은 단계 종류·비어 있는 거점·없는 걸이는 오류 없이 '준비 중'으로 넘긴다. 단계 함수가 던지면 `runSteps`가 오류 카드를 보이고 다음으로 넘어간다.
- `app.play`·`app.next`를 감쌀 때는 원래 함수를 반드시 부른다(`G.rules.attach`가 이미 감싼다).
- 대화창을 닫은 뒤 300ms(`W.closedAt`) 동안 E·Enter·Space·Z를 말 걸기로 받지 않는다.
- 전체 화면은 사용자 누름 안에서만 부른다. 지원하지 않으면 `fs.button()`이 `null`. 콘솔 오류를 내지 않는다.
- **소리**: 배경음만(`G.audio.play(장면 id)`, `BGM.tracks`). 효과음·합성 음악·낭송을 더하지 않는다. 파일이 없으면 조용히 소리 없이 간다.
- **누를 곳·키보드·글자 크기·움직임**: 단추·고르기·쓰기 칸은 44px 이상(`max(44px, …)`), 첫 고르기에 포커스, Tab 차례가 화면 차례와 같게. 크기는 rem으로(글자 크기 3단계 `--fs`), 움직임은 animation·transition으로(움직임 줄이기 `html.reduce-motion`이 멈춘다). 캔버스·JS 움직임은 `G.ui.calm()`을 본다.
- **한 줄 쓰기는 `G.ui.writeField`(또는 `G.steps.writeLine`)만 쓴다**: 화면 키보드가 보이는 화면을 줄여도(가로 높이 320~390px) 입력 칸과 완료 단추가 함께 보이게 보이는 화면 맨 아래에 붙는다(`.wf-docked`). 빈칸이면 넘어가지 않는다(required).
- 그림은 아직 없다(spec 13절): 그림 목록(`window.ART`)에 없는 그림을 요청하지 않는다. 사람은 단색 사람 모양, 소품은 `SPRITES`의 `shape`, 삽화 자리는 빈 종이 판.
- 화면은 그림책풍 미술 방향(전체 화면 맵 + 구석 HUD, 사건 화면은 삽화 + 한지 판 + 엄지 자리 트레이)을 따른다.

## 규칙(G.rules) — 화면이 부르는 함수
모두 `…(st, …)` 꼴 순수 함수다(`st` = `G.save.state`). 기록을 바꾸는 함수(…On)를 부른 뒤 화면이 `G.save.write()`로 저장한다. 오류는 `{ error:'…' }`로 돌려주고 기록하지 않는다. 자료(`WALLS`·`CARDS`·`FINALE`·`FLOW`·`PLACES`)는 부를 때 읽는다. 점검: `node tests/check-rules.mjs`.

| 함수 | 하는 일 | 저장 칸 |
| --- | --- | --- |
| `meansFor(st, 순간)` | 수단 칸 `[{ id, name, locked, used, uses }]`. 혼이 잠겼으면 맨 끝에 `name:null` 잠긴 칸 | 읽기 |
| `nextAttempt(st, 순간)` | 다음 시도 번호. 고르기 단추를 그릴 때 받아 두고 아래 두 함수에 넘긴다(두 번 눌러도 한 번) | 읽기 |
| `useMeansOn(st, 순간, 수단, n)` | 수단 쓰기 → `{ n, means, pass, layers, react:[글…], height, recorded }`. 맞지 않으면 반응만(진행 안 막음). 통과한 순간·이미 있는 번호는 다시 안 적음(`recorded:false`). 경계는 늘 `pass:false`, 쓰면 `border:true` | `walls`, `border` |
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
| `jeongiSceneOn(st, 장면)` · `canWrite(st, 쓰기)` · `lineOn(st, 쓰기, 글)` | 근거 장면 · 쓰기 칸이 열렸나(`jeongi`는 장면 뒤) · 쓰기(빈 글이면 `error:'empty'`) | `jeongiScene`, `lines` |
| `mbsOn(st, 'q1'\|'q2', 보기)` | 사실을 보이기 전에 부른다. 한 번만 → `{ choice, fact, quote }`(맞고 틀림 없음) | `mbs` |
| `hasProgress(st)` · `shortcutOn(st, 1\|2\|3)` | 기록이 있나(있으면 '이어 하기 / 이 막부터'를 묻는다) · 새로 시작이나 '이 막부터': 앞 막 기록은 두고 그 막부터 기록·장부를 지움, 빈칸 덜 찬 앞 막은 `skipped` + 원작 낱말, 앞 거점은 끝낸 것으로, 3막부터면 혼 열림 | 모두 |
| `resumePoint(st)` | 이어 하기 지점 `{ place, act, beat, map, spawn }`(걷던 자리는 그 지도의 시작 지점) | 읽기 |
| `validSave(o)` | 저장 모양 점검. `G.save.valid`로 걸려 깨진 기록이면 처음부터 | — |

- **확정 기록과 되돌리기**: 위 …On이 적는 칸은 `G.save.COMMITTED`이고 `snapKeys`(되돌리기)에 넣지 않는다. 시도(수단·답)는 `applyStep`·`applied` 장부를 거치지 않고 **시도 번호 `n`**으로 한 번만 들어간다 — `applied`는 되돌리기에 들어 있어 단계 도중 새로고침하면 지워지므로, 장부로 막으면 두 번 들어갈 수 있다. 그 밖의 칸은 '한 번 정해지면 그대로'라 다시 불러도 같다. `stepRules.wall`·`propose`는 기록을 읽기만 한다.
- 담 높이·반응 겹은 저장하지 않고 늘 기록에서 다시 구한다. 화면에 점수·맞음·틀림을 보이지 않는다.

## 담 앞 순간·빈칸 화면(T4) — 2·3막은 고치지 않고 이렇게 쓴다
- **담 앞 순간** `{ id, type:'wall', wall?:'순간', tip?:글 덩이, leave?:글 덩이, scene?, next? }` — 순간 열쇠는 `wall`, 없으면 `id`(예: `{ id:'w2-bandit', type:'wall' }`). 화면은 `js/game/wall.js`.
  - 담 높이 그림(`.wall-stage[data-height]`, 보이기만) → `intro` 한 줄씩(마지막 줄은 고르기와 함께) → 수단 칸(`meansFor`: 혼이 잠겼으면 이름 없는 잠긴 칸, 써 본 칸에 '써 봄') → 고르면 `useMeansOn`으로 곧바로 기록(단추를 그릴 때 받은 `nextAttempt` 번호) → 반응(`react` 세 겹은 규칙이 고름) → 원작에 맞으면 `applyStep` 후 '다음', 아니면 담만 높아지고 다시 고른다.
  - `tip`은 처음 고를 때 칸 위 안내(없으면 `TEXTS.WALL.pick`). 단계가 시작되면 삽화를 `scene`(없으면 비움)으로 바꾼다.
  - 통과가 없는 순간(`G.rules.canLeave`, `w3-border`): 들어서면 `borderOn`을 부르고 '돌아서기' 칸이 붙는다. 떠날 때 글은 `leave` → 거점 자료의 `border.leave`(그 순간을 가리키는 것) → `TEXTS.WALL.leaveLine`. 단계는 `{ left:true }`로 끝난다(되풀이 구역이면 `runSteps`의 `again`으로 다시 열린다).
  - 하다 말고 껐다 켜면: 기록은 그대로, 마지막 반응을 다시 보이고 이어 고른다. 이미 통과했으면 통과 반응과 '다음'만.
- **답 고르기** `{ id, type:'propose', wall:'w3-propose' }`(또는 `kind:'answer'`인 순간의 `wall` 단계) — `together`(이생의 말·최 씨의 원작 답·note, 고르기 아님)를 먼저 한 줄씩 → `intro` → `labels`의 답 단추(`proposeChoices`, '함께 가자' 없음) → `answerOn` 기록 → `stay`는 반응·담이 높아짐·다시 고름, 원작의 답은 '다음'.
- **막 끝 빈칸** `{ id, type:'blank', act:'act1'|'act2' }` — 표 전체(`CARDS.table`) + 그 막의 빈칸(`CARDS[막].blanks`)을 차례로. 카드는 `cardsFor(막)`(가나다 차례). 맞지 않는 카드는 `replies`의 인물 말 + 다시 고름(오답 표시 없음), 기록은 `blankOn`(first·final). 막 얻은 낱말 알림이 지나간 뒤 카드를 늘어놓는다.
- **3막 끝** `{ id, type:'blank', act:'act3' }` — 표 전체 + `FINALE.repeat`(물음·help) + 한 문장 쓰기(필수, `lineOn('repeat')`).
- 도우미: `G.blank.josa(낱말, '을'|'이'|'으로'…)`(받침 없으면 를·가·로, ㄹ 받침은 로), `G.blank.fill(표 문장, { 빈칸: 낱말 })`, `G.blank.table(st, { active, keys })`(결과 화면에서 같은 표를 그릴 때). 화면 이름표는 `TEXTS.WALL`·`TEXTS.BLANK`(js/data/texts.js 맨 아래), 모양은 `css/wall.css`.
- 점검: `node tests/check-act1.mjs`(1막 실제 자료 + `tests/fixtures/walls-places.js`로 경계·답 고르기·반복의 뜻).

## 이 폴더의 방식
- 새 화면이 필요한 단계는 자기 파일에서 `G.steps.register('종류', async (step, ctx) => { … })`로 등록한다. `ctx`: `main`(글 자리), `tray(el)`(아래 트레이), `setScene(id)`, `placeId`, `mode:'event'|'dlg'`, `el`, `preset`. 끝나면 resolve.
- 새 조건·효과·줄 종류: `G.steps.conds/effects/lineKinds.이름 = …`(예: 낱말 카드 `fx:{ word:'담장' }`은 `G.steps.effects.word`). 종류별 규칙은 `G.rules.stepRules.종류 = (st, step, place, decision) => 결과`.
- 대사 줄: `'서술'`, `{ t, mark, src, status }`, `{ who, t, mark }`, `{ han, ko, src, status, who?, fold? }`(원문은 늘 풀이와 짝 — 표시 칩 '원문'·'풀이', who가 있으면 그 사람 말풍선 안에), `{ card:{ title, body, quote:{ han, ko, fold } } }`, `{ when, … }`, `{ fx }`, `{ scene }`. `fold:true`인 원문은 '원문 펼치기' 단추를 눌러야 보인다.
- 맵 정의는 `G.world.mk(가로, 세로, 바탕, ops)`로 격자를 만들고, 타일 글자·테마는 `tiles.js` 머리 설명을 따른다. 맵 사이 입구: `doors:{ id:{ x, y, w, h, to:'맵 id', spawn:[x, y, '방향'], name } }`.
- 목표(beat)의 꼴은 `world.js`의 '거점 진행' 설명. 순서 없는 할 일: `{ id, goal, tasks:[{ id, talk|at|go, steps, need, lockHint, label, fx }], repeat:[{ id, go, steps, back }], finish, finishGoal }`. 마친 할 일의 장부 열쇠는 `b:거점:목표.할 일`(`G.app.key.task`).
- 결과 화면에 그릴 것을 더하려면 `G.result.layers.push((pen, D, box) => 높이)`, 화면 내용은 `G.result.fill = (bodyEl, st) => { … }`.

## 점검
- `node tests/check-smoke.mjs`(엔진 틀: 타이틀·설정·맵·위치 표시·걷기 셋·말 걸기·사건 화면·고르기 Tab 차례·쓰기 칸과 화면 키보드·'준비 중'·순서 없는 할 일·열림 조건·되풀이 구역·이어 하기·결과 화면 틀·처음부터·세로 안내·44px·오류·바깥 요청·저장 열쇠). 전체: `node tests/run-all.mjs`.
- 시험 자료는 `tests/fixtures/smoke-places.js`(실제 거점과 상관없이 엔진만 본다). 엔진의 목표 꼴을 바꾸면 이 자료와 점검도 함께 바꾼다.
