Page({
  data: {
    tabs: ['喂养', '大小便', '黄疸'],
    activeTab: 0
  },
  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
  },
  onTabTap(event) {
    this.setData({
      activeTab: Number(event.currentTarget.dataset.index)
    });
  }
});
