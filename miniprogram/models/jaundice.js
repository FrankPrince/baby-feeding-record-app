const { createBaseRecord } = require('./common');
const { toNullableNumber } = require('../utils/number');

function createJaundiceRecord(input, options) {
  return createBaseRecord(Object.assign({}, input, {
    value1MgDl: toNullableNumber(input.value1MgDl),
    value2MgDl: toNullableNumber(input.value2MgDl),
    value3MgDl: toNullableNumber(input.value3MgDl),
    averageMgDl: toNullableNumber(input.averageMgDl),
    measurementMethod: input.measurementMethod || 'unknown',
    riskLevel: input.riskLevel || 'unknown',
    recordTime: input.recordTime || (options && options.now) || new Date().toISOString(),
    note: input.note || ''
  }), options);
}

module.exports = {
  createJaundiceRecord
};
