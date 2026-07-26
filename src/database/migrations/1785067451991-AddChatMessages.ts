import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChatMessages1785067451991 implements MigrationInterface {
    name = 'AddChatMessages1785067451991'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "chat_messages" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "roomId" uuid NOT NULL, "senderId" uuid NOT NULL, "content" text NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_40c55ee0e571e268b0d3cd37d10" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_a0122a0d9262c789662d6b02ce" ON "chat_messages" ("roomId", "createdAt" DESC) `);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_9fa0373c1451ad384fc6a74aa8c" FOREIGN KEY ("roomId") REFERENCES "friend_chat_rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_messages" ADD CONSTRAINT "FK_fc6b58e41e9a871dacbe9077def" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_fc6b58e41e9a871dacbe9077def"`);
        await queryRunner.query(`ALTER TABLE "chat_messages" DROP CONSTRAINT "FK_9fa0373c1451ad384fc6a74aa8c"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a0122a0d9262c789662d6b02ce"`);
        await queryRunner.query(`DROP TABLE "chat_messages"`);
    }

}
