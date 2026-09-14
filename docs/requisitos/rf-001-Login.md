## 🎯 1. IDENTIFICAÇÃO DO REQUISITO

**ID:** RF-001  
**Título:** Sistema de Login e Recuperação de Senha  
**Tipo:** Requisito Funcional  
**Prioridade:** ALTA (É necessário estar autenticado para acessar o sistema e realizar operações vinculadas ao usuário)  
**Complexidade:** MÉDIA (estimado 5 story points)  
**Status:** Finalizado  
**Data de Criação:** 06/09/2026  
**Última Atualização:** 14/09/2026  

**Breve Descrição:**  
O sistema deve permitir a autenticação de usuários cadastrados por email e senha, além de possibilitar a redefinição da senha por meio de um código de verificação enviado ao email cadastrado.

---

## 📋 2. DESCRIÇÃO E ATORES

### Descrição Detalhada

**Por que este requisito existe?**

O sistema precisa autenticar usuários para:

- Evitar acesso indevido.
- Possibilitar o uso de diferentes usuários.
- Assegurar a segurança sobre as informações financeiras.
- Permitir que um usuário cadastrado recupere o acesso caso esqueça sua senha.

**Contexto do Negócio:**

O sistema precisa saber quem está logado para mostrar os dados referentes ao usuário e evitar vazamento de informações financeiras entre contas diferentes.

Também é necessário disponibilizar um fluxo de recuperação de senha para que um usuário cadastrado possa redefinir sua credencial sem necessidade de intervenção manual no banco de dados.

---

### Atores do Sistema

#### Usuário

- **Papel:** Realizar login ou solicitar redefinição da própria senha.
- **Responsabilidade:**
  - Inserir email e senha para autenticação.
  - Informar o email cadastrado para recuperação de senha.
  - Informar o código de verificação recebido por email.
  - Informar uma nova senha válida.
- **Permissões:**
  - ❌ CREATE (não cria usuário por meio do RF-001)
  - ✅ READ (o backend consulta os dados necessários para autenticação)
  - ✅ UPDATE (alteração da própria `senha_hash`, indiretamente pelo backend, após validação do código)
  - ❌ DELETE

#### Sistema (Ator automático)

- **Papel:** Validar credenciais, verificar códigos de recuperação e atualizar a senha do usuário.
- **Responsabilidade:**
  - Verificar se os campos obrigatórios foram preenchidos.
  - Consultar o usuário no Supabase.
  - Comparar a senha informada com o hash armazenado.
  - Gerar e enviar código de recuperação por email.
  - Validar validade e correspondência do código.
  - Gerar o hash da nova senha.
  - Atualizar `senha_hash` no banco após validação.
  - Controlar tentativas de recuperação por email.
- **Permissões:**
  - ✅ Operações necessárias sobre a tabela `usuarios`, executadas pelo backend.

---

## 🔄 3. ESPECIFICAÇÃO DE CASOS DE USO + REQUISITOS NÃO-FUNCIONAIS

### Pré-Condições

#### Login

- ✅ Usuário cadastrado no banco de dados.
- ✅ Serviço web funcionando.
- ✅ Banco de dados Supabase funcionando.

#### Recuperação de senha

- ✅ Usuário cadastrado no banco de dados.
- ✅ Email informado pertence a um usuário existente.
- ✅ Serviço web funcionando.
- ✅ Banco de dados Supabase funcionando.
- ✅ Serviço de envio de email disponível.
- ✅ Variáveis de ambiente do serviço de email configuradas.

---

### Pós-Condições (Sucesso)

#### Login

- ✅ Usuário autenticado.
- ✅ API retorna os dados básicos `id` e `nome` do usuário.

#### Recuperação de senha

- ✅ Código de recuperação enviado ao email cadastrado.
- ✅ Código validado antes da alteração da senha.
- ✅ Nova senha convertida em hash bcrypt.
- ✅ Campo `senha_hash` atualizado na tabela `usuarios`.
- ✅ Senha anterior deixa de ser válida após a atualização.
- ✅ Usuário pode retornar à tela de login e utilizar a nova senha.

---

### Pós-Condições (Falha)

