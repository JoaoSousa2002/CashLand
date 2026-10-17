import supabase from '../config/supabase.js';

export async function verificarMeta(id_meta, id_usuario) {
    const { data: consultaMeta, error } = await supabase
        .from('metas')
        .select('*')
        .eq('id_meta', id_meta)
        .maybeSingle();

    if (error) {
        return { existencia: false, pertencimento: false, erro: true };
    }
    if (!consultaMeta) {
        return { existencia: false, pertencimento: false, erro: false };
    }
    const { pertencimento, erro } = await verificarContaBancaria(consultaMeta.id_conta, id_usuario);
    return { existencia: true, pertencimento, erro, ...(pertencimento ? { consultaMeta } : {}) };
}

// Valida a combinação final também nos PATCH que omitem id_meta.
export async function validarVinculoMeta(id_meta, tipo_transacao, id_usuario, res) {
    if (id_meta == null) return true;
    if (tipo_transacao === 'Transferencia') {
        res.status(400).json({
            mensagem: 'Dados inválidos.', erros: [
                { campo: 'id_meta', mensagem: 'Transferências não podem ser vinculadas a metas.' }
            ]
        });
        return false;
    }
    const { pertencimento, erro } = await verificarMeta(id_meta, id_usuario);
    if (erro || !pertencimento) {
        res.status(erro ? 500 : 404).json({
            mensagem: erro
                ? 'Erro ao verificar a meta. Tente novamente mais tarde.'
                : 'Essa meta não existe ou não pertence ao usuário.'
        });
        return false;
    }
    return true;
}

export async function verificarUsuario(id_usuario) {
    let existencia = false;
    let status = false;
    let erro = false;

    //Verifica se o usuario existe
    const { data: consulta, error: erroConsulta } = await supabase
        .from('usuarios')
        .select('status_usuario')
        .eq('id_usuario', id_usuario)
        .maybeSingle()

    if (erroConsulta) {
        erro = true
        console.log("validarTabelas.js/verificarUsuario: >>>>> " + erroConsulta.message)
        return { existencia, status, erro }
    } else if (!consulta) {
        return { existencia, status, erro }
    }
    existencia = true

    // Verifica se o usuario está ativo
    if (consulta.status_usuario === 'Ativo') {
        status = true
    }

    return { existencia, status, erro }

}

export async function verificarContaBancaria(id_conta, id_usuario) {
    let existencia = false;
    let pertencimento = false;
    let erro = false;
    //Verifica se a conta existe
    const { data: consulta, error: erroConsulta } = await supabase
        .from('contas_bancarias')
        .select('id_usuario')
        .eq('id_conta', id_conta)
        .select()
        .maybeSingle()

    if (erroConsulta) {
        erro = true;
        console.log("validarTabelas.js/verificarContaBancaria: >>>>> " + erroConsulta.message)
        return { existencia, pertencimento, erro }
    } else if (!consulta) {
        return { existencia, pertencimento, erro }
    }
    existencia = true

    // Verifica se a conta pertence ao usuario
    if (Number(consulta.id_usuario) === Number(id_usuario)) {
        pertencimento = true
    }

    return { existencia, pertencimento, erro }
}

export async function verificarCategoria(id_categoria, id_usuario) {
    let existencia = false;
    let pertencimento = false;
    let erro = false;
    //Verifica se a conta existe
    const { data: consulta, error: erroConsulta } = await supabase
        .from('categorias')
        .select('id_usuario')
        .eq('id_categoria', id_categoria)
        .maybeSingle()

    if (erroConsulta) {
        erro = true
        console.log("validarTabelas.js/verificarCategoria: >>>>> " + erroConsulta.message)
        return { existencia, pertencimento, erro }
    } else if (!consulta) {
        return { existencia, pertencimento, erro }
    }
    existencia = true

    //Verifica se a categoria percente ao usuario
    if (Number(consulta.id_usuario) === Number(id_usuario)) {
        pertencimento = true
    }

    return { existencia, pertencimento, erro }
}

export async function verificarRecorrencia(id_recorrencia, id_usuario) {
    const { data: consultaRecorrencia, error: erroConsulta } = await supabase
        .from('recorrencias')
        .select('*')
        .eq('id_recorrencia', id_recorrencia)
        .eq('id_usuario', id_usuario)
        .maybeSingle()

    if (erroConsulta) {
        console.log("validarTabelas.js/verificarRecorrencia: >>>>> " + erroConsulta.message)
        return { existencia: false, pertencimento: false, erro: true }
    }
    if (!consultaRecorrencia) {
        return { existencia: false, pertencimento: false, erro: false }
    }
    return { existencia: true, pertencimento: true, erro: false, consultaRecorrencia }
}

export async function verificarTransacao(id_transacao, id_usuario) {
    const { data: consultaTransacao, error: erroConsulta } = await supabase
        .from('transacoes')
        .select('*')
        .eq('id_transacao', id_transacao)
        .maybeSingle()

    if (erroConsulta) {
        console.log("validarTabelas.js/verificarTransacao: >>>>> " + erroConsulta.message)
        return { existencia: false, pertencimento: false, erro: true }
    }
    if (!consultaTransacao) {
        return { existencia: false, pertencimento: false, erro: false }
    }

    // Verifica o proprietário pela conta de origem, sem join ambíguo
    const { pertencimento, erro } = await verificarContaBancaria(consultaTransacao.id_conta_origem, id_usuario)
    if (erro || !pertencimento) {
        return { existencia: true, pertencimento: false, erro }
    }
    return { existencia: true, pertencimento: true, erro: false, consultaTransacao }
}
