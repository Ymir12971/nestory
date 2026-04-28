# 技术方向更新同步 · 致 Vicol

**日期：** 2026-04-25
**发送方：** Justin
**主题：** 技术栈确认为双端（iOS + Android），相关设计规范影响说明

---

Vicol，有几个技术方向的更新需要同步给你，会影响设计规范的理解和后续的标注方式。

## 1. App 是 iOS + Android 双端，不是纯 iOS

技术栈选的是 React Native + Expo，一套代码同时编译出 iOS 和 Android 两个原生应用。这个决定是在 dev 文档里确认的，但产品文档（README 和 PRD）之前一直写的是"iOS app"，现在已经统一修正过来了。

**对你的影响：**

设计稿目前是按 iOS 规范做的，整体没问题，但有几类交互在 Android 上会有差异，后续需要留意：

- **返回手势**：iOS 是右滑返回，Android 是系统返回键或左滑，Bottom Sheet 的关闭手势也有差异
- **底部安全区**：iOS 有 Home Indicator，Android 各机型底部安全区不一样，需要适配
- **系统弹窗风格**：比如相机/相册权限弹窗、Action Sheet，iOS 和 Android 样式不同，RN 会自动走各自平台的原生样式，但如果 Figma 里画的是 iOS 专属样式，开发侧会按平台分别处理，不需要你出两套稿，知道就好
- **字体**：iOS 默认 SF Pro，Android 默认 Roboto，RN 可以统一引入自定义字体，如果 Nestory 有品牌字体需求，需要提前确认

MVP 阶段建议以 iOS 设计稿为主，Android 的平台差异由开发侧处理，不需要你单独出 Android 稿。如果某些交互你觉得需要特别说明，可以在 Figma annotation 里注明"iOS/Android 行为不同，开发按平台处理"。

---

## 2. 图标系统调整

原来 README 写的是把 Remix Icon 封装成 SF Symbols 格式、引入 Xcode Assets Catalog，这是纯 iOS 的做法，现在已经更新了。

新的方案是直接用 Remix Icon 的 React Native 方案，双端通用。**对你没有影响**——Figma 里继续用 Remix Icon 命名就好，图标名称和代码里保持一致这条规则不变。

唯一要注意的是，**不要**在设计稿里用 SF Symbols（苹果原生图标集），因为 SF Symbols 只能在 iOS 上用，Android 不支持。

---

## 3. 组件库原则不变

薄封装 + Design Token 驱动的方向没有变，只是底层实现从 SwiftUI 换成了 React Native 原生控件。对你的设计工作完全没有影响，Token 文件（`08-Nestory_DesignTokens.json`）继续作为颜色/尺寸/字号的唯一来源。

---

## 4. Story 分享页（H5）独立

这个之前文档里有写，再确认一下：Story 详情页是独立的 H5 页面，用 Next.js 做，部署在 Vercel。App 内通过 WebView 内嵌，外部分享链接直接打开。这部分和 App 是两套代码，但视觉规范一致，如果后续要出 Story H5 的设计稿，需要单独在 Figma 里处理。

---

有任何问题随时说，我们对齐一下再继续推进。
