## 🎯 1. IDENTIFICAÇÃO DO REQUISITO

**ID:** RF-004  
**Título:** Gerenciamento de Contas Financeiras  
**Tipo:** Requisito Funcional  
**Prioridade:** ALTA (as contas financeiras representam as contas que o usuário poderá manter e administrar dentro do CashLand)  
**Complexidade:** ALTA — **29 story points**  
**Status:** Implementado  
**Data de Criação:** 05/10/2026  
**Última Atualização:** 06/10/2026

**Breve Descrição:**  
O sistema deve permitir que usuários autenticados criem, listem, pesquisem, editem, inativem e reativem suas próprias contas financeiras. Administradores podem listar e pesquisar contas de todos os usuários, editar, inativar, reativar e excluir permanentemente contas permitidas. A identificação do proprietário das operações comuns é obtida pela sessão autenticada, e as contas são persistidas na tabela `contas_bancarias`.

### Estimativa de complexidade — Story Points

A estimativa segue o mesmo modelo aditivo utilizado nas documentações atuais do projeto, atribuindo pontos às entregas funcionais completas da RF.

- Modelagem da tabela `contas_bancarias`, constraints e índices de integridade: **3 SP**.
- Criação de conta com validação, nome reservado, duplicidade e vínculo ao usuário autenticado: **3 SP**.
- Listagem e pesquisa das contas do próprio usuário por nome ou ID: **3 SP**.
- Edição da própria conta com validação, verificação de propriedade, duplicidade e proteção da conta `padrão`: **5 SP**.
- Inativação e reativação da própria conta com controle de estado e `data_inativacao`: **5 SP**.
- Listagem e pesquisa administrativa por conta e/ou usuário: **5 SP**.
- Edição, inativação, reativação e exclusão permanente no fluxo administrativo: **5 SP**.

**Cálculo:** `3 + 3 + 3 + 5 + 5 + 5 + 5 = 29 SP`

**Classificação:** ALTA, pois a RF envolve banco de dados, cinco telas, dez operações de API entre usuário e administrador, autenticação/autorização, regras de propriedade, transições de estado, auditoria, rate limit, validações e testes automatizados.

---

## 📋 2. DESCRIÇÃO E ATORES

### Descrição Detalhada

**Por que este requisito existe?**

O CashLand precisa permitir que cada usuário mantenha suas contas financeiras separadas e identificáveis. A RF-004 fornece a estrutura necessária para cadastrar e administrar essas contas sem permitir que um usuário comum manipule registros pertencentes a outro usuário.

A funcionalidade contempla:

- criação de contas financeiras;
- listagem das contas pertencentes ao usuário autenticado;
- pesquisa por nome ou ID;
- alteração dos dados editáveis da conta;
- inativação sem apagar o registro;
- reativação de contas inativas;
- gerenciamento administrativo das contas de usuários;
- exclusão permanente disponível apenas no fluxo administrativo;
- proteção da conta de nome reservado `padrão`;
- validação dos dados de entrada;
- auditoria e limitação de requisições.

**Contexto do Negócio:**

Cada registro em `contas_bancarias` pertence a um usuário por meio de `id_usuario`. No fluxo comum, esse vínculo não é informado livremente pelo frontend: o backend utiliza `req.usuario.id_usuario`, obtido da sessão autenticada. Isso mantém a conta associada ao usuário que realizou a operação e impede que um identificador de outro usuário seja usado diretamente nas operações comuns.

O administrador possui operações próprias, protegidas por autenticação e pelo middleware `somenteAdmin`, nas quais `id_usuario` é informado para identificar o proprietário da conta que será administrada.

---

### Atores do Sistema

#### Usuário autenticado

- **Papel:** Gerenciar suas próprias contas financeiras.
- **Responsabilidade:**
  - Informar nome e tipo válidos ao criar ou editar uma conta.
  - Informar instituição e código da conta quando aplicável.
  - Pesquisar e selecionar somente contas disponibilizadas pelo próprio sistema.
  - Confirmar as operações de inativação ou reativação na interface.
- **Permissões:**
  - ✅ CREATE de conta própria.
  - ✅ READ de contas próprias.
  - ✅ UPDATE de contas próprias permitidas.
  - ✅ UPDATE de `status_conta` por meio de inativação/reativação.
  - ❌ DELETE permanente.
  - ❌ Acesso administrativo.

#### Administrador

- **Papel:** Gerenciar contas financeiras dos usuários cadastrados.
- **Responsabilidade:**
  - Consultar contas globalmente ou por usuário.
  - Pesquisar por nome ou ID de conta.
  - Editar dados permitidos.
  - Inativar e reativar contas.
  - Excluir permanentemente contas permitidas.
- **Permissões:**
  - ❌ CREATE administrativo — não existe rota administrativa de criação nesta RF.
  - ✅ READ administrativo.
  - ✅ UPDATE administrativo.
  - ✅ DELETE permanente, exceto para a conta protegida `padrão`.

#### Sistema CashLand (ator automático)

- **Papel:** Aplicar autenticação, autorização, validação, regras de negócio, persistência e auditoria.
- **Responsabilidade:**
  - Validar o JWT recebido no cookie `token`.
  - Identificar o usuário autenticado.
  - Impedir acesso administrativo por usuários comuns.
  - Validar dados com Joi.
  - Restringir operações comuns ao `id_usuario` da sessão.
  - Aplicar rate limit.
  - Consultar e modificar `contas_bancarias` no Supabase.
  - Registrar eventos de auditoria.

#### Supabase / PostgreSQL

- **Papel:** Persistir as contas financeiras e aplicar restrições estruturais.
- **Responsabilidade:**
  - Gerar `id_conta`.
  - Manter a FK de `id_usuario` para `usuarios`.
  - Validar `status_conta` e `tipo_conta` por constraints.
  - Garantir unicidade do nome da conta por usuário com índice case-insensitive.
  - Garantir no máximo uma conta de nome `padrão` por usuário.

---

## 🔄 3. ESPECIFICAÇÃO DE CASOS DE USO + REQUISITOS NÃO-FUNCIONAIS

### Pré-Condições

#### Operações de usuário

- ✅ Usuário cadastrado e com sessão válida.
- ✅ Cookie `token` disponível para o backend.
- ✅ Backend Express em funcionamento.
- ✅ Banco Supabase/PostgreSQL disponível.
- ✅ Tabela `contas_bancarias` criada.
- ✅ Registro do usuário existente na tabela `usuarios`.

#### Operações administrativas

- ✅ Todas as pré-condições de acesso ao sistema.
- ✅ JWT válido com `tipo: 'Admin'`.
- ✅ Conta e usuário alvo identificados quando a operação exigir ambos.

---

### Pós-Condições (Sucesso)

#### Criação

- ✅ Uma nova linha é criada em `contas_bancarias`.
- ✅ `id_usuario` é preenchido com o usuário autenticado.
- ✅ `id_conta` é gerado pelo banco.
- ✅ `data_criacao` utiliza o valor padrão `now()` do banco.
- ✅ `status_conta` inicia como `Ativo` pelo valor padrão da tabela.

#### Listagem e pesquisa

- ✅ O usuário comum recebe somente registros vinculados ao próprio `id_usuario`.
- ✅ A pesquisa pode utilizar parte de `nome_conta`.
- ✅ Se o termo for numérico, também pode ser comparado ao `id_conta`.
- ✅ Uma listagem sem resultados pode retornar um array vazio.

#### Edição

- ✅ Somente `nome_conta`, `tipo_conta`, `codigo_conta` e `nome_instituicao` são enviados como dados editáveis da conta.
- ✅ A operação comum confirma que a conta pertence ao usuário da sessão.
- ✅ O registro continua com o mesmo `id_conta` e `id_usuario`.

