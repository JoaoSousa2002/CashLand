import Joi from "joi";

export const schemaIdUsuarioObrigatorio = Joi.object({
    id_usuario: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            "any.required": "O ID do usuario é obrigatório.",
            "number.base": "O ID do usuario deve ser um número válido.",
            "number.integer": "O ID do usuario deve ser um número inteiro.",
            "number.min": "O ID do usuario deve ser maior ou igual a zero."
        })
});

export const schemaIdUsuarioOpcional = Joi.object({
    id_usuario: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            "number.base": "O ID do usuario deve ser um número válido.",
            "number.integer": "O ID do usuario deve ser um número inteiro.",
            "number.min": "O ID do usuario deve ser maior ou igual a zero."
        })
});

export const schemaIdCategoriaObrigatorio = Joi.object({
    id_categoria: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            "any.required": "O ID da categoria é obrigatório.",
            "number.base": "O ID da categoria deve ser um número válido.",
            "number.integer": "O ID da categoria deve ser um número inteiro.",
            "number.min": "O ID da categoria deve ser maior ou igual a zero."
        })
});

export const schemaIdCategoriaOpcional = Joi.object({
    id_categoria: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            "number.base": "O ID da categoria deve ser um número válido.",
            "number.integer": "O ID da categoria deve ser um número inteiro.",
            "number.min": "O ID da categoria deve ser maior ou igual a zero."
        })
});



export const schemaFiltroUsuario = Joi.object({
    id_usuario: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            "number.base": "O ID do usuário deve ser um número válido.",
            "number.integer": "O ID do usuário deve ser um número inteiro.",
            "number.min": "O ID do usuário não pode ser menor que zero."
        }),

    pesquisa: Joi.any()
        .optional()
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
        .max(256)
        .required()
        .messages({
            "string.empty": "A senha é obrigatória.",
            "string.min": "A senha deve possuir pelo menos 10 caracteres.",
            "string.max": "A senha deve possuir no máximo 256 caracteres.",
            "any.required": "A senha é obrigatória."
        })

});
export const schemaNovaSenha = Joi.object({

    novaSenha: Joi.string()
        .min(10)
        .max(256)
        .required()
        .messages({
            "string.empty": "A senha é obrigatória.",
            "string.min": "A senha deve possuir pelo menos 10 caracteres.",
            "string.max": "A senha deve possuir no máximo 256 caracteres.",
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


export const schemaCriarConta = Joi.object({

    tipo_conta: Joi.string()
        .valid(
            'Corrente',
            'Poupança',
            'Salario',
            'Conjunta',
            'Internacional',
            'Credito'
        )
        .required()
        .messages({
            'string.empty': 'O tipo da conta é obrigatorio',
            'string.base': 'O tipo da conta deve ser um texto.',
            'any.only': 'O tipo da conta deve ser: Corrente, Poupança, Salario, Conjunta, Internacional ou Credito.'
        }),

    codigo_conta: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O código da conta deve ser um número inteiro.',
            'number.integer': 'O código da conta deve ser um número inteiro.',
            'number.min': 'O código da conta não pode ser negativo.'
        }),

    nome_instituicao: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .allow(null, '')
        .optional()
        .messages({
            'string.base': 'O nome da instituição deve ser um texto.',
            'string.min': 'O nome da instituição deve possuir pelo menos 2 caracteres.',
            'string.max': 'O nome da instituição deve possuir no máximo 100 caracteres.'
        }),

    nome_conta: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.base': 'O nome da conta deve ser um texto.',
            'string.empty': 'O nome da conta é obrigatorio.',
            'string.min': 'O nome da conta deve possuir pelo menos 2 caracteres.',
            'string.max': 'O nome da conta deve possuir no máximo 100 caracteres.'
        })

})

export const schemaIdContaObrigatorio = Joi.object({
    id_conta: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            "any.required": "O ID da conta é obrigatório.",
            "number.base": "O ID da conta deve ser um número válido.",
            "number.integer": "O ID da conta deve ser um número inteiro.",
            "number.min": "O ID da conta deve ser maior ou igual a zero."
        })
});