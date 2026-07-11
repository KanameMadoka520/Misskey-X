/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

process.env.NODE_ENV = 'test';

import * as assert from 'node:assert';
import { afterAll, beforeAll, describe, test } from 'vitest';
import type { DataSource, Repository } from 'typeorm';
import type * as misskey from 'misskey-js';
import { MiDriveFile } from '@/models/DriveFile.js';
import { MiModerationLog } from '@/models/ModerationLog.js';
import { api, castAsError, initTestDb, post, role, uploadFile } from '../utils.js';

async function signupOrThrow(username: string): Promise<misskey.entities.SignupResponse> {
	const response = await api('signup', { username, password: 'test' });
	assert.strictEqual(response.status, 200);
	assert.ok(response.body);
	return response.body;
}

describe('Delegated posting and note waterfall', () => {
	let db: DataSource;
	let driveFilesRepository: Repository<MiDriveFile>;
	let moderationLogsRepository: Repository<MiModerationLog>;
	let root: misskey.entities.SignupResponse;
	let operator: misskey.entities.SignupResponse;
	let target: misskey.entities.SignupResponse;
	let outsider: misskey.entities.SignupResponse;

	beforeAll(async () => {
		db = await initTestDb(true);
		driveFilesRepository = db.getRepository(MiDriveFile);
		moderationLogsRepository = db.getRepository(MiModerationLog);

		root = await signupOrThrow('delegated_root');
		operator = await signupOrThrow('delegated_operator');
		target = await signupOrThrow('delegated_target');
		outsider = await signupOrThrow('delegated_outsider');

		const delegatedRole = await role(root, {
			name: 'Delegated posting test role',
		}, {
			canPostAsOtherUser: {
				priority: 100,
				useDefault: false,
				value: true,
			},
		});
		const assign = await api('admin/roles/assign', {
			userId: operator.id,
			roleId: delegatedRole.id,
		}, root);
		assert.strictEqual(assign.status, 204);
	}, 1000 * 60 * 2);

	afterAll(async () => {
		await db.destroy();
	});

	test('note waterfall requires authentication and respects visibility', async () => {
		const unauthorized = await api('notes/waterfall', {});
		assert.strictEqual(unauthorized.status, 401);

		const publicNote = await post(target, { text: 'waterfall-public' });
		const privateNote = await post(target, {
			text: 'waterfall-private',
			visibility: 'specified',
			visibleUserIds: [target.id],
		});

		const visible = await api('notes/waterfall', {
			order: 'recent',
			userId: target.id,
			limit: 30,
		}, operator);
		assert.strictEqual(visible.status, 200);
		assert.ok(visible.body.some(note => note.id === publicNote.id));
		assert.ok(!visible.body.some(note => note.id === privateNote.id));
	});

	test('note waterfall supports following, unfollowed, image, and stable random filters', async () => {
		await api('following/create', { userId: target.id }, operator);
		const targetTextNote = await post(target, { text: 'target-text-note' });
		const outsiderNote = await post(outsider, { text: 'outsider-text-note' });
		const targetImage = await uploadFile(target);
		assert.strictEqual(targetImage.status, 200);
		const targetImageNote = await post(target, { fileIds: [targetImage.body!.id] });

		const following = await api('notes/waterfall', {
			order: 'recent',
			relation: 'following',
			limit: 30,
		}, operator);
		assert.strictEqual(following.status, 200);
		assert.ok(following.body.some(note => note.id === targetTextNote.id));
		assert.ok(!following.body.some(note => note.id === outsiderNote.id));

		const unfollowed = await api('notes/waterfall', {
			order: 'recent',
			relation: 'unfollowed',
			limit: 30,
		}, operator);
		assert.strictEqual(unfollowed.status, 200);
		assert.ok(unfollowed.body.some(note => note.id === outsiderNote.id));
		assert.ok(!unfollowed.body.some(note => note.id === targetTextNote.id));

		const withImage = await api('notes/waterfall', {
			order: 'recent',
			image: 'with',
			userId: target.id,
			limit: 30,
		}, operator);
		assert.strictEqual(withImage.status, 200);
		assert.ok(withImage.body.some(note => note.id === targetImageNote.id));
		assert.ok(!withImage.body.some(note => note.id === targetTextNote.id));

		const randomParams = {
			order: 'random' as const,
			seed: 'delegated-waterfall-test',
			limit: 30,
		};
		const firstRandom = await api('notes/waterfall', randomParams, operator);
		const secondRandom = await api('notes/waterfall', randomParams, operator);
		assert.strictEqual(firstRandom.status, 200);
		assert.strictEqual(secondRandom.status, 200);
		assert.deepStrictEqual(firstRandom.body.map(note => note.id), secondRandom.body.map(note => note.id));
	});

	test('note waterfall supports followed, all, excluded-followed, and no-channel modes', async () => {
		const followedChannelResponse = await api('channels/create', { name: 'waterfall-followed-channel' }, target);
		const otherChannelResponse = await api('channels/create', { name: 'waterfall-other-channel' }, outsider);
		assert.strictEqual(followedChannelResponse.status, 200);
		assert.strictEqual(otherChannelResponse.status, 200);
		const followedChannel = followedChannelResponse.body;
		const otherChannel = otherChannelResponse.body;

		const followResponse = await api('channels/follow', { channelId: followedChannel.id }, operator);
		assert.strictEqual(followResponse.status, 204);

		const plainNote = await post(target, { text: 'waterfall-plain-note' });
		const followedChannelNote = await post(target, {
			text: 'waterfall-followed-channel-note',
			channelId: followedChannel.id,
		});
		const otherChannelNote = await post(outsider, {
			text: 'waterfall-other-channel-note',
			channelId: otherChannel.id,
		});

		const followedOnly = await api('notes/waterfall', {
			order: 'recent',
			channel: 'followed',
			limit: 30,
		}, operator);
		assert.strictEqual(followedOnly.status, 200);
		assert.ok(followedOnly.body.some(note => note.id === followedChannelNote.id));
		assert.ok(!followedOnly.body.some(note => note.id === plainNote.id));
		assert.ok(!followedOnly.body.some(note => note.id === otherChannelNote.id));

		const allChannels = await api('notes/waterfall', {
			order: 'recent',
			channel: 'all',
			limit: 30,
		}, operator);
		assert.strictEqual(allChannels.status, 200);
		assert.ok(allChannels.body.some(note => note.id === plainNote.id));
		assert.ok(allChannels.body.some(note => note.id === followedChannelNote.id));
		assert.ok(allChannels.body.some(note => note.id === otherChannelNote.id));

		const withoutFollowedChannels = await api('notes/waterfall', {
			order: 'recent',
			channel: 'excludeFollowed',
			limit: 30,
		}, operator);
		assert.strictEqual(withoutFollowedChannels.status, 200);
		assert.ok(withoutFollowedChannels.body.some(note => note.id === plainNote.id));
		assert.ok(!withoutFollowedChannels.body.some(note => note.id === followedChannelNote.id));
		assert.ok(withoutFollowedChannels.body.some(note => note.id === otherChannelNote.id));

		const withoutChannels = await api('notes/waterfall', {
			order: 'recent',
			channel: 'none',
			limit: 30,
		}, operator);
		assert.strictEqual(withoutChannels.status, 200);
		assert.ok(withoutChannels.body.some(note => note.id === plainNote.id));
		assert.ok(!withoutChannels.body.some(note => note.id === followedChannelNote.id));
		assert.ok(!withoutChannels.body.some(note => note.id === otherChannelNote.id));
	});

	test('role updates persist the delegated posting policy', async () => {
		const editableRole = await role(root, {
			name: 'Delegated posting editable role',
		}, {
			canPostAsOtherUser: {
				priority: 0,
				useDefault: true,
				value: false,
			},
		});
		const update = await api('admin/roles/update', {
			roleId: editableRole.id,
			policies: {
				...editableRole.policies,
				canPostAsOtherUser: {
					priority: 2,
					useDefault: false,
					value: true,
				},
			} as any,
		}, root);
		assert.strictEqual(update.status, 204);

		const shown = await api('admin/roles/show', { roleId: editableRole.id }, root);
		assert.strictEqual(shown.status, 200);
		assert.deepStrictEqual(shown.body.policies.canPostAsOtherUser, {
			priority: 2,
			useDefault: false,
			value: true,
		});
	});

	test('users without the role policy cannot post or upload as another user', async () => {
		const note = await api('notes/create', {
			text: 'unauthorized delegated note',
			postAsUserId: target.id,
		}, outsider);
		assert.strictEqual(note.status, 400);
		assert.strictEqual(castAsError(note.body).error.code, 'CANNOT_POST_AS_OTHER_USER');

		const file = await uploadFile(outsider, { postAsUserId: target.id });
		assert.strictEqual(file.status, 400);
		assert.strictEqual(castAsError(file.body!).error.code, 'CANNOT_POST_AS_OTHER_USER');
	});

	test('authorized delegated posts use the target author, target drive, and requested past time', async () => {
		const targetDriveBefore = await api('drive', {}, target);
		const delegatedFile = await uploadFile(operator, { postAsUserId: target.id });
		assert.strictEqual(delegatedFile.status, 200);

		const storedFile = await driveFilesRepository.findOneByOrFail({ id: delegatedFile.body!.id });
		assert.strictEqual(storedFile.userId, target.id);
		const targetDriveAfter = await api('drive', {}, target);
		assert.ok(targetDriveAfter.body.usage > targetDriveBefore.body.usage);

		const delegatedNow = await api('notes/create', {
			text: 'delegated with target-owned attachment',
			fileIds: [delegatedFile.body!.id],
			postAsUserId: target.id,
			localOnly: false,
		}, operator);
		assert.strictEqual(delegatedNow.status, 200);
		assert.strictEqual(delegatedNow.body.createdNote.userId, target.id);
		assert.strictEqual(delegatedNow.body.createdNote.user.username, target.username);
		assert.strictEqual(delegatedNow.body.createdNote.localOnly, true);
		assert.deepStrictEqual(delegatedNow.body.createdNote.fileIds, [delegatedFile.body!.id]);

		const pastTime = new Date(target.createdAt).getTime();
		const delegatedPast = await api('notes/create', {
			text: 'backdated delegated note',
			postAsUserId: target.id,
			createdAt: pastTime,
		}, operator);
		assert.strictEqual(delegatedPast.status, 200);
		assert.strictEqual(delegatedPast.body.createdNote.userId, target.id);
		assert.strictEqual(new Date(delegatedPast.body.createdNote.createdAt).getTime(), pastTime);

		const operatorFile = await uploadFile(operator);
		assert.strictEqual(operatorFile.status, 200);
		const mismatchedFile = await api('notes/create', {
			text: 'must reject operator-owned attachment',
			fileIds: [operatorFile.body!.id],
			postAsUserId: target.id,
		}, operator);
		assert.strictEqual(mismatchedFile.status, 400);
		assert.strictEqual(castAsError(mismatchedFile.body).error.code, 'NO_SUCH_FILE');

		const noteLog = await moderationLogsRepository.findOneBy({
			type: 'createNoteAsOtherUser',
			userId: operator.id,
		});
		assert.ok(noteLog);
		assert.strictEqual(noteLog.info.targetUserId, target.id);
		const fileLog = await moderationLogsRepository.findOneBy({
			type: 'createDriveFileAsOtherUser',
			userId: operator.id,
		});
		assert.ok(fileLog);
		assert.strictEqual(fileLog.info.targetUserId, target.id);
	});

	test('delegated custom time rejects future, pre-account, reply, and renote dates', async () => {
		const targetCreatedAt = new Date(target.createdAt).getTime();
		const future = await api('notes/create', {
			text: 'future delegated note',
			postAsUserId: target.id,
			createdAt: Date.now() + 60_000,
		}, operator);
		assert.strictEqual(future.status, 400);
		assert.strictEqual(castAsError(future.body).error.code, 'INVALID_DELEGATED_CREATED_AT');

		const beforeAccount = await api('notes/create', {
			text: 'pre-account delegated note',
			postAsUserId: target.id,
			createdAt: targetCreatedAt - 1,
		}, operator);
		assert.strictEqual(beforeAccount.status, 400);
		assert.strictEqual(castAsError(beforeAccount.body).error.code, 'INVALID_DELEGATED_CREATED_AT');

		const replyTarget = await post(outsider, { text: 'reply target' });
		const reply = await api('notes/create', {
			text: 'backdated reply',
			replyId: replyTarget.id,
			postAsUserId: target.id,
			createdAt: targetCreatedAt,
		}, operator);
		assert.strictEqual(reply.status, 400);
		assert.strictEqual(castAsError(reply.body).error.code, 'INVALID_DELEGATED_CREATED_AT');

		const renote = await api('notes/create', {
			renoteId: replyTarget.id,
			postAsUserId: target.id,
			createdAt: targetCreatedAt,
		}, operator);
		assert.strictEqual(renote.status, 400);
		assert.strictEqual(castAsError(renote.body).error.code, 'INVALID_DELEGATED_CREATED_AT');
	});
});
