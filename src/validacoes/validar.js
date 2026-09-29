export function validar(...schemas) {

    return (req, res, next) => {
        const origem = req.method === 'GET' || req.method === 'HEAD'
            || (req.method === 'DELETE' && Object.keys(req.body ?? {}).length === 0)
            ? 'query'
            : 'body';

        // Combina todos os schemas recebidos
        const schemaFinal = schemas.reduce(
            (schemaAcumulado, schemaAtual) => {
                return schemaAcumulado.concat(schemaAtual);
            }
        );

        // Valida os dados recebidos
        const { error, value } = schemaFinal.validate(
            req[origem] ?? {},
            {
                abortEarly: false,
                allowUnknown: false
            }
        );

        if (error) {

            const erros = error.details.map(detalhe => ({
                campo: detalhe.path.join("."),
                mensagem: detalhe.message
            }));

            return res.status(400).json({
                mensagem: "Dados inválidos.",
                erros
            });

        }

        if (origem === 'query') {
            // No Express 5, query é um getter sem setter.
            Object.defineProperty(req, 'query', {
                value,
                writable: true,
                configurable: true,
                enumerable: true
            });
        } else {
            req[origem] = value;
        }

        next();

    };

}