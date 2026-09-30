# Como criar novas páginas no CashLand

O projeto usa HTML, CSS e JavaScript no navegador, Express no servidor e Supabase no banco. As páginas chamam a API com `fetch`. Não é necessário criar componentes React ou configurar um roteador no navegador.

## 1. Onde colocar cada coisa

| O que você precisa | Arquivo ou pasta |
| --- | --- |
| Registrar URLs de páginas e rotas da API | [Servidor.js](src/rf-001-Login/Servidor.js) |
| Criar o HTML de uma funcionalidade | `src/rf-XXX-Nome_funcionalidade/public/` |
| Reutilizar o visual e as janelas de resultado | [template.css](src/rf-002-Cadastro_usuario/public/template.css) |
| Consultar a sessão no navegador | [protecao.js](src/rf-001-Login/public/protecao.js) |
| Entender a geração e verificação do token | [Autenticacao.js](src/rf-001-Login/Autenticacao.js) |
| Consultar regras de campos | [usuario.js](src/validacoes/usuario.js) e [validar.js](src/validacoes/validar.js) |
| Ver uma tela completa como referência | [editar_categoria.html](src/rf-003-Gerir_categoria/public/editar_categoria.html) |
| Consultar o contrato documentado da API | [API-SWAGGER.json](docs/api/API-SWAGGER.json), disponível em `/api-docs` com o servidor ligado |

Confira também a implementação da rota em `Servidor.js`: os formatos e códigos de resposta ainda variam entre as rotas.

## 2. Criar o arquivo e a URL da página

Por exemplo, crie `src/rf-003-Gerir_categoria/public/nova_categoria.html` usando o modelo da seção 6.

Em `Servidor.js`, junto às outras rotas que entregam HTML, acrescente:

```js
app.get('/tela-principal/nova-categoria', (req, res) => {
    res.sendFile(path.join(
        __dirname,
        '../rf-003-Gerir_categoria/public/nova_categoria.html'
    ));
});
```

`__dirname` aponta para `src/rf-001-Login`, por isso o caminho começa com `../` para acessar outra funcionalidade. Cadastre qualquer rota antes do último `app.use`, que entrega a página de erro 404.

Adicione um link no menu ou na página de origem:

```html
<a href="/tela-principal/nova-categoria">Nova categoria</a>
```

Use caminhos começando por `/` para recursos compartilhados: `/template.css`, `/protecao.js` e `/User_icon_black.png`. Assim, funcionam também em URLs com vários níveis.

Atualmente, o servidor publica arquivos estáticos das pastas de login, cadastro de usuário e imagens. A pasta de categorias tem suas páginas entregues por `sendFile`. Se criar um JavaScript ou CSS separado nessa pasta, publique os arquivos também, antes do tratamento final de 404:

```js
app.use('/categorias', Express.static(
    path.join(__dirname, '../rf-003-Gerir_categoria/public')
));
```

Nesse caso, um arquivo `nova_categoria.js` será acessado por `/categorias/nova_categoria.js`. Tudo nessa pasta ficará público; coloque nela apenas arquivos destinados ao navegador.

## 3. Autenticação, sessão e tokens

O fluxo atual é:

1. A tela envia `POST /login` com `{ email, senha }` em JSON.
2. No sucesso (`200`), o servidor gera um JWT com `id_usuario` e `tipo`, válido por duas horas.
3. O servidor grava esse JWT no cookie `token`. O cookie é `httpOnly`, usa `sameSite: 'strict'` e, em produção, `secure: true` (HTTPS).
4. Nas próximas chamadas, o navegador envia o cookie. Use `credentials: 'include'` no `fetch`.
5. O middleware `autenticar` verifica o cookie e coloca os dados do token em `req.usuario`.

Não é preciso ler o token, armazená-lo em `localStorage` ou enviar `Authorization: Bearer`. A autenticação atual lê `req.cookies.token`. O JavaScript da página não consegue ler o cookie `httpOnly`.

Para proteger a entrada de uma página, carregue o arquivo compartilhado antes do seu script:

```html
<script src="/protecao.js"></script>
<script>
    async function iniciar() {
        const usuario = await protegerPagina();
        if (!usuario) return;
        document.getElementById('nome-usuario').textContent = usuario.nome;
        // Carregue os dados da página somente depois desta verificação.
    }
    iniciar();
</script>
```

Para uma página administrativa, use `await protegerPagina('Admin')`. O nome `Admin` diferencia maiúsculas e minúsculas. Não declare outra função com o mesmo nome se estiver usando `/protecao.js`.

