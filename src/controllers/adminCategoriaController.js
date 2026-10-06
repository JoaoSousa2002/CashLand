import supabase from '../config/supabase.js';

export async function listarCategorias(req, res) {

    // Lista categorias por usuário, por categoria ou sem filtros.
    const { id_usuario, id_categoria } = req.query

    // Verifica se recebeu apenas o id_categoria
    if (id_categoria && !id_usuario) {
        
        // Verifica se a categoria existe
        const { data: consultaCategoria, error: erroConsulta } = await supabase
            .from('categorias')
            .select('nome')
            .eq('id_categoria', id_categoria)
            .maybeSingle();

        if (!consultaCategoria || erroConsulta) {
            console.log("/admin/listar-categoria: >>>>> Categoria não existe");
            return res.status(404).json({ mensagem: "Categoria não existe" });
        }

        // Retorna os dados pelo id_categoria
        const { data: consultaPorID, error } = await supabase
            .from('categorias')
            .select('*, usuarios (id_usuario, nome)')
            .eq('id_categoria', id_categoria)
            .maybeSingle();

        if (error) {
            console.log("/admin/listar-categoria(Com ID): >>>>> Erro ao consultar a categoria: " + error);
            return res.status(500).json({ mensagem: "Ocorreu um erro ao consultar a categoria" });
        }
        console.log("/admin/listar-categoria: Dados da categoria retornados");
        console.log(consultaPorID)
        return res.status(200).json(consultaPorID);
    }

    // Verifica se recebeu apenas o id_usuario
    if (id_usuario && !id_categoria) {
        //Verifica se o usuario existe
        const { data: consultaUsuario, error: erroConsulta } = await supabase
            .from('usuarios')
            .select('nome')
            .eq('id_usuario', id_usuario)
            .maybeSingle()

        if (!consultaUsuario || erroConsulta) {
            console.log("/admin/listar-usuario: >>>>> Usuario não existe ou não possui tabelas")
            return res.status(404).json({ mensagem: "Usuario não existe ou não possui tabelas" })
        }

        // Retorna os dados pelo id_usuario do usuario
        const { data: consultaPorID, error } = await supabase
            .from('categorias')
            .select('*, usuarios (id_usuario, nome)')
            .eq('id_usuario', id_usuario)
            .order('id_categoria', { ascending: true });

        if (error) {
            console.log("/admin/listar-categoria(Com ID): >>>>> Erro em consultar as categorias do usuario: " + error.message)
            return res.status(500).json({ mensagem: "Ocorreu um erro ao consultar as categorias do usuario" })
        }
        console.log("/admin/listar-usuario: Dados do usuario retornados")
        return res.status(200).json(consultaPorID)
    }

    if (id_categoria && id_usuario) {
        const { data: consultaTudo, error } = await supabase
            .from('categorias')
            .select('*, usuarios!inner(*)')
            .eq('id_categoria', id_categoria)
            .eq('id_usuario', id_usuario)
            .maybeSingle();

        if (error) {
            console.log("/admin/listar-categoria: Erro ao consultar categoria e usuário: " + error);
            return res.status(500).json({ mensagem: "Ocorreu um erro ao consultar a categoria e o usuário" });
        }
        if (!consultaTudo) {
            return res.status(404).json({ mensagem: "Categoria não encontrada para o usuário informado" });
        }

        return res.status(200).json(consultaTudo);
    }
    // retorna TODAS as categorias
    const { data: consultaPorID, error } = await supabase
        .from('categorias')
        .select('*, usuarios (id_usuario, nome)')
        .order('id_categoria', { ascending: true })

    if (error) {
        console.log("/admin/listar-categoria: >>>>> Erro em consultar as categorias: " + error)
        return res.status(500).json({ mensagem: "Ocorreu um erro ao consultar as categorias" })
    }
    console.log("Sucesso em consultar as categorias")
    return res.status(200).json(consultaPorID)
}

