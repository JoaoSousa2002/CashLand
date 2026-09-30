# 3. DETALHAMENTO TÉCNICO DO REQUISITO FUNCIONAL

## 🎯 1. IDENTIFICAÇÃO DO REQUISITO (2%)

**ID:** RF-001  
**Título:** Sistema de Login, Sessão e Recuperação de Senha  
**Tipo:** Requisito Funcional  
**Prioridade:** **ALTA**, pois controla o acesso às funcionalidades autenticadas e fornece identidade para RF-002 e RF-003.  
**Complexidade:** **ALTA — 13 story points**  
**Status:** Implementado  
**Data de Criação:** 06/09/2026  
**Última Atualização:** 30/09/2026

**Breve Descrição:** O sistema deve autenticar usuários por email e senha, criar sessão por JWT armazenado em cookie, identificar o perfil de acesso, permitir confirmação da senha em operações sensíveis, encerrar a sessão e recuperar a senha mediante código enviado por email.

### Estimativa de complexidade

- Login com Joi, bcrypt, situação da conta, rate limit e JWT: **5 SP**.
- Consulta/proteção de sessão, autorização por perfil e logout: **3 SP**.
- Recuperação de senha com código, consumo único e atualização do hash: **5 SP**.
- **Total: 13 SP**.

---

## 📋 2. DESCRIÇÃO E ATORES (10%)

### Descrição detalhada

Este requisito existe para garantir que apenas contas válidas acessem os dados do CashLand, manter a identidade do usuário durante a navegação e permitir recuperação segura de acesso. Seus principais benefícios são: controlar acesso a dados financeiros; diferenciar usuário comum e administrador; reduzir exposição de credenciais; permitir recuperação de senha sem intervenção direta no banco; e fornecer identidade confiável às demais RFs.

### Atores e permissões

#### 1. Usuário comum — ator principal

- **Papel:** autenticar-se, consultar sua sessão, confirmar a própria senha, recuperar acesso e sair.
- **Responsabilidade:** fornecer credenciais válidas e proteger o acesso à própria conta.
- **Permissões:** READ da própria sessão; execução de login/logout/recuperação; sem CRUD administrativo de contas.

#### 2. Administrador — ator secundário

- **Papel:** autenticar-se e acessar funcionalidades administrativas protegidas.
- **Responsabilidade:** operar apenas após sessão válida e respeitar controles de perfil.
- **Permissões:** READ de sessão e acesso às operações administrativas autorizadas por `somenteAdmin`.

#### 3. Sistema CashLand — ator automático

- **Papel:** validar entrada, comparar hash, emitir/verificar JWT, aplicar rate limit, consultar situação da conta e auditar operações.
- **Permissões:** acesso backend necessário às tabelas e serviços do requisito.

#### 4. Serviço de email — ator externo

- **Papel:** entregar código de recuperação ao endereço cadastrado.
- **Permissões:** recebe somente os dados necessários ao envio transacional.

---

## 🔄 3. ESPECIFICAÇÃO DE CASOS DE USO + REQUISITOS NÃO-FUNCIONAIS (20%)

### Caso de Uso UC-001 — Autenticar e manter sessão

### Pré-condições

- Conta previamente cadastrada para login.
- Backend Express e Supabase disponíveis.
- `SEGREDO_JWT` configurado.
- Para recuperação, serviço de email, `SEGREDO_CODIGOS` e tabela `codigos_verificacao` disponíveis.

### Pós-condições — sucesso

- Login cria cookie `token` com JWT válido por duas horas.
- Sessão identifica `id_usuario` e `tipo`.
- Logout remove o cookie.
- Recuperação válida atualiza `senha_hash` e encerra eventual `status_reset_senha`.
- Operações são registradas pelo mecanismo de auditoria.

### Pós-condições — falha

- Nova sessão não é criada em autenticação recusada.
- Dados persistidos não são alterados quando código ou token é inválido.
- A API retorna mensagem e status HTTP coerentes com a condição encontrada.
- A tentativa permanece rastreável nos logs/auditoria aplicáveis.

### Fluxo principal

