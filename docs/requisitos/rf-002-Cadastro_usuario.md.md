# RF-002 — Cadastro de Novo Usuário

## 🎯 1. Identificação do Requisito

| Campo | Valor |
|---|---|
| **ID** | RF-002 |
| **Título** | Cadastro de Novo Usuário no Sistema |
| **Tipo** | Requisito Funcional |
| **Prioridade** | ALTA (bloqueia os demais requisitos, exceto o RF-01) |
| **Complexidade** | MÉDIA (estimado 5 story points) |
| **Status** | Concluído |
| **Data de Criação** | 08/09/2026 |
| **Última Atualização** | 08/09/2026 |

**Breve Descrição:**
O sistema deve permitir que o usuário crie um novo cadastro informando nome, email válido e senha, que será armazenada de forma criptografada (hash).

---

## 📋 2. Descrição e Atores

### Descrição Detalhada

**Por que este requisito existe?**
O sistema precisa permitir a criação de usuários para viabilizar o login e o acesso ao restante do sistema.

**Contexto do Negócio:**
O sistema precisa saber quem está logado para mostrar os dados referentes ao usuário e evitar vazamento de informações financeiras entre contas diferentes.

### Atores do Sistema

#### Usuário

- **Papel:** Realizar o cadastro.
- **Responsabilidade:** Inserir nome, email válido e senha.
- **Permissões:**
  - ❌ CREATE (criar novo usuário ou transferência)
  - ✅ READ (o backend faz `SELECT` na tabela `usuarios`, indiretamente em nome do usuário)
  - ❌ UPDATE (não pode editar dados de outros)
  - ❌ DELETE (não pode deletar)

#### Sistema (ator automático)

- **Papel:** Validar os dados inseridos e criar o novo usuário.
- **Responsabilidade:** Verificar se os campos foram preenchidos corretamente e criar o novo usuário no banco de dados com a senha em hash.
- **Permissões:**
  - ✅ Todas as operações (CRUD completo sobre a tabela `usuarios`, executadas via `service_role` key do Supabase)

---

## 🔄 3. Especificação de Casos de Uso + Requisitos Não-Funcionais

### Pré-Condições

- ✅ Serviço Web (Render) funcionando
- ✅ Usuário tem um email válido (contendo `@`)
- ✅ Banco de dados Supabase funcionando

### Pós-Condições (Sucesso)

- ✅ Usuário cadastrado na tabela `usuarios`
- ✅ Possibilidade de realizar login com as credenciais criadas

### Pós-Condições (Falha)

- ✅ Mensagem de erro exibida ao usuário
- ✅ Nenhum dado é gravado no banco

### Fluxo Principal

1. Usuário insere o nome no campo "Nome".
2. Usuário insere o email no campo "Email".
3. Usuário insere a senha no campo "Senha".
4. Usuário clica no botão "Enviar".
5. O sistema bloqueia as ações do usuário (overlay de carregamento).
6. O sistema verifica se algum dos dados recebidos está vazio ou se o email é válido.
7. Sistema envia os dados via `fetch` para a rota `POST /cadastro-usuario`.
8. O servidor recebe os dados e verifica se o email já está cadastrado.
9. O servidor gera o hash da senha digitada pelo usuário.
10. Servidor realiza um `insert` no banco de dados com os dados recebidos.
11. O servidor retorna a mensagem: "Cadastro realizado com sucesso, prossiga para o login!".
12. O sistema libera as ações do usuário (remove o overlay).
13. O sistema mostra um `alert` com a mensagem retornada pelo servidor.
14. Usuário clica no botão "Voltar" para ir à página de login.

### Fluxo Alternativo A1: Campo vazio, senha curta ou email inválido

```
6a.1. Sistema detecta que nome, email ou senha está vazio, ou que a senha
      tem menos de 10 caracteres, ou que o email não contém "@".
6a.2. Sistema exibe mensagem informando a obrigatoriedade/formato esperado,
      em texto vermelho, logo abaixo do campo correspondente.
6a.3. Usuário pode tentar inserir as informações novamente.
```

### Fluxo Alternativo A2: Email já cadastrado

```
8a.1. Sistema detecta que o email já está cadastrado na tabela usuarios.
8a.2. Sistema retorna mensagem informando que o email já está em uso.
8a.3. Usuário pode tentar inserir outro email.
```

### Fluxo Alternativo A3: Usuário desiste do cadastro

```
1a.1. Usuário desiste de realizar o cadastro.
1a.2. Usuário clica no botão "Voltar".
1a.3. Usuário retorna à tela de login.
```

### Regras de Negócio (RN)

