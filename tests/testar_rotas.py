"""
testar_rotas_cashland.py

Testador interativo das rotas atualmente existentes no CashLand.

Instalação:
    pip install requests

Execução:
    python3 tests/testar_rotas.py
    python3 tests/testar_rotas.py --testes-rf06  # testes locais sem banco real

O programa:
- pergunta a URL base da API;
- permite login no início;
- mantém o cookie JWT com requests.Session();
- mostra todas as rotas em um menu;
- pede pelo terminal os campos de body/query/path;
- imprime status HTTP e resposta JSON.
"""

import json
import subprocess
import sys
import unittest
from pathlib import Path
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
        "caminho": "/admin/deletar-usuario/{id_usuario}",
        "login": True,
        "admin": True,
        "path_params": [
            {"nome": "id_usuario", "tipo": "int", "obrigatorio": True},
        ],
    },

    # --------------------------------------------------------
    # RF004 - CATEGORIAS DO USUÁRIO
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
        "caminho": "/usuario/deletar-categoria/{id_categoria}",
        "login": True,
        "admin": False,
        "path_params": [
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

    {"nome": "Deletar categoria como ADMIN",
                            "metodo": "DELETE",
                            "caminho": "/admin/deletar-categoria/{id_categoria}/{id_usuario}",
                            "login": True,
                            "admin": True,
                            "path_params": [
                                {"nome": "id_categoria", "tipo": "int", "obrigatorio": True},
                                {"nome": "id_usuario", "tipo": "int", "obrigatorio": True}
                            ],
                        },
    {"nome": "Listar/Pesquisar subcategoria como ADMIN",
                            "metodo": "GET",
                            "caminho": "/admin/listar-sub_categoria",
                            "login": True,
                            "admin": True,
                            "query": [
                                {"nome": "pesquisa", "tipo": "stf", "obrigatorio": False},
                                {"nome": "id_usuario", "tipo": "int", "obrigatorio": False}
                            ],
                        },

    {"nome": "Editar subcategoria como ADMIN",
                                    "metodo": "PATCH",
                                    "caminho": "/admin/editar-sub_categoria",
                                    "login": True,
                                    "admin": True,
                                    "body": [
                                        {"nome": "id_subcategoria", "tipo": "int", "obrigatorio": True},
                                        {"nome": "id_usuario", "tipo": "int", "obrigatorio": True},
                                        {"nome": "nome", "tipo": "stf", "obrigatorio": True},
                                        {"nome": "descricao", "tipo": "str", "obrigatorio": False}
                                    ],
                                },
    {"nome": "Criar conta financeira",
            "metodo": "POST",
            "caminho": "/usuario/criar-conta",
            "login": True,
            "admin": False,
            "body": [
                {"nome": "nome_conta", "tipo": "str", "obrigatorio": True},
                {"nome": "nome_instituicao", "tipo": "stf", "obrigatorio": False},
                {"nome": "tipo_conta", "tipo": "str", "obrigatorio": True},
                {"nome": "codigo_conta", "tipo": "int", "obrigatorio": False}
            ],
        },
    {"nome": "Listar contas financeiras",
            "metodo": "GET",
            "caminho": "/usuario/listar-contas",
            "login": True,
            "admin": False,
            "query": [
            {"nome": "pesquisa", "tipo": "str", "obrigatorio": False}
            ],
            },
    {"nome": "Editar conta financeiras",
        "metodo": "PATCH",
        "caminho": "/usuario/editar-conta",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "id_conta", "tipo": "int", "obrigatorio": True},
            {"nome": "nome_conta", "tipo": "str", "obrigatorio": True},
            {"nome": "nome_instituicao", "tipo": "stf", "obrigatorio": False},
            {"nome": "tipo_conta", "tipo": "str", "obrigatorio": True},
            {"nome": "codigo_conta", "tipo": "int", "obrigatorio": False}
        ],
        },
    {"nome": "Desativar contas financeiras",
        "metodo": "PATCH",
        "caminho": "/usuario/inativar-conta",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "id_conta", "tipo": "int", "obrigatorio": True}
        ],
        },
    {"nome": "Reativar contas financeiras",
        "metodo": "PATCH",
        "caminho": "/usuario/reativar-conta",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "id_conta", "tipo": "int", "obrigatorio": True}
        ],
        },
    {"nome": "Listar contas financeiras como ADMIN",
        "metodo": "GET",
        "caminho": "/admin/listar-contas",
        "login": True,
        "admin": True,
        "query": [
            {"nome": "pesquisa", "tipo": "str", "obrigatorio": False},
            {"nome": "id_usuario", "tipo": "str", "obrigatorio": False}
        ],
        },
    {"nome": "Editar conta financeiras como ADMIN",
        "metodo": "PATCH",
        "caminho": "/admin/editar-conta",
        "login": True,
        "admin": True,
        "body": [
            {"nome": "id_conta", "tipo": "int", "obrigatorio": True},
            {"nome": "id_usuario", "tipo": "int", "obrigatorio": True},
            {"nome": "nome_conta", "tipo": "str", "obrigatorio": True},
            {"nome": "nome_instituicao", "tipo": "stf", "obrigatorio": False},
            {"nome": "tipo_conta", "tipo": "str", "obrigatorio": True},
            {"nome": "codigo_conta", "tipo": "int", "obrigatorio": False}
        ],
        },
    {"nome": "Inativar conta financeiras como ADMIN",
            "metodo": "PATCH",
            "caminho": "/admin/inativar-conta",
            "login": True,
            "admin": True,
            "body": [
                {"nome": "id_conta", "tipo": "int", "obrigatorio": True},
                {"nome": "id_usuario", "tipo": "int", "obrigatorio": True}
            ],
            },
    {"nome": "Reativar conta financeiras como ADMIN",
                "metodo": "PATCH",
                "caminho": "/admin/reativar-conta",
                "login": True,
                "admin": True,
                "body": [
                    {"nome": "id_conta", "tipo": "int", "obrigatorio": True},
                    {"nome": "id_usuario", "tipo": "int", "obrigatorio": True}
                ],
                },
    {"nome": "deletar conta financeiras como ADMIN",
                    "metodo": "DELETE",
                    "caminho": "/admin/deletar-conta/{id_conta}/{id_usuario}",
                    "login": True,
                    "admin": True,
                    "path_params": [
                        {"nome": "id_conta", "tipo": "int", "obrigatorio": True},
                        {"nome": "id_usuario", "tipo": "int", "obrigatorio": True}
                    ],
                    },
    {
        "nome": "Criar recorrência",
        "metodo": "POST",
        "caminho": "/usuario/criar-recorrencia",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "id_conta", "tipo": "int", "obrigatorio": True},
            {"nome": "id_categoria", "tipo": "int", "obrigatorio": True},
            # Valores aceitos: Entrada ou Saida.
            {"nome": "tipo_transacao", "tipo": "str", "obrigatorio": True},
            # Valores aceitos: Parcelado ou Periodico.
            {"nome": "modalidade", "tipo": "str", "obrigatorio": True},
            {"nome": "nome", "tipo": "str", "obrigatorio": True},
            {"nome": "descricao", "tipo": "str", "obrigatorio": False},
            # Valores aceitos: PIX, débito, crédito, boleto ou dinheiro.
            {"nome": "forma_pagamento", "tipo": "str", "obrigatorio": True},
            {"nome": "destino", "tipo": "str", "obrigatorio": False},
            # Valor positivo, com até duas casas decimais.
            {"nome": "valor", "tipo": "float", "obrigatorio": True},
            # Parcelado: Mensal. Periodico: Semanal, Mensal ou Anual.
            {"nome": "frequencia", "tipo": "str", "obrigatorio": True},
            # Obrigatório para Parcelado (inteiro >= 1); opcional para Periodico.
            {"nome": "qtd_parcelas", "tipo": "int", "obrigatorio": False},
            # Formato: YYYY-MM-DD.
            {"nome": "data_inicio", "tipo": "str", "obrigatorio": True},
            {"nome": "ativo", "tipo": "bool", "obrigatorio": True},
        ],
    },
    {
            "nome": "Editar recorrência",
            "metodo": "PATCH",
            "caminho": "/usuario/editar-recorrencia",
            "login": True,
            "admin": False,
            "body": [
                {"nome": "id_recorrencia", "tipo": "int", "obrigatorio": True},
                {"nome": "id_conta", "tipo": "int", "obrigatorio": False},
                {"nome": "id_categoria", "tipo": "int", "obrigatorio": False},
                # Valores aceitos: Entrada ou Saida.
                {"nome": "tipo_transacao", "tipo": "str", "obrigatorio": False},
                # Valores aceitos: Parcelado ou Periodico.
                {"nome": "modalidade", "tipo": "str", "obrigatorio": False},
                {"nome": "nome", "tipo": "str", "obrigatorio": False},
                {"nome": "descricao", "tipo": "str", "obrigatorio": False},
                # Valores aceitos: PIX, débito, crédito, boleto ou dinheiro.
                {"nome": "forma_pagamento", "tipo": "str", "obrigatorio": False},
                {"nome": "destino", "tipo": "str", "obrigatorio": False},
                # Valor positivo, com até duas casas decimais.
                {"nome": "valor", "tipo": "float", "obrigatorio": False},
                # Parcelado: Mensal. Periodico: Semanal, Mensal ou Anual.
                {"nome": "frequencia", "tipo": "str", "obrigatorio": False},
                # Obrigatório para Parcelado (inteiro >= 1); opcional para Periodico.
                {"nome": "qtd_parcelas", "tipo": "int", "obrigatorio": False},
                # Formato: YYYY-MM-DD.
                {"nome": "data_inicio", "tipo": "str", "obrigatorio": False},
                {"nome": "ativo", "tipo": "bool", "obrigatorio": False},
            ],
        },
    {
        "nome": "Criar transação",
        "metodo": "POST",
        "caminho": "/usuario/criar-transacao",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "id_conta_origem", "tipo": "int", "obrigatorio": True},
            # Obrigatório para Transferencia; deve ser diferente da conta de origem.
            {"nome": "id_conta_destino", "tipo": "int", "obrigatorio": False},
            # Obrigatório para Entrada ou Saida; opcional para Transferencia.
            {"nome": "id_categoria", "tipo": "int", "obrigatorio": False},
            {"nome": "id_meta", "tipo": "int", "obrigatorio": False},
            # Valores aceitos: Entrada, Saida ou Transferencia.
            {"nome": "tipo_transacao", "tipo": "str", "obrigatorio": True},
            {"nome": "nome", "tipo": "str", "obrigatorio": True},
            {"nome": "descricao", "tipo": "str", "obrigatorio": False},
            # Valores aceitos: PIX, débito, crédito, boleto ou dinheiro.
            {"nome": "forma_pagamento", "tipo": "str", "obrigatorio": True},
            {"nome": "destino", "tipo": "str", "obrigatorio": False},
            # Valor positivo, com até duas casas decimais.
            {"nome": "valor_transacao", "tipo": "float", "obrigatorio": True},
            # Valores aceitos: Pendente ou Pago.
            {"nome": "status_transacao", "tipo": "str", "obrigatorio": True},
            # Datas no formato YYYY-MM-DD.
            {"nome": "data_transacao", "tipo": "str", "obrigatorio": True},
            {"nome": "data_vencimento", "tipo": "str", "obrigatorio": False},
            # Para status Pendente, pressione ENTER para ignorar.
            {"nome": "data_pagamento", "tipo": "str", "obrigatorio": False},
        ],
    },
    {
        "nome": "Editar transação",
        "metodo": "PATCH",
        "caminho": "/usuario/editar-transacao",
        "login": True,
        "admin": False,
        "body": [
            {"nome": "id_transacao", "tipo": "int", "obrigatorio": True},
            {"nome": "id_conta_origem", "tipo": "int", "obrigatorio": False},
            # Obrigatório ao alterar o tipo para Transferencia; diferente da origem.
            {"nome": "id_conta_destino", "tipo": "int", "obrigatorio": False},
            # Obrigatório ao informar tipo_transacao como Entrada ou Saida.
            {"nome": "id_categoria", "tipo": "int", "obrigatorio": False},
            {"nome": "id_meta", "tipo": "int", "obrigatorio": False},
            # Valores aceitos: Entrada, Saida ou Transferencia.
            {"nome": "tipo_transacao", "tipo": "str", "obrigatorio": False},
            {"nome": "nome", "tipo": "str", "obrigatorio": False},
            {"nome": "descricao", "tipo": "str", "obrigatorio": False},
            # Valores aceitos: PIX, débito, crédito, boleto ou dinheiro.
            {"nome": "forma_pagamento", "tipo": "str", "obrigatorio": False},
            {"nome": "destino", "tipo": "str", "obrigatorio": False},
            # Valor positivo, com até duas casas decimais.
            {"nome": "valor_transacao", "tipo": "float", "obrigatorio": False},
            # Valores aceitos: Pendente ou Pago.
            {"nome": "status_transacao", "tipo": "str", "obrigatorio": False},
            # Datas no formato YYYY-MM-DD.
            {"nome": "data_transacao", "tipo": "str", "obrigatorio": False},
            {"nome": "data_vencimento", "tipo": "str", "obrigatorio": False},
            # Ao informar status Pendente, pressione ENTER para ignorar.
            {"nome": "data_pagamento", "tipo": "str", "obrigatorio": False},
        ],
    },
]


