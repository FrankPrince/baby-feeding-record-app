# 宝宝喂养记录小程序技术架构

## 1. 技术方案选择

第一版选择：

- 技术底座：微信原生小程序
- 数据策略：本地存储优先，不做登录和云同步
- 架构思想：借鉴现代前端分层方式，保留 `models`、`services`、`repositories`、`rules` 等工程目录

这个方案的目标是：第一版足够轻、足够快、适合家庭自用，同时不把后续云同步、多宝宝、多成员协作的扩展路径堵死。

## 2. 方案定位

本项目第一版是一个面向新生儿家庭自用的微信小程序，核心能力包括：

- 单宝宝档案
- 喂养记录
- 大小便记录
- 黄疸记录
- 今日概览
- 趋势图
- 本地数据存储

第一版不包含：

- 用户登录
- 云同步
- 多宝宝管理
- 家庭成员共享
- 数据导出
- 提醒功能

但所有核心数据结构需要提前保留 `babyId`、`syncStatus`、`schemaVersion`、`deletedAt` 等字段，方便后续迁移到云端。

## 3. 架构原则

### 3.1 页面只负责交互和展示

页面层只处理：

- 用户输入
- 页面跳转
- 数据展示
- 表单校验提示
- 调用 service 获取或保存数据

页面不直接写复杂统计逻辑，不直接判断奶量是否达标，也不直接实现黄疸风险规则。

### 3.2 业务逻辑集中在 services

`services` 负责组织业务流程，例如：

- 保存喂养记录
- 生成今日概览
- 查询某日期的历史记录
- 计算趋势图数据
- 编辑和删除记录

页面调用 service，service 再调用 repository 和 rules。

### 3.3 数据访问集中在 repositories

`repositories` 负责屏蔽底层存储方式。

第一版使用微信本地存储：

- `wx.setStorage`
- `wx.getStorage`
- `wx.removeStorage`

后续如果迁移到微信云开发或 CloudBase，只需要新增或替换 repository，不应该大面积改页面。

### 3.4 健康判断集中在 rules

`rules` 负责所有可独立测试的判断规则：

- 奶量建议区间计算
- 今日奶量状态判断
- 黄疸平均值计算
- 黄疸风险等级判断
- 大小便特殊颜色提示

所有涉及健康风险的文案都必须保持克制，只作为家庭记录和观察参考，不输出诊断结论。

## 4. 推荐目录结构

```text
miniprogram/
  app.js
  app.json
  app.wxss

  pages/
    today/
      index.wxml
      index.wxss
      index.js
      index.json
    record/
      index.wxml
      index.wxss
      index.js
      index.json
    trends/
      index.wxml
      index.wxss
      index.js
      index.json
    baby/
      index.wxml
      index.wxss
      index.js
      index.json

  components/
    record-card/
    date-filter/
    trend-chart/
    risk-badge/
    empty-state/

  models/
    baby.js
    feeding.js
    diaper.js
    jaundice.js
    common.js

  services/
    babyService.js
    feedingService.js
    diaperService.js
    jaundiceService.js
    overviewService.js
    trendService.js

  repositories/
    storageKeys.js
    localRepository.js
    babyRepository.js
    feedingRepository.js
    diaperRepository.js
    jaundiceRepository.js

  rules/
    feedingRule.js
    diaperRule.js
    jaundiceRule.js

  utils/
    date.js
    id.js
    number.js
```

如果项目后续启用 TypeScript，可以把 `.js` 平滑替换为 `.ts`，目录结构不需要改变。

## 5. 分层职责

### 5.1 pages

页面层对应底部 Tab 和业务入口。

建议底部 Tab：

- 今日
- 记录
- 趋势
- 宝宝

页面职责：

- 今日页：展示今日总奶量、喂养次数、尿便次数、最近黄疸状态、快捷记录入口
- 记录页：新增喂养、大小便、黄疸记录
- 趋势页：展示近 7 / 14 / 30 天趋势
- 宝宝页：创建和编辑宝宝档案

### 5.2 components

组件层沉淀可复用 UI。

建议组件：

- `record-card`：历史记录卡片
- `date-filter`：日期筛选
- `trend-chart`：趋势图容器
- `risk-badge`：风险状态标识
- `empty-state`：空状态展示

组件只处理 UI 表现，不直接访问本地存储。

### 5.3 models

模型层定义数据结构和默认值。

核心模型：

- `BabyProfile`
- `FeedingRecord`
- `DiaperRecord`
- `JaundiceRecord`
- `BaseRecord`

所有记录统一保留通用字段：

```text
id
localId
babyId
createdAt
updatedAt
deletedAt
syncStatus
createdBy
schemaVersion
```

### 5.4 services

业务层负责把 repository、rules 和页面需求串起来。

示例：

