/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const COMMUNITY_CHANGELOG_CHANNEL_ID = 'amyeg3148nr4001l';
export const COMMUNITY_CHANGELOG_PATH = '/community-changelog';

export const TANGCUYU_SERVER_UPDATES_CHANNEL_ID = 'amyb341g89zv001a';
export const TANGCUYU_SERVER_UPDATES_PATH = '/tangcuyu-server-updates';

const ADMIN_ONLY_CHANNEL_IDS = new Set<string>([
	COMMUNITY_CHANGELOG_CHANNEL_ID,
	TANGCUYU_SERVER_UPDATES_CHANNEL_ID,
]);

export function isAdminOnlyChannel(channelId: string): boolean {
	return ADMIN_ONLY_CHANNEL_IDS.has(channelId);
}
