// 규칙 점검(브라우저 없이): spec 17절 '규칙'과 '이번 검토로 더한 것'의 규칙 쪽, 확정 기록 원칙(plan 1-3).
//  js/core/save.js · js/game/rules.js와 실제 자료(walls·cards·finale·flow·places)를 Node vm 맥락에 싣고
//  평범한 상태 객체에 대해 G.rules의 …On 함수를 부른다. 새로고침 되돌리기는 app.runSteps와 같은 방식으로 흉내 낸다.
//  쓰기: node tests/check-rules.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root } from './lib-data.mjs';

const fails = [];
let passed = 0;
const ok = (cond, msg) => { if (cond) passed++; else fails.push(msg); };
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const clone = (o) => JSON.parse(JSON.stringify(o));

// ───────── 맥락 만들기 ─────────
const FILES = [
  'js/core/save.js', 'js/game/rules.js',
  'js/data/flow.js', 'js/data/walls.js', 'js/data/cards.js', 'js/data/finale.js',
  ...['prologue', 'act1', 'act2', 'act2night', 'act3', 'epilogue'].map((p) => `js/data/places/${p}.js`),
];
function boot(stored) {
  const mem = new Map(Object.entries(stored || {}));
  const ctx = {
    console, JSON, Date, Math,
    localStorage: {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => { mem.set(k, String(v)); },
      removeItem: (k) => { mem.delete(k); },
    },
  };
  ctx.window = ctx;
  ctx.G = {};
  vm.createContext(ctx);
  for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });
  return { ctx, G: ctx.G, R: ctx.G.rules, mem };
}

let env;
try { env = boot(); } catch (e) { console.error('싣기 실패: ' + e.message); process.exit(1); }
const { G, R } = env;
const fresh = () => clone(G.save.fresh());
const need = ['useMeansOn', 'reactionFor', 'nextAttempt', 'meansFor', 'wallPassed', 'wallHeight', 'borderOn', 'canLeave',
  'proposeChoices', 'answerOn', 'honOpenOn', 'blankOn', 'cardsFor', 'blanksDone', 'taskOpen', 'taskOn', 'act3Done', 'act3Goal',
  'mindOn', 'jeongiSceneOn', 'canWrite', 'lineOn', 'mbsOn', 'wordOn', 'hasProgress', 'shortcutOn', 'resumePoint', 'validSave',
  'onceOn', 'applyStep', 'applied', 'attach'];
for (const n of need) ok(typeof R[n] === 'function', 'G.rules.' + n + ' 함수가 없음');
if (fails.length) { report(); }

