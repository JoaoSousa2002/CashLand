import './helpers/ambiente-local.js';
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import app from '../src/app.js';
import supabase from '../src/config/supabase.js';
import { gerarHashSenha, gerarToken } from '../src/rf-002-Login/Autenticacao.js';
import { observarLogs } from './helpers/auditoria.js';

const rotas = JSON.parse(readFileSync(new URL('./fixtures/rotas.json', import.meta.url)));
before(() => {
    mock.method(supabase, 'from', () => {
        throw new Error('A suíte local não permite acessar o banco configurado no .env');
    });
});
after(() => mock.restoreAll());
let numeroIP = 0;
function cliente() {
    numeroIP += 1;
    const ip = `192.0.2.${numeroIP}`;
    return (metodo, caminho) => request(app)[metodo](caminho).set('X-Forwarded-For', ip);
}

// Estes testes HTTP não acessam Supabase. Os E2E com login e banco reais estão em idor.test.js.
test('páginas, redirecionamento, arquivos estáticos e Swagger preservados', async () => {
    const http = cliente();
    for (const rota of rotas.filter(rota => !rota.middlewares)) {
        if (rota.path === '/') {
            await http('get', '/').expect(302).expect('Location', '/login');
        } else {
            await http('get', rota.path).set('Accept', 'text/html').expect(200).expect('Content-Type', /html/);
        }
    }
    await http('get', '/api-docs/').expect(200).expect('Content-Type', /html/);
    await http('get', '/template.css').expect(200).expect('Content-Type', /css/);
    await http('get', '/protecao.js').expect(200);
    await http('get', '/menu-tabela.js').expect(200).expect('Content-Type', /javascript/);
    await http('get', '/rota-inexistente').expect(404).expect('Content-Type', /html/);
});

test('Swagger UI carrega a especificação em docs/api/swagger.json', async () => {
    const especificacao = JSON.parse(readFileSync(new URL('../docs/api/swagger.json', import.meta.url)));
    assert.equal(especificacao.openapi, '3.0.0');
    assert.ok(especificacao.paths['/usuario/listar-metas']);
    const resposta = await cliente()('get', '/api-docs/swagger-ui-init.js').expect(200);
    assert.ok(resposta.text.includes(JSON.stringify(especificacao.info.title)));
    assert.ok(resposta.text.includes('"/usuario/listar-metas"'));
});

test('todas as rotas protegidas preservam método, URL e resposta sem sessão', async () => {
    for (const rota of rotas.filter(rota => rota.middlewares.includes('autenticar'))) {
        const http = cliente();
        const caminho = rota.path.replace(/:id_\w+/g, '1');
        await http(rota.method, caminho).expect(401, { mensagem: 'Não autenticado' });
    }
});

test('sessão inválida preserva mensagem e auditoria', async t => {
    const eventos = observarLogs(t);
    await cliente()('get', '/me').set('Cookie', 'token=invalido')
        .expect(401, { mensagem: 'Token inválido ou expirado' });
    const evento = eventos.find(e => e.tipo_evento === 'AUDITORIA');
    assert.equal(evento.rota, 'CONSULTAR_SESSAO');
    assert.equal(evento.resultado, 'NEGADO');
    assert.equal(evento.detalhes.motivo, 'SESSAO_INVALIDA');
});

test('usuário comum é bloqueado antes do controller em todas as rotas admin', async t => {
    const eventos = observarLogs(t);
    // Token do serviço real apenas para testar o middleware; não representa um E2E.
    const token = gerarToken({ id_usuario: 123, tipo: 'Comum' });
    const acessoBanco = t.mock.method(supabase, 'from', () => {
        throw new Error('Autorização deve bloquear antes do banco');
    });
    for (const rota of rotas.filter(rota => rota.middlewares.includes('somenteAdmin'))) {
        const caminho = rota.path.replace(/:id_\w+/g, '456');
        await cliente()(rota.method, caminho).set('Cookie', `token=${token}`)
            .expect(403, { erro: 'Acesso restrito a administradores' });
    }
    assert.equal(acessoBanco.mock.callCount(), 0);
    assert.equal(eventos.filter(e => e.tipo_evento === 'AUDITORIA' && e.resultado === 'NEGADO').length,
        rotas.filter(rota => rota.middlewares.includes('somenteAdmin')).length);
});

