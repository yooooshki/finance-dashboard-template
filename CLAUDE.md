# Mooolah Tracker — working notes for Claude Code

Read this before changing anything. It is short on purpose.

## What this is

A single-user personal finance dashboard: Next.js (App Router), Supabase,
Gmail API, Rough.js, Tailwind CSS, deployed on Vercel. See `README.md` for
setup.

## Rules

- **Never expose the Supabase service-role key or Gmail credentials to the
  browser.** All database access goes through server-side API routes under
  `app/api/`. A `'use client'` file must not import `lib/supabase.ts`, or
  anything that transitively imports it — that pulls the service-role client
  into the browser bundle. Client-safe constants live in `lib/months.ts` and
  `lib/period.ts`.
- **`last_four` never leaves the server.** The payment-types API selects
  columns explicitly so card digits stay out of API responses. Don't widen
  those selects to `select('*')`.
- **Savings and Investments are excluded from every spend total.** Any new
  aggregate query needs the same
  `.not('category', 'in', '("Savings","Investments")')` filter.
- **Transactions stay `pending` until the user commits them.** Only `/api/log`
  (the `/add` form) inserts as `committed`, and `'manual'` is the only source it
  accepts. Don't add new commit-on-insert paths.
- **Rough.js is the only chart engine.** Charts live in
  `components/charts/rough-charts.tsx`, themed from `lib/pop-theme.ts`.
- **Ask before anything destructive** — deleting files, dropping tables,
  running a write against the live database.

## The database is real money

There is one database and it holds real transactions. No staging copy. Before
writing anything to it, say what you're about to do and wait.

`POST /api/log` inserts a real committed transaction — it is not a smoke test.
Read-only checks (`GET /api/config`, page loads, `npm run verify-schema`) are
safe.

## Verifying a change

There is no test suite. The bar is:

```bash
npx tsc --noEmit     # must be clean
npm run build        # must be clean
```

plus loading the affected page in both light and dark themes. Parser changes
are verified by running the parser against saved email text, never against a
live inbox.

## Two things that bite

- **Rough.js option objects:** never pass a key whose value is explicitly
  `undefined`. Rough.js merges with `Object.assign`, so `bowing: undefined`
  overrides its default and the line maths produces NaN coordinates that
  browsers silently drop — an invisible chart. Default with `??` instead.
- **Chart redraw stability:** every chart effect has deps `[data, style]` and
  redraws the whole SVG with fresh random jitter. `style` must be a
  module-level const (`CLASSIC` / `ARCADE`), never an object literal built in
  render, or the chart re-sketches on every re-render.

## Dates

Transactions store `date`, `month`, and `year` as separate integers, not a date
column. Range comparisons go through the yyyymmdd ordinal helpers in
`lib/period.ts` — use them rather than inventing a second scheme. Everything is
Asia/Singapore.
