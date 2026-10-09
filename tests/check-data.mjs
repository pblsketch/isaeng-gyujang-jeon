// 글 자료 점검(엔진·브라우저 없이): spec 17절 '데이터' 항목, 글 길이 상한, 원문 한자 대조, 넘지 않는 선의 낱말.
//  쓰기: node tests/check-data.mjs
import { loadData, sourceText, hanOnly, phrases, PLACE_IDS } from './lib-data.mjs';

const fails = [];
const fail = (m) => fails.push(m);
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const { ctx: W, missing, errors } = loadData();
for (const f of missing) fail('자료 파일 없음: ' + f);
for (const e of errors) fail('자료 파일 실행 오류: ' + e);

const WALLS = W.WALLS || {};
const CARDS = W.CARDS || {};
const OKRU = W.OKRU || {};
const FINALE = W.FINALE || {};
const PLACES = W.PLACES || {};

const MARKS = ['원문', '풀이', '게임 설정', '이본 노트', '해석'];
const STATUS = '확인 전';
const CAP = { event: 180, react: 70, phrases: 2 };
const MEANS = ['mal', 'si', 'gyeoldan', 'hon'];

// ───────── 1. 담 앞 순간이 spec 5-2 표와 같다 ─────────
const SPEC_WALLS = {
  'w1-poem': { act: 'act1', means: ['mal', 'si', 'gyeoldan'], ok: ['si'] },
  'w1-parents': { act: 'act1', means: ['mal', 'si', 'gyeoldan'], ok: ['mal', 'gyeoldan'] },
  'w2-bandit': { act: 'act2', means: ['mal', 'si', 'gyeoldan'], ok: ['gyeoldan'] },
  'w3-border': { act: 'act3', means: ['mal', 'si', 'gyeoldan', 'hon'], ok: [] },
  'w3-propose': { act: 'act3', kind: 'answer', answers: ['stay', 'entrust'], ok: ['entrust'] },
};
if (!eq(Object.keys(WALLS).sort(), Object.keys(SPEC_WALLS).sort())) fail('담 앞 순간 열쇠가 spec 5-2와 다름: ' + Object.keys(WALLS).join(','));
const perAct = {};
for (const w of Object.values(WALLS)) perAct[w.act] = (perAct[w.act] || 0) + 1;
if (!eq(perAct, { act1: 2, act2: 1, act3: 2 })) fail('막마다 담 앞 순간 수가 다름(1막 2, 2막 1, 3막 2): ' + JSON.stringify(perAct));

const tl = (o) => o && typeof o.t === 'string' && o.t.trim().length > 0;
for (const [id, s] of Object.entries(SPEC_WALLS)) {
  const w = WALLS[id];
  if (!w) continue;
  if (w.act !== s.act) fail(`${id}: 막이 ${s.act}가 아님`);
  if (!eq(w.ok, s.ok)) fail(`${id}: 원작에 맞는 수단(ok)이 spec과 다름: ${JSON.stringify(w.ok)}`);
  if (!w.title || !Array.isArray(w.intro) || !w.intro.length) fail(`${id}: 제목(title)·들어가는 글(intro)이 없음`);
  if (s.kind === 'answer') {
    if (w.kind !== 'answer') fail(`${id}: kind:'answer'가 아님`);
    if (!eq(w.answers, s.answers)) fail(`${id}: 답이 stay·entrust 둘이 아님: ${JSON.stringify(w.answers)}`);
    if ((w.answers || []).includes('together') || (w.react || {}).together || (w.labels || {}).together) fail(`${id}: '함께 가자'(together)가 고르기에 있음`);
    for (const a of s.answers) {
      if (!tl((w.labels || {})[a])) fail(`${id}: 답 '${a}'의 단추 글(labels)이 없음`);
      const r = (w.react || {})[a];
      if (!r || !tl(r.first)) fail(`${id}: 답 '${a}'의 반응(first)이 없음`);
    }
    const stay = (w.react || {}).stay || {};
    for (const k of ['again', 'hint']) if (!tl(stay[k])) fail(`${id}: 'stay' 반응에 ${k}가 없음(다시 고를 수 있으므로)`);
    const tg = w.together || {};
    if (!(tg.isaeng && tg.isaeng.han && tg.isaeng.ko)) fail(`${id}: together에 이생의 대사(원문·풀이)가 없음`);
    if (!(tg.reply && tg.reply.han && tg.reply.ko)) fail(`${id}: together에 최 씨의 원작 답(원문·풀이)이 없음`);
    if (tg.options || tg.choose || tg.pick) fail(`${id}: together가 고르기 꼴임`);
  } else {
    if (!eq(w.means, s.means)) fail(`${id}: 수단 목록이 spec과 다름: ${JSON.stringify(w.means)}`);
    for (const m of s.means) {
      if (!tl((w.opts || {})[m])) fail(`${id}: 수단 '${m}'의 고르기 글(opts)이 없음`);
      const r = (w.react || {})[m];
      for (const k of ['first', 'again', 'hint']) if (!r || !tl(r[k])) fail(`${id}: 수단 '${m}'의 반응 ${k}가 없음`);
    }
    for (const m of Object.keys(w.react || {})) if (!s.means.includes(m)) fail(`${id}: 목록에 없는 수단의 반응: ${m}`);
  }
}

