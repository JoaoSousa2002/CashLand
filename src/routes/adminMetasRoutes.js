import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar, somenteAdmin } from '../middlewares/Autenticacao.js';
import { limitadorGenericoSimples, limitadorGenericoCritico } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaADMIN_editarMeta, schemaADMIN_excluirMeta, schemaADMIN_listarMetas } from '../validacoes/usuario.js';
import { deletarMeta, editarMeta, listarMetas } from '../controllers/adminMetasController.js';

const router = Router();

router.get('/listar-metas', auditar('ADMIN_LISTAR_METAS', req => req.usuario?.id_usuario), limitadorGenericoSimples, autenticar, somenteAdmin, validar(schemaADMIN_listarMetas), listarMetas);

router.patch('/editar-meta', auditar('ADMIN_EDITAR_META', req => req.usuario?.id_usuario, true), limitadorGenericoSimples, autenticar, somenteAdmin, validar(schemaADMIN_editarMeta), editarMeta);

router.delete('/deletar-meta/:id_meta/:id_usuario', auditar('ADMIN_DELETAR_META', req => req.usuario?.id_usuario, true), limitadorGenericoCritico, autenticar, somenteAdmin, validar(schemaADMIN_excluirMeta), deletarMeta);


export default router;
