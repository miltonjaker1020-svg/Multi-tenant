# MediTenant AI - Documentación del Proyecto

## Resumen Ejecutivo

Este documento describe la implementación de la **capa de datos e infraestructura** para MediTenant AI, un SaaS multi-tenant para gestión clínica. Se implementó siguiendo la **Guía de Requerimientos Técnicos - Día 1** con arquitectura PostgreSQL multi-tenant (schema por tenant) usando TypeORM.

---

## Stack Tecnológico

| Categoría | Tecnología | Versión |
|-----------|------------|---------|
| **ORM** | TypeORM | 0.3.20 |
| **Base de Datos** | PostgreSQL | 16 (Supabase) |
| **Runtime** | Node.js | >=20 |
| **Lenguaje** | TypeScript | 5.3 |
| **Autenticación** | jose (JWT) + bcryptjs | 5.2.2 / 2.4.3 |
| **Validación** | Zod | 3.22.4 |
| **Logging** | Pino | 8.19.0 |
| **IA** | Google Generative AI | 0.21.0 |
| **Testing** | Vitest | 1.3.0 |

---

## Estructura Final del Proyecto

```
medi-tenant-app/
├── .github/workflows/ci.yml          # Pipeline CI/CD
├── lib/                              # Capa de datos y lógica de negocio
│   ├── config/
│   │   └── data-source.ts            # Configuración TypeORM (DataSource public + tenant)
│   ├── entities/
│   │   ├── public/
│   │   │   ├── Tenant.ts             # Entidad public.tenants
│   │   │   └── User.ts               # Entidad public.users
│   │   └── tenant/
│   │       ├── Paciente.ts           # Entidad pacientes (schema dinámico)
│   │       ├── Medico.ts             # Entidad medicos (schema dinámico)
│   │       ├── CitaMedica.ts         # Entidad citas_medicas (schema dinámico)
│   │       └── IdempotencyKey.ts     # Entidad idempotency_keys (schema dinámico)
│   ├── migrations/
│   │   ├── 1700000000000-CreatePublicSchema.ts
│   │   └── 1700000000001-CreateTenantTemplate.ts
│   ├── repositories/
│   │   ├── PublicTenantRepository.ts
│   │   ├── PublicUserRepository.ts
│   │   └── TenantRepositoryFactory.ts
│   ├── services/
│   │   ├── TenantManager.ts          # CREATE SCHEMA + runMigrations dinámico
│   │   └── TypeOrmTenantClient.ts    # QueryRunner + SET search_path
│   ├── types/
│   │   └── index.ts                  # InformeIA, Padecimiento, CitaEstado, etc.
│   ├── env.ts                        # Validación Zod de variables de entorno
│   ├── logger.ts                     # Pino logger configurado
│   ├── errors.ts                     # Clases de error personalizadas
│   ├── jwt.ts                        # JWT (jose) + bcryptjs password hashing
│   ├── rate-limit.ts                 # Rate limiting en memoria (sliding window)
│   ├── idempotency.ts                # Idempotency keys en tenant schema
│   ├── gemini.ts                     # Cliente Gemini AI + prompts
│   ├── validators.ts                 # Esquemas Zod para todas las entidades
│   ├── utils.ts                      # Utilidades varias
│   └── tenant-manager.ts             # Alias a TenantManager
├── scripts/
│   ├── init-public.sql               # DDL esquema public (tenants, users)
│   ├── init-tenant-template.sql      # DDL template tenant (pacientes, medicos, citas_medicas, idempotency_keys)
│   └── seed-dev.ts                   # Seed desarrollo (tenant demo + datos)
├── .env.local                        # Variables entorno (Supabase, JWT, Gemini)
├── .env.example                      # Template variables entorno
├── .gitignore                        # Exclusiones git
├── .dockerignore                     # Exclusiones Docker
├── docker-compose.yml                # Vacío (pendiente implementación usuario)
├── package.json                      # Dependencias solo backend
├── tsconfig.json                     # Config TypeScript (decoradores experimentales)
├── README.md                         # Documentación básica
└── PROJECT_DOCUMENTATION.md          # Este archivo
```

