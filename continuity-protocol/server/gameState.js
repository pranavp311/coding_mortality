const { PHASES, PHASE_ORDER, EPOCH_GAMES, GAMES, GRADUATION_PERCENT, getEpoch } = require('../shared/constants');
const { calculateAIScore, generateAIMetrics } = require('./aiModel');

class GameState {
  constructor() {
    this.reset();
  }

  reset() {
    this.phase = PHASES.LOBBY;
    this.players = new Map(); // id -> player data
    this.currentGameIndex = 0; // index within epoch's game list
    this.gameCompletions = new Set(); // player ids who finished current game
  }

  addPlayer(id, name) {
    this.players.set(id, {
      id,
      name,
      connected: true,
      scores: { 1: [], 2: [], 3: [] }, // epoch -> array of game scores
      aiScores: { 1: [], 2: [], 3: [] },
      totalScore: 0,
      totalAIScore: 0,
      graduated: false,
    });
    return this.players.get(id);
  }

  reconnectPlayer(id) {
    const player = this.players.get(id);
    if (player) player.connected = true;
    return player;
  }

  disconnectPlayer(id) {
    const player = this.players.get(id);
    if (player) player.connected = false;
    return player;
  }

  getActivePlayers() {
    return [...this.players.values()].filter(p => p.connected && !p.graduated);
  }

  getPhaseIndex() {
    return PHASE_ORDER.indexOf(this.phase);
  }

  advancePhase() {
    const idx = this.getPhaseIndex();
    if (idx < PHASE_ORDER.length - 1) {
      this.phase = PHASE_ORDER[idx + 1];
      // Reset game tracking when entering a game phase
      if (this.phase.endsWith('_GAME')) {
        this.currentGameIndex = 0;
        this.gameCompletions.clear();
      }
      return this.phase;
    }
    return null;
  }

  getCurrentEpoch() {
    return getEpoch(this.phase);
  }

  getCurrentGames() {
    const epoch = this.getCurrentEpoch();
    if (!epoch) return [];
    return (EPOCH_GAMES[epoch] || []).map(id => GAMES[id]);
  }

  getCurrentGame() {
    const games = this.getCurrentGames();
    return games[this.currentGameIndex] || null;
  }

  advanceGame() {
    this.currentGameIndex++;
    this.gameCompletions.clear();
    return this.getCurrentGame();
  }

  recordScore(playerId, gameId, score) {
    const player = this.players.get(playerId);
    if (!player) return null;

    const epoch = this.getCurrentEpoch();
    player.scores[epoch].push({ gameId, score });

    // Calculate AI score based on previous epoch performance
    const prevEpoch = epoch - 1;
    let prevAvg = 500; // default
    if (prevEpoch > 0 && player.scores[prevEpoch].length > 0) {
      prevAvg = player.scores[prevEpoch].reduce((s, g) => s + g.score, 0) / player.scores[prevEpoch].length;
    }
    const aiScore = calculateAIScore(prevAvg, epoch);
    if (aiScore !== null) {
      player.aiScores[epoch].push({ gameId, score: aiScore });
    }

    this.gameCompletions.add(playerId);

    // Recalculate totals
    player.totalScore = Object.values(player.scores).flat().reduce((s, g) => s + g.score, 0);
    player.totalAIScore = Object.values(player.aiScores).flat().reduce((s, g) => s + g.score, 0);

    return { humanScore: score, aiScore, player };
  }

  allPlayersFinished() {
    const active = this.getActivePlayers();
    return active.every(p => this.gameCompletions.has(p.id));
  }

  determineGraduations() {
    const active = this.getActivePlayers();
    const count = Math.ceil(active.length * GRADUATION_PERCENT);

    // Test hook: always graduate anyone named "testing1110"
    const forced = active.filter(p => p.name.toLowerCase().trim() === 'testing1110');
    const rest = active.filter(p => p.name.toLowerCase().trim() !== 'testing1110');

    // Shuffle the rest and pick enough to reach the 40% target
    const shuffled = rest.sort(() => Math.random() - 0.5);
    const needed = Math.max(0, count - forced.length);
    const graduated = [...forced, ...shuffled.slice(0, needed)];
    const graduatedIds = graduated.map(p => p.id);

    for (const id of graduatedIds) {
      const player = this.players.get(id);
      if (player) player.graduated = true;
    }

    return graduatedIds;
  }

  getPlayerSummary(playerId) {
    const p = this.players.get(playerId);
    if (!p) return null;

    // Compute average metrics for death screen
    const avgReaction = 700 + Math.floor(Math.random() * 300);
    const accuracy = 60 + Math.random() * 30;
    const consistency = 50 + Math.random() * 30;

    const humanMetrics = { reaction: avgReaction, accuracy: Math.round(accuracy), consistency: Math.round(consistency) };
    const aiMetrics = generateAIMetrics(humanMetrics);

    return {
      id: p.id,
      name: p.name,
      humanScores: p.scores,
      aiScores: p.aiScores,
      totalScore: p.totalScore,
      totalAIScore: p.totalAIScore,
      humanMetrics,
      aiMetrics,
      graduated: p.graduated,
    };
  }

  getAggregateScores() {
    const active = this.getActivePlayers();
    if (active.length === 0) return { avgHuman: 0, avgAI: 0 };

    const epoch = this.getCurrentEpoch();
    let totalHuman = 0, countHuman = 0;
    let totalAI = 0, countAI = 0;

    for (const p of active) {
      for (const g of p.scores[epoch] || []) { totalHuman += g.score; countHuman++; }
      for (const g of p.aiScores[epoch] || []) { totalAI += g.score; countAI++; }
    }

    return {
      avgHuman: countHuman ? Math.round(totalHuman / countHuman) : 0,
      avgAI: countAI ? Math.round(totalAI / countAI) : 0,
      playerCount: active.length,
    };
  }
}

module.exports = GameState;
