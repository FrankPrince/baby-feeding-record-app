function persistAvatarLocally(tempAvatarUrl) {
  if (!tempAvatarUrl || typeof wx === 'undefined' || typeof wx.getFileSystemManager !== 'function') {
    return Promise.resolve(tempAvatarUrl || '');
  }

  const fileSystem = wx.getFileSystemManager();
  if (!fileSystem || typeof fileSystem.saveFile !== 'function') {
    return Promise.resolve(tempAvatarUrl);
  }

  return new Promise((resolve) => {
    fileSystem.saveFile({
      tempFilePath: tempAvatarUrl,
      success(result) {
        resolve(result.savedFilePath || tempAvatarUrl);
      },
      fail() {
        resolve(tempAvatarUrl);
      }
    });
  });
}

module.exports = {
  persistAvatarLocally
};
