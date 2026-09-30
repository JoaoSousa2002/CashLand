# 3. DETALHAMENTO TÉCNICO DO REQUISITO FUNCIONAL

## 🎯 1. IDENTIFICAÇÃO DO REQUISITO (2%)

**ID:** RF-002  
**Título:** Cadastro e Gerenciamento de Usuários  
**Tipo:** Requisito Funcional  
**Prioridade:** **ALTA**, pois cria as contas utilizadas pela autenticação e relaciona cada usuário aos dados financeiros.  
**Complexidade:** **ALTA — 29 story points**  
**Status:** Implementado  
**Data de Criação:** 08/09/2026  
**Última Atualização:** 30/09/2026

**Breve Descrição:** O sistema deve cadastrar usuários após verificação do email por código, permitir consulta e atualização do próprio perfil e disponibilizar ao administrador pesquisa, edição, ativação, desativação, solicitação de reset e exclusão de contas permitidas.

### Estimativa de complexidade

- Serviço compartilhado de códigos/email: **8 SP**.
- Cadastro confirmado: **5 SP**.
- Próprio perfil: **3 SP**.
- Listagem/pesquisa administrativa: **3 SP**.
- Edição e situação da conta: **5 SP**.
- Reset administrativo: **2 SP**.
- Exclusão administrativa: **3 SP**.
- **Total: 29 SP**.

---

## 📋 2. DESCRIÇÃO E ATORES (10%)

### Descrição detalhada

A RF-002 cria e administra a identidade persistida no CashLand. Seus benefícios são: permitir auto cadastro com comprovação de acesso ao email; centralizar dados da conta; possibilitar manutenção do próprio perfil; oferecer governança administrativa sobre situação e reset das contas; e manter vínculo entre usuário e dados financeiros associados.

### Atores e permissões

#### 1. Visitante

- **Papel:** iniciar cadastro e confirmar código.
- **Permissões:** CREATE de sua futura conta somente após verificação do email.

#### 2. Usuário autenticado

- **Papel:** consultar seus dados, alterar o próprio nome e desativar a própria conta.
- **Permissões:** READ e UPDATE do próprio perfil nos campos permitidos.

#### 3. Administrador

- **Papel:** pesquisar, consultar, editar, ativar/desativar, solicitar reset e excluir contas permitidas.
- **Permissões:** READ/UPDATE/DELETE administrativo conforme regras do backend; contas Admin têm proteções específicas.

#### 4. Sistema CashLand

- **Papel:** validar dados, gerar hash, verificar códigos, persistir, auditar e aplicar permissões.

#### 5. Brevo

- **Papel:** entregar código de verificação e email de boas-vindas.

---

## 🔄 3. ESPECIFICAÇÃO DE CASOS DE USO + REQUISITOS NÃO-FUNCIONAIS (20%)

### Caso de Uso UC-002 — Cadastrar e gerenciar usuários

### Pré-condições

- Backend, Supabase e serviço de email disponíveis.
- Tabelas `usuarios` e `codigos_verificacao` criadas.
- Segredos/configuração de email disponíveis para cadastro.
- Sessão válida para operações de perfil; perfil Admin para operações administrativas.

### Pós-condições — sucesso

- Cadastro confirmado cria conta com `senha_hash` e valores padrão do banco.
- Atualizações persistem somente os campos autorizados.
- Desativação/reativação atualiza status e data de inativação.
- Reset administrativo marca a conta para redefinição na RF-001.
- Exclusão autorizada remove a conta e relacionamentos configurados com cascade.

### Pós-condições — falha

- Cadastro não é criado sem código válido.
- Dados inválidos ou duplicados não são persistidos.
- Operação administrativa sem permissão não altera a conta.
- A interface recebe mensagem apropriada para correção ou nova tentativa.

### Fluxo principal — cadastro

1. Visitante abre o formulário de cadastro.
2. Preenche nome, email e senha.
3. Frontend envia solicitação de código.
4. Joi valida os três campos.
5. Backend normaliza o email e verifica duplicidade.
6. Sistema gera código de seis dígitos.
7. HMAC do código é persistido com finalidade `cadastro` e validade de dez minutos.
8. Brevo envia o código ao email informado.
9. Frontend abre etapa de confirmação.
10. Visitante informa `codigoDigitado`.
11. Backend valida dados e consome a emissão válida de forma condicional.
12. A senha é convertida em hash bcrypt.
13. Usuário é criado no Supabase.
14. Sistema tenta enviar boas-vindas.
15. Interface confirma a criação e permite seguir ao login.

