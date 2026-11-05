import './helpers/ambiente-local.js';
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import app from '../src/app.js';
import supabase from '../src/config/supabase.js';
import { gerarToken } from '../src/rf-002-Login/Autenticacao.js';
import { validarPeriodoOrcamento } from '../src/validacoes/orcamentos.js';
import { observarLogs } from './helpers/auditoria.js';
import { schemaCriarOrcamento, schemaEditarOrcamento, schemaADMIN_editarOrcamento } from '../src/validacoes/usuario.js';

before(() => {
    mock.method(supabase, 'from', () => {
        throw new Error('A suíte local não permite acessar o banco configurado no .env');
    });
});
after(() => mock.restoreAll());

let numeroIP = 0;
function http(metodo, caminho, admin = false) {
    numeroIP += 1;
    let tipo = 'Comum';
    if (admin) {
        tipo = 'Admin';
    }
    return request(app)[metodo](caminho)
        .set('X-Forwarded-For', `192.0.2.${numeroIP}`)
        .set('Cookie', `token=${gerarToken({ id_usuario: 1, tipo: tipo })}`);
}

function simularConsultas(t, respostas) {
    const consultas = [];
    t.mock.method(supabase, 'from', tabela => {
        assert.ok(respostas.length, 'Consulta inesperada');
        const resposta = respostas.shift();
        const registro = { tabela: tabela, filtros: [] };
        consultas.push(registro);
        const consulta = {
            select() { return consulta; },
            eq(campo, valor) { registro.filtros.push([campo, valor]); return consulta; },
            insert(dados) { registro.operacao = 'insert'; registro.dados = dados; return consulta; },
            update(dados) { registro.operacao = 'update'; registro.dados = dados; return consulta; },
            delete() { registro.operacao = 'delete'; return consulta; },
            async maybeSingle() { return resposta; }
        };
        return consulta;
    });
    return consultas;
}

const orcamento = {
    id_orcamento: 100, id_usuario: 2, id_conta: 10, id_categoria: 30,
    tipo_periodo: 'Mensal', periodo_inicio: '2020-01-01', periodo_fim: '2020-01-31', valor_orcamento: 1000
};

test('exemplos de criação e edição no Swagger são aceitos pelos schemas existentes', () => {
    const swagger = JSON.parse(readFileSync(new URL('../docs/api/swagger.json', import.meta.url)));
    for (const [caminho, metodo, schema] of [
        ['/usuario/criar-orcamento', 'post', schemaCriarOrcamento],
        ['/usuario/editar-orcamento', 'patch', schemaEditarOrcamento],
        ['/admin/editar-orcamento', 'patch', schemaADMIN_editarOrcamento]
    ]) {
        const exemplo = swagger.paths[caminho][metodo].requestBody.content['application/json'].example;
        const resultado = schema.validate(exemplo);
        assert.equal(resultado.error, undefined);
    }
    assert.equal(swagger.paths['/admin/criar-orcamento'], undefined);
});

test('períodos atuais e próximos respeitam domingo, virada do ano e fuso de São Paulo', t => {
    t.mock.timers.enable({ apis: ['Date'], now: new Date('2027-01-01T02:30:00Z') });
    const res = {
        status(valor) { this.codigo = valor; return this; },
        json(valor) { this.body = valor; return this; }
    };
    for (const [tipo, atual, proximo] of [
        ['Semanal', '2026-12-27', '2027-01-03'],
        ['Mensal', '2026-12-01', '2027-01-01'],
        ['Anual', '2026-01-01', '2027-01-01']
    ]) {
        assert.equal(validarPeriodoOrcamento(tipo, undefined, res), atual);
        assert.equal(validarPeriodoOrcamento(tipo, atual, res), atual);
        assert.equal(validarPeriodoOrcamento(tipo, proximo, res), proximo);
        assert.equal(validarPeriodoOrcamento(tipo, '2028-01-01', res), null);
        assert.equal(res.codigo, 400);
        assert.equal(res.body.erros[0].campo, 'periodo_inicio');
    }
    t.mock.timers.setTime(new Date('2028-02-29T12:00:00Z').getTime());
    assert.equal(validarPeriodoOrcamento('Mensal', undefined, res), '2028-02-01');
    assert.equal(validarPeriodoOrcamento('Mensal', '2028-03-01', res), '2028-03-01');
    t.mock.timers.setTime(new Date('2026-11-01T03:00:00Z').getTime());
    assert.equal(validarPeriodoOrcamento('Semanal', undefined, res), '2026-11-01');
});

