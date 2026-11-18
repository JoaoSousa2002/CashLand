import { before, after, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import assert from "node:assert/strict";
import { abrirNavegador } from "../helpers/navegador.js";

// Coluna e filtro de categoria nas listagens de transações (usuário e administrador).
// As páginas são reais; a API é simulada e filtra por id_categoria como a rota real.
const root = fileURLToPath(new URL("../../", import.meta.url));
const pasta = path.join(root, "src", "rf-006-Gerir_transacoes_financeiras", "public");
const categorias = [
  { id_categoria: 7, id_usuario: 501, nome: "Salário" },
  { id_categoria: 3, id_usuario: 501, nome: "Alimentação" }
];
const transacoes = [
  { id_transacao: 1, id_usuario: 501, nome: "Mercado", tipo_transacao: "Saida", id_categoria: 3, id_conta_origem: 10, valor_transacao: 80, status_transacao: "Pago", data_vencimento: "2026-11-10", id_recorrencia: null },
  { id_transacao: 2, id_usuario: 501, nome: "Pagamento", tipo_transacao: "Entrada", id_categoria: 7, id_conta_origem: 10, valor_transacao: 3000, status_transacao: "Pago", data_vencimento: "2026-11-05", id_recorrencia: null },
  { id_transacao: 3, id_usuario: 501, nome: "Reserva", tipo_transacao: "Transferencia", id_categoria: null, id_conta_origem: 10, id_conta_destino: 11, valor_transacao: 100, status_transacao: "Pago", data_vencimento: "2026-11-06", id_recorrencia: null }
];
const recorrencias = [
  { id_recorrencia: 9, id_usuario: 501, nome: "Feira semanal", id_categoria: 3, id_conta: 10, modalidade: "Periodico", frequencia: "Semanal", valor: 50, data_inicio: "2026-11-01", ativo: true }
];
let pagina;
const consultas = [];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const json = (dados) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(dados)); };
  if (req.method !== "GET") { res.writeHead(403); return res.end("{}"); }
  if (url.pathname === "/test") { res.setHeader("Content-Type", "text/html"); return res.end(fs.readFileSync(path.join(pasta, pagina))); }
  if (url.pathname === "/me") return json({ id_usuario: 501, nome: "Teste", tipo: pagina.startsWith("ADMIN_") ? "Admin" : "Comum" });
  if (url.pathname.includes("verificar-saldo")) return json({ saldo: 100 });
  if (url.pathname.endsWith("/listar-contas")) return json([{ id_conta: 10, id_usuario: 501, nome_conta: "Corrente" }, { id_conta: 11, id_usuario: 501, nome_conta: "Poupança" }]);
  if (url.pathname.endsWith("/listar-categoria")) return json(categorias);
  if (url.pathname.endsWith("/listar-transacoes")) {
    consultas.push(url.search);
    const filtro = url.searchParams.get("id_categoria");
    return json(transacoes.filter((t) => filtro == null || String(t.id_categoria) === filtro));
  }
  if (url.pathname.endsWith("/listar-recorrencias")) { consultas.push(url.search); return json(recorrencias); }
  for (const dir of ["rf-003-Cadastro_usuario/public", "rf-002-Login/public", "img"]) {
    const arquivo = path.join(root, "src", dir, path.basename(url.pathname));
    if (fs.existsSync(arquivo) && fs.statSync(arquivo).isFile()) {
      res.setHeader("Content-Type", arquivo.endsWith(".css") ? "text/css" : arquivo.endsWith(".js") ? "application/javascript" : "image/png");
      return res.end(fs.readFileSync(arquivo));
    }
  }
  res.writeHead(404); res.end("");
});
let browser, origin;
async function avaliar(expressao) {
  const r = await browser.enviar("Runtime.evaluate", { expression: expressao, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
async function ate(expressao) {
  for (let i = 0; i < 150; i++) { if (await avaliar(expressao)) return; await esperar(30); }
  throw Error("Tempo esgotado: " + expressao + " erros=" + JSON.stringify(browser.erros));
}
// Espera o servidor receber a consulta seguinte e a tela terminar de carregar.
async function novaConsulta(antes) {
  for (let i = 0; i < 150 && consultas.length <= antes; i++) await esperar(30);
  assert.ok(consultas.length > antes, "A tela não fez nova consulta");
  await ate(ocioso);
}
const ocioso = `![...document.querySelectorAll('.loading-overlay')].some(e => getComputedStyle(e).display !== 'none')`;
const tabela = `(() => { const t = document.querySelector('#tabela-registros');
  const cab = [...t.tHead.rows[0].cells].map(c => c.textContent);
  const i = cab.indexOf('Categoria');
  return { cab, linhas: [...t.tBodies[0].rows].map(r => ({ nome: r.cells[cab.indexOf('Nome')]?.textContent, categoria: r.cells[i]?.textContent })) }; })()`;
async function abrir(arquivo, largura = 1280) {
  pagina = arquivo;
  consultas.length = 0;
  browser.erros.length = 0;
  await browser.enviar("Emulation.setDeviceMetricsOverride", { width: largura, height: 800, deviceScaleFactor: 1, mobile: largura < 600 });
  await browser.enviar("Page.navigate", { url: `${origin}/test` });
  await ate(`document.readyState === 'complete' && !!document.querySelector('#corpo-tabela')`);
}
before(async () => {
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await abrirNavegador(origin);
});
after(async () => {
  await browser?.fechar();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test("usuário: coluna Categoria mostra o nome e o filtro na barra de pesquisa consulta por categoria", { timeout: 30000 }, async () => {
  await abrir("listar-transacoes.html");
  await ate(`document.querySelectorAll('#corpo-tabela tr').length === 3 && ${ocioso}`);
  let t = await avaliar(tabela);
  assert.equal(t.cab[t.cab.indexOf("Tipo") + 1], "Categoria");
  assert.deepEqual(t.linhas.map((l) => l.categoria), ["Alimentação", "Salário", "---"]);
  // O seletor fica fora do painel de filtros, ao lado da pesquisa, e mostra só nomes, em ordem alfabética.
  const seletor = await avaliar(`(() => { const s = document.getElementById('id_categoria');
    return { naBarra: !!s.closest('#form-listar-transacoes'), noPainel: !!s.closest('#filtros-overlay'), desabilitado: s.disabled,
      visivel: s.getClientRects().length > 0, opcoes: [...s.options].map(o => o.textContent) }; })()`);
  assert.deepEqual(seletor, { naBarra: true, noPainel: false, desabilitado: false, visivel: true, opcoes: ["Todas as categorias", "Alimentação", "Salário"] });

  let n = consultas.length;
  await avaliar(`(() => { const s = document.getElementById('id_categoria'); s.value = '3'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await novaConsulta(n);
  assert.equal(new URLSearchParams(consultas.at(-1)).get("id_categoria"), "3");
  t = await avaliar(tabela);
  assert.deepEqual(t.linhas, [{ nome: "Mercado", categoria: "Alimentação" }]);

  // A pesquisa por nome combina com a categoria escolhida.
  n = consultas.length;
  await avaliar(`document.getElementById('pesquisa').value = 'Merc'; document.getElementById('form-listar-transacoes').requestSubmit()`);
  await novaConsulta(n);
  const combinada = new URLSearchParams(consultas.at(-1));
  assert.equal(combinada.get("id_categoria"), "3");
  assert.equal(combinada.get("nome"), "Merc");

  // "Limpar filtros" do painel não desfaz a categoria escolhida na barra.
  await avaliar(`document.getElementById('pesquisa').value = ''; document.getElementById('botao-filtrar').click()`);
  n = consultas.length;
  await avaliar(`document.getElementById('botao-limpar-filtros').click(); document.getElementById('form-filtros').requestSubmit()`);
  await novaConsulta(n);
  assert.equal(new URLSearchParams(consultas.at(-1)).get("id_categoria"), "3");
  assert.equal(await avaliar(`document.getElementById('id_categoria').value`), "3");

  // Voltar para "Todas as categorias" remove o filtro.
  n = consultas.length;
  await avaliar(`(() => { const s = document.getElementById('id_categoria'); s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await novaConsulta(n);
  assert.equal(await avaliar(`document.querySelectorAll('#corpo-tabela tr').length`), 3);
  assert.equal(new URLSearchParams(consultas.at(-1)).has("id_categoria"), false);
  assert.deepEqual(browser.erros, []);
});

test("usuário: recorrências mostram a categoria e escondem o filtro, que volta limpo às transações", { timeout: 30000 }, async () => {
  await abrir("listar-transacoes.html");
  await ate(`document.querySelectorAll('#corpo-tabela tr').length === 3 && ${ocioso}`);
  await avaliar(`(() => { const s = document.getElementById('id_categoria'); s.value = '7'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await ate(`document.querySelectorAll('#corpo-tabela tr').length === 1 && ${ocioso}`);
  await avaliar(`document.querySelector('input[value="Recorrencias"]').click()`);
  await ate(`document.querySelector('#label-pesquisa').textContent.includes('recorrência') && ${ocioso} && document.querySelectorAll('#corpo-tabela tr').length === 1`);
  assert.equal(await avaliar(`document.getElementById('campo-categoria').hidden`), true);
  assert.equal(new URLSearchParams(consultas.at(-1)).has("id_categoria"), false);
  const t = await avaliar(tabela);
  assert.deepEqual(t.linhas, [{ nome: "Feira semanal", categoria: "Alimentação" }]);
  await avaliar(`document.querySelector('input[value="Transacoes"]').click()`);
  await ate(`document.querySelectorAll('#corpo-tabela tr').length === 3 && ${ocioso}`);
  assert.equal(await avaliar(`document.getElementById('campo-categoria').hidden`), false);
  assert.equal(await avaliar(`document.getElementById('id_categoria').value`), "");
});

for (const largura of [320, 768, 1024]) {
  test(`usuário: barra com pesquisa e categoria cabe em ${largura}px sem rolagem horizontal da página`, { timeout: 30000 }, async () => {
    await abrir("listar-transacoes.html", largura);
    await ate(`document.querySelectorAll('#corpo-tabela tr').length === 3 && ${ocioso}`);
    const medidas = await avaliar(`(() => { const s = document.getElementById('id_categoria').getBoundingClientRect();
      return { pagina: document.documentElement.scrollWidth, janela: innerWidth, direita: s.right, largura: s.width }; })()`);
    assert.ok(medidas.pagina <= medidas.janela, JSON.stringify(medidas));
    assert.ok(medidas.direita <= medidas.janela && medidas.largura > 100, JSON.stringify(medidas));
  });
}

test("administrador: coluna Categoria mostra nome e ID", { timeout: 30000 }, async () => {
  await abrir("ADMIN_listar-transacoes.html");
  await avaliar(`document.getElementById('id_usuario').value = '501'; document.getElementById('id_usuario').dispatchEvent(new Event('input'));
    document.getElementById('form-listar-transacoes').requestSubmit()`);
  await ate(`document.querySelectorAll('#corpo-tabela tr').length === 3 && ${ocioso}`);
  const t = await avaliar(tabela);
  assert.equal(t.cab[t.cab.indexOf("Tipo") + 1], "Categoria");
  assert.deepEqual(t.linhas.map((l) => l.categoria), ["Alimentação (#3)", "Salário (#7)", "---"]);
  assert.deepEqual(browser.erros, []);
});
