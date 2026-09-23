## 🎯 1. IDENTIFICAÇÃO DO REQUISITO

**ID:** RF-001  
**Título:** Sistema de Login, Sessão e Recuperação de Senha<br>
**Tipo:** Requisito Funcional  
**Prioridade:** ALTA (É necessário estar autenticado para acessar o sistema e realizar operações vinculadas ao usuário)  
**Complexidade:** MÉDIA (estimado 5 story points)  
**Status:** Finalizado  
**Data de Criação:** 06/09/2026  
**Última Atualização:** 23/09/2026

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
  - Controlar requisições por IP, emitir e validar JWT e verificar permissões de administrador.
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

- ✅ Usuário autenticado, com JWT em cookie `token` válido por 2 horas.
- ✅ Navegação para a tela administrativa ou principal conforme o tipo de usuário.
- ✅ API retorna os dados básicos `id`, `nome` e `tipo` do usuário.

#### Recuperação de senha

- ✅ Código de recuperação enviado ao email cadastrado.
- ✅ Código validado antes da alteração da senha.
- ✅ Nova senha convertida em hash bcrypt.
- ✅ Campos `senha_hash` e `status_reset_senha` atualizados na tabela `usuarios`; a solicitação administrativa de reset é encerrada.
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

1. Usuário acessa `/login`, informa email e senha e pode alternar a visualização da senha.
2. Ao clicar em "Enviar", o frontend verifica se o email contém `@` e se a senha possui pelo menos 10 caracteres.
3. O frontend exibe carregamento e envia as credenciais com `credentials: 'include'`.
4. O limitador verifica o limite compartilhado de 5 requisições por IP em 5 minutos para login e confirmação de senha.
5. O servidor exige email e senha e consulta `id_usuario`, `nome`, `senha_hash`, `status_usuario`, `tipo` e `status_reset_senha` pelo email.
6. O servidor verifica se a conta existe, está ativa e não possui solicitação administrativa de reset pendente.
7. `validarSenha()` compara a senha recebida com o hash usando bcrypt.
8. O servidor gera um JWT com `id_usuario` e `tipo`, assinado com `SEGREDO_JWT` e validade de 2 horas.
9. O JWT é enviado no cookie `token`, com `httpOnly`, `sameSite: 'strict'`, `secure` em produção e duração de 2 horas.
10. O servidor retorna HTTP 200, mensagem de sucesso e `usuario: { id, nome, tipo }`.
11. O frontend fecha o carregamento, grava o tipo em `localStorage` e apresenta o resultado.
12. Ao clicar em "Continuar", usuários `Admin` seguem para `/tela-admin`; os demais seguem para `/tela-principal`.

---

### Sessão, permissões e saída

- As páginas autenticadas consultam `/me` enviando o cookie. O servidor valida o JWT e consulta o usuário atual no banco, retornando `id_usuario`, `nome` e `tipo`.
- Token ausente, inválido ou expirado recebe HTTP 401. Na consulta da sessão, usuário inexistente ou inativo também recebe HTTP 401.
- As telas exibem o nome do usuário e oferecem acesso à edição do perfil e ao botão "Sair". A tela administrativa também oferece a listagem de usuários.
- As operações administrativas usam `autenticar` e `somenteAdmin`; um token sem tipo `Admin` recebe HTTP 403.
- Administradores podem consultar `/me` com `id` para obter `status_usuario` e `tipo` de outro usuário. Essa consulta recebe HTTP 403 para usuários comuns.
- Na saída, o backend limpa o cookie `token`; o frontend remove `tipo` do `localStorage` e retorna ao login.
- A confirmação de senha usada nas telas de edição compara a senha com o hash do usuário autenticado, retornando HTTP 200 para senha correta e HTTP 400 para senha incorreta.
- Endereços não reconhecidos exibem a página 404, com link para a tela principal.

### Fluxos alternativos — Situação da conta

