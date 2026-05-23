const { calculateAge } = require('../utils/date');
const { toNullableNumber } = require('../utils/number');

const MILK_STATUS = {
  LOW: '偏低',
  ADEQUATE: '达标',
  HIGH: '偏高',
  UNKNOWN: '无法判断'
};

const FEEDING_REFERENCE_NOTE = '该结果仅作为家庭记录参考，不替代医生建议。';

// 第一版采用集中配置，后续可按医生建议或更细分月龄区间调整。
const MILK_INTAKE_RANGES = [
  { maxDayAge: 7, minMlPerKg: 60, maxMlPerKg: 120 },
  { maxDayAge: 30, minMlPerKg: 120, maxMlPerKg: 180 },
  { maxDayAge: 180, minMlPerKg: 150, maxMlPerKg: 180 },
  { maxDayAge: Infinity, minMlPerKg: 120, maxMlPerKg: 160 }
];

function getRangeForDayAge(dayAge) {
  return MILK_INTAKE_RANGES.find((range) => dayAge <= range.maxDayAge) || MILK_INTAKE_RANGES[MILK_INTAKE_RANGES.length - 1];
}

function createUnknownMilkStatus(reason) {
  return {
    status: MILK_STATUS.UNKNOWN,
    reason,
    lowerLimitMl: null,
    upperLimitMl: null,
    minMlPerKg: null,
    maxMlPerKg: null,
    referenceNote: FEEDING_REFERENCE_NOTE
  };
}

function evaluateDailyMilkStatus(options) {
  const babyProfile = options && options.babyProfile ? options.babyProfile : {};
  const totalAmountMl = toNullableNumber(options && options.totalAmountMl);
  const currentWeightKg = toNullableNumber(babyProfile.currentWeightKg);

  if (currentWeightKg === null || currentWeightKg <= 0) {
    return createUnknownMilkStatus('missing_current_weight');
  }

  const age = calculateAge({
    birthDate: babyProfile.birthDate,
    birthTime: babyProfile.birthTime,
    now: options && options.now
  });

  if (!age.canCalculate) {
    return createUnknownMilkStatus(age.reason);
  }

  const range = getRangeForDayAge(age.dayAge);
  const lowerLimitMl = Math.round(currentWeightKg * range.minMlPerKg);
  const upperLimitMl = Math.round(currentWeightKg * range.maxMlPerKg);
  let status = MILK_STATUS.ADEQUATE;

  if (totalAmountMl === null) {
    status = MILK_STATUS.UNKNOWN;
  } else if (totalAmountMl < lowerLimitMl) {
    status = MILK_STATUS.LOW;
  } else if (totalAmountMl > upperLimitMl) {
    status = MILK_STATUS.HIGH;
  }

  return {
    status,
    reason: status === MILK_STATUS.UNKNOWN ? 'missing_total_amount' : null,
    lowerLimitMl,
    upperLimitMl,
    minMlPerKg: range.minMlPerKg,
    maxMlPerKg: range.maxMlPerKg,
    referenceNote: FEEDING_REFERENCE_NOTE
  };
}

function getMissingMilkStatus() {
  return createUnknownMilkStatus('missing_current_weight');
}

module.exports = {
  MILK_STATUS,
  MILK_INTAKE_RANGES,
  FEEDING_REFERENCE_NOTE,
  evaluateDailyMilkStatus,
  getMissingMilkStatus
};
