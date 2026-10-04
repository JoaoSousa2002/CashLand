# #Deploy e Fluxo de Desenvolvimento — CashLand

Este documento descreve o processo para configurar o projeto **CashLand** localmente, conectar o Git ao GitHub, configurar autenticação via SSH, trabalhar em uma branch própria e enviar alterações através de **Pull Request** para a branch `main`.
O render faz deploy automatico atualizando com o github, não sendo necessario fazer deploy manual.

---

# 1. Pré-requisitos

Antes de iniciar, verifique se o Git está instalado:

```
git --version
```

Caso não esteja instalado em Ubuntu/Linux Mint:

```
sudo apt updatesudo apt install git
```

Verifique novamente:

```
git --version
```

Também será necessário possuir uma conta no GitHub.

---

# 2. Configurar usuário do Git

Configure o nome que será associado aos commits:

```
git config --global user.name "Seu Nome"
```

Configure o e-mail utilizado no GitHub:

```
git config --global user.email "seu-email@exemplo.com"
```

Verifique a configuração:

```
git config --global --list
```

O resultado deverá apresentar informações semelhantes a:

```
user.name=Seu Nomeuser.email=seu-email@exemplo.com
```

---

# 3. Criar uma chave SSH

O projeto utiliza SSH para comunicação entre o Git local e o GitHub.

Primeiro, verifique se já existem chaves SSH:

```
ls -la ~/.ssh
```

Caso ainda não possua uma chave apropriada, crie uma nova utilizando Ed25519:

```
ssh-keygen -t ed25519 -C "seu-email@exemplo.com"
```

Quando aparecer:

```
Enter file in which to save the key:
```

Pressione `Enter` para utilizar o local padrão:

```
~/.ssh/id_ed25519
```

Em seguida, será solicitado:

```
Enter passphrase:
```

É possível:

- definir uma senha para maior segurança; ou

- pressionar `Enter` para não utilizar senha.

Serão criados dois arquivos:

```
~/.ssh/id_ed25519~/.ssh/id_ed25519.pub
```

O arquivo:

```
id_ed25519
```

é a **chave privada** e nunca deve ser compartilhado.

O arquivo:

```
id_ed25519.pub
```

é a **chave pública** e será cadastrada no GitHub.

---

# 4. Iniciar o SSH Agent

Execute:

```
eval "$(ssh-agent -s)"
```

Depois adicione a chave:

```
ssh-add ~/.ssh/id_ed25519
```

Para verificar as chaves carregadas:

```
ssh-add -l
```

---

# 5. Copiar a chave pública

Exiba a chave pública:

```
cat ~/.ssh/id_ed25519.pub
```

Será exibido algo semelhante a:

```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAA... seu-email@exemplo.com
```

Copie **todo o conteúdo da linha**.

Não copie nem compartilhe o arquivo:

```
~/.ssh/id_ed25519
```

Apenas a chave terminada em:

```
.pub
```

pode ser compartilhada.

---

# 6. Adicionar a chave SSH ao GitHub

No GitHub:

1. Acesse sua conta.

2. Clique na foto de perfil.

3. Abra **Settings**.

4. Acesse **SSH and GPG keys**.

5. Clique em **New SSH key**.

6. Em `Title`, informe um nome para identificar o computador.

Exemplo:

```
Notebook CashLand
```

7. Em `Key type`, mantenha:

```
Authentication Key
```

8. Em `Key`, cole o conteúdo de:

```
cat ~/.ssh/id_ed25519.pub
```

9. Clique em **Add SSH key**.

---

# 7. Testar a conexão SSH com o GitHub

Execute:

```
ssh -T git@github.com
```

Na primeira conexão poderá aparecer:

