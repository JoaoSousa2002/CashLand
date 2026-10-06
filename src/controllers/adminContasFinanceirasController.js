import supabase from '../config/supabase.js';


// Listar contas
export async function listarContasFinanceiras(req, res) {
    console.log(req.originalUrl);
    console.log(req.query);
    const { pesquisa, id_usuario } = req.query

    console.log(pesquisa + ", " + id_usuario)

    // Verifica se o usuario existe
    if (id_usuario) {
        const { data: Consulta, error: erroConsulta } = await supabase
            .from('contas_bancarias')
            .select('id_conta, nome_conta, codigo_conta, tipo_conta, nome_instituicao, status_conta')
            .eq('id_usuario', id_usuario)

        if (erroConsulta) {
            console.log('/admin/listar-contas: >>>>> Erro ao consultar o usuario: ' + erroConsulta.message)
            return res.status(500).json({ mensagem: "Erro ao consultar o usuario, tente novamente mais tarde" })
        } else if (!Consulta) {
            console.log("/admin/listar-contas: Esse usuario não existe")
            return res.status(200).json({ mensagem: "Esse usuario não existe" })
        }
        console.log("Esse usuario existe")
    }
    
    
    // Faz a pesquisa total pelo ID do usuario (retorna todas as contas do pelo id do usuario)
    // +++++++++++++++++OK++++++++++++
    if ((!pesquisa || pesquisa === "") && id_usuario) {
        console.log("Pesquisa de conta total com ID_USUARIO")

        const { data: listaContas, error: erroConsulta } = await supabase
            .from('contas_bancarias')
            .select('*, usuarios!inner(nome)')
            .eq('id_usuario', id_usuario)

        if (erroConsulta) {
            console.log('/usuario/listar-contas: >>>>> Erro ao consultar as conta: ' + erroConsulta.message)
            return res.status(500).json({ mensagem: "Erro ao consultar as conta, tente novamente mais tarde" })
        } else if (listaContas) {
            console.log("/usuario/listar-contas: Todos os dados retornados com sucesso")
            return res.status(200).json(listaContas)
        } else if (listaContas.lenght === 0) {
            return res.status(409).json({ mensagem: "Esse usuario não possui contas" })
        }

    }
    // +++++++++++++++++OK++++++++++++
    // Faz a pesquisa total sem ID (retorna todas as contas de todos os usuarios)
    else if ((!pesquisa || pesquisa === "") && !id_usuario || (id_usuario === "")) {
        console.log("Pesquisa de conta total sem ID_USUARIO")
        const { data: listaContas, error: erroConsulta } = await supabase
            .from('contas_bancarias')
            .select('*, usuarios!inner(nome)')


        if (erroConsulta) {
            console.log('/admin/listar-contas: >>>>> Erro ao consultar as conta: ' + erroConsulta.message)
            return res.status(500).json({ mensagem: "Erro ao consultar as conta, tente novamente mais tarde" })
        } else if (listaContas) {
            console.log("/admin/listar-contas: Todos os dados retornados com sucesso")
            return res.status(200).json(listaContas)
        } else if (listaContas.lenght === 0) {
            return res.status(409).json({ mensagem: "O sistema não possui contas financeiras" })
        }
    }

    // Pesquisa com filtro e ID_usuario
    if ((pesquisa || pesquisa != "") && id_usuario) {
        console.log("Pesquisa de conta com filtro e usuario")
        const condicoes = [`nome_conta.ilike.%${pesquisa}%`];
        // só tenta buscar por ID se o termo for um número válido
        if (!isNaN(pesquisa)) {
            condicoes.push(`id_conta.eq.${pesquisa}`);

            //Verifica se a conta existe
            const { data: Consulta, error: erroConsulta } = await supabase
                .from('contas_bancarias')
                .select('id_conta, id_usuario')
                .eq('id_usuario', id_usuario)
                .or(condicoes.join(','))
                .maybeSingle()

            if (erroConsulta) {
                console.log("erro: " + erroConsulta.message)
                return res.status(500).json({ mensagem: "Erro ao verificar a conta, tente novamente mais tarde" });
            }
            if (!Consulta) {
                return res.status(404).json({ mensagem: "Essa conta não existe" });
            }

            const { data: pesquisaNome, error: erroPesquisaNome } = await supabase
                .from('contas_bancarias')
                .select('*, usuarios!inner(nome)')
                .eq('id_usuario', id_usuario)
                .order('id_conta', { ascending: true })
                .or(condicoes.join(','))

            if (erroPesquisaNome) {
                console.log("/admin/listar-contas: >>>>> Erro ao listar as contas do usuario: " + erroPesquisaNome)
                return res.status(500).json({ mensagem: "Erro ao consultar as contas, tente novamente mais tarde" })
            } else if (pesquisaNome) {
                console.log("/admin/listar-contas: Pesquisa retornada")
                return res.status(200).json(pesquisaNome)
            }
        }
        const { data: pesquisaNome, error: erroPesquisaNome } = await supabase
        .from('contas_bancarias')
            .select('*, usuarios!inner(nome)')
            .eq('id_usuario', id_usuario)
            .order('id_conta', { ascending: true })
            .or(condicoes.join(','))

        if (erroPesquisaNome) {
            console.log("/admin/listar-contas: >>>>> Erro ao listar as contas do usuario: " + erroPesquisaNome)
            return res.status(500).json({ mensagem: "Erro ao consultar as contas, tente novamente mais tarde" })
        } else if (pesquisaNome) {
            console.log("/admin/listar-contas: Pesquisa retornada")
            return res.status(200).json(pesquisaNome)
        } else if (pesquisaNome.length === 0) {
            return res.status(409).json({ mensagem: "Conta não encontrada" })
        }
    }
    // Pesquisa com filtro mas sem id do usuario
    else if (pesquisa && !id_usuario) {

        console.log("Pesquisa de conta com filtro e sem usuario")
        const condicoes = [`nome_conta.ilike.%${pesquisa}%`];
        // só tenta buscar por ID se o termo for um número válido
        if (!isNaN(pesquisa)) {
            condicoes.push(`id_conta.eq.${pesquisa}`);

            //Verifica se a conta existe
            const { data: Consulta, error: erroConsulta } = await supabase
                .from('contas_bancarias')
                .select('id_conta, id_usuario')
                .or(condicoes.join(','))

            if (erroConsulta) {
                console.log("erro: " + erroConsulta.message)
                return res.status(500).json({ mensagem: "Erro ao verificar a conta, tente novamente mais tarde" });
            }
            if (!Consulta) {
                return res.status(404).json({ mensagem: "Essa conta não existe" });
            }

            const { data: pesquisaNome, error: erroPesquisaNome } = await supabase
                .from('contas_bancarias')
                .select('*, usuarios!inner(nome)')
                .order('id_conta', { ascending: true })
                .or(condicoes.join(','))

            if (erroPesquisaNome) {
                console.log("/admin/listar-contas: >>>>> Erro ao listar as contas do usuario: " + erroPesquisaNome)
                return res.status(500).json({ mensagem: "Erro ao consultar as contas, tente novamente mais tarde" })
            } else if (pesquisaNome) {
                console.log("/admin/listar-contas: Pesquisa retornada")
                return res.status(200).json(pesquisaNome)
            }
        }
        const { data: pesquisaNome, error: erroPesquisaNome } = await supabase
            .from('contas_bancarias')
            .select('*, usuarios!inner(nome)')
            .order('id_conta', { ascending: true })
            .or(condicoes.join(','))

        if (erroPesquisaNome) {
            console.log("/admin/listar-contas: >>>>> Erro ao listar as contas do usuario: " + erroPesquisaNome)
            return res.status(500).json({ mensagem: "Erro ao consultar as contas, tente novamente mais tarde" })
        } else if (pesquisaNome) {
            console.log("/admin/listar-contas: Pesquisa retornada")
            return res.status(200).json(pesquisaNome)
        } else if (pesquisaNome.length === 0) {
            return res.status(409).json({ mensagem: "Conta não encontrada" })
        }
    }
}
// Editar conta
export async function editarConta(req, res) {
    const { id_conta,id_usuario, nome_conta, tipo_conta, codigo_conta, nome_instituicao } = req.body
    console.log("ID USUARIO: "+id_usuario)
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
        .eq('id_usuario', id_usuario)
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
        .eq('id_usuario', id_usuario)
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
        .eq('id_usuario', id_usuario)
        .single()

    if (erroEdita) {
        console.log("/usuairo/editar-conta: >>>>> Erro: " + erroEdita)
        return res.status(500).json({ mensagem: "Erro ao editar a conta, tente novamente mais tarde" })
    }
    return res.status(200).json({ mensagem: "Conta editada com sucesso" })

}
// Inativar conta
export async function inativarConta(req, res) {
    const { id_conta, id_usuario} = req.body
    console.log("ID USUARIO: "+id_usuario)

    //Verifica se a conta existe ou se é a conta padrão
    const { data: Consulta, error: erroConsulta } = await supabase
        .from('contas_bancarias')
        .select('id_conta, id_usuario, nome_conta')
        .eq('id_conta', id_conta)
        .eq('id_usuario', id_usuario)
        .select()
        .maybeSingle()

    if (erroConsulta) {
        console.log(erroConsulta)
        return res.status(500).json({ mensagem: "Erro ao verificar a conta, tente novamente mais tarde" });
    } else if (!Consulta) {
        return res.status(404).json({ mensagem: "Essa conta não existe" });
    } else if (Consulta.nome_conta === 'padrão') {
        return res.status(400).json({ mensagem: "Essa conta não pode ser inativada" })
    }

    //Verifica se a conta já está desativada
    const { data: nomeExistente, error: erroNome } = await supabase
        .from('contas_bancarias')
        .select('id_conta, nome_conta, status_conta')
        .eq('id_usuario', id_usuario)
        .eq('id_conta', id_conta)
        .maybeSingle();

    if (erroNome) {
        console.log(erroNome)
        return res.status(500).json({ mensagem: "Erro ao inativar a conta, tente novamente mais tarde" })
    } else if (nomeExistente.status_conta === "Inativo") {
        return res.status(409).json({ mensagem: "Essa conta já está inativada" })
    }

    const {error: erroEdita } = await supabase
        .from('contas_bancarias')
        .update({
            status_conta: "Inativo",
        })
        .eq('id_conta', id_conta)
        .eq('id_usuario', id_usuario)
        .single()

    if (erroEdita) {
        console.log("/usuairo/editar-conta: >>>>> Erro: " + erroEdita)
        return res.status(500).json({ mensagem: "Erro ao editar a conta, tente novamente mais tarde" })
    }
    return res.status(200).json({ mensagem: "Conta inativada com sucesso" })

}
// Reativar conta
export async function reativarConta(req, res) {
    const { id_conta, id_usuario} = req.body
    console.log("ID USUARIO: "+id_usuario)

    //Verifica se a conta existe ou se é a conta padrão
    const { data: Consulta, error: erroConsulta } = await supabase
        .from('contas_bancarias')
        .select('id_conta, id_usuario, nome_conta')
        .eq('id_conta', id_conta)
        .eq('id_usuario', id_usuario)
        .select()
        .maybeSingle()

    if (erroConsulta) {
        console.log(erroConsulta)
        return res.status(500).json({ mensagem: "Erro ao verificar a conta, tente novamente mais tarde" });
    } else if (!Consulta) {
        return res.status(404).json({ mensagem: "Essa conta não existe" });
    }

    //Verifica se a conta já está Ativa
    const { data: nomeExistente, error: erroNome } = await supabase
        .from('contas_bancarias')
        .select('id_conta, nome_conta, status_conta')
        .eq('id_usuario', id_usuario)
        .eq('id_conta', id_conta)
        .maybeSingle();

    if (erroNome) {
        console.log(erroNome)
        return res.status(500).json({ mensagem: "Erro ao inativar a conta, tente novamente mais tarde" })
    } else if (nomeExistente.status_conta === "Ativo") {
        return res.status(409).json({ mensagem: "Essa conta já está Ativa" })
    }

    const {error: erroEdita } = await supabase
        .from('contas_bancarias')
        .update({
            status_conta: "Ativo",
        })
        .eq('id_conta', id_conta)
        .eq('id_usuario', id_usuario)
        .single()

    if (erroEdita) {
        console.log("/usuairo/editar-conta: >>>>> Erro: " + erroEdita)
        return res.status(500).json({ mensagem: "Erro ao editar a conta, tente novamente mais tarde" })
    }
    return res.status(200).json({ mensagem: "Conta reativada com sucesso" })

}
// Excluir conta
export async function deletarConta(req, res) {
    const { id_conta, id_usuario} = req.params

        //Verifica se a conta existe ou se é a conta padrão
    const { data: Consulta, error: erroConsulta } = await supabase
        .from('contas_bancarias')
        .select('nome_conta')
        .eq('id_conta', id_conta)
        .eq('id_usuario', id_usuario)
        .select()
        .maybeSingle()

    if (erroConsulta) {
        console.log(erroConsulta)
        return res.status(500).json({ mensagem: "Erro ao verificar a conta, tente novamente mais tarde" });
    } else if (!Consulta) {
        return res.status(404).json({ mensagem: "Essa conta não existe" });
    } else if (Consulta.nome_conta === 'padrão') {
        return res.status(400).json({ mensagem: "Essa conta não pode ser deletada" })
    }

    const {error: erroDelete} = await supabase
        .from('contas_bancarias')
        .delete()
        .eq('id_conta',id_conta)
        .eq('id_usuario', id_usuario)
        .single()

    if (erroDelete) {
        console.log("Erro ao deletar a conta: "+ erroDelete.message)
        return res.status(500).json({mensagem:"Erro ao deletar a conta, tente novamente mais tarde"})
    } else {
        console.log("Conta deletada com sucesso")
        return res.status(200).json({mensagem:"Conta deletada com suceso"})
    }
}