#### Inativação

- ✅ `status_conta` passa para `Inativo`.
- ✅ `data_inativacao` recebe data/hora ISO gerada pelo backend.
- ✅ O registro permanece no banco.

#### Reativação

- ✅ `status_conta` passa para `Ativo`.
- ✅ `data_inativacao` volta para `null`.

#### Exclusão administrativa

- ✅ A conta permitida é removida permanentemente da tabela.
- ✅ A exclusão utiliza simultaneamente `id_conta` e `id_usuario`.

---

### Pós-Condições (Falha)

- ✅ Requisição sem sessão válida recebe HTTP `401`.
- ✅ Usuário comum tentando utilizar rota administrativa recebe HTTP `403`.
- ✅ Dados rejeitados pelo Joi recebem HTTP `400` com `mensagem: "Dados inválidos."` e array `erros`.
- ✅ Conta inexistente ou fora do escopo do usuário comum pode receber HTTP `404`.
- ✅ Nome reservado ou nome já utilizado pode receber HTTP `409`.
- ✅ Tentativa de editar, inativar ou excluir a conta protegida `padrão` é recusada nas operações correspondentes.
- ✅ Inativar conta já inativa ou reativar conta já ativa retorna HTTP `409`.
- ✅ Falhas do banco retornam HTTP `500` nas operações implementadas.
- ✅ Ao exceder o rate limit, a requisição retorna HTTP `429`.

---

### Fluxo Principal — Criar conta financeira

1. Usuário autenticado acessa `/tela-principal/criar-conta`.
2. A página executa `protegerPagina()` antes de habilitar o envio.
3. Usuário informa `nome_conta`.
4. Usuário seleciona `tipo_conta`.
5. Usuário pode informar `nome_instituicao`.
6. Usuário pode informar `codigo_conta`.
7. Ao enviar, o frontend utiliza `POST /usuario/criar-conta` com `credentials: 'include'`.
8. O middleware de rate limit simples controla a frequência da operação.
9. `autenticar` valida o cookie e define `req.usuario`.
10. `validar(schemaCriarConta)` valida os campos recebidos.
11. O controller rejeita `nome_conta` igual a `padrão`, ignorando espaços externos e diferenças de maiúsculas/minúsculas.
12. O backend consulta se já existe uma conta com o mesmo nome para o usuário autenticado.
13. Sem conflito, executa `INSERT` em `contas_bancarias` utilizando `req.usuario.id_usuario`.
14. O backend retorna HTTP `200` com `Conta criada com sucesso`.
15. O frontend limpa o formulário e exibe o resultado no overlay.

---

### Fluxo Principal — Listar e pesquisar contas do usuário

1. Usuário acessa `/tela-principal/listar-contas`.
2. A interface executa `protegerPagina()` e carrega o nome do usuário.
3. A página envia `GET /usuario/listar-contas`.
4. Sem `pesquisa`, o backend seleciona os campos da conta filtrando por `req.usuario.id_usuario`.
5. O retorno contém `id_conta`, `nome_conta`, `codigo_conta`, `tipo_conta`, `nome_instituicao`, `status_conta` e `data_inativacao`.
6. O frontend monta a tabela com ID, Nome, Código, Tipo, Instituição, Status e Opções.
7. Cada linha recebe o botão `Ver`.
8. O botão `Ver` abre `/tela-principal/editar-conta?id=<id_conta>`.
9. Se o usuário preencher a pesquisa, o frontend envia `?pesquisa=<valor>`.
10. O backend aplica `ilike` em `nome_conta`.
11. Se o valor for numérico, o backend também compara com `id_conta` e confirma que esse ID pertence ao usuário autenticado.
12. O frontend renderiza os registros recebidos ou a mensagem `Nenhuma conta encontrada.` para array vazio.

---

### Fluxo Principal — Editar conta do usuário

1. Usuário seleciona `Ver` na listagem.
2. A página `/tela-principal/editar-conta` recebe o ID pela query string.
3. A página valida se o ID recebido é inteiro e não negativo.
4. `protegerPagina()` confirma a sessão.
5. O frontend carrega `/usuario/listar-contas` e localiza a conta pelo `id_conta` recebido.
6. A tela mostra `id_conta`, `status_conta` e `data_inativacao` como campos desabilitados.
7. `nome_conta`, `tipo_conta`, `nome_instituicao` e `codigo_conta` permanecem editáveis.
8. Ao salvar, o frontend envia `PATCH /usuario/editar-conta`.
9. O backend valida o corpo com `schemaCriarConta` e `schemaIdContaObrigatorio`.
10. O controller confirma `id_conta` + `req.usuario.id_usuario`.
11. A conta `padrão` não pode ser editada.
12. O backend verifica se outra conta do mesmo usuário já utiliza o novo nome.
13. O `UPDATE` também utiliza `id_conta` e `id_usuario` como filtros.
14. Em sucesso, o backend chama `confirmarAlteracao` para registrar a confirmação na auditoria.
15. O frontend apresenta a mensagem `Conta editada com sucesso`.

---

### Fluxo Principal — Inativar e reativar conta do usuário

1. A tela de edição identifica o `status_conta` atual.
2. Conta ativa exibe o botão `Inativar conta`.
3. Conta inativa exibe o botão `Reativar conta`.
4. Ao clicar, a interface abre um overlay de confirmação.
5. Para inativação, envia `PATCH /usuario/inativar-conta` com `id_conta`.
6. Para reativação, envia `PATCH /usuario/reativar-conta` com `id_conta`.
7. As duas rotas usam o limitador genérico crítico.
8. O backend valida o ID e confirma a propriedade da conta pela sessão.
9. Na inativação, a conta `padrão` é recusada.
10. Inativação atualiza somente `status_conta: 'Inativo'` e `data_inativacao`.
11. Reativação atualiza somente `status_conta: 'Ativo'` e `data_inativacao: null`.
12. A página recarrega os dados de estado após resposta HTTP `200` ou `409`.
13. O botão é atualizado conforme o novo estado da conta.

---

### Fluxo — Listagem e pesquisa administrativa

1. Administrador acessa `/tela-admin/listar-contas`.
2. A página executa `protegerPagina('Admin')`.
3. A tela disponibiliza os filtros `pesquisa` e `id_usuario`.
4. Sem filtros, `GET /admin/listar-contas` consulta as contas de todos os usuários.
5. Com `id_usuario`, a consulta restringe os registros ao usuário indicado.
6. Com `pesquisa`, o backend pesquisa por parte do nome da conta e, para valores numéricos, também por `id_conta`.
7. A resposta administrativa utiliza relacionamento `usuarios!inner(nome)`.
8. A tabela mostra ID, Nome, Código, Tipo, Instituição, Status, ID usuário, Usuário e Opções.
9. Cada registro possui os botões `Editar` e `Excluir`.
10. `Editar` abre `/tela-admin/editar-conta?id_conta=<id>&id_usuario=<id_usuario>`.
11. `Excluir` abre uma confirmação antes da chamada de exclusão.

---

### Fluxo — Edição administrativa

1. A tela recebe `id_conta` e `id_usuario` pela URL.
2. Os dois identificadores são validados no frontend como inteiros não negativos.
3. A página consulta `GET /admin/listar-contas?id_usuario=<id>`.
4. O frontend localiza o registro correspondente a `id_conta` e `id_usuario`.
5. A tela mostra dados da conta e do proprietário.
6. São exibidos `id_conta`, `nome_conta`, `status_conta`, `tipo_conta`, `nome_instituicao`, `codigo_conta`, `id_usuario`, nome do usuário, `data_criacao` e `data_inativacao`.
7. Somente nome, tipo, instituição e código são editáveis.
8. Ao salvar, o frontend envia `PATCH /admin/editar-conta`.
9. A rota exige `autenticar`, `somenteAdmin` e valida os dados da conta, `id_conta` e `id_usuario`.
10. O controller confirma que a conta pertence ao usuário informado.
11. A conta `padrão` não pode ser editada.
12. O backend verifica duplicidade de nome no mesmo usuário.
13. Em sucesso, retorna HTTP `200` com `Conta editada com sucesso`.

