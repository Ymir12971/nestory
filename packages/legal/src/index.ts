/**
 * Terms and Privacy are written and hosted in Termly, so an edit made there
 * reaches the web pages and the app without a release. This package holds no
 * policy text — only which Termly documents to show and how to load them.
 */
export interface TermlyPolicy {
  /** Termly document id — the `data-id` in its embed snippet. */
  id:    string;
  /** Page and screen title. */
  title: string;
}

export const PRIVACY_POLICY: TermlyPolicy = {
  id:    '04a0ebd7-a397-4c2c-a689-d783e396c172',
  title: 'Privacy Policy',
};

export const TERMS_OF_SERVICE: TermlyPolicy = {
  id:    '43305eda-2b0e-4c3b-aaca-e07290299742',
  title: 'Terms of Service',
};

/** Termly's embed script. It renders every `div[name="termly-embed"]` on the page. */
export const TERMLY_EMBED_SCRIPT = 'https://app.termly.io/embed-policy.min.js';

/**
 * The page Termly's embed script loads into its own iframe (the URL is built in
 * embed-policy.min.js). A native WebView has no host page to run that script
 * against, so it loads this directly — the page carries its own mobile viewport.
 */
export function termlyViewerUrl(policy: TermlyPolicy): string {
  return `https://app.termly.io/policy-viewer/iframe-content.html?policyUUID=${policy.id}&viewMethod=embedded`;
}
