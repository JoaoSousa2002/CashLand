import { createClient } from '@supabase/supabase-js'
import {
    criarServicoCodigos,
    enviarEmail,
    gerarCodigo,
    normalizarEmail
} from '../rf-002-Cadastro_usuario/Email.js';
import {
    gerarHashSenha,
    validarSenha,
    gerarToken,
    verificarToken
} from './Autenticacao.js'
import {
    schemaNome,
    schemaEmail,
    schemaSenha,
    schemaCodigo,
    schemaId,
    schemaNovaSenha,
    schemaDescricaoCategoria
} from "../validacoes/usuario.js";
import logger from "../config/logger.js";
import { auditar, confirmarAlteracao } from "../middlewares/AuditoriaRota.js";
import { LoggerHTTP } from "../middlewares/LoggerHTTP.js";
import { validar } from "../validacoes/validar.js";
import Express from 'express'
import cors from 'cors'
import ws from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';


const limitadorLogin = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 8, // só 8 tentativas de login por IP a cada 5 min
    handler: (req, res) => {
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        res.status(429).json({ mensagem: 'Muitas tentativas de login realizadas. Tente novamente em 5 minutos.' });
    }
});
const limitadorCadastro = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8, // só 5 tentativas de login por IP a cada 15 min
    handler: (req, res) => {
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        res.status(429).json({ mensagem: 'Muitas tentativas de cadastro realizadas. Tente novamente em 15 minutos.' });
    }
});
const limitadorCodigo = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8, // só 5 tentativas de login por IP a cada 15 min
    handler: (req, res) => {
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        res.status(429).json({ mensagem: 'Muitas tentativas de realizadas para esta operação. Tente novamente em 15 minutos.' });
    }
});

// Array com as CORS local
let origemAutorizada = [];
if (process.env.ORIGEM_AUTORIZADA) {
    origemAutorizada = process.env.ORIGEM_AUTORIZADA.split(',').map(origin => origin.trim());
}



// __dirname não existe nativamente em ES Modules, então recriamos aqui.
// Isso garante que o Express.static funcione independente de onde o
// comando "node" é executado (importante no Render, onde o start command
// roda a partir da raiz do repositório).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const app = Express()
// Autoriza o acesso por proxy, necessario para funcionar no render
app.set('trust proxy', 1)
app.use(LoggerHTTP);
app.use(cors({ origin: origemAutorizada, credentials: true }));
app.use(Express.json())
app.use(cookieParser());
const swaggerSpec = JSON.parse(
    readFileSync(new URL('../../docs/api/API-SWAGGER.json', import.meta.url))
);

//Rota da API SWAGGER UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// rotas de URL para direcionar o front-end
app.get('/', (req, res) => res.redirect('/login'));
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tela_login.html'));
});

app.get('/cadastro-usuario', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-002-Cadastro_usuario/public/cadastrar_usuario.html'));
});

app.get('/resetar-senha', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/reset_senha.html'));
});

app.get('/tela-principal', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tela_principal.html'));
});

app.get('/tela-principal/editar-usuario', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-002-Cadastro_usuario/public/editar_usuario.html'));
});

app.get('/tela-admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/tela_admin.html'));
});

app.get('/tela-admin/listar-usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-002-Cadastro_usuario/public/ADMIN_listar_usuarios.html'));
});

app.get('/tela-admin/editar-usuarios', (req, res) => {
    res.sendFile(path.join(__dirname, '../rf-002-Cadastro_usuario/public/ADMIN_editar_usuario.html'));
});


const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        realtime: {
            transport: ws
        }
    }
)

// Verifica se o supabase está conectado
async function testarConexao() {
    const { error } = await supabase
        .from('usuarios')
        .select('id_usuario')
        .limit(1);

    if (error) {
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
    } else {
        console.log(' Conexão com o Supabase OK.')
    }
} testarConexao();

function autenticar(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        Object.assign(res.locals.auditoria, { resultado: 'NEGADO', motivo: 'NAO_AUTENTICADO' });
        console.log('Autenticacao erro 401: Não autenticado')
        return res.status(401).json({ mensagem: 'Não autenticado' });
    }
    try {
        req.usuario = verificarToken(token);
        next();
    } catch {
        Object.assign(res.locals.auditoria, { resultado: 'NEGADO', motivo: 'SESSAO_INVALIDA' });
        console.log('Autenticacao erro 401: Token inválido ou expirado')
        return res.status(401).json({ mensagem: 'Token inválido ou expirado' });
    }
}

function somenteAdmin(req, res, next) {
    if (req.usuario.tipo !== 'Admin') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores' });
    }
    next();
}

