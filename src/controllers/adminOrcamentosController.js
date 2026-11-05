import supabase from '../config/supabase.js';
import { confirmarAlteracao } from '../middlewares/AuditoriaRota.js';
import { verificarContaBancaria, verificarCategoria, verificarUsuario } from '../validacoes/validarTabelas.js';
import { validarPeriodoOrcamento } from '../validacoes/orcamentos.js';

export async function listarOrcamentos(req, res) {
    const { id_orcamento, nome, id_conta, id_categoria, tipo_periodo, periodo_inicio, periodo_fim } = req.query;
    const { id_usuario } = req.query;

    if (id_usuario !== undefined) {
        // Verifica o proprietário informado pelo administrador.
        const { existencia: resUser, erro: erroUser } = await verificarUsuario(id_usuario);
        if (erroUser) {
            return res.status(500).json({ mensagem: "Erro ao verificar o usuario, tente novamente mais tarde" });
        }
        if (!resUser) {
            return res.status(404).json({ mensagem: "Esse usuario não existe" });
        }
    }

    let consulta = supabase
        .from('orcamentos')
        .select('*');

    if (id_usuario !== undefined) {
        consulta = consulta.eq('id_usuario', id_usuario);
    }
    if (id_orcamento !== undefined) {
        consulta = consulta.eq('id_orcamento', id_orcamento);
    }
    if (id_conta !== undefined) {
        consulta = consulta.eq('id_conta', id_conta);
    }
    if (id_categoria !== undefined) {
        consulta = consulta.eq('id_categoria', id_categoria);
    }
    if (tipo_periodo !== undefined) {
        consulta = consulta.eq('tipo_periodo', tipo_periodo);
    }
    if (nome !== undefined) {
        consulta = consulta.ilike('nome', `%${nome}%`);
    }
    // Sobreposição inclusiva: o orçamento termina depois do início consultado
    // e começa antes do fim consultado. Todos os filtros são combinados com AND.
    if (periodo_inicio !== undefined) {
        consulta = consulta.gte('periodo_fim', periodo_inicio);
    }
    if (periodo_fim !== undefined) {
        consulta = consulta.lte('periodo_inicio', periodo_fim);
    }

    const { data: consultaOrcamentos, error: erroConsulta } = await consulta;
    if (erroConsulta) {
        return res.status(500).json({ mensagem: "Erro ao listar os orçamentos, tente novamente mais tarde" });
    }
    return res.status(200).json(consultaOrcamentos);
}

