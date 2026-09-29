import { randomUUID } from 'node:crypto';
import logger from '../config/logger.js';

export function LoggerHTTP(req, res, next) {
    const inicio = Date.now();
    // Gerado no servidor; não confia em headers fornecidos pelo cliente.
    res.locals.requestId = randomUUID();
    res.once('finish', () => {
        try {
            const registrar = res.statusCode >= 500 ? logger.error.bind(logger) : logger.http.bind(logger);
            registrar('Requisição HTTP', {
                request_id: res.locals.requestId,
                metodo: req.method,
                // Sem query, URLs livres, headers, cookies, body ou mensagens de erro.
                rota: req.route?.path || (req.path.startsWith('/api-docs') ? '/api-docs/*' : 'ESTATICO_OU_NAO_MAPEADO'),
                status: res.statusCode,
                duracao_ms: Date.now() - inicio
            });
        } catch {
            process.stderr.write('Falha ao registrar requisição HTTP.\n');
        }
    });
    next();
}
