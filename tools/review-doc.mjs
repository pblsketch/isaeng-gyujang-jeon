// 글 확인 문서 만들기(spec 11절 '글 확인 문서', plan T11). 다시 돌려도 한 글자도 다르지 않은 문서가 나온다(날짜·시각을 넣지 않는다).
//
//   node tools/review-doc.mjs           docs/글-확인.md를 새로 쓴다
//   node tools/review-doc.mjs --check   지금 파일이 생성 결과와 같은지만 본다(다르면 종료 1)
//
// 모으는 법
//  - 자료 파일(js/data/walls·cards·okru·finale.js, js/data/places/*.js)을 엔진 없이 읽는다(tests/lib-data.mjs의 loadData).
//  - 모든 값을 빠짐없이 훑는다. `t`나 `han`이 있는 객체는 글 덩이 하나(원문·풀이·글·표시·출처·상태·말하는 인물),
//    카드의 `body`도 글 덩이 하나, 그 밖의 한글·한자가 든 문자열(제목·이름·목표·단추 글 등)은 짧은 글 하나다.
//    표시·출처·상태는 가장 가까운 윗 객체의 것을 물려받는다(tests/check-data.mjs와 같은 방식).
//    빼는 열쇠(값이 문자열일 때): mark·src·status(덩이와 함께 보임), who(인물 id, 이름으로 보임), prompt_hint(영어 그림 지시). 늘 빼는 열쇠: grid(맵 격자).
//  - 장면 차례로 놓는다: 들어가기 → 1막 → 2막 → 2막 밤 → 3막 → 맺음 → 마무리 화면. 거점의 단계를 차례로 보이고,
//    담 앞 순간·옥루춘·빈칸 단계 자리에는 walls·okru·cards·finale의 해당 글을 끼워 넣는다.
//  - 어디에도 끼워 넣지 못한 글(나중에 새로 생긴 열쇠 등)은 '자리를 정하지 못한 글'에 모두 싣는다. 그래서 글이 조용히 빠지지 않는다.
//  - 엔진 화면 틀 글(flow·texts·notes·people·credits·bgm)은 맨 뒤 '화면 틀 글'에 싣는다(표시·상태 없음).
// 자료는 읽기만 한다(고치지 않는다). 점검: node tests/check-review-doc.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadData, root as ROOT, PLACE_IDS } from '../tests/lib-data.mjs';

export { ROOT };
export const DOC_REL = 'docs/글-확인.md';
export const DOC_PATH = path.join(ROOT, DOC_REL);

// 이야기 자료의 전역 이름 → 파일(거점은 PLACES.<id> → js/data/places/<id>.js)
export const STORY_FILES = { WALLS: 'js/data/walls.js', CARDS: 'js/data/cards.js', OKRU: 'js/data/okru.js', FINALE: 'js/data/finale.js' };
// 엔진 화면 틀 글이 든 파일(표시·상태가 없는 화면 이름표)
export const ENGINE_FILES = ['flow', 'texts', 'notes', 'people', 'credits', 'bgm'].map((n) => `js/data/${n}.js`);

export const TEXTY = /[ᄀ-ᇿㄱ-ㆎ가-힣㐀-䶿一-鿿豈-﫿]/;
// 문자열일 때만 빼는 열쇠(값이 객체면 그 안의 글은 싣는다. 예: NOTES.status의 상태 이름) / 늘 빼는 열쇠
export const SKIP_STR = new Set(['mark', 'src', 'status', 'who', 'prompt_hint']);
export const SKIP_ALL = new Set(['grid']);
const ID = /^[A-Za-z_$][\w$]*$/;

// 열쇠 경로 글자: WALLS['w1-poem'].react.mal.first, PLACES.act1.steps[3].lines[0]
export function fmtPath(p) {
  return p.map((k, i) => (i === 0 ? String(k) : typeof k === 'number' ? `[${k}]` : ID.test(k) ? '.' + k : `['${k}']`)).join('');
}

