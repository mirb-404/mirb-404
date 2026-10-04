/*
 * Builds assets/banner.svg: a self-playing terminal session for the profile README.
 *
 * Everything animates with SMIL + CSS inside the SVG, so it plays on GitHub with no
 * JavaScript at view time. Visitors who prefer reduced motion get the finished frame.
 *
 * It also builds the footer row in the same style: a profile-views chip and the social-link
 * buttons. The view count comes from komarev.com, which counts every fetch as a view, so it
 * is only fetched in CI (or with --views) and CI's own fetches are subtracted.
 *
 * Edit the SCRIPT section near the bottom and run:  node make_banner.js
 */
const fs = require('fs');
const path = require('path');

const W = 1000, H = 480;
const LOOP = 18; // seconds, then the session replays
const MONO = "ui-monospace, 'Cascadia Mono', 'SF Mono', Consolas, Menlo, monospace";
const SANS = "ui-sans-serif, -apple-system, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const COL = 144; // where every line's text starts, after its `label >`

// GitHub dark palette
const BG = '#0d1117', CARD = '#161b22', BORDER = '#30363d', TRACK = '#21262d';
const TEXT = '#e6edf3', SOFT = '#c9d1d9', DIM = '#8b949e', FAINT = '#484f58';
const GREEN = '#3fb950', PURPLE = '#d2a8ff', BLUE = '#58a6ff', ORANGE = '#f0883e',
  YELLOW = '#e3b341', PINK = '#ff7b72', CYAN = '#39c5cf';

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const at = t => `loop.begin+${t.toFixed(2)}s`;
const r1 = n => Math.round(n * 10) / 10;

// ── 5x7 pixel font ───────────────────────────────────────────────────────────
const FONT = {
  A: '01110 10001 10001 11111 10001 10001 10001', B: '11110 10001 10001 11110 10001 10001 11110',
  C: '01110 10001 10000 10000 10000 10001 01110', D: '11110 10001 10001 10001 10001 10001 11110',
  E: '11111 10000 10000 11110 10000 10000 11111', F: '11111 10000 10000 11110 10000 10000 10000',
  G: '01110 10001 10000 10111 10001 10001 01111', H: '10001 10001 10001 11111 10001 10001 10001',
  I: '01110 00100 00100 00100 00100 00100 01110', J: '00111 00010 00010 00010 00010 10010 01100',
  K: '10001 10010 10100 11000 10100 10010 10001', L: '10000 10000 10000 10000 10000 10000 11111',
  M: '10001 11011 10101 10101 10001 10001 10001', N: '10001 10001 11001 10101 10011 10001 10001',
  O: '01110 10001 10001 10001 10001 10001 01110', P: '11110 10001 10001 11110 10000 10000 10000',
  Q: '01110 10001 10001 10001 10101 10010 01101', R: '11110 10001 10001 11110 10100 10010 10001',
  S: '01111 10000 10000 01110 00001 00001 11110', T: '11111 00100 00100 00100 00100 00100 00100',
  U: '10001 10001 10001 10001 10001 10001 01110', V: '10001 10001 10001 10001 10001 01010 00100',
  W: '10001 10001 10001 10101 10101 10101 01010', X: '10001 10001 01010 00100 01010 10001 10001',
  Y: '10001 10001 01010 00100 00100 00100 00100', Z: '11111 00001 00010 00100 01000 10000 11111',
  0: '01110 10001 10011 10101 11001 10001 01110', 1: '00100 01100 00100 00100 00100 00100 01110',
  2: '01110 10001 00001 00010 00100 01000 11111', 3: '11111 00010 00100 00010 00001 10001 01110',
  4: '00010 00110 01010 10010 11111 00010 00010', 5: '11111 10000 11110 00001 00001 10001 01110',
  6: '00110 01000 10000 11110 10001 10001 01110', 7: '11111 00001 00010 00100 01000 01000 01000',
  8: '01110 10001 10001 01110 10001 10001 01110', 9: '01110 10001 10001 01111 00001 00010 01100',
  '?': '01110 10001 00001 00010 00100 00000 00100', '!': '00100 00100 00100 00100 00100 00000 00100',
  '.': '00000 00000 00000 00000 00000 01100 01100', '$': '00100 01111 10100 01110 00101 11110 00100',
  '-': '00000 00000 00000 11111 00000 00000 00000', '+': '00000 00100 00100 11111 00100 00100 00000',
  x: '00000 00000 10001 01010 00100 01010 10001', ',': '00000 00000 00000 00000 01100 00100 01000',
  ' ': '00000 00000 00000 00000 00000 00000 00000',
};

