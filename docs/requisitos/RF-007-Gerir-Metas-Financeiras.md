# RF-007: Gerir Metas Financeiras

## 1. Identificação

- **ID:** RF-007.
- **Título:** Gerir Metas Financeiras.
- **Tipo:** Requisito funcional.
- **Prioridade:** Alta.
- **Complexidade:** 13 story points — estimativa relativa considerando CRUD, filtros, permissões administrativas e integração com transações.

### a) URL da Aplicação (Deploy Online)

- **URL:** https://cashland-cdf0.onrender.com/
- **Plataforma:** Render.

### b) Link do Banco de Dados Online

- **BD:** Supabase — PostgreSQL.
- **Link:** https://supabase.com/dashboard/project/xjfgkakjpuxoznbwznyb
- **Tabela principal da RF-007:** `metas`.

### c) Link do GitHub

- **Repositório:** https://github.com/JoaoSousa2002/CashLand
- **Branch principal:** `main`.

---

## 2. Descrição e Atores

A RF-007 permite organizar metas financeiras vinculadas às contas bancárias do usuário. No cadastro, são informados a conta, o nome e o valor objetivo, além da descrição e da data limite quando desejado. A consulta apresenta o valor atual, o valor objetivo, o prazo e o status armazenados para cada meta.

O usuário pode consultar suas metas, pesquisar por nome ou identificador e combinar filtros por contas e status. Na edição, pode alterar conta, nome, descrição, valor objetivo e data limite. O identificador, o status, o valor atual e as datas de criação e atualização são apresentados somente para consulta. A exclusão é disponibilizada no menu contextual da listagem e exige confirmação.

O administrador possui acesso às listagens e aos formulários administrativos para consultar, editar e excluir metas. Pode consultar diferentes usuários ou informar um proprietário nos filtros. As alterações e exclusões administrativas exigem identificar o proprietário da meta. O pertencimento é determinado pela conta bancária associada, pois a tabela de metas não possui coluna própria de usuário.

A integração com a RF-006 permite associar transações e recorrências a uma meta por meio do identificador opcional `id_meta`. O backend verifica o proprietário da meta e rejeita a associação com transações do tipo Transferencia. Os registros financeiros associados podem ser consultados pelos filtros da RF-006.

### Benefícios para o negócio

- Organizar os objetivos financeiros pessoais por conta bancária.
- Consultar valores, prazos e status das metas em uma listagem centralizada.
- Localizar objetivos por nome, identificador, contas e status.
- Relacionar objetivos com transações e recorrências já registradas no sistema.
- Permitir administração dos registros com verificação de perfil e proprietário.

### Atores

- **Usuário autenticado:** cria, consulta, edita e exclui as próprias metas — Create, Read, Update e Delete. Acessa as telas da área do usuário e utiliza as funcionalidades da RF-006 para associar movimentações a metas.
- **Administrador autenticado:** consulta metas de diferentes usuários e edita ou exclui registros do proprietário informado — Read, Update e Delete na área administrativa. Não existe uma rota administrativa específica de criação de metas.
- **Sistema CashLand — API e triggers do banco (ator secundário, sem interface):** recebe as movimentações da RF-006 e mantém automaticamente `valor_atual`, `status` e `data_atualizacao` das metas pelas funções `atualizar_valor_meta`, `atualizar_status_meta` e `atualizar_data_atualizacao_meta`, garante a unicidade do nome por proprietário (`verificar_nome_meta_unico`) e registra a auditoria de cada operação — somente Update automático; não cria, consulta nem exclui metas por conta própria.

### Validações necessárias

- A conta bancária, o nome e o valor objetivo são obrigatórios no cadastro.
- A conta informada deve existir e pertencer ao proprietário da operação.
- O nome deve conter pelo menos um caractere após a remoção dos espaços das extremidades.
- O nome não pode repetir o de outra meta do mesmo usuário, inclusive em outra conta. A regra é verificada pela aplicação e garantida no banco pelo trigger `trigger_verificar_nome_meta_unico`.
- O valor objetivo deve ser numérico, positivo, finito e possuir no máximo duas casas decimais.
- A descrição é opcional e aceita texto vazio ou nulo.
- A data limite é opcional; quando preenchida, deve ser uma data válida no formato AAAA-MM-DD.
- Os identificadores de meta, conta e usuário devem ser inteiros entre 1 e 2.147.483.647 nos schemas de metas.
- O filtro de status aceita Em progresso ou Finalizado.
- Edição e exclusão administrativas exigem o identificador do proprietário; na listagem administrativa, esse filtro é opcional.
- Campos não previstos no schema da operação são rejeitados.

