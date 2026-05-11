import type { StoryDocument, StorySection } from '@nestory/types';
import styles from './StoryRenderer.module.css';

/**
 * Renders a StoryDocument as a long-form web page.
 *
 * This is a server component: ships zero JS for the read path. The mobile
 * WebView and shared-link visitors get the same markup. Styling is via CSS
 * Modules so the component stays server-renderable (styled-jsx requires a
 * client component).
 *
 * Section order is preserved as the model emitted it — the prompt enforces
 * summary → narrative → milestone? → reflection? → closing.
 */
export function StoryRenderer({ doc }: { doc: StoryDocument }) {
  return (
    <article className={styles.story}>
      <header className={styles.hero}>
        {doc.meta.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className={styles.cover} src={doc.meta.coverImageUrl} alt="" />
        ) : (
          <div className={`${styles.cover} ${styles.coverPlaceholder}`} />
        )}
        <div className={styles.overlay} />
        <div className={styles.heroText}>
          <p className={styles.month}>{formatMonthLabel(doc.monthKey, doc.locale)}</p>
          <h1 className={styles.title}>{doc.meta.title}</h1>
          <p className={styles.age}>{formatAge(doc.meta.childAgeMonths)}</p>
        </div>
      </header>

      <main className={styles.body}>
        {doc.sections.map((s) => (
          <Section key={s.id} section={s} />
        ))}
      </main>

      {doc.watermark.enabled && (
        <footer className={styles.watermark}>{doc.watermark.text}</footer>
      )}
    </article>
  );
}

function Section({ section }: { section: StorySection }) {
  if (!section.text || section.text.trim().length === 0) return null;

  const intentClass = (() => {
    switch (section.intent) {
      case 'summary':     return styles.sectionSummary;
      case 'milestone':   return styles.sectionMilestone;
      case 'reflection':  return styles.sectionReflection;
      case 'closing':     return styles.sectionClosing;
      default:            return '';
    }
  })();

  return (
    <section className={`${styles.section} ${intentClass}`.trim()}>
      {section.text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </section>
  );
}

function formatMonthLabel(monthKey: string, locale: string): string {
  const [yStr, mStr] = monthKey.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  if (!y || !m) return monthKey;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatAge(months: number): string {
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} old`;
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (m === 0) return `${y} year${y === 1 ? '' : 's'} old`;
  return `${y} year${y === 1 ? '' : 's'} ${m} month${m === 1 ? '' : 's'} old`;
}