test('erros SQL de duplicidade e integridade têm respostas controladas sem auditoria de sucesso', async t => {
    const eventos = observarLogs(t);
    for (const [codigo, status] of [['23505', 409], ['23503', 404], ['23514', 400], ['23502', 400], ['22003', 400], ['XX000', 500]]) {
        for (const acao of ['criar', 'editar', 'admin']) {
            const respostas = [];
            let caminho = '/usuario/criar-orcamento';
            let metodo = 'post';
            let dados = { id_conta: 10, tipo_periodo: 'Mensal', valor_orcamento: 100 };
            if (acao === 'criar') {
                respostas.push({ data: { id_usuario: 1 }, error: null });
            } else {
                caminho = '/usuario/editar-orcamento';
                metodo = 'patch';
                dados = { id_orcamento: 100, descricao: 'Teste' };
                if (acao === 'admin') {
                    caminho = '/admin/editar-orcamento';
                    dados.id_usuario = 2;
                    respostas.push({ data: { status_usuario: 'Ativo' }, error: null });
                }
                respostas.push({ data: orcamento, error: null });
            }
            respostas.push({ data: null, error: { code: codigo, message: 'Informação interna que não deve ser retornada' } });
            simularConsultas(t, respostas);
            const resposta = await http(metodo, caminho, acao === 'admin').send(dados).expect(status);
            assert.equal(typeof resposta.body.mensagem, 'string');
            assert.ok(!JSON.stringify(resposta.body).includes('Informação interna'));
            assert.equal(respostas.length, 0);
        }
    }
    assert.ok(eventos.filter(e => e.tipo_evento === 'AUDITORIA').every(e => e.resultado !== 'SUCESSO'));
});

test('alteração do período valida o novo tipo e grava somente os campos enviados', async t => {
    for (const admin of [false, true]) {
        const respostas = [];
        let caminho = '/usuario/editar-orcamento';
        const dados = { id_orcamento: 100, tipo_periodo: 'Anual' };
        const hoje = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric' }).format(new Date());
        dados.periodo_inicio = `${hoje}-01-01`;
        if (admin) {
            caminho = '/admin/editar-orcamento';
            dados.id_usuario = 2;
            respostas.push({ data: { status_usuario: 'Ativo' }, error: null });
        }
        respostas.push({ data: orcamento, error: null }, { data: { id_orcamento: 100, id_usuario: 2 }, error: null });
        const consultas = simularConsultas(t, respostas);
        await http('patch', caminho, admin).send(dados).expect(200);
        const alteracao = consultas.find(c => c.operacao === 'update');
        assert.deepEqual(alteracao.dados, { tipo_periodo: 'Anual', periodo_inicio: dados.periodo_inicio });
        let proprietario = 1;
        if (admin) {
            proprietario = 2;
        }
        assert.deepEqual(alteracao.filtros, [['id_orcamento', 100], ['id_usuario', proprietario]]);
    }
});

test('período antigo permanece na edição e gravação sem linha não confirma sucesso', async t => {
    const eventos = observarLogs(t);
    for (const admin of [false, true]) {
        const respostas = [];
        let caminho = '/usuario/editar-orcamento';
        const dados = { id_orcamento: 100, tipo_periodo: 'Mensal', valor_orcamento: 300 };
        if (admin) {
            caminho = '/admin/editar-orcamento';
            dados.id_usuario = 2;
            respostas.push({ data: { status_usuario: 'Ativo' }, error: null });
        }
        respostas.push({ data: orcamento, error: null }, { data: null, error: null });
        const consultas = simularConsultas(t, respostas);
        await http('patch', caminho, admin).send(dados).expect(404);
        assert.deepEqual(consultas.at(-1).dados, { valor_orcamento: 300, tipo_periodo: 'Mensal' });
    }
    simularConsultas(t, [{ data: { id_usuario: 1 }, error: null }, { data: null, error: null }]);
    await http('post', '/usuario/criar-orcamento').send({ id_conta: 10, tipo_periodo: 'Mensal', valor_orcamento: 100 }).expect(500);
    assert.ok(eventos.filter(e => e.tipo_evento === 'AUDITORIA').every(e => e.resultado !== 'SUCESSO'));
});

test('RF008 aplica rate limit e registra a tentativa bloqueada', async t => {
    const eventos = observarLogs(t);
    const token = gerarToken({ id_usuario: 1, tipo: 'Comum' });
    for (let tentativa = 0; tentativa < 30; tentativa += 1) {
        await request(app).post('/usuario/criar-orcamento').set('X-Forwarded-For', '203.0.113.240')
            .set('Cookie', `token=${token}`).send({}).expect(400);
    }
    const bloqueio = await request(app).post('/usuario/criar-orcamento').set('X-Forwarded-For', '203.0.113.240')
        .set('Cookie', `token=${token}`).send({}).expect(429);
    assert.ok(Number(bloqueio.headers['retry-after']) > 0);
    assert.ok(eventos.some(e => e.rota === 'USER_CRIAR_ORCAMENTO' && e.resultado === 'NEGADO' && e.detalhes.status_http === 429));
});
