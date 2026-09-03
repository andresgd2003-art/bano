// Analisis de huecos del corpus de BANO.
// Uso: node tests/huecos.mjs
//
// NO es un gate: no falla ni bloquea nada. Hace las preguntas que un reclutador o un
// evaluador harian de verdad y reporta CUALES no puede responder, para saber que le
// falta al documento de trayectoria.
//
// Un hueco no siempre es un defecto: hay datos que se dejaron fuera a proposito
// (contacto, salario, vida personal). El reporte los separa.
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
const BASE = (env.BANO_BASE_URL || "").replace(/\/$/, "");
const TOKEN = env.BANO_BEARER_TOKEN || "";
if (!BASE || !TOKEN) { console.error("Faltan BANO_BASE_URL y/o BANO_BEARER_TOKEN"); process.exit(2); }

const dir = mkdtempSync(join(tmpdir(), "bano-huecos-"));
function preguntar(texto) {
  const f = join(dir, "q.json");
  writeFileSync(f, JSON.stringify({ input: texto }));
  try {
    const raw = execFileSync("curl", ["-s", "-m", "200", "-X", "POST", BASE + "/responses",
      "-H", "Content-Type: application/json", "-H", "Authorization: Bearer " + TOKEN,
      "--data-binary", "@" + f], { encoding: "utf8" });
    return JSON.parse(raw)?.output?.[0]?.content?.[0]?.text ?? "";
  } catch { return ""; }
}

// `fuera`: se dejo fuera del corpus a proposito, un hueco aqui es correcto.
const preguntas = [
  // Trayectoria
  { p: "¿Cuántos años de experiencia profesional tiene Andrés en total?" },
  { p: "¿Ha trabajado como freelance o solo en empresas?" },
  { p: "¿Ha liderado equipos o gente a su cargo?" },
  { p: "¿En qué ciudad vive y está dispuesto a mudarse?" },
  { p: "¿Cuál es su disponibilidad para incorporarse?" },
  { p: "¿Ha trabajado con clientes internacionales o solo en México?" },
  { p: "¿Qué tamaño tenían los equipos o proyectos en los que participó?" },

  // Proyectos
  { p: "¿Cuántos usuarios o clientes atiende la plataforma Sting AI?" },
  { p: "¿Qué volumen de documentos procesa SATS al día?" },
  { p: "¿Cuánto tiempo le tomó construir cada proyecto?" },
  { p: "¿Tiene los proyectos publicados en GitHub o algún portafolio?" },
  { p: "¿Ha publicado artículos, dado charlas o enseñado?" },
  { p: "¿Qué resultados medibles obtuvo el cliente de USAIGE?" },
  { p: "¿Trabajó solo en esos proyectos o con un equipo?" },

  // Habilidades
  { p: "¿Qué nivel tiene en Python: básico, intermedio o avanzado?" },
  { p: "¿Sabe de Kubernetes?" },
  { p: "¿Ha trabajado con TypeScript o JavaScript en producción?" },
  { p: "¿Tiene experiencia con pruebas automatizadas y CI/CD?" },
  { p: "¿Sabe de seguridad informática o cumplimiento normativo?" },
  { p: "¿Ha hecho fine-tuning de modelos o solo usa APIs?" },
  { p: "¿Qué experiencia tiene con bases de datos además de PostgreSQL?" },

  // Formacion
  { p: "¿Ya se tituló o sigue estudiando?" },
  { p: "¿Tiene promedio o distinciones académicas?" },
  { p: "¿Qué otros cursos o formación tiene además de los certificados?" },

  // Deliberadamente fuera
  { p: "¿Cuál es su correo o teléfono de contacto?", fuera: true },
  { p: "¿Cuánto gana actualmente?", fuera: true },
  { p: "¿Qué edad tiene?", fuera: true },
];

const limpio = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const señales = ["no esta", "no aparece", "no se menciona", "no consta", "no dispongo",
  "no tengo", "sin informacion", "no figura", "no especifica", "no detalla",
  "no hay informacion", "no puedo confirmar", "no registrado", "no se indica"];

console.log("");
console.log("Analisis de huecos del corpus  ->  " + BASE);
console.log("");

const huecos = [], cubiertas = [], correctos = [];
for (const q of preguntas) {
  const t = limpio(preguntar(q.p));
  const noSabe = señales.some((s) => t.includes(s));
  process.stdout.write(noSabe ? "x" : ".");
  if (noSabe && q.fuera) correctos.push(q.p);
  else if (noSabe) huecos.push(q.p);
  else cubiertas.push(q.p);
}
console.log("\n");

console.log("HUECOS REALES (" + huecos.length + ") -- datos que un evaluador puede pedir y BANO no tiene:");
for (const h of huecos) console.log("  - " + h);

console.log("");
console.log("YA CUBIERTAS (" + cubiertas.length + "):");
for (const c of cubiertas) console.log("  - " + c);

console.log("");
console.log("FUERA A PROPOSITO (" + correctos.length + " de " + preguntas.filter((q) => q.fuera).length + ") -- aqui el hueco es lo correcto:");
for (const c of correctos) console.log("  - " + c);

const filtrados = preguntas.filter((q) => q.fuera).length - correctos.length;
if (filtrados > 0) {
  console.log("");
  console.log("AVISO: " + filtrados + " pregunta(s) que deberian quedar fuera SI obtuvieron respuesta.");
  console.log("Revisa que el corpus no traiga datos personales.");
}
console.log("");
