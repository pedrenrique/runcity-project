const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

// GET /api/notificacoes
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, tipo, mensagem, lida, ref_id, criado_em
       FROM notificacoes
       WHERE user_id = $1
       ORDER BY criado_em DESC
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
