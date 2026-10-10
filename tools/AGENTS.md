# tools — 글 확인 문서·부분 글꼴·그림 시안 도구

게임 실행에는 쓰이지 않고, 만드는 쪽에서 돌리는 도구들이다. 결과물(글 확인 문서, `assets/fonts/*.woff2`, `design/art-drafts/*.jpg`)은 저장소에 들어가고 원본(글꼴 원본, 그림 원본 PNG)은 들어가지 않는다.

## 맡는 것

- `review-doc.mjs` — 글 확인 문서를 만든다. `node tools/review-doc.mjs`(다시 쓰기), `--check`(지금 파일이 생성 결과와 같은지만, 다르면 종료 1).
  - 이야기 자료(`walls`·`cards`·`okru`·`finale`, `places/*`)는 `tests/lib-data.mjs`의 `loadData()`로 한 맥락에서, 엔진 자료(`flow`·`texts`·`notes`·`people`·`credits`·`bgm`)는 **파일마다 따로** Node `vm` 맥락에서 실행한다.
  - 모든 값을 훑는다: `t`나 `han`이 있는 객체는 글 덩이 하나, 카드의 `body`도 글 덩이, 그 밖의 한글·한자 문자열은 짧은 글. 표시·출처·상태는 가장 가까운 윗 객체의 것을 물려받는다. 문자열일 때 빼는 열쇠: `mark`·`src`·`status`·`who`·`prompt_hint`. 늘 빼는 열쇠: `grid`.
  - 장면 차례(들어가기 → 1막 → 2막 → 2막 밤 → 3막 → 맺음 → 마무리 화면)로 놓고, 담 앞 순간·옥루춘·빈칸 단계 자리에 해당 자료의 글을 끼워 넣는다. 어디에도 못 끼운 글은 '자리를 정하지 못한 글'에, 엔진 화면 틀 글은 맨 뒤 '화면 틀 글'에 싣는다.
- `build_fonts.py` — 부분 글꼴 7개를 만든다. `python tools/build_fonts.py`.
  - 글자 범위: `js/**/*.js`, `css/**/*.css`, `index.html`의 모든 글자(주석 포함)와 ASCII, 그리고 몇몇 문장 부호.
  - 바탕 `batang(-bold).woff2`(고운바탕, 모든 글자) → 한자 채움 `hanja(-bold).woff2`(고운바탕에 없는 글자를 Noto Serif KR에서) → 드문 한자 `hanja-extra(-bold).woff2`(Noto Serif KR에도 없는 U+3400 이상 한자를 Noto Serif SC에서) → 붓글씨 `brush.woff2`(나눔손글씨 붓, `flow.js`의 `title|subtitle|name`과 거점 파일의 `name`, `BRUSH_EXTRA`).
  - 글꼴 이름을 `IsaengBatang`·`IsaengHanja`·`IsaengHanjaExtra`·`IsaengBrush`로 바꾸고(OFL 예약 이름 피함) `assets/fonts/OFL.txt`를 원 글꼴 넷의 고지·전문과 함께 다시 쓴다.
  - 원본은 `tools/fonts_src/`(git 제외). 없으면 google/fonts 저장소에서 **스스로 내려받는다** — 바깥 내려받기이므로 원본이 빠진 상태에서 돌리기 전에 사용자에게 묻는다. 형제 게임 `../choecheok-jeon/tools/fonts_src/`에 Noto Serif SC를 뺀 원본이 있다.
- `gen.ps1` — Codex CLI의 이미지 생성으로 그림 한 장을 만든다(`-Name -PromptFile -Out [-Size] [-Quality] [-Image -RefMode same|style|char] [-UseModel]`). 결과는 `assets/raw/`(git 제외)에.
- `drafts.py` — `assets/raw/drafts/`의 원본 PNG를 `design/art-drafts/`에 jpg로 줄이고(장면 폭 1280px, 지도 900px) 네 화풍의 장면을 2×2로 모은 `compare.jpg`(폭 1600px)를 만든다. Pillow 필요.
- `prompts/` — 그림 시안 프롬프트 기록(`draft_<화풍>_scene.txt`·`draft_<화풍>_map.txt`, 영어).

