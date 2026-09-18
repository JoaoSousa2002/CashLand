import { createClient } from '@supabase/supabase-js'
import { enviarEmail, gerarCodigo, salvarCodigo, validarCodigo } from '../rf-002-Cadastro_usuario/Email.js';
import { gerarHashSenha, validarSenha, gerarToken, verificarToken } from './Autenticacao.js'
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
    max: 5, // só 5 tentativas de login por IP a cada 5 min
    handler: (req, res) => {
        console.log(`Rate limit atingido pelo IP: ${req.ip}`);
        res.status(429).json({ mensagem: 'Muitas tentativas de login realizadas. Tente novamente em 5 minutos.' });
    }
});
const limitadorCadastro = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // só 5 tentativas de login por IP a cada 15 min
    handler: (req, res) => {
        console.log(`Rate limit atingido pelo IP: ${req.ip}`);
        res.status(429).json({ mensagem: 'Muitas tentativas de cadastro realizadas. Tente novamente em 15 minutos.' });
    }
});
const limitadorCodigo = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // só 5 tentativas de login por IP a cada 15 min
    handler: (req, res) => {
        console.log(`Rate limit atingido pelo IP: ${req.ip}`);
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
app.use('/login', Express.static(path.join(__dirname, 'public/tela_login.html')))
app.use('/cadastro-usuario', Express.static(path.join(__dirname, '../rf-002-Cadastro_usuario/public/cadastrar_usuario.html')))
app.use('/resetar-senha', Express.static(path.join(__dirname, 'public/reset_senha.html')))
app.use('/tela-principal', Express.static(path.join(__dirname, 'public/tela_principal.html')))
app.use('/tela-admin', Express.static(path.join(__dirname, 'public/tela_admin.html')))
app.use('/listar-usuarios', Express.static(path.join(__dirname, '../rf-002-Cadastro_usuario/public/listar_usuarios.html')))


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
        return res.status(401).json({ mensagem: 'Não autenticado' });
    }
    try {
        req.usuario = verificarToken(token);
        next();
    } catch {
        return res.status(401).json({ mensagem: 'Token inválido ou expirado' });
    }
}

function somenteAdmin(req, res, next) {
    if (req.usuario.tipo !== 'Admin') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores' });
    }
    next();
}

app.get('/me', autenticar, async (req, res) => {
    // req.usuario já vem do middleware, mas revalida contra o banco
    // pra pegar dados atualizados (ex: se foi inativado depois do token ser emitido)
    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, email, tipo, status_usuario')
        .eq('id_usuario', req.usuario.id_usuario)
        .single();

    if (error || data.status_usuario === 'Inativo') {
        console.log("Usuario não existe ou inativo")
        return res.status(401).json({ mensagem: 'Sessão inválida' });
    }
    console.log("Deu certo o /me")
    return res.status(200).json({ id_usuario: data.id_usuario, nome: data.nome, tipo: data.tipo });
});

