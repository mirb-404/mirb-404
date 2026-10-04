/*
 * Builds assets/banner.svg: a tiny self-playing terminal session for the profile README.
 *
 * Everything animates with SMIL + CSS inside the SVG, so it plays on GitHub with no
 * JavaScript at view time. Visitors who prefer reduced motion get the finished frame.
 *
 * Edit the SCRIPT section below and run:  node make_banner.js
 */
const fs = require('fs');
const path = require('path');

const W = 1000, H = 420;
const LOOP = 24; // seconds, then the session replays
const FONT = "ui-monospace, 'Cascadia Mono', 'SF Mono', Consolas, Menlo, monospace";
const CHAR = 9; // advance of one character at 15px

// GitHub dark palette
const BG = '#0d1117', CARD = '#161b22', BORDER = '#30363d', TRACK = '#21262d';
const TEXT = '#e6edf3', DIM = '#8b949e';
const GREEN = '#3fb950', PURPLE = '#d2a8ff', BLUE = '#79c0ff', ORANGE = '#f0883e', YELLOW = '#e3b341';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const at = s => `loop.begin+${s.toFixed(2)}s`;

class Svg {
  constructor(animated) { this.a = animated; this.out = []; }
  add(s) { this.out.push(s); }

  // ── timing helpers ─────────────────────────────────────────────────────────
  fadeIn(start, dur = 0.3) {
    if (!this.a) return ['', ''];
    return [' opacity="0"',
      '<set attributeName="opacity" to="0" begin="loop.begin"/>' +
      `<animate attributeName="opacity" from="0" to="1" dur="${dur}s" begin="${at(start)}" fill="freeze"/>`];
  }

  // Visible from start until end (or for the rest of the loop)
  window(start, end = null) {
    if (!this.a) return end === null ? ['', ''] : [' visibility="hidden"', ''];
    let anim = '<set attributeName="visibility" to="hidden" begin="loop.begin"/>' +
      `<set attributeName="visibility" to="visible" begin="${at(start)}"/>`;
    if (end !== null) anim += `<set attributeName="visibility" to="hidden" begin="${at(end)}"/>`;
    return [' visibility="hidden"', anim];
  }

  // ── elements ───────────────────────────────────────────────────────────────
  text(x, y, s, { color = TEXT, size = 15, weight = 'normal', anchor = 'start', extra = '', inner = '' } = {}) {
    this.add(`<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${color}" ` +
      `font-weight="${weight}" text-anchor="${anchor}" xml:space="preserve"${extra}>${inner}${esc(s)}</text>`);
  }

  // Types s out one character at a time. Returns when it finishes.
  typed(x, y, s, start, { step = 0.03, color = TEXT, size = 15, cursor = false } = {}) {
    const head = `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" fill="${color}" xml:space="preserve">`;
    if (!this.a) {
      this.add(head + esc(s) + (cursor ? '<tspan class="cursor">▋</tspan>' : '') + '</text>');
      return start;
    }
    const spans = [...s].map((ch, i) => {
      const [attr, anim] = this.window(start + i * step);
      return `<tspan${attr}>${anim}${esc(ch)}</tspan>`;
    });
    const end = start + [...s].length * step;
    if (cursor) {
      const [attr, anim] = this.window(end);
      spans.push(`<tspan class="cursor"${attr}>${anim}▋</tspan>`);
    }
    this.add(head + spans.join('') + '</text>');
    return end;
  }

  // A `label >` prompt followed by typed text
  line(y, label, labelColor, s, start, step, labelStart, opts = {}) {
    const [attr, anim] = this.fadeIn(labelStart ?? start - 0.1, 0.05);
    this.add(`<g${attr}>${anim}`);
    this.text(40, y, `${label} >`, { color: labelColor });
    this.add('</g>');
    return this.typed(40 + (label.length + 3) * CHAR, y, s, start, { step, ...opts });
  }

