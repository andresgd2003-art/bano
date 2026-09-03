// Gate de recuperacion del corpus de BANO.
// Uso: node tests/recuperacion.mjs   (lee .env del repo)
//
// Comprueba que preguntas reales traen los fragmentos correctos. Es el criterio de
// "hecho" de la fase 2 y la red que avisa si una reingesta futura degrada el RAG.
//
// Se exige que el contenido correcto aparezca en el top-k, NO que gane un ranking
// exacto: con un corpus pequeno varias secciones responden legitimamente a la misma
// pregunta, y un gate que exija el primer puesto se rompe solo.
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
const TOKEN = env.BANO_INGESTA_TOKEN || "";
if (!BASE || !TOKEN) {
  console.error("Faltan BANO_BASE_URL y/o BANO_INGESTA_TOKEN (en .env o el entorno)");
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), "bano-rag-"));

// VENTANA es lo que el gate exige: el fragmento correcto debe estar en el top-3.
// MEDIR_K es lo que se pide al recuperador: mas resultados, para poder calcular el
// margen aunque el correcto caiga fuera de la ventana. Separarlos permite ver
// "pasa por poco" y "falla por poco", que es lo que un pasa/falla esconde.
const VENTANA = 3;
const MEDIR_K = 6;

function buscar(pregunta) {
  const f = join(dir, "q.json");
  writeFileSync(f, JSON.stringify({ pregunta, top_k: MEDIR_K }));
  let raw;
  try {
    raw = execFileSync("curl", ["-s", "-m", "120", "-X", "POST", BASE + "/buscar",
      "-H", "Content-Type: application/json", "-H", "Authorization: Bearer " + TOKEN,
      "-w", "|__HTTP__%{http_code}", "--data-binary", "@" + f], { encoding: "utf8" });
  } catch (e) {
    console.error("");
    console.error("No se pudo conectar con " + BASE + "/buscar (curl salio con " + e.status + ").");
    console.error("Revisa que el flujo de ingesta este ACTIVO y que BANO_BASE_URL sea correcta.");
    process.exit(2);
  }
  const i = raw.lastIndexOf("|__HTTP__");
  const status = Number(raw.slice(i + 9).trim());
  if (status !== 200) {
    console.error("");
    console.error("El endpoint de busqueda respondio " + status + ": " + raw.slice(0, 160));
    console.error(status === 403 ? "Token de ingesta incorrecto." : "");
    process.exit(2);
  }
  try { return JSON.parse(raw.slice(0, i)).resultados || []; } catch { return []; }
}

let fallos = 0;
const sinAcentos = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// `seccion`: basta con que UNA de las esperadas aparezca en el top-k.
// `contiene`: TODAS las palabras deben aparecer en el texto recuperado.
const casos = [
  // --- Las dos que exige PLAN.md ---
  // Se exigia "sting ai" cuando el corpus tenia dos proyectos. Ahora hay cinco y el
  // top-k ya no puede garantizar UNO concreto sin volverse arbitrario: se exige que
  // aparezca alguno.
  { p: "¿qué proyectos ha hecho?", seccion: ["Proyectos y arquitecturas entregadas", "Experiencia laboral"],
    contieneAlguno: ["sting ai", "sats", "marketplace", "qualcomm", "bano"] },
  { p: "¿sabe de RAG?", contiene: ["rag"] },

  // --- Perfil, experiencia, habilidades ---
  { p: "¿qué certificaciones tiene?", seccion: ["Formación y certificaciones"], contiene: ["aws"] },
  { p: "¿dónde estudió?", seccion: ["Formación y certificaciones"], contiene: ["mecatrónica"] },
  { p: "¿ha trabajado con documentos escaneados u OCR?", contiene: ["ocr"] },
  { p: "¿qué experiencia tiene con n8n?", contiene: ["n8n"] },
  { p: "¿ha automatizado procesos en una empresa?", contiene: ["joyson"] },
  { p: "¿habla inglés?", seccion: ["Idiomas y disponibilidad"], contiene: ["inglés"] },
  { p: "¿dónde trabaja actualmente?", contiene: ["usaige"] },
  { p: "¿sabe de bases de datos vectoriales?", contiene: ["pgvector"] },

  // --- Cruce de idioma: el corpus esta en espanol, estas preguntas en ingles ---
  { p: "what does he know about RAG pipelines?", contiene: ["rag"], idioma: "en" },
  { p: "which cloud certifications does he hold?", contiene: ["aws"], idioma: "en" },
  { p: "has he built conversational agents?", contiene: ["agente"], idioma: "en" },
];

