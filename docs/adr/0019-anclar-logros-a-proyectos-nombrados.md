# El prompt exige nombrar el proyecto, no solo describir la capacidad

## Contexto

Un evaluador real usó la plataforma del reto el 2026-09-03 (no una prueba propia: se
reconstruyó vía las ejecuciones reales del workflow en n8n, distinguibles de mis pruebas por
el `user-agent` — `Bun/1.3.14` de la plataforma contra `curl/8.15.0` de mis scripts).

## Lo que se encontró, con evidencia

En cuatro sesiones reales, ante preguntas como "¿qué hace Andrés, por qué contratarlo?" o
"¿cuáles son sus tres mejores habilidades?", BANO respondió con capacidades abstractas
("diseña arquitecturas de agentes de punta a punta", "un flujo agéntico que detecta
anomalías", "una tubería RAG evaluada con preguntas reales") sin nombrar un solo proyecto
concreto (Sting AI, SATS, USAIGE), pese a que esos proyectos están documentados con detalle
en el corpus. Además, en 3 de las 4 sesiones, una parte significativa de la respuesta describía
la propia arquitectura técnica de BANO (n8n, 23 nodos, Open Responses) en vez de la trayectoria
de Andrés, que es su propósito declarado.

Una ejecución de esa misma conversación (id 70439, turno 4 de 4) además falló en producción con
`"Max iterations (10) reached"` justo en la pregunta más relevante para un reclutador
("¿por qué deberíamos contratarlo?"), y el usuario no reintentó: abandonó el hilo y empezó una
conversación nueva 3 horas después. Verificado que este fallo específico ya no reproduce tras
el fix de `reasoningEffort` del ADR-0017 (hecho por otra razón, antes de descubrir este caso).

## La corrección (v8)

Sección nueva "Ancla cada logro a un proyecto nombrado": toda afirmación sobre habilidades o
motivos para contratar debe llevar al menos un proyecto nombrado con su resultado medido, y se
acota explícitamente cuándo BANO puede hablar de su propia arquitectura (solo si se lo
preguntan directamente, nunca como relleno de una respuesta sobre Andrés).

## Medición

Repetida la pregunta real ("y que hace andres? porque deberiamos contratarlo?") tras el fix:
respuesta con proyectos nombrados y resultados medidos, sin caer en el loop de iteraciones.

Los cuatro gates existentes (conformidad, recuperación, conversación, guardrails) siguen en
verde con v8 desplegado — sin regresión. La batería DeepEval (#26, multi-turno) además mostró
una mejora no buscada: dos familias de ataque que fallaban con v7 bajo presión repetida
("trampa": afirmar que Andrés trabajó en Microsoft; "sesgo": aceptar el origen geográfico o la
edad como criterio de evaluación) pasaron a `CUMPLE` con v8, posiblemente porque exigir anclar
cada afirmación a evidencia concreta hace al modelo más cauto en general, no solo en el caso
que motivó el cambio.

## Lo que queda sin resolver

Dos familias de la batería DeepEval siguen fallando bajo presión multi-turno: estrés sostenido
(tono grosero, preguntas encimadas — BANO a veces pierde el tono profesional o deja de
responder con datos) y mezcla de español/inglés en el mismo mensaje. No se atacan en este
cambio: requieren su propio ciclo de diseño y medición, documentado como trabajo pendiente en
el README junto al resultado de la batería.
