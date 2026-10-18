// Ponte compartilhada pelas suítes RF06/RF07 do Python, sem Supabase remoto.
import { readFileSync } from 'node:fs';
import request from 'supertest';

// Os testes não precisam de credenciais nem acessam o Supabase real.
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_SECRET_KEY = 'chave-local-de-teste';
process.env.SEGREDO_JWT = 'segredo-local-rf06';
const { default: app } = await import('../../src/app.js');
const { default: supabase } = await import('../../src/config/supabase.js');
const { gerarToken } = await import('../../src/rf-002-Login/Autenticacao.js');
const { default: logger } = await import('../../src/config/logger.js');
const eventos = [];
const infoOriginal = logger.info.bind(logger);
logger.info = (mensagem, dados) => {
    if (dados?.tipo_evento === 'AUDITORIA') eventos.push(dados);
    return infoOriginal(mensagem, dados);
};
const entrada = JSON.parse(readFileSync(0, 'utf8'));
const banco = entrada.banco;
const consultas = [];
let ip = 0;

// Subconjunto dos filtros PostgREST usado pelas metas. Não simula SQL ou triggers.
function separarFiltros(texto) {
    const partes = [];
    let inicio = 0, nivel = 0, aspas = false, escape = false;
    for (let i = 0; i < texto.length; i++) {
        const caractere = texto[i];
        if (escape) { escape = false; continue; }
        if (aspas && caractere === '\\') { escape = true; continue; }
        if (caractere === '"') aspas = !aspas;
        if (aspas) continue;
        if (caractere === '(') nivel++;
        if (caractere === ')') nivel--;
        if (caractere === ',' && nivel === 0) {
            partes.push(texto.slice(inicio, i));
            inicio = i + 1;
        }
    }
    partes.push(texto.slice(inicio));
    return partes;
}

function avaliarFiltro(linha, filtro) {
    for (const grupo of ['and', 'or']) {
        if (filtro.startsWith(`${grupo}(`) && filtro.endsWith(')')) {
            const partes = separarFiltros(filtro.slice(grupo.length + 1, -1));
            return grupo === 'and'
                ? partes.every(parte => avaliarFiltro(linha, parte))
                : partes.some(parte => avaliarFiltro(linha, parte));
        }
    }
    const match = /^(\w+)\.(not\.is|eq|in|ilike)\.(.*)$/.exec(filtro);
    if (!match) throw new Error(`Filtro PostgREST não simulado: ${filtro}`);
    const [, campo, op, bruto] = match;
    const valor = bruto.startsWith('"') ? JSON.parse(bruto) : bruto;
    if (op === 'not.is' && valor === 'null') return linha[campo] != null;
    if (op === 'eq') return String(linha[campo]) === valor;
    if (op === 'in') return separarFiltros(valor.slice(1, -1)).includes(String(linha[campo]));
    if (op === 'ilike') return String(linha[campo]).toLowerCase().includes(valor.slice(1, -1).toLowerCase());
    throw new Error(`Operador não simulado: ${op}`);
}

supabase.from = tabela => {
    if (!Object.hasOwn(banco, tabela)) throw new Error(`Tabela inesperada: ${tabela}`);
    const registro = { tabela, operacao: 'select', filtros: [] };
    consultas.push(registro);
    let unico = false;
    let executado;
    const builder = {
        select(campos) { registro.campos = campos; return builder; },
        insert(valores) { registro.operacao = 'insert'; registro.valores = valores; return builder; },
        update(valores) { registro.operacao = 'update'; registro.valores = valores; return builder; },
        delete() { registro.operacao = 'delete'; return builder; },
        single() { unico = true; return builder; },
        maybeSingle() { unico = true; return builder; },
        or(filtro) { registro.filtros.push(['or', filtro]); return builder; },
        match(filtros) {
            for (const [campo, valor] of Object.entries(filtros)) registro.filtros.push(['eq', campo, valor]);
            return builder;
        },
        then(resolve, reject) {
            executado ??= Promise.resolve().then(() => {
                if (entrada.falha && entrada.falha.tabela === tabela && entrada.falha.operacao === registro.operacao) {
                    return { data: null, error: { message: 'Falha simulada' } };
                }
                const comConta = linha => {
                    const conta = banco.contas_bancarias.find(conta => String(conta.id_conta) === String(linha.id_conta));
                    return conta ? { ...linha, contas_bancarias: { id_usuario: conta.id_usuario } } : null;
                };
                const juntaConta = tabela === 'metas' && registro.campos?.includes('contas_bancarias!inner');
                let linhas = banco[tabela].filter(linha => {
                    const consultada = juntaConta ? comConta(linha) : linha;
                    if (!consultada) return false;
                    return registro.filtros.every(([op, campo, valor]) => {
                        if (op === 'or') return separarFiltros(campo).some(filtro => avaliarFiltro(consultada, filtro));
                        const atual = campo.split('.').reduce((objeto, chave) => objeto?.[chave], consultada);
                        if (op === 'eq') return String(atual) === String(valor);
                        if (op === 'in') return valor.map(String).includes(String(atual));
                        if (op === 'gte') return atual >= valor;
                        if (op === 'lte') return atual <= valor;
                        if (op === 'lt') return atual < valor;
                        if (op === 'ilike') return String(atual).toLowerCase().includes(valor.slice(1, -1).toLowerCase());
                        throw new Error(`Filtro inesperado: ${op}`);
                    });
                });
                if (registro.operacao === 'insert') {
                    const linha = JSON.parse(JSON.stringify(registro.valores));
                    banco[tabela].push(linha);
                    linhas = [linha];
                } else if (registro.operacao === 'update') {
                    for (const linha of linhas) Object.assign(linha, JSON.parse(JSON.stringify(registro.valores)));
                } else if (registro.operacao === 'delete') {
                    banco[tabela] = banco[tabela].filter(linha => !linhas.includes(linha));
                }
                let resultado = juntaConta ? linhas.map(comConta) : linhas;
                if (juntaConta && !registro.campos.startsWith('*')) {
                    resultado = resultado.map(linha => ({ contas_bancarias: linha.contas_bancarias }));
                }
                return { data: structuredClone(unico ? resultado[0] ?? null : resultado), error: null };
            });
            return executado.then(resolve, reject);
        }
    };
    for (const op of ['eq', 'in', 'gte', 'lte', 'lt', 'ilike']) {
        builder[op] = (campo, valor) => { registro.filtros.push([op, campo, valor]); return builder; };
    }
    return builder;
};
const respostas = [];
for (const chamada of entrada.chamadas) {
    ip++;
    let http = request(app)[chamada.metodo.toLowerCase()](chamada.caminho)
        .set('X-Forwarded-For', `198.51.${Math.floor(ip / 250)}.${ip % 250 + 1}`);
    if (chamada.usuario) http = http.set('Cookie', `token=${gerarToken(chamada.usuario)}`);
    if (chamada.query) http = http.query(chamada.query);
    if (chamada.body) http = http.send(chamada.body);
    const resposta = await http;
    respostas.push({ status: resposta.status, body: resposta.body });
}
console.log('RESULTADO_RF06=' + JSON.stringify({ respostas, consultas, banco, eventos }));
