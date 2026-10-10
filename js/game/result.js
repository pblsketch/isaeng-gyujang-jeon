'use strict';
// 결과 화면(spec 10절): 한 장의 한지 종이에 지나온 기록을 모으고, 같은 그리기 함수로 그림 파일을 만든다.
//  - 머리(제목·이름 칸 — 이름은 선택, 이 브라우저에만 저장) · 내용(.rs-body) · 그림 미리 보기 · 그림 저장 · 타이틀로
//  - 내용(R.record(st) 한 벌을 화면과 그림이 함께 쓴다):
//     만남과 이별 표(칸마다 최종 낱말, 다르면 처음 고른 낱말을 작게) + 표 아래 반복의 뜻 문장
//     세 담과 수단(담 앞 순간마다 써 본 차례, 이생의 제안 앞은 빼고) · 3막(마음 둔 곳, 이생에게 처음 한 답 propose[0])
//     쓴 글(전기적 요소 한 줄과 근거 장면, 「만복사저포기」 한 줄과 두 고르기 — 사실을 보기 전의 답)
//     되짚기 질문 둘(보여 주기만, 답 칸 없음) · 「김현감호」 한 줄 · 원전으로 나가는 문(전문 안내 + 대목 모음 화면)
//     바로가기로 건너뛴 막(st.skipped)은 '하지 않음'
//  - 같은 그리기 함수(G.result.draw)로 화면의 그림(SVG)과 저장 그림(캔버스)을 똑같이 그린다. 그림 파일을 쓰지 않는다.
//    펜(pen)은 rect·line·text 세 가지만 안다: svgPen() · canvasPen(g, font). 그리기에 항목을 더하려면 G.result.layers에 함수를 더한다:
//      G.result.layers.push((pen, D, box) => { … return 쓴 높이 })   — D는 G.result.data(st). 그림 높이는 내용만큼 늘어난다(D.extraH)
//  - 원전으로 나가는 문의 대목 모음(R.passages)은 따로 자료를 두지 않고, 흐름 차례대로 거점의 단계·담 앞 순간·옥루춘에 실린
//    원문(han)+풀이(ko)를 모은다. 전문을 읽을 곳 주소는 글로만 적고 열지 않는다.
//  - 점수·등급·맞고 틀림 표시는 어디에도 두지 않는다(spec 10·16절).
//  걸이: G.app.finish가 G.app.hooks.finish(마무리 화면들, js/game/finale.js)를 부르고, 그것이 끝나면 G.result.open().
//   단계 { type:'result' }로도 연다.
//  글: js/data/notes.js의 NOTES.result(title·sub·nameLabel·…·foot), 항목 이름표는 js/data/finale.js의 FINALE.ui
(function () {
  const { h } = G.util;
  const ui = G.ui;
  const app = G.app;
  const S = () => G.save.state;
  const N = () => window.NOTES || {};
  const NR = () => N().result || {};
  const FN = () => window.FINALE || {};
  const FU = () => FN().ui || {};
  const R = (G.result = { layers: [] });
  const W = 1200, H0 = 675, TOP = 270, BOTTOM = 90;
  const COLORS = { ink: '#2b2433', ink2: '#574c5e', ink3: '#8a7e86', seal: '#b3342a', hanji: '#f4ead3', line: '#2f2840', ochre: '#b98a45', lantern: '#f2a541' };
  R.COLORS = COLORS;

  // ═════════ 기록 한 벌(화면과 그림이 함께 쓴다) ═════════
  const ACTS = ['act1', 'act2', 'act3'];
  R.record = function (st) {
    st = st || S();
    const U = FU();
    const WL = window.WALLS || {}, C = window.CARDS || {}, FL = window.FLOW || {}, F = FN();
    const skipped = Array.isArray(st.skipped) ? st.skipped : [];
    const actName = (a) => (((FL.acts || {})[a] || {}).name) || a || '';
    const blankAct = (k) => ACTS.find((a) => ((C[a] || {}).blanks || []).includes(k)) || null;
    const T = (o) => (o && typeof o === 'object' ? o.t || '' : o || '');
    // 만남과 이별 표: 문장의 {빈칸:조사}를 낱말로
    const table = (C.table || []).map((row) => {
      const parts = [];
      for (const seg of String(row.t || '').split(/(\{[^}]+\})/)) {
        const m = /^\{([^:}]+)(?::([^}]*))?\}$/.exec(seg);
        if (!m) { if (seg) parts.push({ text: seg }); continue; }
        const key = m[1], j = m[2] || '';
        const b = (st.blanks || {})[key] || {};
        const sk = skipped.includes(blankAct(key));
        const word = b.final || (sk ? ((C.answer || {})[key] || '') : '');
        parts.push({ blank: key, word, first: !sk && b.first && b.first !== word ? b.first : '', skipped: sk, empty: !word });
        if (j) parts.push({ text: word ? G.util.josa(word, j) : j });
      }
      return { label: row.label || '', parts };
    });
    // 세 담과 수단: 담 앞 순간마다(답 고르기 순간 — 이생의 제안 앞 — 은 뺀다)
    const walls = Object.keys(WL).filter((m) => WL[m] && WL[m].kind !== 'answer').map((m) => {
      const w = WL[m];
      const rec = Array.isArray((st.walls || {})[m]) ? st.walls[m].slice().sort((a, b) => (a.n || 0) - (b.n || 0)) : [];
      return { moment: m, act: w.act, actName: actName(w.act), title: w.title || m, seq: rec.map((e) => G.rules.meansName(e.m)), skipped: skipped.includes(w.act) };
    });
    // 3막: 마음 둔 곳, 이생에게 처음 한 답
    let mindName = '';
    for (const p of Object.values(window.PLACES || {})) for (const s of (p && p.steps) || []) if (s.type === 'mind' && !mindName) { const o = (s.options || []).find((x) => x.id === st.mind); if (o) mindName = T(o); }
    if (!mindName && st.mind) mindName = st.mind;
    const pm = Object.keys(WL).find((m) => WL[m] && WL[m].kind === 'answer');
    const first = Array.isArray(st.propose) ? st.propose[0] : null;
    const firstAnswer = first ? (T(((WL[pm] || {}).labels || {})[first]) || first) : '';
    // 쓴 글·만복사 고르기
    const L = st.lines || {};
    const scene = (F.scenes || []).find((x) => x.id === st.jeongiScene);
    const picks = (((F.mbs || {}).picks) || []).map((p) => {
      const o = (p.options || []).find((x) => x.id === (st.mbs || {})[p.id]);
      return { id: p.id, q: T(p.q), a: o ? T(o) : '' };
    });
    const door = F.sourceDoor || {};
    return {
      U, table, walls, skipped,
      act3: { skipped: skipped.includes('act3'), mind: mindName, firstAnswer },
      repeat: L.repeat || '',
      jeongi: L.jeongi || '', jeongiScene: scene ? scene.name : '',
      mbsSame: L.mbsSame || '', picks,
      review: (F.review || []).map(T).filter(Boolean),
      kimhyeon: T(F.kimhyeon),
      door: { title: door.title || U.secDoor || '', t: T(door), where: T(door.where) },
    };
  };

  // 결과 자료(그리기와 화면이 함께 쓴다)
  R.data = function (st) {
    st = st || S();
    const d = new Date(st.finishedAt || Date.now());
    const D = {
      title: NR().title || (window.FLOW || {}).title || '',
      sub: NR().sub || (window.FLOW || {}).subtitle || '',
      name: st.name || '',
      date: d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.',
      foot: [NR().foot, (N().credits || {}).maker].filter(Boolean).join(' · '),
      rec: R.record(st),
    };
    // 그림 높이: 내용을 한 번 재어 본 만큼 늘인다
    const dry = { rect() {}, line() {}, text() {} };
    let y = TOP;
    for (const f of R.layers) { try { y += f(dry, D, { x: 60, y, w: W - 120 }) || 0; } catch (e) { /* 그릴 때 알린다 */ } }
    D.extraH = Math.max(0, y + BOTTOM - H0);
    return D;
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

  // 글 너비 재기(두 펜이 같은 줄바꿈을 쓰도록 한 곳에서 잰다)
  let mctx = null;
  const serif = () => ((getComputedStyle(document.documentElement).getPropertyValue('--serif') || 'serif').trim() || 'serif');
  R.measure = function (s, size, weight) {
    if (!mctx) mctx = document.createElement('canvas').getContext('2d');
    if (!mctx) return String(s).length * size;
    mctx.font = `${weight || 400} ${size}px ${serif()}`;
    return mctx.measureText(String(s)).width;
  };
  // 줄바꿈: 띄어쓰기 단위로, 한 낱말이 한 줄보다 길면 글자 단위로
  R.wrap = function (s, maxW, size, weight) {
    const out = [];
    for (const para of String(s || '').split('\n')) {
      let line = '';
      for (const tok of para.split(/(\s+)/)) {
        if (!tok) continue;
        const next = line + tok;
        if (R.measure(next, size, weight) <= maxW) { line = next; continue; }
        if (line.trim()) { out.push(line.trimEnd()); line = ''; }
        if (/^\s+$/.test(tok)) continue;
        if (R.measure(tok, size, weight) <= maxW) { line = tok; continue; }
        for (const ch of tok) { if (R.measure(line + ch, size, weight) > maxW && line) { out.push(line); line = ch; } else line += ch; }
      }
      if (line.trim()) out.push(line.trimEnd());
    }
    return out;
  };

  // ───────── 그리기(한 벌) ─────────
  //  틀: 한지 바탕 · 먹빛 테두리 · 제목 · 이름 줄 · 날짜 · 바닥 줄. 내용 항목은 layers가 그린다
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
    let y = TOP;
    for (const f of R.layers) { try { y += f(pen, D, { x: PAD, y, w: W - PAD * 2 }) || 0; } catch (e) { console.error(e); } }
    pen.text(PAD, H - 50, D.foot, { size: 16, color: COLORS.ink3 });
  };

  // 그림에 넣는 낱말 한 칸: 「낱말」 + (처음: …) 또는 (하지 않음)
  const wordText = (pt, U) => (pt.empty ? (U.noRecord || '기록 없음') : '「' + pt.word + '」') + (pt.skipped ? '(' + (U.notDone || '하지 않음') + ')' : pt.first ? '(' + (U.firstPick || '처음') + ': ' + pt.first + ')' : '');
  const wallText = (w, U) => (w.skipped ? (U.notDone || '하지 않음') : w.seq.length ? w.seq.join(' → ') : (U.noRecord || '기록 없음'));
  const or = (s, U) => s || (U.noRecord || '기록 없음');

  // 내용 항목을 그린다(결과 기록 한 벌)
  R.layers.push(function drawRecord(pen, D, box) {
    const r = D.rec;
    if (!r) return 0;
    const U = r.U;
    const x = box.x, w = box.w;
    let y = box.y;
    const head = (t) => {
      y += 14;
      pen.text(x, y + 28, t, { size: 28, color: COLORS.seal, weight: 700 });
      pen.line(x, y + 40, x + w, y + 40, { stroke: 'rgba(185,138,69,.5)', width: 1.5 });
      y += 54;
    };
    const block = (s, o = {}) => {
      const size = o.size || 20, lh = Math.round(size * 1.55), ind = o.indent || 0;
      for (const ln of R.wrap(s, w - ind, size, o.weight)) { pen.text(x + ind, y + size, ln, { size, color: o.color, weight: o.weight }); y += lh; }
      y += o.gap || 0;
    };
    const label = (t) => block(t, { size: 17, weight: 700, color: COLORS.ink2 });
    // 만남과 이별
    head(U.secTable || '만남과 이별');
    for (const row of r.table) {
      label(row.label);
      block(row.parts.map((p) => (p.text != null ? p.text : wordText(p, U))).join(''), { indent: 18, gap: 6 });
    }
    label(U.repeatLabel || '반복의 뜻');
    block(or(r.repeat, U), { indent: 18, gap: 4 });
    // 세 담과 수단
    head(U.secWalls || '세 담과 수단');
    for (const wl of r.walls) block(wl.actName + ' 「' + wl.title + '」 — ' + wallText(wl, U), { gap: 2 });
    // 3막
    head(U.secAct3 || '3막');
    block((U.mindLabel || '마음 둔 곳') + ' — ' + (r.act3.skipped ? (U.notDone || '하지 않음') : or(r.act3.mind, U)), { gap: 2 });
    block((U.proposeLabel || '이생에게 처음 한 답') + ' — ' + (r.act3.skipped ? (U.notDone || '하지 않음') : or(r.act3.firstAnswer, U)), { gap: 2 });
    // 쓴 글
    head(U.secLines || '쓴 글');
    label((U.jeongiLabel || '전기적 요소 한 줄') + (r.jeongiScene ? ' · ' + (U.sceneLabel || '근거 장면') + ': ' + r.jeongiScene : ''));
    block(or(r.jeongi, U), { indent: 18, gap: 4 });
    label(U.mbsSameLabel || '「만복사저포기」 한 줄');
    block(or(r.mbsSame, U), { indent: 18, gap: 4 });
    label(U.mbsPicksLabel || '「만복사저포기」 고르기');
    for (const pk of r.picks) block(pk.q + ' — ' + or(pk.a, U), { indent: 18, gap: 2 });
    // 되짚기 질문·김현감호
    head(U.secReview || '되짚기 질문');
    r.review.forEach((q, i) => block((i + 1) + '. ' + q, { gap: 2 }));
    if (r.kimhyeon) { head(U.secKim || '「김현감호」'); block(r.kimhyeon); }
    return y - box.y + 10;
  });

  R.svg = function (D) {
    const p = R.svgPen();
    R.draw(p, D);
    return `<svg class="rs-card" viewBox="0 0 ${W} ${R.height(D)}" role="img" aria-label="${G.util.esc(D.title)} 결과 그림">${p.out.join('')}</svg>`;
  };
  R.canvas = async function (D) {
    const css = getComputedStyle(document.documentElement);
    const sf = (css.getPropertyValue('--serif') || 'serif').trim();
    const brush = (css.getPropertyValue('--brush') || sf).trim();
    await R.fontsReady();
    const c = document.createElement('canvas');
    c.width = W; c.height = R.height(D);
    R.draw(R.canvasPen(c.getContext('2d'), sf, brush), D);
    return c;
  };

  // ═════════ 화면의 내용 항목(.rs-body) ═════════
  const sec = (cls, title, ...kids) => h('section.rs-sec.' + cls, h('h2', title), ...kids);
  const kv = (k, v, cls = '') => h('div.rs-kv' + cls, h('span.rs-k', k), h('span.rs-v', v));
  R.fill = function (body, st) {
    const r = R.record(st);
    const U = r.U;
    const notDone = () => h('small.rs-skip', U.notDone || '하지 않음');
    const none = (s) => s || h('span.rs-none', U.noRecord || '기록 없음');
    // 만남과 이별 표
    const rows = r.table.map((row) => h('div.rs-row',
      h('div.rs-row-l', row.label),
      h('p.rs-row-t', row.parts.map((p) => (p.text != null ? p.text
        : h('span.rs-word', { 'data-blank': p.blank },
          h('b.rs-w', p.empty ? (U.noRecord || '기록 없음') : p.word),
          p.skipped ? notDone() : p.first ? h('small.rs-first', (U.firstPick || '처음') + ': ' + p.first) : null))))));
    body.appendChild(sec('rs-table', U.secTable || '만남과 이별', h('div.rs-rows', rows),
      h('div.rs-repeat', h('span.rs-k', U.repeatLabel || '반복의 뜻'), h('p.rs-quote', none(r.repeat)))));
    // 세 담과 수단
    body.appendChild(sec('rs-walls', U.secWalls || '세 담과 수단',
      U.wallsNote ? h('p.rs-note', U.wallsNote) : null,
      h('ul.rs-wall-list', r.walls.map((wl) => h('li.rs-wall', { 'data-moment': wl.moment },
        h('span.rs-k', wl.actName + ' 「' + wl.title + '」'),
        wl.skipped ? notDone() : h('span.rs-seq', none(wl.seq.join(' → '))))))));
    // 3막
    body.appendChild(sec('rs-act3', U.secAct3 || '3막',
      kv(U.mindLabel || '마음 둔 곳', r.act3.skipped ? notDone() : none(r.act3.mind)),
      kv(U.proposeLabel || '이생에게 처음 한 답', r.act3.skipped ? notDone() : none(r.act3.firstAnswer))));
    // 쓴 글
    body.appendChild(sec('rs-lines', U.secLines || '쓴 글',
      h('div.rs-line', h('span.rs-k', U.jeongiLabel || '전기적 요소 한 줄', r.jeongiScene ? h('small.rs-scene', ' · ' + (U.sceneLabel || '근거 장면') + ': ' + r.jeongiScene) : null), h('p.rs-quote', none(r.jeongi))),
      h('div.rs-line', h('span.rs-k', U.mbsSameLabel || '「만복사저포기」 한 줄'), h('p.rs-quote', none(r.mbsSame))),
      h('div.rs-line.rs-picks', h('span.rs-k', U.mbsPicksLabel || '「만복사저포기」 고르기'),
        h('ul', r.picks.map((pk) => h('li', h('span.rs-pq', pk.q), ' ', h('b', none(pk.a))))))));
    // 되짚기 질문(답 칸 없음) · 김현감호
    body.appendChild(sec('rs-review', U.secReview || '되짚기 질문',
      U.reviewNote ? h('p.rs-note', U.reviewNote) : null,
      h('ol', r.review.map((q) => h('li', q)))));
    if (r.kimhyeon) body.appendChild(sec('rs-kim', U.secKim || '「김현감호」', h('p', r.kimhyeon)));
    // 원전으로 나가는 문
    const doorBtn = h('button.btn.rs-door-btn', { type: 'button', on: { click: () => R.openDoor() } }, U.doorBtn || '게임에 나온 원문 모아 보기');
    body.appendChild(sec('rs-door', r.door.title || U.secDoor || '원전으로 나가는 문',
      r.door.t ? h('p', r.door.t) : null,
      r.door.where ? h('p.rs-where', r.door.where) : null,
      doorBtn));
  };

  // ═════════ 원전으로 나가는 문: 게임에 나온 원문·풀이 대목을 장면 차례로 ═════════
  //  흐름 차례(FLOW.order)의 거점마다 단계 차례대로: 단계 글 속 원문 덩이, 담 앞 순간(WALLS — 3막 경계는 할 일 단계 자리),
  //  옥루춘(OKRU). 같은 원문은 한 번만. 마지막에 「만복사저포기」의 원문. 학생 화면에서 접혀 있던 원문은 여기서도 접는다(민감한 장면 수위).
  R.passages = function () {
    const P = window.PLACES || {}, WL = window.WALLS || {}, O = window.OKRU || {};
    const order = ((window.FLOW || {}).order) || [];
    const seen = new Set();
    const SKIP = new Set(['scenes', 'maps', 'cast', 'grid', 'summary', 'prompt_hint', 'caption']);
    const grab = (o, out) => {
      if (Array.isArray(o)) { o.forEach((x) => grab(x, out)); return; }
      if (!o || typeof o !== 'object') return;
      // 접힌 원문 카드(단계의 fold — 2막 암전의 '살을 발라냄')는 여기서도 접힌 채로(누르면 펼침)
      if (o.fold && o.quote && typeof o.quote.han === 'string' && !seen.has(o.quote.han)) { seen.add(o.quote.han); out.push(Object.assign({}, o.quote, { fold: true })); }
      if (typeof o.han === 'string' && typeof o.ko === 'string') {
        if (!seen.has(o.han)) { seen.add(o.han); out.push(o); }
        return;
      }
      for (const [k, v] of Object.entries(o)) if (!SKIP.has(k)) grab(v, out);
    };
    const groups = [];
    for (const pid of order) {
      const p = P[pid];
      if (!p) continue;
      const out = [];
      for (const s of p.steps || []) {
        if (s.type === 'wall' || s.type === 'propose') grab(WL[s.wall || s.id], out);
        else if (s.type === 'okru') { grab(s, out); grab(O.lines, out); }
        else grab(s, out);
        if (s.type === 'tasks' && p.border && p.border.wall) grab(WL[p.border.wall], out);
      }
      if (out.length) groups.push({ id: pid, name: app.placeInfo(pid).name, items: out });
    }
    const mbs = [];
    grab(((FN().mbs || {}).picks || []).map((x) => x.quote), mbs);
    if (mbs.length) groups.push({ id: 'mbs', name: FU().mbsGroup || '「만복사저포기」', items: mbs });
    return groups;
  };
  R.openDoor = function () {
    const U = FU();
    const door = FN().sourceDoor || {};
    const host = document.querySelector('.result-screen') || document.body;
    const opener = document.activeElement;
    const close = () => { scr.remove(); if (opener && opener.isConnected) opener.focus({ preventScroll: true }); };
    const back = h('button.btn.primary.sd-back', { type: 'button', on: { click: close } }, U.doorBack || '결과로 돌아가기');
    const scr = h('div.src-door', { role: 'dialog', 'aria-modal': 'true', 'aria-label': door.title || U.secDoor || '원전으로 나가는 문' },
      h('div.sd-scroll',
        h('div.sd-sheet',
          h('header.sd-head', h('h2', door.title || U.secDoor || '원전으로 나가는 문'), back),
          U.doorIntro ? h('p.sd-intro', U.doorIntro) : null,
          ...R.passages().map((g) => h('section.sd-group', h('h3', g.name),
            ...g.items.map((q) => h('div.sd-item', G.steps.quote(Object.assign({}, q, { src: null })))))),
          h('div.sd-where', door.t ? h('p', door.t) : null, door.where && door.where.t ? h('p.rs-where', door.where.t) : null),
          h('div.sd-foot', h('button.btn.sd-back2', { type: 'button', on: { click: close } }, U.doorBack || '결과로 돌아가기')))));
    scr.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.preventDefault(); close(); } });
    host.appendChild(scr);
    setTimeout(() => back.focus({ preventScroll: true }), 30);
    return scr;
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
    const body = h('div.rs-body');
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
    R.els = { sheet, body, preview, nameIn, saveBtn, paint };
    if (typeof R.fill === 'function') { try { R.fill(body, st); } catch (e) { console.error(e); } }
    paint();
    // 글꼴이 다 실린 뒤 한 번 더 그린다(줄바꿈 너비를 실제 글꼴로)
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (preview.isConnected) paint(); });
    return R.els;
  };

  // 저장 그림의 글꼴(부분 글꼴)이 실린 뒤에 재고 그린다
  R.fontsReady = async function () {
    try { await Promise.all([document.fonts.load('700 30px IsaengBatang', '가'), document.fonts.load('30px IsaengBatang', '가')]); } catch (e) { /* 기본 글꼴로 */ }
  };
  R.saveImage = async function (o = {}) {
    const st = S();
    await R.fontsReady();
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
