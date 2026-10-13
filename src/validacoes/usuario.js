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

export const schemaPesquisa = Joi.object({

    pesquisa: Joi.string()
        .trim()
        .min(1)
        .max(100)
        .optional()
        .messages({
            "string.min": "A pesquisa deve possuir pelo menos 3 caracteres.",
            "string.max": "A pesquisa deve possuir no máximo 100 caracteres."
        })

});

// RF-006
// Os schemas foram criados de modo inteiro por rota pq algumas rotas recebem mais de 10 variaveis

// ============================================================
// USUÁRIO - CRIAR RECORRÊNCIA
// ============================================================

export const schemaCriarRecorrencia = Joi.object({

    id_conta: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_conta deve ser um número.',
            'number.integer': 'O id_conta deve ser um número inteiro.',
            'number.min': 'O id_conta não pode ser menor que 0.',
            'any.required': 'O id_conta é obrigatório.'
        }),

    id_categoria: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_categoria deve ser um número.',
            'number.integer': 'O id_categoria deve ser um número inteiro.',
            'number.min': 'O id_categoria não pode ser menor que 0.',
            'any.required': 'O id_categoria é obrigatório.'
        }),

    tipo_transacao: Joi.string()
        .valid('Entrada', 'Saida')
        .required()
        .messages({
            'string.base': 'O tipo_transacao deve ser um texto.',
            'string.empty': 'O tipo_transacao é obrigatório.',
            'any.only': 'O tipo_transacao deve ser: Entrada ou Saida.',
            'any.required': 'O tipo_transacao é obrigatório.'
        }),

    modalidade: Joi.string()
        .valid('Parcelado', 'Periodico')
        .required()
        .messages({
            'string.base': 'A modalidade deve ser um texto.',
            'string.empty': 'A modalidade é obrigatória.',
            'any.only': 'A modalidade deve ser: Parcelado ou Periodico.',
            'any.required': 'A modalidade é obrigatória.'
        }),

    nome: Joi.string()
        .trim()
        .required()
        .messages({
            'string.base': 'O nome deve ser um texto.',
            'string.empty': 'O nome é obrigatório.',
            'any.required': 'O nome é obrigatório.'
        }),

    descricao: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'A descricao deve ser um texto.',
            'string.empty': 'A descricao é obrigatória.',
            'any.required': 'A descricao é obrigatória.'
        }),

    forma_pagamento: Joi.string()
        .valid('PIX', 'débito', 'crédito', 'boleto', 'dinheiro')
        .required()
        .messages({
            'string.base': 'A forma_pagamento deve ser um texto.',
            'string.empty': 'A forma_pagamento é obrigatória.',
            'any.only': 'A forma_pagamento deve ser: PIX, débito, crédito, boleto ou dinheiro.',
            'any.required': 'A forma_pagamento é obrigatória.'
        }),

    destino: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'O destino deve ser um texto.',
            'string.empty': 'O destino é obrigatório.',
            'any.required': 'O destino é obrigatório.'
        }),

    valor: Joi.number()
        .positive()
        .precision(2)
        .required()
        .messages({
            'number.base': 'O valor deve ser um número.',
            'number.positive': 'O valor deve ser maior que 0.',
            'number.precision': 'O valor deve possuir no máximo 2 casas decimais.',
            'any.required': 'O valor é obrigatório.'
        }),

    frequencia: Joi.alternatives()
        .conditional('modalidade', {
            is: 'Parcelado',
            then: Joi.string()
                .valid('Mensal')
                .required()
                .messages({
                    'string.base': 'A frequencia deve ser um texto.',
                    'any.only': 'Para modalidade Parcelado, a frequencia deve ser Mensal.',
                    'any.required': 'A frequencia é obrigatória.'
                }),
            otherwise: Joi.string()
                .valid('Semanal', 'Mensal', 'Anual')
                .required()
                .messages({
                    'string.base': 'A frequencia deve ser um texto.',
                    'any.only': 'A frequencia deve ser: Semanal, Mensal ou Anual.',
                    'any.required': 'A frequencia é obrigatória.'
                })
        }),

    qtd_parcelas: Joi.alternatives()
        .conditional('modalidade', {
            is: 'Parcelado',
            then: Joi.number()
                .integer()
                .min(1)
                .required()
                .messages({
                    'number.base': 'A qtd_parcelas deve ser um número.',
                    'number.integer': 'A qtd_parcelas deve ser um número inteiro.',
                    'number.min': 'A qtd_parcelas deve ser maior que 0.',
                    'any.required': 'A qtd_parcelas é obrigatória para recorrências Parceladas.'
                }),
            otherwise: Joi.number()
                .integer()
                .min(1)
                .allow(null)
                .optional()
                .messages({
                    'number.base': 'A qtd_parcelas deve ser um número.',
                    'number.integer': 'A qtd_parcelas deve ser um número inteiro.',
                    'number.min': 'A qtd_parcelas deve ser maior que 0.'
                })
        }),

    data_inicio: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
            'string.base': 'A data_inicio deve ser um texto.',
            'string.empty': 'A data_inicio é obrigatória.',
            'string.pattern.base': 'A data_inicio deve estar no formato YYYY-MM-DD.',
            'any.required': 'A data_inicio é obrigatória.'
        }),

    ativo: Joi.boolean()
        .required()
        .messages({
            'boolean.base': 'O ativo deve ser verdadeiro ou falso.',
            'any.required': 'O ativo é obrigatório.'
        })
});

