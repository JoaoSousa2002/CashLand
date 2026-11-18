import './helpers/ambiente-local.js';
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import supabase from '../src/config/supabase.js';
import { gerarToken } from '../src/rf-002-Login/Autenticacao.js';

// Exclusão recusada pelo banco por chave estrangeira (23503) responde 409 com o motivo;
// outros erros continuam 500. O banco é simulado.
before(() => {
    mock.method(supabase, 'from', () => {
        throw new Error('A suíte local não permite acessar o banco configurado no .env');
    });
});
after(() => mock.restoreAll());

let ip = 0;
function http(metodo, caminho, tipo) {
    ip += 1;
    return request(app)[metodo](caminho)
        .set('X-Forwarded-For', `198.51.100.${ip}`)
        .set('Cookie', `token=${gerarToken({ id_usuario: 10, tipo })}`);
}

// Consultas prévias encontram um registro válido do proprietário (o da sessão ou, no admin, o da URL); o DELETE devolve o erro informado.
function simularBanco(t, erroExclusao, dono = 10) {
    const exclusoes = [];
    const registro = {
        id_usuario: 20, id_categoria: 30, id_conta: 40, id_meta: 50, nome: 'Registro de teste', nome_conta: 'Conta de teste',
        tipo: 'Comum', status_usuario: 'Ativo', status_conta: 'Ativo', contas_bancarias: { id_usuario: dono }
    };
    t.mock.method(supabase, 'from', tabela => {
        let exclusao = false;
        const resposta = () => exclusao ? { data: null, error: erroExclusao } : { data: registro, error: null };
        const builder = {
            delete() { exclusao = true; exclusoes.push(tabela); return builder; },
            async single() { return resposta(); },
            async maybeSingle() { return resposta(); },
            then(resolve, reject) {
                const r = resposta();
                return Promise.resolve(exclusao ? r : { data: [registro], error: null }).then(resolve, reject);
            }
        };
        for (const metodo of ['select', 'eq', 'neq', 'in', 'is', 'ilike', 'or', 'order', 'limit', 'update']) builder[metodo] = () => builder;
        return builder;
    });
    return exclusoes;
}

const casos = [
    ['delete', '/usuario/deletar-categoria/30', 'Comum', 'categorias', 'Essa categoria está vinculada a transações ou recorrências e não pode ser excluída'],
    ['delete', '/admin/deletar-categoria/30/20', 'Admin', 'categorias', 'Essa categoria está vinculada a transações ou recorrências e não pode ser excluída'],
    ['delete', '/usuario/deletar-meta/50', 'Comum', 'metas', 'Essa meta está vinculada a transações ou recorrências e não pode ser excluída'],
    ['delete', '/admin/deletar-meta/50/20', 'Admin', 'metas', 'Essa meta está vinculada a transações ou recorrências e não pode ser excluída'],
    ['delete', '/admin/deletar-conta/40/20', 'Admin', 'contas_bancarias', 'Essa conta está vinculada a transações, recorrências ou metas e não pode ser excluída. Inative a conta para deixar de usá-la'],
    ['delete', '/admin/deletar-usuario/20', 'Admin', 'usuarios', 'Esse usuário possui registros financeiros vinculados e não pode ser excluído. Desative o usuário para bloquear o acesso']
];

for (const [metodo, rota, tipo, tabela, mensagem] of casos) {
    test(`${rota}: vínculo por chave estrangeira responde 409 com o motivo`, async t => {
        const exclusoes = simularBanco(t, { code: '23503', message: 'violates foreign key constraint' }, tipo === 'Admin' ? 20 : 10);
        const resposta = await http(metodo, rota, tipo);
        assert.equal(resposta.status, 409, JSON.stringify(resposta.body));
        assert.deepEqual(resposta.body, { mensagem });
        assert.deepEqual(exclusoes, [tabela]);
    });
    test(`${rota}: outro erro do banco continua 500`, async t => {
        simularBanco(t, { code: 'XX000', message: 'falha interna' }, tipo === 'Admin' ? 20 : 10);
        const resposta = await http(metodo, rota, tipo);
        assert.equal(resposta.status, 500, JSON.stringify(resposta.body));
    });
}
