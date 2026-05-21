const assert = require('node:assert/strict');
const test = require('node:test');

const dateUtils = require('../../miniprogram/utils/date');

test('combineBirthDateTime creates a stable local-style timestamp string', () => {
  assert.equal(dateUtils.combineBirthDateTime('2026-05-01', '08:30'), '2026-05-01T08:30:00');
});

test('calculateAge returns day age and hours after birth', () => {
  const age = dateUtils.calculateAge({
    birthDate: '2026-05-01',
    birthTime: '08:30',
    now: '2026-05-03T10:15:00'
  });

  assert.equal(age.canCalculate, true);
  assert.equal(age.dayAge, 3);
  assert.equal(age.hoursAfterBirth, 49);
});

test('calculateAge returns missing status when birth date or time is absent', () => {
  assert.deepEqual(
    dateUtils.calculateAge({ birthDate: '', birthTime: '08:30', now: '2026-05-03T10:15:00' }),
    {
      canCalculate: false,
      reason: 'missing_birth_datetime',
      dayAge: null,
      hoursAfterBirth: null
    }
  );
});
