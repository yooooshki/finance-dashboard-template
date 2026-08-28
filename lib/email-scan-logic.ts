// Shared email-scan business logic.
// Used by both the Vercel cron endpoint (with auth) and the Settings manual trigger.

import { supabase } from './supabase';
import { fetchUnreadEmails, markAsRead, headerToSGT } from './gmail';
import { parseUOB, type ParsedTransaction } from './parsers/uob';
import { parseCitibank } from './parsers/citibank';
import { parseDBS } from './parsers/dbs';

type DateFields = { date: number; month: number; year: number };

/**
 * What a scan would do with one email.
 *
 * Exported so `npm run doctor` can simulate a scan without writing anything:
 * a diagnostic that re-implements the dispatch would drift from the cron and
 * then lie about it.
 */
export type ScanOutcome =
  | { kind: 'transaction'; transaction: ParsedTransaction }
  | { kind: 'reversal' }
  | { kind: 'unrecognised' }
  | { kind: 'unknown-sender' };

/** Route one email to the parser for its sender. Pure — no DB, no Gmail, no writes. */
export function classifyEmail(
  from: string,
  body: string,
  dateFields: DateFields,
  paymentTypeMap: Map<string, string>,
): ScanOutcome {
  const fromLower = from.toLowerCase();

  let parsed: ParsedTransaction | 'reversal' | null;
  if (fromLower.includes('unialerts@uobgroup.com')) {
    parsed = parseUOB(body, dateFields, paymentTypeMap);
  } else if (fromLower.includes('alerts@citibank.com.sg')) {
    parsed = parseCitibank(body, dateFields, paymentTypeMap);
  } else if (fromLower.includes('ibanking.alert@dbs.com')) {
    parsed = parseDBS(body, dateFields, paymentTypeMap);
  } else {
    return { kind: 'unknown-sender' };
  }

  if (parsed === null) return { kind: 'unrecognised' };
  if (parsed === 'reversal') return { kind: 'reversal' };
  return { kind: 'transaction', transaction: parsed };
}

export async function runEmailScan(): Promise<{ imported: number; skipped: number }> {
  const { data: paymentTypes, error: ptError } = await supabase
    .from('payment_types')
    .select('name, last_four');
  if (ptError) throw new Error(`Failed to fetch payment types: ${ptError.message}`);

  const paymentTypeMap = new Map<string, string>(
    (paymentTypes ?? [])
      .filter((pt) => pt.last_four)
      .map((pt) => [pt.last_four as string, pt.name]),
  );

  const emails = await fetchUnreadEmails();

  let imported = 0;
  let skipped = 0;

  for (const email of emails) {
    const dateFields = headerToSGT(email.dateHeader);
    const outcome = classifyEmail(email.from, email.plainText, dateFields, paymentTypeMap);

    if (outcome.kind === 'unknown-sender') {
      console.log(`email-scan: unknown sender "${email.from}", skipping`);
      skipped++;
      continue;
    }

    if (outcome.kind === 'unrecognised') {
      console.log(`email-scan: unrecognised format from "${email.from}" (id: ${email.id}), skipping`);
      skipped++;
      continue;
    }

    if (outcome.kind === 'reversal') {
      console.log(`email-scan: reversal received (id: ${email.id}), skipping`);
      await markAsRead(email.id);
      skipped++;
      continue;
    }

    const parsed = outcome.transaction;

    const { data: mc } = await supabase
      .from('merchant_categories')
      .select('category')
      .eq('detail_key', parsed.detail)
      .maybeSingle();

    const { error: insertError } = await supabase.from('transactions').insert({
      date: parsed.date,
      month: parsed.month,
      year: parsed.year,
      amount: parsed.amount,
      category: mc?.category ?? null,
      payment_type: parsed.payment_type,
      detail: parsed.detail,
      source: 'email',
      status: 'pending',
    });

    if (insertError) {
      console.error(`email-scan: insert failed for email ${email.id}`, insertError);
      skipped++;
      continue;
    }

    await markAsRead(email.id);
    imported++;
  }

  return { imported, skipped };
}
