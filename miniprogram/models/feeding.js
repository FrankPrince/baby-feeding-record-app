const { createBaseRecord } = require('./common');
const { toNullableNumber } = require('../utils/number');

function createFeedingRecord(input, options) {
  return createBaseRecord(Object.assign({}, input, {
    feedingType: input.feedingType || 'formula',
    amountMl: toNullableNumber(input.amountMl),
    feedingTime: input.feedingTime || (options && options.now) || new Date().toISOString(),
    note: input.note || ''
  }), options);
}

module.exports = {
  createFeedingRecord
};