// Pixel icons (1 = lit). Drawn with the same run-merging as the font.
const ICONS = {
  wifi: ['00011111000', '01100000110', '10000000001', '00011111000', '00100000100',
    '00000000000', '00001110000', '00000000000', '00000100000'],
  slash: ['10000000000', '01000000000', '00100000000', '00010000000', '00001000000',
    '00000100000', '00000010000', '00000001000', '00000000100'],
  trophy: ['01111111110', '11011111011', '10011111001', '01011111010', '00111111100',
    '00011111000', '00001110000', '00001110000', '00111111100'],
  coin: ['00011111000', '00110001100', '01101110110', '01011111010', '01011111010',
    '01011111010', '01101110110', '00110001100', '00011111000'],
  eye: ['00011111000', '01100000110', '11001110011', '10011111001', '11001110011',
    '01100000110', '00011111000'],
  window: ['111111111', '111111111', '100000001', '101110001', '100000001', '101111101',
    '100000001', '111111111'],
  linkedin: ['100000', '000000', '101110', '101001', '101001', '101001', '101001'],
  xlogo: ['1000001', '0100010', '0010100', '0001000', '0010100', '0100010', '1000001'],
  heart: ['01110001110', '11111011111', '11111111111', '11111111111', '01111111110',
    '00111111100', '00011111000', '00001110000', '00000100000'],
  clipboard: ['00111111100', '11100000111', '10000000001', '10111111001', '10000000001',
    '10111100001', '10000000001', '10111110001', '11111111111'],
  bolt: ['00000011110', '00000111100', '00001111000', '00011111110', '00111111100',
    '00000111000', '00001110000', '00011100000', '00011000000'],
};

// Rows of '0'/'1' -> one path, merging horizontal runs into single rects
function bitmapPath(rows, x, y, px) {
  let d = '';
  rows.forEach((row, ry) => {
    for (let c = 0; c < row.length;) {
      if (row[c] !== '1') { c++; continue; }
      let e = c;
      while (row[e] === '1') e++;
      d += `M${r1(x + c * px)} ${r1(y + ry * px)}h${r1((e - c) * px)}v${r1(px)}h${r1(-(e - c) * px)}z`;
      c = e;
    }
  });
  return d;
}
const glyphRows = ch => (FONT[ch] ?? FONT[ch.toUpperCase()] ?? FONT['?']).split(' ');
const pixelWidth = (s, px) => s.length * 6 * px - px;

class Svg {
  constructor(animated) { this.a = animated; this.out = []; }
  add(s) { this.out.push(s); }

  // ── timing helpers ─────────────────────────────────────────────────────────
  // Fades in at `start` (and resets at the top of every loop)
  show(start, dur = 0.2) {
    if (!this.a) return ['', ''];
    return [' opacity="0"', '<set attributeName="opacity" to="0" begin="loop.begin"/>' +
      `<animate attributeName="opacity" from="0" to="1" dur="${dur}s" begin="${at(start)}" fill="freeze"/>`];
  }
  // Pops in with a flicker, like a CRT catching up
  flicker(start) {
    if (!this.a) return ['', ''];
    return [' opacity="0"', '<set attributeName="opacity" to="0" begin="loop.begin"/>' +
      `<animate attributeName="opacity" values="0;1;0.25;1;0.6;1" dur="0.28s" begin="${at(start)}" ` +
      'calcMode="discrete" fill="freeze"/>'];
  }
  // Visible from start until end (or for the rest of the loop)
  window(start, end = null) {
    if (!this.a) return end === null ? ['', ''] : [' visibility="hidden"', ''];
    let anim = '<set attributeName="visibility" to="hidden" begin="loop.begin"/>' +
      `<set attributeName="visibility" to="visible" begin="${at(start)}"/>`;
    if (end !== null) anim += `<set attributeName="visibility" to="hidden" begin="${at(end)}"/>`;
    return [' visibility="hidden"', anim];
  }
  // A short discrete shake, for things landing
  jitter(start, amp = 2, dur = 0.3) {
    if (!this.a) return '';
    const v = [[0, 0], [amp, -amp / 2], [-amp, amp / 2], [amp / 2, amp / 2], [-amp / 2, 0], [0, 0]];
    return `<animateTransform attributeName="transform" type="translate" values="${v.map(p => p.join(' ')).join(';')}" ` +
      `dur="${dur}s" begin="${at(start)}" calcMode="discrete"/>`;
  }
  // Wraps content in a group that appears at `start` (flicker or fade) and optionally shakes
  group(start, body, { mode = 'fade', shake = 0 } = {}) {
    const [attr, anim] = mode === 'flicker' ? this.flicker(start) : this.show(start);
    this.add(`<g${attr}>${anim}<g>${shake ? this.jitter(start, shake) : ''}`);
    body();
    this.add('</g></g>');
  }

