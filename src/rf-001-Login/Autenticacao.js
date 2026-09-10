import bcrypt from 'bcrypt'

// Função para gerar uma senha Hash
async function gerarHashSenha(senhaTextoPuro) {
  const saltRounds = 10;
  return await bcrypt.hash(senhaTextoPuro, saltRounds);
}

// Função para comparar a senha digitada com a senha hash do banco
async function validarSenha(senhaDigitada, senhaHashDoBanco) {
  return await bcrypt.compare(senhaDigitada, senhaHashDoBanco);
}

export { gerarHashSenha, validarSenha };