// Crea (o actualiza) el flujo de TEST como copia del de produccion.
//
// Existe para que los experimentos de latencia no toquen el endpoint que usa el evaluador.
// Se ejecuta las veces que haga falta: si el flujo de test ya existe, lo sobrescribe con la
// copia fresca de produccion, que es justo lo que se quiere antes de empezar un experimento.
//
// Uso:  node infra/crear-flujo-test.mjs <workflowIdProduccion>
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
const origen = process.argv[2] || env.BANO_WORKFLOW_ID || "PbqHY1VMomVqBJP0";
if (!API || !KEY) { console.error("Faltan N8N_BASE_URL y N8N_API_KEY"); process.exit(2); }

const NOMBRE_TEST = "BANO — TEST (latencia)";
const RUTA_TEST = "bano/test/v1/responses";

const dir = mkdtempSync(join(tmpdir(), "bano-test-flow-"));
const curl = (args) => {
  try { return execFileSync("curl", args, { encoding: "utf8", maxBuffer: 64e6 }); }
  catch (e) { console.error("curl salio con " + e.status); process.exit(2); }
};
const get = (url) => JSON.parse(curl(["-s", "-m", "60", "-H", "X-N8N-API-KEY: " + KEY, url]));

const prod = get(API + "/api/v1/workflows/" + origen);
if (!prod.nodes) { console.error("No se pudo leer el flujo de produccion " + origen); process.exit(2); }

// Solo lo que la API acepta al crear: nombre, nodos, conexiones y ajustes.
const copia = {
  name: NOMBRE_TEST,
  nodes: JSON.parse(JSON.stringify(prod.nodes)),
  connections: JSON.parse(JSON.stringify(prod.connections)),
  settings: prod.settings || { executionOrder: "v1" },
};

// El webhook necesita ruta e identificador propios: con los de produccion, n8n no registra
// el segundo flujo y el de test contestaria en la ruta del evaluador.
const wh = copia.nodes.find((n) => n.type === "n8n-nodes-base.webhook");
if (!wh) { console.error("El flujo de produccion no tiene nodo Webhook."); process.exit(2); }
wh.parameters = { ...wh.parameters, path: RUTA_TEST };
wh.webhookId = "bano-test-v1-responses";

// La nota del lienzo, para que nadie confunda los dos flujos al abrirlos.
copia.nodes.push({
  parameters: {
    content: "## FLUJO DE TEST — no es el que usa el evaluador\n\n" +
      "Copia de \"BANO — Open Responses endpoint\" para medir cambios de latencia sin tocar\n" +
      "produccion. Ruta propia: `/webhook/" + RUTA_TEST + "`.\n\n" +
      "Se regenera con `node infra/crear-flujo-test.mjs`, que lo sobrescribe con una copia\n" +
      "fresca de produccion. **No editar produccion desde aqui.**",
    height: 220,
    width: 520,
    color: 3,
  },
  id: "nota_test",
  name: "Nota — flujo de test",
  type: "n8n-nodes-base.stickyNote",
  typeVersion: 1,
  position: [320, -260],
});

const yaExiste = (get(API + "/api/v1/workflows?limit=250").data || [])
  .find((w) => w.name === NOMBRE_TEST);

const f = join(dir, "wf.json");
writeFileSync(f, JSON.stringify(copia));

let resultado;
if (yaExiste) {
  resultado = JSON.parse(curl(["-s", "-m", "60", "-X", "PUT",
    "-H", "X-N8N-API-KEY: " + KEY, "-H", "Content-Type: application/json",
    "--data-binary", "@" + f, API + "/api/v1/workflows/" + yaExiste.id]));
  console.log("Actualizado el flujo de test existente.");
} else {
  resultado = JSON.parse(curl(["-s", "-m", "60", "-X", "POST",
    "-H", "X-N8N-API-KEY: " + KEY, "-H", "Content-Type: application/json",
    "--data-binary", "@" + f, API + "/api/v1/workflows"]));
  console.log("Creado el flujo de test.");
}

if (!resultado.id) { console.error("La API no devolvio un flujo: " + JSON.stringify(resultado).slice(0, 300)); process.exit(2); }

// Un flujo con webhook no atiende peticiones hasta que esta activo.
const activo = JSON.parse(curl(["-s", "-m", "60", "-X", "POST",
  "-H", "X-N8N-API-KEY: " + KEY, API + "/api/v1/workflows/" + resultado.id + "/activate"]));

console.log("");
console.log("  id:     " + resultado.id);
console.log("  nombre: " + resultado.name);
console.log("  activo: " + (activo.active ?? "?"));
console.log("  url:    " + API + "/webhook/" + RUTA_TEST);
console.log("");
console.log("Para medirlo:");
console.log("  BANO_BASE_URL=" + API + "/webhook/bano/test/v1  node tests/invariantes.mjs");
console.log("  node tests/perfil-latencia.mjs 200 " + resultado.id);
console.log("");
console.log("Usa el MISMO token bearer que produccion, a proposito: lo que hay que aislar es el");
console.log("endpoint y el flujo, no la credencial, y una credencial mas seria una pieza mas que");
console.log("mantener sincronizada para no ganar nada.");
console.log("");