app.use(Express.static(path.join(__dirname, 'public')));
app.use(Express.static(path.join(__dirname, '../rf-002-Cadastro_usuario/public')));
app.use(Express.static(path.join(__dirname, '../img')));


const codigos = criarServicoCodigos(supabase);

async function buscarUsuario(email) {
    // Compatibilidade com emails legados que possuem letras maiúsculas.
    // A comparação final também impede que curingas do ILIKE identifiquem outra conta.
    const { data, error } = await supabase.from('usuarios')
        .select('id_usuario,nome,email')
        .ilike('email', email.replace(/[\\%_]/g, '\\$&'));
    if (error) throw new Error('Não foi possível consultar o usuário');
    const usuarios = (data ?? []).filter(usuario => normalizarEmail(usuario.email) === email);
    if (usuarios.length > 1) throw new Error('Email corresponde a mais de uma conta');
    return usuarios[0];
}

async function emitirCodigo(email, nome, finalidade) {
    const codigo = gerarCodigo();
    const emissao = await codigos.salvarCodigo(email, codigo, finalidade);
    let assunto;
    if (finalidade === 'cadastro') {
        assunto = 'Seu código de verificação';
    } else {
        assunto = 'Redefinição de senha - CashLand';
    }
    try {
        await enviarEmail({
            destinatarioEmail: email,
            destinatarioNome: nome,
            assunto: assunto,
            conteudoHtml: `<html><body><h2>Código de verificação</h2>
        <p>Use o código abaixo para continuar:</p>
        <h1 style="letter-spacing: 4px;">${codigo}</h1>
        <p>Esse código expira em 10 minutos.</p></body></html>`
        });
    } catch {
        try {
            await codigos.cancelarEmissao(emissao);
        } catch {
            console.error('Falha ao cancelar emissão após erro no envio de email');
        }
        throw new Error('Não foi possível enviar o código');
    }
}

app.get('/me', auditar('CONSULTAR_SESSAO', req => req.query.id || req.usuario?.id_usuario, false), autenticar, async (req, res) => {
    const { id } = req.query

    if (id && req.usuario.tipo !== 'Admin') {
        console.log("/usuario: Acesso negado - usuário comum tentou acessar outro ID");
        return res.status(403).json({ mensagem: 'Acesso negado' });
    }
    if (id) {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, tipo, status_usuario')
            .eq('id_usuario', id)
            .single();

        if (error) {
            res.locals.auditoria.resultado = error.code === 'PGRST116' ? 'FALHA' : 'ERRO';
            console.log("/me: Usuario não existe ou inativo")
            return res.status(401).json({ mensagem: 'Sessão inválida' });
        }
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(200).json({ status_usuario: data.status_usuario, tipo: data.tipo });
    }

    // req.usuario já vem do middleware, mas revalida contra o banco
    // pra pegar dados atualizados (ex: se foi inativado depois do token ser emitido)
    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, email, tipo, status_usuario')
        .eq('id_usuario', req.usuario.id_usuario)
        .single();

    if (error) res.locals.auditoria.resultado = error.code === 'PGRST116' ? 'FALHA' : 'ERRO';
    if (error || data.status_usuario === 'Inativo') {
        console.log("/me: Usuario não existe ou inativo")
        return res.status(401).json({ mensagem: 'Sessão inválida' });
    }
    console.log("/me: Usuario autenticado")
    return res.status(200).json({ id_usuario: data.id_usuario, nome: data.nome, tipo: data.tipo });
});

// ROTA DE LOGIN
app.post('/login', auditar('LOGIN', undefined, true), limitadorLogin, validar(schemaEmail, schemaSenha), async (req, res) => {
    const { email, senha } = req.body;

    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, senha_hash, status_usuario, tipo, status_reset_senha')
        .eq('email', email)
        .single();

    // Erro OU usuário não encontrado — checa isso PRIMEIRO
    if (error || !usuario) {
        res.locals.auditoria.resultado = error && error.code !== 'PGRST116' ? 'ERRO' : 'FALHA';
        return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    // Só chega aqui se usuario existir de verdade
    if (usuario.status_usuario === 'Inativo') {
        return res.status(403).json({ mensagem: 'Conta inativa. Contate o administrador.' });
    }

    if (usuario.status_reset_senha) {
        console.log("/login: >>>>> Reset de senha solicitado")
        return res.status(203).json({ mensagem: "Reset de senha solicitado por um adminstrador" })
    }

    const senhaCorreta = await validarSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
        return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    const token = gerarToken(usuario);
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 2 * 60 * 60 * 1000
    });

    Object.assign(res.locals.auditoria, { usuarioId: usuario.id_usuario, recursoId: usuario.id_usuario, resultado: 'SUCESSO' });
    return res.status(200).json({
        mensagem: 'Login realizado com sucesso',
        usuario: { id: usuario.id_usuario, nome: usuario.nome, tipo: usuario.tipo }
    });
});

