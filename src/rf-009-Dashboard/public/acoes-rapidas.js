// Ações rápidas do CashLand: formulários compactos em modal que usam as mesmas
// rotas da API das telas completas (criar transação, categoria, meta e orçamento).
// A página informa as listas já carregadas (contas, categorias, metas) e recebe
// um aviso ao concluir, para recarregar os dados. Nenhum HTML vindo da API é
// interpretado: todo texto é inserido com textContent.
window.AcoesRapidas = (() => {
    const config = {
        contas: () => [],
        categorias: () => [],
        metas: () => [],
        hoje: () => new Intl.DateTimeFormat('en-CA', {
            timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit'
        }).format(new Date()),
        aoConcluir: () => {},
        aoSessaoExpirar: () => { window.location.href = '/login'; }
    };
    let modalAtual = null;
    let toastAtual = null;
    let temporizadorToast = null;

    function configurar(opcoes) {
        Object.assign(config, opcoes);
    }

    // ---------------------------------------------------------------- utilidades
    function formatarValor(valor) {
        return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function formatarData(valor) {
        if (!valor) return '';
        const [ano, mes, dia] = String(valor).slice(0, 10).split('-');
        return `${dia}/${mes}/${ano}`;
    }

    function el(tag, atributos = {}, filhos = []) {
        const elemento = document.createElement(tag);
        for (const [chave, valor] of Object.entries(atributos)) {
            if (valor === undefined || valor === null || valor === false) continue;
            if (chave === 'texto') elemento.textContent = valor;
            else if (chave === 'classe') elemento.className = valor;
            else if (chave === 'dataset') Object.assign(elemento.dataset, valor);
            else if (chave.startsWith('on') && typeof valor === 'function') elemento.addEventListener(chave.slice(2), valor);
            else if (valor === true) elemento.setAttribute(chave, '');
            else elemento.setAttribute(chave, valor);
        }
        for (const filho of [].concat(filhos)) {
            if (filho == null) continue;
            elemento.append(filho);
        }
        return elemento;
    }

    function icone(caminhos) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('class', 'nav-icone');
        svg.innerHTML = caminhos;
        return svg;
    }

    const ICONES = {
        receita: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
        despesa: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
        transferencia: '<path d="M3 8h15"/><path d="m14 4 4 4-4 4"/><path d="M21 16H6"/><path d="m10 12-4 4 4 4"/>',
        meta: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
        orcamento: '<rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18"/><path d="M15 15h3"/>',
        categoria: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>'
    };

    function toast(mensagem, tipo = 'sucesso') {
        if (toastAtual) toastAtual.remove();
        clearTimeout(temporizadorToast);
        toastAtual = el('div', { classe: `toast ${tipo === 'erro' ? 'erro' : ''}`, role: 'status', texto: mensagem });
        document.body.appendChild(toastAtual);
        temporizadorToast = setTimeout(() => {
            toastAtual?.remove();
            toastAtual = null;
        }, 4000);
    }

    // ---------------------------------------------------------------- modal
    function fechar() {
        if (!modalAtual) return;
        const { fundo, focoAnterior, aoFechar } = modalAtual;
        fundo.remove();
        modalAtual = null;
        document.body.classList.remove('modal-aberto');
        if (focoAnterior?.isConnected) focoAnterior.focus({ preventScroll: true });
        aoFechar?.();
    }

    function criarModal({ titulo, descricao, compacto = false, aoFechar } = {}) {
        fechar();
        const focoAnterior = document.activeElement;
        const idTitulo = `modal-titulo-${Date.now()}`;
        const botaoFechar = el('button', { type: 'button', classe: 'modal-fechar', 'aria-label': 'Fechar', texto: '✕', onclick: fechar });
        const cabecalho = el('div', { classe: 'modal-topo' }, [
            el('div', {}, [el('h2', { id: idTitulo, texto: titulo }), descricao ? el('p', { texto: descricao }) : null]),
            botaoFechar
        ]);
        const caixa = el('div', { classe: `modal ${compacto ? 'compacto' : ''}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': idTitulo }, [cabecalho]);
        const fundo = el('div', { classe: 'modal-fundo' }, [caixa]);
        fundo.addEventListener('pointerdown', evento => {
            if (evento.target === fundo) fechar();
        });
        caixa.addEventListener('keydown', evento => {
            if (evento.key === 'Escape') {
                evento.preventDefault();
                fechar();
            } else if (evento.key === 'Tab') {
                const focaveis = Array.from(caixa.querySelectorAll('button, [href], input, select, textarea, summary, [tabindex]:not([tabindex="-1"])'))
                    .filter(campo => !campo.disabled && campo.getClientRects().length);
                if (!focaveis.length) return;
                const primeiro = focaveis[0];
                const ultimo = focaveis[focaveis.length - 1];
                if (evento.shiftKey && document.activeElement === primeiro) {
                    evento.preventDefault();
                    ultimo.focus();
                } else if (!evento.shiftKey && document.activeElement === ultimo) {
                    evento.preventDefault();
                    primeiro.focus();
                }
            }
        });
        document.body.appendChild(fundo);
        document.body.classList.add('modal-aberto');
        modalAtual = { fundo, caixa, focoAnterior, aoFechar };
        return caixa;
    }

    // ---------------------------------------------------------------- campos
    function campo({ id, rotulo, tipo = 'text', opcoes = [], valor = '', obrigatorio = false, placeholder, atributos = {}, dica }) {
        let controle;
        if (tipo === 'select') {
            controle = el('select', { id, name: id });
            for (const opcao of opcoes) {
                const item = new Option(opcao.texto, opcao.valor);
                if (opcao.desabilitada) item.disabled = true;
                controle.add(item);
            }
            controle.value = valor;
            if (controle.selectedIndex === -1 && controle.options.length) controle.selectedIndex = 0;
        } else if (tipo === 'textarea') {
            controle = el('textarea', { id, name: id, rows: 2, placeholder });
            controle.value = valor;
        } else {
            controle = el('input', { id, name: id, type: tipo, placeholder, ...atributos });
            controle.value = valor;
        }
        if (obrigatorio) controle.required = true;
        controle.setAttribute('aria-describedby', `erro-${id}`);
        const envoltorio = el('div', { classe: 'input-dados' }, [
            el('label', { for: id, texto: rotulo }),
            tipo === 'valor' ? el('div', { classe: 'campo-valor' }, [controle]) : controle,
            dica ? el('p', { classe: 'texto-auxiliar', texto: dica }) : null,
            el('div', { id: `erro-${id}`, classe: 'erro-campo', 'aria-live': 'polite' })
        ]);
        return envoltorio;
    }

    function campoValor(id, rotulo, obrigatorio = true) {
        const envoltorio = campo({ id, rotulo, tipo: 'number', obrigatorio, placeholder: '0,00', atributos: { min: '0.01', step: '0.01', inputmode: 'decimal' } });
        const controle = envoltorio.querySelector('input');
        const moldura = el('div', { classe: 'campo-valor' });
        controle.replaceWith(moldura);
        moldura.appendChild(controle);
        return envoltorio;
    }

    function mostrarErroCampo(form, nomeCampo, mensagem) {
        const alvo = form.querySelector(`#erro-${CSS.escape(nomeCampo)}`);
        const controle = form.querySelector(`[name="${CSS.escape(nomeCampo)}"]`);
        if (!alvo) return false;
        alvo.replaceChildren();
        if (mensagem) {
            alvo.appendChild(el('h5', { texto: mensagem }));
            controle?.setAttribute('aria-invalid', 'true');
        } else {
            controle?.removeAttribute('aria-invalid');
        }
        return true;
    }

    function limparErros(form) {
        form.querySelectorAll('.erro-campo').forEach(elemento => elemento.replaceChildren());
        form.querySelectorAll('[aria-invalid]').forEach(elemento => elemento.removeAttribute('aria-invalid'));
        form.querySelector('.erro-geral')?.remove();
    }

    function mostrarErroGeral(form, mensagem) {
        form.querySelector('.erro-geral')?.remove();
        const aviso = el('p', { classe: 'erro-geral', role: 'alert', texto: mensagem });
        form.querySelector('.acoes-formulario').before(aviso);
    }

    function lerNumero(texto) {
        const limpo = String(texto).trim().replace(',', '.');
        if (!/^[+-]?(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(limpo)) return null;
        const numero = Number(limpo);
        return Number.isFinite(numero) ? numero : null;
    }

    // Envia o formulário e distribui as mensagens de erro da API pelos campos.
    async function enviar(form, { rota, metodo = 'POST', payload, sucesso, botao }) {
        limparErros(form);
        const rotuloOriginal = botao.textContent;
        botao.disabled = true;
        botao.textContent = 'Salvando…';
        form.querySelectorAll('input, select, textarea, button').forEach(campo => { campo.dataset.estava = campo.disabled ? '1' : ''; campo.disabled = true; });
        try {
            const resposta = await fetch(rota, {
                method: metodo, credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            let dados = {};
            try { dados = await resposta.json(); } catch { dados = {}; }
            if (resposta.ok) {
                fechar();
                toast(dados.mensagem || 'Operação concluída com sucesso.');
                sucesso?.(dados);
                return true;
            }
            if (resposta.status === 401) {
                toast(dados.mensagem || 'Sessão expirada. Entre novamente.', 'erro');
                fechar();
                config.aoSessaoExpirar();
                return false;
            }
            if (Array.isArray(dados.erros) && dados.erros.length) {
                const gerais = [];
                for (const erro of dados.erros) {
                    const nome = String(erro.campo ?? '').split('.')[0];
                    if (!mostrarErroCampo(form, nome, erro.mensagem)) gerais.push(erro.mensagem);
                }
                if (gerais.length) mostrarErroGeral(form, gerais.join(' '));
                else form.querySelector('[aria-invalid="true"]')?.focus();
            } else {
                mostrarErroGeral(form, dados.mensagem || dados.erro || `Não foi possível concluir a operação (HTTP ${resposta.status}).`);
            }
            return false;
        } catch {
            mostrarErroGeral(form, 'Não foi possível conectar ao servidor. Verifique a conexão e tente novamente.');
            return false;
        } finally {
            if (modalAtual?.caixa.contains(form)) {
                form.querySelectorAll('input, select, textarea, button').forEach(campo => { campo.disabled = campo.dataset.estava === '1'; delete campo.dataset.estava; });
                botao.disabled = false;
                botao.textContent = rotuloOriginal;
            }
        }
    }

    function opcoesContas(incluirVazio) {
        const contas = config.contas().filter(conta => !conta.status_conta || conta.status_conta === 'Ativo');
        const lista = contas.map(conta => ({ valor: String(conta.id_conta), texto: conta.nome_conta }));
        if (incluirVazio) lista.unshift({ valor: '', texto: incluirVazio });
        return lista;
    }

    function opcoesCategorias(incluirVazio) {
        const lista = config.categorias().map(categoria => ({ valor: String(categoria.id_categoria), texto: categoria.nome }));
        if (incluirVazio) lista.unshift({ valor: '', texto: incluirVazio });
        return lista;
    }

    function botoesFormulario(rotulo) {
        const botaoEnviar = el('button', { type: 'submit', classe: 'btn-primary', texto: rotulo });
        const acoes = el('div', { classe: 'acoes-formulario' }, [
            el('button', { type: 'button', classe: 'btn-fantasma', texto: 'Cancelar', onclick: fechar }),
            botaoEnviar
        ]);
        return { acoes, botaoEnviar };
    }

    // ---------------------------------------------------------------- transação
    function abrirTransacao(tipoInicial = 'Saida') {
        const contas = opcoesContas();
        const categorias = opcoesCategorias('Selecione a categoria');
        const metas = config.metas().filter(meta => meta.status !== 'Finalizado');
        const caixa = criarModal({ titulo: 'Nova transação', descricao: 'Lançamento avulso. Parcelado ou periódico? Use o formulário completo.' });
        const form = el('form', { novalidate: true });

        const seletor = el('div', { classe: 'seletor-tipo', role: 'radiogroup', 'aria-label': 'Tipo da transação' });
        for (const [valor, texto] of [['Entrada', 'Receita'], ['Saida', 'Despesa'], ['Transferencia', 'Transferência']]) {
            const entrada = el('input', { type: 'radio', name: 'tipo_transacao', value: valor });
            entrada.checked = valor === tipoInicial;
            seletor.appendChild(el('label', {}, [entrada, el('span', { texto })]));
        }

        const nome = campo({ id: 'nome', rotulo: 'Descrição', obrigatorio: true, placeholder: 'Ex.: Supermercado' });
        const valor = campoValor('valor_transacao', 'Valor');
        const contaOrigem = campo({ id: 'id_conta_origem', rotulo: 'Conta', tipo: 'select', opcoes: [{ valor: '', texto: contas.length ? 'Selecione a conta' : 'Nenhuma conta cadastrada' }, ...contas], obrigatorio: true });
        const contaDestino = campo({ id: 'id_conta_destino', rotulo: 'Conta de destino', tipo: 'select', opcoes: [{ valor: '', texto: 'Selecione a conta de destino' }, ...contas], obrigatorio: true });
        const categoria = campo({ id: 'id_categoria', rotulo: 'Categoria', tipo: 'select', opcoes: categorias.length > 1 ? categorias : [{ valor: '', texto: 'Nenhuma categoria cadastrada' }], obrigatorio: true });
        const forma = campo({ id: 'forma_pagamento', rotulo: 'Forma de pagamento', tipo: 'select', valor: 'PIX', opcoes: [
            { valor: 'PIX', texto: 'PIX' }, { valor: 'débito', texto: 'Débito' }, { valor: 'crédito', texto: 'Crédito' },
            { valor: 'boleto', texto: 'Boleto' }, { valor: 'dinheiro', texto: 'Dinheiro' }
        ], obrigatorio: true });
        const data = campo({ id: 'data_transacao', rotulo: 'Data', tipo: 'date', valor: config.hoje(), obrigatorio: true });
        const situacao = campo({ id: 'status_transacao', rotulo: 'Situação', tipo: 'select', valor: 'Pago', opcoes: [
            { valor: 'Pago', texto: 'Pago (já efetivado)' }, { valor: 'Pendente', texto: 'Pendente (a pagar/receber)' }
        ] });
        const vencimento = campo({ id: 'data_vencimento', rotulo: 'Vencimento (opcional)', tipo: 'date' });
        const meta = campo({ id: 'id_meta', rotulo: 'Vincular a uma meta (opcional)', tipo: 'select', opcoes: [
            { valor: '', texto: metas.length ? 'Sem meta' : 'Nenhuma meta em andamento' },
            ...metas.map(item => ({ valor: String(item.id_meta), texto: item.nome }))
        ] });
        const destino = campo({ id: 'destino', rotulo: 'Favorecido / origem (opcional)', placeholder: 'Ex.: Mercado Bom Preço' });
        const descricao = campo({ id: 'descricao', rotulo: 'Observações (opcional)', tipo: 'textarea' });

        const linkCompleto = el('a', { classe: 'link-avancado', href: '/tela-principal/criar-transacao', texto: 'Abrir formulário completo (parcelado, periódico)' });
        const avisoContas = el('p', { classe: 'texto-auxiliar', hidden: true }, [
            'Cadastre uma conta financeira antes de lançar transações. ',
            el('a', { href: '/tela-principal/criar-conta', texto: 'Criar conta' })
        ]);
        const avisoCategorias = el('p', { classe: 'texto-auxiliar', hidden: true }, [
            'Receitas e despesas precisam de uma categoria. ',
            el('button', { type: 'button', classe: 'btn-fantasma', texto: 'Criar categoria', onclick: () => abrirCategoria() })
        ]);
        const { acoes, botaoEnviar } = botoesFormulario('Salvar transação');

        form.append(seletor, nome, el('div', { classe: 'campos-lado-a-lado' }, [valor, data]),
            el('div', { classe: 'campos-lado-a-lado' }, [contaOrigem, contaDestino, categoria]), avisoContas, avisoCategorias,
            el('div', { classe: 'campos-lado-a-lado' }, [forma, situacao]), vencimento,
            el('details', {}, [el('summary', { texto: 'Mais detalhes' }), el('div', {}, [meta, destino, descricao])]),
            linkCompleto, acoes);
        caixa.appendChild(form);

        const tipoAtual = () => form.querySelector('input[name="tipo_transacao"]:checked').value;
        function atualizarCampos() {
            const tipo = tipoAtual();
            const transferencia = tipo === 'Transferencia';
            contaOrigem.querySelector('label').textContent = tipo === 'Entrada' ? 'Conta de recebimento' : transferencia ? 'Conta de origem' : 'Conta';
            contaDestino.hidden = !transferencia;
            contaDestino.querySelector('select').disabled = !transferencia;
            categoria.hidden = transferencia;
            categoria.querySelector('select').disabled = transferencia;
            meta.querySelector('select').disabled = transferencia;
            const selectOrigem = contaOrigem.querySelector('select');
            const selectDestino = contaDestino.querySelector('select');
            Array.from(selectDestino.options).forEach(opcao => { opcao.disabled = opcao.value !== '' && opcao.value === selectOrigem.value; });
            if (selectDestino.value && selectDestino.value === selectOrigem.value) selectDestino.value = '';
            vencimento.hidden = situacao.querySelector('select').value !== 'Pendente';
            avisoContas.hidden = contas.length > 0;
            avisoCategorias.hidden = transferencia || categorias.length > 1;
            botaoEnviar.disabled = contas.length === 0 || (transferencia ? contas.length < 2 : categorias.length <= 1);
            nome.querySelector('input').placeholder = tipo === 'Entrada' ? 'Ex.: Salário' : transferencia ? 'Ex.: Transferência para poupança' : 'Ex.: Supermercado';
        }
        form.addEventListener('change', atualizarCampos);
        form.addEventListener('input', evento => {
            const nomeCampo = evento.target.name;
            if (nomeCampo) mostrarErroCampo(form, nomeCampo, '');
        });
        atualizarCampos();

        form.addEventListener('submit', async evento => {
            evento.preventDefault();
            limparErros(form);
            const tipo = tipoAtual();
            const transferencia = tipo === 'Transferencia';
            const valores = Object.fromEntries(new FormData(form).entries());
            let valido = true;
            const exigir = (nomeCampo, mensagem) => {
                if (!String(valores[nomeCampo] ?? '').trim()) {
                    mostrarErroCampo(form, nomeCampo, mensagem);
                    valido = false;
                }
            };
            exigir('nome', 'Informe uma descrição.');
            exigir('id_conta_origem', 'Selecione a conta.');
            if (transferencia) exigir('id_conta_destino', 'Selecione a conta de destino.');
            else exigir('id_categoria', 'Selecione a categoria.');
            exigir('data_transacao', 'Informe a data.');
            const numero = lerNumero(valores.valor_transacao ?? '');
            if (numero === null || numero <= 0) {
                mostrarErroCampo(form, 'valor_transacao', 'Informe um valor maior que zero, com até duas casas decimais.');
                valido = false;
            }
            if (!valido) {
                form.querySelector('[aria-invalid="true"]')?.focus();
                return;
            }
            const pago = valores.status_transacao === 'Pago';
            const payload = {
                id_conta_origem: Number(valores.id_conta_origem),
                id_conta_destino: transferencia ? Number(valores.id_conta_destino) : null,
                id_categoria: transferencia ? null : Number(valores.id_categoria),
                tipo_transacao: tipo,
                nome: valores.nome.trim(),
                forma_pagamento: valores.forma_pagamento,
                valor_transacao: numero,
                status_transacao: valores.status_transacao,
                data_transacao: valores.data_transacao,
                data_vencimento: valores.data_vencimento || null,
                data_pagamento: pago ? valores.data_transacao : null
            };
            if (!transferencia && valores.id_meta) payload.id_meta = Number(valores.id_meta);
            if (valores.destino?.trim()) payload.destino = valores.destino.trim();
            if (valores.descricao?.trim()) payload.descricao = valores.descricao.trim();
            await enviar(form, { rota: '/usuario/criar-transacao', payload, botao: botaoEnviar, sucesso: () => config.aoConcluir('transacao') });
        });
        form.querySelector('#nome').focus();
    }

    // ---------------------------------------------------------------- categoria
    function abrirCategoria() {
        const caixa = criarModal({ titulo: 'Nova categoria', descricao: 'Categorias organizam receitas, despesas e orçamentos.', compacto: true });
        const form = el('form', { novalidate: true });
        const nome = campo({ id: 'nome', rotulo: 'Nome', obrigatorio: true, placeholder: 'Ex.: Alimentação', atributos: { minlength: 3, maxlength: 100 } });
        const descricao = campo({ id: 'descricao', rotulo: 'Descrição (opcional)', placeholder: 'Ex.: Compras do mês', atributos: { maxlength: 100 } });
        const { acoes, botaoEnviar } = botoesFormulario('Criar categoria');
        form.append(nome, descricao, acoes);
        caixa.appendChild(form);
        form.addEventListener('input', evento => evento.target.name && mostrarErroCampo(form, evento.target.name, ''));
        form.addEventListener('submit', async evento => {
            evento.preventDefault();
            limparErros(form);
            const valores = Object.fromEntries(new FormData(form).entries());
            const texto = valores.nome.trim();
            if (texto.length < 3) {
                mostrarErroCampo(form, 'nome', 'O nome deve possuir pelo menos 3 caracteres.');
                form.querySelector('#nome').focus();
                return;
            }
            const descricaoTexto = valores.descricao.trim();
            if (descricaoTexto && descricaoTexto.length < 3) {
                mostrarErroCampo(form, 'descricao', 'A descrição deve possuir pelo menos 3 caracteres.');
                return;
            }
            await enviar(form, { rota: '/usuario/criar-categoria', payload: { nome: texto, descricao: descricaoTexto }, botao: botaoEnviar, sucesso: () => config.aoConcluir('categoria') });
        });
        form.querySelector('#nome').focus();
    }

    // ---------------------------------------------------------------- meta
    function abrirMeta() {
        const contas = opcoesContas();
        const caixa = criarModal({ titulo: 'Nova meta', descricao: 'O progresso é calculado pelas transações pagas vinculadas à meta.', compacto: true });
        const form = el('form', { novalidate: true });
        const conta = campo({ id: 'id_conta', rotulo: 'Conta bancária', tipo: 'select', opcoes: [{ valor: '', texto: contas.length ? 'Selecione a conta' : 'Nenhuma conta cadastrada' }, ...contas], obrigatorio: true });
        const nome = campo({ id: 'nome', rotulo: 'Nome', obrigatorio: true, placeholder: 'Ex.: Reserva de emergência' });
        const valor = campoValor('valor_meta', 'Valor objetivo');
        const data = campo({ id: 'data_meta', rotulo: 'Data limite (opcional)', tipo: 'date' });
        const descricao = campo({ id: 'descricao', rotulo: 'Descrição (opcional)', tipo: 'textarea' });
        const { acoes, botaoEnviar } = botoesFormulario('Criar meta');
        botaoEnviar.disabled = contas.length === 0;
        form.append(conta, nome, el('div', { classe: 'campos-lado-a-lado' }, [valor, data]), descricao, acoes);
        if (!contas.length) form.append(el('p', { classe: 'texto-auxiliar' }, ['Cadastre uma conta antes de criar metas. ', el('a', { href: '/tela-principal/criar-conta', texto: 'Criar conta' })]));
        caixa.appendChild(form);
        form.addEventListener('input', evento => evento.target.name && mostrarErroCampo(form, evento.target.name, ''));
        form.addEventListener('submit', async evento => {
            evento.preventDefault();
            limparErros(form);
            const valores = Object.fromEntries(new FormData(form).entries());
            let valido = true;
            if (!valores.id_conta) { mostrarErroCampo(form, 'id_conta', 'Selecione a conta.'); valido = false; }
            if (!valores.nome.trim()) { mostrarErroCampo(form, 'nome', 'Informe o nome da meta.'); valido = false; }
            const numero = lerNumero(valores.valor_meta);
            if (numero === null || numero <= 0) { mostrarErroCampo(form, 'valor_meta', 'Informe um valor maior que zero, com até duas casas decimais.'); valido = false; }
            if (!valido) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
            const payload = { id_conta: Number(valores.id_conta), nome: valores.nome.trim(), valor_meta: numero, data_meta: valores.data_meta || null };
            if (valores.descricao.trim()) payload.descricao = valores.descricao.trim();
            await enviar(form, { rota: '/usuario/criar-meta', payload, botao: botaoEnviar, sucesso: () => config.aoConcluir('meta') });
        });
        (contas.length ? form.querySelector('#id_conta') : botaoEnviar).focus();
    }

    // ---------------------------------------------------------------- orçamento
    function iniciosPeriodo(tipo) {
        const atual = new Date(`${config.hoje()}T00:00:00.000Z`);
        if (tipo === 'Semanal') atual.setUTCDate(atual.getUTCDate() - atual.getUTCDay());
        else if (tipo === 'Mensal') atual.setUTCDate(1);
        else if (tipo === 'Anual') atual.setUTCMonth(0, 1);
        const proximo = new Date(atual);
        if (tipo === 'Semanal') proximo.setUTCDate(proximo.getUTCDate() + 7);
        else if (tipo === 'Mensal') proximo.setUTCMonth(proximo.getUTCMonth() + 1);
        else if (tipo === 'Anual') proximo.setUTCFullYear(proximo.getUTCFullYear() + 1);
        return { atual: atual.toISOString().slice(0, 10), proximo: proximo.toISOString().slice(0, 10) };
    }

    function abrirOrcamento() {
        const contas = opcoesContas('Todas as contas');
        const categorias = opcoesCategorias('Todas as categorias');
        const caixa = criarModal({ titulo: 'Novo orçamento', descricao: 'Defina um limite de gastos por categoria, por conta ou por ambas. A data final é calculada automaticamente.' });
        const form = el('form', { novalidate: true });
        const nome = campo({ id: 'nome', rotulo: 'Nome (opcional)', placeholder: 'Ex.: Mercado do mês', atributos: { maxlength: 100 },
            dica: 'Em branco, o nome é gerado a partir da conta, da categoria e do período.' });
        const categoria = campo({ id: 'id_categoria', rotulo: 'Categoria', tipo: 'select', opcoes: categorias });
        const conta = campo({ id: 'id_conta', rotulo: 'Conta bancária', tipo: 'select', opcoes: contas });
        const valor = campoValor('valor_orcamento', 'Limite do período');
        const tipo = campo({ id: 'tipo_periodo', rotulo: 'Tipo de período', tipo: 'select', valor: 'Mensal', opcoes: [
            { valor: 'Semanal', texto: 'Semanal (começa no domingo)' }, { valor: 'Mensal', texto: 'Mensal' }, { valor: 'Anual', texto: 'Anual' }
        ], obrigatorio: true });
        const inicio = campo({ id: 'periodo_inicio', rotulo: 'Início do período', tipo: 'select', opcoes: [] });
        const descricao = campo({ id: 'descricao', rotulo: 'Descrição (opcional)', tipo: 'textarea' });
        const { acoes, botaoEnviar } = botoesFormulario('Criar orçamento');
        form.append(nome, el('div', { classe: 'campos-lado-a-lado' }, [categoria, conta]),
            el('p', { classe: 'texto-auxiliar', texto: 'Selecione uma categoria, uma conta ou ambas.' }),
            el('div', { classe: 'campos-lado-a-lado' }, [valor, tipo]), inicio, descricao, acoes);
        caixa.appendChild(form);

        function preencherInicios() {
            const select = inicio.querySelector('select');
            const { atual, proximo } = iniciosPeriodo(tipo.querySelector('select').value);
            select.replaceChildren();
            select.add(new Option(`Período atual (a partir de ${formatarData(atual)})`, atual));
            select.add(new Option(`Próximo período (a partir de ${formatarData(proximo)})`, proximo));
        }
        tipo.querySelector('select').addEventListener('change', preencherInicios);
        preencherInicios();
        form.addEventListener('input', evento => evento.target.name && mostrarErroCampo(form, evento.target.name, ''));
        form.addEventListener('submit', async evento => {
            evento.preventDefault();
            limparErros(form);
            const valores = Object.fromEntries(new FormData(form).entries());
            let valido = true;
            if (!valores.id_categoria && !valores.id_conta) {
                mostrarErroCampo(form, 'id_categoria', 'Informe uma categoria, uma conta ou ambas.');
                valido = false;
            }
            const numero = lerNumero(valores.valor_orcamento);
            if (numero === null || numero <= 0) { mostrarErroCampo(form, 'valor_orcamento', 'Informe um limite maior que zero, com até duas casas decimais.'); valido = false; }
            if (!valido) { form.querySelector('[aria-invalid="true"]')?.focus(); return; }
            const payload = {
                id_categoria: valores.id_categoria ? Number(valores.id_categoria) : null,
                id_conta: valores.id_conta ? Number(valores.id_conta) : null,
                valor_orcamento: numero,
                tipo_periodo: valores.tipo_periodo,
                periodo_inicio: valores.periodo_inicio
            };
            if (valores.descricao.trim()) payload.descricao = valores.descricao.trim();
            if (valores.nome.trim()) payload.nome = valores.nome.trim();
            await enviar(form, { rota: '/usuario/criar-orcamento', payload, botao: botaoEnviar, sucesso: () => config.aoConcluir('orcamento') });
        });
        form.querySelector('#nome').focus();
    }

    // ---------------------------------------------------------------- menu e confirmação
    function abrirMenu() {
        const caixa = criarModal({ titulo: 'O que você quer registrar?', compacto: true });
        const itens = [
            ['receita', 'Receita', 'Salário, vendas, rendimentos'],
            ['despesa', 'Despesa', 'Compras, contas, serviços'],
            ['transferencia', 'Transferência', 'Entre suas contas'],
            ['meta', 'Meta', 'Objetivo de economia'],
            ['orcamento', 'Orçamento', 'Limite de gastos'],
            ['categoria', 'Categoria', 'Organize seus lançamentos']
        ];
        const lista = el('ul', { classe: 'menu-acoes' });
        for (const [acao, titulo, descricao] of itens) {
            lista.appendChild(el('li', {}, [
                el('button', { type: 'button', onclick: () => abrir(acao) }, [
                    el('span', { classe: `kpi-icone ${acao === 'receita' ? 'kpi-entrada' : ''}` }, [icone(ICONES[acao])]),
                    el('span', { texto: titulo }), el('small', { texto: descricao })
                ])
            ]));
        }
        caixa.appendChild(lista);
        caixa.appendChild(el('a', { classe: 'link-avancado', href: '/tela-principal/criar-transacao', texto: 'Formulário completo de transação (parcelado, periódico)' }));
        lista.querySelector('button').focus();
    }

    function confirmar({ titulo, mensagem, rotuloConfirmar = 'Confirmar', perigo = false }) {
        return new Promise(resolve => {
            let decidido = false;
            const caixa = criarModal({ titulo, compacto: true, aoFechar: () => { if (!decidido) resolve(false); } });
            const botaoConfirmar = el('button', { type: 'button', classe: perigo ? 'botao-excluir' : 'btn-primary', texto: rotuloConfirmar, onclick: () => { decidido = true; fechar(); resolve(true); } });
            caixa.append(
                el('p', { classe: 'texto-auxiliar', texto: mensagem }),
                el('div', { classe: 'acoes-formulario' }, [
                    el('button', { type: 'button', classe: 'btn-fantasma', texto: 'Cancelar', onclick: fechar }),
                    botaoConfirmar
                ])
            );
            botaoConfirmar.focus();
        });
    }

    function abrir(acao) {
        switch (acao) {
            case 'receita': return abrirTransacao('Entrada');
            case 'despesa': return abrirTransacao('Saida');
            case 'transferencia': return abrirTransacao('Transferencia');
            case 'transacao': return abrirTransacao('Saida');
            case 'categoria': return abrirCategoria();
            case 'meta': return abrirMeta();
            case 'orcamento': return abrirOrcamento();
            case 'menu': return abrirMenu();
            default: return undefined;
        }
    }

    return { configurar, abrir, abrirMenu, confirmar, fechar, toast, formatarValor, formatarData };
})();
