# RF-009: Dashboard

## 1. Identificação

- **ID:** RF-009.
- **Título:** Dashboard (tela principal integradora).
- **Tipo:** Requisito funcional, integrador: consolida as RF-004 a RF-008 em uma página e não possui CRUD nem rotas de API próprias.
- **Prioridade:** Alta.
- **Complexidade:** 8 story points — somente frontend; reutiliza as rotas das RF-004 a RF-008.

### a) URL da Aplicação (Deploy Online)

- **URL:** https://cashland-cdf0.onrender.com/
- **Plataforma:** Render.

### b) Link do Banco de Dados Online

- **BD:** Supabase — PostgreSQL.
- **Link:** https://supabase.com/dashboard/project/xjfgkakjpuxoznbwznyb
- **Tabelas consultadas:** `contas_bancarias`, `saldo_conta`, `transacoes`, `categorias`, `metas` e `orcamentos`. A RF-009 não cria tabelas, funções ou triggers.

### c) Link do GitHub

- **Repositório:** https://github.com/JoaoSousa2002/CashLand
- **Branch principal:** `main`.

---

## 2. Descrição e Atores

A RF-009 transforma a tela principal (`/tela-principal`) em um painel que reúne, em uma única página, os dados das demais funcionalidades: saldo disponível, evolução mensal, entradas, despesas e valor economizado no mês, fluxo de caixa, metas com progresso, últimas movimentações, contas a pagar e receber, despesas por categoria e orçamentos atuais.

O Dashboard também funciona como página integradora: as ações rápidas abrem formulários em janela modal que utilizam as mesmas rotas de criação das telas completas, e cada item listado leva à tela de edição já existente. Uma transação pendente pode ser marcada como paga diretamente na lista.

Nenhuma rota nova de API foi criada. Todos os valores são calculados no navegador a partir das listagens existentes.

### Benefícios para o negócio

- Visão consolidada da situação financeira sem navegar por várias telas.
- Registro de receitas, despesas, transferências, metas, orçamentos e categorias sem sair da página.
- Identificação imediata de contas atrasadas e orçamentos próximos do limite.

### Atores

- **Usuário autenticado:** consulta o painel com os próprios dados (Read), cria registros pelas ações rápidas (Create), efetiva pendências com Pagar ou Receber (Update) e exclui transações e metas pelas listas, com confirmação (Delete).
- **Administrador autenticado:** usa o painel com os próprios dados, com as mesmas operações do usuário, e acessa a área administrativa em `/tela-admin` para gerir registros de outros usuários.
- **Sistema CashLand — API e triggers do banco (ator secundário, sem interface):** fornece as listagens, verifica sessão e pertencimento, registra auditoria e mantém saldo, `valor_atual` das metas e dos orçamentos por triggers; o painel apenas apresenta esses valores.

### Validações necessárias

- Os formulários das ações rápidas repetem as validações do frontend das telas completas (campos obrigatórios, valor positivo com até duas casas decimais, vínculo de conta ou categoria no orçamento). A validação definitiva permanece no backend (Joi e controllers das RF-004 a RF-008); os erros retornados em `erros[]` são exibidos junto ao campo correspondente.

---

## 3. Casos de Uso

### Fluxo principal: consultar o Dashboard

**Pré-condição:** usuário autenticado.

- O sistema confirma a sessão em `/me`. Antes dessa confirmação, nenhuma rota `/usuario` é consultada.
- O sistema consulta em paralelo contas, categorias, transações, metas e orçamentos atuais, e o saldo de cada conta ativa.
- Cada cartão apresenta seu próprio estado de carregamento, vazio, erro (com opção de tentar novamente) ou preenchido.

**Pós-condição:** painel preenchido com os dados do usuário da sessão. **Pós-condição de falha:** os cartões dependentes da consulta que falhou mostram o erro e a opção de repetir; os demais permanecem utilizáveis.

### Fluxo principal: registrar por ação rápida

