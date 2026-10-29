// adventure.js: the #adventure joke mode for the team meeting timer.
//
// After the wheel lands you ARE that animal. Walk around a small village and
// bump into the other animals you could have been; walk into the Main Stage
// to play a DJ set. The DJ set (synth engine, sequencer, stage visuals) is
// ported from Twizl, the game Aidan's partner made, used with permission, with
// the DJ swapped for the chosen animal and the shrew cameo removed.
//
// Loaded before script_6.js, which calls Adventure.start(animal, allAnimals)
// when the wheel stops in #adventure mode and Adventure.stop() when the
// meeting moves on.
(function () {
'use strict';

/* ------------------------------------------------------------------ village */

const TILE = 32;
// . grass  : flowers  = path  # tree  ~ water  S stage building  D its door  ! sign
const MAP = [
    '######################',
    '#..:.....SSSSS.....:.#',
    '#...#....SSSSS....#..#',
    '#.:......SSDSS.......#',
    '#..........=!........#',
    '#....#.....=.........#',
    '#..........=....#....#',
    '#......=========.....#',
    '#......=========.....#',
    '#.~~~..=========..#..#',
    '#.~~~~...:......:....#',
    '#..~~.....#..........#',
    '######################',
];
const COLS = MAP[0].length, ROWS = MAP.length;
MAP.forEach((row, i) => { if (row.length !== COLS) throw new Error('map row ' + i + ' is ' + row.length + ' wide'); });
const WALKABLE = new Set(['.', ':', '=', 'D']);
const DOOR = { x: 11, y: 3 };
const SIGN = { x: 12, y: 4 };
const START = { x: 11, y: 8 };
const AFTER_STAGE = { x: 11, y: 4 };
const NPC_SPOTS = [[5, 8], [17, 8], [8, 5], [15, 5], [7, 10], [13, 11], [3, 4], [19, 3]];
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const MOVE_TIME = 0.16;   // seconds per tile

const LINES = {
    'Rabbit': [
        'I was this close to being this week\'s animal. I had a gif ready and everything.',
        'Anyway. Someone\'s on the decks at the Main Stage. It\'s up the path.',
    ],
    'Red Panda': [
        'I had the whole of October. People said I looked like a raccoon. The emoji didn\'t help.',
        'The stage is up there. I\'ll be at the back, not dancing.',
    ],
    'Duck': [
        'Duckling, strictly. The grown-up duck gifs kept turning out to be a hockey team.',
        'Quack. That one was for the minutes.',
    ],
    'Cat': [
        'My gif was me pushing a mug off a desk. It was a metaphor for ops.',
        'I\'m not going to the stage. I\'m busy. Sitting.',
    ],
    'Dog': [
        'YOU\'RE HERE. Hi. Hi. I saw the wheel. I saw the WHOLE wheel.',
        'Go to the Main Stage. I\'ll be right behind you. Or in front. Or in the way.',
    ],
    'Otter': [
        'We hold hands while we sleep so nobody drifts off. Same idea as a team meeting.',
        'The Main Stage is through the door up there. Wait for the drop.',
    ],
    'Capybara': [
        'Everyone gets on with me. It isn\'t a strategy, but it\'s working.',
        'The hot spring is shut. The stage is open.',
    ],
    'Penguin': [
        'Baby penguin, strictly. The adult penguin gifs were an ice hockey team as well.',
        'Waddle up to the stage when you\'re ready. Mind the pond.',
    ],
    'Nematode': [
        'Hello. I\'m the nematode. There are more of me than of anyone else here, by number.',
        'I don\'t have a face, so I think this is going well.',
        'Someone put me on the wheel. I have no notes.',
    ],
};
const DEFAULT_LINES = ['Hello. I could have been this week\'s animal too.', 'The Main Stage is up the path.'];

// DOM
const box = document.getElementById('adventureBox');
const villagePanel = document.getElementById('villagePanel');
const canvas = document.getElementById('adventureCanvas');
const ctx = canvas.getContext('2d');
const hintEl = document.getElementById('adventureHint');
const dlg = document.getElementById('advDlg');
const dlgWho = document.getElementById('advDlgWho');
const dlgSay = document.getElementById('advDlgSay');
const dlgMore = document.getElementById('advDlgMore');
const djPanel = document.getElementById('djPanel');

const W = COLS * TILE, H = ROWS * TILE;
let ground = null;          // pre-rendered static tiles
let active = false, raf = 0, last = 0;
let scene = 'village';      // 'village' | 'stage'
let hero = null, others = [];
let player = null, npcs = [], met = new Set();
let dialogue = null;
const keys = new Set();

function hash(x, y) {
    let h = (x * 374761393 + y * 668265263) >>> 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const tileAt = (x, y) => (y < 0 || y >= ROWS || x < 0 || x >= COLS) ? '#' : MAP[y][x];
const walkable = (x, y) => WALKABLE.has(tileAt(x, y));
const npcAt = (x, y) => npcs.find(n => n.x === x && n.y === y) || null;
function occupied(x, y, self) {
    if (player !== self && ((player.x === x && player.y === y) || (player.fx === x && player.fy === y))) return true;
    return npcs.some(n => n !== self && ((n.x === x && n.y === y) || (n.fx === x && n.fy === y)));
}

function makeEntity(x, y, animal) {
    return { x, y, fx: x, fy: y, t: 1, moving: false, face: 'left', dir: [0, 1], phase: Math.random() * 7, animal, emoji: animal.emoji, name: animal.name };
}
function startMove(e, nx, ny) {
    e.fx = e.x; e.fy = e.y; e.x = nx; e.y = ny; e.t = 0; e.moving = true;
}
function updateEntity(e, dt) {   // returns true on arrival
    if (!e.moving) return false;
    e.t += dt / MOVE_TIME;
    if (e.t >= 1) { e.t = 1; e.moving = false; e.fx = e.x; e.fy = e.y; return true; }
    return false;
}

/* --- ground --- */
function renderGround() {
    ground = document.createElement('canvas');
    ground.width = W; ground.height = H;
    const g = ground.getContext('2d');
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) drawTile(g, x, y);
    drawBuilding(g);
}
function drawTile(g, x, y) {
    const ch = MAP[y][x], px = x * TILE, py = y * TILE;
    g.fillStyle = (x + y) % 2 ? '#5fb356' : '#58a84f';
    g.fillRect(px, py, TILE, TILE);
    g.fillStyle = '#4c9a44';
    for (let k = 0; k < 3; k++) g.fillRect(px + 3 + hash(x + k * 7, y + k * 13) * 24, py + 3 + hash(y + k * 3, x + k * 11) * 24, 3, 2);
    if (ch === ':') {
        const cols = ['#ff6b9d', '#ffd93d', '#ffffff', '#ff9f43'];
        for (let k = 0; k < 4; k++) {
            g.fillStyle = cols[k];
            g.beginPath(); g.arc(px + 5 + hash(x + k, y * 3 + k) * 22, py + 5 + hash(y + k * 5, x + k) * 22, 2.2, 0, 7); g.fill();
        }
    } else if (ch === '=') {
        g.fillStyle = '#d9c38a'; g.fillRect(px, py, TILE, TILE);
        g.fillStyle = '#c9b075';
        for (let k = 0; k < 3; k++) g.fillRect(px + 2 + hash(x * 3 + k, y + k) * 26, py + 2 + hash(y * 5 + k, x) * 26, 3, 3);
    } else if (ch === '#') {
        g.fillStyle = '#6b4a2a'; g.fillRect(px + 13, py + 18, 6, 12);
        g.fillStyle = '#2f7d32'; g.beginPath(); g.arc(px + 16, py + 13, 12, 0, 7); g.fill();
        g.fillStyle = '#3f9a43'; g.beginPath(); g.arc(px + 12, py + 10, 6, 0, 7); g.fill();
    } else if (ch === '~') {
        g.fillStyle = '#3b82c4'; g.fillRect(px, py, TILE, TILE);
    } else if (ch === '!') {
        g.fillStyle = '#8a5a2b'; g.fillRect(px + 14, py + 14, 4, 14);
        g.fillStyle = '#d9b36b'; g.fillRect(px + 6, py + 6, 20, 12);
        g.strokeStyle = '#6b4a2a'; g.lineWidth = 1; g.strokeRect(px + 6.5, py + 6.5, 19, 11);
        g.fillStyle = '#3b2a12'; g.font = '700 10px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText('STAGE', px + 16, py + 12.5);
    }
}
function drawBuilding(g) {
    const x0 = 9 * TILE, y0 = 1 * TILE, w = 5 * TILE, h = 3 * TILE;
    g.fillStyle = '#2b1f4a'; g.fillRect(x0, y0 + TILE * 0.6, w, h - TILE * 0.6);
    for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#ff2fa0' : '#f6efdd'; g.fillRect(x0 + i * (w / 10), y0 + 4, w / 10, TILE * 0.7); }
    g.fillStyle = '#1a1230'; g.fillRect(x0, y0 + 4 + TILE * 0.7, w, 4);
    g.fillStyle = '#35f0ff'; g.font = '700 13px Fredoka, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('MAIN STAGE', x0 + w / 2, y0 + TILE * 1.5);
    g.fillStyle = 'rgba(53,240,255,0.6)'; g.fillRect(x0 + 6, y0 + TILE * 1.95, w - 12, 2);
    const dx = DOOR.x * TILE, dy = DOOR.y * TILE;
    g.fillStyle = '#0a0612'; g.fillRect(dx + 6, dy + 4, TILE - 12, TILE - 4);
    g.strokeStyle = '#ff2fa0'; g.lineWidth = 2; g.strokeRect(dx + 6, dy + 4, TILE - 12, TILE - 4);
    g.fillStyle = '#111'; g.fillRect(dx - 22, dy + 8, 14, 22); g.fillRect(dx + TILE + 8, dy + 8, 14, 22);
    g.fillStyle = '#333';
    for (const sx of [dx - 15, dx + TILE + 15]) { g.beginPath(); g.arc(sx, dy + 15, 4, 0, 7); g.fill(); g.beginPath(); g.arc(sx, dy + 25, 3, 0, 7); g.fill(); }
}

/* --- drawing --- */
function draw(t) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const dpr = canvas.width / W;
    ctx.scale(dpr, dpr);
    ctx.drawImage(ground, 0, 0);
    // water highlights
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
        if (MAP[y][x] !== '~') continue;
        const px = x * TILE, py = y * TILE;
        for (let k = 0; k < 2; k++) {
            const yy = py + 9 + k * 13 + Math.sin(t * 1.5 + x + k) * 2;
            ctx.beginPath(); ctx.moveTo(px + 4, yy); ctx.quadraticCurveTo(px + 10, yy - 3, px + 16, yy); ctx.quadraticCurveTo(px + 22, yy + 3, px + 28, yy); ctx.stroke();
        }
    }
    // door glow
    ctx.fillStyle = `rgba(255,47,160,${0.15 + 0.15 * Math.sin(t * 3)})`;
    ctx.fillRect(DOOR.x * TILE + 2, DOOR.y * TILE, TILE - 4, TILE + 4);
    // entities, back to front
    const ents = [...npcs, player].sort((a, b) => (a.fy + (a.y - a.fy) * a.t) - (b.fy + (b.y - b.fy) * b.t));
    for (const e of ents) drawEntity(e, t);
    // name of whoever is next to the player
    for (const n of npcs) {
        if (Math.abs(n.x - player.x) + Math.abs(n.y - player.y) !== 1) continue;
        const px = n.x * TILE + 16, py = n.y * TILE - 6;
        ctx.font = '700 12px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(n.name).width + 10;
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(px - tw / 2, py - 8, tw, 16);
        ctx.fillStyle = '#fff'; ctx.fillText(n.name, px, py);
    }
    ctx.restore();
}
function drawEntity(e, t) {
    const k = e.moving ? e.t : 1;
    const px = (e.fx + (e.x - e.fx) * k) * TILE, py = (e.fy + (e.y - e.fy) * k) * TILE;
    const bob = e.moving ? Math.abs(Math.sin(k * Math.PI)) * 4 : Math.sin(t * 2 + e.phase) * 1.2;
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(px + 16, py + 28, 10, 4, 0, 0, 7); ctx.fill();
    ctx.save();
    ctx.translate(px + 16, py + 16 - bob);
    if (e.face === 'right') ctx.scale(-1, 1);
    ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(e.emoji, 0, 1);
    ctx.restore();
}