- ✅ Mensagem de erro exibida ao usuário.
- ✅ Login não é autorizado quando as credenciais são inválidas.
- ✅ Senha não é alterada quando o código é inválido, expirado ou inexistente.
- ✅ Senha não é alterada quando os campos obrigatórios estão ausentes ou inválidos.
- ✅ Requisições de recuperação são bloqueadas temporariamente ao atingir o limite de tentativas.

---

### Fluxo Principal — Login

1. Usuário acessa `/login`.
2. Usuário insere o email no campo "Email".
3. Usuário insere a senha no campo "Senha".
4. Usuário pode alternar a visualização da senha pelo botão com ícone de olho.
5. Usuário aperta o botão "Enviar".
6. Frontend valida o formato básico do email e o tamanho mínimo da senha.
7. Sistema exibe overlay de carregamento.
8. Sistema envia os dados via `fetch` para `POST /login`.
9. Servidor verifica se email e senha foram informados.
10. Servidor consulta `id_usuario`, `nome` e `senha_hash` na tabela `usuarios`, filtrando pelo email.
11. Servidor recebe os dados do usuário.
12. Servidor compara a senha digitada com `senha_hash` utilizando `bcrypt.compare`.
13. Se a senha estiver correta, o servidor retorna HTTP `200`.
14. Frontend remove o overlay de carregamento.
15. Frontend exibe mensagem de login realizado com sucesso.

---

### Fluxo Alternativo A1: Campo email ou senha vazio

```text
9a.1. Sistema detecta ausência de email ou senha.
9a.2. Sistema retorna HTTP 400.
9a.3. Resposta informa que email e senha são obrigatórios.
9a.4. Usuário pode preencher os campos e tentar novamente.
```

---

### Fluxo Alternativo A2: Usuário não cadastrado

```text
10a.1. Consulta ao Supabase não encontra o email informado.
10a.2. Sistema retorna HTTP 401.
10a.3. Sistema informa "Email ou senha inválidos".
10a.4. Usuário pode tentar novamente.
```

---

### Fluxo Alternativo A3: Senha incorreta

```text
12a.1. bcrypt.compare retorna false.
12a.2. Sistema retorna HTTP 401.
12a.3. Sistema informa "Email ou senha inválidos".
12a.4. Usuário pode tentar novamente.
```

---

## Fluxo de Recuperação de Senha

### Fluxo Principal — Solicitação do Código

1. Na página `/login`, usuário clica em "Esqueci minha senha".
2. Navegador abre `/resetar-senha`.
3. Sistema apresenta o Passo 1: "Verificar Email".
4. Usuário informa o email cadastrado.
5. Frontend valida se o email foi preenchido e contém `@`.
6. Frontend exibe overlay de carregamento.
7. Frontend envia `POST /solicitar-reset-senha` com `{ email }`.
8. Backend valida o email recebido.
9. Backend verifica o controle de tentativas de recuperação para o email.
10. Backend consulta `nome` e `email` na tabela `usuarios`.
11. Backend verifica se o usuário existe.
12. Backend gera um código aleatório de 6 dígitos utilizando `gerarCodigo()`.
13. Backend salva temporariamente o código por meio de `salvarCodigo(email, codigo)`.
14. O código recebe tempo de expiração de 10 minutos.
15. Backend envia o código para o email do usuário por meio de `enviarEmail()`.
16. Servidor retorna HTTP `200`.
17. Frontend informa que o código foi enviado.
18. Após a confirmação visual, o frontend abre o Passo 2: "Redefinir Senha".

---

### Fluxo Principal — Confirmação e Alteração da Senha

1. Usuário informa o código de 6 dígitos recebido por email.
2. Usuário informa uma nova senha.
3. Frontend verifica se o código possui 6 caracteres numéricos.
4. Frontend verifica se a nova senha possui no mínimo 10 caracteres.
5. Frontend exibe overlay de carregamento.
6. Frontend envia `POST /confirmar-reset-senha` com:
   - `email`
   - `codigoDigitado`
   - `novaSenha`