- Conta inativa: o login retorna HTTP 403 com "Conta inativa. Contate o administrador.".
- Reset solicitado por administrador: o login retorna HTTP 203; após a mensagem e o clique em "Continuar", o frontend abre `/resetar-senha`.
- Limite de login ou confirmação de senha atingido: o servidor retorna HTTP 429 e informa que o usuário deve tentar novamente em 5 minutos.

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
3. Sistema apresenta o formulário "Redefinir senha", com campo de email e botão "Continuar".
4. Usuário informa o email cadastrado e clica em "Continuar".
5. Frontend valida se o email foi preenchido e contém `@`.
6. Frontend exibe overlay de carregamento.
7. Frontend envia `POST /solicitar-reset-senha` com `{ email }`.
8. Backend valida o email recebido.
9. A solicitação está sujeita ao limitador compartilhado por IP, executado antes do processamento do corpo da requisição.
10. Backend consulta `nome` e `email` na tabela `usuarios`.
11. Backend verifica se o usuário existe.
12. Backend gera um código aleatório de 6 dígitos utilizando `gerarCodigo()`.
13. Backend salva temporariamente o código por meio de `salvarCodigo(email, codigo)`.
14. O código recebe tempo de expiração de 10 minutos.
15. Backend envia o código para o email do usuário por meio de `enviarEmail()`.
16. Servidor retorna HTTP `200`.
17. Frontend remove o overlay de carregamento.
18. Frontend abre diretamente o overlay de código e nova senha, com botões "Confirmar" e "Cancelar".

---

### Fluxo Principal — Confirmação e Alteração da Senha

1. Usuário informa o código de 6 dígitos recebido por email.

2. Usuário informa uma nova senha e clica em "Confirmar" na janela.

3. Frontend verifica se o código possui 6 caracteres numéricos.

4. Frontend verifica se a nova senha possui no mínimo 10 caracteres.

5. Frontend exibe overlay de carregamento.

6. Frontend envia `POST /confirmar-reset-senha` com:
   
   - `email`
   
   - `codigoDigitado`
   
   - `novaSenha`

7. Backend valida a presença dos dados e o tamanho mínimo da nova senha.

8. A confirmação está sujeita ao mesmo limitador por IP da solicitação, executado antes das validações do corpo.

9. Backend converte `codigoDigitado` para string.

10. Backend executa `validarCodigo(email, String(codigoDigitado))`.

11. Sistema confirma que o código existe, não expirou e corresponde ao código armazenado.

12. Após validação bem-sucedida, o código é removido da lista de códigos pendentes.

13. Backend gera o hash da nova senha usando `gerarHashSenha()`.

14. Backend executa `UPDATE` na tabela `usuarios`, alterando `senha_hash` e definindo `status_reset_senha: false` no registro com o email informado.

15. Backend verifica se algum usuário foi atualizado.

16. A solicitação administrativa de reset fica encerrada por `status_reset_senha: false`.

17. Servidor retorna HTTP `200` com a mensagem "Senha alterada com sucesso!".

18. Frontend exibe confirmação de sucesso.

19. Ao clicar em "Continuar" no overlay de sucesso, o usuário é redirecionado para `/login`.

---

### Fluxo Alternativo A4: Email inválido na solicitação de reset

```text
8a.1. Backend detecta email vazio ou sem "@".
8a.2. Sistema retorna HTTP 400.
8a.3. Frontend exibe mensagem de email inválido no overlay de resultado.
8a.4. Ao clicar em "Continuar", o usuário retorna ao formulário de email.
```

---

### Fluxo Alternativo A5: Email não cadastrado

```text
11a.1. Consulta ao Supabase não encontra usuário para o email informado.
11a.2. Sistema retorna HTTP 404.
11a.3. Frontend exibe "Email não cadastrado" no overlay de resultado.
11a.4. Ao clicar em "Continuar", o usuário retorna ao formulário de email.
```

---

### Fluxo Alternativo A6: Limite de requisições atingido