app.post('/confirmar-senha', auditar('CONFIRMAR_SENHA', req => req.usuario?.id_usuario, false), limitadorLogin, autenticar, validar(schemaSenha), async (req, res) => {
    const { senha } = req.body
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('senha_hash') // adicionado tipo
        .eq('id_usuario', req.usuario.id_usuario)
        .single();

    // Validar senha
    const senhaCorreta = await validarSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
        console.log("/confirmar-senha: >>>>> Senha incorreta")
        return res.status(401).json({ mensagem: 'Senha incorreta' });
    }
    console.log("/confirmar-senha: Senha correta")
    return res.status(200).json({ mensagem: "Senha correta" })
})
// ROTA DE LOGOUT
app.post('/logout', auditar('LOGOUT', undefined, false), limitadorCodigo, (req, res) => {
    try {
        const usuario = verificarToken(req.cookies.token);
        Object.assign(res.locals.auditoria, { usuarioId: usuario.id_usuario, recursoId: usuario.id_usuario });
    } catch { /* Logout continua permitido mesmo sem sessão válida. */ }
    res.clearCookie('token');
    console.log('/logout: Logout realizado')
    return res.status(200).json({ mensagem: 'Logout realizado' });
});

app.post('/solicitar-codigo', auditar('SOLICITAR_CODIGO_CADASTRO', undefined, false), limitadorCodigo, validar(schemaNome, schemaEmail, schemaSenha), async (req, res) => {
    const { nome } = req.body;
    const email = normalizarEmail(req.body?.email);
    try {
        if (await buscarUsuario(email)) {
            console.log('/solicitar-codigo: >>>>> Esse email já está cadastrado');
            return res.status(409).json({ mensagem: 'Esse email já está cadastrado' });
        }
        await emitirCodigo(email, nome, 'cadastro');
        console.log('/solicitar-codigo: Código enviado para o email');
        return res.status(200).json({ mensagem: 'Codigo enviado para o email!' });
    } catch {
        console.log('/solicitar-codigo: >>>>> Falha ao consultar, persistir ou enviar o código');
        return res.status(500).json({ mensagem: 'Não foi possível solicitar o código' });
    }
});

app.post('/confirmar-cadastro', auditar('CADASTRAR_USUARIO', undefined, true), limitadorCadastro, validar(schemaNome, schemaEmail, schemaCodigo, schemaSenha), async (req, res) => {
    const { nome, senha, codigoDigitado } = req.body ?? {};
    const email = normalizarEmail(req.body?.email);
    try {
        const senha_hash = await gerarHashSenha(senha);
        const resultado = await codigos.validarCodigo(email, String(codigoDigitado), 'cadastro');
        if (!resultado.valido) {
            console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
            return res.status(401).json({ mensagem: resultado.motivo });
        }
        const { data: criados, error } = await supabase
            .from('usuarios')
            .insert({ nome, email, senha_hash })
            .select('id_usuario');
        if (error) throw new Error('Falha ao cadastrar usuário');
        confirmarAlteracao(res, criados);
        try {
            await enviarEmail({
                destinatarioEmail: email, destinatarioNome: nome,
                assunto: 'Bem-vindo ao CashLand!',
                conteudoHtml: `<h1>Olá, ${nome}!</h1><p>Sua conta foi criada com sucesso.</p>`
            });
        } catch {
            res.locals.auditoria.motivo = 'EMAIL_BOAS_VINDAS_NAO_ENVIADO';
            console.log('/confirmar-cadastro: >>>>> Usuário criado, mas o envio do email de boas-vindas falhou');
            return res.status(201).json({ mensagem: 'Usuario criado, mas o email de confirmação não foi enviado' });
        }
        console.log('/confirmar-cadastro: Cadastro processado');
        return res.status(200).json({ mensagem: 'Cadastro realizado com sucesso, prossiga para o login!' });
    } catch {
        console.log('/confirmar-cadastro: >>>>> Falha ao validar código ou cadastrar usuário');
        return res.status(500).json({ mensagem: 'Erro ao cadastrar usuário' });
    }
});

app.post('/solicitar-reset-senha', auditar('SOLICITAR_RECUPERACAO_SENHA', undefined, false), limitadorCodigo, validar(schemaEmail), async (req, res) => {
    const email = normalizarEmail(req.body?.email);
    try {
        const usuario = await buscarUsuario(email);

        if (!usuario) {
            console.log('/solicitar-reset-senha: >>>>> Email não cadastrado');
            return res.status(404).json({ mensagem: 'Email não cadastrado' });
        }

        await emitirCodigo(email, usuario.nome, 'recuperacao_senha');

        console.log('/solicitar-reset-senha: Código enviado para o email');
        return res.status(200).json({ mensagem: 'Código enviado para o email!' });

    } catch {
        console.log('/solicitar-reset-senha: >>>>> Falha ao consultar, persistir ou enviar o código');
        return res.status(500).json({ mensagem: 'Não foi possível enviar o código' });
    }
});

