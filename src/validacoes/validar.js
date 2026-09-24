export function validar(...schemas) {

    return (req, res, next) => {

        // Combina todos os schemas recebidos
        const schemaFinal = schemas.reduce(
            (schemaAcumulado, schemaAtual) => {
                return schemaAcumulado.concat(schemaAtual);
            }
        );

        // Valida os dados recebidos
        const { error, value } = schemaFinal.validate(
            req.body,
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

        req.body = value;

        next();

    };

}