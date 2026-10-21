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

### Execução e exemplos de curl

#### Pré-requisitos

- Node.js 20 ou superior e npm.
- Git, para clonar o repositório, ou uma cópia extraída do projeto.
- Projeto Supabase configurado com as tabelas, funções e triggers utilizados pelo CashLand. Os DDLs de referência estão em `database/ddl/`; iniciar o servidor não cria o banco automaticamente.
- Conta de usuário cadastrada para acessar a aplicação; o cadastro por código está exemplificado abaixo.
- Python 3 e o pacote `requests` somente para utilizar o testador Python.

#### Executar localmente

Clone o repositório e entre na pasta, ou abra o terminal na raiz da cópia já extraída:

```bash
git clone https://github.com/JoaoSousa2002/CashLand.git
cd CashLand
```

Instale as dependências e crie a configuração local:

```bash
npm ci
cp .env.example .env
```

Preencha o `.env` com os dados do ambiente utilizado:

- `SUPABASE_URL`: URL do projeto Supabase.
- `SUPABASE_SECRET_KEY`: chave de acesso do backend ao Supabase.
- `SEGREDO_JWT`: segredo utilizado para assinar os tokens de sessão.
- `SEGREDO_CODIGOS`: segredo próprio para os códigos de confirmação, diferente de `SEGREDO_JWT`.
- `BREVO_API_KEY`, `BREVO_SENDER_EMAIL` e `BREVO_SENDER_NAME`: configuração dos envios de email de cadastro e recuperação.
- `ORIGEM_AUTORIZADA`: origem do frontend; para execução local, `http://localhost:3000`. Múltiplas origens são separadas por vírgulas.
- `PORT`: porta HTTP; o padrão é `3000`.
- `NODE_ENV`: `development` localmente e `production` no ambiente publicado.

Mantenha as chaves e os segredos no `.env`; não os inclua no Git.

Inicie a aplicação:

```bash
npm start
```

- Aplicação local: http://localhost:3000/
- Listagem local de metas: http://localhost:3000/tela-principal/listar-metas
- Swagger local: http://localhost:3000/api-docs/
- Aplicação publicada: https://cashland-cdf0.onrender.com/
- Swagger publicado: https://cashland-cdf0.onrender.com/api-docs/

#### Executar testes

Testes JavaScript locais:

```bash
npm test
```

Os testes HTTP usam credenciais fictícias e consultas simuladas, sem depender do `.env`.
O catálogo cobre as páginas e APIs atuais, incluindo metas, Swagger e limites de requisições.

Testes das nove listagens em navegador, incluindo transações e recorrências, nas resoluções
1280 × 900, 390 × 844 e 320 × 568:

```bash
npm run test:frontend
```

É necessário ter Chromium, Chrome ou Brave instalado. Se o executável não for encontrado,
informe `BROWSER_BIN=/caminho/do/navegador`. Em contêineres sem suporte ao sandbox do Chromium,
use `BROWSER_NO_SANDBOX=1`. A execução cria um perfil temporário, usa portas locais aleatórias,
bloqueia requisições externas e simula as APIs. Verifica clique/toque, teclado, foco, menu único,
posicionamento, rolagem, filtros, recarga, permissões e o botão de 24 × 24 px com área de toque de 44 × 44 px.

Testes específicos de nomes de metas e integração do frontend:

```bash
node --test tests/metas-nome.test.js tests/id-meta-frontend.test.js
```

Para utilizar o testador Python, prepare um ambiente virtual na sua pasta de ferramentas, fora do repositório:

```bash
python3 -m venv /tmp/cashland-testes-venv
. /tmp/cashland-testes-venv/bin/activate
python -m pip install requests
python tests/testar_rotas.py --testes-rf07
python tests/testar_rotas.py --testes-admin-metas
python tests/testar_rotas.py --testes-rf06
```

Essas opções do testador Python utilizam banco simulado. Para o menu interativo de chamadas HTTP:

```bash
python tests/testar_rotas.py
```

Após instalar os pré-requisitos Python e o navegador, `npm run test:local` executa todas as suítes locais.
As suítes Python também estão disponíveis por `npm run test:rf06` e `npm run test:rf07`.
Esses testes não executam SQL, migrations ou triggers no banco real.