export async function editarCategoria(req, res) {
    const { id_categoria, nome, descricao } = req.body;

    // VERIFICA SE A CATEGORIA EXISTE
    const { data: consultaCategoria, error: erroConsulta } = await supabase
        .from('categorias')
        .select()
        .eq('id_categoria', id_categoria)
        .maybeSingle()

    if (erroConsulta) {
        console.log("/admin/editar-categoria: >>>>> Ocorreu um erro ao consultar a categoria: " + erroConsulta)
        return res.status(500).json({ mensagem: "Ocorreu um erro ao consultar a categoria, por favor tente novamente mais tarde" })
    }
    if (!consultaCategoria) {
        console.log("/admin/editar-categoria: >>>>> Essa categoria não existe")
        return res.status(404).json({ mensagem: "Essa categoria não existe" })
    }
    if (nome.trim().toLowerCase() === "sem categoria") {
        console.log("/usuario/editar-categoria: >>>>> A categoria 'sem categoria' não pode ser editada")
        return res.status(403).json({ mensagem: "Essa categoria não pode ser editada!" });
    }
    if (nome.trim().toLowerCase() === "sem categoria") {
        console.log("/usuario/editar-categoria: >>>>> O nome 'Sem categoria' é reservado pelo sistema.")
        return res.status(409).json({ mensagem: "O nome 'Sem categoria' é reservado pelo sistema." });
    }
    const { data: editaCategoria, error: erroEdita } = await supabase
        .from('categorias')
        .update({
            nome: nome,
            descricao: descricao
        })
        .select('id_categoria')
        .eq('id_categoria', id_categoria)
        .single()

    if (erroEdita) {
        console.log("/admin/editar-categoria: >>>>> Ocorreu um erro ao editar a categoria: " + erroEdita)
        return res.status(500).json({ mensagem: "Ocorreu um erro ao atualizar a categoria, por favor tente novamente mais tarde" })
    }
    console.log("/admin/editar-categoria: >>>> Categoria ID'" + editaCategoria.id_categoria + "' editada com sucesso")
    return res.status(200).json({ mensagem: "Categora editada com sucesso" })

}

export async function deletarCategoria(req, res) {
    const { id_categoria, id_usuario} = req.params

    // Verifica se a categoria existe
    const { data: consultaCategoria, error: erroConsulta } = await supabase
        .from('categorias')
        .select('id_categoria, nome')
        .eq('id_usuario', id_usuario)
        .eq('id_categoria', id_categoria)
        .maybeSingle()

    if (erroConsulta) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/deletar-categoria: Erro ao verificar a tabela: " + erroConsulta.message)
        return res.status(500).json({ mensagem: "Erro ao verificar a tabela, tente novamente mais tarde" })
    }
    if (!consultaCategoria) {
        console.log("/usuario/deletar-categoria: >>>>> A categoria não existe")
        return res.status(404).json({ mensagem: "Essa categoria não existe" })
    }
    if (consultaCategoria.nome.trim().toLowerCase() === "sem categoria") {
        console.log("/usuario/deletar-categoria: >>>>> A categoria 'sem categoria' não pode ser deletada")
        return res.status(403).json({ mensagem: "Essa categoria não pode ser deletada!" });
    }

    // Deleta a categoria
    const { data: categoriaDeletada, error } = await supabase
        .from('categorias')
        .delete()
        .eq('id_categoria', id_categoria)
        .eq('id_usuario', id_usuario)
        .select('nome')
        .single()
    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/deletar-categoria: Erro ao deletar acategoria: " + error)
        return res.status(500).json({ mensagem: "Erro ao deletar a categoria, tente novamente mais tarde" })
    }
    console.log("/usuario/deletar-categoria: Categoria '" + categoriaDeletada.nome + "' deletada com sucesso")
    return res.status(200).json({ mensagem: "Categoria deletada com sucesso" })
}
