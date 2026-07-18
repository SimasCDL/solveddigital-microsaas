/**
 * Central place for the legal / company details used across the Terms and
 * Privacy pages. Change these in ONE spot and both pages update.
 *
 * ⚠️ Before real launch, review and set for your actual business:
 *   - LEGAL_ENTITY  → your registered company / sole-trader name
 *   - CONTACT_EMAIL → a real, monitored inbox (privacy + refund requests land here)
 *   - GOVERNING_LAW → the jurisdiction whose law governs your terms
 *   - EFFECTIVE_DATE → bump whenever you materially change either policy
 */

/** Public brand name shown to customers. */
export const BRAND = "Tourly";

/** The legal entity that stands behind the service (registered name). */
export const LEGAL_ENTITY = "Tourly";

/** Monitored contact inbox for support, refunds, and data requests. */
export const CONTACT_EMAIL = "support@tourly.com";

/** Governing-law jurisdiction for the Terms. */
export const GOVERNING_LAW = "the State of Delaware, United States";

/** Human-readable "last updated" date shown on both policies. */
export const EFFECTIVE_DATE = "July 19, 2026";
