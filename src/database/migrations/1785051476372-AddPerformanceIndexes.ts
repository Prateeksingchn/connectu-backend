import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPerformanceIndexes1785051476372 implements MigrationInterface {
  name = 'AddPerformanceIndexes1785051476372';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_2322dead09ed7e80fa319b3417" ON "chat_rooms" ("user1Id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_e6680ec6f61be06769227e9c99" ON "chat_rooms" ("user2Id") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_d081a2b50858f0018963cfa7dd" ON "chat_rooms" ("isActive", "expiresAt") `,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_c3c70e060bc6c2512169e1ceb1" ON "friendships" ("addresseeId", "status") `,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_c3c70e060bc6c2512169e1ceb1"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_d081a2b50858f0018963cfa7dd"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_e6680ec6f61be06769227e9c99"`,
    );
    await queryRunner.query(
      `DROP INDEX "public"."IDX_2322dead09ed7e80fa319b3417"`,
    );
  }
}
