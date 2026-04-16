// Scoring functions — all normalized to 0-1000

function scorePatternPulse(accuracy, timeMs, sequenceLength) {
  const accuracyScore = accuracy * 600;
  const speedBonus = Math.max(0, 400 - (timeMs / sequenceLength / 10));
  return Math.round(Math.min(1000, accuracyScore + speedBonus));
}

function scoreReflexGate(correctTaps, wrongTaps, avgReactionMs) {
  const tapScore = Math.max(0, correctTaps * 10 - wrongTaps * 25);
  const speedBonus = Math.max(0, 400 - avgReactionMs / 2);
  return Math.round(Math.min(1000, tapScore + speedBonus));
}

function scoreSentimentScan(agreements, total, avgTimeMs) {
  const consensusScore = (agreements / Math.max(1, total)) * 700;
  const speedBonus = Math.max(0, 300 - avgTimeMs / 20);
  return Math.round(Math.min(1000, consensusScore + speedBonus));
}

function scoreCompleteThought(avgWordCount, avgTimeMs) {
  const wordScore = Math.min(500, avgWordCount * 70);
  const speedBonus = Math.max(0, 500 - avgTimeMs / 20);
  return Math.round(Math.min(1000, wordScore + speedBonus));
}

module.exports = { scorePatternPulse, scoreReflexGate, scoreSentimentScan, scoreCompleteThought };
