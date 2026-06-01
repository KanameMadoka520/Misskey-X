<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :actions="headerActions" :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px;">
		<div v-if="channelId == null || channel != null" class="_gaps_m">
			<MkInput v-model="name">
				<template #label>{{ i18n.ts.name }}</template>
			</MkInput>

			<MkTextarea v-model="description" mfmAutocomplete :mfmPreview="true">
				<template #label>{{ i18n.ts.description }}</template>
			</MkTextarea>

			<MkColorInput v-model="color">
				<template #label>{{ i18n.ts.color }}</template>
			</MkColorInput>

			<MkSwitch v-model="isSensitive">
				<template #label>{{ i18n.ts.sensitive }}</template>
			</MkSwitch>

			<MkSwitch v-model="allowRenoteToExternal">
				<template #label>{{ i18n.ts._channel.allowRenoteToExternal }}</template>
			</MkSwitch>

			<MkSelect v-model="postingPermission" :items="postingPermissionDef">
				<template #label>{{ i18n.ts._channel.postingPermission }}</template>
				<template #caption>{{ i18n.ts._channel.postingPermissionDescription }}</template>
			</MkSelect>

			<div>
				<MkButton v-if="bannerId == null" @click="setBannerImage"><i class="ti ti-plus"></i> {{ i18n.ts._channel.setBanner }}</MkButton>
				<div v-else-if="bannerUrl">
					<img :src="bannerUrl" style="width: 100%;"/>
					<MkButton @click="removeBannerImage()"><i class="ti ti-trash"></i> {{ i18n.ts._channel.removeBanner }}</MkButton>
				</div>
			</div>

			<MkFolder :defaultOpen="true">
				<template #label>{{ i18n.ts.pinnedNotes }}</template>

				<div class="_gaps">
					<MkButton primary rounded @click="addPinnedNote()"><i class="ti ti-plus"></i></MkButton>

					<MkDraggable
						:modelValue="pinnedNoteIds.map(id => ({ id }))"
						direction="vertical"
						manualDragStart
						@update:modelValue="v => pinnedNoteIds = v.map(x => x.id)"
					>
						<template #default="{ item, dragStart }">
							<div :class="$style.pinnedNote">
								<button class="_button" :class="$style.pinnedNoteHandle" tabindex="-1" :draggable="true" @dragstart.stop="dragStart"><i class="ti ti-menu"></i></button>
								{{ item.id }}
								<button class="_button" :class="$style.pinnedNoteRemove" @click="removePinnedNote(item.id)"><i class="ti ti-x"></i></button>
							</div>
						</template>
					</MkDraggable>
				</div>
			</MkFolder>

			<MkFolder v-if="channelId" :defaultOpen="true">
				<template #label>{{ i18n.ts._channel.memberPermissions }}</template>

				<div class="_gaps">
					<div class="_gaps_s">
						<div :class="$style.sectionHeader">
							<div>
								<div :class="$style.sectionTitle">{{ i18n.ts._channel.owner }}</div>
								<div :class="$style.sectionCaption">{{ i18n.ts._channel.ownerDescription }}</div>
							</div>
							<MkButton v-if="$i?.isAdmin" small rounded @click="selectOwner()"><i class="ti ti-user-star"></i> {{ i18n.ts._channel.changeOwner }}</MkButton>
						</div>
						<MkUserCardMini v-if="ownerUser" :user="ownerUser" :withChart="false"/>
						<MkInfo v-else>{{ i18n.ts.noUsers }}</MkInfo>
					</div>

					<div class="_gaps_s">
						<div :class="$style.sectionHeader">
							<div>
								<div :class="$style.sectionTitle">{{ i18n.ts._channel.collaborators }}</div>
								<div :class="$style.sectionCaption">{{ i18n.ts._channel.collaboratorsDescription }}</div>
							</div>
							<MkButton small rounded @click="addCollaborator()"><i class="ti ti-user-plus"></i> {{ i18n.ts._channel.addCollaborator }}</MkButton>
						</div>

						<div v-if="collaboratorUsers.length > 0" class="_gaps_s">
							<div v-for="user in collaboratorUsers" :key="user.id" :class="$style.memberRow">
								<MkUserCardMini :user="user" :withChart="false" :class="$style.memberCard"/>
								<MkButton danger rounded iconOnly @click="removeCollaborator(user.id)"><i class="ti ti-x"></i></MkButton>
							</div>
						</div>
						<MkInfo v-else>{{ i18n.ts._channel.noCollaborators }}</MkInfo>
					</div>
				</div>
			</MkFolder>

			<div class="_buttons">
				<MkButton primary @click="save()"><i class="ti ti-device-floppy"></i> {{ channelId ? i18n.ts.save : i18n.ts.create }}</MkButton>
				<MkButton v-if="channelId" danger @click="archive()"><i class="ti ti-trash"></i> {{ i18n.ts.archive }}</MkButton>
			</div>
		</div>
	</div>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import * as Misskey from 'misskey-js';