7. Backend valida a presença dos dados e o tamanho mínimo da nova senha.
8. Backend verifica o controle de tentativas para o email.
9. Backend converte `codigoDigitado` para string.
10. Backend executa `validarCodigo(email, String(codigoDigitado))`.
11. Sistema confirma que o código existe, não expirou e corresponde ao código armazenado.
12. Após validação bem-sucedida, o código é removido da lista de códigos pendentes.
13. Backend gera o hash da nova senha usando `gerarHashSenha()`.
14. Backend executa `UPDATE` na tabela `usuarios`, alterando apenas `senha_hash` do registro com o email informado.
15. Backend verifica se algum usuário foi atualizado.
16. Sistema remove o registro de tentativas de recuperação do email.
17. Servidor retorna HTTP `200` com a mensagem "Senha alterada com sucesso!".
18. Frontend exibe confirmação de sucesso.
19. Após 2 segundos, o usuário é redirecionado para `/login`.

---

### Fluxo Alternativo A4: Email inválido na solicitação de reset

```text
8a.1. Backend detecta email vazio ou sem "@".
8a.2. Sistema retorna HTTP 400.
8a.3. Frontend exibe mensagem de email inválido.
8a.4. Usuário permanece no Passo 1.
```

---

### Fluxo Alternativo A5: Email não cadastrado

```text
11a.1. Consulta ao Supabase não encontra usuário para o email informado.
11a.2. Sistema retorna HTTP 404.
11a.3. Frontend exibe "Email não cadastrado".
11a.4. Usuário permanece no Passo 1.
```

---

### Fluxo Alternativo A6: Limite de tentativas atingido

```text
9a.1. Sistema detecta que o limite de tentativas do email foi atingido.
9a.2. Sistema registra bloqueio temporário de 15 minutos.
9a.3. Requisições durante o bloqueio recebem HTTP 429.
9a.4. Resposta informa o tempo restante do bloqueio em segundos.
9a.5. Após o tempo de bloqueio, o contador é reiniciado.
```

---

### Fluxo Alternativo A7: Código inexistente, incorreto ou expirado

```text
11a.1. validarCodigo identifica falha na validação.
11a.2. Possíveis motivos retornados:
       - nenhum_codigo_solicitado
       - codigo incorreto
       - codigo expirado
11a.3. Sistema retorna HTTP 400.
11a.4. Senha não é atualizada.
11a.5. Frontend exibe a mensagem associada ao código.
```

---

### Fluxo Alternativo A8: Nova senha inválida

```text
7a.1. Backend detecta nova senha ausente ou com menos de 10 caracteres.
7a.2. Sistema retorna HTTP 400.
7a.3. Senha armazenada no banco permanece inalterada.
7a.4. Usuário pode informar uma nova senha válida.
```

---

### Fluxo Alternativo A9: Falha na atualização do banco

```text
14a.1. Supabase retorna erro durante o UPDATE.
14a.2. Sistema registra o erro no console do servidor.
14a.3. Sistema retorna HTTP 500.
14a.4. Frontend informa erro ao alterar senha.
```

---

### Fluxo Alternativo A10: Usuário não encontrado no UPDATE

```text
15a.1. O UPDATE não retorna um usuário correspondente.
15a.2. Sistema retorna HTTP 404.
15a.3. Frontend informa que o usuário não foi encontrado.
15a.4. Usuário é redirecionado para a tela de login.
```

---

### Regras de Negócio (RN)

