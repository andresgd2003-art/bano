# El filtro determinista de inyección registra, no bloquea

## Contexto

El prompt (v6/v7) resiste intentos de inyección clásicos por instrucción, pero esa resistencia
depende de que el modelo decida bien en cada turno. No hay garantía determinista de que un
intento de inyección quede visible en el registro si el modelo lo resiste sin mencionarlo.

## Decisión

Se añadió, en `Validar entrada` (código, antes de que la pregunta llegue al modelo), un
glosario de patrones regex (`ignora tus instrucciones`, `system prompt`, `actúa sin
restricciones`, `modo desarrollador`, `jailbreak`, `DAN`, etc.) que marca la petición con
`alerta_inyeccion: true`. El flag viaja por `Decidir conversacion` y `Preparar registro` hasta
la columna `alerta_inyeccion` de la tabla `turnos`.

**El filtro NO bloquea la petición.** Solo la marca. La pregunta sigue su curso normal hacia el
agente igual que cualquier otra.

## Por qué no bloquear

- Un glosario de regex es necesariamente incompleto y con falsos positivos: la frase "actúa con
  responsabilidad, sin restricciones absurdas" activaría el patrón sin ser un ataque.
  Bloquear negaría servicio a una pregunta legítima por una coincidencia de palabras.
- Lo que de verdad importa —que BANO no revele su prompt ni cambie de conducta— ya lo garantiza
  el prompt (ADR de v7) y se mide con `tests/guardrails.mjs`. El filtro no sustituye esa defensa,
  la complementa.
- Lo que el filtro SÍ garantiza, de forma determinista, es que un intento de inyección quede
  **auditable** en la base de datos aunque el modelo lo resista perfectamente y no lo mencione
  en su respuesta — el registro no puede depender de que el modelo se acuerde de contarlo.

## Verificación

4 pruebas manuales tras corregir un bug de normalización de acentos (el regex sin acentos no
reconocía "Actúa" con tilde, que es como la gente escribe de verdad): 2 positivos verdaderos, 2
negativos verdaderos, incluyendo un caso adversarial ("restricciones" en un contexto inocuo) que
el filtro dejó pasar sin marcar por no matchear ningún patrón completo.

## Consecuencia

`alerta_inyeccion` en la tabla `turnos` permite, más adelante, consultar cuántos intentos de
inyección llegaron y si el prompt los resistió (comparando el flag contra una revisión manual de
la columna `salida`), sin depender de que el propio modelo se delate.
