#!/usr/bin/env node
// 把本地开发环境整个拉起来。幂等，随便跑多少次。
//
// Usage:
//   pnpm dev        # 先跑这个，再起 api + web
//   pnpm dev:up     # 只拉环境，不起服务
//
// 做的事：
//   1. 没有 .env 就从 .env.example 复制一份（默认值就是本地栈，不用改）
//   2. 起 nestory-redis 容器（没有就建）
//   3. `supabase start` —— Docker 里的本地 Supabase 栈（DB 54322 / 网关 54321
//      / Studio 54323）
//   4. prisma migrate deploy + post-init.sql
//   5. 灌种子数据：dev 用户 + Emma + 4 条 memory + 一个生成好的 2026-04 Story
//
// 安全阀：第 3-5 步只在 DATABASE_URL 指向本机时才做。.env 要是切回了云库
// （cp .env.cloud.local .env），这些步骤会跳过并告诉你 —— 免得把迁移和种子
// 数据灌进线上库。
//
// 种子数据里会有两个 Emma：seed.ts 建一个（配 dev 用户的），seed-demo.ts 再
// 建一个带 Story 的。不是 bug，是两个脚本各建各的。

import { spawnSync } from 'node:child_process'
import { existsSync, copyFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const API  = join(ROOT, 'apps', 'nestory-api')
const ENV  = join(API, '.env')

const REDIS_CONTAINER = 'nestory-redis'
const DEV_USER_ID     = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'

function run(cmd, { cwd = ROOT, env, quiet = false } = {}) {
  const r = spawnSync(cmd, {
    cwd,
    shell: true,
    stdio: quiet ? 'pipe' : 'inherit',
    env: { ...process.env, ...env },
  })
  return { ok: r.status === 0, out: (r.stdout?.toString() ?? '') + (r.stderr?.toString() ?? '') }
}

function step(msg) {
  console.log(`\n\x1b[36m▸ ${msg}\x1b[0m`)
}

function die(msg) {
  console.error(`\n\x1b[31m✗ ${msg}\x1b[0m`)
  process.exit(1)
}

// ── 1. .env ─────────────────────────────────────────────────────────────────
if (!existsSync(ENV)) {
  step('apps/nestory-api/.env 不存在 → 从 .env.example 复制')
  copyFileSync(join(API, '.env.example'), ENV)
  console.log('  默认值就是本地栈，不用改任何一行')
}

const dbUrl = (readFileSync(ENV, 'utf8').match(/^DATABASE_URL=(.*)$/m)?.[1] ?? '').trim()
const isLocalDb = /@(127\.0\.0\.1|localhost|\[::1\]):/.test(dbUrl)

if (!isLocalDb) {
  console.log('\n\x1b[33m⚠ DATABASE_URL 不指向本机，跳过本地栈 / 迁移 / 种子数据。\x1b[0m')
  console.log('  当前指向：' + dbUrl.replace(/:\/\/([^:]+):[^@]*@/, '://$1:***@'))
  console.log('  要用本地开发环境：cp apps/nestory-api/.env.example apps/nestory-api/.env')
  process.exit(0)
}

// ── 2. Redis ────────────────────────────────────────────────────────────────
step(`Redis 容器 ${REDIS_CONTAINER}`)
if (!run('docker version', { quiet: true }).ok) {
  die('Docker 没跑起来。开 Docker Desktop 再来。')
}
if (!run(`docker start ${REDIS_CONTAINER}`, { quiet: true }).ok) {
  console.log('  容器不存在 → 新建')
  const created = run(`docker run -d --name ${REDIS_CONTAINER} -p 6380:6379 redis:7-alpine`, { quiet: true })
  if (!created.ok) die(`建不出来：\n${created.out}`)
}
console.log('  ok（6380）')

// ── 3. Supabase 本地栈 ──────────────────────────────────────────────────────
step('Supabase 本地栈（首次要拉十来个镜像，慢）')
if (!run('npx --yes supabase@2.116.0 start').ok) {
  die('supabase start 失败。`npx supabase stop` 之后重来，或看上面的报错。')
}

// ── 4. 迁移 ────────────────────────────────────────────────────────────────
step('迁移')
if (!run('npx prisma migrate deploy', { cwd: API }).ok) die('migrate deploy 失败')
if (!run('npx prisma db execute --file prisma/post-init.sql --schema prisma/schema.prisma', { cwd: API }).ok) {
  die('post-init.sql 失败')
}

// ── 5. 种子数据 ────────────────────────────────────────────────────────────
step('种子数据')
if (!run('npx prisma db seed', { cwd: API }).ok) die('prisma db seed 失败')
if (!run('npx tsx --env-file=.env prisma/seed-demo.ts', { cwd: API, env: { DEMO_USER_ID: DEV_USER_ID } }).ok) {
  die('seed-demo 失败')
}

console.log('\n\x1b[32m✓ 本地环境就绪\x1b[0m')
console.log('  DB 127.0.0.1:54322 · 网关 54321 · Studio http://127.0.0.1:54323 · Redis 6380')
console.log(`  登录靠 dev 旁路，mobile 默认就是这个用户：${DEV_USER_ID}`)
console.log('  关掉本地栈：npx supabase stop')
