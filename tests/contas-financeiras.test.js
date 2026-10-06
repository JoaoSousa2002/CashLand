import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import supabase from '../src/config/supabase.js';
import { gerarToken } from '../src/rf-001-Login/Autenticacao.js';
import { observarLogs } from './helpers/auditoria.js';

// Toda consulta é simulada. Uma chamada não prevista falha sem acessar o banco real.
before(() => mock.method(supabase, 'from', () => {
    throw new Error('A suíte local não permite acessar o banco configurado no .env');
}));
after(() => mock.restoreAll());
const usuario = 123;
const conta = { id_conta: 789, id_usuario: usuario, nome_conta: 'Minha conta', status_conta: 'Ativo' };
const dados = { nome_conta: 'Conta atualizada', tipo_conta: 'Corrente', codigo_conta: 123, nome_instituicao: 'Banco teste' };
let ip = 0;
function http(metodo, caminho, tipo = 'Comum') {
    ip += 1;
    return request(app)[metodo](caminho)
        .set('X-Forwarded-For', `198.51.100.${ip}`)
        .set('Cookie', `token=${gerarToken({ id_usuario: usuario, tipo })}`);
}
function simular(t, respostas) {
    const consultas = [];
    const pendentes = [...respostas];
    t.mock.method(supabase, 'from', tabela => {
        assert.equal(tabela, 'contas_bancarias');
        assert.ok(pendentes.length, 'Consulta inesperada');
        const resposta = pendentes.shift();
        const resultado = resposta?.error ? resposta : { data: resposta, error: null };
        const registro = { operacao: 'select', filtros: [], selects: [] };
        consultas.push(registro);
        const builder = {
            select(campos) { registro.selects.push(campos); return builder; },
            eq(campo, valor) { registro.filtros.push(['eq', campo, valor]); return builder; },
            neq(campo, valor) { registro.filtros.push(['neq', campo, valor]); return builder; },
            ilike(campo, valor) { registro.filtros.push(['ilike', campo, valor]); return builder; },
            order() { return builder; },
            or(expressao) { registro.or = expressao; return builder; },
            insert(valores) { registro.operacao = 'insert'; registro.valores = valores; return builder; },
            update(valores) { registro.operacao = 'update'; registro.valores = valores; return builder; },
            delete() { registro.operacao = 'delete'; return builder; },
            async single() { return resultado; },
            async maybeSingle() { return resultado; },
            then(resolve, reject) { return Promise.resolve(resultado).then(resolve, reject); }
        };
        return builder;
    });
    t.after(() => assert.equal(pendentes.length, 0, 'Todas as consultas previstas devem ocorrer'));
    return consultas;
}
function filtro(consulta, campo, valor, operador = 'eq') {
    assert.ok(consulta.filtros.some(f => f[0] === operador && f[1] === campo && f[2] === valor),
        `Falta filtro ${operador} ${campo}=${valor}`);
}
function proprietario(consultas) {
    for (const consulta of consultas) filtro(consulta, 'id_usuario', usuario);
}

test('criação usa o proprietário da sessão e persiste somente os campos da conta', async t => {
    const consultas = simular(t, [null, conta]);
    await http('post', '/usuario/criar-conta').query({ id_usuario: 456 }).send(dados)
        .expect(200, { mensagem: 'Conta criada com sucesso' });
    filtro(consultas[0], 'id_usuario', usuario);
    assert.equal(consultas[1].operacao, 'insert');
    assert.deepEqual(consultas[1].valores, { ...dados, id_usuario: usuario });
});

