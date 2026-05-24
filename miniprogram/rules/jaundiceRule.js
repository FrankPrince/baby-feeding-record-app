const { calculateAge } = require('../utils/date');
const { toNullableNumber } = require('../utils/number');

const JAUNDICE_RISK = {
  NORMAL: 'normal',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  UNKNOWN: 'unknown',
  NOT_APPLICABLE: 'not_applicable'
};

const JAUNDICE_REFERENCE_NOTE = '本结果仅用于家庭记录和观察，不能替代医生判断。';
const JAUNDICE_HIGH_RISK_MESSAGE = '当前黄疸值较高，建议尽快咨询医生。';

const RISK_META = {
  normal: { riskLabel: '正常', riskColor: 'green' },
  low: { riskLabel: '低危', riskColor: 'yellow' },
  medium: { riskLabel: '中危', riskColor: 'orange' },
  high: { riskLabel: '高危', riskColor: 'red' },
  unknown: { riskLabel: '无法判断', riskColor: 'gray' },
  not_applicable: { riskLabel: '不适用', riskColor: 'gray' }
};

// 第一版阈值集中配置。PRD 未指定精确医学表，此处只作为家庭观察分级参考。
const JAUNDICE_THRESHOLD_TABLE = [
  { maxHoursAfterBirth: 23, thresholdMgDl: 12 },
  { maxHoursAfterBirth: 71, thresholdMgDl: 15 },
  { maxHoursAfterBirth: 95, thresholdMgDl: 17 },
  { maxHoursAfterBirth: Infinity, thresholdMgDl: 18 }
];

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function isPositiveNumber(value) {
  const numberValue = toNullableNumber(value);
  return numberValue !== null && numberValue > 0;
}

function calculateJaundiceAverage(input) {
  const values = [
    input && input.value1MgDl,
    input && input.value2MgDl,
    input && input.value3MgDl
  ];

  if (!values.every(isPositiveNumber)) {
    return null;
  }

  const total = values.reduce((sum, value) => sum + toNullableNumber(value), 0);
  return roundToOneDecimal(total / values.length);
}

function createRiskResult(riskLevel, extra) {
  const meta = RISK_META[riskLevel] || RISK_META.unknown;
  const message = riskLevel === JAUNDICE_RISK.HIGH
    ? JAUNDICE_HIGH_RISK_MESSAGE
    : JAUNDICE_REFERENCE_NOTE;

  return Object.assign({
    riskLevel,
    riskLabel: meta.riskLabel,
    riskColor: meta.riskColor,
    reason: null,
    message,
    referenceNote: JAUNDICE_REFERENCE_NOTE,
    thresholdMgDl: null,
    lowStartMgDl: null,
    mediumStartMgDl: null
  }, extra || {});
}

function createUnknownRiskStatus(reason) {
  return createRiskResult(JAUNDICE_RISK.UNKNOWN, { reason });
}

function getBaseThreshold(hoursAfterBirth) {
  const match = JAUNDICE_THRESHOLD_TABLE.find((item) => hoursAfterBirth <= item.maxHoursAfterBirth);
  return match ? match.thresholdMgDl : JAUNDICE_THRESHOLD_TABLE[JAUNDICE_THRESHOLD_TABLE.length - 1].thresholdMgDl;
}

function toLocalDateTimeString(value) {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/([+-]\d{2}:\d{2}|Z)$/, '');
}

function getAdjustedThreshold(options) {
  const babyProfile = options.babyProfile || {};
  const gestationalWeeks = toNullableNumber(babyProfile.gestationalWeeks);
  const baseThreshold = getBaseThreshold(options.hoursAfterBirth);
  const gestationalAdjustment = gestationalWeeks < 38 ? -2 : 0;
  const riskFactorAdjustment = babyProfile.hasJaundiceRiskFactors ? -2 : 0;
  const methodAdjustment = options.measurementMethod === 'unknown' ? -0.5 : 0;

  return roundToOneDecimal(Math.max(6, baseThreshold + gestationalAdjustment + riskFactorAdjustment + methodAdjustment));
}

