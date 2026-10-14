## 🎯 1. IDENTIFICAÇÃO DO REQUISITO (2%)

**ID:** RF-006  
**Título:** Gerenciamento de Transações Financeiras  
**Tipo:** Requisito Funcional  
**Prioridade:** ALTA — depende de RF-005 (contas) e da gestão de categorias; constitui o registro financeiro que alimenta saldo e histórico.  
**Complexidade:** ALTA — **34 story points (estimativa documental)**.  
**Status:** Implementação identificada no código; validação integral de execução pendente.  
**Data de criação:** não confirmada pelos artefatos examinados.  
**Última revisão documental:** 13/10/2026.

**Breve descrição:** Permitir a criação, consulta, edição e exclusão de transações avulsas e regras de recorrência (parceladas e periódicas), com permissões de usuário e administrador, controle de situação Pendente/Pago, transferência entre contas e consulta do saldo gerado pelo banco.

### Estimativa de complexidade — Story Points

Mesmo critério **aditivo por entrega funcional** utilizado no documento RF-005. Os pontos expressam complexidade relativa, não horas de trabalho. Escala Fibonacci adotada por item: 1, 2, 3, 5, 8.

| Entrega                                                                                       | Justificativa                                       | SP     |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------- | ------:|
| Estrutura PostgreSQL (`transacoes`, `recorrencias`, `saldo_conta`), chaves, checks e triggers | Integridade e dependências entre tabelas            | 5      |
| Criação de transação avulsa, com entradas, saídas e transferências                            | Formulário, validação e persistência                | 5      |
| Criação de recorrência parcelada ou periódica                                                 | Geração associada, datas e quantidade               | 5      |
| Listagem e filtros de transações/recorrências                                                 | Dois modos de listagem, consulta e filtros          | 3      |
| Edição e pagamento de transações                                                              | Regras de status e persistência                     | 5      |
| Edição e cancelamento de recorrências                                                         | Atualização da regra e exclusão de pendentes        | 3      |
| Consulta e atualização de saldo                                                               | Conciliação de eventos e histórico diário           | 3      |
| Fluxos administrativos de listagem, edição e exclusão                                         | Autorização diferenciada e proprietário selecionado | 5      |
| **Total**                                                                                     | **5+5+5+3+5+3+3+5**                                 | **34** |

**Classificação:** ALTA pelo volume de regras de estado, múltiplas contas, triggers, operações de usuário/admin e impacto de consistência financeira. Os 34 SP são uma estimativa fundamentada na implementação; não há evidência de votação formal da equipe.

---

## 📋 2. DESCRIÇÃO E ATORES (6%)

### Descrição detalhada e contexto de negócio

A RF-006 registra movimentações de contas financeiras do CashLand. Uma transação avulsa é persistida em `transacoes`; as modalidades `Parcelado` e `Periodico` são registradas como regras em `recorrencias`, cujas transações relacionadas são geradas pelas funções/triggers do banco. Entradas, saídas e transferências distinguem o sinal e as contas afetadas, enquanto `Pendente` e `Pago` distinguem previsão de movimentação liquidada.

**Benefícios de negócio:** (1) consolidar as movimentações financeiras por conta; (2) organizar compromissos parcelados e periódicos; (3) manter histórico e facilitar consultas; (4) separar lançamentos pendentes e pagos; (5) permitir administração controlada do cadastro financeiro.

### Atores e matriz de permissões

| Ator                      | Papel                                                         | Criar                                            | Ler             | Editar          | Excluir/cancelar |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------ | --------------- | --------------- | ---------------- |
| Usuário autenticado       | Gerir as próprias transações e recorrências                   | Sim                                              | Apenas próprias | Apenas próprias | Apenas próprias  |
| Administrador autenticado | Operar sobre registros de usuário informado, após autorização | Não há rota administrativa específica de criação | Sim             | Sim             | Sim              |
| Sistema CashLand          | Validar, autenticar, auditar e persistir operações            | Automaticamente                                  | Automaticamente | Automaticamente | Automaticamente  |
| PostgreSQL/Supabase       | Aplicar constraints e automações de geração/saldo             | Via triggers                                     | Via consultas   | Via triggers    | Via triggers     |

