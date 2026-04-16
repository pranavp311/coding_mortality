const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const QRCode = require('qrcode');
const GameState = require('./gameState');
const { EVENTS, PHASES } = require('../shared/constants');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Auto-detect LAN IP so phones on the same WiFi can connect
function getLanIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal/loopback and non-IPv4
      if (iface.internal || iface.family !== 'IPv4') continue;
      return iface.address;
    }
  }
  return 'localhost';
}

const LAN_IP = getLanIP();
const HOST_URL = process.env.HOST_URL || `http://${LAN_IP}:${PORT}`;

const gameState = new GameState();

// Serve static files
app.use('/shared', express.static(path.join(__dirname, '..', 'shared')));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));

// Presenter screen
app.use('/presenter', express.static(path.join(__dirname, '..', 'presenter')));

// Player screen — served at root /play and also at /
app.use('/play', express.static(path.join(__dirname, '..', 'player')));
app.use('/', express.static(path.join(__dirname, '..', 'player')));

// QR code endpoint
app.get('/api/qr', async (req, res) => {
  try {
    const url = `${HOST_URL}/play`;
    const qr = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: { dark: '#00d4aa', light: '#0a0a0a' },
    });
    res.json({ qr, url });
  } catch (err) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

// API to get current state (for reconnection)
app.get('/api/state', (req, res) => {
  res.json({
    phase: gameState.phase,
    epoch: gameState.getCurrentEpoch(),
    game: gameState.getCurrentGame(),
    playerCount: gameState.getActivePlayers().length,
  });
});

// Track socket → player mapping for reconnection
const socketToPlayer = new Map();

