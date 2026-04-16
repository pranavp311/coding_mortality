// Game phases — linear progression
const PHASES = {
  LOBBY: 'LOBBY',
  EPOCH_1_INTRO: 'EPOCH_1_INTRO',
  EPOCH_1_GAME: 'EPOCH_1_GAME',
  EPOCH_1_RESULTS: 'EPOCH_1_RESULTS',
  EPOCH_2_INTRO: 'EPOCH_2_INTRO',
  EPOCH_2_GAME: 'EPOCH_2_GAME',
  EPOCH_2_RESULTS: 'EPOCH_2_RESULTS',
  EPOCH_3_INTRO: 'EPOCH_3_INTRO',
  EPOCH_3_GAME: 'EPOCH_3_GAME',
  EPOCH_3_RESULTS: 'EPOCH_3_RESULTS',
  GRADUATION: 'GRADUATION',
  END: 'END',
};

// Ordered phase list for advancing with spacebar
const PHASE_ORDER = [
  PHASES.LOBBY,
  PHASES.EPOCH_1_INTRO,
  PHASES.EPOCH_1_GAME,
  PHASES.EPOCH_1_RESULTS,
  PHASES.EPOCH_2_INTRO,
  PHASES.EPOCH_2_GAME,
  PHASES.EPOCH_2_RESULTS,
  PHASES.EPOCH_3_INTRO,
  PHASES.EPOCH_3_GAME,
  PHASES.EPOCH_3_RESULTS,
  PHASES.GRADUATION,
  PHASES.END,
];

// Which epoch each phase belongs to
function getEpoch(phase) {
  if (phase.startsWith('EPOCH_1')) return 1;
  if (phase.startsWith('EPOCH_2')) return 2;
  if (phase.startsWith('EPOCH_3')) return 3;
  return 0;
}

// Tasks assigned to each epoch
const EPOCH_GAMES = {
  1: ['CLIENT_BRIEFING'],
  2: ['STAKEHOLDER_ALIGNMENT'],
  3: ['ESCALATION_RESPONSE'],
};

const GAMES = {
  CLIENT_BRIEFING: {
    id: 'CLIENT_BRIEFING',
    name: 'Client Briefing',
    description: 'Advise on client situations',
    duration: 90000,
    rounds: 2,
  },
  ESCALATION_RESPONSE: {
    id: 'ESCALATION_RESPONSE',
    name: 'Escalation Response',
    description: 'Handle urgent escalations',
    duration: 90000,
    rounds: 2,
  },
  STAKEHOLDER_ALIGNMENT: {
    id: 'STAKEHOLDER_ALIGNMENT',
    name: 'Stakeholder Alignment',
    description: 'Align cross-functional teams',
    duration: 90000,
    rounds: 2,
  },
  STRATEGY_MEMO: {
    id: 'STRATEGY_MEMO',
    name: 'Strategy Memo',
    description: 'Draft strategic recommendations',
    duration: 90000,
    rounds: 2,
  },
};

// Socket event names
const EVENTS = {
  // Client → Server
  PLAYER_JOIN: 'player:join',
  PLAYER_SCORE: 'player:score',
  PLAYER_GAME_DONE: 'player:gameDone',

  // Server → Client (all)
  PHASE_CHANGE: 'phase:change',
  GAME_START: 'game:start',
  GAME_END: 'game:end',

  // Server → Presenter
  PLAYER_CONNECTED: 'presenter:playerConnected',
  PLAYER_DISCONNECTED: 'presenter:playerDisconnected',
  PLAYER_RECONNECTED: 'presenter:playerReconnected',
  POPULATION_UPDATE: 'presenter:populationUpdate',
  SCORES_UPDATE: 'presenter:scoresUpdate',
  GRADUATE_PLAYER: 'presenter:graduatePlayer',
  GRADUATION_LIST: 'presenter:graduationList',

  // Server → Player
  JOIN_ACK: 'player:joinAck',
  YOUR_SCORES: 'player:yourScores',
  YOU_GRADUATED: 'player:youGraduated',
  YOU_SURVIVED: 'player:youSurvived',

  // Operator
  OPERATOR_ADVANCE: 'operator:advance',
  OPERATOR_GRADUATE: 'operator:graduate',
  OPERATOR_RESET: 'operator:reset',

};

// Graduation percentage
const GRADUATION_PERCENT = 0.40;

if (typeof module !== 'undefined') {
  module.exports = { PHASES, PHASE_ORDER, EPOCH_GAMES, GAMES, EVENTS, GRADUATION_PERCENT, getEpoch };
}
