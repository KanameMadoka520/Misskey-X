/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { ChannelCollaboratorsRepository, ChannelFollowingsRepository, ChannelsRepository, UsersRepository } from '@/models/_.js';
import type { MiUser } from '@/models/User.js';
import { UserEntityService } from '@/core/entities/UserEntityService.js';
import { DI } from '@/di-symbols.js';
import { ApiError } from '../../error.js';

export const meta = {
	tags: ['channels', 'users'],

	requireCredential: false,

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			owner: {
				type: 'object',
				optional: false, nullable: true,
				ref: 'UserLite',
			},
			collaborators: {
				type: 'array',
				optional: false, nullable: false,
				items: {
					type: 'object',
					optional: false, nullable: false,
					ref: 'UserLite',
				},
			},
			followers: {
				type: 'array',
				optional: false, nullable: false,
				items: {
					type: 'object',
					optional: false, nullable: false,
					ref: 'UserLite',
				},
			},
		},
	},

	errors: {
		noSuchChannel: {
			message: 'No such channel.',
			code: 'NO_SUCH_CHANNEL',
			id: '0c98c2ce-d2f0-4564-8512-95b14ec20c86',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		channelId: { type: 'string', format: 'misskey:id' },
		limit: { type: 'integer', minimum: 1, maximum: 100, default: 30 },
		offset: { type: 'integer', minimum: 0, default: 0 },
	},
	required: ['channelId'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,

		@Inject(DI.channelCollaboratorsRepository)
		private channelCollaboratorsRepository: ChannelCollaboratorsRepository,

		@Inject(DI.channelFollowingsRepository)
		private channelFollowingsRepository: ChannelFollowingsRepository,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		private userEntityService: UserEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const channel = await this.channelsRepository.findOneBy({
				id: ps.channelId,
			});

			if (channel == null) {
				throw new ApiError(meta.errors.noSuchChannel);
			}

			const [collaborators, followings] = await Promise.all([
				this.channelCollaboratorsRepository.find({
					where: {
						channelId: channel.id,
					},
					order: {
						id: 'ASC',
					},
				}),
				this.channelFollowingsRepository.find({
					where: {
						followeeId: channel.id,
					},
					order: {
						id: 'DESC',
					},
					take: ps.limit,
					skip: ps.offset,
				}),
			]);

			const ownerUserIds = channel.userId ? [channel.userId] : [];
			const collaboratorUserIds = collaborators.map(x => x.userId);
			const followerUserIds = followings.map(x => x.followerId);
			const users = [...new Set([...ownerUserIds, ...collaboratorUserIds, ...followerUserIds])].length > 0
				? await this.usersRepository.findBy({ id: In([...new Set([...ownerUserIds, ...collaboratorUserIds, ...followerUserIds])]) })
				: [];
			const packedUsers = await this.userEntityService.packMany(users, me, { schema: 'UserLite' })
				.then(packed => new Map(packed.map(user => [user.id, user])));

			const resolveUsers = (ids: MiUser['id'][]) => ids
				.map(id => packedUsers.get(id))
				.filter(user => user != null);

			return {
				owner: channel.userId ? (packedUsers.get(channel.userId) ?? null) : null,
				collaborators: resolveUsers(collaboratorUserIds),
				followers: resolveUsers(followerUserIds),
			};
		});
	}
}

