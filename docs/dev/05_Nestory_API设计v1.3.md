# Nestory — API 设计文档

**版本：** v1.3
**日期：** 2026-04-26
**上一版本：** v1.2（2026-04-26）
**依赖文档：** PRD v1.7 · PageStructure v1.6 · SubscriptionRules v1.3 · 技术架构 v1.3 · 数据库设计 v1.7
**编写者：** Justin

### v1.3 变更记录

- **`POST /children` / `GET /children` / `PATCH /children/:id` 响应补全身高体重字段**：新增 `height_cm / height_recorded_at / weight_kg / weight_recorded_at`（均可为 null；recorded_at 由服务端写入请求时间，客户端不传）
- **`POST /shares` 改为 upsert 语义**：先查有效 token，有则 200 复用，无则 201 新建；同一 Story 同时只有一个有效分享链接
- **附录 A 修正 R-10 描述**：`GET /subscriptions/me` 不返回 `downgrade_toast` 标记，降级 Notify 由前端读 `subscription_status` 直接渲染
- **错误码修正**：`PROFILE_SWITCH_RESTRICTED` 描述由"Free/降级用户"改为"Never Paid 用户"（Ended 用户不拦截）

### v1.2 变更记录

- **R-10 降级通知字段移除**：`GET /subscriptions/me` 响应移除 `downgrade_toast` 字段；降级 Notify 由前端读 `subscription_status` 直接渲染，后端无需下发标记
- **Tag 接口对齐 value 模型**（数据库设计 v1.3）：
  - `POST /assets` 和 `PATCH /assets/:id` 的 `tag_ids: UUID[]` 改为 `tag_values: string[]`，传 tag 名称字符串而非 UUID
  - `GET /assets` 响应中 `tags` 由 `{id, name}` 对象数组改为字符串数组
  - `GET /tags` 注明从 config 静态返回，不查 DB
  - 新增 `GET /user/tags`（加载用户自定义 Tag 可复用列表）和 `DELETE /user/tags/:name`（从 library 移除）

### v1.1 变更记录

- `POST /assets` / `GET /assets` / `PATCH /assets/:id` 与新 `asset_files` 子表对齐：上传响应明确 `files[]` 结构
- 新增 `POST /assets` idempotency-key 头部，避免上传重传重复入库
- `POST /highlights` 行为补充：并发场景下后端用 advisory lock 校验 R-04 上限
- 同步上游产品文档版本号（PRD v1.7 / PageStructure v1.6 / SubscriptionRules v1.3）

---

## 总览

### Base URL

```
开发：http://localhost:3000
生产：https://api.nestory.app
```

### 认证

所有接口（除 `/shares/public/:token`）均需 Bearer Token：

```
Authorization: Bearer <supabase_jwt_token>
```

Token 由 Supabase Auth 签发，后端通过 Supabase JWT 验证获取 `user_id`。

### 通用响应格式

**成功**

```json
{
  "data": { ... },
  "meta": { "timestamp": "2026-04-12T08:00:00Z" }
}
```

**错误**

```json
{
  "error": {
    "code": "HIGHLIGHT_LIMIT_REACHED",
    "message": "Free plan allows up to 10 Highlights.",
    "statusCode": 403
  }
}
```

### 错误码一览

| HTTP | code | 触发场景 |
|---|---|---|
| 400 | `VALIDATION_ERROR` | 请求参数不合法 |
| 400 | `EMPTY_MEMORY` | Memory 同时无文字无照片（POST 或 PATCH 删到空） |
| 401 | `UNAUTHORIZED` | Token 缺失或失效 |
| 403 | `HIGHLIGHT_LIMIT_REACHED` | Free 用户 Highlight 数量 ≥ 10（R-04） |
| 403 | `PROFILE_SWITCH_RESTRICTED` | Never Paid 用户尝试切换档案（R-05；Ended 用户不拦截） |
| 403 | `MEMORY_EDIT_RESTRICTED` | 尝试编辑历史月份 Memory（R-08） |
| 403 | `STORY_READ_ONLY` | 尝试修改已生成 Story |
| 404 | `NOT_FOUND` | 资源不存在 |
| 409 | `STORY_ALREADY_EXISTS` | 该月 Story 已存在 |
| 413 | `FILE_TOO_LARGE` | 单张照片超过 10MB（R-07） |
| 422 | `INVALID_FILE_TYPE` | 照片格式不支持（仅 JPEG/PNG/HEIF） |
| 422 | `INVALID_CAPTURED_AT_FUTURE` | `captured_at` 超过当前时间 5 分钟以上 |
| 500 | `INTERNAL_ERROR` | 服务端异常 |