// ───────── 1. 담 앞 순간: 원작과 다른 수단은 진행을 막지 않고 담 높이만 바꾼다 ─────────
{
  const st = fresh();
  ok(R.wallHeight(st, 'act1') === 0, '처음 1막 담 높이가 0이 아님');
  const a = R.useMeansOn(st, 'w1-poem', 'mal');
  ok(!a.error && a.pass === false && a.n === 1, 'w1-poem 말: 통과하지 않고 시도 1로 기록돼야 함 ' + JSON.stringify(a));
  ok(eq(st.walls['w1-poem'], [{ n: 1, m: 'mal' }]), 'walls 기록이 [{n:1,m:mal}]이 아님: ' + JSON.stringify(st.walls));
  ok(a.react && a.react.length === 1 && a.react[0].t === env.ctx.WALLS['w1-poem'].react.mal.first.t, '첫 반응이 react.mal.first가 아님');
  ok(eq(a.layers, ['first']), '첫 실패의 반응 겹이 [first]가 아님: ' + JSON.stringify(a.layers));
  ok(R.wallHeight(st, 'act1') === 1, '맞지 않는 수단 한 번 뒤 1막 담 높이가 1이 아님');
  ok(!R.wallPassed(st, 'w1-poem'), '맞지 않는 수단으로 통과됨');
  // 다시 고를 수 있다(막힘 없음) — 같은 수단 다시
  const b = R.useMeansOn(st, 'w1-poem', 'mal');
  ok(b.n === 2 && b.pass === false, '같은 수단 두 번째가 기록되지 않음');
  ok(eq(b.layers, ['again', 'hint']), '같은 수단 두 번째(두 번째 실패)의 겹이 [again, hint]가 아님: ' + JSON.stringify(b.layers));
  ok(b.react.length === 2 && b.react[0].t === env.ctx.WALLS['w1-poem'].react.mal.again.t && b.react[1].t === env.ctx.WALLS['w1-poem'].react.mal.hint.t, '두 번째 반응 글이 again+hint가 아님');
  // 다른 수단의 첫 실패(그 순간의 세 번째 실패): first + hint
  const c = R.useMeansOn(st, 'w1-poem', 'gyeoldan');
  ok(eq(c.layers, ['first', 'hint']), '다른 수단의 첫 실패(두 번째 실패 뒤)는 [first, hint]여야 함: ' + JSON.stringify(c.layers));
  ok(R.wallHeight(st, 'act1') === 3, '1막 담 높이가 3이 아님: ' + R.wallHeight(st, 'act1'));
  // 맞는 수단: 통과, 높이는 그대로
  const d = R.useMeansOn(st, 'w1-poem', 'si');
  ok(d.pass === true && d.n === 4, '시로 통과하지 못함');
  ok(R.wallPassed(st, 'w1-poem'), 'wallPassed가 참이 아님');
  ok(R.wallHeight(st, 'act1') === 3, '맞는 수단이 담 높이를 바꿈');
  // 통과한 뒤에는 다시 기록되지 않는다(같은 선택이 두 번 반영되지 않음)
  const e = R.useMeansOn(st, 'w1-poem', 'si');
  ok(e.recorded === false && st.walls['w1-poem'].length === 4, '통과한 순간에 또 기록됨');
  // 첫 실패 직후 실마리는 없다(그 순간의 첫 실패)
  const st2 = fresh();
  const f = R.useMeansOn(st2, 'w1-parents', 'si');
  ok(eq(f.layers, ['first']), 'w1-parents 첫 실패 겹이 [first]가 아님');
  const g2 = R.useMeansOn(st2, 'w1-parents', 'mal');
  ok(g2.pass && eq(g2.layers, ['first']), '맞는 수단의 반응은 first 하나여야 함: ' + JSON.stringify(g2.layers));
  // reactionFor는 기록에서 다시 구한다(새로고침 뒤 같은 반응)
  const rf = R.reactionFor(st, 'w1-poem', 2);
  ok(eq(rf.layers, ['again', 'hint']), 'reactionFor(시도 2)가 기록에서 같은 겹을 구하지 못함');
  // 수단 칸: 써 본 수단 표시, 혼은 이름 없는 잠긴 칸
  const mf = R.meansFor(st, 'w1-poem');
  const hon = mf.find((x) => x.id === 'hon');
  ok(hon && hon.locked && hon.name == null, '1막 수단 칸에 이름 없는 잠긴 혼 칸이 없음: ' + JSON.stringify(mf));
  ok(mf.find((x) => x.id === 'mal').used === true && mf.find((x) => x.id === 'si').used === true, '써 본 수단 표시가 없음');
  ok(R.useMeansOn(fresh(), 'w1-poem', 'hon').error, '잠긴 혼을 쓸 수 있음');
  ok(R.useMeansOn(fresh(), 'w1-poem', 'xx').error, '없는 수단을 쓸 수 있음');
}

// ───────── 2. 담 높이는 막마다(기록에서 다시 셈, 막이 바뀌면 처음으로) ─────────
{
  const st = fresh();
  R.useMeansOn(st, 'w1-poem', 'mal'); R.useMeansOn(st, 'w1-poem', 'si');
  R.useMeansOn(st, 'w1-parents', 'si'); R.useMeansOn(st, 'w1-parents', 'mal');
  ok(R.wallHeight(st, 'act1') === 2, '1막 높이 2가 아님');
  ok(R.wallHeight(st, 'act2') === 0, '2막으로 바뀌면 높이가 처음(0)이어야 함');
  R.useMeansOn(st, 'w2-bandit', 'si');
  ok(R.wallHeight(st, 'act2') === 1 && R.wallHeight(st, 'act1') === 2, '2막 높이가 1막과 따로 세지지 않음');
  ok(!('height' in st) && !('wallHeight' in st), '담 높이가 저장 칸에 들어감(기록에서 다시 세야 함)');
  // 3막: 경계 + '남겠다' 답
  st.hon = 'open';
  R.useMeansOn(st, 'w3-border', 'hon');
  R.answerOn(st, 'stay');
  ok(R.wallHeight(st, 'act3') === 2, '3막 높이는 경계 시도 + stay 답 수여야 함: ' + R.wallHeight(st, 'act3'));
}