export const schemaCriarTransacao = Joi.object({

    id_conta_origem: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_conta_origem deve ser um número.',
            'number.integer': 'O id_conta_origem deve ser um número inteiro.',
            'number.min': 'O id_conta_origem não pode ser menor que 0.',
            'any.required': 'O id_conta_origem é obrigatório.'
        }),

    id_conta_destino: Joi.alternatives()
        .conditional('tipo_transacao', {
            is: 'Transferencia',
            then: Joi.number()
                .integer()
                .min(0)
                .invalid(Joi.ref('id_conta_origem'))
                .required()
                .messages({
                    'number.base': 'O id_conta_destino deve ser um número.',
                    'number.integer': 'O id_conta_destino deve ser um número inteiro.',
                    'number.min': 'O id_conta_destino não pode ser menor que 0.',
                    'any.invalid': 'O id_conta_destino deve ser diferente do id_conta_origem.',
                    'any.required': 'O id_conta_destino é obrigatório para Transferencia.'
                }),
            otherwise: Joi.number()
                .integer()
                .min(0)
                .allow(null)
                .optional()
                .messages({
                    'number.base': 'O id_conta_destino deve ser um número.',
                    'number.integer': 'O id_conta_destino deve ser um número inteiro.',
                    'number.min': 'O id_conta_destino não pode ser menor que 0.'
                })
        }),

    id_categoria: Joi.alternatives()
        .conditional('tipo_transacao', {
            is: 'Transferencia',
            then: Joi.number()
                .integer()
                .min(0)
                .allow(null)
                .optional()
                .messages({
                    'number.base': 'O id_categoria deve ser um número.',
                    'number.integer': 'O id_categoria deve ser um número inteiro.',
                    'number.min': 'O id_categoria não pode ser menor que 0.'
                }),
            otherwise: Joi.number()
                .integer()
                .min(0)
                .required()
                .messages({
                    'number.base': 'O id_categoria deve ser um número.',
                    'number.integer': 'O id_categoria deve ser um número inteiro.',
                    'number.min': 'O id_categoria não pode ser menor que 0.',
                    'any.required': 'O id_categoria é obrigatório para Entrada ou Saida.'
                })
        }),

    id_meta: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_meta deve ser um número.',
            'number.integer': 'O id_meta deve ser um número inteiro.',
            'number.min': 'O id_meta não pode ser menor que 0.'
        }),

    tipo_transacao: Joi.string()
        .valid('Entrada', 'Saida', 'Transferencia')
        .required()
        .messages({
            'string.base': 'O tipo_transacao deve ser um texto.',
            'string.empty': 'O tipo_transacao é obrigatório.',
            'any.only': 'O tipo_transacao deve ser: Entrada, Saida ou Transferencia.',
            'any.required': 'O tipo_transacao é obrigatório.'
        }),

    nome: Joi.string()
        .trim()
        .required()
        .messages({
            'string.base': 'O nome deve ser um texto.',
            'string.empty': 'O nome é obrigatório.',
            'any.required': 'O nome é obrigatório.'
        }),

    descricao: Joi.string()
        .trim()
        .allow(null, '')
        .optional()
        .messages({
            'string.base': 'A descricao deve ser um texto.'
        }),

    forma_pagamento: Joi.string()
        .valid('PIX', 'débito', 'crédito', 'boleto', 'dinheiro')
        .required()
        .messages({
            'string.base': 'A forma_pagamento deve ser um texto.',
            'string.empty': 'A forma_pagamento é obrigatória.',
            'any.only': 'A forma_pagamento deve ser: PIX, débito, crédito, boleto ou dinheiro.',
            'any.required': 'A forma_pagamento é obrigatória.'
        }),

    destino: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'O destino deve ser um texto.',
        }),

    valor_transacao: Joi.number()
        .positive()
        .precision(2)
        .required()
        .messages({
            'number.base': 'O valor_transacao deve ser um número.',
            'number.positive': 'O valor_transacao deve ser maior que 0.',
            'number.precision': 'O valor_transacao deve possuir no máximo 2 casas decimais.',
            'any.required': 'O valor_transacao é obrigatório.'
        }),

    status_transacao: Joi.string()
        .valid('Pendente', 'Pago')
        .required()
        .messages({
            'string.base': 'O status_transacao deve ser um texto.',
            'string.empty': 'O status_transacao é obrigatório.',
            'any.only': 'O status_transacao deve ser: Pendente ou Pago.',
            'any.required': 'O status_transacao é obrigatório.'
        }),

    data_transacao: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .required()
        .messages({
            'string.base': 'A data_transacao deve ser um texto.',
            'string.empty': 'A data_transacao é obrigatória.',
            'string.pattern.base': 'A data_transacao deve estar no formato YYYY-MM-DD.',
            'any.required': 'A data_transacao é obrigatória.'
        }),

    data_vencimento: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow(null)
        .optional()
        .messages({
            'string.base': 'A data_vencimento deve ser um texto.',
            'string.pattern.base': 'A data_vencimento deve estar no formato YYYY-MM-DD.'
        }),

    data_pagamento: Joi.alternatives()
        .conditional('status_transacao', {
            is: 'Pendente',
            then: Joi.valid(null)
                .optional()
                .messages({
                    'any.only': 'A data_pagamento deve ser NULL quando o status_transacao for Pendente.'
                }),
            otherwise: Joi.string()
                .pattern(/^\d{4}-\d{2}-\d{2}$/)
                .allow(null)
                .optional()
                .messages({
                    'string.base': 'A data_pagamento deve ser um texto.',
                    'string.pattern.base': 'A data_pagamento deve estar no formato YYYY-MM-DD.'
                })
        })
});

