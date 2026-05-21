const localRepository = require('./localRepository');
const { STORAGE_KEYS } = require('./storageKeys');

function listJaundiceRecords(options) {
  return localRepository.listRecords(STORAGE_KEYS.JAUNDICE_RECORDS, options);
}

function saveJaundiceRecord(record) {
  return localRepository.upsertRecord(STORAGE_KEYS.JAUNDICE_RECORDS, record);
}

function softDeleteJaundiceRecord(recordId, deletedAt) {
  return localRepository.softDeleteRecord(STORAGE_KEYS.JAUNDICE_RECORDS, recordId, deletedAt);
}

module.exports = {
  listJaundiceRecords,
  saveJaundiceRecord,
  softDeleteJaundiceRecord
};
