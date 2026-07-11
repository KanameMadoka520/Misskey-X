/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { createHash } from 'node:crypto';
import { Brackets } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { FollowingsRepository, NotesRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { NoteEntityService } from '@/core/entities/NoteEntityService.js';
import { QueryService } from '@/core/QueryService.js';
import { DI } from '@/di-symbols.js';

const RANDOM_CANDIDATE_LIMIT = 500;

type WaterfallFilterParams = {
	image: 'all' | 'with' | 'without';
	relation: 'all' | 'following' | 'unfollowed';
	userId?: string | null;
};

export const meta = {
	tags: ['notes'],

	requireCredential: true,
	kind: 'read:account',

	res: {
		type: 'array',
		optional: false, nullable: false,
		items: {
			type: 'object',
			optional: false, nullable: false,
			ref: 'Note',
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		order: { type: 'string', enum: ['recent', 'random'], default: 'recent' },
		image: { type: 'string', enum: ['all', 'with', 'without'], default: 'all' },
		relation: { type: 'string', enum: ['all', 'following', 'unfollowed'], default: 'all' },
		userId: { type: 'string', format: 'misskey:id', nullable: true },
		seed: { type: 'string', minLength: 1, maxLength: 64 },
		offset: { type: 'integer', minimum: 0, maximum: RANDOM_CANDIDATE_LIMIT, default: 0 },
		limit: { type: 'integer', minimum: 1, maximum: 30, default: 15 },
		untilId: { type: 'string', format: 'misskey:id' },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.notesRepository)
		private notesRepository: NotesRepository,

		@Inject(DI.followingsRepository)
		private followingsRepository: FollowingsRepository,

		private noteEntityService: NoteEntityService,
		private queryService: QueryService,
	) {
		super(meta, paramDef, async (ps, me) => {
			if (ps.order === 'random') {
				return await this.getRandom(ps, me);
			}

			const query = this.createFilteredQuery(ps, me);
			this.queryService.makePaginationQuery(query, null, ps.untilId);
			const notes = await query.limit(ps.limit).getMany();

			return await this.noteEntityService.packMany(notes, me);
		});
	}

	private createFilteredQuery(ps: WaterfallFilterParams, me: { id: string }) {
		const query = this.notesRepository.createQueryBuilder('note')
			.andWhere('note.userHost IS NULL')
			.innerJoinAndSelect('note.user', 'user')
			.leftJoinAndSelect('note.reply', 'reply')
			.leftJoinAndSelect('note.renote', 'renote')
			.leftJoinAndSelect('reply.user', 'replyUser')
			.leftJoinAndSelect('renote.user', 'renoteUser')
			.leftJoinAndSelect('note.channel', 'channel');

		this.queryService.generateVisibilityQuery(query, me);
		this.queryService.generateBaseNoteFilteringQuery(query, me);
		this.queryService.generateMutedUserRenotesQueryForNotes(query, me);

		if (ps.image === 'with') {
			query.andWhere('EXISTS (SELECT 1 FROM unnest(note."attachedFileTypes") AS file_type WHERE file_type LIKE \'image/%\')');
		} else if (ps.image === 'without') {
			query.andWhere('NOT EXISTS (SELECT 1 FROM unnest(note."attachedFileTypes") AS file_type WHERE file_type LIKE \'image/%\')');
		}

		if (ps.userId != null) {
			query.andWhere('note.userId = :waterfallUserId', { waterfallUserId: ps.userId });
		}

		if (ps.relation !== 'all') {
			const followingQuery = this.followingsRepository.createQueryBuilder('waterfallFollowing')
				.select('waterfallFollowing.followeeId')
				.where('waterfallFollowing.followerId = :waterfallMeId');

			if (ps.relation === 'following') {
				query.andWhere(`note.userId IN (${followingQuery.getQuery()})`);
			} else {
				query.andWhere(new Brackets(qb => {
					qb.where(`note.userId NOT IN (${followingQuery.getQuery()})`)
						.andWhere('note.userId != :waterfallMeId');
				}));
			}
			query.setParameter('waterfallMeId', me.id);
		}

		return query;
	}

	private async getRandom(ps: WaterfallFilterParams & {
		seed?: string;
		offset: number;
		limit: number;
	}, me: { id: string }) {
		const candidateQuery = this.createFilteredQuery(ps, me)
			.select('note.id', 'id')
			.orderBy('note.id', 'DESC')
			.limit(RANDOM_CANDIDATE_LIMIT);
		const candidateIds = (await candidateQuery.getRawMany<{ id: string }>()).map(row => row.id);
		const seed = ps.seed ?? me.id;
		candidateIds.sort((a, b) => {
			const aHash = createHash('sha256').update(`${seed}:${a}`).digest('hex');
			const bHash = createHash('sha256').update(`${seed}:${b}`).digest('hex');
			return aHash.localeCompare(bHash);
		});

		const noteIds = candidateIds.slice(ps.offset, ps.offset + ps.limit);
		if (noteIds.length === 0) return [];

		const notes = await this.createFilteredQuery(ps, me)
			.andWhere('note.id IN (:...noteIds)', { noteIds })
			.getMany();
		const positions = new Map(noteIds.map((id, index) => [id, index]));
		notes.sort((a, b) => positions.get(a.id)! - positions.get(b.id)!);

		return await this.noteEntityService.packMany(notes, me);
	}
}
