# RF-009: Dashboard

## 1. Identificação

- **ID:** RF-009.
- **Título:** Dashboard (tela principal integradora).
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

- **Usuário autenticado (Comum ou Admin):** consulta o painel com os próprios dados e executa as ações rápidas. O administrador continua tendo a área administrativa em `/tela-admin`.

### Validações necessárias

- Os formulários das ações rápidas repetem as validações do frontend das telas completas (campos obrigatórios, valor positivo com até duas casas decimais, vínculo de conta ou categoria no orçamento). A validação definitiva permanece no backend (Joi e controllers das RF-004 a RF-008); os erros retornados em `erros[]` são exibidos junto ao campo correspondente.

---

## 3. Casos de Uso

### Fluxo principal: consultar o Dashboard

**Pré-condição:** usuário autenticado.

- O sistema confirma a sessão em `/me`. Antes dessa confirmação, nenhuma rota `/usuario` é consultada.
- O sistema consulta em paralelo contas, categorias, transações, metas e orçamentos atuais, e o saldo de cada conta ativa.
- Cada cartão apresenta seu próprio estado de carregamento, vazio, erro (com opção de tentar novamente) ou preenchido.

### Fluxo principal: registrar por ação rápida

- O usuário aciona Receita, Despesa, Transferência, Meta, Orçamento ou Categoria (botões do cabeçalho, dos cartões ou botão flutuante no celular).
- O sistema abre o formulário em modal, com as contas, categorias e metas já carregadas.
- Ao salvar, o sistema chama a rota de criação existente, fecha o modal, apresenta a confirmação e recarrega os dados do painel e o saldo do cabeçalho.

### Fluxo principal: efetivar transação pendente

- O usuário aciona Pagar (ou Receber) em uma transação pendente e confirma.
- O sistema envia `PATCH /usuario/editar-transacao` com `status_transacao: "Pago"` e `data_pagamento` igual à data de hoje, o mesmo corpo usado pelo botão PAGAR da tela de edição.

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

---

## 4. Protótipo

- **Tela:** `/tela-principal`.
- **Componentes:** cabeçalho com ações rápidas; saldo disponível com contas e evolução mensal; indicadores do mês; fluxo de caixa (colunas agrupadas, com alternância para tabela); metas; últimas movimentações; contas a pagar e receber; despesas por categoria; orçamentos atuais.

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
| Transações | `GET /usuario/listar-transacoes`, `POST /usuario/criar-transacao`, `PATCH /usuario/editar-transacao` |
| Categorias | `GET /usuario/listar-categoria`, `POST /usuario/criar-categoria` |
| Metas | `GET /usuario/listar-metas`, `POST /usuario/criar-meta` |
| Orçamentos | `GET /usuario/listar-orcamentos`, `POST /usuario/criar-orcamento` |

### Decisões arquiteturais

- Sem rota agregadora no backend: o painel reutiliza as listagens existentes, mantendo permissões, auditoria e limites de requisição já definidos.
- A navegação é montada por `menu-superior.js` sobre o cabeçalho existente, sem alterar o HTML das demais páginas.

---

## 6. Segurança

- **Autenticação:** todas as consultas dependem do cookie de sessão; sem sessão, nada é consultado.
- **Autorização:** o pertencimento dos dados é verificado pelos controllers existentes; o painel não envia identificador de usuário.
- **Validação e XSS:** validação no backend; conteúdo dinâmico inserido como texto.

## 7. Testes

- `tests/browser/dashboard.test.js` — sessão, orçamentos atuais (RF-008), indicadores, gráficos, listas, responsividade e ação rápida, com APIs simuladas. Executar com `npm run test:frontend`.
