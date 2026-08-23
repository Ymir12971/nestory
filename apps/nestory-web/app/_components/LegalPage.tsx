import type { LegalDocument } from '@nestory/legal';

/**
 * Renders a legal document from @nestory/legal. The same content drives the
 * in-app screens, which apply the app's own typography — keeping one source
 * is the point, not sharing a look.
 */
export function LegalPage({ doc }: { doc: LegalDocument }) {
  return (
    <main style={pageStyle}>
      <h1 style={h1Style}>{doc.title}</h1>
      <p style={metaStyle}>Effective {doc.effectiveDate}</p>
      <p>{doc.intro}</p>

      {doc.sections.map((section) => (
        <section key={section.title}>
          <h2 style={h2Style}>{section.title}</h2>
          {section.blocks.map((block, i) =>
            block.kind === 'bullets' ? (
              <ul key={i} style={ulStyle}>
                {(block.items ?? []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i}>{block.text}</p>
            ),
          )}
        </section>
      ))}
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '48px 24px 96px',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  color: '#111',
  lineHeight: 1.6,
  fontSize: 16,
};
const h1Style: React.CSSProperties = { fontSize: 32, fontWeight: 700, marginBottom: 4 };
const h2Style: React.CSSProperties = { fontSize: 20, fontWeight: 600, marginTop: 36, marginBottom: 8 };
const metaStyle: React.CSSProperties = { color: '#666', marginBottom: 24 };
const ulStyle: React.CSSProperties = { paddingLeft: 20 };