/* --- dialogue --- */
function openDialogue(who, lines) {
    dialogue = { who, lines, i: 0, shown: 0, full: lines[0] };
    dlgWho.textContent = who;
    dlgSay.textContent = '';
    dlgMore.textContent = '';
    dlg.classList.add('on');
}
function advanceDialogue() {
    if (!dialogue) return;
    if (dialogue.shown < dialogue.full.length) { dialogue.shown = dialogue.full.length; renderDialogue(); return; }
    if (dialogue.i + 1 < dialogue.lines.length) {
        dialogue.i++; dialogue.shown = 0; dialogue.full = dialogue.lines[dialogue.i];
        dlgSay.textContent = ''; dlgMore.textContent = '';
        return;
    }
    closeDialogue();
}
function closeDialogue() {
    dialogue = null;
    dlg.classList.remove('on');
    keys.clear();   // let go and press again, so a held key doesn't instantly re-bump
}
function updateDialogue(dt) {
    if (!dialogue || dialogue.shown >= dialogue.full.length) return;
    dialogue.shown = Math.min(dialogue.full.length, dialogue.shown + dt * 45);
    renderDialogue();
}
function renderDialogue() {
    dlgSay.textContent = dialogue.full.slice(0, Math.floor(dialogue.shown));
    dlgMore.textContent = dialogue.shown >= dialogue.full.length ? 'space ▸' : '';
}

