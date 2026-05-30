/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as Misskey from 'misskey-js';

const NOTE_COLLAPSE_LINE_LIMIT = 20;
const NOTE_COLLAPSE_TEXT_LENGTH_LIMIT = 1500;
const NOTE_COLLAPSE_URL_COUNT_THRESHOLD = 8;
const NOTE_COLLAPSE_FILE_COUNT_THRESHOLD = 10;

export function shouldCollapsed(note: Misskey.entities.Note, urls: string[]): boolean {
	if (note.cw != null) {
		return false;
	}

	if (note.text != null) {
		if (
			note.text.includes('$[x2') ||
			note.text.includes('$[x3') ||
			note.text.includes('$[x4') ||
			note.text.includes('$[scale') ||
			note.text.split('\n').length > NOTE_COLLAPSE_LINE_LIMIT ||
			note.text.length > NOTE_COLLAPSE_TEXT_LENGTH_LIMIT
		) {
			return true;
		}
	}

	if (urls.length >= NOTE_COLLAPSE_URL_COUNT_THRESHOLD) {
		return true;
	}

	if (note.files != null && note.files.length >= NOTE_COLLAPSE_FILE_COUNT_THRESHOLD) {
		return true;
	}

	return false;
}