// ───────── 읽기 ─────────
function runFresh(rel) {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return {};
  vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: rel });
  const out = {};
  for (const k of Object.keys(ctx)) if (k !== 'console' && k !== 'window') out[k] = ctx[k];
  return out;
}

// { story: { WALLS, CARDS, OKRU, FINALE, PLACES, …그 밖의 전역 }, engine: [{ file, globals }] }
export function loadAll() {
  const { ctx, missing, errors } = loadData();
  if (missing.length || errors.length) throw new Error('자료 파일을 읽지 못함: ' + [...missing, ...errors].join('; '));
  const story = {};
  for (const k of Object.keys(ctx)) if (k !== 'console' && k !== 'window') story[k] = ctx[k];
  const engine = ENGINE_FILES.map((file) => ({ file, globals: runFresh(file) }));
  return { story, engine };
}

// ───────── 훑기 ─────────
// 항목: { kind:'han'|'t'|'body'|'str', path, key, t, han, ko, text, who, mark, src, status }
export function walkItems(value, at, meta = {}, out = [], key = null) {
  if (typeof value === 'string') {
    if (!SKIP_STR.has(key) && TEXTY.test(value)) out.push({ kind: 'str', path: at, key, text: value, ...meta });
    return out;
  }
  if (Array.isArray(value)) { value.forEach((v, i) => walkItems(v, [...at, i], meta, out, key)); return out; }
  if (!value || typeof value !== 'object') return out;
  const own = (k) => (typeof value[k] === 'string' ? value[k] : meta[k]);
  const m = { mark: own('mark'), src: own('src'), status: own('status') };
  const chunk = typeof value.t === 'string' || typeof value.han === 'string';
  if (chunk) {
    out.push({
      kind: typeof value.han === 'string' ? 'han' : 't', path: at, key,
      t: typeof value.t === 'string' ? value.t : undefined,
      han: typeof value.han === 'string' ? value.han : undefined,
      ko: typeof value.ko === 'string' ? value.ko : undefined,
      who: typeof value.who === 'string' ? value.who : undefined, ...m,
    });
  }
  for (const [k, v] of Object.entries(value)) {
    if (SKIP_ALL.has(k) || (SKIP_STR.has(k) && typeof v === 'string')) continue;
    if (chunk && (k === 't' || k === 'han' || k === 'ko') && typeof v === 'string') continue;
    if (k === 'body' && typeof v === 'string') { out.push({ kind: 'body', path: [...at, k], key: k, t: v, who: typeof value.who === 'string' ? value.who : undefined, ...m }); continue; }
    walkItems(v, [...at, k], m, out, k);
  }
  return out;
}

// ───────── 글로 옮기기 ─────────
const MEANS = { mal: '말', si: '시', gyeoldan: '결단', hon: '혼', stay: '남겠다는 답', entrust: '떠나겠다는 답' };
const LAST = { first: '첫 반응', again: '다시 쓸 때', hint: '실마리', default: '목록 밖 카드가 들어올 때', fixed: '고정', locked: '잠겼을 때', nudge: '부추김', leave: '돌아설 때' };
const KEY_NAMES = {
  name: '이름', title: '제목', year: '때', goal: '목표', label: '줄 이름', caption: '그림 설명', tag: '표시 이름', word: '낱말 카드 얻음',
  give: '주는 카드', decoy: '헷갈릴 카드', time: '때 딱지', times: '때 딱지', after: '마친 뒤 때', lines: '줄', mission: '미션', subtitle: '부제',
  pre: '머리글', tagline: '한 줄', hint: '안내', role: '누구인가', desc: '설명', body: '본문',
};
const STEP_TYPES = { say: '장면 글', card: '카드', wall: '담 앞 순간', blank: '빈칸·쓰기', hon: '혼(전기적 요소)', tasks: '할 일', mind: '마음 둔 곳', okru: '옥루춘', propose: '이생의 제안', blackout: '암전', summary: '요약 카드' };
const STEP_NOTES = { 'a1-eight': '여덟 글자', 'a1-nights': '밀회 한 줄', 'a2-rebuke': '꾸짖음', 'a2-dark': '도적의 폭력 한 줄 — 그림 없음', 'a2-era': '해석 카드', 'n-hon': '혼이 열리는 순간', 't-poems': '3막 시 한 구', 'e-death': '이생의 죽음 한 줄 — 그림 없음' };

