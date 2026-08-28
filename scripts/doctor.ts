/**
 * doctor.ts — one command that says whether this install is healthy.
 *
 * STRICTLY READ-ONLY: it counts rows, exchanges the Gmail refresh token for an
 * access token, and lists mail. It never inserts, never updates, and never
 * marks an email read.
 *
 * Run with: npm run doctor
 *
 * It exists because every failure in this app is quiet. A dead Gmail token, a
 * card with no last-four, an unset APP_PASSPHRASE in production — none of them
 * raise anything a person sees; transactions just stop appearing. Every FAIL
 * below names the setup step that fixes it.
 *
 * Secrets are never printed: env vars are reported as set/missing, and the
 * mailbox address is masked.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { supabase } from '../lib/supabase';
import { checkGmailAccess, fetchUnreadEmails, headerToSGT, SCAN_QUERY, SCAN_MAX_RESULTS } from '../lib/gmail';
import { classifyEmail } from '../lib/email-scan-logic';

type Level = 'PASS' | 'WARN' | 'FAIL' | 'INFO';

let failures = 0;
let warnings = 0;

function line(level: Level, message: string, fix?: string) {
  if (level === 'FAIL') failures++;
  if (level === 'WARN') warnings++;
  const tag = level.padEnd(4);
  console.log(`  ${tag}  ${message}`);
  if (fix) console.log(`        → ${fix}`);
}

function section(title: string) {
  console.log(`\n${title}`);
}

function maskEmail(address: string): string {
  return address.replace(/^(.{1,4}).*(@.*)$/, '$1***$2');
}

// --- 1. Toolchain ----------------------------------------------------------
function checkNode() {
  section('Toolchain');
  const major = Number(process.versions.node.split('.')[0]);
  if (major >= 20) line('PASS', `Node ${process.versions.node}`);
  else line('FAIL', `Node ${process.versions.node} is too old`, 'Next.js 16 needs Node 20 or newer — SETUP.md step 1');
}

// --- 2. Environment --------------------------------------------------------
type EnvSpec = { name: string; requirement: 'always' | 'production' | 'gmail'; note?: string };

const ENV: EnvSpec[] = [
  { name: 'SUPABASE_URL', requirement: 'always' },
  { name: 'SUPABASE_SERVICE_ROLE_KEY', requirement: 'always' },
  { name: 'APP_PASSPHRASE', requirement: 'production', note: 'no sign-in screen locally without it' },
  { name: 'CRON_SECRET', requirement: 'production', note: 'the daily scan cannot authenticate without it' },
  { name: 'GMAIL_CLIENT_ID', requirement: 'gmail' },
  { name: 'GMAIL_CLIENT_SECRET', requirement: 'gmail' },
  { name: 'GMAIL_REFRESH_TOKEN', requirement: 'gmail' },
];

function checkEnv(): { gmailConfigured: boolean } {
  section('Environment (values are never printed)');
  const isSet = (n: string) => Boolean(process.env[n] && process.env[n]!.length > 0);

  for (const spec of ENV.filter((e) => e.requirement === 'always')) {
    if (isSet(spec.name)) line('PASS', `${spec.name} set`);
    else line('FAIL', `${spec.name} missing`, 'SETUP.md step 5 — `npm run setup` collects it, or step 3 to find it in Supabase');
  }

  for (const spec of ENV.filter((e) => e.requirement === 'production')) {
    if (isSet(spec.name)) line('PASS', `${spec.name} set`);
    else line('WARN', `${spec.name} not set locally — ${spec.note}`, 'Required on the deployed app: SETUP.md step 8');
  }

  const gmailVars = ENV.filter((e) => e.requirement === 'gmail');
  const setCount = gmailVars.filter((v) => isSet(v.name)).length;
  if (setCount === gmailVars.length) {
    line('PASS', 'Gmail credentials set (all three)');
    return { gmailConfigured: true };
  }
  if (setCount === 0) {
    line('INFO', 'Gmail not configured — email scanning is off, /add still works');
    return { gmailConfigured: false };
  }
  for (const v of gmailVars) {
    if (!isSet(v.name)) line('FAIL', `${v.name} missing while the other Gmail vars are set`, 'SETUP.md step 5 — re-run `npm run setup`, or clear all three');
  }
  return { gmailConfigured: false };
}

// --- 3. Database -----------------------------------------------------------
const TABLES = ['categories', 'payment_types', 'transactions', 'merchant_categories', 'budgets'];

async function checkDatabase() {
  section('Database');
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    line('FAIL', 'skipped — Supabase credentials missing');
    return;
  }

  for (const table of TABLES) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      line('FAIL', `table "${table}" unreachable: ${error.message}`, 'SETUP.md step 3 — run supabase/schema.sql in the SQL editor');
    } else {
      line('PASS', `${table} (${count ?? 0} row${count === 1 ? '' : 's'})`);
    }
  }

  const { data: cards, error: cardErr } = await supabase.from('payment_types').select('name, last_four');
  if (!cardErr && cards) {
    const withDigits = cards.filter((c) => c.last_four).length;
    if (withDigits === 0) {
      line('FAIL', 'no payment type has a card number set', 'Every email transaction will be skipped. Settings → set the last four digits');
    } else if (withDigits < cards.length) {
      line('WARN', `${withDigits} of ${cards.length} cards have their last four digits set`, 'Alerts for the others cannot be matched to a card and are skipped — Settings');
    } else {
      line('PASS', `all ${cards.length} cards can be matched to alerts`);
    }
  }

  const { count: pending } = await supabase
    .from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  line('INFO', `${pending ?? 0} transactions waiting on /pending`);
}

// --- 4. Gmail --------------------------------------------------------------
async function checkGmail(configured: boolean) {
  section('Gmail ingestion');
  if (!configured) {
    line('INFO', 'skipped — Gmail is not configured');
    return;
  }

  const access = await checkGmailAccess();
  if (!access.ok) {
    const invalidGrant = /invalid_grant/i.test(access.error);
    line('FAIL', `refresh token rejected: ${access.error.slice(0, 90)}`,
      invalidGrant
        ? 'Usually the OAuth consent screen is still in Testing (tokens expire after 7 days) — publish it (SETUP.md step 4d), then re-run `npm run setup` to mint a new token'
        : 'SETUP.md step 4 — re-check the Google OAuth client');
    return;
  }
  line('PASS', `refresh token works — mailbox ${maskEmail(access.mailbox)}`);
  line('INFO', `scan window: ${SCAN_QUERY}`);

  const { data: paymentTypes } = await supabase.from('payment_types').select('name, last_four');
  const map = new Map<string, string>(
    (paymentTypes ?? []).filter((pt) => pt.last_four).map((pt) => [pt.last_four as string, pt.name]),
  );

  const emails = await fetchUnreadEmails();
  if (emails.length >= SCAN_MAX_RESULTS) {
    line('WARN', `${emails.length} emails in the window, at the ${SCAN_MAX_RESULTS}-message cap`, 'Older ones wait for the next scan; raise SCAN_MAX_RESULTS in lib/gmail.ts if this persists');
  }

  let wouldImport = 0;
  let unrecognised = 0;
  let reversals = 0;
  for (const email of emails) {
    const outcome = classifyEmail(email.from, email.plainText, headerToSGT(email.dateHeader), map);
    if (outcome.kind === 'transaction') wouldImport++;
    else if (outcome.kind === 'reversal') reversals++;
    else unrecognised++;
  }

  line('INFO', `${emails.length} unread in the window — the next scan would import ${wouldImport}`);
  if (reversals > 0) line('INFO', `${reversals} reversal alerts (correctly skipped, marked read)`);
  if (unrecognised > 0) {
    line('WARN', `${unrecognised} do not parse and will stay unread`,
      'Some are ordinary notices (OTPs, service alerts). If one is a real transaction, dry-run it: see findash-diagnostics-and-tooling');
  }
}

// --- 5. Backups ------------------------------------------------------------
function checkBackups() {
  section('Backups');
  const dir = process.env.BACKUP_DIR
    ? resolve(process.env.BACKUP_DIR)
    : resolve(process.cwd(), '..', 'mooolah-backups');

  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => /^mooolah-backup-.*\.json$/.test(f)).sort().reverse();
  } catch {
    line('WARN', `no backup directory at ${dir}`, 'This database is the only copy of these finances — run `npm run backup`');
    return;
  }
  if (files.length === 0) {
    line('WARN', `no backups in ${dir}`, 'Run `npm run backup`');
    return;
  }

  const newest = files[0];
  const ageDays = (Date.now() - statSync(join(dir, newest)).mtimeMs) / 86_400_000;
  const detail = `${files.length} backup${files.length === 1 ? '' : 's'}, newest ${ageDays < 1 ? 'today' : `${Math.floor(ageDays)} day${Math.floor(ageDays) === 1 ? '' : 's'} old`}`;
  if (ageDays > 10) {
    line('WARN', `${detail} — weekly backups have stalled`, 'Run `npm run backup`');
  } else {
    line('PASS', detail);
  }
}

// --- 6. Scheduled scan -----------------------------------------------------
function checkCron() {
  section('Scheduled scan');
  try {
    const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
    const cron = config.crons?.[0];
    if (!cron) {
      line('FAIL', 'no cron job declared in vercel.json', 'The daily scan will never run — restore the crons block');
      return;
    }
    const match = String(cron.schedule).match(/^(\d+)\s+(\d+)\s+\*\s+\*\s+\*$/);
    if (match) {
      const sgtHour = (Number(match[2]) + 8) % 24;
      line('PASS', `${cron.path} at ${cron.schedule} UTC = ${String(sgtHour).padStart(2, '0')}:${match[1].padStart(2, '0')} SGT daily`);
    } else {
      line('PASS', `${cron.path} at ${cron.schedule} UTC`);
    }
  } catch (err) {
    line('FAIL', `could not read vercel.json: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// --- main ------------------------------------------------------------------
async function main() {
  const now = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 16);
  console.log(`Mooolah Tracker — doctor   ${now} SGT`);

  checkNode();
  const { gmailConfigured } = checkEnv();
  await checkDatabase();
  try {
    await checkGmail(gmailConfigured);
  } catch (err) {
    line('FAIL', `Gmail check crashed: ${err instanceof Error ? err.message : String(err)}`);
  }
  checkBackups();
  checkCron();

  console.log(
    failures > 0
      ? `\n${failures} problem${failures === 1 ? '' : 's'} to fix${warnings ? `, ${warnings} warning${warnings === 1 ? '' : 's'}` : ''}.`
      : warnings > 0
        ? `\nHealthy, with ${warnings} warning${warnings === 1 ? '' : 's'}.`
        : '\nAll checks passed.',
  );
  process.exit(failures > 0 ? 1 : 0);
}

main();