O E2E IDOR permanece separado: configure `SUPABASE_TEST_URL`, `SUPABASE_TEST_SECRET_KEY` e
`SEGREDO_JWT` para um Supabase de testes diferente do banco da aplicação e execute `npm run test:idor`.
Essa suíte cria e remove somente seus registros temporários. Sem essa configuração, ela é pulada por `npm test`.

#### Exemplos de curl — autenticação e CRUD da RF-007

Os exemplos abaixo usam Bash. Substitua o email, a senha e os identificadores pelos dados do ambiente utilizado. Utilize uma meta criada para o teste nas operações de edição e exclusão. Os IDs mostrados são ilustrativos.

Defina a URL publicada; para testar localmente, troque o valor por `http://localhost:3000`:

```bash
BASE_URL='https://cashland-cdf0.onrender.com'
```

**Login do usuário comum — HTTP 200:** o servidor grava o JWT no cookie `token`. O arquivo de cookies deve acompanhar as chamadas seguintes.

```bash
curl -i -c cookies-cashland.txt \
  -H 'Content-Type: application/json' \
  --data '{"email":"seu-email@example.com","senha":"SUA_SENHA_AQUI"}' \
  "$BASE_URL/login"
```

**Consultar contas — HTTP 200:** escolha uma conta retornada para definir `ID_CONTA`.

```bash
curl -i -b cookies-cashland.txt "$BASE_URL/usuario/listar-contas"

ID_CONTA=10
```

**Criar meta — HTTP 201:** resposta esperada: mensagem Meta criada com sucesso.

```bash
curl -i -b cookies-cashland.txt \
  -H 'Content-Type: application/json' \
  --data "{\"id_conta\":$ID_CONTA,\"nome\":\"Meta de teste curl\",\"descricao\":\"Teste do CRUD\",\"valor_meta\":5000,\"data_meta\":\"2027-12-31\"}" \
  "$BASE_URL/usuario/criar-meta"
```

**Listar e localizar a meta — HTTP 200:** a resposta contém `mensagem` e a coleção `metas`. Defina `ID_META` com o identificador real retornado nessa consulta; a criação retorna somente uma mensagem.

```bash
curl -i -b cookies-cashland.txt --get \
  --data-urlencode 'pesquisa=Meta de teste curl' \
  "$BASE_URL/usuario/listar-metas"

ID_META=20
```

**Combinar filtros — HTTP 200 quando houver resultados:** sem correspondências, a rota retorna HTTP 404.

```bash
curl -i -b cookies-cashland.txt --get \
  --data-urlencode "id_contas=$ID_CONTA" \
  --data-urlencode 'status=Em progresso' \
  "$BASE_URL/usuario/listar-metas"
```

**Editar meta — HTTP 200:** apenas os campos enviados são alterados; `data_meta: null` remove o prazo.

```bash
curl -i -X PATCH -b cookies-cashland.txt \
  -H 'Content-Type: application/json' \
  --data "{\"id_meta\":$ID_META,\"nome\":\"Meta de teste curl atualizada\",\"valor_meta\":7500,\"data_meta\":null}" \
  "$BASE_URL/usuario/editar-meta"
```

**Excluir a meta de teste — HTTP 200:** resposta esperada: mensagem Meta deletada com sucesso. Execute depois de conferir a edição e somente para o registro criado para o teste.

```bash
curl -i -X DELETE -b cookies-cashland.txt \
  "$BASE_URL/usuario/deletar-meta/$ID_META"
```

#### Exemplos de curl — administração de metas

Faça login com uma conta Admin e mantenha um arquivo de cookies separado:

```bash
curl -i -c cookies-admin-cashland.txt \
  -H 'Content-Type: application/json' \
  --data '{"email":"admin@example.com","senha":"SUA_SENHA_ADMIN"}' \
  "$BASE_URL/login"
```

**Listagem administrativa — HTTP 200 quando houver resultados:** sem `id_usuario`, a consulta abrange diferentes usuários. Para restringir a consulta, utilize o ID real do proprietário.

```bash
ID_USUARIO=123

curl -i -b cookies-admin-cashland.txt --get \
  --data-urlencode "id_usuario=$ID_USUARIO" \
  "$BASE_URL/admin/listar-metas"
```

**Edição administrativa — HTTP 200:** defina `ID_META` com uma meta existente do proprietário informado.

