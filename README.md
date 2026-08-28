# Mooolah Tracker

A personal finance dashboard for one person. It reads your bank's alert emails,
lets you review and categorise each transaction before it counts, and draws the
result as hand-sketched charts.

**Stack:** Next.js (App Router) · Supabase · Gmail API · Rough.js · Tailwind CSS · Vercel
**Cost:** free — it's built to fit inside the free tier of every service it uses.

---

## 👉 New to this? Start with [SETUP.md](SETUP.md)

That's a click-by-click guide written for people who have **never set up a
coding project before**. It takes about an hour and assumes you have Claude
open in another tab to help when something goes wrong.

Already comfortable with Next.js? The short version:

```bash
npm install
cp .env.local.example .env.local   # add SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
# run supabase/schema.sql in the Supabase SQL editor
npm run verify-schema
npm run dev
```

Gmail ingestion needs a Google OAuth client and a refresh token —
[Step 6](SETUP.md#step-6--automatic-email-scanning-optional) covers the two
traps (publish the consent screen, and use a *Web application* client).

---

## What it does

| Page | What's there |
|---|---|
| `/` Overview | Total spend for the period, spend by category, spend by card, a six-period trend line, and a meter per budget |
| `/pending` | Transactions parsed out of emails, waiting for you to categorise and commit — with a **Run scan now** button to fetch more |
| `/history` | Every committed transaction, filterable |
| `/add` | Manual entry form |
| `/e-statements` | Upload a PDF statement to surface card–merchant pairs you haven't seen |
| `/settings` | Cards, categories, budgets, learned merchant defaults, manual scan trigger |

Two ideas run through the whole thing:

- **Nothing counts until you commit it.** Email-parsed transactions land as
  `pending` and appear in no total until you review them. Categorising is the
  moment you decide what a transaction was.
- **Statement cycles, not just calendar months.** Give a card a cycle start day
  and the Overview totals it the way the bank bills it — start day 16 means the
  period filed under August runs 16 July to 15 August.

---

## Is it working?

```bash
npm run doctor
```

Read-only — it changes nothing. It checks your keys, your database, your
Gmail connection and the daily scan, and every failure names the setup step
that fixes it. Run it first whenever something looks wrong.

## Setting up

```bash
npm run setup
```

Walks you through it: asks for your two Supabase keys, invents your passwords
so you do not have to, opens each Google Cloud page in turn and tells you what
to click on it, then connects Gmail with one click in the browser instead of
the tour through Google's OAuth Playground. Safe to run again — it keeps
anything you have already filled in, and backing out part-way keeps whatever
you entered before that.

[SETUP.md](SETUP.md) is the long version, with screenshots of where each key
lives. You still need to create the accounts yourself and paste the database
schema in once; everything else the command does for you.

---

## Back up your data

```bash
npm run backup
```

Your database is the only copy of your spending history. This writes all of
it to `../mooolah-backups/` — outside the project folder, so it can never be
committed — as a JSON file you can restore from and a CSV you can open in a
spreadsheet. Do it weekly. `npm run doctor` will nag you once the newest
backup is more than ten days old.

---

## Which banks work

Email parsing ships for **UOB**, **Citibank Singapore** and **DBS** only.
PDF e-statement parsing ships for **UOB, Citibank, DBS and OCBC**.

Everything else in the app — manual entry, categories, budgets, charts,
cycles — is bank-agnostic and works anywhere. If you bank elsewhere, skip the
Gmail step and log through `/add`, or add a parser.

### Adding your bank

Email parsers live in `lib/parsers/`. Each takes the email body as text and
returns `{ amount, detail, payment_type } | null` — returning `null` for
anything it isn't certain about, so a misread never becomes a transaction.
Banks that send HTML-only alerts (DBS is one) are flattened to text by
`lib/html-to-text.ts` first, so a parser never has to read markup.

To add one: write `lib/parsers/<bank>.ts` in the shape of the existing three,
then register its sender address in two places — the Gmail search query in
`lib/gmail.ts` and the sender dispatch in `lib/email-scan-logic.ts`.

This is a good task to hand to Claude. Forward yourself a bank alert, **redact
the amounts, account numbers and your name**, and paste the text alongside
`lib/parsers/uob.ts` as an example to follow. Always test against saved copies
of real emails, never against a live inbox.

PDF statement parsers live in `lib/statement-parsers.ts` and follow the same
rule: recognise the layout or return nothing. Card identification is configured
separately in `lib/statement-cards.ts`, which ships with placeholders you must
edit before the e-statements page will work.

---

## How a transaction gets in

There are exactly two ways, and no others:

| Source | Route in | Lands as |
|---|---|---|
| `email` | the daily Gmail scan | `pending` — you review it before it counts |
| `manual` | the `/add` page | `committed` immediately |

Every page and API route requires a browser session. There is no headless entry
point — the passphrase is not accepted as an API bearer token, so a script or
phone shortcut cannot post transactions.

---

## How it's built

- **One passphrase, no accounts.** Set `APP_PASSPHRASE` and every page and API
  route requires it; a cookie keeps you signed in for 90 days, and changing the
  passphrase signs out every device. Leave it unset locally and the gate is off,
  so `npm run dev` needs no sign-in. On a production deployment an unset
  passphrase is treated as a misconfiguration and refused, rather than leaving
  your finances open to anyone with the URL. The check runs in each route
  handler and in the page layout rather than in a proxy, deliberately — Next.js
  renamed middleware to `proxy.ts` partly because of CVE-2025-29927, a
  middleware auth bypass, and the guidance is not to make a proxy your only
  gate.
- **Everything is server-side.** The Supabase service-role key never reaches the
  browser; pages fetch through API routes under `app/api/`. Keep it that way — a
  client component that imports `lib/supabase.ts` would pull the service-role
  client into the browser bundle.
- **Card digits never leave the server.** `last_four` is write-only: the
  payment-types API selects columns explicitly so it stays out of responses.
- **Savings and Investments are excluded** from every spend total and chart.
  Transactions in those categories are tracked but never counted as spending.
- **Charts are Rough.js only**, themed from `lib/pop-theme.ts`. Colours are CSS
  custom properties in `app/globals.css` — `:root` is the light colourway,
  `.dark` the dark one. Change a colour in both places, plus its mirror in
  `pop-theme.ts` if charts use it.
- **Amounts are SGD** throughout, and dates are handled in Asia/Singapore. If
  you're elsewhere, the formatter is `formatAmount` in `lib/pop-theme.ts`, and
  the timezone appears in `lib/overview-data.ts`, `app/(main)/add/page.tsx`, and
  `headerToSGT` in `lib/gmail.ts` (which converts an email's Date header to
  UTC+8).

`CLAUDE.md` holds the working rules for anyone — human or AI — changing this
code. Read it before making changes, and keep it open in Claude when you do.

---

## Something broken?

See [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

## Licence

MIT — see [LICENSE](LICENSE).
