import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductFeatures1786201410816 implements MigrationInterface {
    name = 'AddProductFeatures1786201410816'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" ADD "features" character varying array NOT NULL DEFAULT '{}'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "products" DROP COLUMN "features"`);
    }

}
