import {
  UOB_LAST4_TO_CARD,
  CITI_ACCOUNT_PATTERNS,
  CITI_CARD_NAME,
  CITI_SECTION_PATTERN,
  DBS_CARD_PATTERN,
  DBS_CARD_NAME,
  OCBC_CARD_PATTERN,
  OCBC_CARD_NAME,
} from './statement-cards';

// Bank e-statement parsers
// Formats derived from reference PDFs: eStatement_uob.pdf, eStatement_citi.pdf,
// eStatement_dbs.pdf, eStatement_ocbc.pdf

export interface ParsedTransaction {
  card_name: string;
  date: string;         // "DD MMM YYYY"
  merchant: string;     // normalised
  raw_merchant: string; // as extracted from PDF
  amount: number;
}

export interface ParseResult {
  cards: string[];
  transactions: ParsedTransaction[];
}

// ---------------------------------------------------------------------------
// Shared utilities
// ---------------------------------------------------------------------------

const MONTH_MAP: Record<string, number> = {
  JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6,
  JUL: 7, AUG: 8, SEP: 9, OCT: 10, NOV: 11, DEC: 12,
};

const MONTH_NAMES = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/** Date renderings seen across UOB, Citi, DBS and OCBC statements. */
const STATEMENT_DATE_PATTERNS: RegExp[] = [
  /\b\d{1,2}[-/ ][A-Za-z]{3}[-/ ]\d{2,4}\b/,     // 26 APR 2026, 18-Apr-26
  /\b[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}\b/,      // April 15, 2026
  /\b\d{1,2}[-/]\d{1,2}[-/]\d{2,4}\b/,          // 18-04-2026
];

/** Pull a plausible year out of a matched date string. */
function yearFromDateString(d: string): number | null {
  const four = d.match(/\b(20\d{2})\b/);
  if (four) return parseInt(four[1], 10);
  const two = d.match(/(\d{2})\s*$/);
  if (two) return 2000 + parseInt(two[1], 10);
  return null;
}

/**
 * Year of the statement.
 *
 * This used to be "the first 20xx token anywhere in the document", which is
 * only ever right by luck: DBS prints a 2017 in its boilerplate and OCBC a
 * 2000, so those statements came out dated nine and twenty-six years early.
 *
 * Now it finds the statement-date FIELD. The label appears several times —
 * often first inside interest-rate small print — so every occurrence is tried
 * and the first that actually yields a date within a plausible range wins.
 */
function extractYear(text: string): number {
  const currentYear = new Date().getFullYear();
  const label = /statement\s*date/gi;
  let m: RegExpExecArray | null;

  while ((m = label.exec(text)) !== null) {
    const window = text.slice(m.index, m.index + 300);
    for (const pattern of STATEMENT_DATE_PATTERNS) {
      const found = window.match(pattern);
      if (!found) continue;
      const year = yearFromDateString(found[0]);
      if (year !== null && year >= 2000 && year <= currentYear + 1) return year;
    }
  }

  // Nothing labelled: fall back to the old heuristic rather than failing.
  const any = text.match(/20\d{2}/);
  return any ? parseInt(any[0], 10) : currentYear;
}

/** Normalise a raw merchant string for cross-reference matching. */
export function normalizeMerchant(raw: string): string {
  let s = raw.toUpperCase().trim();

  // Grab-specific: collapse transaction ID "GRAB* A-XXXXXXX ..." → "GRAB*"
  s = s.replace(/^(GRAB\*)\s+\S+\s*(.*)$/, (_m, prefix, rest) => {
    // rest may be "Singapore SG" etc — will be stripped below
    return `${prefix} ${rest}`.trim();
  });

  // AMAZE* — keep full description but strip location
  // Strip trailing country codes (SG, SGP, SE, IE, GBR, US, AU, ...)
  s = s.replace(/\s+\b(SG|SGP|SE|IE|GBR|US|AU|JP|KR|GB|DE|FR|NL|HK|TW|TH|MY|ID|PH|VN)\b\s*$/, '');

  // Strip trailing city: "Singapore", "SINGAPORE" with optional trailing digits/codes
  s = s.replace(/\s+SINGAPORE\s*\d*\s*$/, '');

  // Strip trailing 3+-digit store/branch numbers
  s = s.replace(/\s+\d{3,}\s*$/, '');

  // Strip company suffixes
  s = s.replace(/\s+PTE\.?\s*(LTD\.?|LIMITED)\s*/i, '');

  // Strip "N/A"
  s = s.replace(/\s+N\/A\s*$/, '');

  return s.trim();
}

