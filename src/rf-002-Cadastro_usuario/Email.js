import 'dotenv/config';

const codigosPendentes = new Map();

const TEMPO_EXPIRACAO_MS = 10 * 60 * 1000; // 10 minutos

export async function enviarEmail({ destinatarioEmail, destinatarioNome, assunto, conteudoHtml }) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': process.env.BREVO_API_KEY
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME,
        email: process.env.BREVO_SENDER_EMAIL
      },
      to: [
        {
          email: destinatarioEmail,
          name: destinatarioNome
        }

      ],
      subject: assunto,
      htmlContent: conteudoHtml
    })
  });

  if (!response.ok) {
    const erro = await response.json();
    console.error('Erro ao enviar email:', erro);
    throw new Error('Falha ao enviar email');
  }

  const data = await response.json();
  return data;
}


export function gerarCodigo() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
}

export function salvarCodigo(email, codigo) {
  codigosPendentes.set(email, {
    codigo,
    expiraEm: Date.now() + TEMPO_EXPIRACAO_MS
  });
}

export function validarCodigo(email, codigoDigitado) {
  const registro = codigosPendentes.get(email);

  if (!registro) return { valido: false, motivo: 'nenhum_codigo_solicitado' };
  if (Date.now() > registro.expiraEm) {
    codigosPendentes.delete(email);
    return { valido: false, motivo: 'codigo expirado' };
  }
  if (registro.codigo !== codigoDigitado) {
    return { valido: false, motivo: 'codigo incorreto' };
  }

  codigosPendentes.delete(email); // uso único
  return { valido: true, motivo:"" };
}