### 分页

列表接口统一使用 cursor-based 分页：

```
GET /stories?limit=20&before=2026-02-01T00:00:00Z
```

响应包含：

```json
{
  "data": [...],
  "pagination": {
    "hasMore": true,
    "nextCursor": "2026-01-01T00:00:00Z"
  }
}
```

---

## 模块索引

| 模块 | 路径前缀 | 接口数 |
|---|---|---|
| 素材 | `/assets` | 3 |
| Story | `/stories` | 3 |
| Highlights | `/highlights` | 4 |
| 孩子档案 | `/children` | 5 |
| 订阅 | `/subscriptions` | 3 |
| 分享 | `/shares` | 3 |
| 用户 | `/users` | 2 |

---

## 1. 素材（Assets）

### POST /assets

上传单条 Memory（照片 + 文字 + Tag + Highlight 标记）。

**Request Headers**

| Header | 必填 | 说明 |
|---|---|---|
| `Authorization` | ✅ | Bearer Token |
| `Idempotency-Key` | ✅ | 客户端生成的 UUID，24h 内重复请求返回原结果（避免弱网重传重复入库）|

**Request**（multipart/form-data）

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `child_id` | string (UUID) | ✅ | 归属孩子档案 |
| `captured_at` | string (ISO 8601) | ✅ | 用户本地时间，月份归档依据 |
| `text_note` | string | — | 文字备注，≤ 500 字符 |
| `tag_values` | string[] | — | Tag 名称字符串数组，可多选；服务端 normalize（trim + lowercase）后写入 `raw_assets.tags TEXT[]`；若包含新 custom tag，自动写入 `user_tag_library` |
| `is_highlight` | boolean | — | 是否标记为 Highlight，默认 false |
| `photos` | File[] | — | 照片文件，最多 10 张，单张 ≤ 10MB，格式 JPEG/PNG/HEIF；保留传入顺序作为 display_order |

> 照片和文字至少提供一项，否则返回 400。

**业务校验**

- `captured_at` > `now() + 5分钟` → `422 INVALID_CAPTURED_AT_FUTURE`
  - 5 分钟容忍设备时钟偏差；`captured_at` 为 TIMESTAMPTZ，已规范化为 UTC，直接与服务端 `Date.now()` 比较
  - 无下限限制：支持用户导入多年前的旧照片

**权限校验**

- `is_highlight=true` 时：后端检查 `highlights` 表中该用户的数量（advisory lock + 事务，见 04 §highlights）
  - Free/降级用户 count ≥ 10 → `403 HIGHLIGHT_LIMIT_REACHED`
  - Premium → 不检查（R-04）
- 历史月份（`captured_at` 不在当月）：正常写入，无限制（R-07）

**文件安全校验**（写入前）

- MIME 真实校验：用 magic bytes 校验，不信任 `Content-Type` header
- 单文件 > 10MB → `413 FILE_TOO_LARGE`
- MIME 非 JPEG/PNG/HEIF → `422 INVALID_FILE_TYPE`
- EXIF GPS 字段统一 strip（隐私默认）
- 写入路径：`raw_assets` 1 行 + `asset_files` N 行（一个事务）

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "child_id": "uuid",
    "asset_type": "mixed",
    "files": [
      {
        "id": "uuid",
        "file_url": "https://supabase.../mia/abc.jpg",
        "mime_type": "image/jpeg",
        "width_px": 3024,
        "height_px": 4032,
        "byte_size": 2458312,
        "display_order": 0
      }
    ],
    "text_note": "她今天第一次爬过来找我",
    "tags": ["Playtime", "第一次独站"],
    "is_highlight": false,
    "captured_at": "2026-03-15T14:30:00+08:00",
    "created_at": "2026-03-15T06:30:00Z"
  }
}
```

> `files` 数组按 `display_order` 升序，对应 `asset_files` 子表行。纯文字 Memory 时 `files: []`。

---

### GET /assets

获取指定孩子的 Memory 列表（H-03 Memory List 数据源）。

**Query Parameters**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `child_id` | string (UUID) | ✅ | 孩子档案 ID |
| `year` | number | — | 筛选年份（用户本地时区） |
| `month` | number | — | 筛选月份（1-12，需配合 year） |
| `limit` | number | — | 默认 50，最大 100 |
| `before` | string (ISO 8601) | — | cursor，返回此时间之前的记录 |

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "asset_type": "mixed",
      "files": [
        {
          "id": "uuid",
          "file_url": "https://supabase.../mia/abc.jpg",
          "mime_type": "image/jpeg",
          "width_px": 3024,
          "height_px": 4032,
          "display_order": 0
        }
      ],
      "text_note": "...",
      "tags": ["Outdoor", "第一次独站"],
      "is_highlight": true,
      "captured_at": "2026-03-15T14:30:00+08:00",
      "is_editable": true
      // true = 属于当月，false = 历史月份只读（R-08）
    }
  ],
  "pagination": { "hasMore": false, "nextCursor": null }
}
```

