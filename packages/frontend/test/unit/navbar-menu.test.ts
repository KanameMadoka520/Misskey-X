/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import { describe, expect, test } from 'vitest';
import { normalizeNavbarMenu } from '@/utility/navbar-menu.js';

describe('normalizeNavbarMenu', () => {
	test('inserts the waterfall immediately before explore', () => {
		expect(normalizeNavbarMenu(['notifications', '-', 'explore', 'announcements'])).toEqual([
			'notifications',
			'-',
			'noteWaterfall',
			'explore',
			'announcements',
		]);
	});

	test('moves an existing waterfall item and removes duplicates', () => {
		expect(normalizeNavbarMenu(['noteWaterfall', 'explore', 'noteWaterfall'])).toEqual([
			'noteWaterfall',
			'explore',
		]);
	});

	test('keeps the waterfall visible when explore is hidden', () => {
		expect(normalizeNavbarMenu(['notifications', 'announcements'])).toEqual([
			'notifications',
			'noteWaterfall',
			'announcements',
		]);
	});
});
