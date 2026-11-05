# RF-008 — Gerenciar Orçamentos (backend)

Implementação baseada em `Apresentacao_RF-008_corrigida.md`, fornecida no pedido, nos DDLs de `database/ddl` e nos sete schemas Joi já existentes em `src/validacoes/usuario.js`. A proposta foi fornecida fora de `database/ddl`; não havia outra proposta da RF-008 nesse diretório. Este trabalho não inclui telas, menus nem rotas de páginas.

## Rotas

| Método | Caminho | Permissão |
| --- | --- | --- |
| POST | `/usuario/criar-orcamento` | Usuário autenticado |
| GET | `/usuario/listar-orcamentos` | Usuário autenticado |
| PATCH | `/usuario/editar-orcamento` | Usuário autenticado |
| DELETE | `/usuario/deletar-orcamento/:id_orcamento` | Usuário autenticado |
| GET | `/admin/listar-orcamentos` | Admin |
| PATCH | `/admin/editar-orcamento` | Admin |
| DELETE | `/admin/deletar-orcamento/:id_usuario/:id_orcamento` | Admin |

Não existe criação administrativa. As rotas comuns obtêm o proprietário de `req.usuario.id_usuario`, inclusive quando a sessão é de administrador. Nas operações administrativas, `id_usuario` identifica o proprietário alvo e nunca altera a propriedade. A ordem dos parâmetros da exclusão administrativa segue a proposta da RF-008: usuário primeiro, orçamento depois.

As rotas usam os middlewares existentes de auditoria, rate limit, autenticação, autorização administrativa e validação Joi. As alterações só recebem auditoria de sucesso após confirmação de uma linha pelo banco. Os limites são compartilhados com as demais rotas que usam os mesmos limitadores: criação 30/15 minutos; edição comum 30/15 minutos; exclusão comum 15/15 minutos; listagem comum 120/10 minutos; edição/exclusão administrativa 60/15 minutos; listagem administrativa 240/10 minutos.

## Dados e regras

Na criação, `tipo_periodo` e `valor_orcamento` são obrigatórios. Informe `id_conta`, `id_categoria` ou ambos; pelo menos um precisa ser não nulo e pertencer ao usuário. `descricao` e `periodo_inicio` são opcionais. Os valores monetários são números JSON positivos, com até duas casas decimais e máximo de 9.999.999.999,99, sem conversão ou arredondamento no Joi.

O backend calcula somente o início padrão e valida a escolha do período atual ou próximo, no fuso `America/Sao_Paulo`. Semana começa no domingo; mês no dia 1; ano em 1º de janeiro. A tabela de rotas da proposta define o período atual quando omitido; o exemplo introdutório de uma semana futura representa a seleção explícita do próximo período.

Na edição, `id_orcamento` é obrigatório e deve haver pelo menos um campo editável: `id_conta`, `id_categoria`, `descricao`, `valor_orcamento`, `tipo_periodo` ou `periodo_inicio`. Campos omitidos preservam o valor existente. `null` remove um vínculo, desde que o estado final ainda tenha outro. A mudança efetiva de `tipo_periodo` exige `periodo_inicio`; toda data inicial enviada precisa identificar um período atual ou próximo válido. Edições de descrição ou limite preservam períodos antigos. A edição administrativa também exige `id_usuario`.

O banco mantém `nome`, `valor_atual`, `periodo_fim`, `data_criacao` e `data_atualizacao`. O backend não aceita esses campos nem reproduz seus cálculos. Conta e categoria são verificadas pelas funções existentes em `validarTabelas.js`; não se acrescenta uma restrição de conta ativa, ausente na proposta.

As listagens aceitam `id_orcamento`, `nome`, `id_conta`, `id_categoria`, `tipo_periodo`, `periodo_inicio` e `periodo_fim`. A administrativa também aceita `id_usuario` e verifica sua existência quando informado. Os filtros se combinam com AND; `nome` usa ILIKE parcial. A consulta de datas retorna sobreposições inclusivas, inclusive com apenas um limite. Ambas retornam um array diretamente; sem correspondências, retornam `200` com `[]`, inclusive quando um filtro comum identifica registros alheios.

Criação retorna `201`; edição e exclusão retornam `200`, com `{ "mensagem": "..." }`. Erros Joi e regras de período/vínculo retornam `400`; sessão ausente/inválida `401`; acesso administrativo indevido `403`; registro ou vínculo inexistente/sem pertencimento `404`; duplicidade do nome gerado `409`; rate limit `429`; falha inesperada do banco `500`. As constraints SQL de integridade/limite retornam `400`, e uma FK inválida durante criação/edição retorna `404`. O Swagger contém os corpos, parâmetros, exemplos e respostas de cada operação.

