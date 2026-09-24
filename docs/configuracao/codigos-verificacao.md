# Códigos de verificação: configuração e validação

O cadastro e a recuperação de senha usam `public.codigos_verificacao`. O servidor reutiliza seu cliente Supabase em `criarServicoCodigos`; todas as rotas, incluindo as quatro operações de código, ficam no `Servidor.js`. Não há armazenamento local de códigos nem dependência de uma tarefa de limpeza.

## Configuração do servidor

Configure **`SEGREDO_CODIGOS`** no ambiente do backend com uma chave secreta própria, diferente de `SEGREDO_JWT`. Mantenha a mesma chave entre reinícios e instâncias. Sua troca invalida os códigos pendentes. A aplicação rejeita operações de código se a chave estiver ausente, vazia ou igual à chave JWT. O arquivo `.env` real não foi alterado.

As configurações existentes de Supabase e Brevo continuam necessárias. Nenhuma chave é enviada ao frontend ou publicada no Swagger. Respostas e logs de falha desses fluxos contêm somente mensagens genéricas.

## Esquema e permissões verificados

A inspeção remota confirmou `id` UUID com `gen_random_uuid()`, `email` varchar(150), `codigo_hash` text, `finalidade` varchar(30), `criado_em` timestamptz com `now()` e `expira_em` timestamptz com `now() + interval '10 minutes'`. Não foi encontrada divergência nessas colunas.

O [DDL versionado](../../database/ddl/rf-002-Cadastro-usuario.sql) declara a restrição `codigo_unico_por_finalidade UNIQUE (email, finalidade)` e as finalidades `cadastro` e `recuperacao_senha`. Após a liberação de acesso, os testes reais confirmaram `SELECT`, `INSERT`, `UPDATE`, `DELETE` e o conflito `(email, finalidade)` utilizado pelo `upsert`. A recusa de acesso observada anteriormente foi resolvida.

Os testes usaram apenas registros de `codigos_verificacao` com um email UUID exclusivo em `example.invalid`, removidos e conferidos ao final. Nenhuma tabela de usuários, configuração de permissões ou política RLS foi alterada pelo teste. As operações do backend foram validadas com a credencial disponível; a definição das políticas RLS não foi inspecionada pelo catálogo SQL.

No SQL Editor do Supabase, o responsável pelo banco pode conferir restrições e permissões antes de ajustar o acesso:

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.codigos_verificacao'::regclass;

select grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public' and table_name = 'codigos_verificacao';

select relrowsecurity, relforcerowsecurity
from pg_class
where oid = 'public.codigos_verificacao'::regclass;