function getRiskBands(thresholdMgDl) {
  const highStartMgDl = roundToOneDecimal(thresholdMgDl);
  const mediumStartMgDl = roundToOneDecimal(thresholdMgDl - 1.5);
  const lowStartMgDl = roundToOneDecimal(thresholdMgDl - 3);

  return [
    { riskLevel: JAUNDICE_RISK.NORMAL, riskLabel: RISK_META.normal.riskLabel, riskColor: RISK_META.normal.riskColor, fromMgDl: 0, toMgDl: lowStartMgDl },
    { riskLevel: JAUNDICE_RISK.LOW, riskLabel: RISK_META.low.riskLabel, riskColor: RISK_META.low.riskColor, fromMgDl: lowStartMgDl, toMgDl: mediumStartMgDl },
    { riskLevel: JAUNDICE_RISK.MEDIUM, riskLabel: RISK_META.medium.riskLabel, riskColor: RISK_META.medium.riskColor, fromMgDl: mediumStartMgDl, toMgDl: highStartMgDl },
    { riskLevel: JAUNDICE_RISK.HIGH, riskLabel: RISK_META.high.riskLabel, riskColor: RISK_META.high.riskColor, fromMgDl: highStartMgDl, toMgDl: null }
  ];
}

function evaluateJaundiceRisk(options) {
  const babyProfile = options && options.babyProfile ? options.babyProfile : {};
  const averageMgDl = toNullableNumber(options && options.averageMgDl);
  const gestationalWeeks = toNullableNumber(babyProfile.gestationalWeeks);

  if (averageMgDl === null || averageMgDl <= 0) {
    return createUnknownRiskStatus('missing_jaundice_value');
  }

  if (gestationalWeeks === null) {
    return createUnknownRiskStatus('missing_gestational_weeks');
  }

  if (gestationalWeeks < 35) {
    return createRiskResult(JAUNDICE_RISK.NOT_APPLICABLE, {
      reason: 'gestational_weeks_under_35',
      message: '建议由医生结合宝宝情况判断。'
    });
  }

  const age = calculateAge({
    birthDate: babyProfile.birthDate,
    birthTime: babyProfile.birthTime,
    now: toLocalDateTimeString(options && options.now)
  });

  if (!age.canCalculate) {
    return createUnknownRiskStatus(age.reason);
  }

  const measurementMethod = options && options.measurementMethod ? options.measurementMethod : 'unknown';
  const thresholdMgDl = getAdjustedThreshold({
    babyProfile,
    hoursAfterBirth: age.hoursAfterBirth,
    measurementMethod
  });
  const mediumStartMgDl = roundToOneDecimal(thresholdMgDl - 1.5);
  const lowStartMgDl = roundToOneDecimal(thresholdMgDl - 3);
  let riskLevel = JAUNDICE_RISK.NORMAL;

  if (averageMgDl >= thresholdMgDl) {
    riskLevel = JAUNDICE_RISK.HIGH;
  } else if (averageMgDl >= mediumStartMgDl) {
    riskLevel = JAUNDICE_RISK.MEDIUM;
  } else if (averageMgDl >= lowStartMgDl) {
    riskLevel = JAUNDICE_RISK.LOW;
  }

  return createRiskResult(riskLevel, {
    thresholdMgDl,
    lowStartMgDl,
    mediumStartMgDl,
    hoursAfterBirth: age.hoursAfterBirth,
    measurementMethod
  });
}

function getMissingJaundiceRiskStatus() {
  return createUnknownRiskStatus('missing_required_profile_fields');
}

module.exports = {
  JAUNDICE_RISK,
  JAUNDICE_REFERENCE_NOTE,
  JAUNDICE_HIGH_RISK_MESSAGE,
  JAUNDICE_THRESHOLD_TABLE,
  calculateJaundiceAverage,
  evaluateJaundiceRisk,
  getRiskBands,
  getMissingJaundiceRiskStatus
};
