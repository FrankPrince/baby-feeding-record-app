const { createBaseRecord } = require('./common');

function createDiaperRecord(input, options) {
  return createBaseRecord(Object.assign({}, input, {
    recordType: input.recordType || 'pee',
    peeAmount: input.peeAmount || '',
    poopAmount: input.poopAmount || '',
    color: input.color || '',
    recordTime: input.recordTime || (options && options.now) || new Date().toISOString(),
    note: input.note || ''
  }), options);
}

module.exports = {
  createDiaperRecord
};
