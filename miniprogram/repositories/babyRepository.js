const localRepository = require('./localRepository');
const { STORAGE_KEYS } = require('./storageKeys');

function getBabyProfile() {
  return localRepository.getObject(STORAGE_KEYS.BABY_PROFILE);
}

function saveBabyProfile(profile) {
  return localRepository.setObject(STORAGE_KEYS.BABY_PROFILE, profile);
}

function clearBabyProfile() {
  return localRepository.remove(STORAGE_KEYS.BABY_PROFILE);
}

module.exports = {
  getBabyProfile,
  saveBabyProfile,
  clearBabyProfile
};
