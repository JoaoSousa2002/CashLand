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
    schemaNovaSenha
} from "../validacoes/usuario.js";

import { validar } from "../validacoes/validar.js";
import Express from 'express'
import cors from 'cors'
import ws from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import rateLimit from 'express-rate-limit';
import 'dotenv/config';
import cookieParser from 'cookie-parser';


const limitadorLogin = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 8, // só 8 tentativas de login por IP a cada 5 min
    handler: (req, res) => {
        console.log(`LOGIN: >>>>> Rate limit atingido pelo IP: ${req.ip}`);
        res.status(429).json({ mensagem: 'Muitas tentativas de login realizadas. Tente novamente em 5 minutos.' });
    }
});
const limitadorCadastro = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8, // só 5 tentativas de login por IP a cada 15 min
    handler: (req, res) => {
        console.log(`CADASTRO: >>>>> Rate limit atingido pelo IP: ${req.ip}`);
        res.status(429).json({ mensagem: 'Muitas tentativas de cadastro realizadas. Tente novamente em 15 minutos.' });
    }
});
const limitadorCodigo = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8, // só 5 tentativas de login por IP a cada 15 min
    handler: (req, res) => {
        console.log(`CODIGO: >>>>> Rate limit atingido pelo IP: ${req.ip}`);
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
        console.log(' Falha ao conectar/consultar o Supabase:', error.message)
    } else {
        console.log(' Conexão com o Supabase OK.')
    }
} testarConexao();

function autenticar(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        console.log('Autenticacao erro 401: Não autenticado')
        return res.status(401).json({ mensagem: 'Não autenticado' });
    }
    try {
        req.usuario = verificarToken(token);
        next();
    } catch {
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

app.get('/me', autenticar, async (req, res) => {
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
            console.log("/me: Usuario não existe ou inativo")
            return res.status(401).json({ mensagem: 'Sessão inválida' });
        }
        console.log("/me: Retornado o status do usuario " + data.nome)
        return res.status(200).json({ status_usuario: data.status_usuario, tipo: data.tipo });
    }

    // req.usuario já vem do middleware, mas revalida contra o banco
    // pra pegar dados atualizados (ex: se foi inativado depois do token ser emitido)
    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, email, tipo, status_usuario')
        .eq('id_usuario', req.usuario.id_usuario)
        .single();

    if (error || data.status_usuario === 'Inativo') {
        console.log("/me: Usuario não existe ou inativo")
        return res.status(401).json({ mensagem: 'Sessão inválida' });
    }
    console.log("/me: Usuario autenticado")
    return res.status(200).json({ id_usuario: data.id_usuario, nome: data.nome, tipo: data.tipo });
});

