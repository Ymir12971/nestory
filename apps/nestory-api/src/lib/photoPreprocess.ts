import { Queue, Worker, type Job } from 'bullmq';
import IORedis from 'ioredis';
import sharp from 'sharp';
import { encode } from 'blurhash';
import { prisma } from './prisma';
import { getStoryGenConfig } from './storyGen/config';

// §7.2 图片预处理 · 阶段一(上传时,每张图一次,结果永久复用):
//   sharp 统一短边 512 → 灰度 → Laplacian 卷积取方差(清晰度)
//   sharp stats → 灰度均值(曝光)
//   blurhash → 加载占位
//   → 写回 asset_files.sharpness / quality_tier / blurhash
// storyGen v3 的 imageLayer 消费这些列;列为空时自动降级到分辨率判定。
// 方案:sharp + blurhash,不用 OpenCV / Cloudflare Images(Justin 2026-07-15)。

const QUEUE_NAME = 'photo-preprocess';
const ANALYZE_SHORT_EDGE = 512; // Laplacian 阈值只在固定分辨率下可比

export type PhotoJobPayload = { fileId: string };

let _connection: IORedis | null = null;
let _queue: Queue | null = null;
let _worker: Worker | null = null;

function getConnection(): IORedis {
  if (_connection) return _connection;
  const url = process.env.REDIS_URL;
  if (!url) throw new Error('REDIS_URL is not set');
  _connection = new IORedis(url, { maxRetriesPerRequest: null });
  let logged = false;
  _connection.on('error', (err) => {
    if (logged) return;
    logged = true;
    console.warn('[photoQueue] Redis unavailable:', err.message);
  });
  _connection.on('ready', () => { logged = false; });
  return _connection;
}

function getPhotoQueue(): Queue {
  if (_queue) return _queue;
  _queue = new Queue<PhotoJobPayload>(QUEUE_NAME, { connection: getConnection() });
  return _queue;
}

/** Fire-and-forget:入队失败(如 dev 无 Redis)不影响上传主流程。 */
export function enqueuePhotoPreprocess(fileIds: string[]): void {
  if (fileIds.length === 0) return;
  try {
    const q = getPhotoQueue();
    void Promise.all(fileIds.map(fileId =>
      q.add('preprocess', { fileId }, {
        attempts:         3,
        backoff:          { type: 'exponential', delay: 10_000 },
        removeOnComplete: { age: 60 * 60 * 24 },
        removeOnFail:     { age: 60 * 60 * 24 * 7 },
        jobId:            `photo:${fileId}`,
      }),
    )).catch(err => console.warn('[photoQueue] enqueue failed:', (err as Error).message));
  } catch (err) {
    console.warn('[photoQueue] enqueue skipped:', (err as Error).message);
  }
}

// ─── Analysis ────────────────────────────────────────────────────────────────

const LAPLACIAN_KERNEL = {
  width: 3,
  height: 3,
  kernel: [0, 1, 0, 1, -4, 1, 0, 1, 0],
};

export interface PhotoAnalysis {
  widthPx:   number;
  heightPx:  number;
  sharpness: number;   // Laplacian variance on 512-short-edge greyscale
  meanLuma:  number;   // 0-255
  blurhash:  string;
  tier:      'gold' | 'standard' | 'degraded';
}

export async function analyzePhoto(bytes: Buffer): Promise<PhotoAnalysis> {
  const cfg = getStoryGenConfig();
  const base = sharp(bytes, { failOn: 'truncated' }).rotate(); // EXIF orientation

  const meta = await base.metadata();
  const widthPx  = meta.width ?? 0;
  const heightPx = meta.height ?? 0;

  // 统一分析尺寸的灰度图
  const grey = await base
    .clone()
    .resize({ width: ANALYZE_SHORT_EDGE, height: ANALYZE_SHORT_EDGE, fit: 'inside' })
    .greyscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // 曝光:灰度均值
  let sum = 0;
  for (let i = 0; i < grey.data.length; i++) sum += grey.data[i]!;
  const meanLuma = sum / grey.data.length;

  // 清晰度:Laplacian 卷积后取方差
  const lap = await sharp(grey.data, {
    raw: { width: grey.info.width, height: grey.info.height, channels: 1 },
  })
    .convolve(LAPLACIAN_KERNEL)
    .raw()
    .toBuffer();
  let lapSum = 0;
  for (let i = 0; i < lap.length; i++) lapSum += lap[i]!;
  const lapMean = lapSum / lap.length;
  let varSum = 0;
  for (let i = 0; i < lap.length; i++) {
    const d = lap[i]! - lapMean;
    varSum += d * d;
  }
  const sharpness = varSum / lap.length;

  // BlurHash:小 RGBA 图编码
  const bh = await base
    .clone()
    .resize({ width: 32, height: 32, fit: 'inside' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const blurhashStr = encode(
    new Uint8ClampedArray(bh.data),
    bh.info.width,
    bh.info.height,
    4, 3,
  );

  // 分级(§3.2):模糊或严重曝光异常 → degraded;高清+清晰 → gold;其余 standard
  const { gold, degraded } = cfg.image;
  let tier: PhotoAnalysis['tier'] = 'standard';
  if (sharpness < degraded.laplacianVarianceMax ||
      meanLuma < degraded.exposureMeanMin ||
      meanLuma > degraded.exposureMeanMax) {
    tier = 'degraded';
  } else if (Math.min(widthPx, heightPx) >= gold.shortEdgeMinPx &&
             sharpness >= gold.laplacianVarianceMin) {
    tier = 'gold';
  }

  return { widthPx, heightPx, sharpness, meanLuma, blurhash: blurhashStr, tier };
}

// ─── Worker ──────────────────────────────────────────────────────────────────

async function processPhotoJob(job: Job<PhotoJobPayload>, log: (msg: string) => void): Promise<void> {
  const file = await prisma.assetFile.findUnique({
    where:  { id: job.data.fileId },
    select: { id: true, fileUrl: true, qualityTier: true },
  });
  if (!file) { log(`[photo-worker] file ${job.data.fileId} gone, skip`); return; }
  if (file.qualityTier) return; // 已处理过(重试/重复入队幂等)

  const res = await fetch(file.fileUrl);
  if (!res.ok) throw new Error(`fetch ${file.fileUrl} → ${res.status}`);
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
  log(`[photo-worker] ${file.id} tier=${a.tier} sharpness=${a.sharpness.toFixed(1)} luma=${a.meanLuma.toFixed(0)}`);
}

export function startPhotoWorker(log: (msg: string, data?: unknown) => void): Worker {
  if (_worker) return _worker;
  _worker = new Worker<PhotoJobPayload>(
    QUEUE_NAME,
    (job) => processPhotoJob(job, log),
    {
      connection:  getConnection(),
      // 下载+sharp 是 CPU/IO 混合;2 并发在 Railway 单核内存内安全
      concurrency: 2,
    },
  );
  _worker.on('failed', (job, err) => {
    log(`[photo-worker] failed ${job?.id}: ${err.message}`);
  });
  return _worker;
}

export async function stopPhotoWorker(): Promise<void> {
  await _worker?.close();
  await _queue?.close();
  await _connection?.quit();
  _worker = null;
  _queue = null;
  _connection = null;
}