1. Usuário abre a tela de login.
2. Informa email e senha.
3. Frontend envia os dados ao backend.
4. Rate limit contabiliza a tentativa.
5. Joi valida formato de email e senha.
6. Backend consulta a conta correspondente.
7. O sistema verifica situação da conta e eventual reset administrativo pendente.
8. `bcrypt.compare` compara a senha digitada ao hash armazenado.
9. O servidor gera JWT com `id_usuario` e `tipo`, expiração de duas horas.
10. O JWT é enviado em cookie `HttpOnly`, `SameSite=Strict` e `Secure` em produção.
11. O frontend recebe nome/tipo e exibe o resultado da autenticação.
12. Usuário comum é conduzido à tela principal; administrador, à tela administrativa.
13. Páginas protegidas consultam a sessão e enviam o cookie automaticamente.
14. Ao sair, o backend limpa o cookie e o frontend retorna ao login.

### Fluxo alternativo A1 — Credenciais inválidas

1. Email inexistente ou senha incorreta é identificado no backend.
2. A API retorna mensagem genérica de credenciais inválidas.
3. Nenhum token é emitido.
4. A tela mantém o usuário no login e apresenta o resultado.

### Fluxo alternativo A2 — Conta inativa ou reset administrativo

1. Backend identifica a situação da conta.
2. Conta inativa é recusada.
3. Reset administrativo pendente retorna o estado previsto pelo backend.
4. O frontend direciona o usuário ao fluxo de redefinição quando aplicável.

### Fluxo alternativo A3 — Recuperação de senha

1. Usuário seleciona “Esqueci minha senha”.
2. Informa o email cadastrado.
3. Sistema gera código de seis dígitos e persiste seu HMAC com finalidade `recuperacao_senha` e validade de dez minutos.
4. Serviço externo envia o código.
5. Usuário informa código e nova senha.
6. O consumo do código exige email, finalidade, hash e validade correspondentes.
7. Se válido, nova senha é convertida em hash bcrypt e persistida.
8. A tela exibe sucesso e permite retornar ao login.

### Fluxo alternativo A4 — Sessão inválida

1. Uma página ou operação protegida é acessada sem cookie ou com token expirado/inválido.
2. Middleware `autenticar` rejeita a solicitação.
3. Operação protegida não é executada.
4. Frontend redireciona ou apresenta o estado de autenticação correspondente.

### Regras de Negócio

| ID       | Regra                                                                                |
| -------- | ------------------------------------------------------------------------------------ |
| RN001-01 | Senhas são persistidas como hash bcrypt; a função compartilhada usa custo 10.        |
| RN001-02 | Senha validada pelo Joi deve ter de 10 a 128 caracteres.                             |
| RN001-03 | JWT contém `id_usuario` e `tipo` e expira em 2 horas.                                |
| RN001-04 | Sessão é transportada em cookie `HttpOnly`; `SameSite=Strict`; `Secure` em produção. |
| RN001-05 | Login depende de conta ativa.                                                        |
| RN001-06 | Código de recuperação possui 6 dígitos e validade de 10 minutos.                     |
| RN001-07 | Código de recuperação usa finalidade própria e consumo único.                        |
| RN001-08 | Login e confirmação de senha têm limite de 8 requisições por IP a cada 5 minutos.    |
| RN001-09 | Operações de código aplicáveis têm limite de 8 requisições por IP a cada 15 minutos. |
| RN001-10 | Operações administrativas exigem perfil `Admin` no JWT.                              |

### Requisitos Não-Funcionais

| ID        | Atributo        | Requisito                                                                     | Métrica/Evidência                   | Justificativa                              |
| --------- | --------------- | ----------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------------ |
| RNF001-01 | Segurança       | Credenciais não devem trafegar como token legível pelo JavaScript após login. | Cookie `HttpOnly`                   | Reduz exposição do token no frontend.      |
| RNF001-02 | Segurança       | Sessões devem expirar automaticamente.                                        | JWT `expiresIn: 2h`                 | Limita duração de sessão comprometida.     |
| RNF001-03 | Usabilidade     | Interface deve indicar processamento e resultado.                             | overlays/mensagens nas telas        | Evita ações duplicadas e informa o estado. |
| RNF001-04 | Rastreabilidade | Ações relevantes devem gerar auditoria correlacionável.                       | middleware `auditar` e `LoggerHTTP` | Suporta investigação e histórico técnico.  |

---

## 🎨 4. PROTÓTIPO FUNCIONAL (40%)

### Arquivos de interface

- `tela_login.html`
- `reset_senha.html`
- `tela_principal.html`
- `tela_admin.html`
- `tela_erro_404.html`

