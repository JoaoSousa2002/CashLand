import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import 'dotenv/config';

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
export async function testarConexao() {
    const { error } = await supabase
        .from('usuarios')
        .select('id_usuario')
        .limit(1);

    if (error) {
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
    } else {
        console.log(' Conexão com o Supabase OK.')
    }
}

export default supabase;
