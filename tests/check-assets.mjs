// 배경음 소재 점검(엔진·브라우저 없이, spec 13절):
//  - assets/bgm/의 모든 파일이 credits/bgm.tsv에 있고 이용 조건이 공공누리 제1유형, 상업적 이용 가능
//  - bgm.js의 모든 곡 파일이 있고(mp3), 목록의 줄마다 쓰는 파일이 실제로 있음
//  - 이 게임의 장면(들어가기·1막 정원·2막 피란·밤의 재회·3막·옥루춘·결과)과 거점의 music 열쇠가 모두 곡을 가짐
//  - 소리는 배경음만: 효과음·낭송 자리(assets/sfx 등)·합성 곡 표시(synth)가 없음
//  쓰기: node tests/check-assets.mjs
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { root, PLACE_FILES } from './lib-data.mjs';

const fails = [];
const fail = (m) => fails.push(m);
const rel = (p) => path.join(root, p);

// 반드시 곡이 있어야 할 장면(plan T9) — 열쇠: 이름
const SCENES = { prologue: '들어가기', garden: '1막 정원', flight: '2막 피란', night: '밤의 재회', act3: '3막', okru: '옥루춘', result: '결과' };

// ── bgm.js 읽기 ──
const ctx = { console };
ctx.window = ctx;
vm.createContext(ctx);
try { vm.runInContext(fs.readFileSync(rel('js/data/bgm.js'), 'utf8'), ctx, { filename: 'js/data/bgm.js' }); }
catch (e) { fail('bgm.js 실행 오류: ' + e.message); }
const BGM = ctx.BGM || {};
const tracks = BGM.tracks || {};
if (!Object.keys(tracks).length) fail('BGM.tracks가 비어 있음');
if (!String(BGM.credit || '').includes('공공누리 제1유형')) fail('BGM.credit에 출처·이용 조건 글이 없음');

// ── 곡 파일이 있음 ──
const used = new Set();
for (const [id, t] of Object.entries(tracks)) {
  if (!t || typeof t.src !== 'string' || !/^assets\/bgm\/[^/]+\.mp3$/.test(t.src)) { fail('곡 ' + id + ': src가 assets/bgm/….mp3 꼴이 아님'); continue; }
  if ('synth' in t) fail('곡 ' + id + ': 합성 곡(synth)을 두지 않는다');
  if (t.gain != null && !(t.gain > 0 && 0.5 * t.gain <= 1)) fail('곡 ' + id + ': gain이 범위 밖(0 < 0.5×gain ≤ 1): ' + t.gain);
  if (!t.from) fail('곡 ' + id + ': 곡 이름(from)이 없음');
  if (!fs.existsSync(rel(t.src))) { fail('곡 ' + id + ': 파일 없음 ' + t.src); continue; }
  const head = fs.readFileSync(rel(t.src)).subarray(0, 3);
  const isMp3 = head.toString('latin1') === 'ID3' || (head[0] === 0xff && (head[1] & 0xe0) === 0xe0);
  if (!isMp3) fail('곡 ' + id + ': mp3 머리가 아님 ' + t.src);
  used.add(t.src);
}

// ── 장면 배정 ──
for (const [id, name] of Object.entries(SCENES)) if (!tracks[id]) fail('장면 ' + name + '(' + id + ')에 곡이 없음');
// 거점 파일의 music 열쇠도 모두 곡을 가져야 한다(거점 파일은 읽기만)
for (const f of PLACE_FILES) {
  if (!fs.existsSync(rel(f))) continue;
  for (const m of fs.readFileSync(rel(f), 'utf8').matchAll(/\bmusic\s*:\s*['"]([^'"]+)['"]/g))
    if (!tracks[m[1]]) fail(f + ': music \'' + m[1] + '\'에 맞는 곡이 bgm.js에 없음');
}