function parseAmount(s: string): number {
  return parseFloat(s.replace(/,/g, ''));
}

// ---------------------------------------------------------------------------
// UOB parser
// Format: multi-card statement
// Cards identified by last-four via UOB_LAST4_TO_CARD in lib/statement-cards.ts
// Transaction lines: "DD MON  DD MON  DESCRIPTION  AMOUNT"  (with optional "CR" suffix)
// Ref No. lines follow some transactions on a separate line
// ---------------------------------------------------------------------------

// Section boundaries: hitting one of these means any half-built transaction is
// abandoned.
const UOB_SKIP = /PREVIOUS BALANCE|PAYMT THRU|SUB TOTAL|TOTAL BALANCE|UOB SMARTPAY|Post\s*Date|Trans\s*Date|Description of Transaction|Transaction Amount/i;

// A "Ref No." line sits BETWEEN a transaction's date line and its amount line.
// It used to be in UOB_SKIP, and skip lines clear the pending transaction, so
// the amount that followed was orphaned: a real statement parsed 1 of 49 rows,
// silently, which made the e-statement fraud check look clean when it had
// examined almost nothing. It is not a boundary — never let it clear pending.
const UOB_REF = /Ref No\./i;

export function parseUOB(text: string): ParseResult | null {
  if (!/United Overseas Bank/i.test(text)) return null;

  const year = extractYear(text);
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const transactions: ParsedTransaction[] = [];
  let currentCard: string | null = null;
  let pending: { date: string; desc: string } | null = null;

  for (const line of lines) {
    // New card section: card number line like "NNNN-NNNN-NNNN-NNNN CARDHOLDER NAME"
    const cardLine = line.match(/(\d{4}-\d{4}-\d{4}-(\d{4}))/);
    if (cardLine) {
      currentCard = UOB_LAST4_TO_CARD[cardLine[2]] ?? null;
      pending = null;
      continue;
    }

    if (!currentCard) continue;
    if (!UOB_REF.test(line) && UOB_SKIP.test(line)) { pending = null; continue; }

    // Transaction with amount on same line: "DD MON  DD MON  DESC  AMOUNT [CR]"
    const fullTx = line.match(/^(\d{2}) ([A-Z]{3})\s+(\d{2}) ([A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})\s*(CR)?\s*$/);
    if (fullTx) {
      const [, , , txDay, txMon, desc, amtStr, cr] = fullTx;
      if (!cr && !/(PAYMT THRU|SMARTPAY)/i.test(desc)) {
        const raw = desc.trim();
        transactions.push({
          card_name: currentCard,
          date: `${txDay} ${txMon} ${year}`,
          merchant: normalizeMerchant(raw),
          raw_merchant: raw,
          amount: parseAmount(amtStr),
        });
      }
      pending = null;
      continue;
    }

    // Transaction without amount: "DD MON  DD MON  DESC"
    const txNoAmt = line.match(/^(\d{2}) ([A-Z]{3})\s+(\d{2}) ([A-Z]{3})\s+(.+)$/);
    if (txNoAmt) {
      pending = { date: `${txNoAmt[3]} ${txNoAmt[4]} ${year}`, desc: txNoAmt[5].trim() };
      continue;
    }

    // Standalone amount (continuation of pending tx, possibly on Ref No. line)
    if (pending) {
      // Amount might be at the end of a Ref No. line or on its own line
      const amtMatch = line.match(/([\d,]+\.\d{2})\s*(CR)?\s*$/);
      if (amtMatch && !amtMatch[2]) {
        const raw = pending.desc;
        if (!/(PAYMT THRU|SMARTPAY)/i.test(raw)) {
          transactions.push({
            card_name: currentCard,
            date: pending.date,
            merchant: normalizeMerchant(raw),
            raw_merchant: raw,
            amount: parseAmount(amtMatch[1]),
          });
        }
        pending = null;
      } else if (amtMatch && amtMatch[2]) {
        // CR — skip
        pending = null;
      }
    }
  }

  if (transactions.length === 0) return null;
  const cards = [...new Set(transactions.map(t => t.card_name))];
  return { cards, transactions };
}

