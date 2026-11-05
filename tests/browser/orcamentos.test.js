import { before, after, test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import paginas from '../../src/routes/pageRoutes.js';
import * as schemas from '../../src/validacoes/usuario.js';
import { abrirNavegador } from '../helpers/navegador.js';

// HTML, rotas de página, recursos e schemas reais. APIs e dados são simulados;
// esta suíte não se conecta ao Supabase nem reproduz cálculos dos triggers.
const app = express();
app.use(express.json());
let navegador, servidor, origem;
let perfil = 'Comum';
let statusSessao = 200;
let registros = [];
let falha = null;
let atraso = 0;
const chamadas = [];
const recursosAusentes = [];
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));
const registroInicial = {
    id_orcamento: 71, id_usuario: 501, id_conta: 11, id_categoria: 21,
    nome: 'Conta principal — Alimentação — Mensal', descricao: 'Compras do mês',
    valor_atual: 0, valor_orcamento: 750.50, tipo_periodo: 'Mensal',
    periodo_inicio: '2020-01-01', periodo_fim: '2020-01-31',
    data_criacao: '2020-01-01T12:00:00Z', data_atualizacao: '2020-01-02T12:00:00Z'
};
app.get('/me', (req, res) => {
    res.status(statusSessao).json({ id_usuario: 900, nome: 'Pessoa teste', tipo: perfil, mensagem: 'Sessão indisponível' });
});
app.use(['/usuario', '/admin'], async (req, res) => {
    const caminho = req.baseUrl + req.path;
    chamadas.push({ caminho, metodo: req.method, query: { ...req.query }, body: req.body, cookie: req.headers.cookie });
    if (falha && falha.caminho === caminho && falha.metodo === req.method) {
        if (falha.rede) {
            req.socket.destroy();
            return;
        }
        res.status(falha.status).json(falha.body);
        return;
    }
    if (caminho.includes('verificar-saldo')) {
        res.json({ saldo: 0 });
        return;
    }
    if (caminho.endsWith('/listar-contas')) {
        res.json([{ id_conta: 11, nome_conta: 'Conta principal' }, { id_conta: 12, nome_conta: 'Poupança' }]);
        return;
    }
    if (caminho.endsWith('/listar-categoria')) {
        res.json([{ id_categoria: 21, nome: 'Alimentação' }, { id_categoria: 22, nome: 'Transporte' }]);
        return;
    }
    let schema, dados;
    if (req.method === 'GET') {
        schema = schemas.schemaListarOrcamentos;
        if (req.baseUrl === '/admin') schema = schemas.schemaADMIN_listarOrcamentos;
        dados = req.query;
    } else if (req.method === 'POST') {
        schema = schemas.schemaCriarOrcamento;
        dados = req.body;
    } else if (req.method === 'PATCH') {
        schema = schemas.schemaEditarOrcamento;
        if (req.baseUrl === '/admin') schema = schemas.schemaADMIN_editarOrcamento;
        dados = req.body;
    } else if (req.method === 'DELETE') {
        schema = schemas.schemaDeletarOrcamento;
        const partes = req.path.split('/');
        dados = { id_orcamento: partes[2] };
        if (req.baseUrl === '/admin') {
            schema = schemas.schemaADMIN_deletarOrcamento;
            dados = { id_usuario: partes[2], id_orcamento: partes[3] };
        }
    }
    assert(schema, `Endpoint inesperado: ${req.method} ${caminho}`);
    const validacao = schema.validate(dados, { abortEarly: false });
    if (validacao.error) {
        res.status(400).json({ mensagem: 'Dados inválidos.', erros: validacao.error.details.map(erro => ({ campo: erro.path.join('.'), mensagem: erro.message })) });
        return;
    }
    await esperar(atraso);
    if (req.method === 'GET') {
        let encontrados = registros;
        for (const campo of ['id_orcamento', 'id_usuario', 'id_conta', 'id_categoria', 'tipo_periodo']) {
            if (req.query[campo] !== undefined) encontrados = encontrados.filter(item => String(item[campo]) === req.query[campo]);
        }
        if (req.query.nome) encontrados = encontrados.filter(item => item.nome.includes(req.query.nome));
        res.json(encontrados);
    } else if (req.method === 'DELETE') {
        registros = registros.filter(item => item.id_orcamento !== Number(dados.id_orcamento));
        res.json({ mensagem: 'Orçamento excluído com sucesso.' });
    } else if (req.method === 'PATCH') {
        res.json({ mensagem: 'Orçamento atualizado com sucesso.' });
    } else {
        res.status(201).json({ mensagem: 'Orçamento criado com sucesso.' });
    }
});
app.get(['/login', '/tela-principal'], (req, res) => res.send('<html><head><link rel="icon" href="/CashLand%20emerald%20C%20icon.png"></head><body>Destino após redirecionamento</body></html>'));
app.use(paginas);
for (const pasta of ['rf-003-Cadastro_usuario/public', 'rf-002-Login/public', 'img']) {
    app.use(express.static(fileURLToPath(new URL(`../../src/${pasta}/`, import.meta.url))));
}
app.use((req, res) => {
    recursosAusentes.push(req.path);
    res.sendStatus(404);
});