// ───────── 2. 낱말 카드와 빈칸(7절의 때) ─────────
const ANSWER = { 'b1-wall': '담장', 'b2-marriage': '혼인', 'b2-war': '홍건적의 난', 'b3-hwanshin': '환신' };
if (!eq(CARDS.answer, ANSWER)) fail('빈칸 정답 표(answer)가 약속과 다름');
const BLANK_AT = { act1: ['b1-wall', 'b2-marriage'], act2: ['b2-war', 'b3-hwanshin'] };
const pool = {};
for (const act of ['act1', 'act2']) {
  const c = CARDS[act] || {};
  if (!eq(c.blanks, BLANK_AT[act])) fail(`${act}: 빈칸이 7절의 때와 다름: ${JSON.stringify(c.blanks)}`);
  for (const b of BLANK_AT[act]) if (!(c.give || []).includes(ANSWER[b])) fail(`${act}: 빈칸 ${b}의 정답 카드 '${ANSWER[b]}'를 주지 않음`);
  const dn = (c.decoy || []).length;
  if (dn < 2 || dn > 3) fail(`${act}: 헷갈릴 카드가 2~3장이 아님(${dn})`);
  for (const d of c.decoy || []) if (Object.values(ANSWER).includes(d)) fail(`${act}: 헷갈릴 카드 '${d}'가 정답 낱말임`);
  for (const w of [...(c.give || []), ...(c.decoy || [])]) if (!tl((CARDS.words || {})[w])) fail(`${act}: 카드 '${w}'의 설명(words)이 없음`);
  pool[act] = [...(act === 'act2' ? pool.act1 : []), ...(c.give || []), ...(c.decoy || [])];
}
for (const [act, blanks] of Object.entries(BLANK_AT)) {
  for (const b of blanks) {
    const rp = (CARDS.replies || {})[b] || {};
    if (!tl(rp.default)) fail(`빈칸 ${b}: 기본 답(default)이 없음`);
    for (const w of pool[act] || []) {
      if (w === ANSWER[b]) continue;
      if (!tl(rp[w])) fail(`빈칸 ${b}: 맞지 않는 카드 '${w}'에 인물의 답이 없음`);
      else if (!rp[w].who) fail(`빈칸 ${b}: '${w}' 답에 말하는 인물(who)이 없음`);
    }
  }
}
const table = CARDS.table || [];
if (table.length !== 3) fail('만남과 이별 표가 세 줄이 아님');
const tableKeys = table.map((r) => [...String((r && r.t) || '').matchAll(/\{([a-z0-9-]+)(?::[^}]*)?\}/g)].map((m) => m[1]));
if (!eq(tableKeys, [['b1-wall'], ['b2-marriage', 'b2-war'], ['b3-hwanshin']])) fail('표 세 줄의 빈칸 자리가 약속과 다름: ' + JSON.stringify(tableKeys));

