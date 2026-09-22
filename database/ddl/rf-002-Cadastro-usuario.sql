drop table usuarios;

create table usuarios (
  id_usuario int generated always as identity primary key,
  nome varchar(150) not null,
  email varchar(150) not null unique,
  senha_hash varchar(255) not null,
  tipo varchar(10) not null default 'Comum' check (tipo in ('Comum', 'Admin')),
  status_usuario varchar(10) not null default 'Ativo' check (status_usuario in ('Ativo', 'Inativo')),
  data_criacao timestamptz not null default now(),
  data_inativacao timestamptz
);

