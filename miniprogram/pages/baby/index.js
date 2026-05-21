const babyService = require('../../services/babyService');
const { persistAvatarLocally } = require('../../utils/avatarFile');

const defaultForm = {
  nickname: '',
  avatarUrl: '',
  birthDate: '',
  birthTime: '',
  currentWeightKg: '',
  gestationalWeeks: '',
  gender: '',
  birthWeightKg: '',
  isPremature: false,
  hasJaundiceRiskFactors: false,
  note: ''
};

Page({
  data: {
    form: defaultForm,
    status: null,
    genderOptions: ['未选择', '女宝', '男宝'],
    genderValues: ['', 'female', 'male'],
    genderIndex: 0,
    errorText: '',
    isSaving: false
  },

  onLoad() {
    this.loadProfile();
  },

  onShow() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 });
    }
  },

  async loadProfile() {
    const result = await babyService.getBabyProfile();
    if (!result.profile) {
      this.setData({
        form: Object.assign({}, defaultForm),
        status: result.status,
        genderIndex: 0
      });
      return;
    }

    this.setData({
      form: Object.assign({}, defaultForm, result.profile, {
        currentWeightKg: result.profile.currentWeightKg === null ? '' : String(result.profile.currentWeightKg),
        birthWeightKg: result.profile.birthWeightKg === null ? '' : String(result.profile.birthWeightKg),
        gestationalWeeks: result.profile.gestationalWeeks === null ? '' : String(result.profile.gestationalWeeks)
      }),
      status: result.status,
      genderIndex: this.data.genderValues.indexOf(result.profile.gender)
    });
  },

  onFieldInput(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value,
      errorText: ''
    }, () => {
      this.refreshStatusPreview();
    });
  },

  onDateChange(event) {
    this.setData({
      'form.birthDate': event.detail.value,
      errorText: ''
    }, () => {
      this.refreshStatusPreview();
    });
  },

  onTimeChange(event) {
    this.setData({
      'form.birthTime': event.detail.value,
      errorText: ''
    }, () => {
      this.refreshStatusPreview();
    });
  },

  onGenderChange(event) {
    const genderIndex = Number(event.detail.value);
    this.setData({
      genderIndex,
      'form.gender': this.data.genderValues[genderIndex],
      errorText: ''
    });
  },

  async onChooseAvatar(event) {
    const avatarUrl = await persistAvatarLocally(event.detail.avatarUrl || '');
    this.setData({
      'form.avatarUrl': avatarUrl,
      errorText: ''
    });
  },

  onSwitchChange(event) {
    const field = event.currentTarget.dataset.field;
    this.setData({
      [`form.${field}`]: event.detail.value,
      errorText: ''
    }, () => {
      this.refreshStatusPreview();
    });
  },

  refreshStatusPreview() {
    this.setData({
      status: babyService.getBabyProfileStatus(this.data.form)
    });
  },

  async onSaveTap() {
    this.setData({ isSaving: true, errorText: '' });

    try {
      const result = await babyService.saveBabyProfile(this.data.form);
      this.setData({
        form: Object.assign({}, this.data.form, result.profile, {
          currentWeightKg: String(result.profile.currentWeightKg),
          birthWeightKg: result.profile.birthWeightKg === null ? '' : String(result.profile.birthWeightKg),
          gestationalWeeks: String(result.profile.gestationalWeeks)
        }),
        status: result.status,
        isSaving: false
      });
      wx.showToast({ title: '已保存', icon: 'success' });
    } catch (error) {
      const errorText = error.code === 'BABY_PROFILE_VALIDATION_FAILED'
        ? '请补全昵称、出生日期、出生时间、当前体重和出生孕周'
        : '保存失败';
      this.setData({ errorText, isSaving: false });
      wx.showToast({ title: errorText, icon: 'none' });
    }
  }
});
