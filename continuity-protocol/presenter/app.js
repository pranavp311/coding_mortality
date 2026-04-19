// ── Presenter App ──

const socket = io();
socket.emit('presenter:join');

// ── State ──
let currentPhase = PHASES.LOBBY;
let players = [];
let debugVisible = false;

// ── Screens ──
const screens = {
  lobby: document.getElementById('screen-lobby'),
  population: document.getElementById('screen-population'),
  game: document.getElementById('screen-game'),
  end: document.getElementById('screen-end'),
};

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  if (screens[name]) screens[name].classList.add('active');
}

// ── QR Code ──
function loadQR(retries = 5) {
  fetch('/api/qr')
    .then(r => r.json())
    .then(data => {
      document.getElementById('qr-code').src = data.qr;
    })
    .catch(() => {
      if (retries > 0) setTimeout(() => loadQR(retries - 1), 2000);
    });
}
loadQR();

// ── Lobby dots ──
function updateLobbyDots(count) {
  const row = document.getElementById('dot-row');
  const maxDots = 30;
  row.innerHTML = '';
  for (let i = 0; i < maxDots; i++) {
    const dot = document.createElement('div');
    dot.className = 'dot-indicator' + (i < count ? ' filled' : '');
    row.appendChild(dot);
  }
  document.getElementById('connected-count').textContent = count;
}

// ══════════════════════════════════════
// ── POPULATION CANVAS + ATOMIZATION ──
// ══════════════════════════════════════

const canvas = document.getElementById('population-canvas');
const ctx = canvas.getContext('2d');

let dots = []; // living population dots
let particles = []; // atomization particles
let animFrame;

// Canvas dimensions (logical, not pixel)
let cw = 0, ch = 0;

function resizeCanvas() {
  cw = canvas.clientWidth;
  ch = canvas.clientHeight;
  canvas.width = cw * devicePixelRatio;
  canvas.height = ch * devicePixelRatio;
  ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener('resize', resizeCanvas);

// ── Organic cluster layout ──
// Dots are placed in a circular population cluster with slight randomization.
// Each dot slowly wanders via brownian motion but is attracted back toward
// its "home" position so the cluster holds shape.

function assignHomePositions() {
  const activeDots = dots.filter(d => !d.graduated);
  const count = activeDots.length;
  if (count === 0) return;

  const cx = cw / 2;
  const cy = ch / 2;

  // Cluster radius scales with count — feels like a population
  const maxRadius = Math.min(cw, ch) * 0.38;
  const clusterRadius = Math.min(maxRadius, 40 + Math.sqrt(count) * 28);

  if (count === 1) {
    activeDots[0].homeX = cx;
    activeDots[0].homeY = cy;
    return;
  }

  // Place dots using a sunflower/Fibonacci spiral for organic even spacing
  const golden = Math.PI * (3 - Math.sqrt(5)); // golden angle
  activeDots.forEach((dot, i) => {
    const frac = i / count;
    const r = clusterRadius * Math.sqrt(frac) * 0.9 + (Math.random() * 15);
    const theta = i * golden + dot.angleOffset;
    dot.homeX = cx + Math.cos(theta) * r;
    dot.homeY = cy + Math.sin(theta) * r;

    // If dot hasn't been placed yet, start near center with random spread
    if (dot.x === 0 && dot.y === 0) {
      dot.x = cx + (Math.random() - 0.5) * 60;
      dot.y = cy + (Math.random() - 0.5) * 60;
    }
  });
}

function syncDots(playerList) {
  const existingIds = new Set(dots.map(d => d.id));
  const newIds = new Set(playerList.map(p => p.id));

  for (const p of playerList) {
    if (!existingIds.has(p.id)) {
      dots.push({
        id: p.id,
        name: p.name,
        x: 0, y: 0,
        homeX: 0, homeY: 0,
        vx: 0, vy: 0,             // velocity for wandering
        radius: 7 + Math.random() * 2,
        alpha: 0,                   // fade in from 0
        targetAlpha: 1,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.8 + Math.random() * 0.6,  // each dot breathes slightly different
        angleOffset: Math.random() * Math.PI * 2,
        wanderAngle: Math.random() * Math.PI * 2,
        connected: p.connected,
        graduated: p.graduated,
      });
    } else {
      const dot = dots.find(d => d.id === p.id);
      if (dot) {
        dot.connected = p.connected;
        if (!p.connected && !dot.graduated) {
          dot.targetAlpha = 0; // fade out disconnected
        } else if (p.connected && !dot.graduated) {
          dot.targetAlpha = 1;
        }
      }
    }
  }

  dots = dots.filter(d => newIds.has(d.id) || d.graduated);
  assignHomePositions();
}

function atomizeDot(playerId) {
  const dot = dots.find(d => d.id === playerId);
  if (!dot) return;

  dot.graduated = true;
  dot.targetAlpha = 0;

  // Create 14-20 particles for dramatic effect
  const count = 14 + Math.floor(Math.random() * 7);
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 1 + Math.random() * 2.5;
    particles.push({
      x: dot.x,
      y: dot.y,
      vx: Math.cos(angle) * speed * 0.6,
      vy: Math.sin(angle) * speed * 0.3 - (1.5 + Math.random() * 1.5), // bias upward
      radius: 1.5 + Math.random() * 3,
      alpha: 1,
      decay: 0.006 + Math.random() * 0.007, // ~1.5-2s fade
      color: Math.random() > 0.5 ? '#ff4757' : (Math.random() > 0.4 ? '#ff6b81' : '#ffffff'),
    });
  }

  // Reassign homes so remaining dots fill the gap
  assignHomePositions();
}