---

## 3. Casos de Uso

### Fluxo principal: criar meta financeira

**Pré-condições:** usuário autenticado e conta bancária existente em seu nome.

- O usuário acessa Gerir metas na área do usuário.
- Seleciona Criar meta.
- O sistema verifica a sessão e carrega as contas bancárias.
- O usuário seleciona uma conta.
- Informa o nome da meta.
- Opcionalmente, informa a descrição.
- Informa o valor objetivo.
- Preenche a data limite ou deixa a meta sem prazo.
- Seleciona Criar meta para enviar o formulário.
- O sistema valida os campos e verifica o pertencimento da conta.
- O sistema verifica se o nome já existe entre as metas desse usuário.
- O backend insere a meta no banco e confirma o registro criado.
- A aplicação apresenta a mensagem de sucesso.
- Ao continuar, o usuário retorna à listagem.

**Pós-condições:** meta persistida em `metas`, associada à conta selecionada e disponível para consulta.

**Pós-condição de falha:** nenhuma meta é inserida; a API informa o motivo (HTTP 400, 404, 409 ou 500) e o formulário permanece preenchido para correção.

### Fluxo principal: consultar e filtrar metas

**Pré-condição:** usuário autenticado.

- O usuário acessa Gerir metas.
- O sistema carrega as contas e consulta as metas do usuário.
- A tabela apresenta ID, nome, conta, valor atual, valor objetivo, data limite e status.
- O usuário pode informar parte do nome ou o ID no campo de pesquisa.
- Seleciona Pesquisar para atualizar a consulta.
- Opcionalmente, seleciona Filtrar.
- Escolhe uma ou mais contas e o status desejado.
- Seleciona Aplicar filtros.
- O sistema combina os critérios e restringe o resultado ao proprietário autenticado.
- A listagem apresenta os registros correspondentes ou a mensagem Nenhuma meta encontrada.

**Pós-condição:** metas exibidas conforme pesquisa, filtros e permissões do usuário.

**Pós-condição de falha:** a listagem não é alterada; a tela apresenta a mensagem retornada (HTTP 400, 404 ou 500) e mantém os critérios para nova tentativa.

### Fluxo principal: editar meta

**Pré-condições:** usuário autenticado e meta existente em seu nome.

- O usuário abre o menu contextual da linha com o botão direito.
- Seleciona Ver.
- A página de edição recebe o ID da meta pela URL.
- O sistema consulta a meta e seleciona o registro com o identificador exato.
- Exibe ID, status, valor atual e datas de controle em campos bloqueados.
- O usuário altera conta, nome, descrição, valor objetivo ou data limite.
- Seleciona Salvar alterações.
- O frontend envia o ID e os campos alterados.
- O backend verifica os dados, o pertencimento da meta e a conta informada.
- Quando o nome é alterado, verifica duplicidade desconsiderando a própria meta.
- O sistema confirma a atualização e apresenta o resultado.

**Pós-condição:** campos enviados atualizados na meta, preservando os demais dados.

**Pós-condição de falha:** a meta permanece com os dados anteriores; nenhuma alteração parcial é gravada (HTTP 400, 404, 409 ou 500).

### Fluxo principal: excluir meta

**Pré-condições:** usuário autenticado, meta própria e ausência de impedimento pelas referências do banco.

- O usuário localiza a meta na listagem.
- Abre o menu contextual da linha.
- Seleciona Excluir.
- O sistema apresenta a confirmação com o nome e o ID da meta.
- O sistema informa que a ação não poderá ser desfeita.
- O usuário seleciona Continuar.
- A API recebe o identificador pelo caminho da solicitação.
- O backend verifica a existência e o pertencimento da meta.
- Solicita a exclusão e confirma o registro removido.
- A interface apresenta o resultado e atualiza a listagem.

**Pós-condição:** meta removida do banco e da listagem.

**Pós-condição de falha:** a meta é preservada no banco e na listagem (HTTP 404 ou 500), inclusive quando o usuário cancela a confirmação.

### Fluxo principal: administrar metas

**Pré-condição:** usuário autenticado com perfil Admin.