| ID | Regra |
| --- | --- |
| **RN01** | A senha nunca é armazenada em texto puro — apenas como hash bcrypt. |
| **RN02** | O sistema não retorna `senha_hash` em nenhuma resposta da API. |
| **RN03** | Toda tentativa de login exige `email` e `senha`; faltando algum dos campos, a requisição é rejeitada antes da autenticação. |
| **RN04** | Falhas de login por email inexistente ou senha incorreta retornam a mesma mensagem: `"Email ou senha inválidos"`. |
| **RN05** | Login bem-sucedido retorna somente dados básicos do usuário: `id` e `nome`. |
| **RN06** | Login depende de usuário previamente cadastrado. |
| **RN07** | A comparação de senha é realizada exclusivamente no backend usando `bcrypt.compare`. |
| **RN08** | A recuperação de senha somente prossegue quando o email informado corresponde a um usuário cadastrado. |
| **RN09** | O código de recuperação possui 6 dígitos e é armazenado temporariamente associado ao email. |
| **RN10** | O código de recuperação expira 10 minutos após sua geração. |
| **RN11** | O código é de uso único: após validação bem-sucedida, é removido dos códigos pendentes. |
| **RN12** | A nova senha deve possuir no mínimo 10 caracteres. |
| **RN13** | A senha só pode ser atualizada após validação bem-sucedida do código. |
| **RN14** | A redefinição altera somente o campo `senha_hash` do usuário correspondente ao email. |
| **RN15** | A nova senha é convertida em hash bcrypt antes do `UPDATE`. |
| **RN16** | O código digitado é convertido para string no backend antes da comparação. |
| **RN17** | O controle de tentativas de reset é mantido por email em memória no processo do servidor. |
| **RN18** | O limite configurado é de 3 tentativas contabilizadas por email, com bloqueio temporário de 15 minutos quando o limite é atingido. |
| **RN19** | Durante o período de bloqueio, novas tentativas recebem HTTP `429`. |
| **RN20** | Após alteração bem-sucedida da senha, o registro de tentativas do email é removido. |

---

### Requisitos Não-Funcionais (RNF)

| ID | Atributo | Requisito | Métrica | Justificativa |
| --- | --- | --- | --- | --- |
| **RNF-01** | Performance | Processar login e operações de reset em tempo compatível com o uso web normal | Tempo de resposta das rotas | Evitar espera desnecessária durante autenticação e recuperação |
| **RNF-02** | Usabilidade | Exibir feedback visual de carregamento, sucesso e erro | Presença de overlays e mensagens por etapa | Informar ao usuário o estado da operação |
| **RNF-03** | Segurança de credenciais | Armazenar senhas somente como hash bcrypt | Verificação do campo `senha_hash` | Evitar armazenamento de senha em texto puro |
| **RNF-04** | Segurança de recuperação | Código temporário com expiração de 10 minutos | Tempo registrado em `expiraEm` | Limitar o período de validade do código |
| **RNF-05** | Controle de abuso | Bloquear novas requisições após o limite configurado | HTTP `429` e bloqueio de 15 minutos | Controlar tentativas repetidas de recuperação |
| **RNF-06** | Usabilidade | Nova senha deve possuir pelo menos 10 caracteres | Validação no frontend e backend | Impedir envio de senha abaixo do tamanho mínimo definido |
| **RNF-07** | Integração | Enviar o código por serviço externo de email | Resposta da API de email | Disponibilizar o código ao usuário cadastrado |

---

## 🎨 4. PROTÓTIPO FUNCIONAL (HTML + CSS + CÓDIGO + BD + DEPLOY)

### Mockup - Tela 1: Login

```text
┌────────────────────────────────────────────────┐
│                                                │
│                   CashLand                     │
│                                                │
│  Email:  [_________________________]           │
│                                                │
│  Senha:  [_________________________] [👁]      │
│                                                │
│  Esqueci minha senha                           │
│  Cadastrar novo usuario                        │
│                                                │
│                  [ Enviar ]                    │
│                                                │
└────────────────────────────────────────────────┘
```

---

### Mockup - Tela 2: Login em Processamento

```text
┌────────────────────────────────────────────────┐
│                                                │
│              ┌───────────────────┐             │
│              │ Carregando... ⟳   │             │
│              └───────────────────┘             │
│                                                │
└────────────────────────────────────────────────┘
```

---

### Mockup - Tela 3: Resultado do Login

```text
┌────────────────────────────────────────────────┐
│                                                │
│       Login realizado com sucesso              │
│                                                │
│              [ Continuar ]                     │
│                                                │
└────────────────────────────────────────────────┘
```

Em caso de erro de autenticação, o mesmo overlay apresenta:

```text
Email ou senha inválidos
```

---

### Mockup - Tela 4: Recuperação de Senha — Passo 1

```text
┌────────────────────────────────────────────────┐
│               🔐 Redefinir Senha               │
│                                                │
│        Passo 1 de 2: Verificar Email           │
│                                                │
│  Email: [___________________________]           │
│                                                │
│             [ Enviar Código ]                  │
│                                                │
│              Voltar para Login                 │
│                                                │
└────────────────────────────────────────────────┘
```

