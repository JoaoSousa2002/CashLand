import { Router } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();
const __dirname = fileURLToPath(new URL('../rf-002-Login/', import.meta.url));

// rotas de URL para direcionar o front-end
router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tela_login.html'));
});

router.get('/cadastro-usuario', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-003-Cadastro_usuario/public/cadastrar_usuario.html'));
});

router.get('/resetar-senha', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/reset_senha.html'));
});

router.get('/tela-principal', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tela_principal.html'));
});

router.get('/tela-principal/editar-usuario', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-003-Cadastro_usuario/public/editar_usuario.html'));
});

router.get('/tela-principal/listar-categoria', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-004-Gerir_categoria/public/listar_categoria.html'));
});

router.get('/tela-admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tela_admin.html'));
});

router.get('/tela-admin/listar-usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-003-Cadastro_usuario/public/ADMIN_listar_usuarios.html'));
});

router.get('/tela-admin/editar-usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-003-Cadastro_usuario/public/ADMIN_editar_usuario.html'));
});

// RF004 - Gerir Categorias ====================================================================================

// OK
router.get('/tela-admin/editar-categoria', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-004-Gerir_categoria/public/ADMIN_editar_categoria.html'));
});

router.get('/tela-admin/listar-categoria', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-004-Gerir_categoria/public/ADMIN_listar_categoria.html'));
});

// 
router.get('/tela-principal/criar-categoria', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-004-Gerir_categoria/public/criar_categoria.html'));
});

router.get('/tela-principal/editar-categoria', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-004-Gerir_categoria/public/editar_categoria.html'));
});

// RF005 - Gerir Contas Financeiras ============================================================================

router.get('/tela-principal/listar-contas', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-005-Gerir_contas_financeiras/public/listar-contas.html'));
});

router.get('/tela-principal/criar-conta', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-005-Gerir_contas_financeiras/public/criar-conta.html'));
});

router.get('/tela-principal/editar-conta', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-005-Gerir_contas_financeiras/public/editar-conta.html'));
});

router.get('/tela-admin/listar-contas', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-005-Gerir_contas_financeiras/public/ADMIN_listar-contas.html'));
});

router.get('/tela-admin/editar-conta', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-005-Gerir_contas_financeiras/public/ADMIN_editar-conta.html'));
});

// RF006 - Gerir Transações Financeiras ========================================================================

router.get('/tela-principal/criar-transacao', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-006-Gerir_transacoes_financeiras/public/criar-transacao.html'));
});

router.get('/tela-principal/listar-transacoes', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-006-Gerir_transacoes_financeiras/public/listar-transacoes.html'));
});

router.get('/tela-principal/editar-transacao', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-006-Gerir_transacoes_financeiras/public/editar-transacao.html'));
});

router.get('/tela-admin/listar-transacoes', (req, res, next) => {
    res.sendFile(path.join(__dirname, '../rf-006-Gerir_transacoes_financeiras/public/ADMIN_listar-transacoes.html'));
});

router.get('/tela-admin/editar-transacao', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-006-Gerir_transacoes_financeiras/public/ADMIN_editar-transacao.html'));
});

// RF007 - Gerir Metas Financeiras ==========================================================================

router.get('/tela-principal/criar-meta', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-007-Gerir_metas_financeiras/public/criar-meta.html'));
});

router.get('/tela-principal/listar-metas', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-007-Gerir_metas_financeiras/public/listar-metas.html'));
});

router.get('/tela-principal/editar-meta', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-007-Gerir_metas_financeiras/public/editar-meta.html'));
});

router.get('/tela-admin/listar-metas', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-007-Gerir_metas_financeiras/public/ADMIN_listar-metas.html'));
});

router.get('/tela-admin/editar-meta', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-007-Gerir_metas_financeiras/public/ADMIN_editar-meta.html'));
});

export default router;
