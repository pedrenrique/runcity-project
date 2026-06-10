const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

// GET /api/notificacoes
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT n.id, n.tipo, n.mensagem, n.lida, n.ref_id, n.criado_em,
              a.status AS amizade_status
       FROM notificacoes n
       LEFT JOIN amizades a
         ON n.tipo = 'amizade_pedido'
        AND (
          (a.user_id = n.ref_id AND a.amigo_id = $1)
          OR
          (a.user_id = $1 AND a.amigo_id = n.ref_id)
        )
       WHERE n.user_id = $1
       ORDER BY n.criado_em DESC
       LIMIT 30`,
      [req.user.id]
    );
    res.json({
      notificacoes: rows,
      nao_lidas: rows.filter(n => !n.lida).length,
    });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// PATCH /api/notificacoes/ler — marca todas como lidas
router.patch('/ler', auth, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notificacoes SET lida = TRUE WHERE user_id = $1 AND lida = FALSE',
      [req.user.id]
    );
    res.json({ mensagem: 'Notificações lidas.' });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

module.exports = router;