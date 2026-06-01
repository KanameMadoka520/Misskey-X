/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export class ChannelPostingPermission1780301242667 {
	name = 'ChannelPostingPermission1780301242667';

	async up(queryRunner) {
		await queryRunner.query(`ALTER TABLE "channel" ADD "postingPermission" character varying(32) NOT NULL DEFAULT 'everyone'`);
		await queryRunner.query(`CREATE TABLE "channel_collaborator" ("id" character varying(32) NOT NULL, "channelId" character varying(32) NOT NULL, "userId" character varying(32) NOT NULL, CONSTRAINT "PK_4f6529fb52492e2c65fa9ad9b13" PRIMARY KEY ("id"))`);
		await queryRunner.query(`CREATE INDEX "IDX_4b24a52f753c2d7d6cfe251472" ON "channel_collaborator" ("channelId")`);
		await queryRunner.query(`CREATE INDEX "IDX_de7a0ef33be59166f93297bd26" ON "channel_collaborator" ("userId")`);
		await queryRunner.query(`CREATE UNIQUE INDEX "IDX_8a6f8ea96615e2c7087ef8125f" ON "channel_collaborator" ("channelId", "userId")`);
		await queryRunner.query(`ALTER TABLE "channel_collaborator" ADD CONSTRAINT "FK_4b24a52f753c2d7d6cfe251472c" FOREIGN KEY ("channelId") REFERENCES "channel"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
		await queryRunner.query(`ALTER TABLE "channel_collaborator" ADD CONSTRAINT "FK_de7a0ef33be59166f93297bd26c" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
		await queryRunner.query(`UPDATE "channel" SET "postingPermission" = 'ownerOnly' WHERE "id" IN ('amyeg3148nr4001l', 'amyb341g89zv001a')`);
	}

	async down(queryRunner) {
		await queryRunner.query(`ALTER TABLE "channel_collaborator" DROP CONSTRAINT "FK_de7a0ef33be59166f93297bd26c"`);
		await queryRunner.query(`ALTER TABLE "channel_collaborator" DROP CONSTRAINT "FK_4b24a52f753c2d7d6cfe251472c"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_8a6f8ea96615e2c7087ef8125f"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_de7a0ef33be59166f93297bd26"`);
		await queryRunner.query(`DROP INDEX "public"."IDX_4b24a52f753c2d7d6cfe251472"`);
		await queryRunner.query(`DROP TABLE "channel_collaborator"`);
		await queryRunner.query(`ALTER TABLE "channel" DROP COLUMN "postingPermission"`);
	}
}

