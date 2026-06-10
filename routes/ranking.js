const router  = require('express').Router();
const pool    = require('../db');
const optAuth = require('../middleware/optionalAuth');

const PERIOD_SQL = {
  diario: `c.criada_em >= NOW() - INTERVAL '1 day'`,
  semana: `c.criada_em >= NOW() - INTERVAL '7 days'`,
  mes:    `c.criada_em >= NOW() - INTERVAL '30 days'`,
};

router.get('/', optAuth, async (req, res) => {
  try {
    const meId   = req.user?.id || null;
    const escopo  = ['cidade','global','amigos'].includes(req.query.escopo) ? req.query.escopo : 'global';
    const pCond   = PERIOD_SQL[req.query.periodo];

    const joinCond = pCond
      ? `LEFT JOIN corridas c ON c.user_id = u.id AND ${pCond}`
      : `LEFT JOIN corridas c ON c.user_id = u.id`;

    const params = [];
    let whereClause = '';

    if (escopo === 'amigos' && meId) {
      params.push(meId);
      whereClause = `WHERE u.id IN (
        SELECT CASE WHEN a.user_id = $1 THEN a.amigo_id ELSE a.user_id END
        FROM amizades a
        WHERE (a.user_id = $1 OR a.amigo_id = $1) AND a.status = 'aceite'
      )`;
    } else if (escopo === 'cidade' && meId) {
      params.push(meId);
      whereClause = `WHERE u.cidade IS NOT NULL AND u.cidade = (
        SELECT cidade FROM users WHERE id = $1
      )`;
    }

    const { rows } = await pool.query(`
      SELECT
        u.id,
        u.nome,
        u.username,
        u.cidade,
        COALESCE(SUM(c.m2), 0)  AS m2_total,
        COALESCE(SUM(c.km), 0)  AS km_total,
        COUNT(c.id)::int         AS corridas
      FROM users u
      ${joinCond}
      ${whereClause}
      GROUP BY u.id, u.nome, u.username, u.cidade
      ORDER BY m2_total DESC
      LIMIT 50
    `, params);

    let friendIds = new Set();
    if (meId) {
      const fr = await pool.query(
        `SELECT CASE WHEN user_id = $1 THEN amigo_id ELSE user_id END AS fid
         FROM amizades
         WHERE (user_id = $1 OR amigo_id = $1) AND status = 'aceite'`,
        [meId]
      );
      friendIds = new Set(fr.rows.map(r => r.fid));
    }

    const ranking = rows.map((r, i) => {
      const nome = r.nome || '';
      const iniciais = nome.trim().split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??';
      return {
        pos:      i + 1,
        id:       r.id,
        nome,
        iniciais,
        username: r.username || null,
        cidade:   r.cidade || 'Brasil',
        m2:       parseFloat(r.m2_total) || 0,
        km:       parseFloat(r.km_total) || 0,
        corridas: r.corridas || 0,
        isMe:     r.id === meId,
        ehAmigo:  friendIds.has(r.id),
      };
    });

    res.json(ranking);
  } catch (err) {
    console.error('ranking:', err);
    res.status(500).json({ erro: 'Erro interno' });
  }
});

module.exports = router;