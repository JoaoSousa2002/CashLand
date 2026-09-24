// Execução explícita: node tests/integracao/codigos-supabase.js --executar
// Grava somente em codigos_verificacao, sob um email UUID exclusivo, e limpa no finally.
import 'dotenv/config';
import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { criarServicoCodigos, gerarCodigo } from '../../src/rf-002-Cadastro_usuario/Email.js';

const filho = process.argv.includes('--validar-reinicio');
if (!filho && !process.argv.includes('--executar')) {
  console.log('Para testar a tabela real, execute com --executar.');
  process.exit(0);
}

function conferir(condicao, mensagem) {
  if (!condicao) throw new Error(mensagem);
}
function conferirBanco(resultado, operacao) {
  if (resultado.error) {
    const codigo = /^[A-Z0-9]+$/.test(resultado.error.code ?? '') ? resultado.error.code : 'indisponível';
    throw new Error(`${operacao}: operação recusada ou indisponível (${codigo})`);
  }
  return resultado.data;
}

async function executar() {
  conferir(process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY, 'Configure o acesso Supabase do backend');
  const cliente = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
    global: { fetch: (url, opcoes) => fetch(url, { ...opcoes, signal: AbortSignal.timeout(15000) }) }
  });
  const configurado = Boolean(process.env.SEGREDO_CODIGOS?.trim());
  const segredo = process.env.CASHLAND_TEST_SECRET ?? (configurado ? process.env.SEGREDO_CODIGOS : randomBytes(32).toString('hex'));
  const email = filho ? process.env.CASHLAND_TEST_EMAIL : `codex-ttl-${randomUUID()}@example.invalid`;
  let instante = Date.now();
  const servico = criarServicoCodigos(cliente, { obterSegredo: () => segredo, agora: () => instante });
  if (filho) {
    const resultado = await servico.validarCodigo(email, process.env.CASHLAND_TEST_CODE, 'cadastro');
    conferir(resultado.valido, 'Código persistido não foi validado no novo processo');
    console.log('REINICIO_OK');
    return;
  }

  let total = 0;
  let limpezaAutorizada = false;
  const passou = nome => { total++; console.log(`OK ${total}: ${nome}`); };
  const linhas = async () => conferirBanco(await cliente.from('codigos_verificacao')
    .select('id,email,finalidade,codigo_hash,criado_em,expira_em').eq('email', email), 'Leitura dos registros de teste');
  const salvar = (codigo, finalidade = 'cadastro') => servico.salvarCodigo(email, codigo, finalidade);
  const validar = (codigo, finalidade = 'cadastro') => servico.validarCodigo(email, codigo, finalidade);
  try {
    conferir((await linhas()).length === 0, 'Identificador de teste já existe; execução cancelada');
    limpezaAutorizada = true;
    passou('permissão de leitura no banco real');
    console.log(configurado ? 'SEGREDO_CODIGOS: configurado no ambiente local.' : 'SEGREDO_CODIGOS: ausente; teste usa chave efêmera apenas em memória.');

    const codigo = gerarCodigo();
    await servico.salvarCodigo(` ${email.toUpperCase()} `, codigo, 'cadastro');
    const original = (await linhas())[0];
    conferir(original?.email === email, 'Email não foi normalizado');
    conferir(Date.parse(original.expira_em) - Date.parse(original.criado_em) === 600000, 'TTL diferente de dez minutos');
    const hmac = createHmac('sha256', segredo).update(JSON.stringify(['cadastro', email, codigo])).digest('hex');
    conferir(original.codigo_hash === hmac && original.codigo_hash !== codigo, 'HMAC persistido diverge do esperado');
    passou('gravação, HMAC, normalização e TTL de dez minutos');

    conferir((await validar('000000')).motivo === 'codigo incorreto', 'Código incorreto não foi recusado corretamente');
    conferir(JSON.stringify((await linhas())[0]) === JSON.stringify(original), 'Erro de digitação alterou o registro');
    passou('erro de digitação preserva ID, hash e timestamps');
    conferir((await validar(codigo)).valido, 'Código correto foi invalidado pelo erro anterior');
    conferir((await linhas()).length === 0, 'Consumo não removeu o registro');
    conferir(!(await validar(codigo)).valido, 'Código aceito pela segunda vez');
    passou('correção após erro e uso único');

    await salvar(codigo);
    const reiniciado = await promisify(execFile)(process.execPath, [fileURLToPath(import.meta.url), '--validar-reinicio'], {
      timeout: 30000,
      env: { ...process.env, CASHLAND_TEST_SECRET: segredo, CASHLAND_TEST_EMAIL: email, CASHLAND_TEST_CODE: codigo }
    }).catch(() => { throw new Error('Falha no teste de validação em outro processo'); });
    conferir(reiniciado.stdout.trim() === 'REINICIO_OK', 'Novo processo não confirmou a validação');
    conferir((await linhas()).length === 0, 'Novo processo não consumiu o registro');
    passou('persistência entre processos Node.js independentes');

    await salvar(codigo);
    const expirado = (await linhas())[0];
    const expiraEm = new Date(instante - 1000).toISOString();
    conferirBanco(await cliente.from('codigos_verificacao').update({
      criado_em: new Date(instante - 601000).toISOString(), expira_em: expiraEm
    }).eq('id', expirado.id).eq('email', email), 'Preparação de expiração apenas no registro de teste');
    conferir((await validar(codigo)).motivo === 'codigo expirado', 'Registro expirado foi aceito');
    conferir((await linhas())[0]?.id === expirado.id, 'Registro expirado não permaneceu para comprovar ausência de limpeza');
    passou('expiração rejeitada com registro ainda presente, sem tarefa de limpeza');

    instante = Date.now();
    await salvar(codigo);
    const primeira = (await linhas())[0];
    let novoCodigo;
    do { novoCodigo = gerarCodigo(); } while (novoCodigo === codigo);
    instante += 1000;
    await salvar(novoCodigo);
    const reenvio = await linhas();
    conferir(reenvio.length === 1 && reenvio[0].id !== primeira.id, 'Reenvio não substituiu a emissão');
    conferir(Date.parse(reenvio[0].expira_em) > Date.parse(primeira.expira_em), 'Reenvio não renovou o prazo');
    conferir(!(await validar(codigo)).valido && (await validar(novoCodigo)).valido, 'Substituição do código incorreta');
    passou('restrição de conflito (email, finalidade), substituição e renovação do TTL');

    await salvar(codigo, 'cadastro');
    await salvar(novoCodigo, 'recuperacao_senha');
    conferir((await linhas()).length === 2, 'Finalidades não coexistem');
    conferir(!(await validar(codigo, 'recuperacao_senha')).valido, 'Código de cadastro validou recuperação');
    conferir(!(await validar(novoCodigo, 'cadastro')).valido, 'Código de recuperação validou cadastro');
    conferir((await validar(codigo, 'cadastro')).valido && (await validar(novoCodigo, 'recuperacao_senha')).valido, 'Finalidades interferiram nos códigos válidos');
    passou('finalidades independentes e códigos não intercambiáveis');

    await salvar(codigo);
    const concorrentes = await Promise.all(Array.from({ length: 5 }, () => validar(codigo)));
    conferir(concorrentes.filter(r => r.valido).length === 1, 'Consumo concorrente permitiu zero ou múltiplos sucessos');
    passou('cinco confirmações simultâneas: exatamente um sucesso');

    const antiga = await salvar(codigo);
    const atual = await salvar(codigo);
    await servico.cancelarEmissao(antiga);
    conferir((await linhas())[0]?.id === atual.id, 'Compensação antiga removeu a emissão posterior');
    await servico.cancelarEmissao(atual);
    conferir((await linhas()).length === 0, 'Cancelamento da emissão atual falhou');
    passou('compensação por UUID preserva reenvio concorrente');

    // Persiste uma emissão válida; avança somente o relógio do serviço entre SELECT e DELETE.
    const base = Date.now();
    let chamadasRelogio = 0;
    const transicao = criarServicoCodigos(cliente, {
      obterSegredo: () => segredo,
      agora: () => base + (++chamadasRelogio >= 3 ? 600000 : 0)
    });
    await transicao.salvarCodigo(email, codigo, 'cadastro');
    conferir(!(await transicao.validarCodigo(email, codigo, 'cadastro')).valido, 'Filtro do DELETE aceitou código no limite de expiração');
    conferir((await linhas()).length === 1, 'DELETE removeu código vencido entre as verificações');
    passou('DELETE revalida validade no limite exato dos dez minutos');
  } finally {
    if (limpezaAutorizada) {
      conferirBanco(await cliente.from('codigos_verificacao').delete().eq('email', email), 'Limpeza dos registros exclusivos desta execução');
      conferir((await linhas()).length === 0, 'Restaram registros desta execução');
      console.log('LIMPEZA OK: nenhum registro desta execução permanece na tabela.');
    }
  }
  console.log(`RESULTADO: ${total} verificações no Supabase passaram.`);
}

executar().catch(error => {
  // Não imprimir objetos de erro do SDK nem diffs com códigos, hashes ou credenciais.
  const mensagem = error.message;
  const segura = !/https?:\/\/|Bearer|eyJ|sb_secret_/i.test(mensagem);
  console.error(segura ? mensagem : 'Falha de infraestrutura durante o teste; detalhes omitidos.');
  process.exitCode = 1;
});