export const schemaListarTransacoes = Joi.object({

    id_contas: Joi.array()
        .single()
        .items(
            Joi.number()
                .integer()
                .min(0)
                .messages({
                    'number.base': 'Cada id de id_contas deve ser um número.',
                    'number.integer': 'Cada id de id_contas deve ser um número inteiro.',
                    'number.min': 'Os ids de id_contas não podem ser menores que 0.'
                })
        )
        .min(1)
        .optional()
        .messages({
            'array.base': 'O id_contas deve ser uma lista.',
            'array.min': 'O id_contas deve possuir pelo menos um ID.'
        }),

    id_categoria: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_categoria deve ser um número.',
            'number.integer': 'O id_categoria deve ser um número inteiro.',
            'number.min': 'O id_categoria não pode ser menor que 0.'
        }),

    id_transacao: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_transacao deve ser um número.',
            'number.integer': 'O id_transacao deve ser um número inteiro.',
            'number.min': 'O id_transacao não pode ser menor que 0.'
        }),

    id_recorrencia: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_recorrencia deve ser um número.',
            'number.integer': 'O id_recorrencia deve ser um número inteiro.',
            'number.min': 'O id_recorrencia não pode ser menor que 0.'
        }),

    nome: Joi.string()
        .trim()
        .allow('', null)
        .optional()
        .messages({
            'string.base': 'O nome deve ser um texto.'
        }),

    status: Joi.string()
        .valid('Pendente', 'Pago')
        .allow(null)
        .optional()
        .messages({
            'string.base': 'O status deve ser um texto.',
            'any.only': 'O status deve ser: Pendente ou Pago.'
        }),

    periodo_criacao: Joi.array()
        .items(
            Joi.string()
                .pattern(/^\d{4}-\d{2}-\d{2}$/)
                .messages({
                    'string.base': 'Cada data de periodo_criacao deve ser um texto.',
                    'string.pattern.base': 'As datas de periodo_criacao devem estar no formato YYYY-MM-DD.'
                })
        )
        .length(2)
        .allow(null)
        .optional()
        .messages({
            'array.base': 'O periodo_criacao deve ser uma lista.',
            'array.length': 'O periodo_criacao deve possuir exatamente duas datas.'
        }),

    periodo_vencimento: Joi.array()
        .items(
            Joi.string()
                .pattern(/^\d{4}-\d{2}-\d{2}$/)
                .messages({
                    'string.base': 'Cada data de periodo_vencimento deve ser um texto.',
                    'string.pattern.base': 'As datas de periodo_vencimento devem estar no formato YYYY-MM-DD.'
                })
        )
        .length(2)
        .allow(null)
        .optional()
        .messages({
            'array.base': 'O periodo_vencimento deve ser uma lista.',
            'array.length': 'O periodo_vencimento deve possuir exatamente duas datas.'
        })
});

