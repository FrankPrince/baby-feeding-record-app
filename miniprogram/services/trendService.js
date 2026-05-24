const feedingService = require('./feedingService');
const diaperService = require('./diaperService');
const jaundiceService = require('./jaundiceService');

const TREND_TYPES = ['feeding', 'diaper', 'jaundice'];
const DAY_RANGE_OPTIONS = [
  { value: 7, label: '7 天' },
  { value: 14, label: '14 天' },
  { value: 30, label: '30 天' }
];
const TYPE_OPTIONS = [
  { value: 'feeding', label: '喂养' },
  { value: 'diaper', label: '大小便' },
  { value: 'jaundice', label: '黄疸' }
];

function getFeedingTrend(options) {
  return feedingService.getFeedingTrend(options);
}

function getDiaperTrend(options) {
  return diaperService.getDiaperTrend(options);
}

function getJaundiceTrend(options) {
  return jaundiceService.getJaundiceTrend(options);
}

function normalizeType(type) {
  return TREND_TYPES.includes(type) ? type : 'feeding';
}

function normalizeDays(value) {
  const days = Number(value);
  return DAY_RANGE_OPTIONS.some((item) => item.value === days) ? days : 7;
}

async function getTrendDashboard(options) {
  const activeType = normalizeType(options && options.type);
  const endDate = options && options.endDate;
  const now = options && options.now;
  const babyProfile = options && options.babyProfile;
  let trend;
  let rangeOptions = DAY_RANGE_OPTIONS;

  if (activeType === 'feeding') {
    trend = await getFeedingTrend({
      days: options && options.feedingDays,
      endDate,
      now,
      babyProfile
    });
  } else if (activeType === 'diaper') {
    trend = await getDiaperTrend({
      days: options && options.diaperDays,
      endDate
    });
  } else {
    const jaundiceDays = normalizeDays(options && options.jaundiceDays);
    trend = await getJaundiceTrend({
      range: `${jaundiceDays}d`,
      endDate
    });
  }

  return {
    activeType,
    typeOptions: TYPE_OPTIONS,
    rangeOptions,
    trend
  };
}

module.exports = {
  TYPE_OPTIONS,
  DAY_RANGE_OPTIONS,
  getFeedingTrend,
  getDiaperTrend,
  getJaundiceTrend,
  getTrendDashboard
};