- O usuário aciona Receita, Despesa, Transferência, Meta, Orçamento ou Categoria (botões do cabeçalho, dos cartões ou botão flutuante no celular).
- O sistema abre o formulário em modal, com as contas, categorias e metas já carregadas.
- Ao salvar, o sistema chama a rota de criação existente, fecha o modal, apresenta a confirmação e recarrega os dados do painel e o saldo do cabeçalho.

**Pós-condição:** registro persistido pela rota da RF correspondente e visível no painel. **Pós-condição de falha:** nada é gravado; o modal permanece aberto com os erros por campo (HTTP 400) ou a mensagem geral (demais códigos).

### Fluxo principal: efetivar transação pendente

- O usuário aciona Pagar (ou Receber) em uma transação pendente e confirma.
- O sistema envia `PATCH /usuario/editar-transacao` com `status_transacao: "Pago"` e `data_pagamento` igual à data de hoje, o mesmo corpo usado pelo botão PAGAR da tela de edição.

**Pós-condição:** transação marcada como paga; saldo, indicadores e pendências recarregados. **Pós-condição de falha:** a transação permanece pendente e um aviso de erro é exibido.

### Fluxo principal: excluir transação ou meta pela lista

- O usuário aciona Excluir em um item das listas de movimentações, de pendências ou de metas.
- O sistema apresenta a confirmação com o nome e o valor do registro e o aviso de que a ação não poderá ser desfeita.
- Ao confirmar, o sistema envia `DELETE /usuario/excluir-transacao/{id_transacao}` ou `DELETE /usuario/deletar-meta/{id_meta}`, apresenta o resultado e recarrega o painel.

**Pós-condição:** registro removido do banco e do painel. **Pós-condição de falha:** se o usuário cancelar, ou se a API recusar (por exemplo, meta referenciada por transações), o registro é preservado e o motivo é exibido.

### Fluxo principal: navegar para as demais telas

- Contas, metas, transações e orçamentos listados abrem a tela de edição correspondente. Cada cartão possui atalho para a listagem completa.

### Fluxo alternativo: falha em uma consulta

- A falha de uma consulta afeta somente os cartões que dependem dela; os demais permanecem utilizáveis. Os orçamentos seguem o comportamento definido na RF-008.

### Fluxo alternativo: usuário sem contas ou categorias

- O painel apresenta um aviso com atalho para criar a primeira conta ou categoria. As ações que dependem delas ficam bloqueadas no modal, com orientação.

### Fluxo alternativo: dados inválidos ou sessão expirada

- Erros de validação aparecem no campo; demais erros, em uma mensagem no modal. Com HTTP 401, o usuário é direcionado ao login.

### Requisitos não funcionais

- **RNF-01 — Responsividade:** barra lateral a partir de 1024 px; abaixo disso, barra superior, gaveta de navegação, barra inferior e botão flutuante. Sem rolagem horizontal da página em 1280, 390 e 320 px.
- **RNF-02 — Acessibilidade:** gráficos com descrição textual, foco por teclado e tabela equivalente; cores das séries validadas para daltonismo; modais com foco contido e fechamento por Esc.
- **RNF-03 — Segurança:** textos vindos da API são inseridos com `textContent`; nenhuma dependência externa é carregada.
- **RNF-04 — Desempenho:** consultas em paralelo; gráficos em SVG gerados no navegador, sem bibliotecas.

### Regras de negócio

