# Si el orden importa, hay que escribirlo: la búsqueda vectorial no lo conserva

Al ampliar el corpus, BANO dejó de poder responder *"¿y antes de eso?"* después de decir dónde
trabaja. Contestaba que **no figura ningún empleo anterior a USAIGE**, teniendo a Joyson y a
Western Union en el mismo documento, dos párrafos más abajo.

## Qué pasaba

El troceado por subsecciones dejó cada empleo en su propio fragmento, titulado por el puesto:
*"Practicante de Gestión de Programas — Joyson Safety Systems"*. Una pregunta por el **empleo
anterior** no se parece a eso ni léxica ni semánticamente.

Medido con la consulta explícita *"empleo anterior a USAIGE"*: el fragmento de Joyson **no
aparecía ni en el top-5**.

La cronología estaba implícita en el orden de los párrafos, y la búsqueda vectorial no conserva
el orden del documento: cada fragmento se juzga por su parecido con la pregunta, aislado de sus
vecinos.

## La corrección

Un párrafo al inicio de la sección que enumera los empleos en orden y lo dice con las palabras
que alguien usaría al preguntar: *"antes de USAIGE estuvo en Joyson; antes de Joyson, en
Western Union"*.

Ese fragmento pasó a salir **primero, a 0.4178** de distancia.

## La regla

Toda relación que el lector deduciría de la posición —orden cronológico, jerarquía, "esto viene
después de aquello", "este es el más reciente"— **desaparece al trocear**. Si importa, hay que
escribirla dentro del texto, no confiarla al orden de los párrafos.

Vale también para el documento de arquitectura: las capas de error se describen enumeradas
("primero el modelo de respaldo, si fallan los dos...") justamente por esto.