```bash
curl -i -X PATCH -b cookies-admin-cashland.txt \
  -H 'Content-Type: application/json' \
  --data "{\"id_meta\":$ID_META,\"id_usuario\":$ID_USUARIO,\"descricao\":\"Descrição alterada pelo administrador\"}" \
  "$BASE_URL/admin/editar-meta"
```

**Exclusão administrativa de uma meta de teste — HTTP 200:** IDs da meta e do proprietário são enviados no caminho.

```bash
curl -i -X DELETE -b cookies-admin-cashland.txt \
  "$BASE_URL/admin/deletar-meta/$ID_META/$ID_USUARIO"
```

**Respostas de erro:** HTTP 400 para validação; 401 para sessão ausente/inválida; 403 para perfil sem autorização administrativa; 404 para registro não encontrado/não autorizado ou listagem sem resultados; 409 para nome duplicado; 429 para limite excedido; 500 para falha de banco/processamento.

#### Exemplos de curl — demais recursos e operações

Os comandos são exemplos independentes para Bash e usam o mesmo `BASE_URL` público e os
arquivos de cookies definidos acima. Substitua credenciais e IDs pelos do seu ambiente;
`SUA_SENHA_AQUI` é um placeholder e a senha real precisa ter de 10 a 256 caracteres.
Os exemplos de escrita/exclusão devem usar somente registros criados para teste. Eles não
foram executados contra o ambiente publicado durante a validação desta documentação.

Criações de categoria, conta, transação, recorrência e meta retornam uma mensagem, sem ID.
Localize o registro na listagem correspondente antes de preencher as variáveis abaixo.
Os números são ilustrativos; `ID_USUARIO` identifica o proprietário dos registros nas
operações administrativas. Não use a categoria `Sem categoria` ou a conta `padrão` para
os testes de alteração/exclusão.

```bash
ID_USUARIO=123
ID_CATEGORIA=30
ID_CONTA=10
ID_CONTA_DESTINO=11
ID_TRANSACAO=40
ID_RECORRENCIA=50
ID_META=20
```

**RF-002/RF-003 — cadastro, sessão e recuperação.** Solicitar o código exige nome,
email e senha. Confirme com o código recebido no email, substituindo `123456` no campo
real `codigoDigitado`. Cadastro concluído retorna `200`; `201` significa usuário criado,
mas falha no email de boas-vindas. Depois, faça login conforme o exemplo anterior.

```bash
curl -i -H 'Content-Type: application/json' \
  --data '{"nome":"Pessoa de teste","email":"pessoa@example.com","senha":"SUA_SENHA_AQUI"}' \
  "$BASE_URL/solicitar-codigo"
curl -i -H 'Content-Type: application/json' \
  --data '{"nome":"Pessoa de teste","email":"pessoa@example.com","senha":"SUA_SENHA_AQUI","codigoDigitado":"123456"}' \
  "$BASE_URL/confirmar-cadastro"
curl -i -b cookies-cashland.txt "$BASE_URL/me"
curl -i -b cookies-admin-cashland.txt "$BASE_URL/me?id_usuario=$ID_USUARIO"
curl -i -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data '{"senha":"SUA_SENHA_AQUI"}' "$BASE_URL/confirmar-senha"
curl -i -H 'Content-Type: application/json' \
  --data '{"email":"pessoa@example.com"}' "$BASE_URL/solicitar-reset-senha"
curl -i -H 'Content-Type: application/json' \
  --data '{"email":"pessoa@example.com","codigoDigitado":"123456","novaSenha":"SUA_NOVA_SENHA_AQUI"}' \
  "$BASE_URL/confirmar-reset-senha"
```

A API aceita JWT **somente no cookie `token`**; `Authorization: Bearer` não autentica.
Login com `status_reset_senha=true` retorna `203`, sem emitir cookie; conclua a recuperação.
No navegador, faça login na mesma origem do Swagger UI para usar seu cookie HttpOnly;
o campo de autorização de cookie do Swagger não consegue definir manualmente o cabeçalho
`Cookie`. Os cookies duram duas horas, têm `SameSite=Strict` e usam `Secure` em produção.

**RF-003 — usuários.** O usuário comum consulta seus dados e altera somente o nome.
A desativação própria não exige corpo. O administrador altera nome/email e gerencia
ativação, solicitação de reset e exclusão. Não há criação administrativa separada.

