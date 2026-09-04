// Desglosa UNA ejecucion por nodo: cuanto tardo cada uno y cuantas veces corrio.
//
// Complementa tests/perfil-latencia.mjs: ese dice cuanto tarda el total, este dice en que
// se va. Tampoco manda nada nuevo, lee una ejecucion ya guardada.
//
// Uso: node tests/perfil-nodos.mjs <idEjecucion>
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
const id = process.argv[2];
if (!API || !KEY) { console.error("Faltan N8N_BASE_URL y N8N_API_KEY"); process.exit(2); }
if (!id) { console.error("Uso: node tests/perfil-nodos.mjs <idEjecucion>"); process.exit(2); }

const raw = execFileSync("curl", ["-s", "-m", "120", "-H", "X-N8N-API-KEY: " + KEY,
  API + "/api/v1/executions/" + id + "?includeData=true"], { encoding: "utf8", maxBuffer: 256e6 });
const eje = JSON.parse(raw);
const runData = eje?.data?.resultData?.runData;
if (!runData) { console.error("La ejecucion " + id + " no trae datos de nodos."); process.exit(1); }

const total = (new Date(eje.stoppedAt) - new Date(eje.startedAt)) / 1000;

const filas = [];
for (const [nombre, corridas] of Object.entries(runData)) {
  const ms = corridas.reduce((s, c) => s + (c.executionTime || 0), 0);
  filas.push({ nombre, veces: corridas.length, seg: ms / 1000 });
}
filas.sort((a, b) => b.seg - a.seg);

console.log("");
console.log("Ejecucion " + id + "  ->  " + total.toFixed(1) + " s de punta a punta");
console.log("");
console.log("  " + "segundos".padStart(9) + "  " + "veces".padStart(5) + "  nodo");
for (const f of filas) {
  const barra = "#".repeat(Math.max(0, Math.round((f.seg / total) * 40)));
  console.log("  " + f.seg.toFixed(1).padStart(9) + "  " + String(f.veces).padStart(5) + "  " +
    f.nombre.padEnd(28) + " " + barra);
}

const sumado = filas.reduce((s, f) => s + f.seg, 0);
console.log("");
console.log("  suma de nodos: " + sumado.toFixed(1) + " s de " + total.toFixed(1) + " s totales");
console.log("  (la diferencia es sobrecarga del propio n8n entre nodos)");

// Cuantas veces llamo a la herramienta: es el numero que mas mueve la latencia segun la
// investigacion (cada llamada es ida y vuelta a embeddings + pgvector + otra ronda del modelo).
const tool = filas.find((f) => f.nombre === "corpus_trayectoria");
const modelo = filas.find((f) => f.nombre === "Modelo");
console.log("");
if (tool) console.log("  llamadas a corpus_trayectoria: " + tool.veces + "  (" + tool.seg.toFixed(1) + " s)");
if (modelo) console.log("  rondas del modelo:            " + modelo.veces + "  (" + modelo.seg.toFixed(1) + " s)");
console.log("");
