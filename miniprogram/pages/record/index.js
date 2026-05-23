const babyService = require('../../services/babyService');
const feedingService = require('../../services/feedingService');
const diaperService = require('../../services/diaperService');
const { formatDate, formatTime } = require('../../utils/date');

const AMOUNT_LABELS = {
  small: '小',
  medium: '中',
  large: '大'
};

const DIAPER_TYPE_LABELS = {
  pee: '尿尿',
  poop: '便便',
  both: '尿尿 + 便便'
};

const DIAPER_COLOR_LABELS = {
  yellow: '黄色',
  green: '绿色',
  brown: '棕色',
  black: '黑色',
  red: '红色',
  white: '白色',
  gray_white: '灰白色',
  other: '其他'
};

function getNowParts() {
  const now = new Date();
  return {
    date: formatDate(now),
    time: formatTime(now)
  };
}

function createDefaultFeedingForm() {
  const now = getNowParts();
  return {
    feedingType: 'breast',
    amountMl: '',
    feedingDate: now.date,
    feedingClock: now.time,
    note: ''
  };
}

function createDefaultDiaperForm() {
  const now = getNowParts();
  return {
    recordType: 'pee',
    peeAmount: '',
    poopAmount: '',
    color: '',
    diaperDate: now.date,
    diaperClock: now.time,
    note: ''
  };
}

function createFeedingPayload(form) {
  return {
    feedingType: form.feedingType,
    amountMl: form.amountMl,
    feedingTime: `${form.feedingDate}T${form.feedingClock}:00`,
    note: form.note
  };
}

function createDiaperPayload(form) {
  return {
    recordType: form.recordType,
    peeAmount: form.peeAmount,
    poopAmount: form.poopAmount,
    color: form.color,
    recordTime: `${form.diaperDate}T${form.diaperClock}:00`,
    note: form.note
  };
}

function createAmountEditPayload(record, amountMl) {
  return {
    feedingType: record.feedingType,
    amountMl,
    feedingTime: record.feedingTime,
    note: record.note || ''
  };
}

function toFeedingRecordView(record) {
  return Object.assign({}, record, {
    displayDate: formatDate(record.feedingTime),
    displayClock: formatTime(record.feedingTime)
  });
}

function toDiaperRecordView(record) {
  const parts = [];

  if (record.peeAmount) {
    parts.push(`尿量${AMOUNT_LABELS[record.peeAmount] || record.peeAmount}`);
  }

  if (record.poopAmount) {
    parts.push(`粪量${AMOUNT_LABELS[record.poopAmount] || record.poopAmount}`);
  }

  return Object.assign({}, record, {
    displayDate: formatDate(record.recordTime),
    displayClock: formatTime(record.recordTime),
    recordTypeText: DIAPER_TYPE_LABELS[record.recordType] || record.recordType,
    amountText: parts.join(' · '),
    colorText: DIAPER_COLOR_LABELS[record.color] || record.color,
    attentionRequired: record.colorNotice && record.colorNotice.attentionRequired,
    attentionText: record.colorNotice && record.colorNotice.attentionRequired ? '需关注' : ''
  });
}