test('telas e APIs administrativas mantêm endereços distintos e autorização', async () => {
    const http = cliente();
    await http('get', '/tela-admin/listar-transacoes').set('Accept', 'text/html')
        .expect(200).expect('Content-Type', /html/);
    for (const accept of ['application/json', '*/*', 'text/html']) {
        await http('get', '/admin/listar-transacoes').set('Accept', accept)
            .expect(401, { mensagem: 'Não autenticado' }).expect('Content-Type', /json/);
    }
    const comum = gerarToken({ id_usuario: 123, tipo: 'Comum' });
    await http('get', '/admin/listar-transacoes?id_usuario=456').set('Accept', 'application/json')
        .set('Cookie', `token=${comum}`).expect(403, { erro: 'Acesso restrito a administradores' });
    const admin = gerarToken({ id_usuario: 123, tipo: 'Admin' });
    const resposta = await http('get', '/admin/listar-transacoes?id_usuario=invalido').set('Accept', 'application/json')
        .set('Cookie', `token=${admin}`).expect(400);
    assert.ok(resposta.body.erros.some(erro => erro.campo === 'id_usuario'));
    await http('get', '/tela-admin/editar-transacao?id_transacao=1&id_usuario=456')
        .expect(200).expect('Content-Type', /html/);
    await http('patch', '/admin/editar-transacao').send({ id_transacao: 1, id_usuario: 456 })
        .expect(401, { mensagem: 'Não autenticado' });
});

test('Joi continua validando IDs da URL, body e query', async () => {
    const token = gerarToken({ id_usuario: 123, tipo: 'Comum' });
    for (const [metodo, caminho, body] of [
        ['delete', '/usuario/deletar-categoria/invalido', undefined],
        ['patch', '/usuario/editar-categoria', { id_categoria: 'invalido', nome: 'Categoria' }],
        ['get', '/me?id_usuario=invalido', undefined]
    ]) {
        const resposta = await cliente()(metodo, caminho).set('Cookie', `token=${token}`).send(body).expect(400);
        assert.equal(resposta.body.mensagem, 'Dados inválidos.');
        assert.ok(resposta.body.erros.length > 0);
    }
});

test('login e /me preservam cookie e JSON com banco simulado explicitamente', async t => {
    const usuario = {
        id_usuario: 123, nome: 'Usuário de teste', tipo: 'Comum',
        status_usuario: 'Ativo', status_reset_senha: false,
        senha_hash: await gerarHashSenha('senha-temporaria-teste')
    };
    t.mock.method(supabase, 'from', tabela => {
        assert.equal(tabela, 'usuarios');
        const consulta = {
            select() { return consulta; },
            eq() { return consulta; },
            async single() { return { data: usuario, error: null }; }
        };
        return consulta;
    });
    const http = cliente();
    const login = await http('post', '/login').send({ email: 'teste@example.com', senha: 'senha-temporaria-teste' }).expect(200);
    assert.deepEqual(login.body, {
        mensagem: 'Login realizado com sucesso',
        usuario: { id_usuario: 123, nome: usuario.nome, tipo: 'Comum' }
    });
    const cookies = login.headers['set-cookie'];
    assert.ok(cookies[0].includes('HttpOnly'));
    assert.ok(cookies[0].includes('SameSite=Strict'));
    assert.ok(cookies[0].includes('Max-Age=7200'));
    assert.equal(cookies[0].includes('Secure'), process.env.NODE_ENV === 'production');
    await http('get', '/me').set('Cookie', cookies).expect(200, login.body.usuario);
    const logout = await http('post', '/logout').set('Cookie', cookies).expect(200, { mensagem: 'Logout realizado' });
    assert.match(logout.headers['set-cookie'][0], /^token=;/);
});

