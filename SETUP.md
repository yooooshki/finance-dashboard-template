# Setup guide

This guide assumes you have **never set up a coding project before**. Every
step says exactly what to click, what to type, and what you should see when it
worked.

You do not need to understand the code. You are assembling four free services
and telling them about each other.

**Time:** about 40 minutes, most of it waiting for things to install.
**Cost:** nothing. Every service here has a free tier this app fits inside.

The shape of it: you create the accounts and click through two consoles
(Supabase and, optionally, Google). Then **one command** — `npm run setup` —
collects everything and wires it together, and a second — `npm run doctor` —
tells you whether it worked.

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
| A Google account | Only if you want automatic email scanning (Step 4) |

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
4. Do the same for each file in `supabase/migrations/`, oldest first.

You should see **Success. No rows returned.** That's what success looks like
here — it means the tables were created, not that nothing happened.

Click **Table Editor** in the sidebar and you should now see five tables:
`categories`, `payment_types`, `transactions`, `merchant_categories`, and
`budgets`. `categories` will have starter rows in it.

> **Why is this the one step you do by hand?** Creating tables is a different
> kind of database instruction from reading and writing rows, and the library
> this app uses can only do the latter. Automating it would mean adding
> another tool, or handing a script a credential that can control your whole
> Supabase account. Pasting it once is the smaller price.

### Find your two keys — don't copy them anywhere yet

1. Click the **gear icon** (Project Settings) → **API keys**.
2. **Leave this tab open.** Step 5 will ask you for two values from it:
   - **Project URL** — looks like `https://abcdefgh.supabase.co`
   - **`service_role` key** — a very long string. You may need to click an eye
     icon or "Reveal" to see it.

> ⚠️ **The `service_role` key bypasses all database security.** Anyone holding
> it can read and write your entire database. Never paste it into a chat, a
> screenshot, a GitHub issue, or a file that isn't `.env.local`. There is a
> second key on that page labelled `anon` — this app does **not** use it.

---

## Step 4 — Google, for automatic email scanning (optional)

This is what lets the app read your bank's alert emails and turn them into
transactions by itself. Skip it and everything else still works — you just log
spending by hand on the `/add` page.

> **Check this first:** out of the box the app only understands alert emails
> from **UOB**, **Citibank Singapore** and **DBS**. Another bank needs a parser
> written for it — Claude can help, see *Adding your bank* in the README. If
> you're not with those banks, **skip to Step 5**.

**You do not have to read this section.** `npm run setup` in the next step
walks you through these same five pages one at a time, opening each in your
browser and telling you what to click. Read on if you would rather see the
whole route before you start driving; otherwise go to Step 5 and answer **no**
when it asks whether you already have a Google OAuth client.

> **Why can't this be automated?** Google offers no API for creating an OAuth
> client, and this app cannot ship a shared one: Gmail access is a *restricted*
> permission, and an app that hasn't been through Google's paid security
> assessment is capped at 100 users. Your own client has no such cap, because
> you are its only user. That is the whole reason this section exists.

### 4a — Create a Google Cloud project

