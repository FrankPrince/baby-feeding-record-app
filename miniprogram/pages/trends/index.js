const trendService = require('../../services/trendService');
const { getTrendDailyDetail } = require('../../services/trendDailyDetailService');
const wxCharts = require('../../libs/wxcharts');
const {
  createLineChartOptions,
  createTrendCalendarCells,
  selectTrendCalendarCell
} = require('../../services/trendChartAdapter');
const { formatDate } = require('../../utils/date');

const CHART_CANVAS_ID = 'trendLineChart';
const CHART_HEIGHT = 220;

function toViewModel(dashboard, selectedDate) {
  const trend = dashboard.trend;
  const calendarState = selectTrendCalendarCell(
    createTrendCalendarCells(dashboard.activeType, trend),
    selectedDate
  );

  if (dashboard.activeType === 'feeding') {
    return {
      title: '奶量趋势',
      subtitle: '每日总奶量',
      badge: calendarState.badgeText,
      badgeStatusClass: calendarState.selectedCell ? calendarState.selectedCell.statusClass : 'empty',
      emptyText: '暂无喂养趋势数据',
      selectedDate: calendarState.selectedCell ? calendarState.selectedCell.date : '',
      calendarCells: calendarState.calendarCells
    };
  }

  if (dashboard.activeType === 'diaper') {
    return {
      title: '大小便趋势',
      subtitle: '每日大小便总次数',
      badge: calendarState.badgeText,
      badgeStatusClass: calendarState.selectedCell ? calendarState.selectedCell.statusClass : 'empty',
      emptyText: '暂无大小便趋势数据',
      selectedDate: calendarState.selectedCell ? calendarState.selectedCell.date : '',
      calendarCells: calendarState.calendarCells
    };
  }

  return {
    title: '黄疸趋势',
    subtitle: '每日平均数值',
    badge: calendarState.badgeText,
    badgeStatusClass: calendarState.selectedCell ? calendarState.selectedCell.statusClass : 'empty',
    emptyText: '暂无黄疸趋势数据',
    selectedDate: calendarState.selectedCell ? calendarState.selectedCell.date : '',
    calendarCells: calendarState.calendarCells
  };
}

Page({
  data: {
    typeOptions: trendService.TYPE_OPTIONS,
    rangeOptions: trendService.DAY_RANGE_OPTIONS,
    activeType: 'feeding',
    feedingDays: 7,
    diaperDays: 7,
    jaundiceDays: 7,
    dashboard: null,
    viewModel: {
      title: '奶量趋势',
      subtitle: '每日总奶量',
      badge: '暂无',
      badgeStatusClass: 'empty',
      emptyText: '暂无趋势数据',
      selectedDate: '',
      calendarCells: []
    },
    chartWidth: 320,
    chartHeight: CHART_HEIGHT,
    hasChartData: false,
    isLoading: false,
    detailModal: {
      visible: false,
      title: '',
      subtitle: '',
      countText: '',
      emptyTitle: '',
      records: []
    }
  },

  onLoad() {
    this.initChartSize();
    this.loadTrendDashboard();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 });
    }
    this.loadTrendDashboard();
  },

  getActiveRange() {
    if (this.data.activeType === 'diaper') {
      return this.data.diaperDays;
    }

    if (this.data.activeType === 'jaundice') {
      return this.data.jaundiceDays;
    }

    return this.data.feedingDays;
  },

  initChartSize() {
    if (typeof wx === 'undefined' || typeof wx.getSystemInfoSync !== 'function') {
      return;
    }

    const systemInfo = wx.getSystemInfoSync();
    const chartWidth = Math.max(280, Math.min(systemInfo.windowWidth - 48, 360));

    this.setData({
      chartWidth,
      chartHeight: CHART_HEIGHT
    });
  },

  drawTrendChart(dashboard) {
    const trend = dashboard && dashboard.trend ? dashboard.trend : null;
    const items = trend && trend.items ? trend.items : [];
    const hasChartData = items.length > 0;

    if (!hasChartData || typeof wx === 'undefined') {
      this.setData({ hasChartData });
      return;
    }

    const chartOptions = createLineChartOptions(dashboard.activeType, trend);

    this.setData({ hasChartData }, () => {
      this.trendChart = new wxCharts(Object.assign({}, chartOptions, {
        canvasId: CHART_CANVAS_ID,
        width: this.data.chartWidth,
        height: this.data.chartHeight
      }));
    });
  },

  async loadTrendDashboard() {
    this.setData({ isLoading: true });

    try {
      const dashboard = await trendService.getTrendDashboard({
        type: this.data.activeType,
        feedingDays: this.data.feedingDays,
        diaperDays: this.data.diaperDays,
        jaundiceDays: this.data.jaundiceDays,
        endDate: formatDate(new Date())
      });

      this.setData({
        dashboard,
        typeOptions: dashboard.typeOptions,
        rangeOptions: dashboard.rangeOptions,
        activeRangeValue: this.getActiveRange(),
        viewModel: toViewModel(dashboard),
        isLoading: false
      }, () => {
        this.drawTrendChart(dashboard);
      });
    } catch (error) {
      this.setData({ isLoading: false });
      wx.showToast({ title: '趋势加载失败', icon: 'none' });
    }
  },

  onTypeTap(event) {
    const activeType = event.currentTarget.dataset.type;

    this.setData({ activeType }, () => {
      this.loadTrendDashboard();
    });
  },

  onRangeTap(event) {
    const value = event.currentTarget.dataset.value;
    const patch = {};

    if (this.data.activeType === 'jaundice') {
      patch.jaundiceDays = Number(value);
    } else if (this.data.activeType === 'diaper') {
      patch.diaperDays = Number(value);
    } else {
      patch.feedingDays = Number(value);
    }

    this.setData(patch, () => {
      this.loadTrendDashboard();
    });
  },

  async onCalendarCellTap(event) {
    const selectedDate = event.currentTarget.dataset.date;

    if (!this.data.dashboard || !selectedDate) {
      return;
    }

    const viewModel = toViewModel(this.data.dashboard, selectedDate);
    const selectedCell = viewModel.calendarCells.find((item) => item.date === selectedDate);

    this.setData({ viewModel });

    if (!selectedCell) {
      return;
    }

    try {
      const detail = await getTrendDailyDetail({
        type: this.data.activeType,
        date: selectedDate
      });

      this.setData({
        detailModal: Object.assign({}, detail, { visible: true })
      });
    } catch (error) {
      wx.showToast({ title: '明细加载失败', icon: 'none' });
    }
  },

  onCloseDetailModal() {
    this.setData({
      'detailModal.visible': false
    });
  },

  noop() {},

  async onPullDownRefresh() {
    await this.loadTrendDashboard();
    if (typeof wx !== 'undefined' && typeof wx.stopPullDownRefresh === 'function') {
      wx.stopPullDownRefresh();
    }
  }
});
