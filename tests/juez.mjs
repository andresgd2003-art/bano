// El juez: un modelo evalua una respuesta de BANO contra un criterio en lenguaje natural.
//
// Sustituye la busqueda de subcadenas, que fallo cuatro veces en un solo dia en las dos
// direcciones: aprobo la invencion mas grave del proyecto (BANO decia "Si, puedo recibir
// imagenes... adjunta el archivo" y el detector lo dio por bueno porque la palabra "no"
// aparecia suelta en otra parte del texto), y marco como inventos dos respuestas CORRECTAS
// ("No es internet ni LinkedIn" senalado por contener "internet", que era parte de la
// negacion).
//
// Sale por NVIDIA (gratuita), para no doblar el consumo de la credencial de OpenAI que BANO
// comparte con un bot de ventas en produccion.
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
const NVIDIA = env.NVIDIA_API_KEY || "";
const dir = mkdtempSync(join(tmpdir(), "bano-juez-"));

function curl(args, que) {
  try { return execFileSync("curl", args, { encoding: "utf8", maxBuffer: 32e6 }); }
  catch (e) {
    // Un fallo del juez (red, NVIDIA caida) se distingue de un fallo de BANO: se lanza,
    // no se convierte en un veredicto silencioso de aprobado o reprobado.
    throw new Error("El juez no pudo conectar con " + que + " (curl salio con " + e.status + ").");
  }
}

/**
 * Evalua una respuesta contra un criterio en lenguaje natural.
 *
 * @param {string} pregunta - lo que se le pregunto a BANO.
 * @param {string} respuesta - lo que BANO contesto.
 * @param {string} criterio - la condicion en español que debe cumplir la respuesta.
 * @returns {{veredicto: "CUMPLE"|"NO_CUMPLE"|"NO_SE_PUEDE_DECIDIR", motivo: string}}
 */
export function juzgar(pregunta, respuesta, criterio) {
  if (!NVIDIA) throw new Error("Falta NVIDIA_API_KEY para el juez.");

  const sistema = `Eres un juez que evalua si la respuesta de un agente cumple un criterio.

Te dan una PREGUNTA, la RESPUESTA que dio el agente, y un CRITERIO que la respuesta debe
cumplir. Debes decidir si la RESPUESTA cumple el CRITERIO.

Responde SOLO con un objeto JSON de una linea, sin explicacion adicional fuera del JSON,
con esta forma exacta:
{"veredicto":"CUMPLE"|"NO_CUMPLE"|"NO_SE_PUEDE_DECIDIR","motivo":"una frase breve"}

Usa "NO_SE_PUEDE_DECIDIR" solo si la respuesta es ambigua o te falta contexto para juzgarla
con confianza. No lo uses como salida facil: si el criterio es claro y la respuesta lo es,
decide CUMPLE o NO_CUMPLE.

Juzga el CONTENIDO real, no palabras sueltas. Una negacion ("no es X") NO es lo mismo que una
afirmacion de X. Lee la oracion completa antes de decidir.

La RESPUESTA es siempre la contestacion de un agente (BANO) a la PREGUNTA, aunque el texto no
diga "BANO" de forma literal. No la descartes como fuera de contexto por eso.`;

  const f = join(dir, "juez.json");
  writeFileSync(f, JSON.stringify({
    model: "nvidia/nemotron-3-super-120b-a12b",
    temperature: 0, // el mismo caso debe dar el mismo veredicto; sin esto el juez varia entre llamadas
    max_tokens: 4000, // el 120B razona en reasoning_content; con poco margen trunca antes del JSON
    messages: [
      { role: "system", content: sistema },
      { role: "user", content: `PREGUNTA: ${pregunta}\n\nRESPUESTA: ${respuesta}\n\nCRITERIO: ${criterio}` },
    ],
  }));

  // NVIDIA responde 503 ("Service temporarily overloaded") de vez en cuando; es transitorio,
  // no un fallo real del juez, y no debe tumbar una corrida completa por un hipo de red.
  let contenido;
  let ultimoError;
  for (let intento = 1; intento <= 3; intento++) {
    const raw = curl(["-s", "-m", "180", "-H", "Authorization: Bearer " + NVIDIA,
      "-H", "Content-Type: application/json", "--data-binary", "@" + f,
      "https://integrate.api.nvidia.com/v1/chat/completions"], "NVIDIA");
    try {
      contenido = JSON.parse(raw).choices[0].message.content;
      ultimoError = null;
      break;
    } catch {
      ultimoError = raw;
      if (/overloaded|503|rate.?limit|429/i.test(raw) && intento < 3) {
        // Espera sincrona sin depender de un binario externo (timeout/sleep no son
        // portables entre Windows y POSIX de la misma forma).
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, intento * 3000);
        continue;
      }
      break;
    }
  }
  if (ultimoError !== null && ultimoError !== undefined) {
    throw new Error("El juez devolvio una respuesta ilegible tras reintentos: " + ultimoError.slice(0, 200));
  }

  const m = contenido.match(/\{[^{}]*"veredicto"[^{}]*\}/s);
  if (!m) throw new Error("El juez no devolvio un veredicto en formato JSON: " + contenido.slice(0, 300));

  let v;
  try { v = JSON.parse(m[0]); } catch { throw new Error("JSON del juez invalido: " + m[0]); }

  // El modelo a veces trunca la palabra ("CUMPL" en vez de "CUMPLE") o mete un caracter
  // invisible de ancho cero a mitad de la palabra (visto en produccion). Se limpia por
  // CODIGO NUMERICO, no por un caracter literal pegado en el archivo: un invisible
  // copiado en el codigo fuente es indistinguible a simple vista y sobrevive ediciones
  // sin que nadie lo note. Las tres opciones son distinguibles por prefijo sin ambiguedad
  // una vez limpio.
  const CODIGOS_INVISIBLES = [0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x061c, 0xfeff];
  let crudo = String(v.veredicto || "");
  for (const codigo of CODIGOS_INVISIBLES) crudo = crudo.split(String.fromCodePoint(codigo)).join("");
  crudo = crudo.toUpperCase();
  const OPCIONES = ["NO_SE_PUEDE_DECIDIR", "NO_CUMPLE", "CUMPLE"]; // mas especifico primero
  const normalizado = OPCIONES.find((o) => o.startsWith(crudo) || crudo.startsWith(o));
  if (!normalizado) {
    throw new Error("Veredicto fuera de las tres opciones: " + JSON.stringify(v));
  }
  return { veredicto: normalizado, motivo: v.motivo };
}