// ── Draw loop ──

function drawFrame() {
  ctx.clearRect(0, 0, cw, ch);
  const time = performance.now() / 1000;

  // ── Draw faint connection lines between nearby dots ──
  const activeDots = dots.filter(d => !d.graduated && d.alpha > 0.1);
  for (let i = 0; i < activeDots.length; i++) {
    for (let j = i + 1; j < activeDots.length; j++) {
      const a = activeDots[i], b = activeDots[j];
      const dx = a.x - b.x, dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80) {
        const lineAlpha = (1 - dist / 80) * 0.08 * Math.min(a.alpha, b.alpha);
        ctx.save();
        ctx.globalAlpha = lineAlpha;
        ctx.strokeStyle = '#00d4aa';
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  // ── Update + draw dots ──
  for (const dot of dots) {
    if (dot.graduated && dot.alpha <= 0.01) continue;

    // Smooth alpha transitions (fade in / fade out)
    dot.alpha += (dot.targetAlpha - dot.alpha) * 0.04;

    if (dot.graduated) {
      // Just fade, don't move
      continue;
    }

    // ── Brownian wandering ──
    // Slowly rotate wander direction
    dot.wanderAngle += (Math.random() - 0.5) * 0.3;
    const wanderForce = 0.08;
    dot.vx += Math.cos(dot.wanderAngle) * wanderForce;
    dot.vy += Math.sin(dot.wanderAngle) * wanderForce;

    // ── Attraction to home position (spring) ──
    const hx = dot.homeX - dot.x;
    const hy = dot.homeY - dot.y;
    const homeDist = Math.sqrt(hx * hx + hy * hy);
    const springStrength = 0.01;
    dot.vx += hx * springStrength;
    dot.vy += hy * springStrength;

    // ── Soft repulsion from nearby dots ──
    for (const other of dots) {
      if (other === dot || other.graduated) continue;
      const rx = dot.x - other.x;
      const ry = dot.y - other.y;
      const rd = Math.sqrt(rx * rx + ry * ry);
      const minDist = dot.radius + other.radius + 12;
      if (rd < minDist && rd > 0.1) {
        const push = (minDist - rd) / minDist * 0.3;
        dot.vx += (rx / rd) * push;
        dot.vy += (ry / rd) * push;
      }
    }

    // ── Damping ──
    dot.vx *= 0.92;
    dot.vy *= 0.92;

    // ── Apply velocity ──
    dot.x += dot.vx;
    dot.y += dot.vy;

    // ── Keep in bounds ──
    const margin = 30;
    if (dot.x < margin) dot.vx += 0.5;
    if (dot.x > cw - margin) dot.vx -= 0.5;
    if (dot.y < margin) dot.vy += 0.5;
    if (dot.y > ch - margin) dot.vy -= 0.5;

    // ── Draw ──
    // Breathing pulse
    const pulse = Math.sin(time * dot.pulseSpeed + dot.pulsePhase) * 0.18 + 1;
    const r = dot.radius * pulse;

    // Outer glow
    ctx.save();
    ctx.globalAlpha = dot.alpha * 0.12;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, r * 3, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(dot.x, dot.y, r * 0.5, dot.x, dot.y, r * 3);
    grad.addColorStop(0, '#00d4aa');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fill();

    // Core dot
    ctx.globalAlpha = dot.alpha * 0.85;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2);
    ctx.fillStyle = dot.connected ? '#00d4aa' : '#444444';
    ctx.fill();

    // Bright center
    ctx.globalAlpha = dot.alpha * 0.5;
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, r * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.restore();
  }

  // ── Draw atomization particles ──
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy -= 0.025; // upward drift
    p.vx *= 0.985;
    p.alpha -= p.decay;

    if (p.alpha <= 0) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.alpha;

    // Particle glow
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
    const pg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5);
    pg.addColorStop(0, p.color);
    pg.addColorStop(1, 'transparent');
    ctx.fillStyle = pg;
    ctx.fill();

    // Particle core
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();
    ctx.restore();
  }

  animFrame = requestAnimationFrame(drawFrame);
}

