import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePublicSchema1700000000000 implements MigrationInterface {
  name = 'CreatePublicSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

    await queryRunner.query(`
      CREATE TABLE "public"."tenants" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "nombre" character varying(100) NOT NULL,
        "slug" character varying(50) NOT NULL,
        "schema_name" character varying(60) NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "settings" jsonb NOT NULL DEFAULT '{}',
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tenants" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tenants_slug" ON "public"."tenants" ("slug")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_tenants_schema_name" ON "public"."tenants" ("schema_name")
    `);

    await queryRunner.query(`
      CREATE TABLE "public"."users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(150) NOT NULL,
        "password_hash" character varying(255) NOT NULL,
        "name" character varying(100) NOT NULL,
        "role" character varying(20) NOT NULL DEFAULT 'DOCTOR',
        "is_active" boolean NOT NULL DEFAULT true,
        "tenant_id" uuid,
        "last_login_at" TIMESTAMP WITH TIME ZONE,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_users_email" ON "public"."users" ("email")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_users_tenant_id" ON "public"."users" ("tenant_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "public"."users"
      ADD CONSTRAINT "FK_users_tenant_id" FOREIGN KEY ("tenant_id")
      REFERENCES "public"."tenants" ("id") ON DELETE SET NULL
    `);

    await queryRunner.query(`
      CREATE TABLE "public"."audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "action" character varying(100) NOT NULL,
        "entity" character varying(100) NOT NULL,
        "entity_id" uuid,
        "user_id" uuid,
        "tenant_id" uuid,
        "metadata" jsonb NOT NULL DEFAULT '{}',
        "ip_address" character varying(45),
        "user_agent" text,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_tenant_id" ON "public"."audit_logs" ("tenant_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_user_id" ON "public"."audit_logs" ("user_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_entity" ON "public"."audit_logs" ("entity", "entity_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_created_at" ON "public"."audit_logs" ("created_at")
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.log_audit_action(
        p_action TEXT,
        p_entity TEXT,
        p_entity_id UUID DEFAULT NULL,
        p_user_id UUID DEFAULT NULL,
        p_tenant_id UUID DEFAULT NULL,
        p_metadata JSONB DEFAULT '{}',
        p_ip_address TEXT DEFAULT NULL,
        p_user_agent TEXT DEFAULT NULL
      ) RETURNS VOID AS $$
      BEGIN
        INSERT INTO public.audit_logs (
          action, entity, entity_id, user_id, tenant_id, metadata, ip_address, user_agent
        ) VALUES (
          p_action, p_entity, p_entity_id, p_user_id, p_tenant_id, p_metadata, p_ip_address, p_user_agent
        );
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);

    await queryRunner.query(`
      CREATE OR REPLACE FUNCTION public.create_tenant_schema(p_schema_name TEXT)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema_name);
        EXECUTE format('GRANT USAGE ON SCHEMA %I TO postgres', p_schema_name);
        EXECUTE format('GRANT CREATE ON SCHEMA %I TO postgres', p_schema_name);
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.create_tenant_schema(TEXT)`);
    await queryRunner.query(`DROP FUNCTION IF EXISTS public.log_audit_action(...)`);

    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_audit_logs_entity"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_audit_logs_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_audit_logs_tenant_id"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "public"."audit_logs"`);

    await queryRunner.query(`ALTER TABLE "public"."users" DROP CONSTRAINT IF EXISTS "FK_users_tenant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_users_tenant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_users_email"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "public"."users"`);

    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_tenants_schema_name"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_tenants_slug"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "public"."tenants"`);
  }
}