`GET /me`, sem parâmetros, retorna `{ id_usuario, nome, tipo }` e verifica também se a conta continua ativa no banco. O helper redireciona para `/login` quando a consulta falha, inclusive em falhas de rede; quando o perfil não corresponde, redireciona para `/tela-principal`.

A proteção no navegador controla a navegação. Cada rota privada da API também precisa de `autenticar`; rotas administrativas precisam ainda de `somenteAdmin`. Esconder um botão ou consultar `localStorage.tipo` não concede nem garante permissão. O prefixo `/admin` sozinho também não protege uma rota.

Para sair, envie `POST /logout` com `credentials: 'include'`. Redirecione para `/login` após confirmar o sucesso: é essa rota que apaga o cookie. Não existe fluxo de renovação de token implementado; uma sessão expirada exige novo login.

## 4. Como enviar e receber dados

Uma URL de página entrega HTML; uma rota da API entrega dados. Por exemplo, `/tela-principal/listar-categoria` abre a tela e `/usuario/listar-categoria` consulta as categorias.

| Operação existente | Onde enviar os dados | Resposta de sucesso |
| --- | --- | --- |
| `GET /usuario/listar-categoria` | Query opcional: `?pesquisa=Alimentação` | Array de categorias |
| `POST /usuario/criar-categoria` | JSON: `{ nome, descricao }` | `{ mensagem }` |
| `PATCH /usuario/editar-categoria` | JSON: `{ id_categoria, nome, descricao }` | `{ mensagem }` |
| `DELETE /usuario/deletar-categoria` | JSON: `{ id_categoria }` | `{ mensagem }` |
| `GET /admin/usuario` | Query opcional: `?id_usuario=12` | Objeto com dados do usuário |
| `DELETE /admin/deletar-usuario` | Query: `?id_usuario=12` | `{ mensagem }` |

Leia o contrato de cada rota: nem todo `DELETE` recebe JSON. No servidor, `req.query` lê parâmetros da URL e `req.body` lê o corpo JSON. O middleware `validar` usa query em `GET`, `HEAD` e `DELETE` sem corpo; nas demais situações, usa body. Campos extras não previstos nos schemas são rejeitados.

Exemplo de consulta (dentro de uma função `async`, com tratamento de erro):

```js
const parametros = new URLSearchParams({ pesquisa: 'Alimentação' });
const resposta = await fetch(`/usuario/listar-categoria?${parametros}`, {
    credentials: 'include'
});
const dados = await resposta.json();
if (!resposta.ok) {
    throw new Error(dados.mensagem || dados.erro || 'Falha na consulta.');
}
// Esta rota retorna um array diretamente, sem uma propriedade "dados".
for (const categoria of dados) {
    console.log(categoria.id_categoria, categoria.nome);
}
```

Para `POST`, `PATCH` e rotas `DELETE` que recebem JSON, envie `headers: { 'Content-Type': 'application/json' }` e `body: JSON.stringify(objeto)`. O modelo abaixo demonstra isso.

Para passar um ID de uma tela para outra:

```js
// Na tela de origem:
location.href = '/tela-principal/editar-categoria?id=' + encodeURIComponent(idCategoria);

// Na tela de destino:
const idCategoriaRecebido = new URLSearchParams(location.search).get('id');
```

O parâmetro `id` da página não é automaticamente enviado à API. Monte a próxima chamada com o nome esperado pela rota, como `id_categoria`. IDs recebidos pela URL podem ser alterados pelo usuário; a API deve conferir a propriedade do registro usando `req.usuario.id_usuario`.

## 5. Mensagens e códigos HTTP

`resposta.status` é o código HTTP. `resposta.ok` indica códigos de `200` a `299`. `await resposta.json()` lê o conteúdo do corpo; faça essa leitura apenas uma vez por resposta.

**Um `fetch` não cai no `catch` só porque a API respondeu `400`, `401` ou `500`.** Verifique `status` ou `ok`. O `catch` trata, por exemplo, falhas de rede, JSON inválido e erros lançados pelo seu código.