  // ── text ───────────────────────────────────────────────────────────────────
  text(x, y, s, { color = TEXT, size = 14, weight = 'normal', anchor = 'start', font = MONO, extra = '', inner = '' } = {}) {
    this.add(`<text x="${r1(x)}" y="${r1(y)}" font-family="${font}" font-size="${size}" fill="${color}" ` +
      `font-weight="${weight}" text-anchor="${anchor}" xml:space="preserve"${extra}>${inner}${esc(s)}</text>`);
  }

  // Reveals a line word by word. segs: [[text, color, weight?], ...]. Returns when it finishes.
  words(x, y, segs, start, { step = 0.07, size = 14, font = MONO, cursor = null } = {}) {
    let t = start, spans = '';
    for (const [str, color, weight = 'normal'] of segs) {
      for (const w of str.match(/\S+\s*|\s+/g)) {
        const [attr, anim] = this.show(t, 0.14);
        spans += `<tspan fill="${color}" font-weight="${weight}"${attr}>${anim}${esc(w)}</tspan>`;
        t += step;
      }
    }
    if (cursor && this.a) {
      const [attr, anim] = this.window(t);
      spans += `<tspan fill="${cursor}" class="cursor"${attr}>${anim}█</tspan>`;
    }
    this.add(`<text x="${x}" y="${y}" font-family="${font}" font-size="${size}" xml:space="preserve">${spans}</text>`);
    return t;
  }

  // A `label >` prompt followed by a word-by-word line
  line(y, label, color, segs, start, opts = {}) {
    this.group(start, () => this.text(40, y, `${label} >`, { color }));
    return this.words(COL, y, segs, start + 0.15, opts);
  }

  // Pixel-font text as a single path
  pixel(x, y, s, px, color, extra = '') {
    const d = [...s].map((ch, i) => bitmapPath(glyphRows(ch), x + i * 6 * px, y, px)).join('');
    this.add(`<path d="${d}" fill="${color}"${extra}/>`);
  }

  // Pixel title typed glyph by glyph, each landing with a little shake
  pixelTyped(x, y, s, px, color, start, step) {
    [...s].forEach((ch, i) => {
      if (ch === ' ') return;
      this.group(start + i * step, () => this.pixel(x + i * 6 * px, y, ch, px, color), { mode: 'flicker', shake: px / 2 });
    });
    return start + s.length * step;
  }

  icon(name, x, y, px, color) {
    this.add(`<path d="${bitmapPath(ICONS[name], x, y, px)}" fill="${color}"/>`);
  }