- `babyService`：宝宝档案创建、编辑、读取
- `feedingService`：喂养记录新增、编辑、删除、每日统计
- `diaperService`：大小便记录新增、编辑、删除、每日统计
- `jaundiceService`：黄疸记录新增、平均值计算、风险标志生成
- `overviewService`：今日概览聚合
- `trendService`：趋势图数据聚合

### 5.5 repositories

数据层负责读写数据。

第一版 repository 基于本地存储实现：

- 宝宝档案：单对象存储
- 喂养记录：数组存储
- 大小便记录：数组存储
- 黄疸记录：数组存储

删除记录建议采用软删除：

- 设置 `deletedAt`
- 查询时默认过滤已删除记录

这样未来做云同步时，可以保留删除记录的同步语义。

### 5.6 rules

规则层负责纯计算逻辑。

建议规则：

- `feedingRule`
  - 根据当前体重和日龄/月龄计算每日建议奶量区间
  - 判断今日奶量状态：偏低 / 达标 / 偏高 / 无法判断

- `diaperRule`
  - 判断是否出现需关注颜色
  - 统计尿量、粪量分布

- `jaundiceRule`
  - 计算 3 个黄疸值平均值
  - 根据出生后小时数、孕周、风险因素、测量方式和黄疸值判断风险等级
  - 输出：正常 / 低危 / 中危 / 高危 / 无法判断 / 不适用

规则层应尽量写成纯函数，方便后续补单元测试。

## 6. 数据流

### 6.1 新增记录

```text
页面表单
  -> service 校验和组装数据
  -> rules 计算派生字段
  -> repository 保存到本地
  -> 页面刷新今日概览和趋势数据
```

示例：新增黄疸记录

```text
record 页面输入 3 个黄疸值
  -> jaundiceService 校验必填项
  -> jaundiceRule 计算平均值
  -> jaundiceRule 判断风险等级
  -> jaundiceRepository 保存
  -> overviewService 重新生成首页黄疸状态
```

### 6.2 今日概览

```text
today 页面
  -> overviewService.getTodayOverview()
  -> babyRepository 获取宝宝档案
  -> feedingRepository 获取今日喂养记录
  -> diaperRepository 获取今日大小便记录
  -> jaundiceRepository 获取最近黄疸记录
  -> rules 生成状态判断
  -> 返回页面展示模型
```

### 6.3 趋势图

```text
trends 页面选择时间范围
  -> trendService.getTrendData(range)
  -> repositories 获取对应时间范围记录
  -> services 按自然日聚合
  -> 返回图表所需数据
```

## 7. 本地存储设计

建议存储 key：

```text
baby_profile
feeding_records
diaper_records
jaundice_records
app_meta
```

`app_meta` 可用于保存：

- 当前 schemaVersion
- 首次使用时间
- 最近一次数据迁移时间

第一版可以使用数组存储记录。由于家庭自用的数据量不大，足以支撑 MVP。

后续如果记录量增长，再考虑按月份分桶：

```text
feeding_records_2026_05
diaper_records_2026_05
jaundice_records_2026_05
```

## 8. 未来扩展预留

### 8.1 云同步

后续接入微信登录和云开发时，可以新增：

```text
repositories/
  cloudRepository.js
  syncRepository.js
services/
  syncService.js
```

同步相关字段：

```text
userId
familyId
cloudId
deviceId
lastSyncedAt
syncStatus
```

### 8.2 多宝宝

第一版只支持一个宝宝，但记录中保留 `babyId`。

后续多宝宝扩展时：

- `baby_profile` 改为 `baby_profiles`
- 当前宝宝增加 `activeBabyId`
- 所有查询按 `babyId` 过滤

### 8.3 提醒功能

后续提醒功能可以独立增加：

```text
services/
  reminderService.js
models/
  reminder.js
```

提醒不应和喂养、黄疸记录强耦合。

## 9. 关键取舍

### 优势

- 技术底座简单，适合快速完成 MVP。
- 微信原生小程序兼容性好，运行稳定。
- 本地存储不依赖登录和后端，适合家庭自用。
- 分层清晰，后续迁移云同步时改动范围可控。
- 健康判断逻辑独立，方便测试和调整规则。

### 劣势

- 原生小程序工程化能力弱于 React / Taro。
- 后续如果要多端复用，迁移成本会高于 Taro 方案。
- 本地存储无法解决多设备同步和数据恢复。
- 趋势图、复杂表单、历史筛选需要手动维护更多组件。

## 10. 实施建议

建议按以下顺序开发：

1. 搭建微信原生小程序基础目录。
2. 先定义 `models` 和本地存储 `repositories`。
3. 实现宝宝档案。
4. 实现喂养记录和今日喂养统计。
5. 实现大小便记录和颜色提示。
6. 实现黄疸记录、平均值和风险标志。
7. 实现今日概览聚合。
8. 实现趋势图。
9. 补充历史记录的编辑、删除和日期筛选。

第一版最重要的是记录链路稳定、首页状态清楚、黄疸提示克制可靠。页面可以先保持朴素，但目录和数据结构要从一开始保持可扩展。