### Mockup — Tela 1: Login vazio

```text
┌────────────────────────────────────────┐
│               CashLand                 │
│ Email [____________________________]   │
│ Senha [__________________________ 👁]   │
│ [Esqueci minha senha]                  │
│ [Cadastrar novo usuário]               │
│               [ ENVIAR ]               │
└────────────────────────────────────────┘
```

### Mockup — Tela 1: Login preenchido

```text
┌────────────────────────────────────────┐
│ Email [joao@email.com_____________] ✓  │
│ Senha [••••••••••________________] ✓   │
│               [ ENVIAR ]               │
└────────────────────────────────────────┘
```

### Mockup — Estado carregando

```text
┌────────────────────────────────────────┐
│          Processando login...          │
│                   ⟳                    │
│              Aguarde...                │
└────────────────────────────────────────┘
```

### Mockup — Estado erro

```text
┌────────────────────────────────────────┐
│ ⚠ Não foi possível autenticar          │
│ Email ou senha inválidos               │
│ Email [joao@email.com_____________]    │
│ Senha [__________________________ 👁]   │
│               [ ENVIAR ]               │
└────────────────────────────────────────┘
```

### Mockup — Estado sucesso

```text
┌────────────────────────────────────────┐
│ ✓ Login realizado com sucesso          │
│ Bem-vindo ao CashLand                  │
│              [ CONTINUAR ]             │
└────────────────────────────────────────┘
```

### Mockup — Tela 2: Recuperação de senha

```text
┌────────────────────────────────────────┐
│ CashLand                       [Voltar] │
│ Redefinir senha                        │
│ Email [____________________________]   │
│              [ CONTINUAR ]             │
├────────────────────────────────────────┤
│ Código recebido [______]               │
│ Nova senha [_____________________ 👁]   │
│        [ CONFIRMAR ] [ CANCELAR ]       │
└────────────────────────────────────────┘
```

### Mockup — Tela 3: Página principal do usuário

```text
┌──────────────────────────────────────────────────┐
│ CashLand | Gerir categorias | Nome | Perfil | Sair│
├──────────────────────────────────────────────────┤
│              Área principal do usuário           │
└──────────────────────────────────────────────────┘
```

### Mockup — Tela 4: Página principal do administrador

```text
┌──────────────────────────────────────────────────────────┐
│ CashLand | Gerir usuários | Gerir categorias | Perfil | Sair│
├──────────────────────────────────────────────────────────┤
│                 Área administrativa                      │
└──────────────────────────────────────────────────────────┘
```

### Mockup — Tela 5: Página 404

```text
┌────────────────────────────────────────┐
│              CashLand                  │
│        Página não encontrada           │
│          [ VOLTAR AO INÍCIO ]          │
└────────────────────────────────────────┘
```

### Descrição de estados

- **Vazio:** inputs sem dados, aguardando interação.
- **Preenchido:** valores presentes e validação visual do formulário.
- **Erro:** mensagem da API ou validação por campo.
- **Loading:** overlay de processamento durante `fetch`.
- **Sucesso:** confirmação visual antes do redirecionamento.

### Fluxo de navegação

1. `/login` → autenticação.
2. Usuário comum → `/tela-principal`.
3. Admin → `/tela-admin`.
4. “Esqueci minha senha” → `/resetar-senha`.
5. Logout → retorno ao login.
6. URL inexistente → tela 404.

### Responsividade

As telas reutilizam o padrão visual comum e reorganizam cabeçalho/cartões em larguras menores. Inputs e cartões usam dimensionamento adaptável, e os diálogos preservam rolagem quando necessário.

---

## 🏗️ 5. ARQUITETURA E ADR (15%)

### Diagrama de Componentes

```text
Frontend HTML/CSS/JS
        │ fetch + cookie
        ▼
Express / Servidor.js
 ├─ Joi / validar.js
 ├─ rate-limit
 ├─ autenticar / somenteAdmin
 ├─ Autenticacao.js → bcrypt + JWT
 ├─ AuditoriaRota.js / Winston
 ├─ Supabase → usuarios / codigos_verificacao
 └─ Email.js → Brevo
```

### ADR-001 — JWT assinado no backend

**Status:** ACEITO.  
**Contexto:** páginas precisam reconhecer a identidade sem confiar no frontend.  
**Decisão:** gerar JWT com `id_usuario` e `tipo`, assinado por `SEGREDO_JWT`.  
**Alternativas:** sessão server-side; token em armazenamento web.  
**Consequências:** autenticação stateless e necessidade de proteger o segredo.

