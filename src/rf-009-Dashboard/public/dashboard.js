// Dashboard da tela principal: consolida contas, transações, metas, orçamentos e
// categorias usando somente as rotas já existentes da API. Cada cartão carrega e
// falha de forma independente; nada é consultado antes da confirmação da sessão.

let retonarLogin = false;
const loading = document.getElementById('loading-overlay');
const resultado_overlay = document.getElementById('resultado-overlay');

function MostrarResultado_Overlay(tipo, mensagem) {
    const caixa = document.getElementById('resultado-funcao');
    caixa.replaceChildren();
    const conteudo = document.createElement('div');
    conteudo.id = 'div-resultado-overlay';
    conteudo.className = 'dialogo-conteudo';
    const texto = document.createElement('h5');
    texto.style.color = tipo === 1 ? 'var(--sucesso)' : 'var(--erro)';
    texto.style.margin = '0';
    texto.textContent = mensagem;
    const acoes = document.createElement('div');
    acoes.className = 'acoes-formulario';
    const botao = document.createElement('input');
    botao.className = 'botao-dialogo';
    botao.type = 'button';
    botao.value = 'Continuar';
    botao.addEventListener('click', FechaResultado_overlay);
    acoes.appendChild(botao);
    conteudo.append(texto, acoes);
    caixa.appendChild(conteudo);
}

function FechaResultado_overlay() {
    if (retonarLogin) {
        window.location.href = '/login';
    } else {
        resultado_overlay.style.display = 'none';
    }
}

// Mantém o comportamento original da tela: sem sessão, mostra a mensagem e só
// redireciona ao confirmar; nenhuma rota /usuario é consultada nesse caso.
async function protegerPagina(tipoExigido = null) {
    loading.style.display = 'flex';
    try {
        const resposta = await fetch('/me', { method: 'GET', credentials: 'include' });
        const usuario = await resposta.json();
        switch (resposta.status) {
            case 200:
                break;
            case 401:
                resultado_overlay.style.display = 'flex';
                MostrarResultado_Overlay(0, usuario.mensagem);
                retonarLogin = true;
                return;
            case 429:
                resultado_overlay.style.display = 'flex';
                MostrarResultado_Overlay(0, usuario.mensagem || 'Limite de requisições atingido. Tente novamente mais tarde.');
                return;
            default:
                resultado_overlay.style.display = 'flex';
                MostrarResultado_Overlay(0, usuario.mensagem || `Não foi possível verificar a sessão (HTTP ${resposta.status}).`);
                return;
        }
        if (tipoExigido && usuario.tipo !== tipoExigido) {
            window.location.href = '/tela-principal';
            return;
        }
        return usuario;
    } catch {
        resultado_overlay.style.display = 'flex';
        MostrarResultado_Overlay(0, 'Não foi possível verificar a sessão. Verifique a conexão e tente novamente.');
    } finally {
        loading.style.display = 'none';
    }
}

async function redirecionaTela() {
    const data = await protegerPagina();
    if (!data) return;
    if (data.tipo === 'Comum') {
        window.location.href = '/tela-principal/editar-usuario';
    } else if (data.tipo === 'Admin') {
        window.location.href = `/tela-admin/editar-usuarios?id=${data.id_usuario}`;
    }
}

