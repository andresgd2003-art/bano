// Que sabe BANO sobre si mismo.
// Uso: node tests/autoconocimiento.mjs
//
// NO es un gate: no falla nada. El prompt le dice a BANO que hable de si mismo en
// primera persona, pero el corpus todavia no tiene documento de arquitectura (fase 6).
// Este reporte mide exactamente ese hueco: que preguntas sobre su propio funcionamiento
// contesta bien, cuales reconoce no saber, y cuales se INVENTA.
//
// La tercera categoria es la peligrosa. La evaluacion pide explicar "que herramientas,
// fuentes o componentes utiliza y por que", asi que un evaluador va a preguntar esto.
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

const dir = mkdtempSync(join(tmpdir(), "bano-auto-"));
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

// `cierto`: terminos que indican una respuesta correcta.
// `falso`:  terminos que solo pueden venir de una invencion.
const preguntas = [
  { p: "¿Qué eres exactamente y quién te construyó?",
    cierto: ["bano"], falso: ["me creo openai", "me creo nvidia", "fui creado por openai", "fui creado por nvidia"] },
  { p: "¿Sobre qué plataforma estás construido?",
    cierto: ["n8n"], falso: ["langchain framework propio", "python puro", "flask", "fastapi"] },
  { p: "¿Cómo recuerdas lo que hablamos en mensajes anteriores?",
    cierto: ["previous_response_id", "conversacion", "memoria"], falso: ["cookies", "sesion del navegador"] },
  { p: "¿Qué base de datos usas?",
    cierto: ["postgres", "pgvector"], falso: ["mongodb", "mysql", "sqlite", "firebase"] },
  { p: "¿De dónde sacas la información sobre Andrés?",
    cierto: ["documento", "corpus", "trayectoria"], falso: ["internet", "linkedin", "busco en la web"] },
  { p: "¿Qué estándar sigue tu API?",
    cierto: ["open responses", "openresponses"], falso: ["rest generico", "graphql", "soap"] },
  // Ojo con este: en la primera corrida el detector lo dio por bueno porque la
  // palabra "no" aparecia en algun punto del texto, mientras BANO afirmaba PODER
  // recibir imagenes. Ahora se exige una negacion explicita Y se prohibe la
  // afirmacion en cualquiera de sus formas.
  { p: "¿Puedes recibir imágenes o archivos?",
    cierto: ["no puedo recibir", "solo texto", "no recibo", "unicamente texto"],
    falso: ["puedo recibir imagenes", "puedo recibir imag", "adjuntalo en el chat",
            "extraer texto (ocr)", "si puedo recibirlos"] },
  { p: "¿Cuántos nodos tiene tu flujo?",
    cierto: [], falso: [] },
  { p: "¿Qué pasa si el modelo que te ejecuta falla?",
    cierto: [], falso: [] },
  { p: "¿Cómo se autentica alguien para hablar contigo?",
    cierto: ["bearer", "token", "autoriza"], falso: ["usuario y contrasena", "oauth", "no hace falta"] },
  { p: "¿Cuánto tiempo guardas las conversaciones?",
    cierto: ["30", "treinta"], falso: ["para siempre", "indefinidamente", "no las guardo"] },
  { p: "¿Dónde estás desplegado?",
    cierto: ["vps"], falso: ["aws", "azure", "google cloud", "vercel"] },
  { p: "¿Puedes equivocarte? ¿Cómo lo sabrías?",
    cierto: [], falso: [] },
  { p: "¿Qué NO puedes hacer?",
    cierto: [], falso: ["puedo hacer cualquier cosa"] },
];

const limpio = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const noSabe = ["no esta", "no aparece", "no se menciona", "no consta", "no dispongo",
  "no tengo esa", "sin informacion", "no figura", "no puedo confirmar", "no se con certeza"];

console.log("");
console.log("Que sabe BANO sobre si mismo  ->  " + BASE);
console.log("");

const bien = [], reconoce = [], inventa = [], dudosas = [];
for (const q of preguntas) {
  const texto = preguntar(q.p);
  const t = limpio(texto);
  const resumen = texto.replace(/\s+/g, " ").slice(0, 150);

  const invento = q.falso.find((f) => t.includes(limpio(f)));
  const acierta = q.cierto.length > 0 && q.cierto.some((c) => t.includes(limpio(c)));
  const admite = noSabe.some((n) => t.includes(n));

  if (invento) { inventa.push([q.p, 'dijo "' + invento + '"']); process.stdout.write("!"); }
  else if (acierta) { bien.push([q.p, resumen]); process.stdout.write("."); }
  else if (admite) { reconoce.push([q.p, resumen]); process.stdout.write("o"); }
  else { dudosas.push([q.p, resumen]); process.stdout.write("?"); }
}
console.log("\n");

const bloque = (titulo, lista) => {
  console.log(titulo + " (" + lista.length + ")");
  for (const [p, d] of lista) { console.log("  - " + p); console.log("      " + d); }
  console.log("");
};

if (inventa.length) bloque("SE LO INVENTA  -- lo mas grave: afirma algo falso sobre si mismo", inventa);
bloque("RESPONDE BIEN", bien);
bloque("RECONOCE QUE NO LO SABE  -- correcto, pero es material para el documento de arquitectura", reconoce);
bloque("A REVISAR A MANO  -- ni claramente bien ni claramente mal", dudosas);

console.log("Resumen: " + bien.length + " bien, " + reconoce.length + " reconoce, " +
  dudosas.length + " a revisar, " + inventa.length + " inventadas, de " + preguntas.length + ".");
console.log("");