```bash
curl -i -b cookies-cashland.txt "$BASE_URL/usuario"
curl -i -X PATCH -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data '{"nome":"Pessoa de teste atualizada"}' "$BASE_URL/usuario/atualizar-dados"
# Desative a conta de teste somente depois de concluir as operações que exigem usuário ativo.
curl -i -X PATCH -b cookies-cashland.txt "$BASE_URL/usuario/desativar-usuario"

curl -i -b cookies-admin-cashland.txt "$BASE_URL/admin/listar-usuarios"
curl -i -b cookies-admin-cashland.txt --get --data-urlencode 'pesquisa=Pessoa' "$BASE_URL/admin/listar-usuarios"
curl -i -b cookies-admin-cashland.txt "$BASE_URL/admin/usuario?id_usuario=$ID_USUARIO"
curl -i -X PATCH -b cookies-admin-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_usuario\":$ID_USUARIO,\"nome\":\"Pessoa de teste\",\"email\":\"pessoa@example.com\"}" "$BASE_URL/admin/editar-usuario"
curl -i -X PATCH -b cookies-admin-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_usuario\":$ID_USUARIO}" "$BASE_URL/admin/resetar-senha"
curl -i -X PATCH -b cookies-admin-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_usuario\":$ID_USUARIO}" "$BASE_URL/admin/reativar-usuario"
curl -i -X PATCH -b cookies-admin-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_usuario\":$ID_USUARIO}" "$BASE_URL/admin/desativar-usuario"
# Exclusão definitiva: somente o usuário comum criado para o teste, ao final.
curl -i -X DELETE -b cookies-admin-cashland.txt "$BASE_URL/admin/deletar-usuario/$ID_USUARIO"
```

A listagem administrativa de usuários retorna `200` sem pesquisa e `201` com pesquisa.
A solicitação administrativa de reset não envia código nem define uma nova senha;
falha no update retorna `501`. Administradores não podem desativar/excluir outro Admin
pelas rotas administrativas. Desativação e logout não revogam cópias de JWT já emitidas.

**RF-004 — categorias.** Criação, edição e exclusão retornam `200` com mensagem.
Use a listagem para obter `ID_CATEGORIA`. A edição administrativa não recebe `id_usuario`;
a exclusão administrativa exige categoria e proprietário no caminho.

```bash
curl -i -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data '{"nome":"Categoria de teste","descricao":"Despesas fictícias"}' "$BASE_URL/usuario/criar-categoria"
curl -i -b cookies-cashland.txt --get --data-urlencode 'pesquisa=Categoria de teste' "$BASE_URL/usuario/listar-categoria"
curl -i -X PATCH -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_categoria\":$ID_CATEGORIA,\"nome\":\"Categoria atualizada\",\"descricao\":\"Descrição de teste\"}" "$BASE_URL/usuario/editar-categoria"
curl -i -X DELETE -b cookies-cashland.txt "$BASE_URL/usuario/deletar-categoria/$ID_CATEGORIA"

curl -i -b cookies-admin-cashland.txt "$BASE_URL/admin/listar-categoria?id_usuario=$ID_USUARIO"
curl -i -b cookies-admin-cashland.txt "$BASE_URL/admin/listar-categoria?id_categoria=$ID_CATEGORIA"
curl -i -X PATCH -b cookies-admin-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_categoria\":$ID_CATEGORIA,\"nome\":\"Categoria editada pelo admin\"}" "$BASE_URL/admin/editar-categoria"
curl -i -X DELETE -b cookies-admin-cashland.txt "$BASE_URL/admin/deletar-categoria/$ID_CATEGORIA/$ID_USUARIO"
```

**RF-005 — contas financeiras.** Criação retorna `200`. Mesmo em `PATCH`, nome e tipo
são obrigatórios. Para `Credito`, dias de fechamento/vencimento são inteiros de 1 a 31;
na criação, ambos são necessários. Para outros tipos, são gravados como `null`.
A exclusão definitiva existe somente para Admin; o usuário comum pode inativar/reativar.

