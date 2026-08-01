import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialCatalogs1720000000000 implements MigrationInterface {
  name = 'InitialCatalogs1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(`
      CREATE TABLE "catalogs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "slug" character varying NOT NULL,
        "document" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_catalogs_slug" UNIQUE ("slug"),
        CONSTRAINT "PK_catalogs_id" PRIMARY KEY ("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE "catalogs"');
  }
}
