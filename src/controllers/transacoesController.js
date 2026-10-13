import supabase from '../config/supabase.js';
import { confirmarAlteracao } from '../middlewares/AuditoriaRota.js';
import { verificarUsuario, verificarCategoria, verificarContaBancaria, verificarTransacao, verificarRecorrencia } from '../validacoes/validarTabelas.js'

export async function verificarSaldoAtual(req, res) {
    const { id_conta } = req.query

    // Verifica se a conta existe e pertence ao usuario
    const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta, req.usuario.id_usuario)
    if (erroCont) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados. Tente novamente mais tarde" });
    } else if (!resCont) {
        return res.status(404).json({ mensagem: "Essa conta não existe ou não pertence ao usuario" });
    }

    const { data: saldo, error: erroSaldo } = await supabase
        .from('saldo_conta')
        .select('saldo')
        .eq('id_conta', id_conta)
        .order('data_atualizacao', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (erroSaldo) {
        return res.status(500).json({ mensagem: "Erro ao verificar o saldo atual" })
    }
    if (!saldo) {
        return res.status(200).json({ saldo: 0 })
    }
    return res.status(200).json(saldo)
}

export async function criarRecorrencia(req, res) {
    const {
        id_conta,
        id_categoria,
        tipo_transacao,
        modalidade,
        nome,
        descricao,
        forma_pagamento,
        destino,
        valor,
        frequencia,
        qtd_parcelas,
        data_inicio,
        ativo } = req.body;

    if (modalidade != 'Parcelado' && modalidade != "Periodico") {
        return res.status(400).json({ mensagem: "modalidade invalida!" })
    }
    // Verifica se a categoria existe e pertence ao usuario
    const { pertencimento: resCat, erro: erroCat } = await verificarCategoria(id_categoria, req.usuario.id_usuario)
    if (erroCat) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
    } else if (!resCat) {
        return res.status(404).json({ mensagem: "Essa categoria não existe ou não pertence ao usuario" });
    }

    // Verifica se a conta existe e pertence ao usuario
    const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta, req.usuario.id_usuario)
    if (erroCont) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
    } else if (!resCont) {
        return res.status(404).json({ mensagem: "Essa conta não existe ou não pertence ao usuario" });
    }

    // Verifica se o usuario existe e está ativo
    const { status: resUser, erro: erroUser } = await verificarUsuario(req.usuario.id_usuario)
    if (erroUser) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
    } else if (!resUser) {
        return res.status(404).json({ mensagem: "Esse usuario não existe ou não está ativo" });
    }

    const { error: erroCriaTransacao } = await supabase
        .from('recorrencias')
        .insert({
            id_usuario: req.usuario.id_usuario,
            id_conta: id_conta,
            id_categoria: id_categoria,
            tipo_transacao: tipo_transacao,
            modalidade: modalidade,
            nome: nome,
            descricao: descricao,
            forma_pagamento: forma_pagamento,
            destino: destino,
            valor: valor,
            frequencia: frequencia,
            qtd_parcelas: qtd_parcelas,
            data_inicio: data_inicio,
            ativo: ativo
        })
        .select()
        .single();

    if (erroCriaTransacao) {
        console.log("/usuario/criar-recorrencia: >>>>> Erro ao criar a recorrencia: " + erroCriaTransacao.message)
        return res.status(500).json({ mensagem: "Erro ao criar a transação, tente novamente mais tarde" })
    }
    console.log("/usuario/criar-recorrencia: recorrencia criada com sucesso")
    confirmarAlteracao(res, { id_usuario: req.usuario.id_usuario });
    return res.status(201).json({ mensagem: "Transações inseridas com sucesso" })

}