export const schemaEditarRecorrencia = Joi.object({

    id_recorrencia: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_recorrencia deve ser um número.',
            'number.integer': 'O id_recorrencia deve ser um número inteiro.',
            'number.min': 'O id_recorrencia não pode ser menor que 0.',
            'any.required': 'O id_recorrencia é obrigatório.'
        }),

    id_conta: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            'number.base': 'O id_conta deve ser um número.',
            'number.integer': 'O id_conta deve ser um número inteiro.',
            'number.min': 'O id_conta não pode ser menor que 0.'
        }),

    id_categoria: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            'number.base': 'O id_categoria deve ser um número.',
            'number.integer': 'O id_categoria deve ser um número inteiro.',
            'number.min': 'O id_categoria não pode ser menor que 0.'
        }),

    tipo_transacao: Joi.string()
        .valid('Entrada', 'Saida')
        .optional()
        .messages({
            'string.base': 'O tipo_transacao deve ser um texto.',
            'any.only': 'O tipo_transacao deve ser: Entrada ou Saida.'
        }),

    modalidade: Joi.string()
        .valid('Parcelado', 'Periodico')
        .optional()
        .messages({
            'string.base': 'A modalidade deve ser um texto.',
            'any.only': 'A modalidade deve ser: Parcelado ou Periodico.'
        }),

    nome: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'O nome deve ser um texto.',
            'string.empty': 'O nome não pode ser vazio.'
        }),

    descricao: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'A descricao deve ser um texto.',
            'string.empty': 'A descricao não pode ser vazia.'
        }),

    forma_pagamento: Joi.string()
        .valid('PIX', 'débito', 'crédito', 'boleto', 'dinheiro')
        .optional()
        .messages({
            'string.base': 'A forma_pagamento deve ser um texto.',
            'any.only': 'A forma_pagamento deve ser: PIX, débito, crédito, boleto ou dinheiro.'
        }),

    destino: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'O destino deve ser um texto.',
            'string.empty': 'O destino não pode ser vazio.'
        }),

    valor: Joi.number()
        .positive()
        .precision(2)
        .optional()
        .messages({
            'number.base': 'O valor deve ser um número.',
            'number.positive': 'O valor deve ser maior que 0.',
            'number.precision': 'O valor deve possuir no máximo 2 casas decimais.'
        }),

    frequencia: Joi.string()
        .valid('Semanal', 'Mensal', 'Anual')
        .optional()
        .messages({
            'string.base': 'A frequencia deve ser um texto.',
            'any.only': 'A frequencia deve ser: Semanal, Mensal ou Anual.'
        }),

    qtd_parcelas: Joi.number()
        .integer()
        .min(1)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'A qtd_parcelas deve ser um número.',
            'number.integer': 'A qtd_parcelas deve ser um número inteiro.',
            'number.min': 'A qtd_parcelas deve ser maior que 0.'
        }),

    data_inicio: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .messages({
            'string.base': 'A data_inicio deve ser um texto.',
            'string.pattern.base': 'A data_inicio deve estar no formato YYYY-MM-DD.'
        }),

    ativo: Joi.boolean()
        .optional()
        .messages({
            'boolean.base': 'O ativo deve ser verdadeiro ou falso.'
        })
});

export const schemaListarRecorrencias = Joi.object({

    id_contas: Joi.array()
        .single()
        .items(
            Joi.number()
                .integer()
                .min(0)
                .messages({
                    'number.base': 'Cada id de id_contas deve ser um número.',
                    'number.integer': 'Cada id de id_contas deve ser um número inteiro.',
                    'number.min': 'Os ids de id_contas não podem ser menores que 0.'
                })
        )
        .min(1)
        .optional()
        .messages({
            'array.base': 'O id_contas deve ser uma lista.',
            'array.min': 'O id_contas deve possuir pelo menos um ID.'
        }),

    id_recorrencia: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_recorrencia deve ser um número.',
            'number.integer': 'O id_recorrencia deve ser um número inteiro.',
            'number.min': 'O id_recorrencia não pode ser menor que 0.'
        })
});

