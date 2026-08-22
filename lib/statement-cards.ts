// Which card is this statement for?
//
// EDIT THIS FILE to use the e-statements page. Every parser in
// lib/statement-parsers.ts identifies its card by matching the account number
// printed on the statement, and the values below are placeholders.
//
// The parsers are written against Singapore bank layouts (UOB, Citibank, DBS,
// OCBC). If your bank is elsewhere, its statement grammar will differ and you
// will need a parser of your own in lib/statement-parsers.ts — this file only
// answers "whose card is this", not "how is the page laid out".
//
// Nothing here reaches the browser: statement parsing runs server-side in
// /api/statement. Card numbers stay on the server.
//
// Every name below must exactly match a `payment_types.name` in your database,
// or the parsed transactions will not attach to a card.

/**
 * UOB prints several cards in one statement; each section is keyed by the last
 * four digits of the card. Add one entry per card you hold.
 */
export const UOB_LAST4_TO_CARD: Record<string, string> = {
  // '1234': 'My Credit Card',   <- last four digits -> the card's name in Settings
};

/**
 * Citibank prints the account number in full, but only the last four are
 * needed to identify the card — so match a 16-digit group ending in your last
 * four and keep the rest of the number out of your repo. The \s* absorbs
 * grouping whitespace, which PDF text extraction adds or drops unpredictably.
 * Replace 1234 with your last four.
 */
export const CITI_ACCOUNT_PATTERNS: RegExp[] = [
  // /\d{4}\s*\d{4}\s*\d{4}\s*1234/,
];
export const CITI_CARD_NAME = 'My Credit Card';

/**
 * The line that opens Citibank's transaction section — the card product name
 * followed by the cardholder name, as printed on your statement.
 */
export const CITI_SECTION_PATTERN = /CITI .* MASTERCARD.*YOUR NAME HERE/i;

/** DBS prints the card product name rather than a matchable full number. */
export const DBS_CARD_PATTERN = /DBS .* CARD NO\.:?\s*([\d\s]+)/i;
export const DBS_CARD_NAME = 'My Credit Card';

/** OCBC prints the full card number, hyphenated. Last four only, as above. */
export const OCBC_CARD_PATTERN = /\d{4}-\d{4}-\d{4}-1234/;
export const OCBC_CARD_NAME = 'My Credit Card';