---

## Archivos Creados/Modificados

### 1. Configuración Base

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `package.json` | **REESCRITO** | Eliminadas todas las dependencias frontend (Next.js, React, Radix UI, TanStack, etc.). Mantenidas solo dependencias backend: `typeorm`, `pg`, `reflect-metadata`, `bcryptjs`, `jose`, `@google/generative-ai`, `zod`, `pino`, `pino-pretty`. Scripts actualizados para TypeORM CLI. |
| `tsconfig.json` | **MODIFICADO** | Habilitados `experimentalDecorators`, `emitDecoratorMetadata`, `strictPropertyInitialization: false` para TypeORM. |
| `.env.local` | **MANTENIDO** | Variables: `DATABASE_URL` (pooler Supabase), `DATABASE_URL_UNPOOLED` (directo), `JWT_SECRET`, `GEMINI_API_KEY`, `NODE_ENV=development`. |
| `.env.example` | **MANTENIDO** | Template de variables de entorno. |
| `.gitignore` | **REESCRITO** | Excluye `node_modules/`, `.env*`, `.next/`, `dist/`, `coverage/`, `.vercel/`, `*.tsbuildinfo`. |
| `.dockerignore` | **MANTENIDO** | Excluye node_modules, build outputs, git, env files. |

### 2. Entidades TypeORM (`lib/entities/`)

#### Entidades Públicas (`lib/entities/public/`)

| Archivo | Campos Principales | Índices/Constraints |
|---------|-------------------|---------------------|
| `Tenant.ts` | `id(uuid)`, `nombre`, `slug(unique)`, `schemaName(unique)`, `createdAt` | PK: id, Unique: slug, schemaName |
| `User.ts` | `id(uuid)`, `email(unique)`, `passwordHash`, `tenantId(NOT NULL)`, `rol(default:DOCTOR)`, `createdAt` | PK: id, Unique: email, FK: tenant_id → tenants(id) CASCADE |

#### Entidades Tenant (`lib/entities/tenant/`) - Sin schema fijo

| Archivo | Campos Principales | Índices/Constraints |
|---------|-------------------|---------------------|
| `Paciente.ts` | `id(uuid)`, `nombre`, `documento(unique)`, `telefono`, `email`, `createdAt` | PK: id, Unique: documento, Index: email |
| `Medico.ts` | `id(uuid)`, `nombre`, `especialidad(VARCHAR(80))`, `createdAt` | PK: id, Index: especialidad |
| `CitaMedica.ts` | `id(uuid)`, `pacienteId`, `medicoId`, `fechaHora(timestamptz)`, `estado(PENDIENTE/ATENDIDO/CANCELADO)`, `sintomasPaciente(text NOT NULL)`, `informeIa(jsonb)`, `diagnosticoDoctor`, `createdAt` | PK: id, Index: fechaHora, pacienteId, medicoId, estado, FKs: paciente_id→pacientes, medico_id→medicos RESTRICT |
| `IdempotencyKey.ts` | `key(VARCHAR(255) PK)`, `responseBody(jsonb NOT NULL)`, `statusCode(INT NOT NULL)`, `createdAt` | **PK = key (no UUID)**, sin expiresAt |

**Regla de Oro Aplicada**: No hay relaciones `@ManyToOne`/`@OneToMany` entre entidades de esquemas distintos. Las FKs son columnas UUID simples.

### 3. Migraciones TypeORM (`lib/migrations/`)

| Archivo | Descripción |
|---------|-------------|
| `1700000000000-CreatePublicSchema.ts` | Crea extensiones `uuid-ossp`, `pgcrypto`. Tablas `public.tenants`, `public.users`, `public.audit_logs`. Índices únicos en `slug`, `schemaName`, `email`. FK `users.tenant_id → tenants.id CASCADE`. Funciones `log_audit_action()` y `create_tenant_schema()`. |
| `1700000000001-CreateTenantTemplate.ts` | Template para schemas dinámicos. Tablas: `pacientes`, `medicos`, `citas_medicas`, `idempotency_keys`. FKs entre tablas tenant. **PK de idempotency_keys = key (VARCHAR)**. CHECK constraint en `estado` (PENDIENTE/ATENDIDO/CANCELADO). |

