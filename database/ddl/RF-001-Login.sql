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