# RF-002 — Cadastro de Novo Usuário

## 🎯 1. Identificação do Requisito

| Campo                  | Valor                                                |
| ---------------------- | ---------------------------------------------------- |
| **ID**                 | RF-002                                               |
| **Título**             | Cadastro de Novo Usuário no Sistema                  |
| **Tipo**               | Requisito Funcional                                  |
| **Prioridade**         | ALTA (bloqueia os demais requisitos, exceto o RF-01) |
| **Complexidade**       | MÉDIA (estimado 5 story points)                      |
| **Status**             | Concluído                                            |
| **Data de Criação**    | 08/09/2026                                           |
| **Última Atualização** | 14/09/2026                                           |

**Breve Descrição:**
O sistema deve permitir que o usuário crie um novo cadastro informando nome, email e senha. Antes da criação da conta, o sistema envia um código de verificação de 6 dígitos para o email informado. O cadastro só é concluído após a confirmação desse código, e a senha é armazenada de forma criptografada (hash).

---

## 📋 2. Descrição e Atores

### Descrição Detalhada

**Por que este requisito existe?**
O sistema precisa permitir a criação de usuários para viabilizar o login e o acesso ao restante do sistema, adicionando uma etapa de verificação do email antes da criação definitiva da conta.

**Contexto do Negócio:**
O sistema precisa saber quem está logado para mostrar os dados referentes ao usuário e evitar vazamento de informações financeiras entre contas diferentes. A verificação por código enviado ao email reduz a possibilidade de cadastro com um endereço eletrônico ao qual o usuário não possui acesso.

### Atores do Sistema

#### Usuário

- **Papel:** Realizar o cadastro e confirmar o email informado.
- **Responsabilidade:** Inserir nome, email, senha e o código de 6 dígitos recebido por email.
- **Permissões:**
  - ❌ CREATE direto no banco (a criação é feita pelo backend)
  - ✅ READ indireto (o backend consulta a tabela `usuarios` para verificar duplicidade do email)
  - ❌ UPDATE (não pode editar dados de outros)
  - ❌ DELETE (não pode deletar)

#### Sistema (ator automático)

- **Papel:** Validar os dados iniciais, verificar duplicidade do email, gerar/enviar o código de verificação, validar o código e criar o novo usuário.
- **Responsabilidade:** Garantir o fluxo de confirmação do email, armazenar a senha em hash e enviar mensagens de retorno ao usuário.
- **Permissões:**
  - ✅ Todas as operações necessárias sobre a tabela `usuarios`, executadas via chave secreta do Supabase configurada no backend.

#### Serviço de Email (Brevo)

- **Papel:** Entregar os emails transacionais do fluxo de cadastro.
- **Responsabilidade:** Enviar o código de verificação e, após a criação da conta, o email de boas-vindas.
- **Integração:** API REST `https://api.brevo.com/v3/smtp/email`, autenticada por `BREVO_API_KEY`.

---

## 🔄 3. Especificação de Casos de Uso + Requisitos Não-Funcionais

### Pré-Condições

- ✅ Serviço Web (Render) funcionando
- ✅ Banco de dados Supabase funcionando
- ✅ Variáveis de ambiente do Supabase configuradas
- ✅ `BREVO_API_KEY`, `BREVO_SENDER_NAME` e `BREVO_SENDER_EMAIL` configuradas no servidor
- ✅ Serviço da Brevo disponível para envio dos emails

### Pós-Condições (Sucesso)

- ✅ Código de verificação enviado ao email informado
- ✅ Código confirmado dentro do período de validade
- ✅ Usuário cadastrado na tabela `usuarios`
- ✅ Senha armazenada em `senha_hash` utilizando bcrypt
- ✅ Código de verificação removido após uso válido
- ✅ Email de boas-vindas enviado ou resposta HTTP 201 informando que o usuário foi criado, mas o email não foi enviado
- ✅ Possibilidade de realizar login com as credenciais criadas

### Pós-Condições (Falha)

