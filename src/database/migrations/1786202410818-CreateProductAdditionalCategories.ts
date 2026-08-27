import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateProductAdditionalCategories1786202410818 implements MigrationInterface {
    name = 'CreateProductAdditionalCategories1786202410818'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "product_additional_categories" (
                "product_id" uuid NOT NULL,
                "category_id" uuid NOT NULL,
                CONSTRAINT "PK_product_additional_categories" PRIMARY KEY ("product_id", "category_id"),
                CONSTRAINT "FK_pac_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
                CONSTRAINT "FK_pac_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION
            )
        `);
        await queryRunner.query(`CREATE INDEX "IDX_pac_product_id" ON "product_additional_categories" ("product_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_pac_category_id" ON "product_additional_categories" ("category_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_pac_category_id"`);
        await queryRunner.query(`DROP INDEX "IDX_pac_product_id"`);
        await queryRunner.query(`DROP TABLE "product_additional_categories"`);
    }
}
