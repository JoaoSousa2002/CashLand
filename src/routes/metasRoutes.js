import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar } from '../middlewares/Autenticacao.js';
import { limitadorGenericoSimples, limitadorGenericoCritico } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaCriarMeta, schemaEditarMeta, schemaExcluirMeta, schemaListarMetas } from '../validacoes/usuario.js';
import { criarMeta, deletarMeta, editarMeta, listarMetas } from '../controllers/metasController.js';

const router = Router();

router.post('/criar-meta', auditar('USER_CRIAR_META', req => req.usuario?.id_usuario, true), limitadorGenericoSimples, autenticar, validar(schemaCriarMeta), criarMeta);

router.get('/listar-metas', auditar('USER_LISTAR_METAS', req => req.usuario?.id_usuario), limitadorGenericoSimples, autenticar, validar(schemaListarMetas), listarMetas);

router.patch('/editar-meta', auditar('USER_EDITAR_META', req => req.usuario?.id_usuario, true), limitadorGenericoSimples, autenticar, validar(schemaEditarMeta), editarMeta);

router.delete('/deletar-meta/:id_meta', auditar('USER_DELETAR_META', req => req.usuario?.id_usuario, true), limitadorGenericoCritico, autenticar, validar(schemaExcluirMeta), deletarMeta);


export default router;
