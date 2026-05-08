// Camada de sessão front-only. Sem backend ainda — tudo mockado no localStorage.
// Vai virar fetch real quando o servidor estiver pronto.

(function () {
  const KEY_TOKEN = 'rc_token';
  const KEY_USER  = 'rc_user';
  const KEY_USERS = 'rc_users'; // "tabela" de usuários cadastrados

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

  function lerUsuarios() {
    try { return JSON.parse(localStorage.getItem(KEY_USERS) || '[]'); }
    catch { return []; }
  }
  function salvarUsuarios(lista) {
    localStorage.setItem(KEY_USERS, JSON.stringify(lista));
  }

  function gerarToken() {
    return 'tk_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
  function gerarId() {
    return 'u_' + Math.random().toString(36).slice(2, 10);
  }

  // chame no topo das páginas que exigem login
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

  window.RC = {
    getToken,
    getUser,
    setSessao,
    limparSessao,
    requerLogin,
    logout,
    // helpers que login.html e perfil.html usam pro mock local
    _users: { ler: lerUsuarios, salvar: salvarUsuarios },
    _gerarToken: gerarToken,
    _gerarId: gerarId
  };
})();