1. O limitador contabiliza por IP as requisições de solicitação de código de cadastro, solicitação e confirmação de reset e logout.
2. São permitidas 5 requisições compartilhadas em uma janela de 15 minutos.
3. Ao exceder o limite, o servidor retorna HTTP 429 antes de executar a operação.
4. A mensagem orienta tentar novamente em 15 minutos.

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
11a.5. Frontend exibe a mensagem associada ao código no overlay de resultado.
11a.6. "Continuar" reabre a janela de código e nova senha.
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
15a.3. Frontend informa no overlay que o usuário não foi encontrado.
15a.4. "Continuar" reabre a janela de código e nova senha; "Cancelar" retorna ao formulário de email.
```

---

### Regras de Negócio (RN)

| ID       | Regra                                                                                                                              |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **RN01** | A senha nunca é armazenada em texto puro — apenas como hash bcrypt.                                                                |
| **RN02** | O sistema não retorna `senha_hash` em nenhuma resposta da API.                                                                     |
| **RN03** | Toda tentativa de login exige `email` e `senha`; faltando algum dos campos, a requisição é rejeitada antes da autenticação.        |
| **RN04** | Falhas de login por email inexistente ou senha incorreta retornam a mesma mensagem: `"Email ou senha inválidos"`.                  |
| **RN05** | Login bem-sucedido retorna `id`, `nome` e `tipo`, além de definir o cookie de autenticação. |
| **RN06** | Login depende de usuário previamente cadastrado.                                                                                   |
| **RN07** | A comparação de senha é realizada exclusivamente no backend usando `bcrypt.compare`.                                               |
| **RN08** | A recuperação de senha somente prossegue quando o email informado corresponde a um usuário cadastrado.                             |
| **RN09** | O código de recuperação possui 6 dígitos e é armazenado temporariamente associado ao email.                                        |
| **RN10** | O código de recuperação expira 10 minutos após sua geração.                                                                        |
| **RN11** | O código é de uso único: após validação bem-sucedida, é removido dos códigos pendentes.                                            |
| **RN12** | A nova senha deve possuir no mínimo 10 caracteres.                                                                                 |
| **RN13** | A senha só pode ser atualizada após validação bem-sucedida do código.                                                              |
| **RN14** | A redefinição atualiza `senha_hash` e define `status_reset_senha: false` para o email informado. |
| **RN15** | A nova senha é convertida em hash bcrypt antes do `UPDATE`.                                                                        |
| **RN16** | O código digitado é convertido para string no backend antes da comparação.                                                         |
| **RN17** | O controle de requisições usa `express-rate-limit`, por IP, no processo do servidor. |
| **RN18** | Solicitação de código de cadastro, solicitação e confirmação de reset e logout compartilham 5 requisições por IP em 15 minutos. |
| **RN19** | Durante o período de bloqueio, novas tentativas recebem HTTP `429`.                                                                |
| **RN20** | Login e confirmação de senha compartilham 5 requisições por IP em 5 minutos. |

---

### Requisitos Não-Funcionais (RNF)

| ID         | Atributo                 | Requisito                                                                     | Métrica                                    | Justificativa                                                  |
| ---------- | ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| **RNF-01** | Performance              | Processar login e operações de reset em tempo compatível com o uso web normal | Tempo de resposta das rotas                | Evitar espera desnecessária durante autenticação e recuperação |
| **RNF-02** | Usabilidade              | Exibir feedback visual de carregamento, sucesso e erro                        | Presença de overlays e mensagens por etapa | Informar ao usuário o estado da operação                       |
| **RNF-03** | Segurança de credenciais | Armazenar senhas somente como hash bcrypt                                     | Verificação do campo `senha_hash`          | Evitar armazenamento de senha em texto puro                    |
| **RNF-04** | Segurança de recuperação | Código temporário com expiração de 10 minutos                                 | Tempo registrado em `expiraEm`             | Limitar o período de validade do código                        |
| **RNF-05** | Controle de abuso        | Bloquear novas requisições após o limite configurado                          | HTTP `429` e bloqueio de 15 minutos        | Controlar tentativas repetidas de recuperação                  |
| **RNF-06** | Usabilidade              | Nova senha deve possuir pelo menos 10 caracteres                              | Validação no frontend e backend            | Impedir envio de senha abaixo do tamanho mínimo definido       |
| **RNF-07** | Integração               | Enviar o código por serviço externo de email                                  | Resposta da API de email                   | Disponibilizar o código ao usuário cadastrado                  |

---

## 🎨 4. PROTÓTIPO FUNCIONAL — MOCKUPS DAS TELAS

Mockups textuais baseados nos arquivos atuais de [login](../../src/rf-001-Login/public/tela_login.html) e [reset de senha](../../src/rf-001-Login/public/reset_senha.html). Os quadros representam a disposição dos elementos; as medidas e cores estão descritas abaixo.

### Estilo visual implementado

As telas utilizam o [CSS compartilhado](../../src/rf-002-Cadastro_usuario/public/template.css): fonte Arial, fundo `#cadaf2`, cartões brancos de 420px com largura máxima de 100%, padding de 40px e bordas de 12px. Os overlays têm fundo preto com opacidade de 50% e caixas de 400px, padding de 40px, altura limitada à janela e rolagem. Mensagens de erro usam `rgb(160, 2, 2)` e de sucesso `rgb(103, 198, 40)`.

### Mockup - Tela 1: Login

