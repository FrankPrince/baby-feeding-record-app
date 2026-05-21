function toNullableNumber(value) {
  if (value === '' || value === null || typeof value === 'undefined') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

module.exports = {
  toNullableNumber
};
