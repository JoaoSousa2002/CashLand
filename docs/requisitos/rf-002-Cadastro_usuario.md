## 🎯 1. Identificação do Requisito

 **ID**: RF-002
 **Título**: Cadastro e Gerenciamento de Usuários
 **Tipo**: Requisito Funcional
 **Prioridade**: ALTA (bloqueia os demais requisitos, exceto o RF-01)
 **Complexidade**: MÉDIA (estimado 5 story points)
 **Data de Criação**: 08/09/2026
 **Última Atualização**: 23/09/2026

**Breve Descrição:**
O sistema deve permitir que o usuário crie um novo cadastro informando nome, email e senha. Antes da criação da conta, o sistema envia um código de verificação de 6 dígitos para o email informado. O cadastro só é concluído após a confirmação desse código, e a senha é armazenada como hash bcrypt. Usuários autenticados podem consultar e atualizar o próprio perfil e desativar a conta. Administradores podem listar, pesquisar, editar, desativar, reativar e excluir usuários, além de solicitar redefinição de senha.

---

## 📋 2. Descrição e Atores

### Descrição Detalhada

**Por que este requisito existe?**
O sistema precisa permitir a criação de usuários para viabilizar o login e o acesso ao restante do sistema, adicionando uma etapa de verificação do email antes da criação definitiva da conta.

**Contexto do Negócio:**
O sistema precisa saber quem está logado para mostrar os dados referentes ao usuário e evitar vazamento de informações financeiras entre contas diferentes. A verificação por código enviado ao email reduz a possibilidade de cadastro com um endereço eletrônico ao qual o usuário não possui acesso.

### Atores do Sistema

#### Usuário

- **Papel:** Realizar o cadastro, confirmar o email e gerenciar o próprio perfil após o login.
- **Responsabilidade:** Inserir nome, email, senha e o código de 6 dígitos recebido por email.
- **Permissões:**
  - ❌ CREATE direto no banco (a criação é feita pelo backend)
  - ✅ READ indireto (o backend consulta a tabela `usuarios` para verificar duplicidade do email)
  - ✅ UPDATE do próprio nome e desativação da própria conta, por meio do backend
  - ❌ DELETE (não pode deletar)

#### Administrador

- **Papel:** Gerenciar os usuários cadastrados, com sessão autenticada de tipo `Admin`.
- **Responsabilidade:** Consultar a listagem, pesquisar por nome ou ID, editar nome e email, solicitar reset de senha e administrar a situação das contas.
- **Permissões:** Leitura, atualização, ativação, desativação e exclusão por operações administrativas. A desativação administrativa não permite desativar a própria conta nem outra conta de tipo `Admin`.

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
- ✅ Para gerenciar o próprio perfil, sessão válida do RF-001
- ✅ Para gerenciar outros usuários, JWT com tipo `Admin`

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
16. O frontend verifica se o código contém exatamente seis números; se válido, envia `POST /confirmar-cadastro` com `{ nome, email, senha, codigoDigitado }`.
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

### Fluxo Alternativo A11: Limite de requisições atingido

A solicitação de código compartilha o limite de 5 requisições por IP em 15 minutos com a solicitação e confirmação de reset de senha e o logout. A confirmação de cadastro utiliza um limitador separado de 5 requisições por IP em 15 minutos. Ao exceder o limite, o servidor retorna HTTP 429 antes de processar a operação.

### Fluxo — Consulta e atualização do próprio perfil

1. Na tela principal, o usuário acessa o ícone do perfil e abre a tela de edição.
2. O frontend consulta a sessão e carrega `id_usuario`, `nome`, `email`, `status_usuario` e `data_criacao` do usuário autenticado.
3. O nome pode ser alterado; email, status e data de criação são exibidos como campos desabilitados. A senha é representada por um texto mascarado.
4. Ao clicar em "Atualizar", a interface solicita a senha atual em um overlay com opções de confirmar, cancelar e mostrar/ocultar senha.
5. O frontend exige pelo menos 10 caracteres e envia a senha para a operação de confirmação do RF-001.
6. Após HTTP 200 na confirmação, o frontend envia a alteração de nome. O backend identifica a conta pelo JWT e atualiza o campo `nome`.
7. A interface exibe o resultado em um overlay.

