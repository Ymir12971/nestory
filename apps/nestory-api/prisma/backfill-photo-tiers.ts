/**
 * 存量照片质量回填 — 给 photoPreprocess 上线前已存在的照片补打质量标。
 *
 * 直接处理(不走 Redis 队列):一次性任务,少一个基建依赖。
 * 幂等:只处理 quality_tier IS NULL 的行,可重复执行。
 * 单张失败(URL 失效/非图片)跳过并记录,不中断整批。
 *
 * 用法(在 apps/nestory-api 下):
 *   npx tsx --env-file=.env prisma/backfill-photo-tiers.ts
 */
import { PrismaClient } from '@prisma/client';
import { analyzePhoto } from '../src/lib/photoPreprocess';

const CONCURRENCY = 3;

const prisma = new PrismaClient();

async function processOne(file: { id: string; fileUrl: string }): Promise<'ok' | 'skip'> {
  try {
    const res = await fetch(file.fileUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());
    const a = await analyzePhoto(bytes);
    await prisma.assetFile.update({
      where: { id: file.id },
      data: {
        widthPx:     a.widthPx  || undefined,
        heightPx:    a.heightPx || undefined,
        sharpness:   a.sharpness,
        qualityTier: a.tier,
        blurhash:    a.blurhash,
      },
    });
    console.log(`  ok   ${file.id} tier=${a.tier} sharpness=${a.sharpness.toFixed(1)}`);
    return 'ok';
  } catch (err) {
    console.warn(`  skip ${file.id} — ${(err as Error).message.slice(0, 80)} (${file.fileUrl.slice(0, 60)})`);
    return 'skip';
  }
}

async function main() {
  const pending = await prisma.assetFile.findMany({
    where:  { qualityTier: null },
    select: { id: true, fileUrl: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`backfill: ${pending.length} photos without quality tier`);

  let ok = 0, skip = 0;
  for (let i = 0; i < pending.length; i += CONCURRENCY) {
    const batch = pending.slice(i, i + CONCURRENCY);
    const results = await Promise.all(batch.map(processOne));
    for (const r of results) r === 'ok' ? ok++ : skip++;
  }
  console.log(`done: ${ok} tagged, ${skip} skipped (of ${pending.length})`);
}

main()
  .catch(err => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