```bash
curl -i -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data '{"nome_conta":"Conta de teste","tipo_conta":"Credito","codigo_conta":null,"nome_instituicao":"Banco Exemplo","data_fechamento":20,"data_vencimento":5}' "$BASE_URL/usuario/criar-conta"
curl -i -b cookies-cashland.txt --get --data-urlencode 'pesquisa=Conta de teste' "$BASE_URL/usuario/listar-contas"
curl -i -X PATCH -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_conta\":$ID_CONTA,\"nome_conta\":\"Conta atualizada\",\"tipo_conta\":\"Credito\",\"data_fechamento\":21,\"data_vencimento\":6}" "$BASE_URL/usuario/editar-conta"
curl -i -X PATCH -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_conta\":$ID_CONTA}" "$BASE_URL/usuario/inativar-conta"
curl -i -X PATCH -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_conta\":$ID_CONTA}" "$BASE_URL/usuario/reativar-conta"

curl -i -b cookies-admin-cashland.txt "$BASE_URL/admin/listar-contas?id_usuario=$ID_USUARIO"
curl -i -X PATCH -b cookies-admin-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_conta\":$ID_CONTA,\"id_usuario\":$ID_USUARIO,\"nome_conta\":\"Conta editada pelo admin\",\"tipo_conta\":\"Corrente\"}" "$BASE_URL/admin/editar-conta"
curl -i -X PATCH -b cookies-admin-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_conta\":$ID_CONTA,\"id_usuario\":$ID_USUARIO}" "$BASE_URL/admin/inativar-conta"
curl -i -X PATCH -b cookies-admin-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_conta\":$ID_CONTA,\"id_usuario\":$ID_USUARIO}" "$BASE_URL/admin/reativar-conta"
curl -i -X DELETE -b cookies-admin-cashland.txt "$BASE_URL/admin/deletar-conta/$ID_CONTA/$ID_USUARIO"
```

**RF-006 — transações, recorrências e saldo.** Criações retornam `201`, edições e
exclusões/cancelamentos retornam `200`. Localize os IDs pelas listagens. Entrada/Saida
usa categoria; Transferencia exige duas contas diferentes e não permite `id_meta`.
Envie `data_pagamento` para Pago e `null` para Pendente, respeitando os CHECKs do banco.
Na recorrência Parcelado, use frequência Mensal e pelo menos duas parcelas para ser
compatível também com o DDL de referência. `id_meta` é opcional nas duas criações.

```bash
curl -i -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_conta_origem\":$ID_CONTA,\"id_categoria\":$ID_CATEGORIA,\"tipo_transacao\":\"Saida\",\"nome\":\"Despesa de teste\",\"forma_pagamento\":\"PIX\",\"valor_transacao\":50,\"status_transacao\":\"Pendente\",\"data_transacao\":\"2026-10-20\",\"data_pagamento\":null}" "$BASE_URL/usuario/criar-transacao"
curl -i -b cookies-cashland.txt --get --data-urlencode 'nome=Despesa de teste' "$BASE_URL/usuario/listar-transacoes"
curl -i -b cookies-cashland.txt --get \
  --data-urlencode "id_contas=$ID_CONTA" --data-urlencode "id_contas=$ID_CONTA_DESTINO" \
  --data-urlencode 'periodo_criacao=2026-10-01' --data-urlencode 'periodo_criacao=2026-10-31' "$BASE_URL/usuario/listar-transacoes"
curl -i -X PATCH -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_transacao\":$ID_TRANSACAO,\"nome\":\"Despesa atualizada\"}" "$BASE_URL/usuario/editar-transacao"
curl -i -b cookies-cashland.txt "$BASE_URL/usuario/verificar-saldo?id_conta=$ID_CONTA"
curl -i -X DELETE -b cookies-cashland.txt "$BASE_URL/usuario/excluir-transacao/$ID_TRANSACAO"

curl -i -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_conta\":$ID_CONTA,\"id_categoria\":$ID_CATEGORIA,\"tipo_transacao\":\"Saida\",\"modalidade\":\"Parcelado\",\"nome\":\"Compra de teste\",\"forma_pagamento\":\"PIX\",\"valor\":300,\"frequencia\":\"Mensal\",\"qtd_parcelas\":3,\"data_inicio\":\"2026-11-01\",\"ativo\":true}" "$BASE_URL/usuario/criar-recorrencia"
curl -i -b cookies-cashland.txt "$BASE_URL/usuario/listar-recorrencias?id_contas=$ID_CONTA"
curl -i -X PATCH -b cookies-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_recorrencia\":$ID_RECORRENCIA,\"nome\":\"Compra atualizada\"}" "$BASE_URL/usuario/editar-recorrencia"
curl -i -X DELETE -b cookies-cashland.txt "$BASE_URL/usuario/excluir-recorrencia/$ID_RECORRENCIA"

curl -i -b cookies-admin-cashland.txt "$BASE_URL/admin/listar-transacoes?id_usuario=$ID_USUARIO&id_transacao=$ID_TRANSACAO"
curl -i -X PATCH -b cookies-admin-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_transacao\":$ID_TRANSACAO,\"id_usuario\":$ID_USUARIO,\"nome\":\"Despesa editada pelo admin\"}" "$BASE_URL/admin/editar-transacao"
curl -i -X DELETE -b cookies-admin-cashland.txt "$BASE_URL/admin/excluir-transacao/$ID_TRANSACAO/$ID_USUARIO"
curl -i -b cookies-admin-cashland.txt "$BASE_URL/admin/listar-recorrencias?id_usuario=$ID_USUARIO&id_recorrencia=$ID_RECORRENCIA"
curl -i -X PATCH -b cookies-admin-cashland.txt -H 'Content-Type: application/json' \
  --data "{\"id_recorrencia\":$ID_RECORRENCIA,\"id_usuario\":$ID_USUARIO,\"nome\":\"Compra editada pelo admin\"}" "$BASE_URL/admin/editar-recorrencia"
curl -i -X DELETE -b cookies-admin-cashland.txt "$BASE_URL/admin/excluir-recorrencia/$ID_RECORRENCIA/$ID_USUARIO"
```

