-- RF-007: unicidade do nome da meta por proprietário, garantida no banco (RN-03).
--
-- Antes: a verificação de nome repetido era feita somente pela aplicação, com uma consulta
-- prévia ao INSERT/UPDATE. Duas requisições simultâneas podiam gravar nomes iguais.
-- Depois: um trigger BEFORE INSERT OR UPDATE OF nome, id_conta verifica o nome entre as
-- metas das contas do mesmo usuário, sob bloqueio consultivo por usuário, e levanta
-- unique_violation (23505), que a API converte em HTTP 409.
--
-- Metas já existentes não são alteradas. A migration pode ser executada mais de uma vez.

BEGIN;

CREATE OR REPLACE FUNCTION public.verificar_nome_meta_unico()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
    v_id_usuario integer;
BEGIN
    SELECT c.id_usuario INTO v_id_usuario
    FROM public.contas_bancarias AS c
    WHERE c.id_conta = NEW.id_conta;

    -- Conta inexistente é tratada pela chave estrangeira metas_id_conta_fkey.
    IF v_id_usuario IS NULL THEN
        RETURN NEW;
    END IF;

    PERFORM pg_advisory_xact_lock(hashtext('metas_nome_usuario'), v_id_usuario);

    IF EXISTS (
        SELECT 1
        FROM public.metas AS m
        JOIN public.contas_bancarias AS c ON c.id_conta = m.id_conta
        WHERE c.id_usuario = v_id_usuario
          AND m.nome = NEW.nome
          AND m.id_meta IS DISTINCT FROM NEW.id_meta
    ) THEN
        RAISE unique_violation
            USING MESSAGE = 'Já existe uma meta com esse nome para este usuário.',
                  CONSTRAINT = 'uq_metas_usuario_nome';
    END IF;

    RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trigger_verificar_nome_meta_unico ON public.metas;

CREATE TRIGGER trigger_verificar_nome_meta_unico
BEFORE INSERT OR UPDATE OF nome, id_conta ON public.metas
FOR EACH ROW
EXECUTE FUNCTION public.verificar_nome_meta_unico();

COMMIT;
