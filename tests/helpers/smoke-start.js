import assert from 'node:assert/strict';
import { once } from 'node:events';
import app from '../../src/app.js';
import supabase from '../../src/config/supabase.js';

// Exercita o entrypoint sem consultar o Supabase configurado no .env.
supabase.from = () => ({ select: () => ({ limit: async () => ({ error: null }) }) });
process.env.PORT = '0';
const listen = app.listen.bind(app);
let servidor;
app.listen = (...args) => {
    servidor = listen(...args);
    return servidor;
};
if (process.argv[2] === 'legado') {
    await import('../../src/rf-001-Login/Servidor.js');
} else {
    await import('../../src/server.js');
}
try {
    if (!servidor.listening) await once(servidor, 'listening');
    const resposta = await fetch(`http://127.0.0.1:${servidor.address().port}/login`);
    assert.equal(resposta.status, 200);
    await resposta.text();
    console.log('Inicialização e resposta HTTP: OK (conexão de teste simulada)');
} finally {
    await new Promise((resolve, reject) => servidor.close(erro => {
        if (erro) reject(erro);
        else resolve();
    }));
}
