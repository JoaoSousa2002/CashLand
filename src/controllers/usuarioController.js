import supabase from '../config/supabase.js';
import { confirmarAlteracao } from '../middlewares/AuditoriaRota.js';

export async function consultarUsuario(req, res) {
    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, email, status_usuario, data_criacao')
        .eq('id_usuario', req.usuario.id_usuario)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            res.locals.auditoria.resultado = 'FALHA';
        } else {
            res.locals.auditoria.resultado = 'ERRO';
        }
    }
    if (error || data.status_usuario === 'Inativo') {
        console.log("/usuario: Usuario não existe ou inativo")
        return res.status(401).json({ mensagem: 'Sessão inválida' });
    }
    console.log("/usuario: todos os dados retornados")
    return res.status(200).json(data);
}

export async function desativarUsuario(req, res) {

    const { data: consulta } = await supabase
        .from('usuarios')
        .select('status_usuario, nome')
        .eq('id_usuario', req.usuario.id_usuario)
        .single()

    if (consulta.status_usuario === 'Inativo') {
        console.log("/usuario/desativar-usuario: Usuario já está desativado")
        return res.status(400).json({ mensagem: "Usuario já está desativado" })
    } else if (!consulta) {
        console.log("Nada retornado")
    }

    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ status_usuario: 'Inativo', data_inativacao: new Date().toISOString() })
        .eq('id_usuario', req.usuario.id_usuario).select('id_usuario')

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario: Usuario não existe, inativo ou sessao invalida")
        return res.status(401).json({ mensagem: 'Erro ao desativar a conta, tente novamente mais tarde' });
    }
    console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Usuario desativado com sucesso" })
}

export async function atualizarDados(req, res) {
    const { nome } = req.body

    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ nome: nome })
        .eq('id_usuario', req.usuario.id_usuario).select('id_usuario')

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(500).json({ mensagem: "Erro em atualizar usuario - " + error })
    }

    console.log("/usuario/atualizar-dados: Atualização processada")
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Dados atualizados com sucesso" })
}
