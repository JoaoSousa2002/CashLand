import supabase from '../config/supabase.js';
import { confirmarAlteracao } from '../middlewares/AuditoriaRota.js';
import { gerarHashSenha, validarSenha, gerarToken, verificarToken } from '../rf-001-Login/Autenticacao.js';
import { enviarEmail, normalizarEmail } from '../rf-002-Cadastro_usuario/Email.js';
import { codigos, buscarUsuario, emitirCodigo } from '../services/codigosService.js';

export async function consultarSessao(req, res) {
    const { id_usuario } = req.query

    if (id_usuario !== undefined && req.usuario.tipo !== 'Admin') {
        console.log("/usuario: Acesso negado - usuário comum tentou acessar outro ID");
        return res.status(403).json({ mensagem: 'Acesso restrito a adminstradores' });
    }
    if (id_usuario !== undefined) {
        const { data, error } = await supabase
            .from('usuarios')
            .select('id_usuario, nome, email, tipo, status_usuario')
            .eq('id_usuario', id_usuario)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                res.locals.auditoria.resultado = 'FALHA';
            } else {
                res.locals.auditoria.resultado = 'ERRO';
            }
            console.log("/me: Usuario não existe ou inativo")
            return res.status(401).json({ mensagem: 'Sessão inválida' });
        }
        console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
        return res.status(200).json({ status_usuario: data.status_usuario, tipo: data.tipo });
    }

    // req.usuario já vem do middleware, mas revalida contra o banco
    // pra pegar dados atualizados (ex: se foi inativado depois do token ser emitido)
    const { data, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, email, tipo, status_usuario')
        .eq('id_usuario', req.usuario.id_usuario)
        .single();

    if (error) {
        if (error.code === 'PGRST116') {
            res.locals.auditoria.resultado = 'FALHA';
        } else {
            res.locals.auditoria.resultado = 'ERRO';
        }
    }
    if (error || data.status_usuario === 'Inativo') {
        console.log("/me: Usuario não existe ou inativo")
        return res.status(401).json({ mensagem: 'Sessão inválida' });
    }
    console.log("/me: Usuario autenticado")
    return res.status(200).json({ id_usuario: data.id_usuario, nome: data.nome, tipo: data.tipo });
}

export async function login(req, res) {
    const { email, senha } = req.body;

    const { data: usuario, error } = await supabase
        .from('usuarios')
        .select('id_usuario, nome, senha_hash, status_usuario, tipo, status_reset_senha')
        .eq('email', email)
        .single();

    // Erro OU usuário não encontrado — checa isso PRIMEIRO
    if (error || !usuario) {
        if (error && error.code !== 'PGRST116') {
            res.locals.auditoria.resultado = 'ERRO';
        } else {
            res.locals.auditoria.resultado = 'FALHA';
        }
        return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    // Só chega aqui se usuario existir de verdade
    if (usuario.status_usuario === 'Inativo') {
        return res.status(403).json({ mensagem: 'Conta inativa. Contate o administrador.' });
    }

    if (usuario.status_reset_senha) {
        console.log("/login: >>>>> Reset de senha solicitado")
        return res.status(203).json({ mensagem: "Reset de senha solicitado por um adminstrador" })
    }

    const senhaCorreta = await validarSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
        return res.status(401).json({ mensagem: 'Email ou senha inválidos' });
    }

    const token = gerarToken(usuario);
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 2 * 60 * 60 * 1000
    });

    Object.assign(res.locals.auditoria, { usuarioId: usuario.id_usuario, recursoId: usuario.id_usuario, resultado: 'SUCESSO' });
    return res.status(200).json({
        mensagem: 'Login realizado com sucesso',
        usuario: { id_usuario: usuario.id_usuario, nome: usuario.nome, tipo: usuario.tipo }
    });
}

export async function confirmarSenha(req, res) {
    const { senha } = req.body
    const { data: usuario } = await supabase
        .from('usuarios')
        .select('senha_hash') // adicionado tipo
        .eq('id_usuario', req.usuario.id_usuario)
        .single();

    // Validar senha
    const senhaCorreta = await validarSenha(senha, usuario.senha_hash);
    if (!senhaCorreta) {
        console.log("/confirmar-senha: >>>>> Senha incorreta")
        return res.status(401).json({ mensagem: 'Senha incorreta' });
    }
    console.log("/confirmar-senha: Senha correta")
    return res.status(200).json({ mensagem: "Senha correta" })
}

export function logout(req, res) {
    try {
        const usuario = verificarToken(req.cookies.token);
        Object.assign(res.locals.auditoria, { usuarioId: usuario.id_usuario, recursoId: usuario.id_usuario });
    } catch { /* Logout continua permitido mesmo sem sessão válida. */ }
    res.clearCookie('token');
    console.log('/logout: Logout realizado')
    return res.status(200).json({ mensagem: 'Logout realizado' });
}