const txt = (s) => String(s).replace(/\r?\n/g, '<br>');
const mk = (it) => it.mark ?? '표시 없음';
const st = (it) => it.status ?? '상태 없음';

function renderItem(it, people) {
  const loc = '`' + fmtPath(it.path) + '`';
  const whoName = it.who ? ((people[it.who] && people[it.who].name) || it.who) : '';
  const who = whoName ? whoName + ': ' : '';
  const lastKey = it.path[it.path.length - 1];
  const lead = LAST[lastKey] && typeof lastKey === 'string' ? `(${LAST[lastKey]}) ` : '';
  if (it.kind === 'str') {
    const kn = typeof it.key === 'string' ? (KEY_NAMES[it.key] ? `${KEY_NAMES[it.key]}(${it.key})` : it.key) : '글';
    return [`- ${kn}: ${txt(it.text)} — ${mk(it)} · ${st(it)} · 자리: ${loc}`];
  }
  const out = [];
  if (it.kind === 'han') {
    out.push(`- **${mk(it)}** · ${st(it)} — ${lead}${who}${txt(it.han)}`);
    out.push(`  - 풀이: ${it.ko !== undefined ? txt(it.ko) : '(풀이 없음)'}`);
    if (it.t !== undefined) out.push(`  - 글: ${txt(it.t)}`);
  } else {
    const kind = it.kind === 'body' ? '카드 본문 — ' : '';
    out.push(`- **${mk(it)}** · ${st(it)} — ${lead}${kind}${who}${txt(it.t)}`);
  }
  out.push(`  - 출처: ${it.src ?? '(출처 없음)'} · 자리: ${loc}`);
  return out;
}