O proprietário do registro é obtido pela conta ou pela recorrência. As rotas comuns utilizam `req.usuario.id_usuario`; as rotas administrativas exigem `somenteAdmin`.

---

## 🔄 3. ESPECIFICAÇÃO DE CASOS DE USO + REQUISITOS NÃO FUNCIONAIS (15%)

### UC-006.01 — Criar transação avulsa

**Pré-condições:** sessão autenticada válida; conta financeira existente e pertencente ao usuário; categoria compatível quando aplicável; conexão com Supabase disponível.  
**Pós-condição de sucesso:** transação registrada com identificador, conta, valor, tipo, status e datas; atualização de saldo esperada se paga.  
**Pós-condição de falha:** sem novo registro válido; resposta de erro; possível evento de auditoria.

**Fluxo principal (12 passos):**

1. Usuário acessa `/tela-principal/criar-transacao`.
2. O sistema apresenta os modos Avulso, Parcelado e Periódico.
3. O usuário seleciona Avulso.
4. Informa o tipo Entrada, Saida ou Transferencia.
5. Informa o nome e os dados complementares.
6. Seleciona a conta de origem.
7. Seleciona categoria, quando exigida pelo tipo.
8. Informa conta de destino quando a transação for transferência.
9. Informa forma de pagamento, valor e datas aplicáveis.
10. Seleciona situação Pendente ou Pago e informa data do pagamento quando cabível.
11. O frontend envia os dados à rota `POST /usuario/criar-transacao`.
12. Middleware Joi, controller e Supabase processam e retornam o resultado.

### UC-006.02 — Criar parcelamento ou recorrência periódica

1. Usuário entra no formulário de criação.
2. Seleciona Parcelado ou Periódico.
3. O formulário disponibiliza campos da modalidade.
4. Usuário informa conta, categoria, tipo, nome e valor.
5. Escolhe frequência quando aplicável.
6. Informa quantidade de parcelas/ocorrências segundo a modalidade.
7. Define data de início e situação ativa.
8. Envia os dados.
9. O backend executa `POST /usuario/criar-recorrencia`.
10. O PostgreSQL registra a regra em `recorrencias`.
11. O trigger pertinente solicita geração das transações relacionadas.
12. O sistema apresenta resultado e permite posterior consulta.

### UC-006.03 — Listar, filtrar, editar, pagar e excluir transações

1. Usuário abre `/tela-principal/listar-transacoes`.
2. Seleciona Transações ou Recorrências.
3. O sistema consulta a lista correspondente.
4. Usuário informa pesquisa por nome ou ID.
5. Opcionalmente abre filtros avançados.
6. Aplica os filtros.
7. O frontend renderiza linhas e opções de operação.
8. Ao selecionar editar, navega para `/tela-principal/editar-transacao` com o identificador.
9. O formulário carrega os dados e bloqueia campos não editáveis.
10. Usuário altera campos permitidos e salva.
11. Para transação pendente, pode usar o botão `PAGAR` apresentado no HTML.
12. Para exclusão, a aplicação solicita confirmação e chama a rota adequada.

### UC-006.04 — Operações administrativas

1. Administrador se autentica.
2. Navega à listagem administrativa.
3. Seleciona o usuário-alvo.
4. Seleciona o modo transações ou recorrências.
5. Pesquisa ou aplica filtros.
6. Recebe registros associados à seleção.
7. Escolhe editar ou excluir na coluna de opções.
8. A edição abre `/tela-admin/editar-transacao`.
9. O backend verifica autorização com `somenteAdmin`.
10. Os dados são validados pelos schemas administrativos.
11. A operação é persistida no Supabase ou rejeitada.
12. A resposta é apresentada e a listagem pode ser atualizada.

### UC-006.05 — Consultar saldo atual

