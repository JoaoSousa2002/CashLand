// Mantém os botões e handlers de cada linha; somente muda onde são apresentados.
let fecharMenuTabelaAtivo = null;

function criarMenuTabela(corpo, bloqueado = () => false) {
    const acoesPorLinha = new WeakMap();
    const menu = document.createElement('div');
    menu.className = 'menu-tabela';
    menu.id = `menu-acoes-tabela-${document.querySelectorAll('.menu-tabela').length + 1}`;
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Ações do registro');
    menu.hidden = true;
    document.body.appendChild(menu);
    let linhaAtiva = null;

    function indisponivel() {
        return bloqueado() || Array.from(document.querySelectorAll('.loading-overlay')).some(overlay =>
            !overlay.hidden && getComputedStyle(overlay).display !== 'none');
    }

    function fechar(devolverFoco = false) {
        const linha = linhaAtiva;
        menu.hidden = true;
        menu.replaceChildren();
        if (linha) {
            linha.classList.remove('linha-menu-ativa');
            acoesPorLinha.get(linha).botao.setAttribute('aria-expanded', 'false');
        }
        linhaAtiva = null;
        if (fecharMenuTabelaAtivo === fechar) fecharMenuTabelaAtivo = null;
        if (devolverFoco && linha?.isConnected) acoesPorLinha.get(linha).botao.focus({ preventScroll: true });
    }

    function registrar(linha, acoes) {
        if (linhaAtiva === linha) fechar();
        let botao = acoesPorLinha.get(linha)?.botao;
        if (!botao) {
            const id = linha.cells[0]?.textContent.trim() || '';
            const coluna = document.createElement('td');
            coluna.className = 'td-opcoes';
            botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'botao-opcoes-tabela';
            botao.textContent = '⋮';
            botao.setAttribute('aria-label', `Abrir opções do registro ${id}`.trim());
            botao.setAttribute('aria-haspopup', 'menu');
            botao.setAttribute('aria-controls', menu.id);
            botao.setAttribute('aria-expanded', 'false');
            botao.addEventListener('click', evento => {
                evento.stopPropagation();
                if (linhaAtiva === linha) fechar();
                else abrir(linha);
            });
            botao.addEventListener('keydown', evento => {
                // A ativação nativa por Enter/Espaço não deve acionar a linha.
                if (evento.key === 'Enter' || evento.key === ' ') evento.stopPropagation();
            });
            coluna.appendChild(botao);
            linha.prepend(coluna);
        }
        acoesPorLinha.set(linha, { acoes, botao });
        // Permite manter o retorno de foco usado pelas confirmações existentes.
        linha.tabIndex = -1;
        acoes.querySelectorAll('button').forEach(botao => {
            botao.type = 'button';
            botao.setAttribute('role', 'menuitem');
            botao.tabIndex = -1;
        });
    }

    function abrir(linha, x, y) {
        fechar();
        if (indisponivel() || !corpo.contains(linha)) return;
        const registro = acoesPorLinha.get(linha);
        if (!registro) return;
        const { acoes, botao } = registro;
        fecharMenuTabelaAtivo?.();
        fecharMenuTabelaAtivo = fechar;
        linhaAtiva = linha;
        linha.classList.add('linha-menu-ativa');
        botao.setAttribute('aria-expanded', 'true');
        menu.appendChild(acoes);
        menu.hidden = false;
        const margem = 8;
        const viewport = window.visualViewport;
        const esquerda = (viewport?.offsetLeft || 0) + margem;
        const topo = (viewport?.offsetTop || 0) + margem;
        const largura = viewport?.width || document.documentElement.clientWidth;
        const altura = viewport?.height || document.documentElement.clientHeight;
        menu.style.maxWidth = `${Math.max(0, largura - margem * 2)}px`;
        menu.style.maxHeight = `${Math.max(0, altura - margem * 2)}px`;
        const limites = menu.getBoundingClientRect();
        const direita = esquerda + largura - margem * 2;
        const base = topo + altura - margem * 2;
        if (x === undefined || y === undefined) {
            const ancora = botao.getBoundingClientRect();
            x = ancora.left;
            y = ancora.bottom + 4;
            if (y + limites.height > base) y = ancora.top - limites.height - 4;
        }
        menu.style.left = `${Math.max(esquerda, Math.min(x, direita - limites.width))}px`;
        menu.style.top = `${Math.max(topo, Math.min(y, base - limites.height))}px`;
        const primeiro = menu.querySelector('button:not(:disabled)');
        if (primeiro) primeiro.focus({ preventScroll: true });
        else botao.focus({ preventScroll: true });
    }

    corpo.addEventListener('contextmenu', evento => {
        const linha = evento.target.closest('tr');
        if (!acoesPorLinha.has(linha)) return;
        evento.preventDefault();
        abrir(linha, evento.clientX, evento.clientY);
    });
    corpo.addEventListener('keydown', evento => {
        if (evento.key !== 'ContextMenu' && !(evento.shiftKey && evento.key === 'F10')) return;
        const linha = evento.target.closest('tr');
        if (!acoesPorLinha.has(linha)) return;
        evento.preventDefault();
        abrir(linha);
    });

    // Fecha antes do handler original, que pode abrir a confirmação de exclusão.
    menu.addEventListener('click', evento => {
        const botao = evento.target.closest('button');
        if (!botao) return;
        if (botao.disabled || indisponivel()) {
            evento.preventDefault();
            evento.stopImmediatePropagation();
        }
        fechar(true);
    }, true);
    menu.addEventListener('keydown', evento => {
        const botoes = Array.from(menu.querySelectorAll('button:not(:disabled)'));
        if (!botoes.length) return;
        const indice = botoes.indexOf(document.activeElement);
        let destino;
        if (evento.key === 'ArrowDown') destino = (indice + 1) % botoes.length;
        else if (evento.key === 'ArrowUp') destino = (indice - 1 + botoes.length) % botoes.length;
        else if (evento.key === 'Home') destino = 0;
        else if (evento.key === 'End') destino = botoes.length - 1;
        else if (evento.key === 'Tab') fechar(true);
        if (destino !== undefined) {
            evento.preventDefault();
            botoes[destino].focus({ preventScroll: true });
        }
    });
    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape' && !menu.hidden) {
            evento.preventDefault();
            fechar(true);
        }
    });
    function fecharAoClicarFora(evento) {
        const botao = linhaAtiva && acoesPorLinha.get(linhaAtiva).botao;
        if (!menu.contains(evento.target) && !botao?.contains(evento.target)) fechar();
    }
    document.addEventListener('pointerdown', fecharAoClicarFora);
    document.addEventListener('click', fecharAoClicarFora);
    document.addEventListener('contextmenu', evento => {
        if (!corpo.contains(evento.target)) fechar();
    });
    document.addEventListener('submit', () => fechar(), true);
    document.addEventListener('scroll', evento => {
        if (!menu.contains(evento.target)) fechar();
    }, true);
    window.addEventListener('resize', () => fechar());
    window.visualViewport?.addEventListener('resize', () => fechar());
    window.visualViewport?.addEventListener('scroll', () => fechar());

    // Uma única observação por tabela, independentemente do número de renderizações.
    new MutationObserver(() => fechar()).observe(corpo, { childList: true });
    const observarBloqueios = new MutationObserver(() => {
        if (!menu.hidden && indisponivel()) fechar();
    });
    document.querySelectorAll('.loading-overlay').forEach(overlay => {
        observarBloqueios.observe(overlay, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
    });

    return { registrar, fechar };
}
