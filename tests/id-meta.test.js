import './helpers/ambiente-local.js';
import test, { before, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';
import supabase from '../src/config/supabase.js';
import { gerarToken } from '../src/rf-002-Login/Autenticacao.js';
import { verificarMeta } from '../src/validacoes/validarTabelas.js';

// Nenhum teste desta suíte acessa o Supabase remoto.
before(() => mock.method(supabase, 'from', () => { throw new Error('Consulta não simulada'); }));
after(() => mock.restoreAll());
let sequencia = 0;
function http(metodo, rota, admin = false) {
    sequencia++;
    return request(app)[metodo](rota).set('X-Forwarded-For', `192.0.${Math.floor(sequencia / 250)}.${sequencia % 250 + 1}`)
        .set('Cookie', `token=${gerarToken({ id_usuario: 123, tipo: admin ? 'Admin' : 'Comum' })}`);
}
function simular(t, respostas) {
    const pendentes = [...respostas];
    const consultas = [];
    t.mock.method(supabase, 'from', tabela => {
        assert.ok(pendentes.length, `Consulta inesperada: ${tabela}`);
        const resposta = pendentes.shift();
        const resultado = resposta?.error ? resposta : { data: resposta, error: null };
        const registro = { tabela, operacao: 'select', filtros: [] };
        consultas.push(registro);
        const builder = {};
        for (const metodo of ['select', 'eq', 'neq', 'in', 'ilike', 'order', 'gte', 'lte', 'lt']) {
            builder[metodo] = (...args) => { registro.filtros.push([metodo, ...args]); return builder; };
        }
        for (const metodo of ['insert', 'update', 'delete']) {
            builder[metodo] = valores => { registro.operacao = metodo; registro.valores = JSON.parse(JSON.stringify(valores ?? {})); return builder; };
        }
        builder.single = builder.maybeSingle = async () => resultado;
        builder.then = (resolve, reject) => Promise.resolve(resultado).then(resolve, reject);
        return builder;
    });
    t.after(() => assert.equal(pendentes.length, 0, 'Todas as consultas previstas ocorreram'));
    return consultas;
}
function filtro(consulta, metodo, campo, valor) {
    assert.ok(consulta.filtros.some(f => f[0] === metodo && f[1] === campo && JSON.stringify(f[2]) === JSON.stringify(valor)), `Falta filtro ${campo}`);
}
const conta = { id_conta: 10, id_usuario: 123 };
const meta = { id_meta: 20, id_conta: 10, nome: 'Reserva', valor_meta: 100, valor_atual: null, status: 'Em progresso', contas_bancarias: conta };
const transacao = { id_transacao: 30, id_conta_origem: 10, id_categoria: 40, id_meta: 20, tipo_transacao: 'Entrada', status_transacao: 'Pendente' };
const recorrencia = { id_recorrencia: 50, id_usuario: 123, id_conta: 10, id_meta: 20, tipo_transacao: 'Entrada', modalidade: 'Periodico' };
const novaTransacao = { id_conta_origem: 10, id_categoria: 40, id_meta: 20, tipo_transacao: 'Entrada', nome: 'Depósito', forma_pagamento: 'PIX', valor_transacao: 10, status_transacao: 'Pago', data_transacao: '2026-10-16' };

test('verificarMeta distingue inexistência, propriedade, erro e dados autorizados', async t => {
    for (const [respostas, esperado] of [
        [[null], { existencia: false, pertencimento: false, erro: false }],
        [[{...meta, contas_bancarias:{id_usuario:456}}], { existencia: true, pertencimento: false, erro: false }],
        [[{error:{message:'falha'}}], { existencia: false, pertencimento: false, erro: true }],
        [[meta], { existencia: true, pertencimento: true, erro: false, consultaMeta:meta }]
    ]) {
        simular(t, respostas);
        assert.deepEqual(await verificarMeta(20,123), esperado);
    }
});
for (const admin of [false,true]) {
    const prefixo=admin?'admin':'usuario';
    const proprietario=admin?456:123;
    const alvo={...conta,id_usuario:proprietario};
    for (const recurso of ['transacao','recorrencia']) for (const vinculo of ['omitido',null,21]) {
        test(`${prefixo}: editar ${recurso}, meta ${vinculo} usa estado final`, async t => {
            const registro=recurso==='transacao'?transacao:recorrencia;
            const respostas=recurso==='transacao'?[{status_usuario:'Ativo'},registro,alvo]:[registro];
            if(vinculo!==null) respostas.push({...meta, contas_bancarias:alvo});
            if(recurso==='recorrencia') respostas.push({status_usuario:'Ativo'});
            respostas.push(registro);
            const consultas=simular(t,respostas);
            const body={...(recurso==='transacao'?{id_transacao:30,status_transacao:'Pago'}:{id_recorrencia:50,nome:'Novo nome'}),...(admin?{id_usuario:456}:{})};
            if(vinculo!=='omitido') body.id_meta=vinculo;
            await http('patch',`/${prefixo}/editar-${recurso}`,admin).send(body).expect(200);
            assert.equal(consultas.at(-1).valores.id_meta,vinculo==='omitido'?undefined:vinculo);
            assert.equal(consultas.at(-1).tabela,recurso==='transacao'?'transacoes':'recorrencias');
            if(recurso==='transacao') filtro(consultas.at(-1),'eq','id_conta_origem',10);
            else filtro(consultas.at(-1),'eq','id_usuario',proprietario);
        });
    }
    test(`${prefixo}: troca para Transferencia com meta omitida rejeita combinação`, async t=>{
        simular(t,[{status_usuario:'Ativo'},transacao,alvo,alvo]);
        const resposta=await http('patch',`/${prefixo}/editar-transacao`,admin).send({id_transacao:30,tipo_transacao:'Transferencia',id_conta_destino:11,...(admin?{id_usuario:456}:{})}).expect(400);
        assert.equal(resposta.body.erros[0].campo,'id_meta');
    });
    test(`${prefixo}: trocar conta revalida meta omitida`,async t=>{
        simular(t,[{status_usuario:'Ativo'},transacao,alvo,alvo,{...meta,contas_bancarias:{id_usuario:789}}]);
        await http('patch',`/${prefixo}/editar-transacao`,admin).send({id_transacao:30,id_conta_origem:11,...(admin?{id_usuario:456}:{})}).expect(404);
    });
    for(const recurso of ['transacoes','recorrencias']) {
        test(`${prefixo}: filtro por meta em ${recurso} preserva isolamento`,async t=>{
            const consultas=simular(t,recurso==='transacoes'?[[alvo],[]]:[[]]);
            await http('get',`/${prefixo}/listar-${recurso}`,admin).query({id_meta:20,id_contas:10,...(recurso==='transacoes'?{nome:'Dep',status:'Pago'}:{}),...(admin?{id_usuario:456}:{})}).expect(200,[]);
            filtro(consultas[0],'eq','id_usuario',proprietario);
            filtro(consultas.at(-1),'eq','id_meta',20);
            if(recurso==='transacoes') {filtro(consultas[1],'in','id_conta_origem',[10]);filtro(consultas[1],'eq','status_transacao','Pago');}
        });
    }
}
test('criar transação com meta de outra conta própria é permitido',async t=>{
    const consultas=simular(t,[{id_usuario:123},conta,{...meta,id_conta:11},{status_usuario:'Ativo'},transacao]);
    await http('post','/usuario/criar-transacao').send(novaTransacao).expect(201);
    assert.equal(consultas.at(-1).valores.id_meta,20);
    assert.equal(consultas.at(-1).valores.id_usuario,undefined);
});
for(const indisponivel of [null,meta]) test(`criar transação rejeita meta ${indisponivel?'de outro usuário':'inexistente'}`,async t=>{
    simular(t,[{id_usuario:123},conta,indisponivel?{...indisponivel,contas_bancarias:{id_usuario:456}}:null]);
    await http('post','/usuario/criar-transacao').send(novaTransacao).expect(404);
});
for(const modalidade of ['Parcelado','Periodico']) test(`criar recorrência ${modalidade} persiste vínculo uma única vez`,async t=>{
    const consultas=simular(t,[{id_usuario:123},conta,{status_usuario:'Ativo'},meta,recorrencia]);
    await http('post','/usuario/criar-recorrencia').send({id_conta:10,id_categoria:40,id_meta:20,tipo_transacao:'Entrada',modalidade,nome:'Reserva',forma_pagamento:'PIX',valor:100,frequencia:'Mensal',qtd_parcelas:3,data_inicio:'2026-10-16',ativo:true}).expect(201);
    assert.equal(consultas.at(-1).valores.id_meta,20);
    assert.deepEqual(consultas.filter(c=>c.operacao==='insert').map(c=>c.tabela),['recorrencias']);
});
for (const [metodo,rota,body] of [
    ['post','/usuario/criar-transacao',novaTransacao],['post','/usuario/criar-recorrencia',{}],
    ['patch','/usuario/editar-transacao',{id_transacao:30}],['patch','/usuario/editar-recorrencia',{id_recorrencia:50}],
    ['patch','/admin/editar-transacao',{id_usuario:456,id_transacao:30}],['patch','/admin/editar-recorrencia',{id_usuario:456,id_recorrencia:50}],
    ...['usuario','admin'].flatMap(p=>['transacoes','recorrencias'].map(r=>['get',`/${p}/listar-${r}`,{}]))
]) test(`${rota} rejeita id_meta zero`,async t=>{
    simular(t,[]);
    const chamada=http(metodo,rota,rota.startsWith('/admin'));
    const resposta=await (metodo==='get'?chamada.query({id_meta:0}):chamada.send({...body,id_meta:0})).expect(400);
    assert.ok(resposta.body.erros.some(e=>e.campo==='id_meta'));
});

// As rotas administrativas são exercitadas em testar_rotas.py --testes-admin-metas.
test('telas de metas estão disponíveis para usuário e administrador', async () => {
    for (const raiz of ['tela-principal', 'tela-admin']) {
        for (const pagina of ['listar-metas', 'editar-meta']) {
            await request(app).get(`/${raiz}/${pagina}`).expect(200).expect('Content-Type', /html/);
        }
    }
    await request(app).get('/tela-principal/criar-meta').expect(200).expect('Content-Type', /html/);
    // A criação administrativa e o antigo script separado não são publicados.
    await request(app).get('/tela-admin/criar-meta').expect(404);
    await request(app).get('/metas.js').expect(404);
});