Page({
  data: {
    tabs: ['喂养', '大小便', '黄疸'],
    activeTab: 0,
    feedingTypeOptions: [
      { value: 'breast', label: '母乳' },
      { value: 'formula', label: '奶粉' }
    ],
    diaperTypeOptions: [
      { value: 'pee', label: '尿尿' },
      { value: 'poop', label: '便便' },
      { value: 'both', label: '尿尿 + 便便' }
    ],
    diaperAmountOptions: [
      { value: 'small', label: '小' },
      { value: 'medium', label: '中' },
      { value: 'large', label: '大' }
    ],
    diaperColorOptions: [
      { value: 'yellow', label: '黄色' },
      { value: 'green', label: '绿色' },
      { value: 'brown', label: '棕色' },
      { value: 'black', label: '黑色' },
      { value: 'red', label: '红色' },
      { value: 'gray_white', label: '灰白色' },
      { value: 'white', label: '白色' },
      { value: 'other', label: '其他' }
    ],
    quickAmounts: [30, 60, 90, 120],
    feedingForm: createDefaultFeedingForm(),
    diaperForm: createDefaultDiaperForm(),
    feedingFilterDate: getNowParts().date,
    diaperFilterDate: getNowParts().date,
    feedingRecords: [],
    diaperRecords: [],
    feedingSummary: null,
    diaperSummary: null,
    feedingErrorText: '',
    diaperErrorText: '',
    diaperEditingRecordId: '',
    activeSwipeId: '',
    swipeStartX: 0,
    amountEditVisible: false,
    amountEditRecordId: '',
    amountEditValue: '',
    amountEditErrorText: '',
    isSavingAmountEdit: false,
    isSavingFeeding: false,
    isSavingDiaper: false
  },

  onLoad() {
    this.loadFeedingData();
    this.loadDiaperData();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 });
    }
    this.loadFeedingData();
    this.loadDiaperData();
  },

  onTabTap(event) {
    this.setData({
      activeTab: Number(event.currentTarget.dataset.index)
    });
  },

  async loadDiaperData() {
    const listResult = await diaperService.listDiaperRecords({
      date: this.data.diaperFilterDate
    });
    const diaperSummary = await diaperService.getDailyDiaperSummary({
      date: this.data.diaperFilterDate
    });

    this.setData({
      diaperRecords: listResult.records.map(toDiaperRecordView),
      diaperSummary
    });
  },

  noop() {},

  async loadFeedingData() {
    const profileResult = await babyService.getBabyProfile();
    const listResult = await feedingService.listFeedingRecords({
      date: this.data.feedingFilterDate
    });
    const feedingSummary = await feedingService.getDailyFeedingSummary({
      date: this.data.feedingFilterDate,
      babyProfile: profileResult.profile
    });

    this.setData({
      feedingRecords: listResult.records.map(toFeedingRecordView),
      feedingSummary
    });
  },

  onFeedingTypeTap(event) {
    this.setData({
      'feedingForm.feedingType': event.currentTarget.dataset.value,
      feedingErrorText: ''
    });
  },

  onQuickAmountTap(event) {
    this.setData({
      'feedingForm.amountMl': String(event.currentTarget.dataset.amount),
      feedingErrorText: ''
    });
  },

  onFeedingAmountInput(event) {
    this.setData({
      'feedingForm.amountMl': event.detail.value,
      feedingErrorText: ''
    });
  },

  onFeedingNoteInput(event) {
    this.setData({
      'feedingForm.note': event.detail.value,
      feedingErrorText: ''
    });
  },

  onFeedingDateChange(event) {
    this.setData({
      'feedingForm.feedingDate': event.detail.value,
      feedingErrorText: ''
    });
  },

  onFeedingTimeChange(event) {
    this.setData({
      'feedingForm.feedingClock': event.detail.value,
      feedingErrorText: ''
    });
  },

  onFeedingFilterDateChange(event) {
    this.setData({
      feedingFilterDate: event.detail.value
    }, () => {
      this.loadFeedingData();
    });
  },

  onDiaperTypeTap(event) {
    const recordType = event.currentTarget.dataset.value;
    const nextForm = Object.assign({}, this.data.diaperForm, { recordType });

    if (recordType === 'pee') {
      nextForm.poopAmount = '';
    }

    if (recordType === 'poop') {
      nextForm.peeAmount = '';
    }

    this.setData({
      diaperForm: nextForm,
      diaperErrorText: ''
    });
  },

  onDiaperAmountTap(event) {
    const field = `diaperForm.${event.currentTarget.dataset.field}`;
    this.setData({
      [field]: event.currentTarget.dataset.value,
      diaperErrorText: ''
    });
  },

  onDiaperColorTap(event) {
    this.setData({
      'diaperForm.color': event.currentTarget.dataset.value,
      diaperErrorText: ''
    });
  },

  onDiaperDateChange(event) {
    this.setData({
      'diaperForm.diaperDate': event.detail.value,
      diaperErrorText: ''
    });
  },

  onDiaperTimeChange(event) {
    this.setData({
      'diaperForm.diaperClock': event.detail.value,
      diaperErrorText: ''
    });
  },

  onDiaperNoteInput(event) {
    this.setData({
      'diaperForm.note': event.detail.value,
      diaperErrorText: ''
    });
  },

  onDiaperFilterDateChange(event) {
    this.setData({
      diaperFilterDate: event.detail.value
    }, () => {
      this.loadDiaperData();
    });
  },

  onResetFeedingForm() {
    this.setData({
      feedingForm: createDefaultFeedingForm(),
      activeSwipeId: '',
      feedingErrorText: ''
    });
  },

  onResetDiaperForm() {
    this.setData({
      diaperForm: createDefaultDiaperForm(),
      diaperEditingRecordId: '',
      activeSwipeId: '',
      diaperErrorText: ''
    });
  },

  async onSaveFeedingTap() {
    this.setData({ isSavingFeeding: true, feedingErrorText: '' });

    try {
      const payload = createFeedingPayload(this.data.feedingForm);

      await feedingService.createFeedingRecord(payload);

      this.setData({
        feedingForm: createDefaultFeedingForm(),
        activeSwipeId: '',
        isSavingFeeding: false
      });
      await this.loadFeedingData();
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (error) {
      const feedingErrorText = error.code === 'FEEDING_RECORD_VALIDATION_FAILED'
        ? '请输入大于 0 的奶量'
        : '保存失败';
      this.setData({ feedingErrorText, isSavingFeeding: false });
      wx.showToast({ title: feedingErrorText, icon: 'none' });
    }
  },

  async onSaveDiaperTap() {
    this.setData({ isSavingDiaper: true, diaperErrorText: '' });

    try {
      const payload = createDiaperPayload(this.data.diaperForm);
      const wasEditing = Boolean(this.data.diaperEditingRecordId);

      if (wasEditing) {
        await diaperService.updateDiaperRecord(this.data.diaperEditingRecordId, payload);
      } else {
        await diaperService.createDiaperRecord(payload);
      }

      this.setData({
        diaperForm: createDefaultDiaperForm(),
        diaperEditingRecordId: '',
        activeSwipeId: '',
        isSavingDiaper: false
      });
      await this.loadDiaperData();
      wx.showToast({ title: wasEditing ? '已修改' : '已保存', icon: 'success' });
    } catch (error) {
      const diaperErrorText = error.code === 'DIAPER_RECORD_VALIDATION_FAILED'
        ? '请补全当前类型需要的量和颜色'
        : '保存失败';
      this.setData({ diaperErrorText, isSavingDiaper: false });
      wx.showToast({ title: diaperErrorText, icon: 'none' });
    }
  },

  onEditFeedingTap(event) {
    const recordId = event.currentTarget.dataset.id;
    const record = this.data.feedingRecords.find((item) => item.id === recordId);

    if (!record) {
      return;
    }

    this.setData({
      amountEditVisible: true,
      amountEditRecordId: record.id,
      amountEditValue: String(record.amountMl),
      amountEditErrorText: '',
      activeSwipeId: '',
      feedingErrorText: ''
    });
  },

  onEditDiaperTap(event) {
    const recordId = event.currentTarget.dataset.id;
    const record = this.data.diaperRecords.find((item) => item.id === recordId);

    if (!record) {
      return;
    }

    this.setData({
      diaperEditingRecordId: record.id,
      diaperForm: {
        recordType: record.recordType,
        peeAmount: record.peeAmount || '',
        poopAmount: record.poopAmount || '',
        color: record.color,
        diaperDate: formatDate(record.recordTime),
        diaperClock: formatTime(record.recordTime),
        note: record.note || ''
      },
      activeSwipeId: '',
      diaperErrorText: '',
      activeTab: 1
    });
  },

  onAmountEditInput(event) {
    this.setData({
      amountEditValue: event.detail.value,
      amountEditErrorText: ''
    });
  },

  onCancelAmountEdit() {
    this.setData({
      amountEditVisible: false,
      amountEditRecordId: '',
      amountEditValue: '',
      amountEditErrorText: '',
      isSavingAmountEdit: false
    });
  },

  async onSaveAmountEditTap() {
    const record = this.data.feedingRecords.find((item) => item.id === this.data.amountEditRecordId);

    if (!record) {
      this.onCancelAmountEdit();
      return;
    }

    this.setData({ isSavingAmountEdit: true, amountEditErrorText: '' });

    try {
      const payload = createAmountEditPayload(record, this.data.amountEditValue);
      await feedingService.updateFeedingRecord(record.id, payload);
      this.setData({
        amountEditVisible: false,
        amountEditRecordId: '',
        amountEditValue: '',
        isSavingAmountEdit: false
      });
      await this.loadFeedingData();
      wx.showToast({ title: '已修改', icon: 'success' });
    } catch (error) {
      const amountEditErrorText = error.code === 'FEEDING_RECORD_VALIDATION_FAILED'
        ? '请输入大于 0 的奶量'
        : '修改失败';
      this.setData({ amountEditErrorText, isSavingAmountEdit: false });
      wx.showToast({ title: amountEditErrorText, icon: 'none' });
    }
  },

  onFeedingRecordTouchStart(event) {
    this.setData({
      swipeStartX: event.touches && event.touches[0] ? event.touches[0].clientX : 0
    });
  },

  onFeedingRecordTouchEnd(event) {
    const recordId = event.currentTarget.dataset.id;
    const endX = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : this.data.swipeStartX;
    const deltaX = endX - this.data.swipeStartX;

    if (deltaX < -32) {
      this.setData({ activeSwipeId: recordId });
      return;
    }

    if (deltaX > 24) {
      this.setData({ activeSwipeId: '' });
    }
  },

  onDiaperRecordTouchStart(event) {
    this.setData({
      swipeStartX: event.touches && event.touches[0] ? event.touches[0].clientX : 0
    });
  },

  onDiaperRecordTouchEnd(event) {
    const recordId = event.currentTarget.dataset.id;
    const endX = event.changedTouches && event.changedTouches[0] ? event.changedTouches[0].clientX : this.data.swipeStartX;
    const deltaX = endX - this.data.swipeStartX;

    if (deltaX < -32) {
      this.setData({ activeSwipeId: recordId });
      return;
    }

    if (deltaX > 24) {
      this.setData({ activeSwipeId: '' });
    }
  },

  async onDeleteFeedingTap(event) {
    const recordId = event.currentTarget.dataset.id;
    await feedingService.deleteFeedingRecord(recordId);
    this.setData({ activeSwipeId: '' });
    await this.loadFeedingData();
    wx.showToast({ title: '已删除', icon: 'success' });
  },

  async onDeleteDiaperTap(event) {
    const recordId = event.currentTarget.dataset.id;
    await diaperService.deleteDiaperRecord(recordId);
    this.setData({ activeSwipeId: '' });
    await this.loadDiaperData();
    wx.showToast({ title: '已删除', icon: 'success' });
  }
});