app.post('/confirmar-reset-senha', auditar('REDEFINIR_SENHA', undefined, true), limitadorCodigo, validar(schemaEmail, schemaCodigo, schemaNovaSenha), async (req, res) => {
    const { codigoDigitado, novaSenha } = req.body ?? {};
    const email = normalizarEmail(req.body?.email);
    try {
        const usuario = await buscarUsuario(email);

        if (!usuario) {
            console.log('/confirmar-reset-senha: >>>>> Usuário não encontrado');
            return res.status(404).json({ mensagem: 'Usuário não encontrado' });
        }

        const novaSenhaHash = await gerarHashSenha(novaSenha);

        const resultado = await codigos.validarCodigo(email, String(codigoDigitado), 'recuperacao_senha');

        if (!resultado.valido) {
            console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
            return res.status(401).json({ mensagem: resultado.motivo });
        }
        const { data, error } = await supabase.from('usuarios')
            .update({ senha_hash: novaSenhaHash, status_reset_senha: false })
            .eq('id_usuario', usuario.id_usuario)
            .select('id_usuario').maybeSingle();
        if (error) {
            throw new Error('Falha ao atualizar senha');
        }
        if (!data) {
            console.log('/confirmar-reset-senha: >>>>> Usuário não encontrado');
            return res.status(404).json({ mensagem: 'Usuário não encontrado' });
        }
        confirmarAlteracao(res, data);
        console.log('/confirmar-reset-senha: Senha alterada com sucesso');
        return res.status(200).json({ mensagem: 'Senha alterada com sucesso!' });
    } catch {
        console.log('/confirmar-reset-senha: >>>>> Falha ao validar código ou atualizar senha');
        return res.status(500).json({ mensagem: 'Erro ao processar sua solicitação' });
    }
});

// ROTAS ACESSO USUARIO COMUM

app.get('/usuario', auditar('CONSULTAR_USUARIO', req => req.usuario?.id_usuario, false), autenticar, async (req, res) => {
    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, email, status_usuario, data_criacao')
        .eq('id_usuario', req.usuario.id_usuario)
        .single();

    if (error) res.locals.auditoria.resultado = error.code === 'PGRST116' ? 'FALHA' : 'ERRO';
    if (error || data.status_usuario === 'Inativo') {
        console.log("/usuario: Usuario não existe ou inativo")
        return res.status(401).json({ mensagem: 'Sessão inválida' });
    }
    console.log("/usuario: todos os dados retornados")
    return res.status(200).json(data);
})

app.patch('/usuario/desativar-usuario', auditar('DESATIVAR_USUARIO', req => req.usuario?.id_usuario, true), autenticar, async (req, res) => {

    const { data: consulta } = await supabase
        .from('usuarios')
        .select('status_usuario, nome')
        .eq('id_usuario', req.usuario.id_usuario)
        .single()

    if (consulta.status_usuario === 'Inativo') {
        console.log("/usuario/desativar-usuario: Usuario já está desativado")
        return res.status(400).json({ mensagem: "Usuario já está desativado" })
    } else if (!consulta) {
        console.log("Nada retornado")
    }

    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ status_usuario: 'Inativo', data_inativacao: new Date().toISOString() })
        .eq('id_usuario', req.usuario.id_usuario).select('id_usuario')

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario: Usuario não existe, inativo ou sessao invalida")
        return res.status(401).json({ mensagem: 'Erro ao desativar a conta, tente novamente mais tarde' });
    }
    console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Usuario desativado com sucesso" })
})

app.patch('/usuario/atualizar-dados', auditar('ATUALIZAR_USUARIO', req => req.usuario?.id_usuario, true), autenticar, validar(schemaNome), async (req, res) => {
    const { nome } = req.body

    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ nome: nome })
        .eq('id_usuario', req.usuario.id_usuario).select('id_usuario')

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(500).json({ mensagem: "Erro em atualizar usuario - " + error })
    }

    console.log("/usuario/atualizar-dados: Atualização processada")
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Dados atualizados com sucesso" })
})

// ROTAS DE ACESSO RESTRITO (Admin)

