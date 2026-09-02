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

console.log("");
console.log(fallos === 0 ? "TODO VERDE" : fallos + " FALLO(S)");
console.log("");
process.exit(fallos === 0 ? 0 : 1);
