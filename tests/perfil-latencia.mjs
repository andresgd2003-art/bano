// Perfil de latencia de BANO, a partir de las ejecuciones que YA existen en n8n.
//
// No manda ni una peticion nueva: el par startedAt/stoppedAt de cada ejecucion es la latencia
// de punta a punta real, y la API de n8n la da gratis. Medir asi no gasta cuota de modelo, que
// es justo lo que no queremos quemar para averiguar cuanto tarda algo.
//
// Uso: node tests/perfil-latencia.mjs [cuantas] [workflowId]
//      Sin workflowId usa el de produccion; pasale el del flujo de test para medir ahi.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";

const env = { ...process.env };
if (existsSync(".env")) {
  for (const l of readFileSync(".env", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(?:#.*)?$/);
    if (m && m[2]) env[m[1]] ??= m[2];
  }
}
const API = (env.N8N_BASE_URL || "").replace(/\/$/, "");
const KEY = env.N8N_API_KEY || "";
const objetivo = Number(process.argv[2] || 300);
const WORKFLOW = process.argv[3] || env.BANO_WORKFLOW_ID || "PbqHY1VMomVqBJP0";
if (!API || !KEY) { console.error("Faltan N8N_BASE_URL y N8N_API_KEY"); process.exit(2); }

function get(url) {
  const raw = execFileSync("curl", ["-s", "-m", "60", "-H", "X-N8N-API-KEY: " + KEY, url],
    { encoding: "utf8", maxBuffer: 64e6 });
  return JSON.parse(raw);
}

const ejecuciones = [];
let cursor = null;
while (ejecuciones.length < objetivo) {
  const url = API + "/api/v1/executions?workflowId=" + WORKFLOW + "&limit=100" +
    (cursor ? "&cursor=" + encodeURIComponent(cursor) : "");
  const pagina = get(url);
  const datos = pagina.data || [];
  if (!datos.length) break;
  ejecuciones.push(...datos);
  cursor = pagina.nextCursor;
  if (!cursor) break;
}

const muestras = ejecuciones
  .filter((e) => e.startedAt && e.stoppedAt)
  .map((e) => ({
    id: e.id,
    status: e.status,
    seg: (new Date(e.stoppedAt) - new Date(e.startedAt)) / 1000,
    cuando: e.startedAt,
  }))
  // Las de menos de 1 s son rechazos tempranos (401, 400): no pasan por el modelo y
  // meterlas en el percentil mentiria sobre lo que tarda una respuesta de verdad.
  .filter((m) => m.seg >= 1);

if (!muestras.length) { console.error("No hay ejecuciones con duracion medible."); process.exit(1); }

const segs = muestras.map((m) => m.seg).sort((a, b) => a - b);
const pct = (p) => segs[Math.min(segs.length - 1, Math.floor((p / 100) * segs.length))];

console.log("");
console.log("Perfil de latencia  (" + muestras.length + " ejecuciones con >=1 s, sin mandar nada nuevo)");
console.log("");
console.log("  mediana (p50): " + pct(50).toFixed(1) + " s");
console.log("  p90:           " + pct(90).toFixed(1) + " s");
console.log("  p95:           " + pct(95).toFixed(1) + " s");
console.log("  maximo:        " + segs[segs.length - 1].toFixed(1) + " s");
console.log("  minimo:        " + segs[0].toFixed(1) + " s");
console.log("");

const cubetas = [[0, 5], [5, 10], [10, 20], [20, 40], [40, 60], [60, 120], [120, 1e9]];
console.log("  distribucion:");
for (const [a, b] of cubetas) {
  const n = segs.filter((s) => s >= a && s < b).length;
  if (!n) continue;
  const etiqueta = b === 1e9 ? ">" + a + "s" : a + "-" + b + "s";
  console.log("    " + etiqueta.padEnd(9) + " " + String(n).padStart(4) + "  " +
    "#".repeat(Math.max(1, Math.round((n / segs.length) * 50))));
}

console.log("");
console.log("  las 10 mas lentas (para inspeccionar por nodo):");
for (const m of muestras.slice().sort((a, b) => b.seg - a.seg).slice(0, 10)) {
  console.log("    " + m.seg.toFixed(1).padStart(7) + " s  id=" + m.id + "  " + m.status + "  " + m.cuando);
}
console.log("");