- O administrador acessa Gerir metas na área administrativa.
- O sistema apresenta metas com o identificador do proprietário relacionado à conta.
- O administrador pesquisa por nome ou ID e pode abrir os filtros.
- Pode informar um usuário, selecionar contas e escolher o status.
- Aplica os filtros para atualizar a consulta.
- Abre o menu contextual da meta desejada.
- Seleciona Ver para editar ou Excluir para iniciar a confirmação.
- Na edição, o sistema recebe pela URL os IDs da meta e do proprietário.
- O administrador altera os campos permitidos e salva, ou confirma a exclusão.
- O backend verifica o perfil administrativo e o pertencimento do registro ao proprietário informado.
- A aplicação executa a operação autorizada e apresenta o resultado.

**Pós-condição:** consulta, edição ou exclusão realizada no contexto do proprietário correto.

**Pós-condição de falha:** nenhuma meta de outro proprietário é consultada, alterada ou excluída (HTTP 403 ou 404); os registros permanecem inalterados.

### Fluxo alternativo: nome de meta já existe

- Durante a criação ou edição, o sistema encontra outra meta do mesmo usuário com o nome informado.
- A API retorna HTTP 409 com a mensagem Já existe uma meta com esse nome.
- A operação não é concluída.
- O usuário pode corrigir o nome e enviar novamente.

### Fluxo alternativo: dados inválidos

- A solicitação contém campos obrigatórios ausentes, tipos inválidos, valores não permitidos ou campos desconhecidos.
- A API retorna HTTP 400 com a lista de erros.
- O frontend apresenta os erros associados aos campos correspondentes.
- O usuário corrige os dados e repete o envio.

### Fluxo alternativo: registro inexistente ou de outro proprietário

- O backend verifica o identificador e seu relacionamento com a conta do usuário.
- Se a meta ou a conta não existir ou não pertencer ao proprietário esperado, retorna HTTP 404.
- A alteração ou exclusão é interrompida.

### Fluxo alternativo: consulta sem resultados

- Nenhuma meta corresponde à pesquisa e aos filtros.
- A API retorna HTTP 404 com a mensagem Nenhuma meta encontrada.
- A tela apresenta a mensagem na tabela e permite alterar os critérios.

### Fluxo alternativo: exclusão cancelada ou impedida

- Se o usuário selecionar Cancelar, a confirmação é fechada e a meta é preservada.
- Se confirmar a exclusão de uma meta referenciada por transações ou recorrências, a chave estrangeira pode impedir a remoção.
- Na falha de exclusão retornada pelo banco, a API responde HTTP 500 e a interface informa que a operação não foi concluída.

### Fluxo alternativo: sessão ou permissão inválida

- Sessão ausente, inválida ou expirada provoca HTTP 401 na API.
- Usuário comum tentando executar uma operação administrativa recebe HTTP 403.
- A operação protegida não é executada.

### Exemplos práticos

Os exemplos usam `BASE_URL=https://cashland-cdf0.onrender.com` e o cookie `token` emitido por `POST /login`. Os identificadores são ilustrativos; os corpos e códigos de resposta correspondem aos controllers e ao `docs/api/swagger.json`.

**Criar meta — `POST /usuario/criar-meta`**

```json
{ "id_conta": 10, "nome": "Reserva de emergência", "descricao": "Seis meses de despesas", "valor_meta": 12000, "data_meta": "2027-06-30" }
```

Resposta HTTP 201:

```json
{ "mensagem": "Meta criada com sucesso" }
```

Nome já usado em outra meta do mesmo usuário, HTTP 409:

```json
{ "mensagem": "Já existe uma meta com esse nome" }
```

Dados inválidos (por exemplo, `valor_meta` negativo), HTTP 400:

```json
{ "mensagem": "Dados inválidos.", "erros": [ { "campo": "valor_meta", "mensagem": "O valor objetivo deve ser maior que zero." } ] }
```

**Consultar metas — `GET /usuario/listar-metas?pesquisa=Reserva&status=Em%20progresso`**

Resposta HTTP 200:

```json
{
  "mensagem": "Metas listadas com sucesso",
  "metas": [
    {
      "id_meta": 20, "id_conta": 10, "nome": "Reserva de emergência", "descricao": "Seis meses de despesas",
      "status": "Em progresso", "valor_atual": 1500, "valor_meta": 12000, "data_meta": "2027-06-30",
      "data_criacao": "2026-11-15T14:02:11.512+00:00", "data_atualizacao": "2026-11-15T14:02:11.512+00:00",
      "contas_bancarias": { "id_usuario": 1 }
    }
  ]
}
```