/* --- update --- */
function currentDir() {
    for (const d of ['up', 'down', 'left', 'right']) if (keys.has(d)) return d;
    return null;
}
function talkTo(npc) {
    npc.face = player.x > npc.x ? 'right' : 'left';
    met.add(npc.name);
    openDialogue(npc.name, npc.lines);
    updateHint();
}
function signText() {
    return ['Main Stage. Tonight: the ' + hero.name + ', on the decks.', 'Walk into the door to go in.'];
}
function interactAt(nx, ny) {   // returns true if something happened
    const npc = npcAt(nx, ny);
    if (npc) { talkTo(npc); keys.clear(); return true; }
    if (nx === SIGN.x && ny === SIGN.y) { openDialogue('Sign', signText()); keys.clear(); return true; }
    return false;
}
function updatePlayer(dt) {
    const arrived = updateEntity(player, dt);
    if (arrived && player.x === DOOR.x && player.y === DOOR.y) { enterStage(); return; }
    if (player.moving || dialogue) return;
    const dir = currentDir();
    if (!dir) return;
    const [dx, dy] = DIRS[dir];
    player.dir = [dx, dy];
    if (dx) player.face = dx > 0 ? 'right' : 'left';
    const nx = player.x + dx, ny = player.y + dy;
    if (interactAt(nx, ny)) return;
    if (walkable(nx, ny) && !occupied(nx, ny, player)) { startMove(player, nx, ny); DJ.step(); }
}
function updateNpcs(dt) {
    for (const n of npcs) {
        updateEntity(n, dt);
        if (n.moving || dialogue) continue;
        n.wait -= dt;
        if (n.wait > 0) continue;
        n.wait = 1.5 + Math.random() * 3;
        const [dx, dy] = DIRS[['up', 'down', 'left', 'right'][Math.random() * 4 | 0]];
        const nx = n.x + dx, ny = n.y + dy;
        if (Math.abs(nx - n.home.x) > 2 || Math.abs(ny - n.home.y) > 2) continue;
        if (!walkable(nx, ny) || occupied(nx, ny, n)) continue;
        if ((nx === DOOR.x && ny === DOOR.y) || (nx === AFTER_STAGE.x && ny === AFTER_STAGE.y)) continue;
        if (dx) n.face = dx > 0 ? 'right' : 'left';
        startMove(n, nx, ny);
    }
}
function updateHint() {
    if (scene === 'stage') { hintEl.textContent = 'Press play, pick a track, then DROP IT. Esc or the button takes you back to the village.'; return; }
    if (npcs.length && met.size >= npcs.length) { hintEl.textContent = 'You\'ve met everyone you could have been. The Main Stage is up the path.'; return; }
    hintEl.textContent = 'Arrow keys or WASD to walk. Bump into someone to talk, Space to continue. Met ' + met.size + ' of ' + npcs.length + '.';
}

