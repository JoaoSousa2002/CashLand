import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar } from '../middlewares/Autenticacao.js';
import { limitadorCriacao, limitadorListagemComum, limitadorEdicaoComum, limitadorExclusaoComum } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaCriarOrcamento, schemaEditarOrcamento, schemaDeletarOrcamento, schemaListarOrcamentos } from '../validacoes/usuario.js';
import { criarOrcamento, deletarOrcamento, editarOrcamento, listarOrcamentos } from '../controllers/orcamentosController.js';

const router = Router();

router.post('/criar-orcamento', auditar('USER_CRIAR_ORCAMENTO', req => req.usuario?.id_usuario, true), limitadorCriacao, autenticar, validar(schemaCriarOrcamento), criarOrcamento);

router.get('/listar-orcamentos', auditar('USER_LISTAR_ORCAMENTOS', req => req.usuario?.id_usuario), limitadorListagemComum, autenticar, validar(schemaListarOrcamentos), listarOrcamentos);

router.patch('/editar-orcamento', auditar('USER_EDITAR_ORCAMENTO', req => req.usuario?.id_usuario, true), limitadorEdicaoComum, autenticar, validar(schemaEditarOrcamento), editarOrcamento);

router.delete('/deletar-orcamento/:id_orcamento', auditar('USER_DELETAR_ORCAMENTO', req => req.usuario?.id_usuario, true), limitadorExclusaoComum, autenticar, validar(schemaDeletarOrcamento), deletarOrcamento);


export default router;
