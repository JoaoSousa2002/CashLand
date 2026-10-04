import { registrarAuditoria } from '../config/auditoria.js';

// Um evento por tentativa, incluindo respostas dos middlewares anteriores ao handler.
export function auditar(acao, obterRecursoId = () => null, exigeConfirmacao = false) {
    return (req, res, next) => {
        const contexto = res.locals.auditoria = {};
        let registrado = false;

        const registrar = (interrompida = false) => {
            if (registrado) {
                return;
            }

            registrado = true;

            try {
                const status = res.statusCode;

                let resultado;

                if (interrompida) {
                    if (contexto.resultado) {
                        resultado = contexto.resultado;
                    } else {
                        resultado = 'ERRO';
                    }
                } else if (status >= 500) {
                    resultado = 'ERRO DE SERVIDOR';
                } else if (contexto.resultado) {
                    resultado = contexto.resultado;
                } else if (status === 403 || status === 429) {
                    resultado = 'NEGADO';
                } else if (status >= 400 || status === 203) {
                    resultado = 'FALHA';
                } else if (exigeConfirmacao) {
                    resultado = 'FALHA';
                } else {
                    resultado = 'SUCESSO';
                }

                let motivo;

                if (contexto.motivo) {
                    motivo = contexto.motivo;
                } else if (interrompida) {
                    motivo = 'CONEXAO_INTERROMPIDA';
                } else if (resultado === 'ERRO') {
                    motivo = 'ERRO_INTERNO';
                } else if (status === 429) {
                    motivo = 'LIMITE_EXCEDIDO';
                } else if (status === 403) {
                    motivo = 'PERMISSAO_INSUFICIENTE';
                } else if (status === 400) {
                    motivo = 'DADOS_INVALIDOS';
                } else if (resultado === 'FALHA') {
                    motivo = 'OPERACAO_NAO_CONCLUIDA';
                }

                let usuarioId;

                if (req.usuario?.id_usuario != null) {
                    usuarioId = req.usuario.id_usuario;
                } else if (contexto.usuarioId != null) {
                    usuarioId = contexto.usuarioId;
                } else {
                    usuarioId = null;
                }

                let recursoId;

                if (contexto.recursoId != null) {
                    recursoId = contexto.recursoId;
                } else {
                    recursoId = obterRecursoId(req);
                }

                registrarAuditoria({
                    rota: acao, recursoId, resultado,
                    requestId: res.locals.requestId,
                    detalhes: {
                        motivo: motivo,
                        status_http: status,
                        resposta_interrompida: interrompida
                    }
                });
            } catch {
                // A indisponibilidade do log não altera a resposta da operação.
            }
        };

        res.once('finish', () => {
            registrar();
        });

        res.once('close', () => {
            if (!res.writableFinished) {
                registrar(true);
            }
        });

        next();
    };
}

export function confirmarAlteracao(res, registros) {
    let registro;

    if (Array.isArray(registros)) {
        registro = registros[0];
    } else {
        registro = registros;
    }

    if (registro?.id_usuario != null) {
        Object.assign(res.locals.auditoria, {
            resultado: 'SUCESSO',
            recursoId: registro.id_usuario
        });
    } else {
        Object.assign(res.locals.auditoria, {
            resultado: 'FALHA',
            motivo: 'NENHUMA_LINHA_CONFIRMADA'
        });
    }
}