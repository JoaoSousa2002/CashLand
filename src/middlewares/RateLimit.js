import rateLimit from 'express-rate-limit';
import logger from '../config/logger.js';
import { obterRotaHTTP } from './LoggerHTTP.js';

function handlerRateLimit(nomeLimitador, mensagem) {
    return (req, res) => {

        if (res.locals.auditoria) {
            res.locals.auditoria.motivo =
                `RATE_LIMIT_${nomeLimitador}_EXCEDIDO`;
        }

        logger.warn('Rate limit excedido', {
            tipo_evento: 'SEGURANCA',
            evento: 'RATE_LIMIT_EXCEDIDO',
            limitador: nomeLimitador,
            request_id: res.locals.requestId,
            metodo: req.method,
            rota: obterRotaHTTP(req),
            status_http: 429
        });

        return res.status(429).json({
            mensagem
        });
    };
}

export const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // só 10 tentativas de login por IP a cada 15 min
    handler: handlerRateLimit(
        'LOGIN',
        'Muitas tentativas de login realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorSenha = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // só 10 tentativas de login por IP a cada 15 min
    handler:  handlerRateLimit(
        'CONFIRMAR_SENHA',
        'Muitas tentativas de confirmar senha realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorSolicitarCodigo = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // só 5 tentativas de login por IP a cada 15 min
    handler:  handlerRateLimit(
        'SOLICITAR_CODIGO',
        'Muitas tentativas de envio de codigo realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorVerificarCodigo = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // só 5 tentativas de login por IP a cada 5 min
    handler:  handlerRateLimit(
        'VERIFICAR_CODIGO',
        'Muitas tentativas de verificar codigo realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorGenericoSimples = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 60, // só 30 tentativas de login por IP a cada 10 min
    handler:  handlerRateLimit(
        'GENERICO_SIMPLES',
        'Muitas solicitações para essa ação realizadas. Tente novamente em 10 minutos.'
    )
});
export const limitadorGenericoCritico = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // só 5 tentativas de login por IP a cada 15 min
    handler:  handlerRateLimit(
        'GENERICO_CRITICO',
        'Muitas solicitações para essa ação realizadas. Tente novamente em 15 minutos.'
    )
});