---

### Fluxo — Inativação e reativação administrativa

1. Administrador abre a edição de uma conta.
2. O botão indica `Inativar conta` ou `Reativar conta` conforme o estado atual.
3. A ação é confirmada em overlay.
4. O frontend envia `id_conta` e `id_usuario`.
5. As rotas exigem autenticação, `somenteAdmin`, validação dos dois IDs e rate limit crítico.
6. Na inativação, a conta `padrão` não pode ser inativada.
7. Conta já inativa retorna HTTP `409` para nova inativação.
8. Conta já ativa retorna HTTP `409` para nova reativação.
9. Inativação grava `status_conta: 'Inativo'` e data atual.
10. Reativação grava `status_conta: 'Ativo'` e `data_inativacao: null`.

---

### Fluxo — Exclusão administrativa

1. Administrador seleciona `Excluir` na tabela.
2. A interface informa nome, ID da conta e ID do usuário.
3. O overlay apresenta o aviso `Essa ação não poderá ser desfeita`.
4. Ao confirmar, o frontend envia `DELETE /admin/deletar-conta/:id_conta/:id_usuario`.
5. A rota utiliza rate limit crítico, autenticação, autorização administrativa e validação dos identificadores.
6. O backend consulta a conta por `id_conta` e `id_usuario`.
7. Conta inexistente retorna HTTP `404`.
8. Conta `padrão` retorna HTTP `400` e não é excluída.
9. Para uma conta permitida, o backend executa `DELETE` com os dois identificadores.
10. Em sucesso, retorna HTTP `200` e a listagem é carregada novamente pelo frontend.

---

### Fluxo Alternativo A1: Dados inválidos

```text
1a.1. O middleware Joi recebe body, query ou params da rota.
1a.2. A validação usa abortEarly: false e allowUnknown: false.
1a.3. Campo ausente, tipo inválido, ID não inteiro, valor negativo ou propriedade não permitida é rejeitado.
1a.4. Backend retorna HTTP 400.
1a.5. Resposta contém "Dados inválidos." e o array "erros".
1a.6. Quando possível, o frontend associa cada mensagem ao campo correspondente.
```

---

### Fluxo Alternativo A2: Nome reservado `padrão`

```text
2a.1. Usuário ou administrador tenta criar/renomear uma conta para "padrão".
2a.2. Backend normaliza o valor com trim().toLowerCase().
2a.3. Operação retorna HTTP 409 antes da escrita.
2a.4. Uma conta existente com nome "padrão" também não pode ser editada.
2a.5. A inativação e a exclusão da conta protegida são recusadas.
```

---

### Fluxo Alternativo A3: Nome duplicado

```text
3a.1. O backend verifica outra conta do mesmo usuário com o nome informado.
3a.2. Em edição, a própria conta é excluída da busca com neq(id_conta, ...).
3a.3. Se houver outra conta, retorna HTTP 409.
3a.4. O banco também possui índice único por id_usuario + lower(nome_conta).
3a.5. Nenhuma alteração válida é aplicada quando a duplicidade é detectada.
```

---

### Fluxo Alternativo A4: Conta inexistente ou fora do proprietário

```text
4a.1. Operação comum consulta id_conta junto com req.usuario.id_usuario.
4a.2. Se nenhum registro corresponder, a conta não é disponibilizada para escrita.
4a.3. Backend retorna HTTP 404 nas operações implementadas para esse caso.
4a.4. Nenhum UPDATE é executado.
```

---

### Fluxo Alternativo A5: Estado já aplicado

```text
5a.1. Usuário solicita inativação de uma conta já Inativa
      OU solicita reativação de uma conta já Ativa.
5a.2. Backend detecta o status atual antes do UPDATE.
5a.3. Retorna HTTP 409.
5a.4. Nenhuma escrita é executada e a data existente não é alterada.
```

---

### Fluxo Alternativo A6: Sessão ausente ou inválida

```text
6a.1. A rota recebe a requisição sem cookie token ou com JWT inválido/expirado.
6a.2. autenticar impede o controller de continuar.
6a.3. Sem token: HTTP 401 - "Não autenticado".
6a.4. Token inválido/expirado: HTTP 401 - "Token inválido ou expirado".
6a.5. A interface direciona o retorno para /login quando aplicável.
```

---

### Fluxo Alternativo A7: Usuário comum tenta rota administrativa

```text
7a.1. JWT válido identifica tipo diferente de Admin.
7a.2. somenteAdmin interrompe a execução antes do controller.
7a.3. Backend retorna HTTP 403 com "Acesso restrito a administradores".
7a.4. A operação de banco não é executada.
```

---

### Fluxo Alternativo A8: Rate limit excedido

```text
8a.1. Rotas simples da RF004 usam limitadorGenericoSimples.
8a.2. São permitidas 60 requisições por IP em uma janela de 5 minutos.
8a.3. Operações críticas usam limitadorGenericoCritico.
8a.4. São permitidas 5 requisições por IP em uma janela de 15 minutos.
8a.5. Ao ultrapassar o limite, o servidor retorna HTTP 429.
8a.6. Um evento de segurança RATE_LIMIT_EXCEDIDO é enviado ao logger.
8a.7. O contexto da auditoria recebe o motivo referente ao limitador excedido.
```

---

### Fluxo Alternativo A9: Falha no Supabase

```text
9a.1. O Supabase retorna error durante uma consulta ou escrita.
9a.2. O controller interrompe o fluxo correspondente.
9a.3. Backend retorna HTTP 500 com mensagem de erro da operação.
9a.4. A resposta de sucesso não é enviada.
9a.5. Nos controllers de usuário que exigem confirmação de escrita,
      ausência do registro atualizado também impede falso sucesso.
```

---

### Regras de Negócio (RN)

| ID | Regra | Descrição |
| --- | --- | --- |
| **RN-01** | Propriedade por sessão | Operações comuns usam `req.usuario.id_usuario` como proprietário; o frontend não escolhe o proprietário da conta. |
| **RN-02** | Nome da conta obrigatório | `nome_conta` deve ter de 2 a 100 caracteres após `trim()`. |
| **RN-03** | Tipo obrigatório | `tipo_conta` deve ser `Corrente`, `Poupança`, `Salario`, `Conjunta`, `Internacional` ou `Credito`. |
| **RN-04** | Código opcional | `codigo_conta` pode ser omitido ou `null`; quando informado, deve ser inteiro maior ou igual a zero. |
| **RN-05** | Instituição opcional | `nome_instituicao` pode ser omitido, vazio ou `null`; quando preenchido, deve possuir de 2 a 100 caracteres. |
| **RN-06** | Nome reservado | O valor `padrão` é reservado pelo sistema e não pode ser utilizado na criação ou renomeação normal. |
| **RN-07** | Proteção da conta padrão | Conta existente com `nome_conta = 'padrão'` não pode ser editada ou inativada pelas operações correspondentes e não pode ser excluída pelo administrador. |
| **RN-08** | Unicidade do nome | O banco possui índice único em `(id_usuario, lower(nome_conta))`, impedindo dois nomes equivalentes para o mesmo usuário. |
| **RN-09** | Uma conta padrão por usuário | O índice parcial `uq_conta_padrao_usuario` permite no máximo uma linha com nome `padrão` por usuário. |
| **RN-10** | Situação da conta | `status_conta` aceita somente `Ativo` ou `Inativo`. |
| **RN-11** | Inativação preserva dados | Inativar é uma atualização de status; o registro não é removido. |
| **RN-12** | Data de inativação | Inativar preenche `data_inativacao`; reativar define `data_inativacao` como `null`. |
| **RN-13** | Exclusão permanente administrativa | Usuário comum não possui rota de DELETE de conta. Exclusão permanente está disponível somente em `/admin/deletar-conta/:id_conta/:id_usuario`. |
| **RN-14** | Administração protegida | Toda rota administrativa da RF004 exige `autenticar` e `somenteAdmin`. |
| **RN-15** | Validação fechada | `validar(...)` usa `allowUnknown: false`, rejeitando campos não previstos nos schemas aplicados. |
| **RN-16** | FK de usuário | `id_usuario` referencia `usuarios(id_usuario)` com `ON DELETE CASCADE`. |
| **RN-17** | Auditoria | Todas as rotas da RF004 são envolvidas por `auditar(...)`; as alterações de usuário confirmadas utilizam `confirmarAlteracao`. |
| **RN-18** | Limitação de frequência | Operações simples usam 60 requisições/5 minutos; operações críticas usam 5/15 minutos por IP. |