---

### Mockup - Tela 5: Código Enviado

```text
┌────────────────────────────────────────────────┐
│                                                │
│       Código enviado com sucesso!              │
│          Verifique seu email.                  │
│                                                │
│              [ Continuar ]                     │
│                                                │
└────────────────────────────────────────────────┘
```

Após a confirmação visual, o sistema avança automaticamente para o Passo 2.

---

### Mockup - Tela 6: Recuperação de Senha — Passo 2

```text
┌────────────────────────────────────────────────┐
│               🔐 Redefinir Senha               │
│                                                │
│        Passo 2 de 2: Redefinir Senha           │
│                                                │
│  Código:      [123456______________]           │
│                                                │
│  Nova Senha:  [••••••••••••_______]           │
│                                                │
│             [ Alterar Senha ]                  │
│                                                │
│              Usar outro email                  │
│                                                │
└────────────────────────────────────────────────┘
```

---

### Mockup - Tela 7: Senha Alterada

```text
┌────────────────────────────────────────────────┐
│                                                │
│          Senha alterada com sucesso!           │
│         Redirecionando para login...           │
│                                                │
└────────────────────────────────────────────────┘
```

O frontend redireciona para `/login` após aproximadamente 2 segundos.

---

### Descrição de Estados

#### Login

- **Estado Normal:** campos em branco, botão "Enviar" disponível.
- **Estado Preenchido:** email e senha informados.
- **Estado Senha Visível:** botão de olho altera o campo entre `password` e `text`.
- **Estado Loading:** overlay de tela cheia com texto "Carregando..." e indicador giratório.
- **Estado Erro:** overlay apresenta mensagem retornada pela API.
- **Estado Sucesso:** overlay apresenta confirmação do login.

#### Recuperação de senha

- **Passo 1:** usuário informa o email.
- **Solicitando Código:** overlay de carregamento enquanto a API processa o envio.
- **Código Enviado:** overlay informa sucesso e o sistema avança para o Passo 2.
- **Passo 2:** usuário informa código e nova senha.
- **Erro de Validação:** mensagem exibida abaixo do campo correspondente.
- **Rate Limit:** mensagem informa o tempo restante do bloqueio.
- **Senha Alterada:** overlay de sucesso seguido de redirecionamento para `/login`.

---

### Fluxo de Navegação

1. Página inicial `/` redireciona para `/login`.
2. Usuário pode:
   - Realizar login.
   - Abrir `/cadastro-usuario`.
   - Abrir `/resetar-senha`.
3. Em `/resetar-senha`, o Passo 1 solicita o email.
4. Após envio bem-sucedido do código, o sistema abre o Passo 2.
5. No Passo 2, usuário informa código e nova senha.
6. Após alteração bem-sucedida, o navegador retorna para `/login`.
7. O link "Usar outro email" limpa o estado da confirmação e retorna ao Passo 1.

---

### Responsividade

#### Login

- O card principal possui largura fixa de `320px`.
- O conteúdo permanece centralizado pela `.container`.

#### Reset de senha

- O card usa `width: 100%` e `max-width: 400px`.
- A página utiliza `padding: 20px`.
- O formulário permanece centralizado em diferentes larguras de viewport.

---

## 🏗️ 5. ARQUITETURA E ADR

### Diagrama de Componentes

