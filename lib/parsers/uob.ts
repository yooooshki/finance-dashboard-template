export type ParsedTransaction = {
  date: number;
  month: number;
  year: number;
  amount: number;
  detail: string;
  payment_type: string;
};

type DateFields = { date: number; month: number; year: number };

export function parseUOB(
  body: string,
  dateFields: DateFields,
  paymentTypeMap: Map<string, string>,
): ParsedTransaction | null {
  const boundaryIdx = body.indexOf('If unauthorised, call');
  const truncated = boundaryIdx !== -1 ? body.slice(0, boundaryIdx) : body;

  // Pattern A — card transaction
  const patternA =
    /A transaction of SGD ([\d,]+\.?\d*) was made with your UOB Card ending (\d{4}) on .+? at (.+?)\. If unauthorised/;
  const matchA = body.match(patternA);
  if (matchA) {
    const amount = parseFloat(matchA[1].replace(/,/g, ''));
    const lastFour = matchA[2];
    const detail = matchA[3].trim();
    const payment_type = paymentTypeMap.get(lastFour);
    if (payment_type && amount > 0 && detail) {
      return { ...dateFields, amount, detail, payment_type };
    }
  }

  // Pattern B — NETS QR payment
  const patternB =
    /You made a NETS QR payment of SGD ([\d,]+\.?\d*) to (.+?) on your a\/c ending \d{4}/;
  const matchB = truncated.match(patternB);
  if (matchB) {
    const amount = parseFloat(matchB[1].replace(/,/g, ''));
    const detail = matchB[2].trim();
    if (amount > 0 && detail) {
      return { ...dateFields, amount, detail, payment_type: 'UOB ONE Debit' };
    }
  }

  // Pattern C — PayNow transfer sent
  // "You made a PayNow transfer of SGD 8.20 to EXAMPLE NOODLE HOUSE (UEN ending 123A) on your a/c ending NNNN..."
  const patternC =
    /You made a PayNow transfer of SGD ([\d,]+\.?\d*) to (.+?)(?:\s*\(UEN| on your a\/c)/;
  const matchC = truncated.match(patternC);
  if (matchC) {
    const amount = parseFloat(matchC[1].replace(/,/g, ''));
    const detail = matchC[2].trim();
    if (amount > 0 && detail) {
      return { ...dateFields, amount, detail, payment_type: 'UOB ONE Debit' };
    }
  }

  // Pattern D — PayNow received (stored as negative amount to offset spend)
  // "You have received SGD 50.00 in your PayNow-linked account ending NNNN on 15-MAY-2026 02:11PM."
  const patternD =
    /You have received SGD ([\d,]+\.?\d*) in your PayNow-linked account ending \d{4}/;
  const matchD = body.match(patternD);
  if (matchD) {
    const amount = parseFloat(matchD[1].replace(/,/g, ''));
    if (amount > 0) {
      return { ...dateFields, amount: -amount, detail: 'PayNow Received', payment_type: 'UOB ONE Debit' };
    }
  }

  return null;
}
