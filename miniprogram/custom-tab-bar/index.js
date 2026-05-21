Component({
  data: {
    selected: 0,
    items: [
      { pagePath: '/pages/today/index', iconClass: 'today', text: '今日' },
      { pagePath: '/pages/record/index', iconClass: 'record', text: '记录' },
      { pagePath: '/pages/trends/index', iconClass: 'trends', text: '趋势' },
      { pagePath: '/pages/baby/index', iconClass: 'baby', text: '宝宝' }
    ]
  },
  methods: {
    switchTab(event) {
      const item = this.data.items[event.currentTarget.dataset.index];
      wx.switchTab({
        url: item.pagePath
      });
    }
  }
});