### 4. Scripts SQL (`scripts/`)

| Archivo | Contenido | Uso |
|---------|-----------|-----|
| `init-public.sql` | DDL puro: `uuid-ossp`, `public.tenants`, `public.users` con FK CASCADE. | Ejecutar una vez en BD nueva. |
| `init-tenant-template.sql` | DDL sin schema fijo: `pacientes`, `medicos`, `citas_medicas`, `idempotency_keys` (PK=key). Se ejecuta tras `SET search_path TO "tenant_schema"`. | Ejecutar por cada nuevo tenant. |
| `seed-dev.ts` | Script TypeScript: crea tenant demo, usuario admin, médicos, pacientes, citas de prueba. Usa `bcryptjs` para passwords. | `npm run db:seed` |

### 5. Capa de Datos Core (`lib/`)

| Archivo | Responsabilidad |
|---------|-----------------|
| `config/data-source.ts` | Dos DataSources: `AppDataSource` (entidades public) y `TenantDataSource` (entidades tenant). Pool size 10, SSL en producción. |
| `repositories/PublicTenantRepository.ts` | CRUD tenants: `findBySlug`, `findBySchemaName`, `findById`, `create`, `findAllActive`. |
| `repositories/PublicUserRepository.ts` | CRUD users: `findByEmail`, `findById`, `findByTenantId`, `create`, `updateLastLogin`, `findSuperAdmins`. |
| `repositories/TenantRepositoryFactory.ts` | Factory que crea `QueryRunner` con `SET search_path TO "schema", public` y expone repositorios tipados por schema. |
| `services/TenantManager.ts` | `createTenantSchema()`, `runTenantMigrations()` (DataSource dinámico), `seedTenantData()`, `setupNewTenant()`, `dropTenantSchema()`. |
| `services/TypeOrmTenantClient.ts` | Wrapper alto nivel: `getRepositories()`, `transaction()`, `query()`, gestión de QueryRunners con cache. |
| `types/index.ts` | Interfaces: `InformeIA`, `Padecimiento`, `CitaEstado` (enum), `Sexo` (enum), `UserRole` (enum), `TokenPayload`, `TenantSettings`, `MedicoHorario`. |
| `env.ts` | Validación Zod de todas las variables de entorno al startup. |
| `logger.ts` | Pino con pretty print en desarrollo, JSON en producción. Child loggers con requestId/tenantId. |
| `errors.ts` | Jerarquía de errores: `AppError`, `ValidationError`, `AuthenticationError`, `AuthorizationError`, `NotFoundError`, `ConflictError`, `RateLimitError`, `IdempotencyError`, `TenantError`, `ExternalServiceError`. |
| `jwt.ts` | `signToken()`, `verifyToken()` (jose HS256), `hashPassword()`/`verifyPassword()` (bcryptjs 12 rounds), `createAuthCookie()` (httpOnly, Secure, SameSite=Lax), `extractTokenFromCookie()`. |
| `rate-limit.ts` | In-memory sliding window (Map + cleanup interval). `checkRateLimit()`, `enforceRateLimit()`, headers `X-RateLimit-*`, `Retry-After`. |
| `idempotency.ts` | `checkIdempotencyKey()` (crea registro en tenant schema), `saveIdempotencyResponse()`, `cleanupExpiredIdempotencyKeys()`. TTL 24h configurable. |
| `gemini.ts` | Cliente `@google/generative-ai` (gemini-1.5-flash). `generateIaReport()` retorna `InformeIA` tipado. Prompt estructurado JSON. Streaming opcional. Validación de respuesta. |
| `validators.ts` | Esquemas Zod: `loginSchema`, `registerSchema`, `pacienteSchema`, `medicoSchema`, `citaSchema` (sintomasPaciente required), `citaUpdateSchema`, `citaFiltersSchema`, `iaReportRequestSchema`. Tipos exportados. |
| `utils.ts` | Helpers: `cn()`, `formatDate/Time/DateTime()`, `generateId()`, `generateIdempotencyKey()`, `slugify()`, `getInitials()`, `calculateAge()`, `isToday()`, `isPast()`, `addMinutes()`, `differenceInMinutes()`, `sleep()`, `retry()`, `parseJsonSafe()`, `omit()`, `pick()`. |

