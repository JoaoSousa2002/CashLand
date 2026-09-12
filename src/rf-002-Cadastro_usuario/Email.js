import 'dotenv/config';

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