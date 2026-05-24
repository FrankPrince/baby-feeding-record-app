const assert = require('node:assert/strict');
const test = require('node:test');

const { createMockWxStorage } = require('../helpers/mockWxStorage');

test('trend daily detail service returns feeding records as record-page style entries', async () => {
  global.wx = createMockWxStorage();

  const feedingService = require('../../miniprogram/services/feedingService');
  const { getTrendDailyDetail } = require('../../miniprogram/services/trendDailyDetailService');

  await feedingService.createFeedingRecord({
    feedingType: 'breast',
    amountMl: 120,
    feedingTime: '2026-05-24T08:50:00+08:00',
    note: '醒后补喂'
  }, { now: '2026-05-24T08:51:00+08:00' });
  await feedingService.createFeedingRecord({
    feedingType: 'formula',
    amountMl: 90,
    feedingTime: '2026-05-24T10:20:00+08:00'
  }, { now: '2026-05-24T10:21:00+08:00' });

  const detail = await getTrendDailyDetail({ type: 'feeding', date: '2026-05-24' });

  assert.equal(detail.title, '当日喂养记录');
  assert.equal(detail.countText, '2 条');
  assert.deepEqual(detail.records.map((record) => record.title), [
    '奶粉 · 90 ml',
    '母乳 · 120 ml'
  ]);
  assert.deepEqual(detail.records[1].metaLines, ['08:50', '备注：醒后补喂']);
});

test('trend daily detail service returns diaper records as record-page style entries', async () => {
  global.wx = createMockWxStorage();

  const diaperService = require('../../miniprogram/services/diaperService');
  const { getTrendDailyDetail } = require('../../miniprogram/services/trendDailyDetailService');

  await diaperService.createDiaperRecord({
    recordType: 'pee',
    peeAmount: 'small',
    color: 'yellow',
    recordTime: '2026-05-24T08:40:00+08:00'
  }, { now: '2026-05-24T08:41:00+08:00' });
  await diaperService.createDiaperRecord({
    recordType: 'both',
    peeAmount: 'large',
    poopAmount: 'medium',
    color: 'red',
    recordTime: '2026-05-24T09:10:00+08:00',
    note: '换尿布时发现'
  }, { now: '2026-05-24T09:11:00+08:00' });

  const detail = await getTrendDailyDetail({ type: 'diaper', date: '2026-05-24' });

  assert.equal(detail.title, '当日大小便记录');
  assert.equal(detail.countText, '2 条');
  assert.deepEqual(detail.records.map((record) => record.title), [
    '尿尿 + 便便 · 红色',
    '尿尿 · 黄色'
  ]);
  assert.deepEqual(detail.records[0].metaLines, [
    '09:10 · 尿量大 · 粪量中',
    '备注：换尿布时发现',
    '需关注颜色，请结合宝宝状态观察，必要时咨询医生。'
  ]);
  assert.equal(detail.records[0].badgeText, '需关注');
  assert.equal(detail.records[0].badgeStatusClass, 'danger');
});

test('trend daily detail service returns jaundice records as record-page style entries', async () => {
  global.wx = createMockWxStorage();

  const jaundiceService = require('../../miniprogram/services/jaundiceService');
  const { getTrendDailyDetail } = require('../../miniprogram/services/trendDailyDetailService');

  const babyProfile = {
    babyId: 'baby-1',
    birthDate: '2026-05-20',
    birthTime: '08:00',
    gestationalWeeks: 40,
    currentWeightKg: 3.2
  };

  await jaundiceService.createJaundiceRecord({
    value1MgDl: 4,
    value2MgDl: 5,
    value3MgDl: 6,
    measurementMethod: 'transcutaneous',
    recordTime: '2026-05-24T08:00:00+08:00'
  }, { now: '2026-05-24T08:01:00+08:00', babyProfile });
  await jaundiceService.createJaundiceRecord({
    value1MgDl: 18,
    value2MgDl: 19,
    value3MgDl: 20,
    measurementMethod: 'serum',
    recordTime: '2026-05-24T11:00:00+08:00',
    note: '复测'
  }, { now: '2026-05-24T11:01:00+08:00', babyProfile });

  const detail = await getTrendDailyDetail({ type: 'jaundice', date: '2026-05-24' });

  assert.equal(detail.title, '当日黄疸记录');
  assert.equal(detail.countText, '2 条');
  assert.deepEqual(detail.records.map((record) => record.title), [
    '平均 19 mg/dL · 高危',
    '平均 5 mg/dL · 正常'
  ]);
  assert.deepEqual(detail.records[0].metaLines.slice(0, 3), [
    '11:00 · 血清',
    '原始值：18 / 19 / 20 mg/dL',
    '备注：复测'
  ]);
  assert.equal(detail.records[0].badgeText, '高危');
  assert.equal(detail.records[0].badgeStatusClass, 'danger');
});
