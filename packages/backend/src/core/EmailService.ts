/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { randomUUID } from 'node:crypto';
import { URLSearchParams } from 'node:url';
import * as nodemailer from 'nodemailer';
import juice from 'juice';
import sanitizeHtml from 'sanitize-html';
import { Inject, Injectable } from '@nestjs/common';
import * as Redis from 'ioredis';
import { validate as validateEmail } from 'deep-email-validator';
import { UtilityService } from '@/core/UtilityService.js';
import { DI } from '@/di-symbols.js';
import type { Config } from '@/config.js';
import type Logger from '@/logger.js';
import type { MiMeta, UserProfilesRepository } from '@/models/_.js';
import { LoggerService } from '@/core/LoggerService.js';
import { bindThis } from '@/decorators.js';
import { HttpRequestService } from '@/core/HttpRequestService.js';

const EMAIL_QUOTA_REDIS_KEY = 'email:quota:sent';
const EMAIL_AUDIT_REDIS_KEY = 'email:audit:records';
const EMAIL_QUOTA_WINDOW_MS = 1000 * 60 * 60;
const EMAIL_QUOTA_WINDOW_SECONDS = EMAIL_QUOTA_WINDOW_MS / 1000;
const EMAIL_QUOTA_LIMIT = Math.max(1, Number.parseInt(process.env.MISSKEY_SMTP_HOURLY_QUOTA ?? '500', 10) || 500);
const EMAIL_AUDIT_MAX_RECORDS = Math.max(100, Number.parseInt(process.env.MISSKEY_SMTP_AUDIT_MAX_RECORDS ?? '2000', 10) || 2000);
const EMAIL_AUDIT_PREVIEW_LENGTH = 240;

const emailAuditCategories = ['account', 'security', 'admin', 'moderation', 'system', 'other'] as const;
const emailAuditLevels = ['success', 'error'] as const;

export type EmailAuditCategory = typeof emailAuditCategories[number];
export type EmailAuditLevel = typeof emailAuditLevels[number];

export type EmailAuditContext = {
	source?: string;
	category?: EmailAuditCategory;
	requestIp?: string | null;
	userId?: string | null;
	username?: string | null;
};

export type EmailAuditRecord = {
	id: string;
	createdAt: number;
	level: EmailAuditLevel;
	category: EmailAuditCategory;
	source: string;
	requestIp: string | null;
	userId: string | null;
	username: string | null;
	to: string;
	subject: string;
	preview: string;
	messageId: string | null;
	errorMessage: string | null;
	errorCode: string | null;
};

export type EmailAuditQuery = {
	limit?: number;
	category?: EmailAuditCategory | 'all';
	level?: EmailAuditLevel | 'all';
	query?: string;
};

export type EmailAuditStats = {
	total: number;
	success: number;
	error: number;
	categories: Record<EmailAuditCategory, number>;
};

export type EmailAuditResponse = {
	records: EmailAuditRecord[];
	total: number;
	stats: EmailAuditStats;
	quota: EmailQuotaUsage;
};

export type EmailQuotaUsage = {
	limit: number;
	used: number;
	remaining: number;
	usageRate: number;
	windowMs: number;
	windowStartedAt: number;
	resetAt: number | null;
	lastSentAt: number | null;
	updatedAt: number;
};

@Injectable()
export class EmailService {
	private logger: Logger;

	constructor(
		@Inject(DI.config)
		private config: Config,

		@Inject(DI.meta)
		private meta: MiMeta,

		@Inject(DI.redis)
		private redisClient: Redis.Redis,

		@Inject(DI.userProfilesRepository)
		private userProfilesRepository: UserProfilesRepository,

		private loggerService: LoggerService,
		private utilityService: UtilityService,
		private httpRequestService: HttpRequestService,
	) {
		this.logger = this.loggerService.getLogger('email');
	}

