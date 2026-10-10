# 준비와 실행

명령은 따로 적지 않으면 저장소 루트(`이생규장전/`)에서 실행한다. 설치·내려받기·`git push`는 할 때마다 사용자에게 먼저 묻는다.

## 1. 필요한 것

| 도구 | 쓰는 곳 | 확인 |
| --- | --- | --- |
| Node 18 이상 | 점검 실행기, 글 확인 문서 도구 | `node --version` |
| 설치된 Google Chrome | 크롬 점검(Playwright가 `channel:'chrome'`로 띄움 — Playwright 브라우저를 따로 받지 않는다) | Chrome이 열리는지 |
| Python 3, `python` 명령 | 부분 글꼴 만들기, 글꼴 점검(점검이 `python`이라는 이름으로 부른다 — `python3`만 있으면 실패) | `python --version` |
| fontTools + brotli | woff2 쓰기·읽기(brotli가 없으면 woff2를 못 읽어 글꼴 점검이 실패) | `python -c "import fontTools, brotli"` |
| Pillow | 그림 시안 줄이기(`tools/drafts.py`)만 | `python -c "import PIL"` |
| 형제 폴더 `../choecheok-jeon` | 점검용 Playwright 설치본(`tests/node_modules`)과 글꼴 원본 | `ls ../choecheok-jeon/tests/node_modules/playwright` |

Python 꾸러미가 없으면 사용자 승인 뒤 `python -m pip install fonttools brotli pillow`.

## 2. 처음 준비(차례대로)

1. **Playwright 연결** — 형제 폴더의 설치본이 먼저 있어야 한다(없으면 형제 폴더 `tests/`에서 설치해야 하므로 사용자에게 묻는다). Windows 명령 프롬프트나 PowerShell에서 디렉터리 연결(junction)을 만든다.
   ```
   cmd /c mklink /J tests\node_modules ..\choecheok-jeon\tests\node_modules
   ```
   (Git Bash에서는 `cmd //c mklink /J tests\\node_modules ..\\choecheok-jeon\\tests\\node_modules`.) 확인: `node -e "import('playwright').then(()=>console.log('ok'))"`를 `tests/`에서 실행해 `ok`.
   git 작업 사본(worktree) 안에는 이 연결을 만들지 않는다. 작업 사본을 지울 때 연결 대상(형제 설치본)까지 지워진다. 작업 사본에서 점검을 돌려야 하면 작업 사본들을 담는 상위 폴더에 `node_modules` 연결을 하나 둔다.
2. **글꼴 원본**(글꼴을 다시 만들 때만) — `tools/fonts_src/`(git 제외)에 원본을 둔다. 고운바탕 둘, Noto Serif KR, 나눔손글씨 붓과 그 OFL 글은 형제 폴더에서 복사한다(Git Bash).
   ```
   mkdir -p tools/fonts_src
   cp ../choecheok-jeon/tools/fonts_src/* tools/fonts_src/
   ```
   `NotoSerifSC-VF.ttf`와 `OFL-NotoSerifSC.txt`는 형제 폴더에 없다. `python tools/build_fonts.py`는 없는 원본을 google/fonts 저장소에서 스스로 내려받으므로, 원본이 빠진 상태에서 돌리기 전에 사용자에게 묻는다.

## 3. 게임 열기

웹 주소로만 연다(`file://`로 열면 지원하지 않는다).

```
python -m http.server 8000
```
→ `http://localhost:8000/` · 막 바로가기 `http://localhost:8000/?act=2`(1·2·3). 휴대폰으로 보려면 같은 망에서 `http://<이 컴퓨터 IP>:8000/`. 가로로 들어야 한다.

## 4. 점검

```
node tests/run-all.mjs              # 모든 점검. 종료 0이어야 완료(이 컴퓨터에서 약 6~7분, 그 가운데 check-flow가 약 4분)
node tests/run-all.mjs data rules   # 파일 이름에 그 낱말이 든 점검만(빠른 자료·규칙 점검은 각 1초 안팎)
```

