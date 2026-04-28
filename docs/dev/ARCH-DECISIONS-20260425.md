# 架构与技术选型决策文档

**日期：** 2026-04-25
**参与方：** Justin（开发）
**状态：** 已确认，可进入实施阶段

---

## 0. 核心目标

不只是做完 Nestory，而是做一个**可复用的产品底座**。下一个产品 fork 配置即可复用订阅、AI 生成、媒体上传等所有底层能力，不重写框架。

---

## 1. 平台与端

| 端 | 技术 | 说明 |
|---|---|---|
| iOS + Android | React Native + Expo | 一套代码双端编译，Managed Workflow 起步 |
| Story H5 | Next.js + Framer Motion | Story 分享页，SSR 支持 Open Graph，部署 Vercel |
| 后端 API | Fastify + TypeScript | 每个产品独立部署，不共用后端服务 |

**说明：**
- Expo 选 **Managed Workflow**，遇到官方插件覆盖不了的原生需求再迁移到 Bare，迁移成本低
- 各产品独立部署，共享代码库但各自运行，不引入多租户复杂度

---

## 2. 仓库结构

采用 **Monorepo**，工具选 **pnpm workspace + Turborepo**。

**选择理由：**
- 前后端均为 TypeScript，类型可共享，避免接口不一致
- 改一个接口前后端同步改，不用跨仓库协调
- 底层能力修复一次，所有产品同时受益
- 当前团队规模小，独立仓库的权限隔离优势用不上

```
base/
  apps/
    nestory-mobile/     ← React Native + Expo（iOS + Android）
    nestory-web/        ← Next.js + Framer Motion（Story H5）
    nestory-api/        ← Fastify + TypeScript（后端 API）
  packages/
    core/               ← 订阅状态机、RevenueCat 封装、权限校验
    ai-pipeline/        ← AI 生成管道（独立包）
    media/              ← 媒体上传、压缩、CDN
    push/               ← 推送调度
    ui/                 ← 通用基础组件 + Token 系统
    db/                 ← Prisma schema、通用表（users / subscriptions）
    config/             ← Nestory 业务配置（权益表、Paywall 映射、Tag 预设等）
    types/              ← 跨包共享 TypeScript 类型定义
```

**下一个产品接入方式：**
```
  apps/
    petory-mobile/      ← 新产品，直接复用 packages/ 所有能力
    petory-web/
    petory-api/
  packages/
    config/             ← 新增该产品的配置文件夹
```

---

## 3. 分层原则

**判断标准：换一个完全不同的产品，这段代码还能用吗？**

| 层 | 位置 | 内容 |
|---|---|---|
| 底座（可复用） | `packages/` | 用户系统、订阅状态机、RevenueCat、媒体上传、AI 管道、推送调度、通用组件、Token 系统 |
| 业务配置层 | `packages/config/` | 权益配额、Paywall 变体内容、Tag 预设、AI Prompt 模板、推送文案 |
| 产品业务层 | `apps/nestory-*/` | 所有页面、Memory / Story / Highlight 数据模型、产品专属逻辑 |

---

## 4. 关键技术选型

| 领域 | 选型 | 说明 |
|---|---|---|
| 移动端框架 | React Native + Expo（Managed） | 双端通用，官方插件覆盖主要原生需求 |
| H5 渲染 | Next.js + Framer Motion | SSR + 动效，Vercel 部署 |
| 后端框架 | Fastify + TypeScript | 轻量，逻辑分层，单服务部署 |
| 数据库 | PostgreSQL + Prisma | JSONB 存 Story Schema，类型安全 |
| 任务队列 | BullMQ | AI Story 生成异步任务 |
| IAP（订阅） | RevenueCat | 双端统一，自带订阅状态管理、收据校验、Analytics，省去大量后端自建工作量 |
| 图标 | Remix Icon（RN 方案） | 双端通用，与 Figma 命名保持一致，禁用 SF Symbols |
| 组件库 | 自建薄封装 + RN 原生控件 | 禁止引入第三方 UI 组件库，样式从 Design Token 读 |
| Monorepo 工具 | pnpm workspace + Turborepo | 成熟轻量，一次性配置 |

---

## 5. 明确不做的事

- ❌ 不引入多租户架构，各产品独立部署
- ❌ 不用 SwiftUI / SF Symbols（iOS 专属）
- ❌ 不引入第三方 UI 组件库（NativeBase / React Native Paper 等）
- ❌ 不硬编码颜色 / 尺寸，全部走 Design Token
- ❌ 不在 MVP 之后再抽复用层，底座这次一起建

---

## 6. 待确认事项

- [ ] Expo Managed 是否覆盖所有已知原生需求（相机、相册、推送、IAP）——开始开发前逐一验证
- [ ] RevenueCat 费用与账号由谁注册、管理
- [ ] `packages/db` 的通用表边界：`users` / `subscriptions` 进底座，其余业务表各产品自己维护

---

## 7. 下一步

1. 搭 monorepo 骨架（目录结构、pnpm workspace、Turborepo、TypeScript 基础配置）
2. 建 `packages/types`，用 TypeScript 定义订阅五态、Paywall 路由、权限模型等核心类型
3. 建 `packages/core`，实现订阅状态机和 RevenueCat 封装
