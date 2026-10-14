### Composição da Equipe

| ID  | Nome Completo                          | Papel Primário | Papel Secundário | E-mail / Contato                |
| --- | -------------------------------------- | -------------- | ---------------- | ------------------------------- |
| 1   | João Victor Sousa da Conceição         | Scrum Master   | Fullstack        | joao47064706@edu.df.senac.br    |
| 2   | Natasha Fabiana Montenegro de Oliveira | Fullstack      |                  | natasha59249796@edu.df.senac.br |
| 3   | Pedro Henrique Ferreira Barros         | Fullstack      |                  | pedro59528666@edu.df.senac.br   |
| 4   | Pedro Henrique Sobral Limões           | Fullstack      |                  | pedro59694736@edu.df.senac.br   |
| 5   | Igor Amore Lima da Costa               | UI/UX Design   | Fullstack        | igor56730136@edu.df.senac.br    |
| 6   | Victor Hugo de Melo Lima               | Fullstack      |                  | victor58995026@edu.df.senac.br  |

### Identificação

- **NOME_DO_PROJETO:** CashLand

- **DESCRICAO_BREVE:** Sistema Web para gerenciamento financeiro pessoal, com funcionalidades de criação de metas, agenda, categorização, lançamentos financeiros, dashboard de gastos etc.

### Localização dos Artefatos

- **LINK_REPOSITORIO_GITHUB:** https://github.com/JoaoSousa2002/CashLand
- **BRANCH_PRINCIPAL:** main
- **LINK_APLICACAO_DEPLOY:** https://dashboard.render.com/web/srv-dafl4k0n74is73aguusg/deploys
- **LINK_BANCO_DADOS:** https://supabase.com/dashboard/project/xjfgkakjpuxoznbwznyb
- **LINK_API_SWAGGER:** https://cashland-cdf0.onrender.com/api-docs/
- **LINK_DEMONSTRAÇÃO:** https://cashland-cdf0.onrender.com/

## Funcionalidades

- Login e autenticação de usuários.
- Cadastro e gerenciamento de usuários.
- Gerenciamento de categorias financeiras.
- Gerenciamento de contas bancárias.
- Criação, consulta e edição de transações financeiras, incluindo lançamentos avulsos, parcelados e periódicos.
- Consulta de saldos e operações administrativas conforme as permissões do sistema.

## Tecnologias

- **Frontend:** HTML, CSS e JavaScript.
- **Backend:** Node.js e Express 5.
- **Banco de dados:** PostgreSQL, hospedado no Supabase.
- **Autenticação e segurança:** JWT, cookies, bcrypt, Joi e express-rate-limit.
- **Auditoria:** Winston.
- **Documentação da API:** Swagger UI.

## Estrutura do projeto

```text
CashLand/
│
├── .github/                              # Configurações do repositório GitHub
│
├── database/                             # Scripts SQL do banco de dados
│   ├── ddl/                              # Criação de tabelas e estruturas
│   └── seeds/                            # Dados iniciais e de exemplo
│
├── docs/                                 # Documentação técnica do projeto
│   ├── api/                              # Documentação da API (Swagger)
│   ├── arquitetura/                      # Documentação da arquitetura
│   └── requisitos/                       # Documentação dos requisitos funcionais
│
├── src/                                  # Código-fonte principal
│   │
│   ├── config/                           # Configurações da aplicação e serviços
│   │
│   ├── controllers/                      # Lógica de processamento das requisições
│   │
│   ├── img/                              # Imagens e recursos visuais
│   │
│   ├── middlewares/                      # Autenticação, autorização e auditoria
│   │
│   ├── rf-002-Login/                      # RF002 - Login e autenticação
│   │   └── public/                       # Telas e arquivos públicos do login
│   │
│   ├── rf-003-Cadastro_usuario/          # RF003 - Cadastro de usuários
│   │   └── public/                       # Telas e arquivos públicos do cadastro
│   │
│   ├── rf-004-Gerir_categoria/           # RF004 - Gerenciamento de categorias
│   │   └── public/                       # Telas e arquivos públicos de categorias
│   │
│   ├── rf-005-Gerir_contas_financeiras/  # RF005 - Gerenciamento de contas
│   │   └── public/                       # Telas e arquivos públicos de contas
│   │
│   ├── rf-006-Gerir_transacoes_financeiras/ # RF006 - Transações financeiras
│   │   └── public/                       # Telas e arquivos públicos de transações
│   │
│   ├── routes/                           # Definição dos endpoints da API
│   │
│   ├── services/                         # Serviços e funcionalidades auxiliares
│   │
│   └── validacoes/                       # Schemas Joi para validação dos dados
│
├── supabase/                             # Configurações do Supabase
│   └── migrations/                       # Histórico de alterações do banco
│
└── tests/                                # Testes automatizados
    ├── fixtures/                         # Dados utilizados nos testes
    └── helpers/                          # Funções auxiliares dos testes
```

## Pré-requisitos

- Node.js e npm instalados.
- Projeto Supabase configurado e acessível.
- Credenciais dos serviços externos utilizados pela aplicação (.env).

## Instalação e execução

```bash
git clone git@github.com:JoaoSousa2002/CashLand.git
cd CashLand
npm install
npm start
```

O comando `npm start` executa `node src/server.js`. A porta pode ser configurada pela variável de ambiente `PORT`.

## Variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto e configure os valores apropriados para seu ambiente:

```dotenv
SUPABASE_URL=
SUPABASE_SECRET_KEY=
SEGREDO_JWT=
SEGREDO_CODIGOS=
BREVO_API_KEY=
BREVO_SENDER_EMAIL=
BREVO_SENDER_NAME=
ORIGEM_AUTORIZADA=
PORT=3000
NODE_ENV=development
```

**Nunca publique o `.env` ou credenciais reais no GitHub.** Os nomes acima correspondem a variáveis utilizadas no código; algumas podem ser opcionais conforme o recurso utilizado. A configuração dos códigos de confirmação está detalhada em [`docs/configuracao/codigos-verificacao.md`](docs/configuracao/codigos-verificacao.md).

## Banco de dados

Os scripts SQL do projeto estão em `database/ddl/`, com dados de exemplo em `database/seeds/`. As configurações e migrations do Supabase ficam em `supabase/`. O banco precisa estar preparado antes de executar as funcionalidades que dependem dele.

## Testes

O projeto declara os seguintes comandos no `package.json`:

```bash
npm test
npm run test:rf06
```

O primeiro executa testes Node.js; o segundo chama o script Python de testes da RF006. Alguns testes podem exigir serviços, credenciais ou dados de teste configurados.

## Documentação

As especificações dos requisitos estão em [`docs/requisitos/`](docs/requisitos/). A documentação das rotas está disponível também pelo [Swagger](https://cashland-cdf0.onrender.com/api-docs/).
