import { Router } from 'express';
import { auditar } from '../middlewares/AuditoriaRota.js';
import { autenticar, somenteAdmin } from '../middlewares/Autenticacao.js';
import { limitadorListagemAdmin, limitadorEdicaoAdmin, limitadorExclusaoAdmin } from '../middlewares/RateLimit.js';
import { validar } from '../validacoes/validar.js';
import { schemaADMIN_editarOrcamento, schemaADMIN_deletarOrcamento, schemaADMIN_listarOrcamentos } from '../validacoes/usuario.js';
import { deletarOrcamento, editarOrcamento, listarOrcamentos } from '../controllers/adminOrcamentosController.js';

const router = Router();

router.get('/listar-orcamentos', auditar('ADMIN_LISTAR_ORCAMENTOS', req => req.usuario?.id_usuario), limitadorListagemAdmin, autenticar, somenteAdmin, validar(schemaADMIN_listarOrcamentos), listarOrcamentos);

router.patch('/editar-orcamento', auditar('ADMIN_EDITAR_ORCAMENTO', req => req.usuario?.id_usuario, true), limitadorEdicaoAdmin, autenticar, somenteAdmin, validar(schemaADMIN_editarOrcamento), editarOrcamento);

router.delete('/deletar-orcamento/:id_usuario/:id_orcamento', auditar('ADMIN_DELETAR_ORCAMENTO', req => req.usuario?.id_usuario, true), limitadorExclusaoAdmin, autenticar, somenteAdmin, validar(schemaADMIN_deletarOrcamento), deletarOrcamento);


export default router;
