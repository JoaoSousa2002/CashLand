import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as schemas from '../src/validacoes/usuario.js';
import { validar } from '../src/validacoes/validar.js';

for (const entidade of ['Usuario', 'Categoria', 'Subcategoria']) {
    const campo = `id_${entidade.toLowerCase()}`;
    for (const modo of ['Obrigatorio', 'Opcional']) {
        test(`${campo} ${modo}: limites, conversão e rejeição de campos incorretos`, () => {
            const schema = schemas[`schemaId${entidade}${modo}`];
            for (const id of [0, 1, '42']) {
                const result = schema.validate({ [campo]: id });
                assert.equal(result.error, undefined);
                assert.equal(result.value[campo], Number(id));
            }
            for (const id of [-1, 1.5, '', null, 'abc', [], {}, true]) {
                assert.ok(schema.validate({ [campo]: id }).error);
            }
            assert.equal(Boolean(schema.validate({}).error), modo === 'Obrigatorio');
            for (const errado of ['id', ...['id_usuario', 'id_categoria', 'id_subcategoria'].filter(x => x !== campo)]) {
                assert.ok(schema.validate({ [errado]: 1 }).error);
            }
        });
    }
}

// Executa os middlewares e handlers reais, isolando banco, autenticação e auditoria.
const source = readFileSync(new URL('../src/rf-001-Login/Servidor.js', import.meta.url), 'utf8');
const routes = [
    ['/me', 'query', 'id_usuario', true],
    ['/admin/usuario', 'query', 'id_usuario', true],
    ['/admin/listar-categoria', 'query', 'id_usuario', true],
    ['/admin/editar-usuario', 'body', 'id_usuario', false, { nome: 'Pessoa Teste', email: 'teste@example.com' }],
    ['/admin/resetar-senha', 'body', 'id_usuario'],
    ['/admin/reativar-usuario', 'body', 'id_usuario'],
    ['/admin/desativar-usuario', 'body', 'id_usuario'],
    ['/admin/deletar-usuario', 'query', 'id_usuario'],
    ['/usuario/editar-categoria', 'body', 'id_categoria', false, { nome: 'Categoria Teste', descricao: '' }],
    ['/usuario/deletar-categoria', 'body', 'id_categoria'],
    ['/admin/editar-categoria', 'body', 'id_categoria', false, { nome: 'Categoria Teste', descricao: '' }],
];

async function executar(route, dados, { respostas, tipo = 'Admin' } = {}) {
    const [path, origem] = route;
    const calls = [];
    const fallback = { data: { id_usuario: 42, id_categoria: 42, nome: 'Anterior', tipo: 'Usuario', status_usuario: path === '/admin/reativar-usuario' ? 'Inativo' : 'Ativo', status_reset_senha: false }, error: null };
    const queue = [...(respostas ?? (path === '/usuario/editar-categoria' ? [fallback, {data: null, error: null}, fallback] : [fallback, fallback]))];
    const db = new Proxy({}, { get(_target, method) {
        if (method === 'then') return (resolve, reject) => Promise.resolve(queue.shift() ?? fallback).then(resolve, reject);
        return (...args) => { calls.push([method, ...args]); return db; };
    }});
    let handlers;
    const register = (_path, ...fns) => { handlers = fns; };
    const next = (_req, _res, next) => next();
    const context = {
        ...schemas, validar,
        app: { get: register, patch: register, delete: register },
        auditar: () => next, autenticar: next, somenteAdmin: next,
        supabase: db, confirmarAlteracao() {}, console: { log() {} },
    };
    const start = source.search(new RegExp(`app\\.\\w+\\('${path}'`));
    assert.ok(start >= 0);
    const end = source.indexOf('\napp.', start + 1);
    vm.runInNewContext(source.slice(start, end), context);
    const method = source.slice(start).match(/^app\.(\w+)/)[1].toUpperCase();
    const req = { method, body: {}, usuario: { id_usuario: 99, tipo } };
    // Reproduz query como getter do Express 5.
    Object.defineProperty(req, 'query', { get: () => origem === 'query' ? dados : {}, configurable: true });
    if (origem === 'body') req.body = dados;
    const res = { set() { return this; }, locals: { auditoria: {} }, code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    async function dispatch(i) {
        if (!handlers[i]) return;
        let pending;
        await handlers[i](req, res, () => { pending = dispatch(i + 1); });
        await pending;
    }
    await dispatch(0);
    return { res, calls, req };
}

for (const route of routes) {
    const [path, , campo, optional, extra = {}] = route;
    test(`${path}: rejeita ID inválido, ausente ou com nome antigo antes de consultar o banco`, async () => {
        const inputs = [{ id: 42 }, { [campo]: -1 }, { [campo]: 1.5 }, { [campo]: 'abc' }, { [campo]: '' }, { [campo]: ['1','2'] }];
        if (!optional) inputs.push({});
        for (const input of inputs) {
            const {res, calls} = await executar(route, { ...extra, ...input });
            assert.equal(res.code, 400, JSON.stringify(input));
            assert.equal(calls.length, 0);
        }
    });
    test(`${path}: usa ${campo} no filtro do banco, inclusive zero`, async () => {
        for (const id of ['42', 0]) {
            const {res, calls} = await executar(route, {...extra, [campo]: id});
            assert.equal(res.code, 200);
            assert.ok(res.data);
            assert.ok(calls.some(call => call[0] === 'eq' && call[1] === campo && call[2] === Number(id)));
        }
    });
    if (optional) test(`${path}: aceita ausência do ID`, async () => {
        const {res, calls} = await executar(route, {});
        assert.equal(res.code, 200);
        const filters = calls.filter(call => call[0] === 'eq');
        if (path === '/admin/listar-categoria') assert.equal(filters.length, 0);
        else assert.ok(filters.some(call => call[1] === 'id_usuario' && call[2] === 99));
    });
}

test('/me: usuário comum não pode consultar outro ID, inclusive zero', async () => {
    for (const id_usuario of [42, 0]) {
        const {res, calls} = await executar(routes[0], {id_usuario}, {tipo:'Usuario'});
        assert.equal(res.code, 403);
        assert.equal(calls.length, 0);
    }
});

for (const path of ['/admin/reativar-usuario', '/admin/editar-categoria']) {
    test(`${path}: registro inexistente retorna 404 sem lançar exceção`, async () => {
        const route = routes.find(r => r[0] === path);
        const {res} = await executar(route, { ...route[4], [route[2]]:42 }, {respostas:[{data:null, error:null}]});
        assert.equal(res.code, 404);
    });
}

test('/admin/listar-categoria: filtra categoria, inclusive zero, e combina com usuário', async () => {
    for (const query of [{id_categoria: '42'}, {id_categoria: 0}, {id_categoria: 42, id_usuario: 7}]) {
        const {res, calls} = await executar(routes[2], query);
        assert.equal(res.code, 200);
        assert.ok(Array.isArray(res.data.consultaPorID));
        assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'id_categoria' && c[2] === Number(query.id_categoria)));
        if (query.id_usuario !== undefined) assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'id_usuario' && c[2] === query.id_usuario));
    }
});

