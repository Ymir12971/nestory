# 迁移工作流(读我,别直接 `migrate dev`)

## 现状
两个迁移:`20260503000000_init` + `20260726120000_post_init_and_redesign`。
后者收编了原先游离在历史之外的 `post-init.sql`(部分索引 / GIN / Realtime /
函数唯一索引)以及 2026-07 期间用 `db execute` 直接加的列与 push_tokens 表。
`prisma migrate status` / `migrate deploy` 均干净。

## 为什么不能用 `prisma migrate dev`
Prisma DSL 表达不了 GIN 索引和函数唯一索引,但它们真实存在于库中。
`migrate dev` 会把它们当作"多余对象"并生成 DROP —— 每次都会。

## 正确姿势
- **加字段/表**:改 `schema.prisma` → `npx prisma migrate dev --create-only`
  生成迁移文件 → **手工删掉里面任何 `DROP INDEX idx_assets_tags_gin` /
  `idx_user_tag_library_user_normalized_name` 的语句** → `migrate deploy` 应用。
- **纯 SQL 变更**(索引、触发器、publication):直接手写迁移文件目录 + SQL。
- **生产部署**:只用 `npx prisma migrate deploy`(不做 diff,只应用未执行的迁移)。

## 已知非漂移项
`migrate diff --from-schema-datasource --to-schema-datamodel` 永远会报一句
`DROP INDEX idx_assets_tags_gin` —— 这是上面那个 DSL 表达能力问题,不是漂移,忽略。

## 扩展
datasource 里**不声明** `extensions`:Supabase 把 pgcrypto / uuid-ossp /
pg_stat_statements 装在 `extensions` schema、supabase_vault 在 `vault`,
而迁移中的 `CREATE EXTENSION` 在影子库落到 `public`,声明它们会导致永久漂移。
