-- Finance Dashboard — full schema
-- Paste this whole file into the Supabase SQL editor and run it once.

-- ============================================================
-- 1. categories
-- ============================================================
CREATE TABLE categories (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL
);

-- ============================================================
-- 2. payment_types
--    One row per card or account you spend from.
--    last_four is what the email parsers match against to work out
--    which card a bank alert belongs to. It is deliberately never
--    sent to the browser, so set it here rather than in the app.
-- ============================================================
CREATE TABLE payment_types (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text UNIQUE NOT NULL,
  bank            text NOT NULL,
  last_four       text,
  type            text NOT NULL CHECK (type IN ('credit', 'debit')),
  -- Day of month the statement cycle begins (1-28). NULL or 1 = calendar month.
  cycle_start_day integer CHECK (cycle_start_day IS NULL OR cycle_start_day BETWEEN 1 AND 28)
);

-- ============================================================
-- 3. transactions
--    category and payment_type reference the name columns above.
-- ============================================================
CREATE TABLE transactions (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  date         integer      NOT NULL CHECK (date BETWEEN 1 AND 31),
  month        integer      NOT NULL CHECK (month BETWEEN 1 AND 12),
  year         integer      NOT NULL,
  amount       numeric(10,2) NOT NULL,
  category     text         REFERENCES categories(name),
  payment_type text         REFERENCES payment_types(name),
  detail       text,
  source       text         NOT NULL CHECK (source IN ('email', 'shortcut', 'manual')),
  status       text         NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'committed')),
  created_at   timestamptz  NOT NULL DEFAULT now()
);

-- ============================================================
-- 4. merchant_categories
--    Learned category default per merchant string.
-- ============================================================
CREATE TABLE merchant_categories (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  detail_key text        UNIQUE NOT NULL,
  category   text        NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. budgets
--    One monthly spend target per category.
-- ============================================================
CREATE TABLE budgets (
  id             uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  category       text          UNIQUE NOT NULL REFERENCES categories(name),
  monthly_amount numeric(10,2) NOT NULL CHECK (monthly_amount >= 0),
  updated_at     timestamptz   NOT NULL DEFAULT now()
);

-- ============================================================
-- Row level security. The app connects with the service role key,
-- which bypasses RLS; this is a safety net for any other client.
-- ============================================================
ALTER TABLE categories          ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_types       ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets             ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Seed: categories
-- Edit freely in Settings once the app is running.
-- 'Savings' and 'Investments' are special: transactions in those
-- categories are excluded from every spend total and chart.
-- ============================================================
INSERT INTO categories (name) VALUES
  ('Car Rental'),
  ('Education'),
  ('Entertainment'),
  ('Food'),
  ('Gift'),
  ('Groceries'),
  ('Haircut'),
  ('Healthcare'),
  ('Insurance'),
  ('Investments'),
  ('Misc.'),
  ('Overseas Travel'),
  ('Public Transport'),
  ('Savings'),
  ('Shopping'),
  ('Subscriptions'),
  ('Transport');

-- ============================================================
-- Seed: payment_types — PLACEHOLDERS, replace with your own.
-- Rename or delete them in Settings, then come back here to set
-- last_four and cycle_start_day, e.g.
--
--   UPDATE payment_types
--      SET last_four = '1234', cycle_start_day = 16
--    WHERE name = 'My Credit Card';
-- ============================================================
INSERT INTO payment_types (name, bank, last_four, type, cycle_start_day) VALUES
  ('My Credit Card', 'Your Bank', NULL, 'credit', NULL),
  ('My Debit Card',  'Your Bank', NULL, 'debit',  NULL);
