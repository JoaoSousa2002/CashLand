import supabase from '../config/supabase.js';
import { criarServicoCodigos, normalizarEmail, gerarCodigo, enviarEmail } from '../rf-002-Cadastro_usuario/Email.js';

export const codigos = criarServicoCodigos(supabase);

export async function buscarUsuario(email) {
    // Compatibilidade com emails legados que possuem letras maiúsculas.
    // A comparação final também impede que curingas do ILIKE identifiquem outra conta.
    const { data, error } = await supabase.from('usuarios')
        .select('id_usuario,nome,email')
        .ilike('email', email.replace(/[\\%_]/g, '\\$&'));
    if (error) throw new Error('Não foi possível consultar o usuário');
    const usuarios = (data ?? []).filter(usuario => normalizarEmail(usuario.email) === email);
    if (usuarios.length > 1) throw new Error('Email corresponde a mais de uma conta');
    return usuarios[0];
}

export async function emitirCodigo(email, nome, finalidade) {
    const codigo = gerarCodigo();
    const emissao = await codigos.salvarCodigo(email, codigo, finalidade);
    let assunto;
    if (finalidade === 'cadastro') {
        assunto = 'Seu código de verificação';
    } else {
        assunto = 'Redefinição de senha - CashLand';
    }
    try {
        await enviarEmail({
            destinatarioEmail: email,
            destinatarioNome: nome,
            assunto: assunto,
            conteudoHtml: `<html><body><h2>Código de verificação</h2>
        <p>Use o código abaixo para continuar:</p>
        <h1 style="letter-spacing: 4px;">${codigo}</h1>
        <p>Esse código expira em 10 minutos.</p></body></html>`
        });
    } catch {
        try {
            await codigos.cancelarEmissao(emissao);
        } catch {
            console.error('Falha ao cancelar emissão após erro no envio de email');
        }
        throw new Error('Não foi possível enviar o código');
    }
}

