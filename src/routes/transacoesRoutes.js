import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar } from '../middlewares/Autenticacao.js';
import { limitadorCriacao, limitadorEdicaoComum, limitadorListagemComum, limitadorGenericoSimples, limitadorExclusaoComum } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaCriarRecorrencia, schemaCriarTransacao, schemaEditarRecorrencia, schemaEditarTransacao, schemaListarTransacoes, schemaListarRecorrencias, schemaExcluirTransacao, schemaExcluirRecorrencia, schemaIdContaObrigatorio } from '../validacoes/usuario.js';
import { criarRecorrencia, criarTransacao, editarRecorrencia, editarTransacao, listarTransacoes, listarRecorrencias, excluirTransacao, excluirRecorrencia, verificarSaldoAtual } from '../controllers/transacoesController.js'

const router = Router();

router.post('/criar-recorrencia', auditar('USER_CRIAR_RECORRENCIA', req => req.usuario?.id_usuario, true), limitadorCriacao, autenticar, validar(schemaCriarRecorrencia), criarRecorrencia);

router.patch('/editar-recorrencia', auditar('USER_EDITAR_RECORRENCIA', req => req.usuario?.id_usuario, true), limitadorEdicaoComum, autenticar, validar(schemaEditarRecorrencia), editarRecorrencia);

router.post('/criar-transacao', auditar('USER_CRIAR_TRANSACAO', req => req.usuario?.id_usuario, true), limitadorCriacao, autenticar, validar(schemaCriarTransacao), criarTransacao);

router.patch('/editar-transacao', auditar('USER_EDITAR_TRANSACAO', req => req.usuario?.id_usuario, true), limitadorEdicaoComum, autenticar, validar(schemaEditarTransacao), editarTransacao);

router.get('/listar-transacoes', auditar('USER_LISTAR_TRANSACOES', req => req.usuario?.id_usuario, false), limitadorListagemComum, autenticar, validar(schemaListarTransacoes), listarTransacoes);

router.get('/listar-recorrencias', auditar('USER_LISTAR_RECORRENCIAS', req => req.usuario?.id_usuario, false), limitadorListagemComum, autenticar, validar(schemaListarRecorrencias), listarRecorrencias);

router.get('/verificar-saldo', auditar('USER_VERIFICAR_SALDO', req => req.usuario?.id_usuario, false), limitadorGenericoSimples, autenticar, validar(schemaIdContaObrigatorio), verificarSaldoAtual);

router.delete('/excluir-transacao/:id_transacao', auditar('USER_EXCLUIR_TRANSACAO', req => req.usuario?.id_usuario, true), limitadorExclusaoComum, autenticar, validar(schemaExcluirTransacao), excluirTransacao);

router.delete('/excluir-recorrencia/:id_recorrencia', auditar('USER_EXCLUIR_RECORRENCIA', req => req.usuario?.id_usuario, true), limitadorExclusaoComum, autenticar, validar(schemaExcluirRecorrencia), excluirRecorrencia);

export default router;
