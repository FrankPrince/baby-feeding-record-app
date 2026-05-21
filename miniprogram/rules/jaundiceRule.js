function getMissingJaundiceRiskStatus() {
  return {
    riskLevel: 'unknown',
    reason: 'missing_required_profile_fields'
  };
}

module.exports = {
  getMissingJaundiceRiskStatus
};
