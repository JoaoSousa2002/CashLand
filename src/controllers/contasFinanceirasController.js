import supabase from '../config/supabase.js';
import { confirmarAlteracao } from '../middlewares/AuditoriaRota.js';

// Criar conta
export async function criarContaFinanceira(req, res) {
    const { nome_conta, tipo_conta, codigo_conta, nome_instituicao } = req.body;
    if (nome_conta.trim().toLowerCase() === "padrão") {
        return res.status(409).json({
            mensagem: "O nome 'padrão' é reservado pelo sistema."
        });
    }
    const { data: consultaNome, error: erroConsulta } = await supabase
        .from('contas_bancarias')
        .select('nome_conta')
        .eq('id_usuario', req.usuario.id_usuario)
        .eq('nome_conta', nome_conta)
        .maybeSingle()

    if (erroConsulta) {
        console.log('/usuario/criar-conta-financeira: >>>>> Erro ao consultar a conta: ' + erroConsulta.message)
        return res.status(500).json({ mensagem: "Erro ao criar a conta, tente novamente mais tarde" })
    } else if (consultaNome) {
        console.log("/usuario/criar-conta: >>>>> Já existe uma conta com esse nome")
        return res.status(409).json({ mensagem: "Já existe uma conta com esse nome" })
    }

    const { error } = await supabase
        .from('contas_bancarias')
        .insert({
            nome_conta: nome_conta,
            id_usuario: req.usuario.id_usuario,
            tipo_conta: tipo_conta,
            codigo_conta: codigo_conta,
            nome_instituicao: nome_instituicao
        })
        .eq('id_usuario', req.usuario.id_usuario)
        .select()
        .single()

    if (error) {
        console.log('/usuario/criar-conta-financeira: >>>>> Erro ao criar a conta: ' + error.message)
        return res.status(500).json({ mensagem: "Erro ao criar a conta, tente novamente mais tarde" })
    }
    console.log("/usuario/criar-conta: Conta criada com sucesso")
    return res.status(200).json({ mensagem: "Conta criada com sucesso" })
}
// Listar contas
export async function listarContasFinanceiras(req, res) {
    const { pesquisa } = req.query
    if (!pesquisa || pesquisa === "") {
        const { data: listaContas, error: erroConsulta } = await supabase
            .from('contas_bancarias')
            .select('id_conta, nome_conta, codigo_conta, tipo_conta, nome_instituicao, status_conta')
            .eq('id_usuario', req.usuario.id_usuario)

        if (erroConsulta) {
            console.log('/usuario/listar-contas: >>>>> Erro ao consultar as conta: ' + erroConsulta.message)
            return res.status(500).json({ mensagem: "Erro ao consultar as conta, tente novamente mais tarde" })
        } else if (listaContas) {
            console.log("/usuario/listar-contas: Todos os dados retornados com sucesso")
            return res.status(200).json( listaContas )
        }
    }

    const condicoes = [`nome_conta.ilike.%${pesquisa}%`];
    // só tenta buscar por ID se o termo for um número válido
    if (!isNaN(pesquisa)) {
        condicoes.push(`id_conta.eq.${pesquisa}`);
        //Verifica se a conta existe
        const { data: Consulta, error: erroConsulta } = await supabase
            .from('contas_bancarias')
            .select('id_conta, id_usuario')
            .eq('id_conta', pesquisa)
            .eq('id_usuario', req.usuario.id_usuario)
            .maybeSingle()

        if (erroConsulta) {
            return res.status(500).json({ mensagem: "Erro ao verificar a conta, tente novamente mais tarde" });
        }
        if (!Consulta) {
            return res.status(404).json({ mensagem: "Essa conta não existe" });
        }
    }

    const { data: pesquisaNome, error: erroPesquisaNome } = await supabase
        .from('contas_bancarias')
        .select('id_conta, nome_conta, codigo_conta, tipo_conta, nome_instituicao, status_conta')
        .eq('id_usuario', req.usuario.id_usuario)
        .order('id_conta', { ascending: true })
        .or(condicoes.join(''))

    if (erroPesquisaNome) {
        console.log("/usuario/listar-contas: >>>>> Erro ao listar as contas do usuario: " + erroPesquisaNome)
        return res.status(500).json({ mensagem: "Erro ao consultar as contas, tente novamente mais tarde" })
    } else if (pesquisaNome) {
        console.log("/usuario/listar-contas: Pesquisa retornada")
        return res.status(200).json(pesquisaNome)
    }
}
// Editar conta
export async function editarConta(req, res) {
    const { id_conta, nome_conta, tipo_conta, codigo_conta, nome_instituicao } = req.body
    if (nome_conta.trim().toLowerCase() === "padrão") {
        return res.status(409).json({
            mensagem: "Esse nome é reservado pelo sistema."
        });
    }
    //Verifica se a conta existe ou se é a conta padrão
    const { data: Consulta, error: erroConsulta } = await supabase
        .from('contas_bancarias')
        .select('id_conta, id_usuario, nome_conta')
        .eq('id_conta', id_conta)
        .eq('id_usuario', req.usuario.id_usuario)
        .select()
        .maybeSingle()

    if (erroConsulta) {
        console.log(erroConsulta)
        return res.status(500).json({ mensagem: "Erro ao verificar a conta, tente novamente mais tarde" });
    } else if (!Consulta) {
        return res.status(404).json({ mensagem: "Essa conta não existe" });
    } else if (Consulta.nome_conta === 'padrão') {
        return res.status(400).json({ mensagem: "Essa conta não pode ser editada" })
    }

    //Verifica se existe outra conta com esse nome
    const { data: nomeExistente, error: erroNome } = await supabase
        .from('contas_bancarias')
        .select('id_conta, nome_conta')
        .eq('id_usuario', req.usuario.id_usuario)
        .ilike('nome_conta', nome_conta)
        .neq('id_conta', id_conta)
        .maybeSingle();

    if (erroNome) {
        console.log(erroNome)
        return res.status(500).json({ mensagem: "Erro ao consultar as contas, tente novamente mais tarde" })
    } else if (nomeExistente) {
        return res.status(409).json({ mensagem: "já existe uma conta com esse nome" })
    }

    const {error: erroEdita } = await supabase
        .from('contas_bancarias')
        .update({
            nome_conta: nome_conta,
            tipo_conta: tipo_conta,
            codigo_conta: codigo_conta,
            nome_instituicao: nome_instituicao
        })
        .eq('id_conta', id_conta)
        .eq('id_usuario', req.usuario.id_usuario)
        .single()

    if (erroEdita) {
        console.log("/usuairo/editar-conta: >>>>> Erro: " + erroEdita)
        return res.status(500).json({ mensagem: "Erro ao editar a conta, tente novamente mais tarde" })
    }
    return res.status(200).json({ mensagem: "Conta editada com sucesso" })

}
// Inativar conta
export async function inativarConta(req, res) {
    const { id_conta } = req.body

    //Verifica se a conta existe ou se é a conta padrão
    const { data: Consulta, error: erroConsulta } = await supabase
        .from('contas_bancarias')
        .select('id_conta, nome_conta')
        .eq('id_conta', id_conta)
        .eq('id_usuario', req.usuario.id_usuario)
        .select()
        .maybeSingle()

    if (erroConsulta) {
        console.log("/usuario/inativar-conta: >>>>> Erro ao inativar a conta: "+erroConsulta)
        return res.status(500).json({ mensagem: "Erro ao verificar a conta, tente novamente mais tarde" });
    } else if (!Consulta) {
        console.log("/usuario/inativar-conta: >>>>> Essa conta não existe")
        return res.status(404).json({ mensagem: "Essa conta não existe" });
    } else if (Consulta.nome_conta === 'padrão') {
        console.log("/usuario/inativar-conta: >>>>> Essa conta não pode ser inativada 'padrão'")
        return res.status(400).json({ mensagem: "Essa conta não pode ser inativada" })
    }

    // Inativa a conta (soft-delete)
    const {error: erroEdita } = await supabase
        .from('contas_bancarias')
        .update({
            status_conta: "Inativo"
        })
        .eq('id_conta', id_conta)
        .eq('id_usuario', req.usuario.id_usuario)
        .single()

    if (erroEdita) {
        console.log("/usuario/editar-conta: >>>>> Erro: " + erroEdita)
        return res.status(500).json({ mensagem: "Erro ao inativar a conta, tente novamente mais tarde" })
    }
    console.log("/usuario/inativar-conta: Conta inativada com sucesso")
    return res.status(200).json({ mensagem: "Conta inativada com sucesso" })

}