---

### Requisitos Não-Funcionais (RNF)

| ID | Atributo | Requisito | Métrica/Verificação | Justificativa |
| --- | --- | --- | --- | --- |
| **RNF-01** | Segurança de acesso | Operações comuns devem exigir sessão válida e restringir dados ao proprietário autenticado | Filtros por `req.usuario.id_usuario` + testes de propriedade | Evitar acesso a contas de outro usuário |
| **RNF-02** | Autorização | Operações administrativas devem exigir perfil `Admin` | Middleware `somenteAdmin`; HTTP 403 para usuário comum | Restringir operações globais e exclusão permanente |
| **RNF-03** | Validação | Dados estruturados devem ser validados no backend antes do controller | Joi + `allowUnknown: false`; HTTP 400 | Impedir dados fora das regras esperadas |
| **RNF-04** | Integridade | Tipos, status, FK e nomes duplicados devem possuir proteção no banco | Constraints e índices de `contas_bancarias` | Manter consistência mesmo diante de falhas na camada de aplicação |
| **RNF-05** | Controle de abuso | Rotas devem limitar frequência de chamadas por IP | 60/5 min nas simples e 5/15 min nas críticas; HTTP 429 | Reduzir automação abusiva e repetição de ações sensíveis |
| **RNF-06** | Auditabilidade | Ações da RF devem gerar trilha de auditoria | Middleware `auditar` e eventos de segurança | Permitir rastreamento de tentativas e resultados |
| **RNF-07** | Usabilidade | Interfaces devem apresentar loading, erros, confirmação e resultado | Overlays, mensagens por campo e diálogos de confirmação | Informar o estado da operação ao usuário |
| **RNF-08** | Responsividade | Telas devem se adaptar a larguras menores | Regras `@media (max-width: 600px)` e tabelas com rolagem horizontal | Permitir uso em telas menores sem remover dados |
| **RNF-09** | Tratamento de falhas | Erros de banco não devem ser apresentados como sucesso | HTTP 500 e testes de falha em cada etapa | Evitar confirmação incorreta de persistência |

---

## 🎨 4. PROTÓTIPO FUNCIONAL — MOCKUPS DAS TELAS

Os mockups abaixo representam as telas implementadas em `src/rf-004-Gerir_contas_financeiras/public` e os estados visuais utilizados pela RF004.

### Estilo visual implementado

As cinco telas utilizam `/template.css`, compartilhado com outras RFs do CashLand.

Características atuais:

- fonte Arial;
- fundo principal `#cadaf2`;
- superfícies brancas;
- cartões com raio de `12px` e sombra;
- campos com borda cinza e raio de `8px`;
- cor de sucesso `#277335`;
- cor de erro `#a00202`;
- overlays com fundo preto a 50% de opacidade;
- caixas de overlay com até `400px` de largura;
- tabelas com rolagem horizontal quando necessário;
- linhas da tabela destacadas ao passar o mouse;
- botão de exclusão/inativação com fundo avermelhado;
- em telas de até `600px`, padding e disposição dos elementos são reduzidos/reorganizados.

---

### Mockup - Tela 1: Listagem das contas do usuário

```text
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CashLand     Gerir categorias | Gerir contas financeiras                  João...  [perfil] [Sair]  │
├──────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Minhas contas financeiras                                                                          │
│                                                                                                      │
│ Nome ou id da conta: [Conta corrente ou 3________________] [Pesquisar] [Criar conta]               │
├──────┬────────────────┬────────┬───────────────┬────────────────┬──────────┬───────────────┤
│ ID   │ Nome           │ Código │ Tipo          │ Instituição    │ Status   │ Opções        │
├──────┼────────────────┼────────┼───────────────┼────────────────┼──────────┼───────────────┤
│ 3    │ Conta principal│ ---    │ Corrente      │ Banco Teste    │ Ativo    │ [ Ver ]       │
│ 8    │ PayPal         │ ---    │ Credito       │ PayPal         │ Inativo  │ [ Ver ]       │
└──────┴────────────────┴────────┴───────────────┴────────────────┴──────────┴───────────────┘
```

A tela corresponde a `listar-contas.html`. A pesquisa é opcional. O botão `Criar conta` abre `/tela-principal/criar-conta`; `Ver` abre a tela de edição com o ID da conta.

---

