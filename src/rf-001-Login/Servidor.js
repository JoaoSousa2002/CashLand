import { createClient } from '@supabase/supabase-js'
import { enviarEmail, gerarCodigo, salvarCodigo, validarCodigo } from '../rf-002-Cadastro_usuario/Email.js';
import { gerarHashSenha, validarSenha, } from './Autenticacao.js'
import Express from 'express'
import cors from 'cors'
import ws from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';

// __dirname não existe nativamente em ES Modules, então recriamos aqui.
// Isso garante que o Express.static funcione independente de onde o
// comando "node" é executado (importante no Render, onde o start command
// roda a partir da raiz do repositório).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Cors para autorizar acesso local para a porta 5500 (Padrão do live server)
const app = Express()
app.use(cors({ origin: 'http://127.0.0.1:5500' }));
app.use(Express.json())
const swaggerSpec = JSON.parse(
    readFileSync(new URL('../../docs/api/API-SWAGGER.json', import.meta.url))
);

//Rota da API SWAGGER UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// rotas de URL para direcionar o front-end
app.get('/', (req, res) => res.redirect('/login'));
app.use('/login', Express.static(path.join(__dirname, 'public')))

// Esse é o modelo para as proximas RFs - nome da rota e o caminho dela (até a pasta public, não precisa especificar o index.html)
app.use('/cadastro-usuario', Express.static(path.join(__dirname, '../rf-002-Cadastro_usuario/public')))
app.use('/resetar-senha', Express.static(path.join(__dirname, 'public/reset-senha')))


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

// Rotas da api
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;


    // Verifica se email ou senha estão vazios
    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'Email e senha são obrigatórios' });
    }

    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, senha_hash')
        .eq('email', email)
        .single();

    // Erro se o email não estiver cadastrado
    if (error) {
        // Log só do erro técnico no servidor (nunca a senha do usuário).
        console.log('Erro ao buscar usuário:', error.message);
        return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    // Compara a senha digitada com a senha hash do banco, retorna true ou false
    const senhaCorreta = await validarSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
        return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    } else {
        res.status(200).json({
            mensagem: 'Login realizado com sucesso',
            usuario: { id: usuario.id_usuario, nome: usuario.nome }
        });

    }

})

// ROTA PARA VERIFICAR SE O EMAIL EXISTE
app.post('/solicitar-codigo', async (req, res) => {
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

app.post('/confirmar-cadastro', async (req, res) => {
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

// Sistema de rate limiting simples para rotas de reset de senha
const tentativasResetSenha = new Map();
const LIMITE_TENTATIVAS = 3;
const TEMPO_BLOQUEIO_MS = 15 * 60 * 1000; // 15 minutos

function verificarRateLimitResetSenha(email) {
    const agora = Date.now();
    const registro = tentativasResetSenha.get(email);

    if (!registro) {
        tentativasResetSenha.set(email, { tentativas: 1, bloqueioAte: null });
        return { permitido: true, motivo: '' };
    }

    if (registro.bloqueioAte && agora < registro.bloqueioAte) {
        const tempoRestante = Math.ceil((registro.bloqueioAte - agora) / 1000);
        return { permitido: false, motivo: `Muitas tentativas. Tente novamente em ${tempoRestante} segundos` };
    }

    if (registro.bloqueioAte && agora >= registro.bloqueioAte) {
        tentativasResetSenha.delete(email);
        tentativasResetSenha.set(email, { tentativas: 1, bloqueioAte: null });
        return { permitido: true, motivo: '' };
    }

    if (registro.tentativas >= LIMITE_TENTATIVAS) {
        registro.bloqueioAte = agora + TEMPO_BLOQUEIO_MS;
        return { permitido: false, motivo: `Muitas tentativas. Tente novamente em ${Math.ceil(TEMPO_BLOQUEIO_MS / 1000)} segundos` };
    }

    registro.tentativas++;
    return { permitido: true, motivo: '' };
}

// ROTA 1 - Solicitar reset de senha
app.post('/solicitar-reset-senha', async (req, res) => {
    const { email } = req.body;

    // Validação do email
    if (!email || !email.includes('@')) {
        return res.status(400).json({
            mensagem: 'Email inválido ou não informado'
        });
    }

    // Verificar rate limit
    const verificacaoRateLimit = verificarRateLimitResetSenha(email);
    if (!verificacaoRateLimit.permitido) {
        return res.status(429).json({
            mensagem: verificacaoRateLimit.motivo
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
app.post('/confirmar-reset-senha', async (req, res) => {
    const { email, codigoDigitado, novaSenha } = req.body;

    // Validações
    if (!email || !codigoDigitado || !novaSenha || novaSenha.length < 10) {
        return res.status(400).json({
            mensagem: 'Dados inválidos ou incompletos'
        });
    }

    // Verificar rate limit
    const verificacaoRateLimit = verificarRateLimitResetSenha(email);
    if (!verificacaoRateLimit.permitido) {
        return res.status(429).json({
            mensagem: verificacaoRateLimit.motivo
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

        // Limpar tentativas de rate limit após sucesso
        tentativasResetSenha.delete(email);

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

// O Render (e a maioria dos provedores de hospedagem) define a porta
// dinamicamente via variável de ambiente PORT. Localmente, cai no 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});