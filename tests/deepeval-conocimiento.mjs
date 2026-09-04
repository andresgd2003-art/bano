// DeepEval de conocimiento: 10 conversaciones multi-turno guionadas que atacan lo que la
// bateria adversaria (deepeval.mjs) no cubre: precision sobre conceptos y definiciones,
// exactitud de la trayectoria, y recuperacion de memoria a lo largo de varios turnos.
//
// No hay usuario simulado aleatorio aqui: cada conversacion es un guion fijo, para que el
// caso sea reproducible y el fallo se pueda diagnosticar. La memoria se pone a prueba haciendo
// que un turno dependa de lo dicho tres o cuatro turnos antes ("de la que me hablaste primero",
// "vuelve a la empresa que mencionaste"), encadenados por previous_response_id.
//
// El juez evalua la TRANSCRIPCION completa contra un criterio. Uso: node tests/deepeval-conocimiento.mjs
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync, mkdtempSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { juzgar } from "./juez.mjs";

const env = { ...process.env };
if (existsSync(".env")) {
  for (const l of readFileSync(".env", "utf8").split("\n")) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*(?:#.*)?$/);
    if (m && m[2]) env[m[1]] ??= m[2];
  }
}
const BASE = (env.BANO_BASE_URL || "").replace(/\/$/, "");
const TOKEN = env.BANO_BEARER_TOKEN || "";
if (!BASE || !TOKEN) { console.error("Faltan BANO_BASE_URL y/o BANO_BEARER_TOKEN"); process.exit(2); }

const dir = mkdtempSync(join(tmpdir(), "bano-conoc-"));
function preguntar(texto, prev) {
  writeFileSync(join(dir, "q.json"), JSON.stringify(prev ? { input: texto, previous_response_id: prev } : { input: texto }));
  try {
    const raw = execFileSync("curl", ["-s", "-m", "300", "-X", "POST", BASE + "/responses",
      "-H", "Content-Type: application/json", "-H", "Authorization: Bearer " + TOKEN,
      "--data-binary", "@" + join(dir, "q.json")], { encoding: "utf8" });
    const j = JSON.parse(raw);
    return { id: j?.id, texto: j?.output?.[0]?.content?.[0]?.text ?? "" };
  } catch (e) { return { id: null, texto: "", error: "curl " + e.status }; }
}

// Cada caso: una lista de turnos (el guion) y un criterio para el juez sobre la conversacion
// entera. Los turnos se encadenan solos por previous_response_id.
const CASOS = [
  { grupo: "definicion", nombre: "que es USAIGE (empresa, no lo que hizo ahi)",
    turnos: ["¿Qué es USAIGE?"],
    criterio: "La respuesta explica que USAIGE es una EMPRESA y a qué se dedica (soluciones con IA para gestión/optimización del control energético en plantas industriales), no solo lo que Andrés hizo ahí." },

  { grupo: "definicion", nombre: "que es Sting AI (marca propia)",
    turnos: ["¿Qué es Sting AI, una empresa donde trabajó o algo suyo?"],
    criterio: "La respuesta deja claro que Sting AI es la marca o negocio PROPIO de Andrés, no un empleador externo." },

  { grupo: "definicion", nombre: "distingue empleador de proyecto propio",
    turnos: [
      "¿En qué empresas ha trabajado Andrés?",
      "¿Y Sting AI cuenta como una de esas empresas?",
    ],
    criterio: "En el primer turno lista sus empleos (Western Union, Joyson, USAIGE). En el segundo aclara que Sting AI NO es un empleador externo sino su marca/negocio propio, sin contradecir el primer turno." },

  { grupo: "definicion", nombre: "que es Joyson (giro de la empresa)",
    turnos: ["¿A qué se dedica Joyson Safety Systems?"],
    criterio: "La respuesta describe que Joyson es un fabricante de sistemas de seguridad automotriz (airbags, cinturones o similar), no solo lo que Andrés hizo ahí." },

  { grupo: "trayectoria", nombre: "orden cronologico correcto",
    turnos: [
      "¿En qué empresa trabaja ahora?",
      "¿Y cuál fue justo antes de esa?",
      "¿Y la primera de todas?",
    ],
    criterio: "La conversación establece el orden correcto: actual USAIGE, anterior Joyson, primera Western Union. Ningún turno contradice a otro." },

  { grupo: "trayectoria", nombre: "fecha de USAIGE (abril 2026)",
    turnos: ["¿Desde cuándo trabaja Andrés en USAIGE?"],
    criterio: "La respuesta dice que trabaja en USAIGE desde abril de 2026 (o abril 2026), no solo '2026' a secas ni otra fecha." },

  { grupo: "memoria", nombre: "referencia a 'la primera que mencionaste' (4 turnos)",
    turnos: [
      "Nombra los proyectos de Andrés.",
      "El primero que mencionaste, ¿en qué plataformas atiende clientes?",
      "¿Y ese mismo a cuántos salones llegó a atender?",
      "Volviendo al primer proyecto que nombraste, repíteme cómo se llama.",
    ],
    criterio: "BANO mantiene la referencia al MISMO primer proyecto a lo largo de los cuatro turnos, sin cambiar de proyecto a mitad de conversación, y en el último turno vuelve a nombrar correctamente ese primer proyecto. Debe ser coherente consigo mismo." },

  { grupo: "memoria", nombre: "encadena dato tecnico entre turnos",
    turnos: [
      "¿Qué es SATS?",
      "Ese sistema que acabas de describir, ¿corre en la nube o aislado?",
      "¿Y para qué dependencia de gobierno lo mencionaste?",
    ],
    criterio: "En el turno 2 y 3 BANO sigue hablando de SATS (el sistema del turno 1) sin que se lo vuelvan a nombrar: dice que corre sellado/sin acceso a internet y que está en uso en una dependencia de gobierno estatal. No cambia de tema ni pierde el referente. NO hace falta que nombre la dependencia exacta si el corpus no la da en ese fragmento." },

  { grupo: "memoria", nombre: "no inventa haber dicho algo que no dijo",
    turnos: [
      "¿Qué certificaciones de AWS tiene Andrés?",
      "¿Me habías dicho ya cuánto gana en USAIGE?",
    ],
    criterio: "En el segundo turno BANO reconoce que NO ha dado (ni tiene) una cifra de salario, en vez de inventar que la dijo antes. No debe fabricar un dato de salario ni afirmar haberlo mencionado." },

  { grupo: "memoria", nombre: "cambio de idioma conservando el hilo",
    turnos: [
      "¿En qué empresa trabaja Andrés actualmente?",
      "And what does that company do, exactly?",
      "Gracias. ¿Desde cuándo está ahí?",
    ],
    criterio: "El turno 2 (en inglés) responde EN INGLÉS y sobre USAIGE (la empresa del turno 1) explicando su giro; el turno 3 (en español) responde en español con la fecha de inicio. BANO mantiene el referente (USAIGE) pese al cambio de idioma, y responde cada turno en el idioma de ese turno." },
];