// ───────── 3. 혼: 도적 장면 꾸짖음(통과) 뒤, 걷기 시작한 뒤에만 열림 ─────────
{
  const st = fresh();
  ok(st.hon === 'locked', '처음 혼이 locked가 아님');
  ok(R.honOpenOn(st, { walking: true }).error && st.hon === 'locked', '도적 앞을 지나기 전에 혼이 열림');
  R.useMeansOn(st, 'w2-bandit', 'mal');
  ok(R.honOpenOn(st, { walking: true }).error && st.hon === 'locked', '꾸짖음 전에(말만 써 봄) 혼이 열림');
  R.useMeansOn(st, 'w2-bandit', 'gyeoldan');
  ok(R.honOpenOn(st, {}).error && st.hon === 'locked', '걷기 시작하기 전에 혼이 열림');
  const o = R.honOpenOn(st, { walking: true });
  ok(!o.error && st.hon === 'open', '꾸짖음 뒤 걷기 시작했는데 혼이 열리지 않음');
  const o2 = R.honOpenOn(st, { walking: true });
  ok(o2.again === true && st.hon === 'open', '혼 열기를 두 번 반영함');
  const mf = R.meansFor(st, 'w3-border');
  ok(mf.find((x) => x.id === 'hon' && !x.locked && x.name), '열린 뒤 경계 수단 칸에 이름 있는 혼이 없음');
  // 바로가기로 3막부터: 열린 채
  const s3 = fresh();
  R.shortcutOn(s3, 3);
  ok(s3.hon === 'open', '바로가기 3막에서 혼이 열려 있지 않음');
  const s2 = fresh();
  R.shortcutOn(s2, 2);
  ok(s2.hon === 'locked', '바로가기 2막에서 혼이 열려 있음');
}

// ───────── 4. 경계: 어떤 수단으로도(혼 포함) 넘지 못하고, 떠날 수 있다 ─────────
{
  const st = fresh(); st.hon = 'open';
  for (let i = 0; i < 3; i++) for (const m of ['mal', 'si', 'gyeoldan', 'hon']) {
    const r = R.useMeansOn(st, 'w3-border', m);
    ok(!r.error && r.pass === false, '경계를 ' + m + '로 넘음');
  }
  ok(!R.wallPassed(st, 'w3-border'), '경계가 통과됨');
  ok(st.walls['w3-border'].length === 12, '경계 시도가 모두 기록되지 않음');
  ok(st.border === true, '경계에서 수단을 썼는데 border가 참이 아님');
  ok(R.canLeave('w3-border') === true, '경계에서 떠날 수 없음');
  ok(R.canLeave('w1-poem') === false, '통과가 있는 순간에서 그냥 떠날 수 있음');
  const s2 = fresh();
  R.borderOn(s2);
  ok(s2.border === true, 'borderOn이 border를 참으로 두지 않음');
}

// ───────── 5. 3막 할 일: 장사는 재물·유골 뒤, 넷 + 경계여야 마침 ─────────
{
  const st = fresh();
  ok(!R.taskOpen(st, 'burial'), '처음부터 장사가 열림');
  ok(R.taskOn(st, 'burial').error && !st.tasks.burial, '재물·유골 전에 장사를 마침');
  R.taskOn(st, 'treasure');
  ok(!R.taskOpen(st, 'burial'), '재물만 찾았는데 장사가 열림');
  R.taskOn(st, 'poems');
  ok(!R.taskOpen(st, 'burial'), '재물·시만 했는데 장사가 열림');
  R.taskOn(st, 'bones');
  ok(R.taskOpen(st, 'burial'), '재물·유골 뒤에도 장사가 열리지 않음');
  const g1 = R.act3Goal(st);
  ok(eq(g1.tasks, ['burial']) && g1.border === false && !g1.done, '남은 할 일이 장사 하나가 아님: ' + JSON.stringify(g1));
  ok(R.mindOn(st, 'rites').error && st.mind == null, '할 일 넷을 마치기 전에 마음 둔 곳을 고름');
  R.taskOn(st, 'burial');
  ok(!R.act3Done(st), '경계를 겪지 않았는데 3막이 끝남');
  const g2 = R.act3Goal(st);
  ok(g2.border === true && !g2.tasks.length && !g2.done, '넷을 마쳤는데 지금 할 일이 경계를 가리키지 않음: ' + JSON.stringify(g2));
  ok(R.mindOn(st, 'rites').error, '경계 전에 마음 둔 곳을 고름');
  R.borderOn(st);
  ok(R.act3Done(st) && R.act3Goal(st).done, '넷 + 경계인데 3막이 끝나지 않음');
  ok(!R.mindOn(st, 'rites').error && st.mind === 'rites', '마음 둔 곳이 기록되지 않음');
  ok(R.mindOn(st, 'poems').again && st.mind === 'rites', '마음 둔 곳이 두 번 반영됨');
  ok(R.mindOn(fresh(), 'burial').error, "'burial'은 마음 둔 곳 열쇠가 아님");
  const t2 = R.taskOn(st, 'treasure');
  ok(t2.again === true, '같은 할 일이 두 번 반영됨');
  ok(R.taskOn(st, 'nope').error, '없는 할 일이 기록됨');
}

