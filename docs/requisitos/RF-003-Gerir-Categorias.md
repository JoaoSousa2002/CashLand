# 3. DETALHAMENTO TÉCNICO DO REQUISITO FUNCIONAL

## 🎯 1. IDENTIFICAÇÃO DO REQUISITO (2%)

**ID:** RF-003  
**Título:** Gerenciamento de Categorias Financeiras  
**Tipo:** Requisito Funcional  
**Prioridade:** **ALTA**, pois as categorias organizam os futuros lançamentos financeiros e são vinculadas individualmente a cada usuário.  
**Complexidade:** **ALTA — 21 story points**  
**Status:** Implementado para categorias  
**Data de Criação:** 24/09/2026  
**Última Atualização:** 30/09/2026

**Breve Descrição:** O sistema deve permitir que usuários autenticados criem, listem, pesquisem, editem e excluam suas próprias categorias financeiras, preservando a categoria reservada “Sem categoria”. Administradores podem consultar categorias por usuário ou ID, editar categorias e excluir categorias permitidas no contexto do usuário selecionado.

### Estimativa de complexidade

- Criar categoria com validação, duplicidade e persistência: **3 SP**.
- Listar/pesquisar categorias do próprio usuário: **3 SP**.
- Editar categoria do próprio usuário: **3 SP**.
- Excluir categoria do próprio usuário com proteção da reservada: **3 SP**.
- Listagem administrativa por usuário/categoria e navegação: **5 SP**.
- Edição/exclusão administrativa: **4 SP**.
- **Total: 21 SP**.

---

## 📋 2. DESCRIÇÃO E ATORES (10%)

### Descrição detalhada

A RF-003 organiza os dados financeiros por categorias pertencentes a uma conta específica. Seus benefícios são: permitir classificação consistente dos gastos/receitas; manter isolamento entre usuários; viabilizar busca e manutenção das classificações; fornecer uma categoria padrão para registros sem classificação específica; e permitir administração das categorias vinculadas às contas.

### Atores e permissões

#### 1. Usuário autenticado — ator principal

- **Papel:** criar, visualizar, pesquisar, editar e excluir suas categorias.
- **Responsabilidade:** informar nome/descrição válidos e operar apenas sobre suas categorias.
- **Permissões:** CREATE, READ, UPDATE e DELETE sobre categorias próprias, exceto restrições da categoria reservada.

#### 2. Administrador — ator secundário

- **Papel:** consultar categorias globalmente ou por usuário/ID, editar e excluir categorias permitidas.
- **Responsabilidade:** atuar no contexto correto do usuário selecionado.
- **Permissões:** READ/UPDATE/DELETE administrativo; criação administrativa não faz parte desta RF implementada.

#### 3. Sistema CashLand — ator automático

- **Papel:** validar sessão, perfil, campos e pertencimento; consultar/persistir no Supabase; auditar operações.
- **Permissões:** acesso backend à tabela `categorias` e relacionamento com `usuarios`.

#### 4. Banco de dados Supabase/PostgreSQL

- **Papel:** garantir PK, FK, unicidade `(id_usuario, nome)` e cascade quando o usuário é removido.

---

## 🔄 3. ESPECIFICAÇÃO DE CASOS DE USO + REQUISITOS NÃO-FUNCIONAIS (20%)

### Caso de Uso UC-003 — Gerir categorias financeiras

### Pré-condições

- Usuário cadastrado e sessão autenticada.
- Tabela `categorias` criada e relacionada à tabela `usuarios`.
- Backend e Supabase disponíveis.
- Para operações administrativas, JWT deve conter `tipo: Admin`.

### Pós-condições — sucesso

- Categoria criada recebe ID e vínculo ao usuário autenticado.
- Listagem retorna apenas categorias do usuário comum; admin pode consultar escopo administrativo.
- Edição altera nome/descrição da categoria identificada.
- Exclusão remove categoria permitida.
- Operações são registradas pelo middleware de auditoria correspondente.

### Pós-condições — falha

- Categoria de outro usuário não é alterada por operação comum.
- Categoria inexistente não é criada/alterada implicitamente.
- Nome reservado ou duplicado é recusado conforme a operação.
- A categoria “Sem categoria” não é excluída pelas operações que aplicam essa proteção.

### Fluxo principal — usuário cria e gerencia categoria

