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
    `SELECT u.id, u.nome, u.email, u.cidade, u.nivel, u.xp, u.criado_em,
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