---

### PATCH /assets/:id

编辑当月 Memory。

**限制：** 历史月份 Memory 不可编辑。后端以 `captured_at` 判断是否属于当月（用户本地时区）。

**Request**（multipart/form-data，所有字段可选，只传需要更新的字段）

| 字段 | 类型 | 说明 |
|---|---|---|
| `text_note` | string | 更新后的文字 |
| `tag_values` | string[] | 全量替换，服务端 normalize 后写入 `raw_assets.tags`；包含新 custom tag 时自动写入 `user_tag_library` |
| `is_highlight` | boolean | 切换 Highlight 标记，true 时检查 R-04 |
| `add_photos` | File[] | 新增照片，append 到 asset_files 末尾，display_order 接续 |
| `remove_file_ids` | string[] (UUID) | 要删除的 asset_files.id 列表，从 Storage 物理删除由 cleanup job 处理 |
| `reorder_file_ids` | string[] (UUID) | 全量重排 asset_files，按数组顺序重写 display_order；与 add_photos 互斥 |

> 删除最后一张照片且 text_note 为空 → `400 EMPTY_MEMORY`。Memory 不允许同时无文字无图。

**权限校验**

- `captured_at` 不在当月 → `403 MEMORY_EDIT_RESTRICTED`
- `is_highlight` 从 false → true 时，检查 Highlight count（R-04）

**Response 200** 返回更新后完整对象，结构同 POST /assets。

---

### DELETE /assets/:id

删除当月 Memory。

**限制：** 历史月份 Memory 不可删除（R-08）。

**Response 204** No Content

---

## 2. Story

### GET /stories

获取指定孩子的 Story 列表（S-01 数据源）。

**Query Parameters**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `child_id` | string (UUID) | ✅ | |
| `limit` | number | — | 默认 20 |
| `before` | string | — | cursor |

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "month_key": "2026-03",
      "status": "completed",
      "list_item_state": "historical_generated",
      // StoryListItemState，前端直接用于渲染，无需自行推断
      "cover_image_url": "https://...",
      "title": "March · 8 months",
      "is_last_free_story": false,
      // Paywall A 触发依据，前端从 S-02 返回时检查
      "watermark_enabled": true,
      "generated_at": "2026-04-01T00:05:32Z"
    },
    {
      "id": null,
      "month_key": "2026-02",
      "status": null,
      "list_item_state": "historical_not_generated",
      "cover_image_url": null,
      "title": "February",
      "is_last_free_story": false,
      "watermark_enabled": null,
      "generated_at": null
    }
  ],
  "current_month": {
    "month_key": "2026-04",
    "list_item_state": "current_in_progress",
    // current_collecting | current_in_progress | current_quota_exhausted
    "memory_count": 12,
    "days_until_generation": 19,
    "milestone_level": "10"
    // 动态引导文案 milestone 档位：null | "1" | "3" | "10" | "15+"
  },
  "pagination": { "hasMore": false, "nextCursor": null }
}
```

> `list_item_state` 由后端计算并返回，前端不自行推断（架构文档 §2）。
> `current_month` 始终返回，置于列表逻辑顶部（S-01 当月状态卡片数据源）。

---

### GET /stories/:id

获取单个 Story 完整内容（S-02 WebView 加载）。

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "month_key": "2026-03",
    "status": "completed",
    "document": {
      // StoryDocument 完整结构（见架构文档 §4）
      "storyId": "uuid",
      "childId": "uuid",
      "monthKey": "2026-03",
      "locale": "en-US",
      "meta": {
        "title": "March · 8 months",
        "coverImageUrl": "https://...",
        "childAgeMonths": 8
      },
      "theme": {
        "themeId": "spring_infant",
        "assignedAt": "2026-04-01T00:05:32Z",
        "version": 1
      },
      "watermark": {
        "enabled": true,
        "text": "Made with Nestory"
      },
      "shareMeta": {
        "ogTitle": "Mia's March Story",
        "ogDescription": "A month of firsts...",
        "ogImageUrl": "https://..."
      },
      "qualityLevel": "medium",
      "sections": [ ... ]
    },
    "generation_meta": {
      // StoryGenerationMeta，调试用，生产环境可按需隐藏
      "promptVersion": "planner-v1.0_brief-v1.0_gen-v1.0",
      "modelName": "gpt-4o-2024-08-06",
      "qualityLevel": "medium",
      "qualityScore": 0.62,
      "generatedAt": "2026-04-01T00:05:32Z",
      "generationDurationMs": 8432,
      "failureTracking": {
        "retries": 0,
        "usedFallback": false
      }
    }
  }
}
```

