import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar } from '../middlewares/Autenticacao.js';
import { limitadorLogin, limitadorSenha, limitadorSolicitarCodigo, limitadorVerificarCodigo, limitadorGenericoSimples, limitadorGenericoCritico } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaIdUsuarioOpcional, schemaNome, schemaEmail, schemaSenha, schemaNovaSenha, schemaCodigo } from '../validacoes/usuario.js';
import { consultarSessao, login, confirmarSenha, logout, solicitarCodigo, confirmarCadastro, solicitarResetSenha, confirmarResetSenha } from '../controllers/authController.js';

const router = Router();

router.get('/me', auditar('CONSULTAR_SESSAO', req => req.query.id_usuario ?? req.usuario?.id_usuario, false), limitadorGenericoSimples, autenticar, validar(schemaIdUsuarioOpcional), consultarSessao);

router.post('/login', auditar('LOGIN', undefined, true), limitadorLogin, validar(schemaEmail, schemaSenha), login);

router.post('/confirmar-senha', auditar('CONFIRMAR_SENHA', req => req.usuario?.id_usuario, false), limitadorSenha, autenticar, validar(schemaSenha), confirmarSenha);

router.post('/logout', auditar('LOGOUT', undefined, false), limitadorGenericoCritico, logout);

router.post('/solicitar-codigo', auditar('SOLICITAR_CODIGO_CADASTRO', undefined, false), limitadorSolicitarCodigo, validar(schemaNome, schemaEmail, schemaSenha), solicitarCodigo);

router.post('/confirmar-cadastro', auditar('CADASTRAR_USUARIO', undefined, true), limitadorVerificarCodigo, validar(schemaNome, schemaEmail, schemaCodigo, schemaSenha), confirmarCadastro);

router.post('/solicitar-reset-senha', auditar('SOLICITAR_RECUPERACAO_SENHA', undefined, false), limitadorSolicitarCodigo, validar(schemaEmail), solicitarResetSenha);

router.post('/confirmar-reset-senha', auditar('REDEFINIR_SENHA', undefined, true), limitadorGenericoCritico, validar(schemaEmail, schemaCodigo, schemaNovaSenha), confirmarResetSenha);

export default router;
