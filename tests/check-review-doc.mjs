// 글 확인 문서 점검(plan T11, spec 11절 '글 확인 문서'). docs/글-확인.md와 만드는 도구 tools/review-doc.mjs를 본다.
//  쓰기: node tests/check-review-doc.mjs
//
// 확인하는 것
//  1) 문서가 있고, 도구로 지금 다시 만든 것과 한 글자도 다르지 않다(자료를 고치고 문서를 다시 만들지 않으면 실패).
//     두 번 만들어도 같고(날짜·시각 없음), 만드는 동안 자료가 바뀌지 않는다.
//  2) 자동 대조(이 점검이 도구의 훑기 코드를 쓰지 않고 따로 모은다): 자료의 모든 글 덩이(`t`·`han`·`ko`가 있는 객체)와
//     모든 한글·한자 문자열(카드 본문, 제목, 이름, 단추 글 …)이 문서에 있고, 그 열쇠 경로가 적힌 항목 안에 들어 있다.
//     글 덩이는 그 항목에 표시·상태·출처(물려받은 것 포함)도 함께 적혀 있다. 엔진 화면 틀 글도 같다.
//  3) 머리말에 확인하는 법(도구로 만들고 손으로 고치지 않음, 사람이 '확인됨'으로 바꿈)과 개수가 있고, 개수가 따로 센 것과 같다.
//  4) 출판사 이름이 문서·도구·점검에 없다.
//  음성 사례: 문서에서 글 한 줄을 빼면 잡는다. 자료의 글을 바꾸면 커밋된 문서와 달라진다.
//  나중에 생길 새 열쇠(거점의 새 칸, 새 전역)의 글도 문서에 실린다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadData } from './lib-data.mjs';
import { buildReviewDoc, DOC_PATH } from '../tools/review-doc.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FORBIDDEN = String.fromCodePoint(0xc9c0, 0xd559, 0xc0ac);
let failures = 0;
function ok(cond, msg, detail = []) {
  if (cond) console.log('  ✓ ' + msg);
  else {
    failures++;
    console.log('  ✗ ' + msg);
    for (const d of detail.slice(0, 15)) console.log('      - ' + d);
    if (detail.length > 15) console.log('      …(' + (detail.length - 15) + '건 더)');
  }
}

// ───────── 따로 읽기 ─────────
const ENGINE = ['flow', 'texts', 'notes', 'people', 'credits', 'bgm'].map((n) => `js/data/${n}.js`);
function readData() {
  const { ctx, missing, errors } = loadData();
  const story = {};
  for (const k of Object.keys(ctx)) if (k !== 'console' && k !== 'window') story[k] = ctx[k];
  const engine = ENGINE.map((file) => {
    const c = { console };
    c.window = c;
    vm.createContext(c);
    const p = path.join(root, file);
    if (fs.existsSync(p)) vm.runInContext(fs.readFileSync(p, 'utf8'), c, { filename: file });
    const globals = {};
    for (const k of Object.keys(c)) if (k !== 'console' && k !== 'window') globals[k] = c[k];
    return { file, globals };
  });
  return { story, engine, missing, errors };
}

