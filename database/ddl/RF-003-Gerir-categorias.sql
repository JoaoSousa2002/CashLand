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