1. Usuário autenticado abre “Gerir categorias”.
2. Frontend carrega a listagem usando a sessão existente.
3. Backend usa `id_usuario` do JWT para filtrar os registros.
4. Usuário seleciona “+ Nova categoria”.
5. Preenche nome e descrição opcional.
6. Frontend valida os campos e habilita o envio quando aplicável.
7. Backend valida `nome` e `descricao` com Joi.
8. Sistema rejeita o nome reservado “Sem categoria”.
9. Sistema verifica se já existe categoria com o mesmo nome para o usuário.
10. Não havendo duplicidade, insere `id_usuario`, `nome` e `descricao` no Supabase.
11. Interface exibe confirmação e retorna à navegação de categorias.
12. Na listagem, o usuário pode pesquisar por nome ou ID.
13. Ao editar, a tela carrega ID, nome e descrição da categoria selecionada.
14. O backend confirma que o ID pertence ao usuário autenticado.
15. Após validação e verificação de duplicidade, atualiza nome/descrição.
16. Ao excluir, a interface pede confirmação e o backend verifica pertencimento e proteção da categoria reservada.
17. Operação concluída retorna mensagem de sucesso e a listagem é atualizada.

### Fluxo alternativo A1 — Nome duplicado

1. Usuário informa nome já utilizado em outra categoria própria.
2. Backend detecta duplicidade.
3. Persistência não é realizada.
4. Interface apresenta mensagem de conflito e permite correção.

### Fluxo alternativo A2 — Categoria inexistente ou de outro usuário

1. Operação comum recebe um `id_categoria`.
2. Backend consulta usando simultaneamente `id_categoria` e `id_usuario` do JWT.
3. Se não encontrar registro correspondente, a operação é recusada.
4. Nenhum dado de outro usuário é alterado.

### Fluxo alternativo A3 — Categoria reservada “Sem categoria”

1. Usuário tenta criar categoria com nome reservado ou excluir a categoria padrão.
2. Backend reconhece o nome reservado em comparação normalizada.
3. Operação é recusada.
4. Interface exibe a mensagem retornada.

### Fluxo alternativo A4 — Administração

1. Admin abre a listagem administrativa de categorias.
2. Pode filtrar por ID do usuário; a API também admite consulta por ID da categoria.
3. Resultados incluem o vínculo com usuário para contexto administrativo.
4. Admin abre edição de uma categoria selecionada.
5. Backend exige sessão e perfil Admin.
6. Edição atualiza nome/descrição da categoria existente.
7. Na exclusão, admin envia `id_categoria` e `id_usuario`; backend confirma que o par existe.
8. Categoria reservada é protegida da exclusão.

### Regras de Negócio

| ID       | Regra                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------- |
| RN003-01 | Toda categoria possui `id_usuario` obrigatório.                                                     |
| RN003-02 | O nome é obrigatório, com 3 a 100 caracteres na validação Joi.                                      |
| RN003-03 | Descrição é opcional; se preenchida, deve ter 3 a 100 caracteres.                                   |
| RN003-04 | O banco impõe unicidade do par `(id_usuario, nome)`.                                                |
| RN003-05 | Usuário comum lista/edita/exclui somente categorias associadas ao seu `id_usuario`.                 |
| RN003-06 | O nome “Sem categoria” é reservado pelo sistema na criação.                                         |
| RN003-07 | A categoria “Sem categoria” não pode ser excluída pelas operações de usuário e admin implementadas. |
| RN003-08 | Pesquisa comum admite nome parcial e ID numérico.                                                   |
| RN003-09 | Listagem comum aplica `Cache-Control: no-store`.                                                    |
| RN003-10 | Operações administrativas exigem autenticação e perfil Admin.                                       |
| RN003-11 | FK de categorias para usuários usa `ON DELETE CASCADE`.                                             |
| RN003-12 | IDs validados pelo Joi devem ser inteiros maiores ou iguais a zero.                                 |

### Requisitos Não-Funcionais

| ID        | Atributo        | Requisito                                                         | Métrica/Evidência                           | Justificativa              |
| --------- | --------------- | ----------------------------------------------------------------- | ------------------------------------------- | -------------------------- |
| RNF003-01 | Segurança       | Usuário comum não deve acessar categoria alheia por ID.           | filtro por `id_usuario` do JWT              | Isolamento de dados.       |
| RNF003-02 | Integridade     | Nome deve ser único por usuário.                                  | constraint `categorias_usuario_nome_unique` | Evita duplicidade lógica.  |
| RNF003-03 | Usabilidade     | Interfaces devem permitir pesquisar, editar e confirmar exclusão. | telas dedicadas/diálogos                    | Reduz erro de operação.    |
| RNF003-04 | Rastreabilidade | Criação/listagem/edição/exclusão devem gerar auditoria.           | `auditar(...)` nas operações                | Suporta histórico técnico. |

