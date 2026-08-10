-- Tag 体系整体下线（Justin 2026-08-09）。
--
-- 保留过的东西一并清掉：raw_assets.tags 的 value 快照、user_tag_library 整表，
-- 以及它们各自的索引。tags 曾是 storyGen prompt 的输入之一，同批改动已把两条
-- 生成链路的 tag 输入去掉。
--
-- 不可逆：tags 里的字符串快照没有别处备份。

-- GIN 索引随列一起消失，显式 drop 以防它在某些环境里是独立创建的
DROP INDEX IF EXISTS idx_assets_tags_gin;

ALTER TABLE raw_assets DROP COLUMN IF EXISTS tags;

-- functional unique index 随表一起 drop
DROP TABLE IF EXISTS user_tag_library;
