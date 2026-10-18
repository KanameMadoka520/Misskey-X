/*
 * SPDX-FileCopyrightText: misskey-x contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { afterEach, describe, expect, test, vi } from 'vitest';
import { SignupApiService } from '@/server/api/SignupApiService.js';

function setup() {
	const ticket = { id: 'ticket', usedById: null, usedAt: null, pendingUserId: null };
	const tickets = {
		findOneBy: vi.fn().mockResolvedValue(ticket),
		update: vi.fn().mockResolvedValue({ affected: 1 }),
	};
	const pending = { insertOne: vi.fn().mockResolvedValue({ id: 'pending' }) };
	const email = {
		validateEmailForAccount: vi.fn().mockResolvedValue({ available: true }),
		sendEmail: vi.fn().mockResolvedValue(undefined),
	};
	const args = [
		{ url: 'https://example.test' },
		{ emailRequiredForSignup: true, disableRegistration: true, preservedUsernames: [] },
		{ exists: vi.fn().mockResolvedValue(false) },
		{}, pending,
		{ exists: vi.fn().mockResolvedValue(false) },
		tickets, {}, { gen: () => 'pending' }, {}, {}, {}, email,
	] as unknown as ConstructorParameters<typeof SignupApiService>;
	const service = new SignupApiService(...args);
	const request = {
		body: { username: 'testuser', password: 'test-password', emailAddress: 'test@example.test', invitationCode: 'invite' },
		ip: '192.0.2.1',
	} as Parameters<SignupApiService['signup']>[0];
	const reply = { code: vi.fn() };
	// Exercise invitation handling, which is intentionally disabled in NODE_ENV=test.
	vi.stubEnv('NODE_ENV', 'production');
	const signup = () => service.signup(request, reply as unknown as Parameters<SignupApiService['signup']>[1]);
	return { signup, tickets, pending, email, reply };
}

afterEach(() => vi.unstubAllEnvs());

describe('Signup invitation security with community mail', () => {
	test('preserves trilingual mail and audit metadata after claiming the invitation', async () => {
		const { signup, tickets, pending, email, reply } = setup();
		await signup();
		expect(reply.code).toHaveBeenCalledWith(204);
		expect(pending.insertOne).toHaveBeenCalledOnce();
		expect(tickets.update).toHaveBeenCalledWith('ticket', { pendingUserId: 'pending' });
		const [recipient, subject, html, text, audit] = email.sendEmail.mock.calls[0];
		expect(recipient).toBe('test@example.test');
		expect(subject).toBe('完成注册 / Complete signup / 登録を完了');
		for (const body of [html, text]) {
			expect(body).toContain('请点击下面的链接完成注册');
			expect(body).toContain('To complete signup');
			expect(body).toContain('登録を完了するには');
			expect(body).toContain('https://example.test/signup-complete/');
		}
		expect(audit).toEqual({ source: 'signup', category: 'account', requestIp: '192.0.2.1', username: 'testuser' });
	});

	test('does not create a pending account or send mail when another request claimed the invitation', async () => {
		const { signup, tickets, pending, email, reply } = setup();
		tickets.update.mockResolvedValue({ affected: 0 });
		await signup();
		expect(reply.code).toHaveBeenCalledWith(400);
		expect(pending.insertOne).not.toHaveBeenCalled();
		expect(email.sendEmail).not.toHaveBeenCalled();
	});

	test('releases the invitation if pending account creation fails', async () => {
		const { signup, tickets, pending, email } = setup();
		pending.insertOne.mockRejectedValue(new Error('test database failure'));
		await expect(signup()).rejects.toThrow('test database failure');
		expect(tickets.update).toHaveBeenLastCalledWith(
			expect.objectContaining({ id: 'ticket' }),
			{ usedAt: null, pendingUserId: null },
		);
		expect(email.sendEmail).not.toHaveBeenCalled();
	});
});
