import Joi from "joi";

export const schemaIdUsuarioObrigatorio = Joi.object({
    id_usuario: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            "any.required": "O ID é obrigatório.",
            "number.base": "O ID deve ser um número válido.",
            "number.integer": "O ID deve ser um número inteiro.",
            "number.min": "O ID deve ser maior ou igual a zero."
        })
});

export const schemaIdUsuarioOpcional = Joi.object({
    id_usuario: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            "number.base": "O ID deve ser um número válido.",
            "number.integer": "O ID deve ser um número inteiro.",
            "number.min": "O ID deve ser maior ou igual a zero."
        })
});

export const schemaIdCategoriaObrigatorio = Joi.object({
    id_categoria: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            "any.required": "O ID é obrigatório.",
            "number.base": "O ID deve ser um número válido.",
            "number.integer": "O ID deve ser um número inteiro.",
            "number.min": "O ID deve ser maior ou igual a zero."
        })
});

export const schemaIdCategoriaOpcional = Joi.object({
    id_categoria: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            "number.base": "O ID deve ser um número válido.",
            "number.integer": "O ID deve ser um número inteiro.",
            "number.min": "O ID deve ser maior ou igual a zero."
        })
});

export const schemaIdSubcategoriaObrigatorio = Joi.object({
    id_subcategoria: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            "any.required": "O ID é obrigatório.",
            "number.base": "O ID deve ser um número válido.",
            "number.integer": "O ID deve ser um número inteiro.",
            "number.min": "O ID deve ser maior ou igual a zero."
        })
});

export const schemaIdSubcategoriaOpcional = Joi.object({
    id_subcategoria: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            "number.base": "O ID deve ser um número válido.",
            "number.integer": "O ID deve ser um número inteiro.",
            "number.min": "O ID deve ser maior ou igual a zero."
        })
});

// NOME
export const schemaNome = Joi.object({

    nome: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .required()
        .messages({
            "string.empty": "O nome é obrigatório.",
            "string.min": "O nome deve possuir pelo menos 3 caracteres.",
            "string.max": "O nome deve possuir no máximo 100 caracteres.",
            "any.required": "O nome é obrigatório."
        })

});

// EMAIL
export const schemaEmail = Joi.object({

    email: Joi.string()
        .trim()
        .email({
            minDomainSegments: 2,
            tlds: {
                allow: true
            }
        })
        .required()
        .messages({
            "string.empty": "O e-mail é obrigatório.",
            "string.email": "Informe um endereço de e-mail válido.",
            "any.required": "O e-mail é obrigatório."
        })

});

// SENHA
export const schemaSenha = Joi.object({

    senha: Joi.string()
        .min(10)
        .max(128)
        .required()
        .messages({
            "string.empty": "A senha é obrigatória.",
            "string.min": "A senha deve possuir pelo menos 10 caracteres.",
            "string.max": "A senha deve possuir no máximo 128 caracteres.",
            "any.required": "A senha é obrigatória."
        })

});
export const schemaNovaSenha = Joi.object({

    novaSenha: Joi.string()
        .min(10)
        .max(128)
        .required()
        .messages({
            "string.empty": "A senha é obrigatória.",
            "string.min": "A senha deve possuir pelo menos 10 caracteres.",
            "string.max": "A senha deve possuir no máximo 128 caracteres.",
            "any.required": "A senha é obrigatória."
        })

});

// CÓDIGO DE VERIFICAÇÃO
export const schemaCodigo = Joi.object({

    codigoDigitado: Joi.string()
        .pattern(/^\d{6}$/)
        .required()
        .messages({
            "string.empty": "O código é obrigatório.",
            "string.pattern.base": "O código deve possuir exatamente 6 números.",
            "any.required": "O código é obrigatório."
        })

});

export const schemaDescricaoCategoria = Joi.object({

    descricao: Joi.string()
        .trim()
        .min(3)
        .max(100)
        .allow("")
        .optional()
        .messages({
            "string.base": "A descrição deve ser um texto.",
            "string.min": "A descrição deve possuir pelo menos 3 caracteres.",
            "string.max": "A descrição deve possuir no máximo 100 caracteres."
        })

});
