## 🎯 1. IDENTIFICAÇÃO DO REQUISIT

**ID:** RF-002
**Título:** Cadastro de Novo usuario no Sistema
**Tipo:** Requisito Funcional
**Prioridade:** ALTA (bloqueia os demais requisitos (Exceto o RF1)
**Complexidade:** MÉDIA (estimado 5 story points)
**Status:** Concluido
**Data de Criação:** 08/09/2026
**Última Atualização:** 08/09/2026

**Breve Descrição:**
O sistema deve permitir que o usuario crie um novo usuario com dados: nome, email valido e senha que será criptografada



## 📋 2. DESCRIÇÃO E ATORES

**Descrição Detalhada:**

**Por que este requisito existe?**

O sistema deve permitir crição de usuarios para o login e acessar o sistema.

**Contexto do Negócio:**

O sistema precisa saber quem está logado para mostrar os dados referentes ao usuario e evitar vazamento de informações financeiras.

---

**Atores do sistema:**

# Usuario

- **Papel:** Realizar o cadastro .

- **Responsabilidade:** Inserir nome, email valido e senha.

- **Permissões:**
  
  - ❌ CREATE (criar novo usuario ou transferencia)
  
  - ✅ READ (O backend faz `SELECT` na tabela `usuarios`)
  
  - ❌ UPDATE (não pode editar dados de outros)
  
  - ❌ DELETE (não pode deletar)

# Sistema (Ator automatico)

- **Papel:** Valida os dados inseridos e cria o novo usuario.

- **Responsabilidae:** Verifica se os campos foram preenchidos e cria o novo usuario no banco de dados com senha HASH

- **Permissões:**
  
  - ✅ Todas operações



## 🔄 3. ESPECIFICAÇÃO DE CASOS DE USO + REQUISITOS NÃO-FUNCIONAIS

Pré-Condições

- ✅ Serviço WEB render funcionando
- ✅ Usuario tem um email valido (Com '@')
- ✅ Banco de dados SUPABASE funcionando

### Pós-Condições (Sucesso)

- ✅ Usuario cadastrado
- ✅ Possibilidade de ralizar login

### Pós-Condições (Falha)

- ✅ Mensagem de erro exibida ao usuário

### Fluxo principal

1. Usuario insere o nome no campo "nome"

2. Usuario insere o email no campo "Email"

3. Usuario insere a senha no campo "Senha"

4. Usuario aperta no botão "enviar"

5. O sistem bloqueia as ações do usuario

6. O sistema verifica se algum dos dados recebidos está vazio ou se o email é valido

7. Sistema envia os dados via fetch para a rota `/cadastro-usuario`

8. O servidor cria a chave hash da senha digitada pelo usuario

9. Servidor faz uma solicitação de insert no banco de dados com os dados recebidos

10. O servidor retorna a mensagem: 'Cadastro realizado com sucesso, prossiga para o login!'

11. O sistema libera as ações do usuario

12. O sistema mostra o `alert` com a mensagem retornada pelo servidor

13. Usuario aperta notão `Voltar` para ir para a pagina de login
