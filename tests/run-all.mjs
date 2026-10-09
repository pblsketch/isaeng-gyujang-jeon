// 모든 점검을 차례로 돌린다: tests/check-*.mjs를 스스로 찾아 하나씩 실행하고,
// 하나라도 실패하면 종료 1. 작업마다 자기 점검 파일만 더하면 된다.
// 쓰기: node tests/run-all.mjs            (전부)
//       node tests/run-all.mjs data rules (이름에 그 낱말이 든 점검만)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const only = process.argv.slice(2);
const files = fs.readdirSync(here)
  .filter((f) => /^check-.+\.mjs$/.test(f))
  .filter((f) => !only.length || only.some((w) => f.includes(w)))
  .sort();

if (!files.length) {
  console.log('점검 파일이 없다' + (only.length ? ' (고른 낱말: ' + only.join(', ') + ')' : ''));
  process.exit(only.length ? 1 : 0);
}

const results = [];
for (const f of files) {
  const t0 = Date.now();
  console.log('\n━━ ' + f + ' ━━');
  const r = spawnSync(process.execPath, [path.join(here, f)], { cwd: here, stdio: 'inherit', windowsHide: true });
  const code = r.status ?? 1;
  results.push({ f, code, sec: ((Date.now() - t0) / 1000).toFixed(1) });
}

console.log('\n━━ 요약 ━━');
for (const { f, code, sec } of results) console.log((code === 0 ? '  ✓ ' : '  ✗ ') + f + ' (' + sec + '초' + (code === 0 ? '' : ', 종료 ' + code) + ')');
const failed = results.filter((r) => r.code !== 0).length;
console.log(failed ? '\n실패 ' + failed + '개' : '\n모두 통과 (' + results.length + '개)');
process.exit(failed ? 1 : 0);