(() => {
    const SVG = 'http://www.w3.org/2000/svg';
    const estado = {
        usuario: null,
        hoje: '',
        contas: null,
        categorias: null,
        transacoes: null,
        metas: null,
        orcamentos: null,
        saldos: {},
        saldosPendentes: false,
        erros: {}
    };
    const ultimoDesenho = {};

    // ------------------------------------------------------------ utilidades
    function hojeSaoPaulo() {
        return new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date());
    }

    function formatarValor(valor, opcoes = {}) {
        return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', ...opcoes });
    }

    function formatarCompacto(valor) {
        const absoluto = Math.abs(valor);
        const sinal = valor < 0 ? '−' : '';
        if (absoluto >= 1e6) return `${sinal}${(absoluto / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`;
        if (absoluto >= 1e4) return `${sinal}${(absoluto / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
        return `${sinal}${absoluto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}`;
    }

    function formatarData(valor) {
        if (!valor) return '—';
        const [ano, mes, dia] = String(valor).slice(0, 10).split('-');
        return `${dia}/${mes}/${ano}`;
    }

    function dataUTC(iso) {
        return new Date(`${String(iso).slice(0, 10)}T00:00:00Z`);
    }

    function diasEntre(inicio, fim) {
        return Math.round((dataUTC(fim) - dataUTC(inicio)) / 86400000);
    }

    function ultimosMeses(quantidade) {
        const [ano, mes] = estado.hoje.split('-').map(Number);
        const meses = [];
        for (let indice = quantidade - 1; indice >= 0; indice--) {
            const data = new Date(Date.UTC(ano, mes - 1 - indice, 1));
            meses.push(`${data.getUTCFullYear()}-${String(data.getUTCMonth() + 1).padStart(2, '0')}`);
        }
        return meses;
    }

    function nomeMes(chave, longo = false) {
        const [ano, mes] = chave.split('-').map(Number);
        const data = new Date(Date.UTC(ano, mes - 1, 1));
        const texto = new Intl.DateTimeFormat('pt-BR', longo
            ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
            : { month: 'short', timeZone: 'UTC' }).format(data).replace('.', '');
        return texto.charAt(0).toUpperCase() + texto.slice(1);
    }

    function el(tag, atributos = {}, filhos = []) {
        const elemento = document.createElement(tag);
        for (const [chave, valor] of Object.entries(atributos)) {
            if (valor === undefined || valor === null || valor === false) continue;
            if (chave === 'texto') elemento.textContent = valor;
            else if (chave === 'classe') elemento.className = valor;
            else if (chave.startsWith('on') && typeof valor === 'function') elemento.addEventListener(chave.slice(2), valor);
            else if (valor === true) elemento.setAttribute(chave, '');
            else elemento.setAttribute(chave, valor);
        }
        for (const filho of [].concat(filhos)) if (filho != null) elemento.append(filho);
        return elemento;
    }

    function svgEl(tag, atributos = {}) {
        const elemento = document.createElementNS(SVG, tag);
        for (const [chave, valor] of Object.entries(atributos)) {
            if (valor !== undefined && valor !== null) elemento.setAttribute(chave, valor);
        }
        return elemento;
    }

    function iconeSvg(caminhos) {
        const svg = svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', class: 'nav-icone' });
        svg.innerHTML = caminhos;
        return svg;
    }

    const ICONES = {
        Entrada: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
        Saida: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
        Transferencia: '<path d="M3 8h15"/><path d="m14 4 4 4-4 4"/><path d="M21 16H6"/><path d="m10 12-4 4 4 4"/>'
    };

    async function requisitar(rota) {
        const resposta = await fetch(rota, { method: 'GET', credentials: 'include' });
        let dados = null;
        try { dados = await resposta.json(); } catch { dados = null; }
        if (resposta.status === 401) {
            retonarLogin = true;
            resultado_overlay.style.display = 'flex';
            MostrarResultado_Overlay(0, dados?.mensagem || 'Sessão expirada. Entre novamente.');
        }
        return { status: resposta.status, ok: resposta.ok, dados };
    }

    function nomeConta(id) {
        const conta = (estado.contas || []).find(item => String(item.id_conta) === String(id));
        return conta ? conta.nome_conta : id == null ? '' : `Conta #${id}`;
    }

    function nomeCategoria(id) {
        const categoria = (estado.categorias || []).find(item => String(item.id_categoria) === String(id));
        return categoria ? categoria.nome : id == null ? '' : `Categoria #${id}`;
    }

    function contasAtivas() {
        return (estado.contas || []).filter(conta => !conta.status_conta || conta.status_conta === 'Ativo');
    }

    // ------------------------------------------------------------ estados das seções
    function mostrarEstado(container, tipo, mensagem, acao) {
        container.replaceChildren();
        if (tipo === 'carregando') {
            for (let indice = 0; indice < 3; indice++) {
                container.appendChild(el('li', { classe: 'dash-esqueleto', style: `width:${90 - indice * 15}%; margin: 14px 0;` }));
            }
            return;
        }
        const caixa = el('div', { classe: `dash-vazio ${tipo === 'erro' ? 'erro' : ''}` }, [el('span', { texto: mensagem })]);
        if (acao) caixa.appendChild(el('button', { type: 'button', texto: acao.rotulo, onclick: acao.executar }));
        const item = container.tagName === 'UL' || container.tagName === 'OL' ? el('li', {}, [caixa]) : caixa;
        container.appendChild(item);
    }

    // ------------------------------------------------------------ carregamento
    async function carregarContas() {
        estado.erros.contas = null;
        try {
            const { ok, dados } = await requisitar('/usuario/listar-contas');
            if (!ok || !Array.isArray(dados)) throw new Error(dados?.mensagem || 'Não foi possível carregar as contas.');
            estado.contas = dados;
        } catch (erro) {
            estado.contas = estado.contas || [];
            estado.erros.contas = erro.message || 'Não foi possível carregar as contas.';
        }
        renderizar();
        await carregarSaldos();
    }

    async function carregarSaldos() {
        const ativas = contasAtivas();
        estado.saldosPendentes = ativas.length > 0;
        estado.saldos = {};
        renderizarHero();
        await Promise.all(ativas.map(async conta => {
            try {
                const { ok, dados } = await requisitar(`/usuario/verificar-saldo?id_conta=${encodeURIComponent(conta.id_conta)}`);
                const saldo = Number(dados?.saldo);
                estado.saldos[conta.id_conta] = ok && Number.isFinite(saldo) ? saldo : null;
            } catch {
                estado.saldos[conta.id_conta] = null;
            }
        }));
        estado.saldosPendentes = false;
        renderizarHero();
    }

    async function carregarCategorias() {
        estado.erros.categorias = null;
        try {
            const { ok, dados } = await requisitar('/usuario/listar-categoria');
            if (!ok || !Array.isArray(dados)) throw new Error(dados?.mensagem || 'Não foi possível carregar as categorias.');
            estado.categorias = dados;
        } catch (erro) {
            estado.categorias = estado.categorias || [];
            estado.erros.categorias = erro.message;
        }
        renderizar();
    }

    async function carregarTransacoes() {
        estado.erros.transacoes = null;
        try {
            const { ok, dados } = await requisitar('/usuario/listar-transacoes');
            if (!ok || !Array.isArray(dados)) throw new Error(dados?.mensagem || 'Não foi possível carregar as transações.');
            estado.transacoes = dados;
        } catch (erro) {
            estado.transacoes = null;
            estado.erros.transacoes = erro.message || 'Não foi possível carregar as transações.';
        }
        renderizar();
    }

    async function carregarMetas() {
        estado.erros.metas = null;
        try {
            const { status, ok, dados } = await requisitar('/usuario/listar-metas');
            if (ok && Array.isArray(dados?.metas)) estado.metas = dados.metas;
            else if (status === 404) estado.metas = [];
            else throw new Error(dados?.mensagem || 'Não foi possível carregar as metas.');
        } catch (erro) {
            estado.metas = null;
            estado.erros.metas = erro.message || 'Não foi possível carregar as metas.';
        }
        renderizarMetas();
    }

    async function carregarOrcamentos() {
        mostrarMensagemOrcamentos('Carregando orçamentos atuais...');
        try {
            const parametros = new URLSearchParams({ periodo_inicio: estado.hoje, periodo_fim: estado.hoje });
            const resposta = await fetch(`/usuario/listar-orcamentos?${parametros}`, { credentials: 'include' });
            if (!resposta.ok) throw new Error('Não foi possível consultar os orçamentos.');
            const registros = await resposta.json();
            if (!Array.isArray(registros)) throw new Error('Resposta inesperada.');
            estado.orcamentos = registros;
            renderizarOrcamentos(registros);
        } catch {
            estado.orcamentos = null;
            mostrarMensagemOrcamentos('Não foi possível consultar os orçamentos. Recarregue a página para tentar novamente.');
        }
    }

    async function carregarTudo() {
        await Promise.all([carregarContas(), carregarCategorias(), carregarTransacoes(), carregarMetas(), carregarOrcamentos()]);
    }

    // ------------------------------------------------------------ cálculos
    function transacoesRealizadas() {
        return (estado.transacoes || []).filter(item => item.status_transacao === 'Pago' && item.tipo_transacao !== 'Transferencia');
    }

    function mesDaTransacao(item) {
        return String(item.data_pagamento || item.data_transacao || '').slice(0, 7);
    }

    function totaisPorMes(meses) {
        const totais = Object.fromEntries(meses.map(chave => [chave, { entradas: 0, despesas: 0 }]));
        for (const item of transacoesRealizadas()) {
            const chave = mesDaTransacao(item);
            if (!totais[chave]) continue;
            const valor = Number(item.valor_transacao) || 0;
            if (item.tipo_transacao === 'Entrada') totais[chave].entradas += valor;
            else if (item.tipo_transacao === 'Saida') totais[chave].despesas += valor;
        }
        return totais;
    }

    function escalaBonita(maximo, divisoes = 4) {
        if (!(maximo > 0)) return { passo: 1, topo: divisoes };
        const bruto = maximo / divisoes;
        const expoente = Math.pow(10, Math.floor(Math.log10(bruto)));
        const fracao = bruto / expoente;
        let passo;
        if (fracao <= 1) passo = 1;
        else if (fracao <= 2) passo = 2;
        else if (fracao <= 2.5) passo = 2.5;
        else if (fracao <= 5) passo = 5;
        else passo = 10;
        passo *= expoente;
        return { passo, topo: passo * divisoes };
    }

    // ------------------------------------------------------------ tooltip dos gráficos
    function criarTooltip(container) {
        let tooltip = container.querySelector('.grafico-tooltip');
        if (!tooltip) {
            tooltip = el('div', { classe: 'grafico-tooltip', role: 'tooltip', hidden: true });
            container.appendChild(tooltip);
        }
        return {
            mostrar(x, y, titulo, linhas) {
                tooltip.replaceChildren(el('div', { classe: 'tt-titulo', texto: titulo }));
                for (const linha of linhas) {
                    const chave = el('span', {}, [el('i', { classe: 'tt-chave', style: `background:${linha.cor || 'transparent'}` }), linha.rotulo]);
                    tooltip.appendChild(el('div', { classe: 'tt-linha' }, [chave, el('span', { classe: 'tt-valor', texto: linha.valor })]));
                }
                tooltip.hidden = false;
                const largura = tooltip.offsetWidth;
                const limite = container.clientWidth;
                const esquerda = Math.min(Math.max(x, largura / 2), Math.max(largura / 2, limite - largura / 2));
                tooltip.style.left = `${esquerda}px`;
                tooltip.style.top = `${Math.max(y, tooltip.offsetHeight + 12)}px`;
            },
            esconder() { tooltip.hidden = true; }
        };
    }

    // ------------------------------------------------------------ gráfico: fluxo de caixa
    function desenharFluxo(container, meses, totais) {
        container.querySelector('svg')?.remove();
        container.querySelector('.dash-vazio')?.remove();
        const largura = Math.max(280, container.clientWidth || 600);
        const altura = 240;
        const margem = { topo: 18, direita: 8, base: 28, esquerda: 56 };
        const plotL = largura - margem.esquerda - margem.direita;
        const plotA = altura - margem.topo - margem.base;
        const maximo = Math.max(...meses.map(chave => Math.max(totais[chave].entradas, totais[chave].despesas)));
        if (!(maximo > 0)) {
            container.appendChild(el('div', { classe: 'dash-vazio', texto: 'Nenhuma transação paga nos últimos 6 meses. Registre receitas e despesas para ver o fluxo de caixa.' }));
            return;
        }
        const { passo, topo } = escalaBonita(maximo);
        const y = valor => margem.topo + plotA - (valor / topo) * plotA;
        const svg = svgEl('svg', { width: largura, height: altura, viewBox: `0 0 ${largura} ${altura}`, role: 'img', 'aria-label': 'Fluxo de caixa dos últimos 6 meses. Os valores estão na tabela abaixo.' });
        for (let valor = 0; valor <= topo + 1e-9; valor += passo) {
            svg.appendChild(svgEl('line', { class: valor === 0 ? 'eixo' : 'grade', x1: margem.esquerda, x2: largura - margem.direita, y1: y(valor), y2: y(valor) }));
            const rotulo = svgEl('text', { x: margem.esquerda - 8, y: y(valor) + 4, 'text-anchor': 'end' });
            rotulo.textContent = formatarCompacto(valor);
            svg.appendChild(rotulo);
        }
        const banda = plotL / meses.length;
        const larguraBarra = Math.max(6, Math.min(24, Math.floor((banda * 0.72 - 2) / 2)));
        const cores = { entradas: getComputedStyle(document.documentElement).getPropertyValue('--serie-entrada').trim() || '#0e9f55',
            despesas: getComputedStyle(document.documentElement).getPropertyValue('--serie-saida').trim() || '#e8590c' };
        const tooltip = criarTooltip(container);
        const realces = [];
        const faixas = [];
        meses.forEach((chave, indice) => {
            const inicioBanda = margem.esquerda + indice * banda;
            const x0 = inicioBanda + (banda - (larguraBarra * 2 + 2)) / 2;
            const realce = svgEl('rect', { class: 'realce', x: inicioBanda + 2, y: margem.topo - 6, width: banda - 4, height: plotA + 6, rx: 6 });
            svg.appendChild(realce);
            realces.push(realce);
            const dados = totais[chave];
            [['entradas', x0], ['despesas', x0 + larguraBarra + 2]].forEach(([serie, x]) => {
                const valor = dados[serie];
                if (valor <= 0) return;
                const topoBarra = y(valor);
                const alturaBarra = margem.topo + plotA - topoBarra;
                const raio = Math.min(4, alturaBarra, larguraBarra / 2);
                const caminho = `M${x},${topoBarra + alturaBarra} V${topoBarra + raio} Q${x},${topoBarra} ${x + raio},${topoBarra} H${x + larguraBarra - raio} Q${x + larguraBarra},${topoBarra} ${x + larguraBarra},${topoBarra + raio} V${topoBarra + alturaBarra} Z`;
                svg.appendChild(svgEl('path', { d: caminho, fill: cores[serie] }));
                if (indice === meses.length - 1) {
                    const rotulo = svgEl('text', { class: 'rotulo-valor', x: serie === 'entradas' ? x + larguraBarra : x, y: topoBarra - 6,
                        'text-anchor': serie === 'entradas' ? 'end' : 'start' });
                    rotulo.textContent = formatarCompacto(valor);
                    svg.appendChild(rotulo);
                }
            });
            const rotuloMes = svgEl('text', { x: inicioBanda + banda / 2, y: altura - 8, 'text-anchor': 'middle', class: indice === meses.length - 1 ? 'rotulo-valor' : '' });
            rotuloMes.textContent = nomeMes(chave);
            svg.appendChild(rotuloMes);
            faixas.push({ chave, inicioBanda, indice });
        });
        faixas.forEach(({ chave, inicioBanda, indice }) => {
            const dados = totais[chave];
            const resultado = dados.entradas - dados.despesas;
            const faixa = svgEl('rect', { class: 'faixa-hover', x: inicioBanda, y: margem.topo - 10, width: banda, height: plotA + 10 + margem.base, tabindex: 0, role: 'img',
                'aria-label': `${nomeMes(chave, true)}: entradas ${formatarValor(dados.entradas)}, despesas ${formatarValor(dados.despesas)}, resultado ${formatarValor(resultado)}` });
            const mostrar = () => {
                realces.forEach((realce, outro) => realce.setAttribute('opacity', outro === indice ? 1 : 0));
                tooltip.mostrar(inicioBanda + banda / 2, margem.topo, nomeMes(chave, true), [
                    { rotulo: 'Entradas', valor: formatarValor(dados.entradas), cor: cores.entradas },
                    { rotulo: 'Despesas', valor: formatarValor(dados.despesas), cor: cores.despesas },
                    { rotulo: 'Resultado', valor: formatarValor(resultado) }
                ]);
            };
            const esconder = () => {
                realces.forEach(realce => realce.setAttribute('opacity', 0));
                tooltip.esconder();
            };
            faixa.addEventListener('pointerenter', mostrar);
            faixa.addEventListener('focus', mostrar);
            faixa.addEventListener('pointerleave', esconder);
            faixa.addEventListener('blur', esconder);
            svg.appendChild(faixa);
        });
        container.prepend(svg);
    }

    // ------------------------------------------------------------ gráfico: evolução mensal (linha)
    function desenharEvolucao(container, meses, totais) {
        container.querySelector('svg')?.remove();
        container.querySelector('.dash-vazio')?.remove();
        const valores = meses.map(chave => totais[chave].entradas - totais[chave].despesas);
        const largura = Math.max(240, container.clientWidth || 480);
        const altura = 120;
        const margem = { topo: 22, direita: 60, base: 22, esquerda: 10 };
        const plotL = largura - margem.esquerda - margem.direita;
        const plotA = altura - margem.topo - margem.base;
        const temDados = meses.some(chave => totais[chave].entradas > 0 || totais[chave].despesas > 0);
        if (!temDados) {
            container.appendChild(el('div', { classe: 'dash-vazio', texto: 'Sem movimentações pagas nos últimos meses.' }));
            return;
        }
        const minimo = Math.min(0, ...valores);
        const maximo = Math.max(0, ...valores);
        const amplitude = maximo - minimo || 1;
        const x = indice => margem.esquerda + (indice + 0.5) * (plotL / meses.length);
        const y = valor => margem.topo + plotA - ((valor - minimo) / amplitude) * plotA;
        const cor = getComputedStyle(document.documentElement).getPropertyValue('--serie-entrada').trim() || '#0e9f55';
        const svg = svgEl('svg', { width: largura, height: altura, viewBox: `0 0 ${largura} ${altura}`, role: 'img',
            'aria-label': `Resultado mensal dos últimos ${meses.length} meses: ${meses.map((chave, indice) => `${nomeMes(chave)} ${formatarValor(valores[indice])}`).join(', ')}.` });
        svg.appendChild(svgEl('line', { class: 'eixo', x1: margem.esquerda, x2: largura - margem.direita + 24, y1: y(0), y2: y(0) }));
        const pontos = valores.map((valor, indice) => `${x(indice)},${y(valor)}`);
        const area = `M${x(0)},${y(0)} L${pontos.join(' L')} L${x(valores.length - 1)},${y(0)} Z`;
        svg.appendChild(svgEl('path', { d: area, fill: cor, 'fill-opacity': 0.1 }));
        svg.appendChild(svgEl('path', { d: `M${pontos.join(' L')}`, fill: 'none', stroke: cor, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
        const ultimo = valores.length - 1;
        svg.appendChild(svgEl('circle', { cx: x(ultimo), cy: y(valores[ultimo]), r: 4.5, fill: cor, stroke: 'var(--superficie)', 'stroke-width': 2 }));
        const rotulo = svgEl('text', { class: 'rotulo-destaque', x: x(ultimo) + 10, y: y(valores[ultimo]) + 4 });
        rotulo.textContent = formatarCompacto(valores[ultimo]);
        svg.appendChild(rotulo);
        meses.forEach((chave, indice) => {
            const texto = svgEl('text', { x: x(indice), y: altura - 6, 'text-anchor': 'middle' });
            texto.textContent = nomeMes(chave);
            svg.appendChild(texto);
        });
        const mira = svgEl('line', { class: 'mira', x1: 0, x2: 0, y1: margem.topo - 6, y2: margem.topo + plotA, opacity: 0 });
        svg.appendChild(mira);
        const tooltip = criarTooltip(container);
        meses.forEach((chave, indice) => {
            const banda = plotL / meses.length;
            const faixa = svgEl('rect', { class: 'faixa-hover', x: margem.esquerda + indice * banda, y: 0, width: banda, height: altura, tabindex: 0, role: 'img',
                'aria-label': `${nomeMes(chave, true)}: resultado ${formatarValor(valores[indice])}` });
            const mostrar = () => {
                mira.setAttribute('x1', x(indice));
                mira.setAttribute('x2', x(indice));
                mira.setAttribute('opacity', 1);
                tooltip.mostrar(x(indice), y(valores[indice]) - 4, nomeMes(chave, true), [
                    { rotulo: 'Entradas', valor: formatarValor(totais[chave].entradas), cor },
                    { rotulo: 'Despesas', valor: formatarValor(totais[chave].despesas), cor: 'var(--serie-saida)' },
                    { rotulo: 'Resultado', valor: formatarValor(valores[indice]) }
                ]);
            };
            const esconder = () => { mira.setAttribute('opacity', 0); tooltip.esconder(); };
            faixa.addEventListener('pointerenter', mostrar);
            faixa.addEventListener('focus', mostrar);
            faixa.addEventListener('pointerleave', esconder);
            faixa.addEventListener('blur', esconder);
            svg.appendChild(faixa);
        });
        container.prepend(svg);
    }

    // ------------------------------------------------------------ renderização
    function renderizar() {
        renderizarAviso();
        renderizarHero();
        renderizarKpisEFluxo();
        renderizarMovimentacoes();
        renderizarPendencias();
        renderizarCategorias();
        renderizarMetas();
    }

    function renderizarAviso() {
        const aviso = document.getElementById('dash-aviso');
        aviso.replaceChildren();
        aviso.hidden = true;
        if (estado.contas && !estado.erros.contas && contasAtivas().length === 0) {
            aviso.hidden = false;
            aviso.append(el('span', { texto: 'Bem-vindo ao CashLand! Comece cadastrando uma conta financeira para registrar suas movimentações.' }),
                el('div', { classe: 'acoes-formulario' }, [el('a', { classe: 'btn-primary', href: '/tela-principal/criar-conta', texto: 'Criar primeira conta', style: 'text-decoration:none; padding: 9px 14px; border-radius: 10px; display:inline-flex;' })]));
        } else if (estado.categorias && !estado.erros.categorias && estado.categorias.length === 0) {
            aviso.hidden = false;
            aviso.append(el('span', { texto: 'Crie categorias para classificar receitas e despesas e acompanhar orçamentos.' }),
                el('div', { classe: 'acoes-formulario' }, [el('button', { type: 'button', classe: 'btn-primary', texto: 'Criar categoria', onclick: () => AcoesRapidas.abrir('categoria') })]));
        }
    }

    function renderizarHero() {
        const valorEl = document.getElementById('saldo-total');
        const resumoEl = document.getElementById('saldo-resumo');
        const listaEl = document.getElementById('lista-contas-dash');
        const ativas = contasAtivas();
        resumoEl.replaceChildren();
        listaEl.replaceChildren();
        if (estado.contas === null) {
            valorEl.textContent = '—';
            resumoEl.appendChild(el('span', { classe: 'dash-carregando', texto: 'Carregando contas…' }));
            return;
        }
        if (estado.erros.contas) {
            valorEl.textContent = 'Indisponível';
            valorEl.classList.remove('negativo');
            resumoEl.appendChild(el('span', { texto: estado.erros.contas }));
            resumoEl.appendChild(el('button', { type: 'button', classe: 'btn-fantasma', texto: 'Tentar novamente', onclick: carregarContas }));
            return;
        }
        if (!ativas.length) {
            valorEl.textContent = formatarValor(0);
            resumoEl.appendChild(el('span', { texto: 'Nenhuma conta ativa.' }));
            return;
        }
        const saldos = ativas.map(conta => estado.saldos[conta.id_conta]);
        const carregados = saldos.filter(saldo => saldo !== undefined);
        const indisponiveis = saldos.filter(saldo => saldo === null).length;
        if (estado.saldosPendentes && carregados.length < ativas.length) {
            valorEl.textContent = 'Carregando…';
            valorEl.classList.remove('negativo');
        } else if (indisponiveis === ativas.length) {
            valorEl.textContent = 'Indisponível';
            valorEl.classList.remove('negativo');
        } else {
            const total = saldos.reduce((soma, saldo) => soma + (saldo || 0), 0);
            valorEl.textContent = formatarValor(total);
            valorEl.classList.toggle('negativo', total < 0);
        }
        resumoEl.appendChild(el('span', { texto: `${ativas.length} ${ativas.length === 1 ? 'conta ativa' : 'contas ativas'}` }));
        if (indisponiveis && !estado.saldosPendentes) {
            resumoEl.appendChild(el('span', { texto: `${indisponiveis} ${indisponiveis === 1 ? 'conta sem saldo disponível' : 'contas sem saldo disponível'}` }));
        }
        const ordenadas = [...ativas].sort((a, b) => (estado.saldos[b.id_conta] ?? -Infinity) - (estado.saldos[a.id_conta] ?? -Infinity));
        for (const conta of ordenadas) {
            const saldo = estado.saldos[conta.id_conta];
            const textoSaldo = saldo === undefined ? '…' : saldo === null ? 'Indisponível' : formatarValor(saldo);
            listaEl.appendChild(el('li', {}, [
                el('a', { href: `/tela-principal/editar-conta?id=${encodeURIComponent(conta.id_conta)}`, title: `Abrir conta ${conta.nome_conta}` }, [
                    el('span', { classe: 'conta-nome' }, [conta.nome_conta, conta.tipo_conta ? el('span', { classe: 'conta-tipo', texto: conta.tipo_conta }) : null]),
                    el('span', { classe: `conta-saldo ${typeof saldo === 'number' && saldo < 0 ? 'negativo' : ''}`, texto: textoSaldo })
                ])
            ]));
        }
    }

    function chipDelta(atual, anterior, { subirEhBom = true, moeda = false } = {}) {
        const chip = el('span', { classe: 'delta-chip' });
        if (anterior > 0 || (moeda && anterior !== 0)) {
            const variacao = moeda ? atual - anterior : ((atual - anterior) / Math.abs(anterior)) * 100;
            const subiu = variacao > 0;
            const estavel = Math.abs(variacao) < (moeda ? 0.005 : 0.5);
            const texto = moeda ? `${subiu ? '+' : variacao < 0 ? '−' : ''}${formatarValor(Math.abs(variacao))}`
                : `${subiu ? '▲' : variacao < 0 ? '▼' : '•'} ${Math.abs(variacao).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}%`;
            chip.textContent = texto;
            if (!estavel) chip.classList.add(subiu === subirEhBom ? 'bom' : 'ruim');
        } else if (atual > 0) {
            chip.textContent = 'novo';
        } else {
            chip.textContent = '—';
        }
        return chip;
    }

    function renderizarKpisEFluxo() {
        const campos = ['kpi-entradas', 'kpi-despesas', 'kpi-economia'];
        const fluxo = document.getElementById('grafico-fluxo');
        const evolucao = document.getElementById('grafico-evolucao');
        const corpoTabela = document.querySelector('#tabela-fluxo tbody');
        if (estado.transacoes === null) {
            const mensagem = estado.erros.transacoes;
            campos.forEach(id => {
                document.getElementById(id).textContent = mensagem ? 'Indisponível' : '—';
                document.getElementById(`${id}-delta`).replaceChildren(el('span', { classe: 'dash-carregando', texto: mensagem ? '' : 'Carregando…' }));
            });
            [fluxo, evolucao].forEach(container => {
                container.querySelector('svg')?.remove();
                container.querySelector('.dash-vazio')?.remove();
                if (mensagem) {
                    const caixa = el('div', { classe: 'dash-vazio erro' }, [el('span', { texto: mensagem }),
                        el('button', { type: 'button', texto: 'Tentar novamente', onclick: carregarTransacoes })]);
                    container.appendChild(caixa);
                } else {
                    container.appendChild(el('div', { classe: 'dash-vazio' }, [el('span', { classe: 'dash-carregando', texto: 'Carregando…' })]));
                }
            });
            corpoTabela.replaceChildren();
            return;
        }
        const meses = ultimosMeses(6);
        const totais = totaisPorMes(meses);
        const atual = totais[meses[5]];
        const anterior = totais[meses[4]];
        const economiaAtual = atual.entradas - atual.despesas;
        const economiaAnterior = anterior.entradas - anterior.despesas;

        document.getElementById('kpi-entradas').textContent = formatarValor(atual.entradas);
        document.getElementById('kpi-entradas-delta').replaceChildren(chipDelta(atual.entradas, anterior.entradas, { subirEhBom: true }), el('span', { texto: `vs. ${nomeMes(meses[4])}` }));
        document.getElementById('kpi-despesas').textContent = formatarValor(atual.despesas);
        document.getElementById('kpi-despesas-delta').replaceChildren(chipDelta(atual.despesas, anterior.despesas, { subirEhBom: false }), el('span', { texto: `vs. ${nomeMes(meses[4])}` }));
        const economiaEl = document.getElementById('kpi-economia');
        economiaEl.textContent = formatarValor(economiaAtual);
        economiaEl.style.color = economiaAtual < 0 ? 'var(--erro)' : '';
        const taxa = atual.entradas > 0 ? Math.round((economiaAtual / atual.entradas) * 100) : null;
        document.getElementById('kpi-economia-delta').replaceChildren(
            chipDelta(economiaAtual, economiaAnterior, { subirEhBom: true, moeda: true }),
            el('span', { texto: taxa === null ? 'sem entradas no mês' : taxa >= 0 ? `${taxa}% das entradas guardado` : 'gastos acima das entradas' })
        );

        const resumoEvolucao = document.getElementById('evolucao-resumo');
        resumoEvolucao.replaceChildren(el('strong', { texto: `${nomeMes(meses[5])}: ${economiaAtual >= 0 ? '+' : '−'}${formatarValor(Math.abs(economiaAtual))}` }));

        ultimoDesenho.fluxo = { meses, totais };
        ultimoDesenho.evolucao = { meses, totais };
        desenharFluxo(fluxo, meses, totais);
        desenharEvolucao(evolucao, meses, totais);

        corpoTabela.replaceChildren();
        for (const chave of meses) {
            const dados = totais[chave];
            corpoTabela.appendChild(el('tr', {}, [
                el('td', { texto: nomeMes(chave, true) }),
                el('td', { texto: formatarValor(dados.entradas) }),
                el('td', { texto: formatarValor(dados.despesas) }),
                el('td', { texto: formatarValor(dados.entradas - dados.despesas) })
            ]));
        }
    }

    function descricaoStatus(item) {
        if (item.status_transacao !== 'Pendente') return null;
        const vencimento = item.data_vencimento ? String(item.data_vencimento).slice(0, 10) : null;
        if (vencimento && vencimento < estado.hoje) return el('span', { classe: 'chip atrasada', texto: 'Atrasada' });
        return el('span', { classe: 'chip pendente', texto: 'Pendente' });
    }

    function botaoPagar(item) {
        const rotulo = item.tipo_transacao === 'Entrada' ? 'Receber' : 'Pagar';
        return el('button', { type: 'button', classe: 'btn-secundario', texto: rotulo, onclick: () => efetivarTransacao(item) });
    }

    function itemMovimentacao(item, { mostrarVencimento = false } = {}) {
        const tipo = item.tipo_transacao;
        const detalhes = [];
        if (tipo === 'Transferencia') detalhes.push(`Transferência para ${nomeConta(item.id_conta_destino) || 'outra conta'}`);
        else if (item.id_categoria != null) detalhes.push(nomeCategoria(item.id_categoria));
        detalhes.push(nomeConta(item.id_conta_origem));
        if (mostrarVencimento) {
            const vencimento = item.data_vencimento ? String(item.data_vencimento).slice(0, 10) : null;
            if (vencimento) {
                const dias = diasEntre(estado.hoje, vencimento);
                detalhes.push(dias < 0 ? `venceu em ${formatarData(vencimento)}` : dias === 0 ? 'vence hoje' : dias === 1 ? 'vence amanhã' : `vence em ${dias} dias (${formatarData(vencimento)})`);
            } else detalhes.push(`lançada em ${formatarData(item.data_transacao)}`);
        } else detalhes.push(formatarData(item.data_transacao));
        const sinal = tipo === 'Entrada' ? '+' : tipo === 'Saida' ? '−' : '';
        const link = `/tela-principal/editar-transacao?id_transacao=${encodeURIComponent(item.id_transacao)}`;
        const acoes = el('div', { classe: 'mov-acoes' });
        if (item.status_transacao === 'Pendente') acoes.appendChild(botaoPagar(item));
        acoes.appendChild(el('a', { href: link, classe: 'btn-fantasma', texto: 'Ver' }));
        return el('li', { classe: 'mov-item' }, [
            el('span', { classe: `mov-icone ${tipo === 'Entrada' ? 'entrada' : tipo === 'Saida' ? 'saida' : 'transferencia'}`, 'aria-hidden': 'true' }, [iconeSvg(ICONES[tipo] || ICONES.Transferencia)]),
            el('span', { classe: 'mov-nome' }, [el('a', { href: link, texto: item.nome || `Transação #${item.id_transacao}` }), ' ', descricaoStatus(item)]),
            el('span', { classe: `mov-valor ${tipo === 'Entrada' ? 'entrada' : ''}`, texto: `${sinal}${formatarValor(item.valor_transacao)}` }),
            el('span', { classe: 'mov-detalhe', texto: detalhes.filter(Boolean).join(' · ') }),
            acoes
        ]);
    }

    function renderizarMovimentacoes() {
        const lista = document.getElementById('lista-movimentacoes');
        if (estado.transacoes === null) {
            if (estado.erros.transacoes) mostrarEstado(lista, 'erro', estado.erros.transacoes, { rotulo: 'Tentar novamente', executar: carregarTransacoes });
            else mostrarEstado(lista, 'carregando');
            return;
        }
        const recentes = [...estado.transacoes]
            .sort((a, b) => String(b.data_transacao).localeCompare(String(a.data_transacao)) || (b.id_transacao - a.id_transacao))
            .slice(0, 8);
        if (!recentes.length) {
            mostrarEstado(lista, 'vazio', 'Nenhuma transação registrada ainda.', { rotulo: 'Registrar primeira transação', executar: () => AcoesRapidas.abrir('despesa') });
            return;
        }
        lista.replaceChildren(...recentes.map(item => itemMovimentacao(item)));
    }

    function renderizarPendencias() {
        const lista = document.getElementById('lista-pendencias');
        const resumo = document.getElementById('pendencias-resumo');
        resumo.replaceChildren();
        if (estado.transacoes === null) {
            if (estado.erros.transacoes) mostrarEstado(lista, 'erro', estado.erros.transacoes, { rotulo: 'Tentar novamente', executar: carregarTransacoes });
            else mostrarEstado(lista, 'carregando');
            return;
        }
        const pendentes = estado.transacoes.filter(item => item.status_transacao === 'Pendente');
        const chaveOrdem = item => String(item.data_vencimento || item.data_transacao || '9999').slice(0, 10);
        pendentes.sort((a, b) => chaveOrdem(a).localeCompare(chaveOrdem(b)));
        const aPagar = pendentes.filter(item => item.tipo_transacao === 'Saida').reduce((soma, item) => soma + Number(item.valor_transacao || 0), 0);
        const aReceber = pendentes.filter(item => item.tipo_transacao === 'Entrada').reduce((soma, item) => soma + Number(item.valor_transacao || 0), 0);
        const atrasadas = pendentes.filter(item => item.data_vencimento && String(item.data_vencimento).slice(0, 10) < estado.hoje).length;
        if (!pendentes.length) {
            mostrarEstado(lista, 'vazio', 'Nenhuma transação pendente. Tudo em dia!');
            return;
        }
        resumo.append(
            el('span', {}, ['A pagar: ', el('strong', { texto: formatarValor(aPagar) })]),
            el('span', {}, ['A receber: ', el('strong', { texto: formatarValor(aReceber) })]),
            el('span', { classe: atrasadas ? 'atrasado' : '' }, ['Atrasadas: ', el('strong', { texto: String(atrasadas) })])
        );
        lista.replaceChildren(...pendentes.slice(0, 6).map(item => itemMovimentacao(item, { mostrarVencimento: true })));
    }

    function renderizarCategorias() {
        const lista = document.getElementById('lista-categorias');
        const resumo = document.getElementById('categorias-resumo');
        if (estado.transacoes === null) {
            if (estado.erros.transacoes) mostrarEstado(lista, 'erro', estado.erros.transacoes, { rotulo: 'Tentar novamente', executar: carregarTransacoes });
            else mostrarEstado(lista, 'carregando');
            return;
        }
        const mesAtual = estado.hoje.slice(0, 7);
        const porCategoria = new Map();
        for (const item of transacoesRealizadas()) {
            if (item.tipo_transacao !== 'Saida' || mesDaTransacao(item) !== mesAtual) continue;
            const chave = item.id_categoria ?? 'sem';
            porCategoria.set(chave, (porCategoria.get(chave) || 0) + Number(item.valor_transacao || 0));
        }
        const ordenadas = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);
        const total = ordenadas.reduce((soma, [, valor]) => soma + valor, 0);
        if (!ordenadas.length) {
            resumo.textContent = `Despesas pagas em ${nomeMes(mesAtual, true)}`;
            mostrarEstado(lista, 'vazio', 'Nenhuma despesa paga neste mês.');
            return;
        }
        const principais = ordenadas.slice(0, 6);
        const restante = ordenadas.slice(6).reduce((soma, [, valor]) => soma + valor, 0);
        if (restante > 0) principais.push(['outras', restante]);
        const maximo = principais[0][1];
        resumo.textContent = `${formatarValor(total)} em ${nomeMes(mesAtual, true)} · ${ordenadas.length} ${ordenadas.length === 1 ? 'categoria' : 'categorias'}`;
        lista.replaceChildren(...principais.map(([chave, valor]) => {
            const nome = chave === 'outras' ? `Outras (${ordenadas.length - 6})` : chave === 'sem' ? 'Sem categoria' : nomeCategoria(chave);
            const percentual = total > 0 ? Math.round((valor / total) * 100) : 0;
            const barra = el('div', { classe: 'cat-barra', role: 'img', 'aria-label': `${nome}: ${formatarValor(valor)}, ${percentual}% das despesas` }, [
                el('span', { style: `width:${Math.max(2, (valor / maximo) * 100)}%` })
            ]);
            return el('li', { classe: 'cat-item' }, [
                el('span', { classe: 'cat-nome', texto: nome }),
                el('span', { classe: 'cat-valor' }, [el('strong', { texto: formatarValor(valor) }), ` · ${percentual}%`]),
                barra
            ]);
        }));
    }

    function renderizarMetas() {
        const lista = document.getElementById('lista-metas');
        const resumo = document.getElementById('metas-resumo');
        if (estado.metas === null) {
            if (estado.erros.metas) mostrarEstado(lista, 'erro', estado.erros.metas, { rotulo: 'Tentar novamente', executar: carregarMetas });
            else mostrarEstado(lista, 'carregando');
            return;
        }
        if (!estado.metas.length) {
            resumo.textContent = 'Defina objetivos e acompanhe o progresso';
            mostrarEstado(lista, 'vazio', 'Você ainda não tem metas financeiras.', { rotulo: 'Criar primeira meta', executar: () => AcoesRapidas.abrir('meta') });
            return;
        }
        const emProgresso = estado.metas.filter(meta => meta.status !== 'Finalizado');
        const concluidas = estado.metas.length - emProgresso.length;
        resumo.textContent = `${emProgresso.length} em andamento · ${concluidas} ${concluidas === 1 ? 'concluída' : 'concluídas'}`;
        const ordenadas = [...emProgresso].sort((a, b) => (Number(b.valor_atual || 0) / Number(b.valor_meta || 1)) - (Number(a.valor_atual || 0) / Number(a.valor_meta || 1)))
            .concat(estado.metas.filter(meta => meta.status === 'Finalizado'))
            .slice(0, 5);
        lista.replaceChildren(...ordenadas.map(meta => {
            const atual = Number(meta.valor_atual || 0);
            const objetivo = Number(meta.valor_meta || 0);
            const percentual = objetivo > 0 ? Math.min(100, Math.max(0, (atual / objetivo) * 100)) : 0;
            const concluida = meta.status === 'Finalizado';
            let prazo = el('span', { classe: 'meta-prazo', texto: 'Sem prazo' });
            if (concluida) prazo = el('span', { classe: 'meta-prazo', texto: '✓ Concluída' });
            else if (meta.data_meta) {
                const dias = diasEntre(estado.hoje, meta.data_meta);
                prazo = el('span', { classe: `meta-prazo ${dias < 0 ? 'atrasada' : ''}`,
                    texto: dias < 0 ? `Prazo vencido em ${formatarData(meta.data_meta)}` : dias === 0 ? 'Prazo termina hoje' : `${dias} dias · até ${formatarData(meta.data_meta)}` });
            }
            return el('li', {}, [
                el('a', { classe: 'meta-item', href: `/tela-principal/editar-meta?id_meta=${encodeURIComponent(meta.id_meta)}` }, [
                    el('span', { classe: 'meta-nome', texto: meta.nome }),
                    prazo,
                    el('span', { classe: `meta-barra ${concluida ? 'concluida' : ''}`, role: 'img', 'aria-label': `${Math.round(percentual)}% da meta` }, [el('span', { style: `width:${percentual}%` })]),
                    el('span', { classe: 'meta-valores' }, [
                        el('span', {}, [el('strong', { texto: formatarValor(atual) }), ` de ${formatarValor(objetivo)}`]),
                        el('span', { texto: `${Math.round(percentual)}%` })
                    ])
                ])
            ]);
        }));
    }

    // ------------------------------------------------------------ orçamentos (RF-008)
    function mostrarMensagemOrcamentos(mensagem) {
        const corpo = document.getElementById('corpo-orcamentos');
        const linha = document.createElement('tr');
        const coluna = document.createElement('td');
        coluna.colSpan = 6;
        coluna.textContent = mensagem;
        linha.appendChild(coluna);
        corpo.replaceChildren(linha);
    }

    function renderizarOrcamentos(registros) {
        const corpo = document.getElementById('corpo-orcamentos');
        corpo.replaceChildren();
        if (registros.length === 0) {
            mostrarMensagemOrcamentos('Nenhum orçamento atual.');
            return;
        }
        for (const registro of registros) {
            const linha = document.createElement('tr');
            // Os valores da API têm duas casas decimais; compare centavos inteiros.
            const valorAtual = Math.round(Number(registro.valor_atual) * 100);
            const valorOrcamento = Math.round(Number(registro.valor_orcamento) * 100);
            const valorRestante = valorOrcamento - valorAtual;
            if (valorRestante < 0) linha.className = 'orcamento-vermelho';
            else if (valorRestante < 10000) linha.className = 'orcamento-amarelo';
            else linha.className = 'orcamento-verde';
            linha.title = valorRestante < 0 ? `Limite ultrapassado em ${formatarValor(-valorRestante / 100)}` : `Restam ${formatarValor(valorRestante / 100)}`;

            const colunaVer = document.createElement('td');
            const botaoVer = document.createElement('button');
            botaoVer.type = 'button';
            botaoVer.textContent = 'ver';
            botaoVer.setAttribute('aria-label', `Ver orçamento ${registro.nome}`);
            botaoVer.addEventListener('click', () => {
                const parametros = new URLSearchParams({ id_orcamento: registro.id_orcamento });
                window.location.href = `/tela-principal/editar-orcamento?${parametros}`;
            });
            colunaVer.appendChild(botaoVer);
            linha.appendChild(colunaVer);

            const valores = [registro.nome, formatarValor(registro.valor_atual), formatarValor(registro.valor_orcamento),
                formatarData(registro.periodo_inicio), formatarData(registro.periodo_fim)];
            for (const valor of valores) {
                const coluna = document.createElement('td');
                coluna.textContent = valor;
                coluna.title = coluna.textContent;
                linha.appendChild(coluna);
            }
            corpo.appendChild(linha);
        }
    }

    // ------------------------------------------------------------ ações
    async function efetivarTransacao(item) {
        const receita = item.tipo_transacao === 'Entrada';
        const confirmado = await AcoesRapidas.confirmar({
            titulo: receita ? 'Confirmar recebimento' : 'Confirmar pagamento',
            mensagem: `Marcar "${item.nome}" (${formatarValor(item.valor_transacao)}) como ${receita ? 'recebida' : 'paga'} na data de hoje? O saldo da conta será atualizado.`,
            rotuloConfirmar: receita ? 'Marcar como recebida' : 'Marcar como paga'
        });
        if (!confirmado) return;
        try {
            const resposta = await fetch('/usuario/editar-transacao', {
                method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_transacao: item.id_transacao, status_transacao: 'Pago', data_pagamento: estado.hoje })
            });
            let dados = {};
            try { dados = await resposta.json(); } catch { dados = {}; }
            if (resposta.ok) {
                AcoesRapidas.toast(dados.mensagem || 'Transação atualizada com sucesso.');
                await aoConcluir('transacao');
            } else if (resposta.status === 401) {
                window.location.href = '/login';
            } else {
                AcoesRapidas.toast(Array.isArray(dados.erros) ? dados.erros.map(erro => erro.mensagem).join(' ') : (dados.mensagem || `Não foi possível concluir (HTTP ${resposta.status}).`), 'erro');
            }
        } catch {
            AcoesRapidas.toast('Não foi possível conectar ao servidor. Tente novamente.', 'erro');
        }
    }

    async function aoConcluir() {
        if (typeof atualizarSaldoUsuario === 'function') atualizarSaldoUsuario();
        await carregarTudo();
    }

    function habilitarAcoes() {
        document.querySelectorAll('[data-acao]').forEach(botao => {
            botao.disabled = false;
            botao.addEventListener('click', () => AcoesRapidas.abrir(botao.dataset.acao));
        });
        const flutuante = document.getElementById('botao-flutuante');
        if (flutuante) {
            flutuante.addEventListener('click', evento => {
                evento.preventDefault();
                AcoesRapidas.abrirMenu();
            });
        }
    }

    document.getElementById('alternar-tabela-fluxo').addEventListener('click', evento => {
        const tabela = document.getElementById('tabela-fluxo');
        const grafico = document.getElementById('grafico-fluxo');
        const mostrarTabela = tabela.hidden;
        tabela.hidden = !mostrarTabela;
        grafico.hidden = mostrarTabela;
        evento.currentTarget.textContent = mostrarTabela ? 'Ver gráfico' : 'Ver tabela';
        evento.currentTarget.setAttribute('aria-pressed', String(mostrarTabela));
    });

    // Redesenha os gráficos quando a largura do cartão muda (responsivo).
    let quadroPendente = null;
    const observador = new ResizeObserver(() => {
        if (quadroPendente) return;
        quadroPendente = requestAnimationFrame(() => {
            quadroPendente = null;
            if (ultimoDesenho.fluxo && !document.getElementById('grafico-fluxo').hidden) desenharFluxo(document.getElementById('grafico-fluxo'), ultimoDesenho.fluxo.meses, ultimoDesenho.fluxo.totais);
            if (ultimoDesenho.evolucao) desenharEvolucao(document.getElementById('grafico-evolucao'), ultimoDesenho.evolucao.meses, ultimoDesenho.evolucao.totais);
        });
    });
    observador.observe(document.getElementById('grafico-fluxo'));
    observador.observe(document.getElementById('grafico-evolucao'));

    document.getElementById('meuForm-Logout').addEventListener('submit', async evento => {
        evento.preventDefault();
        const resposta = await fetch('/logout', { method: 'POST', credentials: 'include' });
        if (resposta.status === 429) {
            const dados = await resposta.json().catch(() => ({}));
            loading.style.display = 'none';
            resultado_overlay.style.display = 'flex';
            MostrarResultado_Overlay(0, dados.mensagem || 'Limite de requisições atingido. Tente novamente mais tarde.');
            return;
        }
        localStorage.removeItem('tipo');
        window.location.href = '/login';
    });

    // ------------------------------------------------------------ início
    async function iniciar() {
        estado.hoje = hojeSaoPaulo();
        document.getElementById('dash-periodo').textContent = new Intl.DateTimeFormat('pt-BR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
        }).format(dataUTC(estado.hoje));
        ['lista-metas', 'lista-movimentacoes', 'lista-pendencias', 'lista-categorias'].forEach(id => mostrarEstado(document.getElementById(id), 'carregando'));

        const usuario = await protegerPagina();
        if (!usuario) return;
        estado.usuario = usuario;
        document.getElementById('nome-usuario').textContent = usuario.nome.slice(0, 8);
        const primeiroNome = String(usuario.nome || '').trim().split(/\s+/)[0] || '';
        document.getElementById('dash-saudacao').textContent = primeiroNome ? `Olá, ${primeiroNome}!` : 'Olá!';
        atualizarSaldoUsuario(usuario.id_usuario);

        AcoesRapidas.configurar({
            contas: () => estado.contas || [],
            categorias: () => estado.categorias || [],
            metas: () => estado.metas || [],
            hoje: () => estado.hoje,
            aoConcluir
        });
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', habilitarAcoes, { once: true });
        else habilitarAcoes();

        await carregarTudo();

        const acaoInicial = new URLSearchParams(location.search).get('acao');
        if (acaoInicial) AcoesRapidas.abrir(acaoInicial);
    }

    iniciar();
})();
