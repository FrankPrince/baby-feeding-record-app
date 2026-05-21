const { createLocalId } = require('../utils/id');

const SCHEMA_VERSION = 1;
const SYNC_STATUS_LOCAL = 'local';

function createBaseRecord(input, options) {
  const now = options && options.now ? options.now : new Date().toISOString();
  const localId = input.localId || input.id || createLocalId('record');

  return Object.assign({}, input, {
    id: input.id || localId,
    localId,
    babyId: input.babyId || 'baby-1',
    createdAt: input.createdAt || now,
    updatedAt: now,
    deletedAt: input.deletedAt || null,
    syncStatus: input.syncStatus || SYNC_STATUS_LOCAL,
    createdBy: input.createdBy || 'local_user',
    schemaVersion: input.schemaVersion || SCHEMA_VERSION
  });
}

module.exports = {
  SCHEMA_VERSION,
  SYNC_STATUS_LOCAL,
  createBaseRecord
};
