const feedingService = require('./feedingService');
const diaperService = require('./diaperService');
const jaundiceService = require('./jaundiceService');
const { formatTime } = require('../utils/date');

const FEEDING_TYPE_LABELS = {
  breast: '母乳',
  formula: '奶粉'
};

const AMOUNT_LABELS = {
  small: '小',
  medium: '中',
  large: '大'
};

const DIAPER_TYPE_LABELS = {
  pee: '尿尿',
  poop: '便便',
  both: '尿尿 + 便便'
};

const DIAPER_COLOR_LABELS = {
  yellow: '黄色',
  green: '绿色',
  brown: '棕色',
  black: '黑色',
  red: '红色',
  white: '白色',
  gray_white: '灰白色',
  other: '其他'
};

const JAUNDICE_METHOD_LABELS = {
  transcutaneous: '经皮',
  serum: '血清',
  unknown: '未知'
};

function compactLines(lines) {
  return lines.filter((line) => Boolean(line));
}

function createEmptyDetail(type, date) {
  const titleByType = {
    feeding: '当日喂养记录',
    diaper: '当日大小便记录',
    jaundice: '当日黄疸记录'
  };
  const emptyTitleByType = {
    feeding: '暂无喂养记录',
    diaper: '暂无大小便记录',
    jaundice: '暂无黄疸记录'
  };

  return {
    type,
    date,
    title: titleByType[type] || titleByType.feeding,
    subtitle: `${date} · 按时间倒序`,
    countText: '0 条',
    emptyTitle: emptyTitleByType[type] || emptyTitleByType.feeding,
    records: []
  };
}

function toFeedingEntry(record) {
  const typeText = FEEDING_TYPE_LABELS[record.feedingType] || record.feedingType;

  return {
    id: record.id,
    title: `${typeText} · ${record.amountMl} ml`,
    metaLines: compactLines([
      formatTime(record.feedingTime),
      record.note ? `备注：${record.note}` : ''
    ]),
    badgeText: '',
    badgeStatusClass: ''
  };
}

function createDiaperAmountText(record) {
  const parts = [];

  if (record.peeAmount) {
    parts.push(`尿量${AMOUNT_LABELS[record.peeAmount] || record.peeAmount}`);
  }

  if (record.poopAmount) {
    parts.push(`粪量${AMOUNT_LABELS[record.poopAmount] || record.poopAmount}`);
  }

  return parts.join(' · ');
}

function toDiaperEntry(record) {
  const recordTypeText = DIAPER_TYPE_LABELS[record.recordType] || record.recordType;
  const colorText = DIAPER_COLOR_LABELS[record.color] || record.color;
  const amountText = createDiaperAmountText(record);
  const attentionRequired = record.colorNotice && record.colorNotice.attentionRequired;

  return {
    id: record.id,
    title: `${recordTypeText} · ${colorText}`,
    metaLines: compactLines([
      amountText ? `${formatTime(record.recordTime)} · ${amountText}` : formatTime(record.recordTime),
      record.note ? `备注：${record.note}` : '',
      attentionRequired ? '需关注颜色，请结合宝宝状态观察，必要时咨询医生。' : ''
    ]),
    badgeText: attentionRequired ? '需关注' : '普通',
    badgeStatusClass: attentionRequired ? 'danger' : ''
  };
}

function toJaundiceEntry(record) {
  const methodText = JAUNDICE_METHOD_LABELS[record.measurementMethod] || '未知';
  const riskText = record.riskLabel || '无法判断';

  return {
    id: record.id,
    title: `平均 ${record.averageMgDl} mg/dL · ${riskText}`,
    metaLines: compactLines([
      `${formatTime(record.recordTime)} · ${methodText}`,
      `原始值：${record.value1MgDl} / ${record.value2MgDl} / ${record.value3MgDl} mg/dL`,
      record.note ? `备注：${record.note}` : '',
      record.riskMessage || record.referenceNote || ''
    ]),
    badgeText: riskText,
    badgeStatusClass: record.riskLevel === 'high' ? 'danger' : record.riskLevel === 'medium' ? 'warn' : ''
  };
}

async function getTrendDailyDetail(options) {
  const type = options && options.type ? options.type : 'feeding';
  const date = options && options.date;
  const detail = createEmptyDetail(type, date);
  let records = [];

  if (type === 'diaper') {
    records = (await diaperService.listDiaperRecords({ date })).records.map(toDiaperEntry);
  } else if (type === 'jaundice') {
    records = (await jaundiceService.listJaundiceRecords({ date })).records.map(toJaundiceEntry);
  } else {
    records = (await feedingService.listFeedingRecords({ date })).records.map(toFeedingEntry);
  }

  return Object.assign({}, detail, {
    countText: `${records.length} 条`,
    records
  });
}

module.exports = {
  getTrendDailyDetail
};