Sem resultados, HTTP 404: `{ "mensagem": "Nenhuma meta encontrada" }`.

**Editar meta — `PATCH /usuario/editar-meta`**

```json
{ "id_meta": 20, "valor_meta": 15000, "data_meta": null }
```

Resposta HTTP 200: `{ "mensagem": "Meta editada com sucesso" }`. Meta inexistente ou de outro usuário, HTTP 404: `{ "mensagem": "Essa meta não existe" }`.

**Excluir meta — `DELETE /usuario/deletar-meta/20`**

Resposta HTTP 200: `{ "mensagem": "Meta deletada com sucesso" }`. Sem sessão, HTTP 401; usuário comum em rota administrativa, HTTP 403.

### Requisitos não funcionais

- **RNF-01 — Autenticação e autorização:** as rotas de metas devem exigir sessão válida, restringir operações comuns aos registros próprios e exigir perfil Admin nas operações administrativas.
- **RNF-02 — Usabilidade:** a interface deve apresentar os estados vazio, preenchido, erro, carregando e sucesso, com mensagens em português e confirmação de exclusão.
- **RNF-03 — Responsividade:** as páginas devem permitir uso em 320px, 768px e 1024px ou mais, com acesso ao conteúdo e à tabela.
- **RNF-04 — Integridade e persistência:** as operações devem utilizar o banco online e respeitar as relações entre metas, contas e registros financeiros.
- **RNF-05 — Controle de solicitações:** as rotas devem aplicar os limitadores de frequência definidos para criação, consulta, edição e exclusão, retornando HTTP 429 ao exceder a janela.

### Regras de negócio

- **RN-01:** toda meta criada pela API deve estar vinculada a uma conta pertencente ao usuário autenticado.
- **RN-02:** o proprietário da meta é identificado pela conta bancária vinculada.
- **RN-03:** nomes duplicados entre metas do mesmo usuário são rejeitados na criação e edição pela aplicação (HTTP 409) e garantidos no banco pelo trigger `trigger_verificar_nome_meta_unico`, que serializa gravações simultâneas do mesmo proprietário.
- **RN-04:** o valor objetivo deve ser positivo e informado com no máximo duas casas decimais.
- **RN-05:** descrição e data limite são opcionais; enviar nulo permite remover esses valores na edição.
- **RN-06:** o status admite somente Em progresso ou Finalizado.
- **RN-07:** ID, status, valor atual e datas de criação e atualização não são alteráveis pelo formulário nem pelo contrato de edição de metas.
- **RN-08:** pesquisa por nome ou ID, contas e status podem ser utilizados em conjunto.
- **RN-09:** a listagem administrativa permite consulta global; informar o usuário restringe o resultado ao proprietário selecionado.
- **RN-10:** edição e exclusão administrativas exigem identificar o proprietário da meta.
- **RN-11:** uma transação ou recorrência só pode ser vinculada a uma meta do mesmo proprietário.
- **RN-12:** transações do tipo Transferencia não podem ser vinculadas a metas.
- **RN-13:** a conta da movimentação pode ser diferente da conta da meta, desde que ambas pertençam ao mesmo usuário.

---

## 4. Protótipo

Interface com CRUD em: https://cashland-cdf0.onrender.com/

- **Criar meta:** `/tela-principal/criar-meta`.
- **Listar metas:** `/tela-principal/listar-metas`.
- **Consultar e editar meta:** `/tela-principal/editar-meta?id_meta=ID_DA_META`.
- **Listagem administrativa:** `/tela-admin/listar-metas`.
- **Edição administrativa:** `/tela-admin/editar-meta?id_meta=ID_DA_META&id_usuario=ID_DO_USUARIO`.
- **Exclusão:** disponível pelo menu contextual da linha, com confirmação.

| Operação              | Método | Endpoint                                     | Status esperado         |
| --------------------- | ------ | -------------------------------------------- | ----------------------- |
| Create                | POST   | `/usuario/criar-meta`                        | 201                     |
| Read                  | GET    | `/usuario/listar-metas`                      | 200; 404 sem resultados |
| Update                | PATCH  | `/usuario/editar-meta`                       | 200                     |
| Delete                | DELETE | `/usuario/deletar-meta/{id_meta}`            | 200                     |
| Read administrativo   | GET    | `/admin/listar-metas`                        | 200; 404 sem resultados |
| Update administrativo | PATCH  | `/admin/editar-meta`                         | 200                     |
| Delete administrativo | DELETE | `/admin/deletar-meta/{id_meta}/{id_usuario}` | 200                     |

