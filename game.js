(() => {
'use strict';

/* =========================================================
   NEON TANK // 霓虹坦克
   A cyberpunk tribute to the classic Battle City.
   ========================================================= */

const W = 624;
const H = 624;
const CELL = 24;
const TILE = 48;
const COLS = 26;
const ROWS = 26;

const DIRS = {
  up:    { x: 0, y: -1, a: 0 },
  right: { x: 1, y: 0, a: Math.PI / 2 },
  down:  { x: 0, y: 1, a: Math.PI },
  left:  { x: -1, y: 0, a: -Math.PI / 2 }
};
const DIR_LIST = ['up', 'right', 'down', 'left'];
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const padBox = (o, p) => ({ x: o.x + p, y: o.y + p, w: o.w - p * 2, h: o.h - p * 2 });
const fmt = n => String(Math.max(0, Math.floor(n))).padStart(6, '0');

const HS_KEY = 'neonTankHiScore';
const AUDIO_KEY = 'neonTankMuted';
const CLEARED_KEY = 'neonTankCleared';
const PLAYER_COLORS = [
  { main: '#00f0ff', soft: '#8dffff', glow: 'rgba(0,240,255,.8)', name: 'P1' },
  { main: '#ffcf4d', soft: '#fff1a6', glow: 'rgba(255,207,77,.8)', name: 'P2' }
];
const P1_DIR_CODES = { KeyW: 'up', KeyD: 'right', KeyS: 'down', KeyA: 'left' };
const P2_DIR_CODES = { ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left' };

/* ---------------- stages ---------------- */
const STAGES = [
  {
    name: 'NEO-KOWLOON',
    cn: '霓虹九龙',
    code: 'SECTOR 01',
    maxActive: 4,
    types: { drone: 6, hunter: 10, brute: 3, phantom: 1 },
    map: [
      '.B..B...B..B.',
      '.B..B...B..B.',
      '.B..B...B..B.',
      '....B...B....',
      'SS..B...B..SS',
      '....B...B....',
      'BB..B...B..BB',
      '....B...B....',
      '.BB.....BB...',
      '.B..BBBBB..B.',
      '.B.........B.',
      '.....BBB.....',
      '.....BEB.....'
    ]
  },
  {
    name: 'ACID CANAL',
    cn: '酸雨运河',
    code: 'SECTOR 02',
    maxActive: 4,
    types: { drone: 4, hunter: 9, brute: 5, phantom: 2 },
    map: [
      '..B.......B..',
      '..B.SSSSS.B..',
      '..B.......B..',
      '..BBBB.BBBB..',
      '.TT.......TT.',
      '.TT..WWW..TT.',
      '....WWWWW....',
      '....WWWWW....',
      '.TT..WWW..TT.',
      '.TT.......TT.',
      '..BBBB.BBBB..',
      '.....BBB.....',
      '.....BEB.....'
    ]
  },
  {
    name: 'CHROME CITADEL',
    cn: '铬金要塞',
    code: 'SECTOR 03',
    maxActive: 5,
    types: { drone: 3, hunter: 8, brute: 7, phantom: 2 },
    map: [
      '...B.....B...',
      '.....B.B.....',
      'SS.B.B.B.B.SS',
      '...B.....B...',
      'BBBB.SSS.BBBB',
      '.....S.S.....',
      '..BBB.S.BBB..',
      '.....S.S.....',
      'BBBB.SSS.BBBB',
      '....B...B....',
      '.B..B...B..B.',
      '.....BBB.....',
      '.....BEB.....'
    ]
  }
];

const ENEMY_TYPES = {
  drone:   { color: '#ff4fd8', glow: 'rgba(255,79,216,.8)', speed: 126, hp: 1, score: 100, fireMin: 1.5, fireMax: 2.4, bulletSpeed: 272 },
  hunter:  { color: '#ff3d5a', glow: 'rgba(255,61,90,.8)', speed: 100, hp: 1, score: 200, fireMin: 1.1, fireMax: 1.9, bulletSpeed: 292 },
  brute:   { color: '#ffb020', glow: 'rgba(255,176,32,.8)', speed: 73, hp: 3, score: 400, fireMin: 1.0, fireMax: 1.8, bulletSpeed: 318 },
  phantom: { color: '#f4fbff', glow: 'rgba(225,248,255,.9)', speed: 118, hp: 2, score: 500, fireMin: 0.9, fireMax: 1.6, bulletSpeed: 340 }
};

/* ---------------- theme (customizable skins / bg) ---------------- */
const CUSTOM_KEY = 'neonTankCustom';
const DEFAULT_THEME = {
  player1: { main: '#00f0ff', soft: '#8dffff', glow: 'rgba(0,240,255,.8)' },
  player2: { main: '#ffcf4d', soft: '#fff1a6', glow: 'rgba(255,207,77,.8)' },
  enemies: {
    drone:   { color: '#ff4fd8', glow: 'rgba(255,79,216,.8)' },
    hunter:  { color: '#ff3d5a', glow: 'rgba(255,61,90,.8)' },
    brute:   { color: '#ffb020', glow: 'rgba(255,176,32,.8)' },
    phantom: { color: '#f4fbff', glow: 'rgba(225,248,255,.9)' }
  },
  bg: {
    base: '#04030d',
    gridMajor: 'rgba(0, 240, 255, .075)',
    gridMinor: 'rgba(0, 240, 255, .033)',
    accent1: 'rgba(122, 44, 255, .16)',
    accent2: 'rgba(0, 240, 255, .11)'
  }
};

// deep merge defaults to avoid missing keys after partial saves
function cloneTheme(t) {
  return JSON.parse(JSON.stringify(t || DEFAULT_THEME));
}

const THEME = cloneTheme(DEFAULT_THEME);
const SKIN_IMAGES = { p1: null, p2: null, drone: null, hunter: null, brute: null, phantom: null };
const SKIN_IMAGE_CACHE = {};
let CUSTOM_BACKGROUND = null;
let CUSTOM_BACKGROUND_IMAGE = null;
let CUSTOM_BGM = null;
let CUSTOM_LIVES = 3;
let CUSTOM_SPAWNS = null;
let CUSTOM_ENEMY_COUNTS = null;
let CUSTOM_PLAYER_SPAWNS = null;

function applyTheme(t) {
  const src = t || {};
  if (src.player1) Object.assign(THEME.player1, src.player1);
  if (src.player2) Object.assign(THEME.player2, src.player2);
  if (src.enemies) {
    for (const k of Object.keys(THEME.enemies)) {
      if (src.enemies[k]) Object.assign(THEME.enemies[k], src.enemies[k]);
    }
  }
  if (src.bg) Object.assign(THEME.bg, src.bg);
}

function playerColors(index) {
  return index === 1 ? THEME.player2 : THEME.player1;
}

function enemySkin(type) {
  return THEME.enemies[type] || ENEMY_TYPES[type];
}


/* ---------------- difficulty ---------------- */
const DIFF_KEY = 'neonTankDifficulty';
const DIFFICULTIES = {
  easy: {
    label: '简单', en: 'EASY', color: '#00ffa3',
    aiAggression: 0.32,  // 优先攻击玩家的概率
    aiSmartness: 0.0,    // 寻路/预判强度 0..1
    speedMul: 0.78,
    hpMul: 1.0,
    fireMul: 1.7,        // 开火间隔倍率（越大越慢）
    spawnMul: 1.55,      // 刷怪间隔倍率（越大越慢）
    aimLead: 0.0,        // 提前量 0..1
    flankChance: 0.12,   // 受阻时绕侧概率
    baseBias: 0.72,      // 偏攻击基地的权重
    maxActiveMul: 0.85,
    blindFire: 0.08
  },
  normal: {
    label: '普通', en: 'NORMAL', color: '#00f0ff',
    aiAggression: 0.56,
    aiSmartness: 0.5,
    speedMul: 1.0,
    hpMul: 1.0,
    fireMul: 1.0,
    spawnMul: 1.0,
    aimLead: 0.32,
    flankChance: 0.4,
    baseBias: 0.42,
    maxActiveMul: 1.0,
    blindFire: 0.2
  },
  hard: {
    label: '困难', en: 'HARD', color: '#ff2bd6',
    aiAggression: 0.85,
    aiSmartness: 0.95,
    speedMul: 1.24,
    hpMul: 1.45,
    fireMul: 0.58,
    spawnMul: 0.7,
    aimLead: 0.9,
    flankChance: 0.75,
    baseBias: 0.18,
    maxActiveMul: 1.25,
    blindFire: 0.42
  }
};

function getDiff() {
  return DIFFICULTIES[G.difficulty] || DIFFICULTIES.normal;
}

function difficultyActiveCap(cfg) {
  return Math.max(1, Math.round(cfg.maxActive * getDiff().maxActiveMul));
}

const POWER_TYPES = [
  { type: 'power',  label: 'PWR', name: '武器核心', color: '#00f0ff', weight: 24 },
  { type: 'shield', label: 'SHD', name: '护盾矩阵', color: '#7a5cff', weight: 20 },
  { type: 'rapid',  label: 'RPD', name: '急速射击', color: '#ffd166', weight: 20 },
  { type: 'emp',    label: 'EMP', name: '电磁脉冲', color: '#b8a8ff', weight: 12 },
  { type: 'nuke',   label: 'NUK', name: '数据核爆', color: '#ff2bd6', weight: 8 },
  { type: 'life',   label: '+1',  name: '备用装甲', color: '#ff4f6d', weight: 6 }
];

/* ---------------- state ---------------- */
const G = {
  time: 0,
  state: 'title',
  stateTime: 0,
  stageIndex: 0,
  stage: 1,
  score: 0,
  hiScore: 0,
  lives: 3,
  weapon: 1,
  player2: null,
  lives2: 3,
  weapon2: 1,
  playerSpawn2: { x: 0, y: 0 },
  mode: 'solo',
  playerCount: 1,
  difficulty: 'normal',
  cleared: [false, false, false],
  maxUnlocked: 0,
  customMap: null,
  walls: [],
  base: null,
  player: null,
  playerSpawn: { x: 0, y: 0 },
  enemies: [],
  bullets: [],
  powerups: [],
  particles: [],
  texts: [],
  queue: [],
  stageTotal: 20,
  stageStartScore: 0,
  stageKills: 0,
  spawnPoints: [],
  spawnTimer: 1,
  spawnIndex: 0,
  respawnTimer: 0,
  respawnTimer2: 0,
  freezeTimer: 0,
  shake: 0,
  hudTimer: 0,
  endTimer: 0,
  endShown: false,
  stageBonus: 0,
  keys: new Set(),
  dirOrder: [],
  dirOrder2: [],
  touch: { dir: null, fire: false },
  muted: false,
  remoteInput: { dir: null, fire: false },
  remoteInputAt: 0,
  wallVersion: 1,
  netEvents: [],
  netConnected: false,
  netRole: null,
  netLastRx: 0,
  netInputTimer: 0,
  netSnapTimer: 0,
  _hudCache: {}
};

try {
  G.hiScore = parseInt(localStorage.getItem(HS_KEY) || '0', 10) || 0;
  G.muted = localStorage.getItem(AUDIO_KEY) === '1';
  const savedDiff = localStorage.getItem(DIFF_KEY);
  if (savedDiff && DIFFICULTIES[savedDiff]) G.difficulty = savedDiff;
  const mask = parseInt(localStorage.getItem(CLEARED_KEY) || '0', 10) || 0;
  for (let i = 0; i < STAGES.length; i++) G.cleared[i] = !!(mask & (1 << i));
  const highest = G.cleared.reduce((last, done, i) => done ? i : last, -1);
  G.maxUnlocked = clamp(highest + 1, 0, STAGES.length - 1);
} catch (err) {
  G.hiScore = 0;
  G.muted = false;
}

/* ---------------- audio ---------------- */
const AudioFX = {
  ctx: null,
  master: null,
  noiseBuffer: null,
  muted: false,
  pulseTimer: null,
  pulseStep: 0,
  bgm: null,

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.5;
      this.master.connect(this.ctx.destination);
      this.noiseBuffer = this.makeNoise();
      this.startAmbient();
      this.setBgm(CUSTOM_BGM);
    } catch (err) {
      this.ctx = null;
    }
  },

  makeNoise() {
    const ctx = this.ctx;
    const length = Math.floor(ctx.sampleRate * 0.6);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  },

  startAmbient() {
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = 0.028;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 230;
    filter.Q.value = 4.5;

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55;
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 82.41;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.55;

    osc1.connect(filter);
    osc2.connect(osc2Gain);
    osc2Gain.connect(filter);
    filter.connect(bus);
    bus.connect(this.master);
    osc1.start();
    osc2.start();

    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.075;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 95;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    this.pulseTimer = setInterval(() => {
      if (!this.ctx || this.muted || G.state !== 'playing') return;
      const notes = [110, 164.81, 220, 164.81, 130.81, 196, 261.63, 196];
      const f = notes[this.pulseStep++ % notes.length];
      this.tone(f, f, 0.2, 'triangle', 0.013);
    }, 440);
  },

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
    if (this.bgm) this.bgm.volume = muted ? 0 : 0.42;
  },

  setBgm(source) {
    if (!source) {
      if (this.bgm) this.bgm.pause();
      this.bgm = null;
      return;
    }
    if (!this.bgm) {
      this.bgm = new Audio();
      this.bgm.loop = true;
      this.bgm.preload = 'auto';
    }
    if (this.bgm.src !== source) this.bgm.src = source;
    this.bgm.volume = this.muted ? 0 : 0.42;
    if (G.state === 'playing') this.bgm.play().catch(() => {});
  },

  playBgm() {
    if (this.bgm && !this.muted) this.bgm.play().catch(() => {});
  },

  stopBgm() {
    if (this.bgm) this.bgm.pause();
  },

  tone(freq, to, dur, type, vol, when = 0) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(Math.max(20, freq), t);
    if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  },

  noise(dur, vol, filterFreq, when = 0) {
    if (!this.ctx || this.muted || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(filterFreq, t);
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, filterFreq * 0.28), t + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.03);
  },

  sfx(name) {
    if (!this.ctx || this.muted) return;
    switch (name) {
      case 'shoot':
        this.tone(900, 240, 0.075, 'square', 0.045);
        this.noise(0.035, 0.025, 3200);
        break;
      case 'enemyShoot':
        this.tone(320, 130, 0.1, 'sawtooth', 0.022);
        break;
      case 'brick':
        this.noise(0.09, 0.05, 2100);
        break;
      case 'steel':
        this.tone(1700, 620, 0.07, 'triangle', 0.033);
        this.noise(0.04, 0.025, 4200);
        break;
      case 'impact':
        this.noise(0.045, 0.03, 2800);
        break;
      case 'explosion':
        this.noise(0.42, 0.17, 900);
        this.tone(110, 32, 0.38, 'sine', 0.085);
        break;
      case 'playerDeath':
        this.noise(0.55, 0.2, 1100);
        this.tone(220, 38, 0.65, 'sawtooth', 0.09);
        break;
      case 'power':
        this.tone(523.25, 523.25, 0.08, 'triangle', 0.045, 0);
        this.tone(659.25, 659.25, 0.08, 'triangle', 0.045, 0.07);
        this.tone(1046.5, 1046.5, 0.16, 'triangle', 0.05, 0.14);
        break;
      case 'spawn':
        this.tone(140, 620, 0.18, 'sawtooth', 0.022);
        break;
      case 'emp':
        this.tone(70, 1400, 0.45, 'sine', 0.04);
        this.noise(0.35, 0.045, 500);
        break;
      case 'hit':
        this.noise(0.09, 0.05, 1900);
        break;
      case 'clear':
        [440, 554.37, 659.25, 880].forEach((f, i) => this.tone(f, f, 0.16, 'triangle', 0.04, i * 0.11));
        break;
      case 'gameover':
        this.tone(180, 42, 1.2, 'sawtooth', 0.08);
        this.noise(0.9, 0.1, 600);
        break;
      case 'start':
        this.tone(110, 440, 0.28, 'sawtooth', 0.04);
        this.tone(220, 880, 0.35, 'triangle', 0.03, 0.08);
        break;
      default:
        break;
    }
  }
};
AudioFX.muted = G.muted;

/* ---------------- maps & setup ---------------- */
function expandMap(map) {
  const grid = Array.from({ length: ROWS }, () => new Uint8Array(COLS));
  for (let r = 0; r < 13; r++) {
    const row = map[r] || '';
    for (let c = 0; c < 13; c++) {
      const ch = row[c] || '.';
      let code = 0;
      if (ch === 'B') code = 1;
      else if (ch === 'S') code = 2;
      else if (ch === 'W') code = 3;
      else if (ch === 'T') code = 4;
      for (let dr = 0; dr < 2; dr++) {
        for (let dc = 0; dc < 2; dc++) {
          grid[r * 2 + dr][c * 2 + dc] = code;
        }
      }
    }
  }
  return grid;
}

function findBase(map) {
  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      if ((map[r] || '')[c] === 'E') return { r, c };
    }
  }
  return { r: 12, c: 6 };
}

function buildQueue(cfg) {
  const queue = [];
  Object.keys(cfg.types).forEach(type => {
    for (let i = 0; i < cfg.types[type]; i++) queue.push(type);
  });
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue.map((type, index) => ({ type, carrier: index % 5 === 4 }));
}

function spawnPlayer(index = 0, withShield = true) {
  const spawn = index === 1 ? G.playerSpawn2 : G.playerSpawn;
  const sx = spawn.x;
  const sy = spawn.y;
  const test = { x: sx, y: sy, w: 44, h: 44 };
  if (wallBlocks(test.x + 2, test.y + 2, test.w - 4, test.h - 4)) return false;
  if (G.base && overlap(test, G.base)) return false;
  const other = index === 1 ? G.player : G.player2;
  if (other && overlap(padBox(test, 3), padBox(other, 3))) return false;
  for (const e of G.enemies) {
    if (!e.dead && overlap(padBox(test, 3), padBox(e, 3))) return false;
  }
  const tank = {
    tank: true,
    kind: 'player',
    index,
    x: sx,
    y: sy,
    w: 44,
    h: 44,
    dir: 'up',
    speed: 154,
    cooldown: 0,
    tread: 0,
    shieldTimer: withShield ? 2.6 : 0,
    spawnTimer: withShield ? 0.8 : 0,
    rapidTimer: 0,
    muzzle: 0,
    moving: false
  };
  if (index === 1) {
    G.player2 = tank;
    G.respawnTimer2 = 0;
  } else {
    G.player = tank;
    G.respawnTimer = 0;
  }
  return true;
}

