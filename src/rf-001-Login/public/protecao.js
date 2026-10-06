async function protegerPagina(tipoExigido = null) {
  try {
    const resposta = await fetch('/me', { credentials: 'include' });
    if (resposta.status === 429) {
      const dados = await resposta.json().catch(() => ({}));
      const mensagem = dados.mensagem || 'Limite de requisições atingido. Tente novamente mais tarde.';
      const loading = document.getElementById('loading-overlay');
      if (loading) loading.style.display = 'none';
      if (typeof mostrarResultado === 'function') {
        mostrarResultado(false, mensagem);
      } else if (typeof MostrarResultado_Overlay === 'function') {
        MostrarResultado_Overlay(0, mensagem);
        document.getElementById('resultado-overlay').style.display = 'flex';
      }
      return;
    }
    if (!resposta.ok) throw new Error();

    const usuario = await resposta.json();

    if (tipoExigido && usuario.tipo !== tipoExigido) {
      window.location.href = '/tela-principal'; // logado, mas sem permissão
      return;
    }

    return usuario; // devolve os dados pra página usar (ex: mostrar nome)
  } catch {
    localStorage.removeItem('tipo');
    window.location.href = '/login';
  }
}