# RF06: filtros enviados como JSON no terminal, por exemplo [1, 2].
# Na URL, requests envia listas como parâmetros repetidos.
ROTAS.extend([
    {
        "nome": "Listar transações",
        "metodo": "GET", "caminho": "/usuario/listar-transacoes",
        "login": True, "admin": False,
        "query": [
            {"nome": "id_contas", "tipo": "json", "obrigatorio": False},
            {"nome": "id_categoria", "tipo": "int", "obrigatorio": False},
            {"nome": "id_transacao", "tipo": "int", "obrigatorio": False},
            {"nome": "id_recorrencia", "tipo": "int", "obrigatorio": False},
            {"nome": "nome", "tipo": "str", "obrigatorio": False},
            {"nome": "status", "tipo": "str", "obrigatorio": False},
            {"nome": "periodo_criacao", "tipo": "json", "obrigatorio": False},
            {"nome": "periodo_vencimento", "tipo": "json", "obrigatorio": False},
        ],
    },
    {
        "nome": "Listar recorrências",
        "metodo": "GET", "caminho": "/usuario/listar-recorrencias",
        "login": True, "admin": False,
        "query": [
            {"nome": "id_contas", "tipo": "json", "obrigatorio": False},
            {"nome": "id_recorrencia", "tipo": "int", "obrigatorio": False},
        ],
    },
    {
        "nome": "Cancelar recorrência (preserva transações pagas)",
        "metodo": "DELETE", "caminho": "/usuario/excluir-recorrencia/{id_recorrencia}",
        "login": True, "admin": False,
        "path_params": [{"nome": "id_recorrencia", "tipo": "int", "obrigatorio": True}],
    },
    {
        "nome": "Excluir transação",
        "metodo": "DELETE", "caminho": "/usuario/excluir-transacao/{id_transacao}",
        "login": True, "admin": False,
        "path_params": [{"nome": "id_transacao", "tipo": "int", "obrigatorio": True}],
    },
])