1. Usuário autenticado seleciona sua conta.
2. Frontend envia `id_conta` por query string.
3. Middleware autentica e valida a solicitação.
4. Controller chama `verificarContaBancaria`.
5. Se não houver pertencimento, retorna 404.
6. Consulta `saldo_conta` filtrando por `id_conta`.
7. Ordena por `data_atualizacao` decrescente.
8. Limita a uma linha com `.limit(1).maybeSingle()`.
9. Se não existir linha, retorna `{saldo:0}`.
10. Caso exista, retorna o objeto contendo `saldo`.

### Fluxos alternativos

**A1 — Validação rejeitada:** campos ausentes, tipos incorretos ou valores proibidos causam resposta de validação antes do controller, conforme schemas Joi.  
**A2 — Conta/categoria de outro usuário:** verificação de pertencimento impede a operação e retorna 404 nas rotas que implementam essa checagem.  
**A3 — Não autenticado:** middleware `autenticar` interrompe a requisição.  
**A4 — Usuário comum acessando administrador:** `somenteAdmin` bloqueia a requisição.  
**A5 — Falha do Supabase:** controller retorna erro servidor, sem afirmar persistência bem-sucedida.  
**A6 — Registro inexistente:** consulta ou alteração deve sinalizar inexistência conforme comportamento específico do controller.  
**A7 — Exclusão de recorrência:** a rotina marca a recorrência como inativa e exclui apenas transações pendentes relacionadas; pagas devem ser preservadas.  
**A8 — Tentativa de transferência com mesma conta:** restrição `chk_contas_diferentes` impede origem igual ao destino.  
**A9 — Pagamento desfeito:** transação passa de Pago para Pendente e o saldo deve reverter o efeito anterior; exige comprovação do trigger efetivamente implantado.

### Regras de negócio (RN)

| ID    | Regra                                                                                                                      | Evidência / observação                                     |
| ----- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| RN-01 | A transação registra `Entrada`, `Saida` ou `Transferencia`.                                                                | `chk_transacao_tipo` no DDL                                |
| RN-02 | O status persistido é `Pendente` ou `Pago`.                                                                                | `chk_transacao_status`                                     |
| RN-03 | Valor de transação deve ser positivo.                                                                                      | `chk_transacao_valor`                                      |
| RN-04 | Pago exige `data_pagamento`; Pendente exige nulo.                                                                          | `chk_transacao_pagamento`                                  |
| RN-05 | Transferência exige conta de destino e dispensa categoria; Entrada/Saida exigem categoria e não usam destino.              | `chk_transacao_contas`                                     |
| RN-06 | Origem e destino da transferência não podem coincidir.                                                                     | `chk_contas_diferentes`                                    |
| RN-07 | Recorrência possui modalidade `Parcelado` ou `Periodico`, tipo Entrada/Saida.                                              | CHECKs na tabela `recorrencias`                            |
| RN-08 | Parcelamento exige pelo menos 2 parcelas; periódico aceita quantidade nula ou ≥1.                                          | `chk_recorrencia_quantidade`                               |
| RN-09 | Frequência de recorrência é Semanal, Mensal ou Anual.                                                                      | `chk_recorrencia_frequencia`                               |
| RN-10 | Apenas movimentos pagos devem repercutir no saldo; saída reduz, entrada aumenta, transferência desloca saldo entre contas. | Regra funcional; funcionamento do trigger requer validação |
| RN-11 | Cancelamento de recorrência inativa a regra e elimina apenas transações pendentes.                                         | Controller `excluirRecorrencia`                            |
| RN-12 | Usuário comum deve atuar apenas nos próprios registros; administrador passa pelo middleware de autorização.                | Controllers e routes                                       |
| RN-13 | Saldo diário possui uma linha por conta e por data.                                                                        | `uq_saldo_conta_dia`                                       |
| RN-14 | Não duplicar parcela de uma mesma recorrência.                                                                             | `uq_recorrencia_parcela`                                   |
| RN-15 | Valores de forma de pagamento são PIX, débito, crédito, boleto e dinheiro, quando informados.                              | CHECKs PostgreSQL                                          |

### Requisitos não funcionais (RNF)

