'use client';

import { useCallback, useMemo, useState } from 'react';
import type { StoryBlock, StoryBodyChapter, StoryDocumentV3, StoryPhoto } from '@nestory/types';
import styles from './StoryRendererV3.module.css';

/**
 * v3 章节翻页渲染器 (StoryH5Design §4-§6):
 *   页序 = Cover → Opening → Body[0..n] → Closing
 *   翻页 = 底部箭头按钮 + 屏幕左/右 1/3 点击区(中间 1/3 不响应)
 *   Cover/Opening/Closing 强制一屏;Body 章内垂直滚动
 *   顶部 = 细进度条 + ✕(返回上一页/关闭 WebView)
 * 客户端组件(翻页状态);v2 的 StoryRenderer 原样保留,入口按 renderVersion 分流。
 *
 * `external` = 被分享者用浏览器打开(/share/[token])。App 内 WebView 传 false:
 * §9.1 明确 App 内不带水印,§9.3 的水印只作用于外部分享场景。
 *
 * `insets` = the app's status-bar and navigation-bar heights. In the app this
 * page fills the whole screen with no native title bar above it (Vicol
 * 2026-10-26), and Android's WebView reports no safe-area insets of its own,
 * so the app passes them in the URL and the progress bar and page buttons
 * keep clear of the system bars.
 */
export function StoryRendererV3({
  doc,
  external = false,
  insets,
}: { doc: StoryDocumentV3; external?: boolean; insets?: { top: number; bottom: number } }) {
  const pages = useMemo(
    () => ['cover' as const, 'opening' as const, ...doc.body.map((_, i) => i), 'closing' as const],
    [doc.body],
  );
  const [page, setPage] = useState(0);

  const next = useCallback(() => setPage(p => Math.min(p + 1, pages.length - 1)), [pages.length]);
  const prev = useCallback(() => setPage(p => Math.max(p - 1, 0)), []);
  const close = useCallback(() => {
    if (postToApp('close')) return;
    if (typeof window !== 'undefined') window.history.back();
  }, []);

  // 屏幕分区点击:左 1/3 上一章,右 1/3 下一章,中间不响应(§6.1)
  const onZoneTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // 按钮/链接自己处理,不参与分区翻页
    if (target.closest('button, a')) return;
    const x = e.clientX / window.innerWidth;
    if (x < 1 / 3) prev();
    else if (x > 2 / 3) next();
  }, [next, prev]);

  const current = pages[page]!;
  const isFirst = page === 0;
  const isLast  = page === pages.length - 1;

  const insetVars = insets
    ? ({
        '--app-inset-top':    `${insets.top}px`,
        '--app-inset-bottom': `${insets.bottom}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div className={styles.root} style={insetVars} onClick={onZoneTap}>
      {/* 顶部:进度条 + 关闭 */}
      <div className={styles.topBar}>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${((page + 1) / pages.length) * 100}%` }}
          />
        </div>
        {/* A visitor who opened a shared link has no screen behind this one —
            ✕ and "Back to Home" only mean something inside the app. */}
        {!external && (
          <button className={styles.closeBtn} onClick={close} aria-label="Close"><CloseIcon /></button>
        )}
      </div>

      {/* §9.3 水印 —— 生成时锁定,免费版永久带,只在外部分享页出现。
          放进度条下方:底部那条带子在 Opening 页会被加宽的 "Start Reading"
          按钮占满,顶部这一横是全局唯一不被内容占用的位置。 */}
      {external && doc.watermark.enabled && (
        <p className={styles.watermark}>{doc.watermark.text}</p>
      )}

      {/* 当前页(key 驱动淡入过渡) */}
      <div className={styles.page} key={page}>
        {current === 'cover'   && <CoverPage doc={doc} />}
        {current === 'opening' && <OpeningPage doc={doc} />}
        {typeof current === 'number' && <ChapterPage chapter={doc.body[current]!} />}
        {current === 'closing' && <ClosingPage doc={doc} external={external} />}
      </div>

      {/* 底部翻页按钮 — DS Primary (Vicol 2026-10-26). The closing page already
          has a Primary "Share this Story", so there the pair turns outlined
          and "Back to Home" takes the right-hand slot, as in the H5 template. */}
      <div className={styles.navRow}>
        {!isFirst ? (
          <button
            className={`${styles.navBtn} ${isLast ? styles.navBtnOutline : ''}`}
            onClick={prev}
            aria-label="Previous"
          >
            <Chevron dir="left" />
          </button>
        ) : <span />}

        {!isLast ? (
          <button className={styles.navBtn} onClick={next} aria-label="Next">
            {current === 'opening' && <span className={styles.navBtnLabel}>Start Reading</span>}
            <Chevron dir="right" />
          </button>
        ) : !external ? (
          <button className={`${styles.navBtn} ${styles.navBtnOutline}`} onClick={close}>
            <HomeIcon />
            <span className={styles.navBtnLabel}>Back to Home</span>
          </button>
        ) : <span />}
      </div>
    </div>
  );
}

