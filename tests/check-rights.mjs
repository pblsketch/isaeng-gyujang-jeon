// 권리 점검(spec 16·17절 '권리', handoff 넘지 않는 관문 2).
// 1) 교과서 출판사 이름이 저장소에 올라가는 파일(이름과 내용), 커밋 글, 커밋 이력의 변경 내용, 브랜치 이름에 없다
// 2) 게임 코드(js·css·index.html)가 바깥 주소로 요청하지 않는다
// 3) 교과서 PDF·추출본, 그림·소리·글꼴의 생성 원본이 저장소에 올라가지 않는다(비공개 기획 폴더 design/은 이 검사에서 뺀다)
// 4) assets/ 아래 모든 파일이 credits/*.tsv에 상업 이용 가능으로 한 줄씩 있다
// 이 파일에도 그 이름을 글자 그대로 쓰지 않는다. 글자 번호로 만들어 쓴다(「옛 노래 서고」 점검과 같은 글자 번호).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const FORBIDDEN = String.fromCodePoint(0xc9c0, 0xd559, 0xc0ac);

let failures = 0;
const check = (ok, msg) => { if (!ok) failures++; console.log((ok ? '  ✓ ' : '  ✗ ') + msg); };

// 풀어 쓴 자모(NFD)로 들어와도 잡도록 NFC로 맞춘 뒤 찾는다
function containsForbidden(text) {
  const s = String(text ?? '');
  return s.includes(FORBIDDEN) || s.normalize('NFC').includes(FORBIDDEN);
}
function git(args) {
  const r = spawnSync('git', args, { cwd: root, encoding: 'buffer', maxBuffer: 1024 * 1024 * 1024, windowsHide: true });
  if (r.status !== 0) throw new Error('git ' + args.join(' ') + ' 실패: ' + (r.stderr?.toString('utf8') ?? r.error?.message));
  return r.stdout;
}
const list = (args) => git(args).toString('utf8').split('\0').filter(Boolean);
const tracked = list(['ls-files', '-z']);
const untracked = list(['ls-files', '-z', '--others', '--exclude-standard']); // 아직 추가하지 않았지만 올라갈 수 있는 파일
const files = [...new Set([...tracked, ...untracked])];

