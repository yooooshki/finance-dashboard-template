/**
 * setup.ts — take a fresh clone to a running app.
 *
 * Run with: npm run setup
 *
 * What it does: collects the Supabase keys, generates the two secrets you would
 * otherwise paste by hand, walks you page by page through the Google Cloud
 * console if you do not have an OAuth client yet, and — the point of the
 * exercise — mints a Gmail refresh token through a real OAuth flow on this
 * machine, replacing the seven-step tour of the Google OAuth Playground that
 * SETUP.md's appendix describes. It writes .env.local and nothing else.
 *
 * What it deliberately does NOT do:
 *   - create accounts or projects (Supabase, Google, Vercel all require a human
 *     to click "allow" in their own UI — that is a security boundary, not an
 *     inconvenience worth automating around)
 *   - apply supabase/schema.sql. supabase-js speaks REST, not DDL; applying it
 *     needs the Supabase CLI, which is a dependency this project has not taken.
 *     Paste it once, then `npm run doctor` proves it landed
 *   - touch the database or the deployment. Nothing here writes to Supabase,
 *     and nothing here talks to Vercel
 *
 * Set SETUP_NO_BROWSER=1 to only print the consent URL instead of opening it
 * (headless machines, or when you want to authorise from another device).
 * SETUP_PORT overrides the loopback port if 8910 is taken.
 *
 * Safe to re-run: values already present in .env.local are kept, the file is
 * backed up before it is rewritten, and no secret is ever printed — with one
 * deliberate exception, the app passphrase, which is your login and is shown
 * once at the moment it is generated.
 */

import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { google } from 'googleapis';

const ENV_PATH = resolve(process.cwd(), '.env.local');
const CALLBACK_PORT = Number(process.env.SETUP_PORT ?? 8910);
const REDIRECT_URI = `http://localhost:${CALLBACK_PORT}`;
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify',
];

const rl = createInterface({ input: process.stdin, output: process.stdout });

function heading(text: string) {
  console.log(`\n\x1b[1m${text}\x1b[0m`);
}

async function ask(question: string): Promise<string> {
  return (await rl.question(`  ${question} `)).trim();
}

async function confirm(question: string, defaultYes = false): Promise<boolean> {
  const answer = (await ask(`${question} ${defaultYes ? '[Y/n]' : '[y/N]'}`)).toLowerCase();
  if (answer === '') return defaultYes;
  return answer.startsWith('y');
}

/** Read .env.local into a map, keeping the raw lines so comments survive a rewrite. */
function readEnvFile(): { lines: string[]; values: Map<string, string> } {
  if (!existsSync(ENV_PATH)) return { lines: [], values: new Map() };
  const lines = readFileSync(ENV_PATH, 'utf8').split('\n');
  const values = new Map<string, string>();
  for (const line of lines) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (match && match[2] !== '') values.set(match[1], match[2]);
  }
  return { lines, values };
}