---

### GET /stories/:id/status

轻量轮询接口，用于生成中状态的进度查询。

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "status": "generating",
    "estimated_seconds_remaining": 25
    // 仅 generating 状态时返回，其余为 null
  }
}
```

---

## 3. Highlights

### POST /highlights

将指定 Memory 标记为 Highlight。

**Request Body**

```json
{
  "asset_id": "uuid",
  "child_id": "uuid",
  "cover_file_id": "uuid"
  // 必填当 asset 含多张照片（由 "Select Highlight Cover" Sheet 选定）
  // 单张照片时可省略，服务端默认取该张 asset_files 行的 id
}
```

**权限校验（R-04）**

```
Premium → 直接创建
Free/降级：
  SELECT COUNT(*) FROM highlights WHERE user_id = $1
  count >= 10 → 403 HIGHLIGHT_LIMIT_REACHED
  count < 10  → 创建，同时 SET raw_assets.is_highlight = true
```

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "asset_id": "uuid",
    "child_id": "uuid",
    "cover_file_id": "uuid",
    // 封面照片对应的 asset_files.id；单张时默认该张，多张时由用户选定
    "title": null,
    // AI 异步提取后写入；生成前为 null；用户可在 HL-02 覆写
    "card_type": "outdoor",
    // 根据 asset 的 tag 匹配，无 tag 时为 "default"
    "rendered_image_url": null,
    // 异步渲染，初始为 null，渲染完成后更新
    "created_at": "2026-03-15T06:30:00Z"
  },
  "meta": {
    "highlight_count": 8,
    "highlight_limit": 10
    // Premium 时 limit 为 null
  }
}
```

---

### GET /highlights

获取指定孩子的 Highlight 列表（HL-01 Gallery 数据源）。

