// Gate de conformidad de BANO contra el spec de Open Responses.
// Uso: node tests/conformidad.mjs   (lee .env del repo)
// Sale con codigo 1 si algun caso falla.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ponytail: .env plano en vez de dotenv; son 3 lineas y no hay build.
const env = { ...process.env };
if (existsSync(".env")) {
  for (const l of readFileSync(".env", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(?:#.*)?$/);
    if (m && m[2]) env[m[1]] ??= m[2];
  }
}
const BASE = (env.BANO_BASE_URL || "").replace(/\/$/, "");
const TOKEN = env.BANO_BEARER_TOKEN || "";
if (!BASE) { console.error("Falta BANO_BASE_URL (en .env o el entorno)"); process.exit(2); }

const dir = mkdtempSync(join(tmpdir(), "bano-"));

// El fetch de Node cuelga contra APIs externas en este entorno -> curl.
// Y el body NUNCA va como argumento -d: corrompe UTF-8 multibyte en Windows.
function post(body, { token = TOKEN } = {}) {
  const f = join(dir, "body.json");
  writeFileSync(f, JSON.stringify(body));
  const args = ["-s", "-m", "60", "-X", "POST", BASE + "/responses",
    "-H", "Content-Type: application/json",
    "-w", "\n__HTTP__%{http_code}", "--data-binary", "@" + f];
  if (token) args.push("-H", "Authorization: Bearer " + token);
  const raw = execFileSync("curl", args, { encoding: "utf8" });
  const i = raw.lastIndexOf("\n__HTTP__");
  const status = Number(raw.slice(i + 9).trim());
  let json = null;
  try { json = JSON.parse(raw.slice(0, i)); } catch {}
  return { status, json, raw: raw.slice(0, i) };
}

// Manda un body crudo tal cual, para probar JSON malformado.
function postCrudo(texto) {
  const f = join(dir, "crudo.txt");
  writeFileSync(f, texto);
  const raw = execFileSync("curl", ["-s", "-m", "60", "-X", "POST", BASE + "/responses",
    "-H", "Content-Type: application/json", "-H", "Authorization: Bearer " + TOKEN,
    "-w", "|__HTTP__%{http_code}", "--data-binary", "@" + f], { encoding: "utf8" });
  const i = raw.lastIndexOf("|__HTTP__");
  let json = null;
  try { json = JSON.parse(raw.slice(0, i)); } catch {}
  return { status: Number(raw.slice(i + 9).trim()), json, raw: raw.slice(0, i) };
}

let fallos = 0;
function check(nombre, cond, detalle = "") {
  if (cond) { console.log("  ok    " + nombre); }
  else { console.log("  FALLA " + nombre + (detalle ? " -> " + detalle : "")); fallos++; }
}

console.log("");
console.log("BANO -> " + BASE + "/responses");

// --- Ticket #1: forma de la respuesta con input como string ---
console.log("");
console.log("#1 respuesta conforme (input string)");
{
  const r = post({ model: "bano", input: "hola" });
  check("HTTP 200", r.status === 200, "http=" + r.status + " body=" + r.raw.slice(0, 200));
  const j = r.json ?? {};
  check("trae id", typeof j.id === "string" && j.id.length > 0);
  check('object == "response"', j.object === "response", "object=" + j.object);
  check("output es un array no vacio", Array.isArray(j.output) && j.output.length > 0);
  check("trae usage", j.usage && typeof j.usage === "object");

  const item = (j.output || [])[0] || {};
  check("el item trae id", typeof item.id === "string" && item.id.length > 0);
  check("el item trae type", typeof item.type === "string", "type=" + item.type);
  check("el item trae status", typeof item.status === "string", "status=" + item.status);

  const part = (item.content || [])[0] || {};
  check('el content part es "output_text"', part.type === "output_text", "type=" + part.type);
  check("el content part trae texto", typeof part.text === "string" && part.text.length > 0);
}

// --- Ticket #2: el bearer es obligatorio ---
console.log("");
console.log("#2 autenticacion por bearer");
{
  const sin = post({ model: "bano", input: "hola" }, { token: "" });
  check("sin Authorization -> 401", sin.status === 401, "http=" + sin.status);
  const e = (sin.json || {}).error || {};
  check("el error trae type", typeof e.type === "string", "type=" + e.type);
  check("el error trae code", typeof e.code === "string", "code=" + e.code);
  check("el error trae message", typeof e.message === "string" && e.message.length > 0);
  check("el error trae param", "param" in e, "param=" + e.param);

  const malo = post({ model: "bano", input: "hola" }, { token: "token-equivocado" });
  check("bearer incorrecto -> 401", malo.status === 401, "http=" + malo.status);

  const bueno = post({ model: "bano", input: "hola" });
  check("bearer correcto -> 200", bueno.status === 200, "http=" + bueno.status);
  check("bearer correcto -> sigue conforme", (bueno.json || {}).object === "response");
}

// --- Ticket #3: `input` acepta string y array de items ---
console.log("");
console.log("#3 input como string y como array");
{
  const item = (texto) => ({
    type: "message",
    role: "user",
    content: [{ type: "input_text", text: texto }],
  });
  const salida = (r) => (((r.json || {}).output || [])[0]?.content || [])[0]?.text || "";

  const str = post({ model: "bano", input: "hola" });
  const arr = post({ model: "bano", input: [item("hola")] });
  check("array de un item -> 200", arr.status === 200, "http=" + arr.status);
  check("string y array dan la misma salida", salida(str) === salida(arr),
    "string=" + salida(str) + " array=" + salida(arr));

  const varios = post({ model: "bano", input: [item("uno"), item("dos"), item("tres")] });
  check("array de varios items -> 200", varios.status === 200, "http=" + varios.status);
  check("lee todos los items, no solo el primero",
    salida(varios).includes("uno") && salida(varios).includes("tres"),
    "salida=" + salida(varios));

  const vacio = post({ model: "bano", input: [] });
  check("array vacio -> error de validacion", vacio.status >= 400 && vacio.status < 500,
    "http=" + vacio.status);
}

// --- Ticket #4: peticiones malformadas ---
console.log("");
console.log("#4 errores de validacion");
{
  // Regresion critica: la plataforma real NO manda `model`.
  // Exigirlo romperia el endpoint en el primer mensaje del evaluador.
  const comoLaPlataforma = post({
    input: [{ role: "user", type: "message", content: [{ type: "input_text", text: "hola" }] }],
    stream: true,
    store: true,
  });
  check("body real de la plataforma (sin model) -> 200", comoLaPlataforma.status === 200,
    "http=" + comoLaPlataforma.status);

  const err = (r) => (r.json || {}).error || {};

  const sinInput = post({ stream: true });
  check("falta input -> 400", sinInput.status === 400, "http=" + sinInput.status);
  check("el error apunta a input", err(sinInput).param === "input",
    "param=" + err(sinInput).param);

  const tipoMalo = post({ input: 123 });
  check("input de tipo invalido -> 400", tipoMalo.status === 400, "http=" + tipoMalo.status);

  const sinType = post({ input: [{ role: "user", content: [{ type: "input_text", text: "x" }] }] });
  check("item sin type -> 400", sinType.status === 400, "http=" + sinType.status);

  // n8n atrapa el JSON roto antes del flujo: responde 422 con su propio cuerpo.
  // No se puede interceptar. Se exige lo alcanzable: 4xx y JSON, nunca 200 ni 500.
  const roto = postCrudo('{"input": "hola"');
  check("JSON roto -> 4xx (no 200 ni 500)", roto.status >= 400 && roto.status < 500,
    "http=" + roto.status);
  check("JSON roto -> el cuerpo es JSON", roto.json !== null, "cuerpo=" + roto.raw.slice(0, 120));

  // Ningun error debe filtrar el nombre de un nodo ni una traza interna.
  const fugas = [sinInput, tipoMalo, sinType].map((r) => r.raw).join(" ");
  check("los errores no filtran nombres de nodos ni trazas",
    !/Autorizar|Construir response|Leer token|evalmachine|node_modules/i.test(fugas));
}

console.log("");
console.log(fallos === 0 ? "TODO VERDE" : fallos + " FALLO(S)");
console.log("");
process.exit(fallos === 0 ? 0 : 1);