const limites = [
    ['LOGIN', 'post', '/login', 10, 900, 400, 'Muitas tentativas de login realizadas. Tente novamente em 15 minutos.'],
    ['CONFIRMAR_SENHA', 'post', '/confirmar-senha', 5, 900, 401, 'Muitas tentativas de confirmar senha realizadas. Tente novamente em 15 minutos.'],
    ['SOLICITAR_CODIGO', 'post', '/solicitar-codigo', 5, 900, 400, 'Muitas tentativas de envio de codigo realizadas. Tente novamente em 15 minutos.'],
    ['VERIFICAR_CODIGO', 'post', '/confirmar-cadastro', 10, 900, 400, 'Muitas tentativas de verificar codigo realizadas. Tente novamente em 15 minutos.'],
    ['GENERICO_SIMPLES', 'get', '/usuario', 60, 300, 401, 'Muitas solicitações para essa ação realizadas. Tente novamente em 5 minutos.'],
    ['GENERICO_CRITICO', 'post', '/logout', 5, 900, 200, 'Muitas solicitações para essa ação realizadas. Tente novamente em 15 minutos.'],
    ['CRIACAO', 'post', '/usuario/criar-meta', 30, 900, 401, 'Muitas tentativas de criação de registros realizadas. Tente novamente em 15 minutos.'],
    ['EDICAO_COMUM', 'patch', '/usuario/desativar-usuario', 30, 900, 401, 'Muitas tentativas de edição de registros realizadas. Tente novamente em 15 minutos.'],
    ['EDICAO_ADMIN', 'patch', '/admin/editar-meta', 60, 900, 401, 'Muitas tentativas de edição de registros realizadas. Tente novamente em 15 minutos.'],
    ['LISTAGEM_COMUM', 'get', '/usuario/listar-metas', 120, 600, 401, 'Muitas solicitações de listagem realizadas. Tente novamente em 10 minutos.'],
    ['LISTAGEM_ADMIN', 'get', '/admin/listar-metas', 240, 600, 401, 'Muitas solicitações de listagem realizadas. Tente novamente em 10 minutos.'],
    ['EXCLUSAO_COMUM', 'delete', '/usuario/deletar-meta/:id_meta', 15, 900, 401, 'Muitas tentativas de exclusão de registros realizadas. Tente novamente em 15 minutos.'],
    ['EXCLUSAO_ADMIN', 'delete', '/admin/deletar-meta/:id_meta/:id_usuario', 60, 900, 401, 'Muitas tentativas de exclusão de registros realizadas. Tente novamente em 15 minutos.']
];
for (const [nome, metodo, caminho, maximo, janelaSegundos, statusInicial, mensagem] of limites) {
    test(`rate limit ${nome}: configuração atual, headers, log e auditoria`, async t => {
        const eventos = observarLogs(t);
        const http = cliente();
        const inicio = Date.now();
        const url = caminho.replace(/:id_\w+/g, '1');
        for (let i = 0; i < maximo; i += 1) {
            await http(metodo, url).send({}).expect(statusInicial);
        }
        const bloqueio = await http(metodo, url).send({}).expect(429, { mensagem });
        assert.equal(Number(bloqueio.headers['x-ratelimit-limit']), maximo);
        assert.equal(Number(bloqueio.headers['x-ratelimit-remaining']), 0);
        const espera = Number(bloqueio.headers['retry-after']);
        const decorrido = Math.ceil((Date.now() - inicio) / 1000);
        assert.ok(espera <= janelaSegundos);
        assert.ok(espera >= janelaSegundos - decorrido);
        assert.ok(espera > 0);
        const evento = eventos.find(e => e.tipo_evento === 'AUDITORIA' && e.detalhes.status_http === 429);
        assert.equal(evento.resultado, 'NEGADO');
        assert.equal(evento.detalhes.motivo, `RATE_LIMIT_${nome}_EXCEDIDO`);
        const seguranca = eventos.find(e => e.evento === 'RATE_LIMIT_EXCEDIDO');
        assert.equal(seguranca.limitador, nome);
        assert.equal(seguranca.rota, caminho);
        assert.ok(eventos.some(e => e.mensagem === 'Requisição HTTP' && e.rota === caminho && e.status === 429));
    });
}

