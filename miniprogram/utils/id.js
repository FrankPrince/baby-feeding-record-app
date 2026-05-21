function createLocalId(prefix) {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix || 'local'}-${Date.now()}-${random}`;
}

module.exports = {
  createLocalId
};