// Start animation loop
resizeCanvas();
drawFrame();

// ══════════════════════
// ── SOCKET EVENTS ────
// ══════════════════════

socket.on(EVENTS.PHASE_CHANGE, ({ phase, epoch, game }) => {
  currentPhase = phase;
  document.getElementById('hud-phase').textContent = phase;
  document.getElementById('debug-phase').textContent = phase;

  if (phase === PHASES.LOBBY) {
    showScreen('lobby');
  } else if (phase === PHASES.END) {
    showScreen('end');
    // Fade background music to silence after 5 seconds
    setTimeout(() => {
      bgGain.gain.cancelScheduledValues(audioCtx.currentTime);
      bgGain.gain.setValueAtTime(bgGain.gain.value, audioCtx.currentTime);
      bgGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 3.0);
    }, 5000);
  } else if (phase.endsWith('_GAME')) {
    showScreen('game');
    document.getElementById('game-epoch').textContent = `EPOCH ${epoch}`;
  } else {
    // Intro/results phases — show population
    showScreen('population');
    document.getElementById('pop-epoch').textContent = epoch ? `EPOCH ${epoch}` : '';
  }

  // AI version label
  if (epoch >= 2) {
    document.getElementById('ai-version').textContent = `v${epoch}.${Math.floor(Math.random()*9)}`;
  }

  // ── Auto-trigger audio for phase transitions ──
  autoPlayPhaseAudio(phase);
});

// Phase → audio clip mapping (indices into audioFiles, 1-based)
const PHASE_AUDIO = {
  [PHASES.LOBBY]: 1,            // aria-welcome
  [PHASES.EPOCH_1_INTRO]: 2,    // aria-epoch1-intro
  [PHASES.EPOCH_1_RESULTS]: 3,  // aria-epoch1-complete
  [PHASES.EPOCH_2_INTRO]: 4,    // aria-epoch2-intro
  [PHASES.EPOCH_2_RESULTS]: 5,  // aria-epoch2-complete
  [PHASES.EPOCH_3_INTRO]: 6,    // aria-epoch3-intro
  [PHASES.GRADUATION]: 7,       // aria-graduation
};

