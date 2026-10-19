import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar, somenteAdmin } from '../middlewares/Autenticacao.js';
import { limitadorListagemAdmin, limitadorGenericoSimples, limitadorEdicaoAdmin, limitadorExclusaoAdmin } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaIdUsuarioObrigatorio, schemaIdUsuarioOpcional, schemaNome, schemaEmail } from '../validacoes/usuario.js';
import { listarUsuarios, consultarUsuario, editarUsuario, resetarSenha, reativarUsuario, desativarUsuario, deletarUsuario } from '../controllers/adminUsuarioController.js';

const router = Router();

router.get('/listar-usuarios', auditar('LISTAR_USUARIOS', undefined, false), limitadorListagemAdmin, autenticar, somenteAdmin, listarUsuarios);

router.get('/usuario', auditar('CONSULTAR_USUARIO', req => req.query.id_usuario ?? req.usuario?.id_usuario, false), limitadorGenericoSimples, autenticar, somenteAdmin, validar(schemaIdUsuarioOpcional), consultarUsuario);

router.patch('/editar-usuario', auditar('ATUALIZAR_USUARIO', req => req.body?.id_usuario, false), limitadorEdicaoAdmin, autenticar, somenteAdmin, validar(schemaIdUsuarioObrigatorio, schemaNome, schemaEmail), editarUsuario);

router.patch('/resetar-senha', auditar('SOLICITAR_RESET_ADMIN', req => req.body?.id_usuario, true), limitadorEdicaoAdmin, autenticar, somenteAdmin, validar(schemaIdUsuarioObrigatorio), resetarSenha);

router.patch('/reativar-usuario', auditar('REATIVAR_USUARIO', req => req.body?.id_usuario, true), limitadorEdicaoAdmin, autenticar, somenteAdmin, validar(schemaIdUsuarioObrigatorio), reativarUsuario);

router.patch('/desativar-usuario', auditar('DESATIVAR_USUARIO', req => req.body?.id_usuario, true), limitadorEdicaoAdmin, autenticar, somenteAdmin, validar(schemaIdUsuarioObrigatorio), desativarUsuario);

router.delete('/deletar-usuario/:id_usuario', auditar('EXCLUIR_USUARIO', req => req.params.id_usuario, true), limitadorExclusaoAdmin, autenticar, somenteAdmin, validar(schemaIdUsuarioObrigatorio), deletarUsuario);

export default router;