function loadStage(index) {
  const cfg = G.customMap
    ? { name: 'CUSTOM', cn: '自定义地图', code: 'CUSTOM', maxActive: 4, types: CUSTOM_ENEMY_COUNTS || { drone: 6, hunter: 10, brute: 3, phantom: 1 }, map: G.customMap }
    : STAGES[index];
  G.stageIndex = index;
  G.stage = index + 1;
  G.walls = expandMap(cfg.map);
  G.wallVersion++;
  const basePos = findBase(cfg.map);
  G.base = {
    x: basePos.c * TILE,
    y: basePos.r * TILE,
    w: TILE,
    h: TILE,
    alive: true,
    hitFlash: 0
  };
  const defaultP1 = { r: basePos.r, c: Math.max(0, basePos.c - 2) };
  const defaultP2 = { r: basePos.r, c: Math.min(12, basePos.c + 2) };
  const p1 = G.customMap && CUSTOM_PLAYER_SPAWNS && CUSTOM_PLAYER_SPAWNS.p1 || defaultP1;
  const p2 = G.customMap && CUSTOM_PLAYER_SPAWNS && CUSTOM_PLAYER_SPAWNS.p2 || defaultP2;
  G.playerSpawn = { x: p1.c * TILE + 2, y: p1.r * TILE + 2 };
  G.playerSpawn2 = { x: p2.c * TILE + 2, y: p2.r * TILE + 2 };
  G.spawnPoints = G.customMap && CUSTOM_SPAWNS && CUSTOM_SPAWNS.length
    ? CUSTOM_SPAWNS.map(({ r, c }) => ({ x: c * TILE + 2, y: r * TILE + 2 }))
    : [{ x: 2, y: 2 }, { x: 6 * TILE + 2, y: 2 }, { x: 12 * TILE + 2, y: 2 }];
  G.queue = buildQueue(cfg);
  G.stageTotal = G.queue.length;
  G.stageStartScore = G.score;
  G.stageKills = 0;
  G.stageBonus = 0;
  G.enemies = [];
  G.bullets = [];
  G.powerups = [];
  G.particles = [];
  G.texts = [];
  G.netEvents = [];
  G.spawnTimer = 1.05;
  G.spawnIndex = 0;
  G.respawnTimer = 0;
  G.respawnTimer2 = 0;
  G.freezeTimer = 0;
  G.shake = 0;
  G.endTimer = 0;
  G.endShown = false;
  G.player = null;
  G.player2 = null;
  spawnPlayer(0, true);
  if (G.playerCount > 1) spawnPlayer(1, true);
  G.state = 'playing';
  G.stateTime = 0;
  clearKeys();
  updateHUD(true);
}

/* ---------------- collision helpers ---------------- */
function cellAt(c, r) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return 2;
  return G.walls[r][c];
}

function wallBlocks(x, y, w, h) {
  const c0 = Math.floor(x / CELL);
  const c1 = Math.floor((x + w - 0.01) / CELL);
  const r0 = Math.floor(y / CELL);
  const r1 = Math.floor((y + h - 0.01) / CELL);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const type = cellAt(c, r);
      if (type === 1 || type === 2 || type === 3) return true;
    }
  }
  return false;
}

function canMoveTank(tank, nx, ny) {
  if (nx < 0 || ny < 0 || nx + tank.w > W || ny + tank.h > H) return false;
  if (wallBlocks(nx + 2, ny + 2, tank.w - 4, tank.h - 4)) return false;
  if (G.base && G.base.alive && overlap(padBox({ x: nx, y: ny, w: tank.w, h: tank.h }, 3), G.base)) return false;
  const tanks = [G.player, G.player2, ...G.enemies].filter(Boolean);
  for (const other of tanks) {
    if (other === tank || other.dead) continue;
    const a = { x: nx, y: ny, w: tank.w, h: tank.h };
    if (overlap(padBox(a, 4), padBox(other, 4))) return false;
  }
  return true;
}

function moveTank(tank, dt) {
  const d = DIRS[tank.dir];
  const dist = tank.speed * dt;
  const nx = tank.x + d.x * dist;
  const ny = tank.y + d.y * dist;
  if (canMoveTank(tank, nx, ny)) {
    tank.x = nx;
    tank.y = ny;
    tank.tread += dist;
    tank.moving = true;
    return true;
  }
  // Corner assist: nudge perpendicular to slip into narrow openings.
  if (d.x !== 0) {
    for (const shift of [-3, 3, -6, 6]) {
      if (canMoveTank(tank, tank.x + shift, tank.y) && canMoveTank(tank, tank.x + shift + d.x * dist, tank.y)) {
        tank.x += shift;
        tank.x += d.x * dist;
        tank.tread += dist;
        tank.moving = true;
        return true;
      }
    }
  } else {
    for (const shift of [-3, 3, -6, 6]) {
      if (canMoveTank(tank, tank.x, tank.y + shift) && canMoveTank(tank, tank.x, tank.y + shift + d.y * dist)) {
        tank.y += shift;
        tank.y += d.y * dist;
        tank.tread += dist;
        tank.moving = true;
        return true;
      }
    }
  }
  tank.moving = false;
  return false;
}

/* ---------------- input ---------------- */
const KEY_DIRS = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowRight: 'right', KeyD: 'right',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left'
};

function isGuest() {
  return G.mode === 'online' && G.netRole === 'guest';
}

function isOnlineHost() {
  return G.mode === 'online' && G.netRole === 'host';
}

function clearKeys() {
  G.keys.clear();
  G.dirOrder.length = 0;
  G.dirOrder2.length = 0;
  G.touch.dir = null;
  G.touch.fire = false;
  G.remoteInput.dir = null;
  G.remoteInput.fire = false;
  G.remoteInputAt = 0;
  document.querySelectorAll('.tbtn.active, .fire-btn.active').forEach(el => el.classList.remove('active'));
}

function scanDirOrder(order, map) {
  for (let i = order.length - 1; i >= 0; i--) {
    const dir = order[i];
    for (const code of G.keys) {
      if (map[code] === dir) return dir;
    }
  }
  return null;
}

function getDesiredDir(index) {
  if (index === 1) {
    if (G.mode === 'online') {
      if (G.netRole === 'host' && performance.now() - G.remoteInputAt < 900) return G.remoteInput.dir;
      return null;
    }
    if (G.playerCount < 2) return null;
    return scanDirOrder(G.dirOrder2, P2_DIR_CODES);
  }
  if (G.touch.dir) return G.touch.dir;
  if (isGuest() || G.playerCount < 2) return scanDirOrder(G.dirOrder, KEY_DIRS);
  return scanDirOrder(G.dirOrder, P1_DIR_CODES);
}

function isFiring(index) {
  if (index === 1) {
    if (G.mode === 'online') {
      return G.netRole === 'host' && performance.now() - G.remoteInputAt < 900 && G.remoteInput.fire;
    }
    return G.keys.has('Enter') || G.keys.has('Numpad0');
  }
  return G.keys.has('Space') || G.keys.has('KeyJ') || G.touch.fire;
}

/* ---------------- effects ---------------- */
function addScore(amount, x, y, color) {
  G.score += amount;
  if (G.score > G.hiScore) G.hiScore = G.score;
  if (typeof x === 'number') floatText(x, y, '+' + amount, color || '#00f0ff');
  updateHUD();
}

function floatText(x, y, text, color) {
  G.texts.push({
    x,
    y,
    text: String(text),
    color: color || '#dffbff',
    life: 0.95,
    maxLife: 0.95
  });
}

function sparkBurst(x, y, color, count = 8, spread = 1) {
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(35, 170) * spread;
    G.particles.push({
      kind: 'spark',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.18, 0.5),
      maxLife: 0.5,
      size: rand(1.2, 3.1),
      color,
      drag: 0.9
    });
  }
}

function explosion(x, y, color = '#ff2bd6', scale = 1, big = false) {
  if (G.mode === 'online' && G.netRole === 'host') {
    if (G.netEvents.length < 48) G.netEvents.push({ e: 'boom', x, y, c: color, s: scale, b: !!big });
  }
  G.shake = Math.max(G.shake, (big ? 13 : 5.5) * scale);
  const count = Math.round(18 * scale);
  for (let i = 0; i < count; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(45, 260) * scale;
    G.particles.push({
      kind: 'spark',
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(0.22, 0.72),
      maxLife: 0.72,
      size: rand(1.5, 4.2) * scale,
      color: Math.random() < 0.32 ? '#ffffff' : color,
      drag: 0.9
    });
  }
  for (let i = 0; i < 2; i++) {
    G.particles.push({
      kind: 'ring',
      x,
      y,
      vx: 0,
      vy: 0,
      life: 0.38 + i * 0.13,
      maxLife: 0.38 + i * 0.13,
      size: (12 + i * 11) * scale,
      color,
      drag: 1
    });
  }
  for (let i = 0; i < Math.round(5 * scale); i++) {
    G.particles.push({
      kind: 'smoke',
      x: x + rand(-12, 12) * scale,
      y: y + rand(-12, 12) * scale,
      vx: rand(-16, 16),
      vy: rand(-28, -6),
      life: rand(0.55, 1.15),
      maxLife: 1.15,
      size: rand(5, 12) * scale,
      color,
      drag: 0.96
    });
  }
  G.particles.push({
    kind: 'flash',
    x,
    y,
    vx: 0,
    vy: 0,
    life: 0.12,
    maxLife: 0.12,
    size: 26 * scale,
    color,
    drag: 1
  });
}

function updateParticles(dt) {
  for (const p of G.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.drag !== 1) {
      const drag = Math.pow(p.drag, dt * 60);
      p.vx *= drag;
      p.vy *= drag;
    }
    if (p.kind === 'smoke') p.vy -= 8 * dt;
  }
  G.particles = G.particles.filter(p => p.life > 0);
}

function updateTexts(dt) {
  for (const t of G.texts) {
    t.life -= dt;
    t.y -= 22 * dt;
  }
  G.texts = G.texts.filter(t => t.life > 0);
}

function updateBase(dt) {
  if (G.base) G.base.hitFlash = Math.max(0, G.base.hitFlash - dt * 2.5);
}

/* ---------------- player ---------------- */
function playerWeapon(p) {
  return p && p.index === 1 ? G.weapon2 : G.weapon;
}

function firePlayer(p) {
  if (!p || p.cooldown > 0) return;
  const weapon = playerWeapon(p);
  const maxBullets = 1 + (weapon - 1) + (p.rapidTimer > 0 ? 1 : 0);
  const live = G.bullets.reduce((n, b) => n + (b.source === p && !b.dead ? 1 : 0), 0);
  if (live >= maxBullets) return;

  const pc = PLAYER_COLORS[p.index || 0];
  const d = DIRS[p.dir];
  const cx = p.x + p.w / 2 + d.x * 25;
  const cy = p.y + p.h / 2 + d.y * 25;
  G.bullets.push({
    x: cx - 3,
    y: cy - 3,
    w: 6,
    h: 6,
    dir: p.dir,
    vx: d.x * 445,
    vy: d.y * 445,
    owner: 'player',
    playerIndex: p.index || 0,
    source: p,
    power: weapon,
    color: weapon >= 3 ? pc.soft : pc.main,
    life: 0,
    dead: false
  });
  p.cooldown = p.rapidTimer > 0 ? 0.115 : (weapon >= 3 ? 0.23 : 0.3);
  p.muzzle = 1;
  sparkBurst(cx, cy, weapon >= 3 ? pc.soft : pc.main, 4, 0.45);
  AudioFX.sfx('shoot');
}

function updatePlayerByIndex(index, dt) {
  const p = index === 1 ? G.player2 : G.player;
  if (!p) {
    if (index === 1) {
      if (G.lives2 <= 0 || G.playerCount < 2) return;
      if (G.respawnTimer2 > 0) {
        G.respawnTimer2 -= dt;
        if (G.respawnTimer2 <= 0 && !spawnPlayer(1, true)) G.respawnTimer2 = 0.4;
      }
    } else {
      if (G.lives <= 0) return;
      if (G.respawnTimer > 0) {
        G.respawnTimer -= dt;
        if (G.respawnTimer <= 0 && !spawnPlayer(0, true)) G.respawnTimer = 0.4;
      }
    }
    return;
  }
  p.shieldTimer = Math.max(0, p.shieldTimer - dt);
  p.rapidTimer = Math.max(0, p.rapidTimer - dt);
  p.spawnTimer = Math.max(0, p.spawnTimer - dt);
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.muzzle = Math.max(0, p.muzzle - dt * 6);

  const dir = getDesiredDir(index);
  if (dir && p.spawnTimer <= 0) {
    p.dir = dir;
    p.moving = moveTank(p, dt);
  } else {
    p.moving = false;
  }
  if (isFiring(index) && p.spawnTimer <= 0) firePlayer(p);
}

/* ---------------- enemies ---------------- */
function spawningAreaClear(x, y, w, h) {
  const box = { x, y, w, h };
  for (const p of [G.player, G.player2]) {
    if (p && overlap(padBox(box, 3), padBox(p, 3))) return false;
  }
  for (const e of G.enemies) {
    if (!e.dead && overlap(padBox(box, 3), padBox(e, 3))) return false;
  }
  return true;
}

function trySpawnEnemy() {
  if (!G.queue.length) return false;
  const sp = G.spawnPoints[G.spawnIndex % G.spawnPoints.length];
  const box = { x: sp.x, y: sp.y, w: 44, h: 44 };
  if (!spawningAreaClear(box.x, box.y, box.w, box.h)) {
    G.spawnIndex++;
    return false;
  }
  const item = G.queue.shift();
  const stats = ENEMY_TYPES[item.type];
  const d = getDiff();
  const stageScale = 1 + G.stageIndex * 0.06;
  const hpBonus = (G.stageIndex === 2 && item.type === 'brute') ? 1 : 0;
  G.enemies.push({
    tank: true,
    kind: 'enemy',
    type: item.type,
    carrier: item.carrier,
    x: sp.x,
    y: sp.y,
    w: 44,
    h: 44,
    dir: 'down',
    speed: stats.speed * stageScale * d.speedMul,
    hp: Math.ceil((stats.hp + hpBonus) * d.hpMul),
    maxHp: Math.ceil((stats.hp + hpBonus) * d.hpMul),
    fireTimer: rand(stats.fireMin, stats.fireMax) * d.fireMul * (1 - G.stageIndex * 0.08),
    thinkTimer: rand(0.4, 1.1),
    spawnTimer: 1.05,
    invuln: 1.25,
    flash: 0,
    tread: 0,
    moving: false,
    dead: false,
    stuckCount: 0
  });
  G.spawnIndex++;
  sparkBurst(sp.x + 22, sp.y + 22, stats.color, 14, 1.2);
  AudioFX.sfx('spawn');
  return true;
}

function updateSpawns(dt) {
  const cfg = STAGES[G.stageIndex];
  const cap = difficultyActiveCap(cfg);
  if (!G.queue.length || !G.spawnPoints.length || G.enemies.length >= cap) return;
  G.spawnTimer -= dt;
  if (G.spawnTimer > 0) return;
  for (let attempt = 0; attempt < G.spawnPoints.length; attempt++) {
    if (trySpawnEnemy()) {
      G.spawnTimer = Math.max(0.8, rand(1.25, 1.85) * getDiff().spawnMul - G.stageIndex * 0.12);
      updateHUD(true);
      return;
    }
  }
  G.spawnTimer = 0.4;
}

function canStep(tank, dir, dist = 5) {
  const d = DIRS[dir];
  return canMoveTank(tank, tank.x + d.x * dist, tank.y + d.y * dist);
}

function nearestPlayer(cx, cy) {
  const players = [G.player, G.player2].filter(Boolean);
  if (!players.length) return null;
  let best = null;
  let bestDist = Infinity;
  for (const p of players) {
    const dx = p.x + p.w / 2 - cx;
    const dy = p.y + p.h / 2 - cy;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) { bestDist = dist; best = p; }
  }
  return best;
}

function weakestPlayer(cx, cy) {
  // 困难模式优先攻击低血量 / 无护盾的玩家
  const players = [G.player, G.player2].filter(Boolean);
  if (!players.length) return null;
  let best = null;
  let bestScore = Infinity;
  for (const p of players) {
    const dx = p.x + p.w / 2 - cx;
    const dy = p.y + p.h / 2 - cy;
    const dist = Math.hypot(dx, dy);
    const shielded = (p.shieldTimer || 0) > 0 ? 1 : 0;
    const score = dist * 0.4 + shielded * 9999;
    if (score < bestScore) { bestScore = score; best = p; }
  }
  return best;
}

function chooseEnemyDir(e) {
  const d = getDiff();
  const available = DIR_LIST.filter(dir => canStep(e, dir, 5));
  if (!available.length) {
    e.thinkTimer = rand(0.25, 0.55);
    e.stuckCount = (e.stuckCount || 0) + 1;
    return;
  }
  e.stuckCount = 0;
  let options = available.filter(dir => dir !== OPPOSITE[e.dir]);
  if (!options.length) options = available;

  const ecx = e.x + e.w / 2;
  const ecy = e.y + e.h / 2;
  const players = [G.player, G.player2].filter(Boolean);

  // —— 目标选择（难度驱动的攻击欲望） ——
  let target = null;
  const roll = Math.random();
  const hasPlayers = players.length > 0;
  if (hasPlayers && roll < d.aiAggression) {
    target = d.aiSmartness > 0.7 ? weakestPlayer(ecx, ecy) : nearestPlayer(ecx, ecy);
  } else if (G.base && G.base.alive && roll < d.aiAggression + d.baseBias) {
    target = G.base;
  } else if (hasPlayers) {
    target = nearestPlayer(ecx, ecy);
  } else if (G.base && G.base.alive) {
    target = G.base;
  }

  let desired = null;
  if (target) {
    const tcx = target.x + target.w / 2;
    const tcy = target.y + target.h / 2;
    const dx = tcx - ecx;
    const dy = tcy - ecy;

    // 若能直视目标，优先把炮口对准目标（更容易开火命中）
    const losClear = lineClear(ecx, ecy, tcx, tcy);
    if (losClear && Math.abs(dx) < 18 && Math.abs(dy) > 24) {
      desired = dy < 0 ? 'up' : 'down';
    } else if (losClear && Math.abs(dy) < 18 && Math.abs(dx) > 24) {
      desired = dx < 0 ? 'left' : 'right';
    }

    // 否则按距离主轴选择方向
    if (!desired || !options.includes(desired)) {
      const prefs = Math.abs(dx) > Math.abs(dy)
        ? [dx > 0 ? 'right' : 'left', dy > 0 ? 'down' : 'up']
        : [dy > 0 ? 'down' : 'up', dx > 0 ? 'right' : 'left'];
      desired = prefs.find(dir => options.includes(dir)) || null;
    }

    // 受阻时尝试侧翼绕行（难度越高越愿意绕）
    if (!desired && Math.random() < d.flankChance) {
      const perp = Math.abs(dx) > Math.abs(dy)
        ? [dy > 0 ? 'down' : 'up', dy < 0 ? 'up' : 'down']
        : [dx > 0 ? 'right' : 'left', dx < 0 ? 'left' : 'right'];
      desired = perp.find(dir => options.includes(dir)) || null;
    }

    // 仍无解：随机换个方向（避免原地踏步）
    if (!desired && Math.random() < 0.4 + d.aiSmartness * 0.5) {
      desired = options.find(dir => dir !== e.dir) || null;
    }
  }

  // 简单模式加入少量随机游走，降低追击效率
  if (!desired || (d.aiSmartness === 0 && Math.random() < 0.4)) {
    desired = pick(options);
  }
  e.dir = desired || pick(options);
  e.thinkTimer = rand(0.55 - d.aiSmartness * 0.2, 1.7 - d.aiSmartness * 0.4);
}

function lineClear(x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 11));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    const type = cellAt(Math.floor(x / CELL), Math.floor(y / CELL));
    if (type === 1 || type === 2) return false;
  }
  return true;
}