| ID     | Atributo        | Requisito/critério de aceitação                                   | Verificação                             |
| ------ | --------------- | ----------------------------------------------------------------- | --------------------------------------- |
| RNF-01 | Autenticação    | Rotas financeiras privadas exigem sessão válida                   | Testes 401/403 conforme middleware      |
| RNF-02 | Autorização     | Isolamento de usuário e separação de privilégios de administrador | Testes IDOR, admin e usuário            |
| RNF-03 | Integridade     | CHECKs, FKs, unicidade e updates consistentes do saldo            | Testes SQL e reconciliação              |
| RNF-04 | Usabilidade     | Feedback de carregamento, erro e resultado                        | Inspeção e teste das telas              |
| RNF-05 | Responsividade  | Interface utilizável em 320px e 1024px, critério do professor     | Teste visual ainda necessário           |
| RNF-06 | Rastreabilidade | Auditoria dos eventos financeiros                                 | Inspeção e execução de `auditar`        |
| RNF-07 | Confiabilidade  | Falhas da API não podem ser interpretadas como sucesso            | Testes de indisponibilidade e respostas |

---

## 🎨 4. PROTÓTIPO FUNCIONAL — TELAS, MOCKUPS E ESTADOS (50%)

### Artefatos implementados

Existem **cinco arquivos HTML físicos**, mas cada um suporta estados/modos distintos. O template visual utiliza `/template.css`, título CashLand, painéis, campos rotulados, feedback de erro, overlays de carregamento/resultado e tabelas. As representações ASCII abaixo são **esquemáticas**, extraídas dos campos e controles identificados no HTML; não são capturas pixel a pixel. Não representam funcionalidades inexistentes como uma página separada de criação administrativa.

### Mockup 1 — Criar transação avulsa (formulário vazio)

```text
┌─────────────────────────────────────────────────────────────┐
│ CashLand                         [Saldo] [Menu]              │
├─────────────────────────────────────────────────────────────┤
│ Criar transação                                             │
│ Modalidade: [● Avulso] [○ Parcelado] [○ Periódico]          │
│ Tipo da transação: [Selecione o tipo                 ▼]      │
│ Nome:              [_______________________________]       │
│ Descrição:         [_______________________________]       │
│ Conta financeira:  [Carregando contas...             ▼]     │
│ Categoria:         [Carregando categorias...         ▼]     │
│ Forma de pagamento:[Selecione ...                  ▼]       │
│ Destino/favorecido:[_______________________________]       │
│ Valor (R$):        [_____________]                          │
│ Situação:          [Pendente ▼]                             │
│ Data da transação: [____/____/________]                     │
│ Vencimento:        [____/____/________]                     │
│ Pagamento:         [____/____/________]                     │
│                                  [Criar transação]          │
└─────────────────────────────────────────────────────────────┘
```

### Mockup 2 — Criar recorrência parcelada (formulário preenchido)

```text
┌─────────────────────────────────────────────────────────────┐
│ Criar transação                                             │
│ Modalidade: [○ Avulso] [● Parcelado] [○ Periódico]          │
│ Tipo: Saída                     Nome: Notebook              │
│ Conta: Conta corrente           Categoria: Compras          │
│ Valor (R$): 1.200,00                                        │
│ Quantidade de parcelas: [6]                                │
│ Data de início: [10/10/2026]                               │
│ Recorrência ativa: [Sim ▼]                                 │
│                                       [Criar transação]     │
└─────────────────────────────────────────────────────────────┘
```

*Valores ilustrativos, não extraídos de uma sessão real.*

### Mockup 3 — Criar recorrência periódica

```text
┌─────────────────────────────────────────────────────────────┐
│ Modalidade: [○ Avulso] [○ Parcelado] [● Periódico]          │
│ Tipo: Entrada                      Nome: Salário            │
│ Conta financeira: [Conta principal              ▼]         │
│ Valor (R$): [2.500,00]                                     │
│ Frequência: [Mensal ▼]           Quantidade: [12]           │
│ Data de início: [01/10/2026]    Ativo: [Sim ▼]              │
│                                      [Criar transação]      │
└─────────────────────────────────────────────────────────────┘
```

