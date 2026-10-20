create table public.usuarios (
  id_usuario integer generated always as identity not null,
  nome character varying(150) not null,
  email character varying(150) not null,
  senha_hash character varying(255) not null,
  tipo character varying(10) not null default 'Comum'::character varying,
  status_usuario character varying(10) not null default 'Ativo'::character varying,
  data_criacao timestamp with time zone not null default now(),
  data_inativacao timestamp with time zone null,
  status_reset_senha boolean not null default false,
  constraint usuarios_pkey primary key (id_usuario),
  constraint usuarios_email_key unique (email),
  constraint usuarios_status_usuario_check check (
    (
      (status_usuario)::text = any (
        (
          array[
            'Ativo'::character varying,
            'Inativo'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint usuarios_tipo_check check (
    (
      (tipo)::text = any (
        (
          array[
            'Comum'::character varying,
            'Admin'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

-- FUNÇÕES

CREATE OR REPLACE FUNCTION public.criar_categoria_padrao_usuario()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN

    INSERT INTO categorias (
        id_usuario,
        nome,
        descricao
    )
    VALUES (
        NEW.id_usuario,
        'Sem categoria',
        'Categoria padrão'
    );

    RETURN NEW;

END;
$function$

CREATE OR REPLACE FUNCTION public.criar_conta_padrao()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$BEGIN

    INSERT INTO contas_bancarias (
        id_usuario,
        tipo_conta,
        codigo_conta,
        nome_instituicao,
        nome_conta,
        status_conta
    )
    VALUES (
        NEW.id_usuario,
        'Corrente',
        NULL,
        NULL,
        'padrão',
        'Ativo'
    );

    RETURN NEW;

END;$function$

-- TRIGGERS

create trigger trg_criar_conta_padrao
after INSERT on usuarios for EACH row
execute FUNCTION criar_conta_padrao ();

create trigger trigger_criar_categoria_padrao
after INSERT on usuarios for EACH row
execute FUNCTION criar_categoria_padrao_usuario ();

