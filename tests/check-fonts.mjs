// 글꼴 점검(spec 15절 '저장소에 든 부분 글꼴만', plan T12).
// 1) 자료·화면 코드(js/**, css/**, index.html)에 나오는 모든 글자가 바탕(IsaengBatang)이나 한자 채움(IsaengHanja·드문 한자 IsaengHanjaExtra) 부분 글꼴에 있다
//    — 원전으로 나가는 문의 대목 모음과 안내 글도 자료(js/data)에 있으므로 여기에 들어간다.
// 2) 붓글씨(IsaengBrush)가 제목·거점 이름 글자를 모두 담는다
// 3) 글꼴 파일마다 OFL 고지와 출처 목록(credits/fonts.tsv) 한 줄이 있다
// woff2는 Python fontTools로 읽는다(글꼴 도구 tools/build_fonts.py와 같은 도구).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const FONTS = path.join(ROOT, 'assets', 'fonts');
let failures = 0;
const check = (ok, msg) => { if (!ok) failures++; console.log((ok ? '  ✓ ' : '  ✗ ') + msg); };

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, out);
    else if (p.endsWith(ext)) out.push(p);
  }
  return out;
}
const read = (p) => fs.readFileSync(p, 'utf8');

// 글꼴마다 담긴 글자 번호
const py = `
import json, sys
from fontTools.ttLib import TTFont
out = {}
for n in sys.argv[1:]:
    out[n] = sorted(TTFont(n).getBestCmap().keys())
print(json.dumps(out))
`;
const files = ['batang.woff2', 'batang-bold.woff2', 'hanja.woff2', 'hanja-bold.woff2', 'hanja-extra.woff2', 'hanja-extra-bold.woff2', 'brush.woff2'].map((f) => path.join(FONTS, f));
console.log('\n[1] 글꼴 파일');
for (const f of files) check(fs.existsSync(f), path.relative(ROOT, f) + ' 있음');
const r = spawnSync('python', ['-c', py, ...files], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, windowsHide: true });
if (r.status !== 0) {
  console.log('  ✗ fontTools로 글꼴을 읽지 못했다: ' + (r.stderr || r.error?.message));
  process.exit(1);
}
const cmap = Object.fromEntries(Object.entries(JSON.parse(r.stdout)).map(([k, v]) => [path.basename(k), new Set(v)]));

// 화면에 나올 수 있는 글자: 도구와 같은 범위(js/**, css/**, index.html)
const sources = [...walk(path.join(ROOT, 'js'), '.js'), ...walk(path.join(ROOT, 'css'), '.css'), path.join(ROOT, 'index.html')];
const chars = new Set();
for (const f of sources) for (const c of read(f)) { const cp = c.codePointAt(0); if (cp > 0x7e) chars.add(cp); }
// 글자로 그리지 않는 것: 줄바꿈 문자 대체, 변형 선택자, 제로 폭, 서로게이트 밖 그림 문자는 쓰지 않는다
const invisible = (cp) => (cp >= 0xfe00 && cp <= 0xfe0f) || cp === 0x200b || cp === 0x200c || cp === 0x200d || cp === 0xfeff || cp === 0xa0;

console.log('\n[2] 자료·화면 코드의 글자');
for (const [main, fill, extra] of [['batang.woff2', 'hanja.woff2', 'hanja-extra.woff2'], ['batang-bold.woff2', 'hanja-bold.woff2', 'hanja-extra-bold.woff2']]) {
  const miss = [...chars].filter((cp) => !invisible(cp) && !cmap[main].has(cp) && !cmap[fill].has(cp) && !cmap[extra].has(cp));
  check(miss.length === 0, `${main} + ${fill} + ${extra}가 글자 ${chars.size}개를 모두 담는다` + (miss.length ? ' — 빠진 글자: ' + miss.map((cp) => String.fromCodePoint(cp) + '(U+' + cp.toString(16).toUpperCase() + ')').join(' ') : ''));
}
// 한자가 실제로 있는지(대목 모음의 원문이 기기 글꼴로 빠지지 않게)
const han = [...chars].filter((cp) => cp >= 0x4e00 && cp <= 0x9fff);
check(han.length > 100 && han.every((cp) => cmap['hanja.woff2'].has(cp) || cmap['batang.woff2'].has(cp) || cmap['hanja-extra.woff2'].has(cp)), `원문 한자 ${han.length}자가 글꼴에 있다`);

console.log('\n[3] 붓글씨 글자(제목·막 이름·거점 이름)');
{
  const brushText = [];
  const flow = path.join(ROOT, 'js', 'data', 'flow.js');
  if (fs.existsSync(flow)) for (const m of read(flow).matchAll(/(?:title|subtitle|name): '([^']+)'/g)) brushText.push(m[1]);
  for (const f of walk(path.join(ROOT, 'js', 'data', 'places'), '.js')) for (const m of read(f).matchAll(/^\s*name: '([^']+)'/gm)) brushText.push(m[1]);
  // 붓글씨에 없는 문장 부호(「」—)는 글꼴 차례(--brush: IsaengBrush, 바탕)에 따라 바탕 부분 글꼴로 그린다
  const has = (cp) => ['brush.woff2', 'batang.woff2', 'hanja.woff2', 'hanja-extra.woff2'].some((f) => cmap[f].has(cp));
  const miss = [...new Set(brushText.join(''))].filter((c) => c.trim() && !has(c.codePointAt(0)));
  const hangulMiss = [...new Set(brushText.join(''))].filter((c) => /[가-힣]/.test(c) && !cmap['brush.woff2'].has(c.codePointAt(0)));
  check(brushText.length > 0 && miss.length === 0 && hangulMiss.length === 0, `붓글씨 글꼴이 이름 ${brushText.length}개의 한글을 담고, 문장 부호는 바탕 글꼴이 채운다` + (miss.length || hangulMiss.length ? ' — 빠진 글자: ' + [...miss, ...hangulMiss].join(' ') : ''));
}

console.log('\n[4] 사용권');
{
  const ofl = path.join(FONTS, 'OFL.txt');
  const txt = fs.existsSync(ofl) ? read(ofl) : '';
  check(/SIL Open Font License/.test(txt) && ['Gowun Batang', 'Noto Serif KR', 'Noto Serif SC', 'Nanum Brush Script'].every((n) => txt.includes(n)), 'assets/fonts/OFL.txt에 OFL 고지와 원 글꼴 넷의 전문이 있다');
  check(!/Hangro/i.test(txt), 'OFL 고지에 예전 이름(형제 게임 글꼴 이름)이 남지 않았다');
  const tsv = path.join(ROOT, 'credits', 'fonts.tsv');
  const rows = fs.existsSync(tsv) ? read(tsv).replace(/\r/g, '').split('\n').filter(Boolean).slice(1).map((l) => l.split('\t')) : [];
  const listed = new Set(rows.map((r) => r[0]));
  for (const f of fs.readdirSync(FONTS).filter((f) => f.endsWith('.woff2'))) {
    const row = rows.find((r) => r[0] === 'assets/fonts/' + f);
    check(!!row && /OFL/.test(row.join(' ')) && row.some((c) => c === '가능'), `credits/fonts.tsv에 assets/fonts/${f}가 OFL·상업 이용 가능으로 있다`);
  }
  check(listed.size === rows.length, 'credits/fonts.tsv에 같은 파일이 두 번 있지 않다');
}

console.log(failures ? `\n글꼴 점검 실패 ${failures}개` : '\n글꼴 점검 통과');
process.exit(failures ? 1 : 0);
