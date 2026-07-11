/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const NOTE_WATERFALL_ITEM = 'noteWaterfall';
const EXPLORE_ITEM = 'explore';

export function normalizeNavbarMenu(items: readonly string[]): string[] {
	const normalized = items.filter(item => item !== NOTE_WATERFALL_ITEM);
	const exploreIndex = normalized.indexOf(EXPLORE_ITEM);

	if (exploreIndex >= 0) {
		normalized.splice(exploreIndex, 0, NOTE_WATERFALL_ITEM);
		return normalized;
	}

	const announcementsIndex = normalized.indexOf('announcements');
	if (announcementsIndex >= 0) {
		normalized.splice(announcementsIndex, 0, NOTE_WATERFALL_ITEM);
	} else {
		normalized.push(NOTE_WATERFALL_ITEM);
	}

	return normalized;
}
