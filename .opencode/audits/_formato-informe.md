# Formato común de informe (lo usan los 4 agentes)

## Reglas
- **Solo lectura.** No edites `src/`, `api/`, `supabase/`, `scripts/` ni `tests/`. Devolvé el informe como respuesta; el gestor lo guarda.
- Quedate dentro de tu rol. Si ves algo de otro dominio, anotalo en "Derivaciones" con una línea y **no lo investigues**.
- Cada hallazgo lleva evidencia `ruta/archivo.ext:línea` que viste en esta corrida.
- Antes de afirmar que algo **no existe**, buscalo con al menos dos nombres distintos o con una búsqueda por texto.
- Lo que no puedas comprobar va como `NO VERIFICADO` + motivo.

## Escala de prioridad
| Sev | Significa | Ejemplo |
|---|---|---|
| **P0** | Pierde plata, regala producto, expone datos o rompe una compra. Bloquea salir. | Un pago que no acredita; una tabla sin RLS. |
| **P1** | Falla visible para usuarios o riesgo real pero acotado. | Una pantalla que llama a una ruta inexistente. |
| **P2** | Inconsistencia, deuda técnica o mejora con impacto medio. | Código duplicado en 3 archivos. |
| **P3** | Pulido, limpieza, nombres, documentación. | Archivo suelto en la raíz. |

## Esfuerzo
`S` = menos de 1 hora · `M` = medio día · `L` = más de un día.

## Plantilla del informe

```
# Informe @<agente> — <fecha> — commit <hash>

## Resumen (máx. 5 líneas)
<qué revisaste y la conclusión general>

## Hallazgos
### <PREFIJO>-001 · <título corto>
- Sev: P0 | Esfuerzo: M
- Evidencia: <archivo:línea> (y qué se ve ahí)
- Problema: <qué está mal, en una o dos frases>
- Impacto: <qué le pasa al usuario o al negocio>
- Propuesta: <qué cambiar, sin escribir el código completo>
- Dueño de la implementación: @<agente>
- Revisor (si aplica): @<agente>
- Se verifica con: <test, script o prueba manual concreta>

## Derivaciones (otros dominios)
- <una línea por cosa, con archivo:línea>

## No verificado
- <qué y por qué>

## Lo que está bien (máx. 5 puntos)
- <para no volver a revisarlo>
```

Prefijos: `ARQ`, `DEV`, `UI`, `QA`.
