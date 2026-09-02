# BANO usa la API de NVIDIA, no la credencial de OpenAI de la instancia

n8n corre en la misma instancia que un bot de ventas en producción, que comparte una
credencial de OpenAI ya propensa a 429 en ráfagas. Las pruebas de estrés de BANO —y un
evaluador externo golpeando el endpoint cuando quiera— habrían competido por esa cuota.

Se usa la API de NVIDIA, verificada en vivo el 2026-09-02: 82 modelos disponibles, chat con
`nvidia/nemotron-3-super-120b-a12b` y embeddings con `nvidia/nemotron-3-embed-1b` (2048
dimensiones), ambos HTTP 200. Es gratuita y aísla la cuota sin infraestructura adicional.

Cuidado: un 404 "Not found for account" o un 410 en NVIDIA es por modelo, no por cuenta;
el catálogo viejo murió pero la cuenta vive. Y el 120B necesita `max_tokens` holgado
(~4000) con el razonamiento ACTIVO — apagarlo empeora la calidad.

## Corregido despues

Los **embeddings** ya no salen por NVIDIA: sus modelos son asimetricos y el nodo nativo de n8n
no puede enviarles `input_type`, asi que la recuperacion no discriminaba. Ver ADR-0009.
Esta decision sigue vigente para el **chat**, que es donde estaba el consumo de cuota real.