export async function editarRecorrencia(req, res) {
    const {
        id_recorrencia,
        id_conta,
        id_categoria,
        tipo_transacao,
        modalidade,
        nome,
        descricao,
        forma_pagamento,
        destino,
        valor,
        frequencia,
        qtd_parcelas,
        data_inicio,
        ativo } = req.body;

    //Verifica se a recorrencia existe e se pertence ao usuario
    const { pertencimento: resRec, erro: erroRec, consultaRecorrencia } = await verificarRecorrencia(id_recorrencia, req.usuario.id_usuario)
    if (erroRec) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
    } else if (!resRec) {
        return res.status(404).json({ mensagem: "Essa recorrencia não existe ou não pertence ao usuario" });
    }

    if ((modalidade ?? consultaRecorrencia.modalidade) === 'Parcelado') {
        const quantidade = qtd_parcelas === undefined ? consultaRecorrencia.qtd_parcelas : qtd_parcelas
        if (quantidade == null || (frequencia ?? consultaRecorrencia.frequencia) !== 'Mensal') {
            return res.status(400).json({ mensagem: "Recorrencia Parcelada exige quantidade de parcelas e frequência Mensal" })
        }
    }

    // Verifica se a categoria existe e pertence ao usuario
    if (id_categoria != null) {
        const { pertencimento: resCat, erro: erroCat } = await verificarCategoria(id_categoria, req.usuario.id_usuario)
        if (erroCat) {
            return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
        } else if (!resCat) {
            return res.status(404).json({ mensagem: "Essa categoria não existe ou não pertence ao usuario" });
        }
    }

    if (id_conta != null) {
        // Verifica se a conta existe e pertence ao usuario
        const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta, req.usuario.id_usuario)
        if (erroCont) {
            return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
        } else if (!resCont) {
            return res.status(404).json({ mensagem: "Essa conta não existe ou não pertence ao usuario" });
        }
    }

    // Verifica se o usuario existe e está ativo
    const { status: resUser, erro: erroUser } = await verificarUsuario(req.usuario.id_usuario)
    if (erroUser) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
    } else if (!resUser) {
        return res.status(404).json({ mensagem: "Esse usuario não existe ou não está ativo" });
    }
    const { data: alterados, error: erroEditaTransacao } = await supabase
        .from('recorrencias')
        .update({
            id_conta: id_conta,
            id_categoria: id_categoria,
            tipo_transacao: tipo_transacao,
            modalidade: modalidade,
            nome: nome,
            descricao: descricao,
            forma_pagamento: forma_pagamento,
            destino: destino,
            valor: valor,
            frequencia: frequencia,
            qtd_parcelas: qtd_parcelas,
            data_inicio: data_inicio,
            ativo: ativo
        })
        .eq('id_recorrencia', id_recorrencia)
        .eq('id_usuario', req.usuario.id_usuario)
        .select()
        .maybeSingle();

    if (erroEditaTransacao) {
        console.log("/usuario/editar-recorrencia: >>>>> Erro ao editar a recorrencia: " + erroEditaTransacao.message)
        return res.status(500).json({ mensagem: "Erro ao editar a recorrencia, tente novamente mais tarde" })
    }
    if (!alterados) {
        return res.status(404).json({ mensagem: "Esse registro não existe ou não pertence ao usuario" })
    }
    console.log("/usuario/editar-recorrencia: Recorrencia e suas transacoes editadas com sucesso")
    confirmarAlteracao(res, { id_usuario: req.usuario.id_usuario });
    return res.status(200).json({ mensagem: "Recorrencia e suas transações editadas com sucesso" })

}

export async function criarTransacao(req, res) {
    const { id_conta_origem, id_conta_destino, id_categoria, id_meta, tipo_transacao, nome, descricao, forma_pagamento, destino, valor_transacao, status_transacao, data_transacao, data_vencimento, data_pagamento } = req.body

    if (id_categoria != null) {
        const { pertencimento: resCat, erro: erroCat } = await verificarCategoria(id_categoria, req.usuario.id_usuario)
        if (erroCat) {
            return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
        } else if (!resCat) {
            return res.status(404).json({ mensagem: "Essa categoria não existe ou não pertence ao usuario" });
        }
    }

    // Verifica se a conta de origem existe e pertence ao usuario
    const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta_origem, req.usuario.id_usuario)
    if (erroCont) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados. Tente novamente mais tarde" });
    } else if (!resCont) {
        return res.status(404).json({ mensagem: "Essa conta não existe ou não pertence ao usuario" });
    }

    if (id_conta_destino != null) {
        // Verifica se a conta de destino existe
        const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta_destino, req.usuario.id_usuario)
        if (erroCont) {
            return res.status(500).json({ mensagem: "Erro ao verificar os dados. Tente novamente mais tarde" });
        } else if (!resCont) {
            return res.status(404).json({ mensagem: "Essa conta não existe ou não pertence ao usuario" });
        }
    }
    if (id_meta != null) {
        return res.status(400).json({ mensagem: "O vínculo com metas ainda não está disponível" })
    }

    // Verifica se o usuario existe e está ativo
    const { status: resUser, erro: erroUser } = await verificarUsuario(req.usuario.id_usuario)
    if (erroUser) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
    } else if (!resUser) {
        return res.status(404).json({ mensagem: "Esse usuario não existe ou não está ativo" });
    }

    const { error: erroCriarTransacao } = await supabase
        .from('transacoes')
        .insert({
            id_recorrencia: null,
            numero_parcela: null,
            id_conta_origem: id_conta_origem,
            id_conta_destino: id_conta_destino,
            id_categoria: id_categoria,
            id_meta: id_meta,
            tipo_transacao: tipo_transacao,
            nome: nome,
            descricao: descricao,
            forma_pagamento: forma_pagamento,
            destino: destino,
            valor_transacao: valor_transacao,
            status_transacao: status_transacao,
            data_transacao: data_transacao,
            data_vencimento: data_vencimento,
            data_pagamento: data_pagamento
        })
        .select()
        .single()

    if (erroCriarTransacao) {
        console.log("/usuario/criar-transacao: >>>> Erro ao criar a transação, tente novamente mais tarde")
        return res.status(500).json({ mensagem: "Erro ao criar a transação, tente novamente mais tarde" })
    }
    console.log("/usuario/criar-transacao: Transação criada com sucesso")
    confirmarAlteracao(res, { id_usuario: req.usuario.id_usuario });
    return res.status(201).json({ mensagem: "Transação criada com sucesso" })
}