// ───────── 문서 ─────────
export function buildReviewDoc(data = loadAll()) {
  const { story, engine } = data;
  const people = Object.assign({}, ...engine.map((e) => e.globals.PEOPLE || {}));

  // 이야기 자료 전부를 한 줄로(전역 순서: 알려진 것 먼저, 거점은 PLACE_IDS 차례, 그 밖의 전역은 이름 차례)
  const roots = [...Object.keys(STORY_FILES), 'PLACES', ...Object.keys(story).filter((k) => !STORY_FILES[k] && k !== 'PLACES').sort()];
  const items = [];
  for (const r of roots) {
    if (!(r in story)) continue;
    if (r === 'PLACES') {
      const ids = [...PLACE_IDS.filter((id) => id in story.PLACES), ...Object.keys(story.PLACES).filter((id) => !PLACE_IDS.includes(id)).sort()];
      for (const id of ids) walkItems(story.PLACES[id], ['PLACES', id], {}, items);
    } else walkItems(story[r], [r], {}, items);
  }
  const fileOf = (p) => (p[0] === 'PLACES' ? `js/data/places/${p[1]}.js` : STORY_FILES[p[0]] || '(js/data의 다른 파일)');
  const used = new Set();
  const starts = (p, pre) => pre.length <= p.length && pre.every((k, i) => p[i] === k);
  const take = (pre, pred = () => true) => items.filter((it) => !used.has(it) && starts(it.path, pre) && pred(it)).map((it) => (used.add(it), it));

  const L = [];
  const list = (its) => { for (const it of its) L.push(...renderItem(it, people)); };
  const para = (s) => { if (L.length && L[L.length - 1] !== '') L.push(''); L.push(s, ''); };
  const block = (heading, file, its, groupKey, groupLabel) => {
    if (!its.length) return;
    para(heading + (file ? ` — \`${file}\`` : ''));
    let g = null;
    for (const it of its) {
      if (groupKey) {
        const k = groupKey(it);
        if (k !== g) { g = k; para(`**${groupLabel(k)}**`); }
      }
      L.push(...renderItem(it, people));
    }
    L.push('');
  };

  const wallGroupKey = (it) => (it.path[2] === 'react' && it.path.length > 3 ? 'react.' + it.path[3] : String(it.path[2] ?? ''));
  const wallGroupLabel = (k) => {
    if (k.startsWith('react.')) { const m = k.slice(6); return `세계의 반응 — ${MEANS[m] || m}(${m})`; }
    return { title: '제목', intro: '들어가는 글', opts: '수단 고르기 글', labels: '답 단추 글', together: '함께 저승에 가겠다는 말과 최 씨의 원작 답(고르기 아님, 고르기 앞의 대화)' }[k] || k;
  };
  const wallBlock = (id) => {
    const w = (story.WALLS || {})[id] || {};
    block(`#### 담 앞 순간 \`${id}\`${w.title ? ` 「${w.title}」` : ''}`, STORY_FILES.WALLS, take(['WALLS', id]), wallGroupKey, wallGroupLabel);
  };
  const okruBlock = () => {
    const its = [...take(['OKRU', 'title']), ...take(['OKRU', 'intro']), ...take(['OKRU', 'lines']), ...take(['OKRU', 'after']), ...take(['OKRU', 'note']), ...take(['OKRU', 'recall']), ...take(['OKRU'])];
    const lab = { title: '제목', intro: '들어가는 글', lines: '여덟 구(두 구씩 네 대목)', after: '노래 뒤', note: '설명', recall: '대목 회상 짝' };
    block('#### 옥루춘(玉樓春)', STORY_FILES.OKRU, its, (it) => (it.path[1] === 'recall' ? 'recall.' + it.path[2] : String(it.path[1])), (k) => (k.startsWith('recall.') ? `대목 ${k.slice(7)} 회상` : lab[k] || k));
  };
  const blankBlock = (act) => {
    const C = story.CARDS || {};
    if (act === 'act3') {
      block('#### 결과 화면 「만남과 이별」 표 세 줄', STORY_FILES.CARDS, take(['CARDS', 'table']));
      block('#### 3막 끝 「반복의 뜻」 한 문장', STORY_FILES.FINALE, take(['FINALE', 'repeat']));
      return;
    }
    const c = C[act] || {};
    const words = [...(c.give || []), ...(c.decoy || [])];
    const its = [
      ...take(['CARDS', act]),
      ...words.flatMap((w) => take(['CARDS', 'words', w])),
      ...(c.blanks || []).flatMap((b) => take(['CARDS', 'answer', b])),
    ];
    block(`#### 낱말 카드(${act === 'act1' ? '1막' : '2막'})`, STORY_FILES.CARDS, its);
    for (const b of c.blanks || []) block(`#### 빈칸 \`${b}\`에 맞지 않는 카드를 넣었을 때 인물의 답`, STORY_FILES.CARDS, take(['CARDS', 'replies', b]));
  };

  // ── 머리말
  L.push('# 글 확인 문서 — 「이생규장전: 세 번의 담」', '');
  L.push('> 이 문서는 도구가 만든다: `node tools/review-doc.mjs`. **손으로 고치지 않는다**(다시 만들면 그대로 덮어쓴다).');
  L.push('> 자료가 바뀌면 문서를 다시 만들어야 점검(`node tests/run-all.mjs`)을 통과한다.', '');
  L.push('## 확인하는 법', '');
  L.push('1. 게임에 실린 글이 장면 차례대로 모여 있다. 한 항목은 **표시** · 상태 — 글, 그 아래 풀이(원문일 때)와 출처, 자리(자료 파일의 열쇠 경로)다.');
  L.push('2. 원문은 원문 사본(`sources/wikisource-geumosinhwa-raw.txt`, 위키문헌 「번역:금오신화」)과 글자가 같은지, 풀이는 원문과 뜻이 맞는지 본다.');
  L.push('3. 풀이·장면 글·인물 말·반응·요약은 모두 새로 쓴 글이어야 한다. 교과서·지도서·번역서 문장을 옮긴 곳이 없는지, 교과서와 뜻이 어긋나지 않는지 대조한다.');
  L.push('4. 표시가 맞는지 본다. 게임이 지어낸 것(수단, 담, 낱말 카드, 마음 둔 곳, 혼으로 걷는 길, 반응 대사)은 `게임 설정`이어야 한다.');
  L.push('5. 고칠 글은 각 절 제목의 파일에서 `자리`의 열쇠 경로를 따라 찾아 고친다.');
  L.push("6. 확인을 마친 글은 **사람이** 자료 파일에서 그 덩이의 `status`를 `'확인됨'`으로 바꾼다. 도우미 함수(`g(…)`·`p(…)`·`w(…)`)로 만든 덩이는 `{ ...g('…'), status: '확인됨' }`처럼 덧붙이고, 파일 전체를 확인했으면 파일 맨 위의 `const ST = '확인 전'`을 바꾼다. 지금 글 자료 점검(`tests/check-data.mjs`)은 모든 글이 `확인 전`이기를 요구하므로 그 점검도 함께 고친다.");
  L.push('7. 고친 뒤 `node tools/review-doc.mjs`로 이 문서를 다시 만든다.', '');
  L.push('표시 다섯: `원문`(한문 그대로) · `풀이`(이 게임이 새로 옮김) · `게임 설정`(게임이 지어낸 장면·규칙·대사) · `이본 노트`(판본 차이) · `해석`(정답 없는 읽기). 상태 둘: `확인 전` · `확인됨`.');
  L.push('제목·이름·목표 같은 짧은 글은 자기 표시가 없으면 `표시 없음`으로 보인다(화면 이름표). 엔진 화면 틀 글은 맨 뒤에 따로 싣는다.', '');

  // ── 본문을 먼저 만들어 두고(개수는 본문을 다 모은 뒤 센다) 머리말 뒤에 붙인다
  const head = L.splice(0, L.length);

  const PLACE_TITLES = { prologue: '들어가기', act1: '1막', act2: '2막', act2night: '2막 밤', act3: '3막', epilogue: '맺음' };
  const STRUCT = new Set(['beats', 'maps', 'cast', 'tasks', 'border', 'steps', 'summary', 'scenes']);
  let n = 0;
  const placeIds = [...PLACE_IDS, ...Object.keys(story.PLACES || {}).filter((id) => !PLACE_IDS.includes(id)).sort()];
  for (const pid of placeIds) {
    const P = (story.PLACES || {})[pid];
    if (!P) continue;
    const file = `js/data/places/${pid}.js`;
    L.push(`## ${++n}. ${P.name || PLACE_TITLES[pid] || pid}`, '', `파일: \`${file}\``, '');
    block('### 거점 머리', null, take(['PLACES', pid], (it) => !STRUCT.has(it.path[2])));
    block('### 목표', null, take(['PLACES', pid, 'beats']));
    block('### 맵 자리와 사람', null, [...take(['PLACES', pid, 'maps']), ...take(['PLACES', pid, 'cast'])]);
    if (P.tasks) block('### 할 일', null, take(['PLACES', pid, 'tasks']));
    if (P.border) {
      block('### 보이지 않는 경계', null, take(['PLACES', pid, 'border']));
      if (P.border.wall) wallBlock(P.border.wall);
    }
    if ((P.steps || []).length) para('### 단계 차례');
    (P.steps || []).forEach((s, i) => {
      const note = STEP_NOTES[s.id] ? ` — ${STEP_NOTES[s.id]}` : '';
      const ty = STEP_TYPES[s.type] ? `${STEP_TYPES[s.type]}(${s.type})` : s.type;
      para(`#### ${i + 1}. \`${s.id}\` · ${ty}${s.scene ? ` · 그림 \`${s.scene}\`` : ''}${note}`);
      list(take(['PLACES', pid, 'steps', i]));
      if (s.type === 'wall' && s.id) wallBlock(s.id);
      if (s.type === 'propose' && s.wall) wallBlock(s.wall);
      if (s.type === 'okru') okruBlock();
      if (s.type === 'blank' && s.act) blankBlock(s.act);
    });
    L.push('');
    block('### 바로가기 30초 요약 카드', null, take(['PLACES', pid, 'summary']));
    block('### 그림 자리 설명', null, take(['PLACES', pid, 'scenes']));
    block('### 그 밖의 글', null, take(['PLACES', pid]));
  }

  L.push(`## ${++n}. 마무리 화면`, '', `파일: \`${STORY_FILES.FINALE}\``, '');
  block('### 전기적 요소 한 줄과 근거 장면 넷', null, [...take(['FINALE', 'jeongi']), ...take(['FINALE', 'scenes'])]);
  block('### 「만복사저포기」 함께 보기', null, [...take(['FINALE', 'mbs']), ...take(['FINALE', 'mbsSame'])],
    (it) => (it.path[1] === 'mbs' ? (it.path[2] === 'picks' ? 'picks.' + it.path[3] : String(it.path[2])) : 'same'),
    (k) => (k.startsWith('picks.') ? `고르기 ${Number(k.slice(6)) + 1} — 물음·보기 셋·원작 사실·원문` : { title: '제목', intro: '들어가는 글', summary: '30초 줄거리 카드', ending: '맺음', same: '만복사 한 줄 물음' }[k] || k));
  block('### 결과 화면 — 되짚기 질문 둘', null, take(['FINALE', 'review']));
  block('### 결과 화면 — 「김현감호」 한 줄', null, take(['FINALE', 'kimhyeon']));
  block('### 원전으로 나가는 문', null, take(['FINALE', 'sourceDoor']));
  block('### 그 밖의 마무리 글', null, take(['FINALE']));

  // 어디에도 끼워 넣지 못한 글: 자료에 새로 생긴 열쇠, 단계가 가리키지 않는 담 앞 순간 등
  const rest = items.filter((it) => !used.has(it));
  L.push(`## ${++n}. 자리를 정하지 못한 글`, '');
  if (!rest.length) L.push('없음 — 자료의 모든 글이 위 장면 차례 안에 실렸다.', '');
  else {
    L.push('장면 차례 안에 끼워 넣지 못한 글이다. 도구의 장면 차례에 자리를 더하거나, 그대로 여기서 확인한다.', '');
    const byFile = new Map();
    for (const it of rest) { const f = fileOf(it.path); if (!byFile.has(f)) byFile.set(f, []); byFile.get(f).push(it); }
    for (const [f, its] of byFile) block('### ' + f, null, its.map((it) => (used.add(it), it)));
  }

  // 엔진 화면 틀 글
  L.push(`## ${++n}. 화면 틀 글(엔진 자료)`, '');
  L.push('타이틀·미션·표시 설명·인물 이름·결과 화면 틀처럼 엔진이 바로 보이는 글이다. 글 덩이 꼴이 아니라 표시·상태가 없다.', '');
  const engItems = [];
  for (const e of engine) {
    const its = [];
    for (const [g, v] of Object.entries(e.globals)) walkItems(v, [g], {}, its);
    engItems.push(...its);
    if (its.length) block('### ' + e.file, null, its);
    else para(`### ${e.file} — 아직 글 없음`);
  }

  // ── 개수
  const KINDS = [
    ['담 앞 반응', (p) => p[0] === 'WALLS' && p[2] === 'react'],
    ['담 앞 고르기·답 단추 글', (p) => p[0] === 'WALLS' && (p[2] === 'opts' || p[2] === 'labels')],
    ['담 앞 들어가는 글·대화·제목', (p) => p[0] === 'WALLS'],
    ['낱말 카드(이름·설명)', (p) => p[0] === 'CARDS' && (p[1] === 'words' || p[1] === 'act1' || p[1] === 'act2' || p[1] === 'answer')],
    ['빈칸에 맞지 않는 카드의 인물 답', (p) => p[0] === 'CARDS' && p[1] === 'replies'],
    ['만남과 이별 표 문장', (p) => p[0] === 'CARDS' && p[1] === 'table'],
    ['옥루춘 구', (p) => p[0] === 'OKRU' && p[1] === 'lines'],
    ['옥루춘 회상 짝', (p) => p[0] === 'OKRU' && p[1] === 'recall'],
    ['옥루춘 앞뒤 글', (p) => p[0] === 'OKRU'],
    ['「만복사저포기」 줄거리·보기·사실', (p) => p[0] === 'FINALE' && (p[1] === 'mbs' || p[1] === 'mbsSame')],
    ['되짚기 질문', (p) => p[0] === 'FINALE' && p[1] === 'review'],
    ['마무리 물음·안내(반복의 뜻·전기적 요소·김현감호·원전 문)', (p) => p[0] === 'FINALE'],
    ['바로가기 30초 요약', (p) => p[0] === 'PLACES' && p[2] === 'summary'],
    ['그림 자리 설명', (p) => p[0] === 'PLACES' && p[2] === 'scenes'],
    ['거점 장면·사건 글과 대사', (p) => p[0] === 'PLACES'],
    ['그 밖의 자료', () => true],
  ];
  const isChunk = (it) => it.kind !== 'str';
  const counts = KINDS.map(([name]) => ({ name, chunk: 0, han: 0, str: 0 }));
  for (const it of items) {
    const k = KINDS.findIndex(([, f]) => f(it.path));
    if (it.kind === 'han') counts[k].han++;
    if (isChunk(it)) counts[k].chunk++; else counts[k].str++;
  }
  const chunks = items.filter(isChunk);
  const nHan = items.filter((it) => it.kind === 'han').length;
  const nStr = items.length - chunks.length;
  const C = [];
  C.push('## 개수', '');
  C.push(`모두 글 덩이 ${chunks.length}개(원문 덩이 ${nHan}개 포함), 짧은 글 ${nStr}개. 화면 틀 글 ${engItems.length}개는 따로 센다.`, '');
  C.push('| 종류 | 글 덩이 | 그 가운데 원문 덩이 | 짧은 글 |', '| --- | ---: | ---: | ---: |');
  for (const c of counts) if (c.chunk || c.str) C.push(`| ${c.name} | ${c.chunk} | ${c.han} | ${c.str} |`);
  C.push(`| 합계 | ${chunks.length} | ${nHan} | ${nStr} |`, '');
  const tally = (f, keys) => { const o = Object.fromEntries(keys.map((k) => [k, 0])); for (const it of chunks) { const v = f(it); o[v] = (o[v] || 0) + 1; } return o; };
  const byMark = tally(mk, ['원문', '풀이', '게임 설정', '이본 노트', '해석']);
  const byStatus = tally(st, ['확인 전', '확인됨']);
  C.push('글 덩이의 표시별: ' + Object.entries(byMark).map(([k, v]) => `${k} ${v}`).join(' · ') + '.', '');
  C.push('글 덩이의 상태별: ' + Object.entries(byStatus).map(([k, v]) => `${k} ${v}`).join(' · ') + '.', '');
  C.push('장면 차례: ' + placeIds.filter((id) => (story.PLACES || {})[id]).map((id) => (story.PLACES[id].name || id)).join(' → ') + ' → 마무리 화면.', '');

  const doc = [...head, ...C, ...L].join('\n').replace(/\n{3,}/g, '\n\n').replace(/\n*$/, '\n');
  return doc;
}

// ───────── 실행 ─────────
const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const doc = buildReviewDoc();
  if (process.argv.includes('--check')) {
    const cur = fs.existsSync(DOC_PATH) ? fs.readFileSync(DOC_PATH, 'utf8').replace(/\r\n/g, '\n') : null;
    if (cur === doc) { console.log('✓ ' + DOC_REL + '가 최신이다'); process.exit(0); }
    console.log('✗ ' + DOC_REL + '가 자료와 다르다 — node tools/review-doc.mjs로 다시 만든다');
    process.exit(1);
  }
  fs.mkdirSync(path.dirname(DOC_PATH), { recursive: true });
  fs.writeFileSync(DOC_PATH, doc, 'utf8');
  console.log(`✓ ${DOC_REL}를 썼다 (${doc.split('\n').length}줄)`);
}
