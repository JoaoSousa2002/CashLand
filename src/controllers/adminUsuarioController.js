import supabase from '../config/supabase.js';
import { confirmarAlteracao } from '../middlewares/AuditoriaRota.js';

export async function listarUsuarios(req, res) {
    res.set('Cache-Control', 'no-store');
    const { pesquisa } = req.query;

    if (!pesquisa || pesquisa === "") {
        console.log("/admin/listar-usuarios: Pesquisa para listar usuario vazio")
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, tipo, status_usuario, data_criacao, data_inativacao')
            .order('id_usuario', { ascending: true })
        if (error) {
            console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
            return res.status(500).json({ erro: error.message });
        }
        console.log("/admin/listar-usuarios: Todos os dados retornados")
        return res.status(200).json(data);
    }

    const condicoes = [`nome.ilike.%${pesquisa}%`];
    // só tenta buscar por ID se o termo for um número válido
    if (!isNaN(pesquisa)) {
        condicoes.push(`id_usuario.eq.${pesquisa}`);
    }

    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, email, tipo, status_usuario, data_criacao, data_inativacao')
        .order('id_usuario', { ascending: true })
        .or(condicoes.join(','));

    if (error) {
        return res.status(500).json({ erro: error.message });
    }
    console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
    return res.status(201).json(data);
}

export async function consultarUsuario(req, res) {
    const { id_usuario } = req.query
    // req.usuario já vem do middleware, mas revalida contra o banco
    // pra pegar dados atualizados (ex: se foi inativado depois do token ser emitido)

    if (id_usuario) {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, status_usuario, data_criacao, data_inativacao')
            .eq('id_usuario', id_usuario)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                res.locals.auditoria.resultado = 'FALHA';
            } else {
                res.locals.auditoria.resultado = 'ERRO';
            }
            console.log("/usuario: Usuario não existe ou inativo")
            return res.status(401).json({ mensagem: 'Usuario não existe ou inativo' });
        }
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(200).json(data);
    } else {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, status_usuario, data_criacao, data_inativacao')
            .eq('id_usuario', req.usuario.id_usuario)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                res.locals.auditoria.resultado = 'FALHA';
            } else {
                res.locals.auditoria.resultado = 'ERRO';
            }
            console.log("/usuario: Usuario não existe ou inativo")
            return res.status(401).json({ mensagem: 'Usuario não existe ou inativo' });
        }
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(200).json(data);
    }
}

export async function editarUsuario(req, res) {
    const { id_usuario, nome, email } = req.body

    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ nome: nome, email: email })
        .eq('id_usuario', id_usuario).select('id_usuario')

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(500).json({ mensagem: "Erro em atualizar usuario - " + error })
    }

    console.log("/admin/editar-usuario: Atualização processada")
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Dados atualizados com sucesso" })
}

export async function resetarSenha(req, res) {
    const { id_usuario } = req.body

    //Verifica que o reset já foi solicitado
    const { data: consulta, error: errorConsulta } = await supabase
        .from('usuarios')
        .select('status_reset_senha')
        .eq('id_usuario', id_usuario)
        .single()
    if (errorConsulta) {
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(500).json({ mensagem: "Ocorreu um erro ao consultar o usuario, verifique os logs" })
    }
    if (consulta.status_reset_senha === true) {
        console.log("/admin/resetar-senha: >>>>> A solicitação de reset já foi feita")
        return res.status(400).json({ mensagem: "Já foi feita uma solicitação de reset de senha para este usuario" })
    }

    // Solicita o reset da senha
    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ status_reset_senha: true })
        .eq('id_usuario', id_usuario).select('id_usuario')
    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(501).json({ mensagem: "Ocorreu um erro com sua solicitação, verifique os logs" })
    }
    console.log("/admin/resetar-senha: Solicitação processada")
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Solicitação de reset da senha realizada" })

}

export async function reativarUsuario(req, res) {
    const { id_usuario } = req.body
    const { data: consulta } = await supabase
        .from('usuarios')
        .select('status_usuario, nome')
        .eq('id_usuario', id_usuario)
        .single()

    if (!consulta) {
        return res.status(404).json({ mensagem: 'Usuário não encontrado' });
    }
    if (consulta.status_usuario === 'Ativo') {
        console.log("/admin/reativar-usuario: Usuario já está ativo")
        return res.status(400).json({ mensagem: "Usuario já está ativo" })
    }
    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ status_usuario: 'Ativo', data_inativacao: null })
        .eq('id_usuario', id_usuario).select('id_usuario')

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/admin/reativar-usuario: Usuario não existe, inativo ou sessao invalida")
        return res.status(401).json({ mensagem: 'Erro ao reativar a conta, tente novamente mais tarde' });
    }
    console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Usuario reativado com sucesso" })
}

export async function desativarUsuario(req, res) {
    const { id_usuario } = req.body || {};


    const { data: consulta, error: erroConsulta } = await supabase
        .from('usuarios')
        .select('status_usuario, nome, tipo')
        .eq('id_usuario', id_usuario)
        .single();

    if (erroConsulta || !consulta) {
        if (erroConsulta && erroConsulta.code !== 'PGRST116') {
            res.locals.auditoria.resultado = 'ERRO';
        } else {
            res.locals.auditoria.resultado = 'FALHA';
        }
        console.log("/admin/desativar-usuario: Usuário não encontrado");
        return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    if (consulta.tipo === 'Admin') {
        console.log("/admin/desativar-usuario: >>>>> Admin não pode desativar própria conta ou de outro admin");
        return res.status(403).json({ mensagem: "Admin não pode desativar própria conta ou de outro admin" });
    }

    if (consulta.status_usuario === 'Inativo') {
        console.log("/admin/desativar-usuario: Usuario já está desativado");
        return res.status(400).json({ mensagem: "Usuario já está desativado" });
    }

    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ status_usuario: 'Inativo', data_inativacao: new Date().toISOString() })
        .eq('id_usuario', id_usuario).select('id_usuario');

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(500).json({ mensagem: 'Erro ao desativar a conta, tente novamente mais tarde' });
    }

    console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Usuario desativado com sucesso" });
}

export async function deletarUsuario(req, res) {
    const { id_usuario } = req.params

    const { data: consulta, error: erroConsulta } = await supabase
        .from('usuarios')
        .select('status_usuario, tipo')
        .eq('id_usuario', id_usuario)
        .single();

    if (erroConsulta || !consulta) {
        if (erroConsulta && erroConsulta.code !== 'PGRST116') {
            res.locals.auditoria.resultado = 'ERRO';
        } else {
            res.locals.auditoria.resultado = 'FALHA';
        }
        console.log("/admin/desativar-usuario: Usuário não encontrado");
        return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    if (consulta.tipo === 'Admin') {
        console.log("/admin/deletar-usuario: >>>>> Admin não pode deletar própria conta ou de outro admin");
        return res.status(403).json({ mensagem: "Admin não pode deletar própria conta ou de outro admin" });
    }
    const { data: alterados, error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id_usuario', id_usuario).select('id_usuario')

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("admin/deletar-usuario: Erro a deletar o ususario, verifique o banco de dados: "+error.message)
        return res.status(500).json({ mensagem: "Erro ao deletar o usuario, verifique o banco de dados" })
    }
    console.log("/admin/deletar-usuario: Exclusão processada")
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Operação com sucesso, usuario deletado permanentemente" })
}
