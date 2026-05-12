const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

// GET /api/amigos — lista amigos aceites
router.get('/', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT u.id, u.nome, u.cidade, u.nivel
       FROM amizades a
       JOIN users u ON u.id = CASE
         WHEN a.user_id = $1 THEN a.amigo_id
         ELSE a.user_id
       END
       WHERE (a.user_id = $1 OR a.amigo_id = $1)
         AND a.status = 'aceite'
       ORDER BY u.nome`,
      [req.user.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// GET /api/amigos/pedidos — pedidos pendentes recebidos
router.get('/pedidos', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.id, a.criado_em, u.id AS user_id, u.nome, u.cidade, u.nivel
       FROM amizades a
       JOIN users u ON u.id = a.user_id
       WHERE a.amigo_id = $1 AND a.status = 'pendente'
       ORDER BY a.criado_em DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// GET /api/amigos/status/:id — relação com outro utilizador
router.get('/status/:id', auth, async (req, res) => {
  const outroId = parseInt(req.params.id);
  if (isNaN(outroId)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const { rows } = await pool.query(
      `SELECT status, user_id FROM amizades
       WHERE (user_id = $1 AND amigo_id = $2)
          OR (user_id = $2 AND amigo_id = $1)`,
      [req.user.id, outroId]
    );
    if (!rows[0]) return res.json({ status: 'nenhuma' });
    const r = rows[0];
    if (r.status === 'pendente' && r.user_id === req.user.id)
      return res.json({ status: 'enviado' });
    res.json({ status: r.status });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/amigos/:id — enviar pedido de amizade
router.post('/:id', auth, async (req, res) => {
  const amigoId = parseInt(req.params.id);
  if (isNaN(amigoId) || amigoId === req.user.id)
    return res.status(400).json({ erro: 'ID inválido.' });

  try {
    const existe = await pool.query(
      `SELECT id, status FROM amizades
       WHERE (user_id = $1 AND amigo_id = $2)
          OR (user_id = $2 AND amigo_id = $1)`,
      [req.user.id, amigoId]
    );
    if (existe.rows.length)
      return res.status(409).json({ erro: 'Pedido já existe.', status: existe.rows[0].status });

    await pool.query(
      'INSERT INTO amizades (user_id, amigo_id) VALUES ($1, $2)',
      [req.user.id, amigoId]
    );
    const { rows } = await pool.query('SELECT nome FROM users WHERE id = $1', [req.user.id]);
    await pool.query(
      `INSERT INTO notificacoes (user_id, tipo, mensagem, ref_id)
       VALUES ($1, 'amizade_pedido', $2, $3)`,
      [amigoId, `${rows[0]?.nome || 'Alguém'} enviou um pedido de amizade.`, req.user.id]
    );
    res.status(201).json({ mensagem: 'Pedido enviado.' });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/amigos/:id/aceitar — aceitar pedido
router.post('/:id/aceitar', auth, async (req, res) => {
  const solicitanteId = parseInt(req.params.id);
  if (isNaN(solicitanteId)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    const { rowCount } = await pool.query(
      `UPDATE amizades SET status = 'aceite'
       WHERE user_id = $1 AND amigo_id = $2 AND status = 'pendente'`,
      [solicitanteId, req.user.id]
    );
    if (!rowCount) return res.status(404).json({ erro: 'Pedido não encontrado.' });

    const { rows } = await pool.query('SELECT nome FROM users WHERE id = $1', [req.user.id]);
    await pool.query(
      `INSERT INTO notificacoes (user_id, tipo, mensagem, ref_id)
       VALUES ($1, 'amizade_aceite', $2, $3)`,
      [solicitanteId, `${rows[0]?.nome || 'Alguém'} aceitou o teu pedido de amizade.`, req.user.id]
    );
    res.json({ mensagem: 'Amizade aceite.' });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// DELETE /api/amigos/:id — remover amigo ou rejeitar pedido
router.delete('/:id', auth, async (req, res) => {
  const outroId = parseInt(req.params.id);
  if (isNaN(outroId)) return res.status(400).json({ erro: 'ID inválido.' });
  try {
    await pool.query(
      `DELETE FROM amizades
       WHERE (user_id = $1 AND amigo_id = $2)
          OR (user_id = $2 AND amigo_id = $1)`,
      [req.user.id, outroId]
    );
    res.json({ mensagem: 'Amizade removida.' });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

module.exports = router;
