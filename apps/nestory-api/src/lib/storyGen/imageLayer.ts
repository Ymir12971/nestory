/**
 * Deterministic image layer (StoryH5Design §3.6 / StoryGenPrompts §3). NO LLM.
 *
 * Takes the structure decision (chapters → narrative units → momentIds) and each
 * moment's photo metadata, and decides — purely by rule — which photos survive,
 * how many, which Block layout each unit gets, and each photo's target crop ratio.
 *
 * Two things are deliberately pluggable / deferred, because the §7.2 preprocessing
 * pipeline (download → Laplacian → exposure → crop → BlurHash → CDN) does not exist yet:
 *
 *   1. Quality signals. `PhotoMeta.qualityTier` / `.sharpness` come from that
 *      pipeline when it lands. Until then we fall back to what the DB has
 *      (widthPx/heightPx → resolution + ratio). We CANNOT detect blur/exposure
 *      from metadata, so nothing is classified `degraded` in fallback mode —
 *      human review (§8.2) catches bad photos meanwhile.
 *
 *   2. Cropping. We emit each photo's ORIGINAL url plus its TARGET `ratio`. The
 *      renderer object-fit:covers to that ratio for now; once the crop pipeline
 *      exists it swaps in the pre-cropped CDN url without any change here.
 *
 * Every threshold/policy comes from config — no magic numbers in this file.
 */

import type { PhotoRatio } from '@nestory/types';
import { type StoryGenConfig, getStoryGenConfig } from './config';

export type QualityTier = 'gold' | 'standard' | 'degraded';

/** One photo's metadata as available at layout time. */
export interface PhotoMeta {
  url:       string;
  widthPx:   number | null;
  heightPx:  number | null;
  /** From §7.2 preprocessing when available; else derived (never `degraded` in fallback). */
  qualityTier?: QualityTier;
  /** Laplacian variance from §7.2; else undefined → resolution used as proxy. */
  sharpness?: number;
  /** §7.2 stage-1 blurhash; carried through so assembly can derive an LQIP color. */
  blurhash?: string;
}

/** Structure-decision input (subset of Prompt 1 output we need here). */
export interface StructureUnit    { momentIds: string[]; }
export interface StructureChapter  { themeKey: string; units: StructureUnit[]; }

/**
 * Layout decision emitted per Block. `Block-Single-V` is intentionally neutral —
 * the v1/v2 split depends on Prompt 2's text length and is resolved in assembly
 * (StoryH5Design §3.4).
 */
export type LayoutDecision =
  | 'Block-Text'
  | 'Block-Single-H'
  | 'Block-Single-V'
  | 'Block-Duo'
  | 'Block-Grid';

export interface LaidOutPhoto { url: string; ratio: PhotoRatio; blurhash?: string | undefined }
export interface LaidOutBlock {
  momentIds: string[];
  layout:    LayoutDecision;
  photos:    LaidOutPhoto[];
}
export interface LaidOutChapter {
  themeKey: string;
  blocks:   LaidOutBlock[];
}

/** Resolves a momentId to its photos (in display order). */
export type PhotoLookup = (momentId: string) => PhotoMeta[];

// ─── Public entry ────────────────────────────────────────────────────────────

export function layoutChapters(
  chapters: StructureChapter[],
  lookup:   PhotoLookup,
  cfg:      StoryGenConfig = getStoryGenConfig(),
): LaidOutChapter[] {
  return chapters.map(ch => layoutChapter(ch, lookup, cfg));
}

// ─── Per-chapter ─────────────────────────────────────────────────────────────

