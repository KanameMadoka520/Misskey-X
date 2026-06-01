<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div v-if="$i && channel" :class="$style.root" class="_panel">
	<MkA :to="`/channels/${channel.id}`" :class="$style.main">
		<div :class="$style.banner" :style="bannerStyle">
			<div :class="$style.bannerShade"></div>
			<i class="ti ti-device-tv"></i>
		</div>
		<div :class="$style.body">
			<div :class="$style.label">{{ i18n.ts._channelRecommendation.label }}</div>
			<div :class="$style.name">{{ channel.name }}</div>
			<div v-if="channel.description" :class="$style.description">{{ clippedDescription }}</div>
			<div :class="$style.meta">
				<span><i class="ti ti-users ti-fw"></i>{{ i18n.tsx._channel.usersCount({ n: channel.usersCount }) }}</span>
				<span><i class="ti ti-pencil ti-fw"></i>{{ i18n.tsx._channel.notesCount({ n: channel.notesCount }) }}</span>
			</div>
		</div>
	</MkA>
	<div :class="$style.actions">
		<MkButton rounded :disabled="wait" @click="ignoreForSevenDays">{{ i18n.ts._channelRecommendation.ignoreForSevenDays }}</MkButton>
		<MkButton primary rounded :disabled="wait" @click="follow">
			<template v-if="wait"><MkLoading :em="true"/></template>
			<template v-else><i class="ti ti-plus"></i> {{ i18n.ts.follow }}</template>
		</MkButton>
	</div>
</div>
</template>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue';
import * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import { misskeyApi } from '@/utility/misskey-api.js';
import { miLocalStorage } from '@/local-storage.js';
import { i18n } from '@/i18n.js';
import { $i } from '@/i.js';

const IGNORE_DAYS = 7;
const IGNORE_MS = 1000 * 60 * 60 * 24 * IGNORE_DAYS;
const IGNORE_KEY_PREFIX = 'channelRecommendationIgnoredUntil:';

const channel = ref<Misskey.entities.Channel | null>(null);
const wait = ref(false);

const clippedDescription = computed(() => {
	if (!channel.value?.description) return '';
	return channel.value.description.length > 120 ? `${channel.value.description.slice(0, 120)}...` : channel.value.description;
});

const bannerStyle = computed(() => {
	if (channel.value?.bannerUrl) {
		return { backgroundImage: `url(${channel.value.bannerUrl})` };
	}

	return { backgroundColor: channel.value?.color ?? 'var(--MI_THEME-accent)' };
});

function getIgnoredChannelIds(): string[] {
	const now = Date.now();
	const ids: string[] = [];

	for (let i = 0; i < window.localStorage.length; i++) {
		const key = window.localStorage.key(i);
		if (key == null || !key.startsWith(IGNORE_KEY_PREFIX)) continue;

		const ignoredUntil = Number(window.localStorage.getItem(key));
		const channelId = key.slice(IGNORE_KEY_PREFIX.length);

		if (Number.isFinite(ignoredUntil) && ignoredUntil > now) {
			ids.push(channelId);
		} else {
			window.localStorage.removeItem(key);
		}
	}

	return ids;
}

async function fetchRecommendation() {
	if (!$i) return;

	const channels = await misskeyApi<Misskey.entities.Channel[]>('channels/featured', {
		limit: 1,
		random: true,
		excludeFollowing: true,
		excludeChannelIds: getIgnoredChannelIds(),
	});

	channel.value = channels[0] ?? null;
}

async function follow() {
	if (!channel.value) return;

	wait.value = true;

	try {
		await misskeyApi('channels/follow', {
			channelId: channel.value.id,
		});
		await fetchRecommendation();
	} catch (err) {
		console.error(err);
	} finally {
		wait.value = false;
	}
}

async function ignoreForSevenDays() {
	if (!channel.value) return;

	wait.value = true;

	try {
		miLocalStorage.setItem(`${IGNORE_KEY_PREFIX}${channel.value.id}`, String(Date.now() + IGNORE_MS));
		await fetchRecommendation();
	} catch (err) {
		console.error(err);
	} finally {
		wait.value = false;
	}
}

onMounted(() => {
	fetchRecommendation();
});
</script>

<style lang="scss" module>
.root {
	overflow: hidden;
	background: var(--MI_THEME-panel);
}

.main {
	display: grid;
	grid-template-columns: 118px minmax(0, 1fr);
	color: inherit;

	&:hover {
		text-decoration: none;
	}
}

.banner {
	position: relative;
	min-height: 132px;
	background-position: center;
	background-size: cover;
	display: grid;
	place-items: center;
	color: #fff;
	font-size: 28px;
}

.bannerShade {
	position: absolute;
	inset: 0;
	background: color(from #000 srgb r g b / 0.35);
}

.banner > i {
	position: relative;
	z-index: 1;
	text-shadow: 0 1px 8px rgb(0 0 0 / 0.35);
}

.body {
	min-width: 0;
	padding: 16px;
}

.label {
	display: flex;
	align-items: center;
	gap: 0.35em;
	margin-bottom: 6px;
	color: var(--MI_THEME-accent);
	font-size: 85%;
	font-weight: 700;
}

.name {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-weight: 700;
	font-size: 1.1em;
}

.description {
	margin-top: 6px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 90%;
	line-height: 1.5;
	overflow-wrap: anywhere;
}

.meta {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 14px;
	margin-top: 10px;
	color: var(--MI_THEME-fgTransparentWeak);
	font-size: 85%;
}

.actions {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	padding: 12px 16px;
	border-top: solid 0.5px var(--MI_THEME-divider);
}

@container (max-width: 500px) {
	.main {
		grid-template-columns: 92px minmax(0, 1fr);
	}

	.banner {
		min-height: 118px;
	}

	.actions {
		flex-wrap: wrap;
	}
}
</style>