```text
┌─────────────────────────────────────────────┐
│            Frontend - RF-001                │
│                                             │
│ /login                                      │
│ • Formulário email/senha                    │
│ • Mostrar/ocultar senha                     │
│ • Link "Esqueci minha senha"                │
│                                             │
│ /resetar-senha                              │
│ • Passo 1: solicitar código                 │
│ • Passo 2: código + nova senha              │
│ • Validação client-side                     │
└──────────────────────┬──────────────────────┘
                       │ fetch / JSON
                       ▼
┌─────────────────────────────────────────────┐
│          API REST - Servidor.js             │
│          Node.js 20 + Express 5             │
│                                             │
│ POST /login                                 │
│ POST /solicitar-reset-senha                 │
│ POST /confirmar-reset-senha                 │
│                                             │
│ • Rate limit em memória por email           │
│ • Consulta e UPDATE no Supabase             │
└───────────────┬────────────────┬────────────┘
                │                │
                │                │ importa
                ▼                ▼
┌────────────────────────┐  ┌────────────────────────┐
│ Autenticacao.js        │  │ Email.js (RF-002)      │
│                        │  │                        │
│ • gerarHashSenha       │  │ • gerarCodigo         │
│ • validarSenha         │  │ • salvarCodigo        │
│ • bcrypt               │  │ • validarCodigo       │
└────────────────────────┘  │ • enviarEmail          │
                            └───────────┬────────────┘
                                        │ HTTPS
                                        ▼
                            ┌────────────────────────┐
                            │ API de Email - Brevo   │
                            │ • envio do código      │
                            └────────────────────────┘

                       ┌─────────────────────────────┐
                       │ Supabase / PostgreSQL       │
                       │                             │
                       │ tabela usuarios             │
                       │ • id_usuario                │
                       │ • nome                      │
                       │ • email                     │
                       │ • senha_hash                │
                       └─────────────────────────────┘
```

---

## ADR — Registro de Decisões de Arquitetura

### ADR-001: Supabase como camada de banco de dados

**Status:** ACEITO

**Contexto:** O projeto precisa de um banco relacional para armazenar os usuários e permitir consulta e atualização das credenciais.

**Decisão:** Utilizar Supabase (PostgreSQL gerenciado) por meio de `@supabase/supabase-js`.

**Consequências:** O backend realiza consultas e atualizações utilizando o SDK do Supabase e mantém a credencial de acesso ao banco no servidor.

---

### ADR-002: bcrypt para hash de senhas

**Status:** ACEITO

**Contexto:** Senhas não podem ser armazenadas em texto puro.

**Decisão:** Utilizar `bcrypt` com `saltRounds = 10` para gerar hash e `bcrypt.compare` para validar a senha durante o login.

**Consequências:** Tanto a criação de senha quanto a redefinição armazenam apenas o hash no campo `senha_hash`.

---

### ADR-003: Backend como Web Service no Render

**Status:** ACEITO

**Contexto:** Autenticação e atualização de senha exigem lógica de servidor, acesso ao banco e proteção das credenciais externas.

**Decisão:** Executar a aplicação como Web Service Node.js.

**Consequências:** Frontend e API são disponibilizados pelo mesmo processo Express.

---

### ADR-004: Frontend servido pelo próprio Express

**Status:** ACEITO

**Contexto:** O frontend do login e do reset precisa ser disponibilizado junto da API.

**Decisão:** Utilizar `Express.static`:

```javascript
app.use('/login', Express.static(path.join(__dirname, 'public')));
app.use('/resetar-senha', Express.static(path.join(__dirname, 'public/reset-senha')));
```

**Consequências:** O fluxo de login e recuperação é servido pelo mesmo backend.

---

### ADR-005: Mensagem genérica na autenticação

**Status:** ACEITO

**Contexto:** Login possui dois casos de falha principais: email não encontrado e senha incorreta.

**Decisão:** Ambos retornam:

```text
Email ou senha inválidos
```

com HTTP `401`.

**Consequências:** O frontend recebe o mesmo tratamento nos dois casos.

---

### ADR-006: Código temporário por email para redefinição de senha

**Status:** ACEITO

**Contexto:** Antes de atualizar a senha, o sistema precisa validar que o usuário possui acesso ao email cadastrado.

**Decisão:** Reutilizar as funções existentes em `Email.js` para gerar, salvar, enviar e validar um código temporário de 6 dígitos.

**Implementação:**

```javascript
const codigo = gerarCodigo();
salvarCodigo(email, codigo);
```

Na confirmação:

```javascript
const resultado = validarCodigo(
    email,
    String(codigoDigitado)
);
```

**Consequências:**

- Código associado ao email.
- Expiração após 10 minutos.
- Remoção do código após uso válido.

---

### ADR-007: Reutilização do módulo de email do RF-002

**Status:** ACEITO

**Contexto:** O projeto já possui funções para envio de email e validação de códigos.

**Decisão:** O RF-001 importa:

```javascript
import {
    enviarEmail,
    gerarCodigo,
    salvarCodigo,
    validarCodigo
} from '../rf-002-Cadastro_usuario/Email.js';
```

