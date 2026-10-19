# RF-001: Cadastro de Cliente

## 1. Identificação

**ID:** RF-007  
**Título:** Gerenciamento de Metas Financeiras  
**Tipo:** Requisito Funcional  
**Prioridade:** ALTA — depende das contas financeiras da RF-005 e possui integração com transações e recorrências da RF-006.  
**Complexidade:** MÉDIA — 21 story points, estimativa documental.  
**Status:** CRUD e cinco telas identificados no projeto; validação funcional integral e comprovação das automações do banco pendentes.  
**Data de criação:** não confirmada pelos arquivos examinados.  
**Última revisão documental:** 19/10/2026.

**Breve descrição:** permitir que o usuário crie, consulte, filtre, edite e exclua metas vinculadas às suas contas financeiras, acompanhe valor atual, valor objetivo, prazo e status, e permita a administração desses registros por usuários autorizados.

### a) URL da Aplicação (Deploy Online)

- **URL:** https://cashland-cdf0.onrender.com/
- **Plataforma:** Render

### b) Link do Banco de Dados Online

- **BD:** Supabase
- **Link:** https://supabase.com/dashboard/project/xjfgkakjpuxoznbwznyb

### c) Link do GitHub

- **Repositório:** https://github.com/JoaoSousa2002/CashLand
- **Branch:** main

---

## 2. Descrição e Atores

[Descrever 3+ parágrafos]

### Atores

- **Recepcionista:** Cria cliente (Create, Read, Update)
- **Gerente:** Deleta cliente (todos CRUD)

---

## 3. Casos de Uso

### Fluxo Principal

[8+ passos]

### Fluxo Alternativo: Email já existe

[Passos alternativos]

---

## 4. Protótipo

Interface com CRUD completo em: https://cashland-cdf0.onrender.com/

| Operação | Método | Endpoint           | Status esperado |
| -------- | ------ | ------------------ | --------------- |
| Create   | POST   | /api/clientes      | 201             |
| Read     | GET    | /api/clientes      | 200             |
| Update   | PUT    | /api/clientes/{id} | 200             |
| Delete   | DELETE | /api/clientes/{id} | 204             |

⛔ Documentação da API (obrigatória): docs/api/swagger.json — [link opcional da UI publicada]

---

## 5. Arquitetura

[Diagrama + 4 ADRs]

---

## 6. Segurança

[3-5 controles OWASP sem código-fonte]