test('rotas legadas de subcategoria continuam indisponíveis', async () => {
    for (const prefixo of ['/usuario', '/admin']) {
        for (const [metodo, acao] of [['post', 'criar'], ['get', 'listar'], ['patch', 'editar'], ['delete', 'deletar']]) {
            await cliente()(metodo, `${prefixo}/${acao}-sub_categoria`).expect(404);
        }
    }
});

test('saldo exige conta válida e autenticação antes de consultar o banco', async t => {
    const banco = t.mock.method(supabase, 'from', () => {
        throw new Error('Não deve consultar o banco');
    });
    const token = gerarToken({ id_usuario: 123, tipo: 'Comum' });
    await cliente()('get', '/usuario/verificar-saldo?id_conta=10').expect(401);
    for (const query of ['', '?id_conta=invalido', '?id_conta=-1']) {
        const resposta = await cliente()('get', `/usuario/verificar-saldo${query}`)
            .set('Cookie', `token=${token}`).expect(400);
        assert.ok(resposta.body.erros.some(erro => erro.campo === 'id_conta'));
    }
    assert.equal(banco.mock.callCount(), 0);
});

test('saldo consulta somente o último registro da conta pertencente ao usuário', async t => {
    const token = gerarToken({ id_usuario: 123, tipo: 'Comum' });
    for (const cenario of [
        { nome: 'saldo atual', conta: { id_usuario: 123 }, saldo: { saldo: 150.25 }, status: 200, body: { saldo: 150.25 } },
        { nome: 'sem histórico', conta: { id_usuario: 123 }, saldo: null, status: 200, body: { saldo: 0 } },
        { nome: 'saldo negativo', conta: { id_usuario: 123 }, saldo: { saldo: -50 }, status: 200, body: { saldo: -50 } },
        { nome: 'outro proprietário', conta: { id_usuario: 456 }, status: 404 },
        { nome: 'conta inexistente', conta: null, status: 404 },
        { nome: 'erro ao consultar conta', erroConta: { message: 'Falha simulada' }, status: 500 },
        { nome: 'erro ao consultar saldo', conta: { id_usuario: 123 }, erroSaldo: { message: 'Falha simulada' }, status: 500 }
    ]) {
        await t.test(cenario.nome, async contexto => {
            let consultasSaldo = 0;
            contexto.mock.method(supabase, 'from', tabela => {
                assert.ok(['contas_bancarias', 'saldo_conta'].includes(tabela));
                const operacoes = [];
                const consulta = {
                    select(campos) { operacoes.push(['select', campos]); return consulta; },
                    eq(campo, valor) { operacoes.push(['eq', campo, valor]); return consulta; },
                    order(campo, opcoes) { operacoes.push(['order', campo, opcoes]); return consulta; },
                    limit(valor) { operacoes.push(['limit', valor]); return consulta; },
                    async maybeSingle() {
                        assert.ok(operacoes.some(op => op[0] === 'eq' && op[1] === 'id_conta' && Number(op[2]) === 10));
                        if (tabela === 'contas_bancarias') {
                            return { data: cenario.conta, error: cenario.erroConta };
                        }
                        consultasSaldo += 1;
                        assert.deepEqual(operacoes, [
                            ['select', 'saldo'], ['eq', 'id_conta', 10],
                            ['order', 'data_atualizacao', { ascending: false }], ['limit', 1]
                        ]);
                        return { data: cenario.saldo, error: cenario.erroSaldo };
                    }
                };
                return consulta;
            });
            const resposta = await cliente()('get', '/usuario/verificar-saldo?id_conta=10')
                .set('Cookie', `token=${token}`).expect(cenario.status);
            if (cenario.body) assert.deepEqual(resposta.body, cenario.body);
            if (cenario.status === 404 || cenario.erroConta) assert.equal(consultasSaldo, 0);
            else assert.equal(consultasSaldo, 1);
            if (cenario.status === 500) assert.equal(typeof resposta.body.mensagem, 'string');
        });
    }
});