select policyname, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'codigos_verificacao';
```

O papel usado pela credencial do backend precisa de `SELECT`, `INSERT`, `UPDATE` e `DELETE` nessa tabela. Se a credencial for de `service_role` e esses privilégios estiverem ausentes, o ajuste limitado à tabela é:

```sql
grant select, insert, update, delete
on table public.codigos_verificacao to service_role;
```

Esse comando não foi executado pelo teste; a credencial disponível já possui o acesso necessário. Não é necessária migração para os cenários validados.

## Validade e consumo

- O código é gerado por `crypto.randomInt()` e possui seis dígitos. O banco recebe somente HMAC-SHA256 sobre a finalidade, email normalizado e código.
- Email é normalizado com `trim().toLowerCase()`. A consulta de usuários aceita diferenças de maiúsculas/minúsculas e confirma a igualdade do endereço normalizado. A recuperação atualiza o usuário pelo ID encontrado, preservando seu email armazenado.
- A emissão grava `criado_em` e `expira_em`, com diferença de dez minutos, usando UTC ISO e o relógio do servidor Node.js. O filtro de consumo exige `expira_em > agora`, também calculado pelo Node.js. As instâncias devem manter seus relógios sincronizados; não se utiliza `NOW()` via RPC nesta implementação.
- Um código incorreto realiza apenas consulta: não altera hash, prazo ou registro. Um código expirado é rejeitado mesmo permanecendo fisicamente na tabela.
- Após conferir hash e validade, um único `DELETE` filtra ID da emissão, email, finalidade, hash e expiração. Somente a requisição que recebe um ID excluído é autorizada a prosseguir. Uma segunda confirmação concorrente não reutiliza o registro.
- Reenvio substitui a emissão da mesma finalidade, incluindo um novo UUID e outro prazo. A finalidade diferente permanece independente.
- Em falha do envio do código, a compensação remove somente o UUID daquela emissão; nunca remove uma emissão posterior. Se a compensação também falhar, a API retorna HTTP 500 e o registro continua sujeito ao TTL. A emissão anterior substituída não é restaurada.
- Os limitadores existentes foram mantidos. Nenhum erro de digitação apaga o código; HTTP 429 apenas impede temporariamente novas requisições.

## Limite transacional

O consumo do código e a criação do usuário ou atualização de senha são operações separadas. O hash bcrypt é preparado antes do consumo, mas erro no `INSERT`/`UPDATE`, perda de conexão ou interrupção do processo após consumir o código exige uma nova solicitação. Não existe atomicidade entre essas duas operações. Uma resposta de consumo perdida também pode deixar o código consumido sem concluir a operação. O backend retorna erro quando detecta a falha e não restaura o código automaticamente.

A persistência e o envio de email também não formam uma transação. Reenvios concorrentes podem entregar mensagens fora de ordem: somente a emissão que permaneceu gravada é válida. Uma futura RPC poderia unir consumo e alteração do usuário; ela exigiria revisão e instalação de funções e privilégios no banco, o que não foi realizado nesta alteração.

## Testes locais

Execute `npm test` na raiz do projeto. Os testes usam o executor nativo do Node.js, banco e email simulados, sem gravar no Supabase nem enviar mensagens. Cobrem TTL, erro seguido de correção, preservação do registro, nova instância do serviço, reenvio, separação de finalidades, consumo concorrente, compensação e falhas de infraestrutura. Também exercitam os handlers das quatro rotas e seus contratos de resposta.

A suíte local utiliza dependências simuladas. A execução na tabela real está descrita a seguir; entrega pela Brevo e o fluxo completo de alteração do usuário não fazem parte dos testes restritos à tabela de códigos.

## Testes na tabela real

Execute `npm run test:supabase` para repetir a suíte de integração. Esse comando acessa o Supabase configurado no backend, cria registros exclusivos de teste e os remove em `finally`, conferindo que nenhum permaneceu. Não faz parte de `npm test`, não envia emails e não altera usuários.

**Resultado da execução:** 11 verificações aprovadas:

1. Permissão de leitura.
2. Persistência de HMAC, normalização do email e TTL de dez minutos.
3. Código incorreto preserva ID, hash, criação e expiração.
4. Código correto funciona após o erro e somente uma vez.
5. Código persistido é validado e consumido por outro processo Node.js.
6. Código expirado é rejeitado mesmo com o registro ainda na tabela, sem limpeza periódica. O teste ajusta os timestamps somente do próprio registro para reproduzir a expiração.
7. Reenvio usa o conflito por email/finalidade, substitui a emissão e renova o prazo.
8. Cadastro e recuperação coexistem e seus códigos não são intercambiáveis.
9. Cinco confirmações simultâneas produzem exatamente um sucesso.
10. Cancelamento de emissão anterior preserva a emissão posterior, mesmo com o mesmo código numérico.
11. O filtro de `DELETE` recusa consumo quando o relógio do serviço chega ao limite de dez minutos entre a leitura e a exclusão.

**Limpeza:** confirmada; nenhum registro da execução permaneceu na tabela.

**Configuração local observada:** `SEGREDO_CODIGOS` ainda estava ausente. A suíte utilizou uma chave efêmera gerada apenas em memória e compartilhada com o processo filho, sem alterar `.env` ou imprimir seu valor. Configure uma chave permanente no ambiente do backend antes de utilizar os fluxos da aplicação. Quando a variável está configurada, a suíte usa essa chave sem divulgá-la.

## Roteiro manual em ambiente de teste

Use uma conta e uma caixa de email próprias para teste. Execute cenários em janelas distintas dos limitadores (5 minutos para login; 15 minutos para códigos/cadastro), para não confundir HTTP 429 com rejeição do código.

1. **Persistência e reinício:** abra o cadastro, solicite o código e consulte no banco apenas `id`, `email`, `finalidade`, `criado_em` e `expira_em`. Reinicie o backend mantendo a chave. Confirme o código recebido: o cadastro deve concluir.
2. **Erro e correção:** em outro cadastro, registre ID e timestamps. Digite `000000`, que está fora da faixa gerada: espere HTTP 401. Confira que o registro e os timestamps permaneceram iguais. Informe o código recebido antes do prazo: espere sucesso, sem novo email. O hash pode ser comparado dentro do banco, sem imprimi-lo ou copiá-lo para logs.
3. **Recuperação:** solicite reset para a conta criada. Erro de código deve retornar HTTP 400 e preservar o registro; o acerto deve alterar a senha e definir `status_reset_senha` como `false`. Confirme que a nova senha permite login e a anterior é recusada.
4. **Expiração sem limpeza:** solicite um código e aguarde mais de dez minutos, sem removê-lo. Confirme: espere `codigo expirado`, mesmo com o registro presente. Para repetir chamadas depois, respeite a janela do limitador.
5. **Uso único e concorrência:** pelo cliente HTTP de teste, envie duas confirmações simultâneas com o mesmo corpo válido. Somente uma deve concluir. Repita após o sucesso: o código deve ser recusado.
6. **Reenvio:** solicite dois códigos para o mesmo email/finalidade. O registro deve ter novo UUID e prazo. O primeiro deve falhar; o segundo deve funcionar. Para testar finalidades, mantenha uma emissão de cadastro antes de criar a conta com uma fixture de teste e solicite recuperação. Os dois registros devem coexistir; códigos de uma finalidade não devem validar a outra.
7. **Falhas:** em ambiente isolado, simule recusa de escrita da tabela e falha na Brevo. Espere HTTP 500, sem sucesso falso ou detalhes internos. Falha apenas no email de boas-vindas deve retornar HTTP 201 e manter o usuário criado.
8. **Regressão de sessão:** faça login, consulte a sessão e efetue logout pelas telas existentes. JWT, cookie e duração de duas horas permanecem com a implementação anterior.

Não copie códigos, hashes ou credenciais para relatórios. Registre somente status HTTP, contagens e resultados dos cenários.
