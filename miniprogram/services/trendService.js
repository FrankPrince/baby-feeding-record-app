const feedingService = require('./feedingService');
const diaperService = require('./diaperService');

function getFeedingTrend(options) {
  return feedingService.getFeedingTrend(options);
}

function getDiaperTrend(options) {
  return diaperService.getDiaperTrend(options);
}

module.exports = {
  getFeedingTrend,
  getDiaperTrend
};
