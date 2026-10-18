import { MigrationInterface, QueryRunner } from 'typeorm';

export class CascadeUserDeletes1785050810344 implements MigrationInterface {
  name = 'CascadeUserDeletes1785050810344';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_e6680ec6f61be06769227e9c995"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_2322dead09ed7e80fa319b34173"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" DROP CONSTRAINT "FK_c6ee540bba37d2b09b12dddd282"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" DROP CONSTRAINT "FK_4f47ed519abe1ced044af260420"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_room_requests" DROP CONSTRAINT "FK_23186090c64914f6a5bedb72f58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_room_requests" DROP CONSTRAINT "FK_e4b96d89f291662f60942543168"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" DROP CONSTRAINT "FK_00c617baa4bee54a391dd3113ee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" DROP CONSTRAINT "FK_7e1faab4af31460bd5e8146fd06"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" DROP CONSTRAINT "FK_89fe5977a47f15e5a29088bac12"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_2322dead09ed7e80fa319b34173" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_e6680ec6f61be06769227e9c995" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" ADD CONSTRAINT "FK_4f47ed519abe1ced044af260420" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" ADD CONSTRAINT "FK_c6ee540bba37d2b09b12dddd282" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_room_requests" ADD CONSTRAINT "FK_e4b96d89f291662f60942543168" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_room_requests" ADD CONSTRAINT "FK_23186090c64914f6a5bedb72f58" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" ADD CONSTRAINT "FK_89fe5977a47f15e5a29088bac12" FOREIGN KEY ("friendshipId") REFERENCES "friendships"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" ADD CONSTRAINT "FK_7e1faab4af31460bd5e8146fd06" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" ADD CONSTRAINT "FK_00c617baa4bee54a391dd3113ee" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" DROP CONSTRAINT "FK_00c617baa4bee54a391dd3113ee"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" DROP CONSTRAINT "FK_7e1faab4af31460bd5e8146fd06"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" DROP CONSTRAINT "FK_89fe5977a47f15e5a29088bac12"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_room_requests" DROP CONSTRAINT "FK_23186090c64914f6a5bedb72f58"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_room_requests" DROP CONSTRAINT "FK_e4b96d89f291662f60942543168"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" DROP CONSTRAINT "FK_c6ee540bba37d2b09b12dddd282"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" DROP CONSTRAINT "FK_4f47ed519abe1ced044af260420"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_e6680ec6f61be06769227e9c995"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_2322dead09ed7e80fa319b34173"`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" ADD CONSTRAINT "FK_89fe5977a47f15e5a29088bac12" FOREIGN KEY ("friendshipId") REFERENCES "friendships"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" ADD CONSTRAINT "FK_7e1faab4af31460bd5e8146fd06" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friend_chat_rooms" ADD CONSTRAINT "FK_00c617baa4bee54a391dd3113ee" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_room_requests" ADD CONSTRAINT "FK_e4b96d89f291662f60942543168" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_room_requests" ADD CONSTRAINT "FK_23186090c64914f6a5bedb72f58" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" ADD CONSTRAINT "FK_4f47ed519abe1ced044af260420" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "friendships" ADD CONSTRAINT "FK_c6ee540bba37d2b09b12dddd282" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_2322dead09ed7e80fa319b34173" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_e6680ec6f61be06769227e9c995" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