  // An "in progress" bar: a lit segment sliding back and forth forever
  busy(x, y, w, color, phase = 0) {
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="4" rx="2" fill="${TRACK}"/>`);
    const seg = Math.round(w * 0.3);
    const anim = this.a ? `<animate attributeName="x" values="${x};${x + w - seg};${x}" dur="2.4s" begin="${-phase}s" ` +
      'repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.45 0 0.55 1;0.45 0 0.55 1"/>' : '';
    this.add(`<rect x="${x + (w - seg) / 2}" y="${y}" width="${seg}" height="4" rx="2" fill="${color}">${anim}</rect>`);
  }

  // A rubber stamp that slams down
  stamp(cx, cy, label, color, start, rot = -8) {
    const px = 3, tw = pixelWidth(label, px), w = tw + 30, h = 21 + 22;
    const [attr, anim] = this.show(start, 0.06);
    const slam = this.a ? '<animateTransform attributeName="transform" type="scale" values="2.4;0.9;1.04;1" ' +
      `keyTimes="0;0.55;0.8;1" dur="0.32s" begin="${at(start)}" fill="freeze"/>` : '';
    this.add(`<g transform="translate(${cx} ${cy}) rotate(${rot})"><g${attr}>${anim}<g>${slam}` +
      `<rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="4" fill="${BG}" fill-opacity="0.6" stroke="${color}" stroke-width="3"/>` +
      `<rect x="${-w / 2 + 4}" y="${-h / 2 + 4}" width="${w - 8}" height="${h - 8}" rx="2" fill="none" stroke="${color}" stroke-opacity="0.45"/>`);
    this.pixel(-tw / 2, -10.5, label, px, color);
    this.add('</g></g></g>');
  }

  cursor(x, y, w, h, color, start, end = null) {
    if (!this.a) return;
    const [attr, anim] = this.window(start, end);
    this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" class="cursor"${attr}>${anim}</rect>`);
  }
}

// ── SCRIPT ───────────────────────────────────────────────────────────────────
// What he's built so far: one plain sentence each
const BUILT = [
  { name: 'MINDWELL', icon: 'heart', color: GREEN, where: 'Google DeepMind hackathon, 2025',
    what: 'a private AI wellness app that runs fully offline' },
  { name: 'MCPAY', icon: 'coin', color: YELLOW, where: 'Algorand hackathon, Berlin 2026',
    what: 'lets AI agents pay for the tools they use' },
  { name: 'TENDERFLOW', icon: 'clipboard', color: PURPLE, where: 'Q-Hack Mannheim 2026, team of 3',
    what: "drafts tender answers, then waits for a human's OK" },
  { name: 'HDR2SDR', icon: 'bolt', color: ORANGE, where: 'live on Vercel',
    what: 'private HDR to SDR video converter, no account needed' },
];

// What he's doing right now
const NOW = [
  ['MSc Applied Data Science & AI', 'SRH Heidelberg: NLP, ML, big data, AI ethics'],
  ['AI/ML Engineer at Deutsche Bank', 'research partner, applied LLM research'],
  ['Learning Rust', 'by rebuilding git from scratch'],
  ['Offline AI desktop apps', 'built with Electron'],
];

// Tech he's fluent in, and what he's into
const FLUENT = ['Python', 'TypeScript', 'JavaScript', 'SQL', 'React', 'LangGraph', 'MCP', 'Ollama'];
const INTO = ['offline-first AI', 'AI agents', 'LLM evals', 'local models', 'Rust', 'hackathons'];