export const schemaEditarTransacao = Joi.object({

    id_transacao: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_transacao deve ser um número.',
            'number.integer': 'O id_transacao deve ser um número inteiro.',
            'number.min': 'O id_transacao não pode ser menor que 0.',
            'any.required': 'O id_transacao é obrigatório.'
        }),

    id_conta_origem: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            'number.base': 'O id_conta_origem deve ser um número.',
            'number.integer': 'O id_conta_origem deve ser um número inteiro.',
            'number.min': 'O id_conta_origem não pode ser menor que 0.'
        }),

    id_conta_destino: Joi.alternatives()
        .conditional('tipo_transacao', {
            is: 'Transferencia',
            then: Joi.number()
                .integer()
                .min(0)
                .invalid(Joi.ref('id_conta_origem'))
                .required()
                .messages({
                    'number.base': 'O id_conta_destino deve ser um número.',
                    'number.integer': 'O id_conta_destino deve ser um número inteiro.',
                    'number.min': 'O id_conta_destino não pode ser menor que 0.',
                    'any.invalid': 'O id_conta_destino deve ser diferente do id_conta_origem.',
                    'any.required': 'O id_conta_destino é obrigatório ao alterar o tipo para Transferencia.'
                }),
            otherwise: Joi.number()
                .integer()
                .min(0)
                .allow(null)
                .optional()
                .messages({
                    'number.base': 'O id_conta_destino deve ser um número.',
                    'number.integer': 'O id_conta_destino deve ser um número inteiro.',
                    'number.min': 'O id_conta_destino não pode ser menor que 0.'
                })
        }),

    id_categoria: Joi.alternatives()
        .conditional('tipo_transacao', {
            is: Joi.valid('Entrada', 'Saida').required(),
            then: Joi.number()
                .integer()
                .min(0)
                .optional()
                .messages({
                    'number.base': 'O id_categoria deve ser um número.',
                    'number.integer': 'O id_categoria deve ser um número inteiro.',
                    'number.min': 'O id_categoria não pode ser menor que 0.',
                    'any.required': 'O id_categoria é obrigatório para Entrada ou Saida.'
                }),
            otherwise: Joi.number()
                .integer()
                .min(0)
                .allow(null)
                .optional()
                .messages({
                    'number.base': 'O id_categoria deve ser um número.',
                    'number.integer': 'O id_categoria deve ser um número inteiro.',
                    'number.min': 'O id_categoria não pode ser menor que 0.'
                })
        }),

    id_meta: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_meta deve ser um número.',
            'number.integer': 'O id_meta deve ser um número inteiro.',
            'number.min': 'O id_meta não pode ser menor que 0.'
        }),

    tipo_transacao: Joi.string()
        .valid('Entrada', 'Saida', 'Transferencia')
        .optional()
        .messages({
            'string.base': 'O tipo_transacao deve ser um texto.',
            'any.only': 'O tipo_transacao deve ser: Entrada, Saida ou Transferencia.'
        }),

    nome: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'O nome deve ser um texto.',
            'string.empty': 'O nome não pode ser vazio.'
        }),

    descricao: Joi.string()
        .trim()
        .allow(null, '')
        .optional()
        .messages({
            'string.base': 'A descricao deve ser um texto.'
        }),

    forma_pagamento: Joi.string()
        .valid('PIX', 'débito', 'crédito', 'boleto', 'dinheiro')
        .optional()
        .messages({
            'string.base': 'A forma_pagamento deve ser um texto.',
            'any.only': 'A forma_pagamento deve ser: PIX, débito, crédito, boleto ou dinheiro.'
        }),

    destino: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'O destino deve ser um texto.',
            'string.empty': 'O destino não pode ser vazio.'
        }),

    valor_transacao: Joi.number()
        .positive()
        .precision(2)
        .optional()
        .messages({
            'number.base': 'O valor_transacao deve ser um número.',
            'number.positive': 'O valor_transacao deve ser maior que 0.',
            'number.precision': 'O valor_transacao deve possuir no máximo 2 casas decimais.'
        }),

    status_transacao: Joi.string()
        .valid('Pendente', 'Pago')
        .optional()
        .messages({
            'string.base': 'O status_transacao deve ser um texto.',
            'any.only': 'O status_transacao deve ser: Pendente ou Pago.'
        }),

    data_transacao: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .messages({
            'string.base': 'A data_transacao deve ser um texto.',
            'string.pattern.base': 'A data_transacao deve estar no formato YYYY-MM-DD.'
        }),

    data_vencimento: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow(null)
        .optional()
        .messages({
            'string.base': 'A data_vencimento deve ser um texto.',
            'string.pattern.base': 'A data_vencimento deve estar no formato YYYY-MM-DD.'
        }),

    data_pagamento: Joi.alternatives()
        .conditional('status_transacao', {
            is: 'Pendente',
            then: Joi.valid(null)
                .optional()
                .messages({
                    'any.only': 'A data_pagamento deve ser NULL quando o status_transacao for Pendente.'
                }),
            otherwise: Joi.string()
                .pattern(/^\d{4}-\d{2}-\d{2}$/)
                .allow(null)
                .optional()
                .messages({
                    'string.base': 'A data_pagamento deve ser um texto.',
                    'string.pattern.base': 'A data_pagamento deve estar no formato YYYY-MM-DD.'
                })
        })
});

export const schemaExcluirRecorrencia = Joi.object({

    id_recorrencia: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_recorrencia deve ser um número.',
            'number.integer': 'O id_recorrencia deve ser um número inteiro.',
            'number.min': 'O id_recorrencia não pode ser menor que 0.',
            'any.required': 'O id_recorrencia é obrigatório.'
        })
});

export const schemaExcluirTransacao = Joi.object({

    id_transacao: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_transacao deve ser um número.',
            'number.integer': 'O id_transacao deve ser um número inteiro.',
            'number.min': 'O id_transacao não pode ser menor que 0.',
            'any.required': 'O id_transacao é obrigatório.'
        })
});