- ✅ Mensagem de erro exibida ao usuário por campo ou em overlay, conforme a etapa
- ✅ Cadastro não é criado quando os dados obrigatórios são inválidos ou incompletos
- ✅ Cadastro não é criado quando o código informado é inválido, expirado ou inexistente
- ✅ Cadastro não avança para a etapa do código quando o email já está cadastrado
- ✅ Erro no `insert` do Supabase retorna HTTP 500 e não informa sucesso ao usuário

### Fluxo Principal

1. Usuário insere o nome no campo "Nome".
2. Usuário insere o email no campo "Email".
3. Usuário insere a senha no campo "Senha".
4. Usuário clica no botão "Enviar".
5. O frontend valida nome, email e senha.
6. O sistema exibe o overlay de carregamento.
7. O frontend envia `POST /solicitar-codigo` com `{ nome, email }`.
8. O backend verifica se nome e email foram informados e se o email contém `@` e `.com`.
9. O backend consulta a tabela `usuarios` para verificar se o email já está cadastrado.
10. Se o email não estiver cadastrado, o backend gera um código aleatório de 6 dígitos.
11. O backend armazena temporariamente o código em memória, associado ao email, com validade de 10 minutos.
12. O backend envia o código para o email do usuário por meio da API da Brevo.
13. O backend retorna HTTP 200 com a mensagem "Codigo enviado para o email!".
14. O frontend fecha o carregamento e abre o overlay para digitação do código.
15. Usuário digita o código de 6 dígitos e clica em "Confirmar".
16. O frontend envia `POST /confirmar-cadastro` com `{ nome, email, senha, codigoDigitado }`.
17. O backend valida se nome, email, senha e código foram informados, se o email contém `@` e `.com` e se a senha possui pelo menos 10 caracteres.
18. O backend valida o código associado ao email.
19. Se o código for válido, ele é removido da memória para impedir reutilização.
20. O backend gera o hash bcrypt da senha.
21. O backend executa o `insert` de `nome`, `email` e `senha_hash` na tabela `usuarios`.
22. O backend verifica o `error` retornado pelo Supabase.
23. Sem erro no `insert`, o backend tenta enviar o email de boas-vindas.
24. Se o email de boas-vindas for enviado, o backend retorna HTTP 200 com a mensagem "Cadastro realizado com sucesso, prossiga para o login!".
25. O frontend exibe o overlay de sucesso.
26. Ao clicar em "Continuar", o usuário é redirecionado para `/login`.

### Fluxo Alternativo A1: Campo vazio, senha curta ou email inválido no frontend

```
5a.1. Sistema detecta que o nome está vazio, que o email não contém "@" e ".com",
      ou que a senha possui menos de 10 caracteres.
5a.2. Sistema exibe mensagem em texto vermelho abaixo do campo correspondente.
5a.3. A requisição não é enviada enquanto os critérios do frontend não forem atendidos.
5a.4. Usuário pode corrigir os campos e tentar novamente.
```

### Fluxo Alternativo A2: Dados inválidos recebidos em `/solicitar-codigo`

```
8a.1. Backend detecta nome ausente, email ausente, email sem "@" ou sem ".com".
8a.2. Backend retorna HTTP 400 com a mensagem "Dados inválidos ou incompletos".
8a.3. Frontend exibe a mensagem em um overlay de erro.
```

### Fluxo Alternativo A3: Email já cadastrado

```
9a.1. Sistema detecta que o email já está cadastrado na tabela usuarios.
9a.2. Backend retorna HTTP 409 com a mensagem "Esse email já está cadastrado".
9a.3. Frontend exibe a mensagem em um overlay de erro.
9a.4. Usuário pode informar outro email e tentar novamente.
```

### Fluxo Alternativo A4: Falha ao enviar o código por email

```
12a.1. A API da Brevo retorna erro ou ocorre falha durante o envio.
12a.2. Backend retorna HTTP 500 com a mensagem "O envio de email falhou!".
12a.3. Frontend exibe a mensagem em um overlay de erro.
12a.4. O cadastro não avança para a confirmação enquanto um código não for enviado com sucesso.
```