function session(s) {
  // Window chrome
  [PINK, YELLOW, GREEN].forEach((c, i) => s.add(`<circle cx="${24 + i * 18}" cy="22" r="5" fill="${c}" opacity="0.85"/>`));
  s.text(W / 2, 26, 'mirang@mannheim - who-is-mirang.session', { color: DIM, size: 12, anchor: 'middle' });
  s.add(`<path d="${bitmapPath(ICONS.wifi, 892, 15, 1.2)}" fill="${DIM}"/><path d="${bitmapPath(ICONS.slash, 892, 15, 1.2)}" fill="${PINK}"/>`);
  s.text(964, 26, 'offline', { color: PINK, size: 11, anchor: 'end' });
  s.add(`<line x1="0" y1="42" x2="${W}" y2="42" stroke="${BORDER}"/>`);

  // ── the question ──
  s.group(0.2, () => s.text(40, 85, 'you >', { color: GREEN }));
  const titleEnd = s.pixelTyped(COL, 61, 'WHO IS MIRANG?', 4, TEXT, 0.45, 0.075);
  s.cursor(COL + pixelWidth('WHO IS MIRANG?', 4) + 8, 61, 14, 28, TEXT, titleEnd, 2.0);
  // a chromatic glitch on the title, once early and once while the answer sits there
  if (s.a) for (const g of [titleEnd + 0.15, 13]) {
    for (const [c, dx] of [[PINK, -3], [CYAN, 3]]) {
      s.add(`<g opacity="0" transform="translate(${dx} 0)"><set attributeName="opacity" to="0" begin="loop.begin"/>` +
        `<animate attributeName="opacity" values="0.75;0;0.6;0" dur="0.22s" begin="${at(g)}" calcMode="discrete"/>`);
      s.pixel(COL, 61, 'WHO IS MIRANG?', 4, c, ' style="mix-blend-mode:screen"');
      s.add('</g>');
    }
  }

  s.line(118, 'agent', PURPLE, [['Software engineer in Mannheim. He builds ', SOFT], ['AI apps that run offline', GREEN, 'bold'],
    [' and ', SOFT], ['agents that do real work.', PURPLE, 'bold']], 2.0, { step: 0.06 });

  // ── built so far ──
  s.group(3.0, () => {
    s.pixel(40, 150, 'BUILT SO FAR', 1.8, DIM);
    s.add(`<line x1="${40 + pixelWidth('BUILT SO FAR', 1.8) + 12} " y1="156" x2="450" y2="156" stroke="${BORDER}"/>`);
  });
  BUILT.forEach(({ name, icon, color, where, what }, i) => {
    const y = 180 + i * 50;
    s.group(3.2 + i * 0.3, () => {
      s.icon(icon, 40, y, 2.5, color);
      s.pixel(80, y + 1, name, 2, TEXT);
      s.text(80 + pixelWidth(name, 2) + 12, y + 12, where, { color: DIM, size: 10 });
      s.text(80, y + 31, what, { color: SOFT, size: 11.5 });
    }, { mode: 'flicker', shake: 2 });
  });

  // ── right now ──
  const px0 = 480, pw = 480, py0 = 140, ph = 232;
  s.group(3.4, () => {
    s.add(`<rect x="${px0}" y="${py0}" width="${pw}" height="${ph}" rx="8" fill="${CARD}" stroke="${BORDER}"/>`);
    s.add(`<path d="M${px0} ${py0 + 8}a8 8 0 0 1 8-8v${ph}a8 8 0 0 1-8-8z" fill="${BLUE}"/>`);
    s.pixel(px0 + 20, py0 + 16, 'RIGHT NOW', 2, TEXT);
    s.add(`<circle cx="${px0 + pw - 52}" cy="${py0 + 23}" r="3.5" fill="${GREEN}" filter="url(#glow)">` +
      '<animate attributeName="opacity" values="1;0.25;1" dur="1.6s" repeatCount="indefinite"/></circle>');
    s.text(px0 + pw - 20, py0 + 27, 'live', { color: GREEN, size: 11, weight: 'bold', anchor: 'end' });
  }, { mode: 'flicker', shake: 3 });
  NOW.forEach(([what, detail], i) => {
    const y = py0 + 62 + i * 44;
    s.group(3.7 + i * 0.3, () => {
      s.add(`<rect x="${px0 + 20}" y="${y - 9}" width="6" height="6" fill="${BLUE}"/>`);
      s.text(px0 + 36, y - 2, what, { color: TEXT, size: 13, weight: 'bold' });
      s.text(px0 + 36, y + 15, detail, { color: DIM, size: 10.5 });
      s.busy(px0 + pw - 100, y - 8, 76, BLUE, i * 0.45);
    });
  });

  // ── fluent in / into ──
  const chipRow = (y, label, items, color, start) => {
    s.group(start, () => s.pixel(40, y - 6, label, 1.8, DIM));
    let x = COL;
    items.forEach((item, i) => {
      const w = Math.round(item.length * 6.6 + 22);
      s.group(start + 0.1 + i * 0.08, () => {
        s.add(`<rect x="${x}" y="${y - 10}" width="${w}" height="23" rx="11.5" fill="${color}" fill-opacity="0.08" stroke="${color}" stroke-opacity="0.45"/>`);
        s.text(x + w / 2, y + 5, item, { color, size: 11, anchor: 'middle' });
      }, { mode: 'flicker', shake: 1.5 });
      x += w + 8;
    });
  };
  chipRow(408, 'FLUENT IN', FLUENT, BLUE, 5.0);
  chipRow(446, 'INTO', INTO, GREEN, 5.8);
}

