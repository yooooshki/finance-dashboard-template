import { NextRequest, NextResponse } from 'next/server';
// pdf-parse v2 exports a PDFParse class; it is not callable. Calling the module
// as a function (the v1 API) threw on every upload and the catch below turned
// it into a generic 422, so statement upload failed silently for every bank.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (options: { data: Buffer }) => {
    getText(): Promise<{ text: string }>;
    destroy(): Promise<void>;
  };
};
import { supabase } from '@/lib/supabase';
import { parseStatement, normalizeMerchant } from '@/lib/statement-parsers';
import { requireAuth } from '@/lib/require-auth';

export interface FlaggedTransaction {
  card_name: string;
  date: string;
  merchant: string;
  raw_merchant: string;
  amount: number;
}

export async function POST(req: NextRequest) {
  const denied = await requireAuth();
  if (denied) return denied;

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = formData.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'No PDF file provided' }, { status: 400 });
  }

  // Extract text from PDF
  let pdfText: string;
  try {
    const buffer = Buffer.from(await (file as File).arrayBuffer());
    const parser = new PDFParse({ data: buffer });
    try {
      pdfText = (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  } catch (err) {
    console.error('statement: PDF parse error', err);
    return NextResponse.json({ error: 'Failed to extract PDF text' }, { status: 422 });
  }

  // Run bank-specific parser
  const result = parseStatement(pdfText);
  if (!result) {
    return NextResponse.json({ error: 'Unrecognised statement format' }, { status: 422 });
  }

  // Fetch all committed (payment_type, detail) pairs from DB
  const { data: dbRows, error: dbError } = await supabase
    .from('transactions')
    .select('payment_type, detail')
    .eq('status', 'committed');

  if (dbError) {
    console.error('statement: Supabase error', dbError);
    return NextResponse.json({ error: 'Failed to query transaction history' }, { status: 500 });
  }

  // Build a lookup Set: "card_name::normalized_detail"
  const seen = new Set<string>();
  for (const row of dbRows ?? []) {
    if (row.payment_type && row.detail) {
      seen.add(`${row.payment_type}::${normalizeMerchant(row.detail)}`);
    }
  }

  // Flag transactions not in the seen set
  const flagged: FlaggedTransaction[] = [];
  for (const tx of result.transactions) {
    const key = `${tx.card_name}::${tx.merchant}`;
    if (!seen.has(key)) {
      flagged.push({
        card_name: tx.card_name,
        date: tx.date,
        merchant: tx.merchant,
        raw_merchant: tx.raw_merchant,
        amount: tx.amount,
      });
    }
  }

  return NextResponse.json({
    cards: result.cards,
    flagged,
    total_parsed: result.transactions.length,
    total_flagged: flagged.length,
  });
}
