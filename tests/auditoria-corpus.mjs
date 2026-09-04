// Auditoria de alcanzabilidad del corpus.
//
// El hueco que esto busca aparecio tres veces (certificaciones, proyectos, nodos) y las tres
// se descubrio por accidente, cuando un evaluador pregunto: el dato ESTABA en el corpus, pero
// la consulta natural no traia sus fragmentos y BANO acababa diciendo "no esta documentado" o
// mandando al repositorio.
//
// Mide dos cosas por seccion:
//   1. En cuantos fragmentos quedo troceada. Mas de uno = riesgo de responder a medias,
//      porque una sola consulta con top_k=5 no alcanza a traerlos todos.
//   2. Si la seccion es ALCANZABLE preguntando por su propio tema: se consulta con su titulo
//      y se mira si alguno de sus fragmentos entra en el top_k que ve el agente.
//
// Uso: node tests/auditoria-corpus.mjs
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
if (!BASE || !TOKEN) { console.error("Faltan BANO_BASE_URL y/o BANO_INGESTA_TOKEN"); process.exit(2); }

// El agente ve top_k=5: es el numero que importa, no uno teorico.
const TOP_K = 5;
const dir = mkdtempSync(join(tmpdir(), "bano-audit-"));

function buscar(pregunta) {
  const f = join(dir, "q.json");
  writeFileSync(f, JSON.stringify({ pregunta, top_k: TOP_K }));
  try {
    const raw = execFileSync("curl", ["-s", "-m", "120", "-X", "POST", BASE + "/buscar",
      "-H", "Content-Type: application/json", "-H", "Authorization: Bearer " + TOKEN,
      "--data-binary", "@" + f], { encoding: "utf8" });
    const j = JSON.parse(raw);
    return (j.resultados || j || []).map((r) => String(r.texto || r.pageContent || "").split("\n")[0]);
  } catch (e) {
    console.error("No se pudo buscar (curl " + e.status + ")");
    process.exit(2);
  }
}

// Trocea igual que el nodo "Trocear con contexto" del flujo de ingesta, para contar los
// mismos fragmentos que hay indexados de verdad y no una aproximacion.
const TAMANO = 1000;
function trocear(texto) {
  if (texto.length <= TAMANO) return [texto];
  const unidades = [];
  for (const parrafo of texto.split(/\n{2,}/)) {
    if (parrafo.length <= TAMANO) { unidades.push(parrafo); continue; }
    for (const frase of parrafo.split(/(?<=\.)\s+/)) {
      if (frase.length <= TAMANO) { unidades.push(frase); continue; }
      for (let i = 0; i < frase.length; i += TAMANO) unidades.push(frase.slice(i, i + TAMANO));
    }
  }
  const trozos = [];
  let actual = "";
  for (const u of unidades) {
    if (actual && (actual + "\n\n" + u).length > TAMANO) { trozos.push(actual); actual = u; }
    else actual = actual ? actual + "\n\n" + u : u;
  }
  if (actual.trim()) trozos.push(actual);
  return trozos;
}

function secciones(documento, contenido) {
  const piezas = [];
  const porNivel2 = contenido.split(/^##\s+(?!#)/m);
  const cabecera = porNivel2.shift();
  if (cabecera && cabecera.trim()) piezas.push({ seccion: "Introduccion", subseccion: "", cuerpo: cabecera.trim() });
  for (const bloque of porNivel2) {
    const salto = bloque.indexOf("\n");
    const seccion = (salto === -1 ? bloque : bloque.slice(0, salto)).trim();
    const resto = salto === -1 ? "" : bloque.slice(salto + 1);
    const porNivel3 = resto.split(/^###\s+/m);
    const intro = porNivel3.shift();
    if (intro && intro.trim()) piezas.push({ seccion, subseccion: "", cuerpo: intro.trim() });
    for (const sub of porNivel3) {
      const s2 = sub.indexOf("\n");
      const subseccion = (s2 === -1 ? sub : sub.slice(0, s2)).trim();
      const cuerpo = (s2 === -1 ? "" : sub.slice(s2 + 1)).trim();
      if (cuerpo) piezas.push({ seccion, subseccion, cuerpo });
    }
  }
  return piezas.map((p) => ({ ...p, documento, fragmentos: trocear(p.cuerpo).length }));
}

const todas = [];
for (const doc of ["trayectoria", "arquitectura"]) {
  todas.push(...secciones(doc, readFileSync("corpus/" + doc + ".md", "utf8")));
}

console.log("");
console.log("Auditoria de alcanzabilidad del corpus  (top_k=" + TOP_K + ", el que ve el agente)");
console.log("");

const enRiesgo = [];
for (const s in todas) {
  const p = todas[s];
  const titulo = [p.documento, p.seccion, p.subseccion].filter(Boolean).join(" — ");
  // Se consulta por el TEMA de la seccion, que es lo mas parecido a como preguntaria alguien.
  const consulta = [p.seccion, p.subseccion].filter(Boolean).join(" ");
  const traidos = buscar(consulta);
  // Alcanzable si algun fragmento devuelto pertenece a esta seccion.
  const alcanzable = traidos.some((t) => t.startsWith(titulo.slice(0, 60)));
  const riesgoParcial = p.fragmentos > 1;

  const marca = !alcanzable ? "NO ALCANZA" : riesgoParcial ? "parcial   " : "ok        ";
  console.log("  " + marca + " [" + p.fragmentos + " frag] " + titulo.slice(0, 82));
  if (!alcanzable) console.log("             trajo en su lugar: " + (traidos[0] || "(nada)").slice(0, 78));
  if (!alcanzable || riesgoParcial) enRiesgo.push({ titulo, consulta, fragmentos: p.fragmentos, alcanzable });
}

console.log("");
console.log("RESUMEN");
console.log("  secciones auditadas: " + todas.length);
console.log("  no alcanzables por su propio tema: " + enRiesgo.filter((e) => !e.alcanzable).length);
console.log("  alcanzables pero troceadas en varios fragmentos (riesgo de responder a medias): " +
  enRiesgo.filter((e) => e.alcanzable && e.fragmentos > 1).length);
console.log("");
if (enRiesgo.length) {
  console.log("A REVISAR, de mayor a menor riesgo:");
  for (const e of enRiesgo.sort((a, b) => (a.alcanzable - b.alcanzable) || (b.fragmentos - a.fragmentos))) {
    console.log("  " + (e.alcanzable ? "parcial   " : "NO ALCANZA") + " [" + e.fragmentos + " frag] " + e.titulo);
  }
}
console.log("");
