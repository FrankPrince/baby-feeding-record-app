const assert = require('node:assert/strict');
const test = require('node:test');

const { createMockWxStorage } = require('../helpers/mockWxStorage');

test('trend service exposes diaper trend data for trend page consumption', async () => {
  global.wx = createMockWxStorage();

  const diaperService = require('../../miniprogram/services/diaperService');
  const trendService = require('../../miniprogram/services/trendService');

  await diaperService.createDiaperRecord({
    recordType: 'both',
    peeAmount: 'medium',
    poopAmount: 'small',
    color: 'black',
    recordTime: '2026-05-21T09:00:00+08:00'
  }, { now: '2026-05-21T09:00:00+08:00' });

  const trend = await trendService.getDiaperTrend({
    days: 7,
    endDate: '2026-05-21'
  });

  assert.equal(trend.items.length, 7);
  assert.equal(trend.items[6].peeCount, 1);
  assert.equal(trend.items[6].poopCount, 1);
  assert.deepEqual(trend.attentionColorTimeline.map((item) => item.color), ['black']);
});

test('trend service exposes jaundice trend data for trend page consumption', async () => {
  global.wx = createMockWxStorage();

  const babyService = require('../../miniprogram/services/babyService');
  const jaundiceService = require('../../miniprogram/services/jaundiceService');
  const trendService = require('../../miniprogram/services/trendService');

  await babyService.saveBabyProfile({
    nickname: '宝宝',
    birthDate: '2026-05-20',
    birthTime: '08:00',
    currentWeightKg: 3.5,
    gestationalWeeks: 39,
    hasJaundiceRiskFactors: false
  }, { now: '2026-05-21T07:00:00+08:00' });

  await jaundiceService.createJaundiceRecord({
    value1MgDl: 12,
    value2MgDl: 12.2,
    value3MgDl: 12.4,
    measurementMethod: 'serum',
    recordTime: '2026-05-21T08:00:00+08:00'
  }, { now: '2026-05-21T08:00:00+08:00' });

  const trend = await trendService.getJaundiceTrend({
    range: '3d',
    endDate: '2026-05-21'
  });

  assert.equal(trend.items.length, 1);
  assert.equal(trend.items[0].averageMgDl, 12.2);
  assert.equal(trend.items[0].riskLevel, 'low');
});

test('trend service returns dashboard data for feeding, diaper, and jaundice ranges', async () => {
  global.wx = createMockWxStorage();

  const babyService = require('../../miniprogram/services/babyService');
  const feedingService = require('../../miniprogram/services/feedingService');
  const diaperService = require('../../miniprogram/services/diaperService');
  const jaundiceService = require('../../miniprogram/services/jaundiceService');
  const trendService = require('../../miniprogram/services/trendService');

  await babyService.saveBabyProfile({
    nickname: '宝宝',
    birthDate: '2026-05-01',
    birthTime: '08:00',
    currentWeightKg: 3.5,
    gestationalWeeks: 39,
    hasJaundiceRiskFactors: false
  }, { now: '2026-05-21T07:00:00+08:00' });

  await feedingService.createFeedingRecord({
    feedingType: 'formula',
    amountMl: 120,
    feedingTime: '2026-05-21T08:00:00+08:00'
  }, { now: '2026-05-21T08:00:00+08:00' });
  await diaperService.createDiaperRecord({
    recordType: 'both',
    peeAmount: 'medium',
    poopAmount: 'small',
    color: 'yellow',
    recordTime: '2026-05-21T09:00:00+08:00'
  }, { now: '2026-05-21T09:00:00+08:00' });
  await jaundiceService.createJaundiceRecord({
    value1MgDl: 8,
    value2MgDl: 8.2,
    value3MgDl: 8.4,
    measurementMethod: 'transcutaneous',
    recordTime: '2026-05-21T10:00:00+08:00'
  }, { now: '2026-05-21T10:00:00+08:00' });

  const feedingDashboard = await trendService.getTrendDashboard({
    type: 'feeding',
    feedingDays: 14,
    endDate: '2026-05-21',
    now: '2026-05-21T20:00:00+08:00'
  });
  assert.equal(feedingDashboard.activeType, 'feeding');
  assert.deepEqual(feedingDashboard.typeOptions.map((item) => item.value), ['feeding', 'diaper', 'jaundice']);
  assert.deepEqual(feedingDashboard.rangeOptions.map((item) => item.value), [7, 14, 30]);
  assert.equal(feedingDashboard.trend.days, 14);
  assert.equal(feedingDashboard.trend.items[13].totalAmountMl, 120);

  const diaperDashboard = await trendService.getTrendDashboard({
    type: 'diaper',
    diaperDays: 30,
    endDate: '2026-05-21'
  });
  assert.equal(diaperDashboard.activeType, 'diaper');
  assert.equal(diaperDashboard.trend.days, 30);
  assert.equal(diaperDashboard.trend.items[29].peeCount, 1);

  const jaundiceDashboard = await trendService.getTrendDashboard({
    type: 'jaundice',
    jaundiceDays: 30,
    endDate: '2026-05-21'
  });
  assert.equal(jaundiceDashboard.activeType, 'jaundice');
  assert.deepEqual(jaundiceDashboard.rangeOptions.map((item) => item.value), [7, 14, 30]);
  assert.equal(jaundiceDashboard.trend.range, '30d');
  assert.equal(jaundiceDashboard.trend.items[0].averageMgDl, 8.2);
});
