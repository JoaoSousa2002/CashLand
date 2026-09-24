// Simula apenas as operações usadas pelos códigos e pelas quatro rotas.
// Cada DELETE aplica todos os filtros atomicamente ao estado compartilhado.
export function criarBanco() {
  const banco = {
    tabelas: { codigos_verificacao: [], usuarios: [] },
    operacoes: [], falhas: [], antesDeExecutar: null,
    falhar(tabela, operacao) { this.falhas.push({ tabela, operacao }); },
    from(tabela) {
      const consulta = {
        tabela, operacao: 'select', filtros: [], campos: null, unico: false,
        select(campos) { this.campos = campos; return this; },
        limit() { return this; },
        upsert(dados, opcoes) { this.operacao = 'upsert'; this.dados = dados; this.opcoes = opcoes; return this; },
        insert(dados) { this.operacao = 'insert'; this.dados = dados; return this; },
        update(dados) { this.operacao = 'update'; this.dados = dados; return this; },
        delete() { this.operacao = 'delete'; return this; },
        eq(campo, valor) { this.filtros.push(r => r[campo] === valor); return this; },
        gt(campo, valor) { this.filtros.push(r => r[campo] > valor); return this; },
        ilike(campo, valor) {
          this.filtros.push(r => r[campo].toLowerCase() === valor.replace(/\\([\\%_])/g, '$1').toLowerCase());
          return this;
        },
        single() { this.unico = true; return this; },
        maybeSingle() { this.unico = true; return this; },
        then(resolve, reject) { return this.executar().then(resolve, reject); },
        async executar() {
          await new Promise(resolve => setImmediate(resolve));
          banco.operacoes.push({ tabela, operacao: this.operacao });
          if (banco.antesDeExecutar) await banco.antesDeExecutar(this);
          const falha = banco.falhas.findIndex(f => f.tabela === tabela && f.operacao === this.operacao);
          if (falha !== -1) {
            banco.falhas.splice(falha, 1);
            return { data: null, error: { message: 'DETALHE_INTERNO_NAO_EXPOR', code: '42501' } };
          }
          const linhas = banco.tabelas[tabela];
          let resultado = linhas.filter(r => this.filtros.every(f => f(r)));
          if (this.operacao === 'upsert') {
            if (this.opcoes.onConflict !== 'email,finalidade') throw new Error('Conflito inesperado');
            const anterior = linhas.findIndex(r => r.email === this.dados.email && r.finalidade === this.dados.finalidade);
            if (anterior >= 0) linhas.splice(anterior, 1);
            linhas.push({ ...this.dados });
            resultado = [this.dados];
          } else if (this.operacao === 'insert') {
            if (linhas.some(r => r.email === this.dados.email)) return { data: null, error: { code: '23505' } };
            const registro = { id_usuario: linhas.length + 1, ...this.dados };
            linhas.push(registro); resultado = [registro];
          } else if (this.operacao === 'update') {
            for (const r of resultado) Object.assign(r, this.dados);
          } else if (this.operacao === 'delete') {
            banco.tabelas[tabela] = linhas.filter(r => !resultado.includes(r));
          }
          resultado = structuredClone(resultado);
          if (this.campos) resultado = resultado.map(r => Object.fromEntries(this.campos.split(',').map(k => [k.trim(), r[k.trim()]])));
          return { data: this.unico ? resultado[0] ?? null : resultado, error: null };
        }
      };
      return consulta;
    }
  };
  return banco;
}