test('/admin/listar-categoria: categoria inexistente e erro de banco têm respostas distintas', async () => {
    for (const [resposta, status] of [[{data:null,error:null},404], [{data:null,error:{message:'Falha'}},500]]) {
        const {res} = await executar(routes[2], {id_categoria:42}, {respostas:[resposta]});
        assert.equal(res.code, status);
    }
});

test('/admin/listar-categoria: rejeita id_categoria inválido antes de consultar o banco', async () => {
    for (const id_categoria of [-1, 1.5, '', 'abc', ['1','2']]) {
        const {res, calls} = await executar(routes[2], {id_categoria});
        assert.equal(res.code, 400);
        assert.equal(calls.length, 0);
    }
});

test('/admin/listar-categoria: ambos os IDs retornam todos os campos das tabelas relacionadas', async () => {
    const categoria = {id_categoria:42, id_usuario:7, descricao:'Teste', usuarios:{id_usuario:7, nome:'Pessoa', email:'teste@example.com'}};
    const {res, calls} = await executar(routes[2], {id_categoria:42, id_usuario:7}, {respostas:[{data:categoria,error:null}]});
    assert.equal(res.code, 200);
    assert.equal(res.data.consultaPorID[0], categoria);
    assert.ok(calls.some(c => c[0] === 'select' && c[1] === '*, usuarios!inner(*)'));
    for (const [resposta, status] of [[{data:null,error:null},404], [{data:null,error:{message:'Falha'}},500]]) {
        const resultado = await executar(routes[2], {id_categoria:42, id_usuario:7}, {respostas:[resposta]});
        assert.equal(resultado.res.code, status);
    }
});

test('consulta por categoria em duas etapas: existência, dados e erros', async () => {
    const existente = {data:{nome:'Categoria'},error:null};
    const dados = [{id_categoria:42, nome:'Categoria', usuarios:{id_usuario:7,nome:'Pessoa'}}];
    for (const [respostas, status] of [
        [[existente,{data:dados,error:null}],200],
        [[{data:null,error:null}],404],
        [[{data:null,error:{message:'Falha na verificação'}}],404],
        [[existente,{data:null,error:{message:'Falha na consulta'}}],500],
    ]) {
        const {res, calls} = await executar(routes[2], {id_categoria:42}, {respostas});
        assert.equal(res.code,status);
        assert.ok(calls.some(c => c[0] === 'select' && c[1] === 'nome'));
        if (status === 200) assert.equal(res.data.consultaPorID,dados);
        if (status === 404) assert.equal(calls.filter(c => c[0] === 'from').length,1);
    }
});

test('pesquisa de categoria por ID verifica existência e proprietário antes de listar', async () => {
    const rota = ['/usuario/listar-categoria', 'query'];
    for (const [primeiraResposta, status] of [
        [{data:{id_categoria:42},error:null},200],
        [{data:null,error:null},404],
        [{data:null,error:{message:'Falha'}},500],
    ]) {
        const {res,calls} = await executar(rota, {pesquisa:'42'}, {respostas:[primeiraResposta,{data:[],error:null}]});
        assert.equal(res.code,status);
        assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'id_categoria' && c[2] === '42'));
        assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'id_usuario' && c[2] === 99));
        assert.equal(calls.filter(c => c[0] === 'from').length,status === 200 ? 2 : 1);
    }
    const {res,calls} = await executar(rota, {pesquisa:'Mercado'}, {respostas:[{data:[],error:null}]});
    assert.equal(res.code,200);
    assert.ok(!calls.some(c => c[0] === 'maybeSingle'));
});
