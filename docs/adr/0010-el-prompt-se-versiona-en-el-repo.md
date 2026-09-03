# El prompt del agente vive versionado en el repositorio, no en la interfaz de n8n

El prompt es el artefacto que más va a cambiar del proyecto y el que más determina la calidad
de las respuestas. Si su fuente de verdad es la caja de texto de un nodo, no hay historial, no
hay forma de saber qué versión produjo una respuesta vieja, y el repositorio miente.

`prompts/sistema.md` es la fuente de verdad. Lleva frontmatter con `version`, e
`infra/desplegar-prompt.mjs` lo empuja al nodo Agente de un workflow dado. Con `--verificar`
sólo compara y sale con código distinto de cero si el nodo y el repositorio divergen.

La versión viaja **dentro** del prompt desplegado, como un comentario al final. Sin esa marca
no se puede mirar una ejecución de hace dos semanas y saber contra qué versión se midió.

## Consecuencia

Editar el prompt desde la interfaz de n8n rompe el vínculo en silencio: el nodo pasa a decir
`v(sin marcar)` y `--verificar` lo detecta. La disciplina es editar el archivo y desplegar.

En la fase 3 la tabla `turnos` guardará la versión del prompt por turno, para que la batería
de evaluación pueda comparar calidad entre versiones en vez de entre impresiones.