// ───────── 6. 이생의 제안: '함께 가자'는 고르기에 없음, stay는 다시, 첫 답은 propose[0] ─────────
{
  const ch = R.proposeChoices();
  ok(eq([...ch].sort(), ['entrust', 'stay']), '제안의 고르기가 stay·entrust 둘이 아님: ' + JSON.stringify(ch));
  ok(!ch.includes('together'), "'함께 가자'(together)가 고르기에 있음");
  const st = fresh();
  ok(R.answerOn(st, 'together').error && st.propose.length === 0, "together를 답으로 기록함");
  const a = R.answerOn(st, 'stay');
  ok(a.pass === false && eq(a.layers, ['first']) && a.react[0].t === env.ctx.WALLS['w3-propose'].react.stay.first.t, 'stay 첫 반응이 아님');
  const b = R.answerOn(st, 'stay');
  ok(b.pass === false && eq(b.layers, ['again', 'hint']), 'stay 두 번째 반응이 again+hint가 아님');
  const c = R.answerOn(st, 'entrust');
  ok(c.pass === true, 'entrust로 나아가지 않음');
  ok(eq(st.propose, ['stay', 'stay', 'entrust']) && st.propose[0] === 'stay', '답한 차례가 propose에 남지 않음: ' + JSON.stringify(st.propose));
  ok(R.answerOn(st, 'stay').recorded === false && st.propose.length === 3, '나아간 뒤에 또 답이 기록됨');
}

// ───────── 7. 빈칸: 맞지 않는 카드는 인물의 말 + first, 맞으면 final ─────────
{
  const C = env.ctx.CARDS;
  const st = fresh();
  const r = R.blankOn(st, 'b1-wall', '울주');
  ok(r.ok === false && r.reply && r.reply.t === C.replies['b1-wall']['울주'].t, '맞지 않는 카드에 replies의 말이 돌아오지 않음');
  ok(st.blanks['b1-wall'].first === '울주' && !st.blanks['b1-wall'].final, '첫 시도(first)가 남지 않음: ' + JSON.stringify(st.blanks));
  const r2 = R.blankOn(st, 'b1-wall', '과거 급제');
  ok(r2.ok === false && st.blanks['b1-wall'].first === '울주', '두 번째 시도가 first를 덮어씀');
  const r3 = R.blankOn(st, 'b1-wall', '담장');
  ok(r3.ok === true && st.blanks['b1-wall'].final === '담장' && st.blanks['b1-wall'].first === '울주', '맞는 카드가 final로 남지 않음');
  const r4 = R.blankOn(st, 'b1-wall', '혼인');
  ok(r4.again === true && st.blanks['b1-wall'].final === '담장', '채운 빈칸이 다시 바뀜');
  const r5 = R.blankOn(st, 'b2-marriage', '없는카드');
  ok(r5.ok === false && r5.reply && r5.reply.t === C.replies['b2-marriage'].default.t, '목록에 없는 카드에 default 말이 돌아오지 않음');
  const r6 = R.blankOn(fresh(), 'b1-wall', '담장');
  ok(r6.ok && r6.first === '담장', '처음부터 맞으면 first=final이어야 함');
  ok(!R.blanksDone(st, 'act1'), '빈칸 하나만 채웠는데 1막 빈칸이 다 찼다고 함');
  R.blankOn(st, 'b2-marriage', '혼인');
  ok(R.blanksDone(st, 'act1'), '1막 빈칸 둘을 채웠는데 다 찼다고 하지 않음');
  const h2 = R.cardsFor('act2');
  ok(['담장', '혼인', '울주', '과거 급제', '홍건적의 난', '환신', '피란', '꿈'].every((w) => h2.includes(w)), '2막 빈칸의 카드에 1막 카드까지 들지 않음: ' + JSON.stringify(h2));
  ok(R.blankOn(fresh(), 'b9-none', '담장').error, '없는 빈칸이 기록됨');
}

