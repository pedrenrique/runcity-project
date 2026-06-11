const router = require('express').Router();
const pool   = require('../db');
const auth   = require('../middleware/auth');

function gerarCodigo() {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const nums   = '0123456789';
  let s = '';
  for (let i = 0; i < 4; i++) s += letras[Math.floor(Math.random() * letras.length)];
  s += '-';
  for (let i = 0; i < 4; i++) s += nums[Math.floor(Math.random() * nums.length)];
  return s;
}

async function salaCom(salaId) {
  const { rows } = await pool.query(
    `SELECT s.id, s.codigo, s.nome, s.tempo, s.max_jogadores, s.status, s.criador_id,
            u.nome AS criador_nome,
            COALESCE(
              json_agg(json_build_object(
                'user_id', sj.user_id,
                'nome', uu.nome,
                'pronto', sj.pronto
              )) FILTER (WHERE sj.user_id IS NOT NULL),
              '[]'
            ) AS jogadores
     FROM salas s
     JOIN users u ON u.id = s.criador_id
     LEFT JOIN sala_jogadores sj ON sj.sala_id = s.id
     LEFT JOIN users uu ON uu.id = sj.user_id
     WHERE s.id = $1
     GROUP BY s.id, u.nome`,
    [salaId]
  );
  return rows[0] || null;
}