### Fluxo Alternativo A5: Dados inválidos recebidos em `/confirmar-cadastro`

```
17a.1. Backend detecta nome ausente, email ausente, email sem "@" ou sem ".com",
       senha ausente, senha com menos de 10 caracteres ou código não informado.
17a.2. Backend retorna HTTP 400 com a mensagem "Dados inválidos ou incompletos".
17a.3. O usuário não é inserido no banco.
```

### Fluxo Alternativo A6: Código inexistente, incorreto ou expirado

```
18a.1. Backend procura o código associado ao email informado.
18a.2. Se não existir registro, retorna motivo "nenhum_codigo_solicitado".
18a.3. Se o prazo de 10 minutos tiver terminado, remove o registro e retorna "codigo expirado".
18a.4. Se o código digitado for diferente do armazenado, retorna "codigo incorreto".
18a.5. Backend responde HTTP 401 com o motivo da falha.
18a.6. Frontend exibe a mensagem em overlay e reabre a janela de confirmação do código após o usuário continuar.
```

### Fluxo Alternativo A7: Falha no cadastro no Supabase

```
22a.1. O Supabase retorna `error` durante o `insert` na tabela usuarios.
22a.2. Backend registra o erro no console.
22a.3. Backend retorna HTTP 500 com a mensagem "Erro ao cadastrar usuário".
22a.4. O backend não envia a resposta de cadastro concluído.
```

### Fluxo Alternativo A8: Usuário criado, mas email de boas-vindas não enviado

```
23a.1. O `insert` do usuário é concluído sem erro.
23a.2. O envio do email de boas-vindas falha.
23a.3. Backend registra a falha no console.
23a.4. Backend retorna HTTP 201 com a mensagem
       "Usuario criado, mas o email de confirmação não foi enviado".
23a.5. Frontend trata o HTTP 201 como criação concluída e exibe a mensagem retornada.
23a.6. Ao continuar, o usuário é redirecionado para `/login`.
```

### Fluxo Alternativo A9: Usuário cancela a confirmação do código

```
15a.1. Usuário decide não confirmar o código naquele momento.
15a.2. Usuário clica no botão "Cancelar".
15a.3. O overlay de confirmação é fechado.
15a.4. Os dados permanecem na tela de cadastro enquanto a página não for recarregada ou abandonada.
```

### Fluxo Alternativo A10: Usuário desiste do cadastro antes da confirmação

```
1a.1. Usuário desiste de realizar o cadastro.
1a.2. Usuário clica no botão "Voltar".
1a.3. Usuário retorna à tela de login.
```

### Regras de Negócio (RN)

| ID        | Regra                               | Descrição                                                                                                                                                                     |
| --------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RN-01** | Email não pode estar cadastrado     | Antes do envio do código, o backend consulta `usuarios`; se encontrar o email, retorna HTTP 409                                                                               |
| **RN-02** | Senha válida                        | A senha deve ter no mínimo 10 caracteres; a regra é validada no frontend e novamente em `/confirmar-cadastro`                                                               |
| **RN-03** | Nome informado                      | O usuário deve informar o nome; as rotas `/solicitar-codigo` e `/confirmar-cadastro` rejeitam nome ausente                                                                  |
| **RN-04** | Senha nunca em texto puro           | A senha é convertida em hash bcrypt antes do `insert`; o texto original não é salvo no banco                                                                                  |
| **RN-05** | Mensagem de erro contextual         | Erros locais de nome, email e senha são exibidos abaixo do campo; erros retornados pelo servidor e erros de código são exibidos em overlay                                   |
| **RN-06** | Bloqueio durante processamento      | Durante as requisições, o sistema exibe overlay de carregamento enquanto aguarda a resposta                                                                                   |
| **RN-07** | Verificação por código              | A criação da conta depende da validação de um código de 6 dígitos enviado ao email informado                                                                                 |
| **RN-08** | Expiração do código                 | O código de verificação expira 10 minutos após ser gerado                                                                                                                     |
| **RN-09** | Código de uso único                 | Após uma validação bem-sucedida, o código é removido do armazenamento temporário e não pode ser reutilizado                                                                   |
| **RN-10** | Armazenamento temporário em memória | Os códigos pendentes são mantidos em um `Map` no processo do Node.js                                                                                                          |
| **RN-11** | Email de boas-vindas                | Após a criação do usuário, o backend tenta enviar um email de boas-vindas; se o envio falhar, retorna HTTP 201 informando que o usuário já foi criado                        |
| **RN-12** | Validação antes do `insert`         | `/confirmar-cadastro` valida os campos obrigatórios e o código antes de executar a criação do usuário                                                                         |