function predictTargetPos(e, target, stats, aimLead) {
  const tcx = target.x + target.w / 2;
  const tcy = target.y + target.h / 2;
  if (!target.moving || !aimLead) return { x: tcx, y: tcy };
  const dv = DIRS[target.dir];
  if (!dv) return { x: tcx, y: tcy };
  const dist = Math.hypot(tcx - (e.x + e.w / 2), tcy - (e.y + e.h / 2));
  const t = dist / stats.bulletSpeed;
  return {
    x: tcx + dv.x * target.speed * t * aimLead,
    y: tcy + dv.y * target.speed * t * aimLead
  };
}

function tryEnemyFire(e) {
  if (e.fireTimer > 0 || G.freezeTimer > 0) return;
  const d = getDiff();
  const stats = ENEMY_TYPES[e.type];
  e.fireTimer = Math.max(0.28, rand(stats.fireMin, stats.fireMax) * d.fireMul * (1 - G.stageIndex * 0.09));
  if (G.bullets.some(b => b.source === e && !b.dead)) return;

  const ecx = e.x + e.w / 2;
  const ecy = e.y + e.h / 2;
  // 难度越高，对齐容差越大（更容易擦边命中）
  const alignTol = 12 + d.aiSmartness * 14;

  const playerTargets = [G.player, G.player2].filter(Boolean);
  const targets = [];
  for (const p of playerTargets) {
    targets.push({ ref: p, isPlayer: true });
  }
  if (G.base && G.base.alive) targets.push({ ref: G.base, isPlayer: false });

  // 优先攻击玩家（攻击欲望），按距离排序
  targets.sort((a, b) => {
    if (a.isPlayer !== b.isPlayer) return a.isPlayer ? -1 : 1;
    const da = Math.hypot(a.ref.x - ecx, a.ref.y - ecy);
    const db = Math.hypot(b.ref.x - ecx, b.ref.y - ecy);
    return da - db;
  });

  for (const t of targets) {
    const aimLead = t.isPlayer ? d.aimLead : 0;
    const pred = predictTargetPos(e, t.ref, stats, aimLead);
    const dx = pred.x - ecx;
    const dy = pred.y - ecy;
    if (Math.abs(dx) < alignTol && Math.abs(dy) > 30) {
      const dir = dy < 0 ? 'up' : 'down';
      if (lineClear(ecx, ecy, pred.x, pred.y)) {
        e.dir = dir;
        fireEnemyBullet(e);
        return;
      }
    }
    if (Math.abs(dy) < alignTol && Math.abs(dx) > 30) {
      const dir = dx < 0 ? 'left' : 'right';
      if (lineClear(ecx, ecy, pred.x, pred.y)) {
        e.dir = dir;
        fireEnemyBullet(e);
        return;
      }
    }
  }

  // 盲射：朝当前方向前方试探开火（难度越高越频繁）
  if (Math.random() < d.blindFire) {
    const dv = DIRS[e.dir];
    const probe = 70;
    if (!wallBlocks(ecx + dv.x * probe - 3, ecy + dv.y * probe - 3, 6, 6)) fireEnemyBullet(e);
  }
}

function fireEnemyBullet(e) {
  if (e.fireTimer <= 0) e.fireTimer = 0.4;
  const stats = ENEMY_TYPES[e.type];
  const es = enemySkin(e.type);
  const d = DIRS[e.dir];
  const cx = e.x + e.w / 2 + d.x * 25;
  const cy = e.y + e.h / 2 + d.y * 25;
  G.bullets.push({
    x: cx - 3,
    y: cy - 3,
    w: 6,
    h: 6,
    dir: e.dir,
    vx: d.x * stats.bulletSpeed,
    vy: d.y * stats.bulletSpeed,
    owner: 'enemy',
    source: e,
    power: 1,
    color: es.color,
    life: 0,
    dead: false
  });
  sparkBurst(cx, cy, es.color, 3, 0.4);
  AudioFX.sfx('enemyShoot');
}

function updateEnemies(dt) {
  for (const e of G.enemies) {
    if (e.dead) continue;
    e.invuln = Math.max(0, e.invuln - dt);
    e.flash = Math.max(0, e.flash - dt);
    if (e.spawnTimer > 0) {
      e.spawnTimer = Math.max(0, e.spawnTimer - dt);
      e.moving = false;
      continue;
    }
    if (G.freezeTimer > 0) {
      e.moving = false;
      continue;
    }
    e.fireTimer -= dt;
    e.thinkTimer -= dt;
    if (e.thinkTimer <= 0) chooseEnemyDir(e);
    if (!moveTank(e, dt)) {
      e.thinkTimer = 0;
      chooseEnemyDir(e);
    }
    tryEnemyFire(e);
  }
}

/* ---------------- bullets & damage ---------------- */
function damageEnemy(e, bullet) {
  if (e.dead || e.invuln > 0 || e.spawnTimer > 0) {
    sparkBurst(bullet.x + 3, bullet.y + 3, '#dffbff', 5, 0.7);
    AudioFX.sfx('impact');
    return;
  }
  e.hp -= 1;
  e.flash = 0.18;
  sparkBurst(e.x + e.w / 2, e.y + e.h / 2, ENEMY_TYPES[e.type].color, 10, 1);
  AudioFX.sfx('hit');
  if (e.hp <= 0) e.dead = true;
}

function cleanupEnemies() {
  const dead = G.enemies.filter(e => e.dead);
  if (!dead.length) return;
  for (const e of dead) {
    const stats = ENEMY_TYPES[e.type];
    const cx = e.x + e.w / 2;
    const cy = e.y + e.h / 2;
    explosion(cx, cy, stats.color, e.type === 'brute' ? 1.35 : 1.05);
    addScore(Math.round(stats.score * (1 + G.stageIndex * 0.15)), cx, cy - 12, stats.color);
    G.stageKills++;
    if (e.carrier || Math.random() < 0.085) dropPowerup(cx, cy);
  }
  AudioFX.sfx('explosion');
  G.enemies = G.enemies.filter(e => !e.dead);
  updateHUD(true);
}

function dropPowerup(x, y) {
  const total = POWER_TYPES.reduce((sum, p) => sum + p.weight, 0);
  let roll = Math.random() * total;
  let type = POWER_TYPES[0];
  for (const p of POWER_TYPES) {
    roll -= p.weight;
    if (roll <= 0) { type = p; break; }
  }
  G.powerups.push({
    x: clamp(x - 13, 7, W - 33),
    y: clamp(y - 13, 7, H - 33),
    w: 26,
    h: 26,
    type: type.type,
    label: type.label,
    name: type.name,
    color: type.color,
    life: 18,
    maxLife: 18,
    phase: rand(0, Math.PI * 2)
  });
}

function applyPowerup(pu, p) {
  if (!p) return;
  const idx = p.index || 0;
  const labelX = p.x + 22;
  const labelY = p.y - 6;
  switch (pu.type) {
    case 'power':
      if (idx === 1) {
        if (G.weapon2 < 3) {
          G.weapon2++;
          floatText(labelX, labelY, 'P2 WEAPON ' + G.weapon2, PLAYER_COLORS[1].main);
        } else {
          addScore(500, labelX, labelY, PLAYER_COLORS[1].main);
        }
      } else if (G.weapon < 3) {
        G.weapon++;
        floatText(labelX, labelY, 'WEAPON ' + G.weapon, PLAYER_COLORS[0].main);
      } else {
        addScore(500, labelX, labelY, PLAYER_COLORS[0].main);
      }
      break;
    case 'shield':
      p.shieldTimer = Math.max(p.shieldTimer, 9);
      floatText(labelX, labelY, 'SHIELD 9s', '#b8a8ff');
      break;
    case 'rapid':
      p.rapidTimer = Math.max(p.rapidTimer, 10);
      floatText(labelX, labelY, 'RAPID FIRE', '#ffd166');
      break;
    case 'emp':
      G.freezeTimer = Math.max(G.freezeTimer, 7);
      for (const e of G.enemies) sparkBurst(e.x + e.w / 2, e.y + e.h / 2, '#b8a8ff', 6, 0.8);
      floatText(labelX, labelY, 'EMP // 7s', '#b8a8ff');
      AudioFX.sfx('emp');
      break;
    case 'nuke':
      G.shake = 16;
      for (const e of G.enemies) {
        if (!e.dead) e.dead = true;
      }
      cleanupEnemies();
      floatText(labelX, labelY, 'DATA NUKE', '#ff2bd6');
      break;
    case 'life':
      if (idx === 1) G.lives2++;
      else G.lives++;
      p.shieldTimer = Math.max(p.shieldTimer, 3);
      floatText(labelX, labelY, 'ARMOR +1', '#ff4f6d');
      break;
    default:
      break;
  }
  sparkBurst(pu.x + 13, pu.y + 13, pu.color, 18, 1.4);
  AudioFX.sfx('power');
  updateHUD(true);
}

function updatePowerups(dt) {
  for (const pu of G.powerups) {
    pu.life -= dt;
    if (pu.collected) continue;
    for (const p of [G.player, G.player2]) {
      if (p && overlap(padBox(p, 2), pu)) {
        pu.life = 0;
        pu.collected = true;
        applyPowerup(pu, p);
        break;
      }
    }
  }
  G.powerups = G.powerups.filter(pu => pu.life > 0 && !pu.collected);
}

function damageWall(c, r, type, bullet) {
  const x = c * CELL;
  const y = r * CELL;
  const cx = x + CELL / 2;
  const cy = y + CELL / 2;
  if (type === 1) {
    G.walls[r][c] = 0;
    G.wallVersion++;
    sparkBurst(cx, cy, '#ff2bd6', 7, 0.85);
    if (bullet.power >= 2) {
      const cross = [[0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [dc, dr] of cross) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && G.walls[nr][nc] === 1) {
          G.walls[nr][nc] = 0;
          sparkBurst(nc * CELL + 12, nr * CELL + 12, '#ff2bd6', 3, 0.6);
        }
      }
    }
    if (bullet.power >= 3) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nc = c + dc;
          const nr = r + dr;
          if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && G.walls[nr][nc] === 1) {
            G.walls[nr][nc] = 0;
          }
        }
      }
    }
    AudioFX.sfx('brick');
    G.shake = Math.max(G.shake, 1.5);
  } else {
    if (bullet.power >= 3) {
      G.walls[r][c] = 0;
      G.wallVersion++;
      explosion(cx, cy, '#6ff8ff', 0.65);
      AudioFX.sfx('steel');
    } else {
      sparkBurst(cx, cy, '#84f7ff', 8, 0.8);
      AudioFX.sfx('steel');
    }
  }
}

function bulletHitWall(b) {
  const c0 = Math.floor(b.x / CELL);
  const c1 = Math.floor((b.x + b.w - 0.01) / CELL);
  const r0 = Math.floor(b.y / CELL);
  const r1 = Math.floor((b.y + b.h - 0.01) / CELL);
  for (let r = r0; r <= r1; r++) {
    for (let c = c0; c <= c1; c++) {
      const type = cellAt(c, r);
      if (type === 1 || type === 2) {
        damageWall(c, r, type, b);
        b.dead = true;
        return true;
      }
    }
  }
  return false;
}

function bulletHitTanks(b) {
  if (b.owner === 'player') {
    for (const e of G.enemies) {
      if (e.dead) continue;
      if (overlap(b, padBox(e, 2))) {
        damageEnemy(e, b);
        b.dead = true;
        return true;
      }
    }
  } else if (b.owner === 'enemy') {
    for (const p of [G.player, G.player2]) {
      if (!p) continue;
      if (overlap(b, padBox(p, 2))) {
        b.dead = true;
        if (p.shieldTimer > 0 || p.spawnTimer > 0) {
          sparkBurst(b.x + 3, b.y + 3, '#b8a8ff', 9, 0.9);
          AudioFX.sfx('impact');
        } else {
          killPlayer(p);
        }
        return true;
      }
    }
  }
  return false;
}

function hitBase(b) {
  if (!G.base.alive) return;
  G.base.alive = false;
  G.base.hitFlash = 1;
  explosion(G.base.x + 24, G.base.y + 24, '#ff3d5a', 2.3, true);
  AudioFX.sfx('explosion');
  triggerGameOver('CORE BREACH');
}

function updateBullets(dt) {
  for (const b of G.bullets) {
    if (b.dead) continue;
    b.life += dt;
    const speed = Math.hypot(b.vx, b.vy);
    const steps = Math.max(1, Math.ceil(speed * dt / 7));
    for (let s = 0; s < steps; s++) {
      if (b.dead) break;
      b.x += b.vx * dt / steps;
      b.y += b.vy * dt / steps;

      if (b.x < -4 || b.y < -4 || b.x + b.w > W + 4 || b.y + b.h > H + 4) {
        b.dead = true;
        sparkBurst(clamp(b.x, 3, W - 3), clamp(b.y, 3, H - 3), b.color, 4, 0.55);
        break;
      }

      if (G.base.alive && overlap(b, padBox(G.base, 1))) {
        b.dead = true;
        if (b.owner === 'enemy') {
          hitBase(b);
        } else {
          sparkBurst(b.x + 3, b.y + 3, '#00f0ff', 8, 0.8);
          AudioFX.sfx('steel');
        }
        break;
      }

      if (bulletHitWall(b)) break;
      if (bulletHitTanks(b)) break;
    }
  }

  for (let i = 0; i < G.bullets.length; i++) {
    const a = G.bullets[i];
    if (a.dead) continue;
    for (let j = i + 1; j < G.bullets.length; j++) {
      const b = G.bullets[j];
      if (b.dead || a.owner === b.owner) continue;
      if (overlap(a, b)) {
        a.dead = true;
        b.dead = true;
        sparkBurst((a.x + b.x) / 2 + 3, (a.y + b.y) / 2 + 3, '#ffffff', 9, 0.9);
        AudioFX.sfx('impact');
        break;
      }
    }
  }

  G.bullets = G.bullets.filter(b => !b.dead);
}

/* ---------------- game flow ---------------- */
function playerColor(p) {
  return PLAYER_COLORS[p && p.index === 1 ? 1 : 0].main;
}

function killPlayer(p) {
  if (!p) return;
  const idx = p.index === 1 ? 1 : 0;
  if (idx === 1) {
    if (G.player2 !== p) return;
    G.player2 = null;
    G.lives2--;
    G.weapon2 = 1;
    G.respawnTimer2 = G.lives2 > 0 ? 1.45 : 0;
  } else {
    if (G.player !== p) return;
    G.player = null;
    G.lives--;
    G.weapon = 1;
    G.respawnTimer = G.lives > 0 ? 1.45 : 0;
  }
  explosion(p.x + p.w / 2, p.y + p.h / 2, playerColor(p), 1.6);
  AudioFX.sfx('playerDeath');
  G.shake = Math.max(G.shake, 10);
  updateHUD(true);
  const allOut = G.lives <= 0 && (G.playerCount < 2 || G.lives2 <= 0);
  if (allOut) triggerGameOver('ARMOR LOST');
}

function triggerGameOver(reason) {
  if (G.state === 'gameover' || G.state === 'victory') return;
  for (const p of [G.player, G.player2]) {
    if (p) explosion(p.x + 22, p.y + 22, playerColor(p), 1.2);
  }
  G.player = null;
  G.player2 = null;
  G.bullets = [];
  G.state = 'gameover';
  G.endReason = reason || 'SIGNAL LOST';
  G.endTimer = 1.1;
  G.endShown = false;
  G.shake = Math.max(G.shake, 12);
  AudioFX.sfx('gameover');
  saveHiScore();
  clearKeys();
  updateHUD(true);
}

function markCleared(index) {
  G.cleared[index] = true;
  const mask = G.cleared.reduce((m, done, i) => done ? (m | (1 << i)) : m, 0);
  try {
    localStorage.setItem(CLEARED_KEY, String(mask));
  } catch (err) { /* ignored */ }
  const highest = G.cleared.reduce((last, done, i) => done ? i : last, -1);
  G.maxUnlocked = clamp(highest + 1, 0, STAGES.length - 1);
}

function checkStageClear() {
  if (G.state !== 'playing') return;
  if (G.queue.length || G.enemies.length) return;
  const armor = G.lives + (G.playerCount > 1 ? G.lives2 : 0);
  G.stageBonus = 1200 + armor * 250;
  G.score += G.stageBonus;
  if (G.score > G.hiScore) G.hiScore = G.score;
  saveHiScore();
  markCleared(G.stageIndex);
  G.bullets = [];
  AudioFX.sfx('clear');
  if (G.stageIndex >= STAGES.length - 1) {
    G.state = 'victory';
  } else {
    G.state = 'stageclear';
  }
  G.endTimer = 1.0;
  G.endShown = false;
  clearKeys();
  updateHUD(true);
}

function saveHiScore() {
  try {
    localStorage.setItem(HS_KEY, String(G.hiScore));
  } catch (err) { /* ignored */ }
}

/* =========================================================
   DOM / UI
   ========================================================= */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlayEl = document.getElementById('overlay');
const bannerEl = document.getElementById('banner');
const bannerMainEl = bannerEl.querySelector('.banner-main');
const bannerSubEl = bannerEl.querySelector('.banner-sub');

const els = {
  scoreVal: document.getElementById('scoreVal'),
  hiVal: document.getElementById('hiVal'),
  stageVal: document.getElementById('stageVal'),
  stageTotal: document.getElementById('stageTotal'),
  enemyCount: document.getElementById('enemyCount'),
  lifeIcons: document.getElementById('lifeIcons'),
  lifeIcons2: document.getElementById('lifeIcons2'),
  weaponLabel: document.getElementById('weaponLabel'),
  weaponLabel2: document.getElementById('weaponLabel2'),
  weaponBars: Array.from(document.querySelectorAll('#weaponBars i')),
  weaponBars2: Array.from(document.querySelectorAll('#weaponBars2 i')),
  enemyTicks: document.getElementById('enemyTicks'),
  coreStatus: document.getElementById('coreStatus'),
  coreTrack: document.querySelector('.core-track'),
  coreIntegrity: document.getElementById('coreIntegrity'),
  buffRow: document.getElementById('buffRow'),
  sectorName: document.getElementById('sectorName'),
  headerSector: document.getElementById('headerSector'),
  audioBtn: document.getElementById('audioBtn'),
  audioLabel: document.getElementById('audioLabel'),
  netChip: document.getElementById('netChip'),
  netStatusVal: document.getElementById('netStatusVal')
};

function fitCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
}

function buildHudTicks() {
  els.enemyTicks.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const tick = document.createElement('i');
    tick.className = 'tick lit';
    els.enemyTicks.appendChild(tick);
  }
}

function setText(el, text) {
  if (el && el.textContent !== text) el.textContent = text;
}

