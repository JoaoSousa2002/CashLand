import { accessSync, constants, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import WebSocket from 'ws';

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

function localizarNavegador() {
    const candidatos = process.env.BROWSER_BIN ? [process.env.BROWSER_BIN] : [
        ...['chromium', 'chromium-browser', 'google-chrome', 'brave-browser'].flatMap(nome =>
            (process.env.PATH || '').split(path.delimiter).map(pasta => path.join(pasta, nome))),
        '/opt/brave.com/brave/brave',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    ];
    for (const candidato of candidatos) {
        try { accessSync(candidato, constants.X_OK); return candidato; } catch { /* Tenta o próximo. */ }
    }
    throw new Error('Instale Chromium, Chrome ou Brave, ou informe BROWSER_BIN com o caminho do executável.');
}

// Perfil temporário e porta aleatória: não usa abas, cookies ou sessões do navegador pessoal.
export async function abrirNavegador(origemPermitida) {
    const executavel = localizarNavegador();
    const perfil = mkdtempSync(path.join(tmpdir(), 'cashland-browser-'));
    const processo = spawn(executavel, [
        '--headless', '--disable-gpu', '--disable-dev-shm-usage', '--no-first-run',
        '--no-default-browser-check', '--disable-background-networking',
        '--remote-debugging-port=0', '--remote-debugging-address=127.0.0.1',
        `--user-data-dir=${perfil}`,
        ...(process.env.BROWSER_NO_SANDBOX === '1' ? ['--no-sandbox'] : []),
        'about:blank'
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    let diagnostico = '';
    processo.stderr.on('data', dados => { diagnostico = (diagnostico + dados).slice(-4000); });
    processo.on('error', erro => { diagnostico += erro.message; });
    let socket;
    let sequencia = 0;
    const pendentes = new Map();
    const erros = [];

    async function fechar() {
        // Alguns launchers encerram o processo pai e deixam Chromium em um processo filho.
        // O protocolo fecha a instância do perfil temporário também nesse caso.
        if (socket?.readyState === WebSocket.OPEN) {
            await enviar('Browser.close').catch(() => {});
        }
        socket?.terminate();
        for (const { rejeitar, timer } of pendentes.values()) {
            clearTimeout(timer);
            rejeitar(new Error('Navegador encerrado'));
        }
        pendentes.clear();
        if (processo.exitCode === null && processo.signalCode === null) {
            const encerrado = once(processo, 'exit').catch(() => {});
            processo.kill('SIGTERM');
            await Promise.race([encerrado, esperar(2000)]);
            if (processo.exitCode === null && processo.signalCode === null) {
                processo.kill('SIGKILL');
                await encerrado;
            }
        }
        rmSync(perfil, { recursive: true, force: true, maxRetries: 3 });
    }

    function enviar(method, params = {}) {
        return new Promise((resolver, rejeitar) => {
            const id = ++sequencia;
            const timer = setTimeout(() => {
                pendentes.delete(id);
                rejeitar(new Error(`Tempo esgotado no navegador: ${method}`));
            }, 15000);
            pendentes.set(id, { resolver, rejeitar, timer });
            socket.send(JSON.stringify({ id, method, params }));
        });
    }

    try {
        let porta;
        for (let tentativa = 0; tentativa < 150; tentativa++) {
            try { porta = Number(readFileSync(path.join(perfil, 'DevToolsActivePort'), 'utf8').split('\n')[0]); } catch { /* Inicializando. */ }
            if (porta) break;
            if ((processo.exitCode !== null && processo.exitCode !== 0) || processo.signalCode !== null) break;
            await esperar(100);
        }
        if (!porta) throw new Error(`Não foi possível iniciar o navegador: ${diagnostico}`);
        const pagina = await (await fetch(`http://127.0.0.1:${porta}/json/new`, { method: 'PUT' })).json();
        socket = new WebSocket(pagina.webSocketDebuggerUrl);
        await once(socket, 'open');
        socket.on('message', texto => {
            const mensagem = JSON.parse(texto);
            if (mensagem.id) {
                const chamada = pendentes.get(mensagem.id);
                if (!chamada) return;
                clearTimeout(chamada.timer);
                pendentes.delete(mensagem.id);
                if (mensagem.error) chamada.rejeitar(new Error(JSON.stringify(mensagem.error)));
                else chamada.resolver(mensagem.result);
            } else if (mensagem.method === 'Runtime.exceptionThrown') {
                const detalhe = mensagem.params.exceptionDetails;
                erros.push(detalhe.exception?.description || detalhe.text);
            } else if (mensagem.method === 'Fetch.requestPaused') {
                const { requestId, request } = mensagem.params;
                const permitido = new URL(request.url).origin === origemPermitida;
                if (!permitido) erros.push(`Requisição externa bloqueada: ${request.url}`);
                enviar(permitido ? 'Fetch.continueRequest' : 'Fetch.failRequest', {
                    requestId, ...(!permitido ? { errorReason: 'BlockedByClient' } : {})
                }).catch(erro => erros.push(erro.message));
            }
        });
        await enviar('Page.enable');
        await enviar('Runtime.enable');
        await enviar('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
        return { enviar, fechar, erros };
    } catch (erro) {
        await fechar();
        throw erro;
    }
}
