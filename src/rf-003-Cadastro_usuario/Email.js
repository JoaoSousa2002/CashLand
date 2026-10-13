import 'dotenv/config';
import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';

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
    throw new Error('Falha ao enviar email');
  }

  const data = await response.json();
  return data;
}


export function normalizarEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function gerarCodigo() {
  return randomInt(100000, 1000000).toString();
}

// Recebe o cliente do servidor, sem abrir outra conexão ou importar Servidor.js.
export function criarServicoCodigos(supabase, {
  obterSegredo = () => process.env.SEGREDO_CODIGOS,
  agora = Date.now
} = {}) {
  function hashCodigo(email, codigo, finalidade) {
    if (!['cadastro', 'recuperacao_senha'].includes(finalidade)) {
      throw new Error('Finalidade de código inválida');
    }
    const segredo = obterSegredo();
    if (typeof segredo !== 'string' || !segredo.trim() || segredo === process.env.SEGREDO_JWT) {
      throw new Error('Configure SEGREDO_CODIGOS com uma chave própria');
    }
    return createHmac('sha256', segredo)
      .update(JSON.stringify([finalidade, email, String(codigo)]))
      .digest('hex');
  }

  async function salvarCodigo(email, codigo, finalidade) {
    email = normalizarEmail(email);
    const codigo_hash = hashCodigo(email, codigo, finalidade);
    const instante = agora();
    // O ID identifica esta emissão, inclusive quando o mesmo código for sorteado novamente.
    const id = randomUUID();
    const { data, error } = await supabase.from('codigos_verificacao')
      .upsert({
        id, email, finalidade, codigo_hash,
        criado_em: new Date(instante).toISOString(),
        expira_em: new Date(instante + TEMPO_EXPIRACAO_MS).toISOString()
      }, { onConflict: 'email,finalidade' })
      .select('id').single();
    if (error || data?.id !== id) throw new Error('Não foi possível persistir o código');
    return { id, email, finalidade };
  }

  async function cancelarEmissao(emissao) {
    const { error } = await supabase.from('codigos_verificacao').delete()
      .eq('id', emissao.id).eq('email', emissao.email).eq('finalidade', emissao.finalidade);
    if (error) throw new Error('Não foi possível cancelar a emissão');
  }

  async function validarCodigo(email, codigoDigitado, finalidade) {
    email = normalizarEmail(email);
    const hash = hashCodigo(email, codigoDigitado, finalidade);
    const { data: registro, error } = await supabase.from('codigos_verificacao')
      .select('id,codigo_hash,expira_em').eq('email', email).eq('finalidade', finalidade)
      .maybeSingle();
    if (error) throw new Error('Não foi possível consultar o código');
    if (!registro) return { valido: false, motivo: 'nenhum_codigo_solicitado' };
    const expiraEm = Date.parse(registro.expira_em);
    if (!Number.isFinite(expiraEm)) throw new Error('Validade do código indisponível');
    if (expiraEm <= agora()) return { valido: false, motivo: 'codigo expirado' };

    const esperado = Buffer.from(registro.codigo_hash, 'hex');
    const recebido = Buffer.from(hash, 'hex');
    if (esperado.length !== recebido.length || !timingSafeEqual(esperado, recebido)) {
      // Erros de digitação não alteram o registro nem sua expiração.
      return { valido: false, motivo: 'codigo incorreto' };
    }

    // O SELECT é diagnóstico; somente este DELETE condicional autoriza a operação.
    // ID protege reenvios concorrentes; hash, finalidade e TTL são revalidados no DELETE.
    const { data: consumidos, error: erroConsumo } = await supabase.from('codigos_verificacao')
      .delete().eq('id', registro.id).eq('email', email).eq('finalidade', finalidade)
      .eq('codigo_hash', hash).gt('expira_em', new Date(agora()).toISOString()).select('id');
    if (erroConsumo) throw new Error('Não foi possível consumir o código');
    return consumidos?.length === 1
      ? { valido: true, motivo: '' }
      : { valido: false, motivo: 'codigo incorreto' };
  }

  return { salvarCodigo, validarCodigo, cancelarEmissao };
}