/** Rewrite .env.local in place: update managed keys, append new ones, keep the rest. */
function writeEnvFile(existing: string[], updates: Map<string, string>) {
  if (existsSync(ENV_PATH)) {
    const backup = `${ENV_PATH}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    copyFileSync(ENV_PATH, backup);
    console.log(`\n  Previous .env.local backed up to ${backup.split('/').pop()}`);
  }

  const remaining = new Map(updates);
  const lines = existing.map((line) => {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=/);
    if (match && remaining.has(match[1])) {
      const key = match[1];
      const value = remaining.get(key)!;
      remaining.delete(key);
      return `${key}=${value}`;
    }
    return line;
  });

  for (const [key, value] of remaining) lines.push(`${key}=${value}`);
  writeFileSync(ENV_PATH, lines.join('\n').replace(/\n*$/, '\n'), { mode: 0o600 });
}

function openInBrowser(url: string) {
  // On a headless or remote machine there is no browser to open and the URL is
  // meant to be copied elsewhere; the flow works either way, since the URL is
  // always printed.
  if (process.env.SETUP_NO_BROWSER) return;
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  try {
    spawn(command, [url], { stdio: 'ignore', detached: true }).unref();
  } catch {
    // Printing the URL is the fallback, and it is printed either way.
  }
}

/**
 * Walk the user through the five Google Cloud pages, one at a time.
 *
 * None of this can be automated: Google offers no API for creating an OAuth
 * consent screen or client outside Identity-Aware Proxy, and that is
 * deliberate. Nor can the app ship a shared client — Gmail scopes are
 * "restricted", so an unverified app is capped at 100 users and lifting the cap
 * needs a CASA Tier 2 assessment. Every user owning their own client is what
 * keeps this project out of that regime.
 *
 * What CAN be removed is getting lost, which is where people actually fail. So
 * this opens each page in order and says what to click on it.
 */
type GuidedStep = { title: string; url: string; actions: string[] };

const GOOGLE_CONSOLE_STEPS: GuidedStep[] = [
  {
    title: 'Create a Google Cloud project',
    url: 'https://console.cloud.google.com/projectcreate',
    actions: [
      'Name it anything — "finance-dashboard" works. Click CREATE.',
      'Then check the top bar shows that project. Doing the next steps in the',
      'wrong project is the single most common mistake here.',
    ],
  },
  {
    title: 'Turn on the Gmail API',
    url: 'https://console.cloud.google.com/apis/library/gmail.googleapis.com',
    actions: ['Click ENABLE. If the button says MANAGE, it is already on.'],
  },
  {
    title: 'Name the app (Branding)',
    url: 'https://console.cloud.google.com/auth/branding',
    actions: [
      'App name: anything you will recognise. User support email: your own.',
      'Developer contact: your own email. Save.',
    ],
  },
  {
    title: 'Publish it (Audience) — do not skip this one',
    url: 'https://console.cloud.google.com/auth/audience',
    actions: [
      'User type should be External.',
      'Click PUBLISH APP and confirm.',
      'Why it matters: while it says "Testing", Google expires your access after',
      '7 days. Everything works, then the scan stops silently a week later.',
    ],
  },
  {
    title: 'Create the OAuth client',
    url: 'https://console.cloud.google.com/auth/clients',
    actions: [
      'CREATE CLIENT -> Application type: Desktop app -> CREATE.',
      'Desktop app is the type that accepts the loopback redirect this script',
      'uses, with nothing else to configure.',
      'Copy the Client ID and Client secret — you will paste them next.',
    ],
  },
];

async function guidedGoogleSetup(): Promise<boolean> {
  console.log('\n  Five pages in Google Cloud, one at a time. Each one opens in your');
  console.log('  browser; come back here and press Enter when you have done it.');
  console.log('  Nothing here is automatable — Google has no API for it — but you');
  console.log('  should not have to go hunting for the right page.\n');

  for (const [index, step] of GOOGLE_CONSOLE_STEPS.entries()) {
    console.log(`\n  \x1b[1mPage ${index + 1} of ${GOOGLE_CONSOLE_STEPS.length} — ${step.title}\x1b[0m`);
    console.log(`  ${step.url}`);
    for (const action of step.actions) console.log(`    ${action}`);
    openInBrowser(step.url);
    const answer = await ask('Press Enter when done, or type q to stop:');
    if (answer.toLowerCase() === 'q') {
      console.log('  Stopped. Re-run `npm run setup` to pick it up again.');
      return false;
    }
  }
  console.log('\n  Done with the console. Now paste the two values from the last page.');
  return true;
}

/**
 * Mint a refresh token by running the OAuth flow against a loopback server.
 *
 * This is what replaces the OAuth Playground: Google redirects back to
 * http://localhost:<port>, this process catches the code and exchanges it. A
 * "Desktop app" OAuth client accepts loopback redirects with no configuration;
 * a "Web application" client needs REDIRECT_URI added to its authorised
 * redirect URIs, which is printed below so it can be pasted.
 */
async function mintRefreshToken(clientId: string, clientSecret: string): Promise<string | null> {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    // Without this, Google returns no refresh token on a repeat authorisation
    // and the flow silently produces nothing usable.
    prompt: 'consent',
    scope: SCOPES,
  });

  console.log(`\n  Opening Google's consent screen. If it does not open, visit:\n\n  ${authUrl}\n`);
  console.log(`  (If Google rejects the redirect, add ${REDIRECT_URI} to your OAuth client's`);
  console.log('   authorised redirect URIs, or create the client as a "Desktop app".)\n');
  console.log('  Sign in with the Google account whose inbox receives the bank emails.');
  console.log('  You will see an "unverified app" warning — it is your own app. Continue past it.\n');

  const code = await new Promise<string | null>((resolvePromise) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', REDIRECT_URI);
      const receivedCode = url.searchParams.get('code');
      const error = url.searchParams.get('error');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(
        `<html><body style="font-family:system-ui;padding:3rem;text-align:center">
         <h1>${receivedCode ? 'Connected.' : 'Authorisation failed.'}</h1>
         <p>${receivedCode ? 'You can close this tab and return to the terminal.' : String(error ?? 'No code returned.')}</p>
         </body></html>`,
      );
      server.close();
      clearTimeout(timer);
      resolvePromise(receivedCode);
    });

    const timer = setTimeout(() => {
      server.close();
      resolvePromise(null);
    }, 5 * 60 * 1000);

    server.on('error', (err) => {
      console.error(`  Could not listen on ${REDIRECT_URI}: ${err.message}`);
      console.error('  Set SETUP_PORT to a free port and run this again.');
      clearTimeout(timer);
      resolvePromise(null);
    });

    server.listen(CALLBACK_PORT, () => openInBrowser(authUrl));
  });

  if (!code) {
    console.log('  No authorisation code received (timed out, cancelled, or the port was busy).');
    return null;
  }

  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.refresh_token) {
    console.log('  Google returned no refresh token. Revoke this app at');
    console.log('  https://myaccount.google.com/permissions and run setup again.');
    return null;
  }

  oauth2Client.setCredentials(tokens);
  const profile = await google.gmail({ version: 'v1', auth: oauth2Client }).users.getProfile({ userId: 'me' });
  const mailbox = String(profile.data.emailAddress ?? '').replace(/^(.{1,4}).*(@.*)$/, '$1***$2');
  console.log(`  Token works — connected to ${mailbox}`);
  return tokens.refresh_token;
}

