const router  = require('express').Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');
const optAuth = require('../middleware/optionalAuth');

// GET /api/corridas/feed
router.get('/feed', optAuth, async (req, res) => {
  const meId = req.user?.id ?? null;
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.m2, c.km, c.duracao, c.posicao, c.xp_ganho, c.criada_em,
              c.rota_svg,
              u.id   AS user_id,
              u.nome,
              u.nivel,
              u.cidade,
              COUNT(cu.user_id)::int          AS curtidas,
              BOOL_OR(cu.user_id = $1)        AS curtida_por_mim
       FROM corridas c
       JOIN  users u   ON u.id  = c.user_id
       LEFT JOIN curtidas cu ON cu.corrida_id = c.id
       GROUP BY c.id, u.id
       ORDER BY c.criada_em DESC
       LIMIT 20`,
      [meId]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/corridas
router.post('/', auth, async (req, res) => {
  const { m2, km, duracao, posicao = 1, xp_ganho = 0, rota_svg = null } = req.body;

  if (!m2 || !km || !duracao)
    return res.status(400).json({ erro: 'm2, km e duracao são obrigatórios.' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO corridas (user_id, m2, km, duracao, posicao, xp_ganho, rota_svg)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [req.user.id, m2, km, duracao, posicao, xp_ganho, rota_svg]
    );

    if (xp_ganho > 0)
      await pool.query('UPDATE users SET xp = xp + $1 WHERE id = $2', [xp_ganho, req.user.id]);

    res.status(201).json(rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/corridas/:id/curtir
router.post('/:id/curtir', auth, async (req, res) => {
  const corridaId = parseInt(req.params.id);
  if (isNaN(corridaId)) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    await pool.query(
      'INSERT INTO curtidas (user_id, corrida_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, corridaId]
    );
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM curtidas WHERE corrida_id = $1',
      [corridaId]
    );
    res.json({ curtidas: rows[0].n });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// DELETE /api/corridas/:id/curtir
router.delete('/:id/curtir', auth, async (req, res) => {
  const corridaId = parseInt(req.params.id);
  if (isNaN(corridaId)) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    await pool.query(
      'DELETE FROM curtidas WHERE user_id = $1 AND corrida_id = $2',
      [req.user.id, corridaId]
    );
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM curtidas WHERE corrida_id = $1',
      [corridaId]
    );
    res.json({ curtidas: rows[0].n });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

module.exports = router;
