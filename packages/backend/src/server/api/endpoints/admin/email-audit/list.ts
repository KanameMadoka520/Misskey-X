/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { EmailService } from '@/core/EmailService.js';
import type { EmailAuditCategory, EmailAuditLevel } from '@/core/EmailService.js';

export const meta = {
	tags: ['admin'],

	requireCredential: true,
	requireAdmin: true,
	kind: 'read:admin:meta',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			records: {
				type: 'array',
				optional: false, nullable: false,
				items: {
					type: 'object',
					optional: false, nullable: false,
					properties: {
						id: { type: 'string', optional: false, nullable: false },
						createdAt: { type: 'number', optional: false, nullable: false },
						level: { type: 'string', optional: false, nullable: false },
						category: { type: 'string', optional: false, nullable: false },
						source: { type: 'string', optional: false, nullable: false },
						requestIp: { type: 'string', optional: false, nullable: true },
						userId: { type: 'string', optional: false, nullable: true },
						username: { type: 'string', optional: false, nullable: true },
						to: { type: 'string', optional: false, nullable: false },
						subject: { type: 'string', optional: false, nullable: false },
						preview: { type: 'string', optional: false, nullable: false },
						messageId: { type: 'string', optional: false, nullable: true },
						errorMessage: { type: 'string', optional: false, nullable: true },
						errorCode: { type: 'string', optional: false, nullable: true },
					},
				},
			},
			total: { type: 'number', optional: false, nullable: false },
			stats: {
				type: 'object',
				optional: false, nullable: false,
				properties: {
					total: { type: 'number', optional: false, nullable: false },
					success: { type: 'number', optional: false, nullable: false },
					error: { type: 'number', optional: false, nullable: false },
					categories: {
						type: 'object',
						optional: false, nullable: false,
						properties: {
							account: { type: 'number', optional: false, nullable: false },
							security: { type: 'number', optional: false, nullable: false },
							admin: { type: 'number', optional: false, nullable: false },
							moderation: { type: 'number', optional: false, nullable: false },
							system: { type: 'number', optional: false, nullable: false },
							other: { type: 'number', optional: false, nullable: false },
						},
					},
				},
			},
			quota: {
				type: 'object',
				optional: false, nullable: false,
				properties: {
					limit: { type: 'number', optional: false, nullable: false },
					used: { type: 'number', optional: false, nullable: false },
					remaining: { type: 'number', optional: false, nullable: false },
					usageRate: { type: 'number', optional: false, nullable: false },
					windowMs: { type: 'number', optional: false, nullable: false },
					windowStartedAt: { type: 'number', optional: false, nullable: false },
					resetAt: { type: 'number', optional: false, nullable: true },
					lastSentAt: { type: 'number', optional: false, nullable: true },
					updatedAt: { type: 'number', optional: false, nullable: false },
				},
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
		category: { type: 'string', enum: ['all', 'account', 'security', 'admin', 'moderation', 'system', 'other'], default: 'all' },
		level: { type: 'string', enum: ['all', 'success', 'error'], default: 'all' },
		query: { type: 'string', maxLength: 100, default: '' },
	},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private emailService: EmailService,
	) {
		super(meta, paramDef, async (ps) => {
			return await this.emailService.getEmailAuditRecords({
				limit: ps.limit,
				category: ps.category as EmailAuditCategory | 'all',
				level: ps.level as EmailAuditLevel | 'all',
				query: ps.query,
			});
		});
	}
}
