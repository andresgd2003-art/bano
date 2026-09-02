# BANO

Agente conversacional en n8n con endpoint compatible con Open Responses (POST /v1/responses).

## Estado

Fase 1 en curso. El endpoint responde con un objeto `response` conforme al spec.

    curl -X POST "$BANO_BASE_URL/responses" \
      -H "Content-Type: application/json" \
      -d '{"model":"bano","input":"hola"}'

## Cómo correr el gate de conformidad

    cp .env.example .env    # y rellena BANO_BASE_URL
    node tests/conformidad.mjs

Sale con código distinto de cero si algún criterio del spec deja de cumplirse.

## Estructura

    PLAN.md              las 7 fases y su criterio de "hecho"
    CONTEXT.md           glosario del dominio
    docs/adr/            decisiones de arquitectura
    workflows/bano.json  el flujo de n8n, exportado
    tests/               el gate de conformidad
