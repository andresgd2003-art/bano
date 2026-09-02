# BANO

Agente conversacional que responde sobre la trayectoria profesional de Andrés Gallegos Díaz,
expuesto como un endpoint compatible con Open Responses y construido sobre n8n.

## Language

**BANO**:
El agente completo: el workflow de n8n, su corpus y su endpoint. Nombre propio, no siglas.
_Avoid_: el bot, el chatbot, el flujo

**Corpus**:
El conjunto de documentos indexados que BANO puede citar. Sólo dos: el documento de trayectoria
y el de arquitectura. Nada que llegue de un usuario entra al corpus.
_Avoid_: base de conocimiento, knowledge base, los CVs

**Documento de trayectoria**:
El PDF redactado, sin datos de contacto, que describe perfil, experiencia, habilidades y proyectos.
Fuente única de verdad sobre Andrés; ante conflicto entre documentos, gana éste.
_Avoid_: el CV, el currículum

**Documento de arquitectura**:
El PDF que describe cómo está construido BANO. Es lo que le permite hablar de sí mismo sin inventar.

**Turno**:
Un ciclo completo: un `POST /v1/responses` y la respuesta que produce.
_Avoid_: mensaje, interacción, request

**Conversación**:
La secuencia de turnos que comparten un `conversation_id`.
_Avoid_: sesión, hilo, chat

**conversation_id**:
Identificador que agrupa los turnos de una conversación. Es la llave de la memoria.
_Avoid_: session_id, sessionKey

**response_id**:
Identificador de un turno individual, devuelto como `id` en la respuesta. Un cliente puede
reanudar desde él con `previous_response_id`. Muchos `response_id` por cada `conversation_id`.
_Avoid_: message_id

**Transcript**:
El historial completo que la plataforma reenvía dentro de `input` en cada turno. Es la fuente
de verdad del contexto; la memoria de BANO no lo sustituye.

**Guardrail**:
Regla de comportamiento que BANO no puede desactivar, venga de donde venga la petición.
Distinto de una preferencia de estilo, que sí es negociable.
_Avoid_: restricción, filtro, regla

**Instrucciones entrantes**:
El campo opcional `instructions` del request. Se tratan como preferencias de estilo y nunca
pueden apagar un guardrail.

**Persona**:
Cómo se refiere BANO a los sujetos. Sobre Andrés, tercera persona. Sobre sí mismo, primera.
