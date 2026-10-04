import app from './app.js';
import { testarConexao } from './config/supabase.js';
import logger from './config/logger.js';

// Mantém o teste de conexão assíncrono da inicialização original.
testarConexao();

// O Render (e a maioria dos provedores de hospedagem) define a porta
// dinamicamente via variável de ambiente PORT. Localmente, cai no 3000.
let PORT = process.env.PORT;
if (!PORT) {
    PORT = 3000;
}
app.listen(PORT, () => {
    console.log("Servidor rodando na porta " + PORT)
    logger.info("Servidor CashLand iniciado", {
        porta: PORT,
        ambiente: process.env.NODE_ENV || "development"
    });
});
