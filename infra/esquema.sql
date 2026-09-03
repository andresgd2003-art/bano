-- Tabla de turnos de BANO. Dos funciones a la vez:
--   1. Traduce `previous_response_id` a `conversation_id`: es el MECANISMO DE MEMORIA,
--      porque la plataforma no reenvia el historial (ADR-0006).
--   2. Es el log de observabilidad: latencia, modelo y version del prompt por turno.
--
-- La ventana de 10 interacciones del agente NO vive aqui: limita lo que el agente
-- recuerda, no lo que la cadena identifica. Verificado con 12 turnos encadenados.

CREATE TABLE IF NOT EXISTS turnos (
  response_id           text PRIMARY KEY,
  conversation_id       text NOT NULL,
  previous_response_id  text,
  creado_en             timestamptz NOT NULL DEFAULT now(),
  entrada               text,
  salida                text,
  modelo                text,
  prompt_version        text,
  latencia_ms           integer,
  input_tokens          integer DEFAULT 0,   -- el nodo AI Agent de n8n no los expone
  output_tokens         integer DEFAULT 0,
  alerta_inyeccion      boolean DEFAULT false  -- filtro determinista en "Validar entrada" (#25);
                                                -- registrada, no bloquea: el prompt es quien resiste
);

CREATE INDEX IF NOT EXISTS turnos_conversacion ON turnos (conversation_id, creado_en);
CREATE INDEX IF NOT EXISTS turnos_creado       ON turnos (creado_en);

-- Comprobacion de integridad: ninguna fila debe apuntar a un turno inexistente.
--   SELECT count(*) FROM turnos t
--   WHERE t.previous_response_id IS NOT NULL
--     AND NOT EXISTS (SELECT 1 FROM turnos p WHERE p.response_id = t.previous_response_id);
