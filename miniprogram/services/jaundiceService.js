const jaundiceRepository = require('../repositories/jaundiceRepository');
const babyRepository = require('../repositories/babyRepository');
const { createJaundiceRecord: createJaundiceRecordModel } = require('../models/jaundice');
const {
  calculateJaundiceAverage,
  evaluateJaundiceRisk,
  getRiskBands
} = require('../rules/jaundiceRule');
const { formatDate } = require('../utils/date');
const { toNullableNumber } = require('../utils/number');

const MEASUREMENT_METHODS = ['transcutaneous', 'serum', 'unknown'];
const VALID_TREND_RANGES = ['3d', '7d', '14d', '30d', 'all'];

function createValidationError(fields) {
  const error = new Error('Jaundice record validation failed');
  error.code = 'JAUNDICE_RECORD_VALIDATION_FAILED';
  error.fields = fields;
  return error;
}

function validateJaundiceRecordInput(input) {
  const fields = [];

  for (const field of ['value1MgDl', 'value2MgDl', 'value3MgDl']) {
    const value = toNullableNumber(input && input[field]);
    if (value === null || value <= 0) {
      fields.push(field);
    }
  }

  if (input && input.measurementMethod && !MEASUREMENT_METHODS.includes(input.measurementMethod)) {
    fields.push('measurementMethod');
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
  return formatDate(record.recordTime);
}

function isRecordOnDate(record, date) {
  return getDateFromRecord(record) === date;
}

function sortByRecordTimeDesc(records) {
  return records.slice().sort((left, right) => {
    const timeDiff = new Date(right.recordTime).getTime() - new Date(left.recordTime).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

function sortByRecordTimeAsc(records) {
  return records.slice().sort((left, right) => {
    const timeDiff = new Date(left.recordTime).getTime() - new Date(right.recordTime).getTime();
    if (timeDiff !== 0) {
      return timeDiff;
    }
    return new Date(left.updatedAt).getTime() - new Date(right.updatedAt).getTime();
  });
}

async function getBabyProfileOrDefault(profileOverride) {
  if (profileOverride) {
    return profileOverride;
  }
  return babyRepository.getBabyProfile();
}

function createRecordPayload(input, babyProfile, options) {
  const recordTime = input.recordTime || (options && options.now) || new Date().toISOString();
  const averageMgDl = calculateJaundiceAverage(input);
  const measurementMethod = input.measurementMethod || 'unknown';
  const risk = evaluateJaundiceRisk({
    babyProfile,
    averageMgDl,
    measurementMethod,
    now: recordTime
  });

  return {
    payload: Object.assign({}, input, {
      measurementMethod,
      recordTime,
      averageMgDl,
      riskLevel: risk.riskLevel,
      riskLabel: risk.riskLabel,
      riskColor: risk.riskColor,
      riskMessage: risk.message,
      referenceNote: risk.referenceNote,
      thresholdMgDl: risk.thresholdMgDl
    }),
    risk
  };
}

async function createJaundiceRecord(input, options) {
  const fields = validateJaundiceRecordInput(input || {});
  if (fields.length > 0) {
    throw createValidationError(fields);
  }

  const babyProfile = await getBabyProfileOrDefault(options && options.babyProfile);
  const recordData = createRecordPayload(input, babyProfile, options);
  const record = createJaundiceRecordModel(recordData.payload, options);

  await jaundiceRepository.saveJaundiceRecord(record);
  return { record, risk: recordData.risk };
}

async function listJaundiceRecords(options) {
  const records = await jaundiceRepository.listJaundiceRecords();
  const filtered = options && options.date
    ? records.filter((record) => isRecordOnDate(record, options.date))
    : records;

  return {
    records: sortByRecordTimeDesc(filtered)
  };
}

async function updateJaundiceRecord(recordId, input, options) {
  const fields = validateJaundiceRecordInput(input || {});
  if (fields.length > 0) {
    throw createValidationError(fields);
  }

  const records = await jaundiceRepository.listJaundiceRecords({ includeDeleted: true });
  const existing = records.find((record) => record.id === recordId || record.localId === recordId);

  if (!existing || existing.deletedAt) {
    const error = new Error('Jaundice record not found');
    error.code = 'JAUNDICE_RECORD_NOT_FOUND';
    throw error;
  }

  const babyProfile = await getBabyProfileOrDefault(options && options.babyProfile);
  const recordData = createRecordPayload(Object.assign({}, existing, input, {
    id: existing.id,
    localId: existing.localId,
    babyId: existing.babyId,
    createdAt: existing.createdAt,
    deletedAt: existing.deletedAt
  }), babyProfile, options);
  const record = createJaundiceRecordModel(recordData.payload, options);

  await jaundiceRepository.saveJaundiceRecord(record);
  return { record, risk: recordData.risk };
}

async function deleteJaundiceRecord(recordId, options) {
  const deletedAt = options && options.now ? options.now : new Date().toISOString();
  const record = await jaundiceRepository.softDeleteJaundiceRecord(recordId, deletedAt);

  if (!record) {
    const error = new Error('Jaundice record not found');
    error.code = 'JAUNDICE_RECORD_NOT_FOUND';
    throw error;
  }

  return { record };
}

function getRangeStartDate(range, endDate) {
  const daysByRange = {
    '3d': 3,
    '7d': 7,
    '14d': 14,
    '30d': 30
  };
  const days = daysByRange[range];

  if (!days) {
    return null;
  }

  const end = new Date(`${endDate}T00:00:00`);
  return formatDate(addDays(end, 1 - days));
}

function isWithinRange(record, startDate, endDate) {
  const date = getDateFromRecord(record);

  if (startDate && date < startDate) {
    return false;
  }

  if (endDate && date > endDate) {
    return false;
  }

  return true;
}

function createTrendItem(record, previousRecord) {
  return {
    recordId: record.id,
    date: getDateFromRecord(record),
    recordTime: record.recordTime,
    averageMgDl: record.averageMgDl,
    valuesMgDl: [record.value1MgDl, record.value2MgDl, record.value3MgDl],
    measurementMethod: record.measurementMethod,
    riskLevel: record.riskLevel,
    riskLabel: record.riskLabel,
    riskColor: record.riskColor,
    riskMessage: record.riskMessage,
    thresholdMgDl: record.thresholdMgDl,
    changeFromPrevious: previousRecord ? Math.round((record.averageMgDl - previousRecord.averageMgDl) * 10) / 10 : null
  };
}

async function getJaundiceTrend(options) {
  const requestedRange = options && options.range ? options.range : '7d';
  const range = VALID_TREND_RANGES.includes(requestedRange) ? requestedRange : '7d';
  const endDate = range === 'all' ? null : normalizeDate(options && options.endDate);
  const startDate = range === 'all' ? null : getRangeStartDate(range, endDate);
  const records = sortByRecordTimeAsc(await jaundiceRepository.listJaundiceRecords())
    .filter((record) => isWithinRange(record, startDate, endDate));
  const items = records.map((record, index) => createTrendItem(record, index > 0 ? records[index - 1] : null));
  const highestThreshold = records.reduce((current, record) => {
    if (record.thresholdMgDl && record.thresholdMgDl > current) {
      return record.thresholdMgDl;
    }
    return current;
  }, 15);

  return {
    range,
    startDate: range === 'all' && items[0] ? items[0].date : startDate,
    endDate: range === 'all' && items.length > 0 ? items[items.length - 1].date : endDate,
    items,
    riskBands: getRiskBands(highestThreshold)
  };
}

module.exports = {
  MEASUREMENT_METHODS,
  createJaundiceRecord,
  listJaundiceRecords,
  updateJaundiceRecord,
  deleteJaundiceRecord,
  getJaundiceTrend
};
