// Mantém os botões e handlers de cada linha; somente muda onde são apresentados.
function criarMenuTabela(corpo, bloqueado = () => false) {
    const acoesPorLinha = new WeakMap();
    const menu = document.createElement('div');
    menu.className = 'menu-tabela';
    menu.id = 'menu-acoes-tabela';
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
            linha.setAttribute('aria-expanded', 'false');
        }
        linhaAtiva = null;
        if (devolverFoco && linha?.isConnected) linha.focus({ preventScroll: true });
    }

    function registrar(linha, acoes) {
        acoesPorLinha.set(linha, acoes);
        linha.tabIndex = 0;
        linha.setAttribute('aria-haspopup', 'menu');
        linha.setAttribute('aria-controls', menu.id);
        linha.setAttribute('aria-expanded', 'false');
        acoes.querySelectorAll('button').forEach(botao => {
            botao.type = 'button';
            botao.setAttribute('role', 'menuitem');
            botao.tabIndex = -1;
        });
    }

    function abrir(linha, x, y) {
        fechar();
        if (indisponivel() || !corpo.contains(linha)) return;
        const acoes = acoesPorLinha.get(linha);
        if (!acoes) return;
        linhaAtiva = linha;
        linha.classList.add('linha-menu-ativa');
        linha.setAttribute('aria-expanded', 'true');
        menu.appendChild(acoes);
        menu.hidden = false;
        const margem = 8;
        const limites = menu.getBoundingClientRect();
        menu.style.left = `${Math.max(margem, Math.min(x, document.documentElement.clientWidth - limites.width - margem))}px`;
        menu.style.top = `${Math.max(margem, Math.min(y, document.documentElement.clientHeight - limites.height - margem))}px`;
        const primeiro = menu.querySelector('button:not(:disabled)');
        if (primeiro) primeiro.focus({ preventScroll: true });
        else linha.focus({ preventScroll: true });
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
        const limites = linha.getBoundingClientRect();
        abrir(linha, Math.max(8, limites.left) + 16, limites.top + Math.min(limites.height, 32));
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
    document.addEventListener('pointerdown', evento => {
        if (!menu.contains(evento.target)) fechar();
    });
    document.addEventListener('click', evento => {
        if (!menu.contains(evento.target)) fechar();
    });
    document.addEventListener('contextmenu', evento => {
        if (!corpo.contains(evento.target)) fechar();
    });
    document.addEventListener('submit', () => fechar(), true);
    document.addEventListener('scroll', () => fechar(), true);
    window.addEventListener('resize', () => fechar());

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
