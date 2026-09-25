import contextlib
import importlib.util
import io
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location(
    'testador', Path(__file__).resolve().parents[1] / 'src/testar_rotas_cashland.py'
)
testador = importlib.util.module_from_spec(spec)
spec.loader.exec_module(testador)


class TestCamposDasRotas(unittest.TestCase):
    def test_requisicoes_enviam_identificadores_corretos(self):
        campos = {
            '/me': ('query', 'id_usuario', False),
            '/admin/usuario': ('query', 'id_usuario', False),
            '/admin/listar-categoria': ('query', 'id_usuario', False),
            '/admin/editar-usuario': ('body', 'id_usuario', True),
            '/admin/resetar-senha': ('body', 'id_usuario', True),
            '/admin/reativar-usuario': ('body', 'id_usuario', True),
            '/admin/desativar-usuario': ('body', 'id_usuario', True),
            '/admin/deletar-usuario': ('query', 'id_usuario', True),
            '/usuario/editar-categoria': ('body', 'id_categoria', True),
            '/usuario/deletar-categoria': ('body', 'id_categoria', True),
            '/admin/editar-categoria': ('body', 'id_categoria', True),
        }
        for caminho, (origem, campo, obrigatorio) in campos.items():
            with self.subTest(caminho=caminho):
                rota = next(r for r in testador.ROTAS if r['caminho'] == caminho)
                definicao = next(c for c in rota[origem] if c['nome'] == campo)
                self.assertEqual(definicao['obrigatorio'], obrigatorio)
                inputs = ['42' if c['tipo'] == 'int' else 'Teste'
                          for origem_campos in ['query', 'body']
                          for c in rota.get(origem_campos, [])]
                session = Mock()
                session.request.return_value.json.return_value = {'mensagem': 'OK'}
                with patch('builtins.input', side_effect=inputs), contextlib.redirect_stdout(io.StringIO()):
                    testador.executar_rota(session, 'http://localhost:3000', rota, True)
                kwargs = session.request.call_args.kwargs
                payload = kwargs['params' if origem == 'query' else 'json']
                self.assertEqual(payload[campo], 42)
                self.assertNotIn('id', payload)
                self.assertEqual(kwargs['method'], rota['metodo'])

    def test_id_opcional_omitido_e_zero_preservado(self):
        for rota in testador.ROTAS:
            campos = [c for c in rota.get('query', []) if c['nome'] == 'id_usuario' and not c['obrigatorio']]
            if campos:
                with self.subTest(caminho=rota['caminho']):
                    with patch('builtins.input', return_value=''):
                        self.assertEqual(testador.pedir_campos(campos), {})
                    with patch('builtins.input', return_value='0'):
                        self.assertEqual(testador.pedir_campos(campos), {'id_usuario': 0})


if __name__ == '__main__':
    unittest.main()
