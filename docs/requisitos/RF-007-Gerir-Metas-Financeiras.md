# Integração de metas na RF006/RF005

As rotas e telas da RF007 foram retiradas em 17/10/2026, incluindo controllers, validações exclusivas, script de tela, links de navegação e operações no Swagger. Os vínculos por `id_meta` da RF006 e as alterações da RF005 foram preservados. Nenhuma alteração no banco foi executada nesta retirada.

## Vínculo por id_meta

As rotas de criação, edição e listagem de transações e recorrências continuam aceitando `id_meta`. A propriedade é validada por `metas.id_conta -> contas_bancarias.id_usuario`, usando `verificarMeta` e `validarVinculoMeta` em `src/validacoes/validarTabelas.js`. O administrador valida o usuário alvo. Transferências não permitem meta.

Nas cinco telas da RF006, o vínculo e o filtro usam um campo numérico de ID, sem consultar as rotas removidas de listagem de metas. Na edição, vínculo inalterado é omitido, troca envia inteiro e remoção envia `null`. O botão PAGAR continua enviando somente ID da transação, status e data de pagamento. Os filtros por meta são combinados com os demais filtros e funcionam para transações e recorrências.

## RF005

As colunas `contas_bancarias.data_fechamento` e `data_vencimento` foram confirmadas como **smallint** por consulta somente de metadados REST em 16/10/2026. A implementação recebe dias mensais entre 1 e 31. Conta `Credito` exige ambos; PATCH preserva dias omitidos e mudar para outro tipo limpa ambos. Vencimento pode ser menor que fechamento. O contrato anterior de contas foi preservado: nome e tipo continuam obrigatórios também no PATCH.

A assinatura REST de `calcular_vencimento` foi consultada: `p_id_conta` inteiro e `p_data_referencia` date. **O corpo da função não foi inspecionado**, portanto suas regras de mês seguinte e ajuste dos dias 29–31 ainda precisam de verificação em banco de teste. Nenhuma transação histórica é reescrita ao editar os dias da conta ou a conta da meta.

## Banco

Os arquivos DDL foram preservados, incluindo `database/ddl/RF-007-Gerir_metas.sql` e os vínculos da RF006. As validações de `id_meta` continuam consultando a tabela `metas` existente. Nenhuma função ou trigger foi alterada nesta retirada.

## Verificação

`npm test`: 131 testes aprovados, zero falhas. A suíte E2E com Supabase real não foi executada. Os testes locais usam banco simulado e executam o JavaScript das telas em VM com DOM/rede simulados; não houve teste visual em navegador.

- `tests/id-meta.test.js`: vínculos, propriedade, filtros, PATCH com null/omissão e resposta 404 para as rotas e telas retiradas.
- `tests/id-meta-frontend.test.js`: edição sem depender da RF007, serialização do vínculo, pagamento e filtros.
- `tests/contas-financeiras.test.js`: comportamento preservado da RF005.

Também foram verificados a sintaxe dos scripts inline da RF006, as referências internas do Swagger e `git diff --check`.
