import { before, after, test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import assert from "node:assert/strict";
import { abrirNavegador } from "../helpers/navegador.js";
// As páginas e seus scripts são reais; todas as respostas de API são locais e simuladas.
const root = fileURLToPath(new URL("../../", import.meta.url));
const files = fs.readdirSync(path.join(root, "src")).flatMap((dir) => {
  const pub = path.join(root, "src", dir, "public");
  return fs.existsSync(pub) ? fs.readdirSync(pub).filter((n) => n.includes("listar") && n.endsWith(".html")).map((n) => path.join(pub, n)) : [];
});
let current, base = 100, empty = false;
const writes = [];
let browser, origin, errors;
const cdp = (...args) => browser.enviar(...args);
function records() {
  return empty ? [] : Array.from({ length: 24 }, (_, i) => ({
    id_usuario: current.includes("listar_usuarios") ? base + i + 1 : 501,
    id_categoria: base + i + 1,
    id_conta: base + i + 1,
    id_meta: base + i + 1,
    id_transacao: base + i + 1,
    id_recorrencia: null,
    nome: `Registro ${base + i + 1}`,
    email: `teste${i}@example.test`,
    tipo: "Comum",
    status_usuario: "Ativo",
    data_criacao: "2026-10-20",
    descricao: "Descrição simulada",
    usuarios: { nome: "Pessoa teste" },
    contas_bancarias: { id_usuario: 501 },
    nome_conta: `Conta ${i}`,
    codigo_conta: `${i}`,
    tipo_conta: "Corrente",
    nome_instituicao: "Teste",
    status_conta: "Ativa",
    valor_atual: 100,
    valor_meta: 200,
    data_meta: "2026-12-31",
    status: "Em andamento",
    tipo_transacao: "Entrada",
    id_conta_origem: base + 1,
    id_conta_destino: base + 2,
    valor_transacao: 50,
    data_vencimento: "2026-12-31",
    status_transacao: "Pendente",
    modalidade: "Periodico",
    frequencia: "Mensal",
    valor: 50,
    data_inicio: "2026-10-20",
    ativo: true
  }));
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (req.method !== "GET") {
    writes.push(req.url);
    res.writeHead(403);
    return res.end("{}");
  }
  let file;
  if (url.pathname === "/test") file = current;
  else if (url.pathname === "/me") return json({ id_usuario: 501, nome: "Teste", tipo: current.includes("ADMIN_") ? "Admin" : "Comum" });
  else if (url.pathname.includes("verificar-saldo")) return json({ saldo: 100 });
  else if (/^\/(usuario|admin)\//.test(url.pathname)) {
    let data = records();
    if (url.pathname.includes("recorrencias")) data = data.map((x) => ({ ...x, id_recorrencia: x.id_transacao }));
    if (url.pathname.includes("metas")) data = { metas: data };
    return json(data);
  } else if (url.pathname.startsWith("/tela-")) {
    res.setHeader("Content-Type", "text/html");
    return res.end("<html><body>Destino simulado</body></html>");
  } else {
    for (const dir of ["rf-003-Cadastro_usuario/public", "rf-002-Login/public", "img"]) {
      const p = path.join(root, "src", dir, path.basename(url.pathname));
      if (fs.existsSync(p) && fs.statSync(p).isFile()) {
        file = p;
        break;
      }
    }
  }
  if (!file) {
    res.writeHead(404);
    return res.end("");
  }
  res.setHeader("Content-Type", file.endsWith(".html") ? "text/html" : file.endsWith(".css") ? "text/css" : file.endsWith(".js") ? "application/javascript" : "image/png");
  res.end(fs.readFileSync(file));
  function json(data) {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(data));
  }
});
async function evaluate(expression) {
  const r = await cdp("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
async function until(expr) {
  for (let i = 0; i < 100; i++) {
    if (await evaluate(expr)) return;
    await delay(30);
  }
  throw Error("Timeout " + expr + " errors=" + JSON.stringify(errors));
}
async function settle() {
  await evaluate("new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))");
}
async function press(key, code, n) {
  await cdp("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode: n, text: key === "Enter" ? "\r" : key === " " ? " " : void 0 });
  await cdp("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode: n });
}
async function point(selector, index = 0, scroll = true) {
  if (scroll) {
    await evaluate(`document.querySelectorAll(${JSON.stringify(selector)})[${index}].scrollIntoView({block:'center',inline:'nearest'})`);
    await settle();
  }
  return evaluate(`(()=>{const e=document.querySelectorAll(${JSON.stringify(selector)})[${index}],r=e.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:r.width,height:r.height,hit:e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}})()`);
}
async function click(selector, index = 0, mobile = false, scroll = true) {
  const p = await point(selector, index, scroll);
  assert(p.hit, "Botão encoberto " + selector + JSON.stringify(p));
  if (mobile) {
    await cdp("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: p.x, y: p.y }] });
    await cdp("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  } else {
    await cdp("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, x: p.x, y: p.y });
    await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x: p.x, y: p.y });
  }
  await settle();
}
const trigger = ".botao-opcoes-tabela";
async function openCheck(index, mobile) {
  await click(trigger, index, mobile);
  await until(`document.querySelector('.menu-tabela:not([hidden])') !== null`);
  const state = await evaluate(`(()=>{const m=document.querySelector('.menu-tabela:not([hidden])'),r=m.getBoundingClientRect(),b=document.querySelectorAll('${trigger}')[${index}];return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,w:innerWidth,h:innerHeight,expanded:b.getAttribute('aria-expanded'),count:document.querySelectorAll('${trigger}[aria-expanded="true"]').length}})()`);
  assert.equal(state.expanded, "true");
  assert.equal(state.count, 1);
  assert(state.left >= 7.9 && state.top >= 7.9 && state.right <= state.w - 7.9 && state.bottom <= state.h - 7.9, JSON.stringify(state));
}
async function closed() {
  assert.equal(await evaluate(`document.querySelectorAll('.menu-tabela:not([hidden])').length`), 0);
}
async function load(file, size, mode) {
  current = file;
  base = 100;
  empty = false;
  await cdp("Emulation.setDeviceMetricsOverride", { width: size[0], height: size[1], deviceScaleFactor: 1, mobile: size[0] < 600 });
  await cdp("Emulation.setTouchEmulationEnabled", { enabled: size[0] < 600 });
  await cdp("Page.navigate", { url: `${origin}/test?id_usuario=501` });
  await until(`document.readyState === 'complete' && !!document.querySelector('#corpo-tabela')`);
  if (file.includes("listar_usuarios")) await evaluate(`document.querySelector('#form-listar-usuarios').requestSubmit()`);
  await until(`document.querySelectorAll('${trigger}').length === 24`);
  if (mode === "recorrencia") {
    await evaluate(`document.querySelector('input[value="Recorrencias"]').click()`);
    await until(`document.querySelector('#label-pesquisa').textContent.includes('recorrência') && document.querySelectorAll('${trigger}').length === 24`);
  }
  await until(`![...document.querySelectorAll('.loading-overlay')].some(e=>!e.hidden&&getComputedStyle(e).display!=='none')`);
  await settle();
}
before(async () => {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;
  browser = await abrirNavegador(origin);
  errors = browser.erros;
});
after(async () => {
  await browser?.fechar();
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
}, { timeout: 25000 });
for (const size of [[1280, 900], [390, 844], [320, 568]]) for (const file of files) {
  for (const mode of file.includes("listar-transacoes") ? ["transacao", "recorrencia"] : ["normal"]) {
    test(`${path.basename(file)} ${mode} ${size.join("x")}`, { timeout: 3e4 }, async () => {
      await load(file, size, mode);
      const mobile = size[0] < 600;
      const structure = await evaluate(`(()=>{const t=document.querySelector('table'),b=document.querySelector('${trigger}');return {head:t.tHead.rows[0].cells[0].textContent,columns:t.tHead.rows[0].cells.length,rows:[...t.tBodies[0].rows].map(r=>r.cells.length),buttons:document.querySelectorAll('#corpo-tabela button').length,type:b.type,label:b.getAttribute('aria-label'),width:b.offsetWidth,height:b.offsetHeight}})()`);
      assert.equal(structure.head, "Opções");
      assert(structure.rows.every((n) => n === structure.columns));
      assert.equal(structure.buttons, 24);
      assert.equal(structure.type, "button");
      assert.equal(structure.width, 24);
      assert.equal(structure.height, 24);
      assert(structure.label.includes("101"));
      await evaluate(`window.rowActions=0;window.submissions=0;document.querySelectorAll('#corpo-tabela tr').forEach(r=>{r.addEventListener('click',()=>rowActions++);r.addEventListener('keydown',()=>rowActions++);});document.addEventListener('submit',()=>submissions++);`);
      const touchTarget = await evaluate(`(()=>{const b=document.querySelector('${trigger}'),s=getComputedStyle(b,'::after');return {width:parseFloat(s.width),height:parseFloat(s.height)}})()`);
      assert(touchTarget.width >= 44 && touchTarget.height >= 44);
      const p = await point(trigger, 0);
      const edge = { x: p.x + 20, y: p.y };
      assert(await evaluate(`document.querySelector('${trigger}').contains(document.elementFromPoint(${edge.x},${edge.y}))`));
      if (mobile) {
        await cdp("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [edge] });
        await cdp("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      } else {
        await cdp("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, ...edge });
        await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, ...edge });
      }
      await until(`!!document.querySelector('.menu-tabela:not([hidden])')`);
      await click(trigger, 0, mobile, false);
      await closed();
      await openCheck(0, mobile);
      const expectedActions = path.basename(file) === 'listar-contas.html' ? ['Ver']
        : file.includes('listar_categoria') || file.includes('listar_usuarios')
          || (file.includes('ADMIN_') && (file.includes('listar-transacoes') || file.includes('listar-contas')))
          ? ['Editar', 'Excluir'] : ['Ver', 'Excluir'];
      assert.deepEqual(await evaluate(`[...document.querySelectorAll('.menu-tabela button')].map(b=>b.textContent)`), expectedActions);
      await press("Escape", "Escape", 27);
      await closed();
      assert(await evaluate(`document.activeElement === document.querySelector('${trigger}')`));
      for (const [key, code, n] of [["Enter", "Enter", 13], [" ", "Space", 32]]) {
        await press(key, code, n);
        await until(`!!document.querySelector('.menu-tabela:not([hidden])')`);
        await press("Escape", "Escape", 27);
      }
      assert.equal(await evaluate("rowActions"), 0);
      assert.equal(await evaluate("submissions"), 0);
      assert.equal(await evaluate(`getComputedStyle(document.activeElement).outlineStyle`), "solid");
      await openCheck(1, mobile);
      await click(trigger, 0, mobile, false);
      assert.equal(await evaluate(`document.querySelectorAll('${trigger}')[1].getAttribute('aria-expanded')`), "false");
      assert.equal(await evaluate(`document.querySelectorAll('${trigger}')[0].getAttribute('aria-expanded')`), "true");
      await press("Escape", "Escape", 27);
      await openCheck(23, mobile);
      await cdp("Input.dispatchMouseEvent", { type: "mousePressed", button: "left", clickCount: 1, x: 3, y: 3 });
      await cdp("Input.dispatchMouseEvent", { type: "mouseReleased", button: "left", clickCount: 1, x: 3, y: 3 });
      await closed();
      await evaluate(`document.querySelector('#div-tabela').scrollLeft=10000`);
      await settle();
      await openCheck(23, mobile);
      await press("Escape", "Escape", 27);
      // Abrir próximo ao rodapé, para verificar inversão/acerto da posição.
      await evaluate(`(()=>{const b=document.querySelectorAll('${trigger}')[22];b.scrollIntoView({block:'end'});})()`);
      await settle();
      await click(trigger, 22, mobile, false);
      await until(`!!document.querySelector('.menu-tabela:not([hidden])')`);
      assert(await evaluate(`document.querySelector('.menu-tabela').getBoundingClientRect().bottom <= innerHeight-8`));
      await press("Escape", "Escape", 27);
      // A confirmação original deve apontar para o último registro; não confirmar a exclusão.
      await openCheck(23, mobile);
      const hasDelete = await evaluate(`!!document.querySelector('.menu-tabela .botao-excluir')`);
      if (hasDelete) {
        await click(".menu-tabela .botao-excluir", 0, mobile, false);
        await closed();
        const target = await evaluate(`(()=>{if(typeof exclusaoPendente!=='undefined')return JSON.stringify(exclusaoPendente);if(typeof categoriaExcluir!=='undefined')return JSON.stringify(categoriaExcluir);if(typeof contaExcluir!=='undefined')return JSON.stringify(contaExcluir);return [...document.querySelectorAll('.loading-overlay [onclick]')].map(e=>e.getAttribute('onclick')).join(' ');})()`);
        assert(target.includes("124"), target);
        await evaluate(`(()=>{const cancel=[...document.querySelectorAll('.loading-overlay button,.loading-overlay input')].find(e=>(e.textContent==='Cancelar'||e.value==='Cancelar')&&e.getClientRects().length);if(!cancel)throw Error('Cancelar ausente');cancel.click();})()`);
      } else await press("Escape", "Escape", 27);
      // Pesquisar novamente com registros diferentes e com resultado vazio.
      base = 200;
      await evaluate(`document.querySelector('form[id^="form-listar"]').requestSubmit()`);
      await until(`document.querySelector('${trigger}')?.getAttribute('aria-label').includes('201')`);
      await openCheck(0, mobile);
      await press("Escape", "Escape", 27);
      empty = true;
      await evaluate(`document.querySelector('form[id^="form-listar"]').requestSubmit()`);
      await until(`document.querySelectorAll('${trigger}').length===0 && ![...document.querySelectorAll('.loading-overlay')].some(e=>!e.hidden&&getComputedStyle(e).display!=='none')`);
      if (!file.includes("listar_usuarios")) assert.equal(await evaluate(`document.querySelector('#corpo-tabela td').colSpan`), structure.columns);
      empty = false;
      base = 300;
      await evaluate(`document.querySelector('form[id^="form-listar"]').requestSubmit()`);
      await until(`document.querySelector('${trigger}')?.getAttribute('aria-label').includes('301')`);
      await openCheck(23, mobile);
      // Executa a navegação original em servidor simulado e confere ID e proprietário.
      await click(".menu-tabela button", 0, mobile, false);
      await until(`location.pathname.startsWith('/tela-')`);
      const destination = await evaluate("location.href");
      assert(destination.includes("324"), destination);
      if (file.includes("ADMIN_") && (file.includes("contas") || file.includes("transacoes"))) assert(destination.includes("id_usuario=501"), destination);
      if (file.includes("ADMIN_") && file.includes("metas")) assert(destination.includes("id_usuario=501"), destination);
      assert.equal(errors.length, 0, errors.join("\n"));
      assert.equal(writes.length, 0);
    });
  }
}
test("atalhos, permissões, bloqueios, recarga e duas tabelas", { timeout: 3e4 }, async () => {
  const admin = files.find((f) => f.includes("ADMIN_listar-transacoes"));
  await load(admin, [390, 844], "transacao");
  await openCheck(0, true);
  await press("End", "End", 35);
  assert.equal(await evaluate("document.activeElement.textContent"), "Excluir");
  await press("Home", "Home", 36);
  assert.equal(await evaluate("document.activeElement.textContent"), "Editar");
  await press("Tab", "Tab", 9);
  await closed();
  // Atalho pelo botão direito, mantendo posição dentro da tela.
  await point(trigger, 0);
  await evaluate(`document.querySelector('#corpo-tabela tr').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:innerWidth-2,clientY:innerHeight-2}))`);
  assert(await evaluate(`(()=>{const r=document.querySelector('.menu-tabela').getBoundingClientRect();return r.right<=innerWidth-8&&r.bottom<=innerHeight-8})()`));
  await press("Escape", "Escape", 27);
  // Permissão já existente: proprietário desconhecido mantém ações desabilitadas.
  await evaluate(`renderizarTabela([{id_transacao:901,nome:'Sem proprietário',id_usuario:null}])`);
  await settle();
  await openCheck(0, true);
  assert(await evaluate(`[...document.querySelectorAll('.menu-tabela button')].every(b=>b.disabled)`));
  await press("Escape", "Escape", 27);
  // Bloqueio de carregamento mantém a proteção existente.
  await evaluate(`document.getElementById('loading-overlay').style.display='flex';document.querySelector('${trigger}').click()`);
  await closed();
  await evaluate(`document.getElementById('loading-overlay').style.display='none'`);
  // Substituição dinâmica das linhas fecha o menu antigo e habilita as novas linhas.
  await openCheck(0, true);
  await evaluate(`renderizarTabela([{id_transacao:902,nome:'Novo registro',id_usuario:501}])`);
  await settle();
  await closed();
  await openCheck(0, true);
  await press("Escape", "Escape", 27);
  // Uma só instância aberta mesmo se duas tabelas compartilharem a página.
  await evaluate(`(()=>{const t=document.createElement('table');t.className='tabela-listagem';t.innerHTML='<tbody><tr><td>999</td></tr></tbody>';document.body.append(t);const m=criarMenuTabela(t.tBodies[0]),a=document.createElement('div');a.className='acoes-tabela';a.innerHTML='<button>Ver</button>';m.registrar(t.rows[0],a);window.extraMenu=m;})()`);
  await settle();
  await evaluate(`document.querySelectorAll('${trigger}')[0].click();document.querySelectorAll('${trigger}')[1].click()`);
  assert.equal(await evaluate(`document.querySelectorAll('.menu-tabela:not([hidden])').length`), 1);
  assert.equal(await evaluate(`document.querySelectorAll('${trigger}')[0].getAttribute('aria-expanded')`), "false");
  await press("Escape", "Escape", 27);
  const user = files.find((f) => f.endsWith("/listar-transacoes.html"));
  await load(user, [1280, 900], "transacao");
  await evaluate(`renderizarTabela([{id_transacao:903,nome:'Transação recorrente',id_recorrencia:10}])`);
  await settle();
  await openCheck(0, false);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.menu-tabela button')].map(b=>b.textContent)`), ["Ver"]);
  // Ativação da ação por teclado usa o redirecionamento original.
  await press("Enter", "Enter", 13);
  await until(`location.pathname.startsWith('/tela-')`);
  assert((await evaluate("location.href")).includes("id_transacao=903"));
  // Recarregamento completo mantém os botões operacionais.
  await load(user, [320, 568], "transacao");
  await cdp("Page.reload");
  await until(`document.querySelectorAll('${trigger}').length===24 && ![...document.querySelectorAll('.loading-overlay')].some(e=>!e.hidden&&getComputedStyle(e).display!=='none')`);
  await settle();
  await openCheck(0, true);
  assert.equal(errors.length, 0, errors.join("\n"));
  assert.equal(writes.length, 0);
});