/* --- scenes --- */
function enterStage() {
    scene = 'stage';
    dialogue = null; dlg.classList.remove('on'); keys.clear();
    villagePanel.style.display = 'none';
    djPanel.style.display = 'block';
    DJ.show(hero, others);
    updateHint();
}
function leaveStage() {
    DJ.stop();
    scene = 'village';
    djPanel.style.display = 'none';
    villagePanel.style.display = 'block';
    player.x = player.fx = AFTER_STAGE.x; player.y = player.fy = AFTER_STAGE.y;
    player.moving = false; player.t = 1; player.face = 'left'; player.dir = [0, 1];
    keys.clear();
    updateHint();
}

/* --- input --- */
const KEY_DIR = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' };
function onKeyDown(e) {
    if (!active) return;
    const k = e.key;
    if (scene === 'stage') {
        if (k === 'Escape') { e.preventDefault(); leaveStage(); }
        return;   // leave the sliders and buttons alone
    }
    if (k === 'Escape') { e.preventDefault(); if (dialogue) closeDialogue(); return; }
    if (k === ' ' || k === 'Enter') {
        e.preventDefault();
        DJ.ensureAudio();
        if (dialogue) { advanceDialogue(); return; }
        if (!player.moving) interactAt(player.x + player.dir[0], player.y + player.dir[1]);
        return;
    }
    const dir = KEY_DIR[k];
    if (!dir) return;
    e.preventDefault();
    DJ.ensureAudio();
    if (!e.repeat) keys.add(dir);
}
function onKeyUp(e) {
    const dir = KEY_DIR[e.key];
    if (dir) keys.delete(dir);
}
dlg.addEventListener('click', advanceDialogue);

