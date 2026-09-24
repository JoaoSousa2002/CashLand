import test from 'node:test';
import assert from 'node:assert/strict';
import { criarServicoCodigos, gerarCodigo, enviarEmail } from '../src/rf-002-Cadastro_usuario/Email.js';
import { carregarServidor } from './helpers/servidor-isolado.js';
import { criarBanco } from './helpers/supabase-falso.js';

const email = 'teste@example.com';
function contexto() {
  const banco = criarBanco();
  let instante = Date.parse('2026-09-23T12:00:00Z');
  const opcoes = { obterSegredo: () => 'chave-apenas-para-testes-locais', agora: () => instante };
  return { banco, opcoes, codigos: criarServicoCodigos(banco, opcoes), avancar(ms) { instante += ms; } };
}
function rotas(ctx, enviar = async () => {}) {
  const { handlers, limitadores } = carregarServidor(ctx, enviar);
  const [, limitadorCadastro, limitadorCodigo] = limitadores;
  return {
    handlers, limitadorCodigo, limitadorCadastro,
    async post(caminho, body) {
      let status = 200;
      let resultado;
      await handlers.get(caminho).handler({ body }, {
        status(valor) { status = valor; return this; },
        json(valor) { resultado = valor; return this; }
      });
      return { status, body: resultado };
    }
  };
}

test('gera seis dígitos e persiste somente HMAC, email normalizado e TTL de dez minutos', async () => {
  for (let i = 0; i < 100; i++) assert.match(gerarCodigo(), /^[1-9]\d{5}$/);
  const { banco, codigos } = contexto();
  await codigos.salvarCodigo('  TESTE@EXAMPLE.COM ', '123456', 'cadastro');
  const registro = banco.tabelas.codigos_verificacao[0];
  assert.equal(registro.email, email);
  assert.match(registro.codigo_hash, /^[a-f0-9]{64}$/);
  assert.equal('codigo' in registro, false);
  assert.equal(JSON.stringify(registro).includes('123456'), false);
  assert.equal(Date.parse(registro.expira_em) - Date.parse(registro.criado_em), 600000);
});

test('erro de digitação não escreve, apaga nem renova TTL; código correto funciona depois', async () => {
  const { banco, codigos, avancar } = contexto();
  await codigos.salvarCodigo(email, '123456', 'cadastro');
  const original = structuredClone(banco.tabelas.codigos_verificacao);
  banco.operacoes.length = 0;
  avancar(590000);
  assert.deepEqual(await codigos.validarCodigo(email, '654321', 'cadastro'), { valido: false, motivo: 'codigo incorreto' });
  assert.deepEqual(banco.tabelas.codigos_verificacao, original);
  assert.ok(banco.operacoes.every(o => o.operacao === 'select'));
  assert.equal((await codigos.validarCodigo(email, '123456', 'cadastro')).valido, true);
  assert.deepEqual(await codigos.validarCodigo(email, '123456', 'cadastro'), { valido: false, motivo: 'nenhum_codigo_solicitado' });
});

test('TTL rejeita no instante exato de expiração, mesmo sem limpeza física', async () => {
  const { banco, codigos, avancar } = contexto();
  await codigos.salvarCodigo(email, '123456', 'cadastro');
  avancar(600000);
  assert.deepEqual(await codigos.validarCodigo(email, '123456', 'cadastro'), { valido: false, motivo: 'codigo expirado' });
  assert.equal(banco.tabelas.codigos_verificacao.length, 1);
});

test('nova instância de serviço valida um código persistido anteriormente', async () => {
  const { banco, codigos, opcoes } = contexto();
  await codigos.salvarCodigo(email, '123456', 'cadastro');
  const reiniciado = criarServicoCodigos(banco, opcoes);
  assert.equal((await reiniciado.validarCodigo(email, '123456', 'cadastro')).valido, true);
});

test('reenvio substitui somente a mesma finalidade e inicia outro prazo', async () => {
  const { banco, codigos, avancar } = contexto();
  await codigos.salvarCodigo(email, '123456', 'cadastro');
  await codigos.salvarCodigo(email, '234567', 'recuperacao_senha');
  const reset = structuredClone(banco.tabelas.codigos_verificacao[1]);
  avancar(100000);
  await codigos.salvarCodigo(email, '345678', 'cadastro');
  assert.deepEqual(banco.tabelas.codigos_verificacao.find(r => r.finalidade === 'recuperacao_senha'), reset);
  assert.equal(banco.tabelas.codigos_verificacao.find(r => r.finalidade === 'cadastro').expira_em, '2026-09-23T12:11:40.000Z');
  assert.equal((await codigos.validarCodigo(email, '123456', 'cadastro')).valido, false);
  assert.equal((await codigos.validarCodigo(email, '234567', 'cadastro')).valido, false);
  assert.equal((await codigos.validarCodigo(email, '345678', 'recuperacao_senha')).valido, false);
  assert.equal((await codigos.validarCodigo(email, '345678', 'cadastro')).valido, true);
  assert.equal((await codigos.validarCodigo(email, '234567', 'recuperacao_senha')).valido, true);
});

