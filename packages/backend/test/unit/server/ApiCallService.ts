/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { ApiCallService } from '@/server/api/ApiCallService.js';
import Logger from '@/logger.js';
import { envOption } from '@/env.js';
import { logManager } from '@/logging/logging-runtime.js';
import { PrettyConsoleBackend } from '@/logging/PrettyConsoleBackend.js';
import type { LogBackend } from '@/logging/LogBackend.js';
import type { LogRecord } from '@/logging/types.js';
import type { MiLocalUser } from '@/models/User.js';
import type { IEndpointMeta } from '@/server/api/endpoints.js';

/** API失敗ログを確認するための最小Fastify応答を作成します。 */
function createReply() {
	return {
		code: vi.fn(),
		header: vi.fn(),
		send: vi.fn(),
	};
}

/** APIサービスの依存関係を最小限の仮実装へ差し替えます。 */
function createService() {
	const authenticateService = {
		authenticate: vi.fn().mockResolvedValue([null, null]),
	};
	const telemetryService = {
		startSpan: vi.fn((_name: string, callback: () => unknown) => callback()),
		captureMessage: vi.fn(),
	};
	const apiLoggerService = { logger: new Logger('api') };

	const service = new ApiCallService(
		{} as never,
		{} as never,
		{} as never,
		authenticateService as never,
		{} as never,
		{} as never,
		apiLoggerService as never,
		telemetryService as never,
	);
	return { service, telemetryService };
}

describe('ApiCallService structured error logging', () => {
	test('redacts API credentials and serializes the endpoint error', async () => {
		const write = vi.fn<LogBackend['write']>();
		logManager.setBackend({ write });
		const previousQuiet = envOption.quiet;
		envOption.quiet = false;
		const { service, telemetryService } = createService();
		try {
			const reply = createReply();
			const endpoint = {
				name: 'notes/show',
				meta: {},
				params: {},
				exec: vi.fn().mockRejectedValue(new TypeError('broken endpoint')),
			};
			const request = {
				method: 'POST',
				body: {
					i: 'native-token',
					password: 'password',
					options: { visible: true },
				},
				query: {},
				headers: {},
				ip: '127.0.0.1',
			};

			await service.handleRequest(endpoint as never, request as never, reply as never);

			const record = write.mock.calls[0][0] as LogRecord;
			expect(record).toMatchObject({
				eventName: 'api.endpoint.failed',
				attributes: {
					'api.endpoint': 'notes/show',
					'api.params': {
						i: '[REDACTED]',
						password: '[REDACTED]',
						options: { visible: true },
					},
				},
				error: { type: 'TypeError', message: 'broken endpoint' },
			});
			expect(record.attributes?.['error.id']).toEqual(expect.any(String));
			expect(telemetryService.captureMessage.mock.calls[0][1].extra).not.toHaveProperty('ps');
		} finally {
			service.dispose();
			envOption.quiet = previousQuiet;
			logManager.setBackend(new PrettyConsoleBackend({ output: () => undefined }));
		}
	});
});

