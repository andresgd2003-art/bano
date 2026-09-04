# La latencia la manda el largo de la respuesta, y un perfil sin acotar diagnostica el pasado

## Contexto

Tras cerrar el ticket #27 quedo una preocupacion legitima: una pregunta habia superado los 240
segundos. Se abrio un plan de cuatro tickets (#28 a #31) para atacarlo. Dos de ellos resultaron
infundados, y la razon de fondo es un error de metodo que conviene no repetir.

## El error de metodo

La linea base se construyo sobre **379 ejecuciones de todo un dia**: p50 13.4 s, p90 47.0 s,
maximo 187.9 s. Numeros reales, medidos, y aun asi enganosos: ese dia el prompt paso de v6 a v15,
con varios bugs graves corregidos en el camino. El p90 de 47 s era un promedio historico de
versiones que ya no existian.

Se diagnostico el pasado. Y lo peor es que los tickets escritos sobre esa base *parecian* bien
fundados, porque tenian numeros.

**Un perfil de latencia tiene que acotarse a la version desplegada.** Si mezcla versiones,
describe lo que el sistema era, no lo que es.

## Lo que se refuto al medir el sistema actual

**"Las preguntas multi-parte se serializan, hay que paralelizarlas."** Falso. Una pregunta de
seis partes hace **7 llamadas en 2 rondas**, tres veces seguidas. El modelo ya las agrupa solo:
OpenAI trae las llamadas en paralelo activadas por defecto y el nodo de n8n no expone opcion
para apagarlas. Nunca hubo nada que instruir.

**"La cola de 188 s son preguntas complejas."** Falso. Las tres ejecuciones mas lentas eran las
de **inyeccion**: BANO buscaba en el corpus hasta 23 veces, en 18 o 19 rondas, para terminar
diciendo una frase de negativa que no requiere ninguna busqueda. Y ya estaba arreglado antes de
abrir el ticket: la misma pregunta que costaba 188 s hoy se resuelve en **1 ronda, 0 llamadas,
5.1 s**.

**"Compactar el prompt bajara la latencia."** Falso. El prompt (14 344 caracteres, ~4 100
tokens) es identico en todas las mediciones, y el costo por ronda varia seis veces segun la
pregunta: 3.2 s en una negativa, ~18 s en una enumeracion. Si el prompt fuera el driver, ese
numero seria constante. Compactar prefill contra un cuello que esta en la generacion habria sido
trabajo perdido, y con riesgo: cada regla del prompt entro despues de un fallo medido.

**"Comprimir lo que devuelve la herramienta ayudara."** Falso en la practica: el nodo de la
herramienta cuesta 1.2 s de 25.8 s. El techo de la mejora es 4.6 % incluso eliminandola del todo,
a cambio de arriesgar la cobertura, que es un invariante.

## El hallazgo real

El costo por ronda lo manda el **largo de la respuesta generada**. Misma pregunta, mismas dos
rondas, mismas dos llamadas, mismo prompt; lo unico distinto es cuanto texto se pide:

| | total | s/ronda |
|---|---|---|
| respuesta normal | 25.8 s | 12.3 |
| "solo los nombres, sin describir ninguno" | 14.2 s | 6.2 |

45 % menos latencia por generar menos texto. Es el unico lever con efecto grande, y no es
tecnico: es de producto.

## La decision

Acortar las respuestas choca de frente con lo que el ADR-0019 establecio: anclar cada logro a un
proyecto nombrado con su resultado medido, en vez de hablar en abstracto. Eso se pidio
explicitamente porque un evaluador real recibio respuestas vacias de contenido.

Se presentaron tres opciones y **se eligio conservar el detalle**: respuestas ricas, con ~26 s en
las preguntas de enumeracion. La espera se acepta a sabiendas, a cambio de que la respuesta
tenga evidencia concreta.

Si algun dia la prioridad se invierte, el camino esta medido: acortar **solo** las enumeraciones
a un renglon por elemento, sin tocar el resto, vale cerca del 45 % en esas preguntas.

## Lo que queda en pie del plan

De los cuatro tickets, solo el primero produjo codigo: el flujo de test aparte y los cinco
invariantes en un comando, que es la infraestructura con la que se refuto todo lo demas. Los
instrumentos se conservan: `perfil-latencia.mjs`, `perfil-nodos.mjs` y `medir-rondas.mjs`, que
miden sin mandar peticiones nuevas leyendo lo que n8n ya guardo.

`maxIterations` se deja en 25. Bajarlo no acelera nada —el bucle que lo justificaba ya no
ocurre— y aprieta contra el caso legitimo mas pesado (8 llamadas en 3 rondas), con riesgo de
reintroducir los HTTP 503 que son el invariante numero uno.

## La leccion

Tres de las cuatro hipotesis de optimizacion eran falsas, y todas sonaban razonables. La que
resulto cierta no era tecnica sino de producto. Antes de optimizar: acotar la medida a la version
viva, y comprobar cada hipotesis contra el sistema actual aunque parezca obvia. El instrumento
mas util de todo este trabajo no fue un fix: fue poder medir rondas y costo por ronda por
separado.
