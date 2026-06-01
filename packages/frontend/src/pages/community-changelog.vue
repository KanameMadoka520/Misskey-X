<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader>
	<div class="_spacer" style="--MI_SPACER-w: 700px;">
		<div v-if="channel" class="_gaps">
			<MkPostForm v-if="$i?.isAdmin && prefer.r.showFixedPostFormInChannel.value" :channel="channel" class="post-form _panel" fixed :autofocus="deviceKind === 'desktop'"/>
			<MkStreamingNotesTimeline :key="channel.id" src="channel" :channel="channel.id"/>
		</div>
		<MkError v-else-if="error" @retry="fetchChannel()"/>
		<MkLoading v-else/>
	</div>
	<template #footer>
		<div v-if="$i?.isAdmin && channel" :class="$style.footer">
			<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<div class="_buttonsCenter">
					<MkButton inline rounded primary gradate @click="openPostForm()"><i class="ti ti-pencil"></i> {{ i18n.ts.postToTheChannel }}</MkButton>
				</div>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import * as Misskey from 'misskey-js';
import MkPostForm from '@/components/MkPostForm.vue';
import MkStreamingNotesTimeline from '@/components/MkStreamingNotesTimeline.vue';
import MkButton from '@/components/MkButton.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { $i } from '@/i.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { deviceKind } from '@/utility/device-kind.js';
import { prefer } from '@/preferences.js';
import { COMMUNITY_CHANGELOG_CHANNEL_ID } from '@/community-changelog.js';

const channel = ref<Misskey.entities.Channel | null>(null);
const error = ref<any>(null);

async function fetchChannel() {
	channel.value = null;
	error.value = null;

	try {
		channel.value = await misskeyApi('channels/show', {
			channelId: COMMUNITY_CHANGELOG_CHANNEL_ID,
		});
	} catch (err) {
		error.value = err;
	}
}

function openPostForm() {
	if (!channel.value) return;
	os.post({
		channel: channel.value,
	});
}

onMounted(fetchChannel);

definePage(() => ({
	title: i18n.ts.communityChangelog,
	icon: 'ti ti-clipboard-list',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
	background: color(from var(--MI_THEME-bg) srgb r g b / 0.5);
	border-top: solid 0.5px var(--MI_THEME-divider);
}
</style>
