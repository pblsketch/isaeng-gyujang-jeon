# js/data — 이야기와 글(선생님이 고치는 자료)

## 맡는 것
- `walls.js`: 담 앞 순간 다섯(`WALLS[순간]`) — `w1-poem`·`w1-parents`(1막), `w2-bandit`(2막), `w3-border`·`w3-propose`(3막). 수단 목록(`means`), 원작에 맞는 수단(`ok`), 들어가는 글(`intro`), 수단마다 그 순간의 행동 글(`opts`), 세계의 반응 세 겹(`react[수단].first·again·hint`). `w3-propose`는 답 고르기(`kind:'answer'`, `answers:['stay','entrust']`, 단추 글 `labels`)이고 `together`(이생의 '함께 저승에' 말 + 최 씨의 원작 답)는 고르기가 아니라 고르기 앞에 나오는 대화다.
- `cards.js`: 낱말 카드(`act1`·`act2`의 `give`·`decoy`·`blanks`, 정답 표 `answer`, 카드 설명 `words`), 맞지 않는 카드에 인물이 하는 말(`replies[빈칸][카드]`, `default`), 결과 화면 '만남과 이별' 표 세 줄(`table`).
- `okru.js`: 옥루춘 여덟 구(`lines`, 원문+풀이)와 대목 회상(`recall`: `0-1` 고정+`default`, `2-3`·`4-5`는 `byMind.treasure·rites·poems`, `6-7` 고정), 앞뒤 글(`intro`·`after`·`note`).
- `finale.js`: 반복의 뜻 물음(`repeat`), 근거 장면 넷(`scenes`), 전기적 요소 한 줄(`jeongi`, `ref`가 2막 혼 단계를 가리킴), 「만복사저포기」(`mbs`: 줄거리 카드·두 고르기·원작 사실·맺음), 만복사 한 줄(`mbsSame`), 되짚기 질문 둘(`review`), 「김현감호」 한 줄(`kimhyeon`), 원전으로 나가는 문 안내(`sourceDoor`).
- `places/*.js`: 거점 여섯(`PLACES[id]`) — `prologue`(들어가기), `act1`(정원), `act2`(피란길), `act2night`(밤의 최 씨 집), `act3`(세 구역), `epilogue`(맺음). 맵 격자·자리·사람·목표(beats)·단계(steps)·삽화 설명(scenes), 바로가기 30초 요약 카드(`summary`, 1·2·3막 거점).
- 엔진이 읽는 `flow`·`texts`·`notes`·`people`·`sprites`(엔진 작업), `bgm`·`credits`(배경음 작업)는 이 설명 밖이다.

## 맡지 않는 것
- 규칙의 동작(담 높이 셈, 반응 세 겹 고르기, 혼 열림, 장사 잠김, 확정 기록)은 `js/game/`에 있다. 여기서는 글과 자리만 바꾼다.
- 맵 격자와 사람 자리는 막 작업(1막·2막·3막)이 고친다. 지금 격자는 자리 표시다. 거점 파일은 `G.world.mk`가 없으면(엔진 없이 읽힐 때) 같은 방식의 작은 대체 함수로 격자를 만든다(`rect`만).

## 지켜야 할 것
- **원문**(`han`): `design/sources/wikisource-geumosinhwa-raw.txt`(위키문헌 「번역:금오신화」)의 글자만. 기억으로 쓰거나 지어 넣지 않는다. 한 덩이(한 화면)에 1~2구. 늘 `ko`(새로 옮긴 풀이)와 짝. 사본의 오자로 보이는 글자(예: 黃壞, 匙筋)가 든 대목은 고르지 않는다.
- **번역문 금지**: 풀이·장면 글·인물 말·반응·요약·만복사 줄거리는 모두 새로 쓴다. 교과서·지도서·번역서 문장을 옮기지 않는다(교과서와는 뜻이 어긋나지 않는지만 대조한다).
- **표시와 상태**: 모든 글 덩이에 `mark`(`원문`·`풀이`·`게임 설정`·`이본 노트`·`해석`), `src`(출처, 근거 대목), `status`(이번 판은 모두 `확인 전`). 게임이 지어낸 것(수단, 담, 낱말 카드, 마음 둔 곳, 혼으로 걷는 길, 할 일 순서 자유, 반응 대사)은 `게임 설정`.
- **글 길이**: 사건 화면 글 180자, 반응 글(`react`·`replies`) 70자, 원문 한 화면 1~2구.
- **반응 글은 인물·세계의 말**: '틀렸다' 투, 학생 탓을 쓰지 않는다. 실마리(`hint`)는 다음에 해 볼 쪽을 인물의 말로 넌지시.
- **넘지 않는 선**: 점수·등급·순위·시간 제한·게임 오버·정답·오답 같은 말을 쓰지 않는다(`정답게`처럼 그 글자가 든 낱말도 점검에 걸린다).
- **민감한 장면**(spec 12절): 도적의 위협은 `w2-bandit`의 `intro` 한 줄, 꾸짖음(`a2-rebuke`) 바로 뒤 암전(`a2-dark`, 그림 자리 없음, 폭력은 한 줄 서술), '살을 발라냄'은 암전의 원문 카드(`quote`, 펼침 `fold`) 풀이에만, 해석 카드(`a2-era`) 한 장. 1막 밀회는 "밤마다 몰래 만났다" 한 줄. 화면의 시는 최 씨가 읊은 시와 여덟 글자, 옥루춘뿐(이생의 시들은 싣지 않는다). 이생의 죽음은 `e-death` 암전 한 줄. '함께 가자'는 고르기에 없다.
- **id는 바꾸지 않는다**(거점·목표·단계·순간·빈칸·할 일·마음 둔 곳·장면). 저장 열쇠와 다른 작업의 점검이 id로 묶여 있다. 새 것은 새 id로.
- 장면 id는 `sc_<거점>_<무엇>`. `scenes`에 `caption`(그림 설명)과 `prompt_hint`(영어, 그림 안에 글자 없음)를 적는다. 폭력·죽음 장면에는 그림 자리를 두지 않는다.

