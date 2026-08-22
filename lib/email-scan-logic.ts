// Shared email-scan business logic.
// Used by both the Vercel cron endpoint (with auth) and the Settings manual trigger.

import { supabase } from './supabase';
import { fetchUnreadEmails, markAsRead, headerToSGT } from './gmail';
import { parseUOB } from './parsers/uob';
import { parseCitibank } from './parsers/citibank';

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
    const fromLower = email.from.toLowerCase();

    let parsed;
    if (fromLower.includes('unialerts@uobgroup.com')) {
      parsed = parseUOB(email.plainText, dateFields, paymentTypeMap);
    } else if (fromLower.includes('alerts@citibank.com.sg')) {
      parsed = parseCitibank(email.plainText, dateFields, paymentTypeMap);
    } else {
      console.log(`email-scan: unknown sender "${email.from}", skipping`);
      skipped++;
      continue;
    }

    if (parsed === null) {
      console.log(`email-scan: unrecognised format from "${email.from}" (id: ${email.id}), skipping`);
      skipped++;
      continue;
    }

    if (parsed === 'reversal') {
      console.log(`email-scan: reversal received (id: ${email.id}), skipping`);
      await markAsRead(email.id);
      skipped++;
      continue;
    }

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
