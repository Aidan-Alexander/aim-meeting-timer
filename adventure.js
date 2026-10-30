// adventure.js: the #adventure joke mode for the team meeting timer.
//
// After the wheel lands you ARE that animal, in a full-screen night village
// after Twizl, the game Aidan's partner made (used with permission). Walk up
// to the other animals you could have been and they say one line; walk into
// the Main Stage to play the DJ set, also ported from Twizl, with your animal
// on the decks. Twizl's sprites could not come across, so the scenery is drawn
// in code and the residents are emoji.
//
// Loaded before script_6.js, which calls Adventure.start(animal, allAnimals)
// when the wheel stops in #adventure mode and Adventure.stop() when the
// meeting moves on. Esc or the ✕ also leaves the game.
(function () {
'use strict';

/* ------------------------------------------------------------------ content */

const TOWN = 'AIM';
// One line each time you walk up to someone: a fact about the animal, or
// something cute. Picked at random from these.
const LINES = {
    'Rabbit': [
        'Rabbits can\'t vomit, so we think very carefully about snacks.',
        'A happy rabbit does a binky: a jump with a twist in the middle. I\'m saving mine.',
        'My teeth never stop growing. Neither does my list of things to chew.',
    ],
    'Red Panda': [
        'Red pandas had the name "panda" first. The giant one borrowed it.',
        'I\'m not a raccoon. The emoji is a raccoon. We\'ve all had to accept it.',
        'I wrap my tail around myself to sleep. Built-in blanket.',
    ],
    'Duck': [
        'Ducklings can swim within hours of hatching. I was mostly just excited.',
        'Ducks sleep with one eye open and half the brain awake. Useful in meetings.',
        'Quack. That one was for the minutes.',
    ],
    'Cat': [
        'A group of kittens is a kindle. I have no further notes.',
        'Cats sleep about fifteen hours a day. I\'m making an exception for you.',
        'I pushed a mug off a desk once. It was a metaphor for ops.',
    ],
    'Dog': [
        'Dogs can learn around 165 words. "Walk" counts as at least ten of them.',
        'YOU\'RE HERE. Hi. Hi. I saw the wheel. I saw the WHOLE wheel.',
        'A dog\'s nose print is as unique as a fingerprint. Mine is on everything.',
    ],
    'Otter': [
        'Sea otters hold hands while they sleep so nobody drifts away.',
        'Every otter has a favourite rock and a pocket of loose skin to keep it in.',
        'We have the densest fur of any animal. It isn\'t vanity, it\'s insulation.',
    ],
    'Capybara': [
        'Capybaras are the largest rodents in the world, and somehow everyone\'s best friend.',
        'I can hold my breath underwater for about five minutes. Longer if the meeting runs over.',
        'Everyone gets on with me. It isn\'t a strategy, but it\'s working.',
    ],
    'Penguin': [
        'Gentoo penguins court each other with pebbles. Nice pebble, by the way.',
        'Emperor penguin dads balance the egg on their feet for two months. In the dark. In winter.',
        'Baby penguin, strictly. The grown-ups were mostly an ice hockey team.',
    ],
    'Nematode': [
        'Four out of every five animals on Earth are nematodes. We\'re keeping it low key.',
        'I don\'t have a face, so I think this is going well.',
        'Someone put me on the wheel. I have no notes.',
    ],
};
const DEFAULT_LINES = ['Hello. I could have been this week\'s animal too.'];
const SIGN_LINES = ['Welcome to ' + TOWN + '. Population: nine animals and one wheel.', 'Please keep to the paths. The nematode is exempt.'];

// where each animal lives and how it moves (hop, walk, swim, dart), after Twizl's residents
const NPC_SETUP = {
    'Rabbit':    { x: 1150, y: 1320, mode: 'hop',  h: 56 },
    'Red Panda': { x: 2000, y: 1450, mode: 'walk', h: 60, speed: 60 },
    'Duck':      { x: 1350, y: 1085, mode: 'swim', h: 46 },
    'Cat':       { x: 900,  y: 1250, mode: 'walk', h: 54, speed: 50 },
    'Dog':       { x: 1900, y: 1600, mode: 'walk', h: 60, speed: 130 },
    'Otter':     { x: 1640, y: 1090, mode: 'swim', h: 48 },
    'Capybara':  { x: 2250, y: 1250, mode: 'walk', h: 66, speed: 40 },
    'Penguin':   { x: 1480, y: 880,  mode: 'swim', h: 50 },
    'Nematode':  { x: 1300, y: 1550, mode: 'dart', h: 40 },
};
const SPARE_SPOTS = [[1700, 1500], [1100, 1450], [2100, 1300], [1600, 1250]];

/* ---------------------------------------------------------------------- dom */

const screenEl = document.getElementById('adventureScreen');
const worldEl = document.getElementById('advWorld');
const tentEl = document.getElementById('advTent');
const cv = document.getElementById('advMap');
const cx = cv.getContext('2d');
const bubbleEl = document.getElementById('advBubble');
const closeBtn = document.getElementById('advClose');
document.getElementById('advTown').textContent = TOWN;

/* -------------------------------------------------------------------- world */

const WW = 3000, WH = 1750, SKY = 330, SPEED = 240;
const R = (a, b) => a + Math.random() * (b - a);
const stars = Array.from({ length: 260 }, () => [Math.random() * WW, Math.random() * SKY * .9, Math.random()]);
const pond = { x: 1500, y: 980, rx: 300, ry: 140 };
const tent = { x: 2480, y: 900, h: 270, w: 300, label: 'MAIN STAGE' };
const sign = { x: 1360, y: 1300, h: 150, said: false };
const places = [tent, sign];
const paths = [
    [[1500, 1400], [1700, 1380], [1950, 1250], [2150, 1120], [2350, 980], [2480, 940]],      // clearing to the Main Stage, over the bridge
    [[1500, 1400], [1480, 1220], [1420, 1130], [1230, 1050], [1150, 900], [1250, 720], [1500, 600]],   // west side of the pond loop
    [[1420, 1130], [1600, 1140], [1800, 1080], [1850, 960], [1760, 820], [1500, 600]],      // east side of the pond loop
    [[1500, 1400], [1380, 1300], [1250, 1250], [1000, 1150]],                               // short path west to a bench
];
const stream = [[1800, 990], [1950, 1050], [2150, 1125], [2350, 1180], [2600, 1300], [2950, 1360]];
const bridge = { x: 2150, y: 1150, w: 170 };
const FORESTS = [[1800, 2360, 380, 760], [60, 580, 1220, 1520], [2260, 2960, 1140, 1640]];
const lilies = [[1380, 940], [1470, 1020], [1600, 905], [1660, 1000], [1290, 990], [1560, 1060], [1720, 960]];
const flora = [], soft = [], lamps = [], strings = [];

function nearPath(x, y, d) { for (const p of paths) for (let i = 0; i < p.length - 1; i++) { const [x1, y1] = p[i], [x2, y2] = p[i + 1]; const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2; let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / L2; t = Math.max(0, Math.min(1, t)); const px = x1 + t * (x2 - x1), py = y1 + t * (y2 - y1); if (Math.hypot(x - px, y - py) < d) return true; } return false; }
function nearPoly(poly, x, y, d) { for (let i = 0; i < poly.length - 1; i++) { const [x1, y1] = poly[i], [x2, y2] = poly[i + 1]; const L2 = (x2 - x1) ** 2 + (y2 - y1) ** 2; let t = ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / L2; t = Math.max(0, Math.min(1, t)); if (Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1))) < d) return true; } return false; }
const nearStream = (x, y, d) => nearPoly(stream, x, y, d);
function nearPlace(x, y, d) { for (const p of places) if (Math.hypot(x - p.x, y - p.y + p.h * .4) < d + p.h * .6) return true; const dx = (x - pond.x) / (pond.rx + d), dy = (y - pond.y) / (pond.ry + d); return dx * dx + dy * dy < 1; }

(function plant() {
    let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const free = (x, y, d, td) => !nearPath(x, y, d) && !nearPlace(x, y, td) && !nearStream(x, y, d) && Math.hypot(x - 1500, y - 1400) > 170 && Math.hypot(x - bridge.x, y - bridge.y) > 120;
    const sprinkle = (k, n, x0, x1, y0, y1, h0, h1, block, d = 80, tries = 600) => { let c = 0, t = 0; while (c < n && t < tries) { t++; const x = x0 + rnd() * (x1 - x0), y = y0 + rnd() * (y1 - y0); if (!free(x, y, d, block ? 60 : 20)) continue; let ok = true; for (const f of flora) { if (Math.hypot(f.x - x, f.y - y) < (block ? 70 : 40)) { ok = false; break; } } if (!ok) continue; flora.push({ k, x, y, h: h0 + rnd() * (h1 - h0), block }); c++; } };
    // tree lines along the top and bottom edges
    for (let x = 40; x < WW; x += 95) { const k = ['tree1', 'tree2', 'maple', 'tree2'][Math.floor(rnd() * 4)]; flora.push({ k, x: x + rnd() * 40, y: SKY + 36 + rnd() * 34, h: 170 + rnd() * 60, block: true }); }
    for (let x = 20; x < WW; x += 110) { const k = ['tree2', 'tree1', 'tree2', 'maple'][Math.floor(rnd() * 4)]; flora.push({ k, x: x + rnd() * 50, y: WH + 20 + rnd() * 30, h: 180 + rnd() * 60, block: false }); }
    // forests: moon-trees top middle-right, blossom bottom-left, maples right-middle
    sprinkle('tree2', 26, 1800, 2360, 400, 720, 200, 270, true, 70);
    sprinkle('tree1', 14, 80, 560, 1230, 1500, 210, 280, true, 80);
    sprinkle('maple', 18, 2280, 2950, 1160, 1620, 200, 270, true, 80);
    // willows at the pond, benches
    flora.push({ k: 'willow', x: 1215, y: 1070, h: 250, block: true }); flora.push({ k: 'willow', x: 1810, y: 880, h: 240, block: true });
    for (const [bx, by] of [[1000, 1105], [1230, 1180], [1780, 1190], [2460, 1690]]) flora.push({ k: 'bench', x: bx, y: by, h: 62, block: true });
    // bluebell drifts
    for (let i = 0; i < 16; i++) { const t = i / 15; const x = 1880 + t * 520, y = 1330 + t * 330 + Math.sin(t * 6) * 40; soft.push({ k: 'bluebell', x: x + (i % 2) * 30, y, h: 46 + rnd() * 12 }); soft.push({ k: 'bluebell', x: x + 60, y: y + 34, h: 40 + rnd() * 10 }); }
    for (let i = 0; i < 8; i++) { const t = i / 7; soft.push({ k: 'bluebell', x: 620 + t * 520, y: 1130 + t * 120 + Math.sin(t * 5) * 30, h: 42 + rnd() * 10 }); }
    // hedges along the paths, shrub clusters, wildflower drifts
    const put = (k, x, y, h, d = 45) => { if (!free(x, y, d, 20)) return false; for (const f of flora) { if (Math.hypot(f.x - x, f.y - y) < 38) return false; } flora.push({ k, x, y, h, block: false }); return true; };
    const hedge = (p, i0, i1, side, off, gap, k, h0, h1) => { for (let i = i0; i < i1 && i < p.length - 1; i++) { const [x1, y1] = p[i], [x2, y2] = p[i + 1]; const seg = Math.hypot(x2 - x1, y2 - y1); const nx = (x2 - x1) / seg, ny = (y2 - y1) / seg; for (let d = gap * .5; d < seg; d += gap) { put(k, x1 + nx * d - ny * off * side, y1 + ny * d + nx * off * side, h0 + rnd() * (h1 - h0)); } } };
    hedge(paths[0], 1, 4, 1, 64, 98, 'shrub', 78, 96);
    hedge(paths[1], 3, 6, 1, 66, 100, 'shrub', 78, 96);
    hedge(paths[2], 1, 4, -1, 66, 100, 'shrub', 78, 96);
    const cluster = (k, x, y, n, r, h0, h1) => { for (let i = 0; i < n; i++) { const a = Math.PI + i / (n - 1) * Math.PI; put(k, x + Math.cos(a) * r * (.9 + rnd() * .2), y + Math.sin(a) * r * .45 + rnd() * 8, h0 + rnd() * (h1 - h0), 35); } };
    cluster('shrub', 760, 1010, 4, 70, 80, 100); cluster('shrub', 2300, 1700, 4, 72, 80, 100); cluster('shrub', 1240, 1560, 3, 56, 84, 104); cluster('shrub', 2560, 760, 4, 70, 80, 100); cluster('shrub', 1060, 1360, 3, 56, 82, 100); cluster('shrub', 2000, 1030, 3, 54, 80, 98);
    const drift = (x0, y0, x1, y1, n, amp, k, h0, h1) => { for (let i = 0; i < n; i++) { const t = i / (n - 1); const x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t + Math.sin(t * 5.5) * amp; put(k, x, y, h0 + rnd() * (h1 - h0), 40); if (i % 2) put(k, x + 26, y + 30, h0 * .9 + rnd() * (h1 - h0) * .8, 40); } };
    drift(820, 1540, 1380, 1680, 13, 36, 'wildflower', 62, 84);
    drift(1960, 1690, 2420, 1620, 10, 26, 'wildflower', 60, 82);
    drift(700, 520, 1000, 440, 8, 22, 'wildflower', 58, 78);
    drift(2560, 1180, 2900, 1060, 9, 24, 'wildflower', 60, 80);
    drift(1540, 1480, 1900, 1620, 9, 28, 'wildflower', 60, 82);
    // roses around the sign, wildflowers by the benches
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; flora.push({ k: 'rose', x: sign.x + Math.cos(a) * 95, y: sign.y + Math.sin(a) * 50 + 10, h: 62 + rnd() * 14, block: false }); }
    for (const f of flora.filter(f => f.k === 'bench')) { for (let i = 0; i < 3; i++) { const a = rnd() * Math.PI * 2; put('wildflower', f.x + Math.cos(a) * 70, f.y + 6 + Math.sin(a) * 18, 56 + rnd() * 16, 30); } }
    // bridge over the stream
    flora.push({ k: 'bridge', x: bridge.x, y: bridge.y + 30, h: 86, block: false });
    // lamp posts along the paths, alternating sides, fairy lights strung between neighbours
    for (const p of paths) { let acc = 0, side = 1, prev = null; for (let i = 0; i < p.length - 1; i++) { const [x1, y1] = p[i], [x2, y2] = p[i + 1]; const seg = Math.hypot(x2 - x1, y2 - y1); const nx = (x2 - x1) / seg, ny = (y2 - y1) / seg; for (let d = 0; d < seg; d += 10) { acc += 10; if (acc >= 330) { acc = 0; const x = x1 + nx * d - ny * 44 * side, y = y1 + ny * d + nx * 44 * side; if (Math.hypot(x - 1500, y - 1400) < 150 || nearPlace(x, y, 10) || nearStream(x, y, 30)) continue; const L = { x, y }; lamps.push(L); flora.push({ k: 'lamp', x, y, h: 118, block: true }); if (prev && Math.hypot(prev.x - x, prev.y - y) < 520) strings.push([prev, L]); prev = L; side *= -1; } } } }
    // fairy lights around the pond on little posts
    const ring = []; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; ring.push({ x: pond.x + Math.cos(a) * (pond.rx + 48), y: pond.y + Math.sin(a) * (pond.ry + 42), post: true }); } for (let i = 0; i < 12; i++) strings.push([ring[i], ring[(i + 1) % 12]]); for (const r of ring) soft.push({ k: 'post', x: r.x, y: r.y });
})();