function build() {
  const anim = new Svg(true), stat = new Svg(false);
  session(anim);
  session(stat);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
     aria-label="A self-playing terminal session answering: who is Mirang? Mirang Bhandari builds offline AI apps and AI agents. Built so far: MindWell, mcpay, TenderFlow, HDR2SDR. Right now: an MSc in Applied Data Science &amp; AI at SRH Heidelberg, AI/ML research at Deutsche Bank, learning Rust, and offline desktop apps. Fluent in Python, TypeScript, JavaScript, SQL, React, LangGraph, MCP and Ollama.">
<title>who is Mirang? - a self-playing agent session</title>
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0f141b"/><stop offset="1" stop-color="${BG}"/></linearGradient>
  <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"><rect width="1" height="1" fill="${TRACK}"/></pattern>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity="0.12"/></pattern>
  <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75"><stop offset="0.6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.22"/></radialGradient>
  <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <linearGradient id="sweep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.025"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="frame"><rect width="${W}" height="${H}" rx="12"/></clipPath>
  <style>
    .cursor { animation: blink 1s steps(2, start) infinite; }
    @keyframes blink { to { visibility: hidden; } }
    .static { display: none; }
    @media (prefers-reduced-motion: reduce) { .anim { display: none; } .static { display: inline; } }
  </style>
</defs>
<g clip-path="url(#frame)">
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect width="${W}" height="${H}" fill="url(#grid)"/>
<rect width="0" height="0"><animate id="loop" attributeName="x" from="0" to="0" dur="${LOOP}s" begin="0s;loop.end" restart="always"/></rect>
<g class="anim"><set attributeName="opacity" to="1" begin="loop.begin"/><animate attributeName="opacity" from="1" to="0" begin="${at(LOOP - 0.6)}" dur="0.5s" fill="freeze"/><g>
${anim.out.join('\n')}
</g></g>
<g class="static">
${stat.out.join('\n')}
</g>
<g class="anim"><rect width="${W}" height="90" y="-90" fill="url(#sweep)"><animate attributeName="y" from="-90" to="${H}" dur="6s" repeatCount="indefinite"/></rect></g>
<rect width="${W}" height="${H}" fill="url(#scan)"/>
<rect width="${W}" height="${H}" fill="url(#vig)"/>
</g>
<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="12" fill="none" stroke="${BORDER}"/>
</svg>
`;
}

// ── footer row: profile views + links ───────────────────────────────────────
const VIEWS_USER = 'Bloodwingv2'; // the komarev counter that has been counting since day one
const LINKS = [
  { file: 'link-portfolio.svg', label: 'PORTFOLIO', icon: 'window', color: PURPLE },
  { file: 'link-linkedin.svg', label: 'LINKEDIN', icon: 'linkedin', color: BLUE },
  { file: 'link-x.svg', label: 'ANGRYCODER97', icon: 'xlogo', color: TEXT },
];
const CHIP_H = 44;

// A small card in the banner's style. A light sheen sweeps across it now and then.
function chip(w, color, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${CHIP_H}" width="${w}" height="${CHIP_H}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>
  <linearGradient id="sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.07"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <pattern id="scan" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#000" opacity="0.12"/></pattern>
  <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <clipPath id="c"><rect width="${w}" height="${CHIP_H}" rx="6"/></clipPath>
  <style>.anim { } @media (prefers-reduced-motion: reduce) { .anim { display: none; } }</style>
</defs>
<g clip-path="url(#c)">
<rect width="${w}" height="${CHIP_H}" fill="${CARD}"/>
<rect width="4" height="${CHIP_H}" fill="${color}"/>
${body}
<rect width="${w}" height="${CHIP_H}" fill="url(#scan)"/>
<g class="anim"><rect x="-80" width="60" height="${CHIP_H}" fill="url(#sheen)" transform="skewX(-20)"><animate attributeName="x" values="-80;${w + 40};${w + 40}" keyTimes="0;0.25;1" dur="6s" repeatCount="indefinite"/></rect></g>
</g>
<rect x="0.5" y="0.5" width="${w - 1}" height="${CHIP_H - 1}" rx="6" fill="none" stroke="${BORDER}"/>
</svg>
`;
}