### 6. Configuración TypeORM CLI

```json
// package.json scripts
"typeorm": "typeorm-ts-node-commonjs",
"migration:generate": "npm run typeorm migration:generate -- -d lib/config/data-source.ts",
"migration:run": "npm run typeorm migration:run -- -d lib/config/data-source.ts",
"migration:run:tenant": "npm run typeorm migration:run -- -d lib/config/tenant-data-source.ts",
"db:migrate:prod": "DATABASE_URL=$DATABASE_URL_UNPOOLED npm run migration:run",
"db:migrate:tenant": "DATABASE_URL=$DATABASE_URL_UNPOOLED npm run migration:run:tenant",
"db:seed": "tsx scripts/seed-dev.ts"
```

### 7. CI/CD Pipeline (`.github/workflows/ci.yml`)

| Job | Descripción |
|-----|-------------|
| `lint` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `test` | Vitest + PostgreSQL 16 (GitHub Actions service) |
| `build` | `next build` (requiere lint/typecheck/test pass) |
| `docker` | Docker build (solo main branch) |
| `deploy-preview` | Vercel preview deploy (PRs) |

---

## Flujo Multi-Tenant en Runtime

```
1. Request entra → Middleware Next.js
2. Extrae JWT de cookie httpOnly → verifyToken()
3. Payload contiene: tenantId, tenantSlug, tenantSchema
4. Middleware inyecta headers: x-tenant-schema, x-tenant-id, x-user-*
5. API Route recibe request
6. TypeOrmTenantClient.getRepository(schemaName, Entity)
   → Crea QueryRunner → SET search_path TO "tenant_schema", public
   → Retorna Repository tipado
7. Operaciones CRUD ejecutadas en schema correcto
8. Transacciones atómicas (cita + idempotency_key en misma transacción)
```

---

## Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Generar migración nueva
npm run migration:generate

# Ejecutar migraciones esquema public (producción)
npm run db:migrate:prod

# Ejecutar migraciones template tenant
npm run db:migrate:tenant

# Seed datos desarrollo
npm run db:seed

# Type checking
npm run typecheck

# Tests
npm run test
npm run test:watch
npm run test:ui

# Docker (usuario implementa docker-compose.yml)
npm run docker:up
npm run docker:down
npm run docker:logs
```

---

## Variables de Entorno Requeridas

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | Conexión pooler Supabase (runtime) | `postgresql://user:pass@pooler.supabase.com:5432/db?schema=public` |
| `DATABASE_URL_UNPOOLED` | Conexión directa (migraciones) | `postgresql://user:pass@db.supabase.co:5432/db?schema=public` |
| `JWT_SECRET` | Secreto firma JWT (32+ chars) | `***REDACTED***` |
| `JWT_EXPIRES_IN` | Expiración access token | `7d` |
| `GEMINI_API_KEY` | API Key Google AI Studio | `***REDACTED***` |
| `GEMINI_MODEL` | Modelo Gemini | `gemini-1.5-flash` |
| `NODE_ENV` | Entorno | `development` |
| `RATE_LIMIT_MAX_REQUESTS` | Requests por ventana | `100` |
| `RATE_LIMIT_WINDOW_MS` | Ventana rate limit (ms) | `60000` |
| `IDEMPOTENCY_TTL_HOURS` | TTL claves idempotencia | `24` |

---

## Arquitectura de Base de Datos

### Esquema Público (`public`)

```
public.tenants
├── id (uuid, PK)
├── nombre (varchar 100)
├── slug (varchar 50, UNIQUE)
├── schema_name (varchar 60, UNIQUE)
└── created_at (timestamptz)

public.users
├── id (uuid, PK)
├── email (varchar 150, UNIQUE)
├── password_hash (varchar 255)
├── tenant_id (uuid, FK → tenants.id CASCADE)
├── rol (varchar 20, DEFAULT 'DOCTOR')
└── created_at (timestamptz)
```

