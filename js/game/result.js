'use strict';
// 결과 화면 틀(spec 10절의 내용은 T7이 채운다).
//  - 한 장의 한지 종이: 머리(제목·이름 칸) · 내용 자리(.rs-body — 지금은 비어 있다) · 그림 미리 보기 · 그림 저장 · 타이틀로
//  - 같은 그리기 함수(G.result.draw)로 화면의 그림(SVG)과 저장 그림(캔버스)을 똑같이 그린다. 그림 파일을 쓰지 않는다.
//    펜(pen)은 rect·line·text 세 가지만 안다: svgPen() · canvasPen(g, font). 그리기에 항목을 더하려면 G.result.layers에 함수를 더한다:
//      G.result.layers.push((pen, D, box) => { … return 쓴 높이 })   — D는 G.result.data(st)
//  - 점수·등급·맞고 틀림 표시는 어디에도 두지 않는다(spec 10·16절).
//  걸이: G.app.finish가 G.app.hooks.finish가 없으면 G.result.open()을 부른다. 단계 { type:'result' }로도 연다.
//  글: js/data/notes.js의 NOTES.result(title·sub·nameLabel·namePlaceholder·save·saved·foot), 없으면 FLOW.title
(function () {
  const { h } = G.util;
  const ui = G.ui;
  const app = G.app;
  const S = () => G.save.state;
  const N = () => window.NOTES || {};
  const NR = () => N().result || {};
  const R = (G.result = { layers: [] });
  const W = 1200, H0 = 675;
  const COLORS = { ink: '#2b2433', ink2: '#574c5e', ink3: '#8a7e86', seal: '#b3342a', hanji: '#f4ead3', line: '#2f2840', ochre: '#b98a45', lantern: '#f2a541' };
  R.COLORS = COLORS;

  // 결과 자료(그리기와 화면이 함께 쓴다). T7이 항목을 더한다
  R.data = function (st) {
    st = st || S();
    const d = new Date(st.finishedAt || Date.now());
    return {
      title: NR().title || (window.FLOW || {}).title || '',
      sub: NR().sub || (window.FLOW || {}).subtitle || '',
      name: st.name || '',
      date: d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.',
      foot: [NR().foot, (N().credits || {}).maker].filter(Boolean).join(' · '),
    };
  };

  // ───────── 펜 두 가지(같은 좌표) ─────────
  R.svgPen = function () {
    const out = [];
    const esc = G.util.esc;
    const st = (o) => (o.stroke ? ` stroke="${o.stroke}" stroke-width="${o.width || 1}"` : '') + (o.dash ? ` stroke-dasharray="${o.dash.join(' ')}"` : '');
    return {
      out,
      rect(x, y, w, hh, o = {}) { out.push(`<rect x="${x}" y="${y}" width="${w}" height="${hh}" rx="${o.rx || 0}" fill="${o.fill || 'none'}"${st(o)}/>`); },
      line(x1, y1, x2, y2, o = {}) { out.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"${st(Object.assign({ stroke: COLORS.line }, o))} stroke-linecap="round"/>`); },
      text(x, y, s, o = {}) { out.push(`<text x="${x}" y="${y}" font-size="${o.size || 20}" fill="${o.color || COLORS.ink}" text-anchor="${o.align === 'center' ? 'middle' : o.align === 'right' ? 'end' : 'start'}"${o.weight ? ` font-weight="${o.weight}"` : ''}${o.brush ? ' class="brush"' : ''}>${esc(s)}</text>`); },
    };
  };
  R.canvasPen = function (g, font, brush) {
    const rr = (x, y, w, hh, r) => { r = Math.min(r, w / 2, hh / 2); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + hh, r); g.arcTo(x + w, y + hh, x, y + hh, r); g.arcTo(x, y + hh, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
    const stroke = (o) => { g.strokeStyle = o.stroke; g.lineWidth = o.width || 1; g.setLineDash(o.dash || []); g.stroke(); g.setLineDash([]); };
    return {
      rect(x, y, w, hh, o = {}) { rr(x, y, w, hh, o.rx || 0); if (o.fill) { g.fillStyle = o.fill; g.fill(); } if (o.stroke) stroke(o); },
      line(x1, y1, x2, y2, o = {}) { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineCap = 'round'; stroke(Object.assign({ stroke: COLORS.line }, o)); },
      text(x, y, s, o = {}) { g.font = `${o.weight || 400} ${o.size || 20}px ${o.brush ? brush : font}`; g.fillStyle = o.color || COLORS.ink; g.textAlign = o.align === 'center' ? 'center' : o.align === 'right' ? 'right' : 'left'; g.textBaseline = 'alphabetic'; g.fillText(s, x, y); },
    };
  };

  // ───────── 그리기(한 벌) ─────────
  //  틀: 한지 바탕 · 먹빛 테두리 · 제목 · 이름 줄 · 날짜 · 바닥 줄. 내용 항목은 layers가 그린다(T7)
  R.height = (D) => H0 + (D.extraH || 0);
  R.draw = function (pen, D) {
    const H = R.height(D), PAD = 60;
    pen.rect(0, 0, W, H, { fill: COLORS.hanji });
    pen.rect(16, 16, W - 32, H - 32, { stroke: COLORS.line, width: 4, rx: 22 });
    pen.rect(28, 28, W - 56, H - 56, { stroke: 'rgba(185,138,69,.75)', width: 2, rx: 14 });
    pen.text(PAD, 150, D.title, { size: 76, brush: true });
    if (D.sub) pen.text(PAD, 196, D.sub, { size: 24, color: COLORS.ink2, weight: 700 });
    const nx = 720;
    pen.text(nx, 110, NR().nameLabel || '반·번호·이름', { size: 20, color: COLORS.ink2, weight: 700 });
    pen.line(nx, 168, W - PAD, 168, { width: 2.5 });
    pen.text(nx + 6, 156, D.name || '', { size: 32, weight: 700 });
    pen.text(nx, 200, D.date, { size: 18, color: COLORS.ink3 });
    pen.line(PAD, 236, W - PAD, 236, { stroke: 'rgba(185,138,69,.6)', width: 2 });
    let y = 270;
    for (const f of R.layers) { try { y += f(pen, D, { x: PAD, y, w: W - PAD * 2 }) || 0; } catch (e) { console.error(e); } }
    pen.text(PAD, H - 50, D.foot, { size: 16, color: COLORS.ink3 });
  };
  R.svg = function (D) {
    const p = R.svgPen();
    R.draw(p, D);
    return `<svg class="rs-card" viewBox="0 0 ${W} ${R.height(D)}" role="img" aria-label="${G.util.esc(D.title)} 결과 그림">${p.out.join('')}</svg>`;
  };
  R.canvas = async function (D) {
    const css = getComputedStyle(document.documentElement);
    const serif = (css.getPropertyValue('--serif') || 'serif').trim();
    const brush = (css.getPropertyValue('--brush') || serif).trim();
    try { await Promise.all([document.fonts.load('700 30px IsaengBatang', '가'), document.fonts.load('30px IsaengBatang', '가')]); } catch (e) { /* 기본 글꼴로 */ }
    const c = document.createElement('canvas');
    c.width = W; c.height = R.height(D);
    R.draw(R.canvasPen(c.getContext('2d'), serif, brush), D);
    return c;
  };

  // ═════════ 결과 화면 ═════════
  R.open = function () {
    ui.unpop();
    app._playToken = null;
    if (G.world) G.world.busy = 0;
    document.querySelectorAll('.sheet-back').forEach((x) => x.remove());
    const st = S();
    G.audio.play('result');
    const r = document.getElementById('app');
    r.innerHTML = '';
    r.className = 'scr-result';
    const T = NR();
    const preview = h('div.rs-preview');
    const paint = () => { preview.innerHTML = R.svg(R.data(st)); };
    const nameIn = h('input.rs-name-in', { type: 'text', value: st.name || '', maxlength: 30, placeholder: T.namePlaceholder || '예) 2학년 3반 7번 ○○○', 'aria-label': T.nameLabel || '반·번호·이름' });
    nameIn.addEventListener('input', () => { st.name = nameIn.value; G.save.write(); paint(); });
    const saveBtn = h('button.btn.primary.big.rs-save-btn', { type: 'button', on: { click: () => R.saveImage() } }, T.save || '그림으로 저장');
    const body = h('div.rs-body'); // 내용 항목 자리(T7)
    const sheet = h('article.rs-sheet', { 'aria-label': '결과 — ' + (T.title || (window.FLOW || {}).title || '') },
      h('header.rs-top',
        h('div.rs-title', h('h1.rs-h1', T.title || (window.FLOW || {}).title || ''), T.sub ? h('div.rs-sub', T.sub) : null),
        h('label.rs-name', h('span', T.nameLabel || '반·번호·이름'), nameIn, h('small', T.nameNote || '이름은 이 브라우저에만 저장돼요.'))),
      body,
      h('section.rs-save', preview, h('div.rs-save-row', saveBtn, h('p.small.muted', T.capture || '그림 파일은 이 기기에만 저장돼요. 화면을 캡처해도 돼요.'))));
    const nav = h('div.rs-nav',
      h('button.btn.dark', { type: 'button', on: { click: () => app.openHook('credits') } }, '만든 사람·출처'),
      h('button.btn.dark', { type: 'button', on: { click: () => app.title() } }, '타이틀로'));
    r.appendChild(h('div.result-screen', h('div.rs-scroll', sheet, nav)));
    paint();
    R.els = { sheet, body, preview, nameIn, saveBtn, paint };
    if (typeof R.fill === 'function') { try { R.fill(body, st); } catch (e) { console.error(e); } } // T7: 내용 항목
    return R.els;
  };

  R.saveImage = async function (o = {}) {
    const st = S();
    const D = R.data(st);
    const c = await R.canvas(D);
    R.lastCanvas = c;
    if (o.download === false) return c;
    const safe = String(D.name || '').replace(/[\\/:*?"<>|\s]+/g, '_').replace(/^_+|_+$/g, '');
    app.downloadCanvas(c, (D.title || '결과').replace(/\s+/g, '') + '_' + (safe || '결과') + '.png');
    ui.toast(NR().saved || '그림 파일로 저장했어요');
    return c;
  };

  // 단계로 열기: { type:'result' }
  G.steps.register('result', async function () { R.open(); await new Promise(() => {}); });
})();