| Código | Uso no projeto e ação da tela |
| --- | --- |
| `200` | Operação concluída. Exiba os dados ou a mensagem de sucesso. |
| `201` | Também é sucesso HTTP. No cadastro, pode indicar usuário criado sem envio do email de confirmação. A busca administrativa de usuários também usa esse código em um dos caminhos. Leia a resposta antes de decidir o próximo passo. |
| `203` | No login, indica redefinição de senha solicitada por administrador. Direcione para `/resetar-senha`; não trate como login concluído, mesmo com `ok === true`. |
| `400` | Dados inválidos ou operação incompatível com o estado atual. Mostre a mensagem e os erros dos campos, quando houver. |
| `401` | Pode ser sessão ausente/expirada, credenciais incorretas, senha de confirmação incorreta ou código de email inválido. Decida pela rota: não redirecione todo `401` automaticamente para login. |
| `403` | Acesso ou operação proibida, como conta inativa, falta de perfil administrativo ou categoria protegida. Mostre a mensagem. |
| `404` | Recurso ou URL não encontrado. Confira a mensagem e o endereço chamado. |
| `409` | Conflito, como email/nome já cadastrado ou nome reservado. Peça a correção do dado. |
| `429` | Limite de tentativas atingido. Mostre o prazo informado pela API; não repita a chamada automaticamente. |
| `500` / `501` | Falha do servidor. O código atual também usa `501` em uma falha de solicitação administrativa de reset. Informe o insucesso sem limpar o formulário. |

Os usos acima descrevem o código atual, incluindo diferenças entre rotas. Em especial, `401` não significa exclusivamente sessão expirada neste projeto.

A resposta de validação tem este formato (a mensagem específica depende do campo):

```json
{
  "mensagem": "Dados inválidos.",
  "erros": [
    { "campo": "nome", "mensagem": "O nome deve possuir pelo menos 3 caracteres." }
  ]
}
```

Prefira `dados.mensagem`, depois `dados.erro`, e tenha uma mensagem padrão. Quando existir `dados.erros`, mostre cada mensagem perto do campo ou na janela de resultado. Use `textContent` para inserir mensagens e nomes recebidos da API.

Nem toda resposta é JSON: uma URL inexistente cai no tratamento final de 404, que devolve HTML. O modelo a seguir identifica essa situação.

## 6. Modelo de página com carregamento, sucesso e insucesso

Este exemplo completo usa a rota de criação de categoria já existente. Salve como `nova_categoria.html` no caminho da seção 2 e registre a URL indicada. As funções de resultado deste exemplo são locais à página; não existe um módulo compartilhado de janelas no projeto.

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nova categoria — CashLand</title>
    <link rel="stylesheet" href="/template.css">
    <style>[hidden] { display: none !important; }</style>
</head>
<body>
    <div class="loading-overlay" id="loading-overlay" role="status">
        <div class="loading-box">
            <p>Carregando...</p>
            <div class="spinning-wheel" aria-hidden="true"></div>
        </div>
    </div>

    <div class="loading-overlay" id="resultado-overlay"
         role="dialog" aria-modal="true" aria-labelledby="resultado-titulo">
        <div class="loading-box" style="flex-direction: column; gap: 16px;">
            <h2 id="resultado-titulo"></h2>
            <p id="resultado-mensagem" style="white-space: pre-line;"></p>
            <button id="fechar-resultado" type="button">Continuar</button>
        </div>
    </div>

    <main class="container" id="conteudo" hidden>
        <div class="cartao">
            <p>Olá, <span id="nome-usuario"></span></p>
            <h1>Nova categoria</h1>
            <form id="form-categoria">
                <label for="nome">Nome</label>
                <input id="nome" required minlength="3" maxlength="100">
                <label for="descricao">Descrição</label>
                <input id="descricao" minlength="3" maxlength="100">
                <button id="salvar" type="submit" disabled>Salvar</button>
            </form>
        </div>
    </main>

    <script src="/protecao.js"></script>
    <script>
        const loading = document.getElementById('loading-overlay');
        const resultado = document.getElementById('resultado-overlay');
        const conteudo = document.getElementById('conteudo');
        const form = document.getElementById('form-categoria');
        const salvar = document.getElementById('salvar');
        const fechar = document.getElementById('fechar-resultado');
        let voltarAoLogin = false;
        let sessaoPronta = false;
        let enviando = false;

        function mostrarResultado(sucesso, mensagem) {
            const titulo = document.getElementById('resultado-titulo');
            titulo.textContent = sucesso ? 'Sucesso' : 'Não foi possível concluir';
            titulo.style.color = sucesso ? 'green' : 'darkred';
            document.getElementById('resultado-mensagem').textContent = mensagem;
            resultado.style.display = 'flex';
            conteudo.inert = true;
            fechar.focus();
        }

        fechar.addEventListener('click', () => {
            resultado.style.display = 'none';
            conteudo.inert = false;
            if (voltarAoLogin) location.href = '/login';
            else salvar.focus();
        });

        async function iniciar() {
            loading.style.display = 'flex';
            try {
                const usuario = await protegerPagina();
                if (!usuario) return;
                document.getElementById('nome-usuario').textContent = usuario.nome;
                conteudo.hidden = false;
                sessaoPronta = true;
                salvar.disabled = false;
            } finally {
                loading.style.display = 'none';
            }
        }

        form.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            if (!sessaoPronta || enviando) return;
            enviando = true;
            salvar.disabled = true;
            loading.style.display = 'flex';
            try {
                const resposta = await fetch('/usuario/criar-categoria', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nome: document.getElementById('nome').value.trim(),
                        descricao: document.getElementById('descricao').value.trim()
                    })
                });

                const tipo = resposta.headers.get('content-type') || '';
                if (!tipo.includes('application/json')) {
                    mostrarResultado(false, `Resposta inesperada da API (HTTP ${resposta.status}).`);
                    return;
                }
                const dados = await resposta.json();
                const detalhes = Array.isArray(dados.erros)
                    ? dados.erros.map(erro => erro.mensagem).join('\n') : '';
                const mensagem = dados.mensagem || dados.erro ||
                    (resposta.ok ? 'Operação concluída.' : `Falha (HTTP ${resposta.status}).`);

                if (!resposta.ok) {
                    // Nesta rota, 401 vem da autenticação da sessão.
                    voltarAoLogin = resposta.status === 401;
                    mostrarResultado(false, detalhes ? `${mensagem}\n${detalhes}` : mensagem);
                    return;
                }
                form.reset();
                mostrarResultado(true, mensagem);
            } catch {
                mostrarResultado(false,
                    'Não foi possível confirmar o resultado. Verifique a conexão e consulte a lista antes de reenviar.');
            } finally {
                loading.style.display = 'none';
                enviando = false;
                salvar.disabled = voltarAoLogin;
            }
        });

        iniciar();
    </script>
