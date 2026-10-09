// 크롬 점검들이 함께 쓰는 손잡이.
//  - open(): 크롬 맥락 하나 + 오류 모으기(콘솔 오류·페이지 오류·실패한 요청·400 이상 응답)
//    + 바깥 요청 막기(이 컴퓨터 주소·data:·blob: 말고는 모두 끊고 기록한다. spec 14·16절)
//  - fresh(): 저장을 지우고 타이틀까지 · startGame(): 타이틀 '시작' · reloadContinue(): 다시 열고 '이어 하기'
//  - talkTo(): 사람·자리 곁으로 옮겨 E로 말을 걸고 대화창을 끝까지 넘긴다 · advance(): 사건 화면의 '다음'을 끝까지
//  - storageKeys(): localStorage 열쇠 목록(모두 'isaeng-gyujang:'로 시작해야 한다)
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '..');
export const KEY_PREFIX = 'isaeng-gyujang:';
export const VIEWS = {
  phone: { name: 'phone', label: '휴대폰 가로 844×390', width: 844, height: 390, isMobile: true, hasTouch: true, dpr: 2 },
  low: { name: 'low', label: '낮은 휴대폰 가로 640×360', width: 640, height: 360, isMobile: true, hasTouch: true, dpr: 2 },
  desktop: { name: 'desktop', label: 'PC 1366×860', width: 1366, height: 860, dpr: 1 },
  portrait: { name: 'portrait', label: '세로 390×844', width: 390, height: 844, isMobile: true, hasTouch: true, dpr: 2 },
};

export function checker() {
  const c = { problems: [], checks: 0 };
  c.ok = (cond, msg) => { c.checks++; if (!cond) c.problems.push(msg); console.log((cond ? '  ✓ ' : '  ✗ ') + msg); return !!cond; };
  c.finish = (shots) => {
    console.log(`\n점검 ${c.checks}개 · 문제 ${c.problems.length}개` + (shots ? ' · 화면 사진: ' + shots : ''));
    for (const p of c.problems) console.log(' - ' + p);
    process.exit(c.problems.length ? 1 : 0);
  };
  return c;
}
export const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function shotsDir(name) {
  const d = path.join(HERE, 'shots', name);
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  return d;
}
export const launch = (args = []) => chromium.launch({ channel: 'chrome', headless: true, args });

const LOCAL = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?\//;
// 크롬 맥락 하나 + 오류 모으기 + 바깥 요청 막기
export async function open(browser, vp, o = {}) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, deviceScaleFactor: vp.dpr || 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = [];
  const outside = [];
  await ctx.route('**/*', (route) => {
    const u = route.request().url();
    if (LOCAL.test(u) || /^(data|blob):/.test(u)) return route.continue();
    outside.push(u);
    return route.abort();
  });
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  page.on('requestfailed', (r) => {
    const u = r.url();
    if (/^blob:/.test(u) || !LOCAL.test(u)) return; // 바깥 요청은 outside에 따로 모은다
    errs.push('requestfailed: ' + u + ' ' + ((r.failure() || {}).errorText || ''));
  });
  page.on('response', (r) => { if (r.status() >= 400) errs.push('http ' + r.status() + ': ' + r.url()); });
  let n = 0;
  const shot = async (label) => {
    if (!o.shots) return null;
    await page.waitForTimeout(200);
    const f = path.join(o.shots, `${o.prefix || vp.name}_${String(++n).padStart(3, '0')}_${label.replace(/[^\w가-힣-]+/g, '_')}.png`);
    await page.screenshot({ path: f });
    return f;
  };
  return { ctx, page, errs, outside, shot };
}

// 타이틀까지(저장을 지우고)
export async function fresh(page, url) {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector('.title-screen h1');
}
// 타이틀 → 시작(저장이 없을 때)
export async function startGame(page) {
  await page.click('.title-side button:has-text("시작")');
}
// 다시 열기 → 타이틀 '이어 하기'. before(page)를 주면 타이틀이 뜬 뒤 누르기 전에 부른다(시험 자료 넣기 등)
export async function reloadContinue(page, before) {
  await page.reload();
  await page.waitForSelector('.title-screen h1');
  if (before) await before(page);
  await page.click('.title-side button:has-text("이어 하기")');
}

export const state = (page) => page.evaluate(() => JSON.parse(JSON.stringify(G.save.state)));
export const storageKeys = (page) => page.evaluate(() => Object.keys(localStorage));

// 사건 화면이 닫힐 때까지(또는 다음 거점의 첫 장이 뜰 때까지) '다음'을 누른다(눌러 넘긴 횟수를 돌려준다)
export async function advance(page, max = 40) {
  let n = 0;
  for (let i = 0; i < max; i++) {
    if (!(await page.locator('.event.on').count()) || (await page.locator('.event.on .place-card').count())) break; // 거점 첫 장·'준비 중' 장에서 멈춘다
    const b = page.locator('.event.on .ev-tray .btn.primary');
    if (await b.count()) { await b.first().click().catch(() => {}); n++; }
    await page.waitForTimeout(90);
  }
  return n;
}

// 사람·자리 곁으로 옮겨 E로 말을 건다. 대화창이 뜨면 끝까지 넘기고, 펼친 글을 돌려준다
//  (목표인 대상이면 대화창 대신 사건 화면이 열린다 — 그때는 { event: true })
export async function talkTo(page, id) {
  await page.evaluate((id) => G.world.test.teleport(id), id);
  await page.waitForTimeout(160);
  const near = await page.evaluate(() => G.world.test.near());
  let opened = '';
  for (let k = 0; k < 4; k++) {
    await page.keyboard.press('KeyE');
    opened = await Promise.race([
      page.waitForSelector('.dlg', { timeout: 1200 }).then(() => 'dlg', () => ''),
      page.waitForSelector('.event.on', { timeout: 1200 }).then(() => 'event', () => ''),
    ]);
    if (opened) break;
    await page.waitForTimeout(300);
  }
  if (opened === 'event') return { near, event: true, text: '' };
  let text = '';
  for (let i = 0; i < 40; i++) {
    if (!(await page.locator('.dlg').count())) break;
    text = (await page.textContent('.dlg').catch(() => null)) || text;
    const b = page.locator('.dlg .dlg-tray .btn.primary');
    if (await b.count()) await b.first().click().catch(() => {});
    await page.waitForTimeout(110);
  }
  await page.waitForTimeout(380); // 대화창을 닫은 직후 E가 먹지 않는 짧은 틈
  return { near, event: false, text };
}

// 화면에 보이는 누를 곳(단추·고르기) 가운데 44px보다 작은 것
export const smallTargets = (page) => page.evaluate(() => {
  const out = [];
  for (const el of document.querySelectorAll('button, [role="button"], .opt, input[type="text"]')) {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none' || el.closest('[hidden]')) continue;
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    if (r.height < 43.5 || (el.tagName === 'BUTTON' && r.width < 43.5)) out.push((el.className || el.tagName) + ' ' + Math.round(r.width) + '×' + Math.round(r.height) + ' 「' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 12) + '」');
  }
  return out;
});
