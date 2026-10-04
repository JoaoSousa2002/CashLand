import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar } from '../middlewares/Autenticacao.js';
import { limitadorGenericoSimples, limitadorGenericoCritico } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaIdCategoriaObrigatorio, schemaNome, schemaDescricaoCategoria } from '../validacoes/usuario.js';
import { criarCategoria, listarCategorias, editarCategoria, deletarCategoria } from '../controllers/categoriaController.js';

const router = Router();

router.post('/criar-categoria', auditar('CRIAR_CATEGORIA', req => req.usuario?.id_usuario, false), limitadorGenericoSimples, autenticar, validar(schemaNome, schemaDescricaoCategoria), criarCategoria);

router.get('/listar-categoria', auditar('USER_LISTAR_CATEGORIA', req => req.usuario?.id_usuario, false), limitadorGenericoSimples, autenticar, listarCategorias);

router.patch('/editar-categoria', auditar('USER_EDITAR_CATEGORIA', req => req.usuario?.id_usuario, true), limitadorGenericoSimples, autenticar, validar(schemaIdCategoriaObrigatorio, schemaNome, schemaDescricaoCategoria), editarCategoria);

router.delete('/deletar-categoria/:id_categoria', auditar('USER_DELETAR_CATEGORIA', req => req.usuario?.id_usuario, true), limitadorGenericoCritico, autenticar, validar(schemaIdCategoriaObrigatorio), deletarCategoria);

export default router;