### ADR-002 — Cookie HttpOnly para sessão

**Status:** ACEITO.  
**Contexto:** o navegador precisa enviar a sessão sem expor o token ao JavaScript.  
**Decisão:** cookie `token` HttpOnly, SameSite Strict e Secure em produção.  
**Alternativas:** `localStorage`; header montado manualmente.  
**Consequências:** menor exposição do token no frontend e dependência de configuração de cookies/CORS.

### ADR-003 — bcrypt para senhas

**Status:** ACEITO.  
**Contexto:** senha não pode ser persistida em texto puro.  
**Decisão:** usar bcrypt para gerar e comparar hashes.  
**Alternativas:** outros KDFs de senha.  
**Consequências:** verificação segura com custo computacional intencional.

### ADR-004 — Serviço compartilhado de códigos

**Status:** ACEITO.  
**Contexto:** cadastro e recuperação precisam de verificação por email.  
**Decisão:** reutilizar `Email.js`, HMAC e finalidades distintas.  
**Alternativas:** serviços independentes por RF.  
**Consequências:** menos duplicação e necessidade de manter separação por finalidade.

### Tecnologias escolhidas

| Camada       | Tecnologia                   | Justificativa                               |
| ------------ | ---------------------------- | ------------------------------------------- |
| Frontend     | HTML/CSS/JavaScript          | Interface web simples integrada ao Express. |
| Backend      | Node.js + Express 5          | API e páginas no mesmo runtime JavaScript.  |
| Autenticação | jsonwebtoken + cookie-parser | JWT assinado e sessão por cookie.           |
| Hash         | bcrypt                       | Armazenamento seguro de credenciais.        |
| Validação    | Joi                          | Schemas reutilizáveis no backend.           |
| Banco        | PostgreSQL/Supabase          | Persistência relacional e constraints.      |
| Auditoria    | Winston                      | Registro estruturado dos eventos.           |

### Fluxo de dados

Credenciais → validação Joi → consulta no Supabase → comparação bcrypt → geração JWT → cookie → consulta de sessão protegida → autorização por perfil → logout/expiração. Na recuperação: email → emissão HMAC/código → Brevo → confirmação → consumo do código → novo hash → Supabase.

---

## 🔒 6. VALIDAÇÃO DE SEGURANÇA OWASP (10%)

### Controle 1 — Falhas de identificação e autenticação

**Vulnerabilidade:** tentativa de acesso com credenciais inválidas, reutilização de sessão ou força bruta.  
**Implementação:** bcrypt; JWT expirável; cookie HttpOnly; validação da situação da conta; rate limit de login e confirmação.  
**Teste documentado:** tentar senha incorreta, token expirado e mais requisições do que o limite; confirmar que o backend rejeita sem criar sessão.

### Controle 2 — Controle de acesso

**Vulnerabilidade:** usuário comum acessar recurso administrativo.  
**Implementação:** `autenticar` valida o JWT e `somenteAdmin` exige `tipo === 'Admin'`.  
**Teste documentado:** enviar requisição administrativa com sessão de usuário comum e confirmar HTTP 403.

### Controle 3 — Proteção do fluxo de recuperação

**Vulnerabilidade:** adivinhar, reutilizar ou usar código para finalidade incorreta.  
**Implementação:** código de 6 dígitos armazenado como HMAC, finalidade específica, expiração de 10 minutos e consumo único.  
**Teste documentado:** usar código incorreto, expirado, consumido e código de outra finalidade; todos devem ser recusados.

---

## 📚 7. DOCUMENTAÇÃO API (SWAGGER/OPENAPI) (3%)

A especificação OpenAPI está em `docs/api/API-SWAGGER.json`, versão OpenAPI 3.0.0, e é publicada em `/api-docs`. Para esta RF, o Swagger documenta login, consulta da sessão, confirmação de senha, logout, solicitação e confirmação de recuperação de senha, incluindo corpos JSON, respostas e códigos HTTP. A autenticação das operações protegidas é baseada no cookie `token` emitido pelo login.

**Cobertura esperada nesta RF:** autenticação, sessão, recuperação e encerramento de sessão estão descritos no arquivo Swagger sem necessidade de duplicar uma tabela de rotas neste documento.

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
