# BANO — Plan por fases

Reescrito tras la investigación. Sustituye al plan inicial: la Fase 0 desapareció (la
infraestructura ya existe) y el streaming subió de "opcional al final" a requisito de conformidad.

## Contrato verificado (openresponses.org)

| Requisito | Mínimo |
|---|---|
| Ruta | `POST /v1/responses` · `Content-Type: application/json` · `Authorization: Bearer` |
| Request | `model`, `input` (**string O array de items**); todo lo demás opcional |
| Item | `id`, `type` (`message`/`function_call`/`reasoning`/`function_call_output`), `status` |
| Content parts | entrada `input_text`/`input_image`/`input_file` · salida `output_text`/`summary_text` |
| Response | `id`, `object:"response"`, `output[]`, `usage` |
| Streaming | `response.in_progress` → `output_item.added` → `content_part.added` → `output_text.delta` → `.done` → `response.completed` → `[DONE]`, con `sequence_number` en cada evento |
| Conversación | `previous_response_id` → `prev.input + prev.output + input`. **La plataforma usa esta via, no reenvia el historial**, asi que sin ella BANO no tiene memoria |
| Errores | `{type, code, message, param}` |

Otros endpoints del spec: `POST /v1/responses/compact` y un WebSocket, ambos opcionales.
No existen `/v1/conversations` ni `/input_items`.

## Infraestructura (ya existente, verificada)

n8n 2.33.7 en Easypanel, con Traefik y HTTPS. VPS de 1 core y 3.9 GB, con 18 contenedores.
Nada que provisionar salvo un Postgres con pgvector (ADR-0001).

---

## Fase 1 — Endpoint conforme, sin inteligencia

Pasar el contrato antes de que haya agente detrás.

    Webhook (POST, path bano/v1/responses, responseMode: responseNode)
      → Crypto      "Hashear bearer"     (SHA-256 de la cabecera Authorization)
      → Data table  "Leer token"         (el hash esperado; nunca el token)
      → Code        "Autorizar"          (compara hashes -> 200 / 401 / 500)
      → Code        "Construir response" (arma el objeto del spec)
      → Respond to Webhook               (codigo HTTP por expresion)