**Query Parameters**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `child_id` | string (UUID) | ✅ | |
| `year` | number | — | 筛选年份 |
| `limit` | number | — | 默认 50 |
| `before` | string | — | cursor |

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "asset_id": "uuid",
      "cover_file_id": "uuid",
      "title": "First steps in the park",
      // AI 提取或用户覆写；null 表示尚未生成
      "card_type": "playtime",
      "rendered_image_url": "https://...",
      "asset": {
        "file_urls": ["https://..."],
        "text_note": "...",
        "tags": ["Playtime", "第一次独站"],
        "captured_at": "2026-03-15T14:30:00+08:00"
      },
      "created_at": "2026-03-15T06:30:00Z"
    }
  ],
  "meta": {
    "highlight_count": 8,
    "highlight_limit": 10
  },
  "pagination": { "hasMore": false, "nextCursor": null }
}
```

---

### GET /highlights/:id

获取单个 Highlight 详情（HL-02 数据源）。

**Response 200** 结构同列表单项，额外包含完整 asset 信息。

---

### DELETE /highlights/:id

取消 Highlight 标记（Remove Highlight，所有用户可用）。

Memory 本身不删除，只取消 Highlight 标记。

**操作：**
1. 删除 `highlights` 行
2. `SET raw_assets.is_highlight = false` WHERE `asset_id = :assetId`

**Response 204** No Content

---

## 4. 孩子档案（Children）

### POST /children

创建孩子档案。

**不做订阅身份校验，Free/Premium 均可创建多个档案（R-05/R-09）。**

**Request Body**

```json
{
  "name": "Mia",
  "birth_date": "2025-08-01",
  "gender": "girl",
  "height_value": 68.5,
  "height_unit": "cm",
  "weight_value": 7.2,
  "weight_unit": "kg",
  "avatar_base64": "data:image/jpeg;base64,..."
}
```

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | ✅ | ≤ 50 字符 |
| `birth_date` | ✅ | YYYY-MM-DD |
| `gender` | — | `boy` / `girl` / `prefer_not_to_say` |
| `height_value` | — | 数字，与 `height_unit` 成对传入 |
| `height_unit` | — | `cm` / `in`；有 `height_value` 时必填 |
| `weight_value` | — | 数字，与 `weight_unit` 成对传入 |
| `weight_unit` | — | `kg` / `lb`；有 `weight_value` 时必填 |
| `avatar_base64` | — | 头像图片 base64 |

**Response 201**

```json
{
  "data": {
    "id": "uuid",
    "name": "Mia",
    "birth_date": "2025-08-01",
    "gender": "girl",
    "avatar_url": "https://...",
    "age_months": 8,
    "height_value": 68.5,
    "height_unit": "cm",
    "height_recorded_at": "2026-04-12T08:00:00Z",
    "weight_value": 7.2,
    "weight_unit": "kg",
    "weight_recorded_at": "2026-04-12T08:00:00Z",
    "created_at": "2026-04-12T08:00:00Z"
  }
}
```

> `height_recorded_at` / `weight_recorded_at`：由服务端在写入时设为请求时间，客户端不传。

---

### GET /children

获取当前用户的所有孩子档案列表。

**Response 200**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Mia",
      "birth_date": "2025-08-01",
      "gender": "girl",
      "avatar_url": "https://...",
      "age_months": 8,
      "height_value": 68.5,
      "height_unit": "cm",
      "height_recorded_at": "2026-04-12T08:00:00Z",
      "weight_value": 7.2,
      "weight_unit": "kg",
      "weight_recorded_at": "2026-04-12T08:00:00Z",
      "is_active": true,
      "created_at": "2026-04-12T08:00:00Z"
    }
  ]
}
```

---

### GET /children/:id

获取单个孩子档案详情。

**Response 200** 结构同列表单项。

---

### PATCH /children/:id

编辑孩子档案信息（所有用户可编辑任意档案，R-05）。

**Request Body**（所有字段可选）

```json
{
  "name": "Mia",
  "birth_date": "2025-08-01",
  "gender": "girl",
  "height_value": 70.0,
  "height_unit": "cm",
  "weight_value": 7.5,
  "weight_unit": "kg",
  "avatar_base64": "data:image/jpeg;base64,..."
}
```

**Response 200** 返回更新后完整档案对象。

---

### PATCH /children/active

切换当前活跃档案（仅 Premium 用户可切换，R-05）。

**Request Body**

```json
{
  "child_id": "uuid"
}
```

**权限校验**

```
trial_active / premium_active / trial_ended / premium_ended → 切换成功
never_paid → 403 PROFILE_SWITCH_RESTRICTED
```

> `Ended` 用户切换放行，兑现"数据不伤害"承诺；UI 层通过 Profile Switcher Ended 变体 + 底部 "Renew Premium" CTA 引导续费，不在后端拦截。

**Response 200**

```json
{
  "data": {
    "active_child_id": "uuid"
  }
}
```

---

## 5. 订阅（Subscriptions）

### GET /subscriptions/me

获取当前用户订阅状态（前端状态同步的主要来源）。

**Response 200**

```json
{
  "data": {
    "plan_type": "free",
    "status": "active",
    "story_quota": 1,
    // 剩余配额，Premium 时为 null
    "expires_at": null,
    "highlight_count": 8,
    "highlight_limit": 10,
    // Premium 时为 null
    "active_child_id": "uuid"
  }
}
```

