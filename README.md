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
- Conta de usuário cadastrada para acessar a aplicação. Para testar a RF-007, utilize a versão da branch correspondente.
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
  --data '{"email":"seu-email@example.com","senha":"SUA_SENHA"}' \
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