function layoutChapter(chapter: StructureChapter, lookup: PhotoLookup, cfg: StoryGenConfig): LaidOutChapter {
  const { photosPerUnitCap, photosPerChapterCap } = cfg.image;

  // Step 1 — per unit: collect, drop degraded, cap to N by sharpness (§3.6.1 r1/r2).
  const units = chapter.units.map(u => {
    const pool = u.momentIds
      .flatMap(lookup)
      .map(p => resolve(p, cfg))
      .filter(p => p.tier !== 'degraded');
    const capped = pool.length > photosPerUnitCap
      ? [...pool].sort((a, b) => b.sharpness - a.sharpness).slice(0, photosPerUnitCap)
      : pool;
    return { momentIds: u.momentIds, photos: capped };
  });

  // Step 2 — chapter cap (§3.6.1 r3), policy-driven when round-1 isn't enough.
  const total = () => units.reduce((n, u) => n + u.photos.length, 0);
  if (total() > photosPerChapterCap) {
    for (const u of units) {                       // round 1: keep best 1 per unit
      if (u.photos.length > 1) {
        u.photos = [[...u.photos].sort((a, b) => b.sharpness - a.sharpness)[0]!];
      }
    }
    if (total() > photosPerChapterCap && cfg.image.chapterTrimPolicy === 'demote-worst-units-to-text') {
      // ⚠️ VICOL-PENDING Q#2 — strip worst units' photos → Block-Text until ≤ cap.
      const byWorst = units
        .filter(u => u.photos.length > 0)
        .sort((a, b) => tierRank(a.photos[0]!.tier) - tierRank(b.photos[0]!.tier));
      for (const u of byWorst) {
        if (total() <= photosPerChapterCap) break;
        u.photos = [];
      }
    }
    // 'keep-one-per-unit' policy: leave as-is, chapter may exceed the cap.
  }

  // Step 3 — pick layout + assign crop ratios per unit (§3.6.2 / §3.6.3).
  const blocks: LaidOutBlock[] = units.map(u => pickLayout(u.momentIds, u.photos, cfg));
  return { themeKey: chapter.themeKey, blocks };
}

// ─── Layout selection (§3.6.2 / §3.6.3) ──────────────────────────────────────

function pickLayout(momentIds: string[], photos: ResolvedPhoto[], cfg: StoryGenConfig): LaidOutBlock {
  const n = photos.length;

  if (n === 0) return { momentIds, layout: 'Block-Text', photos: [] };

  if (n === 1) {
    const p = photos[0]!;
    return p.orient === 'portrait'
      ? { momentIds, layout: 'Block-Single-V', photos: [{ url: p.url, ratio: '3:4', blurhash: p.blurhash }] }
      : { momentIds, layout: 'Block-Single-H', photos: [{ url: p.url, ratio: '4:3', blurhash: p.blurhash }] }; // square → 4:3
  }

  if (n === 2) {
    return { momentIds, layout: 'Block-Duo', photos: photos.map(p => ({ url: p.url, ratio: duoRatio(p), blurhash: p.blurhash })) };
  }

  // n === 3 → Block-Grid: Hero (non-3:4) + Duo slot.
  const allPortrait = photos.every(p => p.orient === 'portrait');
  if (allPortrait) {
    return gridAllVertical(momentIds, photos, cfg); // ⚠️ VICOL-PENDING Q#1
  }
  // Hero = highest-sharpness non-portrait photo; the other two fill the Duo slot.
  const heroIdx = photos
    .map((p, i) => ({ p, i }))
    .filter(x => x.p.orient !== 'portrait')
    .sort((a, b) => b.p.sharpness - a.p.sharpness)[0]!.i;
  const hero  = photos[heroIdx]!;
  const rest  = photos.filter((_, i) => i !== heroIdx);
  return {
    momentIds,
    layout: 'Block-Grid',
    photos: [
      { url: hero.url, ratio: hero.orient === 'square' ? '1:1' : '4:3', blurhash: hero.blurhash },
      ...rest.map(p => ({ url: p.url, ratio: duoRatio(p), blurhash: p.blurhash })),
    ],
  };
}