export const schemaADMIN_listarRecorrencias = Joi.object({

    id_usuario: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            'number.base': 'O id_usuario deve ser um número.',
            'number.integer': 'O id_usuario deve ser um número inteiro.',
            'number.min': 'O id_usuario não pode ser menor que 0.'
        }),

    id_contas: Joi.array()
        .single()
        .items(
            Joi.number()
                .integer()
                .min(0)
                .messages({
                    'number.base': 'Cada id de id_contas deve ser um número.',
                    'number.integer': 'Cada id de id_contas deve ser um número inteiro.',
                    'number.min': 'Os ids de id_contas não podem ser menores que 0.'
                })
        )
        .min(1)
        .optional()
        .messages({
            'array.base': 'O id_contas deve ser uma lista.',
            'array.min': 'O id_contas deve possuir pelo menos um ID.'
        }),

    id_recorrencia: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_recorrencia deve ser um número.',
            'number.integer': 'O id_recorrencia deve ser um número inteiro.',
            'number.min': 'O id_recorrencia não pode ser menor que 0.'
        })
});

export const schemaADMIN_editarRecorrencia = Joi.object({

    id_usuario: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_usuario deve ser um número.',
            'number.integer': 'O id_usuario deve ser um número inteiro.',
            'number.min': 'O id_usuario não pode ser menor que 0.',
            'any.required': 'O id_usuario é obrigatório.'
        }),

    id_recorrencia: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_recorrencia deve ser um número.',
            'number.integer': 'O id_recorrencia deve ser um número inteiro.',
            'number.min': 'O id_recorrencia não pode ser menor que 0.',
            'any.required': 'O id_recorrencia é obrigatório.'
        }),

    id_conta: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            'number.base': 'O id_conta deve ser um número.',
            'number.integer': 'O id_conta deve ser um número inteiro.',
            'number.min': 'O id_conta não pode ser menor que 0.'
        }),

    id_categoria: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            'number.base': 'O id_categoria deve ser um número.',
            'number.integer': 'O id_categoria deve ser um número inteiro.',
            'number.min': 'O id_categoria não pode ser menor que 0.'
        }),

    tipo_transacao: Joi.string()
        .valid('Entrada', 'Saida')
        .optional()
        .messages({
            'string.base': 'O tipo_transacao deve ser um texto.',
            'any.only': 'O tipo_transacao deve ser: Entrada ou Saida.'
        }),

    modalidade: Joi.string()
        .valid('Parcelado', 'Periodico')
        .optional()
        .messages({
            'string.base': 'A modalidade deve ser um texto.',
            'any.only': 'A modalidade deve ser: Parcelado ou Periodico.'
        }),

    nome: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'O nome deve ser um texto.',
            'string.empty': 'O nome não pode ser vazio.'
        }),

    descricao: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'A descricao deve ser um texto.',
            'string.empty': 'A descricao não pode ser vazia.'
        }),

    forma_pagamento: Joi.string()
        .valid('PIX', 'débito', 'crédito', 'boleto', 'dinheiro')
        .optional()
        .messages({
            'string.base': 'A forma_pagamento deve ser um texto.',
            'any.only': 'A forma_pagamento deve ser: PIX, débito, crédito, boleto ou dinheiro.'
        }),

    destino: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'O destino deve ser um texto.',
            'string.empty': 'O destino não pode ser vazio.'
        }),

    valor: Joi.number()
        .positive()
        .precision(2)
        .optional()
        .messages({
            'number.base': 'O valor deve ser um número.',
            'number.positive': 'O valor deve ser maior que 0.',
            'number.precision': 'O valor deve possuir no máximo 2 casas decimais.'
        }),

    frequencia: Joi.string()
        .valid('Semanal', 'Mensal', 'Anual')
        .optional()
        .messages({
            'string.base': 'A frequencia deve ser um texto.',
            'any.only': 'A frequencia deve ser: Semanal, Mensal ou Anual.'
        }),

    qtd_parcelas: Joi.number()
        .integer()
        .min(1)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'A qtd_parcelas deve ser um número.',
            'number.integer': 'A qtd_parcelas deve ser um número inteiro.',
            'number.min': 'A qtd_parcelas deve ser maior que 0.'
        }),

    data_inicio: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .messages({
            'string.base': 'A data_inicio deve ser um texto.',
            'string.pattern.base': 'A data_inicio deve estar no formato YYYY-MM-DD.'
        }),

    ativo: Joi.boolean()
        .optional()
        .messages({
            'boolean.base': 'O ativo deve ser verdadeiro ou falso.'
        })
});