---

## 🎨 4. PROTÓTIPO FUNCIONAL (40%)

### Arquivos de interface

- `criar_categoria.html`
- `listar_categoria.html`
- `editar_categoria.html`
- `ADMIN_listar_categoria.html`
- `ADMIN_editar_categoria.html`

### Mockup — Tela 1: Criar categoria (vazio)

```text
┌────────────────────────────────────────────┐
│ CashLand | Gerir categorias | Perfil | Sair│
│ Criar categoria                    [Voltar]│
│ Nome:      [___________________________]   │
│ Descrição: [___________________________]   │
│            [ CRIAR CATEGORIA ]             │
└────────────────────────────────────────────┘
```

### Mockup — Criar categoria (preenchido)

```text
┌────────────────────────────────────────────┐
│ Nome:      [Alimentação_______________] ✓  │
│ Descrição: [Compras e refeições_______] ✓  │
│            [ CRIAR CATEGORIA ]             │
└────────────────────────────────────────────┘
```

### Mockup — Estado loading

```text
┌────────────────────────────────────────────┐
│          Criando categoria...              │
│                    ⟳                       │
│               Aguarde...                   │
└────────────────────────────────────────────┘
```

### Mockup — Estado erro

```text
┌────────────────────────────────────────────┐
│ ⚠ Não foi possível concluir               │
│ Já existe uma categoria com esse nome     │
│ Nome: [Alimentação____________________] ✗  │
│                 [ CONTINUAR ]              │
└────────────────────────────────────────────┘
```

### Mockup — Estado sucesso

```text
┌────────────────────────────────────────────┐
│ ✓ Categoria criada com sucesso            │
│                 [ CONTINUAR ]              │
└────────────────────────────────────────────┘
```

### Mockup — Tela 2: Listar categorias do usuário

```text
┌──────────────────────────────────────────────────────────┐
│ CashLand | Gerir categorias | Nome | Perfil | Sair      │
│ Nome ou ID [Alimentação________] [Pesquisar]             │
│                         [+ Nova categoria]               │
│ ID | Nome        | Descrição          | Ações            │
│ 1  | Alimentação | Compras/refeições  | Editar | Excluir │
└──────────────────────────────────────────────────────────┘
```

### Mockup — Confirmação de exclusão do usuário

```text
┌────────────────────────────────────────────┐
│ Deseja excluir esta categoria?             │
│        [ CONTINUAR ] [ CANCELAR ]           │
└────────────────────────────────────────────┘
```

### Mockup — Tela 3: Editar categoria do usuário

```text
┌────────────────────────────────────────────┐
│ Editar categoria                           │
│ ID da Categoria [3]                        │
│ Nome      [Alimentação________________]    │
│ Descrição [Compras do mês_____________]    │
│          [Voltar] [Salvar Alterações]      │
└────────────────────────────────────────────┘
```

### Mockup — Tela 4: Listar categorias — Admin

```text
┌──────────────────────────────────────────────────────────┐
│ CashLand | Gerir usuários | Gerir categorias | Sair     │
│ ID do usuário [21________] [Pesquisar] [Limpar filtro]   │
│ ID Cat | Usuário | Nome | Descrição | Ações             │
│ 10     | 21 João | Casa | ...       | Editar | Excluir  │
└──────────────────────────────────────────────────────────┘
```

### Mockup — Tela 5: Editar categoria — Admin

```text
┌────────────────────────────────────────────┐
│ Editar categoria                           │
│ ID da Categoria [10]                       │
│ Nome      [Casa________________________]    │
│ Descrição [Despesas residenciais______]    │
│          [Voltar] [Salvar Alterações]      │
└────────────────────────────────────────────┘
```

### Descrição de estados

- **Vazio:** criação ainda sem valores; botão depende da validação do frontend.
- **Preenchido:** nome/descrição aceitos visualmente.
- **Erro:** mensagem por campo ou overlay de resultado da API.
- **Loading:** requisição em andamento antes do retorno.
- **Sucesso:** overlay confirma criação, edição ou exclusão.

### Fluxo de navegação

Usuário: tela principal → listar categorias → criar/editar/excluir → retornar à listagem. Admin: tela administrativa → listar categorias → filtrar por usuário → editar/excluir categoria.

### Responsividade

As páginas usam o padrão visual compartilhado do CashLand, formulários em cartões e listagens com adaptação/rolagem quando o conteúdo excede a largura disponível.

---

