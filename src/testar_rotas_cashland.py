"""
testar_rotas_cashland.py

Testador interativo das rotas atualmente existentes no CashLand.

Instalação:
    pip install requests

Execução:
    python testar_rotas_cashland.py

O programa:
- pergunta a URL base da API;
- permite login no início;
- mantém o cookie JWT com requests.Session();
- mostra todas as rotas em um menu;
- pede pelo terminal os campos de body/query/path;
- imprime status HTTP e resposta JSON.
"""

import json
from getpass import getpass

import requests


# ============================================================
# ROTAS DO CASHLAND
# ============================================================
#
# Estrutura de cada rota:
#
# {
#     "nome": "Nome amigável",
#     "metodo": "GET|POST|PATCH|DELETE|PUT",
#     "caminho": "/rota",
#     "login": True|False,
#     "admin": True|False,          # apenas informativo no menu
#     "body": [...],                # campos enviados como JSON
#     "query": [...],               # ?campo=valor
#     "path_params": [...]          # /rota/{id_usuario}
# }
#
# Tipos suportados:
#   str, int, float, bool, json
#
# Campo opcional:
#   "obrigatorio": False
#
# Campo sensível:
#   "secreto": True
#
# ============================================================

ROTAS = [
    # --------------------------------------------------------
    # AUTENTICAÇÃO / SESSÃO
    # --------------------------------------------------------
    {
        "nome": "Consultar sessão",
        "metodo": "GET",
        "caminho": "/me",
        "login": True,
        "admin": False,
        "query": [
            {"nome": "id_usuario", "tipo": "int", "obrigatorio": False},
        ],
    },
    {
        "nome": "Login",
        "metodo": "POST",
        "caminho": "/login",
        "login": False,
        "admin": False,
        "body": [
            {"nome": "email", "tipo": "str", "obrigatorio": True},
            {"nome": "senha", "tipo": "str", "obrigatorio": True, "secreto": True},
        ],
    },
    {
        "nome": "Confirmar senha",
        "metodo": "POST",
        "caminho": "/confirmar-senha",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "senha", "tipo": "str", "obrigatorio": True, "secreto": True},
        ],
    },
    {
        "nome": "Logout",
        "metodo": "POST",
        "caminho": "/logout",
        "login": False,
        "admin": False,
    },

    # --------------------------------------------------------
    # CADASTRO / RECUPERAÇÃO DE SENHA
    # --------------------------------------------------------
    {
        "nome": "Solicitar código de cadastro",
        "metodo": "POST",
        "caminho": "/solicitar-codigo",
        "login": False,
        "admin": False,
        "body": [
            {"nome": "nome", "tipo": "str", "obrigatorio": True},
            {"nome": "email", "tipo": "str", "obrigatorio": True},
            {"nome": "senha", "tipo": "str", "obrigatorio": True, "secreto": True},
        ],
    },
    {
        "nome": "Confirmar cadastro",
        "metodo": "POST",
        "caminho": "/confirmar-cadastro",
        "login": False,
        "admin": False,
        "body": [
            {"nome": "nome", "tipo": "str", "obrigatorio": True},
            {"nome": "email", "tipo": "str", "obrigatorio": True},
            {"nome": "codigoDigitado", "tipo": "str", "obrigatorio": True},
            {"nome": "senha", "tipo": "str", "obrigatorio": True, "secreto": True},
        ],
    },
    {
        "nome": "Solicitar reset de senha",
        "metodo": "POST",
        "caminho": "/solicitar-reset-senha",
        "login": False,
        "admin": False,
        "body": [
            {"nome": "email", "tipo": "str", "obrigatorio": True},
        ],
    },
    {
        "nome": "Confirmar reset de senha",
        "metodo": "POST",
        "caminho": "/confirmar-reset-senha",
        "login": False,
        "admin": False,
        "body": [
            {"nome": "email", "tipo": "str", "obrigatorio": True},
            {"nome": "codigoDigitado", "tipo": "str", "obrigatorio": True},
            {"nome": "novaSenha", "tipo": "str", "obrigatorio": True, "secreto": True},
        ],
    },

    # --------------------------------------------------------
    # USUÁRIO COMUM
    # --------------------------------------------------------
    {
        "nome": "Consultar próprio usuário",
        "metodo": "GET",
        "caminho": "/usuario",
        "login": True,
        "admin": False,
    },
    {
        "nome": "Desativar própria conta",
        "metodo": "PATCH",
        "caminho": "/usuario/desativar-usuario",
        "login": True,
        "admin": False,
    },
    {
        "nome": "Atualizar próprios dados",
        "metodo": "PATCH",
        "caminho": "/usuario/atualizar-dados",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "nome", "tipo": "str", "obrigatorio": True},
        ],
    },

    # --------------------------------------------------------
    # ADMIN - USUÁRIOS
    # --------------------------------------------------------
    {
        "nome": "Listar/pesquisar usuários",
        "metodo": "GET",
        "caminho": "/admin/listar-usuarios",
        "login": True,
        "admin": True,
        "query": [
            {"nome": "pesquisa", "tipo": "str", "obrigatorio": False},
        ],
    },
    {
        "nome": "Consultar usuário por ID",
        "metodo": "GET",
        "caminho": "/admin/usuario",
        "login": True,
        "admin": True,
        "query": [
            {"nome": "id_usuario", "tipo": "int", "obrigatorio": False},
        ],
    },
    {
        "nome": "Editar usuário",
        "metodo": "PATCH",
        "caminho": "/admin/editar-usuario",
        "login": True,
        "admin": True,
        "body": [
            {"nome": "id_usuario", "tipo": "int", "obrigatorio": True},
            {"nome": "nome", "tipo": "str", "obrigatorio": True},
            {"nome": "email", "tipo": "str", "obrigatorio": True},
        ],
    },
    {
        "nome": "Solicitar reset de senha pelo admin",
        "metodo": "PATCH",
        "caminho": "/admin/resetar-senha",
        "login": True,
        "admin": True,
        "body": [
            {"nome": "id_usuario", "tipo": "int", "obrigatorio": True},
        ],
    },
    {
        "nome": "Reativar usuário",
        "metodo": "PATCH",
        "caminho": "/admin/reativar-usuario",
        "login": True,
        "admin": True,
        "body": [
            {"nome": "id_usuario", "tipo": "int", "obrigatorio": True},
        ],
    },
    {
        "nome": "Desativar usuário pelo admin",
        "metodo": "PATCH",
        "caminho": "/admin/desativar-usuario",
        "login": True,
        "admin": True,
        "body": [
            {"nome": "id_usuario", "tipo": "int", "obrigatorio": True},
        ],
    },
    {
        "nome": "Deletar usuário permanentemente",
        "metodo": "DELETE",
        "caminho": "/admin/deletar-usuario",
        "login": True,
        "admin": True,
        "query": [
            {"nome": "id_usuario", "tipo": "int", "obrigatorio": True},
        ],
    },

    # --------------------------------------------------------
    # RF003 - CATEGORIAS DO USUÁRIO
    # --------------------------------------------------------
    {
        "nome": "Criar categoria",
        "metodo": "POST",
        "caminho": "/usuario/criar-categoria",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "nome", "tipo": "str", "obrigatorio": True},
            {"nome": "descricao", "tipo": "str", "obrigatorio": True},
        ],
    },
    {
        "nome": "Listar/pesquisar categorias",
        "metodo": "GET",
        "caminho": "/usuario/listar-categoria",
        "login": True,
        "admin": False,
        "query": [
            {"nome": "pesquisa", "tipo": "str", "obrigatorio": False},
        ],
    },
    {
        "nome": "Editar categoria",
        "metodo": "PATCH",
        "caminho": "/usuario/editar-categoria",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "id_categoria", "tipo": "int", "obrigatorio": True},
            {"nome": "nome", "tipo": "str", "obrigatorio": True},
            {"nome": "descricao", "tipo": "str", "obrigatorio": True},
        ],
    },
    {
        "nome": "Deletar categoria",
        "metodo": "DELETE",
        "caminho": "/usuario/deletar-categoria",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "id_categoria", "tipo": "int", "obrigatorio": True},
        ],
    },

    # --------------------------------------------------------
    # ADMIN - CATEGORIAS
    # --------------------------------------------------------
    {
        "nome": "Listar categorias como administrador",
        "metodo": "GET",
        "caminho": "/admin/listar-categoria",
        "login": True,
        "admin": True,
        "query": [
            {"nome": "id_usuario", "tipo": "int", "obrigatorio": False},
            {"nome": "id_categoria", "tipo": "int", "obrigatorio": False},
        ],
    },
    {"nome": "Editar categorias como administrador",
            "metodo": "PATCH",
            "caminho": "/admin/editar-categoria",
            "login": True,
            "admin": True,
            "body": [
                {"nome": "id_categoria", "tipo": "int", "obrigatorio": True},
                {"nome": "nome", "tipo": "str", "obrigatorio": True},
                {"nome": "descricao", "tipo": "str", "obrigatorio": True},
            ],
        },
    {"nome": "Criar subcategoria",
                "metodo": "POST",
                "caminho": "/usuario/criar-sub_categoria",
                "login": True,
                "admin": False,
                "body": [
                    {"nome": "id_categoria", "tipo": "int", "obrigatorio": True},
                    {"nome": "nome", "tipo": "str", "obrigatorio": True},
                    {"nome": "descricao", "tipo": "str", "obrigatorio": False},
                ],
            },
    {"nome": "Editar subcategoria",
                    "metodo": "PATCH",
                    "caminho": "/usuario/editar-sub_categoria",
                    "login": True,
                    "admin": False,
                    "body": [
                        {"nome": "id_subcategoria", "tipo": "int", "obrigatorio": True},
                        {"nome": "nome", "tipo": "str", "obrigatorio": True},
                        {"nome": "descricao", "tipo": "str", "obrigatorio": False},
                    ],
                },
    {"nome": "Listar/Pesquisar subcategorias",
                        "metodo": "GET",
                        "caminho": "/usuario/listar-sub_categoria",
                        "login": True,
                        "admin": False,
                        "query": [
                            {"nome": "pesquisa", "tipo": "str", "obrigatorio": False}
                        ],
                    },
]


