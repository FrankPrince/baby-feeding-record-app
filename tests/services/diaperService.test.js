const assert = require('node:assert/strict');
const test = require('node:test');

const { createMockWxStorage } = require('../helpers/mockWxStorage');

test('diaper service creates records with type-specific validation, lists by date, edits, and soft deletes', async () => {
  global.wx = createMockWxStorage();

  const diaperService = require('../../miniprogram/services/diaperService');

  await assert.rejects(
    () => diaperService.createDiaperRecord({ recordType: 'pee', color: 'yellow' }, { now: '2026-05-21T08:00:00+08:00' }),
    (error) => {
      assert.equal(error.code, 'DIAPER_RECORD_VALIDATION_FAILED');
      assert.deepEqual(error.fields, ['peeAmount']);
      return true;
    }
  );

  await assert.rejects(
    () => diaperService.createDiaperRecord({ recordType: 'poop', color: 'yellow' }, { now: '2026-05-21T08:00:00+08:00' }),
    (error) => {
      assert.equal(error.code, 'DIAPER_RECORD_VALIDATION_FAILED');
      assert.deepEqual(error.fields, ['poopAmount']);
      return true;
    }
  );

  await assert.rejects(
    () => diaperService.createDiaperRecord({ recordType: 'both', peeAmount: 'medium', color: 'yellow' }, { now: '2026-05-21T08:00:00+08:00' }),
    (error) => {
      assert.equal(error.code, 'DIAPER_RECORD_VALIDATION_FAILED');
      assert.deepEqual(error.fields, ['poopAmount']);
      return true;
    }
  );

  const pee = await diaperService.createDiaperRecord({
    recordType: 'pee',
    peeAmount: 'medium',
    color: 'yellow',
    note: '尿量正常'
  }, { now: '2026-05-21T08:00:00+08:00' });

  const poop = await diaperService.createDiaperRecord({
    recordType: 'poop',
    poopAmount: 'small',
    color: 'green',
    recordTime: '2026-05-21T10:00:00+08:00',
    note: '绿色便便'
  }, { now: '2026-05-21T10:05:00+08:00' });

  await diaperService.createDiaperRecord({
    recordType: 'both',
    peeAmount: 'large',
    poopAmount: 'medium',
    color: 'red',
    recordTime: '2026-05-20T20:00:00+08:00'
  }, { now: '2026-05-20T20:00:00+08:00' });

  assert.equal(pee.record.recordTime, '2026-05-21T08:00:00+08:00');
  assert.equal(pee.record.poopAmount, '');
  assert.equal(pee.record.colorNotice.attentionRequired, false);
  assert.equal(poop.record.peeAmount, '');

  const today = await diaperService.listDiaperRecords({ date: '2026-05-21' });
  assert.deepEqual(today.records.map((record) => record.id), [poop.record.id, pee.record.id]);
  assert.deepEqual(today.records.map((record) => record.note), ['绿色便便', '尿量正常']);

  const edited = await diaperService.updateDiaperRecord(pee.record.id, {
    recordType: 'both',
    peeAmount: 'large',
    poopAmount: 'medium',
    color: 'black',
    recordTime: '2026-05-21T11:00:00+08:00',
    note: '改为都有'
  }, { now: '2026-05-21T11:05:00+08:00' });

  assert.equal(edited.record.createdAt, pee.record.createdAt);
  assert.equal(edited.record.updatedAt, '2026-05-21T11:05:00+08:00');
  assert.equal(edited.record.colorNotice.attentionRequired, true);
  assert.equal(edited.record.colorNotice.level, 'attention');

  await diaperService.deleteDiaperRecord(poop.record.id, { now: '2026-05-21T12:00:00+08:00' });

  const afterDelete = await diaperService.listDiaperRecords({ date: '2026-05-21' });
  assert.deepEqual(afterDelete.records.map((record) => record.id), [pee.record.id]);
});

test('diaper service summarizes daily counts and returns continuous trend ranges with attention timeline', async () => {
  global.wx = createMockWxStorage();

  const diaperService = require('../../miniprogram/services/diaperService');

  await diaperService.createDiaperRecord({
    recordType: 'pee',
    peeAmount: 'small',
    color: 'yellow',
    recordTime: '2026-05-21T08:00:00+08:00'
  }, { now: '2026-05-21T08:00:00+08:00' });
  await diaperService.createDiaperRecord({
    recordType: 'poop',
    poopAmount: 'large',
    color: 'red',
    recordTime: '2026-05-21T12:00:00+08:00'
  }, { now: '2026-05-21T12:00:00+08:00' });
  await diaperService.createDiaperRecord({
    recordType: 'both',
    peeAmount: 'large',
    poopAmount: 'medium',
    color: 'gray_white',
    recordTime: '2026-05-21T16:00:00+08:00'
  }, { now: '2026-05-21T16:00:00+08:00' });
  await diaperService.createDiaperRecord({
    recordType: 'pee',
    peeAmount: 'medium',
    color: 'brown',
    recordTime: '2026-05-19T09:00:00+08:00'
  }, { now: '2026-05-19T09:00:00+08:00' });

  const summary = await diaperService.getDailyDiaperSummary({ date: '2026-05-21' });

  assert.equal(summary.peeCount, 2);
  assert.equal(summary.poopCount, 2);
  assert.deepEqual(summary.peeAmountDistribution, { small: 1, medium: 0, large: 1 });
  assert.deepEqual(summary.poopAmountDistribution, { small: 0, medium: 1, large: 1 });
  assert.equal(summary.attentionColorCount, 2);
  assert.deepEqual(summary.attentionColorTimeline.map((item) => ({
    recordTime: item.recordTime,
    color: item.color,
    recordType: item.recordType,
    level: item.level
  })), [
    {
      recordTime: '2026-05-21T12:00:00+08:00',
      color: 'red',
      recordType: 'poop',
      level: 'attention'
    },
    {
      recordTime: '2026-05-21T16:00:00+08:00',
      color: 'gray_white',
      recordType: 'both',
      level: 'attention'
    }
  ]);

  const trend = await diaperService.getDiaperTrend({
    days: 7,
    endDate: '2026-05-21'
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
  assert.equal(trend.items[0].peeCount, 0);
  assert.equal(trend.items[4].peeCount, 1);
  assert.equal(trend.items[4].poopCount, 0);
  assert.equal(trend.items[6].peeCount, 2);
  assert.equal(trend.items[6].poopCount, 2);
  assert.deepEqual(trend.items[6].peeAmountDistribution, { small: 1, medium: 0, large: 1 });
  assert.equal(trend.attentionColorTimeline.length, 2);
  assert.deepEqual(trend.attentionColorTimeline.map((item) => item.color), ['red', 'gray_white']);

  const thirtyDayTrend = await diaperService.getDiaperTrend({
    days: 30,
    endDate: '2026-05-21'
  });
  assert.equal(thirtyDayTrend.items.length, 30);
});
