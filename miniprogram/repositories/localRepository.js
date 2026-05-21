function ensureWxStorage() {
  if (typeof wx === 'undefined') {
    throw new Error('wx storage API is unavailable');
  }
}

function getStorage(key) {
  ensureWxStorage();

  return new Promise((resolve, reject) => {
    wx.getStorage({
      key,
      success: (result) => resolve(result.data),
      fail: (error) => {
        if (error && typeof error.errMsg === 'string' && error.errMsg.includes('data not found')) {
          resolve(null);
          return;
        }
        reject(error);
      }
    });
  });
}

function setStorage(key, data) {
  ensureWxStorage();

  return new Promise((resolve, reject) => {
    wx.setStorage({
      key,
      data,
      success: () => resolve(data),
      fail: reject
    });
  });
}

function remove(key) {
  ensureWxStorage();

  return new Promise((resolve, reject) => {
    wx.removeStorage({
      key,
      success: () => resolve(),
      fail: reject
    });
  });
}

async function getObject(key) {
  const value = await getStorage(key);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

async function setObject(key, value) {
  return setStorage(key, value);
}

async function getArray(key) {
  const value = await getStorage(key);
  return Array.isArray(value) ? value : [];
}

async function setArray(key, records) {
  return setStorage(key, Array.isArray(records) ? records : []);
}

async function listRecords(key, options) {
  const records = await getArray(key);
  if (options && options.includeDeleted) {
    return records;
  }
  return records.filter((record) => !record.deletedAt);
}

async function upsertRecord(key, record) {
  const records = await getArray(key);
  const identifier = record.id || record.localId;
  const existingIndex = records.findIndex((item) => item.id === identifier || item.localId === identifier);

  if (existingIndex >= 0) {
    records[existingIndex] = Object.assign({}, records[existingIndex], record);
  } else {
    records.push(record);
  }

  await setArray(key, records);
  return record;
}

async function softDeleteRecord(key, recordId, deletedAt) {
  const records = await getArray(key);
  const existingIndex = records.findIndex((item) => item.id === recordId || item.localId === recordId);

  if (existingIndex < 0) {
    return null;
  }

  const updated = Object.assign({}, records[existingIndex], {
    deletedAt,
    updatedAt: deletedAt
  });
  records[existingIndex] = updated;
  await setArray(key, records);
  return updated;
}

module.exports = {
  getObject,
  setObject,
  getArray,
  setArray,
  listRecords,
  upsertRecord,
  softDeleteRecord,
  remove
};
