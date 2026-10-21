-- ============================================
-- INIT TENANT TEMPLATE SCHEMA
-- Plantilla DDL para schemas dinámicos por tenant
-- NO incluye nombre de esquema fijo: se ejecuta tras
--   SET search_path TO "tenant_schema_name";
-- ============================================

-- ============================================
-- TABLA: pacientes
-- ============================================
CREATE TABLE pacientes (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    nombre character varying(100) NOT NULL,
    documento character varying(20) NOT NULL,
    telefono character varying(20),
    email character varying(100),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT pk_pacientes PRIMARY KEY (id)
);

CREATE UNIQUE INDEX idx_pacientes_documento ON pacientes (documento);
CREATE INDEX idx_pacientes_email ON pacientes (email);

-- ============================================
-- TABLA: medicos
-- ============================================
CREATE TABLE medicos (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    nombre character varying(100) NOT NULL,
    especialidad character varying(80) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT pk_medicos PRIMARY KEY (id)
);

CREATE INDEX idx_medicos_especialidad ON medicos (especialidad);

-- ============================================
-- TABLA: citas_medicas
-- ============================================
CREATE TABLE citas_medicas (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    paciente_id uuid NOT NULL,
    medico_id uuid NOT NULL,
    fecha_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    estado character varying(20) NOT NULL DEFAULT 'PENDIENTE'
        CHECK (estado IN ('PENDIENTE', 'ATENDIDO', 'CANCELADO')),
    sintomas_paciente text NOT NULL,
    informe_ia jsonb,
    diagnostico_doctor text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT pk_citas_medicas PRIMARY KEY (id)
);

CREATE INDEX idx_citas_medicas_fecha_hora ON citas_medicas (fecha_hora);
CREATE INDEX idx_citas_medicas_paciente_id ON citas_medicas (paciente_id);
CREATE INDEX idx_citas_medicas_medico_id ON citas_medicas (medico_id);
CREATE INDEX idx_citas_medicas_estado ON citas_medicas (estado);

-- Foreign Keys (FKs como UUID simples, sin relaciones TypeORM cruzadas)
ALTER TABLE citas_medicas
ADD CONSTRAINT fk_citas_medicas_paciente_id FOREIGN KEY (paciente_id)
REFERENCES pacientes (id) ON DELETE RESTRICT;

ALTER TABLE citas_medicas
ADD CONSTRAINT fk_citas_medicas_medico_id FOREIGN KEY (medico_id)
REFERENCES medicos (id) ON DELETE RESTRICT;

-- ============================================
-- TABLA: idempotency_keys
-- PK = key (VARCHAR), no UUID id
-- ============================================
CREATE TABLE idempotency_keys (
    key character varying(255) NOT NULL,
    response_body jsonb NOT NULL,
    status_code integer NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT pk_idempotency_keys PRIMARY KEY (key)
);