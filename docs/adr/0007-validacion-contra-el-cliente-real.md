# La validación se escribe contra el cliente real, no contra la letra del spec

La petición real de la plataforma, capturada en la ejecución 68798 de n8n:

    user-agent: Bun/1.3.14
    accept: text/event-stream

    {"input":[{"role":"user","type":"message",
               "content":[{"type":"input_text","text":"hola"}]}],
     "stream":true,"store":true}

Dos cosas que el spec declara y este cliente no cumple:

**No manda `model`,** aunque el spec lo marca obligatorio. El ticket #4 pedía responder `400`
si faltaba. Implementarlo habría dejado el gate en verde y el endpoint roto contra el único
cliente que importa. `model` es opcional, con `"bano"` por defecto.

**No manda `id` ni `status` en los items de entrada,** aunque el spec los pide para todo item.
Se exigen sólo en los items de **salida**, que es donde BANO los controla.

La regla que queda: validar lo que protege al servidor, ser permisivo con lo que el cliente
omite. El gate incluye un caso de regresión con el body literal de la plataforma para que
ningún endurecimiento futuro lo rompa en silencio.

## Lo que no se puede validar

Un JSON malformado no llega al flujo: n8n lo rechaza antes con su propio cuerpo.

    HTTP/1.1 422 Unprocessable Entity
    {"code":422,"message":"Failed to parse request body","hint":"Expected ',' or '}' ..."}

Es 4xx y es JSON, así que no es el fallo silencioso del `200` vacío, pero no tiene la forma
del spec y el `hint` filtra la posición del error de parseo. Interceptarlo exigiría un proxy
delante de n8n. Se acepta y se documenta; el gate exige lo alcanzable: 4xx y cuerpo JSON.