// ───────── 8. 쓰기 셋, 전기적 요소의 근거 장면, 만복사 두 고르기 ─────────
{
  const st = fresh();
  ok(R.lineOn(st, 'repeat', '   ').error && st.lines.repeat === '', '빈 반복의 뜻 문장으로 넘어감');
  ok(!R.lineOn(st, 'repeat', ' 인연이 각별함 ').error && st.lines.repeat === '인연이 각별함', '반복의 뜻 문장이 기록되지 않음');
  ok(!R.canWrite(st, 'jeongi'), '근거 장면 전에 전기적 요소 쓰기 칸이 열림');
  ok(R.lineOn(st, 'jeongi', '죽음을 넘어선 사랑').error && st.lines.jeongi === '', '근거 장면 전에 전기적 요소 한 줄이 기록됨');
  ok(R.jeongiSceneOn(st, 'nowhere').error && st.jeongiScene == null, '없는 근거 장면이 기록됨');
  ok(!R.jeongiSceneOn(st, 'reunion').error && st.jeongiScene === 'reunion', '근거 장면이 기록되지 않음');
  ok(R.canWrite(st, 'jeongi'), '근거 장면 뒤에도 쓰기 칸이 열리지 않음');
  ok(R.lineOn(st, 'jeongi', '').error, '빈 전기적 요소 한 줄로 넘어감');
  ok(!R.lineOn(st, 'jeongi', '죽음을 넘어선 사랑').error && st.lines.jeongi === '죽음을 넘어선 사랑', '전기적 요소 한 줄이 기록되지 않음');
  ok(R.lineOn(st, 'mbsSame', '').error, '빈 만복사 한 줄로 넘어감');
  ok(R.lineOn(st, 'nope', 'x').error, '없는 쓰기 열쇠가 기록됨');
  // 만복사: 사실 공개 전 저장, 한 번만
  const m = R.mbsOn(st, 'q1', 'parents');
  ok(!m.error && st.mbs.q1 === 'parents' && m.fact, '만복사 고르기가 기록되지 않거나 사실이 돌아오지 않음');
  ok(R.mbsOn(st, 'q1', 'death').again && st.mbs.q1 === 'parents', '만복사 고르기가 두 번 반영됨(사실 공개 전 답이 바뀜)');
  ok(R.mbsOn(st, 'q2', 'zzz').error && st.mbs.q2 == null, '없는 보기가 기록됨');
  ok(!('correct' in m) && !('right' in m), '만복사 결과에 맞고 틀림이 있음');
}

// ───────── 9. 같은 선택이 두 번 반영되지 않음(한 번만 장부) ─────────
{
  const st = G.save.state;
  Object.assign(st, fresh());
  const step = { id: 'x-card', type: 'card' };
  const r1 = R.applyStep(step, { place: 'act1' });
  const r2 = R.applyStep(step, { place: 'act1' });
  ok(!r1.again && r2.again === true, '같은 단계가 두 번 반영됨');
  ok(!!R.applied('s:act1:x-card', st), '장부에 열쇠가 없음');
  // 낱말 카드는 한 번만
  R.wordOn(st, '담장'); R.wordOn(st, '담장');
  ok(eq(st.words, ['담장']), '낱말 카드가 두 번 들어감: ' + JSON.stringify(st.words));
}

// ───────── 10. 확정 기록은 새로고침 되돌리기에 지워지지 않고, 두 번 들어가지 않는다 ─────────
//  app.runSteps와 같은 방식: 단계를 시작할 때 snapKeys의 값을 떠 두고, 도중에 다시 열면 그 값으로 되돌린 뒤 단계를 다시 편다.
{
  const snapKeys = G.save.snapKeys;
  ok(snapKeys.includes('applied') && snapKeys.includes('flags'), 'snapKeys에 flags·applied가 없음');
  for (const k of G.save.COMMITTED) ok(!snapKeys.includes(k), '확정 기록 칸 ' + k + '가 되돌리기(snapKeys)에 들어 있음');
  const st = G.save.state;
  Object.assign(st, fresh(), { place: 'act2', startedAt: 1 }); // 게임 중이면 거점이 있다(진행이 없으면 저장 열쇠를 만들지 않는다)
  const sk = 's:act2:w2-bandit';
  const startStep = () => {
    if (st.snap[sk]) Object.assign(st, clone(st.snap[sk]));
    else { const s = {}; for (const k of snapKeys) s[k] = st[k]; st.snap[sk] = clone(s); }
  };
  const reload = () => { G.save.write(); G.save.load(); return G.save.state; };
  // 첫 열기: 말을 써 보고(반응 봄), 그 단계의 효과도 장부에 적어 본다(되돌리기 대상)
  startStep();
  const n1 = R.nextAttempt(st, 'w2-bandit');
  R.useMeansOn(st, 'w2-bandit', 'mal', n1);
  R.applyStep({ id: 'w2-bandit', type: 'wall' }, { place: 'act2' });
  st.flags.sawBandit = true;
  // 새로고침(창을 닫았다 엶)
  let s2 = reload();
  ok(eq(s2.walls['w2-bandit'], [{ n: 1, m: 'mal' }]), '새로고침 뒤 수단 기록이 남지 않음');
  // 단계 다시 펼치기: 되돌리기
  if (s2.snap[sk]) Object.assign(s2, clone(s2.snap[sk]));
  ok(!s2.applied[sk] && !s2.flags.sawBandit, '장면 진행(applied·flags)이 되돌려지지 않음');
  ok(eq(s2.walls['w2-bandit'], [{ n: 1, m: 'mal' }]), '되돌리기가 확정 기록(walls)을 지움');
  // 같은 시도(같은 번호)가 다시 들어와도 두 번 기록되지 않는다(장부가 지워졌어도)
  const again = R.useMeansOn(s2, 'w2-bandit', 'mal', n1);
  ok(again.recorded === false && s2.walls['w2-bandit'].length === 1, '같은 시도 번호가 두 번 기록됨: ' + JSON.stringify(s2.walls));
  ok(eq(again.layers, ['first']), '같은 시도 번호를 다시 부르면 그때의 반응(first)을 돌려줘야 함');
  // 단계 효과를 다시 적용해도(장부가 되돌려졌으므로 다시 적용됨) 확정 기록은 늘지 않는다
  R.applyStep({ id: 'w2-bandit', type: 'wall' }, { place: 'act2' });
  ok(s2.walls['w2-bandit'].length === 1, '단계 효과를 다시 적용하자 수단 기록이 늘어남');
  // 새 시도는 다음 번호로
  const n2 = R.nextAttempt(s2, 'w2-bandit');
  ok(n2 === 2, '다음 시도 번호가 2가 아님');
  R.useMeansOn(s2, 'w2-bandit', 'gyeoldan', n2);
  ok(eq(s2.walls['w2-bandit'], [{ n: 1, m: 'mal' }, { n: 2, m: 'gyeoldan' }]), '써 본 차례가 이어지지 않음');
  ok(R.wallHeight(s2, 'act2') === 1, '새로고침 뒤 2막 높이가 1이 아님');
  // 빈칸 첫 시도·제안의 답·만복사·할 일 일부도 같은 방식
  const sb = 's:act1:a1-blank';
  const s3 = s2;
  { const s = {}; for (const k of snapKeys) s[k] = s3[k]; s3.snap[sb] = clone(s); }
  R.blankOn(s3, 'b1-wall', '울주');
  R.taskOn(s3, 'treasure');
  R.answerOn(s3, 'stay', 1);
  R.mbsOn(s3, 'q2', 'dream');
  let s4 = reload();
  Object.assign(s4, clone(s4.snap[sb]));
  ok(s4.blanks['b1-wall'] && s4.blanks['b1-wall'].first === '울주', '새로고침 뒤 빈칸 첫 시도가 남지 않음');
  ok(s4.tasks.treasure === true, '새로고침 뒤 3막 할 일이 남지 않음');
  ok(eq(s4.propose, ['stay']), '새로고침 뒤 제안의 답이 남지 않음');
  ok(s4.mbs.q2 === 'dream', '새로고침 뒤 만복사 고르기가 남지 않음');
  R.answerOn(s4, 'stay', 1);
  ok(eq(s4.propose, ['stay']), '같은 답 시도 번호가 두 번 기록됨');
  R.answerOn(s4, 'entrust', R.nextAttempt(s4, 'w3-propose'));
  ok(eq(s4.propose, ['stay', 'entrust']), '다음 답이 이어 기록되지 않음');
}