### Fluxo alternativo A1 — Email já cadastrado

1. Backend encontra conta correspondente ao email normalizado.
2. Não emite novo cadastro.
3. Retorna conflito.
4. Frontend exibe a mensagem e mantém o formulário para correção.

### Fluxo alternativo A2 — Código inválido/expirado

1. Código informado não corresponde ao HMAC/finalidade/validade esperados.
2. Consumo não é confirmado.
3. Usuário não é criado.
4. Interface apresenta o erro e permite nova ação conforme o fluxo.

### Fluxo alternativo A3 — Gerenciamento do próprio perfil

1. Usuário autenticado abre a edição.
2. Sistema carrega dados da própria conta via sessão.
3. Email é apresentado sem edição na tela comum.
4. Usuário altera nome.
5. Interface solicita confirmação de senha antes da atualização.
6. Backend valida nome e usa `id_usuario` do JWT.
7. Atualização é persistida.
8. Resultado é exibido.

### Fluxo alternativo A4 — Administração de contas

1. Admin abre a listagem de usuários.
2. Pesquisa por nome parcial ou ID.
3. Seleciona uma conta.
4. Pode editar nome/email, ativar/desativar, solicitar reset ou excluir conforme regras.
5. Backend valida sessão e perfil Admin.
6. Contas do tipo Admin são protegidas das operações de desativação/exclusão previstas.
7. Resultado é exibido e a interface atualiza os dados.

### Regras de Negócio

| ID       | Regra                                                                                |
| -------- | ------------------------------------------------------------------------------------ |
| RN002-01 | Nome: 3 a 100 caracteres após `trim`.                                                |
| RN002-02 | Email deve passar validação Joi e ser único no banco.                                |
| RN002-03 | Senha: 10 a 128 caracteres e persistida apenas em hash bcrypt.                       |
| RN002-04 | Código de confirmação contém exatamente 6 dígitos.                                   |
| RN002-05 | Código expira em 10 minutos.                                                         |
| RN002-06 | Código é separado por email e finalidade.                                            |
| RN002-07 | Cadastro depende do consumo confirmado do código.                                    |
| RN002-08 | Novo usuário recebe defaults de tipo `Comum`, status `Ativo` e reset falso no banco. |
| RN002-09 | Operações comuns usam identidade do JWT.                                             |
| RN002-10 | Operações administrativas exigem Admin.                                              |
| RN002-11 | Admin não pode ser desativado ou excluído pelas operações administrativas previstas. |
| RN002-12 | Exclusão do usuário aciona relações `ON DELETE CASCADE` definidas no banco.          |

### Requisitos Não-Funcionais

| ID        | Atributo        | Requisito                                                               | Métrica/Evidência     | Justificativa                 |
| --------- | --------------- | ----------------------------------------------------------------------- | --------------------- | ----------------------------- |
| RNF002-01 | Segurança       | Senhas e códigos não podem ser persistidos em texto puro.               | bcrypt + HMAC         | Protege segredos armazenados. |
| RNF002-02 | Usabilidade     | Formulários devem exibir validação por campo e resultado.               | mensagens/overlays    | Facilita correção.            |
| RNF002-03 | Responsividade  | Tabelas administrativas devem permanecer utilizáveis em viewport menor. | contêiner com rolagem | Mantém acesso aos dados.      |
| RNF002-04 | Rastreabilidade | Alterações relevantes devem gerar auditoria.                            | Winston/middlewares   | Permite histórico técnico.    |

---

## 🎨 4. PROTÓTIPO FUNCIONAL (40%)

### Arquivos de interface

- `cadastrar_usuario.html`
- `editar_usuario.html`
- `ADMIN_listar_usuarios.html`
- `ADMIN_editar_usuario.html`

### Mockup — Tela 1: Cadastro vazio

```text
┌────────────────────────────────────────┐
│ CashLand                       [Voltar] │
│ Cadastro de usuário                    │
│ Nome  [____________________________]   │
│ Email [____________________________]   │
│ Senha [__________________________ 👁]   │
│               [ ENVIAR ]               │
└────────────────────────────────────────┘
```

