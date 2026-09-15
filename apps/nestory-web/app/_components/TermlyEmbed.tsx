import Script from 'next/script';
import { TERMLY_EMBED_SCRIPT, type TermlyPolicy } from '@nestory/legal';

/**
 * Hosts a Termly-authored policy using Termly's embed snippet as-is. Their
 * script fills the div with a self-sizing iframe and watches the DOM for new
 * embeds, so a client-side move between /terms and /privacy still renders even
 * though next/script only loads the script once.
 */
export function TermlyEmbed({ policy }: { policy: TermlyPolicy }) {
  return (
    <main style={pageStyle}>
      {/* `name` isn't a typed <div> attribute; the spread keeps Termly's markup exact. */}
      <div {...{ name: 'termly-embed' }} data-id={policy.id} />
      <Script src={TERMLY_EMBED_SCRIPT} strategy="afterInteractive" />
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  maxWidth: 720,
  margin: '0 auto',
  padding: '48px 24px 96px',
};
