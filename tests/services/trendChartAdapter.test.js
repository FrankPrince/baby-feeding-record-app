const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createFeedingLineChartOptions,
  createDiaperLineChartOptions,
  createJaundiceLineChartOptions,
  createTrendCalendarCells,
  selectTrendCalendarCell
} = require('../../miniprogram/services/trendChartAdapter');

test('trend chart adapter creates single-series wx-charts line options for feeding trend', () => {
  const options = createFeedingLineChartOptions({
    items: [
      { date: '2026-05-19', totalAmountMl: 120 },
      { date: '2026-05-20', totalAmountMl: 300 },
      { date: '2026-05-21', totalAmountMl: 450 }
    ]
  });

  assert.equal(options.type, 'line');
  assert.deepEqual(options.categories, ['05-19', '05-20', '05-21']);
  assert.deepEqual(options.series.map((item) => item.name), ['总奶量']);
  assert.deepEqual(options.series[0].data, [120, 300, 450]);
  assert.equal(options.yAxis.title, 'ml');
});

test('trend chart adapter creates single-series wx-charts line options for diaper trend', () => {
  const options = createDiaperLineChartOptions({
    items: [
      { date: '2026-05-20', peeCount: 3, poopCount: 1 },
      { date: '2026-05-21', peeCount: 5, poopCount: 2 }
    ]
  });

  assert.deepEqual(options.categories, ['05-20', '05-21']);
  assert.deepEqual(options.series.map((item) => item.name), ['总次数']);
  assert.deepEqual(options.series[0].data, [4, 7]);
  assert.equal(options.yAxis.title, '次数');
});

test('trend chart adapter creates single-series daily average options for jaundice trend', () => {
  const options = createJaundiceLineChartOptions({
    items: [
      { date: '2026-05-20', averageMgDl: 8.2 },
      { date: '2026-05-21', averageMgDl: 10.2 },
      { date: '2026-05-21', averageMgDl: 16.2 }
    ]
  });

  assert.deepEqual(options.categories, ['05-20', '05-21']);
  assert.deepEqual(options.series.map((item) => item.name), ['平均值']);
  assert.deepEqual(options.series[0].data, [8.2, 13.2]);
  assert.equal(options.yAxis.title, 'mg/dL');
});

test('trend chart adapter creates feeding calendar cells with empty, green, and red status', () => {
  const cells = createTrendCalendarCells('feeding', {
    items: [
      { date: '2026-05-19', totalAmountMl: 0, milkStatus: '无法判断' },
      { date: '2026-05-20', totalAmountMl: 360, milkStatus: '偏低' },
      { date: '2026-05-21', totalAmountMl: 450, milkStatus: '达标' }
    ]
  });

  assert.deepEqual(cells.map((item) => ({
    date: item.date,
    valueText: item.valueText,
    detailLines: item.detailLines,
    statusClass: item.statusClass
  })), [
    { date: '2026-05-19', valueText: '0 ml', detailLines: ['总奶量 0 ml', '状态 无记录'], statusClass: 'empty' },
    { date: '2026-05-20', valueText: '360 ml', detailLines: ['总奶量 360 ml', '状态 未达标'], statusClass: 'alert' },
    { date: '2026-05-21', valueText: '450 ml', detailLines: ['总奶量 450 ml', '状态 达标'], statusClass: 'ok' }
  ]);
});

test('trend chart adapter creates diaper calendar cells with zero-count days as empty', () => {
  const cells = createTrendCalendarCells('diaper', {
    items: [
      { date: '2026-05-20', peeCount: 0, poopCount: 0 },
      { date: '2026-05-21', peeCount: 5, poopCount: 2 }
    ]
  });

  assert.deepEqual(cells.map((item) => ({
    date: item.date,
    valueText: item.valueText,
    detailLines: item.detailLines,
    statusClass: item.statusClass
  })), [
    { date: '2026-05-20', valueText: '0 次', detailLines: ['大小便总次数 0 次', '尿尿 0 次', '便便 0 次', '状态 无记录'], statusClass: 'empty' },
    { date: '2026-05-21', valueText: '7 次', detailLines: ['大小便总次数 7 次', '尿尿 5 次', '便便 2 次', '状态 达标'], statusClass: 'ok' }
  ]);
});

test('trend chart adapter creates continuous jaundice calendar cells with missing and zero days empty', () => {
  const cells = createTrendCalendarCells('jaundice', {
    startDate: '2026-05-20',
    endDate: '2026-05-23',
    items: [
      { date: '2026-05-20', averageMgDl: 8.2, riskLevel: 'normal' },
      { date: '2026-05-22', averageMgDl: 0, riskLevel: 'unknown' },
      { date: '2026-05-23', averageMgDl: 16.2, riskLevel: 'high' }
    ]
  });

  assert.deepEqual(cells.map((item) => ({
    date: item.date,
    valueText: item.valueText,
    detailLines: item.detailLines,
    statusClass: item.statusClass
  })), [
    { date: '2026-05-20', valueText: '8.2 mg/dL', detailLines: ['平均值 8.2 mg/dL', '状态 达标'], statusClass: 'ok' },
    { date: '2026-05-21', valueText: '--', detailLines: ['暂无记录'], statusClass: 'empty' },
    { date: '2026-05-22', valueText: '0 mg/dL', detailLines: ['平均值 0 mg/dL', '状态 无记录'], statusClass: 'empty' },
    { date: '2026-05-23', valueText: '16.2 mg/dL', detailLines: ['平均值 16.2 mg/dL', '状态 未达标'], statusClass: 'alert' }
  ]);
});

test('trend chart adapter selects clicked calendar cell and defaults to latest non-empty cell', () => {
  const cells = [
    { date: '2026-05-20', valueText: '0 ml', statusText: '无记录', statusClass: 'empty' },
    { date: '2026-05-21', valueText: '360 ml', statusText: '未达标', statusClass: 'alert' },
    { date: '2026-05-22', valueText: '450 ml', statusText: '达标', statusClass: 'ok' }
  ];

  const defaultState = selectTrendCalendarCell(cells);
  assert.equal(defaultState.selectedCell.date, '2026-05-22');
  assert.equal(defaultState.badgeText, '达标');
  assert.deepEqual(defaultState.calendarCells.map((item) => item.isSelected), [false, false, true]);

  const clickedState = selectTrendCalendarCell(cells, '2026-05-21');
  assert.equal(clickedState.selectedCell.date, '2026-05-21');
  assert.equal(clickedState.badgeText, '未达标');
  assert.deepEqual(clickedState.calendarCells.map((item) => item.isSelected), [false, true, false]);
});