/* --- loop --- */
function frame(ts) {
    if (!active) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (scene === 'stage') { DJ.frame(ts / 1000, dt); return; }
    updatePlayer(dt);
    if (scene !== 'village') return;
    updateNpcs(dt);
    updateDialogue(dt);
    draw(ts / 1000);
}

function start(animal, all) {
    stop();
    hero = animal;
    others = all.filter(a => a !== animal);
    scene = 'village'; dialogue = null; met = new Set(); keys.clear();
    player = makeEntity(START.x, START.y, hero);
    npcs = others.slice(0, NPC_SPOTS.length).map((a, i) => {
        const n = makeEntity(NPC_SPOTS[i][0], NPC_SPOTS[i][1], a);
        n.home = { x: n.x, y: n.y }; n.wait = 1 + Math.random() * 2; n.lines = LINES[a.name] || DEFAULT_LINES;
        return n;
    });
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    if (!ground) renderGround();
    villagePanel.style.display = 'block';
    djPanel.style.display = 'none';
    dlg.classList.remove('on');
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    active = true;
    last = performance.now();
    updateHint();
    raf = requestAnimationFrame(frame);
}
function stop() {
    if (!active) return;
    active = false;
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    DJ.stop();
    dialogue = null; dlg.classList.remove('on'); keys.clear();
}

/* --------------------------------------------------------------- main stage */
// Ported from Twizl's tent: Web Audio synth voices, a 16-step sequencer with
// five tracks, build / drop phases, and the stage canvas.

