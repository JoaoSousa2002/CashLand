import supabase from '../config/supabase.js';
import { confirmarAlteracao } from '../middlewares/AuditoriaRota.js';
import { verificarContaBancaria, verificarMeta } from '../validacoes/validarTabelas.js'

export async function criarMeta(req, res) {
    const { id_conta, nome, descricao, valor_meta, data_meta } = req.body;

    const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta, req.usuario.id_usuario)
    if (erroCont) {
        return res.status(500).json({ mensagem: "Erro ao verificar a conta bancaria, tente novamente mais tarde" })
    }
    if (!resCont) {
        return res.status(404).json({ mensagem: "Essa conta bancaria não existe ou está destaivada" })
    }


    // Verifica se já existe uma meta com esse nome nas contas do usuario
    const { data: nomeExistente, error: erroNome } = await supabase
        .from('metas')
        .select('id_meta, contas_bancarias!inner(id_usuario)')
        .eq('contas_bancarias.id_usuario', req.usuario.id_usuario)
        .eq('nome', nome)
        .limit(1)
        .maybeSingle()

    if (erroNome) {
        return res.status(500).json({ mensagem: "Erro ao verificar o nome da meta, tente novamente mais tarde" })
    }
    if (nomeExistente) {
        return res.status(409).json({ mensagem: "Já existe uma meta com esse nome" })
    }

    // Cria a meta
    const { data: criada, error: erroCriaMeta } = await supabase
        .from('metas')
        .insert({
            id_conta: id_conta,
            nome: nome,
            descricao: descricao,
            valor_meta: valor_meta,
            data_meta: data_meta
        })
        .select('id_meta')
        .maybeSingle()

    if (erroCriaMeta) {
        // Unicidade do nome garantida pelo trigger do banco (RN-03)
        if (erroCriaMeta.code === '23505') {
            return res.status(409).json({ mensagem: "Já existe uma meta com esse nome" })
        }
        console.log("/usuario/criar-meta: >>>>> Erro ao criar a meta: " + erroCriaMeta.message)
        return res.status(500).json({ mensagem: "Erro ao criar a meta, tenve novamente mais tarde" })
    }
    if (!criada) return res.status(500).json({ mensagem: "Não foi possível confirmar a criação da meta" });
    confirmarAlteracao(res, { id_usuario: req.usuario.id_usuario });
    console.log("/usuario/criar-meta: Meta criada com sucesso")
    return res.status(201).json({ mensagem: "Meta criada com sucesso" })

}

export async function listarMetas(req, res) {
    const { pesquisa, id_contas, status } = req.query

    // Verifica as contas informadas
    for (const id_conta of id_contas ?? []) {
        const { existencia, pertencimento, erro } = await verificarContaBancaria(
            id_conta,
            req.usuario.id_usuario
        )
        if (erro) {
            return res.status(500).json({
                mensagem: "Erro ao verificar a conta bancaria, tente novamente mais tarde"
            })
        }
        if (!existencia || !pertencimento) {
            return res.status(404).json({
                mensagem: "Uma das contas bancarias não existe ou não pertence ao usuario"
            })
        }
    }

    // Restringe as metas às contas do usuario, independentemente dos filtros.
    // Os valores dos filtros são passados como parâmetros do cliente Supabase,
    // sem montar strings de filtro do PostgREST com texto informado pelo usuario.
    let consulta = supabase
        .from('metas')
        .select('*, contas_bancarias!inner(id_usuario)')
        .eq('contas_bancarias.id_usuario', req.usuario.id_usuario)

    if (id_contas?.length > 0) {
        consulta = consulta.in('id_conta', id_contas)
    }

    if (status) {
        consulta = consulta.eq('status', status)
    }

    if (pesquisa?.trim()) {
        const textoPesquisa = pesquisa.trim()

        // Texto somente numérico dentro do intervalo de integer: pesquisa por nome ou pelo
        // identificador. A string de filtro contém apenas os dígitos já validados.
        if (/^\d+$/.test(textoPesquisa) && Number(textoPesquisa) <= 2147483647) {
            consulta = consulta.or(`nome.ilike.%${textoPesquisa}%,id_meta.eq.${textoPesquisa}`)
        } else {
            consulta = consulta.ilike('nome', `%${textoPesquisa}%`)
        }
    }

    const { data: consultaMeta, error: erroConsultaMeta } = await consulta

    if (erroConsultaMeta) {
        console.log("/usuario/listar-metas: >>>>> Erro ao listar as metas: " + erroConsultaMeta.message)
        return res.status(500).json({
            mensagem: "Erro ao listar as metas, tente novamente mais tarde"
        })
    }
    if (consultaMeta.length === 0) {
        return res.status(404).json({
            mensagem: "Nenhuma meta encontrada"
        })
    }


    console.log("/usuario/listar-metas: Metas listadas com sucesso")
    return res.status(200).json({
        mensagem: "Metas listadas com sucesso",
        metas: consultaMeta
    })
}

