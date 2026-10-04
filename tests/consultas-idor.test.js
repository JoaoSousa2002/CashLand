import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import supabase from '../src/config/supabase.js';
import { gerarToken } from '../src/rf-001-Login/Autenticacao.js';

// Testes de regressão das consultas. O banco é simulado; E2E reais ficam em idor.test.js.
before(() => {
    mock.method(supabase, 'from', () => {
        throw new Error('A suíte local não permite acessar o banco configurado no .env');
    });
});
after(() => mock.restoreAll());
const ator = 123;
const outroUsuario = 456;
const categoria = 789;
let ip = 0;

function http(metodo, caminho) {
    ip += 1;
    return request(app)[metodo](caminho)
        .set('X-Forwarded-For', `203.0.113.${ip}`)
        .set('Cookie', `token=${gerarToken({ id_usuario: ator, tipo: 'Comum' })}`);
}

function simularConsultas(t, respostas) {
    const consultas = [];
    t.mock.method(supabase, 'from', tabela => {
        assert.ok(respostas.length, 'Consulta inesperada');
        const data = respostas.shift();
        const registro = { tabela, filtros: [], operacao: 'select' };
        consultas.push(registro);
        const builder = {
            select() { return builder; },
            eq(campo, valor) { registro.filtros.push([campo, valor]); return builder; },
            neq() { return builder; },
            ilike() { return builder; },
            order() { return builder; },
            or() { return builder; },
            update(valores) { registro.operacao = 'update'; registro.valores = valores; return builder; },
            delete() { registro.operacao = 'delete'; return builder; },
            async single() { return { data, error: null }; },
            async maybeSingle() { return { data, error: null }; },
            then(resolve, reject) { return Promise.resolve({ data, error: null }).then(resolve, reject); }
        };
        return builder;
    });
    return consultas;
}

function verificarProprietario(consultas) {
    assert.ok(consultas.length > 0);
    for (const consulta of consultas) {
        assert.ok(consulta.filtros.some(([campo, valor]) => campo === 'id_usuario' && valor === ator),
            `Consulta ${consulta.operacao} precisa restringir o usuário autenticado`);
    }
}

test('edição de categoria restringe consulta, duplicidade e UPDATE ao proprietário', async t => {
    const consultas = simularConsultas(t, [{ id_categoria: categoria, nome: 'Categoria própria' }, null, { id_categoria: categoria }]);
    await http('patch', '/usuario/editar-categoria')
        .send({ id_categoria: categoria, nome: 'Nome atualizado', descricao: '' })
        .expect(200, { mensagem: 'Categoria atualizada com sucesso.' });
    verificarProprietario(consultas);
    const alteracao = consultas.find(c => c.operacao === 'update');
    assert.ok(alteracao.filtros.some(([campo, valor]) => campo === 'id_categoria' && valor === categoria));
});

test('exclusão de categoria restringe consulta e DELETE ao proprietário', async t => {
    const consultas = simularConsultas(t, [{ id_categoria: categoria, nome: 'Categoria própria' }, { nome: 'Categoria própria' }]);
    await http('delete', `/usuario/deletar-categoria/${categoria}`).expect(200, { mensagem: 'Categoria deletada com sucesso' });
    verificarProprietario(consultas);
    assert.equal(consultas[1].operacao, 'delete');
    assert.ok(consultas[1].filtros.some(([campo, valor]) => campo === 'id_categoria' && valor === categoria));
});

test('categoria não pertencente ao usuário resulta em 404 antes de qualquer escrita', async t => {
    for (const metodo of ['patch', 'delete']) {
        const consultas = simularConsultas(t, [null]);
        let chamada;
        if (metodo === 'patch') {
            chamada = http(metodo, '/usuario/editar-categoria').send({ id_categoria: categoria, nome: 'Nome indevido' });
        } else {
            chamada = http(metodo, `/usuario/deletar-categoria/${categoria}`);
        }
        await chamada.expect(404, { mensagem: 'Essa categoria não existe' });
        verificarProprietario(consultas);
        assert.equal(consultas.length, 1);
        assert.equal(consultas[0].operacao, 'select');
    }
});

test('listagem por nome, por ID e sem pesquisa sempre restringe o proprietário', async t => {
    for (const pesquisa of [undefined, 'Nome conhecido de B', String(categoria)]) {
        const respostas = [];
        if (pesquisa === String(categoria)) {
            respostas.push({ id_categoria: categoria });
        }
        respostas.push([]);
        const consultas = simularConsultas(t, respostas);
        const query = { id_usuario: outroUsuario };
        if (pesquisa !== undefined) query.pesquisa = pesquisa;
        await http('get', '/usuario/listar-categoria').query(query).expect(200, []);
        verificarProprietario(consultas);
    }
});

test('atualização e auto-desativação usam o ID da sessão em todas as escritas', async t => {
    let consultas = simularConsultas(t, [{ id_usuario: ator }]);
    await http('patch', '/usuario/atualizar-dados').query({ id_usuario: outroUsuario })
        .send({ nome: 'Nome do proprio usuario' }).expect(200);
    verificarProprietario(consultas);
    consultas = simularConsultas(t, [{ status_usuario: 'Ativo', nome: 'Usuario A' }, [{ id_usuario: ator }]]);
    await http('patch', '/usuario/desativar-usuario').query({ id_usuario: outroUsuario })
        .send({ id_usuario: outroUsuario }).expect(200);
    verificarProprietario(consultas);
    assert.equal(consultas[1].operacao, 'update');
    assert.equal(consultas[1].valores.status_usuario, 'Inativo');
});
