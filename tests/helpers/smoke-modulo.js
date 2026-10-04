import assert from 'node:assert/strict';
import Express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { LoggerHTTP } from '../../src/middlewares/LoggerHTTP.js';

const modulo = process.argv[2];
const app = Express();
app.use(LoggerHTTP, Express.json(), cookieParser());
if (modulo === 'categorias') {
    app.use('/usuario', (await import('../../src/routes/categoriaRoutes.js')).default);
    app.use('/admin', (await import('../../src/routes/adminCategoriaRoutes.js')).default);
    await request(app).get('/usuario/listar-categoria').expect(401, { mensagem: 'Não autenticado' });
    await request(app).delete('/admin/deletar-categoria/1/2').expect(401, { mensagem: 'Não autenticado' });
} else if (modulo === 'usuarios') {
    app.use('/usuario', (await import('../../src/routes/usuarioRoutes.js')).default);
    app.use('/admin', (await import('../../src/routes/adminUsuarioRoutes.js')).default);
    await request(app).get('/usuario').expect(401, { mensagem: 'Não autenticado' });
    await request(app).delete('/admin/deletar-usuario/1').expect(401, { mensagem: 'Não autenticado' });
} else if (modulo === 'auth') {
    app.use((await import('../../src/routes/authRoutes.js')).default);
    const resposta = await request(app).post('/login').send({}).expect(400);
    assert.equal(resposta.body.mensagem, 'Dados inválidos.');
    await request(app).get('/me').expect(401, { mensagem: 'Não autenticado' });
} else {
    throw new Error('Informe categorias, usuarios ou auth');
}
console.log(`Smoke HTTP ${modulo}: OK`);
