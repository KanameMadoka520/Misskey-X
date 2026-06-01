/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const CHANNEL_POSTING_PERMISSIONS = ['everyone', 'ownerAndCollaborators', 'ownerOnly'] as const;

export type ChannelPostingPermission = typeof CHANNEL_POSTING_PERMISSIONS[number];

export const CHANNEL_POST_PERMISSION_ERROR_ID = 'e70b9962-22bd-46e5-8cf5-980e996d2dd8';

export function isChannelPostingPermission(value: unknown): value is ChannelPostingPermission {
	return typeof value === 'string' && CHANNEL_POSTING_PERMISSIONS.includes(value as ChannelPostingPermission);
}

