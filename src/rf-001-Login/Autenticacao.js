import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken';
import 'dotenv/config'

// Função para gerar uma senha Hash
async function gerarHashSenha(senhaTextoPuro) {
  const saltRounds = 10;
  return await bcrypt.hash(senhaTextoPuro, saltRounds);
}

// Função para comparar a senha digitada com a senha hash do banco
async function validarSenha(senhaDigitada, senhaHashDoBanco) {
  return await bcrypt.compare(senhaDigitada, senhaHashDoBanco);
}

function gerarToken(usuario) {
  return jwt.sign(
    { id_usuario: usuario.id_usuario, tipo: usuario.tipo },
    process.env.SEGREDO_JWT,
    { expiresIn: '2h' }
  );
}

function verificarToken(token) {
  return jwt.verify(token, process.env.SEGREDO_JWT); // lança erro se inválido/expirado
}


export { gerarHashSenha, validarSenha, gerarToken, verificarToken };