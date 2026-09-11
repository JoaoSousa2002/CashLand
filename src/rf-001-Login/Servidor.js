import { createClient } from '@supabase/supabase-js'
import { gerarHashSenha, validarSenha } from './Autenticacao.js'
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
}
testarConexao();

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

app.post('/cadastro-usuario', async (req, res) => {
    const { nome, email, senha } = req.body;

    // Mesmos testes são feitos no front-end (index do RF-002), porem tambem adicionei no backend para segurança
    // !nome - Se nome estiver vazio
    // !email - Se email estiver vazio
    // !email.includes ('@') - Se o email contem '@'
    // !senha - Se a senha estiver vazio
    // senha.lent < 10 - Se a senha tiver menos de 10 caracteres
    if (!nome || !email || !email.includes('@') || !senha || senha.length < 10) {
        return res.status(400).json({ mensagem: 'Dados inválidos ou incompletos' });
    }

    // Verifica se o email recebido já está cadastrado e retorna erro com status 409 se sim
    const { data } = await supabase
        .from('usuarios')
        .select('email')
        .eq('email', email)
        .maybeSingle()  // Se a lista existir, retorna ela, se não, não retorna nada


    if (data) {
        res.status(409).json({ mensagem: "Esse email já está cadastrado" })
    }
    // se o email não está cadastrado, continua com o cadastro
    else {
        const { error } = await supabase
            .from('usuarios')
            .insert({
                nome: nome,
                email: email,
                senha_hash: await gerarHashSenha(senha)
            })

        if (error) {
            console.log('Erro ao criar:', error.message);
            return res.status(500).json({ mensagem: 'Erro ao cadastrar usuário' });
        } else {
            res.status(200).json({
                mensagem: 'Cadastro realizado com sucesso, prossiga para o login!',
            });
        }
    }


}

)

// O Render (e a maioria dos provedores de hospedagem) define a porta
// dinamicamente via variável de ambiente PORT. Localmente, cai no 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});