for (const pesquisa of [undefined, '', 'Minha conta', '789']) {
    test(`/usuario: listagem com pesquisa=${JSON.stringify(pesquisa)}`, async t => {
        const respostas = pesquisa === '789' ? [conta, [conta]] : [[conta]];
        const consultas = simular(t, respostas);
        const query = { id_usuario: 456 };
        if (pesquisa !== undefined) query.pesquisa = pesquisa;
        const resposta = await http('get', '/usuario/listar-contas').query(query).expect(200);
        assert.deepEqual(resposta.body, [conta]);
        assert.ok(consultas.at(-1).selects[0].split(', ').includes('data_inativacao'));
        proprietario(consultas);
        if (pesquisa) {
            assert.equal(consultas.at(-1).or, pesquisa === '789'
                ? 'nome_conta.ilike.%789%,id_conta.eq.789'
                : 'nome_conta.ilike.%Minha conta%');
        }
    });
}
test('/usuario: listagem vazia', async t => {
    simular(t, [[]]);
    await http('get', '/usuario/listar-contas').expect(200, []);
});
test('/usuario: validação bloqueia dados inválidos antes de consultar o banco', async t => {
    const acesso = t.mock.method(supabase, 'from', () => { throw new Error('Validação não bloqueou'); });
    const casos = [
        ['patch', '/usuario/editar-conta', { ...dados, id_conta: 'invalido' }],
        ['patch', '/usuario/editar-conta', { ...dados, id_conta: 789, tipo_conta: 'Inexistente' }],
        ['patch', '/usuario/editar-conta', { ...dados, id_conta: 789, codigo_conta: -1 }],
        ['patch', '/usuario/editar-conta', { ...dados, id_conta: 789, id_usuario: 456 }],
        ['post', '/usuario/criar-conta', {}],
        ['post', '/usuario/criar-conta', { ...dados, nome_conta: '' }],
        ['patch', '/usuario/inativar-conta', {}],
        ['patch', '/usuario/inativar-conta', { id_conta: 1.5 }],
        ['patch', '/usuario/inativar-conta', { id_conta: 789, id_usuario: 456 }],
        ['patch', '/usuario/reativar-conta', {}],
        ['patch', '/usuario/reativar-conta', { id_conta: -1 }],
        ['patch', '/usuario/reativar-conta', { id_conta: 1.5 }],
        ['patch', '/usuario/reativar-conta', { id_conta: 'invalido' }],
        ['patch', '/usuario/reativar-conta', { id_conta: 789, id_usuario: 456 }]
    ];
    for (const [metodo, caminho, body] of casos) {
        const resposta = await http(metodo, caminho).send(body).expect(400);
        assert.equal(resposta.body.mensagem, 'Dados inválidos.');
        assert.ok(resposta.body.erros.length);
    }
    assert.equal(acesso.mock.callCount(), 0);
});

test('edição restringe leitura, duplicidade e escrita ao proprietário e confirma auditoria', async t => {
    const eventos = observarLogs(t);
    const consultas = simular(t, [conta, null, conta]);
    await http('patch', '/usuario/editar-conta').send({ ...dados, id_conta: conta.id_conta }).expect(200);
    proprietario(consultas);
    filtro(consultas[1], 'id_conta', conta.id_conta, 'neq');
    filtro(consultas[2], 'id_conta', conta.id_conta);
    assert.deepEqual(consultas[2].valores, dados);
    assert.ok(eventos.some(e => e.rota === 'USER_EDITAR_CONTA' && e.resultado === 'SUCESSO'));
});

test('inativação preserva registro, grava status e data e confirma auditoria de conta', async t => {
    const eventos = observarLogs(t);
    const consultas = simular(t, [conta, conta]);
    const inicio = Date.now();
    await http('patch', '/usuario/inativar-conta').query({ id_usuario: 456 })
        .send({ id_conta: conta.id_conta }).expect(200);
    proprietario(consultas);
    assert.equal(consultas[1].operacao, 'update');
    filtro(consultas[1], 'id_conta', conta.id_conta);
    assert.equal(consultas[1].valores.status_conta, 'Inativo');
    const dataInativacao = Date.parse(consultas[1].valores.data_inativacao);
    assert.ok(dataInativacao >= inicio && dataInativacao <= Date.now());
    assert.deepEqual(Object.keys(consultas[1].valores).sort(), ['data_inativacao', 'status_conta']);
    assert.ok(eventos.some(e => e.rota === 'USER_INATIVAR_CONTA' && e.resultado === 'SUCESSO'));
});

