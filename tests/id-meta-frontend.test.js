import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Executa o JavaScript real das telas com DOM/rede simulados. Não substitui teste visual em navegador.
function tela(nome) {
    const html = readFileSync(new URL(`../src/rf-006-Gerir_transacoes_financeiras/public/${nome}`, import.meta.url), 'utf8');
    const elementos = new Map();
    function elemento(id = '', tag = 'div') {
        return {
            id, tag, value: '', textContent: '', disabled: false, hidden: false, style: {}, dataset: {}, children: [], eventos: {},
            addEventListener(tipo, fn) { this.eventos[tipo] = fn; },
            setAttribute() {}, removeAttribute() {}, focus() {},
            replaceChildren(...itens) { this.children = itens; },
            appendChild(item) { this.children.push(item); },
            append(...itens) { this.children.push(...itens); },
            add(item) { this.children.push(item); },
            get options() { return this.children; },
            querySelectorAll(seletor) { return seletor === 'input, select, textarea'
                ? [...elementos.values()].filter(e => ['input','select','textarea'].includes(e.tag)) : []; }
        };
    }
    for (const match of html.matchAll(/<(\w+)\b[^>]*\bid="([^"]+)"[^>]*>/g)) elementos.set(match[2], elemento(match[2],match[1]));
    const requisicoes = [];
    const contexto = vm.createContext({
        document: { getElementById(id) { assert.ok(elementos.has(id), `Elemento ausente: ${id}`); return elementos.get(id); },
            createElement: tag => elemento('',tag), querySelectorAll: () => [] },
        location: { search:'',href:'' }, URLSearchParams, console,
        fetch: async (url, opcoes) => { requisicoes.push({url,opcoes}); return {status:400,json:async()=>({mensagem:'Erro simulado'})}; },
        atualizarSaldoUsuario() {}, Option: function(texto,valor){return {textContent:texto,value:String(valor)};}
    });
    const codigo = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1].replace(/\n\s*iniciar\(\);\s*$/,'').replace(/\n\s*atualizarModo\(\);\s*$/,'');
    vm.runInContext(codigo, contexto, {filename:nome});
    return { contexto, elementos, requisicoes, executar: codigo => vm.runInContext(codigo,contexto) };
}
for (const admin of [false,true]) for (const modo of ['transacao','recorrencia']) {
    test(`tela ${admin?'admin':'usuário'} ${modo}: serializa vínculo inteiro, remoção null e omissão`,()=>{
        const t=tela(`${admin?'ADMIN_':''}editar-transacao.html`);
        t.executar(`modo='${modo}'; chaveId='id_${modo}'; idRegistro=30; ${admin?'idUsuario=456;':''}
            registro={id_meta:20,tipo_transacao:'Entrada',status_transacao:'Pendente'};
            sessaoPronta=true; registroPronto=true; listasProntas=true; preencherCampos(); atualizarCampos();`);
        assert.equal(t.executar('coletarDados().id_meta'),undefined);
        t.elementos.get('id_meta').value='21';
        assert.equal(t.executar('coletarDados().id_meta'),21);
        t.elementos.get('id_meta').value='';
        assert.equal(t.executar('coletarDados().id_meta'),null);
        t.elementos.get('id_meta').disabled=true;
        assert.equal(t.executar('coletarDados().id_meta'),undefined);
    });
}
test('PAGAR mantém payload mínimo mesmo com alteração não salva da meta',async()=>{
    const t=tela('editar-transacao.html');
    t.executar(`modo='transacao'; chaveId='id_transacao'; idRegistro=30;
        registro={id_meta:20,status_transacao:'Pendente',tipo_transacao:'Entrada'};
        sessaoPronta=true; registroPronto=true; listasProntas=true; preencherCampos(); atualizarCampos();`);
    t.elementos.get('id_meta').value='21';
    await t.executar('salvarAlteracoes(true)');
    assert.equal(t.requisicoes.length,1);
    const payload=JSON.parse(t.requisicoes[0].opcoes.body);
    assert.deepEqual(Object.keys(payload).sort(),['data_pagamento','id_transacao','status_transacao']);
    assert.equal(payload.status_transacao,'Pago');
    assert.equal(t.requisicoes[0].opcoes.credentials,'include');
});
for(const admin of [false,true]) {
    test(`tela ${admin?'admin':'usuário'}: carrega edição e preserva o vínculo pelo ID da meta`,async()=>{
        const t=tela(`${admin?'ADMIN_':''}editar-transacao.html`);
        t.executar(`modo='transacao'; chaveId='id_transacao'; idRegistro=30; ${admin?'idUsuario=456;':''}
            sessaoPronta=true;`);
        const rotas=[];
        t.contexto.fetch=async url=>{
            rotas.push(url);
            assert.ok(!url.includes('meta'), 'O campo numérico não precisa listar metas para preservar o vínculo');
            return {status:200,json:async()=>url.includes('listar-transacoes')
                ? [{id_transacao:30,id_meta:20,tipo_transacao:'Entrada',status_transacao:'Pendente',id_usuario:456}]
                : []};
        };
        await t.executar('carregarDados()');
        assert.equal(rotas.length,3);
        assert.equal(t.elementos.get('id_meta').tag,'input');
        assert.equal(t.elementos.get('id_meta').value,'20');
        assert.equal(t.elementos.get('id_meta').disabled,false);
        assert.equal(t.elementos.get('salvar').disabled,false);
        assert.equal(t.executar('coletarDados().id_meta'),undefined);
    });
    test(`listagem ${admin?'admin':'usuário'}: filtro de meta combina com contas nos dois modos`,()=>{
        const t=tela(`${admin?'ADMIN_':''}listar-transacoes.html`);
        t.executar("filtrosAplicados={id_meta:'20',id_contas:['10']};");
        for(const modo of ['Transacoes','Recorrencias']) {
            t.executar(`modo='${modo}'`);
            const query=t.executar('montarParametros().toString()');
            assert.equal(new URLSearchParams(query).get('id_meta'),'20');
            assert.equal(new URLSearchParams(query).get('id_contas'),'10');
        }
    });
}
