import { createClient } from '@supabase/supabase-js'
import { gerarHashSenha, validarSenha } from '../rf-001-Login/Autenticacao.js'
import Express from 'express'
import cors from 'cors'
import ws from 'ws'
import 'dotenv/config'

const app = Express()
app.use(cors())
app.use(Express.json())
app.use(cors({ origin: `http://127.0.0.1:5500` }));

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

    console.log(email, senha)

    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, senha_hash')
        .eq('email', email)
        .single();

    console.log(usuario)

    if (error ) {
        console.log(error)
        return res.status(401).json({ mensagem: 'Email ou senha inválidos 1' });
    }


    const senhaCorreta = await validarSenha(senha, usuario.senha_hash);

    if (!senhaCorreta) {
        return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    res.status(200).json({ mensagem: 'Login realizado com sucesso', usuario: { id: usuario.id_usuario, nome: usuario.nome } });
})

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});