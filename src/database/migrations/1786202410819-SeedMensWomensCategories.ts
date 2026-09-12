import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Ensures that the two core gender categories — Men's and Women's — always exist.
 * Uses INSERT ... ON CONFLICT DO NOTHING so re-running the migration is safe.
 * The UUIDs are deterministic so the down() migration can remove them cleanly.
 */
export class SeedMensWomensCategories1786202410819 implements MigrationInterface {
  name = 'SeedMensWomensCategories1786202410819';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Deterministic UUIDs — safe to hard-code because we control the seeding.
    await queryRunner.query(`
      INSERT INTO "categories"
        ("id", "name", "slug", "description", "is_active", "display_order", "created_at", "updated_at")
      VALUES
        (
          'a1b2c3d4-0000-4000-a000-000000000001',
          'Men''s',
          'mens',
          'All products for men — tees, hoodies, and more.',
          true,
          1,
          NOW(),
          NOW()
        ),
        (
          'a1b2c3d4-0000-4000-a000-000000000002',
          'Women''s',
          'womens',
          'All products for women — tees, hoodies, and more.',
          true,
          2,
          NOW(),
          NOW()
        )
      ON CONFLICT ("slug") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only remove if no products reference these categories
    await queryRunner.query(`
      DELETE FROM "categories"
      WHERE "slug" IN ('mens', 'womens')
        AND NOT EXISTS (
          SELECT 1 FROM "products" WHERE "category_id" = "categories"."id"
        );
    `);
  }
}
