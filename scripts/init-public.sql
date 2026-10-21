-- ============================================
-- INIT PUBLIC SCHEMA
-- Esquema compartido global (public)
-- Ejecutar una sola vez en la base de datos
-- ============================================

-- Habilitar extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: public.tenants
-- Registro de clínicas/tenants del SaaS
-- ============================================
CREATE TABLE public.tenants (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    nombre character varying(100) NOT NULL,
    slug character varying(50) NOT NULL,
    schema_name character varying(60) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT pk_tenants PRIMARY KEY (id)
);

-- Índices únicos
CREATE UNIQUE INDEX idx_tenants_slug ON public.tenants (slug);
CREATE UNIQUE INDEX idx_tenants_schema_name ON public.tenants (schema_name);

-- ============================================
-- TABLA: public.users
-- Cuentas de acceso globales (superadmin + usuarios por tenant)
-- ============================================
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT uuid_generate_v4(),
    email character varying(150) NOT NULL,
    password_hash character varying(255) NOT NULL,
    tenant_id uuid NOT NULL,
    rol character varying(20) NOT NULL DEFAULT 'DOCTOR',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT pk_users PRIMARY KEY (id)
);

-- Índices
CREATE UNIQUE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_tenant_id ON public.users (tenant_id);

-- Foreign Key: users.tenant_id -> tenants.id (ON DELETE CASCADE)
ALTER TABLE public.users
ADD CONSTRAINT fk_users_tenant_id FOREIGN KEY (tenant_id)
REFERENCES public.tenants (id) ON DELETE CASCADE;