### Mockup - Tela 2: Listagem sem resultados

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│ Minhas contas financeiras                                                   │
│                                                                              │
│ Nome ou id da conta: [conta inexistente____________] [Pesquisar] [Criar conta]│
├──────┬──────────┬────────┬────────┬────────────┬────────┬─────────┤
│ ID   │ Nome     │ Código │ Tipo   │ Instituição│ Status │ Opções  │
├──────┴──────────┴────────┴────────┴────────────┴────────┴─────────┤
│                    Nenhuma conta encontrada.                     │
└───────────────────────────────────────────────────────────────────┘
```

Quando o backend retorna um array vazio, a tabela cria uma única linha com `Nenhuma conta encontrada.`.

---

### Mockup - Tela 3: Criar conta

```text
┌───────────────────────────────────────────────────────┐
│ Criar conta                                  [Voltar] │
│                                                       │
│ Nome da conta:                                       │
│ [Conta principal___________________________________] │
│                                                       │
│ Tipo da conta:                                       │
│ [Corrente                                         ▾] │
│                                                       │
│ Instituição (opcional):                              │
│ [Banco Teste_______________________________________] │
│                                                       │
│ Código da conta (opcional):                          │
│ [123_______________________________________________] │
│                                                       │
│                    [ Criar conta ]                   │
└───────────────────────────────────────────────────────┘
```

A tela utiliza somente os campos existentes no fluxo de criação: `nome_conta`, `tipo_conta`, `nome_instituicao` e `codigo_conta`.

---

### Mockup - Tela 4: Erros de validação na criação/edição

```text
┌───────────────────────────────────────────────────────┐
│ Criar conta                                  [Voltar] │
│                                                       │
│ Nome da conta:                                       │
│ [_]                                                   │
│ O nome da conta deve possuir pelo menos 2 caracteres.│
│                                                       │
│ Tipo da conta:                                       │
│ [Selecione o tipo da conta                        ▾] │
│ O tipo da conta deve ser: Corrente, Poupança,        │
│ Salario, Conjunta, Internacional ou Credito.         │
│                                                       │
│ Código da conta (opcional): [-1]                     │
│ O código da conta não pode ser negativo.             │
└───────────────────────────────────────────────────────┘
```

O frontend utiliza `MostrarErro(...)` para apresentar os itens do array `erros` retornado pelo Joi.

---

### Mockup - Tela 5: Editar conta do usuário

```text
┌───────────────────────────────────────────────────────┐
│ Editar conta                                 [Voltar] │
│                                                       │
│ ID da Conta                                           │
│ [12]                          (desabilitado)           │
│                                                       │
│ Status da conta                                       │
│ [Ativo]                       (desabilitado)           │
│                                                       │
│ Nome da conta                                         │
│ [PayPal____________________________________________] │
│                                                       │
│ Tipo da conta                                         │
│ [Credito                                           ▾]│
│                                                       │
│ Instituição (opcional)                                │
│ [PayPal____________________________________________] │
│                                                       │
│ Código da conta (opcional)                            │
│ [__________________________________________________] │
│                                                       │
│ Data de inativação                                    │
│ [---]                         (desabilitado)           │
│                                                       │
│       [ Salvar Alterações ] [ Inativar conta ]       │
└───────────────────────────────────────────────────────┘
```

Uma conta inativa muda o texto do segundo botão para `Reativar conta`.

---

### Mockup - Tela 6: Confirmação de inativação/reativação

```text
┌──────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                               │
│                                                          │
│        ┌──────────────────────────────────────┐          │
│        │            Inativar conta            │          │
│        │                                      │          │
│        │ Tem certeza que deseja inativar      │          │
│        │ esta conta?                          │          │
│        │                                      │          │
│        │ [ Inativar conta ] [ Cancelar ]      │          │
│        └──────────────────────────────────────┘          │
└──────────────────────────────────────────────────────────┘
```

Para contas inativas, o mesmo diálogo utiliza o texto de reativação.

---

### Mockup - Tela 7: Listagem administrativa

```text
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ CashLand   Gerir usuários | Gerir categorias | Gerir contas financeiras         Admin... [perfil] [Sair] │
├────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Contas financeiras                                                                                         │
│                                                                                                            │
│ ID da conta ou nome: [Todas as contas________]  ID do usuário: [Todos os usuários____] [Pesquisar]        │
├────┬───────────┬───────┬──────────┬────────────┬────────┬────────────┬────────────┬───────────────────────┤
│ ID │ Nome      │ Código│ Tipo     │ Instituição│ Status │ ID usuário │ Usuário    │ Opções                │
├────┼───────────┼───────┼──────────┼────────────┼────────┼────────────┼────────────┼───────────────────────┤
│ 12 │ PayPal    │ ---   │ Credito  │ PayPal     │ Ativo  │ 25         │ Daniel     │ [Editar] [Excluir]    │
└────┴───────────┴───────┴──────────┴────────────┴────────┴────────────┴────────────┴───────────────────────┘
```

A tela corresponde a `ADMIN_listar-contas.html` e combina filtros opcionais de conta e usuário.

---

### Mockup - Tela 8: Confirmação de exclusão administrativa

```text
┌────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                 │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Tem certeza que deseja excluir a conta "PayPal"     │  │
│  │ (ID 12) do usuário 25?                              │  │
│  │                                                      │  │
│  │ Essa ação não poderá ser desfeita                    │  │
│  │                                                      │  │
│  │             [ Continuar ] [ Cancelar ]               │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

O botão de confirmação executa a rota DELETE administrativa somente depois da confirmação visual.

---

### Mockup - Tela 9: Editar conta — administrador

```text
┌───────────────────────────────────────────────────────┐
│ Editar conta                                 [Voltar] │
│                                                       │
│ ID da Conta          [12]                (desabilitado)│
│ Nome da conta        [PayPal_______________________] │
│ Status da conta      [Ativo]             (desabilitado)│
│ Tipo da conta        [Credito                       ▾]│
│ Instituição          [PayPal_______________________] │
│ Código da conta      [_____________________________] │
│ ID do usuário        [25]                (desabilitado)│
│ Nome do usuário      [Daniel]            (desabilitado)│
│ Data de criação      [06/10/2026]        (desabilitado)│
│ Data de inativação   [---]               (desabilitado)│
│                                                       │
│       [ Salvar Alterações ] [ Inativar conta ]       │
└───────────────────────────────────────────────────────┘
```

Não existe campo de saldo ou qualquer outro dado financeiro adicional nessa tela.

---

### Mockup - Tela 10: Carregamento e resultado

```text
Carregamento
┌──────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                           │
│                                                      │
│        ┌────────────────────────────────────┐        │
│        │       Carregando...      ⟳         │        │
│        └────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘

Resultado
┌──────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                           │
│                                                      │
│        ┌────────────────────────────────────┐        │
│        │ Conta editada com sucesso          │        │
│        │                                    │        │
│        │           [ Continuar ]            │        │
│        └────────────────────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

Os overlays são reutilizados para loading, sucesso, erro e confirmações.

---

### Estados e navegação

| Situação | Apresentação | Ação seguinte |
| --- | --- | --- |
| Entrada na listagem | Overlay de carregamento e tabela | Carregar `/usuario/listar-contas` ou `/admin/listar-contas` |
| Lista vazia | Linha `Nenhuma conta encontrada.` | Alterar pesquisa ou criar conta no fluxo comum |
| Criação em andamento | Overlay `Carregando...` | Aguardar resposta da API |
| Erro de validação | Mensagem abaixo do campo | Corrigir e enviar novamente |
| Criação concluída | Overlay verde | Continuar e permanecer na tela |
| Edição carregada | Formulário preenchido | Alterar campos ou situação |
| Inativação/reativação | Overlay de confirmação | Confirmar ou cancelar |
| Exclusão administrativa | Confirmação vermelha + aviso irreversível | Confirmar ou cancelar |
| HTTP 401 | Overlay de erro | Retornar ao login |
| HTTP 429/500 | Overlay de erro | Encerrar mensagem e tentar novamente quando aplicável |

---

### Elementos e funções utilizados

- `protegerPagina()`: valida sessão nas telas comuns.
- `protegerPagina('Admin')`: valida sessão administrativa no frontend.
- `MostrarErro(id, mensagem)`: apresenta erros junto aos campos.
- `MostrarResultado_Overlay(...)` / `mostrarResultado(...)`: apresenta resultado ou confirmação.
- `loading-overlay`, `loading-box` e `spinning-wheel`: estado de carregamento.
- `renderizarTabela(...)`: cria as linhas das tabelas com `document.createElement`.
- `ver(id_conta)`: abre a edição da conta do usuário.
- `confirmarDelete(...)` e `excluirConta()`: controlam a exclusão administrativa.
- `carregarDadosConta(...)`: localiza e preenche a conta selecionada nas telas de edição.

---

### Responsividade

O CSS compartilhado possui `@media (max-width: 600px)` para reduzir paddings e reorganizar campos. As listagens utilizam contêiner com `overflow-x: auto`; a tabela comum possui largura mínima de `760px` e a tabela administrativa utiliza a classe `.tabela-admin` com largura mínima de `1000px`, preservando as colunas sem removê-las.

---

## 🏗️ 5. ARQUITETURA E ADR

### Diagrama de Componentes

```text
┌──────────────────────────────────────────────────────────────────┐
│                        Navegação Web                             │
│                   src/routes/pageRoutes.js                       │
│                                                                  │
│ /tela-principal/listar-contas                                   │
│ /tela-principal/criar-conta                                     │
│ /tela-principal/editar-conta                                    │
│ /tela-admin/listar-contas                                       │
│ /tela-admin/editar-conta                                        │
└──────────────────────────────┬───────────────────────────────────┘
                               │ sendFile
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Frontend RF-004                             │
│                                                                  │
│ listar-contas.html        criar-conta.html                       │
│ editar-conta.html         ADMIN_listar-contas.html               │
│ ADMIN_editar-conta.html                                          │
│                                                                  │
│ • HTML/CSS/JavaScript puro                                       │
│ • /template.css                                                  │
│ • /protecao.js                                                   │
│ • fetch + credentials: include                                   │
└──────────────────────────────┬───────────────────────────────────┘
                               │ JSON / cookie token
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                         Express 5                                │
│                         src/app.js                               │
│                                                                  │
│ /usuario  -> contasFinanceirasRoutes.js                          │
│ /admin    -> adminContasFinanceirasRoutes.js                     │
└──────────────────────────────┬───────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                      Middlewares                                 │
│                                                                  │
│ auditar(...)                                                     │
│ limitadorGenericoSimples / limitadorGenericoCritico              │
│ autenticar                                                       │
│ somenteAdmin (admin)                                             │
│ validar(...)                                                     │
└──────────────────────────────┬───────────────────────────────────┘
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                       Controllers                                │
│                                                                  │
│ contasFinanceirasController.js                                   │
│ adminContasFinanceirasController.js                              │
│                                                                  │
│ • CREATE / SELECT / UPDATE / DELETE                              │
│ • regras de conta padrão                                         │
│ • isolamento por usuário                                        │
│ • transição Ativo/Inativo                                       │
└──────────────────────────────┬───────────────────────────────────┘
                               │ @supabase/supabase-js
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Supabase / PostgreSQL                         │
│                                                                  │
│ contas_bancarias                                                 │
│ • id_conta (PK)                                                  │
│ • id_usuario (FK -> usuarios)                                    │
│ • tipo_conta                                                     │
│ • codigo_conta                                                   │
│ • nome_instituicao                                               │
│ • nome_conta                                                     │
│ • data_criacao                                                   │
│ • status_conta                                                   │
│ • data_inativacao                                                │
│                                                                  │
│ CHECK status / tipo                                              │
│ UNIQUE nome por usuário                                          │
│ UNIQUE parcial da conta padrão                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## ADR — Registro de Decisões de Arquitetura

