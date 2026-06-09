-- RunCity — schema inicial

CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL,
  email       VARCHAR(255) NOT NULL UNIQUE,
  senha_hash  VARCHAR(255) NOT NULL,
  cidade      VARCHAR(100),
  nivel       INTEGER NOT NULL DEFAULT 1,
  xp          INTEGER NOT NULL DEFAULT 0,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corridas (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  m2          NUMERIC(12, 2) NOT NULL DEFAULT 0,
  km          NUMERIC(8, 3)  NOT NULL DEFAULT 0,
  duracao     INTEGER        NOT NULL DEFAULT 0, -- segundos
  posicao     INTEGER        NOT NULL DEFAULT 1,
  xp_ganho    INTEGER        NOT NULL DEFAULT 0,
  rota_svg    TEXT,
  criada_em   TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS curtidas (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  corrida_id INTEGER NOT NULL REFERENCES corridas(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, corrida_id)
);

CREATE TABLE IF NOT EXISTS reset_tokens (
  token      VARCHAR(128) PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expira_em  TIMESTAMPTZ NOT NULL,
  usado      BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_corridas_user ON corridas(user_id);
CREATE INDEX IF NOT EXISTS idx_corridas_criada ON corridas(criada_em DESC);