test('HMAC depende do email, finalidade e segredo', async () => {
  const { banco, codigos, opcoes } = contexto();
  await codigos.salvarCodigo(email, '123456', 'cadastro');
  await codigos.salvarCodigo(email, '123456', 'recuperacao_senha');
  await codigos.salvarCodigo('outro@example.com', '123456', 'cadastro');
  assert.equal(new Set(banco.tabelas.codigos_verificacao.map(r => r.codigo_hash)).size, 3);
  const outro = criarServicoCodigos(banco, { ...opcoes, obterSegredo: () => 'outra-chave-de-teste' });
  assert.equal((await outro.validarCodigo(email, '123456', 'cadastro')).valido, false);
});

test('duas confirmações simultâneas consomem apenas uma vez', async () => {
  const { codigos } = contexto();
  await codigos.salvarCodigo(email, '123456', 'cadastro');
  const resultados = await Promise.all([
    codigos.validarCodigo(email, '123456', 'cadastro'),
    codigos.validarCodigo(email, '123456', 'cadastro')
  ]);
  assert.equal(resultados.filter(r => r.valido).length, 1);
});

test('TTL é recalculado entre a leitura e o DELETE', async () => {
  const banco = criarBanco();
  const inicio = Date.parse('2026-09-23T12:00:00Z');
  let consultasRelogio = 0;
  const codigos = criarServicoCodigos(banco, {
    obterSegredo: () => 'chave-apenas-para-testes-locais',
    agora: () => inicio + (++consultasRelogio >= 3 ? 600000 : 0)
  });
  await codigos.salvarCodigo(email, '123456', 'cadastro');
  assert.equal((await codigos.validarCodigo(email, '123456', 'cadastro')).valido, false);
  assert.equal(banco.tabelas.codigos_verificacao.length, 1);
  assert.ok(banco.operacoes.some(o => o.operacao === 'delete'));
});

test('confirmação não consome emissão concorrente, mesmo com código repetido', async () => {
  const { banco, codigos, avancar } = contexto();
  await codigos.salvarCodigo(email, '123456', 'cadastro');
  banco.antesDeExecutar = async consulta => {
    if (consulta.operacao !== 'delete') return;
    banco.antesDeExecutar = null;
    avancar(1000);
    await codigos.salvarCodigo(email, '123456', 'cadastro');
  };
  assert.equal((await codigos.validarCodigo(email, '123456', 'cadastro')).valido, false);
  assert.equal(banco.tabelas.codigos_verificacao.length, 1);
});

test('compensação do email não remove uma emissão posterior, mesmo com código repetido', async () => {
  const { banco, codigos } = contexto();
  const primeira = await codigos.salvarCodigo(email, '123456', 'cadastro');
  const segunda = await codigos.salvarCodigo(email, '123456', 'cadastro');
  await codigos.cancelarEmissao(primeira);
  assert.equal(banco.tabelas.codigos_verificacao[0].id, segunda.id);
});

test('segredo ausente e finalidade inválida falham antes de acessar o banco', async () => {
  const { banco } = contexto();
  const codigos = criarServicoCodigos(banco, { obterSegredo: () => '' });
  await assert.rejects(codigos.salvarCodigo(email, '123456', 'cadastro'), /SEGREDO_CODIGOS/);
  await assert.rejects(codigos.validarCodigo(email, '123456', 'login'), /Finalidade/);
  assert.equal(banco.operacoes.length, 0);
});

test('erros de persistência, leitura e consumo são infraestrutura e preservam registros', async () => {
  const { banco, codigos } = contexto();
  banco.falhar('codigos_verificacao', 'upsert');
  await assert.rejects(codigos.salvarCodigo(email, '123456', 'cadastro'), /persistir/);
  await codigos.salvarCodigo(email, '123456', 'cadastro');
  for (const operacao of ['select', 'delete']) {
    banco.falhar('codigos_verificacao', operacao);
    await assert.rejects(codigos.validarCodigo(email, '123456', 'cadastro'));
    assert.equal(banco.tabelas.codigos_verificacao.length, 1);
  }
});

