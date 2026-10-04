import { randomUUID } from 'node:crypto';
import logger from '../config/logger.js';

// Routers possuem caminhos relativos; os logs continuam usando a URL da rota original.
export function obterRotaHTTP(req) {
    if (!req.route) {
        return undefined;
    }
    if (req.baseUrl && req.route.path === '/') {
        return req.baseUrl;
    }
    return (req.baseUrl || '') + req.route.path;
}

export function LoggerHTTP(req, res, next) {
    const inicio = Date.now();
    // Gerado no servidor; não confia em headers fornecidos pelo cliente.
    res.locals.requestId = randomUUID();
    res.once('finish', () => {
        try {
            let registrar = logger.http.bind(logger);
            if (res.statusCode >= 500) {
                registrar = logger.error.bind(logger);
            }
            let rota = obterRotaHTTP(req);
            if (!rota) {
                if (req.path.startsWith('/api-docs')) {
                    rota = '/api-docs/*';
                } else {
                    rota = 'ESTATICO_OU_NAO_MAPEADO';
                }
            }
            registrar('Requisição HTTP', {
                request_id: res.locals.requestId,
                metodo: req.method,
                // Sem query, URLs livres, headers, cookies, body ou mensagens de erro.
                rota,
                status: res.statusCode,
                duracao_ms: Date.now() - inicio
            });
        } catch {
            process.stderr.write('Falha ao registrar requisição HTTP.\n');
        }
    });
    next();
}