const STAGE = {
    lede: (name) => 'The resident DJ is all tuckered out, so the ' + name + ' is on the decks. Press play. Everyone from the wheel is here.',
    play: '▶ Play the set', stop: '■ Stop the set', building: 'BUILDING…',
    dropShout: ['AIM', 'MAKE', 'SOME', 'NOISE'], track: 'Track {n}',
};
const stageCanvas = document.getElementById('djStage');
const ledeEl = document.getElementById('djLede');
const playBtn = document.getElementById('djPlay');
const dropBtn = document.getElementById('djDrop');
const tracksEl = document.getElementById('djTracks');
const bpmEl = document.getElementById('djBpm'), bpmvEl = document.getElementById('djBpmv');
const filtEl = document.getElementById('djFilt'), dlyEl = document.getElementById('djDly');
const cutEl = document.getElementById('djCut'), resEl = document.getElementById('djRes');
const hatdEl = document.getElementById('djHatd'), driveEl = document.getElementById('djDrive');
const phaseEl = document.getElementById('djPhase');
const shoutEl = document.getElementById('djShout');
const isOn = () => active && scene === 'stage';

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
      if(ph==="build"){ seq.buildBar++; phaseEl.textContent="BUILDING"; if(seq.buildBar>=8){ seq.phase="drop"; seq.dropBar=0; phaseEl.textContent="DROP"; if(isOn()) shout(STAGE.dropShout); } }
      else if(ph==="drop"){ seq.dropBar++; if(seq.dropBar>=12){ seq.phase="groove"; phaseEl.textContent="groove"; } }
    }
  }
}
function shout(words){ let i=0; const tick=()=>{ if(i>=words.length||!isOn()){ shoutEl.classList.remove("on"); return; } shoutEl.textContent=words[i++]; shoutEl.classList.add("on"); setTimeout(tick,420); }; tick(); }
playBtn.onclick=()=>{ seq.on?seqStop():seqStart(); };
bpmEl.oninput=e=>bpmvEl.textContent=e.target.value;
function applyFx(){ if(!seq.filter||!AC) return; const t=AC.currentTime; const f=filtEl.value/100; seq.filter.frequency.setTargetAtTime(200*Math.pow(90,f),t,.03); seq.filter.Q.value=1+(1-f)*6; const dw=dlyEl.value/100; seq.send.gain.setTargetAtTime(dw*.8,t,.03); seq.fb.gain.setTargetAtTime(.25+dw*.5,t,.03); if(seq.revSend) seq.revSend.gain.setTargetAtTime(dw*dw*1.1,t,.03); const dv=driveEl.value/100; seq.drive.curve=makeDrive(1+dv*dv*40); seq.bus.gain.value=.9-dv*.45; }
[filtEl,dlyEl,driveEl].forEach(el=>el.oninput=applyFx);
function setTrack(i){ patIdx=i; TRACK=PATTERNS[i]; BASS=TRACK.bass; ACC=TRACK.acc; [...tracksEl.querySelectorAll("button")].forEach((b,k)=>b.classList.toggle("on",k===i)); phaseEl.textContent=STAGE.track.replace("{n}",i+1)+" · "+TRACK.name; if(!seq.on) seqStart(); }
PATTERNS.forEach((p,i)=>{ const b=document.createElement("button"); b.type="button"; b.textContent=(i+1)+" "+p.name; b.onclick=()=>setTrack(i); if(i===0) b.classList.add("on"); tracksEl.appendChild(b); });
dropBtn.onclick=()=>{ if(!seq.on) seqStart(); if(!seq.on) return; if(seq.phase!=="build"){ seq.phase="build"; seq.buildBar=0; phaseEl.textContent=STAGE.building; } };
document.getElementById('djBack').onclick=()=>{ if(isOn()) leaveStage(); };