### Mockup — Cadastro preenchido

```text
┌────────────────────────────────────────┐
│ Nome  [João Victor________________] ✓  │
│ Email [joao@email.com_____________] ✓  │
│ Senha [••••••••••________________] ✓   │
│               [ ENVIAR ]               │
└────────────────────────────────────────┘
```

### Mockup — Confirmação do código

```text
┌────────────────────────────────────────┐
│ Digite o código enviado ao seu email   │
│ Código [123456]                        │
│        [ CONFIRMAR ] [ CANCELAR ]       │
└────────────────────────────────────────┘
```

### Mockup — Estado loading

```text
┌────────────────────────────────────────┐
│         Criando sua conta...           │
│                   ⟳                    │
│              Aguarde...                │
└────────────────────────────────────────┘
```

### Mockup — Estado erro

```text
┌────────────────────────────────────────┐
│ ⚠ Dados inválidos                      │
│ Email [email-invalido_____________] ✗  │
│ Informe um endereço de e-mail válido.  │
│               [ ENVIAR ]               │
└────────────────────────────────────────┘
```

### Mockup — Estado sucesso

```text
┌────────────────────────────────────────┐
│ ✓ Usuário cadastrado com sucesso       │
│              [ CONTINUAR ]             │
└────────────────────────────────────────┘
```

### Mockup — Tela 2: Edição do próprio usuário

```text
┌──────────────────────────────────────────────┐
│ CashLand | Gerir categorias | Perfil | Sair │
│ Atualizar dados                    [Voltar]  │
│ Nome  [João Victor____________________]      │
│ Email [joao@email.com_____________] (bloq.) │
│ [ ATUALIZAR ] [ RESETAR SENHA ]              │
│ [ DESATIVAR CONTA ]                          │
│ [ Categorias financeiras ]                   │
└──────────────────────────────────────────────┘
```

### Mockup — Tela 3: Listagem administrativa de usuários

```text
┌──────────────────────────────────────────────────────────┐
│ CashLand | Gerir usuários | Gerir categorias | Sair     │
│ Pesquisar [Nome ou ID________________] [Pesquisar]       │
│ ID | Nome | Email | Tipo | Status | Datas | Ações       │
│ 21 | ...  | ...   | ...  | ...    | ...   | Editar Excl│
└──────────────────────────────────────────────────────────┘
```

### Mockup — Tela 4: Edição administrativa

```text
┌────────────────────────────────────────────┐
│ Editar usuário                             │
│ ID     [21]                                │
│ Nome   [_______________________________]   │
│ Email  [_______________________________]   │
│ Status [Ativo] | Tipo [Comum]              │
│ [Salvar] [Resetar senha] [Ativar/Desativar]│
│ [Categorias financeiras]                   │
└────────────────────────────────────────────┘
```

### Mockup — Confirmação de exclusão

```text
┌────────────────────────────────────────────┐
│ Tem certeza que deseja deletar             │
│ PERMANENTEMENTE esse usuário?              │
│ Essa ação não poderá ser desfeita          │
│        [ CONTINUAR ] [ CANCELAR ]           │
└────────────────────────────────────────────┘
```

### Descrição de estados

- **Vazio:** formulário inicial.
- **Preenchido:** campos válidos antes do envio.
- **Erro:** validação Joi/API associada ao campo ou operação.
- **Loading:** interface bloqueia/indica processamento durante requisição.
- **Sucesso:** confirmação de cadastro/atualização/ação administrativa.

### Fluxo de navegação

Cadastro → confirmação → login. Usuário autenticado → perfil próprio → atualização/desativação/categorias. Admin → listagem → edição → ações administrativas/categorias.

### Responsividade

O `template.css` compartilhado define cartões e formulários adaptáveis; listagens administrativas usam área rolável para preservar colunas em telas menores.

---

## 🏗️ 5. ARQUITETURA E ADR (15%)

### Diagrama de Componentes

```text
Cadastro / Perfil / Administração
              │ fetch + cookie
              ▼
       Express / Servidor.js
       ├─ Joi / validar.js
       ├─ autenticar / somenteAdmin
       ├─ Autenticacao.js → bcrypt
       ├─ Email.js → código/HMAC/Brevo
       ├─ AuditoriaRota.js
       └─ Supabase
          ├─ usuarios
          └─ codigos_verificacao
```