// ─── Icons (Remix Icon, same set as the app) ────────────────────────────────
// Inline SVG rather than "←" / "→" glyphs: the two arrows came from different
// fallback fonts and rendered at visibly different sizes.

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={dir === 'left'
          ? 'M10.828 12l4.95 4.95-1.414 1.415L8 12l6.364-6.364 1.414 1.414z'
          : 'M13.172 12l-4.95-4.95 1.414-1.414L16 12l-6.364 6.364-1.414-1.414z'}
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className={styles.iconSmall} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 10.586l4.95-4.95 1.414 1.414-4.95 4.95 4.95 4.95-1.414 1.414-4.95-4.95-4.95 4.95-1.414-1.414 4.95-4.95-4.95-4.95L7.05 5.636z" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg className={styles.iconSmall} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M19 21H5a1 1 0 0 1-1-1v-9H1l10.327-9.388a1 1 0 0 1 1.346 0L23 11h-3v9a1 1 0 0 1-1 1zm-6-2h5V9.157l-6-5.454-6 5.454V19h5v-6h2v6z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13 14h-2a8.999 8.999 0 0 0-7.968 4.81A10.136 10.136 0 0 1 3 18C3 12.477 7.477 8 13 8V3l10 8-10 8v-5z" />
    </svg>
  );
}

function Sparkle() {
  return (
    <svg className={styles.sparkle} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 3l1.6 5.4L17 10l-5.4 1.6L10 17l-1.6-5.4L3 10l5.4-1.6z" />
      <path d="M18 14l.8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8z" />
    </svg>
  );
}

// ─── Fixed pages ─────────────────────────────────────────────────────────────

function CoverPage({ doc }: { doc: StoryDocumentV3 }) {
  const { cover } = doc;
  if (cover.layout === 'Cover-A' && cover.coverPhotoUrl) {
    return (
      <section className={styles.coverA}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.coverAImg} src={cover.coverPhotoUrl} alt="" />
        <div className={styles.coverAScrim} />
        <div className={styles.coverAText}>
          <p className={styles.coverMonth}>{cover.month}</p>
          <h1 className={styles.coverName}>{cover.childName}</h1>
          <p className={styles.coverSubtitle}>{cover.subtitle}</p>
        </div>
      </section>
    );
  }
  // Cover-B:柔和多彩虚化渐变(§5.1 产品特例)。Centred month over a large
  // year, as in the Story H5 Templates design (Vicol 2026-10-26).
  const { monthName, year } = splitMonth(cover.month);
  return (
    <section className={`${styles.coverB} ${styles.softBg}`}>
      <p className={styles.coverMonthB}>{monthName}</p>
      {year && <p className={styles.coverYearB}>{year}</p>}
      <div className={styles.coverDivider}>
        <span className={styles.coverRule} />
        <Sparkle />
        <span className={styles.coverRule} />
      </div>
      <h1 className={styles.coverNameB}>{cover.childName}&rsquo;s month</h1>
      <p className={styles.coverSubtitleB}>{cover.subtitle}</p>
    </section>
  );
}

/** "OCTOBER 2026" → { monthName: "OCTOBER", year: "2026" }. */
function splitMonth(label: string): { monthName: string; year: string | null } {
  const m = /^(.*\S)\s+(\d{4})$/.exec(label.trim());
  return m ? { monthName: m[1]!, year: m[2]! } : { monthName: label, year: null };
}

function OpeningPage({ doc }: { doc: StoryDocumentV3 }) {
  return (
    <section className={styles.opening}>
      {doc.opening.paragraphs.map((p, i) => (
        <p key={i} className={styles.openingPara}>{p}</p>
      ))}
    </section>
  );
}

/**
 * Inside the app this page runs in a WebView with no history to go back to,
 * so close/share are handed to the native screen. Returns false in a browser.
 */
function postToApp(type: 'close' | 'share'): boolean {
  if (typeof window === 'undefined') return false;
  const bridge = (window as { ReactNativeWebView?: { postMessage(msg: string): void } }).ReactNativeWebView;
  if (!bridge) return false;
  bridge.postMessage(JSON.stringify({ type }));
  return true;
}

/** This page's URL without `?t=` — that is the viewer's access token. */
function shareableUrl(): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.delete('t');
  return url.toString();
}

function plural(n: number, word: string): string {
  return n === 1 ? word : `${word}s`;
}

