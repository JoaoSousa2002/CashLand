import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar, somenteAdmin } from '../middlewares/Autenticacao.js';
import { limitadorEdicaoAdmin, limitadorListagemAdmin, limitadorExclusaoAdmin } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaADMIN_editarRecorrencia, schemaADMIN_editarTransacao, schemaADMIN_listarRecorrencias, schemaADMIN_listarTransacoes, schemaADMIN_excluirRecorrencia, schemaADMIN_excluirTransacao } from '../validacoes/usuario.js';
import { editarRecorrencia, editarTransacao, listarRecorrencias, listarTransacoes, excluirRecorrencia, excluirTransacao } from '../controllers/adminTransacoesController.js';

const router = Router();

router.patch('/editar-recorrencia', auditar('ADMIN_EDITAR_RECORRENCIA', req => req.usuario?.id_usuario, true), limitadorEdicaoAdmin, autenticar, somenteAdmin, validar(schemaADMIN_editarRecorrencia), editarRecorrencia);

router.patch('/editar-transacao', auditar('ADMIN_EDITAR_TRANSACAO', req => req.usuario?.id_usuario, true), limitadorEdicaoAdmin, autenticar, somenteAdmin, validar(schemaADMIN_editarTransacao), editarTransacao);

router.get('/listar-recorrencias', auditar('ADMIN_LISTAR_RECORRENCIAS', req => req.usuario?.id_usuario, false), limitadorListagemAdmin, autenticar, somenteAdmin, validar(schemaADMIN_listarRecorrencias), listarRecorrencias);

router.get('/listar-transacoes', auditar('ADMIN_LISTAR_TRANSACOES', req => req.usuario?.id_usuario, false), limitadorListagemAdmin, autenticar, somenteAdmin, validar(schemaADMIN_listarTransacoes), listarTransacoes);

router.delete('/excluir-recorrencia/:id_recorrencia/:id_usuario', auditar('ADMIN_EXCLUIR_RECORRENCIA', req => req.usuario?.id_usuario, true), limitadorExclusaoAdmin, autenticar, somenteAdmin, validar(schemaADMIN_excluirRecorrencia), excluirRecorrencia);

router.delete('/excluir-transacao/:id_transacao/:id_usuario', auditar('ADMIN_EXCLUIR_TRANSACAO', req => req.usuario?.id_usuario, true), limitadorExclusaoAdmin, autenticar, somenteAdmin, validar(schemaADMIN_excluirTransacao), excluirTransacao);

export default router;