	@bindThis
	public async sendEmail(to: string, subject: string, html: string, text: string, auditContext: EmailAuditContext = {}) {
		if (!this.meta.enableEmail) return;

		const iconUrl = `${this.config.url}/static-assets/mi-white.png`;
		const emailSettingUrl = `${this.config.url}/settings/email`;

		const enableAuth = this.meta.smtpUser != null && this.meta.smtpUser !== '';

		const transporter = nodemailer.createTransport({
			host: this.meta.smtpHost,
			port: this.meta.smtpPort,
			secure: this.meta.smtpSecure,
			ignoreTLS: !enableAuth,
			proxy: this.config.proxySmtp,
			auth: enableAuth ? {
				user: this.meta.smtpUser,
				pass: this.meta.smtpPass,
			} : undefined,
		} as any);

		const htmlContent = `<!doctype html>
<html>
	<head>
		<meta charset="utf-8">
		<title>${ subject }</title>
		<style>
			html {
				background: #eee;
			}

			body {
				padding: 16px;
				margin: 0;
				font-family: sans-serif;
				font-size: 14px;
			}

			a {
				text-decoration: none;
				color: #86b300;
			}
			a:hover {
				text-decoration: underline;
			}

			main {
				max-width: 500px;
				margin: 0 auto;
				background: #fff;
				color: #555;
			}
				main > header {
					padding: 32px;
					background: #86b300;
				}
					main > header > img {
						max-width: 128px;
						max-height: 28px;
						vertical-align: bottom;
					}
				main > article {
					padding: 32px;
				}
					main > article > h1 {
						margin: 0 0 1em 0;
					}
				main > footer {
					padding: 32px;
					border-top: solid 1px #eee;
				}

			nav {
				box-sizing: border-box;
				max-width: 500px;
				margin: 16px auto 0 auto;
				padding: 0 32px;
			}
				nav > a {
					color: #888;
				}
		</style>
	</head>
	<body>
		<main>
			<header>
				<img src="${ this.meta.logoImageUrl ?? this.meta.iconUrl ?? iconUrl }"/>
			</header>
			<article>
				<h1>${ subject }</h1>
				<div>${ html }</div>
			</article>
			<footer>
				<a href="${ emailSettingUrl }">${ '邮箱设置 / Email settings / メール設定' }</a>
			</footer>
		</main>
		<nav>
			<a href="${ this.config.url }">${ this.config.host }</a>
		</nav>
	</body>
</html>`;

		const inlinedHtml = juice(htmlContent);

		try {
			// TODO: htmlサニタイズ
			const info = await transporter.sendMail({
				from: this.meta.name ? {
					name: this.meta.name,
					address: this.meta.email!,
				} : this.meta.email!,
				to: to,
				subject: subject,
				text: text,
				html: inlinedHtml,
			});

			this.logger.info(`Message sent: ${info.messageId}`);
			await this.recordEmailSend('success', to, subject, html, text, auditContext, {
				messageId: info.messageId,
			}).catch((err) => {
				this.logger.warn('Failed to record email quota usage', { e: err });
			});
		} catch (err) {
			await this.recordEmailSend('error', to, subject, html, text, auditContext, {
				error: err,
			}).catch((recordErr) => {
				this.logger.warn('Failed to record email audit log', { e: recordErr });
			});
			this.logger.error(err as Error);
			throw err;
		}
	}

	@bindThis
	private async recordEmailQuotaUse(messageId?: string): Promise<void> {
		const now = Date.now();
		const member = `${now}:${randomUUID()}:${messageId ?? 'unknown'}`;

		await this.redisClient.multi()
			.zremrangebyscore(EMAIL_QUOTA_REDIS_KEY, 0, now - EMAIL_QUOTA_WINDOW_MS)
			.zadd(EMAIL_QUOTA_REDIS_KEY, now, member)
			.expire(EMAIL_QUOTA_REDIS_KEY, EMAIL_QUOTA_WINDOW_SECONDS * 2)
			.exec();
	}

	@bindThis
	private normalizeAuditCategory(category?: EmailAuditCategory): EmailAuditCategory {
		return category && emailAuditCategories.includes(category) ? category : 'other';
	}

