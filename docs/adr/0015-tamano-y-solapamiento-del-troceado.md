# Troceado a 1000 caracteres sin solapamiento

Los valores 1000/150 venían heredados de otro proyecto, sin haberse medido aquí. Se probaron
uno a la vez contra la batería de 16 casos, reindexando el corpus completo en cada
configuración.

## Tamaño: se queda en 1000

| tamaño | fragmentos | margen medio | peor | negativos |
|---|---|---|---|---|
| 600 | 47 | 0.0499 | −0.0861 | 3 |
| **1000** | 34 | **0.0585** | −0.1096 | **2** |
| 1400 | 33 | 0.0613 | −0.1092 | 3 |
| 1800 | 31 | 0.0632 | −0.1092 | 3 |

La referencia pública sitúa el óptimo en 400-512 tokens, y 1000 caracteres rondan 250-300: por
esa cita, 1400 o 1800 deberían ganar. No ganan, y el detalle explica por qué.

**1400 no supera el ruido**: la diferencia con 1000 es 0.0028, dentro de la banda de ~0.003
observada entre corridas. Empate, y en un empate no se cambia lo que está en producción.

**1800 sube la media pero degrada un caso concreto**: *"¿cómo evalúa la precisión en SATS?"*
cae del puesto 1 al 2, de +0.0066 a −0.0477. Fragmentos más grandes juntan subsecciones y
diluyen el tema. Es el mismo caso que el ADR-0014 acababa de rescatar.

**600 es peor en todo**: trocear más fino rompe las unidades semánticas que el documento ya
tiene por sus encabezados.

La cita no estaba equivocada: se midió sobre 50 artículos académicos, documentos largos y
densos. Este corpus son dos documentos cortos y muy estructurados, donde cada subsección ya es
una unidad semántica. Una referencia se aplica al corpus que midió.

## Solapamiento: pasa de 150 a 0

| solapamiento | margen medio | peor |
|---|---|---|
| **0** | **0.0680** | **−0.1030** |
| 150 | 0.0584 | −0.1092 |
| 300 | 0.0638 | −0.1095 |

Quitarlo sube la media 0.0096 —tres veces la banda de ruido— y además mejora el peor caso, con
el mismo número de fragmentos. *"¿Cómo evalúa la precisión en SATS?"* pasa de +0.0066 a +0.0511.

Coincide con lo medido públicamente: el solapamiento no aporta beneficio. Aquí además resta,
probablemente porque repetir el final del fragmento anterior mete texto de otro tema y ensucia
el vector.

## Sobre el método

El criterio de promoción se fijó **antes** de ver los números: cero fallos siempre; gana quien
suba la media y no empeore el peor caso; y en empate dentro del ruido, gana producción.

Ese pre-registro tenía un hueco: **no incluía el número de márgenes negativos**. Aplicado a la
letra habría promovido 1800, que degrada un caso. Se deja escrito en vez de reescribir la regla
después para que diera el resultado preferido, que es justo la trampa que un criterio previo
existe para evitar.