// 낱말 카드는 그 막의 거점 단계에서 저절로 얻는다(fx.word), 빈칸 단계보다 먼저
const ACT_PLACES = { act1: ['act1'], act2: ['act2', 'act2night'] };
for (const [act, pids] of Object.entries(ACT_PLACES)) {
  const steps = pids.flatMap((p) => ((PLACES[p] || {}).steps || []));
  const blankAt = steps.findIndex((s) => s.type === 'blank' && s.act === act);
  if (blankAt < 0) fail(`${act}: 막 끝 빈칸 단계({type:'blank', act:'${act}'})가 없음`);
  const c = CARDS[act] || {};
  for (const w of [...(c.give || []), ...(c.decoy || [])]) {
    const at = steps.findIndex((s) => s.fx && [].concat(s.fx.word || []).includes(w));
    if (at < 0) fail(`${act}: 카드 '${w}'를 주는 단계(fx.word)가 없음`);
    else if (blankAt >= 0 && at > blankAt) fail(`${act}: 카드 '${w}'를 빈칸 뒤에 줌`);
  }
}

// ───────── 3. 옥루춘 ─────────
const lines = OKRU.lines || [];
if (lines.length !== 8) fail('옥루춘이 여덟 구가 아님: ' + lines.length);
for (const [i, l] of lines.entries()) if (!(l && l.han && l.ko)) fail(`옥루춘 ${i + 1}구에 원문·풀이가 없음`);
const rc = OKRU.recall || {};
if (!eq(Object.keys(rc).sort(), ['0-1', '2-3', '4-5', '6-7'])) fail('옥루춘 회상 대목 열쇠가 0-1·2-3·4-5·6-7이 아님');
for (const k of ['0-1', '6-7']) if (!tl((rc[k] || {}).fixed)) fail(`옥루춘 ${k}: 고정 회상이 없음`);
if (!tl((rc['0-1'] || {}).default)) fail('옥루춘 0-1: 2막을 건너뛰었을 때의 기본 장면(default)이 없음');
for (const k of ['2-3', '4-5']) {
  const bm = (rc[k] || {}).byMind || {};
  if (!eq(Object.keys(bm).sort(), ['poems', 'rites', 'treasure'])) fail(`옥루춘 ${k}: 마음 둔 곳 셋(treasure·rites·poems)의 회상이 아님`);
  for (const m of ['treasure', 'rites', 'poems']) if (!tl(bm[m])) fail(`옥루춘 ${k}: '${m}' 회상 글 없음`);
  if ((rc[k] || {}).fixed) fail(`옥루춘 ${k}: 바뀌는 대목에 고정 회상이 있음`);
}

// ───────── 4. 마무리 자료 ─────────
const F = FINALE;
if (!F.repeat || !/한 번뿐이었다면/.test(F.repeat.t || '')) fail('finale.repeat(반복의 뜻 물음)이 없음');
if (!eq((F.scenes || []).map((s) => s.id), ['reunion', 'rites', 'okru', 'farewell'])) fail('finale.scenes가 근거 장면 넷(reunion·rites·okru·farewell)이 아님');
if (!F.jeongi || !tl(F.jeongi.q) || !tl(F.jeongi.help) || !F.jeongi.ref) fail('finale.jeongi(물음·도움말·2막 장면 가리킴)가 없음');
const mbs = F.mbs || {};
if (!mbs.summary || !(mbs.summary.lines || []).length) fail('만복사 줄거리 카드가 없음');
if ((mbs.picks || []).length !== 2) fail('만복사 고르기가 둘이 아님');
for (const p of mbs.picks || []) {
  if (!tl(p.q) || (p.options || []).length !== 3) fail(`만복사 고르기 '${p.id}': 물음·보기 셋이 아님`);
  if (!p.fact || !tl(p.fact)) fail(`만복사 고르기 '${p.id}': 원작 사실(fact)이 없음`);
  for (const o of p.options || []) if ('correct' in o || 'right' in o || 'answer' in o) fail(`만복사 고르기 '${p.id}': 맞고 틀림 표시가 보기에 있음`);
}
if (!F.mbsSame || !/비현실적인 재회/.test(F.mbsSame.t || '')) fail('만복사 한 줄 물음이 없음');
if ((F.review || []).length !== 2) fail('되짚기 질문이 둘이 아님');
if (!F.kimhyeon || !/김현/.test(F.kimhyeon.t || '')) fail('「김현감호」 한 줄이 없음');
if (!F.sourceDoor || !/금오신화/.test(F.sourceDoor.t || '') || !/만복사저포기/.test(F.sourceDoor.t || '')) fail('원전으로 나가는 문 안내가 없음');

