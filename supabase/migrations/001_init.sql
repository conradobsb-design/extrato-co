-- Criar schema app
CREATE SCHEMA IF NOT EXISTS app;

-- Transações financeiras
CREATE TABLE app.transactions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users NOT NULL,
  description     TEXT NOT NULL,
  amount          NUMERIC NOT NULL,
  transaction_date DATE NOT NULL,
  billing_month   TEXT,
  category        TEXT,
  bank            TEXT,
  source_type     TEXT,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Arquivos importados (controle de duplicatas)
CREATE TABLE app.imported_files (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID REFERENCES auth.users NOT NULL,
  file_name         TEXT NOT NULL,
  imported_at       TIMESTAMPTZ DEFAULT NOW(),
  transaction_count INT DEFAULT 0
);

-- Metas financeiras
CREATE TABLE app.goals (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID REFERENCES auth.users NOT NULL,
  title          TEXT NOT NULL,
  emoji          TEXT DEFAULT '🎯',
  type           TEXT,
  target_amount  NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0,
  category       TEXT,
  status         TEXT DEFAULT 'active',
  deadline       DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE app.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own transactions"
  ON app.transactions FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE app.imported_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own files"
  ON app.imported_files FOR ALL
  USING (auth.uid() = user_id);

ALTER TABLE app.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own goals"
  ON app.goals FOR ALL
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX idx_transactions_user_date ON app.transactions (user_id, transaction_date DESC);
CREATE INDEX idx_transactions_user_month ON app.transactions (user_id, billing_month);
CREATE INDEX idx_goals_user ON app.goals (user_id);