function updateHUD(force = false) {
  const remaining = G.queue.length + G.enemies.length;
  const cfg = STAGES[G.stageIndex] || STAGES[0];

  setText(els.scoreVal, fmt(G.score));
  setText(els.hiVal, fmt(G.hiScore));
  setText(els.stageVal, String(G.stage).padStart(2, '0'));
  setText(els.stageTotal, '/ ' + String(STAGES.length).padStart(2, '0'));
  setText(els.enemyCount, String(remaining).padStart(2, '0'));
  setText(els.sectorName, cfg.name);
  setText(els.headerSector, `${String(G.stage).padStart(2, '0')}/${String(STAGES.length).padStart(2, '0')}`);

  const weaponNames = ['PULSE I', 'PULSE II', 'OVERDRIVE'];
  setText(els.weaponLabel, weaponNames[clamp(G.weapon - 1, 0, 2)]);
  els.weaponBars.forEach((bar, i) => bar.classList.toggle('lit', i < G.weapon));
  setText(els.weaponLabel2, weaponNames[clamp(G.weapon2 - 1, 0, 2)]);
  els.weaponBars2.forEach((bar, i) => bar.classList.toggle('lit', i < G.weapon2));

  const ticks = els.enemyTicks.children;
  for (let i = 0; i < ticks.length; i++) {
    ticks[i].classList.toggle('lit', i < remaining);
  }
  els.enemyTicks.classList.toggle('danger', remaining <= 5);

  const coreAlive = !!(G.base && G.base.alive);
  if (force || G._hudCache.core !== coreAlive) {
    els.coreStatus.innerHTML = '<i></i>' + (coreAlive ? 'ONLINE' : 'BREACH');
    els.coreStatus.classList.toggle('breach', !coreAlive);
    els.coreTrack.classList.toggle('breach', !coreAlive);
    setText(els.coreIntegrity, coreAlive ? '100%' : '0%');
    G._hudCache.core = coreAlive;
  }

  if (force || G._hudCache.lives !== G.lives) {
    const slotCount = Math.max(3, Math.min(6, G.lives));
    let html = '';
    for (let i = 0; i < slotCount; i++) {
      html += `<i class="life-icon${i < G.lives ? '' : ' empty'}"></i>`;
    }
    if (G.lives > 6) html += `<span class="life-more">+${G.lives - 6}</span>`;
    els.lifeIcons.innerHTML = html;
    G._hudCache.lives = G.lives;
  }

  if (force || G._hudCache.lives2 !== G.lives2) {
    const slotCount = Math.max(3, Math.min(6, G.lives2));
    let html = '';
    for (let i = 0; i < slotCount; i++) {
      html += `<i class="life-icon${i < G.lives2 ? '' : ' empty'}"></i>`;
    }
    if (G.lives2 > 6) html += `<span class="life-more">+${G.lives2 - 6}</span>`;
    els.lifeIcons2.innerHTML = html;
    G._hudCache.lives2 = G.lives2;
  }

  let buffHtml = '';
  const p = G.player;
  if (p && p.shieldTimer > 0) buffHtml += `<span class="buff">SHIELD ${p.shieldTimer.toFixed(1)}s</span>`;
  if (p && p.rapidTimer > 0) buffHtml += `<span class="buff rapid">RAPID ${p.rapidTimer.toFixed(1)}s</span>`;
  const p2 = G.player2;
  if (p2 && p2.shieldTimer > 0) buffHtml += `<span class="buff p2-shield">P2 SHIELD ${p2.shieldTimer.toFixed(1)}s</span>`;
  if (p2 && p2.rapidTimer > 0) buffHtml += `<span class="buff rapid">P2 RAPID ${p2.rapidTimer.toFixed(1)}s</span>`;
  if (G.freezeTimer > 0) buffHtml += `<span class="buff emp">EMP ${G.freezeTimer.toFixed(1)}s</span>`;
  if (!buffHtml) buffHtml = '<span class="buff-idle">NO ACTIVE MODS</span>';
  if (force || G._hudCache.buffs !== buffHtml) {
    els.buffRow.innerHTML = buffHtml;
    G._hudCache.buffs = buffHtml;
  }
}

function updateAudioUI() {
  AudioFX.muted = G.muted;
  els.audioLabel.textContent = G.muted ? 'AUDIO OFF' : 'AUDIO ON';
  els.audioBtn.classList.toggle('muted', G.muted);
}

function toggleAudio() {
  G.muted = !G.muted;
  AudioFX.setMuted(G.muted);
  updateAudioUI();
  try { localStorage.setItem(AUDIO_KEY, G.muted ? '1' : '0'); } catch (err) { /* ignored */ }
}

/* ---------------- overlays ---------------- */
function setOverlay(html, extraClass = '') {
  overlayEl.className = 'overlay' + (extraClass ? ' ' + extraClass : '');
  overlayEl.innerHTML = html;
}

function hideOverlay() {
  overlayEl.classList.add('is-hidden');
}

let bannerTimer = null;
function showBanner(main, sub = '', duration = 2300) {
  bannerMainEl.textContent = main;
  bannerSubEl.textContent = sub;
  bannerEl.classList.add('show');
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => bannerEl.classList.remove('show'), duration);
}

function hideBanner() {
  bannerEl.classList.remove('show');
  clearTimeout(bannerTimer);
}

function sectorCardsHTML(currentIndex = -1) {
  return STAGES.map((cfg, i) => {
    const cleared = !!G.cleared[i];
    const unlocked = i <= G.maxUnlocked || cleared;
    const cls = ['sector-card'];
    if (cleared) cls.push('cleared');
    if (i === currentIndex) cls.push('current');
    if (!unlocked) cls.push('locked');
    let state = '未解锁 · LOCKED';
    if (cleared) state = '已通关 · CLEARED';
    else if (unlocked) state = '可部署 · READY';
    if (i === currentIndex && G.state === 'stageclear') state = '当前区域 · CURRENT';
    return `<button class="${cls.join(' ')}" type="button" data-action="pick-stage" data-stage="${i}" ${unlocked ? '' : 'disabled'}>
      <span class="s-code">${cfg.code}</span>
      <b>${cfg.cn}</b>
      <small>${state}</small>
    </button>`;
  }).join('');
}

function difficultyButtonsHTML() {
  const cur = G.difficulty;
  return ['easy', 'normal', 'hard'].map(key => {
    const cfg = DIFFICULTIES[key];
    const active = key === cur;
    return `<button class="diff-btn ${active ? 'active' : ''}" type="button" data-action="set-difficulty" data-diff="${key}" style="${active ? `--diff-color:${cfg.color}` : ''}">
      <span class="diff-dot" style="background:${cfg.color};box-shadow:0 0 8px ${cfg.color}"></span>
      <span class="diff-label">${cfg.label}</span>
      <span class="diff-en">${cfg.en}</span>
    </button>`;
  }).join('');
}

function setDifficulty(key) {
  if (!DIFFICULTIES[key]) return;
  G.difficulty = key;
  try { localStorage.setItem(DIFF_KEY, key); } catch (err) { /* ignore */ }
  // 如果当前在标题/选关界面，刷新 overlay 以高亮
  if (G.state === 'title') showTitle();
  else if (G.state === 'select') showStageSelect();
  updateHUD(true);
}

/* =========================================================
   MAP EDITOR · 地图编辑器
   ========================================================= */
const EDITOR_TILES = [
  { ch: '@', label: '敌人出生点', color: '#ff4fd8' },
  { ch: '1', label: 'P1 出生点', color: '#00f0ff' },
  { ch: '2', label: 'P2 出生点', color: '#ffcf4d' },
  { ch: '.', label: '空地', color: 'transparent' },
  { ch: 'B', label: '砖墙', color: '#ff2bd6' },
  { ch: 'S', label: '钢墙', color: '#84f7ff' },
  { ch: 'W', label: '水域', color: '#3b6fff' },
  { ch: 'T', label: '丛林', color: '#00ffa3' },
  { ch: 'E', label: '基地', color: '#ffcf4d' }
];

const Editor = {
  active: false,
  tab: 'map',
  tool: 'B',
  map: null,
  cell: 30,
  difficulty: 'normal',
  lives: 3,
  backgroundImage: null,
  bgm: null,
  spawns: [],
  enemyCounts: { drone: 6, hunter: 10, brute: 3, phantom: 1 },
  playerSpawns: { p1: { r: 12, c: 4 }, p2: { r: 12, c: 8 } }
};

function defaultEditorMap() {
  const m = Array.from({ length: 13 }, () => '.'.repeat(13).split(''));
  m[12][6] = 'E';
  return m.map(row => row.join(''));
}

function defaultEditorSpawns() {
  return [{ r: 0, c: 0 }, { r: 0, c: 6 }, { r: 0, c: 12 }];
}

function editorMapFromStrings(strs) {
  const m = (strs && strs.length === 13) ? strs.slice() : defaultEditorMap();
  return m.map(r => (r + '.............').slice(0, 13));
}

function editorPlayerSpawnDefaults(map) {
  const base = findBase(map);
  return {
    p1: { r: base.r, c: Math.max(0, base.c - 2) },
    p2: { r: base.r, c: Math.min(12, base.c + 2) }
  };
}

function normalizeEditorPlayerSpawns(points, map) {
  const defaults = editorPlayerSpawnDefaults(map);
  const normalized = {};
  for (const key of ['p1', 'p2']) {
    const point = points && points[key];
    normalized[key] = point && Number.isInteger(point.r) && Number.isInteger(point.c)
      && point.r >= 0 && point.r < 13 && point.c >= 0 && point.c < 13 && map[point.r][point.c] === '.'
      ? { r: point.r, c: point.c }
      : defaults[key];
  }
  if (normalized.p1.r === normalized.p2.r && normalized.p1.c === normalized.p2.c) normalized.p2 = defaults.p2;
  return normalized;
}

function loadCustomData() {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return { map: defaultEditorMap(), theme: null, difficulty: G.difficulty, images: {}, lives: 3, backgroundImage: null, bgm: null, spawns: defaultEditorSpawns(), enemyCounts: { drone: 6, hunter: 10, brute: 3, phantom: 1 }, playerSpawns: { p1: { r: 12, c: 4 }, p2: { r: 12, c: 8 } } };
    const obj = JSON.parse(raw);
    return {
      map: editorMapFromStrings(obj.map),
      theme: obj.theme || null,
      difficulty: DIFFICULTIES[obj.difficulty] ? obj.difficulty : G.difficulty,
      images: obj.images || {},
      lives: clamp(parseInt(obj.lives, 10) || 3, 1, 99),
      backgroundImage: obj.backgroundImage || null,
      bgm: obj.bgm || null,
      spawns: Array.isArray(obj.spawns) ? obj.spawns.filter(p => Number.isInteger(p.r) && Number.isInteger(p.c) && p.r >= 0 && p.r < 13 && p.c >= 0 && p.c < 13) : defaultEditorSpawns(),
      enemyCounts: Object.fromEntries(['drone', 'hunter', 'brute', 'phantom'].map(type => {
        const value = parseInt(obj.enemyCounts && obj.enemyCounts[type], 10);
        return [type, clamp(Number.isFinite(value) ? value : ({ drone: 6, hunter: 10, brute: 3, phantom: 1 }[type]), 0, 99)];
      })),
      playerSpawns: normalizeEditorPlayerSpawns(obj.playerSpawns, editorMapFromStrings(obj.map))
    };
  } catch (err) {
    return { map: defaultEditorMap(), theme: null, difficulty: G.difficulty, images: {}, lives: 3, backgroundImage: null, bgm: null, spawns: defaultEditorSpawns(), enemyCounts: { drone: 6, hunter: 10, brute: 3, phantom: 1 }, playerSpawns: { p1: { r: 12, c: 4 }, p2: { r: 12, c: 8 } } };
  }
}

function saveCustomData(map, theme, difficulty = Editor.difficulty, lives = Editor.lives, backgroundImage = Editor.backgroundImage) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify({ map, theme, difficulty, lives, backgroundImage, bgm: Editor.bgm, spawns: Editor.spawns, enemyCounts: Editor.enemyCounts, playerSpawns: Editor.playerSpawns, images: SKIN_IMAGES }));
    return true;
  } catch (err) {
    return false;
  }
}

function drawEditorGrid() {
  const canvas = document.getElementById('editorCanvas');
  if (!canvas) return;
  const ectx = canvas.getContext('2d');
  const cell = Editor.cell;
  const size = cell * 13;
  ectx.clearRect(0, 0, size, size);

  // background
  ectx.fillStyle = '#070a14';
  ectx.fillRect(0, 0, size, size);

  for (let r = 0; r < 13; r++) {
    for (let c = 0; c < 13; c++) {
      const ch = Editor.map[r][c];
      const x = c * cell;
      const y = r * cell;
      if (ch === 'B') {
        ectx.fillStyle = '#3a1530';
        ectx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ectx.fillStyle = '#ff2bd6';
        ectx.globalAlpha = 0.85;
        ectx.fillRect(x + 3, y + 3, cell - 6, cell - 6);
        ectx.globalAlpha = 1;
      } else if (ch === 'S') {
        ectx.fillStyle = '#1a2a2e';
        ectx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ectx.strokeStyle = '#84f7ff';
        ectx.lineWidth = 1.5;
        ectx.strokeRect(x + 3, y + 3, cell - 6, cell - 6);
        ectx.strokeRect(x + 7, y + 7, cell - 14, cell - 14);
      } else if (ch === 'W') {
        ectx.fillStyle = '#0d1b4a';
        ectx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ectx.fillStyle = '#3b6fff';
        ectx.globalAlpha = 0.5;
        ectx.fillRect(x + 4, y + cell / 2 - 2, cell - 8, 3);
        ectx.globalAlpha = 1;
      } else if (ch === 'T') {
        ectx.fillStyle = '#06241c';
        ectx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ectx.fillStyle = '#00ffa3';
        ectx.globalAlpha = 0.7;
        ectx.beginPath();
        ectx.arc(x + cell / 2, y + cell / 2, cell / 3.5, 0, Math.PI * 2);
        ectx.fill();
        ectx.globalAlpha = 1;
      } else if (ch === 'E') {
        ectx.fillStyle = '#2a1f05';
        ectx.fillRect(x + 1, y + 1, cell - 2, cell - 2);
        ectx.fillStyle = '#ffcf4d';
        ectx.font = `bold ${Math.floor(cell * 0.6)}px sans-serif`;
        ectx.textAlign = 'center';
        ectx.textBaseline = 'middle';
        ectx.fillText('⬢', x + cell / 2, y + cell / 2 + 1);
      }
    }
  }

  // grid lines
  ectx.strokeStyle = 'rgba(0,240,255,0.15)';
  ectx.lineWidth = 1;
  for (let i = 0; i <= 13; i++) {
    ectx.beginPath();
    ectx.moveTo(i * cell + 0.5, 0);
    ectx.lineTo(i * cell + 0.5, size);
    ectx.stroke();
    ectx.beginPath();
    ectx.moveTo(0, i * cell + 0.5);
    ectx.lineTo(size, i * cell + 0.5);
    ectx.stroke();
  }

  // Enemy spawn markers
  ectx.fillStyle = 'rgba(255,43,214,0.9)';
  ectx.font = 'bold 8px monospace';
  ectx.textAlign = 'center';
  for (const { r, c } of Editor.spawns) {
    ectx.strokeStyle = '#ff4fd8';
    ectx.lineWidth = 1.5;
    ectx.beginPath();
    ectx.arc(c * cell + cell / 2, r * cell + cell / 2, cell * 0.34, 0, Math.PI * 2);
    ectx.stroke();
    ectx.fillText('SP', c * cell + cell / 2, r * cell + cell / 2 + 3);
  }
  for (const [key, point] of Object.entries(Editor.playerSpawns)) {
    const color = key === 'p1' ? '#00f0ff' : '#ffcf4d';
    ectx.strokeStyle = color;
    ectx.lineWidth = 2;
    ectx.strokeRect(point.c * cell + 5, point.r * cell + 5, cell - 10, cell - 10);
    ectx.fillStyle = color;
    ectx.fillText(key.toUpperCase(), point.c * cell + cell / 2, point.r * cell + cell / 2 + 3);
  }
}

function setEditorCell(r, c) {
  if (r < 0 || r > 12 || c < 0 || c > 12) return;
  if (Editor.tool === '@') {
    if (Editor.map[r][c] !== '.' || Object.values(Editor.playerSpawns).some(point => point.r === r && point.c === c)) return;
    const index = Editor.spawns.findIndex(point => point.r === r && point.c === c);
    if (index >= 0) {
      if (Editor.spawns.length > 1) Editor.spawns.splice(index, 1);
    } else Editor.spawns.push({ r, c });
    drawEditorGrid();
    return;
  }
  if (Editor.tool === '1' || Editor.tool === '2') {
    const key = Editor.tool === '1' ? 'p1' : 'p2';
    const otherKey = key === 'p1' ? 'p2' : 'p1';
    if (Editor.map[r][c] !== '.' || (Editor.playerSpawns[otherKey].r === r && Editor.playerSpawns[otherKey].c === c)) return;
    Editor.playerSpawns[key] = { r, c };
    Editor.spawns = Editor.spawns.filter(point => point.r !== r || point.c !== c);
    drawEditorGrid();
    return;
  }
  if (Editor.tool === 'E') {
    // remove existing base
    for (let rr = 0; rr < 13; rr++) {
      Editor.map[rr] = Editor.map[rr].split('');
      for (let cc = 0; cc < 13; cc++) if (Editor.map[rr][cc] === 'E') Editor.map[rr][cc] = '.';
      Editor.map[rr] = Editor.map[rr].join('');
    }
  }
  const row = Editor.map[r].split('');
  row[c] = Editor.tool;
  Editor.map[r] = row.join('');
  Editor.spawns = Editor.spawns.filter(point => point.r !== r || point.c !== c);
  for (const key of ['p1', 'p2']) {
    if (Editor.playerSpawns[key].r === r && Editor.playerSpawns[key].c === c) {
      Editor.playerSpawns[key] = editorPlayerSpawnDefaults(Editor.map)[key];
    }
  }
  drawEditorGrid();
}

function editorCanvasPos(evt) {
  const canvas = document.getElementById('editorCanvas');
  const rect = canvas.getBoundingClientRect();
  const x = (evt.clientX - rect.left) * (canvas.width / rect.width);
  const y = (evt.clientY - rect.top) * (canvas.height / rect.height);
  return { c: Math.floor(x / Editor.cell), r: Math.floor(y / Editor.cell) };
}

