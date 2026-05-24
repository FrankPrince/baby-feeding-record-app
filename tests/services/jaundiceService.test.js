const assert = require('node:assert/strict');
const test = require('node:test');

const { createMockWxStorage } = require('../helpers/mockWxStorage');

const babyProfile = {
  nickname: '宝宝',
  birthDate: '2026-05-20',
  birthTime: '08:00',
  currentWeightKg: 3.5,
  gestationalWeeks: 39,
  hasJaundiceRiskFactors: false
};

test('jaundice service creates records with validation, lists by date, edits, and soft deletes', async () => {
  global.wx = createMockWxStorage();

  const babyService = require('../../miniprogram/services/babyService');
  const jaundiceService = require('../../miniprogram/services/jaundiceService');

  await babyService.saveBabyProfile(babyProfile, { now: '2026-05-21T07:00:00+08:00' });

  await assert.rejects(
    () => jaundiceService.createJaundiceRecord({
      value1MgDl: 8.1,
      value2MgDl: '',
      value3MgDl: 9.0,
      measurementMethod: 'transcutaneous'
    }, { now: '2026-05-21T08:00:00+08:00' }),
    (error) => {
      assert.equal(error.code, 'JAUNDICE_RECORD_VALIDATION_FAILED');
      assert.deepEqual(error.fields, ['value2MgDl']);
      return true;
    }
  );

  await assert.rejects(
    () => jaundiceService.createJaundiceRecord({
      value1MgDl: 'abc',
      value2MgDl: 8.6,
      value3MgDl: 9.0,
      measurementMethod: 'transcutaneous'
    }, { now: '2026-05-21T08:00:00+08:00' }),
    (error) => {
      assert.equal(error.code, 'JAUNDICE_RECORD_VALIDATION_FAILED');
      assert.deepEqual(error.fields, ['value1MgDl']);
      return true;
    }
  );

  const first = await jaundiceService.createJaundiceRecord({
    value1MgDl: 8.1,
    value2MgDl: 8.6,
    value3MgDl: 9.0,
    measurementMethod: 'transcutaneous',
    note: '早上测量'
  }, { now: '2026-05-21T08:00:00+08:00' });

  const second = await jaundiceService.createJaundiceRecord({
    value1MgDl: 12.5,
    value2MgDl: 13.0,
    value3MgDl: 13.1,
    measurementMethod: 'serum',
    recordTime: '2026-05-21T18:00:00+08:00',
    note: '晚上测量'
  }, { now: '2026-05-21T18:05:00+08:00' });

  await jaundiceService.createJaundiceRecord({
    value1MgDl: 7.1,
    value2MgDl: 7.2,
    value3MgDl: 7.3,
    measurementMethod: 'unknown',
    recordTime: '2026-05-20T18:00:00+08:00'
  }, { now: '2026-05-20T18:00:00+08:00' });

  assert.equal(first.record.recordTime, '2026-05-21T08:00:00+08:00');
  assert.equal(first.record.averageMgDl, 8.6);
  assert.equal(first.record.riskLevel, 'normal');
  assert.equal(first.risk.riskLabel, '正常');

  const today = await jaundiceService.listJaundiceRecords({ date: '2026-05-21' });
  assert.deepEqual(today.records.map((record) => record.id), [second.record.id, first.record.id]);
  assert.deepEqual(today.records.map((record) => record.note), ['晚上测量', '早上测量']);

  const edited = await jaundiceService.updateJaundiceRecord(first.record.id, {
    value1MgDl: 15.0,
    value2MgDl: 15.1,
    value3MgDl: 15.2,
    measurementMethod: 'serum',
    recordTime: '2026-05-21T19:00:00+08:00',
    note: '复测'
  }, { now: '2026-05-21T19:05:00+08:00' });

  assert.equal(edited.record.createdAt, first.record.createdAt);
  assert.equal(edited.record.updatedAt, '2026-05-21T19:05:00+08:00');
  assert.equal(edited.record.averageMgDl, 15.1);
  assert.equal(edited.record.riskLevel, 'high');
  assert.equal(edited.risk.message, '当前黄疸值较高，建议尽快咨询医生。');

  await jaundiceService.deleteJaundiceRecord(second.record.id, { now: '2026-05-21T20:00:00+08:00' });

  const afterDelete = await jaundiceService.listJaundiceRecords({ date: '2026-05-21' });
  assert.deepEqual(afterDelete.records.map((record) => record.id), [first.record.id]);
});

test('jaundice service returns trend data for 3, 7, 14, and all ranges with changes and risk colors', async () => {
  global.wx = createMockWxStorage();

  const babyService = require('../../miniprogram/services/babyService');
  const jaundiceService = require('../../miniprogram/services/jaundiceService');

  await babyService.saveBabyProfile(babyProfile, { now: '2026-05-21T07:00:00+08:00' });

  const seedRecords = [
    ['2026-05-18T08:00:00+08:00', 7, 7.2, 7.4],
    ['2026-05-19T08:00:00+08:00', 8, 8.2, 8.4],
    ['2026-05-20T08:00:00+08:00', 10, 10.2, 10.4],
    ['2026-05-21T08:00:00+08:00', 12, 12.2, 12.4]
  ];

  for (const [recordTime, value1MgDl, value2MgDl, value3MgDl] of seedRecords) {
    await jaundiceService.createJaundiceRecord({
      value1MgDl,
      value2MgDl,
      value3MgDl,
      measurementMethod: 'transcutaneous',
      recordTime
    }, { now: recordTime });
  }

  const threeDayTrend = await jaundiceService.getJaundiceTrend({
    range: '3d',
    endDate: '2026-05-21'
  });

  assert.equal(threeDayTrend.range, '3d');
  assert.deepEqual(threeDayTrend.items.map((item) => item.date), [
    '2026-05-19',
    '2026-05-20',
    '2026-05-21'
  ]);
  assert.deepEqual(threeDayTrend.items.map((item) => item.averageMgDl), [8.2, 10.2, 12.2]);
  assert.deepEqual(threeDayTrend.items.map((item) => item.changeFromPrevious), [null, 2, 2]);
  assert.deepEqual(threeDayTrend.items[2].valuesMgDl, [12, 12.2, 12.4]);
  assert.equal(threeDayTrend.items[2].riskLevel, 'low');
  assert.equal(threeDayTrend.items[2].riskColor, 'yellow');
  assert.ok(threeDayTrend.riskBands.length > 0);

  const sevenDayTrend = await jaundiceService.getJaundiceTrend({
    range: '7d',
    endDate: '2026-05-21'
  });
  assert.equal(sevenDayTrend.items.length, 4);

  const fourteenDayTrend = await jaundiceService.getJaundiceTrend({
    range: '14d',
    endDate: '2026-05-21'
  });
  assert.equal(fourteenDayTrend.items.length, 4);

  const allTrend = await jaundiceService.getJaundiceTrend({ range: 'all' });
  assert.equal(allTrend.items.length, 4);
  assert.equal(allTrend.startDate, '2026-05-18');
});