app.get('/admin/listar-usuarios', auditar('LISTAR_USUARIOS', undefined, false), autenticar, somenteAdmin, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { pesquisa } = req.query;

    if (!pesquisa || pesquisa === "") {
        console.log("/admin/listar-usuarios: Pesquisa para listar usuario vazio")
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, tipo, status_usuario, data_criacao, data_inativacao')
            .order('id_usuario', { ascending: true })
        if (error) {
            console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
            return res.status(500).json({ erro: error.message });
        }
        console.log("/admin/listar-usuarios: Todos os dados retornados")
        return res.status(200).json(data);
    }

    const condicoes = [`nome.ilike.%${pesquisa}%`];
    // só tenta buscar por ID se o termo for um número válido
    if (!isNaN(pesquisa)) {
        condicoes.push(`id_usuario.eq.${pesquisa}`);
    }

    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, email, tipo, status_usuario, data_criacao, data_inativacao')
        .order('id_usuario', { ascending: true })
        .or(condicoes.join(','));

    if (error) {
        return res.status(500).json({ erro: error.message });
    }
    console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
    return res.status(201).json(data);
});

app.get('/admin/usuario', auditar('CONSULTAR_USUARIO', req => req.query.id || req.usuario?.id_usuario, false), autenticar, somenteAdmin, async (req, res) => {
    const { id } = req.query
    // req.usuario já vem do middleware, mas revalida contra o banco
    // pra pegar dados atualizados (ex: se foi inativado depois do token ser emitido)

    if (id) {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, status_usuario, data_criacao, data_inativacao')
            .eq('id_usuario', id)
            .single();

        if (error) {
            res.locals.auditoria.resultado = error.code === 'PGRST116' ? 'FALHA' : 'ERRO';
            console.log("/usuario: Usuario não existe ou inativo")
            return res.status(401).json({ mensagem: 'Usuario não existe ou inativo' });
        }
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(200).json(data);
    } else {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, status_usuario, data_criacao, data_inativacao')
            .eq('id_usuario', req.usuario.id_usuario)
            .single();

        if (error) {
            res.locals.auditoria.resultado = error.code === 'PGRST116' ? 'FALHA' : 'ERRO';
            console.log("/usuario: Usuario não existe ou inativo")
            return res.status(401).json({ mensagem: 'Usuario não existe ou inativo' });
        }
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(200).json(data);
    }
})

app.patch('/admin/editar-usuario', auditar('ATUALIZAR_USUARIO', req => req.body?.id, true), autenticar, somenteAdmin, validar(schemaId, schemaNome, schemaEmail), async (req, res) => {
    const { id, nome, email } = req.body

    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ nome: nome, email: email })
        .eq('id_usuario', id).select('id_usuario')

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(500).json({ mensagem: "Erro em atualizar usuario - " + error })
    }

    console.log("/admin/editar-usuario: Atualização processada")
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Dados atualizados com sucesso" })
})

app.patch('/admin/resetar-senha', auditar('SOLICITAR_RESET_ADMIN', req => req.body?.id, true), autenticar, somenteAdmin, async (req, res) => {
    const { id } = req.body

    //Verifica que o reset já foi solicitado
    const { data: consulta, error: errorConsulta } = await supabase
        .from('usuarios')
        .select('status_reset_senha')
        .eq('id_usuario', id)
        .single()
    if (errorConsulta) {
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(500).json({ mensagem: "Ocorreu um erro ao consultar o usuario, verifique os logs" })
    }
    if (consulta.status_reset_senha === true) {
        console.log("/admin/resetar-senha: >>>>> A solicitação de reset já foi feita")
        return res.status(400).json({ mensagem: "Já foi feita uma solicitação de reset de senha para este usuario" })
    }

    // Solicita o reset da senha
    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ status_reset_senha: true })
        .eq('id_usuario', id).select('id_usuario')
    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(501).json({ mensagem: "Ocorreu um erro com sua solicitação, verifique os logs" })
    }
    console.log("/admin/resetar-senha: Solicitação processada")
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Solicitação de reset da senha realizada" })

})

app.patch('/admin/reativar-usuario', auditar('REATIVAR_USUARIO', req => req.body?.id, true), autenticar, somenteAdmin, async (req, res) => {
    const { id } = req.body
    const { data: consulta } = await supabase
        .from('usuarios')
        .select('status_usuario, nome')
        .eq('id_usuario', id)
        .single()

    if (consulta.status_usuario === 'Ativo') {
        console.log("/admin/reativar-usuario: Usuario já está ativo")
        return res.status(400).json({ mensagem: "Usuario já está ativo" })
    } else if (!consulta) {
        console.log("/admin/reativar-usuario: Nada retornado")
        return res.status(401).json({ mensagem: "Nada retornado" })
    }
    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ status_usuario: 'Ativo', data_inativacao: null })
        .eq('id_usuario', id).select('id_usuario')

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/admin/reativar-usuario: Usuario não existe, inativo ou sessao invalida")
        return res.status(401).json({ mensagem: 'Erro ao reativar a conta, tente novamente mais tarde' });
    }
    console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Usuario reativado com sucesso" })
})

