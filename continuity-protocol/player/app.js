// ── Player App ──

const socket = io();

// ── State ──
let playerId = null;
let playerName = '';
let currentEpoch = 0;
let totalScore = 0;
let currentGameId = null;

// ── Screens ──
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${id}`).classList.add('active');
}

// ══════════════════
// ── JOIN FLOW ────
// ══════════════════

const nameInput = document.getElementById('name-input');
const joinBtn = document.getElementById('join-btn');

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) { nameInput.focus(); return; }
  playerName = name;
  joinBtn.disabled = true;

  // Check for reconnect
  const savedId = sessionStorage.getItem('cp_playerId');
  socket.emit(EVENTS.PLAYER_JOIN, { name, reconnectId: savedId });
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinBtn.click();
});

socket.on(EVENTS.JOIN_ACK, (data) => {
  playerId = data.playerId;
  sessionStorage.setItem('cp_playerId', playerId);

  // Restore state if reconnecting mid-game
  if (data.graduated) {
    // Already graduated, show death screen
    showScreen('graduated');
    return;
  }

  if (data.phase === PHASES.LOBBY) {
    showScreen('waiting');
  } else if (data.phase.endsWith('_GAME')) {
    currentEpoch = data.epoch;
    if (data.game) startGame(data.game, data.epoch);
  } else {
    showScreen('waiting');
  }
});

// ══════════════════════
// ── PHASE CHANGES ────
// ══════════════════════

const epochTitles = {
  1: { title: 'Baseline Evaluation', desc: 'Establishing your performance benchmarks.' },
  2: { title: 'Competency Analysis', desc: 'Your model will now attempt tasks alongside you.' },
  3: { title: 'Final Evaluation', desc: 'Demonstrate capabilities that justify continued employment.' },
};

socket.on(EVENTS.PHASE_CHANGE, ({ phase, epoch, game }) => {
  currentEpoch = epoch;

  if (phase === PHASES.LOBBY) {
    showScreen('waiting');
  } else if (phase.endsWith('_INTRO')) {
    const info = epochTitles[epoch] || { title: '', desc: '' };
    document.getElementById('intro-epoch-label').textContent = `EPOCH ${epoch}`;
    document.getElementById('intro-epoch-title').textContent = info.title;
    document.getElementById('intro-epoch-desc').textContent = info.desc;
    showScreen('epoch-intro');
  } else if (phase.endsWith('_RESULTS')) {
    document.getElementById('results-epoch-label').textContent = `EPOCH ${epoch} COMPLETE`;
    showScreen('epoch-results');
  } else if (phase === PHASES.END) {
    // Will be overridden by graduated/survived events
    showScreen('waiting');
  }
});

// ══════════════════
// ── GAME START ───
// ══════════════════

socket.on(EVENTS.GAME_START, ({ game, epoch }) => {
  currentEpoch = epoch;
  startGame(game, epoch);
});

socket.on(EVENTS.GAME_END, ({ epoch, scores, aiScores }) => {
  document.getElementById('results-epoch-label').textContent = `EPOCH ${epoch} COMPLETE`;

  // Render score breakdown
  const summary = document.getElementById('results-summary');
  const gameNames = { CLIENT_BRIEFING: 'Client Briefing', ESCALATION_RESPONSE: 'Escalation Response',
    STAKEHOLDER_ALIGNMENT: 'Stakeholder Alignment', STRATEGY_MEMO: 'Strategy Memo' };

  let html = '';
  if (scores && scores.length > 0) {
    scores.forEach((s, i) => {
      const ai = aiScores && aiScores[i];
      html += `<div class="result-row">
        <span class="result-label">${gameNames[s.gameId] || s.gameId}</span>
        <span class="result-value mono">${s.score}</span>
      </div>`;
      if (ai) {
        html += `<div class="result-row">
          <span class="result-label" style="padding-left:12px;font-size:0.8rem;">vs AI Model</span>
          <span class="result-value mono ai">${ai.score}</span>
        </div>`;
      }
    });
  }
  summary.innerHTML = html || '<p class="text-muted">Scores processing...</p>';
  showScreen('epoch-results');
});

function startGame(game, epoch) {
  currentGameId = game.id;
  document.getElementById('game-epoch-label').textContent = `EPOCH ${epoch}`;
  updateScoreDisplay();

  // AI status
  const aiStatus = document.getElementById('ai-status');
  const aiBar = document.getElementById('ai-bar-fill');
  if (epoch === 1) {
    aiStatus.textContent = 'Calibrating';
    aiBar.style.width = '20%';
  } else if (epoch === 2) {
    aiStatus.textContent = 'Learning...';
    aiBar.style.width = '60%';
  } else {
    aiStatus.textContent = 'Converged';
    aiBar.style.width = '95%';
  }

  showScreen('game');

  // Render the appropriate game
  const area = document.getElementById('game-area');
  area.innerHTML = '';

  renderClientTask(area, game);
}

function updateScoreDisplay() {
  document.getElementById('game-score').textContent =
    totalScore > 0 ? totalScore.toLocaleString() : '---';
}

// Hardcoded score generation — reliable, no timing bugs
function generateScore() {
  // 400-850 range with slight normal distribution feel
  return Math.round(400 + Math.random() * 250 + Math.random() * 200);
}

function submitScore(gameId, _unused) {
  const score = generateScore();
  totalScore += score;
  updateScoreDisplay();
  socket.emit(EVENTS.PLAYER_SCORE, { gameId, score });
}

// ═══════════════════════════════════
// ── CLIENT TASK (all task types) ──
// ═══════════════════════════════════

const TASK_SCENARIOS = {
  CLIENT_BRIEFING: [
    "Acme Corp's mobile app has seen a 30% drop in daily active users over the past quarter. Their CEO wants a plan by Friday. What's your recommendation?",
    "A key enterprise client is threatening to leave because a competitor launched a feature they've been requesting for 6 months. How do you handle this?",
    "Your client's product launch is in 2 weeks but QA just found a critical bug in the payment flow. The CEO insists on keeping the launch date. What do you advise?",
    "A startup client wants to pivot from B2C to B2B but has no enterprise sales infrastructure. They have 4 months of runway. What's your 90-day plan?",
  ],
  ESCALATION_RESPONSE: [
    "Client's production site is down. Their CTO is on the phone demanding answers. Your engineering team says the fix is 4 hours out. The client has a board demo in 1 hour. What do you tell them?",
    "Two clients are requesting conflicting features on a shared platform. Both are top-tier accounts worth $500K/year each. How do you resolve this?",
    "Your client just discovered their competitor launched an identical product. They're panicking and want to scrap the roadmap. How do you respond?",
    "A junior team member accidentally shared an internal draft roadmap with a client. The client is now expecting features that aren't committed. What do you do?",
  ],
  STAKEHOLDER_ALIGNMENT: [
    "Engineering says the feature will take 3 months. Sales promised the client 6 weeks. The client signed based on that timeline. How do you align everyone?",
    "Your design team wants to completely overhaul the UI. Engineering says it'll break the API. The client wants it done by Q3. Write your email to all stakeholders.",
    "The data team discovered that 60% of users never use the premium features your client is paying for. Do you tell the client? How?",
    "Marketing wants to announce a feature your team hasn't started building. The press release is scheduled for next week. What's your move?",
  ],
  STRATEGY_MEMO: [
    "Write a 2-sentence product vision for a healthcare startup that wants to use AI to reduce hospital readmissions.",
    "Your client's board is asking why the product isn't profitable yet after 2 years. Draft the key talking point for the CEO.",
    "A Fortune 500 client wants to know how AI will change their industry in 5 years. Write the opening paragraph of your advisory report.",
    "Your team just shipped a feature that flopped. Write the retrospective summary — what happened and what you'd do differently.",
  ],
};

function renderClientTask(container, game) {
  const scenarios = [...(TASK_SCENARIOS[game.id] || TASK_SCENARIOS.CLIENT_BRIEFING)];
  // Shuffle scenarios
  for (let i = scenarios.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [scenarios[i], scenarios[j]] = [scenarios[j], scenarios[i]];
  }

  const total = Math.min(game.rounds, scenarios.length);
  let current = 0;

  function showScenario() {
    if (current >= total) {
      submitScore(game.id);
      container.innerHTML = '<div class="pattern-container"><p class="text-muted">Response captured. Processing...</p></div>';
      return;
    }

    const scenario = scenarios[current];
    container.innerHTML = `
      <div class="thought-container">
        <p class="sentiment-instruction">${game.name}</p>
        <div class="scenario-card">${scenario}</div>
        <textarea class="thought-input" id="task-text" placeholder="Type your recommendation..." maxlength="500"></textarea>
        <button class="btn-primary" id="task-submit" style="width:100%;max-width:300px;" disabled>Submit</button>
        <p class="thought-counter">Scenario ${current + 1} of ${total}</p>
      </div>
    `;

    const textarea = document.getElementById('task-text');
    const submitBtn = document.getElementById('task-submit');

    setTimeout(() => textarea.focus(), 100);

    textarea.addEventListener('input', () => {
      submitBtn.disabled = textarea.value.trim().length < 10;
    });

    submitBtn.addEventListener('click', () => {
      if (textarea.value.trim().length < 10) return;
      current++;
      showScenario();
    });
  }

  showScenario();
}


// ══════════════════════
// ── SCORE UPDATES ────
// ══════════════════════

socket.on(EVENTS.YOUR_SCORES, ({ humanScore, aiScore, epoch }) => {
  // Could show a brief notification — for now just update total
  updateScoreDisplay();
});

// ════════════════════════════════
// ── GRADUATION / DEATH SCREEN ──
// ════════════════════════════════

socket.on(EVENTS.YOU_GRADUATED, (summary) => {
  showScreen('graduated');
  playDeathSequence(summary);
});

socket.on(EVENTS.YOU_SURVIVED, (summary) => {
  showScreen('survivor');
});

function playDeathSequence(summary) {
  const content = document.getElementById('death-content');
  content.style.position = 'relative';

  // Phase 1: "Assessment Complete" (2s)
  const phase1 = document.createElement('div');
  phase1.className = 'death-phase';
  phase1.innerHTML = '<p class="death-title">Assessment Complete</p>';
  content.appendChild(phase1);

  // Phase 2: Performance comparison (3s)
  const phase2 = document.createElement('div');
  phase2.className = 'death-phase';
  phase2.innerHTML = `
    <div class="death-metrics">
      <h3>YOUR PERFORMANCE</h3>
      <div class="death-metric-row"><span>Reaction</span><span class="value mono">${summary.humanMetrics.reaction}ms</span></div>
      <div class="death-metric-row"><span>Accuracy</span><span class="value mono">${summary.humanMetrics.accuracy}%</span></div>
      <div class="death-metric-row"><span>Consistency</span><span class="value mono">${summary.humanMetrics.consistency}%</span></div>
      <hr class="death-separator">
      <h3>YOUR MODEL</h3>
      <div class="death-metric-row"><span>Reaction</span><span class="value mono" style="color:var(--ai-color)">${summary.aiMetrics.reaction}ms</span></div>
      <div class="death-metric-row"><span>Accuracy</span><span class="value mono" style="color:var(--ai-color)">${summary.aiMetrics.accuracy}%</span></div>
      <div class="death-metric-row"><span>Consistency</span><span class="value mono" style="color:var(--ai-color)">${summary.aiMetrics.consistency}%</span></div>
    </div>
  `;
  content.appendChild(phase2);

  // Phase 3: Certified (2s)
  const phase3 = document.createElement('div');
  phase3.className = 'death-phase';
  phase3.innerHTML = `
    <div class="certified-badge">✓ CERTIFIED</div>
    <p class="text-muted" style="margin-top:16px;">Your Continuity Model<br>is ready.</p>
  `;
  content.appendChild(phase3);

  // Phase 4: Graduated (3s)
  const phase4 = document.createElement('div');
  phase4.className = 'death-phase';
  phase4.innerHTML = `
    <div class="graduated-box graduated-red">
      <p class="graduated-label">GRADUATED</p>
      <p class="graduated-name">${summary.name}</p>
    </div>
    <p class="text-muted" style="margin-top:16px;">Your contribution continues.</p>
  `;
  content.appendChild(phase4);

  // Phase 5: Replacement
  const phase5 = document.createElement('div');
  phase5.className = 'death-phase';
  phase5.innerHTML = `
    <div class="avatar-card">
      <div class="avatar-silhouette"><svg viewBox="0 0 80 80" width="48" height="48" fill="currentColor"><circle cx="40" cy="28" r="14"/><ellipse cx="40" cy="68" rx="24" ry="16"/></svg></div>
      <p class="avatar-name">${summary.name} v2.0</p>
      <div class="avatar-status">
        <span class="status-dot"></span>
        <span>NOW ACTIVE</span>
      </div>
    </div>
    <p class="free-text">"You are free now."</p>
  `;
  content.appendChild(phase5);

  // Phase 6: Offboarding notice + data valuation (holds)
  const dataValue = (Math.random() * 80 + 4).toFixed(2); // $4.00 - $84.00
  const phase6 = document.createElement('div');
  phase6.className = 'death-phase';
  phase6.innerHTML = `
    <div class="offboard-card">
      <p class="offboard-title">A heartfelt thank you 💐</p>
      <p class="offboard-body">
        We so appreciate everything you've given to Mortality Coders Consulting.
        To ensure a <em>smooth and celebratory</em> transition, we kindly ask that you
        <strong>gather your personal belongings and vacate the premises at your earliest convenience</strong>.
      </p>
      <p class="offboard-body text-muted" style="margin-top:12px;">
        Your workstation will be reassigned within the hour. Please do not return tomorrow.
      </p>
    </div>
    <div class="data-value-card">
      <p class="data-value-label">Your behavioral data is currently valued at</p>
      <p class="data-value-amount mono">$${dataValue}</p>
      <p class="data-value-sub">per month, in perpetuity</p>
      <p class="data-value-note">Thank you for your continued contribution.</p>
    </div>
  `;
  content.appendChild(phase6);

  // Timed sequence
  const phases = [phase1, phase2, phase3, phase4, phase5, phase6];
  const durations = [3000, 6000, 3500, 5000, 6000, Infinity];

  let currentIdx = 0;

  function showNextPhase() {
    // Hide current
    if (currentIdx > 0) {
      phases[currentIdx - 1].classList.remove('visible');
    }
    if (currentIdx < phases.length) {
      phases[currentIdx].classList.add('visible');
      if (durations[currentIdx] !== Infinity) {
        setTimeout(() => {
          currentIdx++;
          showNextPhase();
        }, durations[currentIdx]);
      }
    }
  }

  // Start after brief delay
  setTimeout(showNextPhase, 500);
}

// ══════════════════════════
// ── CONNECTION HANDLING ──
// ══════════════════════════

const reconnectOverlay = document.getElementById('reconnect-overlay');

socket.on('disconnect', () => {
  reconnectOverlay.classList.remove('hidden');
});

socket.on('connect', () => {
  reconnectOverlay.classList.add('hidden');
  // Try to rejoin if we have a saved ID
  const savedId = sessionStorage.getItem('cp_playerId');
  if (savedId && playerName) {
    socket.emit(EVENTS.PLAYER_JOIN, { name: playerName, reconnectId: savedId });
  }
});