function showEditor() {
  G.state = 'editor';
  G.stateTime = 0;
  clearKeys();
  hideBanner();
  Editor.active = true;
  Editor.tab = 'map';
  Editor.tool = 'B';
  const data = loadCustomData();
  Editor.map = data.map;
  Editor.difficulty = data.difficulty;
  Editor.lives = data.lives;
  Editor.backgroundImage = data.backgroundImage;
  Editor.bgm = data.bgm;
  Editor.spawns = data.spawns.length ? data.spawns : defaultEditorSpawns();
  Editor.enemyCounts = data.enemyCounts;
  Editor.playerSpawns = data.playerSpawns;
  CUSTOM_BACKGROUND = data.backgroundImage;
  CUSTOM_BACKGROUND_IMAGE = null;
  CUSTOM_BGM = data.bgm;
  Object.assign(SKIN_IMAGES, data.images);
  if (DIFFICULTIES[Editor.difficulty]) G.difficulty = Editor.difficulty;
  if (data.theme) applyTheme(data.theme);

  const paletteHTML = EDITOR_TILES.map(t =>
    `<button class="tile-btn ${Editor.tool === t.ch ? 'active' : ''}" type="button" data-tool="${t.ch}">
      <span class="tile-swatch" style="${t.ch === '.' ? 'background:#070a14;border:1px solid #333' : `background:${t.color}`}"></span>
      <span class="tile-label">${t.label}</span>
    </button>`
  ).join('');

  setOverlay(`
    <div class="overlay-card editor-card">
      <div class="eyebrow">MAP FORGE <span class="code">// EDITOR</span></div>
      <h1 class="game-title" data-text="MAP EDITOR" style="font-size:clamp(26px,4vw,40px)">MAP EDITOR</h1>
      <div class="cn-title">地图编辑器</div>
      <div class="editor-pane" data-pane="map">
        <div class="editor-difficulty"><span>地图难度</span><div class="diff-row">${difficultyButtonsHTML()}</div></div>
        <label class="editor-setting">初始生命数量 <input type="number" min="1" max="99" step="1" data-editor-lives value="${Editor.lives}"></label>
        <div class="editor-setting enemy-counts"><span>敌人出生数量</span>${Object.keys(Editor.enemyCounts).map(type => `<label title="${type}"><canvas class="enemy-preview" data-enemy-preview="${type}" width="44" height="44"></canvas><input aria-label="${type} 出生数量" type="number" min="0" max="99" data-enemy-count="${type}" value="${Editor.enemyCounts[type]}"></label>`).join('')}</div>
        <div class="editor-setting bgm-setting"><span>BGM</span><input type="file" accept="audio/*" data-bgm-file><button type="button" class="image-clear" data-clear-bgm>移除</button><small data-bgm-name>${Editor.bgm ? '已选择本地音乐' : '未选择音乐'}</small></div>
        <div class="editor-setting asset-setting"><span>玩家图像</span><div class="asset-files">${['p1', 'p2'].map(key => `<label>${key.toUpperCase()} <input type="file" accept="image/*" data-skin-image="${key}"><button type="button" class="image-clear" data-clear-image="${key}">移除</button></label>`).join('')}</div></div>
        <div class="editor-setting asset-setting"><span>敌方图像</span><div class="asset-files">${['drone', 'hunter', 'brute', 'phantom'].map(key => `<label title="${key}"><canvas class="enemy-preview" data-enemy-preview="${key}" width="44" height="44"></canvas><input type="file" accept="image/*" data-skin-image="${key}"><button type="button" class="image-clear" data-clear-image="${key}">移除</button></label>`).join('')}</div></div>
        <div class="editor-setting asset-setting"><span>地图背景</span><div class="asset-files"><label><input type="file" accept="image/*" data-background-image><button type="button" class="image-clear" data-clear-background>移除</button></label><small data-background-name>${Editor.backgroundImage ? '已选择本地背景' : '未选择背景'}</small></div></div>
        <div class="editor-setting spawn-legend"><span>出生点工具</span><small>粉色 SP：敌人　青色 P1：我方一号　黄色 P2：我方二号</small></div>
        <div class="editor-map-wrap">
          <canvas id="editorCanvas" width="390" height="390"></canvas>
        </div>
        <div class="editor-palette">
          <div class="palette-title">瓦片工具</div>
          <div class="palette-grid">${paletteHTML}</div>
          <div class="editor-hint">点击或拖动绘制。基地(E)只能有一个。选择出生点工具后点击空地放置；选中相同工具后点击已有敌人出生点可移除。</div>
        </div>
      </div>

      <div class="editor-actions">
        <button class="btn primary" type="button" data-action="editor-test">
          <span class="btn-main">测试地图 · TEST</span><span class="btn-sub">PLAY</span>
        </button>
        <div class="btn-row">
          <button class="btn ghost" type="button" data-action="editor-save">
            <span class="btn-main">保存</span><span class="btn-sub">SAVE</span>
          </button>
          <button class="btn ghost" type="button" data-action="editor-reset">
            <span class="btn-main">重置</span><span class="btn-sub">RESET</span>
          </button>
          <button class="btn ghost" type="button" data-action="back-title">
            <span class="btn-main">返回</span><span class="btn-sub">BACK</span>
          </button>
        </div>
      </div>
    </div>
  `);

  drawEditorGrid();
  drawEditorEnemyPreviews();
  bindEditorEvents();
}

function drawEditorEnemyPreviews() {
  document.querySelectorAll('[data-enemy-preview]').forEach(canvas => {
    const type = canvas.dataset.enemyPreview;
    const color = enemySkin(type).color;
    const c = canvas.getContext('2d');
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#070a14'; c.fillRect(2, 2, 40, 40);
    c.fillStyle = '#060a11'; c.fillRect(7, 10, 8, 25); c.fillRect(29, 10, 8, 25);
    c.fillStyle = '#150a17'; c.strokeStyle = color; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(14, 8); c.lineTo(30, 8); c.lineTo(34, 16); c.lineTo(32, 34); c.lineTo(12, 34); c.lineTo(10, 16); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.arc(22, 21, type === 'brute' ? 7 : 5.5, 0, Math.PI * 2); c.fillStyle = '#071019'; c.fill(); c.stroke();
    c.fillStyle = color; c.fillRect(20, 3, 4, 14);
    if (type === 'drone') { c.beginPath(); c.moveTo(11, 33); c.lineTo(5, 39); c.moveTo(33, 33); c.lineTo(39, 39); c.stroke(); }
    if (type === 'brute') { c.strokeRect(5, 19, 5, 11); c.strokeRect(34, 19, 5, 11); }
  });
}

function rgbaToHex(rgba) {
  // parse rgba(r,g,b,a) or #rrggbb
  if (!rgba) return '#000000';
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (m) {
    return '#' + [m[1], m[2], m[3]].map(n => parseInt(n, 10).toString(16).padStart(2, '0')).join('');
  }
  return rgba.startsWith('#') ? rgba : '#000000';
}

function setSkinValue(skinPath, value) {
  const parts = skinPath.split('.');
  // value is hex; for glow we keep rgba with alpha from original
  if (parts[0] === 'p1' || parts[0] === 'p2') {
    const pc = THEME[parts[0]];
    if (parts[1] === 'glow') {
      pc.glow = hexToRgba(value, 0.8);
    } else {
      pc[parts[1]] = value;
    }
  } else if (parts[0] === 'e') {
    const es = THEME.enemies[parts[1]];
    if (parts[2] === 'glow') es.glow = hexToRgba(value, 0.8);
    else es.color = value;
  } else if (parts[0] === 'bg') {
    const key = parts[1];
    if (key === 'base') THEME.bg.base = value;
    else THEME.bg[key] = hexToRgba(value, rgbaAlpha(THEME.bg[key]));
  }
}

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbaAlpha(rgba) {
  const m = String(rgba).match(/rgba?\([^,]+,[^,]+,[^,]+,\s*([\d.]+)/);
  return m ? parseFloat(m[1]) : 0.8;
}

function bindEditorEvents() {
  const canvas = document.getElementById('editorCanvas');
  if (canvas) {
    let drawing = false;
    const onDown = (e) => { drawing = true; const p = editorCanvasPos(e); setEditorCell(p.r, p.c); };
    const onMove = (e) => { if (drawing) { const p = editorCanvasPos(e); setEditorCell(p.r, p.c); } };
    const onUp = () => { drawing = false; };
    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }
}

function editorSave() {
  const theme = JSON.parse(JSON.stringify(THEME));
  const ok = saveCustomData(Editor.map, theme, Editor.difficulty);
  if (ok) floatTextEditor('已保存到本地');
  else floatTextEditor('保存失败');
}

function editorReset() {
  Object.assign(THEME, cloneTheme(DEFAULT_THEME));
  Object.keys(SKIN_IMAGES).forEach(key => { SKIN_IMAGES[key] = null; delete SKIN_IMAGE_CACHE[key]; });
  Editor.difficulty = 'normal';
  G.difficulty = 'normal';
  Editor.lives = 3;
  Editor.backgroundImage = null;
  Editor.bgm = null;
  Editor.spawns = defaultEditorSpawns();
  Editor.enemyCounts = { drone: 6, hunter: 10, brute: 3, phantom: 1 };
  Editor.playerSpawns = { p1: { r: 12, c: 4 }, p2: { r: 12, c: 8 } };
  CUSTOM_BACKGROUND = null;
  CUSTOM_BACKGROUND_IMAGE = null;
  CUSTOM_BGM = null;
  AudioFX.setBgm(null);
  Editor.map = defaultEditorMap();
  saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty);
  showEditor();
}

function editorTest() {
  G.difficulty = Editor.difficulty;
  try { localStorage.setItem(DIFF_KEY, G.difficulty); } catch (err) { /* ignore */ }
  G.customMap = Editor.map.slice();
  CUSTOM_LIVES = Editor.lives;
  CUSTOM_SPAWNS = Editor.spawns.map(point => ({ ...point }));
  CUSTOM_ENEMY_COUNTS = { ...Editor.enemyCounts };
  CUSTOM_PLAYER_SPAWNS = JSON.parse(JSON.stringify(Editor.playerSpawns));
  CUSTOM_BACKGROUND = Editor.backgroundImage;
  CUSTOM_BACKGROUND_IMAGE = null;
  CUSTOM_BGM = Editor.bgm;
  // ensure base exists
  if (!Editor.map.some(row => row.includes('E'))) {
    const r = Editor.map[12].split('');
    r[6] = 'E';
    Editor.map[12] = r.join('');
    G.customMap = Editor.map.slice();
  }
  saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty);
  AudioFX.setBgm(CUSTOM_BGM);
  Editor.active = false;
  hideOverlay();
  startGame(0, 1);
}

function floatTextEditor(msg) {
  const el = document.getElementById('editorToast');
  if (el) { el.textContent = msg; el.style.opacity = '1'; setTimeout(() => { el.style.opacity = '0'; }, 1500); }
}

function switchEditorTab(tab) {
  Editor.tab = tab;
  document.querySelectorAll('.etab').forEach(b => b.classList.toggle('active', b.dataset.etab === tab));
  document.querySelectorAll('.editor-pane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== tab));
}

function showStageSelect() {
  G.state = 'select';
  G.stateTime = 0;
  clearKeys();
  hideBanner();
  updateHUD(true);
  setOverlay(`
    <div class="overlay-card">
      <div class="eyebrow">SECTOR DIRECTORY <span class="code">// ${G.cleared.filter(Boolean).length}/${STAGES.length} CLEARED</span></div>
      <h1 class="game-title" data-text="SELECT SECTOR" style="font-size:clamp(30px,4.6vw,46px)">SELECT SECTOR</h1>
      <div class="cn-title">选择作战区域</div>
      <p class="tagline">选择任意已解锁的区域重新部署。<br>通关后可在结算界面直接跳转已通关的关卡。</p>
      <div class="diff-selector compact">
        <span class="diff-title">作战难度 · THREAT LEVEL</span>
        <div class="diff-row">${difficultyButtonsHTML()}</div>
      </div>
      <div class="sector-picker">${sectorCardsHTML(G.stageIndex)}</div>
      <button class="btn ghost" type="button" data-action="back-title">
        <span class="btn-main">返回主菜单</span><span class="btn-sub">TITLE</span>
      </button>
    </div>
  `);
}

function showTitle() {
  G.state = 'title';
  G.stateTime = 0;
  clearKeys();
  hideBanner();
  updateHUD(true);
  const clearedCount = G.cleared.filter(Boolean).length;
  setOverlay(`
    <div class="overlay-card">
      <div class="eyebrow">ARCADE PROTOCOL <span class="code">// 2088</span></div>
      <h1 class="game-title" data-text="NEON TANK">NEON TANK</h1>
      <div class="cn-title">霓虹坦克</div>
      <p class="tagline">城市最后一座数据核心正在遭受装甲军团入侵。<br>驾驶 <b>PULSE-88</b> 战术坦克，穿过酸雨与霓虹废墟，守住防线。</p>
      <div class="diff-selector">
        <span class="diff-title">作战难度 · THREAT LEVEL</span>
        <div class="diff-row">${difficultyButtonsHTML()}</div>
      </div>
      <div class="menu-grid">
        <button class="btn primary" type="button" data-action="start">
          <span class="btn-main">单人作战 · SOLO</span><span class="btn-sub">ENTER</span>
        </button>
        <button class="btn ghost" type="button" data-action="coop">
          <span class="btn-main">双人同屏 · LOCAL CO-OP</span><span class="btn-sub">2P</span>
        </button>
        <button class="btn ghost" type="button" data-action="online">
          <span class="btn-main">在线联机 · ONLINE CO-OP</span><span class="btn-sub">P2P</span>
        </button>
        <button class="btn ghost" type="button" data-action="select">
          <span class="btn-main">选择关卡 · SECTOR SELECT</span><span class="btn-sub">${clearedCount}/${STAGES.length}</span>
        </button>
        <button class="btn ghost" type="button" data-action="editor">
          <span class="btn-main">地图编辑器 · MAP EDITOR</span><span class="btn-sub">EDIT</span>
        </button>
      </div>
      <div class="menu-note">
        P1 <b>WASD</b> 移动 · <b>SPACE</b> 开火 &nbsp;|&nbsp; P2 <b>↑↓←→</b> 移动 · <b>ENTER</b> 开火<br>
        在线联机通过 WebRTC 点对点连接，邀请码只需手动传递一次。
      </div>
    </div>
  `);
}

function showPause() {
  setOverlay(`
    <div class="overlay-card compact">
      <div class="eyebrow">SYSTEM HALT <span class="code">// TEMPORAL LOCK</span></div>
      <h1 class="game-title" data-text="PAUSED" style="font-size:clamp(38px,6vw,56px)">PAUSED</h1>
      <div class="cn-title" style="letter-spacing:.35em">暂停</div>
      <p class="tagline">战术链路已冻结。按 <b>P</b> 或点击下方按钮继续。</p>
      <button class="btn primary" type="button" data-action="resume">
        <span class="btn-main">恢复战斗 · RESUME</span><span class="btn-sub">P</span>
      </button>
      <div class="btn-row">
        <button class="btn ghost" type="button" data-action="restart">
          <span class="btn-main">重新部署</span><span class="btn-sub">RESTART</span>
        </button>
        <button class="btn ghost" type="button" data-action="back-title">
          <span class="btn-main">退出战斗</span><span class="btn-sub">QUIT</span>
        </button>
      </div>
    </div>
  `);
}

function showStageClear() {
  const cfg = STAGES[G.stageIndex];
  setOverlay(`
    <div class="overlay-card success">
      <div class="eyebrow">${cfg.code} SECURED <span class="code">// SIGNAL CLEAR</span></div>
      <h1 class="game-title" data-text="SECTOR CLEAR">SECTOR CLEAR</h1>
      <div class="cn-title">区域清除</div>
      <p class="tagline">装甲军团已被击退，城市核心仍然在线。<br>选择已通关的区域重返战场，或继续推进下一片街区。</p>
      <div class="result-grid">
        <div class="result-cell"><span>SCORE</span><b>${fmt(G.score)}</b></div>
        <div class="result-cell pink"><span>CLEAR BONUS</span><b>+${G.stageBonus}</b></div>
        <div class="result-cell"><span>HOSTILES DOWN</span><b>${G.stageTotal}</b></div>
        <div class="result-cell amber"><span>ARMOR LEFT</span><b>${G.playerCount > 1 ? G.lives + ' / ' + G.lives2 : G.lives}</b></div>
      </div>
      <div class="net-label">选择关卡 · SECTOR SELECT</div>
      <div class="sector-picker">${sectorCardsHTML(G.stageIndex)}</div>
      <button class="btn primary" type="button" data-action="next">
        <span class="btn-main">进入下一区域 · NEXT</span><span class="btn-sub">ENTER</span>
      </button>
      <div class="btn-row">
        <button class="btn ghost" type="button" data-action="back-title">
          <span class="btn-main">返回主菜单</span><span class="btn-sub">TITLE</span>
        </button>
      </div>
    </div>
  `);
}

function showGameOver() {
  const coreLost = G.endReason === 'CORE BREACH';
  setOverlay(`
    <div class="overlay-card danger">
      <div class="eyebrow">CONNECTION TERMINATED <span class="code">// ${G.endReason}</span></div>
      <h1 class="game-title" data-text="${coreLost ? 'CORE BREACH' : 'SIGNAL LOST'}">${coreLost ? 'CORE BREACH' : 'SIGNAL LOST'}</h1>
      <div class="cn-title">${coreLost ? '核心失守' : '装甲全损'}</div>
      <p class="tagline">${coreLost ? '城市核心被击穿，最后一道霓虹熄灭了。' : '所有备用装甲已耗尽。城市仍在等待下一次反击。'}</p>
      <div class="result-grid">
        <div class="result-cell"><span>FINAL SCORE</span><b>${fmt(G.score)}</b></div>
        <div class="result-cell pink"><span>HI-SCORE</span><b>${fmt(G.hiScore)}</b></div>
        <div class="result-cell"><span>SECTOR</span><b>${String(G.stage).padStart(2, '0')} / ${String(STAGES.length).padStart(2, '0')}</b></div>
        <div class="result-cell amber"><span>KILLS</span><b>${G.stageKills}</b></div>
      </div>
      <button class="btn primary" type="button" data-action="restart">
        <span class="btn-main">重新部署 · REDEPLOY</span><span class="btn-sub">ENTER</span>
      </button>
      <div class="btn-row">
        <button class="btn ghost" type="button" data-action="select">
          <span class="btn-main">选择关卡</span><span class="btn-sub">SECTORS</span>
        </button>
        <button class="btn ghost" type="button" data-action="back-title">
          <span class="btn-main">返回主菜单</span><span class="btn-sub">TITLE</span>
        </button>
      </div>
    </div>
  `);
}

function showVictory() {
  setOverlay(`
    <div class="overlay-card success">
      <div class="eyebrow">MISSION COMPLETE <span class="code">// CITY SECURED</span></div>
      <h1 class="game-title" data-text="NEON ALIVE">NEON ALIVE</h1>
      <div class="cn-title">霓虹不灭</div>
      <p class="tagline">三条街区全部收复，核心仍在燃烧。<br>城市记住了你的呼号：<b>PULSE-88</b>。</p>
      <div class="result-grid">
        <div class="result-cell"><span>FINAL SCORE</span><b>${fmt(G.score)}</b></div>
        <div class="result-cell pink"><span>HI-SCORE</span><b>${fmt(G.hiScore)}</b></div>
        <div class="result-cell"><span>STAGES CLEARED</span><b>03 / 03</b></div>
        <div class="result-cell amber"><span>ARMOR LEFT</span><b>${G.playerCount > 1 ? G.lives + ' / ' + G.lives2 : G.lives}</b></div>
      </div>
      <button class="btn primary" type="button" data-action="restart">
        <span class="btn-main">再次出击 · REPLAY</span><span class="btn-sub">ENTER</span>
      </button>
      <div class="btn-row">
        <button class="btn ghost" type="button" data-action="select">
          <span class="btn-main">选择已通关关卡</span><span class="btn-sub">SECTORS</span>
        </button>
        <button class="btn ghost" type="button" data-action="back-title">
          <span class="btn-main">返回主菜单</span><span class="btn-sub">TITLE</span>
        </button>
      </div>
    </div>
  `);
}

function showEndOverlay() {
  if (G.state === 'gameover') showGameOver();
  else if (G.state === 'stageclear') showStageClear();
  else if (G.state === 'victory') showVictory();
}

function isSelectableStage(index) {
  return index >= 0 && index < STAGES.length && (!!G.cleared[index] || index <= G.maxUnlocked);
}

function startGame(stageIndex = 0, playerCount = 1) {
  if (isGuest()) {
    netSend({ t: 'action', action: 'restart', stage: stageIndex });
    return;
  }
  AudioFX.init();
  AudioFX.setBgm(CUSTOM_BGM);
  const safeStage = isSelectableStage(stageIndex) ? stageIndex : 0;
  G.mode = isOnlineHost() ? 'online' : (playerCount > 1 ? 'coop' : 'solo');
  G.playerCount = playerCount > 1 ? 2 : 1;
  document.body.classList.toggle('coop-mode', G.playerCount > 1);
  G.score = 0;
  G.lives = G.customMap ? CUSTOM_LIVES : 3;
  G.lives2 = G.customMap ? CUSTOM_LIVES : 3;
  G.weapon = 1;
  G.weapon2 = 1;
  G.endReason = '';
  loadStage(safeStage);
  hideOverlay();
  updateHUD(true);
  AudioFX.sfx('start');
  AudioFX.playBgm();
  if (isOnlineHost()) netSend({ t: 'start', stageIndex: safeStage, difficulty: G.difficulty });
  const cfg = STAGES[safeStage];
  showBanner(
    `${cfg.code} // ${cfg.cn}`,
    G.playerCount > 1 ? 'CO-OP DEPLOYED' : 'DEFEND THE CORE',
    2600
  );
}

function nextStage() {
  if (G.state !== 'stageclear') return;
  if (isGuest()) {
    netSend({ t: 'action', action: 'next' });
    return;
  }
  AudioFX.init();
  const next = G.stageIndex + 1;
  if (next >= STAGES.length) return;
  loadStage(next);
  hideOverlay();
  updateHUD(true);
  AudioFX.sfx('start');
  if (isOnlineHost()) netSend({ t: 'start', stageIndex: next, difficulty: G.difficulty });
  const cfg = STAGES[next];
  showBanner(`${cfg.code} // ${cfg.cn}`, 'CORE INTEGRITY 100%', 2600);
}

function pickStage(stage) {
  if (!isSelectableStage(stage)) return;
  if (isGuest()) {
    netSend({ t: 'action', action: 'pick-stage', stage });
    return;
  }
  startGame(stage, isOnlineHost() ? 2 : (G.playerCount || 1));
}

function resumeGame() {
  if (G.state !== 'paused') return;
  if (isGuest()) {
    netSend({ t: 'action', action: 'resume' });
    return;
  }
  G.state = 'playing';
  hideOverlay();
  clearKeys();
}

function togglePause() {
  if (isGuest()) {
    if (G.state === 'playing') netSend({ t: 'action', action: 'pause' });
    else if (G.state === 'paused') netSend({ t: 'action', action: 'resume' });
    return;
  }
  if (G.state === 'playing') {
    G.state = 'paused';
    clearKeys();
    showPause();
  } else if (G.state === 'paused') {
    resumeGame();
  }
}

function quitToTitle() {
  netCloseGame();
  AudioFX.stopBgm();
  G.customMap = null;
  CUSTOM_BGM = null;
  G.mode = 'solo';
  G.playerCount = 1;
  G.lives = 3;
  G.lives2 = 3;
  G.weapon = 1;
  G.weapon2 = 1;
  G.respawnTimer = 0;
  G.respawnTimer2 = 0;
  document.body.classList.remove('coop-mode');
  showTitle();
}

overlayEl.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  AudioFX.init();
  if (action.startsWith('net-')) {
    handleNetAction(action, button);
    return;
  }
  if (action === 'start') startGame(0, 1);
  else if (action === 'coop') startGame(0, 2);
  else if (action === 'set-difficulty') setDifficulty(button.dataset.diff);
  else if (action === 'select') showStageSelect();
  else if (action === 'editor') showEditor();
  else if (action === 'pick-stage') pickStage(parseInt(button.dataset.stage, 10));
  else if (action === 'online') showNetLobby();
  else if (action === 'restart') startGame(0, G.playerCount || 1);
  else if (action === 'next') nextStage();
  else if (action === 'resume') resumeGame();
  else if (action === 'back-title') quitToTitle();
  else if (action === 'editor-test') editorTest();
  else if (action === 'editor-save') editorSave();
  else if (action === 'editor-reset') editorReset();
});