## 이 폴더의 방식
- 파일마다 전역 하나를 채우고(`window.WALLS`, `window.PLACES.act1` …), 파일 안 도우미는 즉시 실행 함수 안에 둔다(파일끼리 이름이 부딪지 않게).
- **글 덩이**: `{ t, mark, src, status }` (+ 말하는 인물 `who`). **원문 덩이**: `{ han, ko, mark:'원문', src, status }` (+ `who`).
- **대사 줄**(`lines`·`intro`): 글 덩이 또는 원문 덩이. 원문 덩이는 원문+풀이 한 장으로 보인다(엔진의 줄 종류 `han`). 글자 그대로의 문자열 줄은 그 단계의 `mark`·`src`·`status`를 따른다.
- **카드**: `{ type:'card', card:{ title, body, mark, src, status, quote:{ han, ko, … } } }`. `body`의 `\n`은 문단 나눔. 카드 앞에 `lines`를 둘 수 있다.
- **단계 종류**(plan 1-2): `say`, `card`, `wall`(`id`가 곧 순간 열쇠), `blank`(`act`), `hon`, `tasks`(`list`), `mind`(`q`·`note`·`options[{id,t}]`), `okru`, `propose`(`wall:'w3-propose'`), `blackout`(`t` 한 줄, 원문 카드는 `quote`+`fold`), `summary`는 거점의 `summary`를 쓴다.
- **혼 단계**(`act2night`의 `n-hon`): `walk`(걷기 안내), `reveal`(`name:'혼'`, `tag:'전기적 요소'`, `explain`), `reason`(원문 天帝…假以幻體 두 덩이), `note`(원작에서는 3막 끝 저녁의 말임), `setting`(혼으로 걷는 길은 게임 설정).
- **낱말 카드**는 단계의 `fx: { word: '담장' }`으로 저절로 준다(빈칸 단계보다 앞). 1막: 담장·울주·혼인·과거 급제, 2막: 홍건적의 난·피란·꿈·환신.
- **표 문장**의 `{빈칸 열쇠:조사}`: 그 자리에 고른 낱말을 넣고, 조사는 받침 있는 꼴(을·이·으로)로 적는다. 낱말에 받침이 없으면 를·가·로로 바꿔 붙인다.
- **3막**(`act3`): `tasks.<할 일>`에 `name`·`goal`·`map`·`spot`·`time`(때 딱지)·`steps`, 장사는 `need:['treasure','bones']`·`locked`·`after:'장사 뒤'`. `border`는 경계 구역(`wall:'w3-border'`, `goal`, `nudge`, `leave`). 노복은 `cast.home.servant.after:'burial'`(장사 뒤에만).
- 인물 id: `choi`(최 씨, 학생), `isaeng`, `hyanga`(향아), `choi_father`, `choi_mother`, `isaeng_father`(말로만), `maepa`(매파), `servant`(노복). 이름·색은 `people.js`.

## 고친 뒤
- `node tests/check-data.mjs`(엔진 없이 자료만 읽는다: 담 앞 순간이 spec 5-2와 같음, 반응 세 겹, 빈칸과 카드의 때, 옥루춘 회상 짝, 표시·출처·상태, 원문 한자가 원문 사본에 그대로 있음, 글 길이, 넘지 않는 선의 낱말).
- 글을 늘리거나 바꾸면 `design/content-inventory.md`의 개수도 맞춘다. 화면 글자가 바뀌었으면 글꼴을 다시 만든다(글꼴 작업의 도구).