	@bindThis
	private createEmailPreview(html: string, text: string): string {
		const source = text.trim() !== '' ? text : sanitizeHtml(html, {
			allowedTags: [],
			allowedAttributes: {},
		});

		const normalized = source.replace(/\s+/g, ' ').trim();
		return normalized.length > EMAIL_AUDIT_PREVIEW_LENGTH
			? `${normalized.slice(0, EMAIL_AUDIT_PREVIEW_LENGTH - 1)}...`
			: normalized;
	}

	@bindThis
	private async recordEmailAudit(record: EmailAuditRecord): Promise<void> {
		await this.redisClient.multi()
			.zadd(EMAIL_AUDIT_REDIS_KEY, record.createdAt, JSON.stringify(record))
			.zremrangebyrank(EMAIL_AUDIT_REDIS_KEY, 0, -EMAIL_AUDIT_MAX_RECORDS - 1)
			.exec();
	}

	@bindThis
	private async recordEmailSend(
		level: EmailAuditLevel,
		to: string,
		subject: string,
		html: string,
		text: string,
		auditContext: EmailAuditContext,
		result: {
			messageId?: string;
			error?: unknown;
		},
	): Promise<void> {
		if (level === 'success') {
			await this.recordEmailQuotaUse(result.messageId);
		}

		const err = result.error as { message?: string; name?: string; code?: string; } | undefined;
		const now = Date.now();

		await this.recordEmailAudit({
			id: randomUUID(),
			createdAt: now,
			level,
			category: this.normalizeAuditCategory(auditContext.category),
			source: auditContext.source ?? 'unknown',
			requestIp: auditContext.requestIp ?? null,
			userId: auditContext.userId ?? null,
			username: auditContext.username ?? null,
			to,
			subject,
			preview: this.createEmailPreview(html, text),
			messageId: result.messageId ?? null,
			errorMessage: err?.message ?? null,
			errorCode: err?.code ?? err?.name ?? null,
		});
	}

	@bindThis
	private parseEmailAuditRecord(raw: string): EmailAuditRecord | null {
		try {
			const record = JSON.parse(raw) as Partial<EmailAuditRecord>;
			if (typeof record.id !== 'string' || typeof record.createdAt !== 'number') return null;
			if (!emailAuditLevels.includes(record.level as EmailAuditLevel)) return null;

			return {
				id: record.id,
				createdAt: record.createdAt,
				level: record.level as EmailAuditLevel,
				category: this.normalizeAuditCategory(record.category as EmailAuditCategory | undefined),
				source: typeof record.source === 'string' ? record.source : 'unknown',
				requestIp: typeof record.requestIp === 'string' ? record.requestIp : null,
				userId: typeof record.userId === 'string' ? record.userId : null,
				username: typeof record.username === 'string' ? record.username : null,
				to: typeof record.to === 'string' ? record.to : '',
				subject: typeof record.subject === 'string' ? record.subject : '',
				preview: typeof record.preview === 'string' ? record.preview : '',
				messageId: typeof record.messageId === 'string' ? record.messageId : null,
				errorMessage: typeof record.errorMessage === 'string' ? record.errorMessage : null,
				errorCode: typeof record.errorCode === 'string' ? record.errorCode : null,
			};
		} catch {
			return null;
		}
	}

	@bindThis
	private getEmailAuditStats(records: EmailAuditRecord[]): EmailAuditStats {
		const categories = Object.fromEntries(emailAuditCategories.map(category => [category, 0])) as Record<EmailAuditCategory, number>;
		let success = 0;
		let error = 0;

		for (const record of records) {
			categories[record.category]++;
			if (record.level === 'success') {
				success++;
			} else {
				error++;
			}
		}

		return {
			total: records.length,
			success,
			error,
			categories,
		};
	}

	@bindThis
	private isEmailAuditRecordMatched(record: EmailAuditRecord, query: Required<EmailAuditQuery>): boolean {
		if (query.category !== 'all' && record.category !== query.category) return false;
		if (query.level !== 'all' && record.level !== query.level) return false;

		const normalizedQuery = query.query.trim().toLowerCase();
		if (normalizedQuery === '') return true;

		return [
			record.source,
			record.requestIp,
			record.userId,
			record.username,
			record.to,
			record.subject,
			record.preview,
			record.errorMessage,
			record.errorCode,
		].some(value => value?.toLowerCase().includes(normalizedQuery));
	}