### Fluxo — Desativação da própria conta

1. O usuário clica em "Desativar conta" e confirma a ação no overlay.
2. O backend consulta a conta identificada pelo JWT e verifica se ela já está inativa.
3. Para uma conta ativa, define `status_usuario: 'Inativo'` e registra `data_inativacao` com a data e hora atuais.
4. A interface apresenta o resultado e orienta o retorno ao login. A reativação fica disponível ao administrador.

### Fluxo — Redefinição da própria senha

1. Na edição do perfil, o usuário clica em "Resetar senha" e confirma a ação.
2. O frontend solicita logout e abre `/resetar-senha`.
3. O usuário segue o fluxo de código por email e nova senha descrito no [RF-001](rf-001-Login.md).

### Fluxo — Listagem e pesquisa administrativa

1. Um administrador acessa a opção de usuários na tela administrativa.
2. A interface verifica a sessão; ao enviar o formulário de pesquisa, solicita a lista de usuários.
3. O backend aplica autenticação e autorização administrativa, consulta os registros e ordena por `id_usuario` crescente.
4. A lista mostra ID, nome, email, tipo, status, datas de criação e inativação, além das ações "Editar" e "Excluir".
5. A pesquisa aceita parte do nome, sem diferenciar maiúsculas e minúsculas. Termos numéricos também são comparados ao ID exato.
6. Sem pesquisa, a resposta é HTTP 200; com pesquisa, HTTP 201. As respostas da listagem recebem `Cache-Control: no-store`.

### Fluxo — Edição administrativa

1. O administrador seleciona "Editar" na listagem; a tela recebe o ID do usuário selecionado.
2. A interface carrega nome, email, status, data de criação e data de inativação.
3. O administrador pode alterar nome e email. Status, datas e representação da senha permanecem desabilitados para digitação.
4. A interface apresenta validações de nome e email e solicita a senha do administrador autenticado para confirmar a edição.
5. Após confirmar a senha com sucesso, o frontend envia ID, nome e email; o backend atualiza os campos do usuário selecionado.
6. A interface mostra o resultado em um overlay.

### Fluxo — Ativação e desativação administrativa

1. O administrador clica em "Ativar/Desativar conta".
2. A interface consulta a situação do usuário selecionado e apresenta a confirmação correspondente.
3. Na desativação, o backend exige ID, consulta o usuário e impede a desativação da própria conta do administrador ou de outra conta `Admin`.
4. Uma conta ativa elegível passa a `Inativo`, com `data_inativacao` preenchida.
5. Na reativação, uma conta inativa passa a `Ativo`, com `data_inativacao: null`.
6. A interface mostra a resposta em um overlay.

### Fluxo — Solicitação administrativa de reset de senha

1. O administrador clica em "Resetar senha" no perfil selecionado e confirma a ação.
2. O backend consulta `status_reset_senha`; se já houver solicitação pendente, retorna HTTP 400.
3. Caso contrário, define `status_reset_senha: true` e retorna HTTP 200.
4. No próximo login, o usuário recebe a indicação de reset obrigatório e segue para a recuperação por email.
5. A confirmação da nova senha no RF-001 atualiza o hash e redefine `status_reset_senha` para `false`.

### Fluxo — Exclusão administrativa

1. O administrador clica em "Excluir" na listagem.
2. A interface apresenta confirmação com "Continuar" e "Cancelar".
3. Ao continuar, o frontend envia o ID; o backend valida a sessão e o tipo `Admin`, exige o identificador e executa a exclusão permanente na tabela `usuarios`.
4. O backend retorna HTTP 200 após sucesso, e a interface recarrega a página após o clique em "Continuar".

### Resultados alternativos do gerenciamento

- Sessão ausente, inválida ou expirada: HTTP 401; acesso administrativo sem tipo `Admin`: HTTP 403.
- Senha incorreta na confirmação de edição: HTTP 400; a interface permite tentar novamente.
- Conta já desativada ou já ativa na operação correspondente: HTTP 400.
- Desativação administrativa sem ID: HTTP 400; usuário não encontrado: HTTP 404; tentativa de desativar a própria conta ou outro administrador: HTTP 403.
- Exclusão sem ID: HTTP 400; falha na exclusão no banco: HTTP 500.
- Cancelamento de uma confirmação fecha o overlay sem enviar a operação correspondente.

