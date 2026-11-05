"""Testa os DDLs da RF008 em um banco PostgreSQL temporário, nunca no banco da aplicação.

Execução: npm run test:rf08:banco
Requer Docker e o PostgreSQL do Supabase local iniciado.
CASHLAND_TEST_CONTAINER permite informar outro container PostgreSQL local.
"""
import os
import re
import subprocess
from pathlib import Path
from uuid import uuid4


def executar_sql(container, banco, sql):
    processo = subprocess.run(
        ["docker", "exec", "-i", container, "psql", "-X", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", banco],
        input=sql, text=True, capture_output=True, timeout=60,
    )
    if processo.returncode != 0:
        raise RuntimeError(processo.stderr)
    return processo.stdout + processo.stderr


def main():
    raiz = Path(__file__).resolve().parents[1]
    container = os.environ.get("CASHLAND_TEST_CONTAINER", "supabase_db_CashLand")
    banco = "cashland_rf08_teste_" + uuid4().hex
    arquivos = ["RF-002-Login.sql", "RF-004-Gerir-categorias.sql", "RF-005-Gerir-contas-financeiras.sql",
                "RF-007-Gerir_metas.sql", "RF-006-Gerir-transacoes-financeiras.sql", "RF-008-Gerir-orcamentos.sql"]
    tabelas = []
    funcoes = []
    triggers = []
    nomes_funcoes = {"gerar_periodo_orcamento", "gerar_nome_orcamento", "recalcular_valores_orcamento",
                     "atualizar_data_atualizacao_orcamento", "atualizar_orcamentos_por_transacao", "sincronizar_nomes_orcamentos"}
    for nome in arquivos:
        texto = (raiz / "database/ddl" / nome).read_text()
        tabelas.extend(re.findall(r"create table public\..*?\) TABLESPACE pg_default;", texto, re.DOTALL))
        for definicao, nome_funcao in re.findall(
            r"(CREATE OR REPLACE FUNCTION public\.(\w+)\(.*?\$function\$.*?\$function\$)", texto, re.DOTALL
        ):
            # Os exports locais omitem o delimitador entre definições de função.
            if nome_funcao in nomes_funcoes:
                funcoes.append(definicao + ";")
        triggers.extend(re.findall(r"create trigger rf008_.*?execute FUNCTION.*?;", texto, re.DOTALL))
    if len(funcoes) != 6 or len(triggers) != 7:
        raise RuntimeError("As seis funções e os sete triggers da RF008 precisam estar nos DDLs")
    criado = False
    try:
        executar_sql(container, "postgres", f'CREATE DATABASE "{banco}";')
        criado = True
        # Somente tabelas originais e os triggers sob teste; não executa seeds reais.
        executar_sql(container, banco, "\n\n".join(tabelas + funcoes + triggers))
        resultado = executar_sql(container, banco, (raiz / "tests/fixtures/orcamentos.sql").read_text())
        print(resultado)
        print("RF008: testes de banco aprovados; base temporária removida ao finalizar.")
    finally:
        if criado:
            executar_sql(container, "postgres", f'DROP DATABASE "{banco}";')


if __name__ == "__main__":
    main()