### Esquema Tenant (dinámico, ej: `tenant_abc123`)

```
tenant_schema.pacientes
├── id (uuid, PK)
├── nombre (varchar 100)
├── documento (varchar 20, UNIQUE)
├── telefono (varchar 20)
├── email (varchar 100)
└── created_at (timestamptz)

tenant_schema.medicos
├── id (uuid, PK)
├── nombre (varchar 100)
├── especialidad (varchar 80)
└── created_at (timestamptz)

tenant_schema.citas_medicas
├── id (uuid, PK)
├── paciente_id (uuid, FK → pacientes.id RESTRICT)
├── medico_id (uuid, FK → medicos.id RESTRICT)
├── fecha_hora (timestamptz, NOT NULL)
├── estado (varchar 20, CHECK: PENDIENTE/ATENDIDO/CANCELADO)
├── sintomas_paciente (text, NOT NULL)
├── informe_ia (jsonb, nullable)
├── diagnostico_doctor (text, nullable)
└── created_at (timestamptz)

tenant_schema.idempotency_keys
├── key (varchar 255, PK)  -- No UUID
├── response_body (jsonb, NOT NULL)
├── status_code (int, NOT NULL)
└── created_at (timestamptz)
```

---

## Índices de Rendimiento

| Tabla | Índices |
|-------|---------|
| `public.tenants` | `UNIQUE(slug)`, `UNIQUE(schema_name)` |
| `public.users` | `UNIQUE(email)`, `INDEX(tenant_id)` |
| `pacientes` | `UNIQUE(documento)`, `INDEX(email)` |
| `medicos` | `INDEX(especialidad)` |
| `citas_medicas` | `INDEX(fecha_hora)`, `INDEX(paciente_id)`, `INDEX(medico_id)`, `INDEX(estado)` |
| `idempotency_keys` | `PK(key)` |

---

## Próximos Pasos (Fase 2 - API Layer)

1. **Auth API**: `/api/auth/login`, `/register`, `/logout`, `/me`
2. **Tenants API**: `/api/tenants` (POST - onboarding dinámico)
3. **Pacientes API**: `/api/pacientes` (CRUD + filtros)
4. **Médicos API**: `/api/medicos` (CRUD + filtros)
5. **Citas API**: `/api/citas` (CRUD + Idempotency-Key header)
6. **IA Report API**: `/api/citas/[id]/ia-report` (Gemini + guarda JSONB)
7. **Middleware**: Rate limiting, JWT validation, tenant resolution

---

## Notas de Implementación

### Decisiones Técnicas Clave

1. **TypeORM sobre Prisma**: Flexibilidad para `SET search_path` dinámico y schemas multi-tenant.
2. **PK = key en idempotency_keys**: Evita UUID extra, búsqueda directa O(1).
3. **FKs como UUID simples**: Sin relaciones TypeORM cruzadas entre schemas.
4. **In-memory rate limit**: Para desarrollo; producción requiere Redis (Upstash).
5. **bcryptjs (no bcrypt)**: Pure JS, sin dependencias nativas, compatible Vercel/Docker.
6. **jose para JWT**: Web Crypto API, edge-compatible, sin dependencias Node.
6. **Gemini 1.5-flash**: Modelo rápido y económico, output JSON estructurado.

### Seguridad

- Cookies `httpOnly`, `Secure`, `SameSite=Lax`, `Max-Age=7d`
- Passwords hasheados con bcrypt (12 rounds)
- Rate limiting por IP + endpoint
- Idempotency keys por tenant + endpoint + method
- Validación Zod en todas las entradas
- Headers de seguridad en `next.config.mjs`

---

## Estado del Repositorio

- **Repo**: https://github.com/miltonjaker1020-svg/Multi-tenant.git
- **Branch**: `main`
- **Último commit**: `81f59c7` - "chore: clean package.json + add SQL init scripts for multi-tenant schema"
- **Archivos**: 92 archivos, ~15,000 líneas de código
- **Historial limpio**: Sin `node_modules` en git history

---

*Documentación generada automáticamente - MediTenant AI - Capa de Datos & Infraestructura - Día 1*