### Regras de Negócio (RN)

| ID        | Regra                               | Descrição                                                                                                                                             |
| --------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| **RN-01** | Email não pode estar cadastrado     | Antes do envio do código, o backend consulta `usuarios`; se encontrar o email, retorna HTTP 409                                                       |
| **RN-02** | Senha válida                        | A senha deve ter no mínimo 10 caracteres; a regra é validada no frontend e novamente em `/confirmar-cadastro`                                         |
| **RN-03** | Nome informado                      | O usuário deve informar o nome; as rotas `/solicitar-codigo` e `/confirmar-cadastro` rejeitam nome ausente                                            |
| **RN-04** | Senha nunca em texto puro           | A senha é convertida em hash bcrypt antes do `insert`; o texto original não é salvo no banco                                                          |
| **RN-05** | Mensagem de erro contextual         | Erros locais de nome, email e senha são exibidos abaixo do campo; erros retornados pelo servidor e erros de código são exibidos em overlay            |
| **RN-06** | Bloqueio durante processamento      | Durante as requisições, o sistema exibe overlay de carregamento enquanto aguarda a resposta                                                           |
| **RN-07** | Verificação por código              | A criação da conta depende da validação de um código de 6 dígitos enviado ao email informado                                                          |
| **RN-08** | Expiração do código                 | O código de verificação expira 10 minutos após ser gerado                                                                                             |
| **RN-09** | Código de uso único                 | Após uma validação bem-sucedida, o código é removido do armazenamento temporário e não pode ser reutilizado                                           |
| **RN-10** | Armazenamento temporário em memória | Os códigos pendentes são mantidos em um `Map` no processo do Node.js                                                                                  |
| **RN-11** | Email de boas-vindas                | Após a criação do usuário, o backend tenta enviar um email de boas-vindas; se o envio falhar, retorna HTTP 201 informando que o usuário já foi criado |
| **RN-12** | Validação antes do `insert`         | `/confirmar-cadastro` valida os campos obrigatórios e o código antes de executar a criação do usuário                                                 |

### Regras de gerenciamento

- O usuário comum é identificado pelo JWT nas operações sobre o próprio perfil; a atualização altera somente `nome`.
- Operações administrativas exigem autenticação e tipo `Admin` verificado no backend.
- As telas de edição solicitam confirmação da senha do usuário que está realizando a operação antes de enviar a atualização.
- Desativar preserva o registro e preenche `data_inativacao`; reativar limpa essa data; excluir remove o registro permanentemente.
- O administrador altera nome e email e solicita reset de senha; a nova senha é definida pelo usuário no fluxo de recuperação.
- A solicitação de reset administrativo é registrada em `status_reset_senha` e encerrada na confirmação da nova senha.

### Requisitos Não-Funcionais (RNF)

| ID         | Atributo              | Requisito                                                          | Métrica/Verificação                                                    | Justificativa                                                 |
| ---------- | --------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------- | ------------------------------------------------------------- |
| **RNF-01** | Performance           | Resposta rápida em condições normais, exceto dependências externas | Tempo observado nas rotas e no envio da Brevo                          | Evita percepção de travamento durante o cadastro              |
| **RNF-02** | Segurança de dados    | Senha armazenada apenas como hash, nunca em texto puro             | Verificação do valor salvo em `usuarios.senha_hash`                    | Protege as credenciais armazenadas                            |
| **RNF-03** | Disponibilidade       | Serviço acessível publicamente via Render                          | Serviço web disponível pela URL publicada                              | Permite acesso remoto sem instalação local                    |
| **RNF-04** | Usabilidade           | Feedback visual de validação e resultado                           | Mensagem sob campos + overlays de carregamento, erro, código e sucesso | Orienta o usuário em cada etapa                               |
| **RNF-05** | Integração externa    | Envio de email através da API da Brevo                             | Resposta HTTP da API `/v3/smtp/email`                                  | Necessário para envio do código e do email de boas-vindas     |
| **RNF-06** | Expiração de segredo  | Código temporário válido por no máximo 10 minutos                  | `TEMPO_EXPIRACAO_MS = 10 * 60 * 1000`                                  | Define o período de validade do código enviado                |
| **RNF-07** | Validação no servidor | Dados de criação validados no backend antes do `insert`            | Resposta HTTP 400 para dados obrigatórios inválidos/incompletos        | Garante aplicação das regras também em chamadas diretas à API |

