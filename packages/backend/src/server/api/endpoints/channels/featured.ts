/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Inject, Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import type { ChannelsRepository } from '@/models/_.js';
import { ChannelEntityService } from '@/core/entities/ChannelEntityService.js';
import { DI } from '@/di-symbols.js';

export const meta = {
	tags: ['channels'],

	requireCredential: false,

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Channel',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 20, default: 10 },
		random: { type: 'boolean', default: false },
		excludeFollowing: { type: 'boolean', default: false },
		excludeChannelIds: { type: 'array', items: { type: 'string', format: 'misskey:id' }, maxItems: 100, default: [] },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.channelsRepository)
		private channelsRepository: ChannelsRepository,

		private channelEntityService: ChannelEntityService,
	) {
		super(meta, paramDef, async (ps, me) => {
			const limit = ps.limit ?? 10;
			const random = ps.random ?? false;
			const excludeFollowing = ps.excludeFollowing ?? false;
			const excludeChannelIds = ps.excludeChannelIds ?? [];

			const query = this.channelsRepository.createQueryBuilder('channel')
				.where('channel.lastNotedAt IS NOT NULL')
				.andWhere('channel.isArchived = FALSE');

			if (excludeChannelIds.length > 0) {
				query.andWhere('channel.id NOT IN (:...excludeChannelIds)', { excludeChannelIds });
			}

			if (me && excludeFollowing) {
				query.andWhere('NOT EXISTS (SELECT 1 FROM channel_following cf WHERE cf."followeeId" = channel.id AND cf."followerId" = :meId)', { meId: me.id });
			}

			if (random) {
				query.orderBy('RANDOM()');
			} else {
				query.orderBy('channel.lastNotedAt', 'DESC');
			}

			const channels = await query.limit(limit).getMany();

			return await Promise.all(channels.map(x => this.channelEntityService.pack(x, me)));
		});
	}
}