/* ---------- stage canvas ---------- */
const confetti=[]; let stageT0=0; const jellies=[], bubbles=[];
let stageHero=null, stageCrowd=[];
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
  if(stageHero){ const bob=seq.on?Math.abs(Math.sin(t*(bpm/60*Math.PI)))*6:0; x.font=`${Math.round(h*.2)}px sans-serif`; x.textAlign="center"; x.textBaseline="alphabetic"; x.fillText(stageHero.emoji,w*.5,h*.31-bob); }
  // speakers
  for(const sx of [w*.04,w*.11,w*.82,w*.89]){ x.fillStyle="#111"; x.fillRect(sx,h*.14,w*.06,h*.34); x.strokeStyle="#2a2a2a"; x.lineWidth=1; x.strokeRect(sx,h*.14,w*.06,h*.34); for(const [yy,rr] of [[.21,.014],[.31,.02],[.42,.022]]){ x.fillStyle="#2b2b2b"; x.beginPath(); x.arc(sx+w*.03,h*yy,w*rr*(1+beat*.18),0,7); x.fill(); x.fillStyle="#444"; x.beginPath(); x.arc(sx+w*.03,h*yy,w*rr*.35,0,7); x.fill(); } x.fillStyle=seq.on?`rgba(53,240,255,${.5+beat*.5})`:"#223"; x.fillRect(sx+w*.005,h*.16,w*.05,2); }
  for(const bx of [w*.2,w*.3,w*.62,w*.72]){ x.fillStyle="#0e0e14"; x.fillRect(bx,h*.44,w*.08,h*.07); x.fillStyle="#262630"; x.beginPath(); x.arc(bx+w*.04,h*.475,h*.024*(1+beat*.25),0,7); x.fill(); }
  x.fillStyle="#35f0ff"; x.globalAlpha=.7+beat*.3; x.font=`700 ${Math.round(h*.028)}px Fredoka, monospace`; x.textAlign="center"; x.textBaseline="alphabetic"; x.fillText(stageHero?("DJ "+stageHero.name).toUpperCase():"AIM",w*.5,h*.425); x.globalAlpha=1;
  // crowd in three rows: everyone else from the wheel
  const rows=[[h*.62,.09],[h*.76,.11],[h*.92,.13]];
  const n=Math.max(1,Math.ceil(stageCrowd.length/3));
  stageCrowd.forEach((a,i)=>{ const r=rows[i%3]; const col=Math.floor(i/3); const cx=w*(.1+(col+.5+(i%3)*.33)/n*.8)+Math.sin(t*.5+i)*6; const jump=seq.on?Math.max(0,Math.sin(t*(bpm/60)*Math.PI*2+i))*(drop?26:build?14:9)*(.4+beat):Math.sin(t*2+i)*2; x.save(); x.translate(cx,r[0]-jump); if(i%2) x.scale(-1,1); x.font=`${Math.round(h*r[1]*1.4)}px sans-serif`; x.textAlign="center"; x.textBaseline="alphabetic"; x.fillText(a.emoji,0,0); x.restore(); });
  // confetti
  if(drop&&Math.random()<.6) confetti.push({x:Math.random()*w,y:-10,vy:60+Math.random()*120,vx:(Math.random()-.5)*40,c:["#ff2fa0","#35f0ff","#f2c75c","#c9ffb0","#fff"][Math.random()*5|0],r:Math.random()*6.28});
  for(const p of confetti){ p.y+=p.vy*dt; p.x+=p.vx*dt; p.r+=dt*4; x.save(); x.translate(p.x,p.y); x.rotate(p.r); x.fillStyle=p.c; x.fillRect(-4,-2,8,4); x.restore(); }
  for(let i=confetti.length-1;i>=0;i--) if(confetti[i].y>h+10) confetti.splice(i,1);
  // strobe on the drop
  if(drop&&beat>.6){ x.fillStyle=`rgba(255,255,255,${(beat-.6)*.35})`; x.fillRect(0,0,w,h); }
}

const DJ = {
    ensureAudio,
    step,
    show(heroAnimal, crowd) {
        stageHero = heroAnimal; stageCrowd = crowd;
        ledeEl.textContent = STAGE.lede(heroAnimal.name);
        stageT0 = performance.now();
        jellies.length = 0; bubbles.length = 0; confetti.length = 0;
        phaseEl.textContent = '';
    },
    frame: stageFrame,
    stop() {
        if (seq.on) seqStop();
        shoutEl.classList.remove('on');
    },
};

window.Adventure = {
    start, stop,
    // for headless tests
    _debug: { MAP, DOOR, SIGN, START, NPC_SPOTS, walkable, get state() { return { scene, player, npcs, met, dialogue, active }; } },
};
})();
