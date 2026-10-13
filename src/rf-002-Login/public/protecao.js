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

let consultaSaldoUsuario = 0;
let usuarioSaldo = null;
let contaSaldoSelecionada = '';
const botaoSaldoUsuario = document.getElementById('botao-saldo-usuario');
const listaContasSaldo = document.getElementById('lista-contas-saldo');
const seletorContaSaldo = document.getElementById('conta-saldo-usuario');

function fecharContasSaldo() {
  listaContasSaldo.hidden = true;
  botaoSaldoUsuario.setAttribute('aria-expanded', 'false');
}

function salvarContaSaldo() {
  try {
    localStorage.setItem(`conta-saldo-usuario-${usuarioSaldo}`, contaSaldoSelecionada);
  } catch {
    // A escolha continua funcionando nesta página quando o armazenamento está bloqueado.
  }
}

if (botaoSaldoUsuario) {
  botaoSaldoUsuario.addEventListener('click', () => {
    if (!listaContasSaldo.hidden) {
      fecharContasSaldo();
      return;
    }
    listaContasSaldo.hidden = false;
    listaContasSaldo.style.left = '0';
    botaoSaldoUsuario.setAttribute('aria-expanded', 'true');
    const limite = listaContasSaldo.getBoundingClientRect().right;
    if (limite > window.innerWidth - 16) {
      listaContasSaldo.style.left = `${window.innerWidth - 16 - limite}px`;
    }
    seletorContaSaldo.focus();
  });
  seletorContaSaldo.addEventListener('change', () => {
    contaSaldoSelecionada = seletorContaSaldo.value;
    salvarContaSaldo();
    fecharContasSaldo();
    botaoSaldoUsuario.focus();
    atualizarSaldoUsuario();
  });
  document.addEventListener('click', evento => {
    if (!document.getElementById('div-saldo-usuario').contains(evento.target)) fecharContasSaldo();
  });
  document.addEventListener('keydown', evento => {
    if (evento.key === 'Escape' && !listaContasSaldo.hidden) {
      fecharContasSaldo();
      botaoSaldoUsuario.focus();
    }
  });
  window.addEventListener('pageshow', evento => {
    if (evento.persisted && usuarioSaldo !== null) atualizarSaldoUsuario(usuarioSaldo);
  });
}

async function atualizarSaldoUsuario(idUsuario) {
  const campoSaldo = document.getElementById('saldo-usuario');
  if (!campoSaldo) return;
  if (idUsuario !== undefined) {
    usuarioSaldo = idUsuario;
    contaSaldoSelecionada = '';
    try {
      contaSaldoSelecionada = localStorage.getItem(`conta-saldo-usuario-${usuarioSaldo}`) || '';
    } catch {
      // Sem armazenamento, mantém a opção inicial.
    }
  }
  const consultaAtual = ++consultaSaldoUsuario;
  campoSaldo.textContent = 'Carregando...';
  campoSaldo.removeAttribute('title');
  seletorContaSaldo.disabled = true;
  try {
    const resposta = await fetch('/usuario/listar-contas', { credentials: 'include' });
    if (resposta.status === 401) {
      localStorage.removeItem('tipo');
      window.location.href = '/login';
      return;
    }
    const contas = await resposta.json();
    if (!resposta.ok) throw new Error(contas.mensagem || 'Não foi possível consultar as contas.');
    if (!Array.isArray(contas)) throw new Error('Não foi possível consultar as contas.');
    if (consultaAtual !== consultaSaldoUsuario) return;

    seletorContaSaldo.replaceChildren();
    for (const conta of contas) {
      seletorContaSaldo.add(new Option(conta.nome_conta, conta.id_conta));
    }
    seletorContaSaldo.size = Math.max(2, Math.min(contas.length, 6));
    if (contas.length === 0) {
      contaSaldoSelecionada = '';
      salvarContaSaldo();
      document.getElementById('nome-conta-saldo').textContent = 'Sem contas';
      campoSaldo.textContent = '—';
      return;
    }
    if (!contas.some(conta => String(conta.id_conta) === contaSaldoSelecionada)) {
      contaSaldoSelecionada = String(contas[0].id_conta);
      salvarContaSaldo();
    }
    seletorContaSaldo.value = contaSaldoSelecionada;
    seletorContaSaldo.disabled = false;
    document.getElementById('nome-conta-saldo').textContent = seletorContaSaldo.selectedOptions[0].textContent;

    const respostaSaldo = await fetch(`/usuario/verificar-saldo?id_conta=${encodeURIComponent(contaSaldoSelecionada)}`, { credentials: 'include' });
    if (respostaSaldo.status === 401) {
      localStorage.removeItem('tipo');
      window.location.href = '/login';
      return;
    }
    const dados = await respostaSaldo.json();
    if (!respostaSaldo.ok) throw new Error(dados.mensagem || 'Não foi possível consultar o saldo.');
    if (dados.saldo === null || dados.saldo === '' || !Number.isFinite(Number(dados.saldo))) {
      throw new Error('Não foi possível consultar o saldo.');
    }
    if (consultaAtual !== consultaSaldoUsuario) return;
    campoSaldo.textContent = Number(dados.saldo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  } catch (erro) {
    if (consultaAtual !== consultaSaldoUsuario) return;
    campoSaldo.textContent = 'Indisponível';
    campoSaldo.title = erro.message || 'Não foi possível consultar o saldo. Tente novamente mais tarde.';
  }
}