</body>
</html>
```

O padrão é: abrir o carregamento antes do `fetch`, bloquear envios repetidos, analisar a resposta, mostrar sucesso ou insucesso e fechar o carregamento em `finally`. Preserve os campos quando houver erro. Em uma falha de conexão, o servidor pode ter concluído a operação sem a resposta chegar ao navegador.

As telas existentes usam nomes como `MostrarResultado_Overlay(1, mensagem)` para sucesso e `MostrarResultado_Overlay(0, mensagem)` para erro. Essas funções estão definidas em cada HTML: importar apenas `template.css` fornece o visual, não as funções JavaScript.

## 7. Quando precisar criar uma rota nova na API

Se já existe uma rota para a operação, a página pode utilizá-la diretamente. Se não existe, implemente-a em `Servidor.js` antes do 404 final, seguindo a ordem dos middlewares:

```js
// Exemplo didático de consulta privada; esta URL ainda não existe.
app.get('/usuario/resumo-sessao',
    auditar('CONSULTAR_RESUMO_SESSAO', req => req.usuario?.id_usuario, false),
    autenticar,
    (req, res) => {
        return res.status(200).json({ id_usuario: req.usuario.id_usuario });
    }
);
```

Coloque `auditar` antes de `autenticar`: a autenticação atual utiliza `res.locals.auditoria`, inicializado pela auditoria. Para uma operação administrativa, acrescente `somenteAdmin` depois de `autenticar`. Para receber campos, use `validar(schema...)` depois das verificações de acesso e consulte ou acrescente os schemas em `src/validacoes/usuario.js`.

Nas operações de dados, obtenha o usuário da sessão, valide se o registro pertence a ele e retorne um código HTTP junto de um JSON claro, como `{ mensagem: 'Operação concluída.' }`. Credenciais do Supabase e `SEGREDO_JWT` ficam no servidor, nunca no HTML. Atualize também o Swagger ao acrescentar ou alterar contratos.

## 8. Conferir a página

Com as dependências instaladas e o ambiente do backend configurado, execute na raiz:

```bash
node src/rf-001-Login/Servidor.js
```

Acesse `http://localhost:3000` (ou a porta definida em `PORT`). Abra a página pelo servidor, não por `file://` nem por um servidor separado de HTML.

Antes de considerar a tela pronta, confira:

- A URL abre e carrega CSS, scripts e imagens.
- Sem sessão, a página encaminha para login; com sessão, carrega os dados.
- O carregamento fecha tanto no sucesso quanto na falha de rede.
- O formulário não envia duas vezes enquanto aguarda a API.
- Campos inválidos, conflito e falta de permissão mostram mensagens compreensíveis.
- O sucesso só aparece depois da resposta da API.
- A aba **Network/Rede** do navegador mostra o método, os dados enviados, o status HTTP e a resposta esperados.
