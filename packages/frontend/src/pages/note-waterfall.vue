<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="[]">
	<div class="_spacer" style="--MI_SPACER-w: 1200px;">
		<div class="_gaps">
			<div class="_panel" :class="$style.filters">
				<div :class="$style.filterGrid">
					<MkSelect v-model="order" :items="orderItems">
						<template #label>{{ i18n.ts._noteWaterfall.order }}</template>
					</MkSelect>
					<MkSelect v-model="image" :items="imageItems">
						<template #label>{{ i18n.ts._noteWaterfall.image }}</template>
					</MkSelect>
					<MkSelect v-model="relation" :items="relationItems">
						<template #label>{{ i18n.ts._noteWaterfall.authorRelation }}</template>
					</MkSelect>
					<MkSelect v-model="channel" :items="channelItems">
						<template #label>{{ i18n.ts._noteWaterfall.channelContent }}</template>
					</MkSelect>
					<MkRadios v-model="columns" :options="columnItems">
						<template #label>{{ i18n.ts._noteWaterfall.columns }}</template>
					</MkRadios>
				</div>

				<div :class="$style.userFilter">
					<div v-if="selectedUser" :class="$style.selectedUser">
						<MkUserCardMini :user="selectedUser" :withChart="false"/>
						<button v-tooltip="i18n.ts.remove" class="_button" :class="$style.clearUser" @click="clearUser">
							<i class="ti ti-x"></i>
						</button>
					</div>
					<MkButton v-else @click="selectUser"><i class="ti ti-user-search"></i> {{ i18n.ts._noteWaterfall.selectUser }}</MkButton>
					<MkButton v-if="order === 'random'" @click="reshuffle"><i class="ti ti-arrows-shuffle"></i> {{ i18n.ts._noteWaterfall.reshuffle }}</MkButton>
				</div>
			</div>

			<MkPagination :key="paginatorKey" :paginator="paginator" :pullToRefresh="true">
				<template #empty><MkResult type="empty" :text="i18n.ts.noNotes"/></template>

				<template #default="{ items }">
					<div :class="[$style.waterfall, columns === 3 ? $style.threeColumns : $style.twoColumns]">
						<div v-for="note in items" :key="note.id" :class="$style.noteCard">
							<MkNote :note="note" :withHardMute="true"/>
						</div>
					</div>
				</template>
			</MkPagination>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, markRaw, ref, shallowRef, watch } from 'vue';
import * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkNote from '@/components/MkNote.vue';
import MkPagination from '@/components/MkPagination.vue';
import MkRadios from '@/components/MkRadios.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkUserCardMini from '@/components/MkUserCardMini.vue';
import type { MkRadiosOption } from '@/components/MkRadios.vue';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { Paginator } from '@/utility/paginator.js';
import { genId } from '@/utility/id.js';

type WaterfallOrder = 'recent' | 'random';
type WaterfallImage = 'all' | 'with' | 'without';
type WaterfallRelation = 'all' | 'following' | 'unfollowed';
type WaterfallChannel = 'all' | 'followed' | 'excludeFollowed' | 'none';

const order = ref<WaterfallOrder>('random');
const image = ref<WaterfallImage>('all');
const relation = ref<WaterfallRelation>('all');
const channel = ref<WaterfallChannel>('all');
const columns = ref<2 | 3>(2);
const selectedUser = ref<Misskey.entities.UserDetailed | null>(null);
const seed = ref(genId());
const paginatorKey = ref(0);

const orderItems = computed(() => [
	{ label: i18n.ts._noteWaterfall.random, value: 'random' as const },
	{ label: i18n.ts._noteWaterfall.recent, value: 'recent' as const },
]);
const imageItems = computed(() => [
	{ label: i18n.ts.all, value: 'all' as const },
	{ label: i18n.ts._noteWaterfall.withImage, value: 'with' as const },
	{ label: i18n.ts._noteWaterfall.withoutImage, value: 'without' as const },
]);
const relationItems = computed(() => [
	{ label: i18n.ts.all, value: 'all' as const },
	{ label: i18n.ts._noteWaterfall.following, value: 'following' as const },
	{ label: i18n.ts._noteWaterfall.unfollowed, value: 'unfollowed' as const },
]);
const channelItems = computed(() => [
	{ label: i18n.ts._noteWaterfall.followedChannelsOnly, value: 'followed' as const },
	{ label: i18n.ts._noteWaterfall.allChannels, value: 'all' as const },
	{ label: i18n.ts._noteWaterfall.excludeFollowedChannels, value: 'excludeFollowed' as const },
	{ label: i18n.ts._noteWaterfall.excludeAllChannels, value: 'none' as const },
]);
const columnItems = computed<MkRadiosOption<2 | 3>[]>(() => [
	{ label: i18n.ts._noteWaterfall.twoColumns, value: 2 },
	{ label: i18n.ts._noteWaterfall.threeColumns, value: 3 },
]);

const params = computed(() => ({
	order: order.value,
	image: image.value,
	relation: relation.value,
	channel: channel.value,
	userId: selectedUser.value?.id ?? null,
	seed: seed.value,
}));

function createPaginator() {
	return markRaw(new Paginator('notes/waterfall', {
		computedParams: params,
		offsetMode: order.value === 'random',
		canFetchDetection: 'limit',
	}));
}

const paginator = shallowRef(createPaginator());

function resetPaginator() {
	paginator.value = createPaginator();
	paginatorKey.value++;
}

watch([order, image, relation, channel, () => selectedUser.value?.id], ([newOrder], [oldOrder]) => {
	if (newOrder !== oldOrder) seed.value = genId();
	resetPaginator();
});

async function selectUser() {
	selectedUser.value = await os.selectUser({ includeSelf: true, localOnly: true });
}

function clearUser() {
	selectedUser.value = null;
}

function reshuffle() {
	seed.value = genId();
	resetPaginator();
}

const headerActions = computed(() => [{
	icon: 'ti ti-refresh',
	text: i18n.ts.reload,
	handler: () => {
		if (order.value === 'random') reshuffle();
		else paginator.value.reload();
	},
}]);

definePage(() => ({
	title: i18n.ts.noteWaterfall,
	icon: 'ti ti-layout-columns',
}));
</script>

<style lang="scss" module>
.filters {
	padding: 16px;
	border-radius: 8px;
}

.filterGrid {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.userFilter {
	display: flex;
	align-items: center;
	flex-wrap: wrap;
	gap: 10px;
	margin-top: 14px;
}

.selectedUser {
	display: grid;
	grid-template-columns: minmax(220px, 360px) 36px;
	align-items: center;
	gap: 4px;
}

.clearUser {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
}

.waterfall {
	column-gap: 14px;
}

.twoColumns {
	column-count: 2;
}

.threeColumns {
	column-count: 3;
}

.noteCard {
	display: inline-block;
	width: 100%;
	margin: 0 0 14px;
	break-inside: avoid;
	background: var(--MI_THEME-panel);
	border-radius: 8px;
	overflow: hidden;
	vertical-align: top;
}

@media (max-width: 900px) {
	.filterGrid {
		grid-template-columns: repeat(2, minmax(0, 1fr));
	}

	.threeColumns {
		column-count: 2;
	}
}

@media (max-width: 600px) {
	.filterGrid {
		grid-template-columns: 1fr;
	}

	.twoColumns,
	.threeColumns {
		column-count: 1;
	}

	.selectedUser {
		grid-template-columns: minmax(0, 1fr) 36px;
		width: 100%;
	}
}
</style>