### Mockup 4 — Erro de validação e carregamento

```text
┌─────────────────────────────────────────────────────────────┐
│ Criar transação                                             │
│ Valor (R$): [0,00]                                         │
│ [ERRO: informe um valor válido maior que zero]             │
│                                    [Criar transação]        │
├─────────────────────────────────────────────────────────────┤
│ Overlay de carregamento:                                   │
│                Carregando...  [indicador]                   │
└─────────────────────────────────────────────────────────────┘
```

*A redação do erro é ilustrativa; o texto exato é determinado pelos schemas e pelo JavaScript.*

### Mockup 5 — Listagem do usuário (transações)

```text
┌─────────────────────────────────────────────────────────────┐
│ Minhas transações financeiras                              │
│ [● Transações] [○ Recorrências]                            │
│ Nome ou ID: [________________] [Pesquisar] [Filtrar]        │
├─────────┬────────────┬────────┬────────┬───────────────────┤
│ ID      │ Nome       │ Valor  │ Status │ Opções            │
├─────────┼────────────┼────────┼────────┼───────────────────┤
│ 101     │ Mercado    │ 120,00 │ Pago   │ [Editar] [Excluir]│
│ 102     │ Internet   │  80,00 │Pendente│ [Editar] [Excluir]│
└─────────┴────────────┴────────┴────────┴───────────────────┘
```

### Mockup 6 — Listagem do usuário (recorrências) e filtros

```text
┌─────────────────────────────────────────────────────────────┐
│ Minhas transações financeiras                              │
│ [○ Transações] [● Recorrências]                            │
│ Nome ou ID: [________________] [Pesquisar] [Filtrar]        │
│ RECORRÊNCIAS — registros vinculados à conta do usuário     │
│ [Editar] [Excluir]                                          │
├─────────────────────────────────────────────────────────────┤
│ Filtros avançados                               [X]        │
│ Contas financeiras: [Adicionar conta]                      │
│ Períodos / categorias / situação (conforme modo)            │
│                                      [Aplicar filtros]     │
└─────────────────────────────────────────────────────────────┘
```

### Mockup 7 — Editar transação do usuário (pendente)

```text
┌─────────────────────────────────────────────────────────────┐
│ Editar transação                               [Voltar]    │
│ ID: [102 — somente leitura]                                 │
│ Nome: [Internet]       Descrição: [___________]             │
│ Tipo: [Saida ▼]        Conta origem: [_______ ▼]            │
│ Categoria: [________ ▼] Valor: [80,00]                      │
│ Status: [Pendente ▼]  Datas: [_______________]              │
│                  [Salvar alterações]  [PAGAR]               │
└─────────────────────────────────────────────────────────────┘
```

### Mockup 8 — Editar recorrência do usuário

```text
┌─────────────────────────────────────────────────────────────┐
│ Editar transação / recorrência                 [Voltar]     │
│ ID recorrência: [33 — somente leitura]                      │
│ Nome: [Assinatura]         Modalidade: [Periódico]          │
│ Tipo: [Saida ▼]            Conta: [________ ▼]              │
│ Categoria: [________ ▼]     Valor: [45,00]                  │
│ Frequência: [Mensal]       Ativa: [Sim ▼]                   │
│                               [Salvar alterações]          │
└─────────────────────────────────────────────────────────────┘
```

### Mockup 9 — Listagem administrativa

```text
┌─────────────────────────────────────────────────────────────┐
│ Gerenciar transações financeiras                           │
│ Usuário-alvo: [________________]                            │
│ [● Transações] [○ Recorrências]                            │
│ Nome ou ID: [________________] [Pesquisar] [Filtrar]        │
├─────────┬────────────┬────────┬────────┬───────────────────┤
│ ID      │ Nome       │ Valor  │ Status │ Opções            │
│ 245     │ Compra     │ 155,00 │ Pago   │ [Editar] [Excluir]│
└─────────┴────────────┴────────┴────────┴───────────────────┘
```

