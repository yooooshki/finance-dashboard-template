import type { ParsedTransaction } from './uob';

type DateFields = { date: number; month: number; year: number };

/**
 * Parse a Citibank alert email body.
 *
 * Returns:
 *   - ParsedTransaction  — charge email, successfully parsed
 *   - 'reversal'         — reversal email (do not insert, mark as read)
 *   - null               — unrecognised format
 *
 * @param body         Plain-text email body
 * @param dateFields   Date components from the email Date header (SGT)
 * @param paymentTypeMap  Map of last_four → payment type name from the DB
 */
export function parseCitibank(
  body: string,
  dateFields: DateFields,
  paymentTypeMap: Map<string, string>,
): ParsedTransaction | 'reversal' | null {
  // Pattern B — reversal (check first; skip without inserting)
  if (body.includes('there is a reversal made on your Citi Rewards Card')) {
    return 'reversal';
  }

  // Pattern A — charge
  if (!body.includes('there is a charge made on your Citi Rewards Card')) {
    return null;
  }

  // Case-insensitive; flexible whitespace — actual emails use "Account Number",
  // "Transaction  details" (two spaces), and multiple spaces before/after colons.
  const accountMatch = body.match(/Account\s+Number\s*:\s*.+-(\d{4})/i);
  const amountMatch = body.match(/Transaction\s+amount\s*:\s*SGD([\d.]+)/i);
  const detailMatch = body.match(/Transaction\s+details\s*:\s*(.+)/i);

  if (!accountMatch || !amountMatch || !detailMatch) {
    return null;
  }

  const lastFour = accountMatch[1];
  const amount = parseFloat(amountMatch[1]);
  const detail = detailMatch[1].trim();
  const payment_type = paymentTypeMap.get(lastFour);

  if (!payment_type || amount <= 0 || !detail) {
    return null;
  }

  return { ...dateFields, amount, detail, payment_type };
}