app.patch('/admin/desativar-usuario', auditar('DESATIVAR_USUARIO', req => req.body?.id, true), autenticar, somenteAdmin, async (req, res) => {
    const { id } = req.body || {};

    if (!id) {
        return res.status(400).json({ mensagem: "Informe o id do usuário" });
    }

    const { data: consulta, error: erroConsulta } = await supabase
        .from('usuarios')
        .select('status_usuario, nome, tipo')
        .eq('id_usuario', id)
        .single();

    if (erroConsulta || !consulta) {
        res.locals.auditoria.resultado = erroConsulta && erroConsulta.code !== 'PGRST116' ? 'ERRO' : 'FALHA';
        console.log("/admin/desativar-usuario: Usuário não encontrado");
        return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    if (consulta.tipo === 'Admin') {
        console.log("/admin/desativar-usuario: >>>>> Admin não pode desativar própria conta ou de outro admin");
        return res.status(403).json({ mensagem: "Admin não pode desativar própria conta ou de outro admin" });
    }

    if (consulta.status_usuario === 'Inativo') {
        console.log("/admin/desativar-usuario: Usuario já está desativado");
        return res.status(400).json({ mensagem: "Usuario já está desativado" });
    }

    const { data: alterados, error } = await supabase
        .from('usuarios')
        .update({ status_usuario: 'Inativo', data_inativacao: new Date().toISOString() })
        .eq('id_usuario', id).select('id_usuario');

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(500).json({ mensagem: 'Erro ao desativar a conta, tente novamente mais tarde' });
    }

    console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Usuario desativado com sucesso" });
})

app.delete('/admin/deletar-usuario', auditar('EXCLUIR_USUARIO', req => req.query.id_usuario, true), autenticar, somenteAdmin, async (req, res) => {
    const { id_usuario } = req.query

    if (!id_usuario) {
        console.log("admin/deletar-usuario: Backend não recebeu o ID")
        return res.status(400).json({ mensagem: "Backend não recebeu o id" })
    }
    const { data: consulta, error: erroConsulta } = await supabase
        .from('usuarios')
        .select('status_usuario, tipo')
        .eq('id_usuario', id_usuario)
        .single();

    if (erroConsulta || !consulta) {
        res.locals.auditoria.resultado = erroConsulta && erroConsulta.code !== 'PGRST116' ? 'ERRO' : 'FALHA';
        console.log("/admin/desativar-usuario: Usuário não encontrado");
        return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }

    if (consulta.tipo === 'Admin') {
        console.log("/admin/deletar-usuario: >>>>> Admin não pode deletar própria conta ou de outro admin");
        return res.status(403).json({ mensagem: "Admin não pode deletar própria conta ou de outro admin" });
    }
    const { data: alterados, error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id_usuario', id_usuario).select('id_usuario')

    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("admin/deletar-usuario: Erro a deletar o ususario, verifique o banco de dados")
        return res.status(500).json({ mensagem: "Erro ao deletar o usuario, verifique o banco de dados" })
    }
    console.log("/admin/deletar-usuario: Exclusão processada")
    confirmarAlteracao(res, alterados);
    return res.status(200).json({ mensagem: "Operação com sucesso, usuario deletado permanentemente" })
})

// RF003 - Gerir cadastro

// TESTADO E ACEITO
app.post('/usuario/criar-categoria', auditar('CRIAR_CATEGORIA', req => req.usuario?.id_usuario, false),
    autenticar, validar(schemaNome, schemaDescricaoCategoria), async (req, res) => {
        const { nome, descricao } = req.body

        if (nome.trim().toLowerCase() === "sem categoria") {
            return res.status(409).json({
                mensagem: "O nome 'Sem categoria' é reservado pelo sistema."
            });
        }
        // Verifica se já existe uma categoria com esse nome
        const { data: consultaCategoria, error: erroConsulta } = await supabase
            .from('categorias')
            .select('id_categoria, nome')
            .eq('id_usuario', req.usuario.id_usuario)
            .eq('nome', nome)
            .maybeSingle()

        if (erroConsulta) {
            res.locals.auditoria.resultado = 'ERRO';
            console.log("/usuario/criar-categoria: Erro ao verificar a tabela: " + erroConsulta)
            return res.status(500).json({ mensagem: "Erro ao verificar a tabela, tente novamente mais tarde" })
        }
        if (consultaCategoria) {
            console.log("/usuario/criar-categoria: >>>>> Já existe uma categoria com esse nome")
            return res.status(409).json({ mensagem: "Já existe uma categoria com esse nome" })
        }

        const { data: criaCategoria, error: errorCriar } = await supabase
            .from('categorias')
            .insert({
                id_usuario: req.usuario.id_usuario,
                nome: nome,
                descricao: descricao,
            })
            .select()
            .single()

        if (errorCriar) {
            console.log("/usuario/criar-categoria: >>>>> Erro ao criar categoria: " + errorCriar)
            return res.status(500).json({ mensagem: "Erro ao criar a categoria, tente novamente mais tarde" })
        }
        if (criaCategoria) {
            console.log("/usuario/criar-categoria: Categoria '" + criaCategoria.nome + "' criada com sucesso")
            return res.status(200).json({ mensagem: "Categoria criada com sucesso" })
        }
    });

