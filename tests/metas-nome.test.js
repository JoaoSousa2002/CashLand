import './helpers/ambiente-local.js';
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import supabase from '../src/config/supabase.js';
import { gerarToken } from '../src/rf-002-Login/Autenticacao.js';

before(() => mock.method(supabase, 'from', () => {
    throw new Error('A suíte local não permite acessar o banco real');
}));
after(() => mock.restoreAll());
let ip = 0;
function http(metodo, caminho, admin = false) {
    ip += 1;
    return request(app)[metodo](caminho)
        .set('X-Forwarded-For', `192.0.2.${ip}`)
        .set('Cookie', `token=${gerarToken({ id_usuario: 123, tipo: admin ? 'Admin' : 'Comum' })}`);
}

// Banco em memória: aplica os filtros recebidos e registra qualquer escrita.
function simular(t, proprietario = 123, erroNome = false) {
    const contas = [
        { id_conta: 10, id_usuario: proprietario },
        { id_conta: 11, id_usuario: proprietario },
        { id_conta: 12, id_usuario: 789 }
    ];
    const metas = [
        { id_meta: 20, id_conta: 10, nome: 'Reserva' },
        { id_meta: 21, id_conta: 10, nome: 'Viagem' },
        { id_meta: 22, id_conta: 11, nome: 'Casa' },
        { id_meta: 23, id_conta: 12, nome: 'Carro' }
    ];
    const consultas = [];
    const escritas = [];
    t.mock.method(supabase, 'from', tabela => {
        assert.ok(['metas', 'contas_bancarias', 'usuarios'].includes(tabela));
        const consulta = { tabela, campos: [], filtros: [], limite: Infinity };
        consultas.push(consulta);
        const builder = {
            select(campos) { consulta.campos.push(campos); return builder; },
            eq(campo, valor) { consulta.filtros.push(['eq', campo, valor]); return builder; },
            neq(campo, valor) { consulta.filtros.push(['neq', campo, valor]); return builder; },
            limit(valor) { consulta.limite = valor; return builder; },
            insert(valores) { escritas.push({ operacao: 'insert', valores }); return builder; },
            update(valores) { escritas.push({ operacao: 'update', valores }); return builder; },
            async maybeSingle() {
                if (consulta.filtros.some(([, campo]) => campo === 'nome') && erroNome) {
                    return { data: null, error: { message: 'Falha simulada' } };
                }
                if (escritas.length) return { data: { id_meta: 20 }, error: null };
                let registros = tabela === 'metas'
                    ? metas.map(meta => ({ ...meta, contas_bancarias: contas.find(conta => conta.id_conta === meta.id_conta) }))
                    : tabela === 'contas_bancarias' ? contas : [{ id_usuario: proprietario, status_usuario: 'Ativo' }];
                for (const [operador, campo, valor] of consulta.filtros) {
                    registros = registros.filter(registro => {
                        const atual = campo.split('.').reduce((objeto, chave) => objeto?.[chave], registro);
                        return operador === 'eq' ? atual === valor : atual !== valor;
                    });
                }
                registros = registros.slice(0, consulta.limite);
                assert.ok(registros.length <= 1, 'Consulta deve retornar no máximo uma linha');
                return { data: registros[0] ?? null, error: null };
            }
        };
        return builder;
    });
    return { consultas, escritas };
}

function verificarConsultaNome(consultas, proprietario, nome, id_meta) {
    const consulta = consultas.find(item => item.filtros.some(([, campo]) => campo === 'nome'));
    assert.equal(consulta.tabela, 'metas');
    assert.ok(consulta.campos.includes('id_meta, contas_bancarias!inner(id_usuario)'));
    assert.deepEqual(consulta.filtros, [
        ['eq', 'contas_bancarias.id_usuario', proprietario],
        ['eq', 'nome', nome],
        ...(id_meta === undefined ? [] : [['neq', 'id_meta', id_meta]])
    ]);
    assert.equal(consulta.limite, 1);
}

