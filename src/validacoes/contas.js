// Colunas smallint confirmadas nos metadados REST em 16/10/2026.
// Dias mensais de 1 a 31; corpo de calcular_vencimento ainda não inspecionado.
export function validarDiasConta(dados, atual, res) {
    if ((dados.tipo_conta ?? atual.tipo_conta) !== 'Credito') {
        return { data_fechamento: null, data_vencimento: null };
    }
    const dias = {};
    const erros = [];
    for (const campo of ['data_fechamento', 'data_vencimento']) {
        const valor = dados[campo] === undefined ? atual[campo] : dados[campo];
        if (!Number.isInteger(valor) || valor < 1 || valor > 31) {
            erros.push({ campo, mensagem: 'Informe um dia de 1 a 31 para a conta Credito.' });
        } else {
            dias[campo] = valor;
        }
    }
    if (erros.length) {
        res.status(400).json({ mensagem: 'Dados inválidos.', erros });
        return null;
    }
    return dias;
}