```text
┌────────────────────────────────────────────────────────────┐
│ CashLand                                                   │
│                                                            │
│ Email:                                                     │
│ [________________________________]                         │
│                                                            │
│ Senha:                                                     │
│ [••••••••••••__________________] [olho]                    │
│                                                            │
│ Esqueci minha senha                                        │
│ Cadastrar novo usuario                                     │
│                                                            │
│ [             Enviar             ]                         │
└────────────────────────────────────────────────────────────┘
```

O botão de olho fica dentro da área da senha e alterna entre senha oculta e visível. Os links abrem `/resetar-senha` e `/cadastro-usuario`. Os campos começam vazios; a senha acima ilustra o estado preenchido.

### Mockup - Tela 2: Erros locais no login

```text
┌────────────────────────────────────────────────────────────┐
│ CashLand                                                   │
│                                                            │
│ Email:                                                     │
│ [daniel__________________________]                         │
│ ERRO: insira um email valido                               │
│                                                            │
│ Senha:                                                     │
│ [•••__________________________] [olho]                     │
│ ERRO: A senha deve ter no minimo 10 caracteres             │
│                                                            │
│ Esqueci minha senha                                        │
│ Cadastrar novo usuario                                     │
│                                                            │
│ [             Enviar             ]                         │
└────────────────────────────────────────────────────────────┘
```

As mensagens aparecem em vermelho abaixo de `#Email` e `#Senha`, nos elementos `#erro-email` e `#erro-senha`. Email sem `@` ou senha com menos de 10 caracteres impedem a requisição de login.

### Mockup - Tela 3: Carregamento do login ou reset

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │                                                        │   │
│ │                  Carregando...  ⟳                      │   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

`#loading-overlay` cobre a página durante a requisição. A caixa `.loading-box` contém o texto e o indicador animado `.spinning-wheel`.

### Mockup - Tela 4: Resultado do login

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │                                                        │   │
│ │           Login realizado com sucesso                  │   │
│ │                                                        │   │
│ │                    [ Continuar ]                       │   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Em HTTP 200, a mensagem aparece em verde no `#resultado-overlay`. Em HTTP 401, o mesmo overlay exibe **“Email ou senha inválidos”** em vermelho. Após HTTP 200, “Continuar” abre a tela administrativa ou principal conforme o tipo. Após HTTP 401, fecha a janela e mantém o usuário no login.

### Mockup - Tela 5: Solicitação de redefinição de senha

```text
┌────────────────────────────────────────────────────────────┐
│ CashLand                                      [ Voltar ]   │
│ Redefinir senha                                            │
│                                                            │
│ Email: [Ex: Daniel@gmail.com________________]              │
│                                                            │
│                      [ Continuar ]                         │
└────────────────────────────────────────────────────────────┘
```

O formulário `#meuForm` solicita apenas o email. “Continuar” valida se o valor contém `@` e envia `POST /solicitar-reset-senha`. “Voltar” abre `/login`. Para email inválido, `#erro-email` mostra **“ERRO: insira um email válido”** em vermelho, abaixo do campo.

### Mockup - Tela 6: Código e nova senha em overlay

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Digite o código enviado para o seu email               │   │
│ │ e a nova senha                                         │   │
│ │                                                        │   │
│ │ Código: [ 000000 ]                                     │   │
│ │                                                        │   │
│ │ Nova senha:                                            │   │
│ │ [No mínimo 10 caracteres________________]              │   │
│ │                                                        │   │
│ │              [ Confirmar ] [ Cancelar ]                │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

A resposta HTTP 200 de `/solicitar-reset-senha` abre diretamente `#solicitacaoCodigo-overlay`, com `#meuForm-confirmar-reset`. O código usa `#input-codigo` e a nova senha usa `#Senha`. “Cancelar” fecha a janela, limpa código, senha e erros locais, e retorna o foco ao email.

### Mockup - Tela 7: Código ou nova senha inválidos no frontend

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │ Digite o código enviado para o seu email               │   │
│ │ e a nova senha                                         │   │
│ │                                                        │   │
│ │ Código: [ abc123 ]                                     │   │
│ │ ERRO: O código deve ter exatamente 6 números           │   │
│ │                                                        │   │
│ │ Nova senha: [•••_________________________]             │   │
│ │ ERRO: A senha deve ter no mínimo 10 caracteres         │   │
│ │                                                        │   │
│ │              [ Confirmar ] [ Cancelar ]                │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

