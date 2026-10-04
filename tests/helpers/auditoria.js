import logger from '../../src/config/logger.js';

// Captura os eventos sem substituir ou desativar os transportes reais.
export function observarLogs(t) {
    const eventos = [];
    for (const nivel of ['info', 'warn', 'http', 'error']) {
        const original = logger[nivel].bind(logger);
        t.mock.method(logger, nivel, (mensagem, dados) => {
            eventos.push({ nivel, mensagem, ...dados });
            return original(mensagem, dados);
        });
    }
    return eventos;
}
