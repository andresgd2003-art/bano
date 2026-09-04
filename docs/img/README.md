# Capturas de los flujos de n8n

Imágenes referenciadas desde el README y desde `corpus/arquitectura.md`.

Flujo principal (`BANO — Open Responses endpoint`):

- `flujo-general.png` — el flujo completo: entrada → memoria → agente → salida.
- `flujo-agente.png` — el nodo Agente con sus cuatro capacidades (Modelo, Modelo de respaldo,
  corpus_trayectoria, Memoria).
- `flujo-entrada.png` — la rama de autenticación y validación.
- `flujo-salida.png` — la rama de salida y registro.

Flujo de ingesta (`BANO — Ingesta del corpus`), dos segmentos independientes:

- `ingesta-escritura.png` — reindexa el corpus (Webhook Ingesta → borra versión anterior →
  trocea → PGVector Insertar → resumen).
- `ingesta-captura.png` — el endpoint `/buscar` de sólo lectura, que inspecciona la recuperación
  (Webhook Buscar → PGVector Buscar → formatea). No es un flujo de prueba; lo usan los tests.

Tomadas con los paneles de nodo cerrados: ninguna credencial ni token es visible.
