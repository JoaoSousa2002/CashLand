-- Executado somente na base temporária criada por testar_orcamentos_banco.py.
BEGIN;
SET TIME ZONE 'America/Sao_Paulo';
DO $teste$
DECLARE
    usuario_a INTEGER;
    usuario_b INTEGER;
    conta_a INTEGER;
    conta_a2 INTEGER;
    conta_b INTEGER;
    categoria_a INTEGER;
    categoria_a2 INTEGER;
    categoria_b INTEGER;
    orcamento_conta INTEGER;
    orcamento_categoria INTEGER;
    orcamento_ambos INTEGER;
    orcamento_semanal INTEGER;
    orcamento_outro_usuario INTEGER;
    transacao_a INTEGER;
    transacao_b INTEGER;
    inicio DATE := DATE_TRUNC('year', CURRENT_DATE)::DATE;
    fim DATE := (DATE_TRUNC('year', CURRENT_DATE) + INTERVAL '1 year - 1 day')::DATE;
    ano_bissexto INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER + 1;
    registro public.orcamentos%ROWTYPE;
    criacao TIMESTAMPTZ;
    quantidade INTEGER;
BEGIN
    INSERT INTO usuarios (nome, email, senha_hash) VALUES ('RF008 A', 'rf08-a@example.com', 'fixture-sem-login') RETURNING id_usuario INTO usuario_a;
    INSERT INTO usuarios (nome, email, senha_hash) VALUES ('RF008 B', 'rf08-b@example.com', 'fixture-sem-login') RETURNING id_usuario INTO usuario_b;
    INSERT INTO contas_bancarias (id_usuario, tipo_conta, nome_conta) VALUES (usuario_a, 'Corrente', 'Conta A') RETURNING id_conta INTO conta_a;
    INSERT INTO contas_bancarias (id_usuario, tipo_conta, nome_conta) VALUES (usuario_a, 'Corrente', 'Conta A2') RETURNING id_conta INTO conta_a2;
    INSERT INTO contas_bancarias (id_usuario, tipo_conta, nome_conta) VALUES (usuario_b, 'Corrente', 'Conta B') RETURNING id_conta INTO conta_b;
    INSERT INTO categorias (id_usuario, nome) VALUES (usuario_a, 'Categoria A') RETURNING id_categoria INTO categoria_a;
    INSERT INTO categorias (id_usuario, nome) VALUES (usuario_a, 'Categoria A2') RETURNING id_categoria INTO categoria_a2;
    INSERT INTO categorias (id_usuario, nome) VALUES (usuario_b, 'Categoria B') RETURNING id_categoria INTO categoria_b;

    -- Conta, categoria e interseção: valores são sempre calculados pelo banco.
    INSERT INTO orcamentos (id_usuario, id_conta, tipo_periodo, periodo_inicio, valor_orcamento)
    VALUES (usuario_a, conta_a, 'Anual', inicio, 1000) RETURNING id_orcamento INTO orcamento_conta;
    INSERT INTO orcamentos (id_usuario, id_categoria, tipo_periodo, periodo_inicio, valor_orcamento)
    VALUES (usuario_a, categoria_a, 'Anual', inicio, 2000) RETURNING id_orcamento INTO orcamento_categoria;
    INSERT INTO orcamentos (id_usuario, id_conta, id_categoria, tipo_periodo, periodo_inicio, valor_orcamento)
    VALUES (usuario_a, conta_a, categoria_a, 'Anual', inicio, 3000) RETURNING id_orcamento INTO orcamento_ambos;
    INSERT INTO orcamentos (id_usuario, id_conta, tipo_periodo, periodo_inicio, valor_orcamento)
    VALUES (usuario_b, conta_b, 'Anual', inicio, 500) RETURNING id_orcamento INTO orcamento_outro_usuario;
    SELECT * INTO registro FROM orcamentos WHERE id_orcamento = orcamento_ambos;
    IF registro.valor_atual <> 0 OR registro.periodo_fim <> fim OR registro.nome <>
        'Orçamento Conta A#' || conta_a || '+Categoria A#' || categoria_a || ' [' || EXTRACT(YEAR FROM inicio)::TEXT || ']' THEN
        RAISE EXCEPTION 'Nome, período anual ou total inicial incorreto';
    END IF;
    criacao := registro.data_criacao;
    RAISE NOTICE 'OK: criação, zero inicial, nome automático e período anual';

    INSERT INTO transacoes (id_conta_origem, id_categoria, nome, tipo_transacao, valor_transacao, status_transacao, data_transacao, data_pagamento)
    VALUES (conta_a, categoria_a, 'Primeiro dia', 'Saida', 100, 'Pago', inicio, inicio) RETURNING id_transacao INTO transacao_a;
    INSERT INTO transacoes (id_conta_origem, id_categoria, nome, tipo_transacao, valor_transacao, status_transacao, data_transacao, data_pagamento)
    VALUES (conta_a2, categoria_a, 'Último dia', 'Saida', 50, 'Pago', fim, fim) RETURNING id_transacao INTO transacao_b;
    INSERT INTO transacoes (id_conta_origem, id_categoria, nome, tipo_transacao, valor_transacao, status_transacao, data_transacao, data_pagamento)
    VALUES (conta_a, categoria_a2, 'Outra categoria', 'Saida', 25, 'Pago', CURRENT_DATE, CURRENT_DATE),
           (conta_a, categoria_a, 'Entrada ignorada', 'Entrada', 400, 'Pago', inicio, inicio),
           (conta_a, categoria_a, 'Pendente ignorada', 'Saida', 400, 'Pendente', inicio, NULL),
           (conta_a, categoria_a, 'Fora do período', 'Saida', 400, 'Pago', inicio - 1, inicio - 1),
           (conta_b, categoria_b, 'Outro usuário', 'Saida', 400, 'Pago', inicio, inicio);
    INSERT INTO transacoes (id_conta_origem, id_conta_destino, nome, tipo_transacao, valor_transacao, status_transacao, data_transacao, data_pagamento)
    VALUES (conta_a, conta_a2, 'Transferência ignorada', 'Transferencia', 400, 'Pago', inicio, inicio);
    IF (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_conta) <> 125
       OR (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_categoria) <> 150
       OR (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_ambos) <> 100 THEN
        RAISE EXCEPTION 'Somas por conta, categoria e interseção incorretas';
    END IF;
    RAISE NOTICE 'OK: saídas pagas, limites inclusivos, conta/categoria/ambas e isolamento';

    INSERT INTO orcamentos (id_usuario, id_conta, id_categoria, tipo_periodo, periodo_inicio, valor_orcamento)
    VALUES (usuario_a, conta_a2, categoria_a, 'Anual', inicio, 70) RETURNING * INTO registro;
    IF registro.valor_atual <> 50 THEN
        RAISE EXCEPTION 'Criação não considerou transações já existentes';
    END IF;
    UPDATE orcamentos SET id_conta = conta_a, id_categoria = categoria_a2, valor_orcamento = 80
    WHERE id_orcamento = registro.id_orcamento RETURNING * INTO registro;
    IF registro.valor_atual <> 25 OR registro.valor_orcamento <> 80 THEN
        RAISE EXCEPTION 'Mudança dos critérios ou limite do orçamento incorreta';
    END IF;
    DELETE FROM orcamentos WHERE id_orcamento = registro.id_orcamento;
    RAISE NOTICE 'OK: total na criação com transações existentes e recálculo de critérios';

    UPDATE transacoes SET valor_transacao = 120 WHERE id_transacao = transacao_a;
    IF (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_ambos) <> 120 THEN
        RAISE EXCEPTION 'Alteração da transação não recalculou orçamento';
    END IF;
    UPDATE transacoes SET data_pagamento = inicio - 1 WHERE id_transacao = transacao_a;
    IF (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_ambos) <> 0 THEN
        RAISE EXCEPTION 'Mudança da data não retirou o valor do período';
    END IF;
    UPDATE transacoes SET data_pagamento = inicio, id_conta_origem = conta_b, id_categoria = categoria_b WHERE id_transacao = transacao_a;
    IF (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_outro_usuario) <> 520 THEN
        RAISE EXCEPTION 'Mudança de proprietário pela conta não recalculou orçamento novo';
    END IF;
    UPDATE transacoes SET id_conta_origem = conta_a, id_categoria = categoria_a WHERE id_transacao = transacao_a;
    IF (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_outro_usuario) <> 400
       OR (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_ambos) <> 120 THEN
        RAISE EXCEPTION 'Mudança de proprietário não recalculou orçamento antigo e novo';
    END IF;
    UPDATE transacoes SET id_categoria = categoria_a2 WHERE id_transacao = transacao_a;
    IF (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_ambos) <> 0
       OR (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_categoria) <> 50 THEN
        RAISE EXCEPTION 'Mudança de categoria não recalculou critérios antigos';
    END IF;
    UPDATE transacoes SET id_conta_origem = conta_a, id_categoria = categoria_a WHERE id_transacao = transacao_b;
    IF (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_ambos) <> 50 THEN
        RAISE EXCEPTION 'Mudança de conta não recalculou critérios novos';
    END IF;
    UPDATE transacoes SET status_transacao = 'Pendente', data_pagamento = NULL WHERE id_transacao = transacao_b;
    IF (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_ambos) <> 0 THEN
        RAISE EXCEPTION 'Mudança para pendente não zerou total';
    END IF;
    UPDATE transacoes SET status_transacao = 'Pago', data_pagamento = fim WHERE id_transacao = transacao_b;
    DELETE FROM transacoes WHERE id_transacao = transacao_b;
    IF (SELECT valor_atual FROM orcamentos WHERE id_orcamento = orcamento_categoria) <> 0 THEN
        RAISE EXCEPTION 'Exclusão de transação não recalculou total';
    END IF;
    RAISE NOTICE 'OK: alterações de valor, categoria, conta, status e exclusão recalculam';

    UPDATE orcamentos SET descricao = 'Novo texto', nome = 'Nome indevido', valor_atual = 999,
        data_criacao = '2000-01-01', data_atualizacao = '2000-01-01' WHERE id_orcamento = orcamento_ambos;
    SELECT * INTO registro FROM orcamentos WHERE id_orcamento = orcamento_ambos;
    IF registro.valor_orcamento <> 3000 OR registro.periodo_inicio <> inicio OR registro.periodo_fim <> fim
       OR registro.data_criacao <> criacao OR registro.data_atualizacao <> CURRENT_TIMESTAMP
       OR registro.nome = 'Nome indevido' OR registro.valor_atual <> 0 THEN
        RAISE EXCEPTION 'Edição não preservou limite, período ou criação';
    END IF;
    UPDATE contas_bancarias SET nome_conta = 'Conta renomeada' WHERE id_conta = conta_a;
    UPDATE categorias SET nome = 'Categoria renomeada' WHERE id_categoria = categoria_a;
    SELECT * INTO registro FROM orcamentos WHERE id_orcamento = orcamento_ambos;
    IF registro.nome <> 'Orçamento Conta renomeada#' || conta_a || '+Categoria renomeada#' || categoria_a || ' [' || EXTRACT(YEAR FROM inicio)::TEXT || ']'
       OR registro.valor_orcamento <> 3000 OR registro.descricao <> 'Novo texto' THEN
        RAISE EXCEPTION 'Sincronização de nomes incorreta';
    END IF;
    RAISE NOTICE 'OK: preservação do limite/período/criação e sincronização de nomes';

    BEGIN
        INSERT INTO orcamentos (id_usuario, id_conta, id_categoria, tipo_periodo, periodo_inicio, valor_orcamento)
        VALUES (usuario_a, conta_a, categoria_a, 'Anual', inicio, 1);
        RAISE EXCEPTION 'Duplicidade aceita';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        UPDATE orcamentos SET id_categoria = categoria_a WHERE id_orcamento = orcamento_conta;
        RAISE EXCEPTION 'Duplicidade na edição aceita';
    EXCEPTION WHEN unique_violation THEN NULL;
    END;
    BEGIN
        UPDATE orcamentos SET id_conta = NULL, id_categoria = NULL WHERE id_orcamento = orcamento_ambos;
        RAISE EXCEPTION 'Remoção de todos os vínculos aceita';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    BEGIN
        UPDATE orcamentos SET id_conta = conta_b WHERE id_orcamento = orcamento_ambos;
        RAISE EXCEPTION 'Conta alheia aceita';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        UPDATE orcamentos SET id_categoria = categoria_b WHERE id_orcamento = orcamento_ambos;
        RAISE EXCEPTION 'Categoria alheia aceita';
    EXCEPTION WHEN foreign_key_violation THEN NULL;
    END;
    BEGIN
        UPDATE orcamentos SET id_usuario = usuario_b, id_conta = conta_b, id_categoria = categoria_b WHERE id_orcamento = orcamento_ambos;
        RAISE EXCEPTION 'Transferência de proprietário aceita';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    RAISE NOTICE 'OK: duplicidades, vínculo obrigatório e propriedade protegidos';

    -- Calendário futuro permite testar fevereiro bissexto e semanas entre anos.
    WHILE NOT (ano_bissexto % 4 = 0 AND (ano_bissexto % 100 <> 0 OR ano_bissexto % 400 = 0)) LOOP
        ano_bissexto := ano_bissexto + 1;
    END LOOP;
    INSERT INTO orcamentos (id_usuario, id_conta, tipo_periodo, periodo_inicio, valor_orcamento)
    VALUES (usuario_a, conta_a, 'Mensal', MAKE_DATE(ano_bissexto, 2, 1), 100) RETURNING * INTO registro;
    IF registro.periodo_fim <> MAKE_DATE(ano_bissexto, 2, 29) THEN
        RAISE EXCEPTION 'Fevereiro bissexto incorreto';
    END IF;
    UPDATE orcamentos SET periodo_inicio = MAKE_DATE(ano_bissexto + 1, 2, 1) WHERE id_orcamento = registro.id_orcamento RETURNING * INTO registro;
    IF registro.periodo_fim <> MAKE_DATE(ano_bissexto + 1, 2, 28) THEN
        RAISE EXCEPTION 'Fevereiro comum incorreto';
    END IF;
    UPDATE orcamentos SET periodo_inicio = MAKE_DATE(ano_bissexto, 4, 1) WHERE id_orcamento = registro.id_orcamento RETURNING * INTO registro;
    IF registro.periodo_fim <> MAKE_DATE(ano_bissexto, 4, 30) THEN
        RAISE EXCEPTION 'Mês de 30 dias incorreto';
    END IF;
    inicio := MAKE_DATE(ano_bissexto, 12, 31);
    IF EXTRACT(DOW FROM inicio) = 6 THEN
        inicio := MAKE_DATE(ano_bissexto + 1, 12, 31);
    END IF;
    inicio := inicio - EXTRACT(DOW FROM inicio)::INTEGER;
    INSERT INTO orcamentos (id_usuario, id_categoria, tipo_periodo, periodo_inicio, valor_orcamento)
    VALUES (usuario_a, categoria_a, 'Semanal', inicio, 100) RETURNING * INTO registro;
    orcamento_semanal := registro.id_orcamento;
    IF registro.periodo_fim <> inicio + 6 OR registro.nome NOT LIKE '%[' || TO_CHAR(inicio, 'DD/MM/YYYY') || '-' || TO_CHAR(inicio + 6, 'DD/MM/YYYY') || ']' THEN
        RAISE EXCEPTION 'Semana entre meses/anos incorreta';
    END IF;
    BEGIN
        UPDATE orcamentos SET periodo_inicio = inicio + 1 WHERE id_orcamento = orcamento_semanal;
        RAISE EXCEPTION 'Semana fora do domingo aceita';
    EXCEPTION WHEN check_violation THEN NULL;
    END;
    RAISE NOTICE 'OK: ano bissexto, meses de 28/29/30 dias e semana entre anos';

    SELECT COUNT(*) INTO quantidade FROM transacoes;
    INSERT INTO saldo_conta (id_conta, saldo, data_saldo) VALUES (conta_a, 123, CURRENT_DATE);
    DELETE FROM orcamentos WHERE id_orcamento = orcamento_ambos;
    IF (SELECT COUNT(*) FROM transacoes) <> quantidade
       OR NOT EXISTS (SELECT 1 FROM contas_bancarias WHERE id_conta = conta_a)
       OR NOT EXISTS (SELECT 1 FROM categorias WHERE id_categoria = categoria_a)
       OR NOT EXISTS (SELECT 1 FROM saldo_conta WHERE id_conta = conta_a AND saldo = 123) THEN
        RAISE EXCEPTION 'Exclusão de orçamento afetou outros dados';
    END IF;
    -- Remove apenas transações de teste antes de exercitar FKs de contas/categorias.
    DELETE FROM transacoes;
    DELETE FROM categorias WHERE id_categoria = categoria_a;
    IF EXISTS (SELECT 1 FROM orcamentos WHERE id_categoria = categoria_a) THEN
        RAISE EXCEPTION 'Cascade de categoria não excluiu orçamentos';
    END IF;
    DELETE FROM contas_bancarias WHERE id_conta = conta_a;
    IF EXISTS (SELECT 1 FROM orcamentos WHERE id_conta = conta_a) THEN
        RAISE EXCEPTION 'Cascade de conta não excluiu orçamentos';
    END IF;
    RAISE NOTICE 'OK: exclusão isolada e cascatas de vínculos';
END;
$teste$;
ROLLBACK;
