# Setup guide

This guide assumes you have **never set up a coding project before**. Every
step says exactly what to click, what to type, and what you should see when it
worked.

You do not need to understand the code. You are assembling four free services
and telling them about each other.

**Time:** about an hour, most of it waiting for things to install.
**Cost:** nothing. Every service here has a free tier this app fits inside.

---

## How to use Claude while you do this

Keep [claude.ai](https://claude.ai) open in another tab. The free plan is
plenty. When something goes wrong, paste this:

> I'm setting up a Next.js app called Mooolah Tracker by following its SETUP.md.
> I'm on **Step [number]**. I ran this command:
>
> ```
> [paste the exact command]
> ```
>
> and got this:
>
> ```
> [paste the FULL error, all of it]
> ```
>
> What does this mean and what do I do next?

Two rules that make Claude much more useful here:

- **Paste the whole error**, not a summary of it. The useful part is usually
  the last few lines.
- **Never paste your keys.** Anything from `.env.local` is a password. If an
  error message contains a long random string, replace it with `XXXX` before
  pasting.

---

## Before you start

Create these four free accounts if you don't have them. Use the same email for
all of them to keep life simple.

| Account | What it's for |
|---|---|
| [github.com](https://github.com) | Stores your copy of the code |
| [supabase.com](https://supabase.com) | The database — where your transactions live |
| [vercel.com](https://vercel.com) | Puts the app on the internet |
| A Google account | Only if you want automatic email scanning (Step 6) |

Sign up for GitHub **first**, then use "Continue with GitHub" on Supabase and
Vercel. That saves you two passwords.

---

## Step 1 — Install the two tools you need

You need **Node.js** (runs the app) and **Git** (moves the code around).

### Open a terminal

This is the app where you type commands. It's already on your computer.

- **Mac:** press `Cmd + Space`, type `Terminal`, press Enter.
- **Windows:** press the Start key, type `PowerShell`, press Enter.

A window opens with a blinking cursor. That's the terminal. When this guide
says "run" something, you type it there and press Enter.

### Install Node.js

Go to [nodejs.org](https://nodejs.org) and download the version marked
**LTS**. Open the downloaded file and click through the installer, accepting
the defaults.

### Install Git

- **Mac:** run `git --version` in the terminal. If Git isn't installed, a box
  pops up offering to install developer tools — click **Install** and wait.
- **Windows:** download from [git-scm.com](https://git-scm.com/download/win)
  and click through the installer with the defaults.

### Check both worked

**Close your terminal window and open a new one** (it only notices new
software on startup — this trips up almost everyone). Then run:

```bash
node -v
git --version
```

You should see two version numbers, something like `v22.14.0` and
`git version 2.45.0`. The exact numbers don't matter, as long as Node is v20
or higher.

> **If you get `command not found`:** the install didn't finish, or you're in
> an old terminal window. Open a brand new terminal and try again. If it still
> fails, ask Claude with your operating system named.

---

## Step 2 — Get your own copy of the code

You want *your own* copy, not the original — you'll be pushing your changes to
it later.

1. Go to the template repository on GitHub.
2. Click the green **Use this template** button → **Create a new repository**.
3. Name it whatever you like, e.g. `my-finance-dashboard`.
4. Set it to **Private**. Your finances are nobody's business.
5. Click **Create repository**.

GitHub now shows *your* copy. Click the green **Code** button and copy the
HTTPS URL.

Now download it to your computer. In the terminal:

```bash
cd ~/Desktop
git clone <paste-your-URL-here>
```

That makes a folder on your Desktop. Move into it and install the app's
building blocks:

```bash
cd my-finance-dashboard
npm install
```

`npm install` takes a few minutes and prints a lot of text. Warnings in yellow
are normal and fine. You're done when you get your cursor back.

> **Everything from here on must be run inside this folder.** If you close the
> terminal, get back with `cd ~/Desktop/my-finance-dashboard`.

---

## Step 3 — Create the database

### Make the project

1. Go to [supabase.com](https://supabase.com) → **New project**.
2. Name it anything. Choose a region **near you** (Singapore, if you're in
   Singapore) — this only affects speed.
3. It generates a database password. You won't need it for this app, but save
   it somewhere safe anyway.
4. Click **Create new project** and wait ~2 minutes while it provisions.

### Create the tables

The app needs five tables. There's a file in your project that creates all of
them.

1. In Supabase, click **SQL Editor** in the left sidebar.
2. Open the file `supabase/schema.sql` from your project folder in any text
   editor (TextEdit, Notepad, or VS Code) and **copy everything** in it.
3. Paste it into the Supabase SQL editor and click **Run**.

You should see **Success. No rows returned.** That's what success looks like
here — it means the tables were created, not that nothing happened.

Click **Table Editor** in the sidebar and you should now see five tables:
`categories`, `payment_types`, `transactions`, `merchant_categories`, and
`budgets`. `categories` will have 17 starter rows in it.

### Copy your two keys

1. Click the **gear icon** (Project Settings) → **API keys**.
2. Leave this tab open. You need two values from it in the next step:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **`service_role` key** — a very long string. You may need to click an eye
     icon or "Reveal" to see it.

> ⚠️ **The `service_role` key bypasses all database security.** Anyone holding
> it can read and write your entire database. Never paste it into a chat, a
> screenshot, a GitHub issue, or a file that isn't `.env.local`. There is a
> second key on that page labelled `anon` — this app does **not** use it.

---

## Step 4 — Put your keys in the app

Your keys live in a file called `.env.local`, which never leaves your computer.
It's already listed in `.gitignore`, so Git will refuse to upload it.

Create it by copying the example:

```bash
cp .env.local.example .env.local
```

*(On Windows PowerShell, use `copy .env.local.example .env.local`.)*

Now open `.env.local` in a text editor. You'll see lines with an `=` and
nothing after it. Fill in the values, with **no spaces around the `=`** and
**no quotes**:

```
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...the-very-long-key...
```

### Generate two passwords

The app needs two random secrets of its own. Run these and paste the output
into the matching lines:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- The first is your `APP_PASSPHRASE` — **this is what you'll type to log in**,
  so save it in your password manager.
- The second is your `CRON_SECRET` — you never type this one, it's just a
  password the app uses on itself.

Leave the `GMAIL_*` lines empty for now. Save the file.

### Check it worked

```bash
npm run verify-schema
```

You want a list of `OK` lines — one per table. If you see `FAIL`, your URL or
key is wrong: re-copy them, watching for a missing character at either end.

---

## Step 5 — Run it

```bash
npm run dev
```

Leave this running and open **http://localhost:3000** in your browser. You
should see the dashboard, empty.

> Locally there's no login screen even though you set a passphrase — that's
> deliberate, so development stays quick. The passphrase gate switches on
> automatically when you deploy in Step 7.

To stop the app later, click the terminal and press `Ctrl + C`. To start it
again, `npm run dev`.

### Make it yours

Click through to **Settings** and:

- **Cards** — rename the two placeholders (`My Credit Card`, `My Debit Card`)
  to your actual cards, or delete them and add your own.
- **Cycle day** — if a credit card's statement doesn't start on the 1st, set
  the day it does start. Set it to 16 and the period filed under August runs
  16 July → 15 August, the way the bank actually bills you.
- **Budgets** — add one for any category you want a progress meter for.
- **Last 4 digits** — only needed for Step 6. This is how the app works out
  which card an email belongs to. Once saved it's write-only: the app never
  shows it back to you, so the field will read `••••`.

Now add a transaction by hand from the **/add** page to confirm the whole
chain works. It should appear on the Overview immediately.

**If it does, the app works.** Step 6 is optional; skip to Step 7 if you just
want it online.

---

## Step 6 — Automatic email scanning (optional)

This lets the app read your bank's alert emails and turn them into
transactions automatically.

> **Check this first:** out of the box the app only understands alert emails
> from **UOB** and **Citibank Singapore**. Another bank needs a parser written
> for it — Claude can help, see *Adding your bank* in the README. If you're not
> with those banks, **skip this step** and log spending through `/add`.

This is the fiddliest part of the whole setup. It's ten minutes of clicking
through Google's console. Go slowly and it's fine.

### 6a — Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Click the project dropdown in the top bar → **New Project**.
3. Name it `finance-dashboard` → **Create**.
4. **Make sure that new project is selected in the top bar** before continuing.
   Doing the next steps in the wrong project is the single most common mistake
   here.

### 6b — Turn on the Gmail API

1. In the search bar at the top, search **Gmail API**.
2. Click it, then click **Enable**.

### 6c — Set up the consent screen

In the left sidebar find **Google Auth Platform** (older accounts may still
call this *APIs & Services → OAuth consent screen*).

1. Click **Get started**.
2. **App name:** anything, e.g. `Finance Dashboard`. **User support email:**
   your own address.
3. **Audience:** choose **External**. (*Internal* only exists for Google
   Workspace organisations and won't appear for personal accounts.)
4. **Contact information:** your email again.
5. Agree to the policy and click **Create**.

### 6d — Publish the app ← don't skip this

Go to the **Audience** tab. Under *Publishing status* it says **Testing**.
Click **Publish app** and confirm.

> **Why this matters:** while the app is in *Testing*, Google **expires your
> access after 7 days**. Everything will work perfectly, and then a week later
> the scan silently stops with an `invalid_grant` error. Publishing avoids
> this entirely.
>
> Google will warn you the app is "unverified". That's expected and fine — you
> are the only user, and verification only exists for apps published to
> strangers. You'll click through one "Google hasn't verified this app"
> warning in step 6f.

### 6e — Create your credentials

Go to the **Clients** tab → **Create client**.

1. **Application type: Web application.** ← This matters. The *Desktop app*
   type cannot be used with the tool in the next step.
2. Name it anything.
3. Under **Authorised redirect URIs**, click **Add URI** and paste exactly:

   ```
   https://developers.google.com/oauthplayground
   ```

   No trailing slash. A trailing slash gives you a `redirect_uri_mismatch`
   error later.
4. Click **Create**.

A box shows your **Client ID** and **Client secret**. Copy both into
`.env.local` now:

```
GMAIL_CLIENT_ID=...apps.googleusercontent.com
GMAIL_CLIENT_SECRET=...
```

### 6f — Get a refresh token

A refresh token is a long-lived pass that lets the app check your mail without
you logging in every time. Google has a tool that hands you one.

1. Go to
   [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
2. Click the **gear icon** (⚙️) at the top right.
3. Tick **Use your own OAuth credentials**.
4. Paste in the same Client ID and Client secret from 6e. Close the gear panel.
5. In the left-hand list, ignore the categories and use the box at the bottom
   labelled *"Input your own scopes"*. Paste both of these, separated by a
   space:

   ```
   https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify
   ```

6. Click **Authorize APIs**. Sign in with the Google account **whose inbox
   receives the bank emails**.
7. You'll hit the "Google hasn't verified this app" screen. Click
   **Advanced** → **Go to [your app name] (unsafe)**. This is your own app;
   it's safe.
8. Click **Allow**.
9. Back in the playground, click **Exchange authorization code for tokens**.
10. Copy the **Refresh token** (it starts with `1//`) into `.env.local`:

```
GMAIL_REFRESH_TOKEN=1//0g...
```

### 6g — Test it

Stop the app (`Ctrl + C`) and start it again with `npm run dev` — it only
reads `.env.local` on startup, so your new keys won't load until you restart.

Go to **Settings** → **Run scan now**.

The scan looks for **unread** emails from those two banks **received in the
last 24 hours**. If you have none, it will correctly find nothing. To test it
properly, mark a recent bank alert as unread in Gmail first, then scan again
and check the **/pending** page.

> Emails the parser doesn't fully understand are skipped and logged, never
> guessed at. A misread will never silently become a wrong transaction.

---

## Step 7 — Put it on the internet

### Push your code to GitHub

```bash
git add -A
git commit -m "My setup"
git push
```

> `.env.local` is **not** uploaded — `.gitignore` blocks it. That's why you
> have to type your keys into Vercel separately below.

### Deploy

1. Go to [vercel.com](https://vercel.com) → **Add New** → **Project**.
2. Find your repository in the list and click **Import**.
3. **Stop before you click Deploy.** Expand **Environment Variables** first.

Add every line from your `.env.local` as a separate variable — name on the
left, value on the right:

| Name | Required |
|---|---|
| `SUPABASE_URL` | yes |
| `SUPABASE_SERVICE_ROLE_KEY` | yes |
| `APP_PASSPHRASE` | **yes** — the deployment refuses to run without it |
| `CRON_SECRET` | yes |
| `GMAIL_CLIENT_ID` | only if you did Step 6 |
| `GMAIL_CLIENT_SECRET` | only if you did Step 6 |
| `GMAIL_REFRESH_TOKEN` | only if you did Step 6 |

Watch for **trailing spaces** when pasting — the commonest deploy failure.

4. Click **Deploy** and wait ~2 minutes.

Visit the URL Vercel gives you. This time you *will* get a login screen — type
your `APP_PASSPHRASE`. It remembers you for 90 days, on each device.

> Unlike local development, a live deployment without `APP_PASSPHRASE` set
> refuses to serve at all rather than leaving your finances open to anyone who
> guesses the URL.

### The daily scan

If you did Step 6, `vercel.json` already schedules a scan every day at
**00:00 UTC (08:00 Singapore time)**. Vercel handles authentication for it
automatically. To change the hour, edit the `schedule` line in `vercel.json`
and push again — it's in [cron format](https://crontab.guru), and the time is
UTC, so subtract your offset.

> Vercel's free Hobby plan runs cron jobs once per day and may fire up to an
> hour either side of the scheduled time. That's fine for this.

**From now on, every `git push` deploys automatically.** There's no separate
deploy step.

---

## You're done

- **Local development:** `npm run dev` → http://localhost:3000
- **Live app:** your Vercel URL, behind your passphrase
- **Changing anything:** edit, `git add -A`, `git commit -m "..."`, `git push`

If something breaks, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
