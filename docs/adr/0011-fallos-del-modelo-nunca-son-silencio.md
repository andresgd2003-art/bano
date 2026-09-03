# Un fallo del modelo nunca se convierte en silencio

n8n responde `200` con el **cuerpo vacío** cuando un nodo revienta. Se descubrió en la fase 1
con un `ReferenceError`, y con un agente que llama a un servicio externo dejó de ser una
curiosidad: un tiempo de espera agotado o un 429 se manifestarían como un éxito vacío.

Dos capas, en este orden:

**Modelo de respaldo.** El nodo Agente tiene un segundo modelo conectado como fallback:
`nvidia/nemotron-3-super-120b-a12b`, gratuito. Si `gpt-5-mini` falla o se agota la cuota
compartida con el bot de ventas, BANO sigue respondiendo en vez de devolver un error.
Verificado rompiendo el modelo principal: la respuesta llegó igual, con `200`.

**Rama de error.** Si fallan los dos, la salida de error del Agente va a un nodo que traduce
el fallo a un error con la forma del spec. El texto crudo **nunca** se devuelve: puede traer
nombres de nodos, trazas y hasta el prompt del sistema, así que sólo se usa para clasificar.

| situación | código | `code` |
|---|---|---|
| tiempo de espera agotado | 504 | `upstream_timeout` |
| límite de peticiones del proveedor | 429 | `rate_limited` |
| cualquier otro fallo del modelo | 503 | `upstream_error` |

## 503 y no 502

**El Traefik de Easypanel intercepta los `502` del backend** y los sustituye por su propia
página HTML de *"Service is not reachable"*, porque 502 es el código que él mismo usa cuando
un servicio está caído. Medido: con 502 el cliente recibe HTML; con 503 y 504 el cuerpo JSON
llega intacto.

## Verificación

Forzando los fallos, no razonando que debería funcionar:

    modelo principal roto              -> 200, respondió el de respaldo
    ambos con espera de 1 ms           -> 504 upstream_timeout, en 0.38 s
    ambos con ids inexistentes         -> 503 upstream_error, en 0.74 s
    los tres cuerpos                   -> sin nombres de nodos, trazas ni prompt

## Lección de operación

Durante estas pruebas se perdió un cambio: dos escritores distintos sobre el mismo workflow
—el MCP y un script propio que leía y reescribía el flujo entero— produjeron una actualización
perdida, y el endpoint quedó un rato con los modelos rotos. **Un solo escritor a la vez**, y
verificar en n8n que el cambio quedó escrito antes de dar por buena una prueba.
