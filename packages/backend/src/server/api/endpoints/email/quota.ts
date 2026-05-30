/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { Injectable } from '@nestjs/common';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { EmailService } from '@/core/EmailService.js';

export const meta = {
	tags: ['account'],

	requireCredential: true,
	kind: 'read:account',

	res: {
		type: 'object',
		optional: false, nullable: false,
		properties: {
			limit: {
				type: 'number',
				optional: false, nullable: false,
			},
			used: {
				type: 'number',
				optional: false, nullable: false,
			},
			remaining: {
				type: 'number',
				optional: false, nullable: false,
			},
			usageRate: {
				type: 'number',
				optional: false, nullable: false,
			},
			windowMs: {
				type: 'number',
				optional: false, nullable: false,
			},
			windowStartedAt: {
				type: 'number',
				optional: false, nullable: false,
			},
			resetAt: {
				type: 'number',
				optional: false, nullable: true,
			},
			lastSentAt: {
				type: 'number',
				optional: false, nullable: true,
			},
			updatedAt: {
				type: 'number',
				optional: false, nullable: false,
			},
		},
	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {},
	required: [],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		private emailService: EmailService,
	) {
		super(meta, paramDef, async () => {
			return await this.emailService.getEmailQuotaUsage();
		});
	}
}
