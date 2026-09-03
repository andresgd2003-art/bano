# La tabla `turnos` es el mecanismo de memoria, no un registro accesorio

La plataforma manda únicamente el `previous_response_id` del turno anterior; no reenvía el
historial (ADR-0006). Sin una tabla propia que traduzca ese identificador a un
`conversation_id`, BANO recibiría un id opaco y un mensaje suelto, y no podría recordar nada.

Dos capas con duración distinta, deliberadamente:

| capa | dónde vive | qué hace |
|---|---|---|
| cadena `response_id → conversation_id` | Postgres, tabla `turnos` | identifica la conversación |
| ventana de 10 interacciones | memoria del proceso de n8n | es lo que el agente recuerda |

**La ventana no rompe la cadena.** Verificado con 12 turnos encadenados: un solo
`conversation_id`, cero eslabones rotos, y el turno 12 respondió correctamente a *"lo primero
que te pregunté"* aunque ese turno ya estaba fuera de la ventana del agente.

## El registro va después de responder

`Registrar turno` cuelga de `Responder`, no antes. El cliente recibe su respuesta y el registro
ocurre a continuación: no suma latencia, y un fallo al escribir en la base no puede impedir que
BANO conteste.

Por el mismo criterio, `Resolver conversacion` lleva `continueRegularOutput`: si la base falla,
el turno sigue y se responde sin memoria previa, en vez de no responder.

## Un solo parámetro en base64

`INSERT` recibe el turno entero como JSON codificado en base64, en un único parámetro.

n8n parte la lista de parámetros de consulta **por comas**, así que cualquier valor que
contenga una coma corre las columnas. Es un bug abierto de n8n
([#14955](https://github.com/n8n-io/n8n/issues/14955), reabierto en
[#16354](https://github.com/n8n-io/n8n/issues/16354), cerrado como *not planned*). Se vio en
vivo: la pregunta acabó en la columna `previous_response_id` y la respuesta en `entrada`.

El base64 no puede contener comas, así que el problema desaparece de raíz en vez de depender de
que ningún texto lleve una coma nunca.

## La versión del prompt se registra por turno

`infra/desplegar-prompt.mjs` sincroniza la versión en dos sitios: el prompt del agente y la
constante que se escribe en cada fila. Si sólo actualizara uno, el log mentiría sobre qué
versión produjo qué respuesta, que es justo lo que la evaluación necesita comparar.