### Requisitos Não-Funcionais (RNF)

| ID         | Atributo             | Requisito                                                        | Métrica/Verificação                                                    | Justificativa                                                              |
| ---------- | -------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| **RNF-01** | Performance          | Resposta rápida em condições normais, exceto dependências externas | Tempo observado nas rotas e no envio da Brevo                          | Evita percepção de travamento durante o cadastro                           |
| **RNF-02** | Segurança de dados   | Senha armazenada apenas como hash, nunca em texto puro            | Verificação do valor salvo em `usuarios.senha_hash`                    | Protege as credenciais armazenadas                                         |
| **RNF-03** | Disponibilidade      | Serviço acessível publicamente via Render                         | Serviço web disponível pela URL publicada                              | Permite acesso remoto sem instalação local                                 |
| **RNF-04** | Usabilidade          | Feedback visual de validação e resultado                          | Mensagem sob campos + overlays de carregamento, erro, código e sucesso | Orienta o usuário em cada etapa                                             |
| **RNF-05** | Integração externa   | Envio de email através da API da Brevo                            | Resposta HTTP da API `/v3/smtp/email`                                  | Necessário para envio do código e do email de boas-vindas                  |
| **RNF-06** | Expiração de segredo | Código temporário válido por no máximo 10 minutos                 | `TEMPO_EXPIRACAO_MS = 10 * 60 * 1000`                                 | Define o período de validade do código enviado                             |
| **RNF-07** | Validação no servidor | Dados de criação validados no backend antes do `insert`          | Resposta HTTP 400 para dados obrigatórios inválidos/incompletos        | Garante aplicação das regras também em chamadas diretas à API              |

---

## 🎨 4. Protótipo Funcional — Mockups das Telas

**Mockup - Tela 1: Formulário Vazio (Estado Inicial)**

```
┌────────────────────────────────────────────────┐
│  CashLand                          [ Voltar ]   │
├────────────────────────────────────────────────┤
│  Cadastro de usuario                            │
│                                                │
│  Nome:  [_________________________]            │
│                                                │
│  Email: [_________________________]            │
│                                                │
│  Senha: [_________________________]            │
│                                                │
│              [ Enviar ]                        │
└────────────────────────────────────────────────┘
```

**Mockup - Tela 2: Formulário Preenchido**

```
┌────────────────────────────────────────────────┐
│  CashLand                          [ Voltar ]   │
├────────────────────────────────────────────────┤
│  Cadastro de usuario                            │
│                                                │
│  Nome:  [Daniel Souza              ]            │
│                                                │
│  Email: [daniel@gmail.com          ]            │
│                                                │
│  Senha: [••••••••••••              ]            │
│                                                │
│              [ Enviar ]                        │
└────────────────────────────────────────────────┘
```

**Mockup - Tela 3: Carregando**

```
┌────────────────────────────────────────────────┐
│                                                │
│        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│        ▓                                  ▓    │
│        ▓     Carregando...     ◌          ▓    │
│        ▓                                  ▓    │
│        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│                                                │
└────────────────────────────────────────────────┘
```

> Implementação real: `#loading-overlay` cobre a tela inteira com fundo escurecido (`rgba(0,0,0,0.5)`) e exibe uma caixa branca com o texto "Carregando..." e uma roda animada (`.spinning-wheel`).

**Mockup - Tela 4: Erro de Validação (por campo)**