### ADR-001: Tabela própria para contas financeiras

**Status:** ACEITO

**Contexto:** As contas precisam pertencer individualmente aos usuários e possuir dados próprios de identificação e situação.

**Decisão:** Utilizar `public.contas_bancarias` com PK `id_conta` e FK obrigatória `id_usuario` para `usuarios(id_usuario)`.

**Consequências:** Cada conta possui proprietário persistido e a remoção do usuário aplica `ON DELETE CASCADE` às contas relacionadas.

---

### ADR-002: Propriedade obtida da sessão nas operações comuns

**Status:** ACEITO

**Contexto:** Aceitar `id_usuario` enviado livremente pelo cliente permitiria tentativas de manipular contas pertencentes a outras pessoas.

**Decisão:** Nos controllers de usuário, utilizar `req.usuario.id_usuario` para criação, leitura e atualização.

**Consequências:** Mesmo que o cliente envie outro identificador em query não utilizada, o backend continua filtrando pelo usuário autenticado.

---

### ADR-003: Administração em rotas separadas

**Status:** ACEITO

**Contexto:** O administrador precisa gerenciar contas de outros usuários e realizar exclusão permanente.

**Decisão:** Separar as operações em `adminContasFinanceirasRoutes.js`, montado em `/admin`, com `autenticar` e `somenteAdmin`.

**Consequências:** Usuários comuns recebem HTTP `403` antes do controller administrativo.

---

### ADR-004: Inativação como soft-delete

**Status:** ACEITO

**Contexto:** A conta pode precisar deixar de ser utilizada sem que seu registro seja removido.

**Decisão:** Representar a situação por `status_conta` e `data_inativacao`.

**Consequências:** Inativar preserva a linha; reativar recupera o estado `Ativo` e limpa a data de inativação.

---

### ADR-005: Exclusão permanente somente no fluxo administrativo

**Status:** ACEITO

**Contexto:** A exclusão remove definitivamente a linha e possui impacto maior que a inativação.

**Decisão:** Não disponibilizar DELETE de conta para o usuário comum. Implementar `DELETE /admin/deletar-conta/:id_conta/:id_usuario` somente no conjunto administrativo.

**Consequências:** O fluxo normal usa inativação; a remoção física exige perfil administrativo e confirmação visual.

---

### ADR-006: Nome `padrão` reservado

**Status:** ACEITO

**Contexto:** O sistema utiliza o nome `padrão` como nome reservado de conta.

**Decisão:** Bloquear criação/renomeação para esse valor e impedir edição, inativação ou exclusão da conta protegida nas operações implementadas.

**Consequências:** A regra é aplicada no controller e complementada pelo índice parcial que permite no máximo uma conta `padrão` por usuário.

---

### ADR-007: Validação Joi no backend

**Status:** ACEITO

**Contexto:** O frontend não pode ser considerado uma fronteira confiável para validar os dados recebidos.

**Decisão:** Utilizar `schemaCriarConta`, `schemaIdContaObrigatorio`, `schemaIdUsuarioObrigatorio`, `schemaIdUsuarioOpcional` e `schemaPesquisa` conforme as rotas que os declaram.

**Consequências:** Dados inválidos recebem HTTP `400`; `allowUnknown: false` impede propriedades adicionais nos objetos validados.

---

### ADR-008: Integridade complementar no PostgreSQL

**Status:** ACEITO

**Contexto:** Regras essenciais também precisam existir abaixo da camada JavaScript.

**Decisão:** Criar constraints para `status_conta` e `tipo_conta`, FK para usuário e índices únicos para nomes.

**Consequências:** O banco rejeita estados, tipos e duplicidades incompatíveis com sua definição mesmo quando uma tentativa ultrapassa verificações preliminares da aplicação.

---

### ADR-009: Dois níveis de rate limit

**Status:** ACEITO

**Contexto:** Consultas e alterações comuns têm perfis de risco diferentes de inativação, reativação e exclusão.

**Decisão:** Utilizar:

- `limitadorGenericoSimples`: 60 requisições por IP a cada 5 minutos.
- `limitadorGenericoCritico`: 5 requisições por IP a cada 15 minutos.

**Consequências:** Operações sensíveis possuem uma janela mais restritiva; excesso recebe HTTP `429` e gera log de segurança.

---

### ADR-010: Auditoria por middleware

**Status:** ACEITO

**Contexto:** Operações sobre registros financeiros precisam permitir rastreabilidade das tentativas.

**Decisão:** Envolver todas as rotas RF004 com `auditar(...)` e utilizar `confirmarAlteracao` nas alterações de usuário em que a confirmação do registro atualizado é necessária.

**Consequências:** A auditoria registra ação, resultado, status HTTP, motivo e `request_id` conforme o fluxo do middleware.

---

### ADR-011: Navegação separada das rotas de API

**Status:** ACEITO

**Contexto:** As páginas HTML e as operações REST cumprem funções diferentes.

**Decisão:** Manter as rotas de navegação em `pageRoutes.js` e montar APIs de conta separadamente em `/usuario` e `/admin`.

**Consequências:** URLs como `/tela-principal/listar-contas` entregam HTML, enquanto `/usuario/listar-contas` retorna JSON.

---

### ADR-012: CSS e proteção de página compartilhados

**Status:** ACEITO

**Contexto:** As novas telas precisam manter consistência visual e reutilizar o mecanismo de sessão já adotado pelo sistema.

**Decisão:** Utilizar `/template.css` e `/protecao.js` nas cinco páginas RF004.

**Consequências:** As telas mantêm o mesmo cabeçalho, cartões, tabelas, overlays, responsividade e fluxo de proteção das RFs anteriores.

