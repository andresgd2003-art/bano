# El bearer vive en una Data Table, no en una credencial de n8n

El ticket #2 pedía dos cosas incompatibles: un `401` con la forma de error del spec
(`{type, code, message, param}`) y que el token viniera de una credencial de n8n.

La autenticación integrada del nodo Webhook rechaza **antes** de que corra ningún nodo,
así que devuelve su propio cuerpo (`403` con `{"code":403,"message":"Authorization data is
wrong!"}`) y no hay forma de darle la forma del spec. O credencial, o error conforme.

Gana el error conforme: la compatibilidad con Open Responses es el objetivo del proyecto,
mientras que el criterio de la credencial existía para que el token no acabara publicado.
El token vive en la data table `bano_secretos` (fila `clave=bearer_token`) y un nodo la lee
por turno, así que no aparece ni en el nodo ni en `workflows/bano.json`, que es público.

También se descartó la variable de entorno: `$env` llega vacío al Code node porque el task
runner externo no hereda las variables del contenedor, y arreglarlo obligaría a reiniciar
n8n, que atiende un bot de ventas en producción.

Consecuencia aceptada: una data table guarda el valor en texto plano, no cifrado como una
credencial. Cuando exista el Postgres de BANO (ADR-0001), el token puede mudarse ahí.