```
┌────────────────────────────────────────────────┐
│  CashLand                          [ Voltar ]   │
├────────────────────────────────────────────────┤
│  Cadastro de usuario                            │
│                                                │
│  Nome:  [_________________________]            │
│  ERRO: O nome não pode estar vazio             │
│                                                │
│  Email: [danielgmail.com           ]            │
│  ERRO: insira um email valido                  │
│                                                │
│  Senha: [123                       ]            │
│  ERRO: A senha deve ter no minimo 10 caracteres │
│                                                │
│              [ Enviar ]                        │
└────────────────────────────────────────────────┘
```

> A implementação mostra mensagens de erro em texto vermelho abaixo dos campos.

**Mockup - Tela 5: Confirmação do Código**

```
┌────────────────────────────────────────────────┐
│                                                │
│       Digite o código enviado para o seu email │
│                                                │
│                    [ 000000 ]                  │
│                                                │
│             [ Confirmar ] [ Cancelar ]         │
│                                                │
└────────────────────────────────────────────────┘
```

> O campo aceita até 6 caracteres e possui `pattern="\d{6}"`, `required` e placeholder `000000`.

**Mockup - Tela 6: Resultado de Sucesso**

```
┌────────────────────────────────────────────────┐
│                                                │
│      Cadastro realizado com sucesso,           │
│      prossiga para o login!                    │
│                                                │
│                 [ Continuar ]                  │
│                                                │
└────────────────────────────────────────────────┘
```

> O frontend exibe `#resultado-overlay`; ao clicar em "Continuar", o usuário é redirecionado para `/login`.

**Mockup - Tela 7: Usuário Criado com Falha no Email de Boas-vindas**

```
┌────────────────────────────────────────────────┐
│                                                │
│   Usuario criado, mas o email de confirmação   │
│   não foi enviado                              │
│                                                │
│                 [ Continuar ]                  │
│                                                │
└────────────────────────────────────────────────┘
```

> Esse estado corresponde à resposta HTTP 201 da rota `/confirmar-cadastro`. O cadastro já foi inserido no Supabase e o frontend trata o retorno como criação concluída.

**Mockup - Tela 8: Resultado de Erro**

```
┌────────────────────────────────────────────────┐
│                                                │
│          [ Mensagem de erro retornada ]        │
│                                                │
│                 [ Continuar ]                  │
│                                                │
└────────────────────────────────────────────────┘
```

> Erros de email duplicado, falha no envio do código, dados inválidos, falha no `insert` e falhas na confirmação do código são exibidos nesse overlay. Quando a confirmação do código retorna HTTP 401, o sistema configura a reabertura da janela de código depois que o usuário fecha a mensagem.

**Descrição de Estados:**

- **Estado Normal:** campos em branco, botão habilitado
- **Estado Preenchido:** campos preenchidos
- **Estado Erro Local:** mensagem vermelha abaixo do campo específico
- **Estado Loading:** overlay de tela cheia com texto e spinner
- **Estado Aguardando Código:** overlay com campo de 6 dígitos e botões Confirmar/Cancelar
- **Estado Erro do Servidor:** overlay com mensagem e botão Continuar
- **Estado Sucesso:** overlay com mensagem de confirmação e botão Continuar
- **Estado Criado sem Email de Boas-vindas:** overlay correspondente ao HTTP 201, seguido de retorno ao login

**Fluxo de Navegação:**

1. Usuário chega em `/login` e acessa o cadastro.
2. Abre `/cadastro-usuario`.
3. Preenche nome, email e senha.
4. Clica em "Enviar".
5. Se a validação local falhar, o sistema mostra erro abaixo do campo e não faz a requisição.
6. Se a validação passar, exibe loading e envia `POST /solicitar-codigo`.
7. Se o email já existir, os dados forem inválidos ou ocorrer falha no envio, exibe overlay de erro.
8. Se o código for enviado, abre o overlay de confirmação.
9. Usuário informa o código e clica em "Confirmar".
10. Frontend envia `POST /confirmar-cadastro`.
11. Se a validação dos dados falhar, exibe erro HTTP 400.
12. Se a validação do código falhar, exibe erro HTTP 401 e permite retornar à janela do código.
13. Se o `insert` falhar, exibe erro HTTP 500.
14. Se o usuário for criado e o email de boas-vindas também for enviado, exibe o resultado HTTP 200.
15. Se o usuário for criado, mas o email de boas-vindas falhar, exibe o resultado HTTP 201.
16. Nos resultados de criação concluída, o usuário clica em "Continuar" e é levado para `/login`.