// ── 게임 안 출처 줄 ──
const cr = [].concat(BGM.credits || []);
if (!cr.length) fail('BGM.credits(게임 안 출처 줄)가 비어 있음');
for (const c of cr) {
  if (!c.title || !c.by || !String(c.license || '').includes('공공누리 제1유형')) fail('출처 줄이 덜 채워짐: ' + JSON.stringify(c));
  if (c.file && !used.has('assets/bgm/' + c.file)) fail('출처 줄의 파일이 쓰이지 않음: ' + c.file);
}
for (const src of used) if (!cr.some((c) => 'assets/bgm/' + c.file === src)) fail('출처 줄에 없는 곡 파일: ' + src);
const sec = ((ctx.CREDITS || {}).sections || []).find((s) => s && s.id === 'bgm');
if (!sec || !(sec.items || []).length) fail('출처 화면(CREDITS.sections)에 배경음 칸이 없음');

// ── credits/bgm.tsv ──
const tsvPath = rel('credits/bgm.tsv');
const rows = new Map();
if (!fs.existsSync(tsvPath)) fail('credits/bgm.tsv 없음');
else {
  const lines = fs.readFileSync(tsvPath, 'utf8').split(/\r?\n/).filter((l) => l.trim());
  const hdr = (lines.shift() || '').split('\t');
  const col = (name) => hdr.findIndex((h) => h.includes(name));
  const ci = { file: col('파일'), title: col('곡'), src: col('출처'), lic: col('이용 조건'), com: col('상업적 이용'), orig: col('원본') };
  for (const [k, v] of Object.entries(ci)) if (v < 0) fail('bgm.tsv 머리줄에 칸이 없음: ' + k);
  for (const l of lines) {
    const c = l.split('\t');
    if (c.length !== hdr.length) fail('bgm.tsv 칸 수가 머리줄과 다름: ' + c[0]);
    const r = { file: c[ci.file], title: c[ci.title], src: c[ci.src], lic: c[ci.lic], com: c[ci.com], orig: c[ci.orig] };
    if (rows.has(r.file)) fail('bgm.tsv에 같은 파일이 두 번: ' + r.file);
    rows.set(r.file, r);
    if (!String(r.lic).includes('공공누리 제1유형')) fail('bgm.tsv ' + r.file + ': 이용 조건이 공공누리 제1유형이 아님');
    if (!String(r.src).includes('국립국악원')) fail('bgm.tsv ' + r.file + ': 출처에 국립국악원이 없음');
    if (r.com !== '가능') fail('bgm.tsv ' + r.file + ': 상업적 이용이 \'가능\'이 아님');
    if (!r.title || !r.orig) fail('bgm.tsv ' + r.file + ': 곡 이름·원본 기록이 비어 있음');
    if (!fs.existsSync(rel(r.file))) fail('bgm.tsv에 있으나 파일 없음: ' + r.file);
  }
}

// ── assets/bgm/의 모든 파일이 목록에 있고 쓰임 ──
const dir = rel('assets/bgm');
const files = fs.existsSync(dir) ? fs.readdirSync(dir) : [];
if (!files.length) fail('assets/bgm/가 비어 있음');
for (const f of files) {
  const p = 'assets/bgm/' + f;
  if (!/\.mp3$/.test(f)) fail('mp3가 아닌 파일: ' + p);
  if (!rows.has(p)) fail('credits/bgm.tsv에 없는 파일: ' + p);
  if (!used.has(p)) fail('bgm.js에서 쓰지 않는 파일: ' + p);
}

// ── 소리는 배경음만 ──
for (const d of ['assets/sfx', 'assets/voice', 'assets/recitation']) if (fs.existsSync(rel(d))) fail('배경음 밖 소리 폴더가 있음: ' + d);

if (fails.length) {
  console.log('✗ 배경음 점검 실패 ' + fails.length + '건');
  for (const m of fails) console.log('  - ' + m);
  process.exit(1);
}
console.log('✓ 배경음 점검 통과: 곡 ' + Object.keys(tracks).length + '개(파일 ' + files.length + '개), 장면 ' + Object.keys(SCENES).length + '개 배정, 출처 목록 ' + rows.size + '줄');
