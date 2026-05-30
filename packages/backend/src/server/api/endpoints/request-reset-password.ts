/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import ms from 'ms';
import { IsNull } from 'typeorm';
import { Inject, Injectable } from '@nestjs/common';
import type { PasswordResetRequestsRepository, UserProfilesRepository, UsersRepository } from '@/models/_.js';
import { Endpoint } from '@/server/api/endpoint-base.js';
import { IdService } from '@/core/IdService.js';
import type { Config } from '@/config.js';
import { DI } from '@/di-symbols.js';
import { EmailService } from '@/core/EmailService.js';
import { L_CHARS, secureRndstr } from '@/misc/secure-rndstr.js';

export const meta = {
	tags: ['reset password'],

	requireCredential: false,

	description: 'Request a users password to be reset.',

	limit: {
		duration: ms('1hour'),
		max: 3,
	},

	errors: {

	},
} as const;

export const paramDef = {
	type: 'object',
	properties: {
		username: { type: 'string' },
		email: { type: 'string' },
	},
	required: ['username', 'email'],
} as const;

@Injectable()
export default class extends Endpoint<typeof meta, typeof paramDef> { // eslint-disable-line import/no-default-export
	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.usersRepository)
		private usersRepository: UsersRepository,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		@Inject(DI.passwordResetRequestsRepository)
		private passwordResetRequestsRepository: PasswordResetRequestsRepository,

		private idService: IdService,
		private emailService: EmailService,
	) {
		super(meta, paramDef, async (ps, me, _token, file, cleanup, ip) => {
			const user = await this.usersRepository.findOneBy({
				usernameLower: ps.username.toLowerCase(),
				host: IsNull(),
			});

			// 合致するユーザーが登録されていなかったら無視
			if (user == null) {
				return;
			}

			const profile = await this.userProfilesRepository.findOneByOrFail({ userId: user.id });

			// 合致するメアドが登録されていなかったら無視
			if (profile.email !== ps.email) {
				return;
			}

			// メアドが認証されていなかったら無視
			if (!profile.emailVerified) {
				return;
			}

			const token = secureRndstr(64, { chars: L_CHARS });

			await this.passwordResetRequestsRepository.insert({
				id: this.idService.gen(),
				userId: profile.userId,
				token,
			});

			const link = `${this.config.url}/reset-password/${token}`;

			this.emailService.sendEmail(ps.email, '密码重置请求 / Password reset requested / パスワード再設定リクエスト',
				[
					'如需重置密码，请点击下面的链接：',
					`<a href="${link}">${link}</a>`,
					'如果这不是你本人操作，请忽略这封邮件。',
					'',
					'---------------',
					'',
					'To reset your password, please click this link:',
					`<a href="${link}">${link}</a>`,
					'If you did not request this, please ignore this email.',
					'',
					'---------------',
					'',
					'パスワードを再設定するには、以下のリンクをクリックしてください：',
					`<a href="${link}">${link}</a>`,
					'この操作に心当たりがない場合は、このメールを無視してください。',
				].join('<br>'),
				[
					'如需重置密码，请点击下面的链接：',
					link,
					'如果这不是你本人操作，请忽略这封邮件。',
					'',
					'---------------',
					'',
					'To reset your password, please click this link:',
					link,
					'If you did not request this, please ignore this email.',
					'',
					'---------------',
					'',
					'パスワードを再設定するには、以下のリンクをクリックしてください：',
					link,
					'この操作に心当たりがない場合は、このメールを無視してください。',
				].join('\n'), {
					source: 'request-reset-password',
					category: 'security',
					requestIp: ip,
					userId: user.id,
					username: user.username,
				});
		});
	}
}
