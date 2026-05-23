const feedingRepository = require('../repositories/feedingRepository');
const babyRepository = require('../repositories/babyRepository');
const { createFeedingRecord: createFeedingRecordModel } = require('../models/feeding');
const { evaluateDailyMilkStatus } = require('../rules/feedingRule');
const { formatDate } = require('../utils/date');
const { toNullableNumber } = require('../utils/number');

const FEEDING_TYPES = ['breast', 'formula'];
const VALID_TREND_DAYS = [7, 14, 30];

function createValidationError(fields) {
  const error = new Error('Feeding record validation failed');
  error.code = 'FEEDING_RECORD_VALIDATION_FAILED';
  error.fields = fields;
  return error;
}

function validateFeedingRecordInput(input) {
  const fields = [];
  const amountMl = toNullableNumber(input && input.amountMl);

  if (!input || !FEEDING_TYPES.includes(input.feedingType)) {
    fields.push('feedingType');
  }

  if (amountMl === null || amountMl <= 0) {
    fields.push('amountMl');
  }

  return fields;
}

function normalizeDate(value) {
  return formatDate(value ? new Date(`${value}T00:00:00`) : new Date());
}

function addDays(date, offset) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + offset);
  return next;
}

function getDateFromRecord(record) {
  return formatDate(record.feedingTime);
}

function isRecordOnDate(record, date) {
  return getDateFromRecord(record) === date;
}

function sortByFeedingTimeDesc(records) {
  return records.slice().sort((left, right) => {
    const timeDiff = new Date(right.feedingTime).getTime() - new Date(left.feedingTime).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function summarizeRecords(records, date, babyProfile, now) {
  const summary = records.reduce((result, record) => {
    result.totalAmountMl += record.amountMl;
    result.totalCount += 1;

    if (record.feedingType === 'breast') {
      result.breastAmountMl += record.amountMl;
      result.breastCount += 1;
    }

    if (record.feedingType === 'formula') {
      result.formulaAmountMl += record.amountMl;
      result.formulaCount += 1;
    }

    return result;
  }, {
    date,
    totalAmountMl: 0,
    totalCount: 0,
    breastAmountMl: 0,
    formulaAmountMl: 0,
    breastCount: 0,
    formulaCount: 0
  });

  summary.milkStatus = evaluateDailyMilkStatus({
    babyProfile,
    totalAmountMl: summary.totalAmountMl,
    now: now || `${date}T23:59:59`
  });

  return summary;
}

function ratio(part, total) {
  if (!total) {
    return 0;
  }
  return Math.round((part / total) * 100) / 100;
}

async function getBabyProfileOrDefault(profileOverride) {
  if (profileOverride) {
    return profileOverride;
  }
  return babyRepository.getBabyProfile();
}

async function createFeedingRecord(input, options) {
  const fields = validateFeedingRecordInput(input || {});
  if (fields.length > 0) {
    throw createValidationError(fields);
  }

  const record = createFeedingRecordModel(input, options);
  await feedingRepository.saveFeedingRecord(record);
  return { record };
}

async function listFeedingRecords(options) {
  const records = await feedingRepository.listFeedingRecords();
  const filtered = options && options.date
    ? records.filter((record) => isRecordOnDate(record, options.date))
    : records;

  return {
    records: sortByFeedingTimeDesc(filtered)
  };
}

async function updateFeedingRecord(recordId, input, options) {
  const fields = validateFeedingRecordInput(input || {});
  if (fields.length > 0) {
    throw createValidationError(fields);
  }

  const records = await feedingRepository.listFeedingRecords({ includeDeleted: true });
  const existing = records.find((record) => record.id === recordId || record.localId === recordId);

  if (!existing || existing.deletedAt) {
    const error = new Error('Feeding record not found');
    error.code = 'FEEDING_RECORD_NOT_FOUND';
    throw error;
  }

  const record = createFeedingRecordModel(Object.assign({}, existing, input, {
    id: existing.id,
    localId: existing.localId,
    babyId: existing.babyId,
    createdAt: existing.createdAt,
    deletedAt: existing.deletedAt
  }), options);

  await feedingRepository.saveFeedingRecord(record);
  return { record };
}

async function deleteFeedingRecord(recordId, options) {
  const deletedAt = options && options.now ? options.now : new Date().toISOString();
  const record = await feedingRepository.softDeleteFeedingRecord(recordId, deletedAt);

  if (!record) {
    const error = new Error('Feeding record not found');
    error.code = 'FEEDING_RECORD_NOT_FOUND';
    throw error;
  }

  return { record };
}

async function getDailyFeedingSummary(options) {
  const date = normalizeDate(options && options.date);
  const babyProfile = await getBabyProfileOrDefault(options && options.babyProfile);
  const records = (await feedingRepository.listFeedingRecords())
    .filter((record) => isRecordOnDate(record, date));

  return summarizeRecords(records, date, babyProfile, options && options.now);
}

async function getFeedingTrend(options) {
  const requestedDays = options && options.days ? Number(options.days) : 7;
  const days = VALID_TREND_DAYS.includes(requestedDays) ? requestedDays : 7;
  const endDate = normalizeDate(options && options.endDate);
  const end = new Date(`${endDate}T00:00:00`);
  const start = addDays(end, 1 - days);
  const babyProfile = await getBabyProfileOrDefault(options && options.babyProfile);
  const allRecords = await feedingRepository.listFeedingRecords();
  const items = [];

  for (let index = 0; index < days; index += 1) {
    const date = formatDate(addDays(start, index));
    const records = allRecords.filter((record) => isRecordOnDate(record, date));
    const summary = summarizeRecords(records, date, babyProfile, options && options.now);

    items.push({
      date,
      totalAmountMl: summary.totalAmountMl,
      totalCount: summary.totalCount,
      breastAmountMl: summary.breastAmountMl,
      formulaAmountMl: summary.formulaAmountMl,
      breastCount: summary.breastCount,
      formulaCount: summary.formulaCount,
      breastRatio: ratio(summary.breastAmountMl, summary.totalAmountMl),
      formulaRatio: ratio(summary.formulaAmountMl, summary.totalAmountMl),
      milkStatus: summary.milkStatus.status,
      lowerLimitMl: summary.milkStatus.lowerLimitMl,
      upperLimitMl: summary.milkStatus.upperLimitMl,
      referenceNote: summary.milkStatus.referenceNote
    });
  }

  return {
    days,
    startDate: formatDate(start),
    endDate,
    items
  };
}

module.exports = {
  FEEDING_TYPES,
  createFeedingRecord,
  listFeedingRecords,
  updateFeedingRecord,
  deleteFeedingRecord,
  getDailyFeedingSummary,
  getFeedingTrend
};