function gridAllVertical(momentIds: string[], photos: ResolvedPhoto[], cfg: StoryGenConfig): LaidOutBlock {
  const best = [...photos].sort((a, b) => b.sharpness - a.sharpness);
  switch (cfg.image.gridAllVerticalPolicy) {
    case 'demote-to-single-v':
      return { momentIds, layout: 'Block-Single-V', photos: [{ url: best[0]!.url, ratio: '3:4', blurhash: best[0]!.blurhash }] };
    case 'demote-to-duo':
      return { momentIds, layout: 'Block-Duo', photos: best.slice(0, 2).map(p => ({ url: p.url, ratio: '3:4' as PhotoRatio, blurhash: p.blurhash })) };
    case 'crop-hero-to-4x3':
    default:
      // Crop the sharpest portrait to 4:3 for the Hero; keep the other two portrait.
      return {
        momentIds,
        layout: 'Block-Grid',
        photos: [
          { url: best[0]!.url, ratio: '4:3', blurhash: best[0]!.blurhash },
          ...best.slice(1, 3).map(p => ({ url: p.url, ratio: '3:4' as PhotoRatio, blurhash: p.blurhash })),
        ],
      };
  }
}

/** Duo/Grid slot: preserve orientation (§3.6.3), no forced 1:1. */
function duoRatio(p: ResolvedPhoto): PhotoRatio {
  return p.orient === 'portrait' ? '3:4' : p.orient === 'square' ? '1:1' : '4:3';
}

// ─── Photo resolution (metadata → tier/orientation/sharpness) ────────────────

type Orientation = 'landscape' | 'portrait' | 'square';
interface ResolvedPhoto {
  url:       string;
  blurhash?: string | undefined;
  orient:    Orientation;
  tier:      QualityTier;
  /** Sort key for "keep the best": real Laplacian if present, else pixel area. */
  sharpness: number;
}

function resolve(p: PhotoMeta, cfg: StoryGenConfig): ResolvedPhoto {
  const w = p.widthPx ?? 0;
  const h = p.heightPx ?? 0;
  const orient: Orientation = w === h ? 'square' : w > h ? 'landscape' : 'portrait';
  return {
    url:       p.url,
    blurhash:  p.blurhash,
    orient,
    tier:      p.qualityTier ?? deriveTier(w, h, p.sharpness, cfg),
    sharpness: p.sharpness ?? w * h, // pixel area proxy when Laplacian unknown
  };
}

/**
 * Fallback tier when the preprocessing pipeline hasn't tagged the photo.
 * We can confirm Gold (resolution + sharpness both known and passing) but with
 * no pixel access we never assert `degraded` here — that needs blur/exposure
 * detection from §7.2. Result: metadata-only mode is non-destructive.
 */
function deriveTier(w: number, h: number, sharpness: number | undefined, cfg: StoryGenConfig): QualityTier {
  const shortEdge = Math.min(w, h);
  const { shortEdgeMinPx, laplacianVarianceMin } = cfg.image.gold;
  if (shortEdge >= shortEdgeMinPx && sharpness !== undefined && sharpness >= laplacianVarianceMin) {
    return 'gold';
  }
  return 'standard';
}

function tierRank(t: QualityTier): number {
  return t === 'gold' ? 2 : t === 'standard' ? 1 : 0;
}

// ─── Cover selection (§5.2) ──────────────────────────────────────────────────

/**
 * Cover-A needs a Gold-tier PORTRAIT (3:4) photo; else Cover-B (no photo).
 * Searches all photos across the month. Returns the cover photo url or null.
 */
export function pickCover(
  allPhotos: PhotoMeta[],
  cfg: StoryGenConfig = getStoryGenConfig(),
): { layout: 'Cover-A' | 'Cover-B'; coverPhotoUrl: string | null } {
  const goldVerticals = allPhotos
    .map(p => resolve(p, cfg))
    .filter(p => p.tier === 'gold' && p.orient === 'portrait')
    .sort((a, b) => b.sharpness - a.sharpness);
  return goldVerticals.length > 0
    ? { layout: 'Cover-A', coverPhotoUrl: goldVerticals[0]!.url }
    : { layout: 'Cover-B', coverPhotoUrl: null };
}