// ---------------------------------------------------------------------------
// Citibank parser
// Single card, identified by CITI_ACCOUNT_PATTERNS in lib/statement-cards.ts
// Transaction lines: "DD MON  DESCRIPTION  [CITY  CC]  AMOUNT"
// ---------------------------------------------------------------------------

const CITI_SKIP = /BALANCE PREVIOUS STATEMENT|SUB-TOTAL|GRAND TOTAL|^INTEREST\s|LATE CHARGE FEE|CCY CONVERSION FEE/i;

export function parseCiti(text: string): ParseResult | null {
  if (!/Citibank/i.test(text)) return null;

  const year = extractYear(text);
  // Detect card from account number
  const acctMatch = CITI_ACCOUNT_PATTERNS.some((p) => p.test(text));
  const cardName = acctMatch ? CITI_CARD_NAME : null;
  if (!cardName) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const transactions: ParsedTransaction[] = [];
  let inTxSection = false;

  for (const line of lines) {
    // Transaction section starts after this header
    if (CITI_SECTION_PATTERN.test(line)) {
      inTxSection = true;
      continue;
    }
    if (/GRAND TOTAL|YOUR CITI THANKYOU POINTS/i.test(line)) {
      inTxSection = false;
      continue;
    }
    if (!inTxSection) continue;
    if (CITI_SKIP.test(line)) continue;

    // Transaction: "DD MON  DESCRIPTION  AMOUNT"
    const tx = line.match(/^(\d{2}) ([A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})$/);
    if (!tx) continue;

    const [, txDay, txMon, rawDesc, amtStr] = tx;
    if (CITI_SKIP.test(rawDesc)) continue;

    // Strip trailing "City CC" from description (e.g., "Singapore SG", "Stockholm SE")
    const raw = rawDesc
      .replace(/\s+\b[A-Z]{2}\b\s*$/, '')       // country code
      .replace(/\s+[A-Z][a-z]+\s*$/, '')          // city (mixed case)
      .replace(/\s+[A-Z]{3,}\s*$/, '')            // uppercase city
      .trim();

    if (!raw) continue;
    transactions.push({
      card_name: cardName,
      date: `${txDay} ${txMon} ${year}`,
      merchant: normalizeMerchant(raw),
      raw_merchant: raw,
      amount: parseAmount(amtStr),
    });
  }

  if (transactions.length === 0) return null;
  return { cards: [cardName], transactions };
}

// ---------------------------------------------------------------------------
// DBS parser
// Single card, identified by DBS_CARD_PATTERN in lib/statement-cards.ts
// Transaction lines: "DD MON  DESCRIPTION  AMOUNT [CR]"
// ---------------------------------------------------------------------------

const DBS_SKIP = /PREVIOUS BALANCE|BILL PAYMENT|SUB-TOTAL|^TOTAL:|REF NO:|NEW TRANSACTIONS|GRAND TOTAL/i;