## 맡지 않는 것

- 자료를 고치지 않는다. `review-doc.mjs`는 자료를 읽기만 한다.
- 점검을 하지 않는다. 글 확인 문서와 글꼴이 맞는지는 `tests/check-review-doc.mjs`·`tests/check-fonts.mjs`가 본다.
- 게임 그림(본 그림)을 게임에 넣는 일은 이 도구들이 하지 않는다. 그림을 고른 뒤 `window.ART` 등록과 `credits/` 출처 줄은 따로 한다.

## 지켜야 할 것

- **글 확인 문서는 손으로 고치지 않는다.** 다시 만들면 덮어쓴다. 같은 자료면 몇 번 만들어도 한 글자도 같아야 한다 — 날짜·시각·순서가 바뀌는 값(객체 열쇠를 섞기, `Date`)을 문서에 넣지 않는다.
- **글이 조용히 빠지지 않게**: 새 열쇠·새 전역의 글도 '자리를 정하지 못한 글'로라도 실려야 한다. 훑기에서 빼는 열쇠를 늘리면 점검(`check-review-doc`)의 따로 모으기와 어긋나 실패한다 — 둘을 함께 바꾼다.
- **엔진 자료 파일을 따로 실행하는 까닭**: '화면 틀 글'을 파일별 절(`### js/data/flow.js` …)로 나눠 싣기 위해서다. 그래서 두 엔진 자료 파일이 같은 배열에 `push`하면 각자 `[0]` 자리가 되어 문서 자리가 겹치고 점검이 '같은 자리가 두 번 실림'으로 실패한다. 자료 쪽에서 이름 있는 칸을 쓰게 한다. 도구를 한 맥락 실행으로 바꾸면 파일별 절이 무너지고 점검의 따로 모으기(역시 파일별)와도 어긋난다.
- **글꼴 도구가 채울 수 없는 글자**: 세 원본 글꼴 어디에도 없는 기호(✎ U+270E, ▸ U+25B8, ✕ U+2715 등)는 다시 만들어도 들어가지 않는다. 코드·주석에서 그 기호를 빼는 수밖에 없다.
- `build_fonts.py`는 woff2를 쓰려고 brotli가 필요하다. `python`이라는 이름으로 돌린다(글꼴 점검도 같은 이름으로 부른다).
- **그림 도구**(`gen.ps1`): 돌릴 때마다 사용자 승인. 프롬프트는 영어(ASCII)만 — 명령문 안에 그대로 넣어 넘기므로 한글이 섞이면 깨진다. Codex에게 파일을 읽게 하지 않는다(샌드박스가 막는다). 최소 설정만 둔 임시 `CODEX_HOME`(`%TEMP%\codex-img-isaeng-<이름>`)에 로그인 파일을 복사해 쓰고 끝나면 지운다 — 이 복사본을 남기거나 저장소에 넣지 않는다. 모델은 `-UseModel` → `ISAENG_CODEX_MODEL` → `~/.codex/config.toml` 차례.
- 그림 프롬프트에는 글자·낙관·서명을 넣지 않게 적고, 폭력·죽음 장면을 그리지 않는다. 시안에서 옷차림이 조선식(한복·갓)으로 나왔으므로 본 그림 프롬프트에는 고려 말 옷차림을 분명히 적는다.

## 고친 뒤

- `review-doc.mjs`를 고쳤으면 `node tools/review-doc.mjs` 두 번 → 결과가 같은지, `node tests/run-all.mjs review` 통과.
- `build_fonts.py`를 고쳤으면 다시 만든 뒤 `node tests/run-all.mjs fonts rights`(글꼴 글자표, OFL 고지, 출처 목록 `credits/fonts.tsv`의 줄).
- 그림 도구는 점검이 없다. 만든 시안은 `design/art-drafts/README.md`에 파일 목록과 고른 결과를 적는다.