  bar(x, y, w, color, start, dur) {
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="6" rx="3" fill="${TRACK}"/>`);
    if (!this.a) return this.add(`<rect x="${x}" y="${y}" width="${w}" height="6" rx="3" fill="${color}"/>`);
    this.add(`<rect x="${x}" y="${y}" width="0" height="6" rx="3" fill="${color}">` +
      '<set attributeName="width" to="0" begin="loop.begin"/>' +
      `<animate attributeName="width" from="0" to="${w}" begin="${at(start)}" dur="${dur}s" ` +
      'fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.25 1"/></rect>');
  }

  // Counts through frames, landing on the last one at `end`
  counter(x, y, frames, end, color, size = 30) {
    const n = frames.length, span = 1.4;
    frames.forEach((value, i) => {
      const last = i === n - 1;
      if (!this.a && !last) return;
      const t0 = end - span + span * i / (n - 1);
      const t1 = last ? null : end - span + span * (i + 1) / (n - 1);
      const [attr, anim] = this.window(t0, t1);
      this.text(x, y, value, { color, size, weight: 'bold', extra: attr, inner: anim });
    });
  }
}

// ── SCRIPT ───────────────────────────────────────────────────────────────────
const CARDS = [
  { label: 'hackathons', color: BLUE, cmd: '$ ls ~/weekends',
    frames: ['0', '1', '2', '3'],
    sub: 'hackathon builds in 2025-26', foot: 'Berlin, Mannheim & a Google DeepMind one', b0: 4.6, blen: 2.4 },
  { label: 'offline', color: GREEN, cmd: '$ mindwell --wifi off',
    frames: ['412 KB', '96 KB', '12 KB', '3 KB', '0 bytes'],
    sub: 'of your chats ever leave the laptop', foot: 'a wellness buddy that runs fully local', b0: 4.9, blen: 2.6 },
  { label: 'agents', color: YELLOW, cmd: '$ mcpay --budget 0.005',
    frames: ['$0.0000', '$0.0009', '$0.0018', '$0.0027', '$0.0037'],
    sub: 'an agent spent on 23 tool calls', foot: 'it paid for its own tools. cute.', b0: 5.1, blen: 2.8 },
];

function session(s) {
  // Window chrome
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => s.add(`<circle cx="${24 + i * 18}" cy="22" r="5" fill="${c}"/>`));
  s.text(W / 2, 27, 'mirang@mannheim - who-is-mirang.session', { color: DIM, size: 12, anchor: 'middle' });
  s.add(`<line x1="0" y1="42" x2="${W}" y2="42" stroke="${BORDER}"/>`);

  // The question
  s.line(80, 'you', GREEN, 'who is Mirang?', 0.6, 0.07, 0.3);
  s.line(108, 'agent', PURPLE, 'Wi-Fi is off. No worries, his stuff runs local. Asking 3 subagents...', 2.0, 0.022, 1.8);

  // Three subagents report back
  const cw = 296, gap = 18, top = 128, ch = 150;
  CARDS.forEach(({ label, color, cmd, frames, sub, foot, b0, blen }, i) => {
    const x = 40 + i * (cw + gap);
    const appear = 4.2 + i * 0.25;
    const done = b0 + blen;
    let [attr, anim] = s.fadeIn(appear, 0.35);
    s.add(`<g${attr}>${anim}`);
    s.add(`<rect x="${x}" y="${top}" width="${cw}" height="${ch}" rx="8" fill="${CARD}" stroke="${BORDER}"/>`);
    s.add(`<rect x="${x}" y="${top}" width="3" height="${ch}" rx="1.5" fill="${color}"/>`);
    s.text(x + 16, top + 24, label, { color, size: 12, weight: 'bold' });

    [attr, anim] = s.window(appear, done);
    if (s.a) {
      s.add(`<g${attr}>${anim}<text x="${x + cw - 16}" y="${top + 24}" font-family="${FONT}" font-size="12" ` +
        `fill="${DIM}" text-anchor="end">thinking...<animate attributeName="opacity" ` +
        'values="1;0.3;1" dur="1s" repeatCount="indefinite"/></text></g>');
    }
    [attr, anim] = s.window(done);
    s.add(`<g${attr}>${anim}`);
    s.text(x + cw - 16, top + 24, 'done ✓', { color: GREEN, size: 12, anchor: 'end' });
    s.add('</g>');

    s.text(x + 16, top + 46, cmd, { color: DIM, size: 12 });
    s.bar(x + 16, top + 58, cw - 32, color, b0, blen);
    s.counter(x + 16, top + 102, frames, done, TEXT);
    [attr, anim] = s.fadeIn(done + 0.1, 0.3);
    s.add(`<g${attr}>${anim}`);
    s.text(x + 16, top + 122, sub, { size: 12 });
    s.text(x + 16, top + 140, foot, { color: DIM, size: 11 });
    s.add('</g></g>');
  });

  // The answer
  s.line(322, 'agent', PURPLE, 'Mirang builds AI that works for you, even with the Wi-Fi off.', 8.8, 0.03, 8.6);

  // The stamp lands once the answer is in
  const [attr, anim] = s.fadeIn(10.9, 0.12);
  const pop = s.a ? '<animateTransform attributeName="transform" type="scale" values="1.8;0.94;1" ' +
    `keyTimes="0;0.7;1" dur="0.35s" begin="${at(10.9)}" fill="freeze"/>` : '';
  s.add(`<g transform="translate(872 318) rotate(-8)"><g${attr}>${anim}<g>${pop}` +
    `<rect x="-82" y="-24" width="164" height="48" rx="6" fill="none" stroke="${ORANGE}" stroke-width="3"/>` +
    `<text x="0" y="9" font-family="${FONT}" font-size="24" font-weight="bold" fill="${ORANGE}" ` +
    'text-anchor="middle" letter-spacing="4">SHIPPED</text></g></g></g>');

  s.line(354, 'agent', PURPLE, 'Side quests: rebuilding git in Rust, and German (A2, wird schon).', 12.0, 0.028, 11.8);
  s.typed(40, 392, '-> based in Mannheim · open to Werkstudent roles in agentic AI · say hi!', 14.4, 0.022,
    { color: GREEN, cursor: true });
}

function build() {
  const anim = new Svg(true), stat = new Svg(false);
  session(anim);
  session(stat);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
     aria-label="A self-playing terminal session answering: who is Mirang? Mirang builds AI that works for you, even with the Wi-Fi off.">
<title>who is Mirang? - a self-playing agent session</title>
<defs>
  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="${TRACK}"/></pattern>
  <style>
    .cursor { animation: blink 0.9s steps(2, start) infinite; }
    @keyframes blink { to { visibility: hidden; } }
    .static { display: none; }
    @media (prefers-reduced-motion: reduce) {
      .anim { display: none; } .static { display: inline; } .cursor { animation: none; }
    }
  </style>
</defs>
<rect width="${W}" height="${H}" rx="12" fill="${BG}"/>
<rect width="${W}" height="${H}" rx="12" fill="url(#grid)"/>
<rect width="${W - 1}" height="${H - 1}" x="0.5" y="0.5" rx="12" fill="none" stroke="${BORDER}"/>
<rect width="0" height="0"><animate id="loop" attributeName="x" from="0" to="0" dur="${LOOP}s" begin="0s;loop.end" restart="always"/></rect>
<g class="anim"><set attributeName="opacity" to="1" begin="loop.begin"/><animate attributeName="opacity" from="1" to="0" begin="${at(LOOP - 0.7)}" dur="0.6s" fill="freeze"/>
${anim.out.join('')}
</g>
<g class="static">
${stat.out.join('')}
</g>
</svg>
`;
}

const out = path.join(__dirname, 'assets', 'banner.svg');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, build(), 'utf8');
console.log(`wrote ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