describe('ApiCallService required role policies', () => {
	let service: ApiCallService;

	afterEach(() => service?.dispose());

	function setup({
		userId = null,
		rootUserId = 'root',
		canSearchUsers = true,
		roles = [],
		endpointMeta = {},
	}: {
		userId?: string | null;
		rootUserId?: string | null;
		canSearchUsers?: boolean;
		roles?: { isAdministrator: boolean; isModerator?: boolean }[];
		endpointMeta?: IEndpointMeta;
	} = {}) {
		const user = userId == null ? null : { id: userId } as MiLocalUser;
		const roleService = {
			getUserRoles: vi.fn().mockResolvedValue(roles),
			getUserPolicies: vi.fn().mockResolvedValue({ canSearchUsers }),
		};
		service = new ApiCallService(
			{ rootUserId } as never,
			{} as never,
			{} as never,
			{ authenticate: vi.fn().mockResolvedValue([user, null]) } as never,
			{} as never,
			roleService as never,
			{ logger: new Logger('api') } as never,
			{ startSpan: (_name: string, callback: () => unknown) => callback() } as never,
		);
		const endpoint = {
			name: 'users/search',
			meta: { requireCredential: false, requiredRolePolicy: 'canSearchUsers', ...endpointMeta },
			params: {},
			exec: vi.fn().mockResolvedValue([]),
		};
		const reply = createReply();
		const request = {
			method: 'POST',
			body: { query: 'test' },
			headers: {},
			ip: '192.0.2.1',
		};
		const execute = () => service.handleRequest(endpoint as never, request as never, reply as never);
		return { execute, endpoint, reply, roleService };
	}

	test('allows anonymous access when the default policy allows it', async () => {
		const { execute, endpoint, reply, roleService } = setup();
		await execute();
		expect(roleService.getUserPolicies).toHaveBeenCalledWith(null);
		expect(roleService.getUserRoles).not.toHaveBeenCalled();
		expect(endpoint.exec).toHaveBeenCalledOnce();
		expect(endpoint.exec.mock.calls[0][1]).toBeNull();
		expect(reply.send).toHaveBeenCalledWith([]);
	});

	test.each(['root', null])('denies anonymous access when the default policy denies it (root=%s)', async (rootUserId) => {
		const { execute, endpoint, reply, roleService } = setup({ rootUserId, canSearchUsers: false });
		await execute();
		expect(roleService.getUserPolicies).toHaveBeenCalledWith(null);
		expect(roleService.getUserRoles).not.toHaveBeenCalled();
		expect(endpoint.exec).not.toHaveBeenCalled();
		expect(reply.code).toHaveBeenCalledWith(403);
		expect(reply.send).toHaveBeenCalledWith({ error: expect.objectContaining({ code: 'ROLE_PERMISSION_DENIED' }) });
	});

	test.each([
		{ roles: [] },
		{ roles: [{ isAdministrator: false, isModerator: true }] },
	])('does not bypass a denied policy for a non-administrator role: %j', async ({ roles }) => {
		const { execute, endpoint, reply, roleService } = setup({ userId: 'member', canSearchUsers: false, roles });
		await execute();
		expect(roleService.getUserPolicies).toHaveBeenCalledWith('member');
		expect(roleService.getUserRoles).toHaveBeenCalledWith('member');
		expect(endpoint.exec).not.toHaveBeenCalled();
		expect(reply.code).toHaveBeenCalledWith(403);
	});

	test('allows an authenticated user whose policy allows access', async () => {
		const { execute, endpoint, reply, roleService } = setup({ userId: 'member' });
		await execute();
		expect(roleService.getUserPolicies).toHaveBeenCalledWith('member');
		expect(endpoint.exec).toHaveBeenCalledOnce();
		expect(reply.send).toHaveBeenCalledWith([]);
	});

	test('preserves the administrator exception to a denied policy', async () => {
		const { execute, endpoint, reply } = setup({
			userId: 'administrator',
			canSearchUsers: false,
			roles: [{ isAdministrator: true }],
		});
		await execute();
		expect(endpoint.exec).toHaveBeenCalledOnce();
		expect(reply.send).toHaveBeenCalledWith([]);
	});

	test('preserves the authenticated root exception to a denied policy', async () => {
		const { execute, endpoint, reply, roleService } = setup({ userId: 'root', canSearchUsers: false });
		await execute();
		expect(roleService.getUserRoles).not.toHaveBeenCalled();
		expect(roleService.getUserPolicies).not.toHaveBeenCalled();
		expect(endpoint.exec).toHaveBeenCalledOnce();
		expect(reply.send).toHaveBeenCalledWith([]);
	});

	test('does not let an allowed anonymous policy bypass a credential requirement', async () => {
		const { execute, endpoint, reply, roleService } = setup({ endpointMeta: { requireCredential: true, kind: 'read:account' } });
		await execute();
		expect(roleService.getUserPolicies).not.toHaveBeenCalled();
		expect(endpoint.exec).not.toHaveBeenCalled();
		expect(reply.code).toHaveBeenCalledWith(401);
		expect(reply.send).toHaveBeenCalledWith({ error: expect.objectContaining({ code: 'CREDENTIAL_REQUIRED' }) });
	});
});