> 前端在 App 启动、从后台恢复、订阅操作完成后主动调用此接口刷新状态。订阅状态以后端为准，不依赖前端缓存。
> R-10 降级常驻 Notify 的显示逻辑由前端直接读 `subscription_status` 判断（`trial_ended` / `premium_ended` → 显示），无需额外字段。

---

### POST /subscriptions/sync

RevenueCat Webhook 接收接口（仅内部调用，非客户端直接调用）。

RevenueCat 在订阅状态变更时调用，后端更新 `subscriptions` 表。

**Request Headers**

```
X-RevenueCat-Webhook-Secret: <secret>
```

**Response 200** `{ "ok": true }`

---

### GET /subscriptions/paywall-config

获取 Paywall 组件所需的动态配置（trigger 对应的利益点排序）。

**Query Parameters**

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `trigger` | string | ✅ | `A` / `B` / `C` / `D` |

**Response 200**

```json
{
  "data": {
    "trigger": "A",
    "headline": "Keep your little one's story going",
    "benefits": [
      { "key": "continuous_generation", "label": "Generate a Story every month, forever" },
      { "key": "watermark_free", "label": "Watermark-Free Sharing" },
      { "key": "unlimited_highlights", "label": "Unlimited Highlights" },
      { "key": "extra_features", "label": "Extra Features (e.g., Birthday Celebrations)" }
    ],
    "pricing": {
      "yearly": { "amount": 100, "currency": "USD", "period": "year", "save_label": "Save $19.88" },
      "monthly": { "amount": 9.99, "currency": "USD", "period": "month" }
    }
  }
}
```

---

## 6. 分享（Shares）

### POST /shares

获取指定 Story 的分享链接（单 token 策略：upsert）。

**行为：** 先查该 Story 是否已有有效 token（`revoked_at IS NULL`）：有则直接返回（200）；无则创建新行并返回（201）。同一 Story 同时只有一个有效分享链接。

**Request Body**

```json
{
  "story_id": "uuid"
}
```

**Response 200 / 201**（结构相同，200 = 复用已有 token，201 = 新建）

```json
{
  "data": {
    "id": "uuid",
    "story_id": "uuid",
    "token": "abc123xyz...",
    "share_url": "https://nestory.app/share/abc123xyz...",
    "og": {
      "title": "Mia's March Story",
      "description": "A month of firsts...",
      "image_url": "https://..."
    },
    "created_at": "2026-04-12T08:00:00Z"
  }
}
```

---

### GET /shares/public/:token

公开分享页数据接口（无需认证，供 Next.js PublicShareShell 调用）。

**Response 200**

```json
{
  "data": {
    "story_id": "uuid",
    "document": {
      // StoryDocument，完整内容
      // 不包含 generation_meta（生产数据，不对外暴露）
    },
    "og": {
      "title": "Mia's March Story",
      "description": "A month of firsts...",
      "image_url": "https://..."
    }
  }
}
```

**错误处理**

- Token 不存在 → `404 NOT_FOUND`
- Token 已撤销（`revoked_at IS NOT NULL`）→ `404 NOT_FOUND`

---

### DELETE /shares/:id

撤销分享链接（预留，MVP 暂无前端入口）。

**Response 204** No Content

---

## 7. 用户（Users）

### GET /users/me

获取当前用户信息（Session 建立后调用）。

**Response 200**

```json
{
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "timezone": "Asia/Shanghai",
    "created_at": "2026-01-01T00:00:00Z"
  }
}
```

---

### PATCH /users/me

更新用户信息。

**Request Body**

```json
{
  "timezone": "America/New_York"
}
```

> `timezone` 为 IANA 时区名。客户端在注册时和每次 App 启动时上报，确保调度准确。

**Response 200** 返回更新后完整用户对象。

---

## 8. Tags

### GET /tags

获取 8 个预设 Tag（H-02 TagSelector 预设列表数据源）。

**数据来源：** `packages/config/nestory/tags.ts`，不查 DB。客户端可长期缓存（版本与 App 版本绑定）。

**Response 200**

```json
{
  "data": [
    { "name": "Playtime", "display_order": 1 },
    { "name": "Mealtime", "display_order": 2 },
    { "name": "Bedtime", "display_order": 3 },
    { "name": "Bath Time", "display_order": 4 },
    { "name": "Outdoor", "display_order": 5 },
    { "name": "Family Time", "display_order": 6 },
    { "name": "Funny Moment", "display_order": 7 },
    { "name": "Learning", "display_order": 8 }
  ]
}
```

