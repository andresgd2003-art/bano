# BANO

Agente conversacional en n8n con endpoint compatible con [Open Responses](https://www.openresponses.org)
(`POST /v1/responses`). Responde sobre el perfil profesional, experiencia, habilidades y proyectos
de Andrés. Se despliega en un VPS personal.

## Agent skills

### Issue tracker

Los issues viven como GitHub Issues en `andresgd2003-art/bano`, vía el CLI `gh`.
Ver `docs/agents/issue-tracker.md`.

### Triage labels

Las cinco etiquetas canónicas sin cambios: `needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`. Ver `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` y `docs/adr/` en la raíz. Ver `docs/agents/domain.md`.
