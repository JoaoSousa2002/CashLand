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
export const limitadorVerificarSenha = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // só 5 tentativas de confirmar senha por IP a cada 15 min
    handler: handlerRateLimit(
        'CONFIRMAR_SENHA',
        'Muitas tentativas de confirmar senha realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorCodigo = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // só 5 tentativas de envio de código por IP a cada 15 min
    handler: handlerRateLimit(
        'SOLICITAR_CODIGO',
        'Muitas tentativas de envio de codigo realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorVerificarCodigo = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // só 10 tentativas de verificar código por IP a cada 15 min
    handler: handlerRateLimit(
        'VERIFICAR_CODIGO',
        'Muitas tentativas de verificar codigo realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorCriacao = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    handler: handlerRateLimit(
        'CRIACAO',
        'Muitas tentativas de criação de registros realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorEdicaoComum = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    handler: handlerRateLimit(
        'EDICAO_COMUM',
        'Muitas tentativas de edição de registros realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorEdicaoAdmin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    handler: handlerRateLimit(
        'EDICAO_ADMIN',
        'Muitas tentativas de edição de registros realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorListagemComum = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 120,
    handler: handlerRateLimit(
        'LISTAGEM_COMUM',
        'Muitas solicitações de listagem realizadas. Tente novamente em 10 minutos.'
    )
});
export const limitadorListagemAdmin = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 240,
    handler: handlerRateLimit(
        'LISTAGEM_ADMIN',
        'Muitas solicitações de listagem realizadas. Tente novamente em 10 minutos.'
    )
});
export const limitadorExclusaoComum = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    handler: handlerRateLimit(
        'EXCLUSAO_COMUM',
        'Muitas tentativas de exclusão de registros realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorExclusaoAdmin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    handler: handlerRateLimit(
        'EXCLUSAO_ADMIN',
        'Muitas tentativas de exclusão de registros realizadas. Tente novamente em 15 minutos.'
    )
});
export const limitadorGenericoSimples = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 60, // só 60 solicitações por IP a cada 5 min
    handler: handlerRateLimit(
        'GENERICO_SIMPLES',
        'Muitas solicitações para essa ação realizadas. Tente novamente em 5 minutos.'
    )
});
export const limitadorGenericoCritico = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // só 5 solicitações por IP a cada 15 min
    handler: handlerRateLimit(
        'GENERICO_CRITICO',
        'Muitas solicitações para essa ação realizadas. Tente novamente em 15 minutos.'
    )
});

