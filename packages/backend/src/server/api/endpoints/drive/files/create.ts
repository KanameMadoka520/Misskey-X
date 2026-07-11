/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { DB_MAX_IMAGE_COMMENT_LENGTH } from '@/const.js';
import { IdentifiableError } from '@/misc/identifiable-error.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { DriveFileEntityService } from '@/core/entities/DriveFileEntityService.js';
import { DriveService } from '@/core/DriveService.js';
import type { MiMeta, UsersRepository } from '@/models/_.js';
import { DI } from '@/di-symbols.js';
import { RoleService } from '@/core/RoleService.js';
import { ModerationLogService } from '@/core/ModerationLogService.js';
import { ApiError } from '../../../error.js';

export const meta = {
	tags: ['drive'],

	requireCredential: true,

	prohibitMoved: true,

	limit: {
		duration: ms('1hour'),
		max: 120,
	},

	requireFile: true,

	kind: 'write:drive',

	description: 'Upload a new drive file.',

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'DriveFile',
	},

	errors: {
		invalidFileName: {
			message: 'Invalid file name.',
			code: 'INVALID_FILE_NAME',
			id: 'f449b209-0c60-4e51-84d5-29486263bfd4',
		},

		inappropriate: {
			message: 'Cannot upload the file because it has been determined that it possibly contains inappropriate content.',
			code: 'INAPPROPRIATE',
			id: 'bec5bd69-fba3-43c9-b4fb-2894b66ad5d2',
		},

		noFreeSpace: {
			message: 'Cannot upload the file because you have no free space of drive.',
			code: 'NO_FREE_SPACE',
			id: 'd08dbc37-a6a9-463a-8c47-96c32ab5f064',
		},

		maxFileSizeExceeded: {
			message: 'Cannot upload the file because it exceeds the maximum file size.',
			code: 'MAX_FILE_SIZE_EXCEEDED',
			id: 'b9d8c348-33f0-4673-b9a9-5d4da058977a',
			httpStatusCode: 413,
		},

		unallowedFileType: {
			message: 'Cannot upload the file because it is an unallowed file type.',
			code: 'UNALLOWED_FILE_TYPE',
			id: '4becd248-7f2c-48c4-a9f0-75edc4f9a1ea',
		},

		cannotPostAsOtherUser: {
			message: 'You are not allowed to upload files for another user.',
			code: 'CANNOT_POST_AS_OTHER_USER',
			id: 'd7f17f87-597d-4f47-9fbf-0cff31e2d693',
		},

		noSuchTargetUser: {
			message: 'The target local user does not exist or cannot receive delegated uploads.',
			code: 'NO_SUCH_TARGET_USER',
			id: 'cc1ff310-104c-4a4d-af65-20d93cd30408',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		folderId: { type: 'string', format: 'misskey:id', nullable: true, default: null },
		name: { type: 'string', nullable: true, default: null },
		comment: { type: 'string', nullable: true, maxLength: DB_MAX_IMAGE_COMMENT_LENGTH, default: null },
		isSensitive: { type: 'boolean', default: false },
		force: { type: 'boolean', default: false },
		postAsUserId: { type: 'string', format: 'misskey:id', nullable: true },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.meta)
		private serverSettings: MiMeta,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private driveFileEntityService: DriveFileEntityService,
		private driveService: DriveService,
		private roleService: RoleService,
		private moderationLogService: ModerationLogService,
	) {
		super(meta, paramDef, async (ps, me, _, file, cleanup, ip, headers) => {
			try {
				let owner = me;
				if (ps.postAsUserId != null) {
					const policies = await this.roleService.getUserPolicies(me.id);
					if (!policies.canPostAsOtherUser) {
						throw new ApiError(meta.errors.cannotPostAsOtherUser);
					}

					const target = await this.usersRepository.findOneBy({
						id: ps.postAsUserId,
						host: IsNull(),
						isSuspended: false,
						isDeleted: false,
					});
					if (target == null || target.movedToUri != null) {
						throw new ApiError(meta.errors.noSuchTargetUser);
					}
					owner = target as typeof me;
				}

				// Get 'name' parameter
				let name = ps.name ?? file!.name ?? null;
				if (name != null) {
					name = name.trim();
					if (name.length === 0) {
						name = null;
					} else if (name === 'blob') {
						name = null;
					} else if (!this.driveFileEntityService.validateFileName(name)) {
						throw new ApiError(meta.errors.invalidFileName);
					}
				}

				try {
					// Create file
					const driveFile = await this.driveService.addFile({
						user: owner,
						path: file!.path,
						name,
						comment: ps.comment,
						folderId: ps.postAsUserId == null ? ps.folderId : null,
						force: ps.force,
						sensitive: ps.isSensitive,
						requestIp: this.serverSettings.enableIpLogging ? ip : null,
						requestHeaders: this.serverSettings.enableIpLogging ? headers : null,
					});
					if (ps.postAsUserId != null) {
						try {
							await this.moderationLogService.log(me, 'createDriveFileAsOtherUser', {
								fileId: driveFile.id,
								targetUserId: owner.id,
								targetUserUsername: owner.username,
							});
						} catch (err) {
							console.error(err);
						}
					}
					return await this.driveFileEntityService.pack(driveFile, { self: true });
				} catch (err) {
					if (err instanceof Error || typeof err === 'string') {
						console.error(err);
					}
					if (err instanceof IdentifiableError) {
						if (err.id === '282f77bf-5816-4f72-9264-aa14d8261a21') throw new ApiError(meta.errors.inappropriate);
						if (err.id === 'c6244ed2-a39a-4e1c-bf93-f0fbd7764fa6') throw new ApiError(meta.errors.noFreeSpace);
						if (err.id === 'f9e4e5f3-4df4-40b5-b400-f236945f7073') throw new ApiError(meta.errors.maxFileSizeExceeded);
						if (err.id === 'bd71c601-f9b0-4808-9137-a330647ced9b') throw new ApiError(meta.errors.unallowedFileType);
					}
					throw new ApiError();
				}
			} finally {
				cleanup!();
			}
		});
	}
}