export const schemaADMIN_listarTransacoes = Joi.object({

    id_usuario: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            'number.base': 'O id_usuario deve ser um número.',
            'number.integer': 'O id_usuario deve ser um número inteiro.',
            'number.min': 'O id_usuario não pode ser menor que 0.'
        }),

    id_contas: Joi.array()
        .single()
        .items(
            Joi.number()
                .integer()
                .min(0)
                .messages({
                    'number.base': 'Cada id de id_contas deve ser um número.',
                    'number.integer': 'Cada id de id_contas deve ser um número inteiro.',
                    'number.min': 'Os ids de id_contas não podem ser menores que 0.'
                })
        )
        .min(1)
        .optional()
        .messages({
            'array.base': 'O id_contas deve ser uma lista.',
            'array.min': 'O id_contas deve possuir pelo menos um ID.'
        }),

    id_categoria: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_categoria deve ser um número.',
            'number.integer': 'O id_categoria deve ser um número inteiro.',
            'number.min': 'O id_categoria não pode ser menor que 0.'
        }),

    id_transacao: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_transacao deve ser um número.',
            'number.integer': 'O id_transacao deve ser um número inteiro.',
            'number.min': 'O id_transacao não pode ser menor que 0.'
        }),

    id_recorrencia: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_recorrencia deve ser um número.',
            'number.integer': 'O id_recorrencia deve ser um número inteiro.',
            'number.min': 'O id_recorrencia não pode ser menor que 0.'
        }),

    nome: Joi.string()
        .trim()
        .allow('', null)
        .optional()
        .messages({
            'string.base': 'O nome deve ser um texto.'
        }),

    status: Joi.string()
        .valid('Pendente', 'Pago')
        .allow(null)
        .optional()
        .messages({
            'string.base': 'O status deve ser um texto.',
            'any.only': 'O status deve ser: Pendente ou Pago.'
        }),

    periodo_criacao: Joi.array()
        .items(
            Joi.string()
                .pattern(/^\d{4}-\d{2}-\d{2}$/)
                .messages({
                    'string.base': 'Cada data de periodo_criacao deve ser um texto.',
                    'string.pattern.base': 'As datas de periodo_criacao devem estar no formato YYYY-MM-DD.'
                })
        )
        .length(2)
        .allow(null)
        .optional()
        .messages({
            'array.base': 'O periodo_criacao deve ser uma lista.',
            'array.length': 'O periodo_criacao deve possuir exatamente duas datas.'
        }),

    periodo_vencimento: Joi.array()
        .items(
            Joi.string()
                .pattern(/^\d{4}-\d{2}-\d{2}$/)
                .messages({
                    'string.base': 'Cada data de periodo_vencimento deve ser um texto.',
                    'string.pattern.base': 'As datas de periodo_vencimento devem estar no formato YYYY-MM-DD.'
                })
        )
        .length(2)
        .allow(null)
        .optional()
        .messages({
            'array.base': 'O periodo_vencimento deve ser uma lista.',
            'array.length': 'O periodo_vencimento deve possuir exatamente duas datas.'
        })
});