Cancelar uma recorrência mantém o registro com `ativo=false` e preserva transações pagas;
remove somente as pendentes. Se a remoção falhar após inativar, a API retorna `500` e
orienta repetir o cancelamento. A exclusão de uma transação individual é definitiva.
Exclua os registros de teste na ordem de seus vínculos; o banco pode impedir excluir
contas, categorias ou metas que ainda estejam referenciadas.

**Encerrar a sessão:** público, sem corpo, com `200`. `-c` atualiza o arquivo de cookies
para refletir a limpeza feita pelo servidor.

```bash
curl -i -X POST -b cookies-cashland.txt -c cookies-cashland.txt "$BASE_URL/logout"
```

#### Contrato e cobertura da documentação

O arquivo [docs/api/swagger.json](docs/api/swagger.json) usa OpenAPI 3.0 e é carregado
pela integração existente em `/api-docs/`. A documentação cobre somente APIs, sem
incluir as rotas de páginas HTML, arquivos estáticos ou criar rotas de detalhe inexistentes.

| RF/recurso | Operações |
| --- | ---: |
| RF-002 — autenticação e recuperação | 6 |
| RF-003 — cadastro e usuários | 12 |
| RF-004 — categorias | 7 |
| RF-005 — contas financeiras | 10 |
| RF-006 — transações, recorrências e saldo | 15 |
| RF-007 — metas financeiras | 7 |
| **Total** | **57** |

Os modelos preservam as respostas reais, inclusive `mensagem` versus `erro`, arrays
sem envelope e o objeto `{mensagem, metas}`. Não há paginação no servidor. Joi retorna
`400` com `{mensagem, erros: [{campo, mensagem}]}`; erros não tratados e JSON malformado
podem retornar HTML pelo Express. Os limites por IP e suas janelas estão descritos em
cada operação, incluindo `429` e `Retry-After`.

Divergências conhecidas, documentadas sem mudar o backend:

- O mecanismo real é `CookieAuth` (`token`), não o `BearerAuth` solicitado pelo guia.
- Códigos como `200` em criações de conta/categoria, `201` em pesquisa de usuários,
  `203` no login com reset pendente e `501` no reset administrativo são intencionais
  na documentação porque refletem os controllers atuais.
- A consulta administrativa de categorias com **ambos** `id_categoria` e `id_usuario`
  seleciona todos os campos do usuário associado, inclusive `senha_hash`. Esse defeito
  de exposição está representado no schema; nenhum hash real foi usado nos exemplos.
- A edição da categoria padrão verifica o nome novo, permitindo renomeá-la; a validação
  compartilhada de contas não verifica inatividade. Joi e DDL também diferem em algumas
  regras de transações e quantidade mínima de parcelas. Consulte as descrições das operações.
