// Ponte para os testes Python: executa o Express real com Supabase em memória.
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
        then(resolve, reject) {
            executado ??= Promise.resolve().then(() => {
                if (entrada.falha && entrada.falha.tabela === tabela && entrada.falha.operacao === registro.operacao) {
                    return { data: null, error: { message: 'Falha simulada' } };
                }
                let linhas = banco[tabela].filter(linha => registro.filtros.every(([op, campo, valor]) => {
                    const atual = linha[campo];
                    if (op === 'eq') return String(atual) === String(valor);
                    if (op === 'in') return valor.map(String).includes(String(atual));
                    if (op === 'gte') return atual >= valor;
                    if (op === 'lte') return atual <= valor;
                    if (op === 'lt') return atual < valor;
                    if (op === 'ilike') return String(atual).toLowerCase().includes(valor.slice(1, -1).toLowerCase());
                    throw new Error(`Filtro inesperado: ${op}`);
                }));
                if (registro.operacao === 'insert') {
                    const linha = JSON.parse(JSON.stringify(registro.valores));
                    banco[tabela].push(linha);
                    linhas = [linha];
                } else if (registro.operacao === 'update') {
                    for (const linha of linhas) Object.assign(linha, JSON.parse(JSON.stringify(registro.valores)));
                } else if (registro.operacao === 'delete') {
                    banco[tabela] = banco[tabela].filter(linha => !linhas.includes(linha));
                }
                return { data: structuredClone(unico ? linhas[0] ?? null : linhas), error: null };
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