```
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Digite:

```
yes
```

Caso a configuração esteja correta, deverá aparecer uma mensagem semelhante a:

```
Hi usuario! You've successfully authenticated, but GitHub does not provide shell access.
```

Isso significa que a autenticação SSH está funcionando.

---

# 8. Solicitar acesso ao repositório CashLand

Antes de enviar código, o integrante deverá possuir acesso ao repositório do CashLand.

O responsável pelo repositório deverá adicionar o integrante como colaborador.

No GitHub, o responsável pelo projeto deve acessar:

```
CashLand→ Settings→ Collaborators
```

Depois:

1. Clicar em **Add people**.

2. Pesquisar o usuário do GitHub do integrante.

3. Selecionar o usuário.

4. Enviar o convite.

O integrante receberá um convite do GitHub.

O convite deverá ser aceito antes que seja possível enviar alterações diretamente para o repositório.

---

# 9. Abrir a pasta do projeto

Entre na pasta onde o projeto será armazenado.

Exemplo:

```
cd ~/Desktop
```

Crie uma pasta para o projeto, se necessário:

```
mkdir CashLand
```

Entre nela:

```
cd CashLand
```

---

# 10. Inicializar o Git

Caso a pasta ainda não seja um repositório Git:

```
git init
```

Verifique:

```
git status
```

---

# 11. Definir a branch principal como main

Para utilizar `main` como branch principal:

```
git branch -M main
```

Verifique:

```
git branch
```

---

# 12. Adicionar o repositório remoto

No GitHub, abra o repositório do CashLand e copie a URL SSH.

Ela terá formato semelhante a:

```
git@github.com:JoaoSousa2002/CashLand.git
```

Adicione o repositório remoto:

```
git remote add origin git@github.com:JoaoSousa2002/CashLand.git
```

Verifique:

```
git remote -v
```

O resultado deverá ser semelhante a:

```
origin  git@github.com:JoaoSousa2002/CashLand.git (fetch)origin  git@github.com:USUARIO/CashLand.git (push)
```

---

# 13. Baixar as informações do repositório remoto

Antes de começar a desenvolver, atualize as referências locais:

```
git fetch origin
```

Caso o repositório já possua uma branch `main` no GitHub, sincronize o código.

Uma opção é criar a `main` local acompanhando a remota:

```
git checkout -B main origin/main
```

Depois:

```
git pull origin main
```

---

# 14. Nunca desenvolver diretamente na main

A branch:

```
main
```

deve representar a versão principal e integrada do projeto.

As alterações devem ser realizadas em branches separadas.

Antes de criar uma nova branch, atualize a `main`:

```
git checkout main
```

Depois:

```
git pull origin main
```

---

# 15. Criar uma branch própria

Crie uma branch para a funcionalidade que será desenvolvida.

O CashLand pode utilizar o padrão:

```
feature/RFXXX-descricao
```

Exemplos:

```
feature/RF003-categoriasfeature/RF004-lancamentosfeature/RF005-dashboard
```

Para criar e entrar na branch:

```
git checkout -b feature/RF004-lancamentos
```

Ou, utilizando o comando moderno:

```
git switch -c feature/RF004-lancamentos
```

Verifique a branch atual:

```
git branch
```

A branch marcada com `*` é a atual:

```
  main* feature/RF004-lancamentos
