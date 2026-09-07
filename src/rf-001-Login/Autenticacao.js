import bcrypt from 'bcrypt'

async function gerarHashSenha(senhaTextoPuro) {
  const saltRounds = 10;
  return await bcrypt.hash(senhaTextoPuro, saltRounds);
}

async function validarSenha(senhaDigitada, senhaHashDoBanco) {
  return await bcrypt.compare(senhaDigitada, senhaHashDoBanco);
}

export { gerarHashSenha, validarSenha };