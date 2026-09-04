// Manda una pregunta y reporta cuantas RONDAS del modelo costo, no solo cuanto tardo.
//
// Es el instrumento del ticket #29: la latencia es (rondas) x (costo por ronda), y las rondas
// son el multiplicador. Sin medirlas, "esto quedo mas rapido" es una anecdota.
//
// Uso: node tests/medir-rondas.mjs <workflowId> "la pregunta" [repeticiones]
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const env = { ...process.env };
if (existsSync(".env")) {
  for (const l of readFileSync(".env", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(?:#.*)?$/);
    if (m && m[2]) env[m[1]] ??= m[2];
  }
}
const API = (env.N8N_BASE_URL || "").replace(/\/$/, "");
const KEY = env.N8N_API_KEY || "";
const TOKEN = env.BANO_BEARER_TOKEN || "";
const [workflowId, pregunta, repes] = process.argv.slice(2);
if (!API || !KEY || !TOKEN) { console.error("Faltan N8N_BASE_URL, N8N_API_KEY o BANO_BEARER_TOKEN"); process.exit(2); }
if (!workflowId || !pregunta) {
  console.error('Uso: node tests/medir-rondas.mjs <workflowId> "la pregunta" [repeticiones]');
  process.exit(2);
}
const veces = Number(repes || 1);

// La URL base se deduce del flujo: se lee la ruta de su nodo Webhook, para no tener que
// pasarla a mano y no equivocarse de flujo, que es el error que arruinaria la medida.
const curl = (args) => execFileSync("curl", args, { encoding: "utf8", maxBuffer: 64e6 });
const wf = JSON.parse(curl(["-s", "-m", "60", "-H", "X-N8N-API-KEY: " + KEY,
  API + "/api/v1/workflows/" + workflowId]));
const ruta = wf.nodes?.find((n) => n.type === "n8n-nodes-base.webhook")?.parameters?.path;
if (!ruta) { console.error("No se pudo leer la ruta del webhook del flujo " + workflowId); process.exit(2); }
const URL_BASE = API + "/webhook/" + ruta;

const dir = mkdtempSync(join(tmpdir(), "bano-rondas-"));

function preguntar() {
  const f = join(dir, "q.json");
  writeFileSync(f, JSON.stringify({ input: pregunta }));
  const t0 = Date.now();
  try {
    const raw = curl(["-s", "-m", "300", "-w", "|HTTP%{http_code}", "-X", "POST", URL_BASE,
      "-H", "Content-Type: application/json", "-H", "Authorization: Bearer " + TOKEN,
      "--data-binary", "@" + f]);
    const i = raw.lastIndexOf("|HTTP");
    let texto = "";
    try { texto = JSON.parse(raw.slice(0, i))?.output?.[0]?.content?.[0]?.text ?? ""; } catch {}
    return { status: Number(raw.slice(i + 5).trim()), texto, seg: (Date.now() - t0) / 1000 };
  } catch (e) {
    return { status: 0, texto: "", seg: (Date.now() - t0) / 1000, curl: e.status };
  }
}

// Se lee la ejecucion recien creada para saber en cuantas rondas se resolvio.
function ultimaEjecucion() {
  const lista = JSON.parse(curl(["-s", "-m", "60", "-H", "X-N8N-API-KEY: " + KEY,
    API + "/api/v1/executions?workflowId=" + workflowId + "&limit=1"]));
  const id = lista.data?.[0]?.id;
  if (!id) return null;
  const eje = JSON.parse(curl(["-s", "-m", "120", "-H", "X-N8N-API-KEY: " + KEY,
    API + "/api/v1/executions/" + id + "?includeData=true"]));
  const runData = eje?.data?.resultData?.runData || {};
  const cuenta = (nodo) => (runData[nodo] || []).length;
  const tiempo = (nodo) => (runData[nodo] || []).reduce((s, c) => s + (c.executionTime || 0), 0) / 1000;
  return {
    id,
    rondas: cuenta("Modelo") + cuenta("Modelo de respaldo (NVIDIA)"),
    llamadas: cuenta("corpus_trayectoria"),
    segModelo: tiempo("Modelo") + tiempo("Modelo de respaldo (NVIDIA)"),
    segTool: tiempo("corpus_trayectoria") + tiempo("Embeddings OpenAI"),
  };
}

console.log("");
console.log("Flujo " + workflowId + "  ->  " + URL_BASE);
console.log("Pregunta: " + pregunta.slice(0, 90));
console.log("");
console.log("  " + "total".padStart(8) + "  " + "rondas".padStart(6) + "  " + "llamadas".padStart(8) +
  "  " + "s/ronda".padStart(7) + "  modelo   tool");

const filas = [];
for (let i = 0; i < veces; i++) {
  const r = preguntar();
  const e = ultimaEjecucion();
  if (r.status !== 200 || !r.texto.trim()) {
    console.log("  FALLO  http=" + r.status + (r.curl ? " curl=" + r.curl : "") +
      (r.texto.trim() ? "" : " texto vacio") + "  (" + r.seg.toFixed(1) + " s)");
    continue;
  }
  const porRonda = e && e.rondas ? (e.segModelo / e.rondas) : 0;
  filas.push({ seg: r.seg, rondas: e?.rondas ?? 0, llamadas: e?.llamadas ?? 0 });
  console.log("  " + r.seg.toFixed(1).padStart(8) + "  " + String(e?.rondas ?? "?").padStart(6) +
    "  " + String(e?.llamadas ?? "?").padStart(8) + "  " + porRonda.toFixed(1).padStart(7) +
    "  " + (e?.segModelo ?? 0).toFixed(1) + " s   " + (e?.segTool ?? 0).toFixed(1) + " s");
}

if (filas.length) {
  const med = (xs) => xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  console.log("");
  console.log("  medianas de " + filas.length + ": " + med(filas.map((f) => f.seg)).toFixed(1) + " s | " +
    med(filas.map((f) => f.rondas)) + " rondas | " + med(filas.map((f) => f.llamadas)) + " llamadas");
}
console.log("");
