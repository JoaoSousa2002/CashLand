import 'dotenv/config';
import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import request from 'supertest';
import { observarLogs } from './helpers/auditoria.js';

let pular = false;
if (process.env.CASHLAND_E2E !== '1') {
    pular = 'E2E requer Supabase separado: configure SUPABASE_TEST_URL e SUPABASE_TEST_SECRET_KEY no .env e execute npm run test:idor';
}

describe('IDOR E2E — Express, login real, cookies e Supabase de teste', { skip: pular, concurrency: false }, () => {
    let app;
    let banco;
    let gerarHashSenha;
    let a;
    let b;
    let admin;
    let categoriaA;
    let categoriaB;
    const prefixo = `idor-${randomUUID()}`;
    const emails = ['a', 'b', 'admin'].map(papel => `${prefixo}-${papel}@example.com`);
    const senha = randomBytes(24).toString('hex');
    let sequenciaIP = 0;

    function cliente(usuario) {
        sequenciaIP += 1;
        const ip = `198.51.100.${sequenciaIP}`;
        return (metodo, caminho) => {
            const chamada = request(app)[metodo](caminho).set('X-Forwarded-For', ip);
            if (usuario?.cookies) {
                chamada.set('Cookie', usuario.cookies);
            }
            return chamada;
        };
    }

    function verificarBanco(resultado, operacao) {
        // Erros brutos podem conter dados da conexão; não os imprimir.
        if (resultado.error) {
            throw new Error(`Falha no Supabase de teste: ${operacao}`);
        }
        return resultado.data;
    }

    async function buscarUsuario(usuario) {
        const resultado = await banco.from('usuarios').select('*').eq('id_usuario', usuario.id_usuario).single();
        return verificarBanco(resultado, 'consultar usuário temporário');
    }

    async function buscarCategoria(categoria) {
        const resultado = await banco.from('categorias').select('*').eq('id_categoria', categoria.id_categoria).maybeSingle();
        return verificarBanco(resultado, 'consultar categoria temporária');
    }

    function verificarAuditoria(eventos, status, rota) {
        const evento = eventos.find(e => e.tipo_evento === 'AUDITORIA' && e.rota === rota && e.detalhes.status_http === status);
        assert.ok(evento, `Auditoria ausente para ${rota}: ${status}`);
        if (status === 403) {
            assert.equal(evento.resultado, 'NEGADO');
        } else if (status === 404 || status === 409) {
            assert.equal(evento.resultado, 'FALHA');
        }
    }

    before(async () => {
        assert.ok(process.env.SUPABASE_TEST_URL, 'Configure SUPABASE_TEST_URL no .env');
        assert.ok(process.env.SUPABASE_TEST_SECRET_KEY, 'Configure SUPABASE_TEST_SECRET_KEY no .env');
        assert.ok(process.env.SEGREDO_JWT, 'Configure SEGREDO_JWT no .env');
        // A suíte nunca usa implicitamente o banco da aplicação.
        if (process.env.SUPABASE_URL) {
            assert.notEqual(new URL(process.env.SUPABASE_TEST_URL).origin, new URL(process.env.SUPABASE_URL).origin,
                'O Supabase de teste precisa ser separado do banco da aplicação');
        }
        process.env.SUPABASE_URL = process.env.SUPABASE_TEST_URL;
        process.env.SUPABASE_SECRET_KEY = process.env.SUPABASE_TEST_SECRET_KEY;
        ({ default: banco } = await import('../src/config/supabase.js'));
        ({ default: app } = await import('../src/app.js'));
        ({ gerarHashSenha } = await import('../src/rf-001-Login/Autenticacao.js'));
        const senha_hash = await gerarHashSenha(senha);
        const usuarios = verificarBanco(await banco.from('usuarios').insert([
            { nome: 'IDOR Usuario A', email: emails[0], senha_hash, tipo: 'Comum', status_usuario: 'Ativo', status_reset_senha: false },
            { nome: 'IDOR Usuario B', email: emails[1], senha_hash, tipo: 'Comum', status_usuario: 'Ativo', status_reset_senha: false },
            { nome: 'IDOR Administrador', email: emails[2], senha_hash, tipo: 'Admin', status_usuario: 'Ativo', status_reset_senha: false }
        ]).select('id_usuario,nome,email,tipo'), 'criar usuários temporários');
        a = usuarios.find(u => u.email === emails[0]);
        b = usuarios.find(u => u.email === emails[1]);
        admin = usuarios.find(u => u.email === emails[2]);
        for (const usuario of [a, b, admin]) {
            const http = cliente();
            const resposta = await http('post', '/login').send({ email: usuario.email, senha }).expect(200);
            assert.equal(resposta.body.mensagem, 'Login realizado com sucesso');
            assert.ok(resposta.headers['set-cookie']);
            usuario.cookies = resposta.headers['set-cookie'];
            await cliente(usuario)('get', '/me').expect(200, { id_usuario: usuario.id_usuario, nome: usuario.nome, tipo: usuario.tipo });
            await cliente(usuario)('post', '/usuario/criar-categoria')
                .send({ nome: `${prefixo}-${usuario.tipo}-${usuario.id_usuario}`, descricao: 'Registro temporário IDOR' })
                .expect(200, { mensagem: 'Categoria criada com sucesso' });
        }
        const categorias = verificarBanco(await banco.from('categorias').select('*')
            .in('id_usuario', [a.id_usuario, b.id_usuario]).like('nome', `${prefixo}%`), 'consultar categorias temporárias');
        categoriaA = categorias.find(c => c.id_usuario === a.id_usuario);
        categoriaB = categorias.find(c => c.id_usuario === b.id_usuario);
        assert.ok(categoriaA && categoriaB);
    });

    after(async () => {
        if (!banco) return;
        // Inclui limpeza após setup parcialmente concluído, sempre por emails exclusivos desta execução.
        const usuarios = verificarBanco(await banco.from('usuarios').select('id_usuario').in('email', emails), 'localizar registros para limpeza');
        if (!usuarios.length) return;
        const ids = usuarios.map(u => u.id_usuario);
        verificarBanco(await banco.from('categorias').delete().in('id_usuario', ids), 'remover categorias temporárias');
        verificarBanco(await banco.from('usuarios').delete().in('id_usuario', ids).in('email', emails), 'remover usuários temporários');
    });

    test('A não edita categoria de B; o proprietário consegue editar sua própria categoria', async t => {
        const eventos = observarLogs(t);
        const antes = await buscarCategoria(categoriaB);
        await cliente(a)('patch', '/usuario/editar-categoria')
            .send({ id_categoria: categoriaB.id_categoria, nome: 'Tentativa indevida', descricao: 'Tentativa IDOR' })
            .expect(404, { mensagem: 'Essa categoria não existe' });
        assert.deepEqual(await buscarCategoria(categoriaB), antes);
        verificarAuditoria(eventos, 404, 'USER_EDITAR_CATEGORIA');
        await cliente(a)('patch', '/usuario/editar-categoria')
            .send({ id_categoria: categoriaA.id_categoria, nome: `${prefixo}-propria`, descricao: 'Alteração permitida' })
            .expect(200, { mensagem: 'Categoria atualizada com sucesso.' });
        assert.equal((await buscarCategoria(categoriaA)).nome, `${prefixo}-propria`);
    });

    test('A não exclui categoria de B manipulando o ID da URL', async t => {
        const eventos = observarLogs(t);
        const antes = await buscarCategoria(categoriaB);
        await cliente(a)('delete', `/usuario/deletar-categoria/${categoriaB.id_categoria}`)
            .expect(404, { mensagem: 'Essa categoria não existe' });
        assert.deepEqual(await buscarCategoria(categoriaB), antes);
        verificarAuditoria(eventos, 404, 'USER_DELETAR_CATEGORIA');
    });

    test('A não visualiza categoria de B por nome, ID ou filtros manipulados', async t => {
        const eventos = observarLogs(t);
        const http = cliente(a);
        await http('get', '/usuario/listar-categoria').query({ pesquisa: categoriaB.id_categoria })
            .expect(404, { mensagem: 'Essa categoria não existe' });
        await http('get', '/usuario/listar-categoria').query({ pesquisa: categoriaB.nome }).expect(200, []);
        const resposta = await http('get', '/usuario/listar-categoria')
            .query({ id_usuario: b.id_usuario, id_categoria: categoriaB.id_categoria }).expect(200);
        assert.ok(resposta.body.some(c => c.id_categoria === categoriaA.id_categoria));
        assert.ok(!resposta.body.some(c => c.id_categoria === categoriaB.id_categoria));
        verificarAuditoria(eventos, 404, 'USER_LISTAR_CATEGORIA');
    });

    test('atualização pessoal rejeita ID no body e ignora ID na query; somente A é alterado', async () => {
        const antes = await buscarUsuario(b);
        const http = cliente(a);
        const invalido = await http('patch', '/usuario/atualizar-dados')
            .send({ id_usuario: b.id_usuario, nome: 'Nome indevido' }).expect(400);
        assert.equal(invalido.body.mensagem, 'Dados inválidos.');
        await http('patch', '/usuario/atualizar-dados').query({ id_usuario: b.id_usuario })
            .send({ nome: 'Nome do proprio usuario A' }).expect(200, { mensagem: 'Dados atualizados com sucesso' });
        assert.equal((await buscarUsuario(a)).nome, 'Nome do proprio usuario A');
        assert.deepEqual(await buscarUsuario(b), antes);
    });

    test('A não consulta a sessão de B manipulando /me', async t => {
        const eventos = observarLogs(t);
        await cliente(a)('get', '/me').query({ id_usuario: b.id_usuario })
            .expect(403, { mensagem: 'Acesso restrito a adminstradores' });
        verificarAuditoria(eventos, 403, 'CONSULTAR_SESSAO');
    });

    test('usuário comum não acessa nenhum endpoint admin de categorias', async t => {
        const eventos = observarLogs(t);
        const antes = await buscarCategoria(categoriaB);
        for (const [metodo, caminho, body] of [
            ['get', `/admin/listar-categoria?id_usuario=${b.id_usuario}`, undefined],
            ['patch', '/admin/editar-categoria', { id_categoria: categoriaB.id_categoria, nome: 'Tentativa admin', descricao: '' }],
            ['delete', `/admin/deletar-categoria/${categoriaB.id_categoria}/${b.id_usuario}`, undefined]
        ]) {
            await cliente(a)(metodo, caminho).send(body).expect(403, { erro: 'Acesso restrito a administradores' });
        }
        assert.deepEqual(await buscarCategoria(categoriaB), antes);
        for (const acao of ['ADMIN_LISTAR_CATEGORIA', 'ADMIN_EDITAR_CATEGORIA', 'ADMIN_DELETAR_CATEGORIA']) {
            verificarAuditoria(eventos, 403, acao);
        }
    });

    test('usuário comum não acessa nenhum endpoint administrativo de usuário', async t => {
        const eventos = observarLogs(t);
        const antes = await buscarUsuario(b);
        const rotas = [
            ['get', '/admin/listar-usuarios', undefined],
            ['get', `/admin/usuario?id_usuario=${b.id_usuario}`, undefined],
            ['patch', '/admin/editar-usuario', { id_usuario: b.id_usuario, nome: 'Nome indevido', email: b.email }],
            ['patch', '/admin/resetar-senha', { id_usuario: b.id_usuario }],
            ['patch', '/admin/desativar-usuario', { id_usuario: b.id_usuario }],
            ['patch', '/admin/reativar-usuario', { id_usuario: b.id_usuario }],
            ['delete', `/admin/deletar-usuario/${b.id_usuario}`, undefined]
        ];
        for (const [metodo, caminho, body] of rotas) {
            await cliente(a)(metodo, caminho).send(body).expect(403, { erro: 'Acesso restrito a administradores' });
        }
        assert.deepEqual(await buscarUsuario(b), antes);
        assert.equal(eventos.filter(e => e.tipo_evento === 'AUDITORIA' && e.detalhes.status_http === 403).length, rotas.length);
    });

    test('admin precisa informar o proprietário correto ao excluir categoria', async t => {
        const eventos = observarLogs(t);
        const antes = await buscarCategoria(categoriaB);
        await cliente(admin)('delete', `/admin/deletar-categoria/${categoriaB.id_categoria}/${a.id_usuario}`)
            .expect(404, { mensagem: 'Essa categoria não existe' });
        assert.deepEqual(await buscarCategoria(categoriaB), antes);
        verificarAuditoria(eventos, 404, 'ADMIN_DELETAR_CATEGORIA');
    });

    test('admin pode consultar, editar e excluir legitimamente recursos de B', async () => {
        const http = cliente(admin);
        const listagem = await http('get', '/admin/listar-categoria').query({ id_categoria: categoriaB.id_categoria }).expect(200);
        assert.equal(listagem.body.id_categoria, categoriaB.id_categoria);
        await http('patch', '/admin/editar-categoria')
            .send({ id_categoria: categoriaB.id_categoria, nome: `${prefixo}-admin`, descricao: 'Admin permitido' })
            .expect(200, { mensagem: 'Categora editada com sucesso' });
        assert.equal((await buscarCategoria(categoriaB)).nome, `${prefixo}-admin`);
        await http('patch', '/admin/editar-usuario').send({ id_usuario: b.id_usuario, nome: 'Usuario B editado pelo admin', email: b.email })
            .expect(200, { mensagem: 'Dados atualizados com sucesso' });
        assert.equal((await buscarUsuario(b)).nome, 'Usuario B editado pelo admin');
        await http('delete', `/admin/deletar-categoria/${categoriaB.id_categoria}/${b.id_usuario}`)
            .expect(200, { mensagem: 'Categoria deletada com sucesso' });
        assert.equal(await buscarCategoria(categoriaB), null);
    });

    test('auto-desativação usa a sessão de A, ignorando IDs de B enviados pelo cliente', async () => {
        const antes = await buscarUsuario(b);
        await cliente(a)('patch', '/usuario/desativar-usuario').query({ id_usuario: b.id_usuario })
            .send({ id_usuario: b.id_usuario }).expect(200, { mensagem: 'Usuario desativado com sucesso' });
        assert.equal((await buscarUsuario(a)).status_usuario, 'Inativo');
        assert.deepEqual(await buscarUsuario(b), antes);
        assert.equal((await buscarUsuario(b)).status_usuario, 'Ativo');
        await cliente(a)('get', '/me').expect(401, { mensagem: 'Sessão inválida' });
    });
});
