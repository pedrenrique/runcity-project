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

-- Amizades
CREATE TABLE IF NOT EXISTS amizades (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amigo_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status    VARCHAR(20) NOT NULL DEFAULT 'pendente',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, amigo_id)
);

-- Comentários em corridas
CREATE TABLE IF NOT EXISTS comentarios (
  id         SERIAL PRIMARY KEY,
  corrida_id INTEGER NOT NULL REFERENCES corridas(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  texto      TEXT NOT NULL,
  criado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notificações
CREATE TABLE IF NOT EXISTS notificacoes (
  id        SERIAL PRIMARY KEY,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo      VARCHAR(50) NOT NULL,
  mensagem  TEXT NOT NULL,
  lida      BOOLEAN NOT NULL DEFAULT FALSE,
  ref_id    INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Salas de jogo
CREATE TABLE IF NOT EXISTS salas (
  id            SERIAL PRIMARY KEY,
  codigo        VARCHAR(9)  NOT NULL UNIQUE,
  nome          VARCHAR(100) NOT NULL,
  criador_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tempo         INTEGER NOT NULL DEFAULT 5,
  max_jogadores INTEGER NOT NULL DEFAULT 4,
  status        VARCHAR(20) NOT NULL DEFAULT 'aguardando',
  criada_em     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jogadores em sala
CREATE TABLE IF NOT EXISTS sala_jogadores (
  sala_id   INTEGER NOT NULL REFERENCES salas(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pronto    BOOLEAN NOT NULL DEFAULT FALSE,
  entrou_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sala_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_amizades_user  ON amizades(user_id);
CREATE INDEX IF NOT EXISTS idx_amizades_amigo ON amizades(amigo_id);
CREATE INDEX IF NOT EXISTS idx_notif_user     ON notificacoes(user_id, lida);
CREATE INDEX IF NOT EXISTS idx_salas_status   ON salas(status);

ALTER TABLE users ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_ultimo_login ON users(ultimo_login);