# Un checklist de uso de herramienta puede empeorar las cosas si no exige leer TODO el resultado

## Contexto

Al hacer el prompt más explícito sobre el uso de `corpus_trayectoria` (v4), se introdujo una
regla mecánica: contar las partes de la pregunta y llamar a la herramienta una vez por parte,
más un molde de rechazo literal ("Eso no está documentado en la trayectoria de Andrés.") para
cuando el resultado no trajera el dato.

## La regresión, medida

Con la pregunta real "¿Dónde estudió y qué certificaciones tiene?" —dato que sí existe en el
corpus, verificado consultando el recuperador directamente (`Formación y certificaciones` en
el top-3, distancia 0.70)— el agente v4 respondió correctamente **1 de 3 veces**. Las otras dos
negó tener el dato, con el molde de rechazo literal.

No era un fallo del recuperador: la herramienta traía el fragmento correcto siempre. El fallo
era que el modelo, al dudar, tenía a mano una plantilla de rechazo fácil de reutilizar, y la
aplicaba en vez de releer con cuidado lo que la herramienta le había devuelto.

## La causa raíz, más profunda de lo que parecía

v5 quitó el molde literal y exigió "releer el resultado antes de concluir". Mejoró poco (seguía
fallando). La causa real apareció al revisar el ranking del recuperador para la consulta aislada
"dónde estudió": el fragmento correcto salía en **segundo lugar** (distancia 0.699), detrás de
"Trabajo público y divulgación" (0.639), que menciona "dar clases" — vocabulario que colisiona
semánticamente con "estudió" aunque signifique lo contrario (enseñar, no aprender).

El agente, al recibir varios fragmentos, a veces solo prestaba atención al primero.

## La corrección, en dos capas

**Prompt (v6):** instrucción explícita de leer *todos* los fragmentos devueltos, uno por uno,
antes de concluir que un dato falta — no solo el primero. Ejemplo nombrado en el propio prompt.

**Corpus:** se antepuso la palabra "Estudió" al inicio de la sección "Formación y
certificaciones" (antes empezaba directo con "Ingeniería Mecatrónica en..."), acercando
léxicamente el fragmento a la pregunta natural. Mejoró la distancia de 0.699 a 0.663, aunque
sin ganarle el primer puesto al fragmento competidor.

No se reescribió el fragmento competidor ("Trabajo público y divulgación") para quitarle la
palabra "clases": el riesgo de romper otra cosa no compensaba una mejora marginal de ranking
cuando el fragmento correcto ya cabía holgado dentro del top-5 que recibe el agente.

## Medición final

Con las dos capas juntas: **8 de 8** respuestas correctas en corridas repetidas, contra 1 de 3
antes del arreglo.

## La lección, para cualquier guardrail futuro

Un checklist mecánico que reduce un juicio difícil ("¿tengo el dato o no?") a una regla simple
puede introducir un atajo hacia el resultado más fácil de producir, no el más correcto. Cuando
eso ocurra, la primera sospecha no es "el modelo es descuidado": es "¿le di una plantilla de
salida más fácil que hacer el trabajo real?". Y cuando el fallo es intermitente, una sola
corrida nunca basta para declarar un arreglo bueno — la misma disciplina que ya rigió el ajuste
del RAG (ADR-0014, ADR-0015) aplica igual de fuerte al prompt.
