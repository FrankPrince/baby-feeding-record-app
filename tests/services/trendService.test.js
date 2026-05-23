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