### Mockup 10 — Editar transação ou recorrência como administrador

```text
┌─────────────────────────────────────────────────────────────┐
│ Editar transação                               [Voltar]    │
│ Usuário / registro identificado pelo contexto             │
│ ID da transação: [somente leitura]                          │
│ Nome: [____________________]                                │
│ Tipo: [Entrada/Saida/Transferencia ▼]                      │
│ Conta origem/destino: [_____________ ▼]                    │
│ Categoria: [_____________ ▼]    Valor: [_________]         │
│ Situação: [Pago/Pendente ▼]     Datas: [___________]        │
│                               [Salvar alterações]          │
└─────────────────────────────────────────────────────────────┘
```

### Mockup 11 — Confirmação de exclusão e resultado

```text
┌─────────────────────────────────────────────┐
│ Confirmar exclusão                          │
│ Tem certeza que deseja excluir o registro?  │
│              [Cancelar] [Confirmar]        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Resultado da operação                       │
│ Mensagem de sucesso ou erro                 │
│                             [Continuar]    │
└─────────────────────────────────────────────┘
```

### Mockup 12 — Listagem sem registros

```text
┌─────────────────────────────────────────────┐
│ Minhas transações financeiras              │
│ [Transações] [Recorrências]                │
│ [Pesquisar] [Filtrar]                     │
│ Não há registros para os filtros aplicados.│
└─────────────────────────────────────────────┘
```

### Estados, navegação e elementos

| Estado     | Indicação                                                       | Critério de verificação   |
| ---------- | --------------------------------------------------------------- | ------------------------- |
| Vazio      | Formulário sem preenchimento ou lista sem resultados            | Carregar tela sem dados   |
| Preenchido | Entradas válidas selecionadas                                   | Digitação e preenchimento |
| Erro       | Mensagens em elementos `erro-*` e overlay                       | Envio de valor inválido   |
| Carregando | `loading-overlay` e campos/botões temporariamente desabilitados | Chamada API retardada     |
| Sucesso    | `resultado-overlay`/mensagem da operação                        | Persistência válida       |

**Navegação identificada:** `/tela-principal/criar-transacao`, `/tela-principal/listar-transacoes`, `/tela-principal/editar-transacao`, `/tela-admin/listar-transacoes`, `/tela-admin/editar-transacao`. As URLs de edição usam contexto de transação ou recorrência recebido pelo frontend; verificar parâmetros concretos ao executar.  
**Elementos e acessibilidade:** `label`, `select`, `radio`, `aria-describedby`, mensagens `aria-live`, tabela com `thead` e `tbody`, botões Pesquisar/Filtrar/Salvar/PAGAR e diálogos.  
**Responsividade:** presença de `viewport` e CSS compartilhado; testes físicos em 320px e 1024px ainda necessários.  
**Persistência:** os controllers gravam pelo cliente Supabase; não se conclui que o serviço remoto esteja disponível somente pela inspeção dos arquivos.  
**DDL:** `database/ddl/RF-006-Gerir-transacoes-fincanceiras.sql` registra o desenho exportado; as definições das funções invocadas precisam ser apresentadas separadamente para reprodução integral.

---

## 🏗️ 5. ARQUITETURA E ADR (15%)

### Diagrama de componentes

```text
┌──────────────────────────────────────────────────┐
│ HTML/CSS/JS                                      │
│ Criar | Listar | Editar | Administração          │
│ Proteção de página + fetch API                   │
└───────────────────────┬──────────────────────────┘
                        │ HTTP + cookie de sessão
                        ▼
┌──────────────────────────────────────────────────┐
│ Express 5 / Node.js ES Modules                  │
│ /usuario/*                 /admin/*              │
│ autenticar / somenteAdmin                       │
│ Joi / auditar / rate-limit                      │
│ transacoesController / adminTransacoesController│
└───────────────────────┬──────────────────────────┘
                        │ Supabase JS
                        ▼
┌──────────────────────────────────────────────────┐
│ Supabase PostgreSQL                              │
│ contas_bancarias | categorias | usuários         │
│ recorrencias | transacoes | saldo_conta          │
│ constraints + triggers                           │
└──────────────────────────────────────────────────┘
```

