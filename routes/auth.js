const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
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
  const { nome, email, senha, username, pais, cidade } = req.body;

  if (!nome || !email || !senha || !username || !pais || !cidade)
    return res.status(400).json({ erro: 'Preencha todos os campos.' });
  if (senha.length < 6)
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });

  const usernameLimpo = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (usernameLimpo.length < 3 || usernameLimpo.length > 30)
    return res.status(400).json({ erro: 'Username deve ter entre 3 e 30 caracteres (letras, números e _).' });

  try {
    const existe = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existe.rows.length > 0)
      return res.status(409).json({ erro: 'Já existe uma conta com esse e-mail.' });

    const usernameExiste = await pool.query('SELECT id FROM users WHERE username = $1', [usernameLimpo]);
    if (usernameExiste.rows.length > 0)
      return res.status(409).json({ erro: 'Esse username já está em uso.' });

    const senha_hash = await bcrypt.hash(senha, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (nome, email, senha_hash, username, pais, cidade, ultimo_login)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, nome, email, nivel, xp, cidade, pais, username`,
      [nome.trim(), email.toLowerCase().trim(), senha_hash, usernameLimpo, pais.trim(), cidade.trim()]
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
      'SELECT id, nome, email, senha_hash, nivel, xp, cidade, pais, username FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    if (!user || !(await bcrypt.compare(senha, user.senha_hash)))
      return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

    await pool.query('UPDATE users SET ultimo_login = NOW() WHERE id = $1', [user.id]);

    const { senha_hash, ...userPub } = user;
    res.json({ token: gerarToken(userPub), user: userPub });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ erro: 'Informe o e-mail.' });

  try {
    const { rows } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase().trim()]
    );
    const user = rows[0];

    const resposta = { mensagem: 'Se essa conta existir, o link de recuperação foi enviado.' };

    if (user) {
      const token = crypto.randomBytes(32).toString('hex');
      const expira = new Date(Date.now() + 60 * 60 * 1000);
      await pool.query(
        'INSERT INTO reset_tokens (token, user_id, expira_em) VALUES ($1, $2, $3)',
        [token, user.id, expira]
      );
      resposta.token = token;
    }

    res.json(resposta);
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, nova_senha } = req.body;
  if (!token || !nova_senha)
    return res.status(400).json({ erro: 'Dados incompletos.' });
  if (nova_senha.length < 6)
    return res.status(400).json({ erro: 'A senha precisa ter pelo menos 6 caracteres.' });

  try {
    const { rows } = await pool.query(
      'SELECT * FROM reset_tokens WHERE token = $1',
      [token]
    );
    const reset = rows[0];

    if (!reset || reset.usado || new Date() > new Date(reset.expira_em))
      return res.status(400).json({ erro: 'Link inválido ou expirado.' });

    const senha_hash = await bcrypt.hash(nova_senha, 10);
    await pool.query('UPDATE users SET senha_hash = $1 WHERE id = $2', [senha_hash, reset.user_id]);
    await pool.query('UPDATE reset_tokens SET usado = TRUE WHERE token = $1', [token]);

    res.json({ mensagem: 'Senha redefinida com sucesso.' });
  } catch {
    res.status(500).json({ erro: 'Erro interno.' });
  }
});

module.exports = router;