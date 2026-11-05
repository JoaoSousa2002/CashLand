create table public.categorias (
  id_categoria integer generated always as identity not null,
  id_usuario integer not null,
  nome character varying(100) not null,
  descricao text null,
  data_criacao timestamp with time zone not null default now(),
  constraint categorias_pkey primary key (id_categoria),
  constraint categorias_usuario_nome_unique unique (id_usuario, nome),
  constraint categorias_usuario_fkey foreign KEY (id_usuario) references usuarios (id_usuario) on delete CASCADE,
  constraint categorias_nome_check check (
    (
      length(
        TRIM(
          both
          from
            nome
        )
      ) >= 1
    )
  )
) TABLESPACE pg_default;

-- Funções

CREATE OR REPLACE FUNCTION public.sincronizar_nomes_orcamentos()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
    IF TG_TABLE_NAME = 'contas_bancarias' THEN
        IF NEW.nome_conta IS NOT DISTINCT FROM OLD.nome_conta THEN
            RETURN NEW;
        END IF;

        UPDATE public.orcamentos
        SET nome = nome
        WHERE id_conta = NEW.id_conta;
    ELSIF TG_TABLE_NAME = 'categorias' THEN
        IF NEW.nome IS NOT DISTINCT FROM OLD.nome THEN
            RETURN NEW;
        END IF;

        UPDATE public.orcamentos
        SET nome = nome
        WHERE id_categoria = NEW.id_categoria;
    END IF;

    -- O BEFORE de geração substitui nome pelo valor atualizado dos vínculos.
    RETURN NEW;
END;
$function$


-- Triggers

create trigger rf008_categorias_nomes
after
update OF nome on categorias for EACH row
execute FUNCTION sincronizar_nomes_orcamentos ();