As mensagens vermelhas ficam em `#erro-codigo` e `#erro-senha`, abaixo dos respectivos campos. O formulário usa `novalidate` para executar a validação JavaScript: exatamente seis dígitos (`/^\d{6}$/`) e senha de pelo menos 10 caracteres. A janela permanece aberta e nenhuma requisição é enviada enquanto houver erro local.

### Mockup - Tela 8: Erro retornado pela API no reset

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │                                                        │   │
│ │                    codigo incorreto                    │   │
│ │                                                        │   │
│ │                    [ Continuar ]                       │   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Exemplo de mensagem da API em vermelho no `#resultado-overlay`. Também são exibidos nesse modelo email não cadastrado, limite de tentativas, falhas do servidor e erros de conexão. Se o erro ocorrer na solicitação do código, “Continuar” retorna ao email. Se ocorrer na confirmação, “Continuar” reabre a janela de código e senha com os valores preservados para correção.

### Mockup - Tela 9: Senha alterada

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │                                                        │   │
│ │              Senha alterada com sucesso!               │   │
│ │                                                        │   │
│ │                    [ Continuar ]                       │   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

A resposta HTTP 200 de `/confirmar-reset-senha` exibe a mensagem em verde. O usuário retorna a `/login` ao clicar em “Continuar”.

### Estados e navegação

| Situação                            | Apresentação                                    | Ação seguinte                            |
| ----------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| Login com campos inválidos          | Erro vermelho abaixo do campo                   | Corrigir e clicar em “Enviar”            |
| Login em processamento              | Overlay de carregamento                         | Aguardar a resposta                      |
| Login com HTTP 200 | Overlay de sucesso | “Continuar” abre a tela correspondente ao tipo do usuário |
| Login com HTTP 401 | Overlay de erro | “Continuar” fecha o resultado |
| Login com HTTP 203 | Mensagem de reset solicitado | “Continuar” abre a recuperação de senha |
| Reset com email inválido            | Erro abaixo do email                            | Corrigir e clicar em “Continuar”         |
| Código de reset enviado             | Overlay de código e nova senha                  | Preencher e clicar em “Confirmar”        |
| Código ou senha fora do formato     | Erro abaixo do campo no overlay                 | Corrigir sem sair da janela              |
| Erro da API na confirmação do reset | Overlay de resultado                            | “Continuar” reabre código e senha        |
| Cancelamento do reset               | Fecha a janela e limpa os campos de confirmação | Editar o email ou solicitar outro código |
| Reset concluído                     | Overlay de sucesso                              | “Continuar” abre `/login`                |

### Elementos e funções utilizados

- `MostrarErro(id, mensagem)`: mensagens de validação local junto aos campos.
- `MostrarResultado_Overlay(tipo, mensagem)`: conteúdo do resultado em `#resultado-funcao`.
- `FechaResultado_overlay`: fecha o resultado; no reset, também controla a reabertura da confirmação, o cancelamento e o retorno ao login.
- `.loading-overlay`, `.loading-box` e `.spinning-wheel`: estrutura visual das janelas e do carregamento.

### Responsividade

Os cartões e overlays respeitam a largura disponível. Em telas de até 600px, o padding dos cartões e overlays passa para 24px, e o contêiner usa 16px. O cabeçalho permite quebra dos itens e reorganiza a navegação.

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
│ • Formulário: solicitar código              │
│ • Overlay: código + nova senha              │
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
│ • Rate limit por IP           │
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

**Decisão:** Entregar as páginas com `sendFile` e os recursos compartilhados com `Express.static`:

```javascript
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tela_login.html'));
});
app.get('/resetar-senha', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/reset_senha.html'));
});
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

### ADR-008: Limitação de requisições por IP

**Status:** ACEITO

**Decisão:** Utilizar `express-rate-limit` com três instâncias: login e confirmação de senha compartilham 5 requisições em 5 minutos; confirmação de cadastro permite 5 em 15 minutos; solicitação de código de cadastro, solicitação e confirmação de reset e logout compartilham 5 em 15 minutos.

**Consequências:** Requisições acima do limite recebem HTTP 429. O Express usa `trust proxy: 1`.

### ADR-009: Atualização da senha e encerramento da solicitação de reset

**Status:** ACEITO

**Contexto:** A recuperação deve atualizar a credencial e encerrar uma eventual solicitação administrativa de reset.

**Decisão:** Executar:

```javascript
const { data: usuarioAtualizado, error } = await supabase
    .from('usuarios')
    .update({
        senha_hash: novaSenhaHash, status_reset_senha: false
    })
    .eq('email', email)
    .select('id_usuario')
    .maybeSingle();