- **RN-01:** saldo disponível é a soma do saldo mais recente das contas com status Ativo.
- **RN-02:** entradas e despesas consideram somente transações com status Pago dos tipos Entrada e Saida, atribuídas ao mês de `data_pagamento`. Transferências e pendências não entram.
- **RN-03:** valor economizado é entradas menos despesas do mês; a evolução mensal apresenta esse resultado nos últimos seis meses.
- **RN-04:** o mês e a data de hoje usam o fuso `America/Sao_Paulo`.
- **RN-05:** uma pendência é atrasada quando `data_vencimento` é anterior a hoje.
- **RN-06:** o progresso da meta é `valor_atual / valor_meta`, limitado a 100%.
- **RN-07:** despesas por categoria apresentam as seis maiores do mês; as demais são somadas em Outras.
- **RN-08:** a tabela de orçamentos atuais mantém integralmente as regras RN-15 a RN-18 da RF-008.
- **RN-09:** toda exclusão pelo painel exige confirmação em modal e usa as rotas DELETE existentes; orçamentos são excluídos somente pela listagem completa da RF-008.
- **RN-10:** o painel nunca envia identificador de usuário; o proprietário é sempre o da sessão.

---

## 4. Protótipo

- **Tela:** `/tela-principal`, em https://cashland-cdf0.onrender.com/ (após o login).
- **Componentes:** cabeçalho com ações rápidas; saldo disponível com contas e evolução mensal; indicadores do mês; fluxo de caixa (colunas agrupadas, com alternância para tabela); metas; últimas movimentações; contas a pagar e receber; despesas por categoria; orçamentos atuais.

### Operações exercidas pelo painel

A RF-009 não possui CRUD próprio. Cada operação do checklist é exercida pelo painel por meio das rotas já documentadas das RF-004 a RF-008:

| Operação | Como o painel exerce | Método e rota | Status esperado |
| --- | --- | --- | --- |
| Create | Ações rápidas Receita, Despesa e Transferência (modal) | `POST /usuario/criar-transacao` | 201 |
| Create | Ação rápida Categoria (modal) | `POST /usuario/criar-categoria` | 200 |
| Create | Ação rápida Meta (modal) | `POST /usuario/criar-meta` | 201 |
| Create | Ação rápida Orçamento (modal) | `POST /usuario/criar-orcamento` | 201 |
| Read | Sessão, antes de qualquer consulta | `GET /me` | 200 |
| Read | Saldo disponível e lista de contas | `GET /usuario/listar-contas`, `GET /usuario/verificar-saldo` | 200 |
| Read | Despesas por categoria e listas dos modais | `GET /usuario/listar-categoria` | 200 |
| Read | Indicadores, fluxo de caixa, movimentações e pendências | `GET /usuario/listar-transacoes` | 200 |
| Read | Metas com progresso | `GET /usuario/listar-metas` | 200; 404 sem metas |
| Read | Orçamentos atuais (filtros de período com a data de hoje) | `GET /usuario/listar-orcamentos` | 200 |
| Update | Botão Pagar ou Receber de uma pendência, com confirmação | `PATCH /usuario/editar-transacao` | 200 |
| Delete | Botão Excluir nas listas de movimentações e de pendências, com confirmação | `DELETE /usuario/excluir-transacao/{id_transacao}` | 200 |
| Delete | Botão Excluir na lista de metas, com confirmação | `DELETE /usuario/deletar-meta/{id_meta}` | 200 |

A edição completa de cada registro (e a exclusão de orçamentos) é feita nas telas das RF-005 a RF-008, abertas pelos botões Ver e pelos atalhos de cada cartão. Os orçamentos atuais mantêm as regras RN-15 a RN-18 da RF-008, inclusive a tabela com apenas o botão `ver`.

### Estados de tela e validação

- **Carregando:** cada cartão apresenta seu próprio indicador enquanto a consulta correspondente não responde.
- **Vazio:** cartão sem dados mostra orientação e atalho para criar o primeiro registro (conta, categoria, transação, meta ou orçamento).
- **Erro:** falha de rede, de formato ou HTTP em uma consulta afeta somente os cartões que dependem dela, com opção Tentar novamente; HTTP 401 redireciona ao login.
- **Preenchido:** listas, gráficos SVG e tabela com os dados retornados, inseridos com `textContent`.
- **Sucesso:** após criar, efetivar ou excluir, o modal fecha, um aviso de sucesso é exibido e o painel e o saldo do cabeçalho são recarregados.
- **Validação visual nos modais:** campo inválido recebe borda vermelha, `aria-invalid="true"` e mensagem iniciada por ✗ junto ao campo; campo preenchido sem erro recebe borda verde, `aria-invalid="false"` e ✓ no rótulo. Os erros retornados pela API em `erros[]` são associados ao campo correspondente.
- **Exclusão:** sempre precedida de confirmação em modal, com o nome e o valor do registro e o aviso de que a ação não poderá ser desfeita.