def converter_valor(valor, tipo):
    if tipo == "str":
        return valor
    if tipo == "int":
        return int(valor)
    if tipo == "float":
        return float(valor)
    if tipo == "bool":
        return valor.lower() in ("true", "1", "sim", "s", "yes", "y")
    if tipo == "json":
        return json.loads(valor)
    return valor


def pedir_campos(campos):
    dados = {}

    for campo in campos or []:
        nome = campo["nome"]
        tipo = campo.get("tipo", "str")
        obrigatorio = campo.get("obrigatorio", True)
        secreto = campo.get("secreto", False)

        while True:
            indicador = "" if obrigatorio else " [opcional - ENTER para ignorar]"

            if secreto:
                valor = getpass(f"{nome}{indicador}: ").strip()
            else:
                valor = input(f"{nome}{indicador}: ").strip()

            if not valor:
                if obrigatorio:
                    print("Este campo é obrigatório.")
                    continue
                break

            try:
                dados[nome] = converter_valor(valor, tipo)
                break
            except (ValueError, json.JSONDecodeError):
                print(f"Valor inválido. Tipo esperado: {tipo}")

    return dados


def montar_caminho(rota):
    caminho = rota["caminho"]

    for parametro in rota.get("path_params", []):
        nome = parametro["nome"]
        tipo = parametro.get("tipo", "str")

        while True:
            valor = input(f"{nome}: ").strip()

            try:
                valor = converter_valor(valor, tipo)
                caminho = caminho.replace("{" + nome + "}", str(valor))
                break
            except ValueError:
                print(f"Valor inválido. Tipo esperado: {tipo}")

    return caminho