---

## 🎨 4. Protótipo Funcional — Mockups das Telas

Mockups textuais baseados na [tela de cadastro implementada](../../src/rf-002-Cadastro_usuario/public/cadastrar_usuario.html), incluindo a validação local do código de confirmação.

### Estilo visual implementado

As telas usam [template.css](../../src/rf-002-Cadastro_usuario/public/template.css), compartilhado com o RF-001: fundo `#cadaf2`, fonte Arial, cartões brancos de 420px com largura máxima de 100%, padding de 40px, bordas de 12px e sombra. Os overlays usam fundo preto a 50% de opacidade e caixas de 400px com padding de 40px e rolagem. Campos desabilitados têm fundo cinza. Erros aparecem em vermelho e sucesso em verde.

### Mockup - Tela 1: Cadastro inicial

```text
┌────────────────────────────────────────────────────────────┐
│ CashLand                                      [ Voltar ]   │
│ Cadastro de usuario                                        │
│                                                            │
│ Nome:  [Ex: Daniel________________________]                │
│                                                            │
│ Email: [Ex: Daniel@gmail.com______________]                │
│                                                            │
│ Senha: [Ex: Dani@wpm#0*7__________________]                │
│                                                            │
│                        [ Enviar ]                          │
└────────────────────────────────────────────────────────────┘
```

Os textos dos campos são placeholders. O formulário `#meuForm` usa `#Nome`, `#Email` e `#Senha`; “Voltar” abre `/login`.

### Mockup - Tela 2: Cadastro preenchido

```text
┌────────────────────────────────────────────────────────────┐
│ CashLand                                      [ Voltar ]   │
│ Cadastro de usuario                                        │
│                                                            │
│ Nome:  [Daniel____________________________]                │
│                                                            │
│ Email: [daniel@gmail.com__________________]                │
│                                                            │
│ Senha: [••••••••••••______________________]                │
│                                                            │
│                        [ Enviar ]                          │
└────────────────────────────────────────────────────────────┘
```

“Enviar” valida os campos localmente e, quando válidos, solicita o código por `POST /solicitar-codigo`. A senha permanece oculta no campo.

### Mockup - Tela 3: Erros locais no cadastro

```text
┌────────────────────────────────────────────────────────────┐
│ CashLand                                      [ Voltar ]   │
│ Cadastro de usuario                                        │
│                                                            │
│ Nome:  [__________________________________]                │
│        ERRO: O nome não pode estar vazio                   │
│                                                            │
│ Email: [daniel____________________________]                │
│        ERRO: insira um email valido                        │
│                                                            │
│ Senha: [•••_______________________________]                │
│        ERRO: A senha deve ter no minimo 10 caracteres      │
│                                                            │
│                        [ Enviar ]                          │
└────────────────────────────────────────────────────────────┘
```

`MostrarErro` escreve as mensagens vermelhas abaixo dos campos em `#erro-nome`, `#erro-email` e `#erro-senha`. Nome vazio, email sem `@` ou `.com` e senha com menos de 10 caracteres impedem a solicitação do código.

### Mockup - Tela 4: Carregamento

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

O `#loading-overlay` aparece durante a solicitação e a confirmação do código. A caixa `.loading-box` exibe o indicador `.spinning-wheel`.

### Mockup - Tela 5: Confirmação do código

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │        Digite o código enviado para o seu email        │   │
│ │                                                        │   │
│ │                   Código: [ 000000 ]                   │   │
│ │                                                        │   │
│ │              [ Confirmar ] [ Cancelar ]                │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

