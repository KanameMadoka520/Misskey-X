/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const COMMUNITY_CHANGELOG_CHANNEL_ID = 'amyeg3148nr4001l';
export const TANGCUYU_SERVER_UPDATES_CHANNEL_ID = 'amyb341g89zv001a';

const ADMIN_ONLY_CHANNEL_IDS = new Set<string>([
	COMMUNITY_CHANGELOG_CHANNEL_ID,
	TANGCUYU_SERVER_UPDATES_CHANNEL_ID,
]);

export const ADMIN_ONLY_CHANNEL_POST_PERMISSION_ERROR_ID = 'd91eb9b3-05b5-42c2-b2d0-c18871f9920e';

export function isAdminOnlyChannel(channelId: string): boolean {
	return ADMIN_ONLY_CHANNEL_IDS.has(channelId);
}
