// O Joi valida o formato da data. Aqui é validada a escolha do período.
export function validarPeriodoOrcamento(tipo_periodo, periodo_inicio, res) {
    const hoje = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
    const inicioAtual = new Date(`${hoje}T00:00:00.000Z`);

    if (tipo_periodo === 'Semanal') {
        inicioAtual.setUTCDate(inicioAtual.getUTCDate() - inicioAtual.getUTCDay());
    } else if (tipo_periodo === 'Mensal') {
        inicioAtual.setUTCDate(1);
    } else if (tipo_periodo === 'Anual') {
        inicioAtual.setUTCMonth(0, 1);
    }

    const inicioProximo = new Date(inicioAtual);
    if (tipo_periodo === 'Semanal') {
        inicioProximo.setUTCDate(inicioProximo.getUTCDate() + 7);
    } else if (tipo_periodo === 'Mensal') {
        inicioProximo.setUTCMonth(inicioProximo.getUTCMonth() + 1);
    } else if (tipo_periodo === 'Anual') {
        inicioProximo.setUTCFullYear(inicioProximo.getUTCFullYear() + 1);
    }

    const atual = inicioAtual.toISOString().slice(0, 10);
    const proximo = inicioProximo.toISOString().slice(0, 10);
    if (periodo_inicio === undefined) {
        return atual;
    }
    if (periodo_inicio !== atual && periodo_inicio !== proximo) {
        res.status(400).json({
            mensagem: 'Dados inválidos.',
            erros: [{
                campo: 'periodo_inicio',
                mensagem: 'Informe o início do período atual ou do próximo período.'
            }]
        });
        return null;
    }
    return periodo_inicio;
}
