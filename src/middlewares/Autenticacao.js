import { verificarToken } from '../rf-001-Login/Autenticacao.js';

export function autenticar(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        Object.assign(res.locals.auditoria, { resultado: 'NEGADO', motivo: 'NAO_AUTENTICADO' });
        console.log('Autenticacao erro 401: Não autenticado')
        return res.status(401).json({ mensagem: 'Não autenticado' });
    }
    try {
        req.usuario = verificarToken(token);
        next();
    } catch {
        Object.assign(res.locals.auditoria, { resultado: 'NEGADO', motivo: 'SESSAO_INVALIDA' });
        console.log('Autenticacao erro 401: Token inválido ou expirado')
        return res.status(401).json({ mensagem: 'Token inválido ou expirado' });
    }
}

export function somenteAdmin(req, res, next) {
    if (req.usuario.tipo !== 'Admin') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores' });
    }
    next();
}