import MkButton from '@/components/MkButton.vue';
import MkInput from '@/components/MkInput.vue';
import MkColorInput from '@/components/MkColorInput.vue';
import { selectFile } from '@/utility/drive.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { definePage } from '@/page.js';
import { i18n } from '@/i18n.js';
import MkFolder from '@/components/MkFolder.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkTextarea from '@/components/MkTextarea.vue';
import MkDraggable from '@/components/MkDraggable.vue';
import MkSelect from '@/components/MkSelect.vue';
import MkUserCardMini from '@/components/MkUserCardMini.vue';
import MkInfo from '@/components/MkInfo.vue';
import { useRouter } from '@/router.js';
import { $i } from '@/i.js';

const router = useRouter();

type ChannelPostingPermission = 'everyone' | 'ownerAndCollaborators' | 'ownerOnly';
type ChannelWithPermissions = Misskey.entities.Channel & {
	postingPermission?: ChannelPostingPermission;
	collaboratorUserIds?: string[];
};
type ChannelUsersResponse = {
	owner: Misskey.entities.User | null;
	collaborators: Misskey.entities.User[];
	followers: Misskey.entities.User[];
};

const props = defineProps<{
	channelId?: string;
}>();

const channel = ref<ChannelWithPermissions | null>(null);
const name = ref<string>('');
const description = ref<string | null>(null);
const bannerUrl = ref<string | null>(null);
const bannerId = ref<string | null>(null);
const color = ref('#000');
const isSensitive = ref(false);
const allowRenoteToExternal = ref(true);
const postingPermission = ref<ChannelPostingPermission>('everyone');
const pinnedNoteIds = ref<Misskey.entities.Note['id'][]>([]);
const ownerUser = ref<Misskey.entities.User | null>(null);
const collaboratorUsers = ref<Misskey.entities.User[]>([]);
const postingPermissionDef = [
	{ label: i18n.ts._channel.postingPermissionEveryone, value: 'everyone' },
	{ label: i18n.ts._channel.postingPermissionOwnerAndCollaborators, value: 'ownerAndCollaborators' },
	{ label: i18n.ts._channel.postingPermissionOwnerOnly, value: 'ownerOnly' },
];

watch(() => bannerId.value, async () => {
	if (bannerId.value == null) {
		bannerUrl.value = null;
	} else {
		bannerUrl.value = (await misskeyApi('drive/files/show', {
			fileId: bannerId.value,
		})).url;
	}
});

async function fetchChannel() {
	if (props.channelId == null) return;

	const result = await misskeyApi('channels/show', {
		channelId: props.channelId,
	});

	name.value = result.name;
	description.value = result.description;
	bannerId.value = result.bannerId;
	bannerUrl.value = result.bannerUrl;
	isSensitive.value = result.isSensitive;
	pinnedNoteIds.value = result.pinnedNoteIds;
	color.value = result.color;
	allowRenoteToExternal.value = result.allowRenoteToExternal;
	postingPermission.value = (result as ChannelWithPermissions).postingPermission ?? 'everyone';

	channel.value = result as ChannelWithPermissions;
	await fetchChannelUsers();
}

fetchChannel();

