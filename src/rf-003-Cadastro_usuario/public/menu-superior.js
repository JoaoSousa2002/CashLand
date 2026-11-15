// App shell do CashLand: transforma o cabeçalho existente em barra lateral (desktop)
// ou barra superior + gaveta + barra inferior (mobile), sem alterar o HTML das páginas.
// Mantém os IDs usados pelos scripts e testes: #botao-opcoes, #lista-opcoes, #meuForm-Logout.
(() => {
    const navegacao = document.getElementById('div-nav');
    const botao = document.getElementById('botao-opcoes');
    const lista = document.getElementById('lista-opcoes');
    const cabecalho = document.getElementById('div-superior');
    if (!navegacao || !botao || !lista || !cabecalho) return;

    const ICONES = {
        inicio: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
        transacoes: '<path d="M3 8h15"/><path d="m14 4 4 4-4 4"/><path d="M21 16H6"/><path d="m10 12-4 4 4 4"/>',
        orcamentos: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M15 15h3"/>',
        metas: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
        contas: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M10 10v8M14 10v8M19 10v8"/><path d="M3 20h18"/>',
        categorias: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
        perfil: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        usuarios: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0"/><circle cx="17" cy="9" r="3"/><path d="M16 15a6 6 0 0 1 6 5"/>',
        menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
        sair: '<path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4"/><path d="m15 8 5 4-5 4"/><path d="M20 12H9"/>',
        mais: '<path d="M12 5v14M5 12h14"/>',
        financas: '<path d="M4 19V5"/><path d="M4 19h16"/><path d="m7 14 4-4 3 3 5-6"/>'
    };

    function icone(nome) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('class', 'nav-icone');
        svg.innerHTML = ICONES[nome] || ICONES.menu;
        return svg;
    }

    const admin = Boolean(lista.querySelector('a[href^="/tela-admin/"]'))
        || location.pathname === '/tela-admin' || location.pathname.startsWith('/tela-admin/');

    const ROTAS_USUARIO = [
        { chave: 'inicio', texto: 'Início', href: '/tela-principal' },
        { chave: 'transacoes', texto: 'Transações', href: '/tela-principal/listar-transacoes' },
        { chave: 'orcamentos', texto: 'Orçamentos', href: '/tela-principal/listar-orcamentos' },
        { chave: 'metas', texto: 'Metas', href: '/tela-principal/listar-metas' },
        { chave: 'contas', texto: 'Contas', href: '/tela-principal/listar-contas' },
        { chave: 'categorias', texto: 'Categorias', href: '/tela-principal/listar-categoria' },
        { chave: 'perfil', texto: 'Perfil', href: '/tela-principal/editar-usuario', perfil: true }
    ];
    const ROTAS_ADMIN = [
        { chave: 'inicio', texto: 'Início', href: '/tela-admin' },
        { chave: 'usuarios', texto: 'Usuários', href: '/tela-admin/listar-usuarios' },
        { chave: 'categorias', texto: 'Categorias', href: '/tela-admin/listar-categoria' },
        { chave: 'contas', texto: 'Contas', href: '/tela-admin/listar-contas' },
        { chave: 'transacoes', texto: 'Transações', href: '/tela-admin/listar-transacoes' },
        { chave: 'metas', texto: 'Metas', href: '/tela-admin/listar-metas' },
        { chave: 'orcamentos', texto: 'Orçamentos', href: '/tela-admin/listar-orcamentos' },
        { chave: 'financas', texto: 'Minhas finanças', href: '/tela-principal' },
        { chave: 'perfil', texto: 'Perfil', href: '/tela-principal/editar-usuario', perfil: true }
    ];
    const rotas = admin ? ROTAS_ADMIN : ROTAS_USUARIO;

    // Qual item representa a página atual (inclui telas de criação e edição).
    function chaveAtual() {
        const caminho = location.pathname;
        if (caminho === '/tela-principal' || caminho === '/tela-principal/') return admin ? 'financas' : 'inicio';
        if (caminho === '/tela-admin' || caminho === '/tela-admin/') return 'inicio';
        if (/editar-usuario/.test(caminho)) return admin ? 'usuarios' : 'perfil';
        if (/usuario/.test(caminho)) return 'usuarios';
        if (/transac|recorrencia/.test(caminho)) return 'transacoes';
        if (/orcamento/.test(caminho)) return 'orcamentos';
        if (/meta/.test(caminho)) return 'metas';
        if (/categoria/.test(caminho)) return 'categorias';
        if (/conta/.test(caminho)) return 'contas';
        return null;
    }
    const atual = chaveAtual();

    function abrirPerfil(evento, href) {
        if (typeof redirecionaTela === 'function') {
            evento.preventDefault();
            redirecionaTela();
        } else if (typeof redirecionaAdminEditar === 'function') {
            evento.preventDefault();
            redirecionaAdminEditar();
        } else if (href) {
            location.href = href;
        }
    }

    function criarItem(rota, compacto = false) {
        const link = document.createElement('a');
        link.href = rota.href;
        link.className = 'nav-item';
        link.dataset.chave = rota.chave;
        link.appendChild(icone(rota.chave));
        const texto = document.createElement('span');
        texto.textContent = rota.texto;
        link.appendChild(texto);
        if (rota.chave === atual) link.setAttribute('aria-current', 'page');
        if (rota.perfil) link.addEventListener('click', evento => abrirPerfil(evento, rota.href));
        if (compacto) link.title = rota.texto;
        return link;
    }

    // ---- Logo com a marca -------------------------------------------------
    const nomeSistema = document.querySelector('#div-nome-sistema a');
    if (nomeSistema && !nomeSistema.querySelector('.marca-logo')) {
        const marca = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        marca.setAttribute('class', 'marca-logo');
        marca.setAttribute('viewBox', '0 0 48 48');
        marca.setAttribute('aria-hidden', 'true');
        marca.innerHTML = '<rect width="48" height="48" rx="12" fill="#0e9f55"/>'
            + '<path d="M31.5 17.5A9.5 9.5 0 1 0 31.5 30.5" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round"/>'
            + '<path d="M24 9v30" stroke="#fff" stroke-width="5" stroke-linecap="round"/>';
        nomeSistema.prepend(marca);
    }

    // ---- Lista de navegação -------------------------------------------------
    lista.replaceChildren();
    const titulo = document.createElement('p');
    titulo.className = 'nav-titulo';
    titulo.textContent = admin ? 'Administração' : 'Navegação';
    lista.appendChild(titulo);
    for (const rota of rotas) {
        if (rota.chave === 'financas') {
            const separador = document.createElement('div');
            separador.className = 'nav-separador';
            lista.appendChild(separador);
        }
        lista.appendChild(criarItem(rota));
    }
    if (!admin) {
        const separador = document.createElement('div');
        separador.className = 'nav-separador';
        lista.appendChild(separador);
        lista.appendChild(criarItem({ chave: 'mais', texto: 'Nova transação', href: '/tela-principal/criar-transacao' }));
    }
    const formularioLogout = document.getElementById('meuForm-Logout');
    if (formularioLogout) {
        const sair = document.createElement('button');
        sair.type = 'button';
        sair.className = 'nav-sair';
        sair.appendChild(icone('sair'));
        const texto = document.createElement('span');
        texto.textContent = 'Sair';
        sair.appendChild(texto);
        sair.addEventListener('click', () => {
            fecharOpcoes();
            formularioLogout.requestSubmit();
        });
        lista.appendChild(sair);
    }

    // ---- Botão do menu (hambúrguer no mobile; recuo no desktop sem script) ----
    botao.replaceChildren();
    botao.appendChild(icone('menu'));
    const rotuloBotao = document.createElement('span');
    rotuloBotao.textContent = 'Menu';
    botao.appendChild(rotuloBotao);
    botao.setAttribute('aria-label', 'Abrir menu de navegação');

    // ---- Bloco do usuário (saldo, nome, avatar, sair) -----------------------
    const resumo = document.getElementById('div-resumo-usuario') || document.getElementById('div-nome-usuario');
    const avatar = document.getElementById('div-usuario');
    const logout = document.getElementById('form-logout');
    if (resumo && !resumo.closest('.shell-usuario')) {
        const bloco = document.createElement('div');
        bloco.className = 'shell-usuario';
        cabecalho.insertBefore(bloco, resumo);
        bloco.appendChild(resumo);
        const rodape = document.createElement('div');
        rodape.className = 'shell-rodape';
        if (avatar) rodape.appendChild(avatar);
        if (logout) rodape.appendChild(logout);
        if (rodape.childElementCount) bloco.appendChild(rodape);
    }

    // ---- Barra inferior e botão flutuante (somente área do usuário) ---------
    if (!admin && !document.getElementById('barra-inferior')) {
        const barra = document.createElement('nav');
        barra.id = 'barra-inferior';
        barra.setAttribute('aria-label', 'Navegação principal');
        for (const chave of ['inicio', 'transacoes', 'orcamentos', 'metas']) {
            barra.appendChild(criarItem(rotas.find(rota => rota.chave === chave), true));
        }
        const mais = document.createElement('button');
        mais.type = 'button';
        mais.appendChild(icone('menu'));
        const textoMais = document.createElement('span');
        textoMais.textContent = 'Menu';
        mais.appendChild(textoMais);
        mais.setAttribute('aria-controls', 'lista-opcoes');
        mais.addEventListener('click', () => {
            if (lista.hidden) abrirOpcoes();
            else fecharOpcoes();
        });
        barra.appendChild(mais);
        document.body.appendChild(barra);
        document.body.classList.add('com-barra-inferior');

        const flutuante = document.createElement('a');
        flutuante.id = 'botao-flutuante';
        flutuante.href = '/tela-principal/criar-transacao';
        flutuante.setAttribute('aria-label', 'Nova transação');
        flutuante.appendChild(icone('mais'));
        document.body.appendChild(flutuante);
    }

    // ---- Abrir e fechar a gaveta (mobile) -----------------------------------
    const desktop = window.matchMedia('(min-width: 1024px)');
    let backdrop = null;

    function removerBackdrop() {
        backdrop?.remove();
        backdrop = null;
    }

    function fecharOpcoes(devolverFoco = false) {
        if (desktop.matches) return;
        lista.hidden = true;
        botao.setAttribute('aria-expanded', 'false');
        removerBackdrop();
        if (devolverFoco) botao.focus();
    }

    function abrirOpcoes() {
        if (document.getElementById('lista-contas-saldo') && typeof fecharContasSaldo === 'function') fecharContasSaldo();
        lista.hidden = false;
        botao.setAttribute('aria-expanded', 'true');
        if (!desktop.matches && !backdrop) {
            backdrop = document.createElement('div');
            backdrop.className = 'shell-backdrop';
            backdrop.addEventListener('click', () => fecharOpcoes());
            document.body.appendChild(backdrop);
        }
        lista.querySelector('a')?.focus({ preventScroll: true });
    }

    function aplicarLayout() {
        if (desktop.matches) {
            lista.hidden = false;
            botao.setAttribute('aria-expanded', 'true');
            removerBackdrop();
        } else {
            lista.hidden = true;
            botao.setAttribute('aria-expanded', 'false');
            removerBackdrop();
        }
    }
    aplicarLayout();
    desktop.addEventListener('change', aplicarLayout);

    botao.addEventListener('click', () => {
        if (lista.hidden) abrirOpcoes();
        else fecharOpcoes();
    });
    botao.addEventListener('keydown', evento => {
        if (evento.key === 'ArrowDown') {
            evento.preventDefault();
            abrirOpcoes();
        }
    });
    lista.addEventListener('click', evento => {
        if (evento.target.closest('a')) fecharOpcoes();
    });
    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape' && !lista.hidden && !desktop.matches) {
            evento.preventDefault();
            fecharOpcoes(true);
        }
    });
    lista.addEventListener('focusout', evento => {
        if (desktop.matches) return;
        if (!lista.contains(evento.relatedTarget) && !navegacao.contains(evento.relatedTarget)
            && evento.relatedTarget !== null) fecharOpcoes();
    });
})();