---

### Tecnologias Escolhidas

| Camada/Finalidade | Tecnologia / Serviço | Uso na RF004 |
| --- | --- | --- |
| Frontend | HTML5 | Cinco páginas da RF004 |
| Estilo | CSS3 / `template.css` | Layout, tabelas, cartões, overlays e responsividade |
| Frontend | JavaScript | `fetch`, renderização de tabelas, formulários, overlays e navegação |
| Backend | Node.js + Express 5 | Rotas, middlewares, controllers e entrega das páginas |
| Banco de dados | Supabase / PostgreSQL | Persistência de `contas_bancarias` |
| Cliente de banco | `@supabase/supabase-js` | SELECT, INSERT, UPDATE e DELETE |
| Validação | Joi | Validação de dados e IDs |
| Sessão | JWT em cookie | Identidade utilizada por `autenticar` |
| Controle de frequência | `express-rate-limit` | Limitadores simples e críticos |
| Auditoria / logs | Winston + middlewares de auditoria | Registro de ações, falhas e rate limits |
| Documentação de API | Swagger UI | Paths e schemas da RF004 em `/api-docs` |
| Testes HTTP | `node:test` + Supertest | Testes automatizados da API e middlewares |

---

### Fluxo de Dados — Usuário

1. Usuário abre uma rota `/tela-principal/...` da RF004.
2. Express entrega o HTML por `pageRoutes.js`.
3. `protecao.js` confirma a sessão antes de habilitar as ações.
4. A página executa `fetch` para `/usuario/...` com `credentials: 'include'`.
5. A requisição passa por auditoria e rate limit.
6. `autenticar` extrai e verifica o token do cookie.
7. Joi valida body/params nas rotas que utilizam `validar(...)`.
8. O controller utiliza `req.usuario.id_usuario` para limitar o escopo.
9. O cliente Supabase executa a operação em `contas_bancarias`.
10. O backend devolve JSON e status HTTP.
11. A interface atualiza tabela, campos ou overlay de resultado.

### Fluxo de Dados — Administrador

1. Administrador abre `/tela-admin/listar-contas` ou `/tela-admin/editar-conta`.
2. `protegerPagina('Admin')` valida o fluxo de interface.
3. O frontend envia requisições para `/admin/...`.
4. O backend aplica rate limit e autenticação.
5. `somenteAdmin` valida `req.usuario.tipo`.
6. Joi valida os identificadores e dados usados pela rota.
7. O controller utiliza `id_usuario` para identificar o proprietário administrado.
8. A consulta administrativa pode incluir `usuarios!inner(nome)`.
9. O Supabase executa leitura, atualização ou exclusão.
10. A interface mostra o resultado e recarrega o estado quando necessário.

---

## 🔒 6. VALIDAÇÃO DE SEGURANÇA OWASP

> Esta seção relaciona controles realmente implementados na RF004 com categorias do OWASP Top 10:2025. Ela não representa certificação formal de conformidade OWASP; documenta apenas controles e testes sustentados pelo código atual.

### A01:2025 — Broken Access Control / Controle de Acesso Quebrado

**Risco:** Um usuário poderia tentar informar o ID de outra pessoa ou de outra conta e ler/alterar registros que não lhe pertencem (IDOR/BOLA). Um usuário comum também poderia tentar chamar diretamente endpoints administrativos.

**Implementação no fluxo de usuário:**

As operações comuns usam o usuário da sessão:

```javascript
.eq('id_usuario', req.usuario.id_usuario)
```

A criação não utiliza um `id_usuario` vindo do cliente:

```javascript
.insert({
    nome_conta: nome_conta,
    id_usuario: req.usuario.id_usuario,
    tipo_conta: tipo_conta,
    codigo_conta: codigo_conta,
    nome_instituicao: nome_instituicao
})
```

Edição e alteração de status combinam o ID da conta com o proprietário:

```javascript
.eq('id_conta', id_conta)
.eq('id_usuario', req.usuario.id_usuario)
```

**Implementação administrativa:**

```javascript
router.patch(
    '/editar-conta',
    auditar('ADMIN_EDITAR_CONTA', req => req.usuario?.id_usuario, true),
    limitadorGenericoCritico,
    autenticar,
    somenteAdmin,
    validar(schemaCriarConta, schemaIdContaObrigatorio, schemaIdUsuarioObrigatorio),
    editarConta
);
```

**Testes automatizados existentes:**

```bash
node --test tests/contas-financeiras.test.js
```

Casos relevantes verificados pela suíte:

- criação ignora tentativa de fornecer outro `id_usuario` e usa o proprietário da sessão;
- listagem mantém filtro de proprietário;
- edição restringe leitura e escrita ao proprietário;
- inativação e reativação usam o proprietário da sessão;
- conta de outro usuário não é alterada;
- pesquisa numérica por ID de outro proprietário retorna `404`.

Também foi executado o teste direcionado das rotas protegidas e administrativas:

```bash
node --test --test-name-pattern='todas as rotas protegidas|usuário comum é bloqueado antes do controller' tests/app.test.js
```

**Resultado verificado em 06/10/2026:**

- RF004: **42/42 testes aprovados**.
- autenticação/autorização direcionada: **2/2 testes aprovados**.
- o teste administrativo confirma que um usuário `Comum` recebe HTTP `403` antes de qualquer acesso ao banco.

**Resultado:** controle implementado e coberto por testes relevantes para propriedade de registro e separação usuário/admin.

---

### A05:2025 — Injection / Injeção — validação das entradas estruturadas

**Risco:** Dados inesperados, tipos incorretos ou propriedades extras poderiam chegar aos controllers e alterar o formato das operações esperadas.

**Implementação:**

O middleware de validação aplica Joi com:

```javascript
const { error, value } = schemaFinal.validate(
    req[origem] ?? {},
    {
        abortEarly: false,
        allowUnknown: false
    }
);
```

Exemplos de restrições da RF004:

```javascript
nome_conta: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
```

```javascript
codigo_conta: Joi.number()
    .integer()
    .min(0)
    .allow(null)
    .optional()
```

```javascript
id_conta: Joi.number()
    .integer()
    .min(0)
    .required()
```

Os tipos de conta são limitados por `valid(...)` e novamente protegidos no banco por `CHECK`.

**Teste automatizado existente:**

A suíte RF004 envia, entre outros casos:

- `id_conta: 'invalido'`;
- ID decimal;
- ID negativo;
- `tipo_conta: 'Inexistente'`;
- `codigo_conta: -1`;
- propriedade extra `id_usuario` em operações de usuário;
- criação com body vazio.

O teste confirma HTTP `400`, existência do array `erros` e **zero chamadas ao Supabase** enquanto a entrada é inválida.

**Escopo documentado:** Esse controle está comprovado para os bodies e IDs cobertos pelos schemas aplicados. A rota comum `GET /usuario/listar-contas` não aplica `schemaPesquisa` no middleware, portanto esta documentação não afirma cobertura total de validação Joi sobre o texto livre de pesquisa dessa rota.

---

### A06:2025 — Insecure Design / Design Inseguro

**Risco:** Mesmo com autenticação, regras de negócio frágeis poderiam permitir estados inválidos, duplicidade ou remoção de uma conta protegida.

**Implementações de desenho defensivo:**

1. Nome `padrão` é reservado no controller.
2. Conta `padrão` não pode ser editada nem inativada nas operações correspondentes.
3. Exclusão administrativa da conta `padrão` é recusada.
4. Inativação é soft-delete.
5. Estado repetido é recusado antes de nova escrita.
6. O banco limita `status_conta` a `Ativo/Inativo`.
7. O banco limita `tipo_conta` aos seis valores implementados.
8. O banco possui unicidade case-insensitive do nome por usuário.
9. O banco possui FK para o usuário.
10. Operações críticas utilizam rate limit mais restritivo.