async function main() {
  console.log('\nMooolah Tracker — setup\n');
  console.log('Collects your keys, generates your secrets, and connects Gmail.');
  console.log('It writes .env.local and touches nothing else.');

  if (!process.stdin.isTTY) {
    console.error('\nThis needs an interactive terminal. Run `npm run setup` directly.');
    process.exit(1);
  }
  if (!existsSync(resolve(process.cwd(), 'package.json'))) {
    console.error('\nRun this from the project root.');
    process.exit(1);
  }

  const { lines, values } = readEnvFile();
  const updates = new Map<string, string>();
  const isSet = (key: string) => values.has(key);

  // --- Supabase -----------------------------------------------------------
  heading('1. Supabase');
  if (isSet('SUPABASE_URL') && isSet('SUPABASE_SERVICE_ROLE_KEY')) {
    console.log('  Already configured — keeping the existing values.');
  } else {
    console.log('  From your Supabase project: Settings → API.');
    if (!isSet('SUPABASE_URL')) {
      const url = await ask('Project URL (https://xxxx.supabase.co):');
      if (url) updates.set('SUPABASE_URL', url);
    }
    if (!isSet('SUPABASE_SERVICE_ROLE_KEY')) {
      const key = await ask('service_role key (it is long; it is never printed back):');
      if (key) updates.set('SUPABASE_SERVICE_ROLE_KEY', key);
    }
  }

  // --- Secrets ------------------------------------------------------------
  heading('2. Secrets');
  if (isSet('APP_PASSPHRASE')) {
    console.log('  APP_PASSPHRASE already set — keeping it.');
  } else {
    const chosen = await ask('Passphrase to log in with (press Enter to generate one):');
    const passphrase = chosen || randomBytes(18).toString('base64url');
    updates.set('APP_PASSPHRASE', passphrase);
    if (!chosen) {
      console.log(`\n  \x1b[1mYour passphrase is: ${passphrase}\x1b[0m`);
      console.log('  Save it in your password manager now — this is the only time it is shown,');
      console.log('  and it is the only way into the deployed app.\n');
    }
  }
  if (isSet('CRON_SECRET')) {
    console.log('  CRON_SECRET already set — keeping it.');
  } else {
    updates.set('CRON_SECRET', randomBytes(32).toString('hex'));
    console.log('  CRON_SECRET generated. No human ever needs to read it.');
  }

  // --- Gmail --------------------------------------------------------------
  heading('3. Gmail (optional — email scanning)');
  const gmailAlreadySet = isSet('GMAIL_CLIENT_ID') && isSet('GMAIL_CLIENT_SECRET') && isSet('GMAIL_REFRESH_TOKEN');
  let doGmail: boolean;
  if (gmailAlreadySet) {
    console.log('  Already configured.');
    doGmail = await confirm('Mint a NEW refresh token (only needed if the current one died)?');
  } else {
    console.log('  Lets the app read your bank alert emails and turn them into');
    console.log('  transactions. Skip it and everything else still works — you just');
    console.log('  log spending by hand on /add.');
    doGmail = await confirm('Connect Gmail now?', true);
  }

  if (doGmail) {
    let haveClient = values.has('GMAIL_CLIENT_ID') && values.has('GMAIL_CLIENT_SECRET');
    if (!haveClient) {
      haveClient = await confirm('Do you already have a Google OAuth client ID and secret?');
      // Backing out of the console walkthrough must not throw away the Supabase
      // keys and secrets already collected — it drops the Gmail step only, and
      // everything else is still written below.
      if (!haveClient) haveClient = await guidedGoogleSetup();
    }

    if (!haveClient) {
      console.log('  Gmail skipped. Everything entered above is still saved.');
    } else {
      const clientId = values.get('GMAIL_CLIENT_ID') ?? (await ask('OAuth client ID:'));
      const clientSecret = values.get('GMAIL_CLIENT_SECRET') ?? (await ask('OAuth client secret:'));
      if (clientId && clientSecret) {
        try {
          const refreshToken = await mintRefreshToken(clientId, clientSecret);
          if (refreshToken) {
            updates.set('GMAIL_CLIENT_ID', clientId);
            updates.set('GMAIL_CLIENT_SECRET', clientSecret);
            updates.set('GMAIL_REFRESH_TOKEN', refreshToken);
          } else {
            console.log('  Gmail not connected. Everything else below still applies.');
          }
        } catch (err) {
          console.log(`  Gmail connection failed: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  // --- Write --------------------------------------------------------------
  if (updates.size === 0) {
    console.log('\nNothing to change — .env.local is already complete.');
  } else {
    writeEnvFile(lines, updates);
    console.log(`  Wrote ${updates.size} value${updates.size === 1 ? '' : 's'} to .env.local`);
  }

  // --- What is left for a human -------------------------------------------
  heading('Next');
  console.log('  1. Paste supabase/schema.sql into the Supabase SQL editor, then every');
  console.log('     file in supabase/migrations/ in order. (Applying DDL needs the');
  console.log('     Supabase CLI, which this project does not depend on.)');
  console.log('  2. npm run doctor      — proves every step above actually worked');
  console.log('  3. npm run dev         — http://localhost:3000');
  console.log('  4. To deploy: push to GitHub, import the repo in Vercel, then set the');
  console.log('     same variables there:');
  console.log('       vercel env add SUPABASE_URL production');
  console.log('       ...and the same for the other six.');
  console.log('     (Deliberately not automated: it changes a live deployment.)\n');

  rl.close();
}

main().catch((err) => {
  // Ctrl+D / Ctrl+C at a prompt is a person changing their mind, not a crash.
  // readline surfaces it as an AbortError, which would otherwise print a stack
  // trace over a half-finished setup.
  if (err && typeof err === 'object' && 'code' in err && err.code === 'ABORT_ERR') {
    console.log('\n\nCancelled. Nothing was written; run `npm run setup` again when ready.');
    rl.close();
    process.exit(130);
  }
  console.error(`\nSetup failed: ${err instanceof Error ? err.message : String(err)}`);
  console.error('Nothing was written unless a "Wrote ..." line appeared above.');
  rl.close();
  process.exit(1);
});