// ───────── 5. 거점: 흐름과 민감한 장면 ─────────
for (const pid of PLACE_IDS) {
  const p = PLACES[pid];
  if (!p) { fail(`거점 ${pid}가 없음`); continue; }
  for (const [mid, m] of Object.entries(p.maps || {})) {
    if (!Array.isArray(m.grid) || !m.grid.length || m.grid.some((r) => typeof r !== 'string')) fail(`${pid}.${mid}: 격자가 엔진 없이 만들어지지 않음`);
  }
  const ids = new Set((p.steps || []).map((s) => s.id));
  if (ids.size !== (p.steps || []).length) fail(`${pid}: 단계 id가 겹침`);
  for (const b of p.beats || []) for (const sid of b.steps || []) if (!ids.has(sid)) fail(`${pid}: 목표 ${b.id}가 없는 단계 ${sid}를 가리킴`);
  // 모든 단계는 어떤 목표에 묶여 있어야 한다
  const bound = new Set((p.beats || []).flatMap((b) => b.steps || []));
  for (const s of p.steps || []) if (!bound.has(s.id)) fail(`${pid}: 단계 ${s.id}가 어떤 목표에도 묶이지 않음`);
}
const stepsOf = (pid) => ((PLACES[pid] || {}).steps || []);
const order = (pid, pred) => stepsOf(pid).findIndex(pred);
// 1막: 원문 순서
const w1p = order('act1', (s) => s.type === 'wall' && s.id === 'w1-poem');
const w1q = order('act1', (s) => s.type === 'wall' && s.id === 'w1-parents');
if (w1p < 0 || w1q < 0 || w1p > w1q) fail('1막: w1-poem → w1-parents 차례가 아님');
const nights = stepsOf('act1').filter((s) => JSON.stringify(s).includes('밤마다 몰래 만났다'));
if (nights.length !== 1) fail('1막: "밤마다 몰래 만났다" 한 줄이 꼭 한 곳에 있어야 함');
// 2막: 도적 → 암전 → 이생 쪽 카드 → (밤) 혼
const wb = order('act2', (s) => s.type === 'wall' && s.id === 'w2-bandit');
const bo = order('act2', (s) => s.type === 'blackout');
if (wb < 0 || bo < 0 || bo < wb) fail('2막: 도적 앞 순간 다음에 암전이 없음');
else {
  const between = stepsOf('act2').slice(wb + 1, bo);
  if (between.some((s) => s.type !== 'card' || !s.rebuke)) fail('2막: 꾸짖음(원문 카드) 말고 다른 단계가 꾸짖음과 암전 사이에 있음');
}
const blk = stepsOf('act2')[bo] || {};
if (bo >= 0 && blk.scene) fail('2막 암전에 그림 자리가 있음(폭력·죽음은 그리지 않는다)');
if (!stepsOf('act2').some((s) => s.type === 'card' && s.mark === '해석' && /그 시대/.test(JSON.stringify(s)))) fail('2막: 절의·정절이 그 시대의 가치였다는 해석 카드가 없음');
const hon = stepsOf('act2night').find((s) => s.type === 'hon');
if (!hon) fail('밤의 최 씨 집: 혼이 열리는 단계(type:hon)가 없음');
else {
  if (!(hon.reason || []).some((r) => /天帝/.test(r.han || '')) || !(hon.reason || []).some((r) => /假以幻體/.test(r.han || ''))) fail('혼: 원문의 까닭(天帝…假以幻體)이 없음');
  if (!hon.reveal || hon.reveal.name !== '혼' || hon.reveal.tag !== '전기적 요소') fail('혼: 드러나는 이름(혼)과 표시(전기적 요소)가 없음');
}
// '살을 발라냄'은 원문 카드(han이 있는 덩이의 ko) 안에만
(function scanFlesh(o, inHan, where) {
  if (typeof o === 'string') { if (/살을 발라/.test(o) && !inHan) fail(`'살을 발라냄'이 원문 카드 밖에 있음: ${where}`); return; }
  if (Array.isArray(o)) return o.forEach((x, i) => scanFlesh(x, inHan, where + '[' + i + ']'));
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) scanFlesh(v, inHan || (k === 'ko' && !!o.han), where + '.' + k);
})({ PLACES, WALLS, CARDS, OKRU, FINALE }, false, '');
// 3막: 할 일 넷, 장사는 재물·유골 뒤, 경계, 마음, 옥루춘, 제안
const A3 = PLACES.act3 || {};
const T3 = A3.tasks || {};
if (!eq(Object.keys(T3).sort(), ['bones', 'burial', 'poems', 'treasure'])) fail('3막: 할 일 넷(treasure·bones·poems·burial)이 아님');
if (!eq(((T3.burial || {}).need || []).slice().sort(), ['bones', 'treasure'])) fail('3막: 장사(burial)가 재물·유골 뒤에 열리지 않음');
for (const t of ['treasure', 'bones', 'poems']) if ((T3[t] || {}).need && T3[t].need.length) fail(`3막: ${t}에 열림 조건이 있음(순서 자유여야 함)`);
for (const [k, t] of Object.entries(T3)) for (const sid of t.steps || []) if (!stepsOf('act3').some((s) => s.id === sid)) fail(`3막 할 일 ${k}: 없는 단계 ${sid}`);
const pstep = stepsOf('act3').find((s) => s.type === 'tasks');
if (!pstep || !eq(pstep.list, ['treasure', 'bones', 'poems', 'burial'])) fail("3막: {type:'tasks', list:[treasure,bones,poems,burial]} 단계가 없음");
for (const ty of ['mind', 'okru', 'propose']) if (!stepsOf('act3').some((s) => s.type === ty)) fail(`3막: ${ty} 단계가 없음`);
if (!A3.border || A3.border.wall !== 'w3-border') fail('3막: 보이지 않는 경계(border → w3-border)가 없음');
const mindStep = stepsOf('act3').find((s) => s.type === 'mind') || {};
if (!eq((mindStep.options || []).map((o) => o.id), ['treasure', 'rites', 'poems'])) fail('3막: 마음 둔 곳 고르기가 treasure·rites·poems가 아님');
const poemTask = stepsOf('act3').find((s) => s.id === ((T3.poems || {}).steps || [])[0]);
if (!poemTask || !JSON.stringify(poemTask).includes('"han"')) fail("3막: '시 주고받기'에 짧은 원문 한 구가 없음");
// 바로가기 요약 카드 셋
for (const [act, pid] of [['act1', 'act1'], ['act2', 'act2'], ['act3', 'act3']]) {
  const sm = (PLACES[pid] || {}).summary;
  if (!sm || !(sm.lines || []).length) fail(`${act}: 30초 요약 카드(summary)가 없음`);
}
// 사랑 장면 수위: 이생의 운우 시와 나머지 시는 싣지 않는다
const BANNED_POEMS = ['巫山六六霧重回', '相如欲挑卓文君', '好因緣邪惡因緣', '桃李枝間花富貴', '他時漏洩春消息', '曲欄下壓芙蓉池', '誤入桃源花爛熳', '破鏡重圓會有時', '惡因緣是好因緣'];