// GET /api/salas — salas abertas
router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.codigo, s.nome, s.tempo, s.max_jogadores,
              COUNT(sj.user_id)::int AS jogadores
       FROM salas s
       LEFT JOIN sala_jogadores sj ON sj.sala_id = s.id
       WHERE s.status = 'aguardando'
       GROUP BY s.id
       ORDER BY s.criada_em DESC
       LIMIT 20`
    );
    res.json(rows);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/salas — criar sala
router.post('/', auth, async (req, res) => {
  const { nome, tempo = 5, max_jogadores = 4 } = req.body;
  if (!nome) return res.status(400).json({ erro: 'Nome da sala é obrigatório.' });

  let codigo;
  for (let i = 0; i < 5; i++) {
    const tentativa = gerarCodigo();
    const existe = await pool.query('SELECT id FROM salas WHERE codigo = $1', [tentativa]);
    if (!existe.rows.length) { codigo = tentativa; break; }
  }
  if (!codigo) return res.status(500).json({ erro: 'Não foi possível gerar código único.' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO salas (codigo, nome, criador_id, tempo, max_jogadores)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [codigo, nome.trim(), req.user.id, tempo, max_jogadores]
    );
    await pool.query(
      'INSERT INTO sala_jogadores (sala_id, user_id) VALUES ($1, $2)',
      [rows[0].id, req.user.id]
    );
    res.status(201).json(await salaCom(rows[0].id));
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// GET /api/salas/:codigo
router.get('/:codigo', async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM salas WHERE codigo = $1',
      [req.params.codigo.toUpperCase()]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Sala não encontrada.' });
    res.json(await salaCom(rows[0].id));
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/salas/:codigo/entrar
router.post('/:codigo/entrar', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT s.id, s.max_jogadores, s.status,
              COUNT(sj.user_id)::int AS total
       FROM salas s
       LEFT JOIN sala_jogadores sj ON sj.sala_id = s.id
       WHERE s.codigo = $1
       GROUP BY s.id`,
      [req.params.codigo.toUpperCase()]
    );
    const sala = rows[0];
    if (!sala) return res.status(404).json({ erro: 'Sala não encontrada.' });
    if (sala.status !== 'aguardando') return res.status(409).json({ erro: 'Sala não está aguardando.' });
    if (sala.total >= sala.max_jogadores) return res.status(409).json({ erro: 'Sala cheia.' });

    await pool.query(
      'INSERT INTO sala_jogadores (sala_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [sala.id, req.user.id]
    );
    res.json(await salaCom(sala.id));
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// DELETE /api/salas/:codigo/sair
router.delete('/:codigo/sair', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, criador_id FROM salas WHERE codigo = $1',
      [req.params.codigo.toUpperCase()]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Sala não encontrada.' });
    const sala = rows[0];

    await pool.query(
      'DELETE FROM sala_jogadores WHERE sala_id = $1 AND user_id = $2',
      [sala.id, req.user.id]
    );
    if (sala.criador_id === req.user.id) {
      await pool.query("UPDATE salas SET status = 'encerrada' WHERE id = $1", [sala.id]);
    }
    res.json({ mensagem: 'Saíste da sala.' });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// PATCH /api/salas/:codigo/pronto — toggle pronto
router.patch('/:codigo/pronto', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT id FROM salas WHERE codigo = $1',
      [req.params.codigo.toUpperCase()]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Sala não encontrada.' });

    await pool.query(
      'UPDATE sala_jogadores SET pronto = NOT pronto WHERE sala_id = $1 AND user_id = $2',
      [rows[0].id, req.user.id]
    );
    res.json(await salaCom(rows[0].id));
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/salas/:codigo/iniciar — só o criador pode iniciar
router.post('/:codigo/iniciar', auth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, criador_id FROM salas WHERE codigo = $1 AND status = 'aguardando'",
      [req.params.codigo.toUpperCase()]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Sala não encontrada.' });
    if (rows[0].criador_id !== req.user.id)
      return res.status(403).json({ erro: 'Só o criador pode iniciar.' });

    await pool.query("UPDATE salas SET status = 'em_jogo' WHERE id = $1", [rows[0].id]);
    res.json({ mensagem: 'Corrida iniciada.', codigo: req.params.codigo.toUpperCase() });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// Stats ao vivo por sala (memória — não persiste entre reinícios)
const raceStats = {};

// PATCH /api/salas/:codigo/race-stats — jogador envia a sua área/km atual
router.patch('/:codigo/race-stats', auth, async (req, res) => {
  const codigo = req.params.codigo.toUpperCase();
  const { m2 = 0, km = 0 } = req.body;
  if (!raceStats[codigo]) raceStats[codigo] = {};
  raceStats[codigo][req.user.id] = {
    id:   req.user.id,
    nome: (req.user.nome || '').split(' ')[0],
    m2:   parseFloat(m2) || 0,
    km:   parseFloat(km) || 0,
  };
  res.json({ ok: true });
});

// GET /api/salas/:codigo/race-stats — ranking ao vivo
router.get('/:codigo/race-stats', async (req, res) => {
  const codigo = req.params.codigo.toUpperCase();
  const ranking = Object.values(raceStats[codigo] || {})
    .sort((a, b) => b.m2 - a.m2);
  res.json(ranking);
});

// POST /api/salas/:codigo/convidar/:userId — envia notificação de convite
router.post('/:codigo/convidar/:userId', auth, async (req, res) => {
  const amigoId = parseInt(req.params.userId);
  if (isNaN(amigoId)) return res.status(400).json({ erro: 'ID inválido.' });

  try {
    const { rows } = await pool.query(
      "SELECT id, nome, codigo FROM salas WHERE codigo = $1 AND status = 'aguardando'",
      [req.params.codigo.toUpperCase()]
    );
    if (!rows[0]) return res.status(404).json({ erro: 'Sala não encontrada.' });
    const sala = rows[0];

    const { rows: rem } = await pool.query('SELECT nome FROM users WHERE id = $1', [req.user.id]);
    const nomeRem = rem[0]?.nome?.split(' ')[0] || 'Alguém';

    await pool.query(
      `INSERT INTO notificacoes (user_id, tipo, mensagem, ref_id)
       VALUES ($1, 'convite_sala', $2, $3)`,
      [amigoId, `${nomeRem} te convidou para a sala "${sala.nome}" · Código: ${sala.codigo}`, req.user.id]
    );

    res.json({ mensagem: 'Convite enviado.' });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

module.exports = router;
