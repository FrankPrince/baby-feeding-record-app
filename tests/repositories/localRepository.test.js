const assert = require('node:assert/strict');
const test = require('node:test');

const { createMockWxStorage } = require('../helpers/mockWxStorage');
const { STORAGE_KEYS } = require('../../miniprogram/repositories/storageKeys');

test('storage keys include all Ticket 01 local storage entries', () => {
  assert.equal(STORAGE_KEYS.BABY_PROFILE, 'baby_profile');
  assert.equal(STORAGE_KEYS.FEEDING_RECORDS, 'feeding_records');
  assert.equal(STORAGE_KEYS.DIAPER_RECORDS, 'diaper_records');
  assert.equal(STORAGE_KEYS.JAUNDICE_RECORDS, 'jaundice_records');
  assert.equal(STORAGE_KEYS.APP_META, 'app_meta');
});

test('object storage writes, reads, overwrites, and clears values', async () => {
  global.wx = createMockWxStorage();

  const localRepository = require('../../miniprogram/repositories/localRepository');

  assert.equal(await localRepository.getObject(STORAGE_KEYS.BABY_PROFILE), null);

  await localRepository.setObject(STORAGE_KEYS.BABY_PROFILE, { nickname: '小满' });
  assert.deepEqual(await localRepository.getObject(STORAGE_KEYS.BABY_PROFILE), { nickname: '小满' });

  await localRepository.setObject(STORAGE_KEYS.BABY_PROFILE, { nickname: '安安' });
  assert.deepEqual(await localRepository.getObject(STORAGE_KEYS.BABY_PROFILE), { nickname: '安安' });

  await localRepository.remove(STORAGE_KEYS.BABY_PROFILE);
  assert.equal(await localRepository.getObject(STORAGE_KEYS.BABY_PROFILE), null);
});

test('array record storage defaults to empty and filters soft-deleted records', async () => {
  global.wx = createMockWxStorage();

  const localRepository = require('../../miniprogram/repositories/localRepository');

  assert.deepEqual(await localRepository.getArray(STORAGE_KEYS.FEEDING_RECORDS), []);

  await localRepository.upsertRecord(STORAGE_KEYS.FEEDING_RECORDS, {
    id: 'record-1',
    babyId: 'baby-1',
    amountMl: 60,
    deletedAt: null
  });
  await localRepository.upsertRecord(STORAGE_KEYS.FEEDING_RECORDS, {
    id: 'record-2',
    babyId: 'baby-1',
    amountMl: 90,
    deletedAt: null
  });
  await localRepository.upsertRecord(STORAGE_KEYS.FEEDING_RECORDS, {
    id: 'record-1',
    babyId: 'baby-1',
    amountMl: 75,
    deletedAt: null
  });

  assert.deepEqual(await localRepository.listRecords(STORAGE_KEYS.FEEDING_RECORDS), [
    { id: 'record-1', babyId: 'baby-1', amountMl: 75, deletedAt: null },
    { id: 'record-2', babyId: 'baby-1', amountMl: 90, deletedAt: null }
  ]);

  await localRepository.softDeleteRecord(STORAGE_KEYS.FEEDING_RECORDS, 'record-1', '2026-05-21T08:00:00.000Z');

  assert.deepEqual(await localRepository.listRecords(STORAGE_KEYS.FEEDING_RECORDS), [
    { id: 'record-2', babyId: 'baby-1', amountMl: 90, deletedAt: null }
  ]);

  assert.equal(
    (await localRepository.listRecords(STORAGE_KEYS.FEEDING_RECORDS, { includeDeleted: true }))[0].deletedAt,
    '2026-05-21T08:00:00.000Z'
  );
});
