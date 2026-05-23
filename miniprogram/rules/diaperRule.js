const DIAPER_COLOR_LEVEL = {
  NORMAL: 'normal',
  ATTENTION: 'attention'
};

const DIAPER_ATTENTION_MESSAGE = '出现需关注颜色，请结合宝宝状态观察，必要时咨询医生。';
const ATTENTION_COLORS = ['black', 'red', 'white', 'gray_white'];

function isAttentionColor(color) {
  return ATTENTION_COLORS.includes(color);
}

function evaluateDiaperColor(color) {
  const attentionRequired = isAttentionColor(color);

  return {
    color,
    attentionRequired,
    level: attentionRequired ? DIAPER_COLOR_LEVEL.ATTENTION : DIAPER_COLOR_LEVEL.NORMAL,
    message: attentionRequired ? DIAPER_ATTENTION_MESSAGE : ''
  };
}

module.exports = {
  DIAPER_COLOR_LEVEL,
  DIAPER_ATTENTION_MESSAGE,
  ATTENTION_COLORS,
  isAttentionColor,
  evaluateDiaperColor
};