**Documentação da API:** `docs/api/swagger.json` — OpenAPI 3.0; a descrição geral registra as operações consumidas pela RF-009.

**Swagger UI:** https://cashland-cdf0.onrender.com/api-docs/

**DDL da RF-009:** `database/ddl/RF-009-Dashboard.sql` — não cria tabelas; lista os DDLs das RF-004 a RF-008 de que o painel depende e acrescenta os índices de apoio às consultas (`transacoes` por conta de origem, status e data de pagamento e categoria; `metas` por conta). Migration correspondente: `supabase/migrations/20261115140000_rf009_indices_dashboard.sql`.

**Exemplos de `curl`:** seção "Exemplos de curl — RF-009 Dashboard" do `README.md`, com as mesmas chamadas que o painel executa na URL publicada.

---

## 5. Arquitetura

### Componentes e padrão de design

- `src/rf-009-Dashboard/public/tela_principal.html` — estrutura da página.
- `src/rf-009-Dashboard/public/dashboard.css` — estilos específicos do painel e dos modais.
- `src/rf-009-Dashboard/public/dashboard.js` — sessão, consultas, cálculos, gráficos e listas.
- `src/rf-009-Dashboard/public/acoes-rapidas.js` — modais reutilizáveis de criação e confirmação.
- `src/rf-003-Cadastro_usuario/public/template.css` e `menu-superior.js` — sistema de design e navegação compartilhados por todas as telas.
- `src/routes/pageRoutes.js` — rota `/tela-principal`; `src/app.js` — pasta estática da RF-009.

### Rotas de API reutilizadas

| Uso | Rota |
| --- | --- |
| Sessão | `GET /me` |
| Contas e saldo | `GET /usuario/listar-contas`, `GET /usuario/verificar-saldo` |
| Transações | `GET /usuario/listar-transacoes`, `POST /usuario/criar-transacao`, `PATCH /usuario/editar-transacao`, `DELETE /usuario/excluir-transacao/{id_transacao}` |
| Categorias | `GET /usuario/listar-categoria`, `POST /usuario/criar-categoria` |
| Metas | `GET /usuario/listar-metas`, `POST /usuario/criar-meta`, `DELETE /usuario/deletar-meta/{id_meta}` |
| Orçamentos | `GET /usuario/listar-orcamentos`, `POST /usuario/criar-orcamento` |

### Decisões arquiteturais

- Sem rota agregadora no backend: o painel reutiliza as listagens existentes, mantendo permissões, auditoria e limites de requisição já definidos.
- A navegação é montada por `menu-superior.js` sobre o cabeçalho existente, sem alterar o HTML das demais páginas.
- Exclusão direta pelas listas reutiliza o modal de confirmação das ações rápidas e as rotas DELETE das RF-006 e RF-007, sem lógica de autorização no navegador.
- O acesso ao banco é feito pelo backend com a chave de serviço, sem RLS, conforme o ADR-006 da RF-007; o painel nunca acessa o Supabase diretamente.

---

## 6. Segurança

### Controle 1 — Autenticação de sessão

- **Categoria OWASP:** A07:2021 — Identification and Authentication Failures.
- **Implementação:** todas as consultas e ações dependem do cookie de sessão HttpOnly; o painel confirma a sessão em `GET /me` antes de consultar qualquer rota `/usuario`, e HTTP 401 em qualquer resposta redireciona ao login.
- **Teste:** `tests/browser/dashboard.test.js` verifica que, sem sessão, nenhuma rota `/usuario` é chamada e que o painel aguarda `/me` antes das demais consultas.