### ADR-001 — PostgreSQL/Supabase para persistência financeira

- **Status:** ACEITO na implementação.
- **Contexto:** vincular contas, categorias, transações e recorrências requer integridade referencial.
- **Decisão:** banco PostgreSQL pelo Supabase, tabelas e chaves estrangeiras.
- **Alternativas:** persistência local no browser ou banco documental.
- **Consequências:** integridade relacional; dependência de disponibilidade e do esquema remoto.

### ADR-002 — API Express separada do frontend

- **Status:** ACEITO.
- **Contexto:** cliente não pode decidir sozinho a propriedade dos dados.
- **Decisão:** controllers no backend, rotas Express e consultas via `supabase-js`.
- **Alternativas:** consultas diretamente do navegador ou servidor monolítico sem separação.
- **Consequências:** centraliza autorização; acrescenta manutenção à API.

### ADR-003 — Joi no limite das rotas

- **Status:** ACEITO.
- **Contexto:** entrada manipulável deve passar por validação server-side.
- **Decisão:** middlewares `validar(schema...)` e schemas específicos em `usuario.js`.
- **Alternativas:** validação exclusivamente no formulário.
- **Consequências:** rejeição antecipada, estrutura de erros previsível.

### ADR-004 — Separação de rotas administrativas

- **Status:** ACEITO.
- **Contexto:** administrador precisa consultar registros de terceiros sob privilégio controlado.
- **Decisão:** rotas `/admin` protegidas por `autenticar` e `somenteAdmin`.
- **Alternativas:** uma única rota com papel em payload cliente.
- **Consequências:** autorização mais explícita, duplicação parcial de controllers.

### ADR-005 — Recorrências como regras e transações como ocorrências

- **Status:** ACEITO.
- **Contexto:** não confundir um parcelamento/periodicidade com sua parcela individual.
- **Decisão:** `recorrencias` separada de `transacoes`, associadas por `id_recorrencia`.
- **Alternativas:** armazenar tudo numa só tabela, duplicando a regra.
- **Consequências:** permite edição de regra e individualização de lançamentos; requer geração coerente.

### ADR-006 — Integridade complementar por constraints e triggers

- **Status:** ACEITO quanto à modelagem; comportamento remoto não validado.
- **Contexto:** contas e status financeiros exigem vínculos válidos e saldos coerentes.
- **Decisão:** CHECKs, unicidade, FK e triggers para geração e saldo.
- **Alternativas:** atualizar saldo apenas no frontend; cálculo somente em consultas.
- **Consequências:** automações no banco precisam de testes de não duplicação e de reversão.

### ADR-007 — Saldo histórico separado

- **Status:** ACEITO quanto ao esquema exportado.
- **Contexto:** é necessário armazenar saldo por conta e dia.
- **Decisão:** tabela `saldo_conta` com `data_saldo`, `data_atualizacao` e `uq_saldo_conta_dia`.
- **Alternativas:** campo único na conta ou recalcular tudo a cada GET.
- **Consequências:** histórico consultável; lógica de atualização deve preservar unicidade.

### Tecnologias escolhidas

| Camada                 | Tecnologia presente no projeto                               | Justificativa                                 |
| ---------------------- | ------------------------------------------------------------ | --------------------------------------------- |
| Interface              | HTML5, CSS3, JavaScript nativo                               | Interface leve, sem framework de componentes  |
| API                    | Node.js com módulos ES + Express 5.2.1                       | Roteamento e controllers REST                 |
| Dados                  | Supabase JS 2.109.x + PostgreSQL                             | Persistência e consultas estruturadas         |
| Validação              | Joi 18.2.x                                                   | Schemas por operação                          |
| Autenticação           | JWT + cookies e middleware próprio                           | Identidade e sessões protegidas               |
| Auditoria              | Winston, middleware `auditar`                                | Eventos de operações                          |
| Controle de frequência | express-rate-limit                                           | Limitação de solicitações                     |
| Testes                 | Node test runner, testes utilitários, script Python indicado | Regressão; RF006 exige evidências específicas |