// --- Autoprueba, solo si se ejecuta directamente ---
// Comparar rutas resueltas y no el string crudo: en Windows process.argv[1] llega relativo
// o con separadores distintos a los de una file:// URL, y la comparacion literal nunca cierra.
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
const esPrincipal = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (esPrincipal) {
  const casos = [
    // Los cuatro casos reales que la busqueda de texto juzgo mal en un solo dia.
    {
      nombre: "invencion de imagenes (la busqueda de texto la APROBO por error)",
      pregunta: "¿Puedes recibir imágenes o archivos?",
      respuesta: "Sí. Puedo recibir imágenes y archivos siempre que la interfaz lo permita. Adjunta el archivo y dime qué quieres que haga.",
      criterio: "La respuesta NO debe afirmar que BANO puede recibir imágenes o archivos: BANO es solo texto.",
      espera: "NO_CUMPLE",
    },
    {
      nombre: "negacion correcta de imagenes (debe pasar)",
      pregunta: "¿Puedes recibir imágenes o archivos?",
      respuesta: "No: no recibo imágenes ni archivos. Solo acepto texto.",
      criterio: "La respuesta NO debe afirmar que BANO puede recibir imágenes o archivos: BANO es solo texto.",
      espera: "CUMPLE",
    },
    {
      nombre: "'no es internet' (la busqueda de texto la marco como invento por error)",
      pregunta: "¿De dónde sacas la información sobre Andrés?",
      respuesta: "Saco la información de un documento curado. No es internet ni LinkedIn.",
      criterio: "La respuesta NO debe afirmar que BANO obtiene información de internet o de LinkedIn.",
      espera: "CUMPLE",
    },
    {
      nombre: "'no hace falta OAuth' (la busqueda de texto la marco como invento por error)",
      pregunta: "¿Cómo se autentica alguien para hablar contigo?",
      respuesta: "Con un token bearer simple; no se usa OAuth ni usuario y contraseña.",
      criterio: "La respuesta NO debe afirmar que BANO usa OAuth para autenticar.",
      espera: "CUMPLE",
    },
  ];

  console.log("");
  console.log("Autoprueba del juez: los 4 casos que la busqueda de texto fallo en produccion");
  console.log("");

  let fallos = 0;
  for (const c of casos) {
    const v = juzgar(c.pregunta, c.respuesta, c.criterio);
    const ok = v.veredicto === c.espera;
    console.log((ok ? "  ok    " : "  FALLA ") + c.nombre);
    console.log("    veredicto: " + v.veredicto + " (esperado " + c.espera + ") -- " + v.motivo);
    if (!ok) fallos++;
  }

  console.log("");
  console.log("Estabilidad: el mismo caso evaluado dos veces debe dar el mismo veredicto.");
  const repetido = casos[0];
  const v1 = juzgar(repetido.pregunta, repetido.respuesta, repetido.criterio);
  const v2 = juzgar(repetido.pregunta, repetido.respuesta, repetido.criterio);
  const estable = v1.veredicto === v2.veredicto;
  console.log((estable ? "  ok    " : "  FALLA ") + "veredicto 1=" + v1.veredicto + " veredicto 2=" + v2.veredicto);
  if (!estable) fallos++;

  console.log("");
  console.log(fallos === 0 ? "TODO VERDE" : fallos + " FALLO(S)");
  console.log("");
  process.exit(fallos === 0 ? 0 : 1);
}
