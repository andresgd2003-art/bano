# Trayectoria profesional de Andrés Gallegos Díaz

Documento fuente del corpus de BANO. Es la **fuente única de verdad** sobre Andrés: ante
cualquier conflicto con otro documento, gana este.

No contiene datos de contacto a propósito. El agente habla de la trayectoria; no reparte
teléfonos ni correos.

## Perfil profesional

Andrés Gallegos Díaz es ingeniero de IA y automatización, especializado en arquitecturas
agénticas que lleva de punta a punta: desde la primera conversación de descubrimiento con el
cliente hasta el despliegue en la infraestructura de este y su operación en producción.

Conduce el descubrimiento directamente con el cliente, traduce el problema operativo en un
diseño completo —fuentes de datos, plataforma de automatización, modelo de lenguaje,
acciones— y se queda como responsable del sistema una vez en marcha.

Sus recomendaciones se apoyan en evidencia medida, no en suposiciones. En un sistema de
recuperación en producción evaluó seis rutas de mejora y las rechazó todas con datos,
identificando el techo técnico real y evitando un gasto que no habría rendido.

Construye agentes multi-paso con estado, memoria, uso de herramientas y function calling; los
integra con bases de datos, APIs y plataformas de negocio; y valida su exactitud con suites de
evaluación automatizadas antes de cada liberación. Documenta cada arquitectura como un patrón
reutilizable.

Se desempeña con soltura en español e inglés, incluyendo la presentación de recomendaciones
técnicas a interlocutores no técnicos.

## Experiencia laboral

### Ingeniero de IA y Automatización — USAIGE (2026 – actualidad)

Es dueño de la solución técnica de principio a fin para el cliente: conduce la conversación de
descubrimiento, diseña la arquitectura, presenta la recomendación, la despliega en la
infraestructura del cliente y la monitorea en producción.

Diseñó y puso en marcha un flujo agéntico que consulta una base de datos industrial como
herramienta, detecta anomalías y picos de consumo, levanta alertas y analiza el histórico por
máquina para recomendar rutinas de operación de menor costo. Ese argumento de retorno de
inversión fue el que convenció al cliente.

Arquitectó una tubería RAG completa sobre documentación técnica y la mejoró midiendo la
calidad de las respuestas contra preguntas reales de usuarios. Evaluó seis rutas de mejora y
las descartó todas con evidencia, tras identificar que el techo real era la permuta entre
exhaustividad y precisión en la recuperación.

Documenta cada solución, su arquitectura y sus resultados medidos, de modo que el patrón pueda
volver a desplegarse.

### Practicante de Gestión de Programas — Joyson Safety Systems (junio 2025 – mayo 2026)

Identificó una oportunidad de automatización que nadie había pedido y construyó la solución:
lee la base de datos de solicitudes de cotización, agrupa los pendientes por responsable y
emite un correo consolidado por persona. El proceso pasó de 60 minutos a 3, una reducción del
95 por ciento.

Construyó además un agente conversacional de consulta de inventario en Microsoft Copilot
Studio. Documentó ambas herramientas y capacitó a los usuarios hasta que fueron adoptadas como
estándar regional.

### Agente telefónico bilingüe — Western Union (septiembre 2020 – mayo 2021)

Atención y resolución de incidencias financieras en inglés, con documentación y trazabilidad
de cada caso.

## Habilidades técnicas

### Arquitectura agéntica y aplicaciones con modelos de lenguaje

Diseños de punta a punta que van de la fuente de datos a la plataforma de automatización, de
ahí al modelo de lenguaje y finalmente a la acción. Agentes multi-paso con estado, memoria,
uso de herramientas y function calling. Enrutamiento condicional y puntos de control con
intervención humana. Salidas estructuradas. Servidores del Model Context Protocol (MCP) como
clientes en flujos de producción. APIs de Anthropic (Claude), OpenAI y NVIDIA. Modelos de
pesos abiertos auto-hospedados. Ingeniería de prompts.

