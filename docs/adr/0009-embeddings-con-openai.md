# Los embeddings salen por OpenAI; el chat sigue en NVIDIA

Los modelos de embedding de NVIDIA son **asimétricos**: necesitan `input_type: "query"` para
las preguntas y `"passage"` para los documentos. El nodo `Embeddings OpenAI` de n8n no puede
enviar ese campo — sus opciones son `dimensions`, `baseURL`, `batchSize`, `stripNewLines`,
`timeout` y `encodingFormat`, y ninguna permite añadir parámetros al cuerpo.

## La medición

Tres párrafos sin relación entre sí (un zorro, una receta de pan, un telescopio) y la pregunta
*"observatorios espaciales y astronomía"*:

| configuración | acierto | brecha 1º–2º |
|---|---|---|
| `nemotron-3-embed-1b` sin `input_type` | **incorrecto**, gana el pan | 0.0406 |
| `nemotron-3-embed-1b` con `query`/`passage` | correcto | 0.2682 |
| `text-embedding-3-small` (OpenAI) | correcto, 3/3 preguntas | 0.347 |

Esa primera tabla compara peras con manzanas: OpenAI corrio contra tres parrafos absurdos y
NVIDIA contra la version rota. Repetida de forma justa, con siete fragmentos tipo CV y seis
preguntas realistas:

| modelo | aciertos | dims | brecha media |
|---|---|---|---|
| NVIDIA `nemotron-3-embed-1b` con `query`/`passage` | 5/6 | 2048 | **0.1636** |
| NVIDIA `llama-nemotron-embed-vl-1b-v2` con `query`/`passage` | 5/6 | 2048 | 0.0833 |
| OpenAI `text-embedding-3-small` | **6/6** | 1536 | 0.1023 |
| OpenAI `text-embedding-3-large` | **6/6** | 3072 | 0.1366 |

**Estan empatados.** La diferencia entre 5/6 y 6/6 es una pregunta sobre seis, que con esa
muestra no significa nada; y `nemotron-3-embed-1b` tiene la mayor brecha media de los cuatro.
Con `input_type`, NVIDIA compite de tu a tu. Lo que decide no es la calidad.


`nemotron-3-embed-1b` **acepta la omisión en silencio** y devuelve embeddings que no
discriminan, en vez de fallar. `llama-nemotron-embed-vl-1b-v2` sí protesta
(`'input_type' parameter is required for asymmetric models`), que es el comportamiento
correcto y el que delató la causa.

No hay modelo simétrico disponible: los otros cinco candidatos del catálogo
(`embed-qa-4`, `nemoretriever-1b-vlm`, `nv-embedqa-1b-v1`, `nv-embedqa-mistral-7b-v2`,
`arctic-embed-l`) devuelven `404 Not found for account`.

## La decisión

Embeddings con `text-embedding-3-small` de OpenAI, **1536 dimensiones**. Es simétrico, funciona
con el nodo nativo, y conserva la integración de n8n con PGVector Store y con el retriever del
agente. El chat sigue en NVIDIA (ADR-0004): esa era la parte que consumía cuota de verdad.

La alternativa era escribir los embeddings a mano con nodos HTTP Request y hacer pgvector por
SQL crudo. Habría mantenido todo en NVIDIA, pero a cambio de perder la integración nativa y de
escribir bastante más.

El argumento decisivo no es la calidad sino el riesgo que motivo el ADR-0004: la cuota
compartida con el bot de ventas se agota por **rafagas de chat**, y los embeddings no son eso.
Son llamadas pequenas y la ingesta se dispara a mano, no por turno. El chat, que si es rafaga,
se queda en NVIDIA.


## Consecuencias

- Los embeddings vuelven a usar la credencial de OpenAI compartida con el bot de ventas. El
  riesgo de 429 es mucho menor que con el chat: son llamadas pequeñas y la ingesta se corre a
  mano, no por turno.
- Costo real: despreciable. El documento de trayectoria son unos 2 000 tokens.
- **1536 dimensiones, no 2048.** Cambiar de modelo de embeddings obliga a reindexar: los
  vectores de dimensiones distintas no conviven en la misma columna.