test('fluxo de cadastro: solicitação, erro, correção, criação única e normalização', async () => {
  const ctx = contexto();
  let codigo;
  const api = rotas(ctx, async mensagem => { codigo = mensagem.conteudoHtml.match(/\d{6}/)?.[0] ?? codigo; });
  assert.equal((await api.post('/solicitar-codigo', { nome: 'Teste', email: ' TESTE@EXAMPLE.COM ' })).status, 200);
  const corpo = { nome: 'Teste', email, senha: 'senhaTeste123', codigoDigitado: '000000' };
  assert.equal((await api.post('/confirmar-cadastro', corpo)).status, 401);
  assert.equal(ctx.banco.tabelas.codigos_verificacao.length, 1);
  const resultados = await Promise.all([
    api.post('/confirmar-cadastro', { ...corpo, codigoDigitado: codigo }),
    api.post('/confirmar-cadastro', { ...corpo, codigoDigitado: codigo })
  ]);
  assert.deepEqual(resultados.map(r => r.status).sort(), [200, 401]);
  assert.equal(ctx.banco.tabelas.usuarios.length, 1);
  assert.equal(ctx.banco.tabelas.usuarios[0].email, email);
});

test('fluxo de recuperação: email legado com maiúsculas, erro e correção, reset encerrado', async () => {
  const ctx = contexto();
  ctx.banco.tabelas.usuarios.push({ id_usuario: 7, nome: 'Teste', email: 'Teste@Example.com', senha_hash: 'ANTIGO', status_reset_senha: true });
  let codigo;
  const api = rotas(ctx, async mensagem => { codigo = mensagem.conteudoHtml.match(/\d{6}/)[0]; });
  assert.equal((await api.post('/solicitar-reset-senha', { email: ' TESTE@EXAMPLE.COM ' })).status, 200);
  const corpo = { email: ' TESTE@EXAMPLE.COM ', codigoDigitado: '000000', novaSenha: 'senhaTeste123' };
  assert.equal((await api.post('/confirmar-reset-senha', corpo)).status, 400);
  assert.equal(ctx.banco.tabelas.usuarios[0].senha_hash, 'ANTIGO');
  assert.equal((await api.post('/confirmar-reset-senha', { ...corpo, codigoDigitado: codigo })).status, 200);
  assert.equal(ctx.banco.tabelas.usuarios[0].senha_hash, 'HASH_SENHA_TESTE');
  assert.equal(ctx.banco.tabelas.usuarios[0].status_reset_senha, false);
  assert.equal((await api.post('/confirmar-reset-senha', { ...corpo, codigoDigitado: codigo })).status, 400);
});

test('rotas não enviam email se persistência falhar e não expõem detalhes internos', async () => {
  const ctx = contexto();
  let enviados = 0;
  const api = rotas(ctx, async () => { enviados++; });
  ctx.banco.falhar('codigos_verificacao', 'upsert');
  const resultado = await api.post('/solicitar-codigo', { nome: 'Teste', email });
  assert.equal(resultado.status, 500);
  assert.equal(enviados, 0);
  assert.deepEqual(Object.keys(resultado.body), ['mensagem']);
  assert.equal(JSON.stringify(resultado).includes('DETALHE_INTERNO'), false);
});

test('falha Brevo cancela emissão; boas-vindas falhando mantém cadastro criado', async () => {
  const ctx = contexto();
  const api = rotas(ctx, async () => { throw new Error('SEGREDO_NAO_EXIBIR'); });
  assert.equal((await api.post('/solicitar-codigo', { nome: 'Teste', email })).status, 500);
  assert.equal(ctx.banco.tabelas.codigos_verificacao.length, 0);
  await ctx.codigos.salvarCodigo(email, '123456', 'cadastro');
  const resposta = await api.post('/confirmar-cadastro', { nome: 'Teste', email, senha: 'senhaTeste123', codigoDigitado: '123456' });
  assert.equal(resposta.status, 201);
  assert.equal(ctx.banco.tabelas.usuarios.length, 1);
  assert.deepEqual(Object.keys(resposta.body), ['mensagem']);
});

test('falha após consumo retorna 500 e exige novo código (operações separadas)', async () => {
  for (const finalidade of ['cadastro', 'recuperacao_senha']) {
    const ctx = contexto();
    ctx.banco.tabelas.usuarios.push({ id_usuario: 1, nome: 'Teste', email });
    await ctx.codigos.salvarCodigo(email, '123456', finalidade);
    ctx.banco.falhar('usuarios', finalidade === 'cadastro' ? 'insert' : 'update');
    const resposta = await rotas(ctx).post(finalidade === 'cadastro' ? '/confirmar-cadastro' : '/confirmar-reset-senha', {
      nome: 'Teste', email, senha: 'senhaTeste123', novaSenha: 'senhaTeste123', codigoDigitado: '123456'
    });
    assert.equal(resposta.status, 500);
    assert.equal(ctx.banco.tabelas.codigos_verificacao.length, 0);
  }
});

