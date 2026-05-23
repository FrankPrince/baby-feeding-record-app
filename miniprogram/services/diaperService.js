const diaperRepository = require('../repositories/diaperRepository');
const { createDiaperRecord: createDiaperRecordModel } = require('../models/diaper');
const { evaluateDiaperColor } = require('../rules/diaperRule');
const { formatDate } = require('../utils/date');

const DIAPER_RECORD_TYPES = ['pee', 'poop', 'both'];
const DIAPER_AMOUNTS = ['small', 'medium', 'large'];
const DIAPER_COLORS = ['yellow', 'green', 'brown', 'black', 'red', 'white', 'gray_white', 'other'];
const VALID_TREND_DAYS = [7, 14, 30];

function createValidationError(fields) {
  const error = new Error('Diaper record validation failed');
  error.code = 'DIAPER_RECORD_VALIDATION_FAILED';
  error.fields = fields;
  return error;
}

function requiresPeeAmount(recordType) {
  return recordType === 'pee' || recordType === 'both';
}

function requiresPoopAmount(recordType) {
  return recordType === 'poop' || recordType === 'both';
}

function isValidAmount(value) {
  return DIAPER_AMOUNTS.includes(value);
}

function validateDiaperRecordInput(input) {
  const fields = [];
  const recordType = input && input.recordType;

  if (!DIAPER_RECORD_TYPES.includes(recordType)) {
    fields.push('recordType');
  }

  if (recordType && requiresPeeAmount(recordType) && !isValidAmount(input.peeAmount)) {
    fields.push('peeAmount');
  }

  if (recordType && requiresPoopAmount(recordType) && !isValidAmount(input.poopAmount)) {
    fields.push('poopAmount');
  }

  if (!input || !DIAPER_COLORS.includes(input.color)) {
    fields.push('color');
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

function normalizeRecordInput(input) {
  const recordType = input.recordType;

  return Object.assign({}, input, {
    peeAmount: requiresPeeAmount(recordType) ? input.peeAmount : '',
    poopAmount: requiresPoopAmount(recordType) ? input.poopAmount : ''
  });
}

function decorateRecord(record) {
  return Object.assign({}, record, {
    colorNotice: evaluateDiaperColor(record.color)
  });
}

function createEmptyDistribution() {
  return {
    small: 0,
    medium: 0,
    large: 0
  };
}

function addTimelineItem(record) {
  const colorNotice = evaluateDiaperColor(record.color);

  if (!colorNotice.attentionRequired) {
    return null;
  }

  return {
    recordId: record.id,
    recordTime: record.recordTime,
    color: record.color,
    recordType: record.recordType,
    level: colorNotice.level,
    message: colorNotice.message
  };
}

function summarizeRecords(records, date) {
  const summary = {
    date,
    peeCount: 0,
    poopCount: 0,
    peeAmountDistribution: createEmptyDistribution(),
    poopAmountDistribution: createEmptyDistribution(),
    attentionColorCount: 0,
    attentionColorTimeline: []
  };

  for (const record of sortByRecordTimeAsc(records)) {
    if (requiresPeeAmount(record.recordType)) {
      summary.peeCount += 1;
      if (isValidAmount(record.peeAmount)) {
        summary.peeAmountDistribution[record.peeAmount] += 1;
      }
    }

    if (requiresPoopAmount(record.recordType)) {
      summary.poopCount += 1;
      if (isValidAmount(record.poopAmount)) {
        summary.poopAmountDistribution[record.poopAmount] += 1;
      }
    }

    const timelineItem = addTimelineItem(record);
    if (timelineItem) {
      summary.attentionColorCount += 1;
      summary.attentionColorTimeline.push(timelineItem);
    }
  }

  return summary;
}

async function createDiaperRecord(input, options) {
  const fields = validateDiaperRecordInput(input || {});
  if (fields.length > 0) {
    throw createValidationError(fields);
  }

  const record = createDiaperRecordModel(normalizeRecordInput(input), options);
  await diaperRepository.saveDiaperRecord(record);
  return { record: decorateRecord(record) };
}

async function listDiaperRecords(options) {
  const records = await diaperRepository.listDiaperRecords();
  const filtered = options && options.date
    ? records.filter((record) => isRecordOnDate(record, options.date))
    : records;

  return {
    records: sortByRecordTimeDesc(filtered).map(decorateRecord)
  };
}

async function updateDiaperRecord(recordId, input, options) {
  const fields = validateDiaperRecordInput(input || {});
  if (fields.length > 0) {
    throw createValidationError(fields);
  }

  const records = await diaperRepository.listDiaperRecords({ includeDeleted: true });
  const existing = records.find((record) => record.id === recordId || record.localId === recordId);

  if (!existing || existing.deletedAt) {
    const error = new Error('Diaper record not found');
    error.code = 'DIAPER_RECORD_NOT_FOUND';
    throw error;
  }

  const record = createDiaperRecordModel(Object.assign({}, existing, normalizeRecordInput(input), {
    id: existing.id,
    localId: existing.localId,
    babyId: existing.babyId,
    createdAt: existing.createdAt,
    deletedAt: existing.deletedAt
  }), options);

  await diaperRepository.saveDiaperRecord(record);
  return { record: decorateRecord(record) };
}

async function deleteDiaperRecord(recordId, options) {
  const deletedAt = options && options.now ? options.now : new Date().toISOString();
  const record = await diaperRepository.softDeleteDiaperRecord(recordId, deletedAt);

  if (!record) {
    const error = new Error('Diaper record not found');
    error.code = 'DIAPER_RECORD_NOT_FOUND';
    throw error;
  }

  return { record: decorateRecord(record) };
}

async function getDailyDiaperSummary(options) {
  const date = normalizeDate(options && options.date);
  const records = (await diaperRepository.listDiaperRecords())
    .filter((record) => isRecordOnDate(record, date));

  return summarizeRecords(records, date);
}

async function getDiaperTrend(options) {
  const requestedDays = options && options.days ? Number(options.days) : 7;
  const days = VALID_TREND_DAYS.includes(requestedDays) ? requestedDays : 7;
  const endDate = normalizeDate(options && options.endDate);
  const end = new Date(`${endDate}T00:00:00`);
  const start = addDays(end, 1 - days);
  const allRecords = await diaperRepository.listDiaperRecords();
  const items = [];
  const attentionColorTimeline = [];

  for (let index = 0; index < days; index += 1) {
    const date = formatDate(addDays(start, index));
    const records = allRecords.filter((record) => isRecordOnDate(record, date));
    const summary = summarizeRecords(records, date);

    items.push({
      date,
      peeCount: summary.peeCount,
      poopCount: summary.poopCount,
      peeAmountDistribution: summary.peeAmountDistribution,
      poopAmountDistribution: summary.poopAmountDistribution,
      attentionColorCount: summary.attentionColorCount
    });
    attentionColorTimeline.push(...summary.attentionColorTimeline);
  }

  return {
    days,
    startDate: formatDate(start),
    endDate,
    items,
    attentionColorTimeline
  };
}

module.exports = {
  DIAPER_RECORD_TYPES,
  DIAPER_AMOUNTS,
  DIAPER_COLORS,
  createDiaperRecord,
  listDiaperRecords,
  updateDiaperRecord,
  deleteDiaperRecord,
  getDailyDiaperSummary,
  getDiaperTrend
};
