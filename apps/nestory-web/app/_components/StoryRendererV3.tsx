'use client';

import { useCallback, useMemo, useState } from 'react';
import type { StoryBlock, StoryBodyChapter, StoryDocumentV3 } from '@nestory/types';
import styles from './StoryRendererV3.module.css';

/**
 * v3 章节翻页渲染器 (StoryH5Design §4-§6):
 *   页序 = Cover → Opening → Body[0..n] → Closing
 *   翻页 = 底部箭头按钮 + 屏幕左/右 1/3 点击区(中间 1/3 不响应)
 *   Cover/Opening/Closing 强制一屏;Body 章内垂直滚动
 *   顶部 = 细进度条 + ✕(返回上一页/关闭 WebView)
 * 客户端组件(翻页状态);v2 的 StoryRenderer 原样保留,入口按 renderVersion 分流。
 */
export function StoryRendererV3({ doc }: { doc: StoryDocumentV3 }) {
  const pages = useMemo(
    () => ['cover' as const, 'opening' as const, ...doc.body.map((_, i) => i), 'closing' as const],
    [doc.body],
  );
  const [page, setPage] = useState(0);

  const next = useCallback(() => setPage(p => Math.min(p + 1, pages.length - 1)), [pages.length]);
  const prev = useCallback(() => setPage(p => Math.max(p - 1, 0)), []);
  const close = useCallback(() => {
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

  return (
    <div className={styles.root} onClick={onZoneTap}>
      {/* 顶部:进度条 + 关闭 */}
      <div className={styles.topBar}>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${((page + 1) / pages.length) * 100}%` }}
          />
        </div>
        <button className={styles.closeBtn} onClick={close} aria-label="Close">✕</button>
      </div>

      {/* 当前页(key 驱动淡入过渡) */}
      <div className={styles.page} key={page}>
        {current === 'cover'   && <CoverPage doc={doc} />}
        {current === 'opening' && <OpeningPage doc={doc} />}
        {typeof current === 'number' && <ChapterPage chapter={doc.body[current]!} />}
        {current === 'closing' && <ClosingPage doc={doc} onBack={close} />}
      </div>

      {/* 底部翻页按钮(§6.1:毛玻璃,箭头;Opening 的下一页带 label) */}
      <div className={styles.navRow}>
        {!isFirst ? (
          <button className={styles.navBtn} onClick={prev} aria-label="Previous">←</button>
        ) : <span />}
        {!isLast ? (
          <button
            className={`${styles.navBtn} ${current === 'opening' ? styles.navBtnLabeled : ''}`}
            onClick={next}
            aria-label="Next"
          >
            {current === 'opening' ? 'Start Reading →' : '→'}
          </button>
        ) : <span />}
      </div>
    </div>
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
  // Cover-B:柔和多彩虚化渐变(§5.1 产品特例)
  return (
    <section className={styles.coverB}>
      <p className={styles.coverMonthB}>{cover.month}</p>
      <h1 className={styles.coverNameB}>{cover.childName}</h1>
      <p className={styles.coverSubtitleB}>{cover.subtitle}</p>
    </section>
  );
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

function ClosingPage({ doc, onBack }: { doc: StoryDocumentV3; onBack: () => void }) {
  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try { await navigator.share({ title: doc.shareMeta.ogTitle, url }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard?.writeText(url);
    }
  };
  return (
    <section className={styles.closing}>
      <p className={styles.closingBrand}>Nestory</p>
      <h2 className={styles.closingHeadline}>{doc.closing.headline}</h2>
      <p className={styles.closingStats}>
        {doc.closing.stats.memories} memories · {doc.closing.stats.photos} photos
      </p>
      <button className={styles.shareBtn} onClick={share}>Share this Story</button>
      <button className={styles.backBtn} onClick={onBack}>Back to Home</button>
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

function Img({ url, ratio }: { url: string; ratio: string }) {
  // 目标比例由图片层决定;§7.2 阶段二预裁切上线前用 object-fit:cover 顶替
  // eslint-disable-next-line @next/next/no-img-element
  return <img className={`${styles.blockImg} ${ratioClass(ratio)}`} src={url} alt="" />;
}

function Block({ block }: { block: StoryBlock }) {
  const { blockLayout: layout, photos, text } = block;

  if (layout === 'Block-Text' || photos.length === 0) {
    return <div className={styles.block}><p className={styles.blockText}>{text}</p></div>;
  }

  if (layout === 'Block-Single-H') {
    return (
      <div className={styles.block}>
        <Img url={photos[0]!.url} ratio={photos[0]!.ratio} />
        <p className={styles.blockText}>{text}</p>
      </div>
    );
  }

  if (layout === 'Block-Single-V-v1') {
    // 短文:图文并排,顶对齐
    return (
      <div className={`${styles.block} ${styles.blockRow}`}>
        <div className={styles.rowImgHalf}><Img url={photos[0]!.url} ratio="3:4" /></div>
        <p className={`${styles.blockText} ${styles.rowTextHalf}`}>{text}</p>
      </div>
    );
  }

  if (layout === 'Block-Single-V-v2') {
    // 长文:文字绕图(float),续排图下
    return (
      <div className={`${styles.block} ${styles.blockFloatWrap}`}>
        <div className={styles.floatImg}><Img url={photos[0]!.url} ratio="3:4" /></div>
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
          {photos.slice(0, 2).map((p, i) => <Img key={i} url={p.url} ratio={p.ratio} />)}
        </div>
        <p className={styles.blockText}>{text}</p>
      </div>
    );
  }

  // Block-Grid:主图(首张,非 3:4)+ Duo 槽位
  const [hero, ...rest] = photos;
  return (
    <div className={styles.block}>
      <Img url={hero!.url} ratio={hero!.ratio} />
      {rest.length > 0 && (
        <div className={styles.duoRow}>
          {rest.slice(0, 2).map((p, i) => <Img key={i} url={p.url} ratio={p.ratio} />)}
        </div>
      )}
      <p className={styles.blockText}>{text}</p>
    </div>
  );
}