A consulta de detalhes utiliza a listagem com o parâmetro `pesquisa` e seleciona o ID exato na tela de edição. O cadastro aceita `id_conta`, `nome`, `descricao`, `valor_meta` e `data_meta`. A edição recebe `id_meta` e os campos alterados; na administração recebe também `id_usuario`.

**Documentação da API:** `docs/api/swagger.json` — OpenAPI 3.0.

**Swagger UI:** https://cashland-cdf0.onrender.com/api-docs/

**DDL da RF-007:** `database/ddl/RF-007-Gerir_metas.sql`.

**Responsividade:** as páginas da RF-007 não possuem regras `@media` próprias. Os pontos de quebra são definidos no sistema de design compartilhado `src/rf-003-Cadastro_usuario/public/template.css` (barra lateral a partir de 1024 px; barra superior, gaveta e barra inferior abaixo de 1024 px; ajustes de conteúdo até 600 px) e montados por `menu-superior.js`. A suíte `npm run test:frontend` verifica as listagens de metas em 1280 × 900, 390 × 844 e 320 × 568.

---

## 5. Arquitetura

### Diagrama de arquitetura

```mermaid
flowchart TB
    subgraph Navegador
        U["HTML/CSS/JavaScript: área do usuário"]
        A["HTML/CSS/JavaScript: área administrativa"]
    end
    subgraph API["Node.js e Express"]
        M["JWT, perfil, Joi, rate limit e auditoria"]
        C["Rotas e controller de metas do usuário"]
        D["Rotas e controller de metas do administrador"]
    end
    B[("Supabase / PostgreSQL")]
    T["metas e contas_bancarias"]
    F["transacoes e recorrencias"]
    U -->|"HTTP e cookie de sessão"| M
    A -->|"HTTP e cookie de sessão"| M
    M --> C
    M --> D
    C -->|"Cliente Supabase"| B
    D -->|"Cliente Supabase"| B
    B --- T
    B --- F
```

### Componentes e padrão de design

- **Frontend:** HTML, CSS e JavaScript nativo, com páginas específicas para criação, listagem e edição.
- **Backend:** Node.js com Express, módulos ES, roteadores, controllers e middlewares compartilhados.
- **Banco de dados:** PostgreSQL no Supabase, acessado pelo backend por meio do cliente Supabase.
- **Padrão:** arquitetura em camadas, separando apresentação, roteamento/validação, processamento das operações e persistência. Essa separação permite reutilizar autenticação e validação sem concentrar toda a aplicação nas páginas HTML.

### Decisões arquiteturais

- **ADR-001 — Frontend com HTML/CSS/JavaScript:** manter o padrão das demais RFs e reutilizar template, menus, formulários e tratamento de resultados sem introduzir um framework adicional.
- **ADR-002 — Backend Node.js com Express:** centralizar o CRUD e as verificações de acesso, usando a estrutura existente de rotas, controllers e middlewares.
- **ADR-003 — PostgreSQL no Supabase:** reutilizar o banco online do projeto e relacionar metas com contas, transações e recorrências por chaves estrangeiras.
- **ADR-004 — Validação Joi por operação:** aplicar contratos diferentes a cadastro, edição parcial, consulta e exclusão, com mensagens associadas aos campos.
- **ADR-005 — Separação de rotas comuns e administrativas:** distinguir operações sobre dados próprios das operações que exigem perfil Admin e proprietário informado.
- **ADR-006 — Acesso ao banco pela chave de serviço, sem RLS:** o backend usa `SUPABASE_SECRET_KEY`, que ignora as políticas de Row Level Security. Decisão consciente: a chave existe somente no servidor (variável de ambiente, fora do Git), o navegador nunca acessa o Supabase diretamente e todo o controle de acesso é feito pelos middlewares e controllers (sessão, perfil e pertencimento). Consequências: não há políticas de RLS nas migrations, e a chave não deve ser exposta fora do servidor.

### Fluxo de dados

- O usuário preenche ou consulta os dados na interface.
- O frontend envia a solicitação HTTP com o cookie de sessão.
- O Express executa os middlewares de auditoria, frequência, autenticação, autorização aplicável e validação.
- O controller verifica o pertencimento e as regras da operação.
- O cliente Supabase executa a consulta ou alteração no PostgreSQL.
- O backend retorna o status HTTP e a resposta da operação.
- A interface atualiza o formulário ou a listagem e apresenta o resultado.

