# RF-001: Cadastro de Cliente

## 1. Identificação

### a) URL da Aplicação (Deploy Online)

- **URL:** https://seu-projeto.vercel.app/rf-001
- **Plataforma:** Vercel

### b) Link do Banco de Dados Online

- **BD:** Supabase
- **Link:** https://supabase.com/project/seu-projeto

### c) Link do GitHub

- **Repositório:** https://github.com/seu-usuario/seu-projeto
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

Interface com CRUD completo em: [URL da aplicação]

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