## 🏗️ 5. ARQUITETURA E ADR (15%)

### Diagrama de Componentes

```text
Telas RF-003 (HTML/CSS/JS)
          │ fetch + cookie
          ▼
Express / Servidor.js
 ├─ autenticar
 ├─ somenteAdmin (admin)
 ├─ Joi / validar.js
 ├─ AuditoriaRota.js
 └─ Supabase/PostgreSQL
      ├─ categorias
      └─ usuarios (FK/relacionamento)
```

### ADR-001 — Categorias pertencem diretamente ao usuário

**Status:** ACEITO.  
**Contexto:** categorias financeiras são personalizadas por conta.  
**Decisão:** tabela `categorias` possui FK `id_usuario`.  
**Alternativas:** catálogo global compartilhado.  
**Consequências:** isolamento e personalização; necessidade de filtrar por usuário.

### ADR-002 — Unicidade por usuário

**Status:** ACEITO.  
**Contexto:** dois usuários podem usar o mesmo nome, mas uma conta não deve duplicar sua própria categoria.  
**Decisão:** `UNIQUE (id_usuario, nome)`.  
**Alternativas:** unicidade global ou somente validação em aplicação.  
**Consequências:** integridade garantida também no banco.

### ADR-003 — Identidade do usuário derivada do JWT

**Status:** ACEITO.  
**Contexto:** cliente não deve escolher livremente o proprietário em operações comuns.  
**Decisão:** usar `req.usuario.id_usuario` preenchido após verificação do token.  
**Alternativas:** receber ID do usuário no corpo/query.  
**Consequências:** reduz risco de acesso horizontal indevido.

### ADR-004 — Categoria reservada “Sem categoria”

**Status:** ACEITO.  
**Contexto:** registros financeiros precisam de fallback de classificação.  
**Decisão:** reservar o nome e impedir exclusão da categoria padrão nas operações implementadas.  
**Alternativas:** permitir ausência de categoria.  
**Consequências:** mantém referência padrão disponível para integrações futuras.

### Tecnologias escolhidas

| Camada    | Tecnologia           | Justificativa                                     |
| --------- | -------------------- | ------------------------------------------------- |
| Frontend  | HTML/CSS/JS          | Telas dedicadas de CRUD e pesquisa.               |
| Backend   | Express 5            | Rotas e autorização integradas às RFs anteriores. |
| Validação | Joi                  | Regras para nome, descrição e IDs.                |
| Banco     | PostgreSQL/Supabase  | FK, UNIQUE, PK e cascade.                         |
| Sessão    | JWT em cookie        | Identificação do proprietário e perfil Admin.     |
| Auditoria | Winston + middleware | Rastreabilidade das operações.                    |

### Fluxo de dados

Tela → cookie de sessão → `autenticar` → validação Joi → filtro pelo `id_usuario` do JWT (usuário comum) ou `somenteAdmin` + contexto administrativo → Supabase → resposta JSON → atualização da interface. A FK relaciona `categorias.id_usuario` a `usuarios.id_usuario`.

---

## 🔒 6. VALIDAÇÃO DE SEGURANÇA OWASP (10%)

### Controle 1 — Broken Access Control / acesso horizontal

**Vulnerabilidade:** usuário manipular um ID e editar/excluir categoria de outra conta.  
**Implementação:** consultas comuns combinam `id_categoria` com `req.usuario.id_usuario`; o proprietário vem do JWT verificado.  
**Teste documentado:** autenticar como usuário A e enviar ID de categoria do usuário B; a operação deve ser recusada/não encontrar registro correspondente.

### Controle 2 — Autorização administrativa

**Vulnerabilidade:** usuário comum chamar operação administrativa.  
**Implementação:** operações admin utilizam `autenticar` seguido de `somenteAdmin`.  
**Teste documentado:** executar chamada administrativa com JWT de tipo `Comum` e confirmar negação HTTP 403.

### Controle 3 — Validação/Integridade de entrada

**Vulnerabilidade:** valores fora do contrato, nomes duplicados ou IDs inválidos comprometerem dados.  
**Implementação:** Joi valida nome, descrição e IDs; banco aplica PK, FK e UNIQUE.  
**Teste documentado:** enviar nome curto, descrição fora do limite, ID não inteiro e nome duplicado; confirmar rejeição sem alteração indevida.

---

## 📚 7. DOCUMENTAÇÃO API (SWAGGER/OPENAPI) (3%)