function linkChip({ label, icon, color }) {
  const px = 2.5, iconW = ICONS[icon][0].length * px, lx = 16 + iconW + 12, lw = pixelWidth(label, 2.2);
  const w = Math.round(lx + lw + 48);
  const body = `<path d="${bitmapPath(ICONS[icon], 16, (CHIP_H - ICONS[icon].length * px) / 2, px)}" fill="${color}"/>
<path d="${[...label].map((ch, i) => bitmapPath(glyphRows(ch), lx + i * 6 * 2.2, 14.3, 2.2)).join('')}" fill="${TEXT}"/>
<text x="${w - 14}" y="27" font-family="${MONO}" font-size="13" font-weight="bold" fill="${color}" text-anchor="end">-&gt;</text>`;
  return chip(w, color, label, body);
}

// The count lands with a quick roll-up, once per page view
function viewsChip(count) {
  const n = Number(count.replace(/\D/g, '')) || 0;
  const fmt = v => Math.round(v).toLocaleString('en-US');
  const label = 'PROFILE VIEWS', px = 3, eyeW = 11 * 2.5;
  const lx = 16 + eyeW + 12, nx = lx + pixelWidth(label, 1.6) + 16;
  const w = Math.round(nx + pixelWidth(fmt(n), px) + 34);
  const num = (v, color) => `<path d="${[...fmt(v)].map((ch, i) => bitmapPath(glyphRows(ch), nx + i * 6 * px, 11.5, px)).join('')}" fill="${color}"/>`;
  const steps = [0, 0.35, 0.6, 0.78, 0.9, 0.96, 1].map(f => n * f);
  const roll = steps.map((v, i) => {
    const last = i === steps.length - 1, t0 = (0.3 + i * 0.12).toFixed(2);
    const hide = last ? '' : `<set attributeName="visibility" to="hidden" begin="${(0.3 + (i + 1) * 0.12).toFixed(2)}s"/>`;
    return `<g visibility="hidden"><set attributeName="visibility" to="visible" begin="${t0}s"/>${hide}${num(v, last ? GREEN : SOFT)}</g>`;
  }).join('');
  const body = `<path d="${bitmapPath(ICONS.eye, 16, (CHIP_H - 7 * 2.5) / 2, 2.5)}" fill="${GREEN}"/>
<path d="${[...label].map((ch, i) => bitmapPath(glyphRows(ch), lx + i * 6 * 1.6, 16.4, 1.6)).join('')}" fill="${DIM}"/>
<g class="anim">${roll}</g>
<style>.still { display: none; } @media (prefers-reduced-motion: reduce) { .still { display: inline; } }</style>
<g class="still">${num(n, GREEN)}</g>
<circle cx="${w - 16}" cy="${CHIP_H / 2}" r="3" fill="${GREEN}" filter="url(#glow)"><animate attributeName="opacity" values="1;0.25;1" dur="2s" repeatCount="indefinite"/></circle>`;
  return chip(w, GREEN, `Profile views: ${fmt(n)}`, body);
}

async function fetchViews() {
  const res = await fetch(`https://komarev.com/ghpvc/?username=${VIEWS_USER}&style=for-the-badge`);
  const m = (await res.text()).match(/aria-label="[^"]*?:\s*([\d,]+)"/);
  if (!m) throw new Error('could not read the view count');
  // every scheduled run is one fetch, so the run number is how many views CI added itself
  const ownHits = Number(process.env.GITHUB_RUN_NUMBER) || 0;
  return String(Number(m[1].replace(/\D/g, '')) - ownHits);
}

async function main() {
  const dir = path.join(__dirname, 'assets');
  fs.mkdirSync(dir, { recursive: true });
  const write = (name, svg) => {
    fs.writeFileSync(path.join(dir, name), svg, 'utf8');
    console.log(`wrote assets/${name} (${Math.round(Buffer.byteLength(svg) / 1024)} KB)`);
  };
  write('banner.svg', build());
  LINKS.forEach(l => write(l.file, linkChip(l)));
  if (!process.env.GITHUB_ACTIONS && !process.argv.includes('--views')) return; // don't count our own builds
  try {
    write('views.svg', viewsChip(await fetchViews()));
  } catch (e) {
    console.warn(`views.svg not updated: ${e.message}`); // keep the last good count
  }
}

main();
