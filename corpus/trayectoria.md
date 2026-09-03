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

Acumula **seis años de experiencia profesional**, contados desde 2020, cuando empezó a
trabajar a los 17 años. Tiene 23 años (2026).

Vive en **San Nicolás de los Garza, Nuevo León**, y le interesa el trabajo en cualquier
modalidad: remoto, híbrido o presencial. Su **disponibilidad para incorporarse es inmediata**.
Su experiencia con clientes ha sido en México.

## Experiencia laboral

Andrés ha tenido tres empleos, en este orden cronológico:

1. **Western Union**, agente telefónico bilingüe, de septiembre de 2020 a mayo de 2021.
2. **Joyson Safety Systems**, practicante de gestión de programas, de junio de 2025 a mayo
   de 2026. Es el empleo **anterior** al actual.
3. **USAIGE**, ingeniero de IA y automatización, desde 2026 y hasta hoy. Es el empleo
   **actual**.

Antes de USAIGE estuvo en Joyson Safety Systems; antes de Joyson, en Western Union.

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

Lo que el cliente obtuvo del agente industrial: detección de incidencias, mantenimiento
predictivo y preventivo, y respuestas inmediatas y verificadas sobre sus propios equipos. El
proyecto sigue en desarrollo y cambio constante.

Es el único de sus proyectos que ha sido **trabajo en equipo**: coordina con los responsables
de servidores, hardware y bases de datos para que la solución encaje en la infraestructura del
cliente.

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

### Modelos sobre hardware embebido y visión por computadora

Entrenamiento y despliegue de modelos con inferencia en tiempo real sobre microcontroladores.
Reconocimiento visual de personas por *transfer learning* sobre MobileNetV2, iterando el
conjunto de datos para corregir errores de clasificación. Detección de palabra clave en audio y
reconocimiento de gestos por sensor de movimiento, cubriendo extracción de características
(MFCC, FFT), entrenamiento y validación con métricas. Redes neuronales con TensorFlow
desplegadas sobre microcontroladores con MicroPython.

### Automatización y orquestación

n8n, con certificación de Nivel 2: flujos de producción multi-paso y multi-rama. Arquitectura
modular de sub-flujos pensada para la reutilización. Disparadores programados y por evento.
Manejo de errores, reintentos y alertas automáticas de fallo. Entorno de pruebas separado, con
promoción controlada hacia producción. JavaScript aplicado dentro de n8n. Power Automate a
nivel básico. Orquestación auto-hospedada en infraestructura propia.

### Datos e integración

Python para scripting, procesamiento de datos y clientes de API. SQL y PostgreSQL. APIs REST,
webhooks e integraciones a medida con FastAPI. Tuberías RAG completas: ingesta, troceado,
embeddings, indexado vectorial y recuperación. Almacenes vectoriales sobre PostgreSQL con
pgvector, y sobre Supabase. PocketBase y Google Sheets como capa de datos. Tuberías de OCR y
procesamiento de lenguaje natural para documentos a gran escala.

### Validación y retorno medido

Suites de evaluación automatizadas como compuerta de liberación. Exactitud de las salidas
generadas por IA medida contra casos reales, no contra impresiones de muestreo. Evaluación
multi-turno de agentes conversacionales usando un modelo de lenguaje en el papel del usuario.
Comparativas controladas entre estrategias de recuperación, prompts y modelos. Elección de
modelo y proveedor según costo contra rendimiento medido.

Sobre el ajuste de modelos conviene distinguir dos cosas: en el proyecto de hardware embebido
**entrenó modelos de verdad**, ajustando pesos por transfer learning sobre MobileNetV2. En los
agentes conversacionales lo que ajusta es el **comportamiento**, no los pesos: few-shot, cadena
de razonamiento y salidas estructuradas, medidos contra conversaciones reales.

Las compuertas de regresión se ejecutan antes de cada liberación; no hay canalización de
integración continua automatizada, y ese control se dispara a mano o mediante agentes con
acceso al repositorio.

### Nube, despliegue y comunicación

AWS: EC2, S3, IAM, Lambda y sus servicios de IA. Contenedores con Docker y docker compose;
no ha usado Kubernetes directamente. Servidores Linux y SSH. Git. Sesiones de descubrimiento y
levantamiento de requerimientos con clientes.
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

