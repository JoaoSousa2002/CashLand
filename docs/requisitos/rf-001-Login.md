## 🎯 1. IDENTIFICAÇÃO DO REQUISITO

**ID:** RF-001
**Título:** Sistema de Login
**Tipo:** Requisito Funcional
**Prioridade:** ALTA (É necessario estar logado para acessar o sistema e realizar qualquer operação)
**Complexidade:** MÉDIA (estimado 5 story points)
**Status:** Finalizado
**Data de Criação:** 06/09/2026
**Última Atualização:** 07/09/2026

**Breve Descrição:**
O sistema deve ter sistema de autenticação obrigatoria para acessar o sistema.



## 📋 2. DESCRIÇÃO E ATORES

**Descrição Detalhada:**

**Por que este requisito existe?**

O sistema precisa autenticas usuarios para:

- Evitar acesso indevido.
- Possibilitar o uso de diferentes usuarios.
- Assegurar a segurança sobre as informações financeiras.

**Contexto do Negócio:**

O sistema precisa saber quem está logado para mostrar os dados referentes ao usuario e evitar vazamento de informações financeiras.

---

**Atores do sistema:**

# Usuario

- **Papel:** Realizar o login.

- **Responsabilidade:** Inserir email e senha corretos.

- **Permissões:**
  
  - ❌ CREATE (criar novo usuario ou transferencia)
  
  - ✅ READ (O backend faz `SELECT` na tabela `usuarios`)
  
  - ❌ UPDATE (não pode editar dados de outros)
  
  - ❌ DELETE (não pode deletar)



# Sistema (Ator automatico)

- **Papel:** Valida a entrada de usuarios.

- **Responsabilidae:** Verifica se os campos foram preenchidos e compara a senha inserida com a senha hash no banco de dados.

- **Permissões:**
  
  - ✅ Todas operações



## 🔄 3. ESPECIFICAÇÃO DE CASOS DE USO + REQUISITOS NÃO-FUNCIONAIS

### Pré-Condições

- ✅ Usuario cadastrado no banco de dados
- ✅ Serviço WEB render funcionando
- ✅ Banco de dados SUPABASE funcionando

### Pós-Condições (Sucesso)

- ✅ Usuario autenticado

### Pós-Condições (Falha)

- ✅ Mensagem de erro exibida ao usuário



### Fluxo principal

1. Usuario insere o email no campo "Email"

2. Usuario insere a senha no campo "Senha"

3. Usuario aperta no botão "Entrar"

4. Sistema envia os dados via fetch para o Servidor

5. Servidor verifica se algum dos dados recebidos está vazio

6. Servidor faz uma solicitação dos dados email e senha hash ao banco de dados

7. Servidor recebe os dados solicitados

8. Servidor compara o email para saber se já está cadastrado

9. Servidor compara a senha digitada com a senha hash cadastrada

10. Servidor retorna mensagem informando se as credenciais informadas estão corretas e autoriza login



### Fluxos alternativo A1: Campo email ou senha vazio

```
5a.1. Sistema detecta que a informação email ou senha está vazio
5a.2. Sistema retorna mensagem informando a obrigatoriedade das informações email e senha
5a.3. Usuario pode tentar inserir os campos faltantes
```



### Fluxo alternativo A2: Usuario não cadastrado

```
8a.1. Sistema detecta que o email não está cadastrado no banco de dados
8a.2. Sistema retorna mensagem informando "Email ou senha inválidos 
8a.3. Usuario pode tentar inserir outro email
```



### Fluxo alternativo A3: Senha incorreta

```
9a.1. Sistema detecta que a senha digitada não é a cadastrada no banco de dados
9a.2. Sistema retorna mensagem informando "Email ou senha inválidos
9a.3. Usuario pode tentar inserir a senha novamente
```

### Regras de negócio (RN)

| ID   | Regra                                                                                                                                                                             |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| RN01 | A senha nunca é armazenada em texto puro — apenas como hash (bcrypt)                                                                                                              |
| RN02 | O sistema não retorna o `senha_hash` em nenhuma resposta da API                                                                                                                   |
| RN03 | Toda tentativa de login exige `email` e `senha` no corpo da requisição; faltando algum, é rejeitada antes de consultar o banco                                                    |
| RN04 | A mensagem de erro é sempre genérica ("Email ou senha inválidos"), independentemente de o problema ser o email não encontrado ou a senha incorreta — evita enumeração de usuários |
| RN05 | Login bem-sucedido retorna apenas dados básicos do usuário (`id`, `nome`) — nunca dados sensíveis                                                                                 |
| RN06 | Login é uma pré-condição dependente do RF02: só é possível autenticar um usuário já cadastrado previamente                                                                        |
| RN07 | A comparação de senha é feita exclusivamente no backend (`bcrypt.compare`) — nunca no cliente                                                                                     |

