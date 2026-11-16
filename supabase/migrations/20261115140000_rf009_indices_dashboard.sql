-- RF-009: índices de apoio às consultas do Dashboard (tela principal).
--
-- A RF-009 não cria tabelas. Os índices abaixo cobrem as colunas filtradas a cada
-- abertura do painel: transações por conta de origem, por status e data de pagamento
-- e por categoria; metas por conta. Sem efeito sobre os dados; idempotente.

BEGIN;

CREATE INDEX IF NOT EXISTS idx_transacoes_conta_origem
    ON public.transacoes USING btree (id_conta_origem);

CREATE INDEX IF NOT EXISTS idx_transacoes_status_pagamento
    ON public.transacoes USING btree (status_transacao, data_pagamento);

CREATE INDEX IF NOT EXISTS idx_transacoes_categoria
    ON public.transacoes USING btree (id_categoria);

CREATE INDEX IF NOT EXISTS idx_metas_conta
    ON public.metas USING btree (id_conta);

COMMIT;
