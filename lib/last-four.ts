// Validation for card last-four digits.
//
// The value is write-only across the API: it can be set and cleared, but it is
// never returned to the browser (see commit ecfee10 — a `select('*')` once
// served it). Responses carry has_last_four, a boolean, instead.
//
// Client-safe: no server-only imports.

export type LastFourResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

/**
 * Empty string and null both mean "clear it". Anything else must be exactly
 * four digits — a wrong value is worse than none, because the email parsers
 * would attach transactions to the wrong card.
 */
export function parseLastFour(input: unknown): LastFourResult {
  if (input === null || input === undefined) return { ok: true, value: null };
  const s = String(input).trim();
  if (s === '') return { ok: true, value: null };
  if (!/^\d{4}$/.test(s)) {
    return { ok: false, error: 'Last four must be exactly four digits, or blank to clear.' };
  }
  return { ok: true, value: s };
}