```

**Consequências:** O usuário passa a usar a nova senha e a solicitação de reset deixa de estar pendente.

---

### ADR-010: Sessão com JWT em cookie

**Status:** ACEITO

**Decisão:** Assinar o token com `SEGREDO_JWT` e validade de 2 horas; usar `cookie-parser` para ler o cookie `token` e `verificarToken()` no middleware de autenticação.

**Consequências:** O cookie é `httpOnly`, `sameSite: 'strict'` e `secure` em produção. O tipo salvo em `localStorage` orienta a navegação; as operações administrativas verificam o tipo no JWT. O CORS aceita credenciais e usa as origens definidas em `ORIGEM_AUTORIZADA`.

---

## Tecnologias Escolhidas

| Camada                | Tecnologia            | Versão / Uso      | Justificativa no projeto                     |
| --------------------- | --------------------- | ----------------- | -------------------------------------------- |
| Frontend              | HTML5 + CSS3          | —                 | Formulários de login e recuperação           |
| Frontend              | JavaScript            | ES2015+           | `fetch`, validação e controle das interfaces |
| Backend               | Node.js               | 20                | Runtime do servidor                          |
| Backend               | Express               | 5                 | Rotas e arquivos estáticos                   |
| Banco de dados        | Supabase / PostgreSQL | —                 | Armazenamento dos usuários                   |
| Sessão                | jsonwebtoken + cookie-parser | JWT de 2 horas | Autenticação por cookie |
| Controle de requisições | express-rate-limit | Limites por IP | Controle de frequência das operações |
| Hash                  | bcrypt                | `saltRounds = 10` | Geração e validação de hash                  |
| Email                 | Brevo API             | HTTPS REST        | Envio dos códigos de verificação             |
| Documentação API      | swagger-ui-express    | —                 | Disponibilização da interface `/api-docs`    |
| CORS                  | cors                  | —                 | Configuração de origem permitida             |
| Realtime transport    | ws                    | —                 | Transporte configurado no cliente Supabase   |
| Variáveis de ambiente | dotenv                | —                 | Carregamento de credenciais e configurações  |
| Hospedagem            | Render                | Web Service       | Execução do processo Node.js                 |

---

## Fluxo de Dados — Login e Sessão

1. O frontend envia email e senha; o limitador por IP verifica a janela de requisições.
2. O backend consulta o usuário, verifica situação da conta e solicitação de reset, e compara a senha com bcrypt.
3. Em caso de sucesso, gera o JWT, define o cookie e retorna os dados básicos com o tipo do usuário.
4. O frontend direciona a navegação conforme o tipo; as páginas consultam `/me` para carregar a sessão.
5. No logout, o servidor limpa o cookie e o frontend retorna ao login.

## Fluxo de Dados — Recuperação de Senha

1. A solicitação passa pelo limitador por IP e pela validação do email cadastrado.
2. O backend gera o código, salva sua expiração em memória e envia o email pela Brevo.
3. Na confirmação, o mesmo limitador é aplicado; o servidor valida os campos e o código, removido após uso válido.
4. O servidor gera o novo hash e atualiza `senha_hash` e `status_reset_senha: false`.
5. Após sucesso, o frontend apresenta a confirmação e retorna ao login no clique em "Continuar".

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
        senha_hash: novaSenhaHash, status_reset_senha: false
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
if (error || !usuario) {
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

O fluxo utiliza `limitadorCodigo`, compartilhado com a solicitação de código de cadastro e o logout:

```javascript
const limitadorCodigo = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    handler: (req, res) => {
        res.status(429).json({ mensagem: 'Muitas tentativas de realizadas para esta operação. Tente novamente em 15 minutos.' });
    }
});
```

---

### A05:2021 — Injection

**Vulnerabilidade:** Construir consultas SQL concatenando diretamente valores recebidos do usuário poderia permitir alteração da consulta.

**Implementação no login:**

```javascript
const { data: usuario, error } = await supabase
    .from('usuarios')
    .select('id_usuario, nome, senha_hash, status_usuario, tipo, status_reset_senha')
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
        senha_hash: novaSenhaHash, status_reset_senha: false
    })
    .eq('email', email)
    .select('id_usuario')
    .maybeSingle();
```