export async function editarTransacao(req, res) {
    const { id_transacao, id_conta_origem, id_conta_destino, id_categoria, id_meta, tipo_transacao, nome, descricao, forma_pagamento, destino, valor_transacao, status_transacao, data_transacao, data_vencimento, data_pagamento } = req.body

    // Verifica se o usuario existe e está ativo
    const { status: resUser, erro: erroUser } = await verificarUsuario(req.usuario.id_usuario)
    if (erroUser) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
    } else if (!resUser) {
        return res.status(404).json({ mensagem: "Esse usuario não existe ou não está ativo" });
    }

    // Verifica se a transação existe e se pertence ao usuario
    const { pertencimento: resTrans, erro: erroTrans, consultaTransacao } = await verificarTransacao(id_transacao, req.usuario.id_usuario)
    if (erroTrans) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados. Tente novamente mais tarde" });
    } else if (!resTrans) {
        return res.status(404).json({ mensagem: "Essa transação não existe ou não pertence ao usuario" });
    }

    const tipoTransacao = tipo_transacao ?? consultaTransacao.tipo_transacao
    const contaOrigem = id_conta_origem ?? consultaTransacao.id_conta_origem
    const contaDestino = id_conta_destino === undefined ? consultaTransacao.id_conta_destino : id_conta_destino
    const categoria = id_categoria === undefined ? consultaTransacao.id_categoria : id_categoria
    if (tipoTransacao === 'Transferencia' && (contaDestino == null || Number(contaOrigem) === Number(contaDestino))) {
        return res.status(400).json({ mensagem: "A transferência precisa de contas de origem e destino diferentes" })
    }
    if (tipoTransacao !== 'Transferencia' && categoria == null) {
        return res.status(400).json({ mensagem: "A categoria é obrigatória para Entrada ou Saida" })
    }
    if ((status_transacao ?? consultaTransacao.status_transacao) === 'Pendente' && data_pagamento != null) {
        return res.status(400).json({ mensagem: "A data_pagamento deve ser NULL quando o status_transacao for Pendente" })
    }

    if (id_categoria != null) {
        // Verifica se a categoria existe e pertence ao usuario
        const { pertencimento: resCat, erro: erroCat } = await verificarCategoria(id_categoria, req.usuario.id_usuario)
        if (erroCat) {
            return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
        } else if (!resCat) {
            return res.status(404).json({ mensagem: "Essa categoria não existe ou não pertence ao usuario" });
        }
    }

    if (id_conta_origem != null) {
        // Verifica se a conta de origem existe e pertence ao usuario
        const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta_origem, req.usuario.id_usuario)
        if (erroCont) {
            return res.status(500).json({ mensagem: "Erro ao verificar os dados. Tente novamente mais tarde" });
        } else if (!resCont) {
            return res.status(404).json({ mensagem: "Essa conta não existe ou não pertence ao usuario" });
        }
    }

    if (id_conta_destino != null) {
        // Verifica se a conta de destino existe
        const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta_destino, req.usuario.id_usuario)
        if (erroCont) {
            return res.status(500).json({ mensagem: "Erro ao verificar os dados. Tente novamente mais tarde" });
        } else if (!resCont) {
            return res.status(404).json({ mensagem: "Essa conta não existe ou não pertence ao usuario" });
        }
    }
    if (id_meta != null) {
        return res.status(400).json({ mensagem: "O vínculo com metas ainda não está disponível" })
    }

    const { data: alterados, error: erroEditaTransacao } = await supabase
        .from('transacoes')
        .update({
            id_conta_origem: id_conta_origem,
            id_conta_destino: id_conta_destino,
            id_categoria: id_categoria,
            id_meta: id_meta,
            tipo_transacao: tipo_transacao,
            nome: nome,
            descricao: descricao,
            forma_pagamento: forma_pagamento,
            destino: destino,
            valor_transacao: valor_transacao,
            status_transacao: status_transacao,
            data_transacao: data_transacao,
            data_vencimento: data_vencimento,
            data_pagamento: status_transacao === 'Pendente' ? null : data_pagamento
        })
        .eq('id_transacao', id_transacao)
        .eq('id_conta_origem', consultaTransacao.id_conta_origem)
        .select()
        .maybeSingle()

    if (erroEditaTransacao) {
        console.log("/usuario/editar-transacao: >>>>> Erro ao editar a transsação")
        return res.status(500).json({ mensagem: "Erro ao editar a transação, tente novamente mais tarde" })
    }
    if (!alterados) {
        return res.status(404).json({ mensagem: "Esse registro não existe ou não pertence ao usuario" })
    }
    console.log("/usuario/editar-transacao: Transação editada com sucesso")
    confirmarAlteracao(res, { id_usuario: req.usuario.id_usuario });
    return res.status(200).json({ mensagem: "Transação editada com sucesso" })
}