	@bindThis
	public async getEmailAuditRecords(query: EmailAuditQuery = {}): Promise<EmailAuditResponse> {
		const normalizedQuery: Required<EmailAuditQuery> = {
			limit: Math.min(200, Math.max(1, query.limit ?? 50)),
			category: query.category ?? 'all',
			level: query.level ?? 'all',
			query: query.query ?? '',
		};

		const rawRecords = await this.redisClient.zrevrange(EMAIL_AUDIT_REDIS_KEY, 0, EMAIL_AUDIT_MAX_RECORDS - 1);
		const records = rawRecords
			.map(raw => this.parseEmailAuditRecord(raw))
			.filter(x => x != null);
		const stats = this.getEmailAuditStats(records);
		const filtered = records.filter(record => this.isEmailAuditRecordMatched(record, normalizedQuery));

		return {
			records: filtered.slice(0, normalizedQuery.limit),
			total: filtered.length,
			stats,
			quota: await this.getEmailQuotaUsage(),
		};
	}

	@bindThis
	public async clearEmailAuditRecords(): Promise<void> {
		await this.redisClient.del(EMAIL_AUDIT_REDIS_KEY);
	}

	@bindThis
	public async getEmailQuotaUsage(): Promise<EmailQuotaUsage> {
		const now = Date.now();
		const windowStartedAt = now - EMAIL_QUOTA_WINDOW_MS;

		await this.redisClient.zremrangebyscore(EMAIL_QUOTA_REDIS_KEY, 0, windowStartedAt);

		const [used, oldest, latest] = await Promise.all([
			this.redisClient.zcount(EMAIL_QUOTA_REDIS_KEY, windowStartedAt + 1, now),
			this.redisClient.zrange(EMAIL_QUOTA_REDIS_KEY, 0, 0, 'WITHSCORES'),
			this.redisClient.zrange(EMAIL_QUOTA_REDIS_KEY, -1, -1, 'WITHSCORES'),
		]);

		const oldestAt = oldest.length >= 2 ? Number(oldest[1]) : null;
		const lastSentAt = latest.length >= 2 ? Number(latest[1]) : null;

		return {
			limit: EMAIL_QUOTA_LIMIT,
			used,
			remaining: Math.max(0, EMAIL_QUOTA_LIMIT - used),
			usageRate: Math.min(1, used / EMAIL_QUOTA_LIMIT),
			windowMs: EMAIL_QUOTA_WINDOW_MS,
			windowStartedAt,
			resetAt: oldestAt == null ? null : oldestAt + EMAIL_QUOTA_WINDOW_MS,
			lastSentAt,
			updatedAt: now,
		};
	}

	@bindThis
	public async validateEmailForAccount(emailAddress: string): Promise<{
		available: boolean;
		reason: null | 'used' | 'format' | 'disposable' | 'mx' | 'smtp' | 'banned' | 'network' | 'blacklist';
	}> {
		if (!this.utilityService.validateEmailFormat(emailAddress)) {
			return {
				available: false,
				reason: 'format',
			};
		}

		const exist = await this.userProfilesRepository.countBy({
			emailVerified: true,
			email: emailAddress,
		});

		if (exist !== 0) {
			return {
				available: false,
				reason: 'used',
			};
		}

		let validated: {
			valid: boolean,
			reason?: string | null,
		} = { valid: true, reason: null };

		if (this.meta.enableActiveEmailValidation) {
			if (this.meta.enableVerifymailApi && this.meta.verifymailAuthKey != null) {
				validated = await this.verifyMail(emailAddress, this.meta.verifymailAuthKey);
			} else if (this.meta.enableTruemailApi && this.meta.truemailInstance && this.meta.truemailAuthKey != null) {
				validated = await this.trueMail(this.meta.truemailInstance, emailAddress, this.meta.truemailAuthKey);
			} else {
				validated = await validateEmail({
					email: emailAddress,
					validateRegex: true,
					validateMx: true,
					validateTypo: false, // TLDを見ているみたいだけどclubとか弾かれるので
					validateDisposable: true, // 捨てアドかどうかチェック
					validateSMTP: false, // 日本だと25ポートが殆どのプロバイダーで塞がれていてタイムアウトになるので
				});
			}
		}

		if (!validated.valid) {
			const formatReason: Record<string, 'format' | 'disposable' | 'mx' | 'smtp' | 'network' | 'blacklist' | undefined> = {
				regex: 'format',
				disposable: 'disposable',
				mx: 'mx',
				smtp: 'smtp',
				network: 'network',
				blacklist: 'blacklist',
			};

			return {
				available: false,
				reason: validated.reason ? formatReason[validated.reason] ?? null : null,
			};
		}

		const emailDomain: string = emailAddress.split('@')[1];
		const isBanned = this.utilityService.isBlockedHost(this.meta.bannedEmailDomains, emailDomain);

		if (isBanned) {
			return {
				available: false,
				reason: 'banned',
			};
		}

		return {
			available: true,
			reason: null,
		};
	}

