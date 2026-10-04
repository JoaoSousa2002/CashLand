import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar, somenteAdmin } from '../middlewares/Autenticacao.js';
import { limitadorGenericoSimples, limitadorGenericoCritico } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaIdUsuarioObrigatorio, schemaIdUsuarioOpcional, schemaIdCategoriaObrigatorio, schemaIdCategoriaOpcional, schemaNome, schemaDescricaoCategoria } from '../validacoes/usuario.js';
import { listarCategorias, editarCategoria, deletarCategoria } from '../controllers/adminCategoriaController.js';

const router = Router();

router.get('/listar-categoria', auditar('ADMIN_LISTAR_CATEGORIA', req => req.usuario?.id_usuario, false), limitadorGenericoSimples, autenticar, somenteAdmin, validar(schemaIdUsuarioOpcional, schemaIdCategoriaOpcional), listarCategorias);

router.patch('/editar-categoria', auditar('ADMIN_EDITAR_CATEGORIA', req => req.usuario?.id_usuario, false), limitadorGenericoSimples, autenticar, somenteAdmin, validar(schemaIdCategoriaObrigatorio, schemaNome, schemaDescricaoCategoria), editarCategoria);

router.delete('/deletar-categoria/:id_categoria/:id_usuario', auditar('ADMIN_DELETAR_CATEGORIA', req => req.usuario?.id_usuario, true), limitadorGenericoCritico, autenticar, somenteAdmin, validar(schemaIdCategoriaObrigatorio, schemaIdUsuarioObrigatorio), deletarCategoria);

export default router;
