const assert = require('node:assert/strict');
const test = require('node:test');

const feedingRule = require('../../miniprogram/rules/feedingRule');

const profile = {
  birthDate: '2026-05-01',
  birthTime: '08:00',
  currentWeightKg: 3.5
};

test('feeding rule calculates low, adequate, and high milk statuses from configured ranges', () => {
  const baseOptions = {
    babyProfile: profile,
    now: '2026-05-21T20:00:00+08:00'
  };

  const low = feedingRule.evaluateDailyMilkStatus(Object.assign({}, baseOptions, { totalAmountMl: 300 }));
  assert.equal(low.status, '偏低');
  assert.equal(low.lowerLimitMl, 420);
  assert.equal(low.upperLimitMl, 630);
  assert.equal(low.referenceNote, '该结果仅作为家庭记录参考，不替代医生建议。');

  const adequate = feedingRule.evaluateDailyMilkStatus(Object.assign({}, baseOptions, { totalAmountMl: 500 }));
  assert.equal(adequate.status, '达标');
  assert.equal(adequate.lowerLimitMl, 420);
  assert.equal(adequate.upperLimitMl, 630);

  const high = feedingRule.evaluateDailyMilkStatus(Object.assign({}, baseOptions, { totalAmountMl: 700 }));
  assert.equal(high.status, '偏高');
});

test('feeding rule returns unable status when weight or birth date information is missing', () => {
  const missingWeight = feedingRule.evaluateDailyMilkStatus({
    babyProfile: Object.assign({}, profile, { currentWeightKg: null }),
    totalAmountMl: 500,
    now: '2026-05-21T20:00:00+08:00'
  });

  assert.equal(missingWeight.status, '无法判断');
  assert.equal(missingWeight.reason, 'missing_current_weight');
  assert.equal(missingWeight.lowerLimitMl, null);
  assert.equal(missingWeight.upperLimitMl, null);

  const missingBirth = feedingRule.evaluateDailyMilkStatus({
    babyProfile: Object.assign({}, profile, { birthDate: '', birthTime: '' }),
    totalAmountMl: 500,
    now: '2026-05-21T20:00:00+08:00'
  });

  assert.equal(missingBirth.status, '无法判断');
  assert.equal(missingBirth.reason, 'missing_birth_datetime');
});
