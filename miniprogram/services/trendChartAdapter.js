const CHART_COLORS = {
  ink: '#20211F',
  mint: '#77A88A',
  sky: '#2D5F95',
  amber: '#C59628',
  coral: '#B65A46'
};

function toCategory(date) {
  return String(date || '').slice(5);
}

function toNumber(value) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function roundToOneDecimal(value) {
  return Math.round(value * 10) / 10;
}

function toDate(value) {
  return new Date(`${value}T00:00:00`);
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(date, offset) {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + offset);
  return next;
}

function getDatesBetween(startDate, endDate) {
  if (!startDate || !endDate) {
    return [];
  }

  const dates = [];
  const end = toDate(endDate);
  let current = toDate(startDate);

  while (current <= end) {
    dates.push(formatDate(current));
    current = addDays(current, 1);
  }

  return dates;
}

function createBaseLineOptions(options) {
  return {
    type: 'line',
    categories: options.categories,
    series: options.series,
    animation: true,
    dataLabel: false,
    dataPointShape: true,
    legend: true,
    background: '#FFFEF9',
    xAxis: {
      disableGrid: true,
      fontColor: '#74766F'
    },
    yAxis: {
      title: options.yAxisTitle,
      min: 0,
      gridColor: '#DEDED5',
      fontColor: '#74766F',
      titleFontColor: '#74766F'
    },
    extra: {
      lineStyle: 'curve',
      legendTextColor: '#74766F'
    }
  };
}

function createFeedingLineChartOptions(trend) {
  const items = trend && trend.items ? trend.items : [];

  return createBaseLineOptions({
    categories: items.map((item) => toCategory(item.date)),
    yAxisTitle: 'ml',
    series: [
      {
        name: '总奶量',
        color: CHART_COLORS.ink,
        data: items.map((item) => toNumber(item.totalAmountMl))
      }
    ]
  });
}

function createDiaperLineChartOptions(trend) {
  const items = trend && trend.items ? trend.items : [];

  return createBaseLineOptions({
    categories: items.map((item) => toCategory(item.date)),
    yAxisTitle: '次数',
    series: [
      {
        name: '总次数',
        color: CHART_COLORS.amber,
        data: items.map((item) => toNumber(item.peeCount) + toNumber(item.poopCount))
      }
    ]
  });
}

function groupJaundiceItemsByDate(items) {
  const grouped = new Map();

  for (const item of items) {
    const existing = grouped.get(item.date) || {
      date: item.date,
      totalAverageMgDl: 0,
      count: 0,
      hasHighRisk: false
    };

    existing.totalAverageMgDl += toNumber(item.averageMgDl);
    existing.count += 1;
    existing.hasHighRisk = existing.hasHighRisk || item.riskLevel === 'high';
    grouped.set(item.date, existing);
  }

  return Array.from(grouped.values()).map((item) => ({
    date: item.date,
    averageMgDl: item.count > 0 ? roundToOneDecimal(item.totalAverageMgDl / item.count) : null,
    riskLevel: item.hasHighRisk ? 'high' : 'normal'
  }));
}

function createJaundiceLineChartOptions(trend) {
  const items = groupJaundiceItemsByDate(trend && trend.items ? trend.items : []);

  return createBaseLineOptions({
    categories: items.map((item) => toCategory(item.date)),
    yAxisTitle: 'mg/dL',
    series: [
      {
        name: '平均值',
        color: CHART_COLORS.ink,
        data: items.map((item) => toNumber(item.averageMgDl))
      }
    ]
  });
}

function createFeedingCalendarCells(trend) {
  const items = trend && trend.items ? trend.items : [];

  return items.map((item) => {
    const totalAmountMl = toNumber(item.totalAmountMl);
    const hasData = totalAmountMl > 0;
    const isOk = item.milkStatus === '达标';

    return {
      date: item.date,
      dayText: toCategory(item.date),
      valueText: `${totalAmountMl} ml`,
      statusText: hasData ? (isOk ? '达标' : '未达标') : '无记录',
      statusClass: hasData ? (isOk ? 'ok' : 'alert') : 'empty',
      detailLines: [
        `总奶量 ${totalAmountMl} ml`,
        `状态 ${hasData ? (isOk ? '达标' : '未达标') : '无记录'}`
      ]
    };
  });
}

