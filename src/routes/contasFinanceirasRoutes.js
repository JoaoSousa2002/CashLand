import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar } from '../middlewares/Autenticacao.js';
import { limitadorCriacao, limitadorListagemComum, limitadorEdicaoComum } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaCriarConta, schemaIdContaObrigatorio } from '../validacoes/usuario.js';
import { criarContaFinanceira, listarContasFinanceiras, editarConta, inativarConta, reativarConta } from '../controllers/contasFinanceirasController.js';

const router = Router();

router.post('/criar-conta', auditar('CRIAR_CONTA_FINANCEIRA', req => req.usuario?.id_usuario, false), limitadorCriacao, autenticar, validar(schemaCriarConta ), criarContaFinanceira);

router.get('/listar-contas', auditar('USER_LISTAR_CONTAS', req => req.usuario?.id_usuario, false), limitadorListagemComum, autenticar, listarContasFinanceiras);

router.patch('/editar-conta', auditar('USER_EDITAR_CONTA', req => req.usuario?.id_usuario, true), limitadorEdicaoComum, autenticar, validar(schemaCriarConta, schemaIdContaObrigatorio), editarConta);

router.patch('/inativar-conta', auditar('USER_INATIVAR_CONTA', req => req.usuario?.id_usuario, true), limitadorEdicaoComum, autenticar, validar(schemaIdContaObrigatorio), inativarConta);

router.patch('/reativar-conta', auditar('USER_REATIVAR_CONTA', req => req.usuario?.id_usuario, true), limitadorEdicaoComum, autenticar, validar(schemaIdContaObrigatorio), reativarConta);

export default router;