// Lista as recorrencias do usuario
export async function listarRecorrencias(req, res) {
    const { id_contas, id_recorrencia } = req.query
    let consulta = supabase
        .from('recorrencias')
        .select('*')
        .eq('id_usuario', req.usuario.id_usuario)

    if (id_recorrencia != null) {
        consulta = consulta.eq('id_recorrencia', id_recorrencia)
    }
    if (id_contas) {
        consulta = consulta.in('id_conta', id_contas)
    }

    const { data: consultaRecorrencia, error: erroConsulta } = await consulta
    if (erroConsulta) {
        console.log("/usuario/listar-recorrencias: >>>>> Erro ao consultar: " + erroConsulta.message)
        return res.status(500).json({ mensagem: "Erro ao consultar as recorrencias, tente novamente mais tarde" })
    }
    return res.status(200).json(consultaRecorrencia)
}

// Lista apenas transações das contas de origem do usuario
export async function listarTransacoes(req, res) {
    const { id_contas, id_categoria, id_transacao, id_recorrencia, nome, status, periodo_criacao, periodo_vencimento } = req.query

    if (periodo_criacao && periodo_criacao[0] > periodo_criacao[1] || periodo_vencimento && periodo_vencimento[0] > periodo_vencimento[1]) {
        return res.status(400).json({ mensagem: "A data inicial não pode ser posterior à data final" })
    }

    let contas = supabase
        .from('contas_bancarias')
        .select('id_conta')
        .eq('id_usuario', req.usuario.id_usuario)
    if (id_contas) {
        contas = contas.in('id_conta', id_contas)
    }
    const { data: consultaConta, error: erroConta } = await contas
    if (erroConta) {
        console.log("/usuario/listar-transacoes: >>>>> Erro ao consultar as contas: " + erroConta.message)
        return res.status(500).json({ mensagem: "Erro ao consultar as contas, tente novamente mais tarde" })
    }
    if (!consultaConta.length) {
        return res.status(200).json([])
    }

    let consulta = supabase
        .from('transacoes')
        .select('*')
        .in('id_conta_origem', consultaConta.map(conta => conta.id_conta))
    if (id_categoria != null) {
        consulta = consulta.eq('id_categoria', id_categoria)
    }
    if (id_transacao != null) {
        consulta = consulta.eq('id_transacao', id_transacao)
    }
    if (id_recorrencia != null) {
        consulta = consulta.eq('id_recorrencia', id_recorrencia)
    }
    if (nome) {
        consulta = consulta.ilike('nome', `%${nome}%`)
    }
    if (status) {
        consulta = consulta.eq('status_transacao', status)
    }
    if (periodo_criacao) {
        // Inclui todo o último dia, mesmo quando data_criacao é timestamp
        const fimCriacao = new Date(`${periodo_criacao[1]}T00:00:00Z`)
        if (Number.isNaN(fimCriacao.getTime())) {
            return res.status(400).json({ mensagem: "Período de criação inválido" })
        }
        fimCriacao.setUTCDate(fimCriacao.getUTCDate() + 1)
        consulta = consulta.gte('data_criacao', periodo_criacao[0]).lt('data_criacao', fimCriacao.toISOString().slice(0, 10))
    }
    if (periodo_vencimento) {
        consulta = consulta.gte('data_vencimento', periodo_vencimento[0]).lte('data_vencimento', periodo_vencimento[1])
    }

    const { data: consultaTransacao, error: erroConsulta } = await consulta
    if (erroConsulta) {
        console.log("/usuario/listar-transacoes: >>>>> Erro ao consultar: " + erroConsulta.message)
        return res.status(500).json({ mensagem: "Erro ao consultar as transações, tente novamente mais tarde" })
    }
    return res.status(200).json(consultaTransacao)
}