### Requisitos Não-Funcionais (RNF)

| ID         | Atributo        | Requisito               | Métrica                 | Justificativa                              |
| ---------- | --------------- | ----------------------- | ----------------------- | ------------------------------------------ |
| **RNF-01** | Performance     | Resposta em <5 segundos | Tempo médio de resposta | UX: usuário não fica esperando             |
| **RNF-02** | Usabilidade     | Design minimalista      | Conexões concorrentes   | O sistema deve ter um design facil de usar |
| **RNF-03** | Disponibilidade | 99% uptime em produção  | N/A                     | Negócio depende da aplicação               |



## 🎨 4. PROTÓTIPO FUNCIONAL (HTML + CSS + CÓDIGO + BD + DEPLOY)

**Mockup - Tela 1: Formulário Vazio (Estado Inicial)**

```
┌────────────────────────────────────────────────┐
│                                                │
│                   CashLand                     │
│                                                │
│  🔐 Login                                      │
│                                                │
│  Email:  [_________________________]          │
│                                                │
│  Senha:  [_________________________]          │
│                                                │
│              [ ENTRAR ]                        │
│                                                │
└────────────────────────────────────────────────┘
```

**Mockup - Tela 2: Formulário Preenchido**

```
┌────────────────────────────────────────────────┐
│                                                │
│                   CashLand                     │
│                                                │
│  🔐 Login                                      │
│                                                │
│  Email:  [joao.silva@email.com     ]           │
│                                                │
│  Senha:  [••••••••••••             ]           │
│                                                │
│              [ ENTRAR ]                        │
│                                                │
└────────────────────────────────────────────────┘
```

**Mockup - Tela 3: Carregando (Processando)**

```
┌────────────────────────────────────────────────┐
│                                                │
│                   CashLand                     │
│                                                │
│  🔐 Login                                      │
│                                                │
│  Email:  [joao.silva@email.com     ]           │
│                                                │
│  Senha:  [••••••••••••             ]           │
│                                                │
│         [ ENTRANDO... ⟳ ]  (desabilitado)      │
│                                                │
└────────────────────────────────────────────────┘
```

**Mockup - Tela 4: Erro (Credenciais Inválidas)**

```
┌────────────────────────────────────────────────┐
│  🌐 localhost:3000 diz                    [ X ] │
├────────────────────────────────────────────────┤
│                                                │
│   Email ou senha inválidos                    │
│                                                │
│                                                │
│                              [   OK   ]        │
└────────────────────────────────────────────────┘
```

> Observação: a mensagem não indica qual dos dois campos está incorreto (RN04 — proteção contra enumeração de usuários).

**Mockup - Tela 5: Sucesso**

```
┌────────────────────────────────────────────────┐
│  🌐 localhost:3000 diz                    [ X ] │
├────────────────────────────────────────────────┤
│                                                │
│   Login realizado com sucesso                 │
│                                                │
│                                                │
│                              [   OK   ]        │
└────────────────────────────────────────────────┘
```

**Descrição de Estados:**

- **Estado Normal:** Campos de email e senha em branco, botão "Entrar" habilitado
- **Estado Preenchido:** Campos com dados digitados, senha mascarada (`type="password"`)
- **Estado Loading:** Botão desabilitado com indicador de carregamento, evita duplo envio
- **Estado Erro:** Campos destacados, mensagem genérica única para email ou senha incorretos
- **Estado Sucesso:** Confirmação exibida, nome do usuário retornado pela API

**Fluxo de Navegação:**

1. Página inicial (`/`) → Formulário de login carregado
2. Usuário preenche Email e Senha
3. Clica em "Entrar" → requisição `POST /login`
4. Se sucesso (`200`) → Exibe mensagem + segue para próxima tela (painel financeiro, ainda não implementado)
5. Se erro (`401`) → Exibe mensagem genérica + mantém o campo de email preenchido (senha é limpa por segurança)
6. Se campos vazios (`400`) → Bloqueia envio antes mesmo de consultar o servidor

**Responsividade:**

- **Mobile (320px):** Card de login ocupa quase toda a largura da tela, botão full-width
- **Tablet (768px):** Card centralizado com largura fixa (~320px), como já implementado no CSS atual
- **Desktop (1024px+):** Mesmo layout centralizado — não há necessidade de duas colunas para um formulário tão simples



## 🏗️ 5. ARQUITETURA E ADR

### Diagrama de Componentes