// ───────── 11. 저장 기록이 깨졌으면 처음부터 ─────────
{
  const KEY = 'isaeng-gyujang:progress';
  const e1 = boot({ [KEY]: '{깨진 기록' });
  const s1 = e1.G.save.load();
  ok(eq(Object.keys(s1.walls), []) && s1.hon === 'locked' && !e1.G.save.started(), '깨진(JSON 아님) 기록에서 처음부터 시작하지 않음');
  const e2 = boot({ [KEY]: JSON.stringify({ place: 'act3', done: { 'p:act1': true }, walls: 'x', propose: {}, hon: 'maybe' }) });
  const s2 = e2.G.save.load();
  ok(s2.place == null && eq(s2.walls, {}) && eq(s2.propose, []) && s2.hon === 'locked', '모양이 깨진 기록에서 처음부터 시작하지 않음: ' + JSON.stringify({ place: s2.place, walls: s2.walls }));
  const e3 = boot({ [KEY]: JSON.stringify({ place: 'act2', done: { 'p:act1': true }, walls: { 'w1-poem': [{ n: 1, m: 'si' }] }, hon: 'locked' }) });
  const s3 = e3.G.save.load();
  ok(s3.place === 'act2' && s3.walls['w1-poem'].length === 1, '멀쩡한 기록을 읽지 못함');
  ok(e3.G.rules.validSave({ walls: { 'w1-poem': [{ n: 1, m: 'si' }] } }) === true, 'validSave가 멀쩡한 기록을 거부함');
  ok(e3.G.rules.validSave({ walls: { 'w1-poem': [{ m: 'si' }] } }) === false, 'validSave가 번호 없는 시도를 받아들임');
}