```

---

# 16. Confirmar o estado do projeto antes de alterar arquivos

Execute:

```
git status
```

O ideal é começar o desenvolvimento sem alterações pendentes.

Exemplo:

```
nothing to commit, working tree clean
```

---

# 17. Desenvolver a funcionalidade

Faça normalmente as alterações necessárias no código.

Durante o desenvolvimento, utilize:

```
git status
```

para visualizar os arquivos alterados.

Para visualizar as alterações:

```
git diff
```

---

# 18. Não enviar informações sensíveis para o GitHub

Arquivos contendo senhas, tokens, chaves ou configurações privadas não devem ser enviados ao GitHub.

Exemplos:

```
.env.env.local.env.production
```

O arquivo `.gitignore` deve possuir, no mínimo, entradas adequadas ao projeto.

Exemplo:

```
node_modules/.env.env.*!.env.example
```

Nunca envie informações como:

```
SUPABASE_KEY
SEGREDO_JWT
senhas tokens
chaves privadas
credenciais de banco de dados
```

O projeto pode possuir um arquivo:

```
.env.example
```

contendo apenas os nomes das variáveis necessárias, sem os valores reais.

Exemplo:

```
SUPABASE_URL=SUPABASE_KEY=SEGREDO_JWT=
```

---

# 19. Adicionar arquivos ao Stage

Para adicionar um arquivo específico:

```
git add caminho/do/arquivo
```

Exemplo:

```
git add src/rf-004-Lancamentos/Servidor.js
```

Para adicionar todas as alterações:

```
git add .
```

Depois verifique:

```
git status
```

Os arquivos que serão incluídos no commit aparecerão em:

```
Changes to be committed
```

---

# 20. Criar o commit

Crie um commit explicando o que foi alterado:

```
git commit -m "RF004 Implementa criação de lançamentos"
```

Evite mensagens genéricas como:

```
updatetestealteraçãomudançascommit
```

Prefira mensagens que indiquem claramente a alteração realizada.

Exemplos:

```
git commit -m "RF003 Adiciona criação de categorias"
```

```
git commit -m "RF003 Corrige validação de subcategorias"
```

```
git commit -m "RF004 Implementa cadastro de lançamentos financeiros"
```

---

# 21. Verificar os commits

Para visualizar o histórico:

```
git log --oneline
```

Exemplo:

```
a95d412 RF004 Implementa criação de lançamento712bc31 RF004 Adiciona validação de categoria47da239 RF004 Cria estrutura inicial
```

---

# 22. Enviar a branch para o GitHub

Na primeira vez que a branch for enviada:

```
git push -u origin feature/RF004-lancamentos
```

A opção:

```
-u
```

configura a branch local para acompanhar a branch remota.

Depois disso, novos envios podem ser feitos apenas com:

```
git push
```

---

# 23. Continuar trabalhando na mesma branch

Depois de fazer novas alterações:

```
git status
```

Adicione:

```
git add .
```

Crie outro commit:

```
git commit -m "RF004 Adiciona validação de lançamentos"
```

Envie:

```
git push
```

Não é necessário criar uma nova branch para cada commit.

Uma mesma funcionalidade pode possuir vários commits dentro da mesma branch.

---

# 24. Atualizar a branch com alterações recentes da main

Caso outras alterações tenham sido adicionadas à `main` enquanto a funcionalidade estava sendo desenvolvida, atualize primeiro as referências remotas:

```
git fetch origin
```

Estando na branch da funcionalidade:

```
git checkout feature/RF004-lancamentos
```

Integre a versão atual da `main`:

```
git merge origin/main
```

Caso não existam conflitos, finalize normalmente.

Se existirem conflitos, o Git indicará os arquivos afetados.

Após resolver manualmente os conflitos:

```
git add .
```

Depois:

```
git commit
```

E envie novamente:

```
git push
```

---

# 25. Verificar a branch antes do Pull Request

Antes de criar o Pull Request:

```
git status
```

O ideal é aparecer:

```
nothing to commit, working tree clean
```

Verifique também os commits:

```
git log --oneline
```

E confirme a branch:

```
git branch
```

---

# 26. Criar um Pull Request

Após enviar a branch, abra o repositório do CashLand no GitHub.

O GitHub normalmente exibirá a opção:

```
Compare & pull request
```

Clique nela.

Caso a opção não apareça:

1. Abra a aba **Pull requests**.

2. Clique em **New pull request**.

3. Configure:

```
base: maincompare: feature/RF004-lancamentos
```

Isso significa:

```
feature/RF004-lancamentos            ↓           main
```

---

# 27. Preencher o Pull Request

Utilize um título objetivo.

Exemplo:

```
RF004 - Implementação de lançamentos financeiros
```

Na descrição, informe as principais alterações realizadas.

Exemplo:

```
## Alterações- Implementada criação de lançamentos financeiros.- Adicionada validação de categoria.- Adicionada validação de subcategoria.- Adicionada validação de propriedade da categoria pelo usuário.- Atualizado Swagger.- Adicionados registros de auditoria.## Testes- Cadastro de lançamento válido.- Categoria inexistente.- Subcategoria inexistente.- Subcategoria pertencente a outra categoria.- Usuário não autenticado.
```

Depois clique em:

```
Create pull request
```

---

# 28. Revisão do Pull Request

Após criar o Pull Request, outro integrante da equipe deverá revisar as alterações.

O revisor deverá verificar:

- funcionamento da implementação;

- possíveis erros;

- conflitos;

- validações;

- segurança;

- organização do código;

- conformidade com o requisito desenvolvido.

Caso sejam solicitadas alterações, **não é necessário criar outro Pull Request**.

Continue trabalhando na mesma branch.

Exemplo:

```
git checkout feature/RF004-lancamentos
```

Faça a correção.

Depois:

```
git add .
```

```
git commit -m "RF004 Corrige validação de subcategoria"
```

```
git push
```

O Pull Request será atualizado automaticamente.

---

# 29. Aprovar e realizar o merge

Após a revisão e aprovação, o Pull Request poderá ser integrado à `main`.

No GitHub:

```
Pull Request→ Merge pull request
```

Dependendo das regras configuradas no repositório, o merge poderá exigir aprovação de outro integrante.

Após o merge, a funcionalidade fará parte da branch:

```
main
```

---

# 30. Atualizar a main local após o merge

Depois que o Pull Request for integrado:

```
git checkout main
```

Atualize:

```
git pull origin main
```

Agora a versão local da `main` possui as alterações que foram aprovadas.

---

# 31. Excluir a branch após o merge

Depois que a funcionalidade já estiver integrada à `main`, a branch pode ser removida.

## Excluir localmente

```
git branch -d feature/RF004-lancamentos
```

Caso o Git impeça a exclusão e você tenha certeza de que a branch não é mais necessária:

```
git branch -D feature/RF004-lancamentos
```

## Excluir no remoto

```
git push origin --delete feature/RF004-lancamentos
```

O GitHub também normalmente disponibiliza o botão:

```
Delete branch
```

depois que o Pull Request é finalizado.

---

# 32. Iniciar uma nova funcionalidade

Sempre comece uma nova funcionalidade a partir da versão atual da `main`.

Primeiro:

```
git checkout main
```

Depois:

```
git pull origin main
```

Agora crie a nova branch:

```
git checkout -b feature/RF005-nova-funcionalidade
```

O fluxo volta a ser:

```
main atualizada      ↓criar branch      ↓desenvolver      ↓git add      ↓git commit      ↓git push      ↓Pull Request      ↓revisão      ↓merge para main
```

---

# 33. Fluxo resumido

Depois que Git, SSH e repositório já estiverem configurados, o fluxo diário normalmente será:

```
git checkout maingit pull origin maingit checkout -b feature/RFXXX-descricao
```

Desenvolver a funcionalidade.

Depois:

```
git statusgit add .git commit -m "RFXXX Descrição da alteração"git push -u origin feature/RFXXX-descricao
```

No GitHub:

```
feature/RFXXX-descricao        ↓    Pull Request        ↓       main
```

Após o merge:

```
git checkout maingit pull origin maingit branch -d feature/RFXXX-descricao
```

---

# 34. Comandos úteis

## Ver branch atual

```
git branch
```

## Ver alterações

```
git status
```

## Ver alterações detalhadas

```
git diff
```

## Ver histórico

```
git log --oneline
```

## Atualizar referências remotas

```
git fetch origin
```

## Atualizar a main

```
git checkout maingit pull origin main
```

## Criar branch

```
git checkout -b nome-da-branch
```

## Trocar de branch

```
git checkout nome-da-branch
```

ou:

```
git switch nome-da-branch
```

## Adicionar alterações

```
git add .
```

## Criar commit

```
git commit -m "Descrição"
```

## Enviar alterações

```
git push
```

## Ver repositórios remotos

```
git remote -v
```

---

# 35. Regras recomendadas para o CashLand

Para manter o projeto organizado:

1. Não desenvolver diretamente na `main`.

2. Sempre atualizar a `main` antes de criar uma nova branch.

3. Utilizar uma branch para cada requisito ou funcionalidade.

4. Utilizar nomes de branch descritivos.

5. Criar commits pequenos e objetivos.

6. Não enviar `.env`, senhas, tokens ou chaves privadas.

7. Enviar a branch para o GitHub regularmente.

8. Atualizar a branch com a `main` quando necessário.

9. Toda integração com a `main` deve ocorrer através de Pull Request.

10. Revisar o código antes do merge.

11. Resolver conflitos antes de concluir o Pull Request.

12. Após o merge, atualizar a `main` local.

13. Excluir branches que já foram integradas e não serão mais utilizadas.

---

## Variaveis de ambiente necessarias para o RENDER:

1. BREVO_API_KEY

2. BREVO_SENDER_EMAIL

3. BREVO_SENDER_NAME

4. ORIGEM_AUTORIZADA

5. SEGREDO_CODIGOS

6. SEGREDO_JWT

7. SUPABASE_SECRET_KEY

8. SUPABASE_URL

Todos os valores dessas variaveis estão disponiveis no arquivo `.env`.

---

## Swagger documentation link

Local: http://localhost:3000/api-docs/

Render: https://cashland-cdf0.onrender.com/api-docs/


