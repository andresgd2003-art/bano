# El estado de la conversación viaja por `previous_response_id`, no por transcript

El formulario de la plataforma ofrece exactamente dos modos de estado: **sin estado** y
**previous_response_id**. No existe una opción de reenviar el historial completo.

Se elige `previous_response_id`. *Sin estado* haría imposible cualquier conversación real:
una pregunta como "¿y en cuál de esos proyectos usó RAG?" no tendría a qué referirse, y la
evaluación pide explícitamente que el agente use el contexto de la trayectoria.

## Consecuencia

Lo único que llega del pasado es un identificador. **BANO tiene que guardar la conversación
él mismo**, o no recuerda nada. La tabla `turnos` (`response_id → conversation_id`) deja de
ser una comodidad para la conformidad y pasa a ser el mecanismo de memoria: traduce el
`previous_response_id` entrante en la llave con la que Simple Memory recupera el hilo.

Durante el diseño se asumió por error que la plataforma reenviaría el transcript en cada
turno, y bajo ese supuesto la tabla parecía opcional. No lo es. El glosario reemplazó el
término "Transcript" por "Cadena de respuestas" para no arrastrar el error.