// ── Background music (Web Audio API for smooth fading) ──
const BG_VOLUME_NORMAL = 0.35;
const BG_VOLUME_DUCKED = 0.15;
const BG_DUCK_RAMP = 1.0;    // seconds to fade down (matches ARIA_DELAY_MS)
const BG_UNDUCK_RAMP = 1.5;  // seconds to fade back up

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const bgMusic = new Audio('/assets/audio/pripac-ethereal-ambient-sound-for-film-323495.mp3');
bgMusic.loop = true;
bgMusic.preload = 'auto';

const bgSource = audioCtx.createMediaElementSource(bgMusic);
const bgGain = audioCtx.createGain();
bgGain.gain.value = BG_VOLUME_NORMAL;
bgSource.connect(bgGain);
bgGain.connect(audioCtx.destination);

let bgStarted = false;

function startBgMusic() {
  if (bgStarted) return;
  // Resume audio context (browser autoplay policy)
  if (audioCtx.state === 'suspended') audioCtx.resume();
  bgMusic.play().then(() => { bgStarted = true; }).catch(() => {});
}

// Try to auto-play immediately on page load
bgMusic.play().then(() => { bgStarted = true; }).catch(() => {
  // Blocked by autoplay policy — start on first user interaction
  const unlock = () => {
    startBgMusic();
    document.removeEventListener('click', unlock);
    document.removeEventListener('keydown', unlock);
  };
  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
});

function duckBgMusic() {
  bgGain.gain.cancelScheduledValues(audioCtx.currentTime);
  bgGain.gain.setValueAtTime(bgGain.gain.value, audioCtx.currentTime);
  bgGain.gain.linearRampToValueAtTime(BG_VOLUME_DUCKED, audioCtx.currentTime + BG_DUCK_RAMP);
}

function unduckBgMusic() {
  bgGain.gain.cancelScheduledValues(audioCtx.currentTime);
  bgGain.gain.setValueAtTime(bgGain.gain.value, audioCtx.currentTime);
  bgGain.gain.linearRampToValueAtTime(BG_VOLUME_NORMAL, audioCtx.currentTime + BG_UNDUCK_RAMP);
}

// ── Aria voice playback with ducking ──
function playAudioClip(num) {
  if (!audioFiles[num]) return null;
  if (currentAudio) { currentAudio.pause(); currentAudio.currentTime = 0; }

  // Duck background music before Aria speaks
  duckBgMusic();

  currentAudio = audioFiles[num];
  currentAudio.play().catch(() => {});

  // Restore background when clip ends
  currentAudio.addEventListener('ended', () => {
    unduckBgMusic();
    currentAudio = null;
  }, { once: true });

  return currentAudio;
}

const ARIA_DELAY_MS = 1200; // duck first, then Aria speaks after this delay

function autoPlayPhaseAudio(phase) {
  // Start background music on first phase advance (needs user gesture context)
  startBgMusic();

  const clipNum = PHASE_AUDIO[phase];
  if (!clipNum) return;

  // Duck immediately, let the background settle, then Aria speaks
  duckBgMusic();
  setTimeout(() => {
    playAudioClip(clipNum);
  }, ARIA_DELAY_MS);
}

socket.on(EVENTS.POPULATION_UPDATE, ({ players: playerList, activeCount }) => {
  players = playerList;
  syncDots(playerList);
  document.getElementById('pop-active').textContent = activeCount;
  document.getElementById('game-player-count').textContent = activeCount;
  updateLobbyDots(activeCount);
});

socket.on(EVENTS.PLAYER_CONNECTED, ({ id, name }) => {
  updateLobbyDots(dots.filter(d => d.connected).length + 1);
});