// editor: tool selection, tab switching, color inputs
overlayEl.addEventListener('click', event => {
  const toolBtn = event.target.closest('[data-tool]');
  if (toolBtn) {
    Editor.tool = toolBtn.dataset.tool;
    document.querySelectorAll('.tile-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === Editor.tool));
    return;
  }
  const clearBgm = event.target.closest('[data-clear-bgm]');
  if (clearBgm) {
    Editor.bgm = null;
    CUSTOM_BGM = null;
    AudioFX.setBgm(null);
    saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty);
    const name = document.querySelector('[data-bgm-name]');
    if (name) name.textContent = '未选择音乐';
    floatTextEditor('BGM 已移除');
    return;
  }
  const clearImage = event.target.closest('[data-clear-image]');
  if (clearImage) {
    const key = clearImage.dataset.clearImage;
    SKIN_IMAGES[key] = null;
    delete SKIN_IMAGE_CACHE[key];
    saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty);
    floatTextEditor('坦克图像已移除');
    return;
  }
  const clearBackground = event.target.closest('[data-clear-background]');
  if (clearBackground) {
    Editor.backgroundImage = null;
    CUSTOM_BACKGROUND = null;
    CUSTOM_BACKGROUND_IMAGE = null;
    saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty);
    const name = document.querySelector('[data-background-name]');
    if (name) name.textContent = '未选择背景';
    floatTextEditor('地图背景已移除');
    return;
  }
  const diffButton = event.target.closest('[data-action="set-difficulty"]');
  if (diffButton && Editor.active) {
    Editor.difficulty = diffButton.dataset.diff;
    G.difficulty = Editor.difficulty;
    document.querySelectorAll('.editor-difficulty .diff-btn').forEach(b => {
      const active = b.dataset.diff === Editor.difficulty;
      b.classList.toggle('active', active);
      b.style.setProperty('--diff-color', active ? DIFFICULTIES[Editor.difficulty].color : '');
    });
    saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty);
  }
});

overlayEl.addEventListener('change', event => {
  const enemyCountInput = event.target.closest('[data-enemy-count]');
  if (enemyCountInput) {
    const type = enemyCountInput.dataset.enemyCount;
    Editor.enemyCounts[type] = clamp(parseInt(enemyCountInput.value, 10) || 0, 0, 99);
    enemyCountInput.value = Editor.enemyCounts[type];
    saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty);
    return;
  }
  const livesInput = event.target.closest('[data-editor-lives]');
  if (livesInput) {
    Editor.lives = clamp(parseInt(livesInput.value, 10) || 3, 1, 99);
    livesInput.value = Editor.lives;
    saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty);
    return;
  }
  const bgmInput = event.target.closest('[data-bgm-file]');
  const bgmFile = bgmInput && bgmInput.files && bgmInput.files[0];
  if (bgmFile) {
    if (!bgmFile.type.startsWith('audio/')) { floatTextEditor('请选择音乐文件'); return; }
    if (bgmFile.size > 8 * 1024 * 1024) { floatTextEditor('音乐文件需小于 8MB'); bgmInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      Editor.bgm = reader.result;
      CUSTOM_BGM = Editor.bgm;
      AudioFX.setBgm(CUSTOM_BGM);
      const name = document.querySelector('[data-bgm-name]');
      if (name) name.textContent = bgmFile.name;
      if (saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty)) floatTextEditor('BGM 已保存');
      else floatTextEditor('存储空间不足，请换用较小音乐');
    };
    reader.readAsDataURL(bgmFile);
    return;
  }
  const backgroundInput = event.target.closest('[data-background-image]');
  const backgroundFile = backgroundInput && backgroundInput.files && backgroundInput.files[0];
  if (backgroundFile) {
    if (!backgroundFile.type.startsWith('image/')) { floatTextEditor('请选择图片文件'); return; }
    if (backgroundFile.size > 4 * 1024 * 1024) { floatTextEditor('背景图片需小于 4MB'); backgroundInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      Editor.backgroundImage = reader.result;
      CUSTOM_BACKGROUND = Editor.backgroundImage;
      CUSTOM_BACKGROUND_IMAGE = null;
      const name = document.querySelector('[data-background-name]');
      if (name) name.textContent = backgroundFile.name;
      if (saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty)) floatTextEditor('地图背景已保存');
      else floatTextEditor('存储空间不足，请换用较小图片');
    };
    reader.readAsDataURL(backgroundFile);
    return;
  }
  const imageInput = event.target.closest('[data-skin-image]');
  const imageFile = imageInput && imageInput.files && imageInput.files[0];
  if (imageFile) {
    if (!imageFile.type.startsWith('image/')) { floatTextEditor('请选择图片文件'); return; }
    if (imageFile.size > 2 * 1024 * 1024) { floatTextEditor('坦克图像需小于 2MB'); imageInput.value = ''; return; }
    const reader = new FileReader();
    reader.onload = () => {
      const key = imageInput.dataset.skinImage;
      SKIN_IMAGES[key] = reader.result;
      delete SKIN_IMAGE_CACHE[key];
      if (saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty)) floatTextEditor('坦克图像已保存');
      else floatTextEditor('存储空间不足，请换用较小图片');
    };
    reader.readAsDataURL(imageFile);
    return;
  }
  return;
});

overlayEl.addEventListener('input', event => {
  const ci = event.target.closest('.color-in');
  if (!ci) return;
  const path = ci.dataset.skin;
  if (!path) return;
  setSkinValue(path, ci.value);
  // auto-save theme to localStorage for persistence
  saveCustomData(Editor.map, JSON.parse(JSON.stringify(THEME)), Editor.difficulty);
});

/* =========================================================
   NETWORK · WebRTC P2P
   ========================================================= */
const Net = {
  pc: null,
  dc: null,
  rt: null,
  inputSeq: 0,
  snapshotSeq: 0,
  lastSnapshotSeq: 0,
  role: null,
  closing: false,
  lastWallVersion: 0
};

const NET_ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

function netSupported() {
  return !!(window.RTCPeerConnection && window.RTCSessionDescription);
}

function netSend(obj, realtime = false) {
  const channel = realtime ? ((Net.rt && Net.rt.readyState === 'open') ? Net.rt : Net.dc) : Net.dc;
  if (!channel || channel.readyState !== 'open') return;
  if (realtime && channel.bufferedAmount > 131072) return;
  try { channel.send(JSON.stringify(obj)); } catch (err) { /* ignored */ }
}

function updateNetUI() {
  if (!els.netChip || !els.netStatusVal) return;
  let text = 'OFFLINE';
  let cls = 'net-off';
  if (Net.dc && Net.dc.readyState === 'open') {
    text = Net.role === 'host' ? 'HOST LIVE' : 'LINKED';
    cls = 'net-online';
  } else if (Net.role === 'host') {
    text = 'HOSTING';
    cls = 'net-host';
  } else if (Net.role === 'guest') {
    text = 'CONNECTING';
    cls = 'net-host';
  }
  setText(els.netStatusVal, text);
  els.netChip.className = 'sys-chip ' + cls;
}

function netStatusLine(text, cls = '') {
  const el = document.getElementById('netStatusLine');
  if (!el) return;
  el.textContent = 'STATUS // ' + text;
  el.className = 'net-status' + (cls ? ' ' + cls : '');
}

function encodeCode(data) {
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function decodeCode(code) {
  const bin = atob(String(code).replace(/\s+/g, ''));
  const bytes = Uint8Array.from(bin, ch => ch.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function showNetLobby() {
  G.state = 'net';
  G.stateTime = 0;
  clearKeys();
  hideBanner();
  updateHUD(true);
  setOverlay(`
    <div class="overlay-card wide">
      <div class="eyebrow">LOW-LATENCY P2P UPLINK <span class="code">// WEBRTC DATA CHANNEL</span></div>
      <h1 class="game-title" data-text="ONLINE CO-OP" style="font-size:clamp(28px,4.6vw,48px)">ONLINE CO-OP</h1>
      <div class="cn-title">远程联机</div>
      <p class="tagline">房主创建邀请码，客机粘贴邀请码后生成应答码。<br>实时输入与战场快照使用低延迟通道，控制消息使用可靠通道。</p>
      <div class="net-actions">
        <button class="btn primary" type="button" data-action="net-host">
          <span class="btn-main">创建房间 · HOST</span><span class="btn-sub">P1</span>
        </button>
        <button class="btn ghost" type="button" data-action="net-join">
          <span class="btn-main">加入房间 · JOIN</span><span class="btn-sub">P2</span>
        </button>
      </div>
      <div class="net-panel" id="netPanel"></div>
      <div class="net-status" id="netStatusLine">STATUS // IDLE</div>
      <div class="btn-row">
        <button class="btn ghost" type="button" data-action="back-title">
          <span class="btn-main">返回主菜单</span><span class="btn-sub">TITLE</span>
        </button>
      </div>
    </div>
  `);
  netStatusLine(netSupported() ? 'IDLE · READY' : 'WEBRTC NOT SUPPORTED', netSupported() ? '' : 'error');
}

function handleNetAction(action, button) {
  if (action !== 'net-copy' && !netSupported()) {
    netStatusLine('当前浏览器不支持 WebRTC', 'error');
    return;
  }
  if (action === 'net-host') startNetHost();
  else if (action === 'net-join') showJoinPanel();
  else if (action === 'net-answer') joinWithOffer();
  else if (action === 'net-accept') acceptAnswer();
  else if (action === 'net-copy') copyNetCode(button.dataset.target);
}

function copyNetCode(targetId) {
  const el = document.getElementById(targetId);
  if (!el) return;
  const text = el.value || el.textContent || '';
  if (!text) return;
  const ok = () => netStatusLine('已复制到剪贴板', 'ok');
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(ok, () => fallbackCopy(el));
  } else {
    fallbackCopy(el);
  }
}

function fallbackCopy(el) {
  el.focus();
  el.select();
  try {
    document.execCommand('copy');
    netStatusLine('已复制到剪贴板', 'ok');
  } catch (err) {
    netStatusLine('复制失败，请手动选择文本', 'error');
  }
}

function resetPeer() {
  if (Net.dc) { try { Net.dc.close(); } catch (err) { /* ignored */ } }
  if (Net.rt) { try { Net.rt.close(); } catch (err) { /* ignored */ } }
  if (Net.pc) { try { Net.pc.close(); } catch (err) { /* ignored */ } }
  Net.dc = null;
  Net.rt = null;
  Net.pc = null;
  Net.role = null;
  Net.lastWallVersion = 0;
  G.remoteInputSeq = 0;
  Net.inputSeq = 0;
  Net.snapshotSeq = 0;
  Net.lastSnapshotSeq = 0;
}

function createPeer(role) {
  resetPeer();
  Net.role = role;
  const pc = new RTCPeerConnection(NET_ICE);
  Net.pc = pc;
  pc.onconnectionstatechange = () => {
    if (Net.pc !== pc) return;
    const st = pc.connectionState;
    if (st === 'failed' || st === 'disconnected' || st === 'closed') handleNetDrop();
  };
  if (role === 'host') {
    bindChannel(pc.createDataChannel('neon-tank', { ordered: true }));
    bindChannel(pc.createDataChannel('neon-tank-realtime', { ordered: false, maxRetransmits: 0 }));
  } else {
    pc.ondatachannel = ev => bindChannel(ev.channel);
  }
  updateNetUI();
  return pc;
}

function bindChannel(dc) {
  const realtime = dc.label === 'neon-tank-realtime';
  if (realtime) Net.rt = dc;
  else Net.dc = dc;
  dc.onopen = () => {
    if (realtime) return;
    updateNetUI();
    if (Net.role === 'host') {
      netStatusLine('客机已接入，正在部署战场…', 'ok');
      G.mode = 'online';
      G.netRole = 'host';
      G.netConnected = true;
      G.netEvents = [];
      startGame(0, 2);
    } else {
      netStatusLine('已连接房主，等待战场数据…', 'ok');
      G.mode = 'online';
      G.netRole = 'guest';
      G.netConnected = true;
      G.playerCount = 2;
      document.body.classList.add('coop-mode');
      setOverlay(`
        <div class="overlay-card compact">
          <div class="eyebrow">UPLINK ESTABLISHED <span class="code">// P2P</span></div>
          <h1 class="game-title" data-text="CONNECTED" style="font-size:clamp(34px,5vw,52px)">CONNECTED</h1>
          <div class="cn-title">链路已建立</div>
          <p class="tagline">等待房主部署战场…</p>
        </div>
      `);
    }
  };
  dc.onmessage = ev => handleNetMessage(ev.data);
  dc.onclose = () => { if (!Net.closing && !realtime) handleNetDrop(); };
}

function waitForIce(pc) {
  return new Promise(resolve => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    };
    const check = () => {
      if (pc.iceGatheringState === 'complete') finish();
    };
    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(finish, 2600);
  });
}