**Trechos do DDL:**

```sql
constraint fk_contas_bancarias_usuario
foreign key (id_usuario)
references usuarios (id_usuario)
on delete cascade
```

```sql
create unique index if not exists uq_conta_nome_usuario
on public.contas_bancarias (id_usuario, lower((nome_conta)::text));
```

```sql
create unique index if not exists uq_conta_padrao_usuario
on public.contas_bancarias (id_usuario)
where ((nome_conta)::text = 'padrão'::text);
```

**Testes automatizados existentes:**

- nome duplicado impede escrita;
- nome reservado impede acesso ao banco;
- conta padrão impede edição;
- conta padrão impede inativação;
- inativar conta já inativa retorna `409` sem escrita;
- reativar conta já ativa retorna `409` sem escrita;
- reativação limpa `data_inativacao`;
- inativação preserva o registro e altera apenas `status_conta` e `data_inativacao`.

**Teste de rate limit executado diretamente nas rotas RF004:**

- `/usuario/listar-contas`: a 61ª solicitação do mesmo IP retornou `429`, `X-RateLimit-Limit: 60`, `X-RateLimit-Remaining: 0` e `Retry-After: 300`.
- `/usuario/inativar-conta`: a 6ª solicitação do mesmo IP retornou `429`, `X-RateLimit-Limit: 5`, `X-RateLimit-Remaining: 0` e `Retry-After: 900`.

**Resultado:** existem controles de regras de negócio, integridade e limitação de frequência compatíveis com mitigação de desenho inseguro.

---

### A07:2025 — Authentication Failures / Falhas de Autenticação

**Risco:** Endpoints poderiam aceitar operações sem sessão válida ou permitir administração apenas por conhecer a URL.

**Implementação:**

Todas as rotas da RF004 utilizam `autenticar` antes do controller:

```javascript
export function autenticar(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({ mensagem: 'Não autenticado' });
    }
    try {
        req.usuario = verificarToken(token);
        next();
    } catch {
        return res.status(401).json({ mensagem: 'Token inválido ou expirado' });
    }
}
```

As rotas administrativas também utilizam:

```javascript
export function somenteAdmin(req, res, next) {
    if (req.usuario.tipo !== 'Admin') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores' });
    }
    next();
}
```

**Teste automatizado executado:**

- todas as rotas protegidas sem sessão retornam HTTP `401`;
- usuário comum em todas as rotas `/admin/...` retorna HTTP `403`;
- o teste confirma que o acesso ao Supabase não ocorre quando `somenteAdmin` bloqueia a chamada.

**Resultado:** a RF004 reutiliza o mecanismo de sessão do RF001 e aplica autenticação/autorização no backend, independentemente da proteção visual da página.

---

### A09:2025 — Security Logging & Alerting Failures / Falhas de Registro e Alerta de Segurança

**Risco:** Alterações financeiras e tentativas negadas poderiam ocorrer sem uma trilha que permita investigar o evento posteriormente.

**Implementação de registro:**

Todas as rotas RF004 possuem `auditar(...)`. O middleware registra o evento ao terminar a resposta e classifica resultados como sucesso, falha, negado ou erro conforme status/contexto.

O rate limit também registra evento de segurança:

```javascript
logger.warn('Rate limit excedido', {
    tipo_evento: 'SEGURANCA',
    evento: 'RATE_LIMIT_EXCEDIDO',
    limitador: nomeLimitador,
    request_id: res.locals.requestId,
    metodo: req.method,
    rota: obterRotaHTTP(req),
    status_http: 429
});
```

**Testes automatizados existentes:**

- edição do usuário confirma evento `USER_EDITAR_CONTA` com resultado `SUCESSO`;
- inativação confirma `USER_INATIVAR_CONTA` com sucesso;
- reativação confirma `USER_REATIVAR_CONTA` com sucesso;
- bloqueios administrativos são registrados como `NEGADO` no teste geral de rotas administrativas.

**Limite da implementação atual:** foi identificada implementação de **logging/auditoria**, porém não foi identificado na RF004 um mecanismo externo de alerta em tempo real ou encaminhamento para SOC. Portanto, a aderência documentada a A09 é parcial e limitada à geração de logs e trilha de auditoria.

---

### A10:2025 — Mishandling of Exceptional Conditions / Tratamento Incorreto de Condições Excepcionais

**Risco:** Uma falha no banco ou uma alteração concorrente poderia ser tratada como sucesso, levando a interface a acreditar que a operação foi concluída sem persistência real.

**Implementação:**

Os controllers verificam `error` retornado pelo Supabase e respondem HTTP `500` quando a operação falha.

Nas alterações comuns que precisam confirmar uma linha, o código também verifica a ausência do registro atualizado:

```javascript
if (erroEdita) {
    return res.status(500).json({
        mensagem: "Erro ao editar a conta, tente novamente mais tarde"
    });
} else if (!alterados) {
    return res.status(404).json({ mensagem: "Essa conta não existe" });
}
```

Somente depois disso a alteração é confirmada para auditoria:

```javascript
confirmarAlteracao(res, alterados);
```

**Testes automatizados existentes:**

A suíte RF004 injeta falhas simuladas em cada etapa de banco das operações:

- criar conta;
- listar contas;
- pesquisa por ID;
- editar conta;
- inativar conta;
- reativar conta.

Para cada etapa testada, a resposta esperada é HTTP `500`.

Também existem testes em que o registro desaparece antes da escrita. Nesses casos:

- resposta HTTP `404`;
- nenhum falso evento de auditoria `SUCESSO` é aceito.

**Resultado:** a RF004 possui tratamento explícito de falhas do banco e testes para impedir falso sucesso nas alterações comuns.

---

### Resumo da validação OWASP da RF004

| Categoria OWASP 2025 | Controle encontrado na RF004 | Evidência de teste |
| --- | --- | --- |
| **A01 — Broken Access Control** | Propriedade por sessão + `somenteAdmin` | Sim — propriedade, IDOR de conta e bloqueio administrativo |
| **A05 — Injection** | Joi + `allowUnknown: false` + tipos/constraints | Sim — entradas inválidas bloqueadas antes do banco; escopo parcial para pesquisa livre |
| **A06 — Insecure Design** | Regras de conta padrão, transição de estado, constraints, índices e rate limit | Sim — duplicidade, conta reservada, estados repetidos e limites |
| **A07 — Authentication Failures** | `autenticar` em todas as APIs RF004 e `somenteAdmin` no admin | Sim — 401 sem sessão e 403 para usuário comum |
| **A09 — Security Logging & Alerting Failures** | Auditoria + logs de segurança de rate limit | Parcial — logging testado; alerta externo não identificado |
| **A10 — Mishandling of Exceptional Conditions** | Verificação de erros e confirmação da linha alterada | Sim — falhas simuladas retornam 500 e não geram falso sucesso |

---

### Resultado dos testes utilizados nesta documentação

Execuções realizadas sobre o snapshot atual:

```text
tests/contas-financeiras.test.js
42 testes
42 aprovados
0 falhas
```

```text
testes direcionados de autenticação/autorização em tests/app.test.js
2 testes
2 aprovados
0 falhas
```

Verificações adicionais de rate limit executadas diretamente sobre as rotas da RF004:

```text
GET /usuario/listar-contas
Limite configurado: 60 / 5 minutos
61ª requisição: HTTP 429
Retry-After observado: 300 segundos
```

```text
PATCH /usuario/inativar-conta
Limite configurado: 5 / 15 minutos
6ª requisição: HTTP 429
Retry-After observado: 900 segundos
```

