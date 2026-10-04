# Refatoração de controllers e routers

Base: commit `aa619a4`, restaurado durante a implementação. Foram mantidos os seis rate limits e a autenticação dessa versão, com cookies, JWT, mensagens, status, Joi, auditoria e ordem dos middlewares preservados. O frontend não foi alterado.

## Organização

- `src/app.js`: configura Express, CORS, cookies, JSON, logger, Swagger, páginas, arquivos estáticos, routers e resposta 404; não abre porta nem testa conexão.
- `src/server.js`: testa a conexão e inicia o servidor, mantendo a inicialização assíncrona original.
- `src/rf-001-Login/Servidor.js`: entrada compatível com o comando antigo de deploy.
- `src/config/supabase.js`: cliente único e função `testarConexao`, com as opções originais.
- `src/controllers/`: `authController`, `usuarioController`, `adminUsuarioController`, `categoriaController` e `adminCategoriaController`.
- `src/routes/`: os cinco routers correspondentes e `pageRoutes`.
- `src/middlewares/Autenticacao.js`: `autenticar` e `somenteAdmin`. Hash, comparação de senha e JWT continuam no arquivo original `src/rf-001-Login/Autenticacao.js`.
- `src/middlewares/RateLimit.js`: os seis limitadores originais, incluindo o handler de auditoria e segurança.
- `src/services/codigosService.js`: serviço de códigos e funções compartilhadas de consulta do usuário e emissão por email.
- `src/validacoes/validar.js`, schemas Joi, configuração e middleware de auditoria existentes foram reutilizados.

`LoggerHTTP` e o handler de rate limit usam o caminho completo da rota mesmo após a montagem em routers com prefixos. As expressões ternárias nos handlers movidos foram convertidas para `if/else`, preservando o resultado.

## Rotas migradas

| Router | Prefixo | Operações |
| --- | --- | --- |
| authRoutes | `/` | GET `/me`; POST `/login`, `/confirmar-senha`, `/logout`, `/solicitar-codigo`, `/confirmar-cadastro`, `/solicitar-reset-senha`, `/confirmar-reset-senha` |
| usuarioRoutes | `/usuario` | GET `/`; PATCH `/desativar-usuario`, `/atualizar-dados` |
| categoriaRoutes | `/usuario` | POST `/criar-categoria`; GET `/listar-categoria`; PATCH `/editar-categoria`; DELETE `/deletar-categoria/:id_categoria` |
| adminUsuarioRoutes | `/admin` | GET `/listar-usuarios`, `/usuario`; PATCH `/editar-usuario`, `/resetar-senha`, `/reativar-usuario`, `/desativar-usuario`; DELETE `/deletar-usuario/:id_usuario` |
| adminCategoriaRoutes | `/admin` | GET `/listar-categoria`; PATCH `/editar-categoria`; DELETE `/deletar-categoria/:id_categoria/:id_usuario` |

São 25 endpoints de API e 14 rotas de páginas. O inventário de métodos, caminhos e middlewares antes da extração está em `tests/fixtures/rotas.json`. As rotas de subcategoria já estavam removidas na base restaurada e continuam indisponíveis.

## Executar e testar

```sh
npm start
npm test
```

O comando antigo `node src/rf-001-Login/Servidor.js` continua funcionando.

`npm test` executa 18 testes locais, sem acessar o banco configurado no `.env`:

- `tests/app.test.js`: páginas, arquivos estáticos, Swagger, autenticação, autorização em todos os endpoints administrativos, validação, cookie, logout, seis políticas de rate limit e auditoria. O teste de login utiliza banco simulado explicitamente.
- `tests/consultas-idor.test.js`: verifica filtros de proprietário nas consultas e escritas, impedimento de escrita após recurso não encontrado, pesquisas e operações sobre o próprio usuário, com banco simulado.
- `tests/idor.test.js`: suíte E2E real, ignorada por padrão e habilitada apenas pelo comando abaixo.

Também foram executados os smoke tests dos três módulos e das duas entradas de inicialização, em `tests/helpers/`. As verificações de inicialização simulam somente a consulta de conexão, sem acessar o banco atual.

## E2E com Supabase separado

Por orientação do usuário, os E2E não foram executados contra o Supabase atual. Prepare um projeto Supabase exclusivo para testes com o mesmo schema de `usuarios` e `categorias`, incluindo seus defaults, relacionamentos e permissões. A suíte não cria nem modifica o schema.

No `.env`, configure `SUPABASE_TEST_URL` e `SUPABASE_TEST_SECRET_KEY` para esse projeto separado. `SEGREDO_JWT` continua sendo referenciado do `.env`. Não coloque valores de chaves em arquivos de teste, documentação ou comandos de terminal.

```sh
npm run test:idor
```

O comando exige as variáveis de teste e rejeita um destino com a mesma origem de `SUPABASE_URL`. Apenas o processo isolado da suíte passa a utilizar as variáveis de teste; o arquivo `.env` não é alterado.

A suíte cria dois usuários comuns e um administrador, usa o endpoint real `/login` e seus cookies, cria categorias pela API e testa dez cenários: edição, exclusão e listagem entre usuários, atualização pessoal, consulta de sessão, bloqueio administrativo de categorias e usuários, relação categoria/proprietário, operações administrativas legítimas e auto-desativação. As verificações de integridade consultam diretamente o banco de teste. O teardown remove somente os registros associados aos emails exclusivos da execução, inclusive após falha parcial no setup.

IPs distintos entre cenários isolam os contadores sem desativar ou alterar as políticas de rate limit da aplicação.

## Resultado e segurança

Na revisão da versão restaurada e nos testes locais não foi encontrada nova vulnerabilidade IDOR nas rotas ativas de categorias e usuários: leituras e escritas do usuário comum já restringiam `id_usuario`, e as rotas administrativas já exigiam `somenteAdmin`. Esses filtros foram preservados. A comprovação E2E contra Supabase real permanece pendente da configuração do projeto separado.

Nenhuma chave foi copiada do `.env`. O `.gitignore` também cobre variantes `.env.*`, arquivos de cookies e diretórios temporários do Supabase. Essa proteção não remove do histórico arquivos que já tenham sido versionados.