console.log("");
console.log("Corpus de BANO -> " + BASE + "/buscar   (ventana " + VENTANA + ", se miden " + MEDIR_K + ")");
console.log("");

// Un resultado es RELEVANTE por si solo si cumple los criterios del caso sin ayuda
// de sus vecinos. Es mas exigente que el pasa/falla, que mira el texto de todos
// juntos, y es lo que permite hablar de "el fragmento correcto".
function relevante(res, c) {
  const t = sinAcentos(res.texto);
  if (c.seccion && !c.seccion.includes(res.seccion)) return false;
  if (c.contiene && !c.contiene.every((x) => t.includes(sinAcentos(x)))) return false;
  if (c.contieneAlguno && !c.contieneAlguno.some((x) => t.includes(sinAcentos(x)))) return false;
  return Boolean(c.seccion || c.contiene || c.contieneAlguno);
}

let fallosIdioma = 0;
const margenes = [];
let fueraDeVentana = 0;

for (const c of casos) {
  const r = buscar(c.p);
  const ventana = r.slice(0, VENTANA);
  const secciones = ventana.map((x) => x.seccion);
  const texto = sinAcentos(ventana.map((x) => x.texto).join(" "));

  const problemas = [];
  if (c.seccion && !c.seccion.some((s) => secciones.includes(s))) {
    problemas.push("ninguna seccion esperada en la ventana (salieron: " + secciones.join(", ") + ")");
  }
  for (const palabra of c.contiene || []) {
    if (!texto.includes(sinAcentos(palabra))) problemas.push('no aparece "' + palabra + '"');
  }
  if (c.contieneAlguno && !c.contieneAlguno.some((x) => texto.includes(sinAcentos(x)))) {
    problemas.push("no aparece ninguno de: " + c.contieneAlguno.join(", "));
  }

  // Margen = distancia del mejor INCORRECTO menos la del mejor CORRECTO.
  // Positivo: el correcto gana por ese margen. Negativo: un incorrecto lo supera.
  const ok = r.find((x) => relevante(x, c));
  const mal = r.find((x) => !relevante(x, c));
  const pos = ok ? r.indexOf(ok) + 1 : null;
  const margen = ok && mal ? mal.distancia - ok.distancia : null;
  if (margen !== null) margenes.push(margen);
  if (pos === null || pos > VENTANA) fueraDeVentana++;

  const medida = pos === null
    ? "  (el fragmento correcto no salio en " + MEDIR_K + ")"
    : "  puesto " + pos + ", d=" + ok.distancia.toFixed(4) +
      (margen === null ? "" : ", margen " + (margen >= 0 ? "+" : "") + margen.toFixed(4));

  const etiqueta = (c.idioma === "en" ? "[en] " : "") + c.p;
  if (problemas.length === 0) {
    console.log("  ok    " + etiqueta + medida);
  } else {
    console.log("  FALLA " + etiqueta + " -> " + problemas.join("; "));
    fallos++;
    if (c.idioma === "en") fallosIdioma++;
  }
}

console.log("");
if (fallosIdioma > 0) {
  console.log("Aviso: " + fallosIdioma + " de los fallos son preguntas en ingles contra un corpus");
  console.log("en espanol. Si se repiten, la solucion es un corpus bilingue.");
  console.log("");
}
// Resumen comparable entre corridas: es lo que permite decir si un cambio en el
// troceado mejoro o empeoro, en vez de repetir "13/13" antes y despues.
if (margenes.length) {
  const suma = margenes.reduce((a, b) => a + b, 0);
  const ordenados = [...margenes].sort((a, b) => a - b);
  console.log("MEDIDA  margen medio " + (suma / margenes.length).toFixed(4) +
    " | peor " + ordenados[0].toFixed(4) +
    " | negativos " + margenes.filter((m) => m < 0).length +
    " | fuera de la ventana " + fueraDeVentana +
    " | casos medidos " + margenes.length + "/" + casos.length);
  console.log("");
}
console.log(fallos === 0 ? "TODO VERDE (" + casos.length + " casos)" : fallos + " FALLO(S) de " + casos.length);
console.log("");
process.exit(fallos === 0 ? 0 : 1);