/** Closing page, laid out after the Story H5 Templates design (Vicol 2026-10-26). */
function ClosingPage({ doc, external }: { doc: StoryDocumentV3; external: boolean }) {
  const { moments, photos } = doc.closing.stats;
  const name = doc.cover.childName;
  const share = async () => {
    // In the app the native screen owns sharing: it mints the public
    // /share/<token> link. This page's own URL is not shareable there.
    if (postToApp('share')) return;
    const url = shareableUrl();
    if (navigator.share) {
      try { await navigator.share({ title: doc.shareMeta.ogTitle, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard?.writeText(url);
    }
  };
  return (
    <section className={`${styles.closing} ${styles.softBg}`}>
      <p className={styles.closingBrand}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className={styles.closingLogo} src="/logo.png" alt="" width={24} height={24} />
        Nestory
      </p>
      <h2 className={styles.closingHeadline}>{doc.closing.headline}</h2>
      <div className={styles.statRow}>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{moments}</span>
          <span className={styles.statLabel}>{plural(moments, 'moment')}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statValue}>{photos}</span>
          <span className={styles.statLabel}>{plural(photos, 'photo')}</span>
        </div>
      </div>
      {/* Addressed to the parent, so not on the public page. */}
      {!external && (
        <p className={styles.closingInvite}>
          Share {name}&rsquo;s month with family and friends — let them watch {name} grow.
        </p>
      )}
      <button className={styles.shareBtn} onClick={share}>
        <ShareIcon />
        Share this Story
      </button>
    </section>
  );
}

// ─── Body chapter + blocks (§3.6.2 / §3.6.3) ────────────────────────────────

function ChapterPage({ chapter }: { chapter: StoryBodyChapter }) {
  return (
    <section className={styles.chapter}>
      <h2 className={styles.chapterTitle}>{chapter.chapterTitle}</h2>
      {chapter.blocks.map((b, i) => (
        <Block key={i} block={b} />
      ))}
    </section>
  );
}

function ratioClass(ratio: string): string {
  if (ratio === '3:4') return styles.r34!;
  if (ratio === '1:1') return styles.r11!;
  return styles.r43!;
}

// 图片层已按目标比例预裁切(§7.2 阶段二);老文档没有变体字段时回落到原图 +
// object-fit。placeholderColor 是 blurhash 解出的均色,做零 JS 的 LQIP 底色。
const SIZES = '(max-width: 480px) 100vw, 480px';

function Img({ photo }: { photo: StoryPhoto }) {
  const cls = `${styles.blockImg} ${ratioClass(photo.ratio)}`;
  const style = photo.placeholderColor ? { backgroundColor: photo.placeholderColor } : undefined;
  if (!photo.srcsetJpeg) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={cls} style={style} src={photo.url} alt="" loading="lazy" decoding="async" />;
  }
  return (
    <picture>
      {photo.srcsetWebp && <source type="image/webp" srcSet={photo.srcsetWebp} sizes={SIZES} />}
      <img
        className={cls}
        style={style}
        src={photo.url}
        srcSet={photo.srcsetJpeg}
        sizes={SIZES}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}

function Block({ block }: { block: StoryBlock }) {
  const { blockLayout: layout, photos, text } = block;

  if (layout === 'Block-Text' || photos.length === 0) {
    return <div className={styles.block}><p className={styles.blockText}>{text}</p></div>;
  }

  if (layout === 'Block-Single-H') {
    return (
      <div className={styles.block}>
        <Img photo={photos[0]!} />
        <p className={styles.blockText}>{text}</p>
      </div>
    );
  }

  if (layout === 'Block-Single-V-v1') {
    // 短文:图文并排,顶对齐
    return (
      <div className={`${styles.block} ${styles.blockRow}`}>
        <div className={styles.rowImgHalf}><Img photo={photos[0]!} /></div>
        <p className={`${styles.blockText} ${styles.rowTextHalf}`}>{text}</p>
      </div>
    );
  }

  if (layout === 'Block-Single-V-v2') {
    // 长文:文字绕图(float),续排图下
    return (
      <div className={`${styles.block} ${styles.blockFloatWrap}`}>
        <div className={styles.floatImg}><Img photo={photos[0]!} /></div>
        <p className={styles.blockText}>{text}</p>
      </div>
    );
  }

  if (layout === 'Block-Duo') {
    // 双 4:3 上下堆叠;其余左右并排等高(§3.6.3 硬约束)
    const both43 = photos.every(p => p.ratio === '4:3');
    return (
      <div className={styles.block}>
        <div className={both43 ? styles.duoStack : styles.duoRow}>
          {photos.slice(0, 2).map((p, i) => <Img key={i} photo={p} />)}
        </div>
        <p className={styles.blockText}>{text}</p>
      </div>
    );
  }

  // Block-Grid:主图(首张,非 3:4)+ Duo 槽位
  const [hero, ...rest] = photos;
  return (
    <div className={styles.block}>
      <Img photo={hero!} />
      {rest.length > 0 && (
        <div className={styles.duoRow}>
          {rest.slice(0, 2).map((p, i) => <Img key={i} photo={p} />)}
        </div>
      )}
      <p className={styles.blockText}>{text}</p>
    </div>
  );
}