export function parseDBS(text: string): ParseResult | null {
  if (!(/DBS Bank|DBS Cards/i.test(text))) return null;

  const year = extractYear(text);
  // Find card by last 4 digits
  const cardLine = text.match(DBS_CARD_PATTERN);
  const cardName = cardLine ? DBS_CARD_NAME : null;
  if (!cardName) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const transactions: ParsedTransaction[] = [];
  let inSection = false;

  for (const line of lines) {
    if (/DBS WOMAN'?S WORLD MASTERCARD/i.test(line)) { inSection = true; continue; }
    if (/GRAND TOTAL FOR ALL CARD ACCOUNTS|SUB-TOTAL:/i.test(line)) { inSection = false; continue; }
    if (!inSection) continue;
    if (DBS_SKIP.test(line)) continue;

    // Transaction: "DD MON  DESCRIPTION  AMOUNT [CR]"
    const tx = line.match(/^(\d{2}) ([A-Z]{3})\s+(.+?)\s+([\d,]+\.\d{2})\s*(CR)?\s*$/);
    if (!tx) continue;

    const [, txDay, txMon, rawDesc, amtStr, cr] = tx;
    if (cr) continue; // payment
    if (DBS_SKIP.test(rawDesc)) continue;

    const raw = rawDesc.trim();
    transactions.push({
      card_name: cardName,
      date: `${txDay} ${txMon} ${year}`,
      merchant: normalizeMerchant(raw),
      raw_merchant: raw,
      amount: parseAmount(amtStr),
    });
  }

  if (transactions.length === 0) return null;
  return { cards: [cardName], transactions };
}

// ---------------------------------------------------------------------------
// OCBC parser
// Single card, identified by OCBC_CARD_PATTERN in lib/statement-cards.ts
// Transaction lines: "DD/MM  DESCRIPTION  [CITY  CC]  AMOUNT"
// Payments are in parentheses: "(463.87)"
// ---------------------------------------------------------------------------

const OCBC_SKIP = /LAST MONTH'?S BALANCE|PAYMENT|SUBTOTAL|^TOTAL\b/i;

export function parseOCBC(text: string): ParseResult | null {
  if (!/Oversea-Chinese Banking|OCBC Bank/i.test(text)) return null;

  // Shared with the other banks — OCBC's bespoke version defaulted to a
  // hardcoded 2026 and otherwise took the first 20xx token, which is a 2000
  // buried in this statement's small print.
  const year = extractYear(text);

  const cardLine = text.match(OCBC_CARD_PATTERN);
  const cardName = cardLine ? OCBC_CARD_NAME : null;
  if (!cardName) return null;

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const transactions: ParsedTransaction[] = [];
  let inSection = false;

  for (const line of lines) {
    if (/OCBC REWARDS CARD/i.test(line)) { inSection = true; continue; }
    if (/SUBTOTAL|TOTAL AMOUNT DUE/i.test(line)) { inSection = false; continue; }
    if (!inSection) continue;
    if (OCBC_SKIP.test(line)) continue;

    // OCBC prints the amount BEFORE the description, tab-separated:
    //   "DD/MM  AMOUNT<TAB>DESCRIPTION"
    // The parser previously expected "DD/MM DESCRIPTION AMOUNT", which matched
    // nothing at all — a real statement parsed zero rows and the upload came
    // back as "Unrecognised statement format".
    // Credits and payments put the amount in parentheses after the date.
    if (/^\d{2}\/\d{2}\s+\(/.test(line)) continue;

    const tx = line.match(/^(\d{2})\/(\d{2})\s+([\d,]+\.\d{2})[\t ]+(.+)$/);
    if (!tx) continue;

    const [, txDay, txMonNum, amtStr, rawDesc] = tx;
    if (OCBC_SKIP.test(rawDesc)) continue;
    // Skip payment lines
    if (/PAYMENT|MONEY SEND/i.test(rawDesc)) continue;

    const monthNum = parseInt(txMonNum);
    const txMon = MONTH_NAMES[monthNum - 1];
    const raw = rawDesc.trim()
      .replace(/\s+\b[A-Z]{2,3}\b\s*$/, '')   // trailing country code
      .replace(/\s+[A-Z][a-z]+\s*$/, '')       // trailing city (mixed case)
      .trim();

    transactions.push({
      card_name: cardName,
      date: `${txDay} ${txMon} ${year}`,
      merchant: normalizeMerchant(raw),
      raw_merchant: raw,
      amount: parseAmount(amtStr),
    });
  }

  if (transactions.length === 0) return null;
  return { cards: [cardName], transactions };
}

// ---------------------------------------------------------------------------
// Main entry point: try all parsers
// ---------------------------------------------------------------------------

export function parseStatement(text: string): ParseResult | null {
  return parseUOB(text) ?? parseCiti(text) ?? parseDBS(text) ?? parseOCBC(text) ?? null;
}