test('reativação usa o proprietário da sessão, limpa data de inativação e confirma auditoria', async t => {
    const eventos = observarLogs(t);
    const consultas = simular(t, [{ ...conta, status_conta: 'Inativo', data_inativacao: '2026-01-01T12:00:00.000Z' }, conta]);
    await http('patch', '/usuario/reativar-conta').query({ id_usuario: 456 })
        .send({ id_conta: conta.id_conta }).expect(200, { mensagem: 'Conta reativada com sucesso' });
    proprietario(consultas);
    consultas.forEach(consulta => filtro(consulta, 'id_conta', conta.id_conta));
    assert.ok(consultas[0].selects[0].includes('status_conta'));
    assert.equal(consultas[1].operacao, 'update');
    assert.deepEqual(consultas[1].valores, { status_conta: 'Ativo', data_inativacao: null });
    assert.ok(eventos.some(e => e.rota === 'USER_REATIVAR_CONTA' && e.resultado === 'SUCESSO'));
});

for (const [acao, statusInicial, statusFinal] of [
    ['inativar', 'Ativo', 'Inativo'],
    ['reativar', 'Inativo', 'Ativo']
]) {
    test(`/admin/${acao}-conta atualiza status e data de inativação do proprietário informado`, async t => {
        const contaAdmin = { ...conta, id_usuario: 456, status_conta: statusInicial, data_inativacao: '2026-01-01T12:00:00.000Z' };
        const consultas = simular(t, [contaAdmin, contaAdmin, contaAdmin]);
        const inicio = Date.now();
        await http('patch', `/admin/${acao}-conta`, 'Admin')
            .send({ id_conta: conta.id_conta, id_usuario: 456 }).expect(200);
        consultas.forEach(consulta => {
            filtro(consulta, 'id_conta', conta.id_conta);
            filtro(consulta, 'id_usuario', 456);
        });
        const alteracao = consultas[2];
        assert.equal(alteracao.operacao, 'update');
        assert.equal(alteracao.valores.status_conta, statusFinal);
        assert.deepEqual(Object.keys(alteracao.valores).sort(), ['data_inativacao', 'status_conta']);
        if (acao === 'inativar') {
            const dataInativacao = Date.parse(alteracao.valores.data_inativacao);
            assert.ok(dataInativacao >= inicio && dataInativacao <= Date.now());
        } else {
            assert.equal(alteracao.valores.data_inativacao, null);
        }
    });

    test(`/admin/${acao}-conta repetida não altera a data`, async t => {
        const registro = { ...conta, status_conta: statusFinal, data_inativacao: '2026-01-01T12:00:00.000Z' };
        const consultas = simular(t, [registro, registro]);
        await http('patch', `/admin/${acao}-conta`, 'Admin')
            .send({ id_conta: conta.id_conta, id_usuario: usuario }).expect(409);
        assert.ok(consultas.every(consulta => consulta.operacao === 'select'));
    });
}

for (const [acao, statusConta, mensagem] of [
    ['inativar', 'Inativo', 'Essa conta já está inativada'],
    ['reativar', 'Ativo', 'Essa conta já está Ativa']
]) {
    test(`${acao}: conta já no estado solicitado retorna 409 sem escrita`, async t => {
        const consultas = simular(t, [{ ...conta, status_conta: statusConta }]);
        await http('patch', `/usuario/${acao}-conta`).send({ id_conta: conta.id_conta })
            .expect(409, { mensagem });
        proprietario(consultas);
        assert.equal(consultas.length, 1);
        assert.equal(consultas[0].operacao, 'select');
        assert.ok(consultas[0].selects[0].includes('status_conta'));
    });
}

test('reativar: conta de outro usuário ou inexistente impede escrita', async t => {
    const consultas = simular(t, [null]);
    await http('patch', '/usuario/reativar-conta').query({ id_usuario: 456 })
        .send({ id_conta: conta.id_conta }).expect(404, { mensagem: 'Essa conta não existe' });
    proprietario(consultas);
    filtro(consultas[0], 'id_conta', conta.id_conta);
    assert.equal(consultas.length, 1);
    assert.equal(consultas[0].operacao, 'select');
});