| ID | Regra | Descrição |
|---|---|---|
| **RN-01** | Email único | Email deve ser único no sistema; não permitir duplicatas |
| **RN-02** | Senha válida | A senha deve ter no mínimo 10 caracteres |
| **RN-03** | Nome informado | O usuário deve ter o nome cadastrado |
| **RN-04** | Senha nunca em texto puro | A senha é convertida em hash (bcrypt) antes de ser salva; o texto original nunca é armazenado |
| **RN-05** | Mensagem de erro contextual | Cada erro de validação é exibido próximo ao campo correspondente (nome, email ou senha), não como mensagem genérica única |
| **RN-06** | Bloqueio durante processamento | Enquanto a requisição de cadastro está em andamento, o sistema exibe um overlay de carregamento que impede novas interações do usuário, evitando envios duplicados |

### Requisitos Não-Funcionais (RNF)

| ID | Atributo | Requisito | Métrica | Justificativa |
|---|---|---|---|---|
| **RNF-01** | Performance | Resposta em menos de 2 segundos em condições normais | Tempo médio de resposta | Evita que o usuário ache que o cadastro travou |
| **RNF-02** | Segurança de dados | Senha armazenada apenas como hash, nunca em texto puro | Verificação do valor salvo na tabela `usuarios` | Protege credenciais mesmo em caso de vazamento do banco |
| **RNF-03** | Disponibilidade | Serviço acessível publicamente via Render | Uptime observado | Necessário para testes remotos do professor, sem exigir instalação local |
| **RNF-04** | Usabilidade | Feedback visual imediato de erro de validação por campo | Presença de mensagem de erro visível abaixo de cada campo inválido | Reduz frustração e tentativa-e-erro do usuário |

> **Observação sobre RNF-03:** o projeto roda no plano gratuito do Render, que não garante SLA formal e "dorme" após inatividade — a primeira requisição após um período parado pode levar 30-50 segundos. Isso é declarado aqui como limitação conhecida do ambiente de hospedagem, não como falha do sistema.

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

**Mockup - Tela 3: Carregando (overlay já implementado)**

```
┌────────────────────────────────────────────────┐
│                                                │
│        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│        ▓                                  ▓    │
│        ▓        ┌──────────────┐          ▓    │
│        ▓        │ Carregando...│          ▓    │
│        ▓        └──────────────┘          ▓    │
│        ▓                                  ▓    │
│        ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  │
│                                                │
└────────────────────────────────────────────────┘
```
> Implementação real: `#loading-overlay` cobre a tela inteira com fundo escurecido (`rgba(0,0,0,0.5)`) e uma caixa branca central com o texto "Carregando...". Bloqueia visualmente a interação até a resposta do servidor chegar.

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
> **Gap em relação ao modelo de referência:** o modelo pede validação visual com borda vermelha/verde e checkmark nos campos. A implementação atual mostra a mensagem de erro em texto vermelho abaixo do campo, mas não altera a borda do input nem exibe checkmark de sucesso.

**Mockup - Tela 5: Sucesso (via `alert`)**

```
┌────────────────────────────────────────────────┐
│  🌐 seu-app.onrender.com diz              [ X ] │
├────────────────────────────────────────────────┤
│                                                │
│   Cadastro realizado com sucesso,             │
│   prossiga para o login!                       │
│                                                │
│                              [   OK   ]        │
└────────────────────────────────────────────────┘
```
> A confirmação de sucesso hoje é um `alert()` nativo do navegador, não uma tela dedicada de confirmação como no modelo de referência (que mostra dados salvos e botões de ação).

**Descrição de Estados:**

- **Estado Normal:** campos em branco, botão habilitado
- **Estado Preenchido:** sem indicação visual de validação nos campos (diferente do checkmark do modelo)
- **Estado Erro:** mensagem de texto vermelho abaixo do campo específico
- **Estado Loading:** overlay de tela cheia com caixa "Carregando..."
- **Estado Sucesso:** `alert()` nativo do navegador com a mensagem do servidor

**Fluxo de Navegação:**

1. Usuário chega em `/login` → clica em "Cadastrar novo usuario".
2. Abre `/cadastro-usuario`.
3. Preenche nome, email e senha.
4. Clica em "Enviar".
5. Se validação local falhar → mostra erro por campo, mantém dados preenchidos.
6. Se validação passar → overlay de loading, envia ao servidor.
7. Se sucesso → alerta de confirmação → usuário clica "Voltar" para ir ao login.
8. Se erro do servidor (ex: email duplicado) → alerta ou mensagem de erro, mantém formulário preenchido.

**Responsividade:**

- **Mobile (320px):** o layout atual usa largura fixa (`width: 420px` no `#div-Login`) — não é responsivo hoje; em telas menores que 420px, o card estoura a largura da viewport.
- **Desktop (1024px+):** funciona bem, card centralizado.

---

## 🏗️ 5. Arquitetura e ADR

### Diagrama de Componentes

