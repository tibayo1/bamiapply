/**
 * Central brand configuration for Bámi Apply.
 * Update this file to change product branding across the entire application.
 */

export const brand = {
  /** Full public-facing product name — used on landing pages, titles, metadata */
  productName: "Bámi Apply",

  /** Short name used inside the authenticated application (wordmark) */
  shortName: "bámi",

  /** Sentence-case name for use inside UI copy: "Bámi will help you…" */
  displayName: "Bámi",

  /** Product tagline */
  tagline: "Your career application copilot.",

  /** Short product description for metadata and SEO */
  description:
    "Know which opportunities are worth your time, then build an application around your real experience.",

  /** Origin note — for internal reference */
  origin: 'From the Yoruba expression \u201cb\u00e1 mi\u201d, meaning \u201chelp me.\u201d',

  /** Domain (update when deploying) */
  domain: "bamiapply.com",
} as const;

export type Brand = typeof brand;