export async function editarMeta(req, res) {
    const { id_meta, id_conta, nome, descricao, valor_meta, data_meta } = req.body;

    if (id_conta) {
        const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta, req.usuario.id_usuario)
        if (erroCont) {
            return res.status(500).json({ mensagem: "Erro ao verificar a conta bancaria, tente novamente mais tarde" })
        }
        if (!resCont) {
            return res.status(404).json({ mensagem: "Essa conta bancaria não existe ou está destaivada" })
        }
    }

    const { pertencimento: resMeta, erro: erroMeta, consultaMeta } = await verificarMeta(id_meta, req.usuario.id_usuario)
    if (erroMeta) {
        return res.status(500).json({ mensagem: "Erro ao verificar a meta, tente novamente mais tarde" })
    }
    if (!resMeta) {
        return res.status(404).json({ mensagem: "Essa meta não existe" })
    }

    if (nome !== undefined) {
        // Desconsidera a própria meta ao verificar nomes repetidos do usuario
        const { data: nomeExistente, error: erroNome } = await supabase
            .from('metas')
            .select('id_meta, contas_bancarias!inner(id_usuario)')
            .eq('contas_bancarias.id_usuario', req.usuario.id_usuario)
            .eq('nome', nome)
            .neq('id_meta', id_meta)
            .limit(1)
            .maybeSingle()

        if (erroNome) {
            return res.status(500).json({ mensagem: "Erro ao verificar o nome da meta, tente novamente mais tarde" })
        }
        if (nomeExistente) {
            return res.status(409).json({ mensagem: "Já existe uma meta com esse nome" })
        }
    }

    // Edita a meta. A escrita também filtra pela conta verificada como do usuario,
    // para não atingir a meta se o vínculo mudar entre a verificação e a gravação.
    const { data: alterada, error: erroEditaMeta } = await supabase
        .from('metas')
        .update({
            id_conta: id_conta,
            nome: nome,
            descricao: descricao,
            valor_meta: valor_meta,
            data_meta: data_meta
        })
        .eq('id_meta', id_meta)
        .eq('id_conta', consultaMeta.id_conta)
        .select('id_meta')
        .maybeSingle()

    if (erroEditaMeta) {
        if (erroEditaMeta.code === '23505') {
            return res.status(409).json({ mensagem: "Já existe uma meta com esse nome" })
        }
        console.log("/usuario/editar-meta: >>>>> Erro ao editar a meta: " + erroEditaMeta.message)
        return res.status(500).json({ mensagem: "Erro ao editar a meta, tenve novamente mais tarde" })
    }
    if (!alterada) return res.status(404).json({ mensagem: "Essa meta não existe" });
    confirmarAlteracao(res, { id_usuario: req.usuario.id_usuario });
    console.log("/usuario/editar-meta: Meta editada com sucesso")
    return res.status(200).json({ mensagem: "Meta editada com sucesso" })
}

export async function deletarMeta(req, res) {
    const { id_meta } = req.params

    const { pertencimento: resMeta, erro: erroMeta, consultaMeta } = await verificarMeta(id_meta, req.usuario.id_usuario)
    if (erroMeta) {
        return res.status(500).json({ mensagem: "Erro ao verificar a meta, tente novamente mais tarde" })
    }
    if (!resMeta) {
        return res.status(404).json({ mensagem: "Essa meta não existe" })
    }

    const { data: excluida, error: erroDeletaMeta } = await supabase
        .from('metas')
        .delete()
        .eq('id_meta', id_meta)
        .eq('id_conta', consultaMeta.id_conta)
        .select('id_meta')
        .maybeSingle()

    if (erroDeletaMeta) {
        console.log("/usuario/deletar-meta: >>>>> Erro ao deletar a meta: " + erroDeletaMeta.message)
        return res.status(500).json({ mensagem: "Erro ao deletar a meta, tenve novamente mais tarde" })
    }
    if (!excluida) return res.status(404).json({ mensagem: "Essa meta não existe" });
    confirmarAlteracao(res, { id_usuario: req.usuario.id_usuario });
    console.log("/usuario/deletar-meta: Meta deletada com sucesso")
    return res.status(200).json({ mensagem: "Meta deletada com sucesso" })
}
