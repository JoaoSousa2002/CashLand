create table public.codigos_verificacao (
  id uuid not null default gen_random_uuid (),
  email character varying(150) not null,
  codigo_hash text not null,
  finalidade character varying(30) not null,
  criado_em timestamp with time zone not null default now(),
  expira_em timestamp with time zone not null default (now() + '00:10:00'::interval),
  constraint codigos_verificacao_pkey primary key (id),
  constraint codigo_unico_por_finalidade unique (email, finalidade),
  constraint finalidade_valida check (
    (
      (finalidade)::text = any (
        (
          array[
            'cadastro'::character varying,
            'recuperacao_senha'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;