O Swagger do projeto está em `docs/api/API-SWAGGER.json` e é servido em `/api-docs`. A especificação documenta as operações de categoria para usuário e administrador, seus parâmetros/corpos, respostas e códigos HTTP, além da autenticação por cookie de sessão nas operações protegidas.

Para a RF-003, o documento Swagger cobre criação, listagem/pesquisa, edição e exclusão de categorias do usuário, bem como consulta, edição e exclusão administrativas. Este documento não replica uma tabela de rotas, conforme o padrão adotado para a entrega.

---

## 📊 RESUMO DE PONTUAÇÃO

| Tópico de Avaliação                         | Peso     | Score       |
| ------------------------------------------- | --------:| -----------:|
| 1. Identificação do Requisito               | 2%       | ___/2       |
| 2. Descrição e Atores                       | 10%      | ___/10      |
| 3. Casos de Uso + Requisitos Não-Funcionais | 20%      | ___/20      |
| 4. Protótipo Funcional                      | 40%      | ___/40      |
| 5. Arquitetura e ADR                        | 15%      | ___/15      |
| 6. Validação de Segurança OWASP             | 10%      | ___/10      |
| 7. Documentação API                         | 3%       | ___/3       |
| **TOTAL POR REQUISITO**                     | **100%** | **___/100** |

**Fórmula:** `Score Total = T1 + T2 + T3 + T4 + T5 + T6 + T7` considerando os pesos definidos no modelo.

---

## ✅ CHECKLIST FINAL — PERCENTUAIS

### TÓPICO 1: IDENTIFICAÇÃO DO REQUISITO (2%)

- [x] ID do requisito presente.
- [x] Título claro e descritivo.
- [x] Prioridade definida e justificada.
- [x] Complexidade estimada em story points.

**STATUS:** ___/2

### TÓPICO 2: DESCRIÇÃO E ATORES (10%)

- [x] Descrição detalhada.
- [x] Objetivos/benefícios de negócio.
- [x] Atores identificados.
- [x] Papel e responsabilidade de cada ator.
- [x] Permissões CRUD mapeadas.

**STATUS:** ___/10

### TÓPICO 3: CASOS DE USO + RNF (20%)

- [x] Pré-condições.
- [x] Pós-condições de sucesso e falha.
- [x] Fluxo principal com 8+ passos.
- [x] Mínimo de 3 fluxos alternativos.
- [x] Regras de negócio.
- [x] Requisitos não-funcionais.

**STATUS:** ___/20

### TÓPICO 4: PROTÓTIPO FUNCIONAL (40%)

- [x] Código-fonte completo presente no projeto.
- [x] Script DDL relacionado presente.
- [x] Mockups de todas as telas deste RF documentados.
- [x] Estados vazio/preenchido/erro/loading/sucesso representados na documentação.
- [x] Mensagens e validação visual descritas.
- [x] Aplicação com URL pública informada.

**STATUS:** ___/40

### TÓPICO 5: ARQUITETURA E ADR (15%)

- [x] Diagrama de componentes.
- [x] Mínimo de 4 ADRs estruturados.
- [x] Tecnologias justificadas.
- [x] Fluxo de dados documentado.

**STATUS:** ___/15

### TÓPICO 6: VALIDAÇÃO DE SEGURANÇA OWASP (10%)

- [x] Controle(s) OWASP descrito(s).
- [x] Vulnerabilidade, implementação e teste documentados.
- [x] Código/arquitetura de proteção identificado no projeto.

**STATUS:** ___/10

### TÓPICO 7: DOCUMENTAÇÃO API (3%)

- [x] Swagger/OpenAPI presente.
- [x] Operações do requisito documentadas no Swagger.
- [x] Requisições, respostas, códigos HTTP e autenticação descritos.

**STATUS:** ___/3

### RESULTADO FINAL POR REQUISITO

`TOTAL: ___/100 = ___%`

---

## APÊNDICE A: CHECKLIST DE PREENCHIMENTO INICIAL

- [x] Metadados preenchidos.
- [x] Estrutura do projeto documentada.
- [x] Identificação do RF preenchida.
- [x] Descrição e atores preenchidos.
- [x] Casos de uso e RNF preenchidos.
- [x] Protótipo e mockups documentados.
- [x] Arquitetura e ADR documentados.
- [x] Segurança OWASP documentada.
- [x] Swagger/OpenAPI referenciado.
- [x] Um único arquivo Markdown por requisito.
- [x] Código-fonte, DDL e deploy localizados no projeto.

---

**Documento de Requisitos v12.2 — adaptação para o projeto CashLand**  
**Laboratório de Inovação III — FACSENAC — 2026**
