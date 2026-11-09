import '../helpers/ambiente-local.js';
import { before, after, test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cookieParser from 'cookie-parser';
import paginas from '../../src/routes/pageRoutes.js';
import autenticacao from '../../src/routes/authRoutes.js';
import orcamentos from '../../src/routes/orcamentosRoutes.js';
import supabase from '../../src/config/supabase.js';
import { gerarToken } from '../../src/rf-002-Login/Autenticacao.js';
import { abrirNavegador } from '../helpers/navegador.js';

// Páginas, autenticação, Joi e controller da RF-008 reais; banco, contas e saldo simulados.
// Nenhuma conexão com o Supabase. O relógio do navegador cruza a meia-noite UTC.
const app = express();
app.use(express.json());
app.use(cookieParser());
let servidor, navegador, origem;
let registros = [];
let falha = null;
let atrasoSessao = 0;
let atrasoOrcamentos = 0;
let atrasoSaldo = 0;
let falhaSaldo = false;
const chamadas = [];
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

app.use(async (req, res, next) => {
    chamadas.push({ caminho: req.path, metodo: req.method, query: { ...req.query }, cookie: req.cookies.token });
    if (req.path === '/me') await esperar(atrasoSessao);
    if (req.path === '/usuario/listar-orcamentos') {
        await esperar(atrasoOrcamentos);
        if (falha === 'rede') return req.socket.destroy();
        if (falha === 'formato') return res.json({ mensagem: 'Resposta inesperada' });
        if (falha) return res.status(falha).json({ mensagem: 'Falha simulada' });
    }
    next();
});
app.get('/usuario/listar-contas', (req, res) => res.json([
    { id_conta: 11, nome_conta: 'Conta principal' }, { id_conta: 12, nome_conta: 'Poupança' }
]));
app.get('/usuario/verificar-saldo', async (req, res) => {
    await esperar(atrasoSaldo);
    if (falhaSaldo) return res.status(500).json({ mensagem: 'Saldo indisponível' });
    let saldo = 1234.56;
    if (req.query.id_conta === '12') saldo = 789;
    res.json({ saldo });
});
app.get('/usuario/listar-categoria', (req, res) => res.json([{ id_categoria: 21, nome: 'Alimentação' }]));
app.use(autenticacao);
app.use('/usuario', orcamentos);
app.use(paginas);
for (const pasta of ['rf-002-Login/public', 'rf-003-Cadastro_usuario/public', 'img']) {
    app.use(express.static(fileURLToPath(new URL(`../../src/${pasta}/`, import.meta.url))));
}

function criarRegistros() {
    const valores = ['399.99', 400, '400.01', 500, '500.01'];
    const dados = valores.map((valor, indice) => ({
        id_orcamento: 71 + indice, id_usuario: 900, id_conta: 11, id_categoria: 21,
        nome: `Orçamento ${indice + 1}`, descricao: '', tipo_periodo: 'Mensal',
        valor_atual: valor, valor_orcamento: '500.00',
        periodo_inicio: '2028-01-01', periodo_fim: '2028-01-31'
    }));
    dados[0].nome = '<img src=x onerror=alert(1)> Alimentação';
    dados[1].tipo_periodo = 'Semanal';
    dados[1].periodo_inicio = '2027-12-26';
    dados[1].periodo_fim = '2028-01-01';
    return dados.concat([
        { ...dados[0], id_orcamento: 81, nome: 'Terminou ontem', periodo_inicio: '2027-12-01', periodo_fim: '2027-12-31' },
        { ...dados[0], id_orcamento: 82, nome: 'Começa amanhã', periodo_inicio: '2028-01-02', periodo_fim: '2028-01-08' },
        { ...dados[0], id_orcamento: 83, id_usuario: 901, nome: 'Outro proprietário' }
    ]);
}

async function avaliar(expression) {
    const resposta = await navegador.enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    assert.equal(resposta.exceptionDetails, undefined, JSON.stringify(resposta.exceptionDetails));
    return resposta.result.value;
}
async function ate(expression) {
    for (let tentativa = 0; tentativa < 200; tentativa++) {
        if (await avaliar(expression)) return;
        await esperar(25);
    }
    assert.fail(`Tempo esgotado: ${expression}`);
}
async function abrir(opcoes = {}) {
    // Encerra a página anterior antes de registrar as chamadas do próximo cenário.
    await navegador.enviar('Page.navigate', { url: 'about:blank' });
    await ate("location.href === 'about:blank' && document.readyState === 'complete'");
    registros = criarRegistros();
    falha = opcoes.falha ?? null;
    atrasoSessao = opcoes.atrasoSessao ?? 0;
    atrasoOrcamentos = opcoes.atrasoOrcamentos ?? 0;
    atrasoSaldo = opcoes.atrasoSaldo ?? 0;
    falhaSaldo = opcoes.falhaSaldo ?? false;
    chamadas.length = 0;
    await navegador.enviar('Network.setCookie', {
        name: 'token', value: gerarToken({ id_usuario: opcoes.usuario ?? 900, tipo: 'Comum' }), url: origem
    });
    await navegador.enviar('Page.navigate', { url: origem + '/tela-principal' });
    await ate("document.readyState === 'complete' && !!document.getElementById('corpo-orcamentos')");
}
async function linhasProntas() {
    await ate("document.querySelectorAll('#corpo-orcamentos button').length === 5");
}

before(async () => {
    mock.method(supabase, 'from', tabela => {
        assert.ok(['usuarios', 'orcamentos'].includes(tabela), `Tabela inesperada: ${tabela}`);
        let dados = registros;
        if (tabela === 'usuarios') dados = [900, 901].map(id_usuario => ({ id_usuario, nome: 'Pessoa teste', tipo: 'Comum', status_usuario: 'Ativo' }));
        const consulta = {
            select() { return consulta; },
            eq(campo, valor) { dados = dados.filter(item => String(item[campo]) === String(valor)); return consulta; },
            gte(campo, valor) { dados = dados.filter(item => item[campo] >= valor); return consulta; },
            lte(campo, valor) { dados = dados.filter(item => item[campo] <= valor); return consulta; },
            async single() { return { data: dados[0], error: null }; },
            then(resolve, reject) { return Promise.resolve({ data: dados, error: null }).then(resolve, reject); }
        };
        return consulta;
    });
    servidor = app.listen(0, '127.0.0.1');
    await new Promise(resolve => servidor.once('listening', resolve));
    origem = `http://127.0.0.1:${servidor.address().port}`;
    navegador = await abrirNavegador(origem);
    await navegador.enviar('Emulation.setTimezoneOverride', { timezoneId: 'Pacific/Auckland' });
    await navegador.enviar('Page.addScriptToEvaluateOnNewDocument', { source: `
        const DataReal = Date;
        window.Date = class extends DataReal {
            constructor(...args) {
                if (args.length === 0) super('2028-01-02T02:30:00Z');
                else super(...args);
            }
            static now() { return new DataReal('2028-01-02T02:30:00Z').getTime(); }
        };
    ` });
});
after(async () => {
    if (navegador) await navegador.fechar();
    if (servidor) {
        servidor.closeAllConnections();
        await new Promise(resolve => servidor.close(resolve));
    }
    mock.restoreAll();
});

test('Dashboard: sessão, fuso, períodos inclusivos, seis colunas e cores em todas as células', async () => {
    await abrir();
    await linhasProntas();
    assert.equal(await avaliar('document.title'), 'Dashboard — CashLand');
    const consulta = chamadas.find(item => item.caminho === '/usuario/listar-orcamentos');
    assert.deepEqual(consulta.query, { periodo_inicio: '2028-01-01', periodo_fim: '2028-01-01' });
    assert.ok(consulta.cookie);
    assert.deepEqual(await avaliar("Array.from(document.querySelectorAll('#tabela-orcamentos th'), item => item.textContent)"),
        ['Ver', 'Nome do orçamento', 'Valor atual', 'Valor do orçamento', 'Início do período', 'Fim do período']);
    const linhas = await avaliar(`Array.from(document.querySelectorAll('#corpo-orcamentos tr'), linha => ({
        textos: Array.from(linha.cells, coluna => coluna.textContent.replaceAll('\\u00a0', ' ')),
        cores: Array.from(linha.cells, coluna => getComputedStyle(coluna).backgroundColor)
    }))`);
    assert.deepEqual(linhas[0].textos, ['ver', registros[0].nome, 'R$ 399,99', 'R$ 500,00', '01/01/2028', '31/01/2028']);
    assert.equal(linhas[1].textos[5], '01/01/2028');
    const cores = ['rgb(217, 239, 223)', 'rgb(217, 239, 223)', 'rgb(255, 241, 189)', 'rgb(255, 241, 189)', 'rgb(248, 215, 218)'];
    for (let indice = 0; indice < 5; indice++) {
        assert.equal(linhas[indice].textos.length, 6);
        assert.deepEqual(linhas[indice].cores, Array(6).fill(cores[indice]));
    }
    assert.equal(await avaliar("document.querySelectorAll('#corpo-orcamentos img').length"), 0);
    for (const largura of [1280, 390, 320]) {
        await navegador.enviar('Emulation.setDeviceMetricsOverride', { width: largura, height: 900, deviceScaleFactor: 1, mobile: largura < 600 });
        assert.equal(await avaliar('document.documentElement.scrollWidth <= innerWidth'), true);
        const captura = await navegador.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
        writeFileSync(`/tmp/cashland-dashboard-${largura}.png`, Buffer.from(captura.data, 'base64'));
    }
    await abrir({ usuario: 901 });
    await ate("document.querySelectorAll('#corpo-orcamentos button').length === 1");
    assert.equal(await avaliar("document.querySelector('#corpo-orcamentos tr td:nth-child(2)').textContent"), 'Outro proprietário');
});

test('cada botão ver abre a edição existente com o orçamento correto', async () => {
    for (let indice = 0; indice < 5; indice++) {
        await abrir();
        await linhasProntas();
        await avaliar(`document.querySelectorAll('#corpo-orcamentos button')[${indice}].click()`);
        await ate(`location.pathname === '/tela-principal/editar-orcamento' && document.getElementById('id_orcamento')?.value === '${71 + indice}'`);
        assert.equal(await avaliar('location.search'), `?id_orcamento=${71 + indice}`);
        await ate("getComputedStyle(document.getElementById('loading-overlay')).display === 'none' && document.getElementById('saldo-usuario').textContent !== 'Carregando...'");
    }
});

test('aguarda sessão e carrega orçamentos independentemente de saldo lento ou indisponível', async () => {
    await abrir({ atrasoSessao: 600, atrasoSaldo: 1500, falhaSaldo: true });
    assert.equal(chamadas.some(item => item.caminho.startsWith('/usuario/')), false,
        JSON.stringify(chamadas.map(({ caminho, query }) => ({ caminho, query }))));
    await linhasProntas();
    assert.equal(await avaliar("document.getElementById('saldo-usuario').textContent"), 'Carregando...');
    await ate("document.getElementById('saldo-usuario').textContent === 'Indisponível'");
    assert.equal(await avaliar("document.querySelectorAll('#corpo-orcamentos button').length"), 5);
});

test('carregamento, lista vazia e falhas HTTP, de rede e de formato são distintos', async () => {
    await abrir({ atrasoOrcamentos: 700 });
    assert.match(await avaliar("document.getElementById('corpo-orcamentos').textContent"), /Carregando orçamentos atuais/);
    registros = [];
    await ate("document.getElementById('corpo-orcamentos').textContent === 'Nenhum orçamento atual.'");
    for (const erro of [500, 401, 429, 'rede', 'formato']) {
        await abrir({ falha: erro });
        await ate("document.getElementById('corpo-orcamentos').textContent.includes('Não foi possível consultar')");
        await ate("!document.getElementById('conta-saldo-usuario').disabled");
        assert.equal(await avaliar("getComputedStyle(document.getElementById('loading-overlay')).display"), 'none');
        assert.equal(await avaliar("getComputedStyle(document.getElementById('resultado-overlay')).display"), 'none');
    }
});

test('menu, seletor de saldo e logout continuam funcionando', async () => {
    await abrir();
    await linhasProntas();
    await ate("!document.getElementById('conta-saldo-usuario').disabled");
    await avaliar("document.getElementById('botao-saldo-usuario').click()");
    assert.equal(await avaliar("document.getElementById('lista-contas-saldo').hidden"), false);
    await avaliar("const seletor = document.getElementById('conta-saldo-usuario'); seletor.value = '12'; seletor.dispatchEvent(new Event('change', { bubbles: true }))");
    await ate("document.getElementById('saldo-usuario').textContent.includes('789,00')");
    assert.equal(await avaliar("document.getElementById('nome-conta-saldo').textContent"), 'Poupança');
    assert.equal(chamadas.filter(item => item.caminho === '/usuario/listar-orcamentos').length, 1);
    await avaliar("document.getElementById('botao-opcoes').click()");
    assert.equal(await avaliar("document.getElementById('lista-opcoes').hidden"), false);
    assert.equal(await avaliar("document.querySelectorAll('#lista-opcoes a[href=\"/tela-principal/listar-orcamentos\"]').length"), 1);
    await avaliar("document.querySelector('#lista-opcoes a[href=\"/tela-principal/listar-orcamentos\"]').click()");
    await ate("location.pathname === '/tela-principal/listar-orcamentos' && !!document.getElementById('form-listar-orcamentos')");
    await abrir();
    await linhasProntas();
    await avaliar("localStorage.setItem('tipo', 'Comum'); document.getElementById('meuForm-Logout').requestSubmit()");
    await ate("location.pathname === '/login' && document.readyState === 'complete'");
    assert.equal(await avaliar("localStorage.getItem('tipo')"), null);
    assert.ok(chamadas.some(item => item.caminho === '/logout' && item.metodo === 'POST' && item.cookie));
    const cookies = await navegador.enviar('Network.getCookies', { urls: [origem] });
    assert.equal(cookies.cookies.some(item => item.name === 'token'), false);
});

test('sem sessão não consulta orçamentos nem saldo', async () => {
    await navegador.enviar('Network.deleteCookies', { name: 'token', url: origem });
    chamadas.length = 0;
    await navegador.enviar('Page.navigate', { url: origem + '/tela-principal' });
    await ate("document.getElementById('resultado-funcao')?.textContent.includes('Não autenticado')");
    assert.equal(chamadas.some(item => item.caminho.startsWith('/usuario/')), false);
    assert.deepEqual(navegador.erros, []);
});
