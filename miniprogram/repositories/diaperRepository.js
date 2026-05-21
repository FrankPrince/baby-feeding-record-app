const localRepository = require('./localRepository');
const { STORAGE_KEYS } = require('./storageKeys');

function listDiaperRecords(options) {
  return localRepository.listRecords(STORAGE_KEYS.DIAPER_RECORDS, options);
}

function saveDiaperRecord(record) {
  return localRepository.upsertRecord(STORAGE_KEYS.DIAPER_RECORDS, record);
}

function softDeleteDiaperRecord(recordId, deletedAt) {
  return localRepository.softDeleteRecord(STORAGE_KEYS.DIAPER_RECORDS, recordId, deletedAt);
}

module.exports = {
  listDiaperRecords,
  saveDiaperRecord,
  softDeleteDiaperRecord
};
