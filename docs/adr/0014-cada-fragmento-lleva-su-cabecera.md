# Cada fragmento lleva su cabecera: el troceado se hace en el flujo, no en el nodo de n8n

El troceador de n8n no permite post-procesar cada trozo. Como el título de sección se anteponía
al texto **antes** de trocear, sólo el primer trozo lo conservaba y los demás salían huérfanos.

Medido en el corpus: **5 fragmentos huérfanos** de 25. Uno empezaba con *"Fue su primer
proyecto de IA y el más ambicioso…"* sin decir cuál — el antecedente, Sting AI, estaba en otro
fragmento. La búsqueda vectorial juzga cada fragmento aislado, así que ese texto no era
recuperable por ninguna pregunta sobre Sting AI.

Ahora el troceado ocurre en el nodo `Trocear con contexto`, que devuelve un item por fragmento
con `documento — sección — subsección` antepuesto a **todos**. El troceador de n8n sigue
conectado porque el cargador lo exige, con un tamaño grande para no volver a partir lo ya
partido.

El corte respeta límites naturales: primero por párrafo, luego por frase, y sólo como último
recurso a lo bruto. Partir a mitad de frase produce justo lo que este cambio viene a evitar.

## La medición

A/B sobre la misma batería, revirtiendo el troceado y volviendo a medir:

| | anterior | con cabecera |
|---|---|---|
| fragmentos huérfanos | 5 | **0** |
| casos que pasan | 15/16 | **16/16** |
| margen medio | 0.0432 | **0.0584** |
| peor caso | −0.1613 | **−0.1094** |
| márgenes negativos | 4 | **2** |
| fuera de la ventana | 2 | **1** |

*"¿Qué tecnologías integró en Sting AI?"* pasa del puesto 2 con margen −0.0659 al puesto 1 con
+0.1979. *"¿Cómo evalúa la precisión en SATS?"* pasa de fallar a acertar.

Una regresión aceptada: *"¿usa integración continua?"* baja de +0.1549 a +0.0379. Sigue en
primer puesto. Una entre dieciséis, contra un fallo eliminado y todos los agregados mejorando.

## Sobre cómo se midió

La primera lectura fue engañosa y conviene dejarla escrita. Con la batería original, el margen
medio parecía **bajar** de 0.0564 a 0.0530. No era una degradación: una pregunta dejó de tener
margen calculable porque **todos** sus resultados pasaron a ser relevantes, y salió del
promedio. Sobre el conjunto comparable el resultado era 0.05293 contra 0.05298: empate.

La batería tampoco premiaba el arreglo, porque ninguna de sus 13 preguntas apuntaba a los
fragmentos huérfanos. Hubo que **añadir casos que probaran lo que se estaba arreglando** antes
de que la medición significara algo.

Las dos lecciones: un promedio cuyo denominador cambia no se compara, y una batería sólo mide
lo que pregunta.
