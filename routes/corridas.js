const router  = require('express').Router();
const pool    = require('../db');
const auth    = require('../middleware/auth');
const optAuth = require('../middleware/optionalAuth');

// GET /api/corridas/feed
router.get('/feed', optAuth, async (req, res) => {
  const meId = req.user?.id ?? null;
  try {
    let rows;
    if (meId) {
      ({ rows } = await pool.query(
        `SELECT c.id, c.m2, c.km, c.duracao, c.posicao, c.xp_ganho, c.criada_em,
                c.rota_svg,
                u.id   AS user_id,
                u.nome,
                u.nivel,
                u.cidade,
                COUNT(DISTINCT cu.user_id)::int          AS curtidas,
                BOOL_OR(cu.user_id = $1)                 AS curtida_por_mim,
                COUNT(DISTINCT cm.id)::int               AS comentarios
         FROM corridas c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN curtidas cu ON cu.corrida_id = c.id
         LEFT JOIN comentarios cm ON cm.corrida_id = c.id
         WHERE c.user_id = $1
            OR c.user_id IN (
              SELECT CASE WHEN a.user_id = $1 THEN a.amigo_id ELSE a.user_id END
              FROM amizades a
              WHERE (a.user_id = $1 OR a.amigo_id = $1) AND a.status = 'aceite'
            )
         GROUP BY c.id, u.id
         ORDER BY c.criada_em DESC
         LIMIT 20`,
        [meId]
      ));
    } else {
      ({ rows } = await pool.query(
        `SELECT c.id, c.m2, c.km, c.duracao, c.posicao, c.xp_ganho, c.criada_em,
                c.rota_svg,
                u.id   AS user_id,
                u.nome,
                u.nivel,
                u.cidade,
                COUNT(DISTINCT cu.user_id)::int AS curtidas,
                FALSE                           AS curtida_por_mim,
                COUNT(DISTINCT cm.id)::int      AS comentarios
         FROM corridas c
         JOIN users u ON u.id = c.user_id
         LEFT JOIN curtidas cu ON cu.corrida_id = c.id
         LEFT JOIN comentarios cm ON cm.corrida_id = c.id
         GROUP BY c.id, u.id
         ORDER BY c.criada_em DESC
         LIMIT 20`
      ));
    }
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

// GET /api/corridas/:id/comentarios
router.get('/:id/comentarios', optAuth, async (req, res) => {
  const corridaId = parseInt(req.params.id);
  if (isNaN(corridaId)) return res.status(400).json({ erro: 'ID inválido.' });

  const meId = req.user?.id ?? null;

  try {
    const { rows } = await pool.query(
      `SELECT cm.id, cm.texto, cm.criado_em,
              u.id AS user_id, u.nome, u.username, u.nivel,
              COUNT(DISTINCT cc.user_id)::int          AS curtidas,
              BOOL_OR(cc.user_id = $2)                 AS curtido_por_mim
       FROM comentarios cm
       JOIN users u ON u.id = cm.user_id
       LEFT JOIN curtidas_comentarios cc ON cc.comentario_id = cm.id
       WHERE cm.corrida_id = $1
       GROUP BY cm.id, u.id
       ORDER BY cm.criado_em ASC`,
      [corridaId, meId]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/corridas/:id/comentarios
router.post('/:id/comentarios', auth, async (req, res) => {
  const corridaId = parseInt(req.params.id);
  if (isNaN(corridaId)) return res.status(400).json({ erro: 'ID inválido.' });

  const texto = (req.body.texto || '').trim();
  if (!texto) return res.status(400).json({ erro: 'Comentário não pode ser vazio.' });
  if (texto.length > 300) return res.status(400).json({ erro: 'Máximo de 300 caracteres.' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO comentarios (corrida_id, user_id, texto)
       VALUES ($1, $2, $3)
       RETURNING id, texto, criado_em`,
      [corridaId, req.user.id, texto]
    );
    const { rows: uRows } = await pool.query(
      'SELECT id, nome, username, nivel FROM users WHERE id = $1',
      [req.user.id]
    );
    res.status(201).json({
      ...rows[0],
      user_id:       req.user.id,
      nome:          uRows[0].nome,
      username:      uRows[0].username,
      nivel:         uRows[0].nivel,
      curtidas:      0,
      curtido_por_mim: false,
    });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/corridas/:id/comentarios/:cmtId/curtir
router.post('/:id/comentarios/:cmtId/curtir', auth, async (req, res) => {
  const cmtId = parseInt(req.params.cmtId);
  if (isNaN(cmtId)) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    await pool.query(
      'INSERT INTO curtidas_comentarios (user_id, comentario_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.user.id, cmtId]
    );
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM curtidas_comentarios WHERE comentario_id = $1',
      [cmtId]
    );
    res.json({ curtidas: rows[0].n });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// DELETE /api/corridas/:id/comentarios/:cmtId/curtir
router.delete('/:id/comentarios/:cmtId/curtir', auth, async (req, res) => {
  const cmtId = parseInt(req.params.cmtId);
  if (isNaN(cmtId)) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    await pool.query(
      'DELETE FROM curtidas_comentarios WHERE user_id = $1 AND comentario_id = $2',
      [req.user.id, cmtId]
    );
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int AS n FROM curtidas_comentarios WHERE comentario_id = $1',
      [cmtId]
    );
    res.json({ curtidas: rows[0].n });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// PATCH /api/corridas/:id/comentarios/:cmtId
router.patch('/:id/comentarios/:cmtId', auth, async (req, res) => {
  const cmtId = parseInt(req.params.cmtId);
  if (isNaN(cmtId)) return res.status(400).json({ erro: 'ID inválido.' });

  const texto = (req.body.texto || '').trim();
  if (!texto) return res.status(400).json({ erro: 'Comentário não pode ser vazio.' });
  if (texto.length > 300) return res.status(400).json({ erro: 'Máximo de 300 caracteres.' });

  try {
    const { rowCount, rows } = await pool.query(
      `UPDATE comentarios SET texto = $1
       WHERE id = $2 AND user_id = $3
       RETURNING id, texto, criado_em`,
      [texto, cmtId, req.user.id]
    );
    if (!rowCount) return res.status(403).json({ erro: 'Comentário não encontrado ou sem permissão.' });
    res.json(rows[0]);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// DELETE /api/corridas/:id/comentarios/:cmtId
router.delete('/:id/comentarios/:cmtId', auth, async (req, res) => {
  const cmtId = parseInt(req.params.cmtId);
  if (isNaN(cmtId)) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    const { rowCount } = await pool.query(
      'DELETE FROM comentarios WHERE id = $1 AND user_id = $2',
      [cmtId, req.user.id]
    );
    if (!rowCount) return res.status(403).json({ erro: 'Comentário não encontrado ou sem permissão.' });
    res.json({ mensagem: 'Comentário removido.' });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

module.exports = router;