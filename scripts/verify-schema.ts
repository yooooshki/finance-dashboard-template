/**
 * verify-schema.ts
 * Confirms every Supabase table exists and holds at least its seed rows.
 * A missing table fails; extra rows never do.
 * Run with: npm run verify-schema
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  process.exit(1);
}

const supabase = createClient(url, key);

type TableCheck = {
  table: string;
  expectedMin: number;
  expectedMax?: number;
};

// Seed counts are minimums, not exact: categories, payment types and budgets
// are all editable in Settings, so a growing count is normal and not a fault.
const checks: TableCheck[] = [
  { table: 'categories',          expectedMin: 17 },
  { table: 'payment_types',       expectedMin: 1  },
  { table: 'transactions',        expectedMin: 0  },
  { table: 'merchant_categories', expectedMin: 0  },
  { table: 'budgets',             expectedMin: 0  },
];

async function verify() {
  let allPassed = true;

  for (const { table, expectedMin, expectedMax } of checks) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error(`  FAIL  ${table}: ${error.message}`);
      allPassed = false;
      continue;
    }

    const actual = count ?? 0;
    const withinBounds =
      actual >= expectedMin && (expectedMax === undefined || actual <= expectedMax);

    const expected =
      expectedMax !== undefined && expectedMin === expectedMax
        ? `${expectedMin}`
        : `>= ${expectedMin}`;

    if (withinBounds) {
      console.log(`  OK    ${table} — ${actual} rows (expected ${expected})`);
    } else {
      console.error(`  FAIL  ${table} — ${actual} rows (expected ${expected})`);
      allPassed = false;
    }
  }

  if (allPassed) {
    console.log('\nSchema verified successfully.');
  } else {
    console.error('\nSome checks failed. Run supabase/schema.sql, then any file in\nsupabase/migrations/, in the Supabase SQL editor.');
    process.exit(1);
  }
}

verify();