export async function solicitarCodigo(req, res) {
    const { nome } = req.body;
    const email = normalizarEmail(req.body?.email);
    try {
        if (await buscarUsuario(email)) {
            console.log('/solicitar-codigo: >>>>> Esse email já está cadastrado');
            return res.status(409).json({ mensagem: 'Esse email já está cadastrado' });
        }
        await emitirCodigo(email, nome, 'cadastro');
        console.log('/solicitar-codigo: Código enviado para o email');
        return res.status(200).json({ mensagem: 'Codigo enviado para o email!' });
    } catch {
        console.log('/solicitar-codigo: >>>>> Falha ao consultar, persistir ou enviar o código');
        return res.status(500).json({ mensagem: 'Não foi possível solicitar o código' });
    }
}

export async function confirmarCadastro(req, res) {
    const { nome, senha, codigoDigitado } = req.body ?? {};
    const email = normalizarEmail(req.body?.email);
    try {
        const senha_hash = await gerarHashSenha(senha);
        const resultado = await codigos.validarCodigo(email, String(codigoDigitado), 'cadastro');
        if (!resultado.valido) {
            console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
            return res.status(401).json({ mensagem: resultado.motivo });
        }
        const { data: criados, error } = await supabase
            .from('usuarios')
            .insert({ nome, email, senha_hash })
            .select('id_usuario');
        if (error) throw new Error('Falha ao cadastrar usuário');
        confirmarAlteracao(res, criados);
        try {
            await enviarEmail({
                destinatarioEmail: email, destinatarioNome: nome,
                assunto: 'Bem-vindo ao CashLand!',
                conteudoHtml: `<h1>Olá, ${nome}!</h1><p>Sua conta foi criada com sucesso.</p>`
            });
        } catch {
            res.locals.auditoria.motivo = 'EMAIL_BOAS_VINDAS_NAO_ENVIADO';
            console.log('/confirmar-cadastro: >>>>> Usuário criado, mas o envio do email de boas-vindas falhou');
            return res.status(201).json({ mensagem: 'Usuario criado, mas o email de confirmação não foi enviado' });
        }
        console.log('/confirmar-cadastro: Cadastro processado');
        return res.status(200).json({ mensagem: 'Cadastro realizado com sucesso, prossiga para o login!' });
    } catch {
        console.log('/confirmar-cadastro: >>>>> Falha ao validar código ou cadastrar usuário');
        return res.status(500).json({ mensagem: 'Erro ao cadastrar usuário' });
    }
}

export async function solicitarResetSenha(req, res) {
    const email = normalizarEmail(req.body?.email);
    try {
        const usuario = await buscarUsuario(email);

        if (!usuario) {
            console.log('/solicitar-reset-senha: >>>>> Email não cadastrado');
            return res.status(404).json({ mensagem: 'Email não cadastrado' });
        }

        await emitirCodigo(email, usuario.nome, 'recuperacao_senha');

        console.log('/solicitar-reset-senha: Código enviado para o email');
        return res.status(200).json({ mensagem: 'Código enviado para o email!' });

    } catch {
        console.log('/solicitar-reset-senha: >>>>> Falha ao consultar, persistir ou enviar o código');
        return res.status(500).json({ mensagem: 'Não foi possível enviar o código' });
    }
}

export async function confirmarResetSenha(req, res) {
    const { codigoDigitado, novaSenha } = req.body ?? {};
    const email = normalizarEmail(req.body?.email);
    try {
        const usuario = await buscarUsuario(email);

        if (!usuario) {
            console.log('/confirmar-reset-senha: >>>>> Usuário não encontrado');
            return res.status(404).json({ mensagem: 'Usuário não encontrado' });
        }

        const novaSenhaHash = await gerarHashSenha(novaSenha);

        const resultado = await codigos.validarCodigo(email, String(codigoDigitado), 'recuperacao_senha');

        if (!resultado.valido) {
            console.log("Operação processada; consulte o evento de auditoria e o status HTTP.");
            return res.status(401).json({ mensagem: resultado.motivo });
        }
        const { data, error } = await supabase.from('usuarios')
            .update({ senha_hash: novaSenhaHash, status_reset_senha: false })
            .eq('id_usuario', usuario.id_usuario)
            .select('id_usuario').maybeSingle();
        if (error) {
            throw new Error('Falha ao atualizar senha');
        }
        if (!data) {
            console.log('/confirmar-reset-senha: >>>>> Usuário não encontrado');
            return res.status(404).json({ mensagem: 'Usuário não encontrado' });
        }
        confirmarAlteracao(res, data);
        console.log('/confirmar-reset-senha: Senha alterada com sucesso');
        return res.status(200).json({ mensagem: 'Senha alterada com sucesso!' });
    } catch {
        console.log('/confirmar-reset-senha: >>>>> Falha ao validar código ou atualizar senha');
        return res.status(500).json({ mensagem: 'Erro ao processar sua solicitação' });
    }
}