io.on('connection', (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  // Player joins
  socket.on(EVENTS.PLAYER_JOIN, ({ name, reconnectId }) => {
    let player;

    // Try reconnect first
    if (reconnectId && gameState.players.has(reconnectId)) {
      player = gameState.reconnectPlayer(reconnectId);
      socketToPlayer.set(socket.id, reconnectId);
      io.to('presenter').emit(EVENTS.PLAYER_RECONNECTED, { id: reconnectId, name: player.name });
    } else {
      // New player
      const id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      player = gameState.addPlayer(id, name);
      socketToPlayer.set(socket.id, id);

      io.to('presenter').emit(EVENTS.PLAYER_CONNECTED, { id, name: player.name });
    }

    // Acknowledge join and send current state
    socket.join('players');
    socket.emit(EVENTS.JOIN_ACK, {
      playerId: player.id,
      phase: gameState.phase,
      epoch: gameState.getCurrentEpoch(),
      game: gameState.getCurrentGame(),
      scores: player.scores,
      aiScores: player.aiScores,
      graduated: player.graduated,
    });

    // Update presenter population
    emitPopulation();
  });

  // Player submits a score
  socket.on(EVENTS.PLAYER_SCORE, ({ gameId, score }) => {
    const playerId = socketToPlayer.get(socket.id);
    if (!playerId) return;

    const result = gameState.recordScore(playerId, gameId, score);
    if (!result) return;

    // Send score back to player
    socket.emit(EVENTS.YOUR_SCORES, {
      humanScore: result.humanScore,
      aiScore: result.aiScore,
      epoch: gameState.getCurrentEpoch(),
    });

    // Update presenter with aggregate
    io.to('presenter').emit(EVENTS.SCORES_UPDATE, gameState.getAggregateScores());

    // Check if all players done with current game
    if (gameState.allPlayersFinished()) {
      const nextGame = gameState.advanceGame();
      if (nextGame) {
        // Start next game in this epoch
        io.to('players').emit(EVENTS.GAME_START, {
          game: nextGame,
          epoch: gameState.getCurrentEpoch(),
        });
        io.to('presenter').emit(EVENTS.GAME_START, {
          game: nextGame,
          epoch: gameState.getCurrentEpoch(),
          scores: gameState.getAggregateScores(),
        });
      } else {
        // All games in epoch done — send per-player summaries
        const epoch = gameState.getCurrentEpoch();
        for (const [sid, pid] of socketToPlayer) {
          const p = gameState.players.get(pid);
          if (!p) continue;
          const ps = io.sockets.sockets.get(sid);
          if (!ps) continue;
          ps.emit(EVENTS.GAME_END, {
            epoch,
            scores: p.scores[epoch] || [],
            aiScores: p.aiScores[epoch] || [],
          });
        }
        io.to('presenter').emit(EVENTS.GAME_END, {
          epoch,
          scores: gameState.getAggregateScores(),
        });
      }
    }
  });

  // Player signals game completion (individual game done)
  socket.on(EVENTS.PLAYER_GAME_DONE, ({ gameId }) => {
    // Handled via PLAYER_SCORE — this is a backup signal
    const playerId = socketToPlayer.get(socket.id);
    if (playerId) {
      gameState.gameCompletions.add(playerId);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const playerId = socketToPlayer.get(socket.id);
    if (playerId) {
      gameState.disconnectPlayer(playerId);
      socketToPlayer.delete(socket.id);
      io.to('presenter').emit(EVENTS.PLAYER_DISCONNECTED, { id: playerId });
      emitPopulation();
    }
  });

  // Presenter joins
  socket.on('presenter:join', () => {
    socket.join('presenter');
    // Send full state
    socket.emit(EVENTS.PHASE_CHANGE, {
      phase: gameState.phase,
      epoch: gameState.getCurrentEpoch(),
      game: gameState.getCurrentGame(),
    });
    emitPopulation();
  });

  // Operator controls (from presenter)
  socket.on(EVENTS.OPERATOR_ADVANCE, () => {
    const newPhase = gameState.advancePhase();
    if (!newPhase) return;

    io.emit(EVENTS.PHASE_CHANGE, {
      phase: newPhase,
      epoch: gameState.getCurrentEpoch(),
      game: gameState.getCurrentGame(),
    });

    // If entering a game phase, start the first game
    if (newPhase.endsWith('_GAME')) {
      const game = gameState.getCurrentGame();
      if (game) {
        const epoch = gameState.getCurrentEpoch();
        io.to('players').emit(EVENTS.GAME_START, { game, epoch });
        io.to('presenter').emit(EVENTS.GAME_START, { game, epoch, scores: gameState.getAggregateScores() });
        // Auto-score for fake players
        if (fakePlayers.size > 0) fakePlayersAutoScore(game.id, epoch);
      }
    }

    // If entering graduation phase, compute graduations
    if (newPhase === PHASES.GRADUATION) {
      triggerGraduation();
    }
  });

  socket.on(EVENTS.OPERATOR_GRADUATE, () => {
    if (gameState.phase !== PHASES.GRADUATION) {
      // Force to graduation phase
      gameState.phase = PHASES.GRADUATION;
      io.emit(EVENTS.PHASE_CHANGE, {
        phase: PHASES.GRADUATION,
        epoch: 3,
        game: null,
      });
    }
    triggerGraduation();
  });

  socket.on(EVENTS.OPERATOR_RESET, () => {
    gameState.reset();
    socketToPlayer.clear();
    fakePlayers.clear();
    io.emit(EVENTS.PHASE_CHANGE, { phase: PHASES.LOBBY, epoch: 0, game: null });
    emitPopulation();
  });

  // Demo mode: spawn fake players
  socket.on('operator:demo', () => {
    spawnFakePlayers();
  });

});

// ── Demo mode: fake players ──
const FAKE_NAMES = [
  'Alex Chen', 'Jordan Kim', 'Sam Rivera', 'Taylor Park', 'Morgan Liu',
  'Casey Zhao', 'Riley Singh', 'Drew Patel', 'Avery Nakamura', 'Quinn Osei',
  'Blake Torres', 'Jamie Sato', 'Reese Andersen', 'Dakota Mbeki', 'Finley Cruz',
];
const fakePlayers = new Set(); // track fake player IDs

function spawnFakePlayers() {
  const count = 10 + Math.floor(Math.random() * 6); // 10-15
  for (let i = 0; i < count; i++) {
    const id = `fake_${Date.now()}_${i}`;
    const name = FAKE_NAMES[i % FAKE_NAMES.length];
    gameState.addPlayer(id, name);
    fakePlayers.add(id);
    io.to('presenter').emit(EVENTS.PLAYER_CONNECTED, { id, name });
  }
  emitPopulation();
  console.log(`Demo mode: spawned ${count} fake players`);
}

// Auto-submit scores for fake players when a game starts
function fakePlayersAutoScore(gameId, epoch) {
  for (const id of fakePlayers) {
    if (!gameState.players.has(id)) continue;
    const p = gameState.players.get(id);
    if (p.graduated || !p.connected) continue;

    // Random delay 2-8s to simulate real play
    const delay = 2000 + Math.random() * 6000;
    setTimeout(() => {
      const score = 300 + Math.floor(Math.random() * 500); // 300-800
      gameState.recordScore(id, gameId, score);
      gameState.gameCompletions.add(id);
      io.to('presenter').emit(EVENTS.SCORES_UPDATE, gameState.getAggregateScores());

      // Check if all done
      if (gameState.allPlayersFinished()) {
        const nextGame = gameState.advanceGame();
        if (nextGame) {
          io.to('players').emit(EVENTS.GAME_START, { game: nextGame, epoch });
          io.to('presenter').emit(EVENTS.GAME_START, { game: nextGame, epoch, scores: gameState.getAggregateScores() });
          fakePlayersAutoScore(nextGame.id, epoch);
        } else {
          const ep = gameState.getCurrentEpoch();
          for (const [sid, pid] of socketToPlayer) {
            const pl = gameState.players.get(pid);
            if (!pl) continue;
            const ps = io.sockets.sockets.get(sid);
            if (ps) ps.emit(EVENTS.GAME_END, { epoch: ep, scores: pl.scores[ep] || [], aiScores: pl.aiScores[ep] || [] });
          }
          io.to('presenter').emit(EVENTS.GAME_END, { epoch: ep, scores: gameState.getAggregateScores() });
        }
      }
    }, delay);
  }
}

function emitPopulation() {
  const players = [...gameState.players.values()].map(p => ({
    id: p.id,
    name: p.name,
    connected: p.connected,
    graduated: p.graduated,
  }));
  io.to('presenter').emit(EVENTS.POPULATION_UPDATE, {
    players,
    activeCount: gameState.getActivePlayers().length,
  });
}

function triggerGraduation() {
  const graduatedIds = gameState.determineGraduations();

  // Send graduation list to presenter (for staggered atomization)
  io.to('presenter').emit(EVENTS.GRADUATION_LIST, { ids: graduatedIds });

  // Notify each player individually
  for (const [socketId, playerId] of socketToPlayer) {
    const summary = gameState.getPlayerSummary(playerId);
    if (!summary) continue;

    const playerSocket = io.sockets.sockets.get(socketId);
    if (!playerSocket) continue;

    if (summary.graduated) {
      playerSocket.emit(EVENTS.YOU_GRADUATED, summary);
    } else {
      playerSocket.emit(EVENTS.YOU_SURVIVED, summary);
    }
  }

  // Send atomization events staggered
  graduatedIds.forEach((id, i) => {
    setTimeout(() => {
      io.to('presenter').emit(EVENTS.GRADUATE_PLAYER, { id });
    }, i * 800);
  });

  emitPopulation();
}

// Listen on 0.0.0.0 so LAN devices can connect
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  ╔═════════════════════════════════════════════╗`);
  console.log(`  ║          CONTINUUM SYSTEMS                    ║`);
  console.log(`  ║          Your Legacy, Optimized               ║`);
  console.log(`  ╠═════════════════════════════════════════════╣`);
  console.log(`  ║  LAN IP:    ${LAN_IP}`);
  console.log(`  ║  Presenter: ${HOST_URL}/presenter`);
  console.log(`  ║  Players:   ${HOST_URL}/play`);
  console.log(`  ║  Port:      ${PORT}`);
  console.log(`  ╚═════════════════════════════════════════════╝`);
  console.log(`\n  Players on the same WiFi can scan the QR code or visit:`);
  console.log(`  ${HOST_URL}/play\n`);
});
