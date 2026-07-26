import { MigrationInterface, QueryRunner } from "typeorm";

export class Baseline1785048736290 implements MigrationInterface {
    name = 'Baseline1785048736290'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "genders" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_4ff9b0934ba18fa74dd740b9adb" UNIQUE ("name"), CONSTRAINT "PK_529fb131dd4164c94529f53e19d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "interest" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_2182a5960e5a00b0a3920b46f48" UNIQUE ("name"), CONSTRAINT "PK_6619d627e204e0596968653011f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "hobby" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_3ec51a58ecde5e69732ed079ede" UNIQUE ("name"), CONSTRAINT "PK_9cf21d5206ec584a4cc14a8703e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "tech_stack" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, CONSTRAINT "UQ_d3e6e2fa41c3cc6ddfeeda331ff" UNIQUE ("name"), CONSTRAINT "PK_28ce6942fffe078dd648ae71d4a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('ADMIN', 'USER')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password" character varying NOT NULL, "name" character varying NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'USER', "genderId" integer, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."roles_name_enum" AS ENUM('ADMIN', 'USER')`);
        await queryRunner.query(`CREATE TABLE "roles" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" "public"."roles_name_enum" NOT NULL, CONSTRAINT "UQ_648e3f5447f725579d7d4ffdfb7" UNIQUE ("name"), CONSTRAINT "PK_c1433d71a4838793a49dcad46ab" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "chat_rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user1Id" uuid NOT NULL, "user2Id" uuid NOT NULL, "matchScore" double precision, "isActive" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "expiresAt" TIMESTAMP, CONSTRAINT "PK_c69082bd83bffeb71b0f455bd59" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."friendships_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "friendships" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requesterId" uuid NOT NULL, "addresseeId" uuid NOT NULL, "status" "public"."friendships_status_enum" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_08af97d0be72942681757f07bc8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ae267b922c295ac548dd498e54" ON "friendships" ("requesterId", "addresseeId") `);
        await queryRunner.query(`CREATE TYPE "public"."chat_room_requests_status_enum" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED')`);
        await queryRunner.query(`CREATE TABLE "chat_room_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "requesterId" uuid NOT NULL, "addresseeId" uuid NOT NULL, "status" "public"."chat_room_requests_status_enum" NOT NULL DEFAULT 'PENDING', "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_7d2ef77f0d8e86a22abeff2cc60" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8cb1132bff7564b983a5ea701b" ON "chat_room_requests" ("requesterId", "addresseeId") `);
        await queryRunner.query(`CREATE TABLE "friend_chat_rooms" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "friendshipId" uuid NOT NULL, "user1Id" uuid NOT NULL, "user2Id" uuid NOT NULL, "isActive" boolean NOT NULL DEFAULT true, "lastMessageAt" TIMESTAMP, "lastMessageText" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_89fe5977a47f15e5a29088bac12" UNIQUE ("friendshipId"), CONSTRAINT "PK_08debd15fde24b76ac8f0e2018e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_89fe5977a47f15e5a29088bac1" ON "friend_chat_rooms" ("friendshipId") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_a43705bfdb62e1be15e44a5fdc" ON "friend_chat_rooms" ("user1Id", "user2Id") `);
        await queryRunner.query(`CREATE TABLE "users_interests_interest" ("usersId" uuid NOT NULL, "interestId" integer NOT NULL, CONSTRAINT "PK_56a5577951d1dd781fa818eabee" PRIMARY KEY ("usersId", "interestId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e0d38659e5f0b5761e350a249a" ON "users_interests_interest" ("usersId") `);
        await queryRunner.query(`CREATE INDEX "IDX_44302fdd29596733c4d3102a6f" ON "users_interests_interest" ("interestId") `);
        await queryRunner.query(`CREATE TABLE "users_hobbies_hobby" ("usersId" uuid NOT NULL, "hobbyId" integer NOT NULL, CONSTRAINT "PK_50452b106e3f9bd9774e1e88658" PRIMARY KEY ("usersId", "hobbyId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_43fb352b7b04abd4afde47e7d7" ON "users_hobbies_hobby" ("usersId") `);
        await queryRunner.query(`CREATE INDEX "IDX_52d5ec313a022fa4dfe800b2d6" ON "users_hobbies_hobby" ("hobbyId") `);
        await queryRunner.query(`CREATE TABLE "users_tech_stack_tech_stack" ("usersId" uuid NOT NULL, "techStackId" integer NOT NULL, CONSTRAINT "PK_5dad405d53d458d533a3600af7e" PRIMARY KEY ("usersId", "techStackId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_61d10aa1490d8f059f03941b38" ON "users_tech_stack_tech_stack" ("usersId") `);
        await queryRunner.query(`CREATE INDEX "IDX_94d52c280b3cf51245cfd49ad4" ON "users_tech_stack_tech_stack" ("techStackId") `);
        await queryRunner.query(`ALTER TABLE "users" ADD CONSTRAINT "FK_cf6706b7fc5f8847430a1c468d3" FOREIGN KEY ("genderId") REFERENCES "genders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_2322dead09ed7e80fa319b34173" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_rooms" ADD CONSTRAINT "FK_e6680ec6f61be06769227e9c995" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_4f47ed519abe1ced044af260420" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friendships" ADD CONSTRAINT "FK_c6ee540bba37d2b09b12dddd282" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_room_requests" ADD CONSTRAINT "FK_e4b96d89f291662f60942543168" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "chat_room_requests" ADD CONSTRAINT "FK_23186090c64914f6a5bedb72f58" FOREIGN KEY ("addresseeId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_chat_rooms" ADD CONSTRAINT "FK_89fe5977a47f15e5a29088bac12" FOREIGN KEY ("friendshipId") REFERENCES "friendships"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_chat_rooms" ADD CONSTRAINT "FK_7e1faab4af31460bd5e8146fd06" FOREIGN KEY ("user1Id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "friend_chat_rooms" ADD CONSTRAINT "FK_00c617baa4bee54a391dd3113ee" FOREIGN KEY ("user2Id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "users_interests_interest" ADD CONSTRAINT "FK_e0d38659e5f0b5761e350a249a4" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_interests_interest" ADD CONSTRAINT "FK_44302fdd29596733c4d3102a6f0" FOREIGN KEY ("interestId") REFERENCES "interest"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_hobbies_hobby" ADD CONSTRAINT "FK_43fb352b7b04abd4afde47e7d7d" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_hobbies_hobby" ADD CONSTRAINT "FK_52d5ec313a022fa4dfe800b2d60" FOREIGN KEY ("hobbyId") REFERENCES "hobby"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_tech_stack_tech_stack" ADD CONSTRAINT "FK_61d10aa1490d8f059f03941b384" FOREIGN KEY ("usersId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "users_tech_stack_tech_stack" ADD CONSTRAINT "FK_94d52c280b3cf51245cfd49ad47" FOREIGN KEY ("techStackId") REFERENCES "tech_stack"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users_tech_stack_tech_stack" DROP CONSTRAINT "FK_94d52c280b3cf51245cfd49ad47"`);
        await queryRunner.query(`ALTER TABLE "users_tech_stack_tech_stack" DROP CONSTRAINT "FK_61d10aa1490d8f059f03941b384"`);
        await queryRunner.query(`ALTER TABLE "users_hobbies_hobby" DROP CONSTRAINT "FK_52d5ec313a022fa4dfe800b2d60"`);
        await queryRunner.query(`ALTER TABLE "users_hobbies_hobby" DROP CONSTRAINT "FK_43fb352b7b04abd4afde47e7d7d"`);
        await queryRunner.query(`ALTER TABLE "users_interests_interest" DROP CONSTRAINT "FK_44302fdd29596733c4d3102a6f0"`);
        await queryRunner.query(`ALTER TABLE "users_interests_interest" DROP CONSTRAINT "FK_e0d38659e5f0b5761e350a249a4"`);
        await queryRunner.query(`ALTER TABLE "friend_chat_rooms" DROP CONSTRAINT "FK_00c617baa4bee54a391dd3113ee"`);
        await queryRunner.query(`ALTER TABLE "friend_chat_rooms" DROP CONSTRAINT "FK_7e1faab4af31460bd5e8146fd06"`);
        await queryRunner.query(`ALTER TABLE "friend_chat_rooms" DROP CONSTRAINT "FK_89fe5977a47f15e5a29088bac12"`);
        await queryRunner.query(`ALTER TABLE "chat_room_requests" DROP CONSTRAINT "FK_23186090c64914f6a5bedb72f58"`);
        await queryRunner.query(`ALTER TABLE "chat_room_requests" DROP CONSTRAINT "FK_e4b96d89f291662f60942543168"`);
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_c6ee540bba37d2b09b12dddd282"`);
        await queryRunner.query(`ALTER TABLE "friendships" DROP CONSTRAINT "FK_4f47ed519abe1ced044af260420"`);
        await queryRunner.query(`ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_e6680ec6f61be06769227e9c995"`);
        await queryRunner.query(`ALTER TABLE "chat_rooms" DROP CONSTRAINT "FK_2322dead09ed7e80fa319b34173"`);
        await queryRunner.query(`ALTER TABLE "users" DROP CONSTRAINT "FK_cf6706b7fc5f8847430a1c468d3"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_94d52c280b3cf51245cfd49ad4"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_61d10aa1490d8f059f03941b38"`);
        await queryRunner.query(`DROP TABLE "users_tech_stack_tech_stack"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_52d5ec313a022fa4dfe800b2d6"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_43fb352b7b04abd4afde47e7d7"`);
        await queryRunner.query(`DROP TABLE "users_hobbies_hobby"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_44302fdd29596733c4d3102a6f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e0d38659e5f0b5761e350a249a"`);
        await queryRunner.query(`DROP TABLE "users_interests_interest"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a43705bfdb62e1be15e44a5fdc"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_89fe5977a47f15e5a29088bac1"`);
        await queryRunner.query(`DROP TABLE "friend_chat_rooms"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_8cb1132bff7564b983a5ea701b"`);
        await queryRunner.query(`DROP TABLE "chat_room_requests"`);
        await queryRunner.query(`DROP TYPE "public"."chat_room_requests_status_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ae267b922c295ac548dd498e54"`);
        await queryRunner.query(`DROP TABLE "friendships"`);
        await queryRunner.query(`DROP TYPE "public"."friendships_status_enum"`);
        await queryRunner.query(`DROP TABLE "chat_rooms"`);
        await queryRunner.query(`DROP TABLE "roles"`);
        await queryRunner.query(`DROP TYPE "public"."roles_name_enum"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP TABLE "tech_stack"`);
        await queryRunner.query(`DROP TABLE "hobby"`);
        await queryRunner.query(`DROP TABLE "interest"`);
        await queryRunner.query(`DROP TABLE "genders"`);
    }

}