// TESTADO E ACEITO
app.get('/usuario/listar-categoria', auditar('USER_LISTAR_CATEGORIA', req => req.usuario?.id_usuario, false), autenticar, validar(schemaId, schemaNome), async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { pesquisa } = req.query;

    if (!pesquisa || pesquisa === "") {
        console.log("/usuario/listar-categoria: Pesquisa para listar categoria vazio")

        const { data, error } = await supabase
            .from('categorias')
            .select('id_categoria, nome, descricao, data_criacao')
            .order('id_categoria', { ascending: true })
        if (error) {
            console.log("/usuario/listar-categoria: >>>>> Erro ao pesquisar a categoria");
            return res.status(500).json({ erro: error.message });
        }
        console.log("/usuario/listar-categoria: Todas as categorias foram retornadas")
        return res.status(200).json(data);
    }

    const condicoes = [`nome.ilike.%${pesquisa}%`];
    // só tenta buscar por ID se o termo for um número válido
    if (!isNaN(pesquisa)) {
        condicoes.push(`id_categoria.eq.${pesquisa}`);
    }

    const { data, error } = await supabase
        .from('categorias')
        .select('id_categoria, nome, descricao, data_criacao')
        .order('id_categoria', { ascending: true })
        .or(condicoes.join(','));

    if (error) {
        return res.status(500).json({ erro: error.message });
    }
    console.log("/usuario/listar-categoria: Todas as categorias foram retornadas");
    return res.status(201).json(data);
});

// TESTADO E ACEITO
app.patch('/usuario/editar-categoria', auditar('USER_EDITAR_CATEGORIA', req => req.usuario?.id_usuario, false), autenticar, validar(schemaId, schemaNome, schemaDescricaoCategoria), async (req, res) => {
    const { id, nome, descricao } = req.body


    // Verifica se a categoria existe
    const { data: consultaCategoria, error: erroConsulta } = await supabase
        .from('categorias')
        .select('id_categoria, nome')
        .eq('id_usuario', req.usuario.id_usuario)
        .eq('id_categoria', id)
        .maybeSingle()

    if (erroConsulta) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/criar-categoria: Erro ao verificar a tabela: " + erroConsulta)
        return res.status(500).json({ mensagem: "Erro ao verificar a tabela, tente novamente mais tarde" })
    }
    if (!consultaCategoria) {
        console.log("/usuario/criar-categoria: >>>>> A categoria não existe")
        return res.status(404).json({ mensagem: "Essa categoria não existe" })
    }
    if (nome.trim().toLowerCase() === "sem categoria") {
        console.log("/usuario/editar-categoria: >>>>> A categoria 'sem categoria' não pode ser editada")
        return res.status(403).json({ mensagem: "Essa categoria não pode ser editada!" });
    }
    if (nome.trim().toLowerCase() === "sem categoria") {
        console.log("/usuario/editar-categoria: >>>>> O nome 'Sem categoria' é reservado pelo sistema.")
        return res.status(409).json({ mensagem: "O nome 'Sem categoria' é reservado pelo sistema." });
    }

    //Verifica se outra categoria já tem o nome editado
    const { data: categoriaExistente, error: erroDuplicidade } = await supabase
        .from('categorias')
        .select('id_categoria')
        .eq('id_usuario', req.usuario.id_usuario)
        .ilike('nome', nome.trim())
        .neq('id_categoria', id)
        .maybeSingle();

    if (erroDuplicidade) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/editar-categoria: >>>>> Erro ao verificar o nome da categoria.")
        return res.status(500).json({ mensagem: "Erro ao verificar o nome da categoria." });
    }

    if (categoriaExistente) {
        console.log("/usuario/editar-categoria: >>>>> á existe outra categoria com esse nome..")
        return res.status(409).json({ mensagem: "Já existe outra categoria com esse nome." });
    }

    // Atualiza a tabela categoria
    const { data: editarCategoria, error: errorEditar } = await supabase
        .from('categorias')
        .update({ nome: nome, descricao: descricao })
        .eq('id_categoria', id)
        .eq('id_usuario', req.usuario.id_usuario)
        .select()
        .single()

    if (errorEditar) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/editar-categoria: >>>>> Erro ao atualizar a tabela")
        return res.status(500).json({ mensagem: "Erro ao atualizar a categoria, por favor tente novamente mais tarde" })
    }
    return res.status(200).json({ mensagem: "Categoria atualizada com sucesso." });
})