// ROTA DE LOGIN
app.post('/login', limitadorLogin, validar(schemaEmail, schemaSenha), async (req, res) => {
    const { email, senha } = req.body;

    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, senha_hash, status_usuario, tipo, status_reset_senha')
        .eq('email', email)
        .single();

    // Erro OU usuário não encontrado — checa isso PRIMEIRO
    if (error || !usuario) {
        console.log('/login: Erro ao buscar usuário:', error.message);
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

    return res.status(200).json({
        mensagem: 'Login realizado com sucesso',
        usuario: { id: usuario.id_usuario, nome: usuario.nome, tipo: usuario.tipo }
    });
});

app.post('/confirmar-senha', limitadorLogin, autenticar, validar(schemaSenha), async (req, res) => {
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
app.post('/logout', limitadorCodigo, (req, res) => {
    res.clearCookie('token');
    console.log('/logout: Logout realizado')
    return res.status(200).json({ mensagem: 'Logout realizado' });
});

app.post('/solicitar-codigo', limitadorCodigo, validar(schemaNome, schemaEmail, schemaSenha), async (req, res) => {
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

app.post('/confirmar-cadastro', limitadorCadastro, validar(schemaNome, schemaEmail, schemaCodigo, schemaSenha), async (req, res) => {
    const { nome, senha, codigoDigitado } = req.body ?? {};
    const email = normalizarEmail(req.body?.email);
    try {
        const senha_hash = await gerarHashSenha(senha);
        const resultado = await codigos.validarCodigo(email, String(codigoDigitado), 'cadastro');
        if (!resultado.valido) {
            console.log('/confirmar-cadastro: >>>>> ' + resultado.motivo);
            return res.status(401).json({ mensagem: resultado.motivo });
        }
        const { error } = await supabase.from('usuarios').insert({ nome, email, senha_hash });
        if (error) throw new Error('Falha ao cadastrar usuário');
        try {
            await enviarEmail({
                destinatarioEmail: email, destinatarioNome: nome,
                assunto: 'Bem-vindo ao CashLand!',
                conteudoHtml: `<h1>Olá, ${nome}!</h1><p>Sua conta foi criada com sucesso.</p>`
            });
        } catch {
            console.log('/confirmar-cadastro: >>>>> Usuário criado, mas o envio do email de boas-vindas falhou');
            return res.status(201).json({ mensagem: 'Usuario criado, mas o email de confirmação não foi enviado' });
        }
        console.log('/confirmar-cadastro: Cadastro realizado com sucesso');
        return res.status(200).json({ mensagem: 'Cadastro realizado com sucesso, prossiga para o login!' });
    } catch {
        console.log('/confirmar-cadastro: >>>>> Falha ao validar código ou cadastrar usuário');
        return res.status(500).json({ mensagem: 'Erro ao cadastrar usuário' });
    }
});

app.post('/solicitar-reset-senha', limitadorCodigo, validar(schemaEmail), async (req, res) => {
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

app.post('/confirmar-reset-senha', limitadorCodigo, validar(schemaEmail, schemaCodigo, schemaNovaSenha), async (req, res) => {
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
            console.log('/confirmar-reset-senha: >>>>> ' + resultado.motivo);
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
        console.log('/confirmar-reset-senha: Senha alterada com sucesso');
        return res.status(200).json({ mensagem: 'Senha alterada com sucesso!' });
    } catch {
        console.log('/confirmar-reset-senha: >>>>> Falha ao validar código ou atualizar senha');
        return res.status(500).json({ mensagem: 'Erro ao processar sua solicitação' });
    }
});

// ROTAS ACESSO USUARIO COMUM

app.get('/usuario', autenticar, async (req, res) => {
    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, email, status_usuario, data_criacao')
        .eq('id_usuario', req.usuario.id_usuario)
        .single();

    if (error || data.status_usuario === 'Inativo') {
        console.log("/usuario: Usuario não existe ou inativo")
        return res.status(401).json({ mensagem: 'Sessão inválida' });
    }
    console.log("/usuario: todos os dados retornados")
    return res.status(200).json(data);
})

app.patch('/usuario/desativar-usuario', autenticar, async (req, res) => {

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

    const { error } = await supabase
        .from('usuarios')
        .update({ status_usuario: 'Inativo', data_inativacao: new Date().toISOString() })
        .eq('id_usuario', req.usuario.id_usuario)

    if (error) {
        console.log("/usuario: Usuario não existe, inativo ou sessao invalida")
        return res.status(401).json({ mensagem: 'Erro ao desativar a conta, tente novamente mais tarde' });
    }
    console.log("/usuario/desativar-conta: Usuario " + consulta.nome + " desativado")
    return res.status(200).json({ mensagem: "Usuario desativado com sucesso" })
})

app.patch('/usuario/atualizar-dados', autenticar, validar(schemaNome), async (req, res) => {
    const { nome } = req.body

    const { error } = await supabase
        .from('usuarios')
        .update({ nome: nome })
        .eq('id_usuario', req.usuario.id_usuario)

    if (error) {
        console.log("/usuario/atualizar-dados: Erro em atualizar usuario - " + error)
        return res.status(500).json({ mensagem: "Erro em atualizar usuario - " + error })
    }

    console.log("/usario/atualizar-dados: Dados atualizados com sucesso")
    return res.status(200).json({ mensagem: "Dados atualizados com sucesso" })
})

// ROTAS DE ACESSO RESTRITO (Admin)

app.get('/admin/listar-usuarios', autenticar, somenteAdmin, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { pesquisa } = req.query;

    if (!pesquisa || pesquisa === "") {
        console.log("/admin/listar-usuarios: Pesquisa para listar usuario vazio")
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, tipo, status_usuario, data_criacao, data_inativacao')
            .order('id_usuario', { ascending: true })
        if (error) {
            console.log("/admin/listar-usuarios: Erro ao retornar as mensagens do banco de dados: " + error.message)
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
    console.log("/admin/listar-usuarios: Dados filtrados por '" + pesquisa + "' Retornados")
    return res.status(201).json(data);
});

app.get('/admin/usuario', autenticar, somenteAdmin, async (req, res) => {
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
            console.log("/usuario: Usuario não existe ou inativo")
            return res.status(401).json({ mensagem: 'Usuario não existe ou inativo' });
        }
        console.log("/usuario: todos os dados do id: " + id + " retornados")
        return res.status(200).json(data);
    } else {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, status_usuario, data_criacao, data_inativacao')
            .eq('id_usuario', req.usuario.id_usuario)
            .single();

        if (error) {
            console.log("/usuario: Usuario não existe ou inativo")
            return res.status(401).json({ mensagem: 'Usuario não existe ou inativo' });
        }
        console.log("/usuario: todos os dados do id: " + req.usuario.id_usuario + " retornados")
        return res.status(200).json(data);
    }
})

app.patch('/admin/editar-usuario', autenticar, somenteAdmin, validar(schemaId, schemaNome, schemaEmail), async (req, res) => {
    const { id, nome, email } = req.body

    const { error } = await supabase
        .from('usuarios')
        .update({ nome: nome, email: email })
        .eq('id_usuario', id)

    if (error) {
        console.log("/uadmin/editar-usuario: Erro em atualizar usuario - " + error)
        return res.status(500).json({ mensagem: "Erro em atualizar usuario - " + error })
    }

    console.log("/admin/editar-usuario: Dados atualizados com sucesso")
    return res.status(200).json({ mensagem: "Dados atualizados com sucesso" })
})

app.patch('/admin/resetar-senha', autenticar, somenteAdmin, async (req, res) => {
    const { id } = req.body

    //Verifica que o reset já foi solicitado
    const { data: consulta, error: errorConsulta } = await supabase
        .from('usuarios')
        .select('status_reset_senha')
        .eq('id_usuario', id)
        .single()
    if (errorConsulta) {
        console.log("/admin/resetar-senha: >>>>> Consulta -> " + errorConsulta.message)
        return res.status(500).json({ mensagem: "Ocorreu um erro ao consultar o usuario, verifique os logs" })
    }
    if (consulta.status_reset_senha === true) {
        console.log("/admin/resetar-senha: >>>>> A solicitação de reset já foi feita")
        return res.status(400).json({ mensagem: "Já foi feita uma solicitação de reset de senha para este usuario" })
    }

    // Solicita o reset da senha
    const { error } = await supabase
        .from('usuarios')
        .update({ status_reset_senha: true })
        .eq('id_usuario', id)
    if (error) {
        console.log("/admin/resetar-senha: >>>>> " + error.message)
        return res.status(501).json({ mensagem: "Ocorreu um erro com sua solicitação, verifique os logs" })
    }
    console.log("/admin/resetar-senha: Solicitação de reset realizada com sucesso")
    return res.status(200).json({ mensagem: "Solicitação de reset da senha realizada" })

})

app.patch('/admin/reativar-usuario', autenticar, somenteAdmin, async (req, res) => {
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
    const { error } = await supabase
        .from('usuarios')
        .update({ status_usuario: 'Ativo', data_inativacao: null })
        .eq('id_usuario', id)

    if (error) {
        console.log("/admin/reativar-usuario: Usuario não existe, inativo ou sessao invalida")
        return res.status(401).json({ mensagem: 'Erro ao reativar a conta, tente novamente mais tarde' });
    }
    console.log("/admin/reativar-usuario: Usuario " + consulta.nome + " reativado")
    return res.status(200).json({ mensagem: "Usuario reativado com sucesso" })
})

app.patch('/admin/desativar-usuario', autenticar, somenteAdmin, async (req, res) => {
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
        console.log("/admin/desativar-usuario: Usuário não encontrado");
        return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }
    console.log(consulta)

    if (consulta.tipo === 'Admin') {
        console.log("/admin/desativar-usuario: >>>>> Admin não pode desativar própria conta ou de outro admin");
        return res.status(403).json({ mensagem: "Admin não pode desativar própria conta ou de outro admin" });
    }

    if (consulta.status_usuario === 'Inativo') {
        console.log("/admin/desativar-usuario: Usuario já está desativado");
        return res.status(400).json({ mensagem: "Usuario já está desativado" });
    }

    const { error } = await supabase
        .from('usuarios')
        .update({ status_usuario: 'Inativo', data_inativacao: new Date().toISOString() })
        .eq('id_usuario', id);

    if (error) {
        console.log("/admin/desativar-usuario: Erro ao desativar - " + error.message);
        return res.status(500).json({ mensagem: 'Erro ao desativar a conta, tente novamente mais tarde' });
    }

    console.log("/admin/desativar-usuario: Usuario " + consulta.nome + " desativado");
    return res.status(200).json({ mensagem: "Usuario desativado com sucesso" });
})

app.delete('/admin/deletar-usuario', autenticar, somenteAdmin, async (req, res) => {
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
        console.log("/admin/desativar-usuario: Usuário não encontrado");
        return res.status(404).json({ mensagem: "Usuário não encontrado" });
    }
    console.log(consulta)

    if (consulta.tipo === 'Admin') {
        console.log("/admin/deletar-usuario: >>>>> Admin não pode deletar própria conta ou de outro admin");
        return res.status(403).json({ mensagem: "Admin não pode deletar própria conta ou de outro admin" });
    }
    const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('id_usuario', id_usuario)

    if (error) {
        console.log("admin/deletar-usuario: Erro a deletar o ususario, verifique o banco de dados")
        return res.status(500).json({ mensagem: "Erro ao deletar o usuario, verifique o banco de dados" })
    }
    console.log("admin/deletar-usuario: Operação com sucesso, usuario deletado permanentemente")
    return res.status(200).json({ mensagem: "Operação com sucesso, usuario deletado permanentemente" })
})

// IMPORTANTE: Ultima rota do sistema para redirecionar em caso de rota não existir
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public/tela_erro_404.html'));
});
// O Render (e a maioria dos provedores de hospedagem) define a porta
// dinamicamente via variável de ambiente PORT. Localmente, cai no 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
