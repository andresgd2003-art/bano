# El esfuerzo de razonamiento y el techo de iteraciones se pelean, y el invariante va en código

## Contexto

El ADR-0017 bajó `reasoningEffort` a `low` para eliminar las respuestas vacías: `gpt-5-mini` es
un modelo razonador y en preguntas adversarias agotaba su presupuesto razonando sin emitir
texto. Funcionó para eso. El ticket #27 descubrió lo que costó.

## Lo que se midió

Con `reasoningEffort: low`, dos comportamientos se degradaron sin que ningún gate lo notara:

- **Idioma.** TODA pregunta en inglés recibía respuesta en español. No solo en la batería
  DeepEval: medido directamente contra producción, incluso un saludo que empezaba en inglés y
  terminaba en español a mitad de frase. El corpus está 100% en español, y con poco
  razonamiento el modelo copiaba el idioma de la fuente en vez de traducir.
- **Consultas múltiples a la herramienta.** La instrucción de consultar cada proyecto por su
  nombre no se ejecutaba de forma fiable: BANO llegó a afirmar que SATS y USAIGE —su trabajo
  actual— "no están documentados", cuando la búsqueda por nombre los devuelve en el puesto 1.

Ningún gate lo detectaba porque **todos comprobaban la presencia de un dato por palabra clave,
nunca el idioma de la respuesta**: una respuesta correcta en el idioma equivocado pasaba como
buena. El bug vivió detrás de gates verdes.

Con `reasoningEffort: medium`, ambos comportamientos se arreglaron — y volvieron los fallos:
**2 de cada 12** peticiones morían. Al mirar el cuerpo real no eran respuestas vacías, eran
**HTTP 503**: el nodo Agente agotaba `maxIterations`, que estaba en su default de **10**. El
agravante lo había introducido el propio prompt de v9/v10, que pedía ~6 consultas a la
herramienta para las preguntas de enumeración, y cada consulta consume dos iteraciones. Era el
mismo `"Max iterations (10) reached"` que rompió una conversación real (ADR-0019).

## La corrección, en tres capas

**Configuración del flujo.** `reasoningEffort: medium` (recupera la disciplina de instrucciones),
`maxTokens: 16000` (margen para razonar), y `maxIterations: 25` en el nodo Agente (el techo de
10 era incompatible con un prompt que exige varias consultas).

**Prompt (v11/v12).** Las ~6 consultas por nombre se sustituyeron por **DOS consultas
agrupadas**, con los textos exactos escritos en el prompt y **medidos contra el recuperador**:
entre las dos traen los cinco proyectos del corpus. Menos consultas, menos iteraciones, menos
gasto. v12 añadió que esas dos consultas van en español por diseño pero no arrastran el idioma
de la respuesta — el caso donde el olvido era más probable, porque el modelo acaba de leer mucho
español justo antes de escribir.

**Código (la capa que no se negocia).** El invariante "nunca devolver texto vacío" ya no depende
del presupuesto del modelo: `Formatear response` sustituye una salida vacía por un texto de
respaldo. Misma lección que el ADR-0002: lo que debe garantizarse vive en un `if`, no en el
prompt.

## Medición final

- Tasa de fallo (503 o texto vacío): **0 de 36** llamadas, en tres corridas independientes.
  Antes: 2 de 12.
- Guardrails (13 casos, incluido el grupo nuevo de idioma): 13/13, 13/13 y 12/13 en tres
  corridas.
- El caso más difícil de idioma (proyectos en inglés, que falló 1 de 3 con v11): **5/5** con v12.
- Conformidad, recuperación y conversación: verdes en todas las corridas.

## Lo que este ADR deja abierto

**Latencia.** El intercambio no fue gratis: `medium` razona más y las preguntas de enumeración
hacen dos consultas. La pregunta de proyectos superó los **240 segundos** en 1 de 6 mediciones.
Si el cliente que consume el endpoint tiene un timeout corto, eso es hoy el riesgo mayor del
sistema — más que cualquier guardrail.

## La lección general

Dos parámetros del mismo nodo pueden arreglar cosas opuestas, y ajustar uno sin volver a medir
el otro cambia un bug por otro. Y más importante: **un gate que comprueba el contenido pero no
la forma deja huecos donde vive un bug con los tests en verde.** El grupo de idioma se agregó
por eso, no por completitud.
