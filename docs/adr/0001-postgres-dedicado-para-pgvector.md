# Postgres dedicado para pgvector, en vez de habilitarlo en el de n8n

El RAG necesita pgvector, y el Postgres que ya corre en el VPS es la imagen oficial
`postgres:17`, que no trae la extensión compilada: `pg_available_extensions` no lista
ninguna coincidencia con `vector`, así que `CREATE EXTENSION vector` falla.

Se levanta un servicio nuevo `pgvector/pgvector:pg17` dedicado a BANO en lugar de cambiarle
la imagen al Postgres de n8n. Esa base guarda 47 workflows, 9 de ellos activos y uno atendiendo
clientes reales; reiniciarla para ahorrar ~40 MB de RAM es una apuesta desproporcionada. El VPS
tiene 2.3 GB libres y 17 GB de disco, de sobra para un contenedor más.
