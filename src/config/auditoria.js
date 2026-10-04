import logger from './logger.js';

// IDs de usuários são numéricos; não permita textos livres/objetos no lugar de IDs.
function idSeguro(id) {
    return (typeof id === 'number' && Number.isSafeInteger(id) && id > 0)
        || (typeof id === 'string' && /^[1-9]\d{0,18}$/.test(id)) ? id : null;
}

export function registrarAuditoria({
    usuarioId = null,rota, recursoId = null, resultado,
    detalhes = {}, requestId = null
}) {
    try {
        logger.info('Evento de auditoria', {
            tipo_evento: 'AUDITORIA',
            id_usuario: idSeguro(usuarioId),
            ator_tipo: idSeguro(usuarioId) == null ? 'NÃO AUTENTICADO' : 'AUTENTICADO',
            rota,
            id_usuario: idSeguro(recursoId),
            resultado,
            request_id: requestId,
            // Lista permitida: nunca serialize body, credenciais ou erros brutos.
            detalhes: {
                motivo: detalhes.motivo,
                status_http: detalhes.status_http,
                resposta_interrompida: detalhes.resposta_interrompida
            }
        });
    } catch {
        // Logging é best-effort; não representa confirmação de gravação durável.
        process.stderr.write('Falha ao registrar auditoria.\n');
    }
}
