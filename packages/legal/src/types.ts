/**
 * Legal copy, shared by the web pages and the in-app screens.
 *
 * It lives here because there were two copies before: the web pages carried
 * real policy text while the app screens carried the frames' placeholder, and
 * the two drifted far enough that the web privacy notice contradicted itself
 * about whether photos reach the AI provider. One source, two renderers.
 *
 * Plain strings, no markup — each renderer applies its own typography, so the
 * app can keep the layout its frame specifies (739:1547 / 739:1566) instead of
 * embedding a web page.
 */
export interface LegalBlock {
  kind: 'paragraph' | 'bullets';
  /** Set for `paragraph`. */
  text?: string;
  /** Set for `bullets`. A leading "Label — " reads as a term being defined. */
  items?: string[];
}

export interface LegalSection {
  /** Numbered as it appears, e.g. "1. What we collect". */
  title: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  title: string;
  effectiveDate: string;
  contactEmail: string;
  /** Opening paragraph, above the first numbered section. */
  intro: string;
  sections: LegalSection[];
}