function blocked(x, y) {
    if (x < 40 || x > WW - 40 || y < SKY + 60 || y > WH - 30) return true;
    const dx = (x - pond.x) / pond.rx, dy = (y - pond.y) / pond.ry; if (dx * dx + dy * dy < 1) return true;
    if (x > tent.x - tent.w * .42 && x < tent.x + tent.w * .42 && y > tent.y - tent.h * .45 && y < tent.y - 4) return true;
    if (Math.abs(x - sign.x) < 12 && y > sign.y - 24 && y < sign.y + 4) return true;
    for (const f of flora) { if (!f.block) continue; if (f.k === 'bench') { if (Math.abs(x - f.x) < 42 && y > f.y - 22 && y < f.y + 4) return true; continue; } if (f.k === 'lamp') { if (Math.abs(x - f.x) < 8 && y > f.y - 14 && y < f.y + 4) return true; continue; } if (Math.abs(x - f.x) < f.h * .12 && y > f.y - f.h * .12 && y < f.y + 4) return true; }
    if (nearStream(x, y, 22) && Math.abs(x - bridge.x) > 60) return true;
    return false;
}

/* --- the painted ground, drawn once --- */
let ground = null;
function buildGround() {
    ground = document.createElement('canvas'); ground.width = WW; ground.height = WH; const g = ground.getContext('2d');
    const gg = g.createLinearGradient(0, SKY, 0, WH); gg.addColorStop(0, '#163f2d'); gg.addColorStop(1, '#1e5a3e'); g.fillStyle = gg; g.fillRect(0, SKY - 6, WW, WH - SKY + 6);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${20 + Math.random() * 30},${70 + Math.random() * 40},${40 + Math.random() * 30},.25)`; g.beginPath(); g.ellipse(Math.random() * WW, SKY + Math.random() * (WH - SKY), 60 + Math.random() * 120, 25 + Math.random() * 50, 0, 0, 7); g.fill(); }
    g.strokeStyle = '#2d7a52'; g.lineWidth = 1.6; g.lineCap = 'round';
    for (let i = 0; i < 1600; i++) { const x = Math.random() * WW, y = SKY + 40 + Math.random() * (WH - SKY - 60), hh = 5 + Math.random() * 7; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - hh); g.moveTo(x, y); g.lineTo(x + 1, y - hh - 3); g.moveTo(x, y); g.lineTo(x + 4, y - hh + 1); g.stroke(); }
    for (let i = 0; i < 500; i++) { g.fillStyle = ['#f7d6e0', '#fff3b0', '#d9c8ff', '#cfe9ff', '#ffb3c7'][Math.random() * 5 | 0]; g.beginPath(); g.arc(Math.random() * WW, SKY + 60 + Math.random() * (WH - SKY - 80), 2.4, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(5,25,15,.28)'; for (const [x0, x1, y0, y1] of FORESTS) { g.beginPath(); g.ellipse((x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2 + 40, (y1 - y0) / 2 + 30, 0, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(120,200,120,.10)'; g.beginPath(); g.ellipse(1500, 1400, 260, 170, 0, 0, 7); g.fill();
    g.strokeStyle = '#2b4a3a'; g.lineWidth = 46; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); stream.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    g.strokeStyle = '#1d3f5e'; g.lineWidth = 30; g.beginPath(); stream.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke();
    for (const p of paths) { g.strokeStyle = '#3b3328'; g.lineWidth = 58; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); p.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); }
    for (const p of paths) { for (let i = 0; i < p.length - 1; i++) { const [x1, y1] = p[i], [x2, y2] = p[i + 1]; const seg = Math.hypot(x2 - x1, y2 - y1); const n = Math.ceil(seg / 11); const nx = (x2 - x1) / seg, ny = (y2 - y1) / seg; const px = -ny, py = nx; for (let k = 0; k < n; k++) { const x = x1 + (x2 - x1) * k / n, y = y1 + (y2 - y1) * k / n; for (let s = -2; s <= 2; s++) { if (Math.random() < .2) continue; const off = s * 11 + (k % 2) * 5 + Math.random() * 3; const sh = Math.random() * 18; g.fillStyle = `hsl(${28 + Math.random() * 10},${12 + Math.random() * 10}%,${34 + sh}%)`; g.beginPath(); g.ellipse(x + px * off, y + py * off, 5.5 + Math.random() * 2, 4 + Math.random() * 1.5, Math.atan2(ny, nx), 0, 7); g.fill(); } } } }
}

/* --- mist, lanterns, shooting stars --- */
const mistImg = (() => { const c = document.createElement('canvas'); c.width = 320; c.height = 140; const g = c.getContext('2d'); const r = g.createRadialGradient(160, 70, 0, 160, 70, 160); r.addColorStop(0, 'rgba(220,235,255,.55)'); r.addColorStop(.6, 'rgba(220,235,255,.18)'); r.addColorStop(1, 'rgba(220,235,255,0)'); g.save(); g.scale(1, 140 / 320); g.fillStyle = r; g.beginPath(); g.arc(160, 160, 160, 0, 7); g.fill(); g.restore(); return c; })();
const mists = []; (function () { let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; FORESTS.forEach(([x0, x1, y0, y1]) => { for (let i = 0; i < 5; i++) mists.push({ x0, x1, x: x0 + rnd() * (x1 - x0), y: y0 + rnd() * (y1 - y0), w: 240 + rnd() * 200, v: (6 + rnd() * 10) * (rnd() < .5 ? -1 : 1), a: .35 + rnd() * .35, ph: rnd() * 7 }); }); })();
const streamLen = (() => { const L = [0]; for (let i = 1; i < stream.length; i++) L.push(L[i - 1] + Math.hypot(stream[i][0] - stream[i - 1][0], stream[i][1] - stream[i - 1][1])); return L; })();
function streamPoint(d) { const tot = streamLen[streamLen.length - 1]; d = ((d % tot) + tot) % tot; for (let i = 1; i < stream.length; i++) { if (d <= streamLen[i]) { const u = (d - streamLen[i - 1]) / (streamLen[i] - streamLen[i - 1]); return [stream[i - 1][0] + (stream[i][0] - stream[i - 1][0]) * u, stream[i - 1][1] + (stream[i][1] - stream[i - 1][1]) * u]; } } return stream[stream.length - 1]; }
const shoot = { on: false, next: 4 };

/* ------------------------------------------------------------------ actors */

const hero = { x: 1430, y: 1345, dir: 'front', walk: 0, moving: false, emoji: '', name: '', h: 64 };
let npcs = [];
const keys = {};
const state = { inZone: false };
let cam = { x: 0, y: 0, s: 1 };
let active = false, raf = 0, last = 0, stepT = 0;
let scene = 'village';   // 'village' | 'tent'
let heroAnimal = null, others = [];

function makeNpcs(list) {
    let spare = 0;
    return list.map(a => {
        const s = NPC_SETUP[a.name] || { x: SPARE_SPOTS[spare % SPARE_SPOTS.length][0], y: SPARE_SPOTS[spare++ % SPARE_SPOTS.length][1], mode: 'walk', h: 56, speed: 60 };
        return { name: a.name, emoji: a.emoji, x: s.x, y: s.y, mode: s.mode, h: s.h, speed: s.speed || 60, lines: LINES[a.name] || DEFAULT_LINES,
            t: Math.random() * 3, dir: Math.random() < .5 ? -1 : 1, hop: 0, vx: 0, vy: 0, tx: s.x, ty: s.y, home: { x: s.x, y: s.y }, said: false };
    });
}

function updateNpc(n, dt) {
    n.t += dt;
    if (n.mode === 'hop') { if (n.t > 2.2 + Math.random() * 1.5) { n.t = 0; n.dir = Math.random() < .5 ? -1 : 1; n.hop = 1; n.vy = (Math.random() - .5) * 60; } if (n.hop > 0) { n.hop -= dt * 2.2; const nx = n.x + n.dir * 120 * dt, ny = n.y + n.vy * dt; if (!blocked(nx, ny) && Math.hypot(nx - n.home.x, ny - n.home.y) < 260) { n.x = nx; n.y = ny; } else { n.dir *= -1; } } }
    else if (n.mode === 'walk') { if (Math.hypot(n.tx - n.x, n.ty - n.y) < 8 || n.t > 6) { n.t = 0; n.tx = n.home.x + R(-260, 260); n.ty = n.home.y + R(-160, 160); } const dx = n.tx - n.x, dy = n.ty - n.y, L = Math.hypot(dx, dy) || 1; const nx = n.x + dx / L * n.speed * dt, ny = n.y + dy / L * n.speed * dt; if (!blocked(nx, ny)) { n.x = nx; n.y = ny; n.dir = dx < 0 ? -1 : 1; } else { n.t = 9; } }
    else if (n.mode === 'swim') { n.x += n.dir * 20 * dt; if (n.x > pond.x + pond.rx * .72 || n.x < pond.x - pond.rx * .72) n.dir *= -1; }
    else if (n.mode === 'dart') { if (n.t > 3 + Math.random() * 3) { n.t = 0; n.vx = (Math.random() < .5 ? -1 : 1) * 420; n.dir = Math.sign(n.vx); } n.vx *= .93; const nx = n.x + n.vx * dt; if (!blocked(nx, n.y)) n.x = nx; else n.vx *= -1; }
    const near = Math.hypot(hero.x - n.x, hero.y - n.y) < (n.mode === 'swim' ? 150 : 90);
    if (near && !n.said) { n.said = true; const ms = speak(n, n.lines, n.name); setTimeout(() => { n.said = false; }, ms + 1500); }
}

/* --- speech bubble, after Twizl --- */
let bubbleAnchor = null, bubbleTimer = null;
function speak(anchor, lines, who) {
    bubbleEl.innerHTML = '';
    if (who) { const b = document.createElement('b'); b.textContent = who; bubbleEl.appendChild(b); }
    bubbleEl.appendChild(document.createTextNode(lines[Math.random() * lines.length | 0]));
    bubbleAnchor = anchor; bubbleEl.classList.add('show');
    clearTimeout(bubbleTimer);
    const ms = Math.min(14000, 2200 + bubbleEl.textContent.length * 55);
    bubbleTimer = setTimeout(() => { bubbleEl.classList.remove('show'); }, ms);
    blip(800 + Math.random() * 300);
    return ms;
}

/* ------------------------------------------------------------------ drawing */

// scenery, drawn in code at (x, y) = bottom centre, h tall
function drawFlora(f, t) {
    const h = f.h, k = f.k;
    if (k === 'tree1' || k === 'tree2' || k === 'maple' || k === 'willow') {
        const pal = { tree1: ['#6e2f52', '#a85a80', '#c97a9c', '#e9a3bd'], tree2: ['#0f3622', '#1d5a3a', '#2a7a4c', '#49a068'], maple: ['#5a2412', '#9a4420', '#c0602a', '#e2904a'], willow: ['#1f4a32', '#3c7a4e', '#5a9a62', '#86c08a'] }[k];
        const sway = Math.sin(t * .8 + f.x * .01) * .012;
        const behind = hero.y < f.y && hero.y > f.y - h && Math.abs(hero.x - f.x) < h * .35;
        cx.save(); cx.translate(f.x, f.y); cx.rotate(sway); if (behind) cx.globalAlpha = .45;
        cx.fillStyle = '#2a1c12'; cx.fillRect(-h * .045, -h * .45, h * .09, h * .45);
        if (k === 'willow') {
            cx.fillStyle = pal[1]; cx.beginPath(); cx.ellipse(0, -h * .66, h * .34, h * .26, 0, 0, 7); cx.fill();
            cx.fillStyle = pal[2]; cx.beginPath(); cx.ellipse(-h * .08, -h * .72, h * .2, h * .14, 0, 0, 7); cx.fill();
            cx.strokeStyle = pal[2]; cx.lineWidth = 3; cx.lineCap = 'round';
            for (let i = 0; i < 11; i++) { const sx = -h * .32 + i * h * .064; const d = h * (.3 + .18 * Math.abs(Math.sin(i * 2.3))); cx.beginPath(); cx.moveTo(sx, -h * .62); cx.quadraticCurveTo(sx + Math.sin(t + i) * 4, -h * .62 + d * .6, sx + Math.sin(t * .7 + i) * 6, -h * .62 + d); cx.stroke(); }
        } else {
            const blobs = [[0, -h * .6, h * .3], [-h * .21, -h * .5, h * .22], [h * .21, -h * .52, h * .22], [0, -h * .78, h * .2]];
            cx.fillStyle = pal[1]; for (const [bx, by, br] of blobs) { cx.beginPath(); cx.arc(bx, by, br, 0, 7); cx.fill(); }
            cx.fillStyle = pal[2]; for (const [bx, by, br] of blobs) { cx.beginPath(); cx.arc(bx - br * .25, by - br * .25, br * .62, 0, 7); cx.fill(); }
            cx.fillStyle = pal[3]; cx.globalAlpha *= .7; for (let i = 0; i < 7; i++) { cx.beginPath(); cx.arc(Math.sin(i * 2.1) * h * .22, -h * .62 + Math.cos(i * 1.7) * h * .16, h * .022, 0, 7); cx.fill(); }
            cx.globalAlpha = behind ? .45 : 1; cx.fillStyle = pal[0]; cx.globalAlpha *= .35; cx.beginPath(); cx.ellipse(0, -h * .42, h * .3, h * .07, 0, 0, 7); cx.fill();
        }
        cx.restore();
        return;
    }
    if (k === 'shrub' || k === 'rose') {
        cx.fillStyle = '#163f28'; cx.beginPath(); cx.ellipse(f.x, f.y - h * .34, h * .5, h * .36, 0, 0, 7); cx.fill();
        cx.fillStyle = '#245f3a'; cx.beginPath(); cx.ellipse(f.x - h * .16, f.y - h * .44, h * .3, h * .24, 0, 0, 7); cx.fill(); cx.beginPath(); cx.ellipse(f.x + h * .2, f.y - h * .4, h * .28, h * .22, 0, 0, 7); cx.fill();
        if (k === 'rose') { const cols = ['#d13b5a', '#ff7a9a', '#d13b5a', '#ffb3c7']; for (let i = 0; i < 4; i++) { cx.fillStyle = cols[i]; cx.beginPath(); cx.arc(f.x + Math.sin(i * 2.4) * h * .3, f.y - h * .45 + Math.cos(i * 1.9) * h * .16, h * .07, 0, 7); cx.fill(); } }
        return;
    }
    if (k === 'wildflower') {
        const cols = ['#f7d6e0', '#fff3b0', '#d9c8ff', '#ffb3c7'];
        cx.strokeStyle = '#3f7a4a'; cx.lineWidth = 1.5;
        for (let i = 0; i < 4; i++) { const sx = f.x + (i - 1.5) * h * .16, top = f.y - h * (.55 + .12 * Math.sin(i * 1.3 + f.x)); cx.beginPath(); cx.moveTo(f.x + (i - 1.5) * h * .06, f.y); cx.quadraticCurveTo(sx, f.y - h * .3, sx, top); cx.stroke(); cx.fillStyle = cols[(i + Math.round(f.x / 37)) % 4]; cx.beginPath(); cx.arc(sx, top, h * .055, 0, 7); cx.fill(); }
        return;
    }
    if (k === 'bluebell') {
        cx.strokeStyle = '#3f7a4a'; cx.lineWidth = 1.5; cx.beginPath(); cx.moveTo(f.x, f.y); cx.quadraticCurveTo(f.x + 3, f.y - h * .5, f.x + 2, f.y - h * .9); cx.stroke();
        cx.fillStyle = '#7f8fe8'; for (let i = 0; i < 3; i++) { cx.beginPath(); cx.ellipse(f.x + 2 + (i % 2 ? 5 : -5), f.y - h * (.55 + i * .14), 4, 5.5, 0, 0, 7); cx.fill(); }
        return;
    }
    if (k === 'lamp') {
        cx.fillStyle = 'rgba(255,213,107,.13)'; cx.beginPath(); cx.ellipse(f.x, f.y + 4, 80, 30, 0, 0, 7); cx.fill();
        cx.fillStyle = '#2b2b33'; cx.fillRect(f.x - 3, f.y - h, 6, h); cx.fillRect(f.x - 9, f.y - 6, 18, 6);
        cx.fillStyle = '#3a3a44'; cx.fillRect(f.x - 9, f.y - h - 8, 18, 16);
        cx.save(); cx.shadowColor = '#ffd56b'; cx.shadowBlur = 22; cx.fillStyle = '#ffd56b'; cx.beginPath(); cx.arc(f.x, f.y - h, 5, 0, 7); cx.fill(); cx.restore();
        return;
    }
    if (k === 'bench') {
        cx.fillStyle = '#4a311d'; cx.fillRect(f.x - 34, f.y - 20, 6, 20); cx.fillRect(f.x + 28, f.y - 20, 6, 20);
        cx.fillStyle = '#6b4a2a'; cx.fillRect(f.x - 40, f.y - 26, 80, 8); cx.fillRect(f.x - 40, f.y - 46, 80, 6); cx.fillRect(f.x - 36, f.y - 46, 5, 20); cx.fillRect(f.x + 31, f.y - 46, 5, 20);
        return;
    }
    if (k === 'bridge') {
        cx.fillStyle = '#5a3e26'; cx.beginPath(); cx.roundRect(f.x - 85, f.y - 52, 170, 36, 6); cx.fill();
        cx.strokeStyle = '#3e2914'; cx.lineWidth = 1.5; for (let px = -78; px < 85; px += 12) { cx.beginPath(); cx.moveTo(f.x + px, f.y - 50); cx.lineTo(f.x + px, f.y - 18); cx.stroke(); }
        cx.strokeStyle = '#8a6a3a'; cx.lineWidth = 3; cx.beginPath(); cx.moveTo(f.x - 85, f.y - 66); cx.lineTo(f.x + 85, f.y - 66); cx.stroke(); for (let px = -85; px <= 85; px += 34) { cx.beginPath(); cx.moveTo(f.x + px, f.y - 66); cx.lineTo(f.x + px, f.y - 50); cx.stroke(); }
        return;
    }
}
function drawTent(t) {
    const x = tent.x, y = tent.y, h = tent.h, w = tent.w;
    const pulse = .35 + .25 * Math.sin(t * 2.2);
    cx.save(); cx.shadowColor = '#ff2fa0'; cx.shadowBlur = 30 + pulse * 40;
    cx.fillStyle = '#2b1f4a'; cx.beginPath(); cx.roundRect(x - w / 2, y - h * .55, w, h * .55, [0, 0, 14, 14]); cx.fill();
    cx.restore();
    // striped walls
    cx.save(); cx.beginPath(); cx.roundRect(x - w / 2, y - h * .55, w, h * .55, [0, 0, 14, 14]); cx.clip();
    for (let i = 0; i < 12; i++) { cx.fillStyle = i % 2 ? '#c9237d' : '#e8dcc0'; cx.fillRect(x - w / 2 + i * w / 12, y - h * .55, w / 12 + 1, h * .55); }
    cx.fillStyle = 'rgba(0,0,0,.25)'; cx.fillRect(x - w / 2, y - h * .12, w, h * .12);
    cx.restore();
    // roof: striped cone with a scalloped edge
    cx.save(); cx.beginPath(); cx.moveTo(x - w / 2 - 18, y - h * .55 + 6); cx.lineTo(x, y - h); cx.lineTo(x + w / 2 + 18, y - h * .55 + 6); cx.closePath(); cx.clip();
    for (let i = 0; i < 10; i++) { cx.fillStyle = i % 2 ? '#d02a86' : '#f3e9c6'; cx.beginPath(); cx.moveTo(x, y - h); cx.lineTo(x - w / 2 - 18 + i * (w + 36) / 10, y - h * .55 + 6); cx.lineTo(x - w / 2 - 18 + (i + 1) * (w + 36) / 10, y - h * .55 + 6); cx.closePath(); cx.fill(); }
    cx.restore();
    cx.fillStyle = '#f3e9c6'; for (let i = 0; i < 11; i++) { cx.beginPath(); cx.arc(x - w / 2 - 18 + (i + .5) * (w + 36) / 11, y - h * .55 + 6, (w + 36) / 22, 0, Math.PI); cx.fill(); }
    // flag and string lights along the eaves
    cx.fillStyle = '#35f0ff'; cx.beginPath(); cx.moveTo(x, y - h - 2); cx.lineTo(x + 26 + Math.sin(t * 3) * 3, y - h + 8); cx.lineTo(x, y - h + 16); cx.closePath(); cx.fill();
    cx.fillStyle = '#2b2b33'; cx.fillRect(x - 1.5, y - h - 14, 3, 16);
    for (let i = 0; i <= 10; i++) { const lx = x - w / 2 - 18 + i * (w + 36) / 10, ly = y - h * .55 + 14; const tw = .55 + .45 * Math.sin(t * 3 + i * 1.7); cx.fillStyle = ['#ffd56b', '#ffb3c7', '#9fd8ff', '#c9ffb0'][i % 4]; cx.globalAlpha = tw; cx.beginPath(); cx.arc(lx, ly, 3, 0, 7); cx.fill(); } cx.globalAlpha = 1;
    // door, glowing from inside
    cx.fillStyle = '#0a0612'; cx.beginPath(); cx.roundRect(x - 30, y - 92, 60, 92, [30, 30, 0, 0]); cx.fill();
    cx.fillStyle = `rgba(255,47,160,${.25 + pulse * .5})`; cx.beginPath(); cx.roundRect(x - 22, y - 80, 44, 80, [22, 22, 0, 0]); cx.fill();
    cx.fillStyle = 'rgba(53,240,255,.6)'; cx.fillRect(x - 60, y - 2, 120, 3);
}
function drawSign(t) {
    const x = sign.x, y = sign.y, h = sign.h;
    cx.fillStyle = '#3b2a12'; cx.fillRect(x - 5, y - h * .55, 10, h * .55);
    cx.fillStyle = '#d9b36b'; cx.beginPath(); cx.roundRect(x - 62, y - h, 124, h * .5, 8); cx.fill();
    cx.strokeStyle = '#6b4a2a'; cx.lineWidth = 3; cx.beginPath(); cx.roundRect(x - 62, y - h, 124, h * .5, 8); cx.stroke();
    cx.fillStyle = '#3b2a12'; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
    cx.font = '600 11px Fraunces, Georgia, serif'; cx.fillText('WELCOME TO', x, y - h + 24);
    cx.font = 'italic 700 26px Fraunces, Georgia, serif'; cx.fillText(TOWN, x, y - h + 56);
}
function drawLily(lx, ly, t) {
    const x = lx + Math.sin(t * .6 + lx) * 2;
    cx.save(); cx.translate(x, ly); cx.scale(1, .62);
    cx.fillStyle = '#3f8f5a'; cx.beginPath(); cx.moveTo(0, 0); cx.arc(0, 0, 22, .4, 6.0); cx.closePath(); cx.fill();
    cx.fillStyle = '#58ad6e'; cx.beginPath(); cx.moveTo(0, 0); cx.arc(0, 0, 13, .5, 5.9); cx.closePath(); cx.fill();
    cx.restore();
    if ((lx + ly) % 3 === 0) { cx.fillStyle = '#ffb3c7'; cx.beginPath(); cx.arc(x - 6, ly - 6, 4, 0, 7); cx.fill(); cx.fillStyle = '#fff3b0'; cx.beginPath(); cx.arc(x - 6, ly - 6, 1.6, 0, 7); cx.fill(); }
}
// emoji characters are drawn with an opaque fill: browsers apply the fill
// colour's alpha to colour emoji, which is how the first version went see-through
function drawEmoji(emoji, x, y, h, flip) {
    cx.save(); cx.translate(x, y); if (flip) cx.scale(-1, 1);
    cx.globalAlpha = 1; cx.fillStyle = '#000';
    cx.font = `${Math.round(h)}px sans-serif`; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic';
    cx.fillText(emoji, 0, 0);
    cx.restore();
}

function draw(t) {
    const W = innerWidth, H = innerHeight, dpr = devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cam.s = W < 700 ? .72 : 1; const vw = W / cam.s, vh = H / cam.s;
    cam.x = Math.max(0, Math.min(WW - vw, hero.x - vw / 2)); cam.y = Math.max(0, Math.min(WH - vh, hero.y - vh * .62));
    cx.save(); cx.scale(cam.s, cam.s); cx.translate(-cam.x, -cam.y);
    // night sky, stars, a shooting star now and then, the moon, the hill line
    const g = cx.createLinearGradient(0, 0, 0, SKY); g.addColorStop(0, '#05071a'); g.addColorStop(1, '#1a2a55'); cx.fillStyle = g; cx.fillRect(cam.x, cam.y, vw, Math.max(0, SKY - cam.y));
    for (const [sx, sy, tw] of stars) { if (sx < cam.x - 5 || sx > cam.x + vw + 5 || sy > cam.y + vh) continue; cx.globalAlpha = .4 + .6 * Math.abs(Math.sin(t * (.5 + tw) + tw * 9)); cx.fillStyle = '#fff'; cx.fillRect(sx, sy, 1.6, 1.6); } cx.globalAlpha = 1;
    if (cam.y < SKY) { if (!shoot.on && t > shoot.next) { shoot.on = true; shoot.t0 = t; shoot.x = cam.x + Math.random() * vw; shoot.y = 20 + Math.random() * 120; shoot.dx = (Math.random() < .5 ? -1 : 1) * (420 + Math.random() * 200); shoot.dy = 120 + Math.random() * 80; } if (shoot.on) { const u = (t - shoot.t0); if (u > 1) { shoot.on = false; shoot.next = t + 6 + Math.random() * 10; } else { const x = shoot.x + shoot.dx * u, y = shoot.y + shoot.dy * u; const L = 90; const sgn = shoot.dx / Math.abs(shoot.dx); const gg = cx.createLinearGradient(x, y, x - sgn * L, y - shoot.dy / Math.abs(shoot.dx) * L * .3); gg.addColorStop(0, `rgba(255,255,255,${Math.sin(u * Math.PI)})`); gg.addColorStop(1, 'rgba(255,255,255,0)'); cx.strokeStyle = gg; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(x, y); cx.lineTo(x - sgn * L, y - shoot.dy / Math.abs(shoot.dx) * L * .3); cx.stroke(); } } }
    const mx = 1500, my = 120, mr = 56; if (my + mr > cam.y) { cx.save(); cx.shadowColor = '#f3e9c6'; cx.shadowBlur = 50; cx.fillStyle = '#f3e9c6'; cx.beginPath(); cx.arc(mx, my, mr, 0, 7); cx.fill(); cx.restore(); }
    cx.fillStyle = '#0f2d22'; cx.beginPath(); cx.moveTo(0, SKY); for (let x = 0; x <= WW; x += 40) cx.lineTo(x, SKY - 40 - Math.sin(x / 260) * 28 - Math.sin(x / 90) * 10); cx.lineTo(WW, SKY); cx.fill();
    cx.drawImage(ground, cam.x, cam.y, vw, vh, cam.x, cam.y, vw, vh);
    // pond
    cx.fillStyle = '#17324d'; cx.beginPath(); cx.ellipse(pond.x, pond.y, pond.rx, pond.ry, 0, 0, 7); cx.fill(); cx.strokeStyle = '#9fb2c844'; cx.lineWidth = 1.5; for (let i = 0; i < 4; i++) { const r = ((t * 20 + i * 35) % 140); cx.beginPath(); cx.ellipse(pond.x - 80 + i * 50, pond.y + 10, r, r * .4, 0, 0, 7); cx.stroke(); }
    cx.fillStyle = '#fff'; cx.globalAlpha = .08; cx.beginPath(); cx.ellipse(pond.x + 40, pond.y - 50, 120, 35, 0, 0, 7); cx.fill(); cx.globalAlpha = 1;
    // stream shimmer
    cx.strokeStyle = 'rgba(180,220,255,.35)'; cx.lineWidth = 3; cx.setLineDash([14, 26]); cx.lineDashOffset = -t * 40; cx.beginPath(); stream.forEach(([x, y], i) => i ? cx.lineTo(x, y) : cx.moveTo(x, y)); cx.stroke(); cx.setLineDash([]);
    for (const [lx, ly] of lilies) drawLily(lx, ly, t);
    // soft ground decorations
    for (const d of soft) { if (d.x < cam.x - 120 || d.x > cam.x + vw + 120 || d.y < cam.y - 80 || d.y > cam.y + vh + 80) continue; if (d.k === 'post') { cx.fillStyle = '#3b2a12'; cx.fillRect(d.x - 3, d.y - 26, 6, 26); continue; } drawFlora(d, t); }
    // fireflies
    for (let i = 0; i < 60; i++) { const fx = ((i * 523) % WW) + Math.sin(t * .7 + i) * 18, fy = SKY + 150 + ((i * 877) % (WH - SKY - 250)) + Math.cos(t * .9 + i * 2) * 12; if (fx < cam.x - 10 || fx > cam.x + vw + 10 || fy < cam.y - 10 || fy > cam.y + vh + 10) continue; const a = Math.max(0, Math.sin(t * 1.3 + i)); cx.fillStyle = `rgba(220,255,140,${a * .9})`; cx.beginPath(); cx.arc(fx, fy, 1.8, 0, 7); cx.fill(); }
    // floating lanterns on the stream
    const vis = (x, y, m = 200) => x > cam.x - m && x < cam.x + vw + m && y > cam.y - m && y < cam.y + vh + m;
    for (let i = 0; i < 6; i++) { const [x, y] = streamPoint(t * 22 + i * 230); if (!vis(x, y)) continue; const bob = Math.sin(t * 2 + i) * 1.5; cx.fillStyle = 'rgba(255,170,80,.18)'; cx.beginPath(); cx.ellipse(x, y + 6, 26, 9, 0, 0, 7); cx.fill(); cx.save(); cx.shadowColor = '#ffb060'; cx.shadowBlur = 16; cx.fillStyle = '#ffd9a0'; cx.beginPath(); cx.arc(x, y - 4 + bob, 4.5, 0, 7); cx.fill(); cx.fillStyle = '#ff9a3c'; cx.beginPath(); cx.arc(x, y - 4 + bob, 2.2, 0, 7); cx.fill(); cx.restore(); }
    // drifting mist in the forests
    for (const m of mists) { m.x += m.v * (1 / 60); if (m.x < m.x0 - 120) m.x = m.x1 + 120; if (m.x > m.x1 + 120) m.x = m.x0 - 120; const y = m.y + Math.sin(t * .3 + m.ph) * 10; if (!vis(m.x, y, 300)) continue; cx.globalAlpha = m.a * (.7 + .3 * Math.sin(t * .5 + m.ph)); cx.drawImage(mistImg, m.x - m.w / 2, y - m.w * .22, m.w, m.w * .44); } cx.globalAlpha = 1;
    // everything that stands on the ground, sorted by its feet
    const items = [];
    for (const f of flora) { if (f.x < cam.x - 200 || f.x > cam.x + vw + 200 || f.y < cam.y - 50 || f.y > cam.y + vh + 300) continue; items.push({ y: f.y, draw: () => drawFlora(f, t) }); }
    items.push({ y: tent.y, draw: () => drawTent(t) });
    items.push({ y: sign.y, draw: () => drawSign(t) });
    for (const n of npcs) { if (n.x < cam.x - 100 || n.x > cam.x + vw + 100 || n.y < cam.y - 100 || n.y > cam.y + vh + 100) continue; items.push({ y: n.y, draw: () => {
        const hop = n.mode === 'hop' && n.hop > 0 ? Math.sin(n.hop * Math.PI) * 18 : 0;
        const walking = n.mode === 'walk' && Math.hypot(n.tx - n.x, n.ty - n.y) > 8;
        const bob = n.mode === 'swim' ? Math.sin(t * 3 + n.t) * 2 : walking ? Math.abs(Math.sin(t * 8 + n.home.x)) * 3 : Math.sin(t * 2 + n.home.y) * 1.2;
        if (n.mode !== 'swim') { cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.ellipse(n.x, n.y + 2, n.h * .3, 6, 0, 0, 7); cx.fill(); }
        drawEmoji(n.emoji, n.x, n.y - hop + bob + (n.mode === 'swim' ? n.h * .2 : 0), n.h, n.dir > 0);
        if (n.mode === 'swim') { cx.fillStyle = '#17324d'; cx.beginPath(); cx.ellipse(n.x, n.y - 2, n.h * .5, 8, 0, 0, 7); cx.fill(); cx.strokeStyle = '#9fb2c866'; cx.lineWidth = 1.2; cx.beginPath(); cx.ellipse(n.x, n.y - 2, n.h * .6 + Math.sin(t * 3) * 3, 10, 0, 0, 7); cx.stroke(); }
    } }); }
    items.push({ y: hero.y, draw: () => {
        const bob = hero.moving ? Math.abs(Math.sin(hero.walk)) * 6 : Math.sin(t * 2) * 1.5;
        const tilt = hero.moving ? Math.sin(hero.walk) * .05 : 0;
        cx.fillStyle = 'rgba(0,0,0,.45)'; cx.beginPath(); cx.ellipse(hero.x, hero.y + 2, hero.h * .32, 7, 0, 0, 7); cx.fill();
        cx.save(); cx.translate(hero.x, hero.y - bob); cx.rotate(tilt); drawEmoji(hero.emoji, 0, 0, hero.h, hero.dir === 'right'); cx.restore();
    } });
    items.sort((a, b) => a.y - b.y).forEach(i => i.draw());
    // the Main Stage marker
    { const px = tent.x, py = tent.y - tent.h - 18; if (vis(px, py)) { const near = state.inZone || Math.hypot(hero.x - px, hero.y - tent.y) < 300; const bob = Math.sin(t * 2.4 + tent.x) * 4; const txt = tent.label + (near ? '  ·  WALK IN' : ''); cx.font = '600 11px "DM Mono", ui-monospace, monospace'; const tw = cx.measureText(txt).width + 22; const bx = px - tw / 2, by = py - 30 + bob; cx.fillStyle = near ? '#f2c75c' : 'rgba(10,12,30,.82)'; cx.strokeStyle = near ? '#fff' : '#f2c75c'; cx.lineWidth = 1.2; cx.beginPath(); cx.roundRect(bx, by, tw, 20, 10); cx.fill(); cx.stroke(); cx.fillStyle = near ? '#2a1a00' : '#f2c75c'; cx.textAlign = 'center'; cx.textBaseline = 'alphabetic'; cx.fillText(txt, px, py - 16 + bob); cx.beginPath(); cx.moveTo(px - 5, py - 9 + bob); cx.lineTo(px + 5, py - 9 + bob); cx.lineTo(px, py - 3 + bob); cx.closePath(); cx.fillStyle = '#f2c75c'; cx.fill(); cx.fillStyle = 'rgba(255,213,107,.14)'; cx.beginPath(); cx.ellipse(tent.x, tent.y + 6, tent.h * .42, 22, 0, 0, 7); cx.fill(); } }
    // fairy-light strings
    for (const [A, B] of strings) { if (Math.max(A.x, B.x) < cam.x - 50 || Math.min(A.x, B.x) > cam.x + vw + 50) continue; const ay = A.y - (A.post ? 26 : 100), by = B.y - (B.post ? 26 : 100); const mx2 = (A.x + B.x) / 2, my2 = (ay + by) / 2 + Math.hypot(B.x - A.x, by - ay) * .12; cx.strokeStyle = 'rgba(0,0,0,.45)'; cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(A.x, ay); cx.quadraticCurveTo(mx2, my2, B.x, by); cx.stroke(); const n = Math.max(3, Math.round(Math.hypot(B.x - A.x, by - ay) / 34)); for (let i = 1; i < n; i++) { const u = i / n; const px = (1 - u) * (1 - u) * A.x + 2 * (1 - u) * u * mx2 + u * u * B.x, py = (1 - u) * (1 - u) * ay + 2 * (1 - u) * u * my2 + u * u * by; const tw = .55 + .45 * Math.sin(t * 3 + i * 1.7 + A.x * .01); cx.fillStyle = ['#ffd56b', '#ffb3c7', '#9fd8ff', '#c9ffb0'][(i + Math.round(A.x / 37)) % 4]; cx.globalAlpha = tw; cx.shadowColor = cx.fillStyle; cx.shadowBlur = 8; cx.beginPath(); cx.arc(px, py + 3, 2.2, 0, 7); cx.fill(); } cx.globalAlpha = 1; cx.shadowBlur = 0; }
    cx.restore();
    const vg = cx.createRadialGradient(W / 2, H / 2, H * .35, W / 2, H / 2, H * .95); vg.addColorStop(0, 'rgba(5,7,20,0)'); vg.addColorStop(1, 'rgba(5,7,20,.55)'); cx.fillStyle = vg; cx.fillRect(0, 0, W, H);
    if (bubbleAnchor) { bubbleEl.style.left = ((bubbleAnchor.x - cam.x) * cam.s) + 'px'; bubbleEl.style.top = ((bubbleAnchor.y - (bubbleAnchor.h || 60) - cam.y) * cam.s) + 'px'; }
}

/* --------------------------------------------------------------------- loop */

function tick(ts) {
    if (!active) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min(.05, (ts - last) / 1000 || 0); last = ts;
    if (scene === 'tent') { stageFrame(ts / 1000, dt); return; }
    if (!ground) buildGround();
    let vx = 0, vy = 0;
    if (keys.arrowleft || keys.a) vx -= 1; if (keys.arrowright || keys.d) vx += 1; if (keys.arrowup || keys.w) vy -= 1; if (keys.arrowdown || keys.s) vy += 1;
    hero.moving = !!(vx || vy);
    if (hero.moving) {
        const l = Math.hypot(vx, vy); vx /= l; vy /= l;
        if (Math.abs(vx) > Math.abs(vy)) hero.dir = vx < 0 ? 'left' : 'right'; else hero.dir = vy < 0 ? 'back' : 'front';
        const nx = hero.x + vx * SPEED * dt, ny = hero.y + vy * SPEED * dt;
        if (!blocked(nx, hero.y)) hero.x = nx; if (!blocked(hero.x, ny)) hero.y = ny;
        hero.walk += dt * 11; stepT += dt; if (stepT > .26) { stepT = 0; step(); }
    }
    // walking up to the Main Stage goes in; after coming back out you have to leave and return
    const inZone = hero.x > tent.x - tent.w * .42 - 40 && hero.x < tent.x + tent.w * .42 + 40 && hero.y > tent.y - tent.h * .45 - 40 && hero.y < tent.y + 40;
    if (inZone && !state.inZone) { state.inZone = true; openTent(); return; }
    if (!inZone) state.inZone = false;
    for (const n of npcs) updateNpc(n, dt);
    if (Math.hypot(hero.x - sign.x, hero.y - sign.y) < 120 && !sign.said) { sign.said = true; speak({ x: sign.x, y: sign.y - 120 }, SIGN_LINES, 'Town sign'); setTimeout(() => { sign.said = false; }, 15000); }
    draw(ts / 1000);
}

function openTent() {
    scene = 'tent';
    for (const k in keys) keys[k] = false;
    hero.moving = false;
    bubbleEl.classList.remove('show');
    worldEl.classList.remove('on'); tentEl.classList.add('on'); tentEl.scrollTop = 0;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    stageShow();
    if (window.AnimalGifs && heroAnimal) AnimalGifs.prefetch(heroAnimal).catch(() => {});
}
function backToTown() {
    if (seq.on) seqStop();
    shoutEl.classList.remove('on');
    hideDropGif();
    scene = 'village';
    tentEl.classList.remove('on'); worldEl.classList.add('on');
    for (const k in keys) keys[k] = false;
    hero.dir = 'front';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    last = performance.now();
}

/* -------------------------------------------------------------------- input */

function onKeyDown(e) {
    if (!active) return;
    const k = e.key.toLowerCase();
    if (scene === 'tent') { if (k === 'escape') { e.preventDefault(); backToTown(); } return; }
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (k === 'escape') { e.preventDefault(); stop(); return; }
    if (k === 'enter' || k === ' ') { if (state.inZone) openTent(); return; }
    keys[k] = true;
    ensureAudio();
}
function onKeyUp(e) { keys[e.key.toLowerCase()] = false; }
closeBtn.addEventListener('click', () => stop());

/* ------------------------------------------------------------- start / stop */

function start(animal, all) {
    stop();
    heroAnimal = animal; others = all.filter(a => a !== animal);
    hero.emoji = animal.emoji; hero.name = animal.name; hero.x = 1430; hero.y = 1345; hero.dir = 'front'; hero.walk = 0; hero.moving = false;
    npcs = makeNpcs(others);
    state.inZone = false; sign.said = false; bubbleAnchor = null; bubbleEl.classList.remove('show');
    for (const k in keys) keys[k] = false;
    scene = 'village';
    screenEl.classList.add('on'); worldEl.classList.add('on'); tentEl.classList.remove('on');
    document.body.style.overflow = 'hidden';
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    active = true; last = performance.now();
    raf = requestAnimationFrame(tick);
}
function stop() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    if (seq.on) seqStop();
    shoutEl.classList.remove('on');
    hideDropGif();
    bubbleEl.classList.remove('show'); clearTimeout(bubbleTimer);
    screenEl.classList.remove('on'); worldEl.classList.remove('on'); tentEl.classList.remove('on');
    document.body.style.overflow = '';
    scene = 'village';
}

/* --------------------------------------------------------------- main stage */
// Ported from Twizl's tent: Web Audio synth voices, a 16-step sequencer with
// five tracks, build / drop phases, and the stage canvas.

const STAGE = { play: '▶ Play the set', stop: '■ Stop the set', building: 'BUILDING…', dropShout: ['AIM', 'MAKE', 'SOME', 'NOISE'], track: 'Track {n}' };
const stageCanvas = document.getElementById('djStage');
const playBtn = document.getElementById('djPlay');
const dropBtn = document.getElementById('djDrop');
const tracksEl = document.getElementById('djTracks');
const bpmEl = document.getElementById('djBpm'), bpmvEl = document.getElementById('djBpmv');
const filtEl = document.getElementById('djFilt'), dlyEl = document.getElementById('djDly');
const cutEl = document.getElementById('djCut'), resEl = document.getElementById('djRes');
const hatdEl = document.getElementById('djHatd'), driveEl = document.getElementById('djDrive');
const phaseEl = document.getElementById('djPhase');
const shoutEl = document.getElementById('djShout');
const djGifEl = document.getElementById('djGif');
const djGifImg = document.getElementById('djGifImg');
const djGifNext = document.getElementById('djGifNext');
const isOn = () => active && scene === 'tent';

/* ---------- audio core ---------- */
let AC, master, analyser;
function ensureAudio() {
    if (!AC) {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) return false;
        AC = new Ctor(); master = AC.createGain(); master.gain.value = .8; analyser = AC.createAnalyser(); analyser.fftSize = 512;
        const lim = AC.createDynamicsCompressor(); lim.threshold.value = -8; lim.knee.value = 6; lim.ratio.value = 12; lim.attack.value = .003; lim.release.value = .12;
        master.connect(lim).connect(analyser); analyser.connect(AC.destination);
    }
    if (AC.state === 'suspended') AC.resume();
    return true;
}
let noiseBuf; function noise(){ if(!noiseBuf){ noiseBuf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate); const d=noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; } const s=AC.createBufferSource(); s.buffer=noiseBuf; s.loop=true; return s; }
function kick(t,out,level=1){ const o=AC.createOscillator(), g=AC.createGain(); o.frequency.setValueAtTime(180,t); o.frequency.exponentialRampToValueAtTime(44,t+.09); g.gain.setValueAtTime(level,t); g.gain.exponentialRampToValueAtTime(.001,t+.5); o.connect(g).connect(out); o.start(t); o.stop(t+.55); const s=AC.createOscillator(), sg=AC.createGain(); s.frequency.setValueAtTime(52,t); s.frequency.exponentialRampToValueAtTime(40,t+.3); sg.gain.setValueAtTime(level*.55,t+.02); sg.gain.exponentialRampToValueAtTime(.001,t+.42); s.connect(sg).connect(out); s.start(t); s.stop(t+.45); const c=noise(), cf=AC.createBiquadFilter(), cg=AC.createGain(); cf.type="highpass"; cf.frequency.value=3000; cg.gain.setValueAtTime(level*.25,t); cg.gain.exponentialRampToValueAtTime(.001,t+.03); c.connect(cf).connect(cg).connect(out); c.start(t); c.stop(t+.04); }
function hat(t,out,open,level=.35,freq=7500){ const s=noise(), f=AC.createBiquadFilter(), g=AC.createGain(); f.type="highpass"; f.frequency.value=freq; const d=open?.28:.05; g.gain.setValueAtTime(level,t); g.gain.exponentialRampToValueAtTime(.001,t+d); s.connect(f).connect(g).connect(out); s.start(t); s.stop(t+d+.02); }
function clap(t,out,level=.5){ for(let i=0;i<3;i++){ const s=noise(), f=AC.createBiquadFilter(), g=AC.createGain(); f.type="bandpass"; f.frequency.value=1800; f.Q.value=.8; const tt=t+i*.012; g.gain.setValueAtTime(level*(1-i*.2),tt); g.gain.exponentialRampToValueAtTime(.001,tt+.18); s.connect(f).connect(g).connect(out); s.start(tt); s.stop(tt+.2);} }
function acid(t,out,freq,cut,res,accent,len){ const o=AC.createOscillator(), f=AC.createBiquadFilter(), g=AC.createGain(); o.type="sawtooth"; o.frequency.value=freq; f.type="lowpass"; f.Q.value=1+res*res*30; const c=150+cut*cut*5000; const peak=Math.min(16000,c*(1.1+res*2.2)*(accent?1.8:1)+250); f.frequency.setValueAtTime(peak,t); f.frequency.exponentialRampToValueAtTime(Math.max(80,c*(.45-res*.25)),t+len*(.95-res*.5)); const lv=(accent?.75:.5)*(1-res*.25); g.gain.setValueAtTime(lv,t); g.gain.exponentialRampToValueAtTime(.001,t+len); o.connect(f).connect(g).connect(out); o.start(t); o.stop(t+len+.05); }
function sub(t,out,freq,len,level=.7,bright=0){ const o=AC.createOscillator(), o2=AC.createOscillator(), f=AC.createBiquadFilter(), g=AC.createGain(); o.type="sine"; o2.type="triangle"; o.frequency.setValueAtTime(freq*1.5,t); o.frequency.exponentialRampToValueAtTime(freq,t+.06); o2.frequency.value=freq; f.type="lowpass"; f.frequency.value=120+bright*900; const g2=AC.createGain(); g2.gain.value=.25+bright*.5; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(level,t+.02); g.gain.setValueAtTime(level,t+len*.6); g.gain.exponentialRampToValueAtTime(.001,t+len); o.connect(g); o2.connect(g2).connect(f).connect(g); g.connect(out); o.start(t); o2.start(t); o.stop(t+len+.05); o2.stop(t+len+.05); }
function pluck(t,out,freq,len,cut,res,level=.4){ const o=AC.createOscillator(), f=AC.createBiquadFilter(), g=AC.createGain(); o.type="square"; o.frequency.value=freq; f.type="lowpass"; f.Q.value=1+res*8; const c=200+cut*cut*3000; f.frequency.setValueAtTime(c*2.2+200,t); f.frequency.exponentialRampToValueAtTime(Math.max(80,c*.4),t+len*.7); g.gain.setValueAtTime(level,t); g.gain.exponentialRampToValueAtTime(.001,t+len); o.connect(f).connect(g).connect(out); o.start(t); o.stop(t+len+.05); }
function stab(t,out,freqs,len,cut,level=.16,detune=6){ const f=AC.createBiquadFilter(), g=AC.createGain(); f.type="lowpass"; f.Q.value=3; const c=300+cut*cut*5000; f.frequency.setValueAtTime(c*1.6+400,t); f.frequency.exponentialRampToValueAtTime(Math.max(150,c*.3),t+len); g.gain.setValueAtTime(level,t); g.gain.exponentialRampToValueAtTime(.001,t+len); f.connect(g).connect(out); freqs.forEach((fr,i)=>{ for(const d of [-detune,detune]){ const o=AC.createOscillator(); o.type="sawtooth"; o.frequency.value=fr; o.detune.value=d; o.connect(f); o.start(t); o.stop(t+len+.05); } }); }
function rim(t,out,level=.3){ const s=noise(), f=AC.createBiquadFilter(), g=AC.createGain(); f.type="bandpass"; f.frequency.value=2800; f.Q.value=6; g.gain.setValueAtTime(level,t); g.gain.exponentialRampToValueAtTime(.001,t+.05); s.connect(f).connect(g).connect(out); s.start(t); s.stop(t+.06); const o=AC.createOscillator(), og=AC.createGain(); o.frequency.value=1200; og.gain.setValueAtTime(level*.5,t); og.gain.exponentialRampToValueAtTime(.001,t+.03); o.connect(og).connect(out); o.start(t); o.stop(t+.04); }
function tom(t,out,freq=140,level=.5){ const o=AC.createOscillator(), g=AC.createGain(); o.frequency.setValueAtTime(freq*1.8,t); o.frequency.exponentialRampToValueAtTime(freq,t+.08); g.gain.setValueAtTime(level,t); g.gain.exponentialRampToValueAtTime(.001,t+.25); o.connect(g).connect(out); o.start(t); o.stop(t+.3); }
function rumble(t,out,level=.5,len=.4){ const s=noise(), f=AC.createBiquadFilter(), g=AC.createGain(); f.type="lowpass"; f.frequency.setValueAtTime(220,t); f.frequency.exponentialRampToValueAtTime(70,t+len); f.Q.value=4; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(level,t+.03); g.gain.exponentialRampToValueAtTime(.001,t+len); s.connect(f).connect(g).connect(out); s.start(t); s.stop(t+len+.05); }
function ride(t,out,level=.15){ const s=noise(), f=AC.createBiquadFilter(), g=AC.createGain(); f.type="bandpass"; f.frequency.value=6200; f.Q.value=1.2; g.gain.setValueAtTime(level,t); g.gain.exponentialRampToValueAtTime(.001,t+.35); s.connect(f).connect(g).connect(out); s.start(t); s.stop(t+.4); }
function tone(freq,t,out,type="triangle",len=.6,level=.3){ const o=AC.createOscillator(), g=AC.createGain(); o.type=type; o.frequency.value=freq; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(level,t+.02); g.gain.exponentialRampToValueAtTime(.001,t+len); o.connect(g).connect(out); o.start(t); o.stop(t+len+.05); }
function blip(f=600){ if(!AC) return; tone(f,AC.currentTime,master,"square",.06,.05); }
function step(){ if(!AC) return; const t=AC.currentTime; const s=noise(), f=AC.createBiquadFilter(), g=AC.createGain(); f.type="lowpass"; f.frequency.value=260+Math.random()*80; f.Q.value=.7; g.gain.setValueAtTime(.09,t); g.gain.exponentialRampToValueAtTime(.001,t+.11); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t+.12); const o=AC.createOscillator(), og=AC.createGain(); o.type="sine"; o.frequency.setValueAtTime(95+Math.random()*15,t); o.frequency.exponentialRampToValueAtTime(55,t+.09); og.gain.setValueAtTime(.07,t); og.gain.exponentialRampToValueAtTime(.001,t+.12); o.connect(og).connect(master); o.start(t); o.stop(t+.13); }

/* ---------- sequencer ---------- */
const seq={on:false, step:0, next:0, timer:null, phase:"groove", bar:0, buildBar:0, dropBar:0, bus:null, lastKick:0};
const N=n=>55*Math.pow(2,n/12);
const PATTERNS=[
  {name:"Acid", bass:[0,null,0,12,null,0,3,null,0,null,7,0,null,15,null,0], acc:[1,0,0,1,0,0,1,0,1,0,0,0,0,1,0,0],
   play(st,t,out,drop,p){ if(st%4===0){ kick(t,out,drop?1.15:1); seq.lastKick=t; } if(st%4===2) hat(t,out,true,drop?.5:.35); if(st%2===1) hat(t,out,false,.18,7500); if(st===4||st===12) clap(t,out,drop?.6:.45); const n=this.bass[st]; if(n!==null) acid(t,out,N(n),drop?Math.min(1,p.cut+.4):p.cut,p.res,this.acc[st],p.s16*1.1); if(drop&&st%8===6) tone(880,t,out,"square",.1,.08); }},
  {name:"Deep", bass:[0,null,null,null,null,null,0,null,null,null,-5,null,null,null,-2,null], acc:[1,0,0,0,0,0,0,0,0,0,1,0,0,0,0,0],
   play(st,t,out,drop,p){ if(st%4===0){ kick(t,out,drop?1.1:.95); rumble(t+.01,out,.35,.5); seq.lastKick=t; } if(st%2===1) hat(t,out,false,.07,9000); if(st===4||st===12) rim(t,out,.22); if(st%4===2) hat(t,out,true,.12,8500); const n=this.bass[st]; if(n!==null) sub(t,out,N(n)/2,p.s16*(st===0?5.5:3.5),.65,p.cut*.6); if(st%8===2) stab(t,out,[N(12),N(15),N(19),N(24)],p.s16*1.6,Math.min(.5,p.cut),.07,4); if(st===0&&seq.bar%2===0) stab(t,out,[N(0)/1,N(7),N(12)],p.s16*14,Math.min(.35,p.cut),.045,3); }},
  {name:"Hypno", bass:[0,0,0,0,0,0,0,0,3,3,0,0,-2,-2,0,0], acc:[1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0],
   play(st,t,out,drop,p){ if(st%4===0){ kick(t,out,drop?1.1:1); seq.lastKick=t; } if(st%2===0) ride(t,out,.11); if(st%2===1) hat(t,out,false,.14,8000); if(st===4||st===12) rim(t,out,.28); if(st===7||st===15) tom(t,out,st===7?150:110,.35); const n=this.bass[st]; if(n!==null) pluck(t,out,N(n),p.s16*.9,p.cut,p.res,st%4===0?.42:.3); const arp=[0,3,7,12,7,3][Math.floor((seq.bar*16+st)/2)%6]; if(st%2===0) tone(N(arp+24),t,out,"triangle",p.s16*1.4,.07); }},
  {name:"Rumble", bass:[0,null,null,0,null,null,0,null,0,null,null,-4,null,null,-2,null], acc:[1,0,0,0,0,0,1,0,1,0,0,1,0,0,0,0],
   play(st,t,out,drop,p){ if(st%4===0){ kick(t,out,drop?1.2:1.05); rumble(t+.02,out,.6,.55); seq.lastKick=t; } if(st%4===3&&seq.bar%2===1) kick(t,out,.35); for(let k=0;k<3;k++) if(st%2===0) hat(t+p.s16*2*k/3,out,false,.09,10000); if(st===4||st===12) clap(t,out,.3); const n=this.bass[st]; if(n!==null) sub(t,out,N(n)/2,p.s16*2.5,.6,p.cut*.4); if(seq.bar%2===0&&st===6) stab(t,out,[N(0),N(6),N(10)],p.s16*3,Math.min(.6,p.cut+.1),.11,12); if(drop&&st%4===2) ride(t,out,.12); }},
  {name:"Peak", bass:[0,12,0,12,0,12,3,15,0,12,0,12,-2,10,0,12], acc:[1,0,0,0,1,0,1,0,1,0,0,0,1,0,0,0],
   play(st,t,out,drop,p){ if(st%4===0){ kick(t,out,drop?1.2:1.05); seq.lastKick=t; } if(st%4===2) hat(t,out,true,.5,7500); if(st%2===1) hat(t,out,false,.22,8000); if(st===4||st===12) clap(t,out,.6); if(drop&&(st===14||st===15)) clap(t,out,.35); const n=this.bass[st]; if(n!==null) acid(t,out,N(n),Math.min(1,p.cut+.2),p.res*.7,this.acc[st],p.s16*.8); if([0,3,6,10,13].includes(st)) stab(t,out,[N(12),N(15),N(19),N(22)],p.s16*1.2,Math.min(.9,p.cut+.3),.13,8); if(drop&&st%8===4) tone(N(36),t,out,"square",.12,.06); }}
];
let patIdx=0; let BASS=PATTERNS[0].bass, ACC=PATTERNS[0].acc, TRACK=PATTERNS[0];
function makeDrive(k){ const n=2048, c=new Float32Array(n); for(let i=0;i<n;i++){ const x=i*2/n-1; c[i]=(1+k)*x/(1+k*Math.abs(x)); } return c; }
function seqStart(){ if(!ensureAudio()) return; if(seq.on) return; if(!seq.bus){ seq.bus=AC.createGain(); seq.bus.gain.value=.9; seq.drive=AC.createWaveShaper(); seq.drive.curve=makeDrive(3); seq.drive.oversample="2x"; seq.filter=AC.createBiquadFilter(); seq.filter.type="lowpass"; seq.filter.frequency.value=18000; seq.filter.Q.value=1.2; seq.delay=AC.createDelay(1); seq.fb=AC.createGain(); seq.fb.gain.value=.42; seq.send=AC.createGain(); seq.send.gain.value=.25; const dlf=AC.createBiquadFilter(); dlf.type="highpass"; dlf.frequency.value=600; seq.bus.connect(seq.drive).connect(seq.filter).connect(master); seq.filter.connect(seq.send).connect(seq.delay).connect(dlf).connect(seq.fb).connect(seq.delay); dlf.connect(master); const ir=AC.createBuffer(2,AC.sampleRate*2.4,AC.sampleRate); for(let ch=0;ch<2;ch++){ const d=ir.getChannelData(ch); for(let i=0;i<d.length;i++){ d[i]=(Math.random()*2-1)*Math.pow(1-i/d.length,2.6)*(i<400?i/400:1); } } seq.rev=AC.createConvolver(); seq.rev.buffer=ir; seq.revSend=AC.createGain(); seq.revSend.gain.value=.1; const rhf=AC.createBiquadFilter(); rhf.type="highpass"; rhf.frequency.value=350; seq.filter.connect(seq.revSend).connect(rhf).connect(seq.rev).connect(master); applyFx(); } seq.on=true; seq.step=0; seq.bar=0; seq.next=AC.currentTime+.05; seq.timer=setInterval(schedule,25); playBtn.textContent=STAGE.stop; playBtn.classList.add("on"); }
function seqStop(){ seq.on=false; clearInterval(seq.timer); seq.phase="groove"; playBtn.textContent=STAGE.play; playBtn.classList.remove("on"); phaseEl.textContent=""; }
function schedule(){
  const bpm=+bpmEl.value, s16=60/bpm/4;
  while(seq.next<AC.currentTime+.12){
    const t=seq.next, st=seq.step%16, out=seq.bus;
    const cut=cutEl.value/100, res=resEl.value/100, chaos=hatdEl.value/100;
    if(st===0){ seq.delay.delayTime.setTargetAtTime(s16*3,t,.05); }
    const ph=seq.phase; const bb=seq.buildBar;
    if(ph==="groove"||ph==="drop"){
      TRACK.play(st,t,out,ph==="drop",{cut,res,s16});
      if(Math.random()<chaos*.6) hat(t,out,false,.12+chaos*.25,7500+(Math.random()-.5)*chaos*5000); if(chaos>.45&&Math.random()<(chaos-.45)*1.2){ for(let k=1;k<4;k++) hat(t+s16*k/4,out,false,.1+chaos*.25,6000+Math.random()*4000); } if(chaos>.25&&Math.random()<chaos*.3) hat(t+s16/2,out,true,.2+chaos*.2);
    } else if(ph==="build"){
      const prog=(bb*16+st)/(8*16);
      if(bb<6 && st%4===0){ kick(t,out,1-prog*.5); seq.lastKick=t; }
      if(st%(prog<.5?2:1)===0) hat(t,out,false,.15+prog*.35);
      if(bb>=4 && st%(bb>=7?1:2)===0) clap(t,out,.2+prog*.5);
      const n=BASS[st]; if(n!==null) acid(t,out,55*Math.pow(2,n/12),Math.min(1,cut*.6+prog*.7),Math.min(1,res+prog*.4),ACC[st],s16);
      if(st===0 && bb===0){ const s=noise(), f=AC.createBiquadFilter(), g=AC.createGain(); f.type="bandpass"; f.Q.value=1.5; f.frequency.setValueAtTime(200,t); f.frequency.exponentialRampToValueAtTime(9000,t+8*16*s16); g.gain.setValueAtTime(.02,t); g.gain.linearRampToValueAtTime(.35,t+8*16*s16); g.gain.setValueAtTime(0,t+8*16*s16+.01); s.connect(f).connect(g).connect(out); s.start(t); s.stop(t+8*16*s16+.05); }
    }
    seq.next+=s16; seq.step++;
    if(seq.step%16===0){ seq.bar++;
      if(ph==="build"){ seq.buildBar++; phaseEl.textContent="BUILDING"; if(seq.buildBar>=8){ seq.phase="drop"; seq.dropBar=0; phaseEl.textContent="DROP"; if(isOn()) shout(STAGE.dropShout, showDropGif); } }
      else if(ph==="drop"){ seq.dropBar++; if(seq.dropBar>=12){ seq.phase="groove"; phaseEl.textContent="groove"; } }
    }
  }
}
function shout(words, done){ let i=0; const tickW=()=>{ if(i>=words.length||!isOn()){ shoutEl.classList.remove("on"); if(done&&isOn()) done(); return; } shoutEl.textContent=words[i++]; shoutEl.classList.add("on"); setTimeout(tickW,420); }; tickW(); }
playBtn.onclick=()=>{ seq.on?seqStop():seqStart(); };
bpmEl.oninput=e=>bpmvEl.textContent=e.target.value;
function applyFx(){ if(!seq.filter||!AC) return; const t=AC.currentTime; const f=filtEl.value/100; seq.filter.frequency.setTargetAtTime(200*Math.pow(90,f),t,.03); seq.filter.Q.value=1+(1-f)*6; const dw=dlyEl.value/100; seq.send.gain.setTargetAtTime(dw*.8,t,.03); seq.fb.gain.setTargetAtTime(.25+dw*.5,t,.03); if(seq.revSend) seq.revSend.gain.setTargetAtTime(dw*dw*1.1,t,.03); const dv=driveEl.value/100; seq.drive.curve=makeDrive(1+dv*dv*40); seq.bus.gain.value=.9-dv*.45; }
[filtEl,dlyEl,driveEl].forEach(el=>el.oninput=applyFx);
function setTrack(i){ patIdx=i; TRACK=PATTERNS[i]; BASS=TRACK.bass; ACC=TRACK.acc; [...tracksEl.querySelectorAll("button")].forEach((b,k)=>b.classList.toggle("on",k===i)); phaseEl.textContent=STAGE.track.replace("{n}",i+1)+" · "+TRACK.name; if(!seq.on) seqStart(); }
PATTERNS.forEach((p,i)=>{ const b=document.createElement("button"); b.type="button"; b.textContent=(i+1)+" "+p.name; b.onclick=()=>setTrack(i); if(i===0) b.classList.add("on"); tracksEl.appendChild(b); });
dropBtn.onclick=()=>{ if(!seq.on) seqStart(); if(!seq.on) return; if(seq.phase!=="build"){ seq.phase="build"; seq.buildBar=0; phaseEl.textContent=STAGE.building; } };
document.getElementById('djBack').onclick=()=>{ if(isOn()) backToTown(); };

/* ---------- stage canvas ---------- */
const confetti=[]; let stageT0=0; const jellies=[], bubbles=[];
function stageShow(){ stageT0=performance.now(); jellies.length=0; bubbles.length=0; confetti.length=0; phaseEl.textContent=''; playBtn.textContent=seq.on?STAGE.stop:STAGE.play; hideDropGif(); }

// After the drop (and the shout), the animal's gif comes up over the stage with a Next GIF button.
let dropGifRequest = 0;
function showDropGif(){ if(!isOn()) return; djGifEl.classList.add('on'); nextDropGif(); }
function hideDropGif(){ djGifEl.classList.remove('on'); djGifImg.src=''; djGifImg.alt=''; dropGifRequest++; }
function nextDropGif(){
    if(!heroAnimal||!window.AnimalGifs) return;
    const animal=heroAnimal, token=++dropGifRequest;
    djGifImg.src=''; djGifImg.alt='Loading a '+animal.name.toLowerCase()+'...';
    AnimalGifs.next(animal).then(url=>{ if(token!==dropGifRequest||!isOn()) return; djGifImg.src=url; djGifImg.alt='Cute '+animal.name.toLowerCase(); },
        ()=>{ if(token!==dropGifRequest) return; djGifImg.alt='No '+animal.name.toLowerCase()+' gif tonight, sorry'; });
}
djGifNext.onclick=nextDropGif;
function stageFrame(t, dt){
  const c=stageCanvas, x=c.getContext("2d");
  const dpr=window.devicePixelRatio||1;
  c.width=c.clientWidth*dpr; c.height=c.clientHeight*dpr; x.setTransform(dpr,0,0,dpr,0,0); const w=c.clientWidth,h=c.clientHeight;
  if(!w||!h) return;
  const bpm=+bpmEl.value;
  const since=AC?AC.currentTime-seq.lastKick:9; const beat=seq.on?Math.max(0,1-since*3.2):0; const drop=seq.phase==="drop", build=seq.phase==="build";
  // room
  x.fillStyle="#000"; x.fillRect(0,0,w,h); if(drop&&beat>.5){ x.fillStyle=`hsla(${(t*300)%360},80%,50%,${(beat-.5)*.18})`; x.fillRect(0,0,w,h); }
  // projector screen with an ocean backdrop
  { const sx=w*.2, sy=h*.04, sw=w*.6, sh=h*.26; x.fillStyle="#0a0a12"; x.fillRect(sx-6,sy-6,sw+12,sh+12); x.save(); x.beginPath(); x.rect(sx,sy,sw,sh); x.clip();
    const sky=x.createLinearGradient(0,sy,0,sy+sh*.55); sky.addColorStop(0,"#ff8a5b"); sky.addColorStop(.5,"#ffb07a"); sky.addColorStop(1,"#f7d6a0"); x.fillStyle=sky; x.fillRect(sx,sy,sw,sh);
    x.fillStyle="#fff2c0"; x.shadowColor="#ffd27a"; x.shadowBlur=30; x.beginPath(); x.arc(sx+sw*.5,sy+sh*.5,sh*.16,0,7); x.fill(); x.shadowBlur=0;
    const sea=x.createLinearGradient(0,sy+sh*.5,0,sy+sh); sea.addColorStop(0,"#2a7fb8"); sea.addColorStop(1,"#0b2f55"); x.fillStyle=sea; x.fillRect(sx,sy+sh*.5,sw,sh*.5);
    for(let k=0;k<7;k++){ const yy=sy+sh*(.52+k*.07); x.strokeStyle=`rgba(255,255,255,${.12+k*.04})`; x.lineWidth=1.2+k*.3; x.beginPath(); for(let px=0;px<=sw;px+=8){ x.lineTo(sx+px,yy+Math.sin(px/(26+k*6)+t*(1.1+k*.15)+k)*(2+k*.8)); } x.stroke(); }
    x.fillStyle=`rgba(255,220,150,${.18+beat*.1})`; x.beginPath(); x.ellipse(sx+sw*.5,sy+sh*.62,sw*.06,sh*.3,0,0,7); x.fill();
    // after about eight seconds the screen sinks into the deep sea
    const age=(performance.now()-stageT0)/1000; const mix=Math.max(0,Math.min(1,(age-8)/2.5));
    if(mix>0){ x.globalAlpha=mix; const deep=x.createLinearGradient(0,sy,0,sy+sh); deep.addColorStop(0,"#0b3d6b"); deep.addColorStop(.5,"#051e3c"); deep.addColorStop(1,"#02091a"); x.fillStyle=deep; x.fillRect(sx,sy,sw,sh);
      for(let k=0;k<5;k++){ const rx=sx+sw*(.1+k*.2)+Math.sin(t*.3+k)*sw*.04; const rg=x.createLinearGradient(rx,sy,rx+sw*.08,sy+sh); rg.addColorStop(0,"rgba(120,200,255,.16)"); rg.addColorStop(1,"rgba(120,200,255,0)"); x.fillStyle=rg; x.beginPath(); x.moveTo(rx-sw*.02,sy); x.lineTo(rx+sw*.03,sy); x.lineTo(rx+sw*.16,sy+sh); x.lineTo(rx+sw*.04,sy+sh); x.fill(); }
      const mkJ=(v)=>({u:.1+Math.random()*.8,v,r:sh*(.13+Math.random()*.12),hue:[300,190,330,170][Math.random()*4|0],ph:Math.random()*7,sp:.06+Math.random()*.06}); if(!jellies.length){ for(let k=0;k<4;k++) jellies.push(mkJ(.25+Math.random()*.9)); } if(jellies.length<7&&Math.random()<.015) jellies.push(mkJ(1.2));
      for(let i=jellies.length-1;i>=0;i--){ const j=jellies[i]; const pulse=.5+.5*Math.sin(t*2.2+j.ph+beat*2); j.v-=j.sp*dt*(1+pulse*.8); j.u+=Math.sin(t*.4+j.ph)*.0006; if(j.v<-.3){ jellies.splice(i,1); continue; } const jx=sx+sw*j.u, jy=sy+sh*j.v; const rr=j.r*(.85+pulse*.25);
        x.save(); x.shadowColor=`hsl(${j.hue} 90% 70%)`; x.shadowBlur=26; x.strokeStyle=`hsla(${j.hue},90%,75%,.7)`; x.lineWidth=1.2; for(let k=0;k<6;k++){ const tx0=jx-rr*.7+k*rr*.28; x.beginPath(); x.moveTo(tx0,jy+rr*.1); for(let q=1;q<=5;q++){ x.lineTo(tx0+Math.sin(t*3+q*.9+k+j.ph)*rr*.12,jy+rr*.1+q*rr*.35); } x.stroke(); }
        const bg=x.createRadialGradient(jx,jy-rr*.2,rr*.1,jx,jy,rr); bg.addColorStop(0,`hsla(${j.hue},90%,85%,.95)`); bg.addColorStop(1,`hsla(${j.hue},90%,60%,.55)`); x.fillStyle=bg; x.beginPath(); x.ellipse(jx,jy,rr,rr*(.72-pulse*.12),0,Math.PI,0); x.lineTo(jx+rr,jy+rr*.1); x.quadraticCurveTo(jx,jy+rr*.35,jx-rr,jy+rr*.1); x.closePath(); x.fill(); x.restore(); }
      if(bubbles.length<30&&Math.random()<.3) bubbles.push({u:Math.random(),v:1.05,r:1+Math.random()*2.5,sp:.06+Math.random()*.08,ph:Math.random()*7});
      for(let i=bubbles.length-1;i>=0;i--){ const bb=bubbles[i]; bb.v-=bb.sp*dt; if(bb.v<-.05){ bubbles.splice(i,1); continue; } x.strokeStyle="rgba(200,230,255,.5)"; x.lineWidth=1; x.beginPath(); x.arc(sx+sw*bb.u+Math.sin(t*2+bb.ph)*4,sy+sh*bb.v,bb.r,0,7); x.stroke(); }
      x.fillStyle="rgba(180,220,255,.5)"; for(let k=0;k<40;k++){ const px=sx+((k*97)%sw), py=sy+((k*61+t*6)%sh); x.fillRect(px,py,1,1); }
      x.globalAlpha=1; }
    if(seq.on){ x.fillStyle=`rgba(255,255,255,${beat*.12})`; x.fillRect(sx,sy,sw,sh); }
    x.restore(); x.strokeStyle="#2a2a3a"; x.lineWidth=3; x.strokeRect(sx-6,sy-6,sw+12,sh+12); }
  // lighting truss along the top
  { x.fillStyle="#15151e"; x.fillRect(0,0,w,h*.025); for(let i=0;i<9;i++){ const lx=w*(.06+i*.11); const on=seq.on&&((Math.floor(t*(bpm/60)*2)+i)%3===0); x.fillStyle="#222"; x.fillRect(lx-7,h*.02,14,10); x.fillStyle=on?["#ff2fa0","#35f0ff","#f2c75c"][i%3]:"#3a3a48"; if(on){ x.shadowColor=x.fillStyle; x.shadowBlur=14; } x.beginPath(); x.arc(lx,h*.02+13,5,0,7); x.fill(); x.shadowBlur=0; } }
  // sweeping lights
  for(let i=0;i<4;i++){ const a=Math.sin(t*(.6+i*.2)+i)*.9; const col=drop?["#fff","#35f0ff","#fff","#ff2fa0"][i]:["#ff2fa0","#35f0ff","#f2c75c","#9fd8ff"][i]; x.save(); x.translate(w*(.2+i*.2),0); x.rotate(a*.5); x.globalAlpha=(seq.on?.18:.07)+beat*.2; const g=x.createLinearGradient(0,0,0,h); g.addColorStop(0,col); g.addColorStop(1,"transparent"); x.fillStyle=g; x.beginPath(); x.moveTo(-14,0); x.lineTo(14,0); x.lineTo(90,h); x.lineTo(-90,h); x.fill(); x.restore(); }
  x.globalAlpha=1;
  // lasers
  if(seq.on){ for(let i=0;i<(drop?8:3);i++){ x.strokeStyle=i%2?"#35f0ff":"#ff2fa0"; x.globalAlpha=.35+beat*.5; x.lineWidth=1.2; x.beginPath(); x.moveTo(w*.5,h*.28); x.lineTo(w*(.5+Math.sin(t*1.7+i*.8)*.6),h*(1.1)); x.stroke(); } x.globalAlpha=1; }
  // stage platform + booth + the DJ (the animal the wheel picked)
  x.fillStyle="#1a1230"; x.fillRect(0,h*.42,w,h*.08); x.fillStyle="#2b1f4a"; x.fillRect(w*.36,h*.3,w*.28,h*.14); x.fillStyle="#35f0ff"; x.globalAlpha=.6+beat*.4; x.fillRect(w*.38,h*.36,w*.24,3); x.globalAlpha=1;
  if(heroAnimal){ const bob=seq.on?Math.abs(Math.sin(t*(bpm/60*Math.PI)))*6:0; x.globalAlpha=1; x.fillStyle="#000"; x.font=`${Math.round(h*.2)}px sans-serif`; x.textAlign="center"; x.textBaseline="alphabetic"; x.fillText(heroAnimal.emoji,w*.5,h*.31-bob); }
  // speakers
  for(const sx of [w*.04,w*.11,w*.82,w*.89]){ x.fillStyle="#111"; x.fillRect(sx,h*.14,w*.06,h*.34); x.strokeStyle="#2a2a2a"; x.lineWidth=1; x.strokeRect(sx,h*.14,w*.06,h*.34); for(const [yy,rr] of [[.21,.014],[.31,.02],[.42,.022]]){ x.fillStyle="#2b2b2b"; x.beginPath(); x.arc(sx+w*.03,h*yy,w*rr*(1+beat*.18),0,7); x.fill(); x.fillStyle="#444"; x.beginPath(); x.arc(sx+w*.03,h*yy,w*rr*.35,0,7); x.fill(); } x.fillStyle=seq.on?`rgba(53,240,255,${.5+beat*.5})`:"#223"; x.fillRect(sx+w*.005,h*.16,w*.05,2); }
  for(const bx of [w*.2,w*.3,w*.62,w*.72]){ x.fillStyle="#0e0e14"; x.fillRect(bx,h*.44,w*.08,h*.07); x.fillStyle="#262630"; x.beginPath(); x.arc(bx+w*.04,h*.475,h*.024*(1+beat*.25),0,7); x.fill(); }
  x.fillStyle="#35f0ff"; x.globalAlpha=.7+beat*.3; x.font=`700 ${Math.round(h*.028)}px "DM Mono", ui-monospace, monospace`; x.textAlign="center"; x.textBaseline="alphabetic"; x.fillText(heroAnimal?("DJ "+heroAnimal.name).toUpperCase():TOWN,w*.5,h*.425); x.globalAlpha=1;
  // crowd in three rows: everyone else from the wheel
  const rows=[[h*.62,.09],[h*.76,.11],[h*.92,.13]];
  const n=Math.max(1,Math.ceil(others.length/3));
  others.forEach((a,i)=>{ const r=rows[i%3]; const col=Math.floor(i/3); const cx2=w*(.1+(col+.5+(i%3)*.33)/n*.8)+Math.sin(t*.5+i)*6; const jump=seq.on?Math.max(0,Math.sin(t*(bpm/60)*Math.PI*2+i))*(drop?26:build?14:9)*(.4+beat):Math.sin(t*2+i)*2; x.save(); x.translate(cx2,r[0]-jump); if(i%2) x.scale(-1,1); x.globalAlpha=1; x.fillStyle="#000"; x.font=`${Math.round(h*r[1]*1.4)}px sans-serif`; x.textAlign="center"; x.textBaseline="alphabetic"; x.fillText(a.emoji,0,0); x.restore(); });
  // confetti
  if(drop&&Math.random()<.6) confetti.push({x:Math.random()*w,y:-10,vy:60+Math.random()*120,vx:(Math.random()-.5)*40,c:["#ff2fa0","#35f0ff","#f2c75c","#c9ffb0","#fff"][Math.random()*5|0],r:Math.random()*6.28});
  for(const p of confetti){ p.y+=p.vy*dt; p.x+=p.vx*dt; p.r+=dt*4; x.save(); x.translate(p.x,p.y); x.rotate(p.r); x.fillStyle=p.c; x.fillRect(-4,-2,8,4); x.restore(); }
  for(let i=confetti.length-1;i>=0;i--) if(confetti[i].y>h+10) confetti.splice(i,1);
  // strobe on the drop
  if(drop&&beat>.6){ x.fillStyle=`rgba(255,255,255,${(beat-.6)*.35})`; x.fillRect(0,0,w,h); }
}

window.Adventure = {
    start, stop,
    // for headless tests
    _debug: { WW, WH, SKY, tent, sign, pond, bridge, blocked, hero, showDropGif, hideDropGif, get npcs() { return npcs; }, get state() { return { scene, active, inZone: state.inZone }; } },
};
})();