// ───────── 따로 모으기(도구의 코드를 쓰지 않는다) ─────────
const TEXTY = /[ᄀ-ᇿㄱ-ㆎ가-힣㐀-䶿一-鿿豈-﫿]/;
const META = ['mark', 'src', 'status', 'who', 'prompt_hint'];
const pathText = (p) => p.map((k, i) => (i === 0 ? k : typeof k === 'number' ? '[' + k + ']' : /^[A-Za-z_$][\w$]*$/.test(k) ? '.' + k : "['" + k + "']")).join('');
// 항목: { path, texts:[…], chunk, mark, status, src }
function expected(value, at, meta, out) {
  if (typeof value === 'string') {
    if (!META.includes(at[at.length - 1]) && TEXTY.test(value)) out.push({ path: pathText(at), texts: [value], chunk: false });
    return out;
  }
  if (Array.isArray(value)) {
    // 배열 칸의 문자열은 그 배열의 열쇠를 따른다(예: lines[0])
    value.forEach((v, i) => {
      if (typeof v === 'string') { if (!META.includes(at[at.length - 1]) && TEXTY.test(v)) out.push({ path: pathText([...at, i]), texts: [v], chunk: false }); }
      else expected(v, [...at, i], meta, out);
    });
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  const m = {};
  for (const k of ['mark', 'src', 'status']) m[k] = typeof value[k] === 'string' ? value[k] : meta[k];
  const chunk = typeof value.t === 'string' || typeof value.han === 'string';
  if (chunk) out.push({ path: pathText(at), texts: ['t', 'han', 'ko'].filter((k) => typeof value[k] === 'string').map((k) => value[k]), chunk: true, ...m });
  for (const [k, v] of Object.entries(value)) {
    if (k === 'grid') continue;
    if (typeof v === 'string' && META.includes(k)) continue;
    if (chunk && ['t', 'han', 'ko'].includes(k) && typeof v === 'string') continue;
    if (k === 'body' && typeof v === 'string') { out.push({ path: pathText([...at, k]), texts: [v], chunk: true, ...m }); continue; }
    expected(v, [...at, k], m, out);
  }
  return out;
}
function expectedAll(data) {
  const story = [];
  for (const [g, v] of Object.entries(data.story)) {
    if (g === 'PLACES') for (const [id, p] of Object.entries(v)) expected(p, ['PLACES', id], {}, story);
    else expected(v, [g], {}, story);
  }
  const engine = [];
  for (const e of data.engine) for (const [g, v] of Object.entries(e.globals)) expected(v, [g], {}, engine);
  return { story, engine };
}

// 문서를 항목으로 나눈다: '- '로 시작하는 줄부터 다음 항목·빈 줄·제목 전까지. 항목의 '자리: `경로`'로 찾는다.
function blocksOf(doc) {
  const map = new Map();
  const dup = [];
  let cur = null;
  const flush = () => {
    if (!cur) return;
    const text = cur.join('\n');
    const m = text.match(/자리: `([^`]+)`/);
    if (m) { if (map.has(m[1])) dup.push(m[1]); map.set(m[1], text); }
    cur = null;
  };
  for (const line of doc.split('\n')) {
    if (line.startsWith('- ')) { flush(); cur = [line]; }
    else if (cur && line.startsWith('  ')) cur.push(line);
    else flush();
  }
  flush();
  return { map, dup };
}

function verify(doc, data) {
  const fails = [];
  const { story, engine } = expectedAll(data);
  const { map, dup } = blocksOf(doc);
  for (const d of dup) fails.push('같은 자리가 두 번 실림: ' + d);
  for (const e of [...story, ...engine]) {
    const b = map.get(e.path);
    if (!b) { fails.push('문서에 없는 자리: ' + e.path + ' — ' + e.texts[0].slice(0, 30)); continue; }
    for (const t of e.texts) {
      for (const seg of t.split(/\r?\n/)) if (seg.trim() && !b.includes(seg)) fails.push(`글이 그 자리 항목에 없음: ${e.path} — ${seg.slice(0, 30)}`);
    }
    if (e.chunk) {
      if (e.mark && !b.includes('**' + e.mark + '**')) fails.push(`표시가 없음(${e.mark}): ${e.path}`);
      if (e.status && !b.includes(e.status)) fails.push(`상태가 없음(${e.status}): ${e.path}`);
      if (e.src && !b.includes('출처: ' + e.src)) fails.push(`출처가 없음: ${e.path}`);
    }
  }
  // 개수 줄: 글 덩이·원문 덩이·짧은 글·화면 틀 글이 따로 센 것과 같다
  const nChunk = story.filter((e) => e.chunk).length;
  const m = doc.match(/모두 글 덩이 (\d+)개\(원문 덩이 (\d+)개 포함\), 짧은 글 (\d+)개\. 화면 틀 글 (\d+)개/);
  if (!m) fails.push('머리말에 개수 줄이 없음');
  else {
    const want = [nChunk, countHan(data), story.length - nChunk, engine.length];
    if (m.slice(1).map(Number).join() !== want.join()) fails.push(`개수가 다름: 문서 ${m.slice(1).join('/')} · 따로 센 것 ${want.join('/')}`);
  }
  return fails;
}
// 원문 덩이 수: han이 문자열인 객체 수(따로 센다)
function countHan(data) {
  let n = 0;
  (function f(v) {
    if (Array.isArray(v)) return v.forEach(f);
    if (v && typeof v === 'object') { if (typeof v.han === 'string') n++; Object.values(v).forEach(f); }
  })(Object.values(data.story));
  return n;
}

// ───────── 점검 ─────────
console.log('글 확인 문서 점검');
const data = readData();
ok(!data.missing.length && !data.errors.length, '자료 파일을 엔진 없이 모두 읽음', [...data.missing, ...data.errors]);
const strip = (d) => ({ story: d.story, engine: d.engine });
const snap = JSON.stringify(strip(data));
const built = buildReviewDoc(strip(data));
const built2 = buildReviewDoc(strip(data));
ok(JSON.stringify(strip(data)) === snap, '문서를 만드는 동안 자료가 바뀌지 않음');
ok(built === built2, '두 번 만들어도 같은 문서(날짜·시각 없음)');
ok(!/\d{4}-\d{2}-\d{2}T\d{2}:/.test(built), '문서에 시각이 없음');

const exists = fs.existsSync(DOC_PATH);
ok(exists, 'docs/글-확인.md가 있음');
const committed = exists ? fs.readFileSync(DOC_PATH, 'utf8').replace(/\r\n/g, '\n') : '';
const firstDiff = (() => { const a = committed.split('\n'); const b = built.split('\n'); for (let i = 0; i < Math.max(a.length, b.length); i++) if (a[i] !== b[i]) return [`${i + 1}째 줄`, '문서: ' + (a[i] ?? '(없음)').slice(0, 80), '도구: ' + (b[i] ?? '(없음)').slice(0, 80)]; return []; })();
ok(committed === built, '커밋된 문서가 도구로 다시 만든 것과 같음 (다르면: node tools/review-doc.mjs)', firstDiff);

const hanCount = countHan(strip(data));
const verifyDoc = verify;
const fails = verifyDoc(committed, strip(data));
const { story: expStory, engine: expEngine } = expectedAll(strip(data));
ok(expStory.filter((e) => e.chunk).length >= 50 && hanCount >= 10, `자료에서 따로 모은 글 덩이 ${expStory.filter((e) => e.chunk).length}개(원문 ${hanCount}개), 짧은 글 ${expStory.filter((e) => !e.chunk).length}개, 화면 틀 글 ${expEngine.length}개`);
ok(!fails.length, '자료의 모든 글이 그 자리(파일·열쇠 경로) 항목에 표시·상태·출처와 함께 실림, 개수가 맞음', fails);

// 머리말
ok(/손으로 고치지 않는다/.test(committed) && /node tools\/review-doc\.mjs/.test(committed), '머리말: 도구로 만들고 손으로 고치지 않는다는 안내');
ok(/사람이/.test(committed) && /'확인됨'/.test(committed) && /status/.test(committed), "머리말: 사람이 자료 파일의 status를 '확인됨'으로 바꾼다는 안내");
ok(/## 개수/.test(committed) && /표시별: 원문 \d+/.test(committed) && /상태별: 확인 전 \d+/.test(committed), '머리말: 종류·표시·상태별 개수');
// 장면 차례: 거점 절이 flow 순서대로
const order = ['prologue', 'act1', 'act2', 'act2night', 'act3', 'epilogue'].map((id) => committed.indexOf('`js/data/places/' + id + '.js`'));
ok(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])) && committed.indexOf('마무리 화면\n') > order[5], '장면 차례: 들어가기 → 1막 → 2막 → 2막 밤 → 3막 → 맺음 → 마무리 화면');
// spec 11절이 꼭 짚은 글
const stepAt = (pid, sid) => ((data.story.PLACES[pid] || {}).steps || []).findIndex((s) => s.id === sid);
const poemLine = (((data.story.PLACES.act3 || {}).steps || [])[stepAt('act3', 't-poems')] || {}).lines || [];
const must = [
  ['3막 시 한 구', `PLACES.act3.steps[${stepAt('act3', 't-poems')}].lines[${poemLine.findIndex((l) => l && typeof l.han === 'string')}]`],
  ['여덟 글자', `PLACES.act1.steps[${stepAt('act1', 'a1-eight')}].card.quote`], ['옥루춘 8구', 'OKRU.lines[7]'],
  ['옥루춘 회상', "OKRU.recall['4-5'].byMind.poems"], ['만복사 보기', 'FINALE.mbs.picks[1].options[2]'], ['되짚기 질문', 'FINALE.review[1]'],
  ['김현감호', 'FINALE.kimhyeon'], ['원전 문', 'FINALE.sourceDoor'], ['함께 가자는 말', "WALLS['w3-propose'].together.isaeng"],
  ['담 반응 실마리', "WALLS['w3-border'].react.hon.hint"], ['빈칸 인물 답', "CARDS.replies['b3-hwanshin']['꿈']"], ['표 문장', 'CARDS.table[2]'],
];
ok(must.every(([, p]) => committed.includes('`' + p + '`')), 'spec 11절의 글(원문·풀이, 수단 반응, 낱말 카드, 옥루춘 회상, 만복사, 되짚기, 3막 시 한 구)이 있음', must.filter(([, p]) => !committed.includes('`' + p + '`')).map(([n, p]) => n + ' ' + p));

// 출판사 이름
const toolSrc = fs.readFileSync(path.join(root, 'tools/review-doc.mjs'), 'utf8');
const selfSrc = fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');
ok(![committed, built, toolSrc, selfSrc].some((s) => s.includes(FORBIDDEN)), '출판사 이름이 문서·도구·점검에 없음');

// ───────── 음성 사례 ─────────
{
  // 글 한 줄을 빼면 잡는다
  const target = expStory.find((e) => e.chunk && e.path.startsWith('WALLS'));
  const lines = committed.split('\n');
  const at = lines.findIndex((l) => l.startsWith('- ') && l.includes(target.texts[0].split('\n')[0]));
  const cut = lines.filter((_, i) => i !== at).join('\n');
  ok(at >= 0 && verifyDoc(cut, strip(data)).length > 0, '음성 사례: 문서에서 글 한 줄을 빼면 잡는다');
  // 원문 덩이의 풀이를 지우면 잡는다
  const hanLine = lines.findIndex((l) => l.startsWith('  - 풀이: '));
  ok(hanLine >= 0 && verifyDoc(lines.filter((_, i) => i !== hanLine).join('\n'), strip(data)).length > 0, '음성 사례: 원문의 풀이 줄을 빼면 잡는다');
}
{
  // 자료의 글을 바꾸면 커밋된 문서와 달라진다(문서를 다시 만들지 않으면 점검이 실패한다)
  const d2 = JSON.parse(JSON.stringify(strip(data)));
  d2.story.WALLS['w1-poem'].react.mal.first.t += ' (시험)';
  const b2 = buildReviewDoc(d2);
  ok(b2 !== committed && b2.includes('어르신들이 다 들으세요. (시험)'), '음성 사례: 자료의 글을 바꾸면 다시 만든 문서가 커밋된 문서와 다르다');
}
{
  // 나중에 생길 새 열쇠의 글도 실린다(거점의 새 칸, 담 앞 순간의 새 칸, 새 전역, 새 거점)
  const d3 = JSON.parse(JSON.stringify(strip(data)));
  d3.story.PLACES.act1.extra = { t: '새 칸 시험 글', mark: '게임 설정', src: '시험', status: '확인 전' };
  d3.story.WALLS['w1-poem'].after = { han: '天帝', ko: '새 원문 시험', mark: '원문', src: '시험', status: '확인 전' };
  d3.story.NEWDATA = { box: [{ title: '새 전역 시험 제목', lines: ['새 전역 시험 줄'] }] };
  d3.story.PLACES.newplace = { name: '새 거점 시험', steps: [{ id: 'x1', type: 'say', lines: [{ t: '새 거점 시험 글', mark: '풀이', src: '시험', status: '확인 전' }] }] };
  d3.story.FINALE.newq = { t: '새 마무리 물음 시험', mark: '해석', src: '시험', status: '확인 전' };
  const b3 = buildReviewDoc(d3);
  const f3 = verifyDoc(b3, d3);
  ok(!f3.length && ['새 칸 시험 글', '새 원문 시험', '새 전역 시험 줄', '새 거점 시험 글', '새 마무리 물음 시험'].every((s) => b3.includes(s)), '새 열쇠·새 전역·새 거점의 글도 문서에 빠짐없이 실린다', f3);
}

console.log(failures ? `✗ 글 확인 문서 점검 실패 ${failures}건` : '✓ 글 확인 문서 점검 통과');
process.exit(failures ? 1 : 0);