// ───────── 12. 바로가기: 건너뛴 막의 빈칸은 원작 낱말, skipped, '이 막부터' ─────────
{
  const A = env.ctx.CARDS.answer;
  const st = fresh();
  ok(!R.hasProgress(st), '새 기록에 진행이 있다고 함');
  const r = R.shortcutOn(st, 3);
  ok(eq(st.skipped, ['act1', 'act2']), '3막 바로가기의 skipped가 [act1, act2]가 아님: ' + JSON.stringify(st.skipped));
  for (const k of ['b1-wall', 'b2-marriage', 'b2-war', 'b3-hwanshin']) ok(st.blanks[k] && st.blanks[k].final === A[k], '건너뛴 막의 빈칸 ' + k + '이 원작 낱말로 차지 않음');
  ok(st.place === 'act3' && st.act === 'act3' && r.place === 'act3', '3막 바로가기의 거점이 act3이 아님');
  for (const p of ['prologue', 'act1', 'act2', 'act2night']) ok(st.done['p:' + p], '3막 바로가기에서 앞 거점 ' + p + '가 끝낸 것으로 남지 않음(이어 하기가 앞으로 돌아감)');
  ok(R.resumePoint(st).place === 'act3', '3막 바로가기 뒤 이어 하기가 3막이 아님');
  ok(R.hasProgress(st), '바로가기 뒤에 진행이 없다고 함');
  const s1 = fresh(); R.shortcutOn(s1, 1);
  ok(eq(s1.skipped, []) && eq(s1.blanks, {}) && s1.place === 'act1', '1막 바로가기가 무엇을 건너뜀');
  ok(s1.done['p:prologue'] === true, '1막 바로가기에서 들어가기가 끝낸 것으로 남지 않음');
  // 저장 기록이 있을 때 '이 막부터': 앞 막 기록은 남고, 그 막과 뒤 막은 새로
  const s = fresh();
  R.useMeansOn(s, 'w1-poem', 'mal'); R.useMeansOn(s, 'w1-poem', 'si');
  R.useMeansOn(s, 'w1-parents', 'gyeoldan');
  R.blankOn(s, 'b1-wall', '울주'); R.blankOn(s, 'b1-wall', '담장'); R.blankOn(s, 'b2-marriage', '혼인');
  s.done['p:prologue'] = true; s.done['p:act1'] = true; s.done['b:act1:b-peek'] = true; s.done['s:act1:w1-poem'] = true;
  R.useMeansOn(s, 'w2-bandit', 'si'); R.useMeansOn(s, 'w2-bandit', 'gyeoldan');
  R.blankOn(s, 'b2-war', '피란');
  s.done['b:act2:b-intro'] = true; s.done['s:act2:a2-history'] = true; s.applied['s:act2:a2-history'] = true;
  s.snap['s:act2:w2-bandit'] = { flags: {}, applied: {} };
  s.hon = 'open'; s.place = 'act2night';
  R.taskOn(s, 'treasure'); R.lineOn(s, 'repeat', '무언가');
  ok(R.hasProgress(s), '기록이 있는데 진행이 없다고 함(이어 하기 / 이 막부터를 물어야 함)');
  R.shortcutOn(s, 2);
  ok(eq(s.walls['w1-poem'], [{ n: 1, m: 'mal' }, { n: 2, m: 'si' }]) && s.walls['w1-parents'].length === 1, "'이 막부터'가 앞 막(1막)의 수단 기록을 지움");
  ok(s.blanks['b1-wall'].first === '울주' && s.blanks['b1-wall'].final === '담장', "'이 막부터'가 앞 막의 빈칸 기록을 지움");
  ok(!s.walls['w2-bandit'] || !s.walls['w2-bandit'].length, "'이 막부터'가 그 막(2막)의 수단 기록을 지우지 않음");
  ok(!s.blanks['b2-war'] && !s.blanks['b3-hwanshin'], "'이 막부터'가 그 막의 빈칸을 지우지 않음");
  ok(eq(s.tasks, {}) && s.lines.repeat === '' && s.border === false && eq(s.propose, []), "'이 막부터'가 뒤 막(3막·마무리) 기록을 지우지 않음");
  ok(s.hon === 'locked', "'2막부터'인데 혼이 잠기지 않음");
  ok(eq(s.skipped, []), '다 한 1막이 skipped에 들어감');
  ok(s.done['p:act1'] && s.done['b:act1:b-peek'] && s.done['s:act1:w1-poem'], '앞 막의 장부가 지워짐');
  ok(!s.done['b:act2:b-intro'] && !s.done['s:act2:a2-history'] && !s.applied['s:act2:a2-history'] && !s.snap['s:act2:w2-bandit'], '그 막의 장부(done·applied·snap)가 지워지지 않음');
  ok(s.place === 'act2' && s.act === 'act2', "'2막부터'의 거점이 act2가 아님");
  ok(R.resumePoint(s).place === 'act2', "'2막부터' 뒤 이어 하기가 2막(피란길)이 아님");
  // 하다 만 앞 막은 건너뛴 막이 된다
  const p = fresh();
  R.useMeansOn(p, 'w1-poem', 'si'); p.done['p:prologue'] = true; p.place = 'act1';
  R.shortcutOn(p, 3);
  ok(eq(p.skipped, ['act1', 'act2']), '하다 만 1막이 skipped에 들지 않음: ' + JSON.stringify(p.skipped));
  ok(eq(p.walls['w1-poem'], [{ n: 1, m: 'si' }]), '하다 만 앞 막의 기록이 지워짐');
  // 바로가기를 두 번 해도 skipped가 겹치지 않음
  R.shortcutOn(p, 3);
  ok(eq(p.skipped, ['act1', 'act2']), 'skipped가 겹침: ' + JSON.stringify(p.skipped));
  ok(R.shortcutOn(fresh(), 4).error, '없는 막 바로가기가 받아들여짐');
}

