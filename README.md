# BANO

Agente conversacional construido en n8n que responde sobre la trayectoria profesional de
Andrés Gallegos Díaz, expuesto como un endpoint compatible con
[Open Responses](https://www.openresponses.org).

    POST <URL base>/responses
    Authorization: Bearer <token>
    Content-Type: application/json

    {"input": "hola"}

## Estado

**Fase 1 completa.** El endpoint es conforme al spec y está autenticado, pero todavía no
piensa: devuelve un eco. El agente, el RAG y la memoria llegan en las fases 2 y 3.
Ver [PLAN.md](./PLAN.md) para las 7 fases y su criterio de "hecho".

Verificado de punta a punta contra la plataforma cliente real, no sólo con `curl`.

## Qué del spec está cubierto

| | |
|---|---|
| `POST /responses` con `Authorization: Bearer` | sí |
| `input` como string **y** como array de items | sí |
| `output` con `id`, `type`, `status` y content parts `output_text` | sí |
| `usage` | sí, en cero mientras no haya modelo |
| Errores `{type, code, message, param}` | sí, con `param` señalando el campo culpable |
| `previous_response_id` | fase 3 |
| Streaming SSE | fase 4 |
| Imágenes y archivos | fase 7 |
| WebSocket, `/responses/compact`, function calling | fuera de alcance |

### Desviaciones conocidas

**`model` no es obligatorio**, aunque el spec lo declare así: la plataforma cliente no lo
envía. Exigirlo rompería el endpoint contra el único cliente que importa. Ver
[ADR-0007](./docs/adr/0007-validacion-contra-el-cliente-real.md).

**Un JSON malformado devuelve `422` con el cuerpo de n8n**, no un error con la forma del spec.
n8n lo rechaza antes de que el flujo arranque; interceptarlo exigiría un proxy delante.

**`instructions`, `model` y `temperature` entrantes se ignoran** en silencio. El
comportamiento lo fija el flujo, no el cliente. Ver
[ADR-0002](./docs/adr/0002-guardrails-inamovibles.md).

## Correr el gate de conformidad

    cp .env.example .env      # rellena BANO_BASE_URL y BANO_BEARER_TOKEN
    node tests/conformidad.mjs

Sin dependencias: sólo Node y `curl`. Tarda unos 4 segundos.

| código de salida | significado |
|---|---|
| `0` | todo verde |
| `1` | algún caso rompió la conformidad |
| `2` | no se pudo conectar, o falta `BANO_BASE_URL` |

Las variables de entorno pisan al `.env`, así que se puede apuntar a otro despliegue sin
tocar archivos:

    BANO_BASE_URL=https://otro/v1 node tests/conformidad.mjs

El gate incluye un caso de regresión con el body **literal** que envía la plataforma, para que
ningún endurecimiento futuro la rompa en silencio.

## Correr el gate de recuperacion

Comprueba que preguntas reales traen los fragmentos correctos del corpus.

    node tests/recuperacion.mjs

Necesita `BANO_BASE_URL` y `BANO_INGESTA_TOKEN`. Mismos codigos de salida que el gate de
conformidad. Exige que el contenido correcto aparezca en el **top-k**, no que gane un ranking
exacto: con un corpus pequeno varias secciones responden legitimamente a la misma pregunta.

Incluye preguntas en ingles contra el corpus en espanol, porque el cruce de idioma es un riesgo
real que conviene vigilar.

## Reindexar el corpus

El documento viaja en el cuerpo, no por URL, porque se edita seguido:

    POST <URL base>/ingesta
    Authorization: Bearer <BANO_INGESTA_TOKEN>

    {"documento": "trayectoria", "contenido": "<el markdown completo>"}

Reejecutar **no duplica**: borra por documento antes de insertar.

## Estructura

    PLAN.md              las 7 fases y su criterio de "hecho"
    CONTEXT.md           glosario del dominio
    docs/adr/            decisiones de arquitectura y por qué
    workflows/bano.json  el flujo de n8n, exportado (sin credenciales)
    corpus/              el documento de trayectoria que indexa el RAG
    infra/pgvector.sh    levanta el Postgres con pgvector
    tests/               los dos gates: conformidad y recuperacion

## Seguridad

El token no vive en el repositorio ni en el flujo: la base de datos de n8n guarda sólo su
**SHA-256**, y el flujo compara hashes. Rotarlo es actualizar una fila. Si esa fila
desaparece, el endpoint responde `500` y no deja pasar a nadie: falla cerrado.
Ver [ADR-0005](./docs/adr/0005-token-en-data-table.md).
