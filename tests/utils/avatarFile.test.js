const assert = require('node:assert/strict');
const test = require('node:test');

test('persistAvatarLocally saves WeChat temporary avatar file when file system is available', async () => {
  global.wx = {
    getFileSystemManager() {
      return {
        saveFile(options) {
          assert.equal(options.tempFilePath, 'wxfile://tmp-avatar.png');
          options.success({ savedFilePath: 'wxfile://saved-avatar.png' });
        }
      };
    }
  };

  const { persistAvatarLocally } = require('../../miniprogram/utils/avatarFile');
  const result = await persistAvatarLocally('wxfile://tmp-avatar.png');

  assert.equal(result, 'wxfile://saved-avatar.png');
});

test('persistAvatarLocally falls back to temporary avatar path when saving fails', async () => {
  global.wx = {
    getFileSystemManager() {
      return {
        saveFile(options) {
          options.fail({ errMsg: 'saveFile:fail' });
        }
      };
    }
  };

  const { persistAvatarLocally } = require('../../miniprogram/utils/avatarFile');
  const result = await persistAvatarLocally('wxfile://tmp-avatar.png');

  assert.equal(result, 'wxfile://tmp-avatar.png');
});
