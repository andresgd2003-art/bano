// Despliega prompts/sistema.md al nodo Agente de un workflow de n8n.
//
// El prompt es el artefacto que mas cambia del proyecto, asi que su fuente de verdad es
// el archivo versionado en git, no la caja de texto de la interfaz. Editarlo ahi y no
// aqui hace que el repositorio mienta.
//
// Uso:  node infra/desplegar-prompt.mjs <workflowId> [--verificar]
//       --verificar solo compara, no escribe.
import { execFileSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync, mkdtempSync } from "node:fs";
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
const [workflowId, ...flags] = process.argv.slice(2);
const soloVerificar = flags.includes("--verificar");

if (!API || !KEY) { console.error("Faltan N8N_BASE_URL y N8N_API_KEY (en .env o el entorno)"); process.exit(2); }
if (!workflowId) { console.error("Uso: node infra/desplegar-prompt.mjs <workflowId> [--verificar]"); process.exit(2); }

const dir = mkdtempSync(join(tmpdir(), "bano-prompt-"));
const curl = (args) => {
  try { return execFileSync("curl", args, { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 }); }
  catch (e) { console.error("No se pudo hablar con n8n (curl salio con " + e.status + ")."); process.exit(2); }
};

// El frontmatter lleva la version; el cuerpo es lo que ve el modelo.
const bruto = readFileSync("prompts/sistema.md", "utf8");
const m = bruto.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
if (!m) { console.error("prompts/sistema.md no tiene frontmatter con la version."); process.exit(2); }
const version = (m[1].match(/^version:\s*(.+)$/m) || [, "?"])[1].trim();
// La version viaja DENTRO del prompt: sin esto no se puede saber que version
// produjo una respuesta concreta al revisar una ejecucion vieja.
const prompt = m[2].trim() + "\n\n<!-- prompt v" + version + " -->";

const wf = JSON.parse(curl(["-s", "-m", "60", "-H", "X-N8N-API-KEY: " + KEY, API + "/api/v1/workflows/" + workflowId]));
if (!wf.nodes) { console.error("El workflow " + workflowId + " no existe o la API key no sirve."); process.exit(2); }

const agente = wf.nodes.find((n) => n.type.endsWith("langchain.agent"));
if (!agente) { console.error("El workflow no tiene ningun nodo AI Agent."); process.exit(2); }

const actual = agente.parameters?.options?.systemMessage ?? "";
const versionActual = (actual.match(/<!-- prompt v(.+?) -->/) || [, "(sin marcar)"])[1];

console.log("");
console.log("workflow : " + wf.name);
console.log("nodo     : " + agente.name);
console.log("en n8n   : v" + versionActual);
console.log("en el repo: v" + version);

if (actual === prompt) { console.log("\nYa estan sincronizados. Nada que hacer.\n"); process.exit(0); }
if (soloVerificar) { console.log("\nDIFIEREN. Corre sin --verificar para desplegar.\n"); process.exit(1); }

agente.parameters = { ...agente.parameters, options: { ...(agente.parameters?.options ?? {}), systemMessage: prompt } };

// La version tambien se graba en cada fila de `turnos`, para poder comparar calidad
// entre versiones del prompt. Si el nodo que la escribe queda desfasado, el log miente.
const fmt = wf.nodes.find((n) => n.name === "Formatear response");
if (fmt?.parameters?.jsCode?.includes("PROMPT_VERSION")) {
  fmt.parameters.jsCode = fmt.parameters.jsCode.replace(
    /const PROMPT_VERSION = '[^']*';/,
    "const PROMPT_VERSION = '" + version + "';",
  );
  console.log("tambien: PROMPT_VERSION en \"Formatear response\" -> " + version);
}
const cuerpo = join(dir, "wf.json");
writeFileSync(cuerpo, JSON.stringify({ name: wf.name, nodes: wf.nodes, connections: wf.connections, settings: wf.settings }));

const res = curl(["-s", "-m", "60", "-X", "PUT", API + "/api/v1/workflows/" + workflowId,
  "-H", "X-N8N-API-KEY: " + KEY, "-H", "Content-Type: application/json",
  "-w", "|__HTTP__%{http_code}", "--data-binary", "@" + cuerpo]);
const i = res.lastIndexOf("|__HTTP__");
const status = Number(res.slice(i + 9).trim());
if (status !== 200) { console.error("\nn8n respondio " + status + ": " + res.slice(0, 300) + "\n"); process.exit(1); }

console.log("\nDesplegado v" + version + ".\n");
