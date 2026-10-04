import { Router } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const router = Router();
const __dirname = fileURLToPath(new URL('../rf-001-Login/', import.meta.url));

// rotas de URL para direcionar o front-end
router.get('/', (req, res) => res.redirect('/login'));
router.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tela_login.html'));
});

router.get('/cadastro-usuario', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-002-Cadastro_usuario/public/cadastrar_usuario.html'));
});

router.get('/resetar-senha', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/reset_senha.html'));
});

router.get('/tela-principal', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tela_principal.html'));
});

router.get('/tela-principal/editar-usuario', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-002-Cadastro_usuario/public/editar_usuario.html'));
});

router.get('/tela-principal/listar-categoria', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-003-Gerir_categoria/public/listar_categoria.html'));
});

router.get('/tela-admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tela_admin.html'));
});

router.get('/tela-admin/listar-usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-002-Cadastro_usuario/public/ADMIN_listar_usuarios.html'));
});

router.get('/tela-admin/editar-usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-002-Cadastro_usuario/public/ADMIN_editar_usuario.html'));
});

// RF003 - Gerir Categorias ====================================================================================

// OK
router.get('/tela-admin/editar-categoria', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-003-Gerir_categoria/public/ADMIN_editar_categoria.html'));
});

router.get('/tela-admin/listar-categoria', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-003-Gerir_categoria/public/ADMIN_listar_categoria.html'));
});

// 
router.get('/tela-principal/criar-categoria', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-003-Gerir_categoria/public/criar_categoria.html'));
});

router.get('/tela-principal/editar-categoria', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-003-Gerir_categoria/public/editar_categoria.html'));
});

export default router;