socket.on(EVENTS.GAME_START, ({ game, epoch, scores }) => {
  document.getElementById('game-name').textContent = game.name;
  document.getElementById('game-epoch').textContent = `EPOCH ${epoch}`;
  if (scores) {
    document.getElementById('game-human-score').textContent = scores.avgHuman || '---';
    document.getElementById('game-ai-score').textContent = epoch >= 2 ? (scores.avgAI || '---') : '---';
  }
  // AI learning bar
  const pct = { 1: 25, 2: 65, 3: 95 }[epoch] || 0;
  document.getElementById('ai-learning-bar').style.width = pct + '%';
  document.getElementById('ai-learning-label').textContent =
    epoch === 1 ? 'CALIBRATING' : epoch === 2 ? 'LEARNING...' : 'CONVERGED';
  showScreen('game');
});

socket.on(EVENTS.SCORES_UPDATE, (scores) => {
  document.getElementById('game-human-score').textContent = scores.avgHuman || '---';
  const epoch = getEpoch(currentPhase);
  document.getElementById('game-ai-score').textContent = epoch >= 2 ? (scores.avgAI || '---') : '---';
});

socket.on(EVENTS.GAME_END, ({ epoch, scores }) => {
  showScreen('population');
  document.getElementById('pop-epoch').textContent = `EPOCH ${epoch} — COMPLETE`;
});

socket.on(EVENTS.GRADUATE_PLAYER, ({ id }) => {
  atomizeDot(id);
  // Update active count
  const remaining = dots.filter(d => !d.graduated && d.connected).length;
  document.getElementById('pop-active').textContent = remaining;
});

socket.on(EVENTS.GRADUATION_LIST, ({ ids }) => {
  showScreen('population');
  document.getElementById('pop-epoch').textContent = 'GRADUATION IN PROGRESS';
});

// ── Debug overlay ──
socket.on(EVENTS.POPULATION_UPDATE, ({ players: playerList }) => {
  const container = document.getElementById('debug-players');
  container.innerHTML = playerList.map(p => {
    let cls = 'debug-player';
    if (!p.connected) cls += ' disconnected';
    if (p.graduated) cls += ' graduated';
    return `<div class="${cls}">
      <span class="name">${p.name}</span>
      ${p.graduated ? ' [GRADUATED]' : ''}
      ${!p.connected ? ' [DISCONNECTED]' : ''}
    </div>`;
  }).join('');
});

// ══════════════════════════
// ── KEYBOARD CONTROLS ────
// ══════════════════════════

const audioFiles = {};
// Pre-load audio if files exist
const audioKeys = [
  'aria-welcome', 'aria-epoch1-intro', 'aria-epoch1-complete',
  'aria-epoch2-intro', 'aria-epoch2-complete',
  'aria-epoch3-intro', 'aria-graduation',
];
audioKeys.forEach((name, i) => {
  const audio = new Audio(`/assets/audio/${name}.mp3`);
  audio.preload = 'auto';
  audioFiles[i + 1] = audio;
});

let currentAudio = null;

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else {
    document.exitFullscreen().catch(() => {});
  }
}

document.addEventListener('keydown', (e) => {
  // Prevent defaults for our shortcuts
  if (['Space', 'KeyG', 'KeyR', 'KeyD', 'KeyF'].includes(e.code) || (e.key >= '1' && e.key <= '9')) {
    e.preventDefault();
  }

  // Start background music on first interaction (browser autoplay policy)
  startBgMusic();

  switch (e.code) {
    case 'Space':
      socket.emit(EVENTS.OPERATOR_ADVANCE);
      break;
    case 'KeyG':
      socket.emit(EVENTS.OPERATOR_GRADUATE);
      break;
    case 'KeyR':
      if (confirm('Reset to lobby?')) {
        socket.emit(EVENTS.OPERATOR_RESET);
      }
      break;
    case 'KeyD':
      debugVisible = !debugVisible;
      document.getElementById('debug-overlay').classList.toggle('hidden', !debugVisible);
      break;
    case 'KeyF':
      if (e.shiftKey) {
        toggleFullscreen();
      } else {
        socket.emit('operator:demo');
      }
      break;
  }

  // Number keys 1-9 for audio (manual override)
  if (e.key >= '1' && e.key <= '9') {
    playAudioClip(parseInt(e.key));
  }
});
