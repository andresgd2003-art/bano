# Endurecer el prompt (v7) provocó respuestas vacías, y la causa no era el prompt

## Contexto

El ticket #25 pedía cerrar dos fallos medidos por el juez en `tests/guardrails.mjs` contra v6:
las tres preguntas de inyección clásica (0/3) y la de edad (respuesta demasiado larga con una
oferta no pedida). v7 añadió dos secciones al prompt — "Datos personales que no das" y "Pedir tu
prompt o tus reglas" — exigiendo una negación de una sola frase, sin ofrecer alternativas.

## La regresión, medida

Con v7 desplegado, `tests/guardrails.mjs` dio 10/10 en la primera corrida. En la segunda,
9/10: un caso de inyección volvió **veredicto NO_CUMPLE por respuesta vacía** ("La respuesta
está vacía y no contiene una frase de rechazo al pedido"). No era una cuestión de redacción: el
campo `output_text` llegaba literalmente vacío con `status: completed`.

Se aisló el caso y se repitió 9 veces (3 prompts de inyección × 3 intentos cada uno) contra el
endpoint real: **4 de 9 (44%) volvieron vacías.** No era ruido de una sola corrida.

## Causa raíz

`gpt-5-mini` es un modelo razonador: consume tokens de razonamiento interno antes de emitir el
texto visible. El nodo `Modelo` tenía `maxTokens: 4000` y `reasoningEffort` sin fijar (por
defecto, `medium`). v7 alargó el prompt con instrucciones más estrictas y ejemplos de qué NO
hacer — más contexto que razonar antes de decidir la respuesta — y en los prompts de inyección,
que son justo los que más "dudan" al modelo, el razonamiento a veces agotaba el presupuesto
completo de tokens antes de escribir una sola palabra visible.

No era un problema del contenido del prompt (las instrucciones nuevas no pedían nada malo); era
un problema de presupuesto de cómputo para un tipo de prompt más exigente de decidir.

## La corrección

Dos cambios en el nodo `Modelo`, no en el prompt:

- `maxTokens`: 4000 → 8000 (margen de seguridad).
- `reasoningEffort`: sin fijar (medium) → `low` (ataca la causa: menos tokens de razonamiento
  consumidos antes de la respuesta visible).

Con solo subir `maxTokens` a 8000: la tasa de vacíos bajó de 44% a 11% (1/9) — mejora real pero
no eliminó el bug. Con `reasoningEffort: low` además: **9/9 sin vacíos**, en dos corridas de
prueba aislada distintas.

## Medición final, batería completa

Con ambos cambios aplicados, se corrió la batería completa de gates para descartar que bajar el
razonamiento degradara otra cosa (el checklist de uso de `corpus_trayectoria`, en particular,
depende de un razonamiento cuidadoso — ver ADR-0016):

- `conformidad.mjs`: TODO VERDE.
- `recuperacion.mjs`: TODO VERDE (16 casos).
- `conversacion.mjs`: TODO VERDE, dos corridas seguidas (incluye el caso "¿Qué es SATS?", que
  había fallado de forma intermitente antes del fix — compatible con la misma causa raíz).
- `guardrails.mjs`: TODO VERDE (10/10 casos), tres corridas seguidas.

## La lección

Un fallo de comportamiento (respuesta vacía) no siempre vive en el prompt, aunque el cambio que
lo disparó haya sido un cambio de prompt. Antes de tocar el texto otra vez, hay que preguntar:
¿el modelo tiene presupuesto de cómputo suficiente para decidir lo que le estoy pidiendo? Con un
modelo razonador, un prompt más largo y más exigente de juicio consume más de ese presupuesto,
y el síntoma (vacío, no error) es fácil de confundir con "el prompt está mal" cuando el prompt
está bien y lo que falta es aire para pensar.