def mostrar_resposta(resposta):
    print("\n" + "=" * 75)
    print(f"STATUS: {resposta.status_code} {resposta.reason}")
    print("=" * 75)

    try:
        resposta_json = resposta.json()
        print(json.dumps(resposta_json, indent=4, ensure_ascii=False))
    except ValueError:
        print(resposta.text or "(Resposta sem corpo)")

    print("=" * 75 + "\n")


def executar_rota(session, base_url, rota, autenticado):
    if rota.get("login") and not autenticado:
        print("\n[!] Esta rota exige autenticação.")
        print("Faça login pela rota /login primeiro.\n")
        return autenticado

    caminho = montar_caminho(rota)
    url = base_url.rstrip("/") + caminho

    query = pedir_campos(rota.get("query", []))
    body = pedir_campos(rota.get("body", []))

    metodo = rota["metodo"].upper()

    print("\n" + "-" * 75)
    print("REQUISIÇÃO")
    print("-" * 75)
    print(f"{metodo} {url}")

    if query:
        print("Query:")
        print(json.dumps(query, indent=4, ensure_ascii=False))

    if body:
        body_seguro = body.copy()

        for campo in rota.get("body", []):
            if campo.get("secreto") and campo["nome"] in body_seguro:
                body_seguro[campo["nome"]] = "********"

        print("Body:")
        print(json.dumps(body_seguro, indent=4, ensure_ascii=False))

    try:
        resposta = session.request(
            method=metodo,
            url=url,
            params=query or None,
            json=body or None,
            timeout=20,
        )

        print(f"\nURL final: {resposta.request.url}")
        mostrar_resposta(resposta)

        if rota["caminho"] == "/login":
            if resposta.ok:
                autenticado = True
                print("[OK] Sessão marcada como autenticada.")
                print("Cookies armazenados:", session.cookies.get_dict())
            else:
                autenticado = False

        elif rota["caminho"] == "/logout" and resposta.ok:
            autenticado = False
            print("[OK] Sessão local marcada como desconectada.")

        return autenticado

    except requests.exceptions.ConnectionError:
        print("\n[ERRO] Não foi possível conectar à API.")
        print("Confira se o servidor está rodando e se a URL/porta estão corretas.\n")

    except requests.exceptions.Timeout:
        print("\n[ERRO] A API demorou demais para responder.\n")

    except requests.exceptions.RequestException as erro:
        print(f"\n[ERRO] Falha na requisição: {erro}\n")

    return autenticado


