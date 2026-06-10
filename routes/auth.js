const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');

function gerarToken(user) {
  return jwt.sign(
    { id: user.id, nome: user.nome, email: user.email, nivel: user.nivel },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  if (senha.length < 6)
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });

  try {
    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existe.rows.length > 0)
      return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail.' });

    const senha_hash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (nome, email, senha_hash)
       VALUES ($1, $2, $3)
       RETURNING id, nome, email, nivel, xp, cidade`,
      [nome.trim(), email.toLowerCase().trim(), senha_hash]
    );

    const user = rows[0];
    res.status(201).json({ token: gerarToken(user), user });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha)
    return res.status(400).json({ erro: 'Preencha e-mail e senha.' });

  try {
    const { rows } = await pool.query(
      'SELECT id, nome, email, senha_hash, nivel, xp, cidade FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(senha, user.senha_hash)))
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

    const { senha_hash, ...userPub } = user;
    res.json({ token: gerarToken(userPub), user: userPub });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

module.exports = router;
