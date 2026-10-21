import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTenantTemplate1700000000001 implements MigrationInterface {
  name = 'CreateTenantTemplate1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "pacientes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "documento" character varying(20) NOT NULL,
        "nombre" character varying(100) NOT NULL,
        "apellidos" character varying(100) NOT NULL,
        "fecha_nacimiento" TIMESTAMP WITH TIME ZONE NOT NULL,
        "sexo" character varying(20) NOT NULL CHECK ("sexo" IN ('MASCULINO', 'FEMENINO', 'OTRO')),
        "telefono" character varying(20),
        "email" character varying(100),
        "direccion" character varying(200),
        "antecedentes" text,
        "alergias" text,
        "observaciones" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pacientes" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pacientes_apellidos_nombre" ON "pacientes" ("apellidos", "nombre")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_pacientes_documento" ON "pacientes" ("documento")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_pacientes_email" ON "pacientes" ("email")
    `);

    await queryRunner.query(`
      CREATE TABLE "medicos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "dni" character varying(20) NOT NULL,
        "nombre" character varying(100) NOT NULL,
        "apellidos" character varying(100) NOT NULL,
        "especialidad" character varying(80) NOT NULL,
        "colegiado" character varying(50) NOT NULL,
        "telefono" character varying(20),
        "email" character varying(100),
        "horario" jsonb NOT NULL DEFAULT '{}',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_medicos" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_medicos_apellidos_nombre" ON "medicos" ("apellidos", "nombre")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_medicos_especialidad" ON "medicos" ("especialidad")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_medicos_colegiado" ON "medicos" ("colegiado")
    `);

    await queryRunner.query(`
      CREATE TABLE "citas_medicas" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "paciente_id" uuid NOT NULL,
        "medico_id" uuid NOT NULL,
        "fecha_hora" TIMESTAMP WITH TIME ZONE NOT NULL,
        "duracion" integer NOT NULL DEFAULT 30,
        "estado" character varying(20) NOT NULL DEFAULT 'PENDIENTE' CHECK ("estado" IN ('PENDIENTE', 'ATENDIDO', 'CANCELADO')),
        "sintomas_paciente" text NOT NULL,
        "observaciones" text,
        "idempotency_key" character varying(255),
        "informe_ia" jsonb,
        "diagnostico_doctor" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_citas_medicas" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_citas_medicas_fecha_hora" ON "citas_medicas" ("fecha_hora")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_citas_medicas_paciente_id" ON "citas_medicas" ("paciente_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_citas_medicas_medico_id" ON "citas_medicas" ("medico_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_citas_medicas_estado" ON "citas_medicas" ("estado")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_citas_medicas_idempotency_key" ON "citas_medicas" ("idempotency_key")
      WHERE "idempotency_key" IS NOT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "citas_medicas"
      ADD CONSTRAINT "FK_citas_medicas_paciente_id" FOREIGN KEY ("paciente_id")
      REFERENCES "pacientes" ("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      ALTER TABLE "citas_medicas"
      ADD CONSTRAINT "FK_citas_medicas_medico_id" FOREIGN KEY ("medico_id")
      REFERENCES "medicos" ("id") ON DELETE RESTRICT
    `);

    await queryRunner.query(`
      CREATE TABLE "idempotency_keys" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "key" character varying(255) NOT NULL,
        "tenant_id" character varying(60) NOT NULL,
        "endpoint" character varying(200) NOT NULL,
        "method" character varying(10) NOT NULL,
        "response_body" jsonb,
        "status_code" integer,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        CONSTRAINT "PK_idempotency_keys" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_idempotency_keys_key" ON "idempotency_keys" ("key")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_idempotency_keys_tenant_id" ON "idempotency_keys" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_idempotency_keys_expires_at" ON "idempotency_keys" ("expires_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_idempotency_keys_expires_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_idempotency_keys_tenant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_idempotency_keys_key"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "idempotency_keys"`);

    await queryRunner.query(`ALTER TABLE "citas_medicas" DROP CONSTRAINT IF EXISTS "FK_citas_medicas_medico_id"`);
    await queryRunner.query(`ALTER TABLE "citas_medicas" DROP CONSTRAINT IF EXISTS "FK_citas_medicas_paciente_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_citas_medicas_idempotency_key"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_citas_medicas_estado"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_citas_medicas_medico_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_citas_medicas_paciente_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_citas_medicas_fecha_hora"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "citas_medicas"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medicos_colegiado"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medicos_especialidad"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_medicos_apellidos_nombre"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "medicos"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pacientes_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pacientes_documento"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pacientes_apellidos_nombre"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pacientes"`);
  }
}