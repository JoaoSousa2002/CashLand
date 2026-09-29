async function protegerPagina(tipoExigido = null) {
  try {
    const resposta = await fetch('/me', { credentials: 'include' });
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