- 크롬 점검은 `tests/serve.mjs`가 빈 포트에 저장소를 서빙하므로 따로 서버를 띄우지 않는다. 이미 띄운 주소를 쓰려면 `BASE=http://127.0.0.1:8000/index.html node tests/check-smoke.mjs`.
- 화면 사진과 걸린 시간은 `tests/shots/`(git 제외)에 남는다. `check-flow`의 시간 기록은 `tests/shots/flow/timing.json`이고, 시범 플레이 시간 문서는 이 값을 바탕으로 사람이 쓴 것이라 점검을 다시 돌려도 저절로 바뀌지 않는다.
- 권리 점검은 git 이력을 훑으므로 git 저장소 안에서만 돈다.

## 5. 글을 고친 뒤(차례가 중요하다)

1. `js/data/`의 글을 고친다.
2. `node tests/run-all.mjs data limits` — 표시·출처·상태, 글 길이, 원문 대조, 넘지 않는 선의 말.
3. `node tools/review-doc.mjs` — 글 확인 문서를 다시 만든다. 자료 파일에 실행 오류가 있으면 도구가 '자료 파일을 읽지 못함'으로 멈추므로 2를 먼저 통과시킨다.
4. 화면에 새 글자(한자·기호 포함)가 생겼으면 `python tools/build_fonts.py` → `assets/fonts/*.woff2`와 `assets/fonts/OFL.txt`가 다시 써진다.
5. `node tests/run-all.mjs` 종료 0을 본 뒤 자료·문서·글꼴을 한 커밋에 넣는다.

교사가 확인한 글을 `확인됨`으로 바꿀 때: 자료 파일에서 그 덩이의 `status`를 바꾸거나(도우미로 만든 덩이는 `{ ...g('…'), status: '확인됨' }`), 파일 전체를 확인했으면 파일 맨 위 `const ST = '확인 전'`을 바꾼다. 지금 글 자료 점검은 모든 글이 `확인 전`이기를 요구하므로 `tests/check-data.mjs`의 상태 검사도 함께 바꾼다(사용자에게 알리고). 그다음 3~5.

## 6. 그림 시안(바깥 도구 — 할 때마다 사용자 승인)

```
powershell -File tools/gen.ps1 -Name draft_x_scene -PromptFile tools/prompts/draft_x_scene.txt -Out assets/raw/drafts/draft_x_scene.png -UseModel gpt-5.6-sol
python tools/drafts.py               # assets/raw/drafts/의 원본을 design/art-drafts/에 jpg로 줄이고 compare.jpg를 만든다
```

Codex CLI에 로그인되어 있어야 한다(`~/.codex/auth.json`). 원본 PNG는 `assets/raw/`(git 제외)에만 둔다.

## 7. 올리기와 공개

- 원격 저장소: `pblsketch/isaeng-gyujang-jeon`(`main`, 비공개). `git push`는 사용자 승인 뒤에만 한다.
- **공개로 바꾸기 전에**(사용자 승인 뒤) 기획 폴더 `design/`을 git 기록에서까지 지운다 — 지금 커밋에서 지우는 것으로는 이력에 남는다. 이력을 다시 쓴 뒤 `node tests/run-all.mjs rights`로 출판사 이름·추적 파일을 다시 확인하고, 강제 push가 필요하므로 그것도 사용자에게 묻는다.
- **GitHub Pages**: 공개 전환 뒤 사용자 승인을 받아 저장소 설정에서 `main` 브랜치 루트로 켠다. 빌드 단계가 없으므로 저장소 루트가 그대로 사이트다. 시리즈 게임과 같은 Pages 주소(같은 출처)에 올라가도 저장 열쇠 머리말(`isaeng-gyujang:`)로 나뉜다.
- 올린 뒤 휴대폰 가로로 주소를 열어 처음부터 결과 화면까지 한 번 가 보고, `?act=3`이 열리는지 본다.

## 설정 값

게임에는 환경 변수나 설정 파일이 없다. 학생 설정(글자 크기·배경음·움직임 줄이기)은 게임 안 설정 화면에서 바꾸고 그 브라우저에만 남는다. 만드는 쪽에서 쓰는 값:

| 값 | 쓰는 곳 | 뜻 |
| --- | --- | --- |
| `BASE` | 크롬 점검(`tests/serve.mjs`) | 주면 내장 서버 대신 그 주소를 연다 |
| `ISAENG_CODEX_MODEL` | `tools/gen.ps1` | 그림 생성에 쓸 Codex 모델(`-UseModel`이 먼저) |
| `ISAENG_CODEX_BIN` | `tools/gen.ps1` | 쓸 `codex.exe` 경로(없으면 데스크톱 앱의 것, 그다음 PATH) |
