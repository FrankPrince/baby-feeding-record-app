const localRepository = require('./localRepository');
const { STORAGE_KEYS } = require('./storageKeys');

function listFeedingRecords(options) {
  return localRepository.listRecords(STORAGE_KEYS.FEEDING_RECORDS, options);
}

function saveFeedingRecord(record) {
  return localRepository.upsertRecord(STORAGE_KEYS.FEEDING_RECORDS, record);
}

function softDeleteFeedingRecord(recordId, deletedAt) {
  return localRepository.softDeleteRecord(STORAGE_KEYS.FEEDING_RECORDS, recordId, deletedAt);
}

module.exports = {
  listFeedingRecords,
  saveFeedingRecord,
  softDeleteFeedingRecord
};
