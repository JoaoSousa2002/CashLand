import supabase from '../config/supabase.js';
import { confirmarAlteracao } from '../middlewares/AuditoriaRota.js';
import { verificarContaBancaria, verificarMeta, verificarUsuario } from '../validacoes/validarTabelas.js'

export async function listarMetas(req, res) {
    const { pesquisa, id_contas, status, id_usuario } = req.query

    // Verifica as contas informadas
    for (const id_conta of id_contas ?? []) {
        const { existencia, pertencimento, erro } = await verificarContaBancaria(
            id_conta,
            id_usuario ?? req.usuario.id_usuario
        )

        if (erro) {
            return res.status(500).json({
                mensagem: "Erro ao verificar a conta bancaria, tente novamente mais tarde"
            })
        }

        if (!existencia) {
            return res.status(404).json({
                mensagem: "Uma das contas bancarias não existe"
            })
        }

        // Confere o pertencimento somente quando um usuario é informado
        if (id_usuario && !pertencimento) {
            return res.status(404).json({
                mensagem: "Uma das contas bancarias não pertence ao usuario informado"
            })
        }
    }

    // Essa condição aceita todas as metas quando nenhum filtro é informado
    const filtros = ['id_meta.not.is.null']

    if (id_contas?.length > 0) {
        filtros.push(`id_conta.in.(${id_contas.join(',')})`)
    }

    if (status) {
        filtros.push(`status.eq.${JSON.stringify(status)}`)
    }

    if (pesquisa?.trim()) {
        const textoPesquisa = pesquisa.trim()
        const filtroNome = `nome.ilike.${JSON.stringify(`%${textoPesquisa}%`)}`

        // Pesquisa por nome ou pelo identificador, quando o texto é numérico
        if (/^\d+$/.test(textoPesquisa)) {
            filtros.push(`or(${filtroNome},id_meta.eq.${textoPesquisa})`)
        } else {
            filtros.push(filtroNome)
        }
    }

    // Filtra pelo usuario somente quando informado
    const filtroUsuario = {}

    if (id_usuario) {
        // Verifica se o usuario existe
        const { existencia: resUser, erro: erroUser } = await verificarUsuario(id_usuario)
        if (erroUser) {
            return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
        } else if (!resUser) {
            return res.status(404).json({ mensagem: "Esse usuario não existe" });
        }
        filtroUsuario['contas_bancarias.id_usuario'] = id_usuario
    }

    const { data: consultaMeta, error: erroConsultaMeta } = await supabase
        .from('metas')
        .select('*, contas_bancarias!inner(id_usuario)')
        .match(filtroUsuario)
        .or(`and(${filtros.join(',')})`)

    if (erroConsultaMeta) {
        console.log("/admin/listar-metas: >>>>> Erro ao listar as metas: " + erroConsultaMeta.message)
        return res.status(500).json({
            mensagem: "Erro ao listar as metas, tente novamente mais tarde"
        })
    }

    if (consultaMeta.length === 0) {
        return res.status(404).json({
            mensagem: "Nenhuma meta encontrada"
        })
    }

    console.log("/admin/listar-metas: Metas listadas com sucesso")
    return res.status(200).json({
        mensagem: "Metas listadas com sucesso",
        metas: consultaMeta
    })
}

export async function editarMeta(req, res) {
    const { id_meta, id_usuario, id_conta, nome, descricao, valor_meta, data_meta } = req.body;

    if (id_conta) {
        const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta, id_usuario)
        if (erroCont) {
            return res.status(500).json({ mensagem: "Erro ao verificar a conta bancaria do usuario, tente novamente mais tarde" })
        }
        if (!resCont) {
            return res.status(404).json({ mensagem: "Essa conta bancaria não existe ou não pertence a este usuario" })
        }
    }

    // Verifica se o usuario existe
    const { existencia: resUser, erro: erroUser } = await verificarUsuario(id_usuario)
    if (erroUser) {
        return res.status(500).json({ mensagem: "Erro ao verificar os dados.Tente novamente mais tarde" });
    } else if (!resUser) {
        return res.status(404).json({ mensagem: "Esse usuario não existe" });
    }

    // Verifica se a meta existe e pertence ao usuario
    const { pertencimento: resMeta, erro: erroMeta } = await verificarMeta(id_meta, id_usuario)
    if (erroMeta) {
        return res.status(500).json({ mensagem: "Erro ao verificar a meta do usuario, tente novamente mais tarde" })
    }
    if (!resMeta) {
        return res.status(404).json({ mensagem: "Essa meta não existe ou não pertence a este usuario" })
    }

    if (nome !== undefined) {
        // Desconsidera a própria meta ao verificar nomes repetidos do usuario
        const { data: nomeExistente, error: erroNome } = await supabase
            .from('metas')
            .select('id_meta, contas_bancarias!inner(id_usuario)')
            .eq('contas_bancarias.id_usuario', id_usuario)
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

    // Edita a meta
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
        .select('id_meta')
        .maybeSingle()

    if (erroEditaMeta) {
        console.log("/admin/editar-meta: >>>>> Erro ao editar a meta: " + erroEditaMeta.message)
        return res.status(500).json({ mensagem: "Erro ao editar a meta, tente novamente mais tarde" })
    }
    if (!alterada) {
        return res.status(404).json({ mensagem: "Essa meta não existe" });
    }
    confirmarAlteracao(res, { id_usuario });
    console.log("/admin/editar-meta: Meta editada com sucesso")
    return res.status(200).json({ mensagem: "Meta editada com sucesso" })
}

export async function deletarMeta(req, res) {
    const { id_meta, id_usuario } = req.params

    //Verifica se a meta existe e se pertence ao usuario
    const { pertencimento: resMeta, erro: erroMeta } = await verificarMeta(id_meta, id_usuario)
    if (erroMeta) {
        return res.status(500).json({ mensagem: "Erro ao verificar a meta do usuario, tente novamente mais tarde" })
    }
    if (!resMeta) {
        return res.status(404).json({ mensagem: "Essa meta não existe ou não pertence ao usuario" })
    }

    const { data: excluida, error: erroDeletaMeta } = await supabase
        .from('metas')
        .delete()
        .eq('id_meta', id_meta)
        .select('id_meta')
        .maybeSingle()

    if (erroDeletaMeta) {
        console.log("/admin/deletar-meta: >>>>> Erro ao deletar a meta: " + erroDeletaMeta.message)
        return res.status(500).json({ mensagem: "Erro ao deletar a meta, tenve novamente mais tarde" })
    }
    if (!excluida) return res.status(404).json({ mensagem: "Essa meta não existe" });
    confirmarAlteracao(res, { id_usuario });
    console.log("/admin/deletar-meta: Meta deletada com sucesso")
    return res.status(200).json({ mensagem: "Meta deletada com sucesso" })
}
