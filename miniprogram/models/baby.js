const { SCHEMA_VERSION, SYNC_STATUS_LOCAL } = require('./common');
const { toNullableNumber } = require('../utils/number');

function normalizeBoolean(value) {
  return value === true;
}

function createBabyProfile(input, existingProfile, options) {
  const now = options && options.now ? options.now : new Date().toISOString();
  const existing = existingProfile || {};

  return {
    id: existing.id || 'baby-1',
    localId: existing.localId || 'baby-1',
    babyId: existing.babyId || 'baby-1',
    nickname: input.nickname || '',
    avatarUrl: input.avatarUrl || '',
    birthDate: input.birthDate || '',
    birthTime: input.birthTime || '',
    gender: input.gender || '',
    currentWeightKg: toNullableNumber(input.currentWeightKg),
    birthWeightKg: toNullableNumber(input.birthWeightKg),
    gestationalWeeks: toNullableNumber(input.gestationalWeeks),
    isPremature: normalizeBoolean(input.isPremature),
    hasJaundiceRiskFactors: normalizeBoolean(input.hasJaundiceRiskFactors),
    note: input.note || '',
    createdAt: existing.createdAt || now,
    updatedAt: now,
    deletedAt: existing.deletedAt || null,
    syncStatus: existing.syncStatus || SYNC_STATUS_LOCAL,
    createdBy: existing.createdBy || 'local_user',
    schemaVersion: existing.schemaVersion || SCHEMA_VERSION
  };
}

function validateBabyProfileInput(input) {
  const fields = [];

  if (!input.nickname) fields.push('nickname');
  if (!input.birthDate) fields.push('birthDate');
  if (!input.birthTime) fields.push('birthTime');
  if (toNullableNumber(input.currentWeightKg) === null) fields.push('currentWeightKg');
  if (toNullableNumber(input.gestationalWeeks) === null) fields.push('gestationalWeeks');

  return fields;
}

module.exports = {
  createBabyProfile,
  validateBabyProfileInput
};