1. Go to [console.cloud.google.com/projectcreate](https://console.cloud.google.com/projectcreate).
2. Name it `finance-dashboard` → **Create**.
3. **Make sure that new project is selected in the top bar** before continuing.
   Doing the next steps in the wrong project is the single most common mistake
   here.

### 4b — Turn on the Gmail API

Go to [the Gmail API page](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
and click **Enable**. If the button says **Manage**, it's already on.

### 4c — Name the app

Go to [Branding](https://console.cloud.google.com/auth/branding) under
*Google Auth Platform*.

1. **App name:** anything you'll recognise, e.g. `Finance Dashboard`.
2. **User support email** and **contact email:** your own address.
3. **Audience:** **External**. (*Internal* only exists for Google Workspace
   organisations and won't appear for personal accounts.)
4. Agree to the policy and save.

### 4d — Publish it ← don't skip this

Go to [Audience](https://console.cloud.google.com/auth/audience). Under
*Publishing status* it says **Testing**. Click **Publish app** and confirm.

> **Why this matters:** while the app is in *Testing*, Google **expires your
> access after 7 days**. Everything will work perfectly, and then a week later
> the scan silently stops with an `invalid_grant` error. Publishing avoids
> this entirely.
>
> Google will warn you the app is "unverified". That's expected and fine — you
> are the only user, and verification only exists for apps published to
> strangers. You'll click through one such warning in Step 5.

### 4e — Create the OAuth client

Go to [Clients](https://console.cloud.google.com/auth/clients) → **Create client**.

1. **Application type: Desktop app.** ← This matters. It is the type that
   accepts the loopback sign-in `npm run setup` uses, with nothing else to
   configure.
2. Name it anything → **Create**.

A box shows your **Client ID** and **Client secret**. Leave it open — Step 5
asks for both. (You can always find them again on that same Clients page.)

---

## Step 5 — Run the setup command

```bash
npm run setup
```

One run does the whole configuration. Have ready: the Supabase tab from Step 3,
and the Client ID and secret from Step 4 if you did it.

It asks, in this order:

1. **Project URL** and **`service_role` key** — from your Supabase tab.
2. **A passphrase to log in with.** Press Enter and it invents a strong one and
   shows it to you **once**. Save it in your password manager immediately —
   this is your login, and nothing can recover it later.
3. **Connect Gmail?** Answer no to skip email scanning entirely.
4. **Do you already have a Google OAuth client?**
   - **Yes** (you did Step 4) — paste the Client ID and secret.
   - **No** — it opens each of the five Google pages in turn and tells you what
     to click on each, then asks for the ID and secret at the end.
5. Your browser opens Google's consent screen. Sign in with **the account whose
   inbox receives the bank emails**. You'll see *"Google hasn't verified this
   app"* — click **Advanced** → **Go to (your app name)**. It's your own app.
   Click **Allow**.

The window says *"Connected."* and the terminal confirms which mailbox it
reached. It writes everything into `.env.local`, a file that stays on your
computer and is never uploaded.

Useful to know:

- **It is safe to run again.** Anything already filled in is kept, and the file
  is backed up before it's rewritten.
- **Backing out part-way is safe too** — press `q` at the Google walkthrough
  and everything you entered before it is still saved.
- On a computer with no browser, `SETUP_NO_BROWSER=1 npm run setup` prints the
  sign-in link instead of opening it.
- If your OAuth client is a *Web application* rather than a *Desktop app*, add
  `http://localhost:8910` to its authorised redirect URIs, or Google will
  refuse the sign-in.

---

## Step 6 — Check it worked

```bash
npm run doctor
```

This reads everything and changes nothing. You get one line per requirement:

```
Environment (values are never printed)
  PASS  SUPABASE_URL set
Database
  PASS  categories (17 rows)
  PASS  all 2 cards can be matched to alerts
Gmail ingestion
  PASS  refresh token works — mailbox you***@gmail.com
  INFO  0 unread in the window — the next scan would import 0
Backups
  WARN  no backups yet
Scheduled scan
  PASS  /api/email-scan at 0 0 * * * UTC = 08:00 SGT daily
```

Every **FAIL** names the step in this guide that fixes it. Warnings are things
to know about, not broken things.

Run this any time something looks wrong later — it's the fastest way to find
out whether the problem is your keys, your database, or your Gmail connection.

---

## Step 7 — Run it

```bash
npm run dev
```

Leave this running and open **http://localhost:3000** in your browser. You
should see the dashboard, empty.

> Locally there's no login screen even though you set a passphrase — that's
> deliberate, so development stays quick. The passphrase gate switches on
> automatically when you deploy in Step 8.

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
- **Last 4 digits** — only needed if you did Step 4. This is how the app works
  out which card an email belongs to. Once saved it's write-only: the app never
  shows it back to you, so the field will read `••••`.

Now add a transaction by hand from the **/add** page to confirm the whole
chain works. It should appear on the Overview immediately.

### Test the email scan

If you did Step 4, go to **Settings** → **Run scan now**.

The scan looks for **unread** emails from those three banks received in the
**last 7 days**. If you have none, it will correctly find nothing. To test it
properly, mark a recent bank alert as unread in Gmail first, then scan again
and check the **/pending** page.

> Emails the parser doesn't fully understand are skipped and logged, never
> guessed at. A misread will never silently become a wrong transaction.

---

## Step 8 — Put it on the internet

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
| `GMAIL_CLIENT_ID` | only if you did Step 4 |
| `GMAIL_CLIENT_SECRET` | only if you did Step 4 |
| `GMAIL_REFRESH_TOKEN` | only if you did Step 4 |

Watch for **trailing spaces** when pasting — the commonest deploy failure.

4. Click **Deploy** and wait ~2 minutes.

Visit the URL Vercel gives you. This time you *will* get a login screen — type
your `APP_PASSPHRASE`. It remembers you for 90 days, on each device.

> Unlike local development, a live deployment without `APP_PASSPHRASE` set
> refuses to serve at all rather than leaving your finances open to anyone who
> guesses the URL.

### The daily scan

If you did Step 4, `vercel.json` already schedules a scan every day at
**00:00 UTC (08:00 Singapore time)**. Vercel handles authentication for it
automatically. To change the hour, edit the `schedule` line in `vercel.json`
and push again — it's in [cron format](https://crontab.guru), and the time is
UTC, so subtract your offset.

> Vercel's free Hobby plan runs cron jobs once per day and may fire up to an
> hour either side of the scheduled time. That's fine for this.

**From now on, every `git push` deploys automatically.** There's no separate
deploy step.

---

## Step 9 — Back it up, weekly

```bash
npm run backup
```

Your Supabase project is the only copy of your spending history, and the free
tier has no way to rewind it. This writes all five tables to a folder *beside*
your project — outside it, so it can never be uploaded — as a file you can
restore from and a spreadsheet you can read.

Do it weekly. `npm run doctor` starts warning you once the newest backup is
more than ten days old. The README has a one-off command that schedules it
automatically on a Mac.

---

## You're done

Add expenses by hand at `/add`, review anything the scan finds at `/pending`,
and check `npm run doctor` if something ever looks wrong.

---

## Appendix — doing it by hand

Everything above can be done manually. You do not need any of this if
`npm run setup` worked.

### Writing `.env.local` yourself

```bash
cp .env.local.example .env.local
```

*(On Windows PowerShell, use `copy .env.local.example .env.local`.)*

Open it in a text editor and fill in the values, with **no spaces around the
`=`** and **no quotes**:

```
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...the-very-long-key...
```

The app needs two random secrets of its own. Run these and paste the output
into the matching lines:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64'))"
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

- The first is your `APP_PASSPHRASE` — **this is what you type to log in**, so
  save it in your password manager.
- The second is your `CRON_SECRET` — you never type this one.

Check it with `npm run doctor`, or `npm run verify-schema` for the database
alone.

### Getting a refresh token with the OAuth Playground

The older route, before `npm run setup` existed. It needs a **Web application**
OAuth client (not a Desktop app), with
`https://developers.google.com/oauthplayground` — no trailing slash — added
under **Authorised redirect URIs**.

1. Go to
   [developers.google.com/oauthplayground](https://developers.google.com/oauthplayground).
2. Click the **gear icon** (⚙️) at the top right.
3. Tick **Use your own OAuth credentials**.
4. Paste in your Client ID and Client secret. Close the gear panel.
5. In the left-hand list, ignore the categories and use the box at the bottom
   labelled *"Input your own scopes"*. Paste both of these, separated by a
   space:

   ```
   https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify
   ```

6. Click **Authorize APIs**. Sign in with the Google account **whose inbox
   receives the bank emails**.
7. At the "Google hasn't verified this app" screen, click **Advanced** →
   **Go to (your app name) (unsafe)**. This is your own app; it's safe.
8. Click **Allow**.
9. Back in the playground, click **Exchange authorization code for tokens**.
10. Copy the **Refresh token** (it starts with `1//`) into `.env.local`:

```
GMAIL_REFRESH_TOKEN=1//0g...
```

Restart the app afterwards — it only reads `.env.local` on startup.
