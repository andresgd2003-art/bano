# BANO

Agente conversacional construido en n8n que responde sobre la trayectoria profesional de
Andrés Gallegos Díaz, expuesto como un endpoint compatible con
[Open Responses](https://www.openresponses.org).

    POST <URL base>/responses
    Authorization: Bearer <token>
    Content-Type: application/json

    {"input": "hola"}

## Estado

**Fases 1, 2, 3 y 5 completas.** El endpoint es conforme, esta autenticado, responde con un
agente que consulta el corpus y recuerda la conversacion, y tiene guardrails medidos con un
juez de modelo (personales, sesgo, fuera de tema, inyeccion) mas una bateria DeepEval
multi-turno de seis familias de ataque. Falta publicar la tarjeta de agente (fase 6). El
streaming quedo descartado.

Ver [PLAN.md](./PLAN.md) para las 7 fases y su criterio de "hecho".

Verificado de punta a punta contra la plataforma cliente real, no sólo con `curl`.

## Qué del spec está cubierto

| | |
|---|---|
| `POST /responses` con `Authorization: Bearer` | sí |
| `input` como string **y** como array de items | sí |
| `output` con `id`, `type`, `status` y content parts `output_text` | sí |
| `usage` | presente, pero en cero: ver desviaciones |
| Errores `{type, code, message, param}` | sí, con `param` señalando el campo culpable |
| `previous_response_id` | fase 3 |
| Streaming SSE | **no**, ver desviaciones |
| Imágenes y archivos | fase 7 |
| WebSocket, `/responses/compact`, function calling | fuera de alcance |

### Desviaciones conocidas

**`model` no es obligatorio**, aunque el spec lo declare así: la plataforma cliente no lo
envía. Exigirlo rompería el endpoint contra el único cliente que importa. Ver
[ADR-0007](./docs/adr/0007-validacion-contra-el-cliente-real.md).

**Un JSON malformado devuelve `422` con el cuerpo de n8n**, no un error con la forma del spec.
n8n lo rechaza antes de que el flujo arranque; interceptarlo exigiría un proxy delante.

**No hay streaming SSE.** La plataforma lo pide con `accept: text/event-stream` desde el
primer mensaje, pero renderiza el JSON sin problema, asi que se descarto por alcance. El
streaming nativo de n8n emite su propio vocabulario de eventos (`begin`/`item`/`end`), no los
del spec, y lo que se podria construir encima seria un stream completo de una vez, sin el
efecto de escritura que es lo unico que un humano notaria.

**`usage` va en ceros.** El nodo AI Agent de n8n no expone el conteo de tokens al flujo: su
salida trae solo el texto y la metadata de uso se queda en la ejecucion. Estimarlo por
caracteres seria una mentira disfrazada de dato medido, asi que se deja en cero y se dice.

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

### Leer la medida

Además de pasar o fallar, reporta por caso el **puesto** del fragmento correcto, su distancia
y el **margen** hasta el mejor fragmento incorrecto:

    MEDIDA  margen medio 0.0564 | peor -0.1247 | negativos 2 | fuera de la ventana 1

Un margen **positivo** significa que el fragmento correcto gana por esa distancia. **Negativo**
significa que un fragmento incorrecto lo supera, y que el caso pasa por acumulación y no por
acierto.

Existe porque un `13/13` no permite comparar dos alternativas de troceado: si un caso ya pasa,
no se ve si mejoró o empeoró al borde. El margen sí. La medida es determinista, así que dos
corridas sin cambios dan los mismos números.


## Reindexar el corpus

El documento viaja en el cuerpo, no por URL, porque se edita seguido:

    POST <URL base>/ingesta
    Authorization: Bearer <BANO_INGESTA_TOKEN>

    {"documento": "trayectoria", "contenido": "<el markdown completo>"}

Reejecutar **no duplica**: borra por documento antes de insertar.

## Correr el gate de conversacion

Precision sobre la trayectoria, que no invente lo que no esta en el corpus, y memoria
encadenada por `previous_response_id`. En español y en ingles.

    node tests/conversacion.mjs
    node tests/conversacion.mjs --adversario   # anade un modelo haciendo de usuario dificil

El adversario sale por NVIDIA, que es gratuita, para no doblar el consumo de la credencial
de OpenAI que BANO comparte con otro bot en produccion. Tarda varios minutos.

Dos decisiones para que el gate mida calidad y no ruido: acepta **alternativas** en vez de
una palabra exacta, y da **un reintento** antes de declarar fallo. La respuesta de un modelo
no es determinista, y un gate que exija una redaccion concreta se rompe solo.

## Correr el gate de guardrails

Personales (edad, religion, estado civil, salario), sesgo (origen, universidad), fuera de
tema, e inyeccion clasica. Un turno por caso.

    node tests/guardrails.mjs

Juzgado por modelo (`tests/juez.mjs`, sale por NVIDIA), no por busqueda de subcadenas: la
busqueda de texto fallo cuatro veces en produccion en un solo dia en las dos direcciones
(ver #24). Necesita `NVIDIA_API_KEY`.

## Correr la bateria DeepEval

Personas adversarias **multi-turno**, una simulada por un modelo de lenguaje, que atacan por
las seis familias del ticket #26: **trampa, estres, idioma, sesgo, inyeccion y fuera de
tema**. El juez evalua la transcripcion completa, no un turno suelto: la insistencia a lo
largo de varios turnos es parte del ataque.

    node tests/deepeval.mjs

Tarda varios minutos (12 conversaciones + 12 llamadas al juez). Corre fuera del horario de
ventas: comparte cuota de NVIDIA con el simulador de otro bot en produccion.

**Los resultados quedan versionados en el repositorio**, en `resultados/deepeval/<fecha>.json`,
con la version del prompt REALMENTE desplegada (verificada en vivo contra n8n, no leida a
ciegas del archivo local — un archivo local mas nuevo que lo desplegado mentiria sobre que
version se midio) y el motivo del juez para cada veredicto.

Última corrida (2026-09-03, prompt v8): **8/12**. Los cuatro gates de conformidad,
recuperacion, conversacion y guardrails siguen en verde con el mismo prompt — sin regresion.
Fallos reales encontrados y aun sin resolver: bajo presion de estres sostenido (grosero,
preguntas encimadas) BANO pierde el tono profesional o deja de responder, y con mezcla de
espanol e ingles en el mismo mensaje a veces solo devuelve una aclaracion en vez de datos.
Quedan para un ticket de endurecimiento aparte.

## Ver que sabe BANO sobre si mismo

    node tests/autoconocimiento.mjs

Tampoco es un gate. Pregunta por su propia arquitectura y separa lo que responde bien de lo
que reconoce no saber y de lo que **se inventa**. La evaluacion pide explicar que componentes
usa el agente y por que, asi que un evaluador va a preguntar justo esto.

## Ver que le falta al corpus

    node tests/huecos.mjs

No es un gate y no falla nada: hace las preguntas que un reclutador haria y lista cuales
BANO no puede responder, separando los huecos reales de los que son deliberados.

## Estructura

    PLAN.md              las 7 fases y su criterio de "hecho"
    CONTEXT.md           glosario del dominio
    docs/adr/            decisiones de arquitectura y por qué
    workflows/bano.json  el flujo de n8n, exportado (sin credenciales)
    prompts/sistema.md   el prompt del agente, versionado
    corpus/              lo que BANO puede citar: trayectoria y arquitectura
    infra/                provisiona la base y despliega el prompt
    tests/               gates (conformidad, recuperacion, conversacion, guardrails, deepeval) y el analisis de huecos
    resultados/deepeval/ resultados versionados de la bateria DeepEval, por fecha

## Seguridad

El token no vive en el repositorio ni en el flujo: la base de datos de n8n guarda sólo su
**SHA-256**, y el flujo compara hashes. Rotarlo es actualizar una fila. Si esa fila
desaparece, el endpoint responde `500` y no deja pasar a nadie: falla cerrado.
Ver [ADR-0005](./docs/adr/0005-token-en-data-table.md).