```
┌──────────────────────────────────────┐
│   Frontend (servido pelo Express)    │
│  • /cadastro-usuario → index.html    │
│  • Validação client-side (nome,      │
│    formato de email, tamanho senha)  │
└──────────────────┬───────────────────┘
                   │ POST /cadastro-usuario (mesma origem)
                   ▼
┌──────────────────────────────────────┐
│      API REST Backend                │
│     Node.js 20 + Express 5           │
│  • Verifica email duplicado (SELECT) │
│  • Gera hash da senha (bcrypt)       │
│  • Insere novo usuário (INSERT)      │
│  • Hospedado no Render (Web Service) │
└──────────────────┬───────────────────┘
                   │ SDK oficial (@supabase/supabase-js)
                   ▼
┌──────────────────────────────────────┐
│     Supabase (PostgreSQL gerenciado) │
│  • Tabela: usuarios                  │
│  • Constraint UNIQUE em email        │
│    (necessária para RN-01)           │
└──────────────────────────────────────┘
```

### ADR-006: Verificação de duplicidade de email antes do insert

**Status:** ACEITO

**Contexto:** É preciso impedir dois cadastros com o mesmo email (RN-01), evitando ambiguidade no login.

**Decisão:** Fazer um `SELECT` prévio (`maybeSingle()`) filtrando por `email` antes de tentar o `INSERT`, retornando erro caso já exista.

**Alternativas consideradas:** Confiar apenas em uma constraint `UNIQUE` no banco e tratar o erro de violação na resposta do `insert` — mais robusto contra condições de corrida, mas exige tratar o código de erro específico do Postgres (`23505`).

**Consequências:** ✅ Mensagem de erro clara e imediata para o usuário; ⚠️ Tecnicamente vulnerável a uma condição de corrida rara (duas requisições simultâneas passando pelo `SELECT` antes de qualquer `INSERT` completar) — mitigável adicionando também uma constraint `UNIQUE` no banco como segunda camada de proteção.

### ADR-007: Validação duplicada (frontend + backend)

**Status:** PARCIALMENTE ACEITO (frontend completo, backend pendente)

**Contexto:** Validação apenas no frontend pode ser contornada por requisições diretas à API (Swagger, curl, Postman).

**Decisão:** Implementar a mesma validação (campos obrigatórios, formato de email, tamanho mínimo de senha) tanto no JavaScript do cliente quanto na rota `POST /cadastro-usuario`.

**Estado atual:** Implementado apenas no frontend. Backend ainda aceita requisições sem validar esses campos.

**Consequências:** ⚠️ Risco de dados inválidos entrando no banco via chamada direta à API; ✅ Fácil de corrigir replicando a mesma checagem no `Servidor.js`.

### Tecnologias Escolhidas (reaproveitadas do RF-01)

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Backend | Express 5 | Já em uso no módulo de login |
| BD | Supabase (PostgreSQL) | Mesma tabela `usuarios` do login |
| Hash | bcrypt | Mesma função `gerarHashSenha` do RF-01 |
| Documentação de API | swagger-ui-express | Já configurado, cobre também esta rota |

### Fluxo de Dados

1. Frontend valida campos localmente e envia `POST /cadastro-usuario` com `{ nome, email, senha }`.
2. Backend consulta `usuarios` filtrando por `email` (`maybeSingle`).
3. Se encontrado → resposta de erro (email já cadastrado).
4. Se não encontrado → gera hash da senha (`gerarHashSenha`) e insere novo registro.
5. Erro no insert → resposta de erro do servidor.
6. Sucesso → resposta de sucesso com mensagem de confirmação.

---

## 🔒 6. Validação de Segurança OWASP

### A02:2021 — Cryptographic Failures

**Vulnerabilidade:** Armazenar a senha do novo usuário em texto puro exporia todas as credenciais em caso de vazamento do banco.

**Implementação:**

```javascript
const { error } = await supabase
    .from('usuarios')
    .insert({
        nome: nome,
        email: email,
        senha_hash: await gerarHashSenha(senha)   // nunca salva "senha" diretamente
    })
```

**Teste:**

```javascript
// Cadastro com senha "MinhaSenha123456"
// Verificação na tabela usuarios:
SELECT senha_hash FROM usuarios WHERE email = 'daniel@gmail.com';
// Resultado esperado: $2b$10$... (hash bcrypt, nunca "MinhaSenha123456")
```

### A04:2021 — Insecure Design (validação de entrada)

**Vulnerabilidade:** Sem validação de tamanho/formato, um atacante poderia cadastrar senhas triviais (`"123"`) ou registros com campos vazios, fragilizando a segurança de contas futuras.

**Implementação (frontend, hoje):**

```javascript
if (!senha || senha.length < 10) {
    document.getElementById("erro-senha").innerHTML = `
        <h5 style="color: rgb(160, 2, 2);">ERRO: A senha deve ter no minimo 10 caracteres</h5>`;
}
```

**Teste:**

```
Entrada: senha = "123"
Resultado: cadastro bloqueado no frontend, mensagem de erro exibida
```

**⚠️ Nota de segurança importante:** essa validação hoje existe somente no frontend. Do ponto de vista OWASP, isso não conta como controle efetivo — qualquer requisição feita diretamente à API (via Swagger `/api-docs`, por exemplo) ignora essa checagem completamente. Para esse controle valer como proteção real (e não só UX), a mesma validação precisa ser replicada no `Servidor.js`.
