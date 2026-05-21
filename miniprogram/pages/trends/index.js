Page({
  data: {
    ranges: ['7 天', '14 天', '30 天'],
    activeRange: 0
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
  },
  onRangeTap(event) {
    this.setData({
      activeRange: Number(event.currentTarget.dataset.index)
    });
  }
});
