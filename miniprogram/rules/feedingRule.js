function getMissingMilkStatus() {
  return {
    status: 'unknown',
    reason: 'missing_current_weight'
  };
}

module.exports = {
  getMissingMilkStatus
};
