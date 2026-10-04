import supabase from '../config/supabase.js';

export async function criarCategoria(req, res) {
    const { nome, descricao } = req.body

    if (nome.trim().toLowerCase() === "sem categoria") {
        return res.status(409).json({
            mensagem: "O nome 'Sem categoria' é reservado pelo sistema."
        });
    }
    // Verifica se já existe uma categoria com esse nome
    const { data: consultaCategoria, error: erroConsulta } = await supabase
        .from('categorias')
        .select('id_categoria, nome')
        .eq('id_usuario', req.usuario.id_usuario)
        .eq('nome', nome)
        .maybeSingle()

    if (erroConsulta) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/criar-categoria: Erro ao verificar a tabela: " + erroConsulta)
        return res.status(500).json({ mensagem: "Erro ao verificar a tabela, tente novamente mais tarde" })
    }
    if (consultaCategoria) {
        console.log("/usuario/criar-categoria: >>>>> Já existe uma categoria com esse nome")
        return res.status(409).json({ mensagem: "Já existe uma categoria com esse nome" })
    }

    const { data: criaCategoria, error: errorCriar } = await supabase
        .from('categorias')
        .insert({
            id_usuario: req.usuario.id_usuario,
            nome: nome,
            descricao: descricao,
        })
        .select()
        .single()

    if (errorCriar) {
        console.log("/usuario/criar-categoria: >>>>> Erro ao criar categoria: " + errorCriar)
        return res.status(500).json({ mensagem: "Erro ao criar a categoria, tente novamente mais tarde" })
    }
    if (criaCategoria) {
        console.log("/usuario/criar-categoria: Categoria '" + criaCategoria.nome + "' criada com sucesso")
        return res.status(200).json({ mensagem: "Categoria criada com sucesso" })
    }
}

export async function listarCategorias(req, res) {
    res.set('Cache-Control', 'no-store');
    const { pesquisa } = req.query;

    if (!pesquisa || pesquisa === "") {
        console.log("/usuario/listar-categoria: Pesquisa para listar categoria vazio")

        const { data, error } = await supabase
            .from('categorias')
            .select('id_categoria, nome, descricao, data_criacao')
            .eq('id_usuario', req.usuario.id_usuario)
            .order('id_categoria', { ascending: true })
        if (error) {
            console.log("/usuario/listar-categoria: >>>>> Erro ao pesquisar a categoria");
            return res.status(500).json({ erro: error.message });
        }
        console.log("/usuario/listar-categoria: Todas as categorias foram retornadas")
        return res.status(200).json(data);
    }

    const condicoes = [`nome.ilike.%${pesquisa}%`];
    // só tenta buscar por ID se o termo for um número válido
    if (!isNaN(pesquisa)) {
        condicoes.push(`id_categoria.eq.${pesquisa}`);

        // Verifica se a categoria pesquisada pertence ao usuário autenticado.
        const { data: consultaCategoria, error: erroConsulta } = await supabase
            .from('categorias')
            .select('id_categoria')
            .eq('id_categoria', pesquisa)
            .eq('id_usuario', req.usuario.id_usuario)
            .maybeSingle();

        if (erroConsulta) {
            return res.status(500).json({ mensagem: "Erro ao verificar a categoria, tente novamente mais tarde" });
        }
        if (!consultaCategoria) {
            return res.status(404).json({ mensagem: "Essa categoria não existe" });
        }
    }


    const { data, error } = await supabase
        .from('categorias')
        .select('id_categoria, nome, descricao, data_criacao')
        .eq('id_usuario', req.usuario.id_usuario)
        .order('id_categoria', { ascending: true })
        .or(condicoes.join(','));

    if (error) {
        return res.status(500).json({ erro: error.message });
    }
    console.log("/usuario/listar-categoria: Todas as categorias foram retornadas");
    return res.status(200).json(data);
}

export async function editarCategoria(req, res) {
    const { id_categoria, nome, descricao } = req.body


    // Verifica se a categoria existe
    const { data: consultaCategoria, error: erroConsulta } = await supabase
        .from('categorias')
        .select('id_categoria, nome')
        .eq('id_usuario', req.usuario.id_usuario)
        .eq('id_categoria', id_categoria)
        .maybeSingle()

    if (erroConsulta) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/criar-categoria: Erro ao verificar a tabela: " + erroConsulta)
        return res.status(500).json({ mensagem: "Erro ao verificar a tabela, tente novamente mais tarde" })
    }
    if (!consultaCategoria) {
        console.log("/usuario/criar-categoria: >>>>> A categoria não existe")
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

    //Verifica se outra categoria já tem o nome editado
    const { data: categoriaExistente, error: erroDuplicidade } = await supabase
        .from('categorias')
        .select('id_categoria')
        .eq('id_usuario', req.usuario.id_usuario)
        .ilike('nome', nome.trim())
        .neq('id_categoria', id_categoria)
        .maybeSingle();

    if (erroDuplicidade) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/editar-categoria: >>>>> Erro ao verificar o nome da categoria.")
        return res.status(500).json({ mensagem: "Erro ao verificar o nome da categoria." });
    }

    if (categoriaExistente) {
        console.log("/usuario/editar-categoria: >>>>> á existe outra categoria com esse nome..")
        return res.status(409).json({ mensagem: "Já existe outra categoria com esse nome." });
    }

    // Atualiza a tabela categoria
    const { data: editarCategoria, error: errorEditar } = await supabase
        .from('categorias')
        .update({ nome: nome, descricao: descricao })
        .eq('id_categoria', id_categoria)
        .eq('id_usuario', req.usuario.id_usuario)
        .select()
        .single()

    if (errorEditar) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/editar-categoria: >>>>> Erro ao atualizar a tabela")
        return res.status(500).json({ mensagem: "Erro ao atualizar a categoria, por favor tente novamente mais tarde" })
    }
    return res.status(200).json({ mensagem: "Categoria atualizada com sucesso." });
}

export async function deletarCategoria(req, res) {
    const { id_categoria } = req.params

    // Verifica se a categoria existe
    const { data: consultaCategoria, error: erroConsulta } = await supabase
        .from('categorias')
        .select('id_categoria, nome')
        .eq('id_usuario', req.usuario.id_usuario)
        .eq('id_categoria', id_categoria)
        .maybeSingle()

    if (erroConsulta) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/deletar-categoria: Erro ao verificar a tabela: " + erroConsulta)
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
        .eq('id_usuario', req.usuario.id_usuario)
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