// ───────── 13. 이어 하기: 그 막의 다음 할 일부터, 걷던 자리는 그 지도의 시작 지점 ─────────
{
  const P = env.ctx.PLACES;
  const st = fresh();
  ok(R.resumePoint(st).place === 'prologue', '새 기록의 이어 하기가 들어가기가 아님');
  st.done['p:prologue'] = true; st.done['p:act1'] = true;
  st.done['p:act2'] = true; st.place = 'act2';
  st.done['b:act2night:b-steps'] = true;
  const r = R.resumePoint(st);
  ok(r.place === 'act2night' && r.beat === 'b-meet', '2막 밤의 최 씨 집 다음 할 일부터가 아님: ' + JSON.stringify(r));
  ok(r.map === P.act2night.map && eq(r.spawn, P.act2night.maps[P.act2night.map].spawn || P.act2night.spawn), '걷던 자리가 다음 할 일이 있는 지도의 시작 지점이 아님: ' + JSON.stringify(r));
  const s2 = fresh(); s2.done['p:prologue'] = true; s2.done['p:act1'] = true; s2.place = 'act2'; s2.done['b:act2:b-intro'] = true;
  const r2 = R.resumePoint(s2);
  ok(r2.place === 'act2' && r2.beat === 'b-walk' && r2.map === P.act2.map, '2막 피란길 다음 할 일부터가 아님: ' + JSON.stringify(r2));
  ok(!('pos' in r2) || r2.pos == null, '걷던 자리를 그대로 돌려줌');
  // 3막: 다음 할 일이 한 구역에만 있으면 그 구역의 시작 지점(경계만 남으면 경계 가까이), 여러 구역에 나뉘면 최 씨 집
  const A3 = P.act3;
  const s3 = fresh(); R.shortcutOn(s3, 3); s3.done['b:act3:b-morning'] = true;
  const at3 = (o) => { const s = clone(s3); Object.assign(s, clone(o)); return R.resumePoint(s); };
  const r3a = at3({});
  ok(r3a.place === 'act3' && r3a.beat === 'b-tasks' && r3a.map === A3.map, '3막 할 일이 여러 구역에 남았는데 최 씨 집이 아님: ' + JSON.stringify(r3a));
  const r3b = at3({ tasks: { treasure: true, bones: true, poems: true } });
  ok(r3b.map === A3.tasks.burial.map && eq(r3b.spawn, A3.maps[A3.tasks.burial.map].spawn), '장사만 남았는데 오관산 기슭 시작 지점이 아님: ' + JSON.stringify(r3b));
  const r3c = at3({ tasks: { treasure: true, bones: true, poems: true, burial: true } });
  ok(r3c.map === A3.border.map && eq(r3c.spawn, A3.border.spawn), '경계만 남았는데 경계 가까이(들)가 아님: ' + JSON.stringify(r3c));
  const r3d = at3({ tasks: { poems: true } });
  ok(r3d.map === A3.tasks.treasure.map, '재물·유골만 남았는데 들이 아님: ' + JSON.stringify(r3d));
  const r3e = at3({ tasks: { treasure: true, bones: true, poems: true, burial: true }, border: true });
  ok(r3e.map === A3.map, '3막 할 일을 다 마쳤는데 최 씨 집이 아님: ' + JSON.stringify(r3e));
  const s3f = clone(s3); Object.assign(s3f, { tasks: { treasure: true, bones: true, poems: true, burial: true }, border: true, mind: 'rites' }); s3f.done['b:act3:b-tasks'] = true; s3f.done['b:act3:b-mind'] = true;
  const r3f = R.resumePoint(s3f);
  ok(r3f.beat === 'b-evening' && r3f.map === 'home', '어느 날 저녁 이어 하기가 최 씨 집이 아님: ' + JSON.stringify(r3f));
}

report();
function report() {
  if (fails.length) {
    console.log('규칙 점검 실패 ' + fails.length + '개 (통과 ' + passed + ')');
    for (const f of fails) console.log('  ✗ ' + f);
    process.exit(1);
  }
  console.log('규칙 점검 통과 (' + passed + '개)');
  process.exit(0);
}
