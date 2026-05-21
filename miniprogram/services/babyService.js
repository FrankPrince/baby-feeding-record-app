const babyRepository = require('../repositories/babyRepository');
const { calculateAge } = require('../utils/date');
const { createBabyProfile, validateBabyProfileInput } = require('../models/baby');

function createValidationError(fields) {
  const error = new Error('Baby profile validation failed');
  error.code = 'BABY_PROFILE_VALIDATION_FAILED';
  error.fields = fields;
  return error;
}

function getBabyProfileStatus(profile, options) {
  const safeProfile = profile || {};
  const age = calculateAge({
    birthDate: safeProfile.birthDate,
    birthTime: safeProfile.birthTime,
    now: options && options.now
  });

  return {
    age,
    feeding: safeProfile.currentWeightKg
      ? { canEstimateMilkStatus: true, reason: null }
      : { canEstimateMilkStatus: false, reason: 'missing_current_weight' },
    jaundice: safeProfile.gestationalWeeks
      ? { canAssessRisk: true, reason: null }
      : { canAssessRisk: false, reason: 'missing_gestational_weeks' }
  };
}

async function getBabyProfile(options) {
  const profile = options && options.profileOverride
    ? options.profileOverride
    : await babyRepository.getBabyProfile();

  return {
    profile,
    status: getBabyProfileStatus(profile, options)
  };
}

async function saveBabyProfile(input, options) {
  const fields = validateBabyProfileInput(input || {});
  if (fields.length > 0) {
    throw createValidationError(fields);
  }

  const existing = await babyRepository.getBabyProfile();
  const profile = createBabyProfile(input, existing, options);
  await babyRepository.saveBabyProfile(profile);

  return {
    profile,
    status: getBabyProfileStatus(profile, options)
  };
}

module.exports = {
  getBabyProfile,
  saveBabyProfile,
  getBabyProfileStatus
};