---

## 6. Segurança

### Controle 1 — Autenticação de sessão

- **Categoria OWASP:** A07:2021 — Identification and Authentication Failures.
- **Vulnerabilidade OWASP:** falhas de autenticação que permitam operações financeiras sem sessão válida.
- **Implementação:** JWT em cookie HttpOnly, verificado nas rotas privadas; cookie configurado com SameSite Strict e Secure em produção. A API recusa token ausente, inválido ou expirado.
- **Teste:** os cenários locais de autenticação da RF-007 verificaram HTTP 401 nas rotas sem sessão, sem consulta ao banco simulado. Os cenários administrativos verificaram também HTTP 403 para usuário comum.

### Controle 2 — Controle de acesso e prevenção de IDOR

- **Categoria OWASP:** A01:2021 — Broken Access Control.
- **Vulnerabilidade OWASP:** acesso indevido por troca de identificadores de meta, conta ou proprietário.
- **Implementação:** listagem comum limitada ao usuário autenticado; verificação do proprietário pela conta da meta; verificação de conta na criação/edição; exigência de perfil Admin e proprietário compatível nas alterações administrativas. As escritas de edição e exclusão, comuns e administrativas, filtram também pela conta verificada como do proprietário (`id_meta` e `id_conta`), de modo que a operação não atinge o registro se o vínculo mudar entre a verificação e a gravação.
- **Teste:** cenários locais de edição e exclusão com meta inexistente ou alheia retornaram HTTP 404 e preservaram os dados simulados. Cenários administrativos também recusaram proprietário ou conta incompatíveis.

### Controle 3 — Validação de entrada e proteção contra alteração de campos indevidos

- **Categoria OWASP:** A03:2021 — Injection (entrada não validada nos filtros e nos campos); complementada por A04:2021 — Insecure Design, para os campos que o cliente não pode alterar.
- **Vulnerabilidade OWASP:** entrada malformada e alteração não autorizada de propriedades enviadas pelo cliente.
- **Implementação:** schemas Joi validam campos, tipos, identificadores, datas e valores; campos desconhecidos são rejeitados. Status, valor atual e datas de controle não fazem parte dos campos aceitos na edição de metas. Os filtros da listagem são enviados como parâmetros do cliente Supabase (`in`, `eq`, `ilike`); a única string de filtro do PostgREST é montada apenas com dígitos validados por expressão regular, sem interpolar texto do usuário. A unicidade do nome é garantida no banco pelo trigger, e o erro 23505 é convertido em HTTP 409.
- **Teste:** os cenários locais de validação da RF-007 recusaram campos obrigatórios ausentes, IDs inválidos, valor objetivo inválido, datas inexistentes e campos não autorizados com HTTP 400. Os testes de nome verificaram HTTP 409 para duplicidade e permitiram manter o nome da própria meta.

### Execução dos testes — evidência

- **Data:** 15/11/2026. **Ambiente:** Windows 11, Node.js v24.16.0, Python 3.14.6, Chrome headless; banco simulado nas suítes locais.
- `npm test`: 170 testes, 170 aprovados, 0 falhas. Inclui `tests/id-meta.test.js`, `tests/metas-nome.test.js`, `tests/consultas-idor.test.js` e `tests/id-meta-frontend.test.js`.
- `python tests/testar_rotas.py --testes-rf07`: 23 testes, OK. Cobre HTTP 401 sem sessão, 403 para usuário comum nas rotas administrativas, 404 para meta inexistente ou alheia, 400 de validação, 409 de duplicidade e o isolamento do proprietário na listagem.
- `python tests/testar_rotas.py --testes-admin-metas`: 8 testes, OK.
- `npm run test:frontend`: as páginas `listar-metas.html` e `ADMIN_listar-metas.html` foram aprovadas em 1280 × 900, 390 × 844 e 320 × 568.
- `npm run test:idor` (E2E contra um Supabase de testes): **não executado**. Exige `SUPABASE_TEST_URL` e `SUPABASE_TEST_SECRET_KEY`; sem essa configuração a suíte é pulada.
- Trigger `trigger_verificar_nome_meta_unico`: **não executado contra o banco real nesta sessão**; depende da aplicação da migration `supabase/migrations/20261115130000_rf007_nome_meta_unico.sql`.