// ROTA DE LOGIN
app.post('/login', limitadorLogin, async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'Email e senha são obrigatórios' });
    }

    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, senha_hash, status_usuario, tipo') // adicionado tipo
        .eq('email', email)
        .single();

    // Erro OU usuário não encontrado — checa isso PRIMEIRO
    if (error || !usuario) {
        console.log('Erro ao buscar usuário:', error?.message);
        return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    // Só chega aqui se usuario existir de verdade
    if (usuario.status_usuario === 'Inativo') {
        return res.status(403).json({ erro: 'Conta inativa. Contate o administrador.' });
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

// ROTA DE LOGOUT
app.post('/logout', limitadorCodigo, (req, res) => {
    res.clearCookie('token');
    console.log('Logout realizado')
    return res.status(200).json({ mensagem: 'Logout realizado' });
});
// ROTA PARA VERIFICAR SE O EMAIL EXISTE
app.post('/solicitar-codigo', limitadorCodigo, async (req, res) => {
    const { nome, email } = req.body;


    // 3. O backend recebe o email e verifica se é valido (inicialmente)
    if (!nome || !email || !email.includes('@') || !email.includes(".com")) {
        return res.status(400).json({ mensagem: 'Dados inválidos ou incompletos' });
    }

    // 5. Verifica se o email recebido já está cadastrado e retorna erro com status 409 se sim
    const { data } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', email)
        .maybeSingle()  // Se a lista existir, retorna ela, se não, não retorna nada

    if (data) {
        return res.status(409).json({ mensagem: "Esse email já está cadastrado" })
    }
    // se o email não está cadastrado, continua com o cadastro
    else {
        //Verificar email com codigo aleatorio
        try {
            const codigo = gerarCodigo();
            salvarCodigo(email, codigo);
            await enviarEmail({
                destinatarioEmail: email,
                destinatarioNome: nome,
                assunto: 'Seu código de verificação',
                conteudoHtml: `<html><body>
        <h2>Código de verificação</h2>
        <p>Use o código abaixo para continuar:</p>
        <h1 style="letter-spacing: 4px;">${codigo}</h1>
        <p>Esse código expira em 10 minutos.</p>
      </body></html>`
            });
            console.log("Codigo enviado - Server side");
            return res.status(200).json({ mensagem: "Codigo enviado para o email!" })
        } catch (erro) {
            console.error('O envio de email falhou:', erro);
            return res.status(500).json({ mensagem: "O envio de email falhou!", erro })
        }
    }
});

// ROTA PARA CRIAR O CADASTRO
app.post('/confirmar-cadastro', limitadorCadastro, async (req, res) => {
    const { nome, email, senha, codigoDigitado } = req.body;

    if (!nome || !email || !email.includes('@') || !email.includes(".com") || !senha || senha.length < 10 || !codigoDigitado) {
        console.log("Dados invalido ou incompletos")
        return res.status(400).json({ mensagem: 'Dados inválidos ou incompletos' });
    }
    const resultado = validarCodigo(email, codigoDigitado)

    if (resultado.valido) {
        const { error } = await supabase
            .from('usuarios')
            .insert({
                nome: nome,
                email: email,
                senha_hash: await gerarHashSenha(senha)

            })
        if (error) {
            console.log('Erro ao criar:', error.message);
            return res.status(500).json({ mensagem: "Erro ao cadastrar usuário" });
        } else {
            try {
                await enviarEmail({
                    destinatarioEmail: email,
                    destinatarioNome: nome,
                    assunto: 'Bem-vindo ao CashLand!',
                    conteudoHtml: `<h1>Olá, ${nome}!</h1><p>Sua conta foi criada com sucesso.</p>`
                });

            } catch (erro) {
                console.error('Usuário criado, mas email falhou:', erro);
                return res.status(201).json({ mensagem: "Usuario criado, mas o email de confirmação não foi enviado", erro })
                // normalmente não deve travar a resposta por causa do email
            }
        }
        console.log("Cadastro realizado com sucesso")
        return res.status(200).json({
            mensagem: "Cadastro realizado com sucesso, prossiga para o login!"
        });
    } else {
        console.log(resultado.motivo)
        return res.status(401).json({ mensagem: resultado.motivo })
    }

})

// ===== ROTAS PARA RECUPERAÇÃO DE SENHA (RF-001) =====

// ROTA 1 - Solicitar reset de senha
app.post('/solicitar-reset-senha', limitadorCodigo, async (req, res) => {
    const { email } = req.body;

    // Validação do email
    if (!email || !email.includes('@')) {
        return res.status(400).json({
            mensagem: 'Email inválido ou não informado'
        });
    }

    // Consultar se o email existe no banco
    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('nome, email')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        console.error('Erro ao consultar usuário:', error.message);
        return res.status(500).json({
            mensagem: 'Erro ao consultar usuário'
        });
    }

    if (!usuario) {
        return res.status(404).json({
            mensagem: 'Email não cadastrado'
        });
    }

    try {
        const codigo = gerarCodigo();
        salvarCodigo(email, codigo);

        await enviarEmail({
            destinatarioEmail: email,
            destinatarioNome: usuario.nome,
            assunto: 'Redefinição de senha - CashLand',
            conteudoHtml: `
                <html>
                    <body>
                        <h2>Redefinição de senha</h2>
                        <p>Olá, ${usuario.nome}!</p>
                        <p>Use o código abaixo para redefinir sua senha:</p>
                        <h1 style="letter-spacing: 4px;">
                            ${codigo}
                        </h1>
                        <p>Esse código expira em 10 minutos.</p>
                    </body>
                </html>
            `
        });

        return res.status(200).json({
            mensagem: 'Código enviado para o email!'
        });

    } catch (erro) {
        console.error('Erro ao enviar código:', erro);
        return res.status(500).json({
            mensagem: 'Não foi possível enviar o código'
        });
    }
});

// ROTA 2 - Confirmar reset de senha
app.post('/confirmar-reset-senha', limitadorCodigo, async (req, res) => {
    const { email, codigoDigitado, novaSenha } = req.body;

    // Validações
    if (!email || !codigoDigitado || !novaSenha || novaSenha.length < 10) {
        return res.status(400).json({
            mensagem: 'Dados inválidos ou incompletos'
        });
    }

    // Validar código
    const resultado = validarCodigo(email, String(codigoDigitado));

    if (!resultado.valido) {
        return res.status(400).json({
            mensagem: resultado.motivo
        });
    }

    try {
        // Gerar hash da nova senha
        const novaSenhaHash = await gerarHashSenha(novaSenha);

        // Atualizar senha no banco
        const { data: usuarioAtualizado, error } = await supabase
            .from('usuarios')
            .update({
                senha_hash: novaSenhaHash
            })
            .eq('email', email)
            .select('id_usuario')
            .maybeSingle();

        if (error) {
            console.error('Erro ao atualizar senha:', error.message);
            return res.status(500).json({
                mensagem: 'Erro ao atualizar senha'
            });
        }

        if (!usuarioAtualizado) {
            return res.status(404).json({
                mensagem: 'Usuário não encontrado'
            });
        }

        return res.status(200).json({
            mensagem: 'Senha alterada com sucesso!'
        });

    } catch (erro) {
        console.error('Erro ao processar reset de senha:', erro);
        return res.status(500).json({
            mensagem: 'Erro ao processar sua solicitação'
        });
    }
});


// ROTAS DE ACESSO RESTRITO (Admin)

app.get('/listar-usuarios', autenticar, somenteAdmin, limitadorCodigo, async (req, res) => {
    res.set('Cache-Control', 'no-store');
    const { pesquisa } = req.query;

    if (!pesquisa || pesquisa === "") {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, tipo, status_usuario, data_criacao, data_inativacao')

        if (error) return res.status(500).json({ erro: error.message });
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
        .or(condicoes.join(','));

    if (error) return res.status(500).json({ erro: error.message });
    return res.status(200).json(data);
});

// O Render (e a maioria dos provedores de hospedagem) define a porta
// dinamicamente via variável de ambiente PORT. Localmente, cai no 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});