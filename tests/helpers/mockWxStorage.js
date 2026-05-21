function createMockWxStorage(initialData) {
  const store = new Map(Object.entries(initialData || {}));

  return {
    __store: store,
    getStorage(options) {
      if (store.has(options.key)) {
        options.success && options.success({ data: store.get(options.key) });
        return;
      }

      options.fail && options.fail({ errMsg: 'getStorage:fail data not found' });
    },
    setStorage(options) {
      store.set(options.key, options.data);
      options.success && options.success({ errMsg: 'setStorage:ok' });
    },
    removeStorage(options) {
      store.delete(options.key);
      options.success && options.success({ errMsg: 'removeStorage:ok' });
    }
  };
}

module.exports = {
  createMockWxStorage
};