**Consequências:** O mesmo mecanismo de código e envio de email é utilizado pelo cadastro e pela recuperação de senha.

---

### ADR-008: Rate limit em memória por email no reset de senha

**Status:** ACEITO

**Contexto:** As rotas de recuperação precisam controlar tentativas repetidas.

**Decisão:** Manter um `Map` no processo do servidor:

```javascript
const tentativasResetSenha = new Map();
const LIMITE_TENTATIVAS = 3;
const TEMPO_BLOQUEIO_MS = 15 * 60 * 1000;
```

O controle é consultado tanto em:

```text
POST /solicitar-reset-senha
```

quanto em:

```text
POST /confirmar-reset-senha
```

**Consequências:**

- Controle associado ao email.
- Bloqueio temporário de 15 minutos após o limite.
- Resposta HTTP `429` durante o bloqueio.
- Registro removido após redefinição bem-sucedida.

---

### ADR-009: Atualização somente do hash durante recuperação

**Status:** ACEITO

**Contexto:** A recuperação de senha não deve recriar o usuário nem modificar seus outros dados.

**Decisão:** Executar:

```javascript
const { data: usuarioAtualizado, error } = await supabase
    .from('usuarios')
    .update({
        senha_hash: novaSenhaHash
    })
    .eq('email', email)
    .select('id_usuario')
    .maybeSingle();
```

**Consequências:** Apenas `senha_hash` é alterado para o usuário correspondente.

---

## Tecnologias Escolhidas

| Camada | Tecnologia | Versão / Uso | Justificativa no projeto |
| --- | --- | --- | --- |
| Frontend | HTML5 + CSS3 | — | Formulários de login e recuperação |
| Frontend | JavaScript | ES2015+ | `fetch`, validação e controle das interfaces |
| Backend | Node.js | 20 | Runtime do servidor |
| Backend | Express | 5 | Rotas e arquivos estáticos |
| Banco de dados | Supabase / PostgreSQL | — | Armazenamento dos usuários |
| Hash | bcrypt | `saltRounds = 10` | Geração e validação de hash |
| Email | Brevo API | HTTPS REST | Envio dos códigos de verificação |
| Documentação API | swagger-ui-express | — | Disponibilização da interface `/api-docs` |
| CORS | cors | — | Configuração de origem permitida |
| Realtime transport | ws | — | Transporte configurado no cliente Supabase |
| Variáveis de ambiente | dotenv | — | Carregamento de credenciais e configurações |
| Hospedagem | Render | Web Service | Execução do processo Node.js |

---

## Fluxo de Dados — Login

1. Frontend envia `POST /login` com `{ email, senha }`.
2. Express valida presença dos campos.
3. Backend consulta `usuarios` por email.
4. Supabase retorna `id_usuario`, `nome` e `senha_hash`.
5. `validarSenha()` executa `bcrypt.compare`.
6. Senha incorreta ou usuário inexistente → HTTP `401`.
7. Senha correta → HTTP `200` com `id` e `nome`.

---

## Fluxo de Dados — Recuperação de Senha

### Solicitação

1. Frontend envia `POST /solicitar-reset-senha`.
2. Backend valida email.
3. Rate limit do email é verificado.
4. Backend consulta o usuário no Supabase.
5. Backend gera código de 6 dígitos.
6. `salvarCodigo()` registra o código e a expiração.
7. `enviarEmail()` chama a API do Brevo.
8. Backend retorna HTTP `200`.

### Confirmação

1. Frontend envia `POST /confirmar-reset-senha`.
2. Backend valida os campos.
3. Rate limit do email é verificado.
4. `validarCodigo()` confirma código e expiração.
5. `gerarHashSenha()` cria o novo hash bcrypt.
6. Supabase executa `UPDATE senha_hash`.
7. Backend remove o controle de tentativas do email.
8. Backend retorna HTTP `200`.
9. Frontend redireciona para `/login`.

---

## 🔒 6. VALIDAÇÃO DE SEGURANÇA OWASP

### A04:2025 — Cryptographic Failures

**Vulnerabilidade:** Armazenar senhas em texto puro permitiria a exposição direta das credenciais em caso de acesso indevido ao banco.

