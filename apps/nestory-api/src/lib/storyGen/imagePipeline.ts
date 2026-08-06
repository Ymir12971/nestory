import sharp from 'sharp';
import { decode as decodeBlurhash } from 'blurhash';
import type { PhotoRatio, StoryPhoto } from '@nestory/types';
import { getSupabase, publicUrlFor } from '../supabase';

// §7.2 阶段二 · 生成时图片管线(阶段一是上传时的质量打标,见 photoPreprocess.ts)。
//
// 版式和目标比例由 imageLayer 定好之后,这里把入选照片按该比例**预裁切**成
// 两档宽度的 WebP + JPEG 兜底,传进 stories 桶。渲染端因此拿到:
//   - 恰好比例的图(不再靠 object-fit 裁,省下传输的无效像素)
//   - srcset 多尺寸(手机只下 750w)
//   - blurhash 解出的占位底色(零客户端 JS 的 LQIP)
//
// Story 不可变 → 产物可长缓存,路径按 storyKey/photoIndex 命名即可幂等复用。

const WIDTHS = [750, 1500] as const;

const RATIO_WH: Record<PhotoRatio, [number, number]> = {
  '4:3': [4, 3],
  '3:4': [3, 4],
  '1:1': [1, 1],
};

/** blurhash → 平均色 hex。decode 到 1×1 就是 DC 分量(整图均色)。 */
export function averageColorFromBlurhash(hash: string): string | null {
  try {
    const px = decodeBlurhash(hash, 1, 1);
    const [r, g, b] = [px[0]!, px[1]!, px[2]!];
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  } catch {
    return null;
  }
}

export interface SourcePhoto {
  url:        string;
  ratio:      PhotoRatio;
  blurhash?:  string | undefined;
}

/**
 * 处理单张:下载 → 按比例居中裁切 → 两档宽度 × (WebP|JPEG) → 上传 → 返回 StoryPhoto。
 * 任一步失败都回退到"原图 + 比例"(旧行为),绝不让图片管线拖垮整个 Story 生成。
 */
async function processOne(src: SourcePhoto, keyPrefix: string, index: number): Promise<StoryPhoto> {
  const fallback: StoryPhoto = {
    url:   src.url,
    ratio: src.ratio,
    ...(src.blurhash ? { placeholderColor: averageColorFromBlurhash(src.blurhash) ?? undefined } : {}),
  };

  try {
    const res = await fetch(src.url);
    if (!res.ok) throw new Error(`fetch ${res.status}`);
    const bytes = Buffer.from(await res.arrayBuffer());

    const [rw, rh] = RATIO_WH[src.ratio];
    const sb = getSupabase();
    const variants: { width: number; webp: string; jpeg: string }[] = [];

    for (const width of WIDTHS) {
      const height = Math.round((width * rh) / rw);
      const base = sharp(bytes, { failOn: 'truncated' })
        .rotate()
        .resize(width, height, { fit: 'cover', position: 'attention' });

      const [webpBuf, jpegBuf] = await Promise.all([
        base.clone().webp({ quality: 78 }).toBuffer(),
        base.clone().jpeg({ quality: 82, mozjpeg: true }).toBuffer(),
      ]);

      const webpPath = `${keyPrefix}/${index}_${width}.webp`;
      const jpegPath = `${keyPrefix}/${index}_${width}.jpg`;
      const up = await Promise.all([
        sb.storage.from('stories').upload(webpPath, webpBuf, { contentType: 'image/webp', upsert: true }),
        sb.storage.from('stories').upload(jpegPath, jpegBuf, { contentType: 'image/jpeg', upsert: true }),
      ]);
      for (const u of up) if (u.error) throw new Error(u.error.message);

      variants.push({
        width,
        webp: publicUrlFor('stories', webpPath),
        jpeg: publicUrlFor('stories', jpegPath),
      });
    }

    const largest = variants[variants.length - 1]!;
    return {
      url:   largest.jpeg,           // 无 srcset 支持时的兜底
      ratio: src.ratio,
      srcsetWebp: variants.map(v => `${v.webp} ${v.width}w`).join(', '),
      srcsetJpeg: variants.map(v => `${v.jpeg} ${v.width}w`).join(', '),
      ...(fallback.placeholderColor ? { placeholderColor: fallback.placeholderColor } : {}),
    };
  } catch {
    return fallback;
  }
}

/** 并发处理一批(限流 3,与预处理 worker 同量级)。 */
export async function buildStoryPhotos(
  sources: SourcePhoto[],
  keyPrefix: string,
): Promise<StoryPhoto[]> {
  const out: StoryPhoto[] = [];
  for (let i = 0; i < sources.length; i += 3) {
    const batch = sources.slice(i, i + 3);
    const done = await Promise.all(batch.map((s, j) => processOne(s, keyPrefix, i + j)));
    out.push(...done);
  }
  return out;
}
