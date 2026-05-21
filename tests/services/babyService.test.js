const assert = require('node:assert/strict');
const test = require('node:test');

const { createMockWxStorage } = require('../helpers/mockWxStorage');

test('baby service creates, reads, and edits the single baby profile', async () => {
  global.wx = createMockWxStorage();

  const babyService = require('../../miniprogram/services/babyService');

  const created = await babyService.saveBabyProfile({
    nickname: '小满',
    birthDate: '2026-05-01',
    birthTime: '08:30',
    currentWeightKg: 3.4,
    gestationalWeeks: 39,
    gender: 'female',
    birthWeightKg: 3.1,
    avatarUrl: 'wxfile://avatar-a.png',
    isPremature: false,
    hasJaundiceRiskFactors: true,
    note: '观察吃奶节奏'
  }, { now: '2026-05-21T10:00:00.000Z' });

  assert.equal(created.profile.nickname, '小满');
  assert.equal(created.profile.babyId, 'baby-1');
  assert.equal(created.profile.schemaVersion, 1);
  assert.equal(created.profile.syncStatus, 'local');
  assert.equal(created.profile.deletedAt, null);
  assert.equal(created.profile.avatarUrl, 'wxfile://avatar-a.png');

  const readAfterCreate = await babyService.getBabyProfile({ now: '2026-05-21T10:00:00.000Z' });
  assert.equal(readAfterCreate.profile.nickname, '小满');
  assert.equal(readAfterCreate.status.age.canCalculate, true);
  assert.equal(readAfterCreate.status.feeding.canEstimateMilkStatus, true);
  assert.equal(readAfterCreate.status.jaundice.canAssessRisk, true);

  const edited = await babyService.saveBabyProfile({
    nickname: '安安',
    birthDate: '2026-05-01',
    birthTime: '08:30',
    currentWeightKg: 3.6,
    gestationalWeeks: 39,
    gender: 'female',
    avatarUrl: 'wxfile://avatar-b.png'
  }, { now: '2026-05-22T10:00:00.000Z' });

  assert.equal(edited.profile.babyId, created.profile.babyId);
  assert.equal(edited.profile.createdAt, created.profile.createdAt);
  assert.equal(edited.profile.updatedAt, '2026-05-22T10:00:00.000Z');
  assert.equal(edited.profile.nickname, '安安');
  assert.equal(edited.profile.currentWeightKg, 3.6);
  assert.equal(edited.profile.avatarUrl, 'wxfile://avatar-b.png');
});

test('baby service returns base unable-to-calculate statuses for missing critical fields', async () => {
  global.wx = createMockWxStorage();

  const babyService = require('../../miniprogram/services/babyService');

  const result = await babyService.getBabyProfile({
    profileOverride: {
      babyId: 'baby-1',
      nickname: '小满',
      birthDate: '',
      birthTime: '',
      currentWeightKg: null,
      gestationalWeeks: null
    },
    now: '2026-05-21T10:00:00.000Z'
  });

  assert.equal(result.status.age.canCalculate, false);
  assert.equal(result.status.age.reason, 'missing_birth_datetime');
  assert.equal(result.status.feeding.canEstimateMilkStatus, false);
  assert.equal(result.status.feeding.reason, 'missing_current_weight');
  assert.equal(result.status.jaundice.canAssessRisk, false);
  assert.equal(result.status.jaundice.reason, 'missing_gestational_weeks');
});

test('baby service rejects missing required profile fields', async () => {
  global.wx = createMockWxStorage();

  const babyService = require('../../miniprogram/services/babyService');

  await assert.rejects(
    () => babyService.saveBabyProfile({ nickname: '', birthDate: '', birthTime: '', currentWeightKg: null, gestationalWeeks: null }),
    (error) => {
      assert.equal(error.code, 'BABY_PROFILE_VALIDATION_FAILED');
      assert.deepEqual(error.fields, ['nickname', 'birthDate', 'birthTime', 'currentWeightKg', 'gestationalWeeks']);
      return true;
    }
  );
});
