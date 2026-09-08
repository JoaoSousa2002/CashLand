create database CashLand;

create table usuarios (
  id_usuario UUID primary key default gen_random_uuid (),
  nome VARCHAR(150) not null,
  email VARCHAR(150) not null unique,
  senha_hash VARCHAR(255) not null,
  data_criacao TIMESTAMPTZ not null default now()
);

insert into
  usuarios (nome, email, senha_hash)


values
  (
    'João Teste',
    'teste@email.com',
    '$2b$10$du3vleTTAvT.nmxNhYaMjuPfdWxX31FEW6wJnQuqET2B1tbc0BLMG'
  ); --123456
