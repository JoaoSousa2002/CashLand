-- RF-008: nome do orçamento definido pelo usuário (opcional).
--
-- Antes: o trigger rf008_02_nome sobrescrevia `nome` em todo INSERT/UPDATE e a
-- constraint uq_orcamentos_nome exigia nome único na tabela inteira.
-- Depois: `nome_personalizado = true` preserva o nome informado; com false, o nome
-- continua sendo gerado a partir da conta, da categoria e do período. A unicidade
-- passa a valer por proprietário, sem diferenciar maiúsculas de minúsculas.
--
-- Os orçamentos existentes ficam com nome_personalizado = false e não mudam.
-- A migration pode ser executada mais de uma vez.

BEGIN;

ALTER TABLE public.orcamentos
    ADD COLUMN IF NOT EXISTS nome_personalizado boolean NOT NULL DEFAULT false;

-- Limite compatível com a validação da API (Joi: máximo de 100 caracteres).
-- Os nomes gerados usam nomes de conta e de categoria de até 100 caracteres cada,
-- por isso o limite vale somente para os nomes personalizados.
ALTER TABLE public.orcamentos
    DROP CONSTRAINT IF EXISTS ck_orcamentos_nome_personalizado;
ALTER TABLE public.orcamentos
    ADD CONSTRAINT ck_orcamentos_nome_personalizado CHECK (
        NOT nome_personalizado
        OR (length(btrim(nome)) BETWEEN 1 AND 100)
    );

ALTER TABLE public.orcamentos
    DROP CONSTRAINT IF EXISTS uq_orcamentos_nome;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orcamentos_usuario_nome
    ON public.orcamentos USING btree (id_usuario, lower((nome)::text));

CREATE OR REPLACE FUNCTION public.gerar_nome_orcamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_nome TEXT := 'Orçamento ';
    v_nome_vinculo TEXT;
    v_periodo TEXT;
BEGIN
    IF NEW.id_conta IS NULL AND NEW.id_categoria IS NULL THEN
        RAISE EXCEPTION 'Informe uma conta bancária, uma categoria ou ambas.'
            USING ERRCODE = '23514';
    END IF;

    -- Os vínculos são validados sempre, inclusive com nome personalizado.
    IF NEW.id_conta IS NOT NULL THEN
        SELECT c.nome_conta INTO v_nome_vinculo
        FROM public.contas_bancarias AS c
        WHERE c.id_conta = NEW.id_conta AND c.id_usuario = NEW.id_usuario;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'A conta bancária não existe ou não pertence ao proprietário do orçamento.'
                USING ERRCODE = '23503';
        END IF;
        v_nome := v_nome || v_nome_vinculo || '#' || NEW.id_conta;
    END IF;

    IF NEW.id_categoria IS NOT NULL THEN
        SELECT c.nome INTO v_nome_vinculo
        FROM public.categorias AS c
        WHERE c.id_categoria = NEW.id_categoria AND c.id_usuario = NEW.id_usuario;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'A categoria não existe ou não pertence ao proprietário do orçamento.'
                USING ERRCODE = '23503';
        END IF;
        v_nome := v_nome || '+' || v_nome_vinculo || '#' || NEW.id_categoria;
    END IF;

    -- Nome definido pelo usuário: mantém o texto informado, sem espaços nas pontas.
    -- Marcado como personalizado mas vazio volta a ser gerado.
    IF COALESCE(NEW.nome_personalizado, FALSE) AND btrim(COALESCE(NEW.nome, '')) <> '' THEN
        NEW.nome := btrim(NEW.nome);
        NEW.nome_personalizado := TRUE;
        RETURN NEW;
    END IF;
    NEW.nome_personalizado := FALSE;

    CASE NEW.tipo_periodo
        WHEN 'Semanal' THEN
            IF DATE_TRUNC('month', NEW.periodo_inicio::TIMESTAMP)
               = DATE_TRUNC('month', NEW.periodo_fim::TIMESTAMP) THEN
                v_periodo := TO_CHAR(NEW.periodo_inicio, 'DD') || '-'
                    || TO_CHAR(NEW.periodo_fim, 'DD/MM/YYYY');
            ELSE
                v_periodo := TO_CHAR(NEW.periodo_inicio, 'DD/MM/YYYY') || '-'
                    || TO_CHAR(NEW.periodo_fim, 'DD/MM/YYYY');
            END IF;
        WHEN 'Mensal' THEN
            v_periodo := TO_CHAR(NEW.periodo_inicio, 'MM/YYYY');
        WHEN 'Anual' THEN
            v_periodo := TO_CHAR(NEW.periodo_inicio, 'YYYY');
    END CASE;

    -- Nome automático: regerado inclusive nos UPDATEs, para acompanhar os vínculos.
    NEW.nome := v_nome || ' [' || v_periodo || ']';
    RETURN NEW;
END;
$function$;

COMMIT;
