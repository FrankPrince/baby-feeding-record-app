const assert = require('node:assert/strict');
const test = require('node:test');

const jaundiceRule = require('../../miniprogram/rules/jaundiceRule');

const profile = {
  birthDate: '2026-05-20',
  birthTime: '08:00',
  gestationalWeeks: 39,
  hasJaundiceRiskFactors: false
};

test('jaundice rule calculates one-decimal average only when all values are present and positive', () => {
  assert.equal(jaundiceRule.calculateJaundiceAverage({
    value1MgDl: 8.1,
    value2MgDl: 8.6,
    value3MgDl: 9.0
  }), 8.6);

  assert.equal(jaundiceRule.calculateJaundiceAverage({
    value1MgDl: 8.1,
    value2MgDl: '',
    value3MgDl: 9.0
  }), null);

  assert.equal(jaundiceRule.calculateJaundiceAverage({
    value1MgDl: 8.1,
    value2MgDl: 0,
    value3MgDl: 9.0
  }), null);
});

test('jaundice rule returns not-applicable and unknown statuses for unsupported or incomplete inputs', () => {
  const notApplicable = jaundiceRule.evaluateJaundiceRisk({
    babyProfile: Object.assign({}, profile, { gestationalWeeks: 34.9 }),
    averageMgDl: 8.6,
    measurementMethod: 'transcutaneous',
    now: '2026-05-22T08:00:00+08:00'
  });

  assert.equal(notApplicable.riskLevel, 'not_applicable');
  assert.equal(notApplicable.riskLabel, '不适用');
  assert.equal(notApplicable.reason, 'gestational_weeks_under_35');
  assert.equal(notApplicable.message, '建议由医生结合宝宝情况判断。');

  const unknown = jaundiceRule.evaluateJaundiceRisk({
    babyProfile: Object.assign({}, profile, { birthTime: '' }),
    averageMgDl: 8.6,
    measurementMethod: 'transcutaneous',
    now: '2026-05-22T08:00:00+08:00'
  });

  assert.equal(unknown.riskLevel, 'unknown');
  assert.equal(unknown.riskLabel, '无法判断');
  assert.equal(unknown.reason, 'missing_birth_datetime');
  assert.equal(unknown.message, '本结果仅用于家庭记录和观察，不能替代医生判断。');
});

test('jaundice rule classifies normal, low, medium, and high levels from the configured threshold table', () => {
  const baseOptions = {
    babyProfile: profile,
    measurementMethod: 'serum',
    now: '2026-05-22T08:00:00+08:00'
  };

  const normal = jaundiceRule.evaluateJaundiceRisk(Object.assign({}, baseOptions, { averageMgDl: 11.9 }));
  assert.equal(normal.riskLevel, 'normal');
  assert.equal(normal.riskLabel, '正常');
  assert.equal(normal.riskColor, 'green');
  assert.equal(normal.thresholdMgDl, 15);

  const low = jaundiceRule.evaluateJaundiceRisk(Object.assign({}, baseOptions, { averageMgDl: 12.0 }));
  assert.equal(low.riskLevel, 'low');
  assert.equal(low.riskLabel, '低危');

  const medium = jaundiceRule.evaluateJaundiceRisk(Object.assign({}, baseOptions, { averageMgDl: 13.5 }));
  assert.equal(medium.riskLevel, 'medium');
  assert.equal(medium.riskLabel, '中危');

  const high = jaundiceRule.evaluateJaundiceRisk(Object.assign({}, baseOptions, { averageMgDl: 15.0 }));
  assert.equal(high.riskLevel, 'high');
  assert.equal(high.riskLabel, '高危');
  assert.equal(high.riskColor, 'red');
  assert.equal(high.message, '当前黄疸值较高，建议尽快咨询医生。');
});