A exclusão recebe somente identificadores no caminho e rejeita body com campos. O DELETE restringe orçamento e proprietário na própria operação, confirmando a linha excluída. Transações, contas, categorias e saldos são preservados.

## Banco e divergências corrigidas

`orcamentos.id_usuario` identifica diretamente o proprietário. Transações não possuem essa coluna: o proprietário vem de `contas_bancarias.id_usuario`, pela conta de origem. A RF-008 usa os nomes reais do DDL.

O teste PostgreSQL encontrou `OLD.modalidade` e `NEW.modalidade` em `atualizar_orcamentos_por_transacao()`, no DDL da RF-006. A tabela `transacoes` não possui `modalidade`; esse campo está em `recorrencias`. A referência provocava erro em qualquer UPDATE de transação. Foram removidas somente essas duas referências da função da RF-008, preservando a observação dos campos que participam do cálculo: conta de origem, categoria, tipo, status, valor e data de pagamento. Não foi criada nenhuma coluna nem alterada a regra dos totais.

As funções de sincronização de nomes e recálculo por transações permanecem nos DDLs de categorias/contas/transações, conforme a organização fornecida. A exclusão em cascata é implementada pelas FKs de `orcamentos`.

Os arquivos SQL de referência omitem `;` após definições de funções. O carregador de testes extrai as definições e adiciona esse delimitador, sem reescrever os exports. Para implantação, a tabela, funções e triggers da RF-008 e a função corrigida precisam estar instalados no banco de destino. Nenhuma alteração foi aplicada ao banco publicado.

## Testes

```bash
npm test
npm run test:rf08
npm run test:rf08:banco
npm run test:rf06
npm run test:rf07
npm run test:frontend
```

`npm test` inclui `tests/orcamentos.test.js` e as sete novas rotas no registro geral `tests/fixtures/rotas.json`. Cobre regras de calendário, fuso, conflitos SQL, gravações sem linha confirmada, auditoria e rate limit, além das regressões existentes.

`npm run test:rf08` executa os casos de `tests/testar_rotas.py` usando a ponte HTTP local já existente (`tests/helpers/rf06-http.js`). Exercita Express, cookies JWT, Joi, controllers e middlewares, com Supabase simulado. Cobre criação, campos opcionais, filtros combinados, sobreposição, edição parcial, exclusão, vínculos alheios, IDs inexistentes, falhas de banco e operações administrativas. O modo interativo também contém todas as sete rotas.

`npm run test:rf08:banco` requer Docker e o PostgreSQL do Supabase local. Cria uma base com nome aleatório, carrega as tabelas originais e as seis funções/sete triggers da RF-008, executa `tests/fixtures/orcamentos.sql` e remove a base em `finally`. Não executa seeds nem acessa a base da aplicação. O container padrão é `supabase_db_CashLand`; outro pode ser informado por `CASHLAND_TEST_CONTAINER`. A rotina de testes conecta como `postgres` e exige permissão para criar e remover sua própria base temporária.

Os testes SQL verificam os nomes, períodos, totais iniciais e recálculos, filtros de transações pagas, limites inclusivos, propriedade pela conta de origem, mudança de critérios, datas e vínculos, duplicidades em INSERT/UPDATE, proteção do proprietário, timestamps automáticos, renomeação de conta/categoria, anos bissextos, exclusão isolada e cascatas. Não substituem um teste completo Express → PostgREST → PostgreSQL nem executam os triggers das outras RFs.

A suíte E2E geral de IDOR exige `SUPABASE_TEST_URL` e `SUPABASE_TEST_SECRET_KEY` de um Supabase separado. Sem essa configuração, ela é ignorada pelo comando geral; os testes HTTP locais e os testes SQL acima continuam disponíveis.

## Arquivos desta implementação

- Controllers: `src/controllers/orcamentosController.js` e `src/controllers/adminOrcamentosController.js`.
- Rotas e registro: `src/routes/orcamentosRoutes.js`, `src/routes/adminOrcamentosRoutes.js` e `src/app.js`.
- Validação do período: `src/validacoes/orcamentos.js`; os schemas existentes em `usuario.js` foram reutilizados sem alteração.
- Testes e execução: `tests/orcamentos.test.js`, `tests/testar_rotas.py`, `tests/fixtures/rotas.json`, `tests/testar_orcamentos_banco.py`, `tests/fixtures/orcamentos.sql` e `package.json`.
- Documentação: `docs/api/swagger.json` e este documento.
- Correção pontual da função da RF-008: `database/ddl/RF-006-Gerir-transacoes-financeiras.sql` (duas referências à coluna inexistente).

As alterações locais anteriores no README, schemas Joi e DDLs foram preservadas, com a correção pontual descrita acima.
