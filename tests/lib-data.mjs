// 자료 파일을 엔진 없이 읽는 도우미(점검 실행기가 직접 돌리지 않는다: 이름이 check-로 시작하지 않음).
//  - 브라우저 전역 대신 Node vm 맥락에 가짜 window를 두고 자료 파일을 차례로 실행한다.
//  - G(엔진)는 두지 않는다. 거점 파일은 G.world.mk가 없어도 격자를 만들어야 한다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const DATA_FILES = ['walls', 'cards', 'okru', 'finale'].map((n) => `js/data/${n}.js`);
export const PLACE_IDS = ['prologue', 'act1', 'act2', 'act2night', 'act3', 'epilogue'];
export const PLACE_FILES = PLACE_IDS.map((n) => `js/data/places/${n}.js`);

export function loadData() {
  const ctx = { console };
  ctx.window = ctx;
  vm.createContext(ctx);
  const missing = [];
  const errors = [];
  for (const f of [...DATA_FILES, ...PLACE_FILES]) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) { missing.push(f); continue; }
    try { vm.runInContext(fs.readFileSync(p, 'utf8'), ctx, { filename: f }); }
    catch (e) { errors.push(f + ': ' + e.message); }
  }
  return { ctx, missing, errors };
}

export function sourceText() {
  return fs.readFileSync(path.join(root, 'sources/wikisource-geumosinhwa-raw.txt'), 'utf8');
}

// 한자만 남긴다(구두점·빈칸·따옴표·꺾쇠를 모두 뺀다). 글자 자체는 바꾸지 않는다.
export const hanOnly = (s) => String(s).replace(/[^㐀-鿿豈-﫿▩]/g, '');
// 구(句) 수: 쉼표·마침표·물음표·느낌표·쌍점·쌍반점으로 나눈 조각
export const phrases = (s) => String(s).split(/[,.?!;:，。？！；：]/).map((x) => x.trim()).filter(Boolean).length;
