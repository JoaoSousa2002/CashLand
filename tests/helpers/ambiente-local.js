// Importar antes da aplicação: os testes locais não dependem do .env nem de credenciais reais.
process.env.SUPABASE_URL = 'http://127.0.0.1:1';
process.env.SUPABASE_SECRET_KEY = 'chave-local-de-teste';
process.env.SEGREDO_JWT = 'segredo-local-cashland';