test('reativação de conta padrão inativa segue o comportamento administrativo', async t => {
    const consultas = simular(t, [{ ...conta, nome_conta: 'padrão', status_conta: 'Inativo' }, conta]);
    await http('patch', '/usuario/reativar-conta').send({ id_conta: conta.id_conta })
        .expect(200, { mensagem: 'Conta reativada com sucesso' });
    proprietario(consultas);
    assert.equal(consultas[1].valores.status_conta, 'Ativo');
});

for (const acao of ['editar', 'inativar']) {
    for (const [descricao, resposta, status] of [
        ['conta de outro usuário ou inexistente', null, 404],
        ['conta padrão', { ...conta, nome_conta: 'padrão' }, 400]
    ]) {
        test(`${acao}: ${descricao} impede escrita`, async t => {
            const consultas = simular(t, [resposta]);
            const body = acao === 'editar' ? { ...dados, id_conta: conta.id_conta } : { id_conta: conta.id_conta };
            await http('patch', `/usuario/${acao}-conta`).send(body).expect(status);
            proprietario(consultas);
            assert.equal(consultas.length, 1);
            assert.equal(consultas[0].operacao, 'select');
        });
    }
}

test('pesquisa por ID de outro proprietário termina em 404', async t => {
    const consultas = simular(t, [null]);
    await http('get', '/usuario/listar-contas').query({ pesquisa: '789' }).expect(404);
    proprietario(consultas);
    filtro(consultas[0], 'id_conta', '789');
});

for (const [metodo, caminho, respostas, body] of [
    ['post', '/usuario/criar-conta', [conta], dados],
    ['patch', '/usuario/editar-conta', [conta, conta], { ...dados, id_conta: 789 }],
]) {
    test(`${caminho}: nome duplicado impede escrita`, async t => {
        const consultas = simular(t, respostas);
        await http(metodo, caminho).send(body).expect(409);
        assert.ok(consultas.every(c => c.operacao === 'select'));
    });
    test(`${caminho}: nome reservado impede acesso ao banco`, async t => {
        simular(t, []);
        await http(metodo, caminho)
            .send({ ...body, nome_conta: ' Padrão ' }).expect(409);
    });
}

const operacoes = [
    ['post', '/usuario/criar-conta', dados, [null, conta]],
    ['get', '/usuario/listar-contas', undefined, [[conta]]],
    ['get', '/usuario/listar-contas?pesquisa=789', undefined, [conta, [conta]]],
    ['patch', '/usuario/editar-conta', { ...dados, id_conta: 789 }, [conta, null, conta]],
    ['patch', '/usuario/inativar-conta', { id_conta: 789 }, [conta, conta]],
    ['patch', '/usuario/reativar-conta', { id_conta: 789 }, [{ ...conta, status_conta: 'Inativo' }, conta]],
];
for (const [metodo, caminho, body, respostas] of operacoes) {
    for (let etapa = 0; etapa < respostas.length; etapa++) {
        test(`${caminho}: erro no banco na etapa ${etapa + 1} retorna 500`, async t => {
            simular(t, [...respostas.slice(0, etapa), { data: null, error: { message: 'Falha simulada' } }]);
            const resposta = await http(metodo, caminho).send(body).expect(500);
            assert.ok(resposta.body.mensagem);
        });
    }
}

for (const [metodo, caminho, body, respostas] of operacoes.filter(([metodo]) => metodo === 'patch')) {
    test(`${caminho}: registro removido antes da escrita não gera falso sucesso`, async t => {
        const eventos = observarLogs(t);
        simular(t, [...respostas.slice(0, -1), null]);
        await http(metodo, caminho).send(body)
            .expect(404, { mensagem: 'Essa conta não existe' });
        assert.ok(!eventos.some(e => e.tipo_evento === 'AUDITORIA' && e.resultado === 'SUCESSO'));
    });
}
