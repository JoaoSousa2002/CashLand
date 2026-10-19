(() => {
    const navegacao = document.getElementById('div-nav');
    const botao = document.getElementById('botao-opcoes');
    const lista = document.getElementById('lista-opcoes');
    if (!navegacao || !botao || !lista) return;

    function fecharOpcoes(devolverFoco = false) {
        lista.hidden = true;
        botao.setAttribute('aria-expanded', 'false');
        if (devolverFoco) botao.focus();
    }

    function abrirOpcoes() {
        if (document.getElementById('lista-contas-saldo') && typeof fecharContasSaldo === 'function') fecharContasSaldo();
        lista.hidden = false;
        lista.style.left = '0';
        botao.setAttribute('aria-expanded', 'true');
        const limites = lista.getBoundingClientRect();
        if (limites.right > window.innerWidth - 16) {
            lista.style.left = `${window.innerWidth - 16 - limites.right}px`;
        }
        lista.style.maxHeight = `${Math.max(0, window.innerHeight - limites.top - 16)}px`;
        lista.querySelector('a')?.focus({ preventScroll: true });
    }

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
    document.addEventListener('click', evento => {
        if (!navegacao.contains(evento.target)) fecharOpcoes();
    });
    document.addEventListener('keydown', evento => {
        if (evento.key === 'Escape' && !lista.hidden) {
            evento.preventDefault();
            fecharOpcoes(true);
        }
    });
    navegacao.addEventListener('focusout', evento => {
        if (!navegacao.contains(evento.relatedTarget)) fecharOpcoes();
    });
    window.addEventListener('resize', () => fecharOpcoes());
    document.addEventListener('scroll', evento => {
        if (!lista.contains(evento.target)) fecharOpcoes();
    }, true);
})();
