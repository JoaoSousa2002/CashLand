import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import app from '../src/app.js';
import supabase from '../src/config/supabase.js';
import { gerarHashSenha, gerarToken } from '../src/rf-001-Login/Autenticacao.js';
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
            await http('get', rota.path).expect(200).expect('Content-Type', /html/);
        }
    }
    await http('get', '/api-docs/').expect(200).expect('Content-Type', /html/);
    await http('get', '/template.css').expect(200).expect('Content-Type', /css/);
    await http('get', '/protecao.js').expect(200);
    await http('get', '/rota-inexistente').expect(404).expect('Content-Type', /html/);
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
    for (const rota of rotas.filter(rota => rota.path.startsWith('/admin/'))) {
        const caminho = rota.path.replace(/:id_\w+/g, '456');
        await cliente()(rota.method, caminho).set('Cookie', `token=${token}`)
            .expect(403, { erro: 'Acesso restrito a administradores' });
    }
    assert.equal(acessoBanco.mock.callCount(), 0);
    assert.equal(eventos.filter(e => e.tipo_evento === 'AUDITORIA' && e.resultado === 'NEGADO').length, 10);
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
    ['LOGIN', 'post', '/login', 10, 400, 'Muitas tentativas de login realizadas. Tente novamente em 15 minutos.'],
    ['CONFIRMAR_SENHA', 'post', '/confirmar-senha', 5, 401, 'Muitas tentativas de confirmar senha realizadas. Tente novamente em 15 minutos.'],
    ['SOLICITAR_CODIGO', 'post', '/solicitar-codigo', 5, 400, 'Muitas tentativas de envio de codigo realizadas. Tente novamente em 15 minutos.'],
    ['VERIFICAR_CODIGO', 'post', '/confirmar-cadastro', 5, 400, 'Muitas tentativas de verificar codigo realizadas. Tente novamente em 15 minutos.'],
    ['GENERICO_SIMPLES', 'get', '/usuario', 15, 401, 'Muitas solicitações para essa ação realizadas. Tente novamente em 15 minutos.'],
    ['GENERICO_CRITICO', 'patch', '/usuario/desativar-usuario', 5, 401, 'Muitas solicitações para essa ação realizadas. Tente novamente em 15 minutos.']
];
for (const [nome, metodo, caminho, maximo, statusInicial, mensagem] of limites) {
    test(`rate limit ${nome}: política original, headers, log e auditoria`, async t => {
        const eventos = observarLogs(t);
        const http = cliente();
        for (let i = 0; i < maximo; i += 1) {
            await http(metodo, caminho).send({}).expect(statusInicial);
        }
        const bloqueio = await http(metodo, caminho).send({}).expect(429, { mensagem });
        assert.equal(Number(bloqueio.headers['x-ratelimit-limit']), maximo);
        assert.equal(Number(bloqueio.headers['x-ratelimit-remaining']), 0);
        assert.ok(Number(bloqueio.headers['retry-after']) <= 900);
        assert.ok(Number(bloqueio.headers['retry-after']) > 0);
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