### ADR-001 — Verificação de email antes do cadastro

**Status:** ACEITO.  
**Contexto:** conta não deve ser criada sem comprovação de acesso ao email.  
**Decisão:** código de 6 dígitos com finalidade `cadastro`.  
**Alternativas:** criar conta pendente antes da confirmação.  
**Consequências:** reduz cadastros com emails inacessíveis e adiciona dependência do serviço de email.

### ADR-002 — HMAC para códigos

**Status:** ACEITO.  
**Contexto:** código não deve ser persistido em texto puro.  
**Decisão:** armazenar HMAC-SHA256 associado a email e finalidade.  
**Alternativas:** hash simples; código puro.  
**Consequências:** segredo fica apenas no backend e o valor original não é recuperável do banco.

### ADR-003 — Validação Joi centralizada

**Status:** ACEITO.  
**Contexto:** cadastro e edição reutilizam regras de nome/email/senha/IDs.  
**Decisão:** schemas em `src/validacoes/usuario.js` e middleware `validar`.  
**Alternativas:** validação manual por rota.  
**Consequências:** consistência e respostas padronizadas de validação.

### ADR-004 — Administração protegida por JWT

**Status:** ACEITO.  
**Contexto:** operações sobre terceiros precisam de autorização forte.  
**Decisão:** combinar `autenticar` e `somenteAdmin`.  
**Alternativas:** confiar no frontend ou em parâmetro de tipo.  
**Consequências:** perfil é verificado a partir do token assinado.

### Tecnologias escolhidas

| Camada    | Tecnologia          | Justificativa                                   |
| --------- | ------------------- | ----------------------------------------------- |
| Frontend  | HTML/CSS/JS         | Formulários e listagens integrados à aplicação. |
| Backend   | Node.js + Express 5 | API REST e arquivos estáticos.                  |
| Banco     | PostgreSQL/Supabase | Unicidade, constraints e persistência.          |
| Validação | Joi                 | Regras reutilizáveis.                           |
| Email     | Brevo API           | Envio transacional de códigos/boas-vindas.      |
| Segurança | bcrypt + HMAC       | Proteção de senha e código.                     |

### Fluxo de dados

Cadastro: formulário → Joi → normalização/duplicidade → código/HMAC → Brevo → confirmação → bcrypt → `usuarios`. Gestão: cookie/JWT → autenticação/autorização → validação → consulta/alteração Supabase → auditoria → resposta à interface.

---

## 🔒 6. VALIDAÇÃO DE SEGURANÇA OWASP (10%)

### Controle 1 — Proteção de credenciais e códigos

**Vulnerabilidade:** exposição de senha/código em caso de leitura do banco.  
**Implementação:** senha com bcrypt; código com HMAC e segredo de backend; validade e consumo único.  
**Teste documentado:** inspecionar persistência e confirmar ausência de senha/código em texto puro; tentar reutilizar código.

### Controle 2 — Broken Access Control

**Vulnerabilidade:** usuário comum alterar/excluir conta de terceiro.  
**Implementação:** operações comuns derivam o ID do JWT; administrativas aplicam `somenteAdmin`; proteções específicas impedem desativação/exclusão de Admin.  
**Teste documentado:** usuário comum tenta operação administrativa e deve receber negação.

### Controle 3 — Validação de entrada

**Vulnerabilidade:** dados inesperados ou fora do contrato alcançarem a camada de persistência.  
**Implementação:** Joi valida nome, email, senha, código e IDs; middleware rejeita campos não permitidos nos schemas combinados.  
**Teste documentado:** enviar nome curto, email inválido, senha curta e ID não inteiro e confirmar HTTP 400.

---

## 📚 7. DOCUMENTAÇÃO API (SWAGGER/OPENAPI) (3%)

O arquivo `docs/api/API-SWAGGER.json` documenta as operações de cadastro, consulta e atualização do próprio usuário e as operações administrativas de usuários. A especificação descreve corpos e parâmetros, respostas HTTP, autenticação por cookie de sessão e modelos usados pela API. O Swagger UI é publicado em `/api-docs`.

A documentação desta RF mantém a explicação funcional e arquitetural sem reproduzir tabela de rotas.

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