async function avaliar(expression) {
    const resultado = await navegador.enviar('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (resultado.exceptionDetails) throw new Error(JSON.stringify(resultado.exceptionDetails));
    return resultado.result.value;
}
async function ate(expression) {
    for (let tentativa = 0; tentativa < 150; tentativa++) {
        if (await avaliar(expression)) return;
        await esperar(25);
    }
    throw new Error(`Tempo esgotado: ${expression}\n${navegador.erros.join('\n')}`);
}
async function abrir(caminho, admin = false, largura = 1280) {
    perfil = 'Comum';
    if (admin) perfil = 'Admin';
    statusSessao = 200;
    chamadas.length = 0;
    registros = [structuredClone(registroInicial)];
    falha = null;
    atraso = 0;
    await navegador.enviar('Emulation.setDeviceMetricsOverride', { width: largura, height: 900, deviceScaleFactor: 1, mobile: largura < 600 });
    await navegador.enviar('Page.navigate', { url: origem + caminho });
    await ate("document.readyState === 'complete' && !!document.querySelector('#container:not([hidden])') && getComputedStyle(document.getElementById('loading-overlay')).display === 'none'");
}
async function preencher(valores) {
    await avaliar(`(() => { const valores = ${JSON.stringify(valores)}; for (const [id, valor] of Object.entries(valores)) { const campo = document.getElementById(id); campo.value = valor; campo.dispatchEvent(new Event('input', { bubbles: true })); campo.dispatchEvent(new Event('change', { bubbles: true })); } })()`);
}
async function enviar() {
    await avaliar("document.querySelector('#meuForm, #form-editar-orcamento').requestSubmit()");
}
async function resultado(texto) {
    await ate(`getComputedStyle(document.getElementById('resultado-overlay')).display === 'flex' && document.getElementById('resultado-mensagem').textContent.includes(${JSON.stringify(texto)})`);
    await ate("getComputedStyle(document.getElementById('loading-overlay')).display === 'none'");
}
async function clicar(seletor) {
    await avaliar(`document.querySelector(${JSON.stringify(seletor)}).click()`);
}
async function captura(nome) {
    const imagem = await navegador.enviar('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    fs.writeFileSync(`/tmp/cashland-rf08-${nome}.png`, Buffer.from(imagem.data, 'base64'));
}
function escritas() {
    return chamadas.filter(chamada => chamada.metodo !== 'GET');
}

before(async () => {
    servidor = app.listen(0, '127.0.0.1');
    await new Promise(resolve => servidor.once('listening', resolve));
    origem = `http://127.0.0.1:${servidor.address().port}`;
    navegador = await abrirNavegador(origem);
    await navegador.enviar('Network.setCookie', { name: 'rf08_teste', value: 'local', url: origem });
});
after(async () => {
    if (navegador) await navegador.fechar();
    servidor.closeAllConnections();
    await new Promise(resolve => servidor.close(resolve));
});

test('criação: campos vazios, erros Joi, conflito, cookies e envio único', { timeout: 30000 }, async () => {
    await abrir('/tela-principal/criar-orcamento');
    assert.equal(await avaliar("document.getElementById('botao-Enviar').disabled"), false);
    await enviar();
    assert.equal(escritas().length, 0);
    assert.match(await avaliar("document.getElementById('erro-id_conta').textContent"), /Selecione/);
    await preencher({ id_categoria: '21', tipo_periodo: 'Mensal', valor_orcamento: '0' });
    await enviar();
    await ate("document.getElementById('erro-valor_orcamento').textContent.length > 0");
    assert.equal(escritas().at(-1).body.valor_orcamento, 0);
    assert.equal(escritas().at(-1).body.id_conta, undefined);
    assert.equal(escritas().at(-1).body.periodo_inicio, undefined);
    await preencher({ valor_orcamento: '123.456' });
    await enviar();
    await ate("document.getElementById('erro-valor_orcamento').textContent.length > 0");
    await preencher({ valor_orcamento: '450.75', descricao: 'Compras' });
    falha = { caminho: '/usuario/criar-orcamento', metodo: 'POST', status: 409, body: { mensagem: 'Orçamento já existe para este vínculo e período.' } };
    await enviar();
    await resultado('já existe');
    await clicar('#fechar-resultado');
    falha = null;
    atraso = 200;
    const antes = escritas().length;
    await avaliar("document.getElementById('meuForm').requestSubmit(); document.getElementById('meuForm').requestSubmit()");
    await resultado('criado');
    assert.equal(escritas().length, antes + 1);
    assert.deepEqual(escritas().at(-1).body, { id_categoria: 21, descricao: 'Compras', valor_orcamento: 450.75, tipo_periodo: 'Mensal' });
    assert.match(escritas().at(-1).cookie, /rf08_teste=local/);
    await clicar('#fechar-resultado');
    await ate("location.pathname === '/tela-principal/listar-orcamentos'");
});

test('edição comum: período histórico preservado, automáticos bloqueados e PATCH mínimo', async () => {
    await abrir('/tela-principal/editar-orcamento?id_orcamento=71');
    assert.equal(await avaliar("document.getElementById('periodo_inicio').value"), '2020-01-01');
    for (const id of ['id_orcamento', 'id_usuario', 'nome', 'valor_atual', 'periodo_fim', 'data_criacao', 'data_atualizacao']) {
        assert.equal(await avaliar(`document.getElementById('${id}').disabled`), true);
    }
    assert.match(await avaliar("document.getElementById('valor_atual').value"), /0,00/);
    await enviar();
    await resultado('Altere pelo menos');
    assert.equal(escritas().length, 0);
    await clicar('#fechar-resultado');
    await preencher({ descricao: 'Descrição alterada' });
    await enviar();
    await resultado('atualizado');
    assert.deepEqual(escritas().at(-1).body, { id_orcamento: 71, descricao: 'Descrição alterada' });
    assert.equal(escritas().at(-1).caminho, '/usuario/editar-orcamento');
});

test('edição administrativa: proprietário da URL, vínculos restritos e remoção com null', async () => {
    await abrir('/tela-admin/editar-orcamento?id_usuario=501&id_orcamento=71', true);
    for (const chamada of chamadas.filter(item => item.caminho.startsWith('/admin/'))) {
        assert.equal(chamada.query.id_usuario, '501');
    }
    await preencher({ id_conta: '', descricao: '' });
    await enviar();
    await resultado('atualizado');
    assert.deepEqual(escritas().at(-1).body, { id_orcamento: 71, id_usuario: 501, id_conta: null, descricao: '' });
    assert.equal(escritas().at(-1).caminho, '/admin/editar-orcamento');
    await clicar('#fechar-resultado');
    await ate("location.pathname === '/tela-admin/listar-orcamentos'");
});

test('mudança de tipo exige início explícito; identificadores ausentes ou estrangeiros bloqueiam edição', async () => {
    await abrir('/tela-principal/editar-orcamento?id_orcamento=71');
    await preencher({ tipo_periodo: 'Anual' });
    await enviar();
    assert.equal(escritas().length, 0);
    assert.match(await avaliar("document.getElementById('erro-periodo_inicio').textContent"), /Selecione/);
    const inicio = await avaliar("document.getElementById('periodo_inicio').options[1].value");
    await preencher({ periodo_inicio: inicio });
    await enviar();
    await resultado('atualizado');
    assert.deepEqual(escritas().at(-1).body, { id_orcamento: 71, tipo_periodo: 'Anual', periodo_inicio: inicio });
    for (const caminho of ['/tela-principal/editar-orcamento', '/tela-principal/editar-orcamento?id_orcamento=0', '/tela-admin/editar-orcamento?id_orcamento=71']) {
        await abrir(caminho, caminho.startsWith('/tela-admin'));
        assert.equal(await avaliar("document.getElementById('botao-Enviar').disabled"), true);
        assert.equal(chamadas.some(item => item.caminho.endsWith('/listar-orcamentos')), false);
    }
    await abrir('/tela-admin/editar-orcamento?id_usuario=502&id_orcamento=71', true);
    assert.equal(await avaliar("document.getElementById('botao-Enviar').disabled"), true);
    assert.match(await avaliar("document.getElementById('erro-id_orcamento').textContent"), /não encontrado/);
});

for (const admin of [false, true]) {
    let prefixo = '/usuario';
    let tela = '/tela-principal';
    if (admin) { prefixo = '/admin'; tela = '/tela-admin'; }
    test(`listagem ${prefixo}: filtros exatos, limpeza, lista vazia, validação e exclusão`, { timeout: 30000 }, async () => {
        await abrir(`${tela}/listar-orcamentos`, admin);
        assert.equal(await avaliar("document.querySelectorAll('#corpo-tabela .botao-opcoes-tabela').length"), 1);
        assert.equal(await avaliar("!!document.getElementById('botao-novo-orcamento')"), !admin);
        await clicar('#botao-filtrar');
        const filtros = { id_orcamento: '71', id_conta: '11', id_categoria: '21', tipo_periodo: 'Mensal', periodo_inicio: '2020-01-01', periodo_fim: '2020-01-31' };
        if (admin) filtros.id_usuario = '501';
        await preencher(filtros);
        await avaliar("document.getElementById('form-filtros').requestSubmit()");
        await ate("!carregando");
        assert.deepEqual(chamadas.filter(item => item.caminho.endsWith('/listar-orcamentos')).at(-1).query, filtros);
        await clicar('#botao-filtrar');
        await preencher({ id_conta: '0' });
        await avaliar("document.getElementById('form-filtros').requestSubmit()");
        await ate("document.getElementById('erro-id_conta').textContent.length > 0");
        assert.equal(await avaliar("getComputedStyle(document.getElementById('filtros-overlay')).display"), 'flex');
        assert.equal(await avaliar("getComputedStyle(document.getElementById('resultado-overlay')).display"), 'none');
        await clicar('#botao-limpar-filtros');
        await ate("!carregando");
        assert.deepEqual(chamadas.filter(item => item.caminho.endsWith('/listar-orcamentos')).at(-1).query, {});
        await preencher({ nome: 'Inexistente' });
        await avaliar("document.getElementById('form-listar-orcamentos').requestSubmit()");
        await ate("document.getElementById('corpo-tabela').textContent.includes('Nenhum orçamento')");
        await preencher({ nome: '' });
        await avaliar("document.getElementById('form-listar-orcamentos').requestSubmit()");
        await ate("document.querySelectorAll('.botao-opcoes-tabela').length === 1 && !carregando");
        await clicar('.botao-opcoes-tabela');
        await clicar('.menu-tabela .botao-excluir');
        await clicar('#botao-cancelar-exclusao');
        assert.equal(escritas().length, 0);
        await clicar('.botao-opcoes-tabela');
        await clicar('.menu-tabela .botao-excluir');
        let caminho = `${prefixo}/deletar-orcamento/71`;
        if (admin) caminho = `${prefixo}/deletar-orcamento/501/71`;
        falha = { caminho, metodo: 'DELETE', status: 400, body: { erros: [{ campo: 'id_orcamento', mensagem: 'Orçamento inválido.' }] } };
        await clicar('#botao-confirmar-exclusao');
        await ate("document.getElementById('erro-exclusao-id_orcamento').textContent.includes('inválido')");
        falha = null;
        atraso = 150;
        const antes = escritas().length;
        await avaliar("excluirRegistro(); excluirRegistro()");
        await resultado('excluído');
        assert.equal(escritas().length, antes + 1);
        assert.equal(escritas().at(-1).caminho, caminho);
        assert.equal(escritas().at(-1).metodo, 'DELETE');
        assert.equal(escritas().at(-1).body, undefined);
        await clicar('#fechar-resultado');
        await ate("document.getElementById('corpo-tabela').textContent.includes('Nenhum orçamento')");
    });
}

test('falhas de comunicação, recarga, limite de requisições, sessão expirada e acesso negado', { timeout: 30000 }, async () => {
    await abrir('/tela-principal/criar-orcamento');
    falha = { caminho: '/usuario/listar-categoria', metodo: 'GET', status: 500, body: { mensagem: 'Falha ao carregar categorias.' } };
    await avaliar('carregarDados()');
    await resultado('Falha ao carregar');
    assert.equal(await avaliar("document.getElementById('botao-Enviar').disabled"), true);
    await clicar('#fechar-resultado');
    falha = null;
    await clicar('#botao-Carregar');
    await ate("!document.getElementById('botao-Enviar').disabled");
    await abrir('/tela-principal/listar-orcamentos');
    falha = { caminho: '/usuario/listar-orcamentos', metodo: 'GET', rede: true };
    await avaliar('listarRegistros()');
    await resultado('Falha de comunicação');
    await clicar('#fechar-resultado');
    falha = { caminho: '/usuario/listar-orcamentos', metodo: 'GET', status: 429, body: { mensagem: 'Limite atingido. Tente mais tarde.' } };
    await avaliar('listarRegistros()');
    await resultado('Limite atingido');
    await clicar('#fechar-resultado');
    falha = { caminho: '/usuario/listar-orcamentos', metodo: 'GET', status: 401, body: { mensagem: 'Sessão expirada.' } };
    await avaliar('listarRegistros()');
    await resultado('Sessão expirada');
    await clicar('#fechar-resultado');
    await ate("location.pathname === '/login'");
    await abrir('/tela-admin/listar-orcamentos', true);
    falha = { caminho: '/admin/listar-orcamentos', metodo: 'GET', status: 403, body: { erro: 'Acesso restrito a administradores' } };
    await avaliar('listarRegistros()');
    await resultado('Acesso restrito');
    await clicar('#fechar-resultado');
    await ate("location.pathname === '/tela-principal'");
    perfil = 'Comum';
    await navegador.enviar('Page.navigate', { url: origem + '/tela-admin/listar-orcamentos' });
    await ate("location.pathname === '/tela-principal'");
});

test('cinco telas em desktop/celular: menu, favicon, recursos, console e capturas', { timeout: 30000 }, async () => {
    const telas = [
        '/tela-principal/criar-orcamento', '/tela-principal/listar-orcamentos',
        '/tela-principal/editar-orcamento?id_orcamento=71', '/tela-admin/listar-orcamentos',
        '/tela-admin/editar-orcamento?id_usuario=501&id_orcamento=71'
    ];
    for (const largura of [1280, 390, 320]) {
        for (let indice = 0; indice < telas.length; indice++) {
            const caminho = telas[indice];
            const admin = caminho.startsWith('/tela-admin');
            await abrir(caminho, admin, largura);
            let destino = '/tela-principal/listar-orcamentos';
            if (admin) destino = '/tela-admin/listar-orcamentos';
            assert.equal(await avaliar("document.querySelectorAll('#lista-opcoes a[href$=\"/listar-orcamentos\"]').length"), 1);
            assert.equal(await avaliar("document.querySelector('#lista-opcoes a[href$=\"/listar-orcamentos\"]').getAttribute('href')"), destino);
            assert.equal(await avaliar("document.querySelector('link[rel=icon]').getAttribute('href')"), '/CashLand%20emerald%20C%20icon.png');
            assert.equal(await avaliar("document.documentElement.scrollWidth <= innerWidth"), true);
            await captura(`${indice}-${largura}`);
            if (caminho.includes('listar-')) {
                await clicar('#botao-filtrar');
                await captura(`filtros-${indice}-${largura}`);
            }
        }
    }
    assert.deepEqual(recursosAusentes, []);
    assert.deepEqual(navegador.erros, []);
});
