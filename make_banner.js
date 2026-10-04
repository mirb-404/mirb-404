/*
 * Builds assets/banner.svg: a self-playing terminal session for the profile README.
 *
 * Everything animates with SMIL + CSS inside the SVG, so it plays on GitHub with no
 * JavaScript at view time. Visitors who prefer reduced motion get the finished frame.
 *
 * Edit the SCRIPT section near the bottom and run:  node make_banner.js
 */
const fs = require('fs');
const path = require('path');

const W = 1000, H = 560;
const LOOP = 22; // seconds, then the session replays
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
  x: '00000 00000 10001 01010 00100 01010 10001', ' ': '00000 00000 00000 00000 00000 00000 00000',
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

  // Cycles through pixel-text frames, landing on the last one at `end`
  pixelCounter(x, y, frames, end, px, color, span = 1.1) {
    const n = frames.length;
    frames.forEach((value, i) => {
      const last = i === n - 1;
      if (!this.a && !last) return;
      const t0 = end - span + span * i / (n - 1);
      const [attr, anim] = this.window(t0, last ? null : end - span + span * (i + 1) / (n - 1));
      this.add(`<g${attr}>${anim}${last ? `<g>${this.jitter(t0, px / 2)}` : '<g>'}`);
      this.pixel(x, y, value, px, last ? color : SOFT);
      this.add('</g></g>');
    });
  }

  // ── shapes ─────────────────────────────────────────────────────────────────
  // A stroke that draws itself in
  draw(d, len, start, dur, stroke, { width = 2, extra = '' } = {}) {
    if (!this.a) return this.add(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}"${extra}/>`);
    this.add(`<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-dasharray="${len}" ` +
      `stroke-dashoffset="${len}"${extra}><set attributeName="stroke-dashoffset" to="${len}" begin="loop.begin"/>` +
      `<animate attributeName="stroke-dashoffset" from="${len}" to="0" dur="${dur}s" begin="${at(start)}" ` +
      'fill="freeze" calcMode="spline" keyTimes="0;1" keySplines="0.4 0 0.2 1"/></path>');
  }

  // A horizontal bar that grows to width w
  grow(x, y, w, h, color, start, dur, { rx = 2, discrete = false } = {}) {
    if (!this.a) return this.add(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${color}"/>`);
    const how = discrete
      ? `values="${Array.from({ length: 17 }, (_, i) => r1(w * i / 16)).join(';')}" calcMode="discrete"`
      : `from="0" to="${w}" calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.25 1"`;
    this.add(`<rect x="${x}" y="${y}" width="0" height="${h}" rx="${rx}" fill="${color}">` +
      '<set attributeName="width" to="0" begin="loop.begin"/>' +
      `<animate attributeName="width" ${how} begin="${at(start)}" dur="${dur}s" fill="freeze"/></rect>`);
  }

  // Chunky progress line with a glowing head, like a build step running
  progress(x1, x2, y, color, start, dur) {
    this.add(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${TRACK}" stroke-width="2"/>`);
    this.grow(x1, y - 1, x2 - x1, 2, color, start, dur, { rx: 0, discrete: true });
    if (!this.a) return;
    const xs = Array.from({ length: 17 }, (_, i) => r1(x1 + (x2 - x1 - 6) * i / 16)).join(';');
    this.add(`<rect y="${y - 3}" width="6" height="6" fill="${color}" filter="url(#glow)" opacity="0">` +
      `<animate attributeName="x" values="${xs}" dur="${dur}s" begin="${at(start)}" calcMode="discrete" fill="freeze"/>` +
      `<animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.92;1" dur="${dur + 0.1}s" begin="${at(start)}" fill="freeze"/>` +
      '<set attributeName="opacity" to="0" begin="loop.begin"/></rect>');
  }

  // A dot that pops in with a ring ripple
  pop(cx, cy, color, start) {
    if (!this.a) return this.add(`<circle cx="${cx}" cy="${cy}" r="4" fill="${color}"/>`);
    this.add(`<circle cx="${cx}" cy="${cy}" r="0" fill="${color}"><set attributeName="r" to="0" begin="loop.begin"/>` +
      `<animate attributeName="r" values="0;6;4" keyTimes="0;0.6;1" dur="0.3s" begin="${at(start)}" fill="freeze"/></circle>` +
      `<circle cx="${cx}" cy="${cy}" r="4" fill="none" stroke="${color}" stroke-width="1.5" opacity="0">` +
      `<animate attributeName="r" from="4" to="14" dur="0.6s" begin="${at(start)}"/>` +
      `<animate attributeName="opacity" from="0.9" to="0" dur="0.6s" begin="${at(start)}"/></circle>`);
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
// The crew the agent wakes up. Each one reports back as a card on the right.
const CREW = [
  { name: 'OFFLINE', icon: 'wifi', color: GREEN, sub: 'mindwell, runs local', note: 'cloud calls: 0' },
  { name: 'HACKATHONS', icon: 'trophy', color: BLUE, sub: '3 builds, 2025-26', note: 'Berlin, Mannheim, online' },
  { name: 'WALLET', icon: 'coin', color: YELLOW, sub: 'mcpay, agents that pay', note: 'budget: half a cent' },
  { name: 'SPEEDRUN', icon: 'bolt', color: ORANGE, sub: 'hdr2sdr, 4k video', note: 'racing 4K vs 1080p' },
];

const CW = 236, CH = 110; // card size
const CARD_AT = [[470, 140], [720, 140], [470, 262], [720, 262]];

function card(s, i, t, title, tag, body) {
  const [x, y] = CARD_AT[i], color = CREW[i].color;
  s.add(`<g transform="translate(${x} ${y})">`);
  s.group(t, () => {
    s.add(`<rect width="${CW}" height="${CH}" rx="6" fill="${CARD}" stroke="${BORDER}"/>`);
    s.add(`<path d="M0 6a6 6 0 0 1 6-6v${CH}a6 6 0 0 1-6-6z" fill="${color}"/>`);
    s.pixel(16, 13, title, 2, SOFT);
    s.text(CW - 12, 25, tag, { color, size: 10, weight: 'bold', anchor: 'end' });
    body();
  }, { mode: 'flicker', shake: 3 });
  s.add('</g>');
}

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
  s.cursor(COL + pixelWidth('WHO IS MIRANG?', 4) + 8, 61, 14, 28, TEXT, titleEnd, 3.2);
  // a chromatic glitch on the title, once early and once while the answer sits there
  if (s.a) for (const g of [titleEnd + 0.15, 15.2]) {
    for (const [c, dx] of [[PINK, -3], [CYAN, 3]]) {
      s.add(`<g opacity="0" transform="translate(${dx} 0)"><set attributeName="opacity" to="0" begin="loop.begin"/>` +
        `<animate attributeName="opacity" values="0.75;0;0.6;0" dur="0.22s" begin="${at(g)}" calcMode="discrete"/>`);
      s.pixel(COL, 61, 'WHO IS MIRANG?', 4, c, ' style="mix-blend-mode:screen"');
      s.add('</g>');
    }
  }

  s.line(118, 'agent', PURPLE, [["Wi-Fi's off. Fine, it all runs local. Waking the crew: ", SOFT],
    ['/offline ', GREEN, 'bold'], ['/hackathons ', BLUE, 'bold'], ['/wallet ', YELLOW, 'bold'], ['/speedrun', ORANGE, 'bold']],
  2.05, { step: 0.06 });

  // ── the crew reports in ──
  const done = [];
  CREW.forEach(({ name, icon, color, sub, note }, i) => {
    const yc = 166 + i * 56, t0 = 3.3 + i * 0.35, run = 1.3;
    s.group(t0, () => {
      s.icon(icon, 40, yc - 17, 3, color);
      if (icon === 'wifi') s.icon('slash', 40, yc - 17, 3, PINK);
      s.pixel(84, yc - 17, name, 2.2, TEXT);
      s.text(84, yc + 12, sub, { color: DIM, size: 10.5 });
    }, { mode: 'flicker', shake: 2 });
    s.group(t0 + 0.1, () => s.progress(250, 400, yc - 9, color, t0 + 0.15, run));
    s.group(t0 + 0.25, () => s.text(250, yc + 12, note, { color: DIM, size: 10 }));
    done.push(t0 + 0.15 + run);
    s.group(done[i], () => s.pixel(414, yc - 19, 'OK', 3, color), { mode: 'flicker', shake: 2 });
  });

  // Card 1 — nothing leaves the laptop
  let c = done[0] + 0.05;
  card(s, 0, c, 'OFFLINE', 'MindWell', () => {
    s.pixelCounter(16, 40, ['412KB', '96KB', '12KB', '3KB', '0 BYTES'], c + 1.2, 4, GREEN);
    s.group(c + 1.25, () => s.text(16, 83, 'of your chats leave the laptop', { color: SOFT, size: 10.5 }));
    s.text(16, 99, 'on-device', { color: DIM, size: 9.5 });
    s.add(`<rect x="76" y="93" width="118" height="5" rx="2.5" fill="${TRACK}"/>`);
    s.grow(76, 93, 118, 5, GREEN, c + 0.3, 0.9, { rx: 2.5 });
    s.group(c + 1.2, () => s.text(222, 99, '100%', { color: GREEN, size: 9.5, weight: 'bold', anchor: 'end' }));
  });

  // Card 2 — a hackathon timeline
  c = done[1] + 0.05;
  card(s, 1, c, 'HACKATHONS', '2025-26', () => {
    s.add(`<line x1="22" y1="62" x2="214" y2="62" stroke="${TRACK}" stroke-width="2"/>`);
    s.draw('M22 62H214', 192, c + 0.15, 0.9, BLUE, { width: 2 });
    [[40, 'Gemma 3n', 'solo'], [118, 'Q-Hack', '24 h'], [196, 'Berlin', '36 h']].forEach(([x, top, bot], k) => {
      const tk = c + 0.3 + k * 0.28;
      s.pop(x, 62, BLUE, tk);
      s.group(tk + 0.05, () => {
        s.text(x, 50, top, { color: TEXT, size: 10, weight: 'bold', anchor: 'middle' });
        s.text(x, 80, bot, { color: DIM, size: 9.5, anchor: 'middle' });
      });
    });
    s.group(c + 1.25, () => s.text(16, 100, '3 hackathons. 3 shipped.', { color: SOFT, size: 10.5 }));
  });

  // Card 3 — an agent's wallet, one paid tool call at a time
  c = done[2] + 0.05;
  card(s, 2, c, 'WALLET', 'mcpay', () => {
    // cumulative spend: 23 paid calls of uneven price, under a $0.005 budget line
    const x0 = 16, x1 = 110, y0 = 90, yBudget = 42, budget = 0.005;
    const cost = [2, 1, 1, 3, 1, 2, 1, 1, 1, 2, 1, 1, 1, 3, 1, 1, 2, 1, 1, 1, 2, 1, 1];
    const unit = 0.0037 / cost.reduce((a, b) => a + b);
    const yOf = v => r1(y0 - (y0 - yBudget) * v / budget);
    let d = `M${x0} ${y0}`, spent = 0;
    cost.forEach((k, j) => { spent += k * unit; d += `H${r1(x0 + (x1 - x0) * (j + 1) / cost.length)}V${yOf(spent)}`; });
    s.add(`<path d="M${x0} 36V${y0}H${x1 + 4}" fill="none" stroke="${BORDER}"/>`);
    s.add(`<path d="M${x0} ${yBudget}H${x1 + 4}" stroke="${PINK}" stroke-opacity="0.7" stroke-dasharray="3 3"/>`);
    s.text(x1 + 4, yBudget - 4, 'budget', { color: PINK, size: 8.5, anchor: 'end' });
    s.group(c + 1.4, () => s.add(`<path d="${d}H${x1}V${y0}Z" fill="${YELLOW}" fill-opacity="0.12"/>`));
    s.draw(d, 200, c + 0.2, 1.2, YELLOW, { width: 1.5 });
    s.group(c + 0.2, () => s.text(x0, 103, '23 paid calls', { color: DIM, size: 9 }));
    s.pixelCounter(126, 44, ['$0.0000', '$0.0009', '$0.0018', '$0.0027', '$0.0037'], c + 1.4, 2.2, YELLOW);
    s.group(c + 1.45, () => {
      s.text(126, 78, 'spent by an agent', { color: SOFT, size: 10 });
      s.text(126, 93, 'on its own tools', { color: SOFT, size: 10 });
    });
  });

  // Card 4 — 4K vs the 1080p fast mode, raced side by side
  c = done[3] + 0.05;
  card(s, 3, c, 'SPEEDRUN', 'HDR2SDR', () => {
    const bx = 72, bw = 118, fast = 0.4;
    [['4K', 40, fast * 5.5, DIM], ['1080p', 58, fast, ORANGE]].forEach(([label, y, dur, color]) => {
      s.text(16, y + 6, label, { color: SOFT, size: 10 });
      s.add(`<rect x="${bx}" y="${y}" width="${bw}" height="7" rx="3.5" fill="${TRACK}"/>`);
      s.grow(bx, y, bw, 7, color, c + 0.25, dur, { rx: 3.5 });
      s.group(c + 0.25 + dur, () => s.text(222, y + 7, 'done', { color, size: 9.5, weight: 'bold', anchor: 'end' }));
    });
    s.group(c + 0.3 + fast, () => s.pixel(16, 78, '5.5x FASTER', 2.2, ORANGE), { mode: 'flicker', shake: 2 });
  });

  // ── the guardrail is not used to this ──
  s.line(406, 'guardrail', ORANGE, [["0 cloud calls detected. that's suspicious. requesting API key...", SOFT]], 7.9, { step: 0.06 });
  s.line(432, 'agent', PURPLE, [['there is no API key. ', SOFT], ['it runs on his laptop.', TEXT, 'bold']], 9.4, { step: 0.08 });

  // ── the answer ──
  s.line(474, 'agent', PURPLE, [['Mirang builds AI that works for you, ', TEXT], ['even with the Wi-Fi off.', GREEN, 'bold']],
    10.6, { step: 0.09, size: 17, font: SANS });
  s.stamp(866, 500, 'SHIPPED', ORANGE, 12.1);

  s.words(COL, 526, [['(side quests: rebuilding git in Rust, German at A2. wird schon.) ', DIM], ['say hi ', GREEN, 'bold']],
    12.9, { step: 0.06, size: 12, cursor: GREEN });
}

function build() {
  const anim = new Svg(true), stat = new Svg(false);
  session(anim);
  session(stat);
  const shake = `<animateTransform attributeName="transform" type="translate" values="0 0;-5 2;4 -2;-2 1;1 0;0 0" ` +
    `dur="0.3s" begin="${at(12.1)}" calcMode="discrete"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img"
     aria-label="A self-playing terminal session answering: who is Mirang? Mirang Bhandari builds AI that works for you, even with the Wi-Fi off.">
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
<g class="anim"><set attributeName="opacity" to="1" begin="loop.begin"/><animate attributeName="opacity" from="1" to="0" begin="${at(LOOP - 0.6)}" dur="0.5s" fill="freeze"/><g>${shake}
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

const out = path.join(__dirname, 'assets', 'banner.svg');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, build(), 'utf8');
console.log(`wrote ${out} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