A resposta HTTP 200 de `/solicitar-codigo` abre `#solicitacaoCodigo-overlay`. O formulário `#meuForm-confirmar-cadastro` contém `#input-codigo`, com `maxlength="6"`, `inputmode="numeric"`, `pattern="\d{6}"`, `required` e `autocomplete="one-time-code"`. “Cancelar” fecha essa janela e mantém o formulário de cadastro.

### Mockup - Tela 6: Código inválido no frontend

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │        Digite o código enviado para o seu email        │   │
│ │                                                        │   │
│ │                   Código: [ abc123 ]                   │   │
│ │        ERRO: O código deve ter exatamente 6 números    │   │
│ │                                                        │   │
│ │              [ Confirmar ] [ Cancelar ]                │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

O formulário usa `novalidate`: ao clicar em “Confirmar”, o JavaScript verifica `/^\d{6}$/`. Código vazio, incompleto ou com caracteres não numéricos gera mensagem vermelha em `#erro-codigo`, abaixo do input. A janela permanece aberta e o `return` impede `POST /confirmar-cadastro`. Ao enviar um código no formato correto, a mensagem é limpa e a requisição prossegue.

### Mockup - Tela 7: Erro retornado pela API

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │                                                        │   │
│ │              Esse email já está cadastrado             │   │
│ │                                                        │   │
│ │                    [ Continuar ]                       │   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Exemplo de HTTP 409 em `/solicitar-codigo`. O mesmo `#resultado-overlay` apresenta em vermelho as mensagens de dados inválidos, falha no envio do email ou falha ao criar o usuário. Quando `/confirmar-cadastro` retorna HTTP 401, exibe a mensagem do código (por exemplo, **“codigo incorreto”**) e “Continuar” reabre a janela de confirmação.

### Mockup - Tela 8: Cadastro concluído

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │                                                        │   │
│ │           Cadastro realizado com sucesso,              │   │
│ │                  prossiga para o login!                │   │
│ │                                                        │   │
│ │                    [ Continuar ]                       │   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

A resposta HTTP 200 de `/confirmar-cadastro` aparece em verde. “Continuar” fecha o resultado e redireciona para `/login`.

### Mockup - Tela 9: Cadastro criado sem email de boas-vindas

```text
┌──────────────────────────────────────────────────────────────┐
│ Página ao fundo escurecida                                   │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐   │
│ │                                                        │   │
│ │      Usuario criado, mas o email de confirmação        │   │
│ │                     não foi enviado                    │   │
│ │                                                        │   │
│ │                    [ Continuar ]                       │   │
│ │                                                        │   │
│ └────────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

Esse estado corresponde a HTTP 201 de `/confirmar-cadastro`. O frontend o apresenta como sucesso, em verde, pois a conta foi criada. “Continuar” redireciona para `/login`.

### Estados e navegação

| Situação                             | Apresentação                       | Ação seguinte                                   |
| ------------------------------------ | ---------------------------------- | ----------------------------------------------- |
| Formulário inicial ou preenchido     | Nome, email e senha no cartão      | “Enviar” valida os campos                       |
| Dados locais inválidos               | Mensagem vermelha abaixo do campo  | Corrigir e enviar novamente                     |
| Requisição em andamento              | Overlay de carregamento            | Aguardar a resposta                             |
| Código enviado                       | Overlay de confirmação do código   | Informar seis números e confirmar               |
| Código fora do formato               | Mensagem vermelha abaixo do código | Corrigir na mesma janela; nenhuma chamada à API |
| Erro da API ao solicitar código      | Overlay de resultado               | “Continuar” fecha a mensagem                    |
| Código rejeitado pela API (HTTP 401) | Overlay de erro                    | “Continuar” reabre a confirmação                |
| Confirmação cancelada                | Fecha o overlay de código          | Formulário principal permanece preenchido       |
| Cadastro criado (HTTP 200 ou 201)    | Overlay de sucesso                 | “Continuar” abre `/login`                       |

### Elementos e funções utilizados

- `MostrarErro(id, mensagem)`: erros locais do formulário e do código.
- `MostrarResultado_Overlay(tipo, mensagem)`: resultado da API em `#resultado-funcao`, dentro de `#resultado-overlay`.
- `FechaResultado_overlay(1)`: fecha o resultado e reabre o código ou retorna ao login, conforme o estado.
- `FechaResultado_overlay(2)`: fecha a janela de código.
- `.input-dados`, `#id-Titulo`, `#botao-Voltar` e `#input-submit`: organização do formulário principal.
- `.loading-overlay`, `.loading-box` e `.spinning-wheel`: estrutura das janelas e do carregamento.

