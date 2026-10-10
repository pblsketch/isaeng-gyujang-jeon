// 넘지 않는 선 점검(spec 16·17절 '넘지 않는 선', 12절).
// 1) 학생 화면과 결과 화면에 나올 수 있는 글(자료 js/data/**의 모든 글, 엔진·화면 코드의 문자열, index.html, CSS content)에
//    점수·등급·순위·시간 제한·게임 오버, 맞고 틀림을 뜻하는 말이 없다
// 2) 폭력·죽음 장면(암전)에 그림 자리가 없다
// 코드의 주석은 화면에 나오지 않으므로 뺀다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
let failures = 0;
const check = (ok, msg) => { if (!ok) failures++; console.log((ok ? '  ✓ ' : '  ✗ ') + msg); };

const BAD = ['점수', '등급', '순위', '랭킹', '순위표', '시간 제한', '제한 시간', '남은 시간', '시간 초과', '게임 오버', '게임오버', 'game over', '정답', '오답', '틀렸', '틀린 ', '감점', '득점', '만점', '실패', '맞았습니다', '맞혔', '채점 결과', 'score', 'rank'];
// 금지어를 부정하는 말('정답이 없는 물음' — spec 11절 해석 표시의 뜻)은 지운 뒤 본다
const ALLOW = [/정답이? 없/g];
const hits = (s) => { let t = String(s).toLowerCase(); for (const a of ALLOW) t = t.replace(a, ''); return BAD.filter((w) => t.includes(w.toLowerCase())); };

function walk(dir, ext, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}
const rel = (p) => path.relative(ROOT, p).replace(/\\/g, '/');