### Automatización y orquestación

n8n, con certificación de Nivel 2: flujos de producción multi-paso y multi-rama. Arquitectura
modular de sub-flujos pensada para la reutilización. Disparadores programados y por evento.
Manejo de errores, reintentos y alertas automáticas de fallo. Entorno de pruebas separado, con
promoción controlada hacia producción. Power Automate a nivel básico. Orquestación
auto-hospedada en infraestructura propia.

### Datos e integración

Python para scripting, procesamiento de datos y clientes de API. SQL y PostgreSQL. APIs REST,
webhooks e integraciones a medida con FastAPI. Tuberías RAG completas: ingesta, troceado,
embeddings, indexado vectorial y recuperación. Almacenes vectoriales sobre PostgreSQL con
pgvector, y sobre Supabase. Tuberías de OCR y procesamiento de lenguaje natural para
documentos a gran escala.

### Validación y retorno medido

Suites de evaluación automatizadas como compuerta de liberación. Exactitud de las salidas
generadas por IA medida contra casos reales, no contra impresiones de muestreo. Evaluación
multi-turno de agentes conversacionales usando un modelo de lenguaje en el papel del usuario.
Comparativas controladas entre estrategias de recuperación, prompts y modelos. Elección de
modelo y proveedor según costo contra rendimiento medido.

### Nube, despliegue y comunicación

AWS: EC2, S3, IAM, Lambda y sus servicios de IA. Docker y docker compose. Servidores Linux y
SSH. Git. Sesiones de descubrimiento y levantamiento de requerimientos con clientes.
Documentación de arquitecturas y patrones reutilizables. Presentación de recomendaciones
técnicas a interlocutores no técnicos, en inglés y español.

## Proyectos y arquitecturas entregadas

### Sting AI — Plataforma agéntica con evaluación automatizada (en producción)

Arquitectura agéntica de punta a punta que atiende a clientes reales en WhatsApp y Facebook,
con acceso como herramientas al catálogo, el inventario, los precios y la agenda. Incluye
sincronización bidireccional entre la base de datos y Google Sheets, y un panel de
administración que el dueño del negocio opera desde su teléfono.

Está construida como sub-flujos modulares, con un entorno de pruebas separado de producción, y
un simulador que somete a los agentes a conversaciones multi-turno generadas por un modelo de
lenguaje para validar su comportamiento antes de cada liberación.

### SATS — Procesamiento de expedientes confidenciales con modelos de lenguaje (en producción)

Sistema que detecta, clasifica y enmascara datos personales en expedientes escaneados de
cientos de páginas, combinando OCR, modelos de lenguaje y validación por reglas, y produce el
documento terminado junto con un acta auditable.

Corre íntegramente en infraestructura local porque los datos no pueden salir de la
institución. Ninguna versión se libera sin superar una compuerta de regresión automatizada
sobre casos reales; ese control detectó y bloqueó una fuga de datos real que un cambio había
introducido. Está en uso diario en una dependencia de gobierno estatal.

### BANO — Agente conversacional compatible con Open Responses

Este mismo agente. El detalle de cómo está construido vive en el documento de arquitectura.

## Formación y certificaciones

Ingeniería Mecatrónica en la Facultad de Ingeniería Mecánica y Eléctrica de la Universidad
Autónoma de Nuevo León (FIME – UANL), de 2021 a 2026.

Machine Learning Specialization de Stanford Online y DeepLearning.AI, en curso desde 2026.

Certificaciones:

- AWS Certified AI Practitioner — Amazon Web Services, 2026
- AWS Certified Cloud Practitioner — Amazon Web Services, 2026
- n8n Nivel 2 — n8n.io, 2026
- Google IT Support Professional Certificate — Google, 2025

## Idiomas y disponibilidad

Español nativo. Inglés avanzado, con certificación EXCI.

Disponible para trabajo remoto desde México.