**Implementação:**

```javascript
// Autenticacao.js
async function gerarHashSenha(senhaTextoPuro) {
    const saltRounds = 10;

    return await bcrypt.hash(
        senhaTextoPuro,
        saltRounds
    );
}
```

No reset de senha:

```javascript
const novaSenhaHash = await gerarHashSenha(novaSenha);

await supabase
    .from('usuarios')
    .update({
        senha_hash: novaSenhaHash
    })
    .eq('email', email);
```

A nova senha não é gravada diretamente na tabela.

**Teste:**

```text
Nova senha informada:
minhaSenha123

Valor armazenado:
$2b$10$...

Resultado esperado:
senha original não aparece em texto puro na coluna senha_hash.
```

---

### A07:2025 — Identification and Authentication Failures

#### Login

**Implementação:**

```javascript
if (error) {
    return res.status(401).json({
        mensagem: 'Email ou senha inválidos'
    });
}

const senhaCorreta = await validarSenha(
    senha,
    usuario.senha_hash
);

if (!senhaCorreta) {
    return res.status(401).json({
        mensagem: 'Email ou senha inválidos'
    });
}
```

O sistema utiliza a mesma mensagem para falhas de autenticação.

---

#### Recuperação de senha

A senha só é atualizada depois da validação do código:

```javascript
const resultado = validarCodigo(
    email,
    String(codigoDigitado)
);

if (!resultado.valido) {
    return res.status(400).json({
        mensagem: resultado.motivo
    });
}
```

O código possui expiração:

```javascript
const TEMPO_EXPIRACAO_MS = 10 * 60 * 1000;
```

Após validação correta, o código é removido:

```javascript
codigosPendentes.delete(email);
```

O fluxo também possui controle de tentativas:

```javascript
const LIMITE_TENTATIVAS = 3;
const TEMPO_BLOQUEIO_MS = 15 * 60 * 1000;
```

Durante o bloqueio:

```javascript
return res.status(429).json({
    mensagem: verificacaoRateLimit.motivo
});
```

---

### A05:2021 — Injection

**Vulnerabilidade:** Construir consultas SQL concatenando diretamente valores recebidos do usuário poderia permitir alteração da consulta.

**Implementação no login:**

```javascript
const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id_usuario, nome, senha_hash')
    .eq('email', email)
    .single();
```

**Implementação no reset:**

```javascript
const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('nome, email')
    .eq('email', email)
    .maybeSingle();
```

**UPDATE da senha:**

```javascript
const { data: usuarioAtualizado, error } = await supabase
    .from('usuarios')
    .update({
        senha_hash: novaSenhaHash
    })
    .eq('email', email)
    .select('id_usuario')
    .maybeSingle();
```

Os valores são fornecidos ao query builder do SDK do Supabase, sem concatenação manual de comandos SQL.

---

## Resumo das Rotas do RF-001

| Método | Rota | Função |
| --- | --- | --- |
| `GET` | `/` | Redireciona para `/login` |
| `GET` | `/login` | Disponibiliza a interface de login |
| `GET` | `/resetar-senha` | Disponibiliza a interface de recuperação de senha |
| `POST` | `/login` | Autentica email e senha |
| `POST` | `/solicitar-reset-senha` | Verifica o email e envia o código de recuperação |
| `POST` | `/confirmar-reset-senha` | Valida o código e atualiza `senha_hash` |
| `GET` | `/api-docs` | Disponibiliza a interface Swagger UI |

---

## Respostas HTTP — Recuperação de Senha

### `POST /solicitar-reset-senha`

| Status | Situação |
| --- | --- |
| `200` | Código enviado por email |
| `400` | Email inválido ou não informado |
| `404` | Email não cadastrado |
| `429` | Limite de tentativas atingido |
| `500` | Erro ao consultar usuário ou enviar o código |

### `POST /confirmar-reset-senha`

| Status | Situação |
| --- | --- |
| `200` | Senha alterada com sucesso |
| `400` | Dados inválidos, código inexistente, incorreto ou expirado |
| `404` | Usuário não encontrado durante a atualização |
| `429` | Limite de tentativas atingido |
| `500` | Erro ao atualizar/processar a redefinição da senha |