function createDiaperCalendarCells(trend) {
  const items = trend && trend.items ? trend.items : [];

  return items.map((item) => {
    const totalCount = toNumber(item.peeCount) + toNumber(item.poopCount);
    const hasData = totalCount > 0;
    return {
      date: item.date,
      dayText: toCategory(item.date),
      valueText: `${totalCount} 次`,
      statusText: hasData ? '达标' : '无记录',
      statusClass: hasData ? 'ok' : 'empty',
      detailLines: [
        `大小便总次数 ${totalCount} 次`,
        `尿尿 ${toNumber(item.peeCount)} 次`,
        `便便 ${toNumber(item.poopCount)} 次`,
        `状态 ${hasData ? '达标' : '无记录'}`
      ]
    };
  });
}

function createJaundiceCalendarCells(trend) {
  const groupedItems = groupJaundiceItemsByDate(trend && trend.items ? trend.items : []);
  const itemMap = new Map(groupedItems.map((item) => [item.date, item]));
  const dates = getDatesBetween(trend && trend.startDate, trend && trend.endDate);
  const cellDates = dates.length > 0 ? dates : groupedItems.map((item) => item.date);

  return cellDates.map((date) => {
    const item = itemMap.get(date);

    if (!item) {
      return {
        date,
        dayText: toCategory(date),
        valueText: '--',
        statusText: '无记录',
        statusClass: 'empty',
        detailLines: ['暂无记录']
      };
    }

    const hasData = item.averageMgDl > 0;
    const statusText = hasData ? (item.riskLevel === 'high' ? '未达标' : '达标') : '无记录';

    return {
      date,
      dayText: toCategory(date),
      valueText: `${item.averageMgDl} mg/dL`,
      statusText,
      statusClass: hasData ? (item.riskLevel === 'high' ? 'alert' : 'ok') : 'empty',
      detailLines: [
        `平均值 ${item.averageMgDl} mg/dL`,
        `状态 ${statusText}`
      ]
    };
  });
}

function createTrendCalendarCells(type, trend) {
  if (type === 'diaper') {
    return createDiaperCalendarCells(trend);
  }

  if (type === 'jaundice') {
    return createJaundiceCalendarCells(trend);
  }

  return createFeedingCalendarCells(trend);
}

function getDefaultSelectedCell(cells) {
  for (let index = cells.length - 1; index >= 0; index -= 1) {
    if (cells[index].statusClass !== 'empty') {
      return cells[index];
    }
  }

  return cells.length > 0 ? cells[cells.length - 1] : null;
}

function selectTrendCalendarCell(cells, selectedDate) {
  const safeCells = Array.isArray(cells) ? cells : [];
  const selectedCell = safeCells.find((item) => item.date === selectedDate) || getDefaultSelectedCell(safeCells);

  return {
    selectedCell,
    badgeText: selectedCell ? selectedCell.statusText : '暂无',
    calendarCells: safeCells.map((item) => Object.assign({}, item, {
      isSelected: Boolean(selectedCell && item.date === selectedCell.date)
    }))
  };
}

function createLineChartOptions(type, trend) {
  if (type === 'diaper') {
    return createDiaperLineChartOptions(trend);
  }

  if (type === 'jaundice') {
    return createJaundiceLineChartOptions(trend);
  }

  return createFeedingLineChartOptions(trend);
}

module.exports = {
  createFeedingLineChartOptions,
  createDiaperLineChartOptions,
  createJaundiceLineChartOptions,
  createTrendCalendarCells,
  selectTrendCalendarCell,
  createLineChartOptions
};
