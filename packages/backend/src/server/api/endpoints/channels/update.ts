/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { DataSource, In, IsNull } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { DriveFilesRepository, ChannelsRepository, UsersRepository } from '@/models/_.js';
import { MiChannelCollaborator } from '@/models/ChannelCollaborator.js';
import type { MiUser } from '@/models/User.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import { DI } from '@/di-symbols.js';
import { RoleService } from '@/core/RoleService.js';
import { CHANNEL_POSTING_PERMISSIONS } from '@/misc/channel-permissions.js';
import { IdService } from '@/core/IdService.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['channels'],

	requireCredential: true,

	kind: 'write:channels',

	res: {
		type: 'object',
		optional: false, nullable: false,
		ref: 'Channel',
	},

	errors: {
		noSuchChannel: {
			message: 'No such channel.',
			code: 'NO_SUCH_CHANNEL',
			id: 'f9c5467f-d492-4c3c-9a8d-a70dacc86512',
		},

		accessDenied: {
			message: 'You do not have edit privilege of the channel.',
			code: 'ACCESS_DENIED',
			id: '1fb7cb09-d46a-4fdf-b8df-057788cce513',
		},

		noSuchFile: {
			message: 'No such file.',
			code: 'NO_SUCH_FILE',
			id: 'e86c14a4-0da2-4032-8df3-e737a04c7f3b',
		},

		noSuchUser: {
			message: 'No such user.',
			code: 'NO_SUCH_USER',
			id: 'd1d51ca8-bf4c-47b1-b37e-674826d95f9b',
		},

		ownerChangeDenied: {
			message: 'Only administrators can change the channel owner.',
			code: 'OWNER_CHANGE_DENIED',
			id: 'c5f05247-d487-4975-8613-fc17ad4f987e',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		channelId: { type: 'string', format: 'misskey:id' },
		name: { type: 'string', minLength: 1, maxLength: 128 },
		description: { type: 'string', nullable: true, maxLength: 2048 },
		bannerId: { type: 'string', format: 'misskey:id', nullable: true },
		isArchived: { type: 'boolean', nullable: true },
		pinnedNoteIds: {
			type: 'array',
			items: {
				type: 'string', format: 'misskey:id',
			},
		},
		color: { type: 'string', minLength: 1, maxLength: 16 },
		isSensitive: { type: 'boolean', nullable: true },
		allowRenoteToExternal: { type: 'boolean', nullable: true },
		postingPermission: { type: 'string', enum: CHANNEL_POSTING_PERMISSIONS },
		userId: { type: 'string', format: 'misskey:id', nullable: true },
		collaboratorUserIds: {
			type: 'array',
			uniqueItems: true,
			items: {
				type: 'string', format: 'misskey:id',
			},
		},
	},
	required: ['channelId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.db)
		private db: DataSource,

		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,

		@Inject(DI.driveFilesRepository)
		private driveFilesRepository: DriveFilesRepository,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private channelEntityService: ChannelEntityService,

		private roleService: RoleService,

		private idService: IdService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const channel = await this.channelsRepository.findOneBy({
				id: ps.channelId,
			});

			if (channel == null) {
				throw new ApiError(meta.errors.noSuchChannel);
			}

			const iAmModerator = await this.roleService.isModerator(me);
			const iAmAdministrator = await this.roleService.isAdministrator(me);
			if (channel.userId !== me.id && !iAmModerator) {
				throw new ApiError(meta.errors.accessDenied);
			}

			let nextOwnerId: MiUser['id'] | null | undefined;
			if (ps.userId !== undefined) {
				if (!iAmAdministrator) {
					throw new ApiError(meta.errors.ownerChangeDenied);
				}

				if (ps.userId === null) {
					nextOwnerId = null;
				} else {
					const owner = await this.usersRepository.findOneBy({
						id: ps.userId,
						host: IsNull(),
					});
					if (owner == null) {
						throw new ApiError(meta.errors.noSuchUser);
					}
					nextOwnerId = owner.id;
				}
			}

			let nextCollaboratorUserIds: MiUser['id'][] | undefined;
			if (ps.collaboratorUserIds !== undefined) {
				const ownerIdForFilter = nextOwnerId !== undefined ? nextOwnerId : channel.userId;
				nextCollaboratorUserIds = [...new Set(ps.collaboratorUserIds)].filter(id => id !== ownerIdForFilter);

				if (nextCollaboratorUserIds.length > 0) {
					const users = await this.usersRepository.findBy({
						id: In(nextCollaboratorUserIds),
						host: IsNull(),
					});
					if (users.length !== nextCollaboratorUserIds.length) {
						throw new ApiError(meta.errors.noSuchUser);
					}
				}
			}

			// eslint:disable-next-line:no-unnecessary-initializer
			let banner = undefined;
			if (ps.bannerId != null) {
				banner = await this.driveFilesRepository.findOneBy({
					id: ps.bannerId,
					userId: me.id,
				});

				if (banner == null) {
					throw new ApiError(meta.errors.noSuchFile);
				}
			} else if (ps.bannerId === null) {
				banner = null;
			}

			await this.db.transaction(async transactionalEntityManager => {
				await transactionalEntityManager.update('channel', channel.id, {
					...(ps.name !== undefined ? { name: ps.name } : {}),
					...(ps.description !== undefined ? { description: ps.description } : {}),
					...(ps.pinnedNoteIds !== undefined ? { pinnedNoteIds: ps.pinnedNoteIds } : {}),
					...(ps.color !== undefined ? { color: ps.color } : {}),
					...(typeof ps.isArchived === 'boolean' ? { isArchived: ps.isArchived } : {}),
					...(banner !== undefined ? { bannerId: banner?.id ?? null } : {}),
					...(typeof ps.isSensitive === 'boolean' ? { isSensitive: ps.isSensitive } : {}),
					...(typeof ps.allowRenoteToExternal === 'boolean' ? { allowRenoteToExternal: ps.allowRenoteToExternal } : {}),
					...(ps.postingPermission !== undefined ? { postingPermission: ps.postingPermission } : {}),
					...(nextOwnerId !== undefined ? { userId: nextOwnerId } : {}),
				});

				if (nextCollaboratorUserIds !== undefined) {
					await transactionalEntityManager.delete(MiChannelCollaborator, {
						channelId: channel.id,
					});

					if (nextCollaboratorUserIds.length > 0) {
						await transactionalEntityManager.insert(MiChannelCollaborator, nextCollaboratorUserIds.map(userId => ({
							id: this.idService.gen(),
							channelId: channel.id,
							userId,
						})));
					}
				}
			});

			return await this.channelEntityService.pack(channel.id, me);
		});
	}
}