async function addPinnedNote() {
	const { canceled, result: value } = await os.inputText({
		title: i18n.ts.noteIdOrUrl,
	});
	if (canceled || value == null) return;
	const fromUrl = value.includes('/') ? value.split('/').pop() : null;
	const note = await os.apiWithDialog('notes/show', {
		noteId: fromUrl ?? value,
	});
	pinnedNoteIds.value.unshift(note.id);
}

function removePinnedNote(id: string) {
	pinnedNoteIds.value = pinnedNoteIds.value.filter(x => x !== id);
}

async function fetchChannelUsers() {
	if (props.channelId == null) return;

	const result = await misskeyApi<ChannelUsersResponse>('channels/users' as any, {
		channelId: props.channelId,
		limit: 1,
		offset: 0,
	} as any);

	ownerUser.value = result.owner;
	collaboratorUsers.value = result.collaborators;
}

async function selectOwner() {
	const user = await os.selectUser({ includeSelf: true, localOnly: true });
	ownerUser.value = user;
	collaboratorUsers.value = collaboratorUsers.value.filter(x => x.id !== user.id);
}

async function addCollaborator() {
	const user = await os.selectUser({ includeSelf: true, localOnly: true });
	if (ownerUser.value?.id === user.id) return;
	if (collaboratorUsers.value.some(x => x.id === user.id)) return;
	collaboratorUsers.value = [...collaboratorUsers.value, user];
}

function removeCollaborator(userId: string) {
	collaboratorUsers.value = collaboratorUsers.value.filter(x => x.id !== userId);
}

async function save() {
	const params = {
		name: name.value,
		description: description.value,
		bannerId: bannerId.value,
		color: color.value,
		isSensitive: isSensitive.value,
		allowRenoteToExternal: allowRenoteToExternal.value,
		postingPermission: postingPermission.value,
	};

	if (props.channelId != null) {
		await os.apiWithDialog('channels/update', {
			...params,
			channelId: props.channelId,
			pinnedNoteIds: pinnedNoteIds.value,
			...($i?.isAdmin && ownerUser.value ? { userId: ownerUser.value.id } : {}),
			collaboratorUserIds: collaboratorUsers.value.map(user => user.id),
		} as any);
		await fetchChannel();
	} else {
		os.apiWithDialog('channels/create', params as any).then(created => {
			router.push('/channels/:channelId', {
				params: {
					channelId: created.id,
				},
			});
		});
	}
}

async function archive() {
	if (props.channelId == null) return;

	const { canceled } = await os.confirm({
		type: 'warning',
		title: i18n.tsx.channelArchiveConfirmTitle({ name: name.value }),
		text: i18n.ts.channelArchiveConfirmDescription,
	});
	if (canceled) return;

	misskeyApi('channels/update', {
		channelId: props.channelId,
		isArchived: true,
	}).then(() => {
		os.success();
	});
}

function setBannerImage(evt: PointerEvent) {
	selectFile({
		anchorElement: evt.currentTarget ?? evt.target,
		multiple: false,
	}).then(file => {
		bannerId.value = file.id;
	});
}

function removeBannerImage() {
	bannerId.value = null;
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage(() => ({
	title: props.channelId ? i18n.ts._channel.edit : i18n.ts._channel.create,
	icon: 'ti ti-device-tv',
}));
</script>

<style lang="scss" module>
.pinnedNote {
	position: relative;
	display: block;
	line-height: 2.85rem;
	text-overflow: ellipsis;
	overflow: hidden;
	white-space: nowrap;
	color: var(--MI_THEME-navFg);
}

.pinnedNoteRemove {
	position: absolute;
	z-index: 10000;
	width: 32px;
	height: 32px;
	color: #ff2a2a;
	right: 8px;
	opacity: 0.8;
}

.pinnedNoteHandle {
	cursor: move;
	width: 32px;
	height: 32px;
	margin: 0 8px;
	opacity: 0.5;
}

.sectionHeader {
	display: flex;
	gap: 12px;
	align-items: center;
	justify-content: space-between;
}

.sectionTitle {
	font-weight: 700;
}

.sectionCaption {
	margin-top: 2px;
	font-size: 0.85em;
	opacity: 0.7;
}

.memberRow {
	display: flex;
	gap: 8px;
	align-items: center;
}

.memberCard {
	flex: 1;
	min-width: 0;
}
</style>