La autenticacion nativa del nodo Webhook quedo descartada: rechaza antes de que corra
ningun nodo y devuelve `403` con cuerpo de texto plano, no el error del spec. Es un bug
abierto (n8n#26365) y actualizar n8n no lo resolveria. Ver ADR-0005.

No hace falta tocar el proxy: la plataforma toma la URL base y le anade `/responses`,
asi que con la base en `.../webhook/bano/v1` el path del webhook encaja tal cual.

**Hecho cuando:** un `curl` con `{"model":"bano","input":"hola"}` devuelve un objeto `response`
válido, y otro con `input` como array devuelve lo mismo.

## Fase 2 — Corpus e ingesta

Redactar el documento de trayectoria (partiendo de `cv_altumware_ai_developer.html`, que ya es
completo) **sin datos de contacto**, y exportarlo a PDF. Levantar el servicio pgvector.
Workflow de ingesta separado: PDF -> troceado -> embeddings OpenAI `text-embedding-3-small`
(**1536 dims**, no NVIDIA: sus modelos son asimetricos y el nodo nativo no puede enviarles
`input_type`, ver ADR-0009) -> pgvector.

**Hecho cuando:** una consulta de similitud devuelve los fragmentos correctos para
"¿qué proyectos ha hecho?" y "¿sabe de RAG?".

## Fase 3 — El agente

    … → AI Agent (guardrails en el system prompt)
           ├ Chat Model: nvidia/nemotron-3-super-120b-a12b (max_tokens ~4000)
           ├ Vector Store Retriever sobre pgvector
           └ Simple Memory, contextWindowLength 10, sessionKey = conversation_id
      → Code "Formatear a Open Responses"

Tabla `turnos` en el Postgres de BANO: `response_id | conversation_id | created_at | input | output |
latencia_ms | tokens`.

**Esta tabla no es opcional.** El formulario de la plataforma solo ofrece dos modos de estado,
*sin estado* y *previous_response_id*; no existe reenvio del historial. Con `previous_response_id`,
lo unico que llega es el `id` del turno anterior, asi que la tabla es lo que traduce ese `id` a un
`conversation_id` y permite a Simple Memory recuperar la conversacion. Sin ella, BANO no recuerda
nada entre turnos. De paso es el log de observabilidad de la Fase 6.

### Memoria: dos capas con duracion distinta

| capa | donde vive | dura |
|---|---|---|
| cadena `response_id -> conversation_id` | Postgres, tabla `turnos` | 30 dias |
| contexto del agente (10 interacciones) | memoria del proceso de n8n | hasta el proximo reinicio |

`contextWindowLength: 10` cuenta **interacciones**, no mensajes sueltos: son los ultimos 10
pares pregunta-respuesta. La ventana deslizante NO rompe la cadena de ids: una conversacion de
50 turnos conserva sus 50 eslabones, el agente solo recuerda los ultimos 10.

**Limitacion aceptada:** Simple Memory guarda en la memoria del proceso de n8n ("Stores in n8n
memory, so no credentials required"), asi que un reinicio del contenedor la borra mientras la
cadena de ids sobrevive. Sintoma: el `previous_response_id` resuelve bien pero el agente no
recuerda nada, sin error ni aviso. Si eso llega a molestar, el arreglo es cambiar el nodo por
**Postgres Chat Memory** contra la misma base de BANO: misma ventana, misma llave, pero
duradera, y sin infraestructura nueva porque esa base ya existe por el ADR-0001.

**Retencion:** 30 dias con limpieza automatica. Un `previous_response_id` mas viejo devuelve
400: el identificador ya no existe.

**Hecho cuando:** conversa con precisión sobre perfil, experiencia, habilidades y proyectos,
en español e inglés, y encadena 3 turnos por `previous_response_id`.

## Fase 4 — Streaming SSE (DESCARTADA)

No se hace, por decision de alcance.

La plataforma manda `accept: text/event-stream` y `"stream": true` desde el primer mensaje,
pero **renderiza el JSON sin problema**. Verificado en pantalla.

Ademas, el stream que podiamos dar seria completo de una vez y no token a token: el streaming
nativo de n8n emite su propio vocabulario (`begin`/`item`/`end`), no los eventos del spec, asi
que ni siquiera se ganaria el efecto de escritura, que es lo unico que un humano notaria.

El esfuerzo se va a la fase 5. Queda como desviacion conocida en el README.

## Fase 5 — Guardrails y evaluación

Guardrails en el prompt: no inventar (frase de escape fija), idioma espejo, tercera persona
sobre Andrés y primera sobre sí mismo, declinar preguntas personales/sesgadas, resistir
inyección vía `instructions` (ADR-0002), reconducir fuera de tema.

Guardia determinista en Code, antes del agente: longitud máxima de input, turnos por
conversación, rate-limit por `conversation_id`. Lo que debe garantizarse no vive en el prompt.

Batería DeepEval: personas simuladas que atacan por trampa, estrés, idioma, sesgo, inyección
y fuera de tema. El LLM-cliente sale por NVIDIA, no por la credencial compartida.

**Hecho cuando:** la batería pasa y sus resultados están en el repo.

## Fase 6 — Descubrimiento y entrega

`/.well-known/agent-card.json` como segundo webhook (tarjeta A2A: `protocolVersion`, `name`,
`url`, `capabilities`, `skills`, `securitySchemes`). Documento de arquitectura → PDF → corpus,
para que BANO hable de sí mismo. README con qué del spec se cubre y qué no.

## Fase 7 — Multimodal (última, por decisión explícita)

Entrada de imágenes (`meta/llama-3.2-90b-vision-instruct`) y de archivos. Efímeros: nunca
entran al corpus (ADR-0003). Hasta aquí `defaultInputModes` es sólo `text/plain`.

Entrega de archivos: **URL, no base64**. Base64 infla el archivo un 33% y obliga a n8n a
parsearlo entero en memoria, en una caja de un core con ~2.3 GB libres compartidos con SATS
y el bot de ventas. Con URL la peticion queda pequena y BANO descarga solo lo que necesita.
Riesgo asumido: el enlace puede ser temporal o exigir autenticacion.

---

## Fuera de alcance

WebSocket `/v1/responses` · `POST /v1/responses/compact` · function calling ·
instrumentación externa tipo Langfuse · vector store en memoria.
