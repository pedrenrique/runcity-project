const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

function xpParaProxNivel(nivel) {
  return nivel * 1000;
}

function fmtM2(v) {
  v = parseFloat(v) || 0;
  return v >= 1000 ? (v / 1000).toFixed(1) + 'k' : String(Math.round(v));
}

async function montarPerfil(userId, incluirEmail) {
  const { rows } = await pool.query(
    `SELECT u.id, u.nome, u.email, u.cidade, u.nivel, u.xp, u.criado_em, u.username,
            COUNT(c.id)::int                                AS corridas,
            COALESCE(SUM(c.m2),  0)                        AS m2_total,
            COALESCE(SUM(c.km),  0)                        AS km_total,
            COUNT(CASE WHEN c.posicao = 1 THEN 1 END)::int AS vitorias,
            COALESCE(MAX(c.m2),  0)                        AS melhor_m2
     FROM users u
     LEFT JOIN corridas c ON c.user_id = u.id
     WHERE u.id = $1
     GROUP BY u.id`,
    [userId]
  );

  if (!rows[0]) return null;

  const hist = await pool.query(
    `SELECT id, m2, km, duracao, posicao, xp_ganho, criada_em
     FROM corridas
     WHERE user_id = $1
     ORDER BY criada_em DESC
     LIMIT 10`,
    [userId]
  );

  const u = rows[0];

  const perfil = {
    id:        u.id,
    nome:      u.nome,
    username:  u.username,
    cidade:    u.cidade,
    nivel:     u.nivel,
    xp:        u.xp,
    xp_max:    xpParaProxNivel(u.nivel),
    corridas:  u.corridas,
    m2_total:  parseFloat(u.m2_total),
    km_total:  parseFloat(u.km_total),
    vitorias:  u.vitorias,
    melhor_m2: parseFloat(u.melhor_m2),
    historico: hist.rows,
  };

  if (incluirEmail) perfil.email = u.email;

  return perfil;
}

// GET /api/users/buscar?q=termo — busca por nome ou username
router.get('/buscar', auth, async (req, res) => {
  const q = (req.query.q || '').trim();
  if (q.length < 2) return res.json([]);

  try {
    const termo = '%' + q.toLowerCase() + '%';
    const { rows } = await pool.query(
      `SELECT u.id, u.nome, u.username, u.cidade, u.nivel,
              a.status AS amizade_status
       FROM users u
       LEFT JOIN amizades a
         ON (a.user_id = $1 AND a.amigo_id = u.id)
         OR (a.amigo_id = $1 AND a.user_id = u.id)
       WHERE u.id != $1
         AND (LOWER(u.nome) LIKE $2 OR LOWER(u.username) LIKE $2)
       ORDER BY
         CASE WHEN LOWER(u.username) = $3 THEN 0
              WHEN LOWER(u.username) LIKE $2 THEN 1
              ELSE 2 END,
         u.nome
       LIMIT 20`,
      [req.user.id, termo, q.toLowerCase()]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// GET /api/users/me
router.get('/me', auth, async (req, res) => {
  try {
    const perfil = await montarPerfil(req.user.id, true);
    if (!perfil) return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    res.json(perfil);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// GET /api/users/:id
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    const perfil = await montarPerfil(id, false);
    if (!perfil) return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    res.json(perfil);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

module.exports = router;