export async function editarOrcamento(req, res) {
    const { id_orcamento, id_conta, id_categoria, descricao, valor_orcamento, tipo_periodo, periodo_inicio } = req.body;
    const { id_usuario } = req.body;

    // Verifica o proprietário informado pelo administrador.
    const { existencia: resUser, erro: erroUser } = await verificarUsuario(id_usuario);
    if (erroUser) {
        return res.status(500).json({ mensagem: "Erro ao verificar o usuario, tente novamente mais tarde" });
    }
    if (!resUser) {
        return res.status(404).json({ mensagem: "Esse usuario não existe" });
    }

    const { data: consultaOrcamento, error: erroConsulta } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('id_orcamento', id_orcamento)
        .eq('id_usuario', id_usuario)
        .maybeSingle();

    if (erroConsulta) {
        return res.status(500).json({ mensagem: "Erro ao verificar o orçamento, tente novamente mais tarde" });
    }
    if (!consultaOrcamento) {
        return res.status(404).json({ mensagem: "Esse orçamento não existe ou não pertence ao usuario" });
    }

    let contaFinal = consultaOrcamento.id_conta;
    if (id_conta !== undefined) {
        contaFinal = id_conta;
    }
    let categoriaFinal = consultaOrcamento.id_categoria;
    if (id_categoria !== undefined) {
        categoriaFinal = id_categoria;
    }
    if (contaFinal == null && categoriaFinal == null) {
        return res.status(400).json({
            mensagem: "Dados inválidos.",
            erros: [{ campo: 'id_conta', mensagem: "O orçamento deve manter uma conta bancaria, uma categoria ou ambas." }]
        });
    }

    let tipoFinal = consultaOrcamento.tipo_periodo;
    if (tipo_periodo !== undefined) {
        tipoFinal = tipo_periodo;
    }
    if (tipoFinal !== consultaOrcamento.tipo_periodo && periodo_inicio === undefined) {
        return res.status(400).json({
            mensagem: "Dados inválidos.",
            erros: [{ campo: 'periodo_inicio', mensagem: "Informe o início do período ao alterar o tipo de período." }]
        });
    }
    // Uma edição de descrição ou limite preserva inclusive períodos antigos.
    if (periodo_inicio !== undefined) {
        const inicio = validarPeriodoOrcamento(tipoFinal, periodo_inicio, res);
        if (inicio === null) {
            return;
        }
    }

    if (id_conta != null) {
        const { pertencimento: resCont, erro: erroCont } = await verificarContaBancaria(id_conta, id_usuario);
        if (erroCont) {
            return res.status(500).json({ mensagem: "Erro ao verificar a conta bancaria, tente novamente mais tarde" });
        }
        if (!resCont) {
            return res.status(404).json({ mensagem: "Essa conta bancaria não existe ou não pertence ao usuario" });
        }
    }

    if (id_categoria != null) {
        const { pertencimento: resCat, erro: erroCat } = await verificarCategoria(id_categoria, id_usuario);
        if (erroCat) {
            return res.status(500).json({ mensagem: "Erro ao verificar a categoria, tente novamente mais tarde" });
        }
        if (!resCat) {
            return res.status(404).json({ mensagem: "Essa categoria não existe ou não pertence ao usuario" });
        }
    }

    // Campos omitidos não são enviados ao banco; null remove um vínculo.
    const dados = {};
    if (id_conta !== undefined) {
        dados.id_conta = id_conta;
    }
    if (id_categoria !== undefined) {
        dados.id_categoria = id_categoria;
    }
    if (descricao !== undefined) {
        dados.descricao = descricao;
    }
    if (valor_orcamento !== undefined) {
        dados.valor_orcamento = valor_orcamento;
    }
    if (tipo_periodo !== undefined) {
        dados.tipo_periodo = tipo_periodo;
    }
    if (periodo_inicio !== undefined) {
        dados.periodo_inicio = periodo_inicio;
    }

    const { data: alterado, error: erroEditaOrcamento } = await supabase
        .from('orcamentos')
        .update(dados)
        .eq('id_orcamento', id_orcamento)
        .eq('id_usuario', id_usuario)
        .select('id_orcamento, id_usuario')
        .maybeSingle();

    if (erroEditaOrcamento) {
        if (erroEditaOrcamento.code === '23505') {
            return res.status(409).json({ mensagem: "Já existe um orçamento com esse nome" });
        }
        if (erroEditaOrcamento.code === '23503') {
            return res.status(404).json({ mensagem: "Um dos vínculos não existe ou não pertence ao usuario" });
        }
        if (erroEditaOrcamento.code === '23514' || erroEditaOrcamento.code === '23502' || erroEditaOrcamento.code === '22003') {
            return res.status(400).json({ mensagem: "Os dados não atendem às regras do orçamento" });
        }
        return res.status(500).json({ mensagem: "Erro ao editar o orçamento, tente novamente mais tarde" });
    }
    if (!alterado) {
        return res.status(404).json({ mensagem: "Esse orçamento não existe ou não pertence ao usuario" });
    }
    confirmarAlteracao(res, alterado);
    return res.status(200).json({ mensagem: "Orçamento editado com sucesso" });
}

export async function deletarOrcamento(req, res) {
    const { id_orcamento } = req.params;
    const { id_usuario } = req.params;

    if (req.body !== undefined && Object.keys(req.body).length > 0) {
        return res.status(400).json({ mensagem: "A exclusão do orçamento não recebe campos no body" });
    }

    // Verifica o proprietário informado pelo administrador.
    const { existencia: resUser, erro: erroUser } = await verificarUsuario(id_usuario);
    if (erroUser) {
        return res.status(500).json({ mensagem: "Erro ao verificar o usuario, tente novamente mais tarde" });
    }
    if (!resUser) {
        return res.status(404).json({ mensagem: "Esse usuario não existe" });
    }

    // O DELETE confirma existência e propriedade na mesma operação.
    const { data: excluido, error: erroDeletaOrcamento } = await supabase
        .from('orcamentos')
        .delete()
        .eq('id_orcamento', id_orcamento)
        .eq('id_usuario', id_usuario)
        .select('id_orcamento, id_usuario')
        .maybeSingle();

    if (erroDeletaOrcamento) {
        return res.status(500).json({ mensagem: "Erro ao deletar o orçamento, tente novamente mais tarde" });
    }
    if (!excluido) {
        return res.status(404).json({ mensagem: "Esse orçamento não existe ou não pertence ao usuario" });
    }
    confirmarAlteracao(res, excluido);
    return res.status(200).json({ mensagem: "Orçamento deletado com sucesso" });
}