# As seis operações administrativas têm os mesmos campos, mais o proprietário.
for caminho_rf06 in (
    "listar-recorrencias", "editar-recorrencia", "listar-transacoes",
    "editar-transacao", "excluir-recorrencia", "excluir-transacao",
):
    rota_usuario = next(rota for rota in ROTAS if rota["caminho"].split("/")[2:3] == [caminho_rf06] and not rota["admin"])
    origem = "query" if rota_usuario["metodo"] == "GET" else "path_params" if rota_usuario["metodo"] == "DELETE" else "body"
    caminho_admin = rota_usuario["caminho"].replace("/usuario/", "/admin/", 1)
    campos_admin = [campo.copy() for campo in rota_usuario[origem]]
    campo_usuario = {"nome": "id_usuario", "tipo": "int", "obrigatorio": True}
    if origem == "query":
        campo_usuario["obrigatorio"] = False
    if origem == "path_params":
        caminho_admin += "/{id_usuario}"
        campos_admin.append(campo_usuario)
    else:
        campos_admin.insert(0, campo_usuario)
    ROTAS.append({
        **rota_usuario,
        "nome": rota_usuario["nome"] + " como ADMIN",
        "caminho": caminho_admin,
        "admin": True,
        origem: campos_admin,
    })


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



class TestesRF06(unittest.TestCase):
    """Exercita as rotas Express com banco simulado pela ponte Node local."""

    def banco(self):
        return {
            "usuarios": [{"id_usuario": 1, "status_usuario": "Ativo"}, {"id_usuario": 2, "status_usuario": "Ativo"}],
            "contas_bancarias": [
                {"id_conta": 10, "id_usuario": "1"},
                {"id_conta": 11, "id_usuario": 1},
                {"id_conta": 20, "id_usuario": 2},
            ],
            "categorias": [{"id_categoria": 30, "id_usuario": "1"}, {"id_categoria": 40, "id_usuario": 2}],
            "recorrencias": [
                {"id_recorrencia": 50, "id_usuario": 1, "id_conta": 10, "ativo": True, "modalidade": "Periodico", "frequencia": "Mensal"},
                {"id_recorrencia": 60, "id_usuario": 2, "id_conta": 20, "ativo": True},
            ],
            "transacoes": [
                {"id_transacao": 70, "id_conta_origem": 10, "id_categoria": 30, "id_recorrencia": 50,
                 "nome": "Aluguel", "tipo_transacao": "Saida", "status_transacao": "Pendente", "data_criacao": "2026-10-31T23:59:59", "data_vencimento": "2026-11-05"},
                {"id_transacao": 71, "id_conta_origem": 10, "id_categoria": 30, "id_recorrencia": 50,
                 "nome": "Pago", "tipo_transacao": "Saida", "status_transacao": "Pago", "data_pagamento": "2026-10-10"},
                {"id_transacao": 72, "id_conta_origem": 10, "id_conta_destino": 11,
                 "nome": "Transferência", "tipo_transacao": "Transferencia", "status_transacao": "Pendente"},
                {"id_transacao": 80, "id_conta_origem": 20, "id_conta_destino": 10, "id_categoria": 40, "id_recorrencia": 60,
                 "nome": "Outro", "tipo_transacao": "Transferencia", "status_transacao": "Pendente"},
            ],
        }

    def chamada(self, metodo, caminho, body=None, query=None, admin=False, autenticado=True):
        dados = {"metodo": metodo, "caminho": caminho}
        if autenticado:
            dados["usuario"] = {"id_usuario": 99 if admin else 1, "tipo": "Admin" if admin else "Comum"}
        if body is not None:
            dados["body"] = body
        if query is not None:
            dados["query"] = query
        return dados

    def executar(self, chamadas, falha=None, banco=None):
        raiz = Path(__file__).resolve().parents[1]
        processo = subprocess.run(
            ["node", "tests/helpers/rf06-http.js"], cwd=raiz,
            input=json.dumps({"banco": banco if banco is not None else self.banco(), "chamadas": chamadas, "falha": falha}),
            text=True, capture_output=True, timeout=30,
        )
        self.assertEqual(processo.returncode, 0, processo.stderr + processo.stdout)
        resultado = next(linha for linha in processo.stdout.splitlines() if linha.startswith("RESULTADO_RF06="))
        return json.loads(resultado.split("=", 1)[1])

    def rotas_rf06(self):
        return [r for r in ROTAS if any(r["caminho"].split("/")[2:3] == [sufixo] for sufixo in (
            "criar-recorrencia", "criar-transacao", "listar-recorrencias", "listar-transacoes",
            "editar-recorrencia", "editar-transacao", "excluir-recorrencia", "excluir-transacao"))]

    def dados_transacao(self, **alteracoes):
        return {
            "id_conta_origem": 10, "id_categoria": 30, "tipo_transacao": "Saida",
            "nome": "Compra", "forma_pagamento": "PIX", "valor_transacao": 100.01,
            "status_transacao": "Pendente", "data_transacao": "2026-10-13", **alteracoes,
        }

    def dados_recorrencia(self, **alteracoes):
        return {
            "id_conta": 10, "id_categoria": 30, "tipo_transacao": "Saida",
            "modalidade": "Periodico", "nome": "Assinatura", "forma_pagamento": "PIX",
            "valor": 100.01, "frequencia": "Mensal", "data_inicio": "2026-10-13",
            "ativo": True, **alteracoes,
        }

    def test_criar_avulsas_entrada_saida_pagas_pendentes_e_formas_pagamento(self):
        casos = []
        for tipo in ("Entrada", "Saida"):
            for status in ("Pendente", "Pago"):
                for forma in ("PIX", "débito", "crédito", "boleto", "dinheiro"):
                    casos.append(self.dados_transacao(
                        tipo_transacao=tipo, status_transacao=status, forma_pagamento=forma,
                        descricao="Detalhes", destino="Estabelecimento", data_vencimento="2026-10-20",
                        data_pagamento="2026-10-13" if status == "Pago" else None,
                    ))
        resultado = self.executar([self.chamada("POST", "/usuario/criar-transacao", body) for body in casos])
        self.assertEqual(resultado["respostas"], [
            {"status": 201, "body": {"mensagem": "Transação criada com sucesso"}}
        ] * len(casos))
        inseridas = resultado["banco"]["transacoes"][len(self.banco()["transacoes"]):]
        self.assertEqual(inseridas, [{**body, "id_recorrencia": None, "numero_parcela": None} for body in casos])
        self.assertEqual(resultado["banco"]["recorrencias"], self.banco()["recorrencias"])
        self.assertEqual([e["resultado"] for e in resultado["eventos"]], ["SUCESSO"] * len(casos))

    def test_criar_parceladas_e_periodicas_preserva_valor_e_configuracao(self):
        casos = []
        for tipo in ("Entrada", "Saida"):
            # O contrato atual aceita 1 parcela, embora a proposta da RF descreva mínimo 2.
            for parcelas in (1, 3):
                casos.append(self.dados_recorrencia(tipo_transacao=tipo, modalidade="Parcelado", qtd_parcelas=parcelas))
            for frequencia in ("Semanal", "Mensal", "Anual"):
                for quantidade in ({}, {"qtd_parcelas": None}, {"qtd_parcelas": 4}):
                    casos.append(self.dados_recorrencia(tipo_transacao=tipo, frequencia=frequencia, **quantidade))
        casos.append(self.dados_recorrencia(ativo=False, descricao="Detalhes", destino="Estabelecimento"))
        resultado = self.executar([self.chamada("POST", "/usuario/criar-recorrencia", body) for body in casos])
        self.assertEqual(resultado["respostas"], [
            {"status": 201, "body": {"mensagem": "Transações inseridas com sucesso"}}
        ] * len(casos))
        inseridas = resultado["banco"]["recorrencias"][len(self.banco()["recorrencias"]):]
        self.assertEqual(inseridas, [{**body, "id_usuario": 1} for body in casos])
        # A ponte não simula triggers: o Express insere a regra, sem calcular parcelas ou saldo.
        self.assertEqual(resultado["banco"]["transacoes"], self.banco()["transacoes"])
        self.assertEqual([c["tabela"] for c in resultado["consultas"] if c["operacao"] == "insert"], ["recorrencias"] * len(casos))
        self.assertEqual([e["resultado"] for e in resultado["eventos"]], ["SUCESSO"] * len(casos))

    def test_criacao_joi_retorna_todos_os_campos_obrigatorios(self):
        obrigatorios = {
            "criar-transacao": {"id_conta_origem", "id_categoria", "tipo_transacao", "nome", "forma_pagamento",
                                "valor_transacao", "status_transacao", "data_transacao"},
            "criar-recorrencia": {"id_conta", "id_categoria", "tipo_transacao", "modalidade", "nome", "forma_pagamento",
                                 "valor", "frequencia", "data_inicio", "ativo"},
        }
        resultado = self.executar([self.chamada("POST", "/usuario/" + rota, {}) for rota in obrigatorios])
        for rota, resposta in zip(obrigatorios, resultado["respostas"]):
            with self.subTest(rota=rota):
                self.assertEqual(resposta["status"], 400)
                self.assertEqual(resposta["body"]["mensagem"], "Dados inválidos.")
                self.assertEqual({erro["campo"] for erro in resposta["body"]["erros"]}, obrigatorios[rota])
                self.assertTrue(all(isinstance(erro["mensagem"], str) and erro["mensagem"] for erro in resposta["body"]["erros"]))
        self.assertEqual(resultado["consultas"], [])

    def test_criacao_rejeita_campos_invalidos_e_dados_de_outra_modalidade(self):
        casos = []
        for campo, valor in (
            ("valor_transacao", 0), ("valor_transacao", -1), ("nome", "   "),
            ("id_categoria", None), ("id_conta_origem", -1), ("id_conta_origem", 1.5),
            ("tipo_transacao", "Saída"), ("forma_pagamento", "Cheque"), ("status_transacao", "Atrasada"),
            ("data_transacao", "13/10/2026"), ("data_pagamento", "2026-10-13"),
            ("valor", 10), ("modalidade", "Parcelado"), ("qtd_parcelas", 3), ("frequencia", "Mensal"),
            ("id_conta", 10), ("id_usuario", 2), ("id_subcategoria", 1), ("id_recorrencia", 50), ("numero_parcela", 1),
        ):
            casos.append(("criar-transacao", self.dados_transacao(**{campo: valor}), campo))
        casos.append(("criar-transacao", self.dados_transacao(tipo_transacao="Transferencia"), "id_conta_destino"))
        for campo, valor in (
            ("valor", 0), ("tipo_transacao", "Transferencia"), ("modalidade", "Periódico"),
            ("frequencia", "Diario"), ("qtd_parcelas", 0), ("qtd_parcelas", 1.5),
            ("data_inicio", "13/10/2026"), ("ativo", "invalido"), ("descricao", ""), ("destino", ""),
            ("valor_transacao", 10), ("id_conta_origem", 10), ("id_conta_destino", 11),
            ("status_transacao", "Pago"), ("data_pagamento", "2026-10-13"), ("id_usuario", 2),
        ):
            casos.append(("criar-recorrencia", self.dados_recorrencia(**{campo: valor}), campo))
        for quantidade in ({}, {"qtd_parcelas": None}):
            casos.append(("criar-recorrencia", self.dados_recorrencia(modalidade="Parcelado", **quantidade), "qtd_parcelas"))
        casos.append(("criar-recorrencia", self.dados_recorrencia(modalidade="Parcelado", qtd_parcelas=3, frequencia="Anual"), "frequencia"))
        resultado = self.executar([self.chamada("POST", "/usuario/" + rota, body) for rota, body, _ in casos])
        for (rota, body, campo), resposta in zip(casos, resultado["respostas"]):
            with self.subTest(rota=rota, campo=campo, valor=body.get(campo)):
                self.assertEqual(resposta["status"], 400)
                self.assertEqual(resposta["body"]["mensagem"], "Dados inválidos.")
                self.assertIn(campo, [erro["campo"] for erro in resposta["body"]["erros"]])
        self.assertEqual(resultado["consultas"], [])
        self.assertEqual(resultado["banco"], self.banco())

    def test_criacao_bloqueia_contas_categorias_alheias_ou_inexistentes(self):
        chamadas = []
        for rota, dados, conta in (
            ("criar-transacao", self.dados_transacao, "id_conta_origem"),
            ("criar-recorrencia", self.dados_recorrencia, "id_conta"),
        ):
            for campo, identificador in ((conta, 20), (conta, 999), ("id_categoria", 40), ("id_categoria", 999)):
                chamadas.append(self.chamada("POST", "/usuario/" + rota, dados(**{campo: identificador})))
        resultado = self.executar(chamadas)
        self.assertEqual([r["status"] for r in resultado["respostas"]], [404] * len(chamadas))
        self.assertTrue(all(r["body"]["mensagem"] for r in resultado["respostas"]))
        self.assertTrue(all(c["operacao"] == "select" for c in resultado["consultas"]))
        self.assertEqual(resultado["banco"], self.banco())

    def test_criacao_bloqueia_usuario_inativo_ou_inexistente(self):
        for inexistente in (False, True):
            with self.subTest(inexistente=inexistente):
                banco = self.banco()
                if inexistente:
                    banco["usuarios"] = [usuario for usuario in banco["usuarios"] if usuario["id_usuario"] != 1]
                else:
                    banco["usuarios"][0]["status_usuario"] = "Inativo"
                resultado = self.executar([
                    self.chamada("POST", "/usuario/criar-transacao", self.dados_transacao()),
                    self.chamada("POST", "/usuario/criar-recorrencia", self.dados_recorrencia()),
                ], banco=banco)
                self.assertEqual(resultado["respostas"], [
                    {"status": 404, "body": {"mensagem": "Esse usuario não existe ou não está ativo"}}
                ] * 2)
                self.assertTrue(all(c["operacao"] == "select" for c in resultado["consultas"]))
                self.assertEqual(resultado["banco"], banco)

    def test_criacao_falhas_de_consulta_e_insercao_nao_geram_sucesso(self):
        for rota, body, tabela in (
            ("criar-transacao", self.dados_transacao(), "transacoes"),
            ("criar-recorrencia", self.dados_recorrencia(), "recorrencias"),
        ):
            for alvo, operacao in (("categorias", "select"), ("contas_bancarias", "select"), ("usuarios", "select"), (tabela, "insert")):
                with self.subTest(rota=rota, tabela=alvo, operacao=operacao):
                    resultado = self.executar([self.chamada("POST", "/usuario/" + rota, body)],
                                              falha={"tabela": alvo, "operacao": operacao})
                    self.assertEqual(resultado["respostas"][0]["status"], 500)
                    self.assertTrue(resultado["respostas"][0]["body"]["mensagem"])
                    self.assertEqual(resultado["banco"], self.banco())
                    self.assertEqual(len(resultado["eventos"]), 1)
                    self.assertNotEqual(resultado["eventos"][0]["resultado"], "SUCESSO")
                    if operacao == "select":
                        self.assertTrue(all(c["operacao"] == "select" for c in resultado["consultas"]))

    def test_14_rotas_autenticacao_e_admin(self):
        rotas = self.rotas_rf06()
        self.assertEqual(len(rotas), 14)
        self.assertEqual(len({r["caminho"] for r in rotas}), 14)
        chamadas = [self.chamada(r["metodo"], r["caminho"].format(**{p["nome"]: 1 for p in r.get("path_params", [])}), autenticado=False) for r in rotas]
        chamadas += [self.chamada(r["metodo"], r["caminho"].format(**{p["nome"]: 1 for p in r.get("path_params", [])})) for r in rotas if r["admin"]]
        resultado = self.executar(chamadas)
        self.assertEqual([r["status"] for r in resultado["respostas"]], [401] * 14 + [403] * 6)
        self.assertEqual(resultado["consultas"], [])

    def test_joi_rejeita_dados_invalidos_e_admin_sem_proprietario(self):
        chamadas = []
        for rota in self.rotas_rf06():
            if not rota["admin"]:
                continue
            caminho = rota["caminho"].format(**{p["nome"]: "invalido" for p in rota.get("path_params", [])})
            if rota["metodo"] == "GET":
                chamadas.append(self.chamada("GET", caminho, query={"id_usuario": "invalido"}, admin=True))
            else:
                chamadas.append(self.chamada(rota["metodo"], caminho, admin=True))
        chamadas += [self.chamada("PATCH", "/usuario/editar-transacao", {"id_transacao": 70, "id_usuario": 2}),
                     self.chamada("GET", "/usuario/listar-transacoes", query={"id_usuario": 2}),
                     self.chamada("POST", "/usuario/criar-transacao", {}),
                     self.chamada("DELETE", "/usuario/excluir-transacao/-1")]
        resultado = self.executar(chamadas)
        self.assertTrue(all(r["status"] == 400 for r in resultado["respostas"]))
        self.assertEqual(resultado["consultas"], [])

    def test_delete_exige_ids_na_url_e_ignora_ids_do_body_e_query(self):
        chamadas = []
        esperados = []
        for admin in (False, True):
            prefixo = "/admin" if admin else "/usuario"
            for recurso, proprio, alheio in (("transacao", 70, 80), ("recorrencia", 50, 60)):
                caminho = f"{prefixo}/excluir-{recurso}"
                dados = {"id_" + recurso: proprio, **({"id_usuario": 1} if admin else {})}
                # Sem os parâmetros, body e query não substituem a URL.
                chamadas.append(self.chamada("DELETE", caminho, body=dados, query=dados, admin=admin))
                esperados.append(404)
                if admin:
                    chamadas.append(self.chamada("DELETE", caminho + f"/{proprio}", body=dados, query=dados, admin=True))
                    esperados.append(404)
                # Um ID alheio na URL não pode ser substituído por um ID próprio.
                url = caminho + f"/{alheio}" + ("/1" if admin else "")
                chamadas.append(self.chamada("DELETE", url, body=dados, query=dados, admin=admin))
                esperados.append(404)
                url = caminho + "/invalido" + ("/1" if admin else "")
                chamadas.append(self.chamada("DELETE", url, admin=admin))
                esperados.append(400)
        resultado = self.executar(chamadas)
        self.assertEqual([r["status"] for r in resultado["respostas"]], esperados)
        self.assertTrue(all(c["operacao"] == "select" for c in resultado["consultas"]))

    def test_listagens_combinam_filtros_e_isolam_proprietario(self):
        for admin in (False, True):
            with self.subTest(admin=admin):
                prefixo = "/admin" if admin else "/usuario"
                usuario = {"id_usuario": 1} if admin else {}
                filtros = {**usuario, "id_contas": [10, 20], "id_categoria": 30, "id_transacao": 70,
                           "id_recorrencia": 50, "nome": "alug", "status": "Pendente",
                           "periodo_criacao": ["2026-10-01", "2026-10-31"],
                           "periodo_vencimento": ["2026-11-01", "2026-11-30"]}
                resultado = self.executar([
                    self.chamada("GET", prefixo + "/listar-transacoes", query=filtros, admin=admin),
                    self.chamada("GET", prefixo + "/listar-transacoes", query=usuario, admin=admin),
                    self.chamada("GET", prefixo + "/listar-recorrencias", query={**usuario, "id_contas": [10], "id_recorrencia": 50}, admin=admin),
                    self.chamada("GET", prefixo + "/listar-transacoes", query={**usuario, "id_contas": [20]}, admin=admin),
                ])
                respostas = resultado["respostas"]
                self.assertEqual([r["status"] for r in respostas], [200] * 4)
                self.assertEqual([t["id_transacao"] for t in respostas[0]["body"]], [70])
                self.assertEqual([t["id_transacao"] for t in respostas[1]["body"]], [70, 71, 72])
                self.assertEqual([r["id_recorrencia"] for r in respostas[2]["body"]], [50])
                self.assertEqual(respostas[3]["body"], [])

    def test_admin_listar_todos_sem_usuario_e_identificar_proprietarios(self):
        resultado = self.executar([
            self.chamada("GET", "/admin/listar-transacoes", admin=True),
            self.chamada("GET", "/admin/listar-recorrencias", admin=True),
            self.chamada("GET", "/admin/listar-transacoes", query={"id_contas": [10, 20]}, admin=True),
            self.chamada("GET", "/admin/listar-transacoes", query={"id_categoria": 40, "status": "Pendente"}, admin=True),
            self.chamada("GET", "/admin/listar-recorrencias", query={"id_contas": [20]}, admin=True),
            self.chamada("GET", "/admin/listar-recorrencias", query={"id_recorrencia": 60}, admin=True),
            self.chamada("GET", "/admin/listar-transacoes", query={"id_usuario": 999}, admin=True),
            self.chamada("GET", "/admin/listar-recorrencias", query={"id_usuario": 999}, admin=True),
        ])
        respostas = resultado["respostas"]
        self.assertEqual([r["status"] for r in respostas], [200] * 8)
        self.assertEqual([t["id_transacao"] for t in respostas[0]["body"]], [70, 71, 72, 80])
        self.assertEqual([int(t["id_usuario"]) for t in respostas[0]["body"]], [1, 1, 1, 2])
        self.assertEqual([r["id_recorrencia"] for r in respostas[1]["body"]], [50, 60])
        self.assertEqual([t["id_transacao"] for t in respostas[2]["body"]], [70, 71, 72, 80])
        self.assertEqual([t["id_transacao"] for t in respostas[3]["body"]], [80])
        self.assertEqual([r["id_recorrencia"] for r in respostas[4]["body"]], [60])
        self.assertEqual([r["id_recorrencia"] for r in respostas[5]["body"]], [60])
        self.assertEqual(respostas[6]["body"], [])
        self.assertEqual(respostas[7]["body"], [])
        self.assertFalse(any(f[1] == "id_usuario" for f in resultado["consultas"][0]["filtros"]))
        self.assertEqual(resultado["consultas"][1]["filtros"], [])

    def test_admin_usuario_opcional_nao_ignora_id_invalido_ou_zero(self):
        banco = self.banco()
        banco["contas_bancarias"].append({"id_conta": 0, "id_usuario": 0})
        banco["transacoes"].append({"id_transacao": 0, "id_conta_origem": 0})
        banco["recorrencias"].append({"id_recorrencia": 0, "id_usuario": 0, "id_conta": 0})
        chamadas = []
        for rota in ("/admin/listar-transacoes", "/admin/listar-recorrencias"):
            chamadas.append(self.chamada("GET", rota, query={"id_usuario": 0}, admin=True))
            for valor in ("invalido", "", -1, 1.5):
                chamadas.append(self.chamada("GET", rota, query={"id_usuario": valor}, admin=True))
        respostas = self.executar(chamadas, banco=banco)["respostas"]
        self.assertEqual([r["status"] for r in respostas], [200, 400, 400, 400, 400] * 2)
        self.assertEqual(respostas[0]["body"], [{"id_transacao": 0, "id_conta_origem": 0, "id_usuario": 0}])
        self.assertEqual(respostas[5]["body"], [{"id_recorrencia": 0, "id_usuario": 0, "id_conta": 0}])

    def test_admin_listagem_global_nao_depende_de_associacao_e_mantem_autorizacao(self):
        banco = self.banco()
        banco["contas_bancarias"] = []
        resultado = self.executar([
            self.chamada("GET", "/admin/listar-transacoes", admin=True),
            self.chamada("GET", "/admin/listar-transacoes", query={"id_contas": [10]}, admin=True),
            self.chamada("GET", "/admin/listar-transacoes"),
            self.chamada("GET", "/admin/listar-recorrencias"),
            self.chamada("GET", "/admin/listar-transacoes", autenticado=False),
            self.chamada("GET", "/admin/listar-recorrencias", autenticado=False),
            self.chamada("PATCH", "/admin/editar-transacao", {"id_transacao": 70, "nome": "Alterar"}, admin=True),
            self.chamada("PATCH", "/admin/editar-recorrencia", {"id_recorrencia": 50, "nome": "Alterar"}, admin=True),
        ], banco=banco)
        respostas = resultado["respostas"]
        self.assertEqual([r["status"] for r in respostas], [200, 200, 403, 403, 401, 401, 400, 400])
        self.assertEqual([t["id_transacao"] for t in respostas[0]["body"]], [70, 71, 72, 80])
        self.assertTrue(all(t["id_usuario"] is None for t in respostas[0]["body"]))
        self.assertEqual(respostas[1]["body"], [])
        self.assertTrue(all(c["operacao"] == "select" for c in resultado["consultas"]))

    def test_editar_excluir_registros_alheios_nao_escreve(self):
        chamadas = []
        for admin in (False, True):
            prefixo = "/admin" if admin else "/usuario"
            usuario = {"id_usuario": 1} if admin else {}
            for metodo, acao in (("PATCH", "editar"), ("DELETE", "excluir")):
                for recurso, identificador in (("transacao", 80), ("recorrencia", 60)):
                    caminho = f"{prefixo}/{acao}-{recurso}"
                    if metodo == "DELETE":
                        caminho += f"/{identificador}" + ("/1" if admin else "")
                        chamadas.append(self.chamada(metodo, caminho, admin=admin))
                    else:
                        chamadas.append(self.chamada(metodo, caminho, {**usuario, "id_" + recurso: identificador}, admin=admin))
        resultado = self.executar(chamadas)
        self.assertEqual([r["status"] for r in resultado["respostas"]], [404] * 8)
        self.assertTrue(all(c["operacao"] == "select" for c in resultado["consultas"]))

    def test_criar_transacao_avulsa_e_recorrencia_sem_duplicar_trigger(self):
        transacao = {"id_conta_origem": 10, "id_conta_destino": 11, "tipo_transacao": "Transferencia", "nome": "Nova",
                     "forma_pagamento": "PIX", "valor_transacao": 12.50, "status_transacao": "Pendente", "data_transacao": "2026-10-12"}
        recorrencia = {"id_conta": 10, "id_categoria": 30, "tipo_transacao": "Saida", "modalidade": "Periodico", "nome": "Mensal",
                      "forma_pagamento": "PIX", "valor": 10, "frequencia": "Mensal", "data_inicio": "2026-10-12", "ativo": True}
        resultado = self.executar([self.chamada("POST", "/usuario/criar-transacao", transacao),
                                  self.chamada("POST", "/usuario/criar-recorrencia", recorrencia)])
        self.assertEqual([r["status"] for r in resultado["respostas"]], [201, 201])
        self.assertEqual([e["resultado"] for e in resultado["eventos"]], ["SUCESSO", "SUCESSO"])
        inserida = resultado["banco"]["transacoes"][-1]
        self.assertIsNone(inserida["id_recorrencia"])
        self.assertIsNone(inserida["numero_parcela"])
        self.assertEqual(resultado["banco"]["recorrencias"][-1]["id_usuario"], 1)
        self.assertEqual([c["tabela"] for c in resultado["consultas"] if c["operacao"] != "select"], ["transacoes", "recorrencias"])
        for campo, valor, esperado in (("id_conta_destino", 20, 404), ("id_categoria", 40, 404), ("id_conta_destino", 10, 400), ("id_meta", 1, 400)):
            with self.subTest(campo=campo, valor=valor):
                resultado = self.executar([self.chamada("POST", "/usuario/criar-transacao", {**transacao, campo: valor})])
                self.assertEqual(resultado["respostas"][0]["status"], esperado)
                self.assertTrue(all(c["operacao"] == "select" for c in resultado["consultas"]))

    def test_edicao_parcial_valida_transferencia_e_categoria(self):
        for admin in (False, True):
            prefixo = "/admin" if admin else "/usuario"
            usuario = {"id_usuario": 1} if admin else {}
            chamadas = [self.chamada("PATCH", prefixo + "/editar-transacao", {**usuario, **body}, admin=admin) for body in (
                {"id_transacao": 72, "id_conta_origem": 11},
                {"id_transacao": 72, "id_conta_destino": None},
                {"id_transacao": 72, "id_conta_destino": 20},
                {"id_transacao": 70, "id_categoria": 40},
                {"id_transacao": 70, "id_categoria": None},
                {"id_transacao": 71, "status_transacao": "Pendente"},
                {"id_transacao": 70, "nome": "Editada"},
            )]
            chamadas.append(self.chamada("PATCH", prefixo + "/editar-recorrencia", {**usuario, "id_recorrencia": 50, "nome": "Editada"}, admin=admin))
            resultado = self.executar(chamadas)
            self.assertEqual([r["status"] for r in resultado["respostas"]], [400, 400, 404, 404, 400, 200, 200, 200])
            self.assertIsNone(resultado["banco"]["transacoes"][1]["data_pagamento"])
            escritas = [c for c in resultado["consultas"] if c["operacao"] != "select"]
            self.assertEqual([c["tabela"] for c in escritas], ["transacoes", "transacoes", "recorrencias"])
            self.assertEqual(escritas[1]["valores"], {"nome": "Editada"})
            self.assertIn(["eq", "id_usuario", 1], escritas[2]["filtros"])

    def test_cancelamento_preserva_pagas_e_pode_ser_repetido(self):
        for admin in (False, True):
            prefixo = "/admin" if admin else "/usuario"
            caminho = prefixo + "/excluir-recorrencia/50" + ("/1" if admin else "")
            resultado = self.executar([self.chamada("DELETE", caminho, admin=admin)] * 2)
            self.assertEqual([r["status"] for r in resultado["respostas"]], [200, 200])
            self.assertTrue(all(e["resultado"] == "SUCESSO" for e in resultado["eventos"]))
            self.assertFalse(resultado["banco"]["recorrencias"][0]["ativo"])
            self.assertEqual([t["id_transacao"] for t in resultado["banco"]["transacoes"]], [71, 72, 80])
            for consulta in resultado["consultas"]:
                if consulta["operacao"] == "delete":
                    self.assertEqual(consulta["tabela"], "transacoes")
                    self.assertIn(["eq", "status_transacao", "Pendente"], consulta["filtros"])

    def test_excluir_transacao_paga_sem_alterar_outras(self):
        for admin in (False, True):
            prefixo = "/admin" if admin else "/usuario"
            caminho = prefixo + "/excluir-transacao/71" + ("/1" if admin else "")
            resultado = self.executar([self.chamada("DELETE", caminho, admin=admin)])
            self.assertEqual(resultado["respostas"][0]["status"], 200)
            self.assertEqual([t["id_transacao"] for t in resultado["banco"]["transacoes"]], [70, 72, 80])
            self.assertEqual([c["operacao"] for c in resultado["consultas"]], ["select", "select", "delete"])

    def test_erros_do_banco_e_cancelamento_parcial(self):
        casos = [
            ("GET", "listar-transacoes", None, "contas_bancarias", "select"),
            ("GET", "listar-transacoes", None, "transacoes", "select"),
            ("GET", "listar-recorrencias", None, "recorrencias", "select"),
            ("PATCH", "editar-transacao", {"id_transacao": 70, "nome": "Falha"}, "transacoes", "update"),
            ("PATCH", "editar-recorrencia", {"id_recorrencia": 50, "nome": "Falha"}, "recorrencias", "update"),
            ("DELETE", "excluir-transacao/70", None, "transacoes", "delete"),
            ("DELETE", "excluir-recorrencia/50", None, "recorrencias", "update"),
            ("DELETE", "excluir-recorrencia/50", None, "transacoes", "delete"),
        ]
        for metodo, acao, body, tabela, operacao in casos:
            with self.subTest(acao=acao, tabela=tabela):
                resultado = self.executar([self.chamada(metodo, "/usuario/" + acao, body)], falha={"tabela": tabela, "operacao": operacao})
                self.assertEqual(resultado["respostas"][0]["status"], 500)
                self.assertTrue(resultado["respostas"][0]["body"]["mensagem"])
                self.assertTrue(all(e["resultado"] != "SUCESSO" for e in resultado["eventos"]))
                if acao == "excluir-recorrencia/50" and tabela == "transacoes":
                    self.assertFalse(resultado["banco"]["recorrencias"][0]["ativo"])
                    self.assertEqual(len(resultado["banco"]["transacoes"]), 4)
                    self.assertIn("Tente cancelar novamente", resultado["respostas"][0]["body"]["mensagem"])


if __name__ == "__main__":
    if "--testes-rf06" in sys.argv:
        unittest.main(argv=[sys.argv[0]], verbosity=2)
    else:
        main()
