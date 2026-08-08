import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCatalogSlug1720000000001 implements MigrationInterface {
  name = 'RemoveCatalogSlug1720000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "catalogs" DROP CONSTRAINT "UQ_catalogs_slug"',
    );
    await queryRunner.query('ALTER TABLE "catalogs" DROP COLUMN "slug"');
    await queryRunner.query(
      'ALTER TABLE "catalogs" ALTER COLUMN "document" DROP DEFAULT',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "catalogs" ALTER COLUMN "document" SET DEFAULT \'{}\'::jsonb',
    );
    await queryRunner.query(
      'ALTER TABLE "catalogs" ADD COLUMN "slug" character varying',
    );
    await queryRunner.query(
      'UPDATE "catalogs" SET "slug" = "id"::text WHERE "slug" IS NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "catalogs" ALTER COLUMN "slug" SET NOT NULL',
    );
    await queryRunner.query(
      'ALTER TABLE "catalogs" ADD CONSTRAINT "UQ_catalogs_slug" UNIQUE ("slug")',
    );
  }
}
