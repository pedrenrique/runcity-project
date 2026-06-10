(function () {
  const KEY_TOKEN = 'rc_token';
  const KEY_USER  = 'rc_user';
  const API = '/api';

  function getToken() {
    try { return localStorage.getItem(KEY_TOKEN); } catch { return null; }
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(KEY_USER) || 'null'); }
    catch { return null; }
  }
  function setSessao(token, user) {
    localStorage.setItem(KEY_TOKEN, token);
    localStorage.setItem(KEY_USER, JSON.stringify(user));
  }
  function limparSessao() {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USER);
  }

  async function requerLogin() {
    const token = getToken();
    const user  = getUser();
    if (!token || !user) {
      window.location.replace('login.html');
      return null;
    }
    return user;
  }

  async function logout() {
    limparSessao();
    window.location.replace('login.html');
  }

  async function login(email, senha) {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro ao entrar.');
    setSessao(data.token, data.user);
    return data.user;
  }

  async function register(nome, email, senha) {
    const res = await fetch(`${API}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, email, senha }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.erro || 'Erro ao criar conta.');
    setSessao(data.token, data.user);
    return data.user;
  }

  window.RC = {
    getToken,
    getUser,
    setSessao,
    limparSessao,
    requerLogin,
    logout,
    login,
    register,
  };
})();
