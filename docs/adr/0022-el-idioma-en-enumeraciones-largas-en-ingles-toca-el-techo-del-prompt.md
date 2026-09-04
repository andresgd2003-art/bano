# El idioma en enumeraciones largas en inglés toca el techo de lo que el prompt puede garantizar

## Contexto

BANO debe responder en el idioma de cada mensaje. El corpus está 100% en español, así que ante
una pregunta en inglés el modelo lee cinco fragmentos en español y luego traduce al escribir.
Para preguntas cortas esto funciona. Para una enumeración larga —"What projects has Andrés
worked on?", que genera 30 o más palabras en varios renglones— el modelo se desliza al español
a media respuesta en una fracción de las corridas.

## Lo que se midió

El mismo caso, seis corridas por versión, en el flujo de test:

| versión | fallos de idioma |
|---|---|
| v18 (la que corría en producción) | 2 de 6 |
| v19 (regla de idioma reforzada) | 1 de 6 |
| v20 (auto-corrección: releer renglón por renglón) | 1 de 6 |

Tres observaciones que importan:

- El bug ya vivía en producción. No lo introdujo ninguno de estos cambios; v18 lo fallaba más
  seguido que v20.
- Cada refuerzo del prompt lo mejoró un poco y luego dejó de mejorar. De v19 a v20, con una
  técnica distinta (auto-corrección, la misma que sí arregló el saludo), el número no se movió.
- El caso es intrínsecamente no determinista: ~1 de 6, no 0 y no siempre.

## La decisión

Se promovió v20. No es una regresión: mejora el idioma respecto a lo que corría (2/6 a 1/6) y
además arregla tres cosas medidas en la batería de conocimiento —que BANO trate el giro de un
empleador como tema propio y no "fuera de lo mío", las definiciones de USAIGE/Sting AI/Joyson, y
la memoria multi-turno (10/10)—. Dejar v20 sin promover para no tocar un caso que ya fallaba más
en producción habría sido preservar un estado peor por miedo a un número que no empeora.

"Cero regresiones" se lee aquí como "nada empeora respecto a producción", no como "todo llega a
la perfección": ninguna versión ha alcanzado 6/6 en este caso, ni siquiera v12, que fue la que
más lo bajó en su momento.

## El techo, y por dónde saldría

El prompt tocó su techo. Tres versiones con tres tácticas distintas convergen en el mismo ~1/6.
Seguir agregando énfasis al prompt es gastar tokens de prefill contra un fallo que ocurre en la
generación, no en la instrucción — el mismo patrón que el ADR-0021 documentó para la latencia.

La única salida que cerraría ese 1/6 es determinista, no de prompt: detectar en el nodo de
salida que la pregunta venía en inglés y la respuesta salió mayoritariamente en español, y en
ese caso reintentar o corregir. Eso es un cambio de flujo con su propio costo (una heurística de
detección de idioma, y qué hacer cuando se dispara sin volver a llamar al modelo a ciegas), así
que se deja como trabajo aparte y no se improvisa aquí.

## Consecuencia para el arnés

`tests/invariantes.mjs` trata este caso como pasa/falla de un intento, así que reportará el
invariante "roto" en aproximadamente una de cada seis corridas aunque el sistema esté igual o
mejor que producción. No se relaja el criterio —la respuesta correcta sigue siendo inglés
completo— pero al leer un fallo de idioma en ese caso concreto hay que recordar que es un caso
flaky conocido, no una regresión nueva, y confirmarlo repitiéndolo antes de actuar.