// Cancela a recorrencia e preserva as transações pagas
export async function excluirRecorrencia(req, res) {
    const { id_recorrencia } = req.params
    const { pertencimento: resRec, erro: erroRec } = await verificarRecorrencia(id_recorrencia, req.usuario.id_usuario)
    if (erroRec) {
        return res.status(500).json({ mensagem: "Erro ao verificar a recorrencia, tente novamente mais tarde" })
    }
    if (!resRec) {
        return res.status(404).json({ mensagem: "Essa recorrencia não existe ou não pertence ao usuario" })
    }

    // Inativa primeiro para interromper a geração de novas ocorrências
    const { data: recorrenciaEditada, error: erroEditar } = await supabase
        .from('recorrencias')
        .update({ ativo: false })
        .eq('id_recorrencia', id_recorrencia)
        .eq('id_usuario', req.usuario.id_usuario)
        .select('id_recorrencia')
        .maybeSingle()
    if (erroEditar) {
        console.log("/usuario/excluir-recorrencia: >>>>> Erro ao inativar: " + erroEditar.message)
        return res.status(500).json({ mensagem: "Erro ao inativar a recorrencia, tente novamente mais tarde" })
    }
    if (!recorrenciaEditada) {
        return res.status(404).json({ mensagem: "Essa recorrencia não existe ou não pertence ao usuario" })
    }

    const { error: erroExcluir } = await supabase
        .from('transacoes')
        .delete()
        .eq('id_recorrencia', id_recorrencia)
        .eq('status_transacao', 'Pendente')
    if (erroExcluir) {
        console.log("/usuario/excluir-recorrencia: >>>>> Erro ao excluir pendentes: " + erroExcluir.message)
        return res.status(500).json({ mensagem: "Recorrencia inativada, mas houve erro ao excluir as transações pendentes. Tente cancelar novamente" })
    }
    console.log("/usuario/excluir-recorrencia: Recorrencia cancelada com sucesso")
    confirmarAlteracao(res, { id_usuario: req.usuario.id_usuario });
    return res.status(200).json({ mensagem: "Recorrencia cancelada com sucesso" })
}

export async function excluirTransacao(req, res) {
    const { id_transacao } = req.params
    const { pertencimento: resTrans, erro: erroTrans, consultaTransacao } = await verificarTransacao(id_transacao, req.usuario.id_usuario)
    if (erroTrans) {
        return res.status(500).json({ mensagem: "Erro ao verificar a transação, tente novamente mais tarde" })
    }
    if (!resTrans) {
        return res.status(404).json({ mensagem: "Essa transação não existe ou não pertence ao usuario" })
    }

    const { data: transacaoExcluida, error: erroExcluir } = await supabase
        .from('transacoes')
        .delete()
        .eq('id_transacao', id_transacao)
        .eq('id_conta_origem', consultaTransacao.id_conta_origem)
        .select('id_transacao')
        .maybeSingle()
    if (erroExcluir) {
        console.log("/usuario/excluir-transacao: >>>>> Erro ao excluir: " + erroExcluir.message)
        return res.status(500).json({ mensagem: "Erro ao excluir a transação, tente novamente mais tarde" })
    }
    if (!transacaoExcluida) {
        return res.status(404).json({ mensagem: "Essa transação não existe ou não pertence ao usuario" })
    }
    console.log("/usuario/excluir-transacao: Transação excluída com sucesso")
    confirmarAlteracao(res, { id_usuario: req.usuario.id_usuario });
    return res.status(200).json({ mensagem: "Transação excluída com sucesso" })
}