for (const admin of [false, true]) {
    for (const nome of ['Viagem', 'Casa']) {
        test(`criação ${admin ? 'admin' : 'comum'}: rejeita nome ${nome} já usado pelo proprietário`, async t => {
            const { consultas, escritas } = simular(t);
            await http('post', '/usuario/criar-meta', admin)
                .send({ id_conta: 10, nome, valor_meta: 100 })
                .expect(409, { mensagem: 'Já existe uma meta com esse nome' });
            assert.equal(escritas.length, 0);
            verificarConsultaNome(consultas, 123, nome);
        });
    }
}

for (const nome of ['Nova meta', 'Carro', 'Reserva%']) {
    test(`criação permite nome disponível para o usuário: ${nome}`, async t => {
        const { consultas, escritas } = simular(t);
        await http('post', '/usuario/criar-meta').send({ id_conta: 10, nome, valor_meta: 100 }).expect(201);
        verificarConsultaNome(consultas, 123, nome);
        assert.equal(escritas.length, 1);
        assert.equal(escritas[0].valores.nome, nome);
    });
}

test('criação interrompe a operação se a consulta de nomes falhar', async t => {
    const { escritas } = simular(t, 123, true);
    await http('post', '/usuario/criar-meta').send({ id_conta: 10, nome: 'Nova meta', valor_meta: 100 }).expect(500);
    assert.equal(escritas.length, 0);
});

for (const admin of [false, true]) {
    const prefixo = admin ? 'admin' : 'usuario';
    const proprietario = admin ? 456 : 123;
    const dados = { id_meta: 20, ...(admin ? { id_usuario: proprietario } : {}) };

    for (const nome of ['Viagem', 'Casa']) {
        test(`${prefixo}: impede renomear para ${nome}, inclusive em outra conta do proprietário`, async t => {
            const { consultas, escritas } = simular(t, proprietario);
            await http('patch', `/${prefixo}/editar-meta`, admin).send({ ...dados, nome }).expect(409, {
                mensagem: 'Já existe uma meta com esse nome'
            });
            verificarConsultaNome(consultas, proprietario, nome, 20);
            assert.equal(escritas.length, 0);
        });
    }

    for (const nome of ['Reserva', 'Nova meta', 'Carro']) {
        test(`${prefixo}: permite manter o próprio nome ou usar nome disponível: ${nome}`, async t => {
            const { consultas, escritas } = simular(t, proprietario);
            await http('patch', `/${prefixo}/editar-meta`, admin).send({ ...dados, nome }).expect(200);
            verificarConsultaNome(consultas, proprietario, nome, 20);
            assert.equal(escritas.length, 1);
            assert.equal(escritas[0].valores.nome, nome);
        });
    }

    test(`${prefixo}: PATCH sem nome mantém a edição parcial`, async t => {
        const { consultas, escritas } = simular(t, proprietario);
        await http('patch', `/${prefixo}/editar-meta`, admin).send({ ...dados, descricao: 'Descrição atualizada' }).expect(200);
        assert.ok(consultas.every(consulta => consulta.filtros.every(([, campo]) => campo !== 'nome')));
        assert.equal(escritas.length, 1);
        assert.equal(escritas[0].valores.nome, undefined);
    });

    test(`${prefixo}: falha na consulta de nomes impede atualização`, async t => {
        const { escritas } = simular(t, proprietario, true);
        await http('patch', `/${prefixo}/editar-meta`, admin).send({ ...dados, nome: 'Nova meta' }).expect(500);
        assert.equal(escritas.length, 0);
    });

    test(`${prefixo}: verifica propriedade antes de consultar nomes`, async t => {
        const { consultas, escritas } = simular(t, proprietario);
        await http('patch', `/${prefixo}/editar-meta`, admin).send({ ...dados, id_meta: 23, nome: 'Casa' }).expect(404);
        assert.ok(consultas.every(consulta => consulta.filtros.every(([, campo]) => campo !== 'nome')));
        assert.equal(escritas.length, 0);
    });
}
