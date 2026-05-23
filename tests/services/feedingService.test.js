const assert = require('node:assert/strict');
const test = require('node:test');

const { createMockWxStorage } = require('../helpers/mockWxStorage');

const babyProfile = {
  babyId: 'baby-1',
  birthDate: '2026-05-01',
  birthTime: '08:00',
  currentWeightKg: 3.5
};

test('feeding service creates records with default time, validates amount, lists by date, edits, and soft deletes', async () => {
  global.wx = createMockWxStorage();

  const feedingService = require('../../miniprogram/services/feedingService');

  for (const invalidAmount of ['', 'abc', 0, -10]) {
    await assert.rejects(
      () => feedingService.createFeedingRecord({ feedingType: 'breast', amountMl: invalidAmount }, { now: '2026-05-21T08:00:00+08:00' }),
      (error) => {
        assert.equal(error.code, 'FEEDING_RECORD_VALIDATION_FAILED');
        assert.deepEqual(error.fields, ['amountMl']);
        return true;
      }
    );
  }

  const first = await feedingService.createFeedingRecord({
    feedingType: 'breast',
    amountMl: 60,
    note: '快捷 60'
  }, { now: '2026-05-21T08:00:00+08:00' });

  const second = await feedingService.createFeedingRecord({
    feedingType: 'formula',
    amountMl: '90',
    feedingTime: '2026-05-21T10:00:00+08:00',
    note: '手动 90'
  }, { now: '2026-05-21T10:05:00+08:00' });

  await feedingService.createFeedingRecord({
    feedingType: 'breast',
    amountMl: 45,
    feedingTime: '2026-05-20T20:00:00+08:00'
  }, { now: '2026-05-20T20:00:00+08:00' });
  const tomorrowRecord = await feedingService.createFeedingRecord({
    feedingType: 'formula',
    amountMl: 30,
    feedingTime: '2026-05-22T03:00:00+08:00'
  }, { now: '2026-05-22T03:00:00+08:00' });

  assert.equal(first.record.feedingTime, '2026-05-21T08:00:00+08:00');
  assert.equal(first.record.amountMl, 60);
  assert.equal(second.record.amountMl, 90);

  const today = await feedingService.listFeedingRecords({ date: '2026-05-21' });
  assert.deepEqual(today.records.map((record) => record.id), [second.record.id, first.record.id]);
  assert.deepEqual(today.records.map((record) => record.note), ['手动 90', '快捷 60']);

  const tomorrow = await feedingService.listFeedingRecords({ date: '2026-05-22' });
  assert.deepEqual(tomorrow.records.map((record) => record.id), [tomorrowRecord.record.id]);

  const edited = await feedingService.updateFeedingRecord(first.record.id, {
    feedingType: 'formula',
    amountMl: 120,
    feedingTime: '2026-05-21T11:00:00+08:00',
    note: '改成奶粉'
  }, { now: '2026-05-21T11:05:00+08:00' });

  assert.equal(edited.record.createdAt, first.record.createdAt);
  assert.equal(edited.record.updatedAt, '2026-05-21T11:05:00+08:00');
  assert.equal(edited.record.feedingType, 'formula');
  assert.equal(edited.record.amountMl, 120);

  await feedingService.deleteFeedingRecord(second.record.id, { now: '2026-05-21T12:00:00+08:00' });

  const afterDelete = await feedingService.listFeedingRecords({ date: '2026-05-21' });
  assert.deepEqual(afterDelete.records.map((record) => record.id), [first.record.id]);
});

test('feeding service summarizes daily totals and returns continuous trend ranges', async () => {
  global.wx = createMockWxStorage();

  const feedingService = require('../../miniprogram/services/feedingService');

  await feedingService.createFeedingRecord({
    feedingType: 'breast',
    amountMl: 120,
    feedingTime: '2026-05-21T08:00:00+08:00'
  }, { now: '2026-05-21T08:00:00+08:00' });
  await feedingService.createFeedingRecord({
    feedingType: 'breast',
    amountMl: 150,
    feedingTime: '2026-05-21T12:00:00+08:00'
  }, { now: '2026-05-21T12:00:00+08:00' });
  await feedingService.createFeedingRecord({
    feedingType: 'formula',
    amountMl: 180,
    feedingTime: '2026-05-21T16:00:00+08:00'
  }, { now: '2026-05-21T16:00:00+08:00' });
  await feedingService.createFeedingRecord({
    feedingType: 'formula',
    amountMl: 90,
    feedingTime: '2026-05-19T09:00:00+08:00'
  }, { now: '2026-05-19T09:00:00+08:00' });

  const summary = await feedingService.getDailyFeedingSummary({
    date: '2026-05-21',
    babyProfile,
    now: '2026-05-21T20:00:00+08:00'
  });

  assert.equal(summary.totalAmountMl, 450);
  assert.equal(summary.totalCount, 3);
  assert.equal(summary.breastAmountMl, 270);
  assert.equal(summary.formulaAmountMl, 180);
  assert.equal(summary.breastCount, 2);
  assert.equal(summary.formulaCount, 1);
  assert.equal(summary.milkStatus.status, '达标');
  assert.equal(summary.milkStatus.lowerLimitMl, 420);
  assert.equal(summary.milkStatus.upperLimitMl, 630);

  const trend = await feedingService.getFeedingTrend({
    days: 7,
    endDate: '2026-05-21',
    babyProfile,
    now: '2026-05-21T20:00:00+08:00'
  });

  assert.equal(trend.days, 7);
  assert.deepEqual(trend.items.map((item) => item.date), [
    '2026-05-15',
    '2026-05-16',
    '2026-05-17',
    '2026-05-18',
    '2026-05-19',
    '2026-05-20',
    '2026-05-21'
  ]);
  assert.equal(trend.items[0].totalAmountMl, 0);
  assert.equal(trend.items[4].totalAmountMl, 90);
  assert.equal(trend.items[6].totalAmountMl, 450);
  assert.equal(trend.items[6].breastRatio, 0.6);
  assert.equal(trend.items[6].formulaRatio, 0.4);
  assert.equal(trend.items[6].lowerLimitMl, 420);
  assert.equal(trend.items[6].upperLimitMl, 630);

  const thirtyDayTrend = await feedingService.getFeedingTrend({
    days: 30,
    endDate: '2026-05-21',
    babyProfile,
    now: '2026-05-21T20:00:00+08:00'
  });
  assert.equal(thirtyDayTrend.items.length, 30);
});