export const schemaADMIN_editarTransacao = Joi.object({

    id_usuario: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_usuario deve ser um número.',
            'number.integer': 'O id_usuario deve ser um número inteiro.',
            'number.min': 'O id_usuario não pode ser menor que 0.',
            'any.required': 'O id_usuario é obrigatório.'
        }),

    id_transacao: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_transacao deve ser um número.',
            'number.integer': 'O id_transacao deve ser um número inteiro.',
            'number.min': 'O id_transacao não pode ser menor que 0.',
            'any.required': 'O id_transacao é obrigatório.'
        }),

    id_conta_origem: Joi.number()
        .integer()
        .min(0)
        .optional()
        .messages({
            'number.base': 'O id_conta_origem deve ser um número.',
            'number.integer': 'O id_conta_origem deve ser um número inteiro.',
            'number.min': 'O id_conta_origem não pode ser menor que 0.'
        }),

    id_conta_destino: Joi.alternatives()
        .conditional('tipo_transacao', {
            is: 'Transferencia',
            then: Joi.number()
                .integer()
                .min(0)
                .invalid(Joi.ref('id_conta_origem'))
                .required()
                .messages({
                    'number.base': 'O id_conta_destino deve ser um número.',
                    'number.integer': 'O id_conta_destino deve ser um número inteiro.',
                    'number.min': 'O id_conta_destino não pode ser menor que 0.',
                    'any.invalid': 'O id_conta_destino deve ser diferente do id_conta_origem.',
                    'any.required': 'O id_conta_destino é obrigatório ao alterar o tipo para Transferencia.'
                }),
            otherwise: Joi.number()
                .integer()
                .min(0)
                .allow(null)
                .optional()
                .messages({
                    'number.base': 'O id_conta_destino deve ser um número.',
                    'number.integer': 'O id_conta_destino deve ser um número inteiro.',
                    'number.min': 'O id_conta_destino não pode ser menor que 0.'
                })
        }),

    id_categoria: Joi.alternatives()
        .conditional('tipo_transacao', {
            is: Joi.valid('Entrada', 'Saida').required(),
            then: Joi.number()
                .integer()
                .min(0)
                .required()
                .messages({
                    'number.base': 'O id_categoria deve ser um número.',
                    'number.integer': 'O id_categoria deve ser um número inteiro.',
                    'number.min': 'O id_categoria não pode ser menor que 0.',
                    'any.required': 'O id_categoria é obrigatório para Entrada ou Saida.'
                }),
            otherwise: Joi.number()
                .integer()
                .min(0)
                .allow(null)
                .optional()
                .messages({
                    'number.base': 'O id_categoria deve ser um número.',
                    'number.integer': 'O id_categoria deve ser um número inteiro.',
                    'number.min': 'O id_categoria não pode ser menor que 0.'
                })
        }),

    id_meta: Joi.number()
        .integer()
        .min(0)
        .allow(null)
        .optional()
        .messages({
            'number.base': 'O id_meta deve ser um número.',
            'number.integer': 'O id_meta deve ser um número inteiro.',
            'number.min': 'O id_meta não pode ser menor que 0.'
        }),

    tipo_transacao: Joi.string()
        .valid('Entrada', 'Saida', 'Transferencia')
        .optional()
        .messages({
            'string.base': 'O tipo_transacao deve ser um texto.',
            'any.only': 'O tipo_transacao deve ser: Entrada, Saida ou Transferencia.'
        }),

    nome: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'O nome deve ser um texto.',
            'string.empty': 'O nome não pode ser vazio.'
        }),

    descricao: Joi.string()
        .trim()
        .allow(null, '')
        .optional()
        .messages({
            'string.base': 'A descricao deve ser um texto.'
        }),

    forma_pagamento: Joi.string()
        .valid('PIX', 'débito', 'crédito', 'boleto', 'dinheiro')
        .optional()
        .messages({
            'string.base': 'A forma_pagamento deve ser um texto.',
            'any.only': 'A forma_pagamento deve ser: PIX, débito, crédito, boleto ou dinheiro.'
        }),

    destino: Joi.string()
        .trim()
        .optional()
        .messages({
            'string.base': 'O destino deve ser um texto.',
            'string.empty': 'O destino não pode ser vazio.'
        }),

    valor_transacao: Joi.number()
        .positive()
        .precision(2)
        .optional()
        .messages({
            'number.base': 'O valor_transacao deve ser um número.',
            'number.positive': 'O valor_transacao deve ser maior que 0.',
            'number.precision': 'O valor_transacao deve possuir no máximo 2 casas decimais.'
        }),

    status_transacao: Joi.string()
        .valid('Pendente', 'Pago')
        .optional()
        .messages({
            'string.base': 'O status_transacao deve ser um texto.',
            'any.only': 'O status_transacao deve ser: Pendente ou Pago.'
        }),

    data_transacao: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .optional()
        .messages({
            'string.base': 'A data_transacao deve ser um texto.',
            'string.pattern.base': 'A data_transacao deve estar no formato YYYY-MM-DD.'
        }),

    data_vencimento: Joi.string()
        .pattern(/^\d{4}-\d{2}-\d{2}$/)
        .allow(null)
        .optional()
        .messages({
            'string.base': 'A data_vencimento deve ser um texto.',
            'string.pattern.base': 'A data_vencimento deve estar no formato YYYY-MM-DD.'
        }),

    data_pagamento: Joi.alternatives()
        .conditional('status_transacao', {
            is: 'Pendente',
            then: Joi.valid(null)
                .optional()
                .messages({
                    'any.only': 'A data_pagamento deve ser NULL quando o status_transacao for Pendente.'
                }),
            otherwise: Joi.string()
                .pattern(/^\d{4}-\d{2}-\d{2}$/)
                .allow(null)
                .optional()
                .messages({
                    'string.base': 'A data_pagamento deve ser um texto.',
                    'string.pattern.base': 'A data_pagamento deve estar no formato YYYY-MM-DD.'
                })
        })
});

export const schemaADMIN_excluirRecorrencia = Joi.object({

    id_usuario: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_usuario deve ser um número.',
            'number.integer': 'O id_usuario deve ser um número inteiro.',
            'number.min': 'O id_usuario não pode ser menor que 0.',
            'any.required': 'O id_usuario é obrigatório.'
        }),

    id_recorrencia: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_recorrencia deve ser um número.',
            'number.integer': 'O id_recorrencia deve ser um número inteiro.',
            'number.min': 'O id_recorrencia não pode ser menor que 0.',
            'any.required': 'O id_recorrencia é obrigatório.'
        })
});

export const schemaADMIN_excluirTransacao = Joi.object({

    id_usuario: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_usuario deve ser um número.',
            'number.integer': 'O id_usuario deve ser um número inteiro.',
            'number.min': 'O id_usuario não pode ser menor que 0.',
            'any.required': 'O id_usuario é obrigatório.'
        }),

    id_transacao: Joi.number()
        .integer()
        .min(0)
        .required()
        .messages({
            'number.base': 'O id_transacao deve ser um número.',
            'number.integer': 'O id_transacao deve ser um número inteiro.',
            'number.min': 'O id_transacao não pode ser menor que 0.',
            'any.required': 'O id_transacao é obrigatório.'
        })
});
