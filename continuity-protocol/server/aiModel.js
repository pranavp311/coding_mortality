// Fake AI model — anchored to player performance with theatrical variance

function calculateAIScore(playerPreviousScore, epoch) {
  if (epoch <= 1 || !playerPreviousScore) return null; // "Calibrating"
  const multiplier = { 2: 0.9, 3: 1.05 }[epoch] || 1;
  const variance = (Math.random() - 0.5) * 100;
  return Math.max(0, Math.round(playerPreviousScore * multiplier + variance));
}

// Generate fake AI metrics for the death screen
function generateAIMetrics(playerMetrics) {
  return {
    reaction: Math.max(100, playerMetrics.reaction - Math.floor(Math.random() * 80 + 20)),
    accuracy: Math.round(Math.min(99, playerMetrics.accuracy + Math.random() * 8 + 2)),
    consistency: Math.round(Math.min(99, 85 + Math.random() * 14)),
  };
}

module.exports = { calculateAIScore, generateAIMetrics };
