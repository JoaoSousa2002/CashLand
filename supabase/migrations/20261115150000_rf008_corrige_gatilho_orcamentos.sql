-- RF-008: corrige a função do gatilho rf008_transacoes_orcamentos (tabela transacoes).
--
-- A versão publicada no banco comparava OLD.modalidade e NEW.modalidade, mas a coluna
-- modalidade existe só em recorrencias. Com isso, todo UPDATE em transacoes falhava com
-- 42703 record "old" has no field "modalidade" e a API respondia HTTP 500 ao editar ou
-- pagar uma transação (RF-006, botão Pagar da RF-009, edição pelo administrador).
--
-- Esta migration recria a função com o texto de database/ddl/RF-006-Gerir-transacoes-financeiras.sql,
-- que já estava correto. Não altera dados nem gatilhos; é idempotente.

BEGIN;

CREATE OR REPLACE FUNCTION public.atualizar_orcamentos_por_transacao()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
 SET "TimeZone" TO 'America/Sao_Paulo'
AS $function$
DECLARE
    v_anterior public.transacoes%ROWTYPE;
    v_nova public.transacoes%ROWTYPE;
    v_id_orcamento INTEGER;
    v_usuario_anterior public.orcamentos.id_usuario%TYPE;
    v_usuario_nova public.orcamentos.id_usuario%TYPE;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF ROW(OLD.id_conta_origem, OLD.id_categoria,
               OLD.tipo_transacao, OLD.status_transacao,
               OLD.valor_transacao, OLD.data_pagamento)
           IS NOT DISTINCT FROM
           ROW(NEW.id_conta_origem, NEW.id_categoria,
               NEW.tipo_transacao, NEW.status_transacao,
               NEW.valor_transacao, NEW.data_pagamento) THEN
            RETURN NEW;
        END IF;
    END IF;

    IF TG_OP IN ('UPDATE', 'DELETE') THEN
        v_anterior := OLD;
        SELECT c.id_usuario INTO v_usuario_anterior
        FROM public.contas_bancarias AS c
        WHERE c.id_conta = OLD.id_conta_origem;

        -- Em uma exclusão em cascata, a conta pode já ter sido removida.
        -- A categoria identifica os orçamentos sobreviventes a recalcular.
        IF v_usuario_anterior IS NULL THEN
            SELECT c.id_usuario INTO v_usuario_anterior
            FROM public.categorias AS c
            WHERE c.id_categoria = OLD.id_categoria;
        END IF;
    END IF;
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        v_nova := NEW;
        SELECT c.id_usuario INTO v_usuario_nova
        FROM public.contas_bancarias AS c
        WHERE c.id_conta = NEW.id_conta_origem;
    END IF;

    -- Cada orçamento aparece uma única vez, mesmo se corresponder aos
    -- dados antigos e novos. A ordenação mantém uma ordem de bloqueio.
    FOR v_id_orcamento IN
        SELECT o.id_orcamento
        FROM public.orcamentos AS o
        WHERE (
            (v_anterior.tipo_transacao = 'Saida'
             AND v_anterior.status_transacao = 'Pago'
             AND o.id_usuario = v_usuario_anterior
             AND v_anterior.data_pagamento::DATE BETWEEN o.periodo_inicio AND o.periodo_fim
             AND (o.id_conta IS NULL OR o.id_conta = v_anterior.id_conta_origem)
             AND (o.id_categoria IS NULL OR o.id_categoria = v_anterior.id_categoria))
            OR
            (v_nova.tipo_transacao = 'Saida'
             AND v_nova.status_transacao = 'Pago'
             AND o.id_usuario = v_usuario_nova
             AND v_nova.data_pagamento::DATE BETWEEN o.periodo_inicio AND o.periodo_fim
             AND (o.id_conta IS NULL OR o.id_conta = v_nova.id_conta_origem)
             AND (o.id_categoria IS NULL OR o.id_categoria = v_nova.id_categoria))
        )
        -- Em exclusões em cascata, não atualizar orçamentos cujos
        -- vínculos já foram excluídos: as FKs também os excluirão.
        AND EXISTS (SELECT 1 FROM public.usuarios AS u WHERE u.id_usuario = o.id_usuario)
        AND (o.id_conta IS NULL OR EXISTS (
            SELECT 1 FROM public.contas_bancarias AS c WHERE c.id_conta = o.id_conta
        ))
        AND (o.id_categoria IS NULL OR EXISTS (
            SELECT 1 FROM public.categorias AS c WHERE c.id_categoria = o.id_categoria
        ))
        ORDER BY o.id_orcamento
    LOOP
        -- Aciona o BEFORE de recálculo. Não há trigger AFTER em orcamentos,
        -- portanto este UPDATE não inicia recursão.
        UPDATE public.orcamentos
        SET valor_atual = valor_atual
        WHERE id_orcamento = v_id_orcamento;
    END LOOP;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$function$;

COMMIT;