**Responsividade:**

- O card principal utiliza largura de `420px` no estilo atual.
- Em desktop, o card é exibido centralizado.

---

## 🏗️ 5. Arquitetura e ADR

### Diagrama de Componentes

```
┌─────────────────────────────────────────┐
│      Frontend (servido pelo Express)    │
│  • /cadastro-usuario → index.html       │
│  • Validação local                      │
│  • Overlays de loading/resultado/código │
└───────────────────┬─────────────────────┘
                    │
                    │ 1) POST /solicitar-codigo
                    │    { nome, email }
                    ▼
┌─────────────────────────────────────────┐
│        API REST Backend                 │
│        Node.js + Express                │
│  • Valida nome/email                    │
│  • Consulta duplicidade no Supabase    │
│  • Gera código de 6 dígitos            │
│  • Mantém códigos em Map por 10 min    │
└──────────────┬────────────────┬─────────┘
               │                │
               │ SELECT         │ API HTTPS
               ▼                ▼
┌───────────────────────┐   ┌────────────────────────┐
│ Supabase/PostgreSQL   │   │ Brevo Email API        │
│ • tabela usuarios     │   │ • código de verificação│
│ • nome                │   │ • email de boas-vindas │
│ • email               │   └────────────────────────┘
│ • senha_hash          │
└───────────▲───────────┘
            │
            │ INSERT após confirmação
            │
┌───────────┴─────────────────────────────┐
│ 2) POST /confirmar-cadastro             │
│    { nome, email, senha,                │
│      codigoDigitado }                   │
│ • valida dados obrigatórios             │
│ • valida código                         │
│ • gera hash bcrypt                      │
│ • cria usuário                          │
│ • tenta enviar email de boas-vindas     │
└─────────────────────────────────────────┘
```

### ADR-006: Verificação de duplicidade de email antes do envio do código

**Status:** ACEITO

**Contexto:** É preciso impedir dois cadastros com o mesmo email e evitar o envio do código de verificação quando o endereço já está registrado.

**Decisão:** A rota `POST /solicitar-codigo` faz um `SELECT` com `maybeSingle()` filtrando por `email`. Se houver registro, retorna HTTP 409 e o fluxo não gera nem envia o código.

**Consequências:** O usuário recebe a informação de duplicidade antes da etapa de confirmação do código e a API de email não é chamada para esse caso.

### ADR-007: Validação no frontend e no backend

**Status:** ACEITO

**Contexto:** Os dados utilizados na criação do usuário precisam ser validados antes do `insert`.

**Decisão observada na implementação:**
- O frontend valida nome, email (`@` e `.com`) e senha mínima de 10 caracteres antes de solicitar o código.
- `/solicitar-codigo` valida nome e email no backend.
- `/confirmar-cadastro` valida nome, email (`@` e `.com`), senha mínima de 10 caracteres e presença de `codigoDigitado` antes de validar o código e executar o `insert`.

**Consequências:** Dados obrigatórios fora das regras implementadas recebem HTTP 400 antes da criação do usuário.

### ADR-008: Verificação de email por código temporário

**Status:** ACEITO

**Contexto:** O cadastro confirma o acesso ao email informado antes da criação da conta.

**Decisão:** Gerar um código numérico aleatório de 6 dígitos, armazená-lo temporariamente no servidor e enviá-lo por email. A conta só é criada depois de `validarCodigo(email, codigoDigitado)` retornar válido.

**Consequências:** O código fica associado ao email, possui validade de 10 minutos e é removido após validação bem-sucedida.

