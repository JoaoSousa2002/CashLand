import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { gerarCodigo, normalizarEmail } from '../../src/rf-002-Cadastro_usuario/Email.js';

// Executa todo o corpo do servidor; somente as dependências importadas são substituídas.
// A aplicação mantém sua inicialização direta, sem condições específicas para testes.
const arquivo = new URL('../../src/rf-001-Login/Servidor.js', import.meta.url);
const codigo = readFileSync(arquivo, 'utf8')
  .replace(/^import .*$/gm, '')
  .replaceAll('import.meta.url', JSON.stringify(arquivo.href));

export function carregarServidor(ctx, enviarEmail) {
  const handlers = new Map();
  const limitadores = [];
  const escutas = [];
  const vazio = () => {};
  const app = {
    set: vazio, use: vazio, get: vazio, patch: vazio, delete: vazio,
    post(caminho, ...funcoes) {
      handlers.set(caminho, { limitador: funcoes[0], handler: funcoes.at(-1) });
    },
    listen(porta, callback) { escutas.push(porta); callback(); }
  };
  const Express = Object.assign(() => app, { json: vazio, static: vazio });
  runInNewContext(codigo, {
    Express, createClient: () => ctx.banco,
    criarServicoCodigos: () => ctx.codigos, gerarCodigo, normalizarEmail, enviarEmail,
    gerarHashSenha: async () => 'HASH_SENHA_TESTE',
    validarSenha: async () => true, gerarToken: vazio, verificarToken: vazio,
    cors: vazio, cookieParser: vazio, ws: class {},
    swaggerUi: { serve: vazio, setup: vazio },
    rateLimit(opcoes) {
      const middleware = Object.assign(() => {}, { opcoes });
      limitadores.push(middleware);
      return middleware;
    },
    path, fileURLToPath, readFileSync, URL,
    process: { env: {} }, console: { log: vazio, error: vazio }
  }, { filename: fileURLToPath(arquivo) });
  return { handlers, limitadores, escutas };
}