### Controle 2 — Controle de acesso e prevenção de IDOR

- **Categoria OWASP:** A01:2021 — Broken Access Control.
- **Implementação:** o painel não envia identificador de usuário; o pertencimento de contas, transações, metas e orçamentos é verificado pelos controllers existentes a partir da sessão. As exclusões usam as rotas DELETE das RF-006 e RF-007, que verificam o proprietário antes e durante a escrita.
- **Teste:** o teste de navegador usa a rota e o controller reais de orçamentos com banco simulado e verifica resultados separados para dois usuários autenticados; os testes das RF-006 e RF-007 cobrem HTTP 404 para registros alheios.

### Controle 3 — Validação de entrada e proteção contra XSS

- **Categoria OWASP:** A03:2021 — Injection.
- **Implementação:** validação definitiva no backend (Joi e controllers); todo texto vindo da API é inserido com `textContent`; nenhuma dependência externa é carregada; os gráficos são SVG gerados no navegador. Os modais validam campos obrigatórios e valores antes do envio e mostram os erros da API por campo.
- **Teste:** o teste de navegador verifica que um nome contendo marcação HTML é apresentado como texto, que não há imagens injetadas no conteúdo, e que a validação visual marca o campo vazio como inválido (✗) e o preenchido como válido (✓).

### Execução dos testes — evidência

- **Data:** 15/11/2026. **Ambiente:** Windows 11, Node.js v24.16.0, Chrome headless; APIs simuladas, sem conexão com o Supabase.
- `node --test tests/browser/dashboard.test.js`: 7 testes, 7 aprovados. Inclui sessão, orçamentos atuais, indicadores, gráficos, listas, responsividade em 1280, 390 e 320 px, ação rápida de criação, validação visual e exclusão com confirmação (cancelar preserva; confirmar chama a rota DELETE e recarrega as listas).
- `npm test`: 170 testes, 170 aprovados.
- `npm run test:frontend` (suíte completa de navegador): 55 testes, 55 aprovados (listagens das RF-003 a RF-008 em 1280 × 900, 390 × 844 e 320 × 568, orçamentos e Dashboard).
- Migrations: as cinco de `supabase/migrations/` constam como aplicadas no banco publicado (`supabase migration list --linked`); os índices `idx_transacoes_*` e `idx_metas_conta`, o gatilho `trigger_verificar_nome_meta_unico` e a função corrigida `atualizar_orcamentos_por_transacao` foram conferidos no catálogo.
- Roteiro na URL publicada (17/11/2026, https://cashland-cdf0.onrender.com/, conta de usuário de teste, Chrome headless): login; painel sem erro de console e sem rolagem horizontal em 1280, 390 e 320 px; Create de despesa e de meta pelas ações rápidas; Read após recarregar; Update pelo botão Pagar (status Pago e data de pagamento no banco, saldo da conta atualizado); Delete com confirmação (Cancelar preserva, Excluir remove da lista e do banco, saldo volta ao valor anterior). Cada passo foi conferido por consulta ao banco e os registros de teste foram removidos. Login do administrador também verificado.
- Correção aplicada antes do roteiro: a função `atualizar_orcamentos_por_transacao` publicada no banco divergia do DDL (comparava `OLD.modalidade`, coluna inexistente em `transacoes`) e impedia qualquer UPDATE em transações; foi recriada pela migration `20261115150000_rf008_corrige_gatilho_orcamentos.sql`.

## 7. Testes

- `tests/browser/dashboard.test.js` — sessão, orçamentos atuais (RF-008), indicadores, gráficos, listas, responsividade, ação rápida de criação, validação visual dos modais e exclusão com confirmação pelas listas, com APIs simuladas. Executar com `npm run test:frontend`.