### ADR-009: Uso da Brevo para emails transacionais

**Status:** ACEITO

**Contexto:** O sistema envia o código de verificação e o email de boas-vindas por um serviço externo de email.

**Decisão:** Consumir a API REST da Brevo por `fetch`, utilizando `BREVO_API_KEY`, `BREVO_SENDER_NAME` e `BREVO_SENDER_EMAIL` carregados das variáveis de ambiente.

**Consequências:** O mesmo serviço é utilizado para o código de verificação e para o email de boas-vindas.

### ADR-010: Armazenamento temporário dos códigos em memória

**Status:** ACEITO

**Contexto:** O sistema precisa associar temporariamente cada código gerado ao email correspondente e ao horário de expiração.

**Decisão:** Usar `const codigosPendentes = new Map()` no módulo `Email.js`.

**Consequências:** O registro temporário contém `codigo` e `expiraEm`; o código é removido quando expira e também quando é validado com sucesso.

### ADR-011: Tratamento do resultado do `insert` antes da resposta de sucesso

**Status:** ACEITO

**Contexto:** A resposta de cadastro concluído depende do resultado retornado pelo Supabase.

**Decisão:** A rota `/confirmar-cadastro` aguarda o `insert`, verifica o campo `error` e retorna HTTP 500 quando a criação do usuário falha. A resposta de sucesso só ocorre depois dessa verificação.

**Consequências:** O fluxo diferencia erro de criação do usuário de cadastro concluído.

### ADR-012: Resultado do envio do email de boas-vindas

**Status:** ACEITO

**Contexto:** O usuário já está criado no banco quando o sistema inicia o envio do email de boas-vindas.

**Decisão:** Após um `insert` sem erro, o backend tenta enviar o email. Se o envio funcionar, retorna HTTP 200. Se o envio falhar, retorna HTTP 201 com mensagem informando que o usuário foi criado, mas o email não foi enviado.

**Consequências:** O frontend trata os dois retornos como estados em que o usuário já foi criado e permite seguir para `/login`.

### Tecnologias Escolhidas

| Camada/Finalidade        | Tecnologia / Serviço      | Justificativa                                                       |
| ------------------------ | ------------------------- | ------------------------------------------------------------------- |
| Backend                  | Express                   | Utilizado pelo módulo de login e pelas rotas do sistema             |
| Banco de Dados           | Supabase (PostgreSQL)     | Armazena os usuários e seus hashes de senha                         |
| Hash                     | bcrypt                    | Função `gerarHashSenha` reutilizada do RF-01                        |
| Email transacional       | Brevo API                 | Envio do código de verificação e do email de boas-vindas            |
| Armazenamento temporário | JavaScript `Map`          | Mantém os códigos pendentes e seus horários de expiração            |
| Documentação de API      | swagger-ui-express        | Interface disponível em `/api-docs`                                 |
| Hospedagem               | Render                    | Serviço web público, com `PORT` fornecida pelo ambiente             |

### Fluxo de Dados

1. Frontend valida `{ nome, email, senha }` localmente.
2. Frontend envia `POST /solicitar-codigo` com `{ nome, email }`.
3. Backend valida nome/email.
4. Backend consulta `usuarios` por email usando `maybeSingle()`.
5. Se houver duplicidade, retorna HTTP 409.
6. Caso contrário, gera um código de 6 dígitos.
7. `Email.js` salva `{ codigo, expiraEm }` em `codigosPendentes`.
8. Backend chama a API da Brevo e envia o código.
9. Em sucesso, `/solicitar-codigo` retorna HTTP 200.
10. Frontend abre o overlay de confirmação.
11. Usuário informa o código.
12. Frontend envia `POST /confirmar-cadastro` com `{ nome, email, senha, codigoDigitado }`.
13. Backend valida nome, email, senha e presença do código.
14. Backend chama `validarCodigo(email, codigoDigitado)`.
15. Código válido é removido do `Map`.
16. Backend gera `senha_hash` com bcrypt.
17. Backend executa `INSERT` em `usuarios`.
18. Se o Supabase retornar `error`, backend responde HTTP 500.
19. Se o `insert` for concluído, backend tenta enviar o email de boas-vindas.
20. Email enviado: backend retorna HTTP 200.
21. Email não enviado: backend retorna HTTP 201 informando que o usuário foi criado.
22. Frontend exibe o resultado e, nos estados de criação concluída, redireciona o usuário para `/login` após clicar em "Continuar".