async function startNetHost() {
  const panel = document.getElementById('netPanel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="net-step">
      <div class="net-label">1 · 把邀请码发送给客机</div>
      <textarea id="netOfferOut" class="net-box" readonly placeholder="GENERATING INVITE CODE..."></textarea>
      <button class="net-copy" type="button" data-action="net-copy" data-target="netOfferOut">复制邀请码</button>
    </div>
    <div class="net-step">
      <div class="net-label">2 · 粘贴客机返回的应答码</div>
      <textarea id="netAnswerIn" class="net-box" placeholder="PASTE ANSWER CODE"></textarea>
      <button class="btn ghost" type="button" data-action="net-accept">
        <span class="btn-main">建立连接</span><span class="btn-sub">CONNECT</span>
      </button>
    </div>
  `;
  netStatusLine('正在生成邀请码…');
  try {
    const pc = createPeer('host');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitForIce(pc);
    const box = document.getElementById('netOfferOut');
    if (box) {
      box.value = encodeCode({
        t: 'offer',
        type: pc.localDescription.type,
        sdp: pc.localDescription.sdp
      });
    }
    netStatusLine('邀请码已生成，等待客机应答', 'ok');
  } catch (err) {
    netStatusLine('生成邀请码失败：' + (err && err.message ? err.message : err), 'error');
  }
}

function showJoinPanel() {
  const panel = document.getElementById('netPanel');
  if (!panel) return;
  panel.innerHTML = `
    <div class="net-step">
      <div class="net-label">1 · 粘贴房主的邀请码</div>
      <textarea id="netOfferIn" class="net-box" placeholder="PASTE INVITE CODE"></textarea>
      <button class="btn ghost" type="button" data-action="net-answer">
        <span class="btn-main">生成应答码</span><span class="btn-sub">ANSWER</span>
      </button>
    </div>
    <div class="net-step">
      <div class="net-label">2 · 把应答码发回房主</div>
      <textarea id="netAnswerOut" class="net-box" readonly placeholder="ANSWER CODE WILL APPEAR HERE"></textarea>
      <button class="net-copy" type="button" data-action="net-copy" data-target="netAnswerOut">复制应答码</button>
    </div>
  `;
  netStatusLine('等待粘贴邀请码');
}

async function joinWithOffer() {
  const box = document.getElementById('netOfferIn');
  const code = box ? box.value.trim() : '';
  if (!code) {
    netStatusLine('请先粘贴邀请码', 'error');
    return;
  }
  let data;
  try {
    data = decodeCode(code);
  } catch (err) {
    netStatusLine('邀请码格式无效', 'error');
    return;
  }
  if (!data || data.t !== 'offer' || !data.sdp) {
    netStatusLine('邀请码无效，请确认复制完整', 'error');
    return;
  }
  netStatusLine('正在生成应答码…');
  try {
    const pc = createPeer('guest');
    await pc.setRemoteDescription({ type: 'offer', sdp: data.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitForIce(pc);
    const out = document.getElementById('netAnswerOut');
    if (out) {
      out.value = encodeCode({
        t: 'answer',
        type: pc.localDescription.type,
        sdp: pc.localDescription.sdp
      });
    }
    netStatusLine('应答码已生成，请发回房主', 'ok');
  } catch (err) {
    netStatusLine('生成应答码失败：' + (err && err.message ? err.message : err), 'error');
  }
}

async function acceptAnswer() {
  if (!Net.pc || Net.role !== 'host') {
    netStatusLine('请先创建房间', 'error');
    return;
  }
  const box = document.getElementById('netAnswerIn');
  const code = box ? box.value.trim() : '';
  if (!code) {
    netStatusLine('请粘贴应答码', 'error');
    return;
  }
  let data;
  try {
    data = decodeCode(code);
  } catch (err) {
    netStatusLine('应答码格式无效', 'error');
    return;
  }
  if (!data || data.t !== 'answer' || !data.sdp) {
    netStatusLine('应答码无效，请确认复制完整', 'error');
    return;
  }
  try {
    await Net.pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
    netStatusLine('握手完成，等待数据通道…', 'ok');
  } catch (err) {
    netStatusLine('连接失败：' + (err && err.message ? err.message : err), 'error');
  }
}

function handleNetMessage(raw) {
  let msg;
  try {
    msg = JSON.parse(raw);
  } catch (err) {
    return;
  }
  if (!msg || !msg.t) return;
  G.netLastRx = performance.now();
  if (msg.t === 'input') {
    if (Number.isInteger(msg.seq) && msg.seq <= (G.remoteInputSeq || 0)) return;
    G.remoteInputSeq = msg.seq || ((G.remoteInputSeq || 0) + 1);
    G.remoteInput.dir = msg.dir || null;
    G.remoteInput.fire = !!msg.fire;
    G.remoteInputAt = performance.now();
    return;
  }
  if (msg.t === 'start') {
    if (isGuest()) {
      if (msg.difficulty && DIFFICULTIES[msg.difficulty]) G.difficulty = msg.difficulty;
      startGuestStage(Number.isInteger(msg.stageIndex) ? msg.stageIndex : 0);
    }
    return;
  }
  if (msg.t === 'action') {
    if (Net.role === 'host') handleRemoteAction(msg.action, msg.stage);
    return;
  }
  if (msg.t === 'snap') {
    if (isGuest()) applySnapshot(msg);
    return;
  }
  if (msg.t === 'bye') {
    handleNetDrop();
  }
}

function handleNetDrop() {
  if (Net.closing) return;
  updateNetUI();
  Net.dc = null;
  netStatusLine('连接已断开', 'error');
  G.netConnected = false;
  G.netRole = null;
  G.mode = 'solo';
  G.playerCount = 1;
  document.body.classList.remove('coop-mode');
  if (G.state === 'playing' || G.state === 'paused') {
    G.state = 'gameover';
    G.endReason = 'LINK LOST';
    G.endShown = true;
    G.bullets = [];
    clearKeys();
    updateHUD(true);
    setOverlay(`
      <div class="overlay-card danger">
        <div class="eyebrow">UPLINK TERMINATED <span class="code">// LINK LOST</span></div>
        <h1 class="game-title" data-text="LINK LOST">LINK LOST</h1>
        <div class="cn-title">联机中断</div>
        <p class="tagline">点对点链路已断开。<br>返回主菜单后可以重新创建房间。</p>
        <button class="btn primary" type="button" data-action="back-title">
          <span class="btn-main">返回主菜单 · TITLE</span><span class="btn-sub">EXIT</span>
        </button>
      </div>
    `);
  }
}

function netCloseGame() {
  if (Net.dc && Net.dc.readyState === 'open') {
    try { netSend({ t: 'bye' }); } catch (err) { /* ignored */ }
  }
  Net.closing = true;
  if (Net.dc) { try { Net.dc.close(); } catch (err) { /* ignored */ } }
  if (Net.rt) { try { Net.rt.close(); } catch (err) { /* ignored */ } }
  if (Net.pc) { try { Net.pc.close(); } catch (err) { /* ignored */ } }
  Net.dc = null;
  Net.rt = null;
  Net.pc = null;
  Net.role = null;
  Net.lastWallVersion = 0;
  Net.closing = false;
  G.netConnected = false;
  G.netRole = null;
  G.netLastRx = 0;
  G.remoteInput.dir = null;
  G.remoteInput.fire = false;
  G.remoteInputAt = 0;
  updateNetUI();
}

function startGuestStage(index) {
  const safe = clamp(index, 0, STAGES.length - 1);
  G.mode = 'online';
  G.netRole = 'guest';
  G.playerCount = 2;
  G.stageIndex = safe;
  G.stage = safe + 1;
  G.score = 0;
  G.lives = 3;
  G.lives2 = 3;
  G.weapon = 1;
  G.weapon2 = 1;
  G.endReason = '';
  G.endShown = false;
  G.enemies = [];
  G.bullets = [];
  G.powerups = [];
  G.particles = [];
  G.texts = [];
  G.state = 'playing';
  G.stateTime = 0;
  document.body.classList.add('coop-mode');
  hideOverlay();
  updateHUD(true);
  const cfg = STAGES[safe];
  showBanner(`${cfg.code} // ${cfg.cn}`, 'REMOTE CO-OP LINKED', 2400);
}

function handleRemoteAction(action, stage) {
  if (action === 'next') nextStage();
  else if (action === 'restart') startGame(0, 2);
  else if (action === 'pick-stage') pickStage(Number(stage));
  else if (action === 'pause') {
    if (G.state === 'playing') togglePause();
  } else if (action === 'resume') {
    resumeGame();
  }
}

function packPlayer(p) {
  if (!p) return null;
  return {
    x: p.x,
    y: p.y,
    w: p.w,
    h: p.h,
    dir: p.dir,
    tread: p.tread,
    shieldTimer: p.shieldTimer,
    spawnTimer: p.spawnTimer,
    rapidTimer: p.rapidTimer,
    muzzle: p.muzzle,
    moving: p.moving,
    index: p.index
  };
}

function buildSnapshot() {
  const snap = {
    t: 'snap',
    seq: ++Net.snapshotSeq,
    state: G.state,
    stageIndex: G.stageIndex,
    difficulty: G.difficulty,
    score: G.score,
    hi: G.hiScore,
    lives: G.lives,
    lives2: G.lives2,
    weapon: G.weapon,
    weapon2: G.weapon2,
    freeze: Number(G.freezeTimer.toFixed(2)),
    queueLen: G.queue.length,
    stageTotal: G.stageTotal,
    stageKills: G.stageKills,
    stageBonus: G.stageBonus,
    endReason: G.endReason || '',
    cleared: G.cleared.slice(),
    maxUnlocked: G.maxUnlocked,
    base: G.base ? {
      x: G.base.x,
      y: G.base.y,
      w: G.base.w,
      h: G.base.h,
      alive: G.base.alive,
      hitFlash: Number(G.base.hitFlash.toFixed(2))
    } : null,
    p1: packPlayer(G.player),
    p2: packPlayer(G.player2),
    enemies: G.enemies.map(e => ({
      x: e.x,
      y: e.y,
      w: e.w,
      h: e.h,
      dir: e.dir,
      tread: e.tread,
      type: e.type,
      carrier: e.carrier,
      hp: e.hp,
      maxHp: e.maxHp,
      spawnTimer: Number(e.spawnTimer.toFixed(2)),
      invuln: Number(e.invuln.toFixed(2)),
      flash: Number(e.flash.toFixed(2))
    })),
    bullets: G.bullets.map(b => ({
      x: b.x,
      y: b.y,
      w: b.w,
      h: b.h,
      vx: b.vx,
      vy: b.vy,
      dir: b.dir,
      owner: b.owner,
      power: b.power,
      color: b.color
    })),
    powerups: G.powerups.map(pu => ({
      x: pu.x,
      y: pu.y,
      w: pu.w,
      h: pu.h,
      type: pu.type,
      label: pu.label,
      name: pu.name,
      color: pu.color,
      life: Number(pu.life.toFixed(2)),
      maxLife: pu.maxLife,
      phase: Number(pu.phase.toFixed(2))
    })),
    events: G.netEvents
  };
  snap.wallVersion = G.wallVersion;
  snap.walls = G.walls.map(row => Array.from(row).join(''));
  Net.lastWallVersion = G.wallVersion;
  G.netEvents = [];
  return snap;
}

function sendSnapshot() {
  netSend(buildSnapshot(), true);
}

function applySnapshot(s) {
  if (Number.isInteger(s.seq) && s.seq <= Net.lastSnapshotSeq) return;
  if (Number.isInteger(s.seq)) Net.lastSnapshotSeq = s.seq;
  const prev = G.state;
  G.stageIndex = s.stageIndex;
  G.stage = s.stageIndex + 1;
  if (s.difficulty && DIFFICULTIES[s.difficulty]) G.difficulty = s.difficulty;
  G.score = s.score;
  G.hiScore = Math.max(G.hiScore, s.hi || 0);
  G.lives = s.lives;
  G.lives2 = s.lives2;
  G.weapon = s.weapon;
  G.weapon2 = s.weapon2;
  G.freezeTimer = s.freeze || 0;
  G.stageTotal = s.stageTotal;
  G.stageKills = s.stageKills;
  G.stageBonus = s.stageBonus || 0;
  G.endReason = s.endReason || '';
  if (Array.isArray(s.cleared)) G.cleared = s.cleared.map(Boolean);
  G.maxUnlocked = Number.isInteger(s.maxUnlocked) ? s.maxUnlocked : G.maxUnlocked;
  G.base = s.base ? { ...s.base } : G.base;
  G.player = s.p1 ? { ...s.p1, tank: true, kind: 'player', index: 0, speed: 154 } : null;
  G.player2 = s.p2 ? { ...s.p2, tank: true, kind: 'player', index: 1, speed: 154 } : null;
  G.enemies = (s.enemies || []).map(e => ({ ...e, tank: true, kind: 'enemy', dead: false }));
  G.bullets = (s.bullets || []).map(b => ({ ...b, dead: false }));
  G.powerups = (s.powerups || []).map(pu => ({ ...pu }));
  G.queue = new Array(Math.max(0, s.queueLen || 0));
  if (s.walls) {
    G.walls = s.walls.map(row => Uint8Array.from(String(row).split('').map(ch => Number(ch) || 0)));
    G.wallVersion = s.wallVersion || G.wallVersion;
  }
  for (const ev of (s.events || [])) {
    if (ev.e === 'boom') explosion(ev.x, ev.y, ev.c, ev.s, ev.b);
  }
  updateHUD(true);

  if (s.state === 'playing') {
    if (prev !== 'playing') {
      hideOverlay();
      clearKeys();
    }
    G.state = 'playing';
  } else if (s.state === 'paused') {
    if (prev !== 'paused') {
      G.state = 'paused';
      showPause();
    }
  } else if (s.state === 'stageclear' || s.state === 'gameover' || s.state === 'victory') {
    if (prev !== s.state) {
      G.state = s.state;
      G.endShown = true;
      showEndOverlay();
    }
  } else {
    G.state = s.state;
  }
}

/* =========================================================
   RENDERING
   ========================================================= */
const dust = Array.from({ length: 46 }, () => ({
  x: rand(0, W),
  y: rand(0, H),
  speed: rand(5, 24),
  size: rand(0.7, 1.9),
  color: Math.random() < 0.72 ? 'rgba(0,240,255,' : 'rgba(255,43,214,'
}));

function drawBackground() {
  const t = G.time;
  ctx.fillStyle = THEME.bg.base;
  ctx.fillRect(0, 0, W, H);

  if (CUSTOM_BACKGROUND) {
    if (!CUSTOM_BACKGROUND_IMAGE || CUSTOM_BACKGROUND_IMAGE.src !== CUSTOM_BACKGROUND) {
      CUSTOM_BACKGROUND_IMAGE = new Image();
      CUSTOM_BACKGROUND_IMAGE.src = CUSTOM_BACKGROUND;
    }
    if (CUSTOM_BACKGROUND_IMAGE.complete && CUSTOM_BACKGROUND_IMAGE.naturalWidth) {
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.drawImage(CUSTOM_BACKGROUND_IMAGE, 0, 0, W, H);
      ctx.restore();
    }
  }

  const g1 = ctx.createRadialGradient(W * 0.18, H * 0.02, 0, W * 0.18, H * 0.02, W * 0.85);
  g1.addColorStop(0, THEME.bg.accent1);
  g1.addColorStop(0.45, 'rgba(88, 24, 150, .06)');
  g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g1;
  ctx.fillRect(0, 0, W, H);

  const g2 = ctx.createRadialGradient(W * 0.88, H, 0, W * 0.88, H, W * 0.8);
  g2.addColorStop(0, THEME.bg.accent2);
  g2.addColorStop(0.5, 'rgba(0, 130, 160, .035)');
  g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = g2;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  for (let i = 0; i <= COLS; i++) {
    const major = i % 4 === 0;
    ctx.strokeStyle = major ? THEME.bg.gridMajor : THEME.bg.gridMinor;
    ctx.lineWidth = major ? 0.8 : 0.5;
    ctx.beginPath();
    ctx.moveTo(i * CELL + 0.5, 0);
    ctx.lineTo(i * CELL + 0.5, H);
    ctx.stroke();
  }
  for (let i = 0; i <= ROWS; i++) {
    const major = i % 4 === 0;
    ctx.strokeStyle = major ? 'rgba(255, 43, 214, .05)' : THEME.bg.gridMinor;
    ctx.lineWidth = major ? 0.8 : 0.5;
    ctx.beginPath();
    ctx.moveTo(0, i * CELL + 0.5);
    ctx.lineTo(W, i * CELL + 0.5);
    ctx.stroke();
  }

  // central circuit rings
  ctx.strokeStyle = 'rgba(0, 240, 255, .026)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 188, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 43, 214, .022)';
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 224, 0, Math.PI * 2);
  ctx.stroke();

  const scanY = (t * 42) % (H + 80) - 40;
  const scanGrad = ctx.createLinearGradient(0, scanY - 22, 0, scanY + 22);
  scanGrad.addColorStop(0, 'rgba(0, 240, 255, 0)');
  scanGrad.addColorStop(0.5, 'rgba(0, 240, 255, .028)');
  scanGrad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 22, W, 44);

  for (const d of dust) {
    let y = (d.y - t * d.speed) % H;
    if (y < 0) y += H;
    ctx.fillStyle = d.color + (0.1 + 0.14 * Math.sin(t * 0.8 + d.x)) + ')';
    ctx.fillRect(d.x, y, d.size, d.size);
  }
  ctx.restore();

  for (const sp of G.spawnPoints) {
    const cx = sp.x + 22;
    const cy = sp.y + 22;
    const pulse = 0.12 + 0.08 * Math.sin(t * 2.4 + sp.x);
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.35 + sp.x);
    ctx.strokeStyle = `rgba(255, 43, 214, ${pulse + 0.08})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i;
      const x = Math.cos(a) * 15;
      const y = Math.sin(a) * 15;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 240, 255, .2)';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBrickCell(x, y, r, c) {
  ctx.fillStyle = '#160c20';
  ctx.fillRect(x + 1, y + 1, 22, 22);
  ctx.fillStyle = 'rgba(255, 43, 214, .07)';
  ctx.fillRect(x + 2, y + 2, 20, 20);
  ctx.strokeStyle = `rgba(255, 43, 214, ${0.34 + ((r + c) % 3) * 0.05})`;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1.5, y + 1.5, 21, 21);

  ctx.strokeStyle = 'rgba(255, 43, 214, .2)';
  ctx.beginPath();
  ctx.moveTo(x + 2, y + 12.5);
  ctx.lineTo(x + 22, y + 12.5);
  const offset = (r + c) % 2 ? 12 : 7;
  ctx.moveTo(x + offset + 0.5, y + 2);
  ctx.lineTo(x + offset + 0.5, y + 12.5);
  ctx.moveTo(x + (24 - offset) + 0.5, y + 12.5);
  ctx.lineTo(x + (24 - offset) + 0.5, y + 22);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 119, 236, .5)';
  ctx.fillRect(x + 3, y + 3, 2, 1);
  ctx.fillRect(x + 19, y + 20, 2, 1);
}

function drawSteelCell(x, y, r, c) {
  const grad = ctx.createLinearGradient(x, y, x + 24, y + 24);
  grad.addColorStop(0, '#16293a');
  grad.addColorStop(0.48, '#0b1421');
  grad.addColorStop(1, '#1b3447');
  ctx.fillStyle = grad;
  ctx.fillRect(x + 1, y + 1, 22, 22);
  ctx.strokeStyle = 'rgba(94, 240, 255, .52)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 1.5, y + 1.5, 21, 21);

  ctx.strokeStyle = 'rgba(94, 240, 255, .2)';
  ctx.beginPath();
  ctx.moveTo(x + 3, y + 20);
  ctx.lineTo(x + 20, y + 3);
  ctx.moveTo(x + 3, y + 4);
  ctx.lineTo(x + 11, y + 12);
  ctx.moveTo(x + 12, y + 13);
  ctx.lineTo(x + 20, y + 21);
  ctx.stroke();

  ctx.fillStyle = 'rgba(0, 240, 255, .4)';
  ctx.fillRect(x + 3, y + 3, 2, 2);
  ctx.fillRect(x + 19, y + 19, 2, 2);
  ctx.fillStyle = 'rgba(255, 43, 214, .22)';
  ctx.fillRect(x + 10, y + 10, 4, 4);
}

function drawWaterCell(x, y, r, c) {
  const t = G.time;
  ctx.fillStyle = '#03171f';
  ctx.fillRect(x, y, 24, 24);
  ctx.strokeStyle = 'rgba(0, 240, 255, .11)';
  ctx.strokeRect(x + 0.5, y + 0.5, 23, 23);
  for (let k = 0; k < 2; k++) {
    const yy = y + 8 + k * 8 + Math.sin(t * 2.1 + (r + c) * 0.7 + k * 1.7) * 1.6;
    ctx.strokeStyle = `rgba(0, 209, 255, ${0.3 - k * 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 2, yy);
    ctx.bezierCurveTo(x + 7, yy - 3, x + 12, yy + 3, x + 22, yy);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0, 240, 255, .25)';
  ctx.fillRect(x + 6 + Math.sin(t + r) * 3, y + 19, 1.5, 1.5);
}

function drawWalls(types) {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const type = G.walls[r][c];
      if (types.includes(type)) {
        const x = c * CELL;
        const y = r * CELL;
        if (type === 1) drawBrickCell(x, y, r, c);
        else if (type === 2) drawSteelCell(x, y, r, c);
        else if (type === 3) drawWaterCell(x, y, r, c);
      }
    }
  }
}

function drawTreeCell(x, y, r, c) {
  const t = G.time;
  ctx.fillStyle = 'rgba(2, 27, 25, .68)';
  ctx.fillRect(x, y, 24, 24);
  for (let i = 0; i < 4; i++) {
    const angle = i * 2.2 + c * 0.6 + r * 0.25;
    const lx = x + 12 + Math.cos(angle) * 5.3 + Math.sin(t * 0.7 + i) * 0.8;
    const ly = y + 12 + Math.sin(angle) * 5 + Math.cos(t * 0.55 + i) * 0.8;
    ctx.fillStyle = i % 2 ? 'rgba(0, 72, 60, .55)' : 'rgba(0, 40, 37, .6)';
    ctx.beginPath();
    ctx.arc(lx, ly, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 163, .16)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0, 255, 163, .38)';
  ctx.fillRect(x + (c * 5 + r * 3) % 18 + 3, y + (r * 7 + c * 2) % 18 + 3, 1.3, 1.3);
}