// TESTADO E ACEITO
app.delete('/usuario/deletar-categoria', auditar('USER_DELETAR_CATEGORIA', req => req.usuario?.id_usuario, false), autenticar, validar(schemaId), async (req, res) => {
    const { id } = req.body

    // Verifica se a categoria existe
    const { data: consultaCategoria, error: erroConsulta } = await supabase
        .from('categorias')
        .select('id_categoria, nome')
        .eq('id_usuario', req.usuario.id_usuario)
        .eq('id_categoria', id)
        .maybeSingle()

    if (erroConsulta) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/deletar-categoria: Erro ao verificar a tabela: " + erroConsulta)
        return res.status(500).json({ mensagem: "Erro ao verificar a tabela, tente novamente mais tarde" })
    }
    if (!consultaCategoria) {
        console.log("/usuario/deletar-categoria: >>>>> A categoria não existe")
        return res.status(404).json({ mensagem: "Essa categoria não existe" })
    }
    if (consultaCategoria.nome.trim().toLowerCase() === "sem categoria") {
        console.log("/usuario/deletar-categoria: >>>>> A categoria 'sem categoria' não pode ser deletada")
        return res.status(403).json({ mensagem: "Essa categoria não pode ser deletada!" });
    }

    // Deleta a categoria
    const { data: categoriaDeletada, error } = await supabase
        .from('categorias')
        .delete()
        .eq('id_categoria', id)
        .eq('id_usuario', req.usuario.id_usuario)
        .select('nome')
        .single()
    if (error) {
        res.locals.auditoria.resultado = 'ERRO';
        console.log("/usuario/deletar-categoria: Erro ao deletar acategoria: " + error)
        return res.status(500).json({ mensagem: "Erro ao deletar a categoria, tente novamente mais tarde" })
    }
    console.log("/usuario/deletar-categoria: Categoria '" + categoriaDeletada.nome + "' deletada com sucesso")
    return res.status(200).json({ mensagem: "Categoria deletada com sucesso" })
})

app.get('/admin/listar-categoria', auditar('ADMIN_LISTAR_CATEGORIA', req => req.usuario?.id_usuario, false), autenticar, somenteAdmin, validar(schemaId), async (req, res) => {
    const { id } = req.query

    if (id) {
        //Verifica se o usuario existe
        const { data: consultaUsuario, error: erroConsulta } = await supabase
            .from('usuarios')
            .select('nome')
            .eq('is_usuario', id)
            .maybeSingle()

        if (!consultaUsuario || erroConsulta) {
            console.log("/admin/listar-usuario: >>>>> Usuario não existe ou não possui tabelas")
            return res.status(404).json({ mensagem: "Usuario não existe ou não possui tabelas" })
        }

        const { data: consultaPorID, error } = await supabase
            .from('categorias')
            .select('*, usuarios (id_usuario, nome)')
            .eq('id_usuario', id)
            .order('id_categoria', { ascending: true })

        if (error) {
            console.log("/admin/listar-categoria(Com ID): >>>>> Erro em consultar as categorias do usuario: " + error)
            return res.status(500).json({ mensagem: "Ocorreu um erro ao consultar as categorias do usuario" })
        }
        console.log("/admin/listar-usuario: Dados do usuario retornados")
        return res.status(200).json({ consultaPorID })
    }

    const { consultaPorID, error } = await supabase
        .from('categorias')
        .select('*, usuarios (id_usuario, nome)')
        .order('id_categoria', { ascending: true })

    if (error) {
        console.log("/admin/listar-categoria: >>>>> Erro em consultar as categorias: " + error)
        return res.status(500).json({ mensagem: "Ocorreu um erro ao consultar as categorias" })
    }
    console.log("Sucesso em consultar as categorias")
    return res.status(200).json({ consultaPorID })
})

// IMPORTANTE: Ultima rota do sistema para redirecionar em caso de rota não existir
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public/tela_erro_404.html'));
});
// O Render (e a maioria dos provedores de hospedagem) define a porta
// dinamicamente via variável de ambiente PORT. Localmente, cai no 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT)
    logger.info("Servidor CashLand iniciado", {
        porta: PORT,
        ambiente: process.env.NODE_ENV || "development"
    });
});