---

## 🔒 6. Validação de Segurança OWASP

### A04:2025 — Cryptographic Failures

**Vulnerabilidade:** Armazenar a senha do novo usuário em texto puro exporia as credenciais caso a base de dados fosse comprometida.

**Implementação:**

```javascript
const { error } = await supabase
    .from('usuarios')
    .insert({
        nome: nome,
        email: email,
        senha_hash: await gerarHashSenha(senha)
    })
```

A função utilizada é:

```javascript
async function gerarHashSenha(senhaTextoPuro) {
  const saltRounds = 10;
  return await bcrypt.hash(senhaTextoPuro, saltRounds);
}
```

**Teste:**

```javascript
// Cadastro com senha "MinhaSenha123456"
// Verificação na tabela usuarios:
SELECT senha_hash FROM usuarios WHERE email = 'daniel@gmail.com';
// Resultado esperado: hash bcrypt, e não a senha em texto puro
```

### A06:2025 — Insecure Design (validação de entrada)

**Vulnerabilidade:** Sem validação, requisições poderiam enviar campos ausentes ou valores fora das regras definidas para o cadastro.

**Implementação no frontend:**

```javascript
if (!senha || senha.length < 10) {
    MostrarErro("erro-senha", "ERRO: A senha deve ter no minimo 10 caracteres")
}
```

**Implementação no backend (`/solicitar-codigo`):**

```javascript
if (!nome || !email || !email.includes('@') || !email.includes(".com")) {
    return res.status(400).json({ mensagem: 'Dados inválidos ou incompletos' });
}
```

**Implementação no backend (`/confirmar-cadastro`):**

```javascript
if (
    !nome ||
    !email ||
    !email.includes('@') ||
    !email.includes(".com") ||
    !senha ||
    senha.length < 10 ||
    !codigoDigitado
) {
    return res.status(400).json({ mensagem: 'Dados inválidos ou incompletos' });
}
```

**Teste:**

```
Entrada no formulário: senha = "123"
Resultado: cadastro bloqueado no frontend e mensagem de erro exibida.

Requisição direta para /solicitar-codigo sem nome ou com email fora do padrão:
Resultado: HTTP 400 - "Dados inválidos ou incompletos".

Requisição direta para /confirmar-cadastro com senha menor que 10 caracteres
ou outro campo obrigatório ausente:
Resultado: HTTP 400 - "Dados inválidos ou incompletos".
```

### Verificação de Email — Código Temporário

**Objetivo de segurança:** confirmar o acesso ao email informado antes da criação da conta.

**Implementação:**

```javascript
export function gerarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function salvarCodigo(email, codigo) {
  codigosPendentes.set(email, {
    codigo,
    expiraEm: Date.now() + TEMPO_EXPIRACAO_MS
  });
}
```

**Validação:**

```javascript
if (!registro) return { valido: false, motivo: 'nenhum_codigo_solicitado' };
if (Date.now() > registro.expiraEm) {
  codigosPendentes.delete(email);
  return { valido: false, motivo: 'codigo expirado' };
}
if (registro.codigo !== codigoDigitado) {
  return { valido: false, motivo: 'codigo incorreto' };
}

codigosPendentes.delete(email);
return { valido: true, motivo: "" };
```

**Controles presentes:**

- Código de 6 dígitos.
- Validade de 10 minutos.
- Associação do código ao email.
- Remoção do código após validação bem-sucedida.
- Remoção do código expirado quando ocorre uma tentativa de validação.
- Validação dos dados obrigatórios antes da confirmação do cadastro.
- Verificação do resultado do `insert` antes da resposta de sucesso.

