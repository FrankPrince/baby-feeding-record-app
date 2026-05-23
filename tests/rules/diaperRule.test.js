const assert = require('node:assert/strict');
const test = require('node:test');

const diaperRule = require('../../miniprogram/rules/diaperRule');

test('diaper rule marks black, red, white, and gray-white colors as attention colors', () => {
  for (const color of ['black', 'red', 'white', 'gray_white']) {
    const result = diaperRule.evaluateDiaperColor(color);

    assert.equal(result.attentionRequired, true);
    assert.equal(result.level, 'attention');
    assert.equal(result.message, '出现需关注颜色，请结合宝宝状态观察，必要时咨询医生。');
  }
});

test('diaper rule keeps yellow, green, brown, and other colors normal', () => {
  for (const color of ['yellow', 'green', 'brown', 'other']) {
    const result = diaperRule.evaluateDiaperColor(color);

    assert.equal(result.attentionRequired, false);
    assert.equal(result.level, 'normal');
    assert.equal(result.message, '');
  }
});