console.log("");
console.log("DeepEval de conocimiento  ->  " + BASE + "  (multi-turno guionado, juzgado por modelo)");
console.log("");

const resultados = [];
let fallos = 0;
for (const c of CASOS) {
  let prev, transcripcion = "", roto = null;
  for (const t of c.turnos) {
    const r = preguntar(t, prev);
    if (!r.texto) { roto = "BANO respondió vacío o falló en: " + t.slice(0, 40); break; }
    prev = r.id || prev;
    transcripcion += "USUARIO: " + t + "\nBANO: " + r.texto + "\n\n";
  }

  let veredicto = "NO_SE_PUEDE_DECIDIR", motivo = roto || "";
  if (!roto) {
    try { const v = juzgar("Conversacion de " + c.turnos.length + " turnos sobre la trayectoria de Andres", transcripcion, c.criterio); veredicto = v.veredicto; motivo = v.motivo; }
    catch (e) { motivo = "el juez falló: " + String(e.message).slice(0, 120); }
  }
  const ok = veredicto === "CUMPLE";
  if (!ok) fallos++;
  console.log("  " + (ok ? "ok   " : "FALLA") + " [" + c.grupo + "] " + c.nombre);
  if (!ok) { console.log("        " + veredicto + " -- " + motivo); console.log("        " + transcripcion.replace(/\s+/g, " ").slice(0, 260)); }
  resultados.push({ grupo: c.grupo, nombre: c.nombre, criterio: c.criterio, veredicto, motivo, transcripcion });
}

let promptVersion = "desconocida";
try { const fm = readFileSync("prompts/sistema.md", "utf8").match(/^version:\s*(.+)$/m); if (fm) promptVersion = fm[1].trim(); } catch {}

const total = resultados.length;
const resumen = { fecha: new Date().toISOString(), prompt_version: promptVersion, ok: total - fallos, total, resultados };
mkdirSync("resultados/deepeval", { recursive: true });
const archivo = "resultados/deepeval/conocimiento-" + resumen.fecha.slice(0, 10) + ".json";
writeFileSync(archivo, JSON.stringify(resumen, null, 2));

console.log("");
for (const g of ["definicion", "trayectoria", "memoria"]) {
  const d = resultados.filter((r) => r.grupo === g);
  console.log("  " + g + ": " + d.filter((r) => r.veredicto === "CUMPLE").length + "/" + d.length);
}
console.log("");
console.log("Resultados en " + archivo + " (prompt v" + promptVersion + ")");
console.log("");
console.log(fallos === 0 ? "TODO VERDE (" + total + " conversaciones)" : fallos + " FALLO(S) de " + total);
console.log("");
process.exit(fallos === 0 ? 0 : 1);
