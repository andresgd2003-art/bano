# El bearer se verifica por hash en una Data Table, no con la autenticación nativa del webhook

El ticket #2 pedía dos cosas que en n8n son incompatibles: un `401` con la forma de error del
spec (`{type, code, message, param}`) y que el token no viviera escrito en el flujo.

## Por qué no la autenticación nativa del webhook

Se probó en un flujo desechable con una credencial `httpHeaderAuth` real. Lo que devuelve:

    HTTP/1.1 403 Forbidden
    Www-Authenticate: Basic realm="Webhook"

    Authorization data is wrong!

Tres problemas, no uno: es `403` en vez de `401`; el cuerpo es **texto plano**, ni siquiera
JSON; y anuncia `Basic` aunque la autenticación configurada sea Header Auth. El rechazo ocurre
antes de que corra ningún nodo, así que no hay forma de darle otra forma.

No es cuestión de versión. El `403` es un bug abierto en n8n (issue #26365, señalado como
violación del RFC 7235), y aunque lo corrigieran, el cuerpo seguiría siendo texto plano. El
nodo no expone ninguna opción para personalizar la respuesta de rechazo.

También se descartó la variable de entorno: `$env` llega vacío al Code node porque el task
runner externo no hereda las variables del contenedor.

## Qué se hace en su lugar

La data table `bano_secretos` guarda el **SHA-256** del token (fila `clave =
bearer_token_sha256`), nunca el token. Un nodo `Crypto` hashea el bearer entrante y `Autorizar`
compara hashes. El token en claro no existe en ninguna parte de n8n, y `workflows/bano.json`,
que es público, sólo referencia la tabla.

SHA-256 sin sal ni factor de costo es correcto **aquí**: el token son 256 bits de
`openssl rand`, no una contraseña humana. bcrypt y argon2 existen para resistir ataques de
diccionario contra secretos de baja entropía; contra 256 bits aleatorios no aportan nada.

No se implementa comparación en tiempo constante: el sandbox del task runner no expone
`crypto.timingSafeEqual`, y un ataque de temporización contra un hash a través de internet,
con el jitter de red de por medio, no es una amenaza realista.

## Consecuencias

- Rotar el token es actualizar una fila con el nuevo hash. Sin reiniciar nada.
- Si la fila desaparece, el flujo responde `500 token_no_configurado`: falla cerrado.
- Se paga una lectura de data table por turno.
