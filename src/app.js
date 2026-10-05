import 'dotenv/config';
import Express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { LoggerHTTP } from './middlewares/LoggerHTTP.js';

import pageRoutes from './routes/pageRoutes.js';
import authRoutes from './routes/authRoutes.js';
import usuarioRoutes from './routes/usuarioRoutes.js';
import categoriaRoutes from './routes/categoriaRoutes.js';
import adminUsuarioRoutes from './routes/adminUsuarioRoutes.js';
import adminCategoriaRoutes from './routes/adminCategoriaRoutes.js';
import contasRoutes from './routes/contasFinanceirasRoutes.js'

// import criarContaFinanceira  from './routes/contasFinanceirasRoutes.js';
// import  listarContasFinanceiras from './routes/contasFinanceirasRoutes.js';
// import { editarConta } from './routes/contasFinanceirasRoutes.js'

// Array com as CORS local
let origemAutorizada = [];
if (process.env.ORIGEM_AUTORIZADA) {
    origemAutorizada = process.env.ORIGEM_AUTORIZADA.split(',').map(origin => origin.trim());
}

// __dirname não existe nativamente em ES Modules, então recriamos aqui.
// Isso garante que o Express.static funcione independente de onde o
// comando "node" é executado (importante no Render, onde o start command
// roda a partir da raiz do repositório).
const __dirname = fileURLToPath(new URL('./rf-001-Login/', import.meta.url));

const app = Express()
// Autoriza o acesso por proxy, necessario para funcionar no render
app.set('trust proxy', 1)
app.use(LoggerHTTP);
app.use(cors({ origin: origemAutorizada, credentials: true }));
app.use(Express.json())
app.use(cookieParser());
const swaggerSpec = JSON.parse(
    readFileSync(new URL('../docs/api/API-SWAGGER.json', import.meta.url))
);

//Rota da API SWAGGER UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/', pageRoutes);

app.use(Express.static(path.join(__dirname, 'public')));
app.use(Express.static(path.join(__dirname, '../rf-002-Cadastro_usuario/public')));
app.use(Express.static(path.join(__dirname, '../img')));

app.use('/', authRoutes);
app.use('/usuario', usuarioRoutes);
app.use('/usuario', categoriaRoutes);
app.use('/usuario', contasRoutes);
// app.use('/usuario', criarContaFinanceira);
// app.use('/usuario', listarContasFinanceiras);
// app.use('/usuario', );
app.use('/admin', adminUsuarioRoutes);
app.use('/admin', adminCategoriaRoutes);

// IMPORTANTE: Ultima rota do sistema para redirecionar em caso de rota não existir
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'public/tela_erro_404.html'));
});

export default app;