```
┌──────────────────────────────────────┐
│     Frontend (servido pelo Express)  │
│  HTML5 + CSS3 + JavaScript (ES2015+) │
│  • index.html (Formulário + fetch)   │
│  • Servido via Express.static        │
│  • Mesmo domínio do backend          │
└──────────────────┬───────────────────┘
                   │ HTTPS (mesma origem — sem CORS cross-domain)
                   ▼
┌──────────────────────────────────────┐
│      API REST Backend                │
│     Node.js 20 + Express 5           │
│  • POST /login (autenticação)        │
│  • Autenticacao.js (bcrypt)          │
│  • CORS restrito a origem confiável  │
│  • Hospedado no Render (Web Service) │
└──────────────────┬───────────────────┘
                   │ SDK oficial (@supabase/supabase-js)
                   │ com service_role key (ignora RLS)
                   ▼
┌──────────────────────────────────────┐
│     Supabase (PostgreSQL gerenciado) │
│  • Tabela: usuarios                  │
│  • Colunas: id_usuario, nome, email, │
│    senha_hash                        │
│  • Consultas parametrizadas via SDK  │
│  • Backups automáticos (gerenciado)  │
└──────────────────────────────────────┘
```

---

## ADR — Registro de Decisões de Arquitetura

### ADR-001: Supabase como camada de banco de dados

**Status:** ACEITO

**Contexto:** O projeto precisa de um banco relacional com consistência ACID, sem exigir provisionamento manual de infraestrutura de banco por parte da equipe.

**Decisão:** Usar Supabase (PostgreSQL gerenciado) via SDK oficial (`@supabase/supabase-js`), acessado pelo backend com a chave `service_role`.

**Alternativas consideradas:** PostgreSQL autogerenciado (exige provisionar e manter servidor), MongoDB (sem necessidade de transações complexas neste módulo, mas perde garantias relacionais).

**Consequências:** ✅ Sem necessidade de administrar servidor de banco; ✅ Backups automáticos; ⚠️ Uso da `service_role` key exige cuidado redobrado para nunca vazar essa credencial, já que ela ignora as políticas de RLS.

---

### ADR-002: bcrypt para hash de senhas

**Status:** ACEITO

**Contexto:** Senhas de usuários precisam ser armazenadas de forma segura e irreversível, nunca em texto puro.

**Decisão:** Usar `bcrypt` com `saltRounds = 10` para gerar o hash antes de salvar, e `bcrypt.compare` para validar no login.

**Alternativas consideradas:** SHA-256 puro (rápido demais, vulnerável a força bruta em GPU sem custo computacional ajustável), Argon2 (mais recente, mas bcrypt já é maduro, amplamente testado e recomendado pela OWASP).

**Consequências:** ✅ Recomendado pela OWASP; ✅ Custo computacional ajustável via `saltRounds`

---

### ADR-003: Backend como Web Service (não Static Site) no Render

**Status:** ACEITO

**Contexto:** A autenticação exige lógica de servidor (consulta ao Supabase, comparação de hash) que não pode rodar no navegador do cliente, já que a chave `service_role` do Supabase precisa ficar protegida no backend.

**Decisão:** Publicar como **Web Service** no Render, executando `node Servidor.js` como processo persistente, em vez de **Static Site** (que serviria apenas arquivos estáticos, sem capacidade de rodar Express ou proteger credenciais).

**Alternativas consideradas:** Static Site + backend serverless separado (adicionaria complexidade de CORS entre domínios sem necessidade real neste estágio do projeto).

**Consequências:** ✅ Suporta a lógica de autenticação completa; ✅ Frontend e backend no mesmo domínio, eliminando CORS cross-origin; ⚠️ Plano gratuito do Render "dorme" após inatividade (cold start de 30-50s na primeira requisição).

---

### ADR-004: Frontend servido pelo próprio Express (`Express.static`)

**Status:** ACEITO

**Contexto:** Com o backend já hospedado como Web Service, era necessário decidir onde e como servir o `index.html` do formulário de login.

**Decisão:** Servir o frontend estático diretamente pelo Express (`app.use(Express.static(...))`), no mesmo processo e domínio da API.

**Alternativas consideradas:** Hospedar o frontend separadamente (ex: Vercel/GitHub Pages) e consumir a API via URL absoluta — descartado por introduzir CORS cross-domain sem benefício real para este módulo.

**Consequências:** ✅ Uma única URL para todo o sistema (mais simples de compartilhar/testar); ✅ Zero configuração de CORS entre frontend e backend; ⚠️ Acopla frontend e backend no mesmo deploy — se o projeto crescer muito, pode valer separar depois.

---

### ADR-005: Mensagem de erro genérica na autenticação

**Status:** ACEITO

**Contexto:** O sistema precisa informar falha de login sem revelar se o problema foi o email não encontrado ou a senha incorreta.

