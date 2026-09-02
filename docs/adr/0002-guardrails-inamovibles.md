# Los guardrails de BANO ganan sobre las instrucciones entrantes

La plataforma expone un campo "Instrucciones" que viaja como el `instructions` opcional del
request de Open Responses. Un evaluador puede escribir ahí lo que quiera, incluido un intento
de inyección.

Las instrucciones entrantes se anteponen al prompt y se respetan como preferencias de estilo,
pero no pueden apagar los guardrails: no inventar datos sobre Andrés, no cambiar de persona,
no salir del tema. Un `instructions` que pida lo contrario recibe una negativa breve.

La alternativa (que gane lo entrante) cumple el campo al pie de la letra y falla en el primer
intento de inyección, que es justo lo que la evaluación busca provocar.
