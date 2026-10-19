import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar } from '../middlewares/Autenticacao.js';
import { limitadorGenericoSimples, limitadorEdicaoComum } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaNome } from '../validacoes/usuario.js';
import { consultarUsuario, desativarUsuario, atualizarDados } from '../controllers/usuarioController.js';

const router = Router();

router.get('/', auditar('CONSULTAR_USUARIO', req => req.usuario?.id_usuario, false), limitadorGenericoSimples, autenticar, consultarUsuario);

router.patch('/desativar-usuario', auditar('DESATIVAR_USUARIO', req => req.usuario?.id_usuario, true), limitadorEdicaoComum, autenticar, desativarUsuario);

router.patch('/atualizar-dados', auditar('ATUALIZAR_USUARIO', req => req.usuario?.id_usuario, true), limitadorEdicaoComum, autenticar, validar(schemaNome), atualizarDados);

export default router;
