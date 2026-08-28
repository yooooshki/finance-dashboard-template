# Troubleshooting

**Start here:**

```bash
npm run doctor
```

It checks every part of the install — keys, database, Gmail, the daily scan —
without changing anything, and each failure names the step that fixes it.
Most of the sections below are the long form of one of its lines.

Find your symptom below. If it isn't here, paste the full error into Claude
using the template in [SETUP.md](SETUP.md#how-to-use-claude-while-you-do-this).

**Before pasting anything anywhere, remove your keys.** Replace long random
strings with `XXXX`.

---

## Setup and terminal

### `command not found: node` / `npm` / `git`

The install didn't take effect in this terminal window. **Close the terminal
completely and open a new one** — it only picks up newly installed software on
startup. If it still fails, the installer didn't finish; run it again.

### `no such file or directory` when running a command

You're in the wrong folder. Every command must run inside your project folder:

```bash
cd ~/Desktop/my-finance-dashboard
```

Run `ls` (Mac) or `dir` (Windows) — you should see `package.json` in the list.

### `npm install` printed warnings

Yellow `warn` lines are normal; ignore them. Only red `error` lines matter. If
it failed partway, try:

```bash
rm -rf node_modules package-lock.json
npm install
```

---

## Database

### `npm run verify-schema` says FAIL on every table

Your Supabase credentials are wrong. In `.env.local`, check that:

- `SUPABASE_URL` has no trailing slash — `https://abc.supabase.co`, not
  `https://abc.supabase.co/`
- There are **no spaces around the `=`** and **no quotes** around values
- The key is complete. It's long enough to be easy to truncate when copying —
  re-copy it rather than eyeballing it.
- You used the **`service_role`** key, not the `anon` key.

### `verify-schema` says FAIL on one table only

That table didn't get created. Re-run the whole of `supabase/schema.sql` in the
Supabase SQL editor — running it twice is safe for the tables that already
exist.

### `Error: supabaseUrl is required`

The app can't see `.env.local` at all. Check that:

- The file is called exactly `.env.local` — not `.env.local.txt` (Windows
  Notepad does this silently) and not `env.local`
- It sits in the project's top folder, next to `package.json`
- You **restarted** `npm run dev` after editing it

### "Success. No rows returned." in the SQL editor

That's success. `CREATE TABLE` doesn't return rows. Check the **Table Editor**
to confirm five tables exist.

---

## Gmail scanning

### `invalid_grant` — and it worked until about a week ago

`npm run doctor` reports this as: *refresh token rejected*.

Your Google project is still in **Testing** mode, which expires access after
7 days. This is the single most common failure with this setup.

Fix it permanently: Google Cloud Console → **Google Auth Platform** →
**Audience** → **Publish app**. Then redo
`npm run setup` to get a fresh refresh token, and
update `GMAIL_REFRESH_TOKEN` both in `.env.local` and in Vercel.

### `redirect_uri_mismatch` in the OAuth Playground

The redirect URI on your Google client doesn't match exactly. It must be:

```
https://developers.google.com/oauthplayground
```

with **no trailing slash**. Also confirm your client's application type is
**Web application** — a *Desktop app* client can't be used with the playground
at all.

### "Google hasn't verified this app"

Expected. Click **Advanced** → **Go to [your app] (unsafe)**. It's your own
app, authorising access to your own inbox.

### The scan runs but finds nothing

The scan deliberately only looks at emails that are **unread**, from
**UOB or Citibank Singapore**, received in the **last 24 hours**. Any one of
those failing means nothing to find.

To test it: mark a recent bank alert as unread in Gmail, then **Run scan now**.

If you bank elsewhere, this is expected — those are the only two parsers that
ship. See *Adding your bank* in the [README](README.md#adding-your-bank).

### Emails are found but nothing reaches /pending

The parser read the email and wasn't confident, so it skipped it rather than
guess. Check the terminal (locally) or Vercel's function logs for a line
mentioning an unrecognised format.

This is working as designed — a misread never becomes a wrong transaction. If
your bank has changed its email wording, the parser needs updating.

### Transactions appear with no card attached

Set each card's **last 4 digits** in Settings. That's what the parsers match on
to decide which card an alert belongs to.

---

## Deploying

### The deploy failed on Vercel

Open the failed deployment and read the log's last lines. Usually one of:

- **`Error: supabaseUrl is required.`** — the commonest one. It means you
  clicked Deploy before adding the environment variables. The app reads
  Supabase's address as it builds, so the build cannot finish without it.

  Fix: Vercel → your project → **Settings** → **Environment Variables**, add
  all of them, then go to **Deployments** and **Redeploy** the failed one.
  Variables added after a build are *not* applied to it retroactively — you
  must trigger a new build.
- **A trailing space in a pasted value** — re-paste it carefully.
- **A missing variable other than Supabase** — check the log for the name it
  complains about and compare against the table in
  [Step 8](SETUP.md#step-8--put-it-on-the-internet).

### The live site shows "APP_PASSPHRASE is not set on this deployment"

Exactly what it says: add `APP_PASSPHRASE` in Vercel's environment variables
and redeploy. A live deployment refuses to serve without it rather than leaving
your finances open to anyone with the URL.

### The live site asks for a passphrase but localhost doesn't

That's intended. The gate is off locally so development stays quick, and on
automatically in production.

### I forgot my passphrase

Change it in Vercel's environment variables and redeploy. Changing it signs out
every device.

### My changes aren't showing up live

Every `git push` triggers a deploy. Check you actually pushed:

```bash
git status
```

If it lists changed files, you haven't committed them yet:

```bash
git add -A
git commit -m "..."
git push
```

### The daily scan never runs

- Cron jobs only run on **deployed production**, never locally.
- Confirm `CRON_SECRET` is set in Vercel.
- Vercel's free Hobby plan runs a cron once a day and may fire up to an hour
  either side of the scheduled time.
- Check Vercel → your project → **Logs** for the run.

---

## Charts and display

### A chart is blank or a line is missing

Usually there's no data for that period yet, or all of it is in **Savings** or
**Investments** — both are excluded from every spend total by design.

If there is data and the chart is still blank, that's a known class of bug with
this drawing library: an option passed as `undefined` produces invalid
coordinates the browser silently drops. See the note in `CLAUDE.md`.

### Everything looks unstyled

Restart `npm run dev`. If it persists, delete the build cache:

```bash
rm -rf .next
npm run dev
```

---

## Getting more help

Reproduce the problem, then collect:

1. What you did
2. The full error text, keys removed
3. Whether it happens locally, live, or both

Paste that into Claude. If it's local, the terminal running `npm run dev` holds
the real error; if it's live, Vercel → your project → **Logs** does.