test('as quatro rotas preservam as instâncias de rate limit existentes', () => {
  const api = rotas(contexto());
  assert.equal(api.handlers.get('/confirmar-cadastro').limitador, api.limitadorCadastro);
  for (const caminho of ['/solicitar-codigo', '/solicitar-reset-senha', '/confirmar-reset-senha']) {
    assert.equal(api.handlers.get(caminho).limitador, api.limitadorCodigo);
  }
});

test('Brevo rejeita falha HTTP sem retornar nem registrar corpo de erro', async t => {
  let lido = false;
  t.mock.method(globalThis, 'fetch', async () => ({ ok: false, async json() { lido = true; return { segredo: 'NAO_EXIBIR' }; } }));
  await assert.rejects(enviarEmail({ destinatarioEmail: email, destinatarioNome: 'Teste', assunto: 'Teste', conteudoHtml: 'Teste' }), /Falha ao enviar email/);
  assert.equal(lido, false);
});

test('erro no consumo retorna HTTP 500 nas duas confirmações, sem alterar o usuário', async () => {
  for (const finalidade of ['cadastro', 'recuperacao_senha']) {
    const ctx = contexto();
    ctx.banco.tabelas.usuarios.push({ id_usuario: 1, nome: 'Teste', email, senha_hash: 'ORIGINAL' });
    await ctx.codigos.salvarCodigo(email, '123456', finalidade);
    ctx.banco.falhar('codigos_verificacao', 'delete');
    const resultado = await rotas(ctx).post(finalidade === 'cadastro' ? '/confirmar-cadastro' : '/confirmar-reset-senha', {
      nome: 'Teste', email, senha: 'senhaTeste123', novaSenha: 'senhaTeste123', codigoDigitado: '123456'
    });
    assert.equal(resultado.status, 500);
    assert.equal(ctx.banco.tabelas.codigos_verificacao.length, 1);
    assert.equal(ctx.banco.tabelas.usuarios.length, 1);
    assert.equal(ctx.banco.tabelas.usuarios[0].senha_hash, 'ORIGINAL');
  }
});

test('chave JWT não pode ser reutilizada para os códigos', async t => {
  const antigo = process.env.SEGREDO_JWT;
  t.after(() => {
    if (antigo === undefined) delete process.env.SEGREDO_JWT;
    else process.env.SEGREDO_JWT = antigo;
  });
  process.env.SEGREDO_JWT = 'jwt-somente-teste';
  const codigos = criarServicoCodigos(criarBanco(), { obterSegredo: () => 'jwt-somente-teste' });
  await assert.rejects(codigos.salvarCodigo(email, '123456', 'cadastro'), /chave própria/);
});

test('cliente Supabase produz upsert e DELETE condicional com todos os filtros', async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const { default: WebSocket } = await import('ws');
  let registro;
  const chamadas = [];
  const cliente = createClient('https://supabase-teste.invalid', 'chave-ficticia-de-teste', {
    auth: { persistSession: false, autoRefreshToken: false },
    realtime: { transport: WebSocket },
    global: { fetch: async (input, init) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      chamadas.push({ url, ...init });
      if (init.method === 'POST') {
        registro = JSON.parse(init.body);
        return new Response(JSON.stringify({ id: registro.id }), { status: 201 });
      }
      if (init.method === 'GET') return new Response(JSON.stringify([registro]), { status: 200 });
      if (init.method === 'DELETE') return new Response(JSON.stringify([{ id: registro.id }]), { status: 200 });
      throw new Error('Método inesperado');
    } }
  });
  const codigos = criarServicoCodigos(cliente, { obterSegredo: () => 'chave-apenas-para-testes-locais' });
  await codigos.salvarCodigo(email, '123456', 'cadastro');
  assert.equal((await codigos.validarCodigo(email, '123456', 'cadastro')).valido, true);
  assert.equal(chamadas[0].url.searchParams.get('on_conflict'), 'email,finalidade');
  const consumo = chamadas.find(c => c.method === 'DELETE').url.searchParams;
  assert.equal(consumo.get('id'), `eq.${registro.id}`);
  assert.equal(consumo.get('email'), `eq.${email}`);
  assert.equal(consumo.get('finalidade'), 'eq.cadastro');
  assert.equal(consumo.get('codigo_hash'), `eq.${registro.codigo_hash}`);
  assert.match(consumo.get('expira_em'), /^gt\.\d{4}-/);
  assert.equal(consumo.get('select'), 'id');
});

test('servidor registra as rotas diretamente e inicia a escuta ao executar o arquivo', () => {
  const { handlers, escutas } = carregarServidor(contexto(), async () => {});
  assert.equal(escutas.length, 1);
  assert.equal(escutas[0], 3000);
  for (const caminho of ['/login', '/logout', '/solicitar-codigo', '/confirmar-cadastro', '/solicitar-reset-senha', '/confirmar-reset-senha']) {
    assert.ok(handlers.has(caminho));
  }
});
