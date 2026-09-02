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
| Conversación | `previous_response_id` → `prev.input + prev.output + input` |
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
      → Code "Validar"   (bearer + campos; acepta input string Y array)
      → Code "Eco"       (un output item fijo, con id/type/status)
      → Respond to Webhook

No hace falta tocar el proxy: la plataforma toma la URL base y le anade `/responses`,
asi que con la base en `.../webhook/bano/v1` el path del webhook encaja tal cual.

**Hecho cuando:** un `curl` con `{"model":"bano","input":"hola"}` devuelve un objeto `response`
válido, y otro con `input` como array devuelve lo mismo.

## Fase 2 — Corpus e ingesta

Redactar el documento de trayectoria (partiendo de `cv_altumware_ai_developer.html`, que ya es
completo) **sin datos de contacto**, y exportarlo a PDF. Levantar el servicio pgvector.
Workflow de ingesta separado: PDF → troceado → embeddings NVIDIA (2048 dims) → pgvector.

**Hecho cuando:** una consulta de similitud devuelve los fragmentos correctos para
"¿qué proyectos ha hecho?" y "¿sabe de RAG?".

## Fase 3 — El agente

    … → AI Agent (guardrails en el system prompt)
           ├ Chat Model: nvidia/nemotron-3-super-120b-a12b (max_tokens ~4000)
           ├ Vector Store Retriever sobre pgvector
           └ Simple Memory, 10 mensajes, sessionKey = conversation_id
      → Code "Formatear a Open Responses"

Tabla `turnos` en el Postgres de BANO: `response_id | conversation_id | created_at | input | output |
latencia_ms | tokens`. Sirve de mapa para `previous_response_id` y de log de observabilidad.

**Hecho cuando:** conversa con precisión sobre perfil, experiencia, habilidades y proyectos,
en español e inglés, y encadena 3 turnos por `previous_response_id`.

## Fase 4 — Streaming SSE

Modo streaming nativo de n8n 2.33.7. Verificar que Traefik no bufferice.

**Hecho cuando:** el test *Streaming Response* de la suite de conformidad pasa.

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

---

## Fuera de alcance

WebSocket `/v1/responses` · `POST /v1/responses/compact` · function calling ·
instrumentación externa tipo Langfuse · vector store en memoria.
