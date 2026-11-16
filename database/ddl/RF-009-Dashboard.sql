-- RF-009 — Dashboard (tela principal integradora)
--
-- A RF-009 não cria tabelas, funções ou triggers. O painel consome, pelas rotas das
-- RF-004 a RF-008, as estruturas definidas nos DDLs abaixo:
--
--   contas_bancarias, saldo_conta ........ database/ddl/RF-005-Gerir-contas-financeiras.sql
--   categorias ........................... database/ddl/RF-004-Gerir-categorias.sql
--   transacoes, recorrencias ............. database/ddl/RF-006-Gerir-transacoes-financeiras.sql
--   metas (valor_atual e status por trigger) database/ddl/RF-007-Gerir_metas.sql
--   orcamentos (valor_atual por trigger) . database/ddl/RF-008-Gerir-orcamentos.sql
--
-- Este arquivo acrescenta somente índices de apoio às consultas que o painel faz a cada
-- abertura: listagem das transações por conta do usuário, filtro de pendências e de
-- transações pagas por data de pagamento (indicadores do mês, fluxo de caixa, evolução
-- mensal e despesas por categoria) e metas por conta. Os comandos são idempotentes.

CREATE INDEX IF NOT EXISTS idx_transacoes_conta_origem
    ON public.transacoes USING btree (id_conta_origem);

CREATE INDEX IF NOT EXISTS idx_transacoes_status_pagamento
    ON public.transacoes USING btree (status_transacao, data_pagamento);

CREATE INDEX IF NOT EXISTS idx_transacoes_categoria
    ON public.transacoes USING btree (id_categoria);

CREATE INDEX IF NOT EXISTS idx_metas_conta
    ON public.metas USING btree (id_conta);