// 주석 빼기: 문자열 안의 //·/* 는 남기고, 줄 주석과 덩이 주석만 지운다
function stripComments(src) {
  let out = '', i = 0, q = null;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (q) { out += c; if (c === '\\') { out += n ?? ''; i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'" || c === '`') { q = c; out += c; i++; continue; }
    if (c === '/' && n === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (c === '/' && n === '*') { i = src.indexOf('*/', i + 2); i = i < 0 ? src.length : i + 2; continue; }
    out += c; i++;
  }
  return out;
}
// 문자열 조각만 뽑는다
function stringsOf(code) {
  const out = [];
  for (const m of code.matchAll(/'((?:\\.|[^'\\\n])*)'|"((?:\\.|[^"\\\n])*)"|`((?:\\.|[^`\\])*)`/g)) out.push(m[1] ?? m[2] ?? m[3]);
  return out;
}

// ── 0. 음성 사례 ──
console.log('\n[0] 점검의 음성 사례');
check(hits('당신의 점수는 80점').length === 1 && hits('정답입니다').length === 1 && hits('GAME OVER').length === 1, '금지어가 든 글을 잡는다');
check(hits('담이 조금 높아졌다').length === 0 && hits('정답이 없는 물음').length === 0 && hits('기쁜 인연을 맞았지만').length === 0, '금지어가 없는 글과 금지어를 부정하는 글은 통과한다');
check(hits('맞았습니다! 정답').length === 2, '맞고 틀림을 알리는 말은 잡는다');
check(stringsOf(stripComments("// 점수 없음\nconst a = '담'; /* 등급 */")).join('') === '담', '주석은 빼고 문자열만 본다');

// ── 1. 자료의 모든 글 ──
console.log('\n[1] 자료(js/data)의 글');
{
  const window = {};
  window.window = window;
  const ctx = vm.createContext(window);
  const dataFiles = [...walk(path.join(ROOT, 'js', 'data'), '.js')].sort((a, b) => (a.includes('places') - b.includes('places')) || a.localeCompare(b));
  for (const f of dataFiles) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  const bad = [];
  let n = 0;
  const seen = new Set();
  const visit = (v, where) => {
    if (v == null) return;
    if (typeof v === 'string') { n++; const h = hits(v); if (h.length) bad.push(where + ' [' + h.join(',') + '] ' + v.slice(0, 50)); return; }
    if (typeof v !== 'object' || seen.has(v)) return;
    seen.add(v);
    for (const k of Object.keys(v)) {
      let x;
      try { x = v[k]; } catch (e) { continue; } // 기록을 읽는 getter(엔진 없이)는 건너뛴다
      visit(x, where + '.' + k);
    }
  };
  for (const k of Object.keys(window)) if (k !== 'window') visit(window[k], k);
  check(n > 500 && bad.length === 0, `자료의 글 ${n}개에 점수·등급·순위·시간 제한·게임 오버·맞고 틀림을 뜻하는 말이 없다` + (bad.length ? '\n      - ' + bad.slice(0, 20).join('\n      - ') : ''));
}

// ── 2. 엔진·화면 코드의 문자열 ──
console.log('\n[2] 엔진·화면 코드의 화면 글');
{
  const code = [...walk(path.join(ROOT, 'js', 'core'), '.js'), ...walk(path.join(ROOT, 'js', 'game'), '.js'), path.join(ROOT, 'js', 'main.js')];
  const bad = [];
  let n = 0;
  for (const f of code) {
    for (const s of stringsOf(stripComments(fs.readFileSync(f, 'utf8')))) {
      if (!/[가-힣A-Za-z]/.test(s)) continue;
      n++;
      // 영어 낱말은 화면 글이 아닌 식별자(클래스 이름 등)에도 나오므로 한글이 든 글에서만 영어 금지어를 본다
      const h = hits(s).filter((w) => /[가-힣]/.test(w) || /[가-힣]/.test(s));
      if (h.length) bad.push(rel(f) + ' [' + h.join(',') + '] ' + s.slice(0, 50));
    }
  }
  check(n > 50 && bad.length === 0, `코드 문자열 ${n}개에 금지어가 없다` + (bad.length ? '\n      - ' + bad.join('\n      - ') : ''));

  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  check(hits(html).length === 0, 'index.html의 화면 글에 금지어가 없다');
  const cssContent = walk(path.join(ROOT, 'css'), '.css').flatMap((f) => [...stripComments(fs.readFileSync(f, 'utf8')).matchAll(/content:\s*(['"])(.*?)\1/g)].map((m) => m[2]));
  check(cssContent.every((s) => hits(s).length === 0), `CSS가 넣는 글 ${cssContent.length}개에 금지어가 없다`);
}

// ── 3. 폭력·죽음 장면의 그림 자리 ──
console.log('\n[3] 폭력·죽음 장면(암전)');
{
  const window = {};
  window.window = window;
  const ctx = vm.createContext(window);
  for (const f of walk(path.join(ROOT, 'js', 'data'), '.js').sort((a, b) => (a.includes('places') - b.includes('places')) || a.localeCompare(b))) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });
  const blackouts = [];
  for (const [pid, place] of Object.entries(window.PLACES || {})) for (const s of place.steps || []) if (s && s.type === 'blackout') blackouts.push({ pid, s });
  check(blackouts.length >= 2, '암전 단계가 2막(도적)과 맺음(이생의 죽음)에 있다: ' + blackouts.map((b) => b.pid + '/' + b.s.id).join(', '));
  const withArt = blackouts.filter(({ s }) => ['scene', 'img', 'image', 'cover', 'art', 'portrait'].some((k) => s[k]));
  check(withArt.length === 0, '암전 단계에 그림 자리(scene·img·cover 등)가 없다' + (withArt.length ? ': ' + withArt.map((b) => b.s.id).join(', ') : ''));
  const sceneIds = Object.values(window.PLACES || {}).flatMap((p) => [...Object.keys(p.scenes || {}), ...(p.steps || []).map((s) => s && s.scene).filter(Boolean)]);
  const violent = sceneIds.filter((id) => /(death|dead|kill|blood|violence|corpse|bandit_attack|murder)/i.test(id));
  check(violent.length === 0, '폭력·죽음을 그리는 그림 이름이 없다' + (violent.length ? ': ' + violent.join(', ') : ''));
}

console.log(failures ? `\n넘지 않는 선 점검 실패 ${failures}개` : '\n넘지 않는 선 점검 통과');
process.exit(failures ? 1 : 0);
