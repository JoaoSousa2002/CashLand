import { createClient } from '@supabase/supabase-js'
import { gerarHashSenha, validarSenha } from './Autenticacao.js'
import Express from 'express'
import cors from 'cors'
import ws from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'
import 'dotenv/config'

// __dirname não existe nativamente em ES Modules, então recriamos aqui.
// Isso garante que o Express.static funcione independente de onde o
// comando "node" é executado (importante no Render, onde o start command
// roda a partir da raiz do repositório).
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = Express()

app.use(cors({ origin: 'http://127.0.0.1:5500' }));
app.use(Express.json())

// Serve o frontend (public/index.html e outros arquivos estáticos)
// diretamente pelo Express. Isso faz o frontend e o backend viverem
// no mesmo domínio quando publicado, eliminando qualquer problema de CORS
// em produção. Localmente, você ainda pode usar o Live Server se preferir.
app.use(Express.static(path.join(__dirname, 'public')))

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    {
        realtime: {
            transport: ws
        }
    }
)

app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ mensagem: 'Email e senha são obrigatórios' });
    }

    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, senha_hash')
        .eq('email', email)
        .single();

    if (error) {
        // Log só do erro técnico no servidor (nunca a senha do usuário).
        console.log('Erro ao buscar usuário:', error.message);
        return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    const senhaCorreta = await validarSenha(senha, usuario.senha_hash);

    if (!senhaCorreta) {
        return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    res.status(200).json({
        mensagem: 'Login realizado com sucesso',
        usuario: { id: usuario.id_usuario, nome: usuario.nome }
    });
})

// O Render (e a maioria dos provedores de hospedagem) define a porta
// dinamicamente via variável de ambiente PORT. Localmente, cai no 3000.
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});