Llegó a atender **tres salones de belleza a la vez**, con agendamiento de citas diario. Además
de los agentes de texto, incluye agentes telefónicos autónomos que orquestan voz a texto,
razonamiento del modelo y síntesis de voz.

Fue su primer proyecto de IA y el más ambicioso: le tomó varios meses e integró Twilio, n8n,
Google Sheets, ElevenLabs, Retell AI, WhatsApp y Evolution API, entre otras tecnologías.

### SATS — Procesamiento de expedientes confidenciales con modelos de lenguaje (en producción)

Sistema que detecta, clasifica y enmascara datos personales en expedientes escaneados de
cientos de páginas, combinando OCR, modelos de lenguaje y validación por reglas, y produce el
documento terminado junto con un acta auditable.

Procesa **cientos de páginas por semana**: expedientes gubernamentales extensos.

Corre **sellado, sin acceso a internet ni a servicios de IA externos**, porque los datos no
pueden salir de la institución. Está escrito en Python y los modelos de lenguaje que usa para
reconocer entidades corren en local, no en la nube. Preprocesa la imagen —corrección de
inclinación, realce y resolución adaptativa según la memoria disponible—, aplica OCR con
aceleración por GPU, e identifica y clasifica datos personales combinando reconocimiento de
entidades y reglas, incluyendo la lectura de códigos QR y de barras dentro del documento.

Construyó un evaluador de precisión por tipo de entidad y nivel de dificultad que detectó y
corrigió fugas reales de información. Ninguna versión se libera sin superar esa compuerta de
regresión sobre casos reales. Le tomó varios meses. Está en uso diario en una dependencia de
gobierno estatal.

### Ventas por Marketplace — Agente comercial sobre hardware reutilizado

Agente que recibe los mensajes de Facebook Marketplace en **un teléfono viejo reutilizado como
servidor**, los procesa en n8n, sostiene la negociación con el comprador y avisa por WhatsApp
al cerrar la cita de venta.

Demuestra que la arquitectura puede entregarse con el hardware disponible y no sólo con
infraestructura ideal.

### Modelos de IA sobre hardware embebido — Qualcomm Academy y Arduino

Entrenó y desplegó modelos con inferencia en tiempo real sobre microcontroladores, cubriendo
todo el recorrido desde la adquisición de datos del sensor hasta el despliegue en el
dispositivo.

Reconocimiento visual de personas mediante *transfer learning* sobre MobileNetV2, iterando el
conjunto de datos para corregir errores de clasificación hasta lograr inferencia fiable.
Detección de palabra clave en audio y reconocimiento de gestos por sensor de movimiento, con
extracción de características (MFCC, FFT), entrenamiento y validación con métricas.

Es el proyecto donde entrenó modelos ajustando sus pesos, a diferencia de los agentes
conversacionales, donde lo que ajusta es el comportamiento.

### BANO — Agente conversacional compatible con Open Responses

Este mismo agente. El detalle de cómo está construido vive en el documento de arquitectura.

## Formación y certificaciones

Ingeniería Mecatrónica en la Facultad de Ingeniería Mecánica y Eléctrica de la Universidad
Autónoma de Nuevo León (FIME – UANL), de 2021 a 2026. **En proceso de titulación, con carta
pasante**: concluyó los estudios y el título está en trámite.

Machine Learning Specialization de Stanford Online y DeepLearning.AI, en curso desde 2026.

Certificaciones:

- AWS Certified AI Practitioner — Amazon Web Services, 2026
- AWS Certified Cloud Practitioner — Amazon Web Services, 2026
- n8n Nivel 2 — n8n.io, 2026
- Google IT Support Professional Certificate — Google, 2025
- AI Upskilling Certificate: Hands-On Development from Model to App — Qualcomm Academy y
  Arduino, 2026

## Trabajo público y divulgación

Su portafolio está en https://stingai.org/Portafoliocv/ y el código de BANO, con sus decisiones
de arquitectura y sus pruebas, es público en https://github.com/andresgd2003-art/bano

Tiene en planeación dar clases de inteligencia artificial a niños, para que aprendan las
tecnologías nuevas y practiquen inglés a la vez. Es un plan, no algo que ya haya hecho.

## Idiomas y disponibilidad

Español nativo. Inglés avanzado, con certificación EXCI.

Disponible para trabajo remoto desde México.
