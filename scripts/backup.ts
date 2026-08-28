/**
 * backup.ts — dump every table to a timestamped file outside the repo.
 *
 * The Supabase database is the only copy of these finances. There is no
 * point-in-time recovery on the free tier and no export anywhere else, so a
 * mistaken delete or a dropped table is permanent. This is the cheap insurance:
 * run it weekly, keep the files.
 *
 * Run with: npm run backup
 *
 * READ-ONLY against the database — it only SELECTs.
 *
 * Where files go: ../mooolah-backups relative to the repo, i.e. deliberately
 * OUTSIDE the working tree, so a backup full of real transactions can never be
 * committed by accident. Override with BACKUP_DIR=/some/path.
 *
 * Old files are never deleted unless you ask: `npm run backup -- --prune 12`
 * keeps the newest 12 and removes the rest.
 */

import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { supabase } from '../lib/supabase';

const TABLES = ['categories', 'payment_types', 'transactions', 'merchant_categories', 'budgets'] as const;

const backupDir = process.env.BACKUP_DIR
  ? resolve(process.env.BACKUP_DIR)
  : resolve(process.cwd(), '..', 'mooolah-backups');

function parsePrune(argv: string[]): number | null {
  const i = argv.indexOf('--prune');
  if (i === -1) return null;
  const n = Number(argv[i + 1]);
  if (!Number.isInteger(n) || n < 1) {
    console.error('--prune needs a positive integer, e.g. --prune 12');
    process.exit(1);
  }
  return n;
}

/** Newest-first list of previous backups. */
function existingBackups(): string[] {
  try {
    return readdirSync(backupDir)
      .filter((f) => /^mooolah-backup-.*\.json$/.test(f))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.join(','), ...rows.map((r) => columns.map((c) => escape(r[c])).join(','))].join('\n');
}

async function main() {
  const prune = parsePrune(process.argv.slice(2));
  const previous = existingBackups();

  const dump: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    // Page through: Supabase caps a plain select, and a silently truncated
    // backup is worse than no backup.
    const rows: unknown[] = [];
    const pageSize = 1000;
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1);
      if (error) {
        console.error(`FAILED reading ${table}: ${error.message}`);
        process.exit(1);
      }
      rows.push(...(data ?? []));
      if (!data || data.length < pageSize) break;
    }
    dump[table] = rows;
    counts[table] = rows.length;
  }

  mkdirSync(backupDir, { recursive: true });
  const stamp = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const jsonPath = join(backupDir, `mooolah-backup-${stamp}.json`);
  const csvPath = join(backupDir, `mooolah-backup-${stamp}-transactions.csv`);

  writeFileSync(jsonPath, JSON.stringify({ takenAt: new Date().toISOString(), counts, tables: dump }, null, 2));
  writeFileSync(csvPath, toCsv(dump.transactions as Record<string, unknown>[]));

  console.log(`Backup written to ${backupDir}`);
  for (const table of TABLES) console.log(`  ${String(counts[table]).padStart(5)}  ${table}`);
  console.log(`  ${(statSync(jsonPath).size / 1024).toFixed(0)} KB  ${jsonPath.split('/').pop()}`);

  // Compare against the previous backup: a table that shrank is the signal this
  // whole exercise exists for.
  if (previous.length > 0) {
    try {
      const before = JSON.parse(readFileSync(join(backupDir, previous[0]), 'utf8')) as { counts?: Record<string, number> };
      const shrunk = TABLES.filter((t) => (before.counts?.[t] ?? 0) > counts[t]);
      if (shrunk.length > 0) {
        console.log('\nWARNING — fewer rows than the previous backup:');
        for (const t of shrunk) console.log(`  ${t}: ${before.counts?.[t]} → ${counts[t]}`);
        console.log(`  previous file: ${previous[0]}`);
        console.log('  If you did not delete those rows, restore from that file before running again.');
      }
    } catch {
      // An unreadable previous backup is not a reason to fail this one.
    }
  }

  const all = existingBackups();
  console.log(`\n${all.length} backup${all.length === 1 ? '' : 's'} kept in ${backupDir}`);

  if (prune !== null && all.length > prune) {
    const doomed = all.slice(prune);
    for (const f of doomed) {
      unlinkSync(join(backupDir, f));
      const csv = f.replace(/\.json$/, '-transactions.csv');
      try { unlinkSync(join(backupDir, csv)); } catch { /* csv may not exist for older runs */ }
    }
    console.log(`Pruned ${doomed.length} older backup${doomed.length === 1 ? '' : 's'}, kept the newest ${prune}.`);
  }
}

main();