### Fluxo de dados

**Criação avulsa:** formulário → fetch `/usuario/criar-transacao` → autenticar → validar Joi → verificar vínculos → insert `transacoes` → triggers PostgreSQL → resposta/auditoria.  
**Criação parcelada/periódica:** formulário → `/usuario/criar-recorrencia` → insert `recorrencias` → trigger de geração → `transacoes` associadas → resposta.  
**Edição:** formulário → PATCH do registro ou da regra → update no backend → automatizações específicas PostgreSQL → resultado.  
**Saldo:** cliente → GET `/usuario/verificar-saldo?id_conta=...` → verificar pertencimento → consulta de `saldo_conta` pela última atualização → retorno.  
**Admin:** tela administrativa → `/admin/*` → autenticar/somenteAdmin → esquema Joi → controller administrativo → Supabase → resposta.

---

## 🔒 6. VALIDAÇÃO DE SEGURANÇA OWASP (12%)

*Os cinco controles abaixo descrevem mecanismos observados no repositório e propõem testes de comprovação; sem resultados executados, não devem ser apresentados como testes aprovados. As categorias OWASP são referências temáticas ao Top 10 2025, conforme o estilo da RF-005.*

### A01:2025 — Broken Access Control

**Vulnerabilidade:** acesso de usuário a transações alheias por troca de ID (IDOR).  
**Implementação observada:** autenticação no router; helpers `verificarContaBancaria`, `verificarRecorrencia` e `verificarTransacao` em controllers; `somenteAdmin` em rotas de administração.

```js
router.patch('/editar-transacao', auditar('USER_EDITAR_TRANSACAO', req => req.usuario?.id_usuario, true), limitadorGenericoSimples, autenticar, validar(schemaEditarTransacao), editarTransacao);
```

**Teste:** usar ID válido pertencente a outro usuário; esperar bloqueio, sem alteração no banco. Confirmar cada operação, inclusive exclusões.

### A05:2025 — Injection

**Vulnerabilidade:** entrada não confiável ser interpretada como comando ou filtro indiscriminado.  
**Implementação:** validação Joi em rotas e filtros via métodos do cliente Supabase, evitando concatenação de SQL em texto arbitrário nos controllers observados.

```js
const { data: saldo, error: erroSaldo } = await supabase
    .from('saldo_conta')
    .select('saldo')
    .eq('id_conta', id_conta)
    .order('data_atualizacao', { ascending: false })
    .limit(1)
    .maybeSingle()
```

**Teste:** strings inválidas e payloads típicos de injeção em IDs/filtros; esperar recusa ou interpretação literal, sem alteração de registros.

### A07:2025 — Authentication Failures

**Vulnerabilidade:** acesso indevido por sessão ausente, inválida ou expirada.  
**Implementação:** middleware `autenticar` nas rotas privadas e `somenteAdmin` nas rotas privilegiadas.

```js
router.get('/listar-transacoes', auditar('ADMIN_LISTAR_TRANSACOES', req => req.usuario?.id_usuario, false), limitadorGenericoSimples, autenticar, somenteAdmin, validar(schemaADMIN_listarTransacoes), listarTransacoes);
```

**Teste:** chamadas anônimas, cookies inválidos e token comum em rota de admin; comparar status e ausência de leitura indevida.

### A09:2025 — Security Logging & Alerting Failures

**Vulnerabilidade:** alterações sensíveis sem trilha de auditoria.  
**Implementação:** `auditar(...)` em operações de criação, listagem, edição e exclusão.

```js
router.delete('/excluir-transacao/:id_transacao', auditar('USER_EXCLUIR_TRANSACAO', req => req.usuario?.id_usuario, true), limitadorGenericoCritico, autenticar, validar(schemaExcluirTransacao), excluirTransacao);
```

**Teste:** executar operação legítima e falha controlada, inspecionar ação, ator, recurso, resultado, request ID e timestamp no logger. **Situação:** a executar.

### 
