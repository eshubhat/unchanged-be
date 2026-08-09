import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReturnRequestedStatus1786202410817 implements MigrationInterface {
    name = 'AddReturnRequestedStatus1786202410817'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Postgres does not allow ALTER TYPE ... ADD VALUE inside a transaction block in older versions.
        // It is safer to temporarily commit the transaction, alter the type, and start a new transaction.
        await queryRunner.commitTransaction();
        try {
            await queryRunner.query(`ALTER TYPE "orders_status_enum" ADD VALUE IF NOT EXISTS 'return_requested'`);
            await queryRunner.query(`ALTER TYPE "order_status_history_from_status_enum" ADD VALUE IF NOT EXISTS 'return_requested'`);
            await queryRunner.query(`ALTER TYPE "order_status_history_to_status_enum" ADD VALUE IF NOT EXISTS 'return_requested'`);
        } finally {
            await queryRunner.startTransaction();
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Enums cannot be easily removed in postgres, no-op for down migration
    }
}