### Telas de gerenciamento

- [Edição do próprio perfil](../../src/rf-002-Cadastro_usuario/public/editar_usuario.html): cabeçalho com usuário e saída; cartão com nome, email, senha mascarada, status e data de criação; ações de atualizar, resetar senha e desativar conta.
- [Listagem administrativa](../../src/rf-002-Cadastro_usuario/public/listar_usuarios.html): pesquisa por ID ou nome, dados dos usuários e botões de editar e excluir; confirmação antes da exclusão.
- [Edição administrativa](../../src/rf-002-Cadastro_usuario/public/ADMIN_editar_usuario.html): nome e email editáveis, dados de situação e datas, solicitação de reset e botão de ativação/desativação; overlay de senha para confirmar a atualização.

### Responsividade

Cartões e overlays respeitam a largura disponível. As caixas de overlay têm altura máxima de `calc(100dvh - 40px)` e rolagem. Em telas de até 600px, os cartões e overlays usam padding de 24px, os contêineres usam 16px e o cabeçalho reorganiza a navegação.

---

## 🏗️ 5. Arquitetura e ADR

### Diagrama de Componentes

```
┌─────────────────────────────────────────┐
│      Frontend (servido pelo Express)    │
│  • cadastrar_usuario.html              │
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

### ADR-013: Gerenciamento integrado à sessão do RF-001

**Status:** ACEITO

**Decisão:** Centralizar as operações no [Servidor.js](../../src/rf-001-Login/Servidor.js), reutilizando `autenticar` e `somenteAdmin`. As páginas enviam o cookie com `credentials: 'include'` e consultam `/me` para carregar a sessão.

**Consequências:** Operações do próprio perfil usam a identidade do JWT. Operações administrativas recebem o identificador do usuário a ser gerenciado e verificam o tipo do operador no backend.

### ADR-014: Situação da conta e reset administrativo

**Status:** ACEITO

**Decisão:** Representar ativação por `status_usuario`, registrar a desativação em `data_inativacao` e manter a solicitação de reset em `status_reset_senha`.

**Consequências:** Contas inativas são recusadas no login. A reativação limpa a data de inativação. O reset administrativo direciona o usuário à recuperação de senha no próximo login.

### ADR-015: CSS compartilhado e controle de requisições

**Status:** ACEITO

**Decisão:** Reutilizar `template.css` nas telas de autenticação e usuários e aplicar `express-rate-limit` à solicitação de código e à confirmação do cadastro.

**Consequências:** As páginas compartilham estilos e adaptação para telas menores; requisições acima dos limites configurados recebem HTTP 429.

### Tecnologias Escolhidas

| Camada/Finalidade        | Tecnologia / Serviço  | Justificativa                                            |
| ------------------------ | --------------------- | -------------------------------------------------------- |
| Backend                  | Express               | Utilizado pelo módulo de login e pelas rotas do sistema  |
| Banco de Dados           | Supabase (PostgreSQL) | Armazena os usuários e seus hashes de senha              |
| Hash                     | bcrypt                | Função `gerarHashSenha` reutilizada do RF-01             |
| Email transacional       | Brevo API             | Envio do código de verificação e do email de boas-vindas |
| Armazenamento temporário | JavaScript `Map`      | Mantém os códigos pendentes e seus horários de expiração |
| Documentação de API      | swagger-ui-express    | Interface disponível em `/api-docs`                      |
| Hospedagem               | Render                | Serviço web público, com `PORT` fornecida pelo ambiente  |

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
12. Frontend valida os seis dígitos do código e, se válido, envia `POST /confirmar-cadastro` com `{ nome, email, senha, codigoDigitado }`.
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
