import type { ParsedTransaction } from './uob';

type DateFields = { date: number; month: number; year: number };

/**
 * Parse a DBS card transaction alert body (sender ibanking.alert@dbs.com),
 * per PRD §4.1.5.
 *
 * DBS sends these as HTML with no text/plain alternative, so the body reaching
 * this function has been flattened by htmlToText() (lib/html-to-text.ts). After
 * flattening, the alert is a label/value block, one field per line:
 *
 *   We refer to your card transaction request dated DD/MM/YY. We are pleased
 *   to confirm that the transaction was completed.
 *   Date & Time: 24 AUG 18:50 (SGT)
 *   Amount: SGD24.90
 *   From: DBS/POSB card ending NNNN
 *   To: MERCHANT NAME Singapore SGP
 *   If unauthorised, please login to DBS digibank mobile to report fraud ...
 *
 * Returns a ParsedTransaction, or null for anything else — including every
 * other alert DBS sends from the same address. null means "skip, leave
 * unread"; see findash-parser-proof-toolkit §6 for that contract.
 *
 * Regex derivation (one row per capture group and non-obvious literal):
 *
 *   ^\s*Amount\s*:\s*SGD\s*([\d,]+\.?\d*)
 *     ^ + /m       the value is its own line; an anchor stops "Amount:" inside
 *                  prose from being read as the field
 *     [\d,]        commas live INSIDE the class and are stripped before
 *                  parseFloat — parseFloat('1,205.50') === 1 (toolkit §2.4)
 *     \s* after :  DBS writes "SGD24.90" today; tolerate "SGD 24.90"
 *
 *   ^\s*From\s*:\s*.*?card\s+ending\s+(\d{4})
 *     .*?          lazy: "DBS/POSB card ending NNNN" — the issuer text before
 *                  "card ending" varies by product and is not needed
 *     (\d{4})      last four only; the card is resolved through the
 *                  payment_types table, never hardcoded here (commit e0c5c44)
 *
 *   ^\s*To\s*:\s*(\S.*)$
 *     (\S.*)       merchant runs to end of line; `.` excludes \n, so the line
 *                  break after the value is the terminator. \S forces at least
 *                  one non-space character, so "To:" alone cannot match
 *
 * The body is truncated at "If unauthorised" first, exactly as the UOB parser
 * does: every field of interest precedes that sentence, and the text after it
 * is boilerplate that could otherwise satisfy a field regex.
 *
 * Trigger gate — both sentences must be present:
 *   1. "We refer to your card transaction request" identifies this template
 *      family (DBS uses the same shell for login, transfer and PayNow alerts).
 *   2. "transaction was completed" confirms it went through. Note this does
 *      NOT match "was not completed", so a declined-transaction alert built on
 *      the same template cannot import as spend.
 * Any other DBS alert returns null by design. Refunds, reversals and declines
 * are unverified — no sample has been seen — and adding a pattern for one
 * without a real sample is how false transactions reach a live ledger.
 */
export function parseDBS(
  body: string,
  dateFields: DateFields,
  paymentTypeMap: Map<string, string>,
): ParsedTransaction | null {
  const boundaryIdx = body.indexOf('If unauthorised');
  const truncated = boundaryIdx !== -1 ? body.slice(0, boundaryIdx) : body;

  if (!/We refer to your card transaction request/i.test(truncated)) return null;
  if (!/transaction\s+was\s+completed/i.test(truncated)) return null;

  const amountMatch = truncated.match(/^\s*Amount\s*:\s*SGD\s*([\d,]+\.?\d*)/im);
  const cardMatch = truncated.match(/^\s*From\s*:\s*.*?card\s+ending\s+(\d{4})/im);
  const detailMatch = truncated.match(/^\s*To\s*:\s*(\S.*)$/im);

  if (!amountMatch || !cardMatch || !detailMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  const payment_type = paymentTypeMap.get(cardMatch[1]);
  // DBS pads values with runs of spaces ("Scan &  Singapore     SGP"); collapse
  // them so the detail string is stable — it is the merchant_categories key.
  const detail = detailMatch[1].trim().replace(/\s+/g, ' ');

  if (!payment_type || !(amount > 0) || !detail) return null;

  return { ...dateFields, amount, detail, payment_type };
}