def fazer_login_inicial(session, base_url):
    resposta = input("Deseja fazer login agora? [s/N]: ").strip().lower()

    if resposta not in ("s", "sim", "y", "yes"):
        return False

    rota_login = next(
        (rota for rota in ROTAS if rota["caminho"] == "/login"),
        None
    )

    if not rota_login:
        print("A rota /login não foi encontrada.")
        return False

    return executar_rota(
        session=session,
        base_url=base_url,
        rota=rota_login,
        autenticado=False
    )


def mostrar_menu():
    print("\n" + "=" * 90)
    print("TESTADOR DE ROTAS - CASHLAND")
    print("=" * 90)

    for indice, rota in enumerate(ROTAS, start=1):
        marcacoes = []

        if rota.get("login"):
            marcacoes.append("LOGIN")

        if rota.get("admin"):
            marcacoes.append("ADMIN")

        sufixo = ""
        if marcacoes:
            sufixo = " [" + " | ".join(marcacoes) + "]"

        print(
            f"{indice:>2} - "
            f"{rota['metodo'].upper():7} "
            f"{rota['caminho']:<35} "
            f"{rota['nome']}{sufixo}"
        )

    print("\n 0 - Sair")
    print("=" * 90)


def main():
    print("=" * 75)
    print("TESTADOR INTERATIVO DA API CASHLAND")
    print("=" * 75)

    base_url = input(
        "URL base da API [ENTER = http://localhost:3000]: "
    ).strip()

    if not base_url:
        base_url = "http://localhost:3000"

    session = requests.Session()

    session.headers.update({
        "Accept": "application/json",
        "Content-Type": "application/json",
    })

    autenticado = fazer_login_inicial(session, base_url)

    while True:
        mostrar_menu()

        escolha = input("Escolha uma rota: ").strip()

        if escolha == "0":
            print("Encerrando testador.")
            break

        try:
            indice = int(escolha) - 1

            if indice < 0 or indice >= len(ROTAS):
                raise ValueError

            rota = ROTAS[indice]

        except ValueError:
            print("Opção inválida.")
            continue

        autenticado = executar_rota(
            session=session,
            base_url=base_url,
            rota=rota,
            autenticado=autenticado
        )


if __name__ == "__main__":
    main()
