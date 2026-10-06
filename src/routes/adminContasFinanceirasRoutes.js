import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar, somenteAdmin } from '../middlewares/Autenticacao.js';
import { limitadorGenericoSimples, limitadorGenericoCritico } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaCriarConta, schemaIdContaObrigatorio, schemaIdUsuarioObrigatorio, schemaIdUsuarioOpcional, schemaPesquisa } from '../validacoes/usuario.js';
import { deletarConta, inativarConta, listarContasFinanceiras, reativarConta } from '../controllers/adminContasFinanceirasController.js';
import { editarConta } from '../controllers/adminContasFinanceirasController.js';

const router = Router();


router.get('/listar-contas', auditar('ADMIN_LISTAR_CONTAS', req => req.usuario?.id_usuario, false), limitadorGenericoSimples, autenticar,somenteAdmin, validar(schemaPesquisa,schemaIdUsuarioOpcional), listarContasFinanceiras);

router.patch('/editar-conta', auditar('ADMIN_EDITAR_CONTA', req => req.usuario?.id_usuario, true), limitadorGenericoCritico, autenticar, somenteAdmin, validar(schemaCriarConta,schemaIdContaObrigatorio, schemaIdUsuarioObrigatorio),editarConta );

router.patch('/inativar-conta', auditar('ADMIN_INATIVAR_CONTA', req => req.usuario?.id_usuario, true), limitadorGenericoCritico, autenticar, somenteAdmin, validar(schemaIdContaObrigatorio, schemaIdUsuarioObrigatorio), inativarConta);

router.patch('/reativar-conta', auditar('ADMIN_REATIVAR_CONTA', req => req.usuario?.id_usuario, true), limitadorGenericoCritico, autenticar, somenteAdmin, validar(schemaIdContaObrigatorio, schemaIdUsuarioObrigatorio), reativarConta);

router.delete('/deletar-conta/:id_conta/:id_usuario', auditar('ADMIN_DELETAR_CONTA', req => req.usuario?.id_usuario, true), limitadorGenericoCritico, autenticar, somenteAdmin, validar(schemaIdContaObrigatorio, schemaIdUsuarioObrigatorio), deletarConta);

export default router;
