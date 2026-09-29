import { registrarAuditoria } from '../config/auditoria.js';

// Um evento por tentativa, incluindo respostas dos middlewares anteriores ao handler.
export function auditar(acao, obterRecursoId = () => null, exigeConfirmacao = false) {
    return (req, res, next) => {
        const contexto = res.locals.auditoria = {};
        let registrado = false;
        const registrar = (interrompida = false) => {
            if (registrado) return;
            registrado = true;
            try {
                const status = res.statusCode;
                const resultado = interrompida ? (contexto.resultado || 'ERRO')
                    : status >= 500 ? 'ERRO'
                    : contexto.resultado || (status === 403 || status === 429 ? 'NEGADO'
                        : status >= 400 || status === 203 ? 'FALHA'
                        : exigeConfirmacao ? 'FALHA' : 'SUCESSO');
                const motivo = contexto.motivo || (interrompida ? 'CONEXAO_INTERROMPIDA'
                    : resultado === 'ERRO' ? 'ERRO_INTERNO'
                    : status === 429 ? 'LIMITE_EXCEDIDO'
                    : status === 403 ? 'PERMISSAO_INSUFICIENTE'
                    : status === 400 ? 'DADOS_INVALIDOS'
                    : resultado === 'FALHA' ? 'OPERACAO_NAO_CONCLUIDA' : undefined);
                registrarAuditoria({
                    usuarioId: req.usuario?.id_usuario ?? contexto.usuarioId ?? null,
                    acao,
                    recurso: 'usuarios',
                    recursoId: contexto.recursoId ?? obterRecursoId(req),
                    resultado,
                    requestId: res.locals.requestId,
                    detalhes: { motivo, status_http: status, resposta_interrompida: interrompida }
                });
            } catch {
                // A indisponibilidade do log não altera a resposta da operação.
            }
        };
        res.once('finish', () => registrar());
        res.once('close', () => { if (!res.writableFinished) registrar(true); });
        next();
    };
}

export function confirmarAlteracao(res, registros) {
    const registro = Array.isArray(registros) ? registros[0] : registros;
    Object.assign(res.locals.auditoria, registro?.id_usuario != null
        ? { resultado: 'SUCESSO', recursoId: registro.id_usuario }
        : { resultado: 'FALHA', motivo: 'NENHUMA_LINHA_CONFIRMADA' });
}