**Decisão:** Retornar sempre a mesma mensagem (`"Email ou senha inválidos"`) e o mesmo status (`401`) para ambos os casos de falha.

**Alternativas consideradas:** Mensagens específicas por campo (ex: "email não encontrado") — descartada por facilitar ataques de enumeração de usuários cadastrados.

**Consequências:** ✅ Reduz superfície de ataque para descoberta de contas existentes; ⚠️ Pequena perda de UX (usuário não sabe exatamente qual campo corrigir).

---

## Tecnologias Escolhidas

| Camada             | Tecnologia            | Versão                | Justificativa                                                       |
| ------------------ | --------------------- | --------------------- | ------------------------------------------------------------------- |
| Frontend           | HTML5 + CSS3          | —                     | Padrão web, sem necessidade de framework para um formulário simples |
| Frontend           | JavaScript            | ES2015+ (async/await) | Requisições assíncronas legíveis via `fetch`                        |
| Backend            | Node.js               | 20                    | Runtime JavaScript, LTS                                             |
| Backend            | Express               | 5                     | Roteamento simples, middleware maduro                               |
| BD                 | Supabase (PostgreSQL) | —                     | ACID, gerenciado, sem overhead de infraestrutura própria            |
| Hash               | bcrypt                | 5+                    | Recomendado pela OWASP, adaptativo                                  |
| CORS               | cors (pacote npm)     | —                     | Restringe origens permitidas de forma declarativa                   |
| Realtime transport | ws                    | —                     | Exigido pelo Supabase Realtime no Node 20 (sem WebSocket nativo)    |
| Hospedagem         | Render (Web Service)  | —                     | Suporta processo Node persistente, deploy contínuo via GitHub       |

## Fluxo de Dados

1. Usuário preenche o formulário em `index.html` e envia.
2. JavaScript do frontend faz `fetch('/login', { method: 'POST', body: { email, senha } })`.
3. Express recebe a requisição na rota `POST /login`.
4. Backend consulta a tabela `usuarios` no Supabase filtrando por `email` (consulta parametrizada via SDK — sem concatenação de strings).
5. Se o usuário não for encontrado → resposta `401` com mensagem genérica.
6. Se encontrado, `bcrypt.compare(senha, senha_hash)` valida a senha.
7. Senha incorreta → `401` com a mesma mensagem genérica.
8. Senha correta → `200` com `{ id, nome }` do usuário (nunca o hash).

---

## 🔒 6. VALIDAÇÃO DE SEGURANÇA OWASP

### A02:2021 — Cryptographic Failures

**Vulnerabilidade:** Armazenamento de senhas em texto puro permitiria que qualquer vazamento do banco expusesse credenciais diretamente utilizáveis.

**Implementação:**

```javascript
// Autenticacao.js
async function gerarHashSenha(senhaTextoPuro) {
  const saltRounds = 10;
  return await bcrypt.hash(senhaTextoPuro, saltRounds);
}

async function validarSenha(senhaDigitada, senhaHashDoBanco) {
  return await bcrypt.compare(senhaDigitada, senhaHashDoBanco);
}
```

A senha nunca é comparada como string simples (`senha === senhaSalva`); sempre via `bcrypt.compare`, que lida com o salt embutido no hash.

**Teste:**

```javascript
const hash = await gerarHashSenha("minhaSenha123");
console.log(hash);
// $2b$10$K7...  (nunca "minhaSenha123" em texto puro)

const correta = await validarSenha("minhaSenha123", hash);
console.log(correta); // true

const errada = await validarSenha("senhaErrada", hash);
console.log(errada); // false
```

---

### A07:2021 — Identification and Authentication Failures

**Vulnerabilidade:** Mensagens de erro diferentes para "email não encontrado" e "senha incorreta" permitem que um atacante enumere quais emails têm conta no sistema.

**Implementação:**

```javascript
// Servidor.js
if (error) {
    console.log('Erro ao buscar usuário:', error.message); // log técnico, nunca a senha
    return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
}

const senhaCorreta = await validarSenha(senha, usuario.senha_hash);
if (!senhaCorreta) {
    return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
}
```

Ambos os caminhos de falha retornam exatamente o mesmo status e a mesma mensagem, tornando as duas situações indistinguíveis pela resposta da API.

**Teste:**

```javascript
// Caso 1: email que não existe no banco
POST /login { "email": "naoexiste@teste.com", "senha": "qualquer" }
// → 401 { "mensagem": "Email ou senha inválidos" }

// Caso 2: email existe, senha errada
POST /login { "email": "usuario@real.com", "senha": "senhaErrada" }
// → 401 { "mensagem": "Email ou senha inválidos" }

// Resultado: respostas idênticas — impossível diferenciar externamente
// qual dos dois campos estava incorreto.
```
