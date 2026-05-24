const overviewService = require('../../services/overviewService');
const { formatDate } = require('../../utils/date');

function createEmptyOverview() {
  return {
    date: formatDate(new Date()),
    baby: {
      subtitle: '等待档案'
    },
    feeding: {
      totalAmountMl: 0,
      totalCount: 0,
      milkStatus: {
        status: '无法判断',
        lowerLimitMl: null,
        upperLimitMl: null
      }
    },
    diaper: {
      peeCount: 0,
      poopCount: 0
    },
    jaundice: {
      hasRecord: false,
      averageMgDl: null,
      riskLevel: 'unknown',
      riskLabel: '无法判断',
      emptyText: '暂无黄疸记录',
      timeSinceLastRecordText: '',
      changeText: '',
      referenceNote: '本结果仅用于家庭记录和观察，不能替代医生判断。'
    }
  };
}

function getPendingRecordTab(type) {
  const tabMap = {
    feeding: 0,
    diaper: 1,
    jaundice: 2
  };
  return tabMap[type] || 0;
}

Page({
  data: {
    overview: createEmptyOverview(),
    isLoading: false
  },

  onLoad() {
    this.loadOverview();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 });
    }
    this.loadOverview();
  },

  async loadOverview() {
    this.setData({ isLoading: true });

    try {
      const overview = await overviewService.getTodayOverview({
        date: formatDate(new Date())
      });

      this.setData({
        overview,
        isLoading: false
      });
    } catch (error) {
      this.setData({ isLoading: false });
      wx.showToast({ title: '今日概览加载失败', icon: 'none' });
    }
  },

  onQuickRecordTap(event) {
    const type = event.currentTarget.dataset.type;

    if (typeof getApp === 'function') {
      const app = getApp();
      app.globalData = app.globalData || {};
      app.globalData.pendingRecordTab = getPendingRecordTab(type);
    }

    wx.switchTab({
      url: '/pages/record/index'
    });
  },

  async onPullDownRefresh() {
    await this.loadOverview();
    if (typeof wx !== 'undefined' && typeof wx.stopPullDownRefresh === 'function') {
      wx.stopPullDownRefresh();
    }
  }
});