---

### GET /user/tags

获取当前用户的自定义 Tag 列表（H-02 TagSelector 自定义部分数据源）。

**Response 200**

```json
{
  "data": [
    { "name": "第一次独站", "created_at": "2026-03-10T08:00:00Z" },
    { "name": "爷爷奶奶来访", "created_at": "2026-03-15T10:00:00Z" }
  ]
}
```

---

### DELETE /user/tags/:name

从用户 Tag Library 移除一个自定义 Tag（URL encode name）。

**行为：** 仅删除 `user_tag_library` 行，已存入任何 Memory 的 `raw_assets.tags` 字符串**不受影响**（orphan chip 语义）。

**Response 204** No Content

---

## 附录 A：接口与业务规则对应关系

| 接口 | 关联规则 | 校验位置 |
|---|---|---|
| `POST /assets`（tag_values 含新 custom tag） | — | 服务端 normalize + 写入 user_tag_library（如不存在） |
| `POST /assets`（is_highlight=true） | R-04 Highlight 上限 | 后端 Save 时兜底 |
| `PATCH /assets/:id`（tag_values） | — | 全量替换 raw_assets.tags；包含新 custom tag 时写入 user_tag_library |
| `PATCH /assets/:id`（is_highlight true→true） | R-04 | 后端 |
| `PATCH /assets/:id`（历史月份） | R-08 Memory 编辑 | 后端，以 captured_at 判断 |
| `DELETE /assets/:id`（历史月份） | R-08 | 后端 |
| `POST /highlights` | R-04 | 后端 |
| `DELETE /highlights/:id` | 所有用户可用 | 无限制 |
| `DELETE /user/tags/:name` | — | 仅删 user_tag_library 行；raw_assets.tags 不受影响（orphan chip） |
| `POST /children` | R-05/R-09（创建不拦截） | 不校验 |
| `PATCH /children/active` | R-05（切换拦截） | 后端，仅 Never Paid → 403 PROFILE_SWITCH_RESTRICTED；Ended 放行 |
| `PATCH /children/:id` | 所有用户可编辑 | 无限制 |
| `GET /subscriptions/me` | R-10 降级 Notify | 前端读 `subscription_status` 直接渲染，后端不返回额外标记 |
| `POST /subscriptions/sync` | R-01/R-02 配额与水印 | RevenueCat webhook 触发 |
| `GET /shares/public/:token` | R-03 Story 访问 | 无身份校验，token 有效即可访问 |

---

## 附录 B：接口调用时序

### 用户启动 App

```
App 启动
  → PATCH /users/me { timezone }     // 上报时区
  → GET /subscriptions/me            // 获取订阅状态（含 downgrade_toast）
  → GET /children                    // 获取档案列表
  → GET /tags                        // 获取 Tag 列表（可缓存）
  → GET /stories?child_id=...        // 获取 Story 列表（S-01 数据）
```

### 上传 Memory

```
用户填写 H-02
  → POST /assets (multipart)
  ← 201 { data: asset }
  → 返回 H-03，GET /assets?child_id=...&month=... 刷新列表
```

### 查看 Story

```
用户点击 S-01 Story 卡片
  → GET /stories/:id
  ← 200 { data: { document, ... } }
  → WebView 加载 H5，传入 document
  → 用户返回 S-01，检查 is_last_free_story
  → true + Free → 延迟 0.5s 展示 P-01（Paywall A）
```

### 分享 Story

```
用户点击分享图标
  → POST /shares { story_id }
  ← 201 { data: { share_url, og, ... } }
  → 调用系统 Share Sheet，传入 share_url
```

### 外部分享页加载（Next.js SSR）

```
用户点开分享链接 https://nestory.app/share/:token
  → Next.js PublicShareShell
  → GET /shares/public/:token        // 无 Auth Header
  ← 200 { data: { document, og } }
  → generateMetadata() 输出 OG meta
  → StoryRenderer 渲染内容
```

---

*本文档覆盖 MVP 阶段所有后端接口。打印服务、社交系统等非 MVP 功能不在此范围内。*
*接口变更需同步更新本文档版本号。*