// 바깥 요청으로 볼 것: 코드에서 주소를 불러오는 꼴. 허용: SVG 이름 공간(xmlns)과 data:·blob: 주소
function externalRefs(text) {
  const bad = [];
  const stripped = String(text).replace(/xmlns(?::\w+)?=(['"])https?:\/\/www\.w3\.org\/[^'"]*\1/g, '');
  for (const m of stripped.matchAll(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s'"`)]*/gi)) {
    const before = stripped.slice(Math.max(0, m.index - 2), m.index);
    if (/[:\w]$/.test(before) && !/^https?:/i.test(m[0])) continue; // 'a//b' 같은 경로 조각
    bad.push(m[0]);
  }
  for (const m of stripped.matchAll(/\b(fetch|XMLHttpRequest|sendBeacon|WebSocket|EventSource|importScripts)\s*\(/g)) bad.push(m[1] + '(');
  return bad;
}

// ── 0. 점검 자체가 실제로 잡는지(음성 사례). 금지어는 메모리에서만 만든다 ──
console.log('\n[0] 점검의 음성 사례');
check(containsForbidden('교과서 ' + FORBIDDEN + ' 수록본'), '금지어가 든 글을 잡는다');
check(containsForbidden(('앞' + FORBIDDEN + '뒤').normalize('NFD')), '자모로 풀어 쓴(NFD) 금지어도 잡는다');
check(!containsForbidden('고등학교 문학 교과서 수록본'), '금지어가 없는 글은 통과한다');
check(externalRefs("x.src = 'https://cdn.example.com/a.js'").length === 1, '바깥 주소를 잡는다');
check(externalRefs("@import url(//fonts.example.com/css)").length === 1, '주소 틀이 없는 바깥 주소(//)도 잡는다');
check(externalRefs("fetch('data.json')").length === 1, 'fetch 부르기를 잡는다');
check(externalRefs("<svg xmlns='http://www.w3.org/2000/svg'></svg>").length === 0, 'SVG 이름 공간은 요청이 아니므로 통과한다');

// ── 1. 파일 ──
console.log('\n[1] 저장소에 올라가는 파일');
{
  const bad = [];
  for (const f of files) {
    if (containsForbidden(f)) { bad.push(f + ' (파일 이름)'); continue; }
    const p = path.join(root, f);
    if (!fs.existsSync(p) || !fs.statSync(p).isFile()) continue;
    if (containsForbidden(fs.readFileSync(p).toString('utf8'))) bad.push(f);
  }
  check(bad.length === 0, '파일 ' + files.length + '개의 이름과 내용에 출판사 이름이 없다' + (bad.length ? ': ' + bad.join(', ') : ''));
}

// ── 2. 커밋 이력 ──
console.log('\n[2] 커밋 이력');
{
  const messages = git(['log', '--all', '--format=%H%x00%B%x00']).toString('utf8').split('\0');
  const badMsg = [];
  for (let i = 0; i + 1 < messages.length; i += 2) if (containsForbidden(messages[i + 1])) badMsg.push(messages[i].trim().slice(0, 8));
  check(badMsg.length === 0, '커밋 글에 출판사 이름이 없다' + (badMsg.length ? ': ' + badMsg.join(', ') : ''));

  const diff = git(['log', '--all', '-p', '--text', '--no-color', '--no-ext-diff', '--format=commit %H']).toString('utf8');
  const badCommits = [];
  let current = '';
  for (const line of diff.split('\n')) {
    if (line.startsWith('commit ')) current = line.slice(7, 15);
    else if (containsForbidden(line) && !badCommits.includes(current)) badCommits.push(current);
  }
  check(badCommits.length === 0, '커밋 이력의 변경 내용에 출판사 이름이 없다' + (badCommits.length ? ': ' + badCommits.join(', ') : ''));

  const refs = git(['for-each-ref', '--format=%(refname)']).toString('utf8');
  check(!containsForbidden(refs), '브랜치·태그 이름에 출판사 이름이 없다');
}

// ── 3. 바깥 요청 ──
console.log('\n[3] 게임 코드의 바깥 요청');
{
  const code = files.filter((f) => /^(js|css)\/.*\.(js|css)$/.test(f) || f === 'index.html');
  const bad = [];
  for (const f of code) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    for (const r of externalRefs(fs.readFileSync(p, 'utf8'))) bad.push(f + ': ' + r.slice(0, 80));
  }
  check(code.length > 10 && bad.length === 0, '게임 코드 ' + code.length + '개에 바깥 주소 요청이 없다' + (bad.length ? '\n      - ' + bad.join('\n      - ') : ''));
}

// ── 4. 올리지 않는 파일 ──
console.log('\n[4] 교과서 파일과 생성 원본');
{
  const outsideDesign = tracked.filter((f) => !f.startsWith('design/') && !f.startsWith('.dryforge/'));
  const pdf = tracked.filter((f) => /\.pdf$/i.test(f));
  check(pdf.length === 0, '교과서·지도서 PDF가 추적되지 않는다' + (pdf.length ? ': ' + pdf.join(', ') : ''));
  const extract = outsideDesign.filter((f) => /(교과서|지도서|textbook|extract|추출)/i.test(f));
  check(extract.length === 0, '교과서 추출본이 추적되지 않는다' + (extract.length ? ': ' + extract.join(', ') : ''));
  const raw = outsideDesign.filter((f) => /^(assets\/raw|tools\/fonts_src|tools\/music_src|tools\/voice_cache)\//.test(f) || /\.(ttf|otf|ttc|wav|flac|psd)$/i.test(f));
  check(raw.length === 0, '그림·소리·글꼴의 생성 원본이 추적되지 않는다' + (raw.length ? ': ' + raw.join(', ') : ''));
  const ignored = (p) => spawnSync('git', ['check-ignore', '-q', p], { cwd: root, windowsHide: true }).status === 0;
  check(['assets/raw/x.png', 'tools/fonts_src/x.ttf', '.dryforge/spec.md'].every(ignored), '원본 폴더와 dryforge 작업 폴더는 .gitignore로 막혀 있다');
}

// ── 5. 자산 출처 ──
console.log('\n[5] 자산 출처 목록');
{
  const rows = [];
  for (const f of fs.readdirSync(path.join(root, 'credits')).filter((f) => f.endsWith('.tsv'))) {
    const lines = fs.readFileSync(path.join(root, 'credits', f), 'utf8').replace(/\r/g, '').split('\n').filter(Boolean);
    const head = lines[0].split('\t');
    const ci = head.findIndex((h) => /상업/.test(h));
    for (const l of lines.slice(1)) { const c = l.split('\t'); rows.push({ path: c[0], commercial: ci >= 0 ? c[ci] : '', from: f }); }
  }
  const assets = files.filter((f) => f.startsWith('assets/') && !/(^|\/)(OFL|LICENSE)[^/]*\.txt$/i.test(f));
  const missing = assets.filter((a) => !rows.some((r) => r.path === a));
  check(assets.length > 0 && missing.length === 0, 'assets/의 파일 ' + assets.length + '개가 모두 출처 목록에 있다' + (missing.length ? ': ' + missing.join(', ') : ''));
  const notOk = rows.filter((r) => assets.includes(r.path) && r.commercial !== '가능');
  check(notOk.length === 0, '출처 목록의 자산이 모두 상업 이용 가능이다' + (notOk.length ? ': ' + notOk.map((r) => r.path).join(', ') : ''));
  const stale = rows.filter((r) => !files.includes(r.path));
  check(stale.length === 0, '출처 목록에 없는 파일을 가리키는 줄이 없다' + (stale.length ? ': ' + stale.map((r) => r.from + ' ' + r.path).join(', ') : ''));
}

console.log('\n' + (failures ? '✗ 실패 ' + failures + '건' : '✓ 권리 점검 통과'));
process.exit(failures ? 1 : 0);