// ───────── 6. 모든 글: 표시·출처·상태, 원문 짝, 길이, 원문 대조, 낱말 ─────────
const SRC = hanOnly(sourceText());
const BAD_WORDS = ['점수', '등급', '순위', '랭킹', '시간 제한', '제한 시간', '남은 시간', '게임 오버', '게임오버', '정답', '오답', '틀렸', '틀린 ', '감점', '득점', '만점', '실패'];
let nText = 0; let nHan = 0;
const isReact = (path) => /^WALLS\.[^.]+\.react\./.test(path) || /^CARDS\.replies\./.test(path);
function walk(o, meta, path) {
  if (typeof o === 'string') {
    for (const w of BAD_WORDS) if (o.includes(w)) fail(`넘지 않는 선의 낱말 '${w.trim()}': ${path}`);
    return;
  }
  if (Array.isArray(o)) {
    o.forEach((x, i) => {
      if (typeof x === 'string' && /\.(lines|intro|pre|after)$/.test(path)) checkText({ t: x }, meta, path + '[' + i + ']');
      walk(x, meta, path + '[' + i + ']');
    });
    return;
  }
  if (!o || typeof o !== 'object') return;
  const m = { mark: o.mark || meta.mark, src: o.src || meta.src, status: o.status || meta.status };
  if (typeof o.han === 'string') checkHan(o, m, path);
  if (typeof o.t === 'string') checkText(o, m, path);
  if (typeof o.body === 'string') checkText({ t: o.body }, m, path + '.body');
  for (const [k, v] of Object.entries(o)) {
    if (k === 'prompt_hint' || k === 'caption' || k === 'grid') continue;
    walk(v, m, path + '.' + k);
  }
}
function checkMeta(m, path, need) {
  if (!MARKS.includes(m.mark)) fail(`표시(mark)가 다섯 가운데 하나가 아님(${m.mark}): ${path}`);
  if (need && m.mark !== need) fail(`표시가 '${need}'여야 함(${m.mark}): ${path}`);
  if (!m.src) fail(`출처(src)가 없음: ${path}`);
  if (m.status !== STATUS) fail(`상태가 '${STATUS}'가 아님(${m.status}): ${path}`);
}
function checkText(o, m, path) {
  nText++;
  checkMeta(m, path);
  const cap = isReact(path) ? CAP.react : CAP.event;
  if (o.t.length > cap) fail(`글 길이 ${o.t.length}자 > ${cap}자: ${path}`);
}
function checkHan(o, m, path) {
  nHan++;
  if (!o.ko || !String(o.ko).trim()) fail(`원문에 풀이(ko) 짝이 없음: ${path}`);
  if (!o.src && !m.src) fail(`원문 출처(src)가 없음: ${path}`);
  if ((o.status || m.status) !== STATUS) fail(`원문 상태가 '${STATUS}'가 아님: ${path}`);
  if (o.mark && o.mark !== '원문') fail(`원문 덩이의 표시가 '원문'이 아님(${o.mark}): ${path}`);
  const n = phrases(o.han);
  if (n > CAP.phrases) fail(`원문이 한 화면 ${CAP.phrases}구를 넘음(${n}구): ${path} — ${o.han}`);
  const hz = hanOnly(o.han);
  if (!hz) fail(`원문에 한자가 없음: ${path}`);
  else if (!SRC.includes(hz)) fail(`원문 한자가 원문 사본에 그대로 없음: ${path} — ${o.han}`);
  for (const b of BANNED_POEMS) if (hz.includes(b)) fail(`싣지 않기로 한 시가 실림: ${path} — ${b}`);
  if (String(o.ko).length > CAP.event) fail(`풀이가 ${CAP.event}자를 넘음: ${path}`);
}
walk(WALLS, {}, 'WALLS');
walk(CARDS, {}, 'CARDS');
walk(OKRU, {}, 'OKRU');
walk(FINALE, {}, 'FINALE');
for (const pid of PLACE_IDS) {
  const p = PLACES[pid] || {};
  // 지도 자리(맵·사람)와 그림 설명은 다른 작업이 고친다. 글이 있는 곳만 본다.
  const { maps, cast, scenes, ...text } = p;
  walk(text, {}, 'PLACES.' + pid);
  for (const [cid, c] of Object.entries(cast || {})) for (const [k, v] of Object.entries(c || {})) walk(v && v.talk, { mark: '게임 설정', src: '게임 설정', status: STATUS }, `PLACES.${pid}.cast.${cid}.${k}`);
}
if (nText < 50) fail(`글 덩이가 너무 적음(${nText}) — 자료가 비어 있는가`);
if (nHan < 10) fail(`원문 덩이가 너무 적음(${nHan})`);

// 혼의 원문 까닭, 여덟 글자, 옥루춘 구는 모두 원문 사본에 있어야 한다(위 대조에 포함). 여덟 글자는 꼭 실린다.
const allHan = [];
(function grab(o) { if (Array.isArray(o)) return o.forEach(grab); if (o && typeof o === 'object') { if (typeof o.han === 'string') allHan.push(hanOnly(o.han)); Object.values(o).forEach(grab); } })({ PLACES, WALLS, OKRU, FINALE });
if (!allHan.some((h) => h.includes('將子無疑昏以爲期'))) fail('1막: 여덟 글자(將子無疑, 昏以爲期) 원문이 없음');

// ───────── 결과 ─────────
if (fails.length) {
  console.log('✗ 글 자료 점검 실패 ' + fails.length + '건');
  for (const f of fails.slice(0, 80)) console.log('  - ' + f);
  if (fails.length > 80) console.log('  …(' + (fails.length - 80) + '건 더)');
  process.exit(1);
}
console.log(`✓ 글 자료 점검 통과 — 글 ${nText}덩이, 원문 ${nHan}덩이`);