function drawTrees() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (G.walls[r][c] === 4) drawTreeCell(c * CELL, r * CELL, r, c);
    }
  }
}

function drawBase() {
  const b = G.base;
  if (!b) return;
  const cx = b.x + 24;
  const cy = b.y + 24;
  const t = G.time;

  if (!b.alive) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = 'rgba(255, 61, 90, .55)';
    ctx.fillStyle = '#12070c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 3) * i + 0.2;
      const x = Math.cos(a) * 19;
      const y = Math.sin(a) * 19;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255, 61, 90, .32)';
    ctx.beginPath();
    ctx.moveTo(-10, -12); ctx.lineTo(-2, 3); ctx.lineTo(-8, 15);
    ctx.moveTo(8, -15); ctx.lineTo(3, -2); ctx.lineTo(12, 9);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 61, 90, .16)';
    ctx.fillRect(-15, -2, 30, 1);
    ctx.restore();
    return;
  }

  const pulse = 0.65 + 0.35 * Math.sin(t * 2.3);
  ctx.save();
  ctx.translate(cx, cy);

  const pad = ctx.createRadialGradient(0, 0, 2, 0, 0, 29);
  pad.addColorStop(0, 'rgba(0, 240, 255, .18)');
  pad.addColorStop(0.55, 'rgba(0, 240, 255, .04)');
  pad.addColorStop(1, 'rgba(0, 240, 255, 0)');
  ctx.fillStyle = pad;
  ctx.beginPath();
  ctx.arc(0, 0, 29, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(0, 240, 255, ${0.2 * pulse})`;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.save();
  ctx.rotate(t * 0.16);
  ctx.strokeStyle = 'rgba(0, 240, 255, .5)';
  ctx.lineWidth = 1;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const x = Math.cos(a) * 24;
    const y = Math.sin(a) * 24;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.rotate(-t * 0.25);
  ctx.fillStyle = '#071019';
  ctx.strokeStyle = 'rgba(255, 43, 214, .68)';
  ctx.lineWidth = 1.2;
  ctx.shadowColor = '#ff2bd6';
  ctx.shadowBlur = 9;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i + Math.PI / 4;
    const x = Math.cos(a) * 15;
    const y = Math.sin(a) * 15;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const core = ctx.createRadialGradient(-3, -4, 1, 0, 0, 13);
  core.addColorStop(0, '#efffff');
  core.addColorStop(0.3, '#77f9ff');
  core.addColorStop(0.72, 'rgba(0, 240, 255, .75)');
  core.addColorStop(1, 'rgba(0, 50, 80, .1)');
  ctx.fillStyle = core;
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(6, 20, 30, .9)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-6, -4);
  ctx.lineTo(-2, 4);
  ctx.lineTo(0, -1);
  ctx.lineTo(3, 5);
  ctx.lineTo(6, -4);
  ctx.stroke();

  ctx.fillStyle = 'rgba(255, 43, 214, .9)';
  ctx.fillRect(-1.5, -1.5, 3, 3);
  ctx.restore();
}

function drawSpawnRing(t, color) {
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;
  const p = 1 - clamp(t.spawnTimer / 1.05, 0, 1);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(G.time * 2);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.4 + 0.4 * Math.sin(G.time * 15);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    const r = 22 + p * 6;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawShieldRing(cx, cy, color, alpha, radius = 29) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(G.time * 0.9);
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.2;
  ctx.shadowColor = color;
  ctx.shadowBlur = 8;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(0, 0, radius - 3, -0.55, 0.2);
  ctx.stroke();
  ctx.restore();
}

function drawTank(t) {
  const isPlayer = t.kind === 'player';
  const stats = isPlayer ? null : ENEMY_TYPES[t.type];
  const pc = playerColors(isPlayer && t.index === 1 ? 1 : 0);
  const es = enemySkin(t.type);
  const color = isPlayer ? (playerWeapon(t) >= 3 ? pc.soft : pc.main) : es.color;
  const glow = isPlayer ? pc.glow : es.glow;
  const cx = t.x + t.w / 2;
  const cy = t.y + t.h / 2;

  let alpha = 1;
  if (t.spawnTimer > 0) alpha = 0.36 + 0.64 * Math.abs(Math.sin(G.time * 16));
  if (!isPlayer && t.invuln > 0 && t.spawnTimer <= 0) alpha = 0.5 + 0.5 * Math.abs(Math.sin(G.time * 18));

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0, 0, 0, .45)';
  ctx.beginPath();
  ctx.ellipse(cx + 2, cy + 5, 20, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(DIRS[t.dir].a);
  ctx.globalAlpha = alpha;

  const treadOffset = (t.tread * 1.3) % 8;
  for (const side of [-1, 1]) {
    const tx = side < 0 ? -21 : 12;
    ctx.fillStyle = '#060a11';
    ctx.fillRect(tx, -20, 9, 40);
    ctx.strokeStyle = glow;
    ctx.globalAlpha = alpha * 0.28;
    ctx.lineWidth = 0.8;
    ctx.strokeRect(tx + 0.5, -19.5, 8, 39);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
      const y = -18 + ((i * 8 + treadOffset) % 40);
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillRect(tx + 2, y, 5, 1.3);
    }
    ctx.globalAlpha = alpha;
  }

  ctx.beginPath();
  ctx.moveTo(-13, -17);
  ctx.lineTo(13, -17);
  ctx.lineTo(16, -5);
  ctx.lineTo(14, 13);
  ctx.lineTo(9, 19);
  ctx.lineTo(-9, 19);
  ctx.lineTo(-14, 13);
  ctx.lineTo(-16, -5);
  ctx.closePath();
  ctx.fillStyle = isPlayer ? (t.index === 1 ? '#1a1305' : '#07161c') : '#150a17';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.shadowColor = glow;
  ctx.shadowBlur = isPlayer ? 11 : 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  ctx.globalAlpha = alpha * 0.26;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-10, -12);
  ctx.lineTo(10, -12);
  ctx.lineTo(12, 8);
  ctx.lineTo(0, 12);
  ctx.lineTo(-12, 8);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = alpha;

  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha * 0.55;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-14, 1);
  ctx.lineTo(14, 1);
  ctx.moveTo(-10, 13);
  ctx.lineTo(0, 4);
  ctx.lineTo(10, 13);
  ctx.stroke();
  ctx.globalAlpha = alpha;

  if (!isPlayer && t.type === 'brute') {
    ctx.fillStyle = '#1d1207';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.fillRect(-19, -5, 5, 15);
    ctx.strokeRect(-19, -5, 5, 15);
    ctx.fillRect(14, -5, 5, 15);
    ctx.strokeRect(14, -5, 5, 15);
  }

  if (!isPlayer && t.type === 'drone') {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-16, 15); ctx.lineTo(-22, 20);
    ctx.moveTo(16, 15); ctx.lineTo(22, 20);
    ctx.stroke();
  }

  const turretR = t.type === 'brute' ? 9.5 : 8;
  ctx.beginPath();
  ctx.arc(0, 0, turretR, 0, Math.PI * 2);
  ctx.fillStyle = '#071019';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.globalAlpha = alpha * 0.88;
  const barrelW = t.type === 'brute' ? 6 : 4.8;
  ctx.fillRect(-barrelW / 2, -24, barrelW, 17);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#efffff';
  ctx.fillRect(-1.1, -23, 2.2, 5);

  ctx.beginPath();
  ctx.arc(0, 0, 2.4, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();

  if (isPlayer && t.muzzle > 0) {
    ctx.globalAlpha = alpha * t.muzzle;
    const mz = ctx.createRadialGradient(0, -25, 0, 0, -25, 9);
    mz.addColorStop(0, '#ffffff');
    mz.addColorStop(0.35, color);
    mz.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = mz;
    ctx.beginPath();
    ctx.arc(0, -25, 9, 0, Math.PI * 2);
    ctx.fill();
  }

  if (isPlayer && playerWeapon(t) >= 3) {
    ctx.strokeStyle = pc.glow;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-18, -11); ctx.lineTo(-23, -2); ctx.lineTo(-18, 7);
    ctx.moveTo(18, -11); ctx.lineTo(23, -2); ctx.lineTo(18, 7);
    ctx.stroke();
  }

  ctx.restore();

  const imageKey = isPlayer ? (t.index === 1 ? 'p2' : 'p1') : t.type;
  const imageSource = SKIN_IMAGES[imageKey];
  if (imageSource) {
    let skinImage = SKIN_IMAGE_CACHE[imageKey];
    if (!skinImage || skinImage.src !== imageSource) {
      skinImage = new Image();
      skinImage.src = imageSource;
      SKIN_IMAGE_CACHE[imageKey] = skinImage;
    }
    if (skinImage.complete && skinImage.naturalWidth) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(DIRS[t.dir].a);
      ctx.globalAlpha = alpha;
      ctx.drawImage(skinImage, -24, -24, 48, 48);
      ctx.restore();
    }
  }

  if (isPlayer && G.playerCount > 1) {
    ctx.save();
    ctx.font = '7px "Share Tech Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = pc.main;
    ctx.shadowColor = pc.glow;
    ctx.shadowBlur = 5;
    ctx.fillText(pc.name, cx, t.y - 4);
    ctx.restore();
  }

  if (!isPlayer && t.spawnTimer > 0) drawSpawnRing(t, color);

  if (!isPlayer && t.carrier) {
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.3 * Math.sin(G.time * 8 + t.x);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, 27, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 14, cy - 24, 7, 1);
    ctx.fillRect(cx + 10, cy + 22, 9, 1);
    ctx.restore();
  }

  if (!isPlayer && t.maxHp > 1) {
    const w = (t.maxHp - 1) * 7 + 5;
    for (let i = 0; i < t.maxHp; i++) {
      ctx.fillStyle = i < t.hp ? color : 'rgba(255,255,255,.13)';
      ctx.fillRect(cx - w / 2 + i * 7, t.y - 6, 5, 2);
    }
  }

  if (!isPlayer && t.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.beginPath();
    ctx.arc(cx, cy, 23, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  if (isPlayer && t.shieldTimer > 0) {
    drawShieldRing(cx, cy, '#8f82ff', 0.35 + 0.2 * Math.sin(G.time * 6), 30);
  }

  if (!isPlayer && G.freezeTimer > 0) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#8f9dff';
    ctx.beginPath();
    ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(175, 190, 255, .6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(cx, cy, 25, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawBullets() {
  for (const b of G.bullets) {
    const cx = b.x + 3;
    const cy = b.y + 3;
    const tailX = cx - b.vx * 0.026;
    const tailY = cy - b.vy * 0.026;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = b.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = b.owner === 'player' ? 2.2 : 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(cx, cy);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 11;
    ctx.fillStyle = '#ffffff';
    const radius = b.owner === 'player' ? (b.power >= 3 ? 3.3 : 2.7) : 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = b.color;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPowerups() {
  for (const pu of G.powerups) {
    const t = G.time;
    const bob = Math.sin(t * 3.2 + pu.phase) * 2.5;
    const cx = pu.x + 13;
    const cy = pu.y + 13 + bob;
    const fading = pu.life < 4;
    const alpha = fading ? 0.35 + 0.65 * Math.abs(Math.sin(t * 12)) : 1;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = alpha;
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 24);
    glowGrad.addColorStop(0, pu.color + '40');
    glowGrad.addColorStop(1, pu.color + '00');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(t * 0.9);
    ctx.fillStyle = 'rgba(4, 8, 18, .92)';
    ctx.strokeStyle = pu.color;
    ctx.lineWidth = 1.3;
    ctx.shadowColor = pu.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      const r = 13;
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.rotate(-t * 0.9);

    ctx.shadowBlur = 0;
    ctx.fillStyle = pu.color;
    ctx.font = '700 8px "Cascadia Mono", Consolas, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(pu.label, 0, 0.5);
    ctx.restore();
  }
}

function drawParticles() {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.particles) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    if (p.kind === 'spark') {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    } else if (p.kind === 'ring') {
      const progress = 1 - alpha;
      ctx.globalAlpha = alpha * 0.55;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 + progress * 2.1), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'flash') {
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, 'rgba(255,255,255,.85)');
      g.addColorStop(0.3, p.color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  for (const p of G.particles) {
    if (p.kind !== 'smoke') continue;
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * (1.4 - alpha * 0.4), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 9px "Cascadia Mono", Consolas, monospace';
  for (const t of G.texts) {
    const alpha = clamp(t.life / t.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = t.color;
    ctx.shadowColor = t.color;
    ctx.shadowBlur = 7;
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.restore();
}

function render() {
  const shakeX = G.shake > 0.1 ? rand(-G.shake, G.shake) : 0;
  const shakeY = G.shake > 0.1 ? rand(-G.shake, G.shake) : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawBackground();
  drawWalls([3]);
  drawWalls([1, 2]);
  drawBase();
  if (G.player) drawTank(G.player);
  if (G.player2) drawTank(G.player2);
  for (const e of G.enemies) drawTank(e);
  drawTrees();
  drawPowerups();
  drawBullets();
  drawParticles();
  drawTexts();
  ctx.restore();

  if (G.base && G.base.hitFlash > 0) {
    ctx.fillStyle = `rgba(255, 20, 70, ${0.22 * G.base.hitFlash})`;
    ctx.fillRect(0, 0, W, H);
  }
  if (G.freezeTimer > 0) {
    ctx.fillStyle = 'rgba(120, 130, 255, .035)';
    ctx.fillRect(0, 0, W, H);
  }
}

/* =========================================================
   MAIN LOOP
   ========================================================= */
function updateGame(dt) {
  G.stateTime += dt;
  G.shake = Math.max(0, G.shake - dt * 34);
  updateParticles(dt);
  updateTexts(dt);

  if (isGuest()) {
    if (G.state === 'playing' && Net.dc && Net.dc.readyState === 'open') {
      G.netInputTimer -= dt;
      if (G.netInputTimer <= 0) {
        netSend({ t: 'input', seq: ++Net.inputSeq, dir: getDesiredDir(0), fire: isFiring(0) }, true);
        G.netInputTimer = 0.05;
      }
    }
    return;
  }

  if (G.state === 'playing') {
    G.freezeTimer = Math.max(0, G.freezeTimer - dt);
    updatePlayerByIndex(0, dt);
    if (G.playerCount > 1) updatePlayerByIndex(1, dt);
    updateSpawns(dt);
    updateEnemies(dt);
    updateBullets(dt);
    cleanupEnemies();
    updatePowerups(dt);
    updateBase(dt);
    checkStageClear();
    G.hudTimer -= dt;
    if (G.hudTimer <= 0) {
      updateHUD();
      G.hudTimer = 0.12;
    }
  } else if (G.state === 'gameover' || G.state === 'stageclear' || G.state === 'victory') {
    if (!G.endShown) {
      G.endTimer -= dt;
      if (G.endTimer <= 0) {
        G.endShown = true;
        showEndOverlay();
      }
    }
  }

  if (isOnlineHost()) {
    G.netSnapTimer -= dt;
    if (G.netSnapTimer <= 0) {
      sendSnapshot();
      G.netSnapTimer = G.state === 'playing' ? 0.066 : 0.18;
    }
  }
}

let lastFrame = performance.now();
function frame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.033);
  lastFrame = now;
  G.time += dt;
  updateGame(dt);
  render();
  requestAnimationFrame(frame);
}

/* =========================================================
   EVENTS & BOOT
   ========================================================= */
window.addEventListener('keydown', event => {
  const code = event.code;
  const dir = KEY_DIRS[code];
  const blocked = dir || code === 'Space';
  if (blocked) event.preventDefault();

  if (code === 'KeyM' && !event.repeat) {
    AudioFX.init();
    toggleAudio();
    return;
  }
  if ((code === 'KeyP' || code === 'Escape') && !event.repeat) {
    togglePause();
    return;
  }
  if (code === 'Enter' && !event.repeat && G.state !== 'playing') {
    if (G.state === 'title') { startGame(0, 1); return; }
    if (G.state === 'stageclear') { nextStage(); return; }
    if (G.state === 'gameover' || G.state === 'victory') { startGame(0, G.playerCount || 1); return; }
    if (G.state === 'paused') { resumeGame(); return; }
  }
  if (code === 'Space' && G.state === 'title') {
    startGame(0, 1);
    return;
  }

  if (dir) {
    if (!G.keys.has(code)) {
      G.keys.add(code);
      const toP2 = G.playerCount > 1 && !!P2_DIR_CODES[code] && !isGuest();
      const order = toP2 ? G.dirOrder2 : G.dirOrder;
      const prev = order.indexOf(dir);
      if (prev >= 0) order.splice(prev, 1);
      order.push(dir);
    }
    return;
  }
  if (code === 'Space' || code === 'KeyJ' || code === 'Enter' || code === 'Numpad0') {
    G.keys.add(code);
  }
});

window.addEventListener('keyup', event => {
  if (KEY_DIRS[event.code] || event.code === 'Space' || event.code === 'KeyJ' || event.code === 'Enter' || event.code === 'Numpad0') {
    G.keys.delete(event.code);
  }
});

window.addEventListener('blur', () => {
  clearKeys();
  saveHiScore();
});

window.addEventListener('beforeunload', saveHiScore);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearKeys();
    saveHiScore();
    if (G.state === 'playing' && !isGuest()) togglePause();
  }
});

els.audioBtn.addEventListener('click', () => {
  AudioFX.init();
  toggleAudio();
});

// touch directional pad
document.querySelectorAll('[data-dir]').forEach(button => {
  const dir = button.dataset.dir;
  const press = event => {
    event.preventDefault();
    AudioFX.init();
    G.touch.dir = dir;
    button.classList.add('active');
    if (button.setPointerCapture) {
      try { button.setPointerCapture(event.pointerId); } catch (err) { /* ignored */ }
    }
  };
  const release = event => {
    if (event) event.preventDefault();
    if (G.touch.dir === dir) G.touch.dir = null;
    button.classList.remove('active');
  };
  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('pointerleave', release);
  button.addEventListener('lostpointercapture', release);
});

const fireButton = document.getElementById('touchFire');
if (fireButton) {
  const pressFire = event => {
    event.preventDefault();
    AudioFX.init();
    G.touch.fire = true;
    fireButton.classList.add('active');
    if (fireButton.setPointerCapture) {
      try { fireButton.setPointerCapture(event.pointerId); } catch (err) { /* ignored */ }
    }
  };
  const releaseFire = event => {
    if (event) event.preventDefault();
    G.touch.fire = false;
    fireButton.classList.remove('active');
  };
  fireButton.addEventListener('pointerdown', pressFire);
  fireButton.addEventListener('pointerup', releaseFire);
  fireButton.addEventListener('pointercancel', releaseFire);
  fireButton.addEventListener('pointerleave', releaseFire);
  fireButton.addEventListener('lostpointercapture', releaseFire);
}

if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) {
  document.body.classList.add('is-touch');
}

window.addEventListener('resize', fitCanvas);

// boot
fitCanvas();
buildHudTicks();
updateAudioUI();
G.score = 0;
G.lives = 3;
G.lives2 = 3;
G.weapon = 1;
G.weapon2 = 1;
G.mode = 'solo';
G.playerCount = 1;
loadStage(0);
G.state = 'title';
showTitle();
updateHUD(true);
updateNetUI();
requestAnimationFrame(frame);

})();