	private async verifyMail(emailAddress: string, verifymailAuthKey: string): Promise<{
		valid: boolean;
		reason: 'used' | 'format' | 'disposable' | 'mx' | 'smtp' | null;
	}> {
		const endpoint = 'https://verifymail.io/api/' + emailAddress + '?key=' + verifymailAuthKey;
		const res = await this.httpRequestService.send(endpoint, {
			method: 'GET',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				Accept: 'application/json, */*',
			},
		});

		const json = (await res.json()) as Partial<{
			message: string;
			block: boolean;
			catch_all: boolean;
			deliverable_email: boolean;
			disposable: boolean;
			domain: string;
			email_address: string;
			email_provider: string;
			mx: boolean;
			mx_fallback: boolean;
			mx_host: string[];
			mx_ip: string[];
			mx_priority: { [key: string]: number };
			privacy: boolean;
			related_domains: string[];
		}>;

		/* api error: when there is only one `message` attribute in the returned result */
		if (Object.keys(json).length === 1 && Reflect.has(json, 'message')) {
			return {
				valid: false,
				reason: null,
			};
		}
		if (json.email_address === undefined) {
			return {
				valid: false,
				reason: 'format',
			};
		}
		if (json.deliverable_email !== undefined && !json.deliverable_email) {
			return {
				valid: false,
				reason: 'smtp',
			};
		}
		if (json.disposable) {
			return {
				valid: false,
				reason: 'disposable',
			};
		}
		if (json.mx !== undefined && !json.mx) {
			return {
				valid: false,
				reason: 'mx',
			};
		}

		return {
			valid: true,
			reason: null,
		};
	}

	private async trueMail<T>(truemailInstance: string, emailAddress: string, truemailAuthKey: string): Promise<{
		valid: boolean;
		reason: 'used' | 'format' | 'blacklist' | 'mx' | 'smtp' | 'network' | T | null;
	}> {
		const endpoint = truemailInstance + '?email=' + emailAddress;
		try {
			const res = await this.httpRequestService.send(endpoint, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Accept: 'application/json',
					Authorization: truemailAuthKey,
				},
				isLocalAddressAllowed: true,
			});

			const json = (await res.json()) as {
				email: string;
				success: boolean;
				error?: string;
				errors?: {
					list_match?: string;
					regex?: string;
					mx?: string;
					smtp?: string;
				} | null;
			};

			if (json.email === undefined || json.errors?.regex) {
				return {
					valid: false,
					reason: 'format',
				};
			}
			if (json.errors?.smtp) {
				return {
					valid: false,
					reason: 'smtp',
				};
			}
			if (json.errors?.mx) {
				return {
					valid: false,
					reason: 'mx',
				};
			}
			if (!json.success) {
				return {
					valid: false,
					reason: json.errors?.list_match as T || 'blacklist',
				};
			}

			return {
				valid: true,
				reason: null,
			};
		} catch (_) {
			return {
				valid: false,
				reason: 'network',
			};
		}
	}
}
