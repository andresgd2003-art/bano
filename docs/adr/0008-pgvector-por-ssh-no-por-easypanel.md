# El Postgres de BANO se levanta por SSH con un script, no desde el panel de Easypanel

La red `easypanel-n8n` es un overlay de Docker con `attachable=true`, así que un contenedor
lanzado con `docker run --network easypanel-n8n` se une a ella y n8n lo resuelve por nombre
vía DNS de Docker. Verificado desde el contenedor de n8n: `bano_postgres → 10.0.1.9`,
puerto 5432 abierto.

Por eso no hace falta el panel. El servicio se crea con `infra/pgvector.sh`, versionado en
este repositorio.

## Por qué el script y no la interfaz

Un clic en un panel no deja rastro. El script sí: dice qué imagen, en qué red, con qué
volumen, y por qué. Es idempotente, así que rehacer el servicio en otra máquina es
ejecutarlo. La evaluación pregunta cómo se despliega y se opera el sistema, y un archivo
responde eso mejor que una captura de pantalla.

Contrapartida aceptada: el contenedor no aparece en Easypanel, así que no se administra desde
ahí. Sobrevive a reinicios por `--restart unless-stopped`. Si alguna vez Easypanel hace una
limpieza agresiva de recursos que no gestiona, el script lo vuelve a crear.

## Decisiones dentro del script

**No publica puertos.** Sin `-p`, la base sólo es alcanzable dentro de la red overlay. No
está expuesta a internet, aunque el VPS sí lo esté.

**Volumen con nombre** (`bano_pgdata`), para que los datos sobrevivan a recrear el contenedor.

**La contraseña se genera al vuelo y se imprime una sola vez.** No está en el script ni en el
repositorio; vive en el `.env` local y en una credencial de n8n.
