create table public.orcamentos (
  id_orcamento integer generated always as identity not null,
  id_conta integer null,
  id_categoria integer null,
  id_usuario integer not null,
  nome character varying not null,
  descricao text null,
  valor_atual numeric(12, 2) not null default 0,
  valor_orcamento numeric(12, 2) not null,
  tipo_periodo character varying(7) not null,
  periodo_inicio date not null,
  periodo_fim date not null,
  data_criacao timestamp with time zone not null default CURRENT_TIMESTAMP,
  data_atualizacao timestamp with time zone not null default CURRENT_TIMESTAMP,
  constraint pk_orcamentos primary key (id_orcamento),
  constraint uq_orcamentos_nome unique (nome),
  constraint fk_orcamentos_categoria foreign KEY (id_categoria) references categorias (id_categoria) on delete CASCADE,
  constraint fk_orcamentos_conta foreign KEY (id_conta) references contas_bancarias (id_conta) on delete CASCADE,
  constraint fk_orcamentos_usuario foreign KEY (id_usuario) references usuarios (id_usuario) on delete CASCADE,
  constraint ck_orcamentos_datas check ((periodo_fim > periodo_inicio)),
  constraint ck_orcamentos_vinculo check (
    (
      (id_conta is not null)
      or (id_categoria is not null)
    )
  ),
  constraint ck_orcamentos_fim_criacao check (
    (
      periodo_fim >= (
        (
          data_criacao AT TIME ZONE 'America/Sao_Paulo'::text
        )
      )::date
    )
  ),
  constraint ck_orcamentos_limite check ((valor_orcamento > (0)::numeric)),
  constraint ck_orcamentos_tipo_periodo check (
    (
      (tipo_periodo)::text = any (
        (
          array[
            'Semanal'::character varying,
            'Mensal'::character varying,
            'Anual'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint ck_orcamentos_valor_atual check ((valor_atual >= (0)::numeric))
) TABLESPACE pg_default;

create index IF not exists idx_orcamentos_categoria on public.orcamentos using btree (id_categoria) TABLESPACE pg_default;

create index IF not exists idx_orcamentos_usuario_periodo on public.orcamentos using btree (id_usuario, periodo_inicio, periodo_fim) TABLESPACE pg_default;

create index IF not exists idx_orcamentos_conta on public.orcamentos using btree (id_conta) TABLESPACE pg_default;

-- Funções

CREATE OR REPLACE FUNCTION public.gerar_periodo_orcamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF NEW.tipo_periodo IS NOT DISTINCT FROM OLD.tipo_periodo
           AND NEW.periodo_inicio IS NOT DISTINCT FROM OLD.periodo_inicio THEN
            NEW.periodo_fim := OLD.periodo_fim;
            RETURN NEW;
        END IF;
    END IF;

    IF NEW.periodo_inicio IS NULL THEN
        RAISE EXCEPTION 'O início do período deve ser informado pelo backend.'
            USING ERRCODE = '23502';
    END IF;

    CASE NEW.tipo_periodo
        WHEN 'Semanal' THEN
            IF EXTRACT(DOW FROM NEW.periodo_inicio) <> 0 THEN
                RAISE EXCEPTION 'O período semanal deve começar no domingo.'
                    USING ERRCODE = '23514';
            END IF;
            NEW.periodo_fim := NEW.periodo_inicio + 6;
        WHEN 'Mensal' THEN
            IF EXTRACT(DAY FROM NEW.periodo_inicio) <> 1 THEN
                RAISE EXCEPTION 'O período mensal deve começar no primeiro dia do mês.'
                    USING ERRCODE = '23514';
            END IF;
            NEW.periodo_fim := (NEW.periodo_inicio + INTERVAL '1 month - 1 day')::DATE;
        WHEN 'Anual' THEN
            IF EXTRACT(MONTH FROM NEW.periodo_inicio) <> 1
               OR EXTRACT(DAY FROM NEW.periodo_inicio) <> 1 THEN
                RAISE EXCEPTION 'O período anual deve começar em primeiro de janeiro.'
                    USING ERRCODE = '23514';
            END IF;
            NEW.periodo_fim := (NEW.periodo_inicio + INTERVAL '1 year - 1 day')::DATE;
        ELSE
            RAISE EXCEPTION 'O tipo de período deve ser Semanal, Mensal ou Anual.'
                USING ERRCODE = '23514';
    END CASE;

    RETURN NEW;
END;
$function$

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

    -- Regera inclusive nos UPDATEs para impedir atribuição direta de nome.
    NEW.nome := v_nome || ' [' || v_periodo || ']';
    RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.recalcular_valores_orcamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
 SET "TimeZone" TO 'America/Sao_Paulo'
AS $function$
BEGIN
    -- BEFORE: calcula diretamente em NEW, inclusive no cadastro, sem
    -- procurar uma linha ainda não inserida nem atualizar a própria linha.
    SELECT COALESCE(SUM(t.valor_transacao), 0)
    INTO NEW.valor_atual
    FROM public.transacoes AS t
    JOIN public.contas_bancarias AS c ON c.id_conta = t.id_conta_origem
    WHERE c.id_usuario = NEW.id_usuario
      AND t.tipo_transacao = 'Saida'
      AND t.status_transacao = 'Pago'
      AND t.data_pagamento::DATE BETWEEN NEW.periodo_inicio AND NEW.periodo_fim
      AND (NEW.id_conta IS NULL OR t.id_conta_origem = NEW.id_conta)
      AND (NEW.id_categoria IS NULL OR t.id_categoria = NEW.id_categoria);

    -- O limite permanece sendo o informado na criação/edição.
    RETURN NEW;
END;
$function$

CREATE OR REPLACE FUNCTION public.atualizar_data_atualizacao_orcamento()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.data_criacao := CURRENT_TIMESTAMP;
    ELSE
        IF NEW.id_orcamento IS DISTINCT FROM OLD.id_orcamento
           OR NEW.id_usuario IS DISTINCT FROM OLD.id_usuario THEN
            RAISE EXCEPTION 'O identificador e o proprietário do orçamento não podem ser alterados.'
                USING ERRCODE = '23514';
        END IF;
        NEW.data_criacao := OLD.data_criacao;
    END IF;

    NEW.data_atualizacao := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$


-- Triggers

create trigger rf008_01_periodo BEFORE INSERT
or
update on orcamentos for EACH row
execute FUNCTION gerar_periodo_orcamento ();

create trigger rf008_02_nome BEFORE INSERT
or
update on orcamentos for EACH row
execute FUNCTION gerar_nome_orcamento ();

create trigger rf008_03_valores BEFORE INSERT
or
update on orcamentos for EACH row
execute FUNCTION recalcular_valores_orcamento ();

create trigger rf008_04_datas BEFORE INSERT
or
update on orcamentos for EACH row
execute FUNCTION atualizar_data_atualizacao_orcamento ();