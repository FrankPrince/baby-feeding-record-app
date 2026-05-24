const babyService = require('./babyService');
const feedingService = require('./feedingService');
const diaperService = require('./diaperService');
const jaundiceService = require('./jaundiceService');
const { calculateAge, formatDate } = require('../utils/date');
const {
  JAUNDICE_REFERENCE_NOTE,
  getMissingJaundiceRiskStatus
} = require('../rules/jaundiceRule');

function normalizeDate(value) {
  return formatDate(value ? new Date(`${value}T00:00:00`) : new Date());
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : String(value.toFixed(1));
}

function getBabySubtitle(profile, now) {
  if (!profile) {
    return '等待档案';
  }

  const nickname = profile.nickname || '宝宝';
  const age = calculateAge({
    birthDate: profile.birthDate,
    birthTime: profile.birthTime,
    now
  });

  if (!age.canCalculate) {
    return nickname;
  }

  return `${nickname} · ${age.dayAge} 天`;
}

function getHoursSince(recordTime, now) {
  const diffMs = new Date(now).getTime() - new Date(recordTime).getTime();

  if (Number.isNaN(diffMs) || diffMs < 0) {
    return null;
  }

  return Math.floor(diffMs / 3600000);
}

function getTimeSinceText(hoursSinceLastRecord) {
  if (hoursSinceLastRecord === null) {
    return '刚刚';
  }

  if (hoursSinceLastRecord < 1) {
    return '1 小时内';
  }

  if (hoursSinceLastRecord < 24) {
    return `${hoursSinceLastRecord} 小时前`;
  }

  return `${Math.floor(hoursSinceLastRecord / 24)} 天前`;
}

function getJaundiceChange(latestRecord, previousRecord) {
  if (!latestRecord || !previousRecord) {
    return {
      changeFromPrevious: null,
      changeDirection: '无对比',
      changeText: '暂无上次记录可对比'
    };
  }

  const changeFromPrevious = roundToOneDecimal(latestRecord.averageMgDl - previousRecord.averageMgDl);

  if (changeFromPrevious > 0) {
    return {
      changeFromPrevious,
      changeDirection: '上升',
      changeText: `较上次上升 ${formatNumber(changeFromPrevious)} mg/dL`
    };
  }

  if (changeFromPrevious < 0) {
    return {
      changeFromPrevious,
      changeDirection: '下降',
      changeText: `较上次下降 ${formatNumber(Math.abs(changeFromPrevious))} mg/dL`
    };
  }

  return {
    changeFromPrevious,
    changeDirection: '持平',
    changeText: '较上次持平'
  };
}

async function getLatestJaundiceOverview(now) {
  const listResult = await jaundiceService.listJaundiceRecords();
  const records = listResult.records;
  const latestRecord = records[0];

  if (!latestRecord) {
    const missingRisk = getMissingJaundiceRiskStatus();
    return {
      hasRecord: false,
      latestRecord: null,
      averageMgDl: null,
      riskLevel: missingRisk.riskLevel,
      riskLabel: missingRisk.riskLabel,
      riskColor: missingRisk.riskColor,
      riskMessage: missingRisk.message,
      emptyText: '暂无黄疸记录',
      hoursSinceLastRecord: null,
      timeSinceLastRecordText: '',
      changeFromPrevious: null,
      changeDirection: '无对比',
      changeText: '暂无上次记录可对比',
      referenceNote: JAUNDICE_REFERENCE_NOTE
    };
  }

  const hoursSinceLastRecord = getHoursSince(latestRecord.recordTime, now);
  const change = getJaundiceChange(latestRecord, records[1]);

  return Object.assign({
    hasRecord: true,
    latestRecord,
    averageMgDl: latestRecord.averageMgDl,
    riskLevel: latestRecord.riskLevel || 'unknown',
    riskLabel: latestRecord.riskLabel || '无法判断',
    riskColor: latestRecord.riskColor || 'gray',
    riskMessage: latestRecord.riskMessage || JAUNDICE_REFERENCE_NOTE,
    emptyText: '',
    hoursSinceLastRecord,
    timeSinceLastRecordText: getTimeSinceText(hoursSinceLastRecord),
    referenceNote: latestRecord.referenceNote || JAUNDICE_REFERENCE_NOTE
  }, change);
}

async function getTodayOverview(options) {
  const date = normalizeDate(options && options.date);
  const now = options && options.now ? options.now : new Date().toISOString();
  const babyResult = await babyService.getBabyProfile({
    now,
    profileOverride: options && options.babyProfile
  });
  const babyProfile = babyResult.profile;
  const feeding = await feedingService.getDailyFeedingSummary({
    date,
    babyProfile,
    now
  });
  const diaper = await diaperService.getDailyDiaperSummary({ date });
  const jaundice = await getLatestJaundiceOverview(now);

  return {
    date,
    baby: {
      profile: babyProfile,
      status: babyResult.status,
      subtitle: getBabySubtitle(babyProfile, now)
    },
    feeding: {
      totalAmountMl: feeding.totalAmountMl,
      totalCount: feeding.totalCount,
      breastAmountMl: feeding.breastAmountMl,
      formulaAmountMl: feeding.formulaAmountMl,
      breastCount: feeding.breastCount,
      formulaCount: feeding.formulaCount,
      milkStatus: feeding.milkStatus
    },
    diaper: {
      peeCount: diaper.peeCount,
      poopCount: diaper.poopCount,
      peeAmountDistribution: diaper.peeAmountDistribution,
      poopAmountDistribution: diaper.poopAmountDistribution,
      attentionColorCount: diaper.attentionColorCount
    },
    jaundice
  };
}

module.exports = {
  getTodayOverview
};
