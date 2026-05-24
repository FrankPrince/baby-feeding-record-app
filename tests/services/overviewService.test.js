const assert = require('node:assert/strict');
const test = require('node:test');

const { createMockWxStorage } = require('../helpers/mockWxStorage');

const babyProfile = {
  nickname: '宝宝',
  birthDate: '2026-05-01',
  birthTime: '08:00',
  currentWeightKg: 3.5,
  gestationalWeeks: 39,
  hasJaundiceRiskFactors: false
};

test('overview service returns safe empty state when profile and records are missing', async () => {
  global.wx = createMockWxStorage();

  const overviewService = require('../../miniprogram/services/overviewService');

  const overview = await overviewService.getTodayOverview({
    date: '2026-05-21',
    now: '2026-05-21T20:00:00+08:00'
  });

  assert.equal(overview.date, '2026-05-21');
  assert.equal(overview.baby.profile, null);
  assert.equal(overview.baby.subtitle, '等待档案');
  assert.equal(overview.feeding.totalAmountMl, 0);
  assert.equal(overview.feeding.totalCount, 0);
  assert.equal(overview.feeding.milkStatus.status, '无法判断');
  assert.equal(overview.diaper.peeCount, 0);
  assert.equal(overview.diaper.poopCount, 0);
  assert.equal(overview.jaundice.hasRecord, false);
  assert.equal(overview.jaundice.riskLevel, 'unknown');
  assert.equal(overview.jaundice.riskLabel, '无法判断');
  assert.equal(overview.jaundice.emptyText, '暂无黄疸记录');
  assert.match(overview.jaundice.referenceNote, /不能替代医生判断/);
});

test('overview service aggregates today feeding, diaper, latest jaundice, and jaundice change', async () => {
  global.wx = createMockWxStorage();

  const babyService = require('../../miniprogram/services/babyService');
  const feedingService = require('../../miniprogram/services/feedingService');
  const diaperService = require('../../miniprogram/services/diaperService');
  const jaundiceService = require('../../miniprogram/services/jaundiceService');
  const overviewService = require('../../miniprogram/services/overviewService');

  await babyService.saveBabyProfile(babyProfile, { now: '2026-05-21T07:00:00+08:00' });

  await feedingService.createFeedingRecord({
    feedingType: 'breast',
    amountMl: 120,
    feedingTime: '2026-05-21T08:00:00+08:00'
  }, { now: '2026-05-21T08:00:00+08:00' });
  await feedingService.createFeedingRecord({
    feedingType: 'formula',
    amountMl: 180,
    feedingTime: '2026-05-21T14:00:00+08:00'
  }, { now: '2026-05-21T14:00:00+08:00' });
  await feedingService.createFeedingRecord({
    feedingType: 'breast',
    amountMl: 150,
    feedingTime: '2026-05-21T18:00:00+08:00'
  }, { now: '2026-05-21T18:00:00+08:00' });

  await diaperService.createDiaperRecord({
    recordType: 'pee',
    peeAmount: 'medium',
    color: 'yellow',
    recordTime: '2026-05-21T09:00:00+08:00'
  }, { now: '2026-05-21T09:00:00+08:00' });
  await diaperService.createDiaperRecord({
    recordType: 'both',
    peeAmount: 'large',
    poopAmount: 'small',
    color: 'brown',
    recordTime: '2026-05-21T16:00:00+08:00'
  }, { now: '2026-05-21T16:00:00+08:00' });

  await jaundiceService.createJaundiceRecord({
    value1MgDl: 10,
    value2MgDl: 10.2,
    value3MgDl: 10.4,
    measurementMethod: 'transcutaneous',
    recordTime: '2026-05-20T08:00:00+08:00'
  }, { now: '2026-05-20T08:00:00+08:00' });
  await jaundiceService.createJaundiceRecord({
    value1MgDl: 12,
    value2MgDl: 12.2,
    value3MgDl: 12.4,
    measurementMethod: 'transcutaneous',
    recordTime: '2026-05-21T08:00:00+08:00'
  }, { now: '2026-05-21T08:00:00+08:00' });

  const overview = await overviewService.getTodayOverview({
    date: '2026-05-21',
    now: '2026-05-21T20:00:00+08:00'
  });

  assert.equal(overview.baby.subtitle, '宝宝 · 21 天');
  assert.equal(overview.feeding.totalAmountMl, 450);
  assert.equal(overview.feeding.totalCount, 3);
  assert.equal(overview.feeding.milkStatus.status, '达标');
  assert.equal(overview.feeding.milkStatus.lowerLimitMl, 420);
  assert.equal(overview.feeding.milkStatus.upperLimitMl, 630);
  assert.equal(overview.diaper.peeCount, 2);
  assert.equal(overview.diaper.poopCount, 1);
  assert.equal(overview.jaundice.hasRecord, true);
  assert.equal(overview.jaundice.averageMgDl, 12.2);
  assert.equal(overview.jaundice.riskLevel, 'normal');
  assert.equal(overview.jaundice.riskLabel, '正常');
  assert.equal(overview.jaundice.hoursSinceLastRecord, 12);
  assert.equal(overview.jaundice.timeSinceLastRecordText, '12 小时前');
  assert.equal(overview.jaundice.changeFromPrevious, 2);
  assert.equal(overview.jaundice.changeDirection, '上升');
  assert.equal(overview.jaundice.changeText, '较上次上升 2 mg/dL');
});
