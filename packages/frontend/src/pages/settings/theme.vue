<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/theme" :label="i18n.ts.theme" :keywords="['theme']" icon="ti ti-palette">
	<div
		class="_gaps_m"
		@dragover.prevent.stop="onDragover"
		@drop.prevent.stop="onDrop"
	>
		<div v-if="experimentalTheme == null" v-adaptive-border class="rfqxtzch _panel">
			<div class="toggle">
				<div class="toggleWrapper">
					<div class="toggle" :class="store.r.darkMode.value ? 'checked' : null" @click="toggleDarkMode()">
						<span class="before">{{ i18n.ts.light }}</span>
						<span class="after">{{ i18n.ts.dark }}</span>
						<span class="toggle__handler">
							<span class="crater crater--1"></span>
							<span class="crater crater--2"></span>
							<span class="crater crater--3"></span>
						</span>
						<span class="star star--1"></span>
						<span class="star star--2"></span>
						<span class="star star--3"></span>
						<span class="star star--4"></span>
						<span class="star star--5"></span>
						<span class="star star--6"></span>
					</div>
				</div>
			</div>
			<div class="sync">
				<SearchMarker :keywords="['sync', 'device', 'dark', 'light', 'mode']">
					<MkSwitch v-model="syncDeviceDarkMode">
						<template #label><SearchLabel>{{ i18n.ts.syncDeviceDarkMode }}</SearchLabel></template>
					</MkSwitch>
				</SearchMarker>
			</div>
		</div>

		<MkInfo v-if="isSafeMode" warn>{{ i18n.ts.themeIsDefaultBecauseSafeMode }}</MkInfo>

		<MkInfo v-if="!isSafeMode && experimentalTheme != null">
			<b>实验性主题已接管前端外观。</b>当前已忽略浅色 / 深色模式与所有颜色主题，整套配色由实验性主题独立提供。如需恢复普通配色，请在下方将实验性主题切换为「关闭」。
		</MkInfo>

		<SearchMarker v-if="!isSafeMode" :keywords="['experimental', 'theme', 'lab', 'xtcymc', '实验性', '主题']">
			<MkFolder :defaultOpen="experimentalTheme != null" :max-height="600">
				<template #icon><i class="ti ti-flask"></i></template>
				<template #label><SearchLabel>实验性主题（Xtcymc Lab）</SearchLabel></template>
				<template #caption>{{ experimentalThemeName }}</template>

				<div class="_gaps_m">
					<MkInfo>
						实验性主题会用一整套激进的设计语言覆盖前端，启用后会忽略当前选中的浅色/深色配色与颜色主题，但所有功能与信息条目都保留。切换实验性主题会自动刷新页面让样式完整生效。
					</MkInfo>
					<div :class="$style.themeSelect">
						<div :class="$style.themeItemOuter">
							<input
								id="xtcymcExpRadio_none"
								v-model="experimentalThemeChoice"
								type="radio"
								name="xtcymcExpTheme"
								:class="$style.themeRadio"
								:value="null"
							/>
							<label for="xtcymcExpRadio_none" :class="$style.themeItemRoot" class="_button">
								<div :class="$style.expCard" style="background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%); color: #333;">
									<i class="ti ti-x" style="font-size: 32px; opacity: .7;"></i>
									<div style="font-weight: 700; margin-top: 8px;">关闭</div>
									<div style="font-size: 11.5px; opacity: .65; margin-top: 4px; line-height: 1.4;">使用上方选择的颜色主题</div>
								</div>
								<div :class="$style.themeItemCaption">关闭实验性主题</div>
							</label>
						</div>
						<div v-for="exp in experimentalThemes" :key="exp.id" :class="$style.themeItemOuter">
							<input
								:id="`xtcymcExpRadio_${exp.id}`"
								v-model="experimentalThemeChoice"
								type="radio"
								name="xtcymcExpTheme"
								:class="$style.themeRadio"
								:value="exp.id"
							/>
							<label :for="`xtcymcExpRadio_${exp.id}`" :class="$style.themeItemRoot" class="_button">
								<div :class="[$style.expCard, $style[`expCard_${exp.id}`]]">
									<i :class="exp.icon" style="font-size: 32px;"></i>
									<div style="font-weight: 700; margin-top: 8px;">{{ exp.name }}</div>
									<div style="font-size: 11.5px; opacity: .85; margin-top: 4px; line-height: 1.4;">{{ exp.tagline }}</div>
								</div>
								<div :class="$style.themeItemCaption">{{ exp.name }}</div>
							</label>
						</div>
					</div>
					<MkSwitch v-if="experimentalTheme != null" v-model="experimentalBg">
						<template #label>实验性主题背景与动效</template>
						<template #caption>开启后该实验性主题会更激进地扩张自己的设计 —— 动画背景、微动效、更大胆的组件处理与过场，让主题更具张力。立即生效，无需刷新；关闭即回到安静版本。</template>
					</MkSwitch>
				</div>
			</MkFolder>
		</SearchMarker>

		<div v-if="!isSafeMode && experimentalTheme == null" class="_gaps">
			<template v-if="!store.r.darkMode.value">
				<SearchMarker :keywords="['light', 'theme']">
					<MkFolder :defaultOpen="true" :max-height="500">
						<template #icon><i class="ti ti-sun"></i></template>
						<template #label><SearchLabel>{{ i18n.ts.themeForLightMode }}</SearchLabel></template>
						<template #caption>{{ lightThemeName }}</template>

						<div class="_gaps_m">
							<FormSection v-if="instanceLightTheme != null" first>
								<template #label>{{ i18n.ts._theme.instanceTheme }}</template>
								<div :class="$style.themeSelect">
									<div :class="$style.themeItemOuter">
										<input
											:id="`themeRadio_${instanceLightTheme.id}`"
											v-model="lightThemeId"
											type="radio"
											name="lightTheme"
											:class="$style.themeRadio"
											:value="instanceLightTheme.id"
										/>
										<label :for="`themeRadio_${instanceLightTheme.id}`" :class="$style.themeItemRoot" class="_button" draggable="true" @dragstart="onThemeDragstart($event, instanceLightTheme)" @contextmenu.prevent.stop="onThemeContextmenu(instanceLightTheme, $event)">
											<MkThemePreview :theme="instanceLightTheme" :class="$style.themeItemPreview"/>
											<div :class="$style.themeItemCaption">{{ instanceLightTheme.name }}</div>
										</label>
									</div>
								</div>
							</FormSection>

							<FormSection v-if="installedLightThemes.length > 0" :first="instanceLightTheme == null">
								<template #label>{{ i18n.ts._theme.installedThemes }}</template>
								<div :class="$style.themeSelect">
									<div v-for="theme in installedLightThemes" :class="$style.themeItemOuter">
										<input
											:id="`themeRadio_${theme.id}`"
											v-model="lightThemeId"
											type="radio"
											name="lightTheme"
											:class="$style.themeRadio"
											:value="theme.id"
										/>
										<label :for="`themeRadio_${theme.id}`" :class="$style.themeItemRoot" class="_button" draggable="true" @dragstart="onThemeDragstart($event, theme)" @contextmenu.prevent.stop="onThemeContextmenu(theme, $event)">
											<MkThemePreview :theme="theme" :class="$style.themeItemPreview"/>
											<div :class="$style.themeItemCaption">{{ theme.name }}</div>
										</label>
									</div>
								</div>
							</FormSection>

							<FormSection :first="installedLightThemes.length === 0 && instanceLightTheme == null">
								<template #label>{{ i18n.ts._theme.builtinThemes }}</template>
								<div :class="$style.themeSelect">
									<div v-for="theme in builtinLightThemes" :class="$style.themeItemOuter">
										<input
											:id="`themeRadio_${theme.id}`"
											v-model="lightThemeId"
											type="radio"
											name="lightTheme"
											:class="$style.themeRadio"
											:value="theme.id"
										/>
										<label :for="`themeRadio_${theme.id}`" :class="$style.themeItemRoot" class="_button" draggable="true" @dragstart="onThemeDragstart($event, theme)" @contextmenu.prevent.stop="onThemeContextmenu(theme, $event)">
											<MkThemePreview :theme="theme" :class="$style.themeItemPreview"/>
											<div :class="$style.themeItemCaption">{{ theme.name }}</div>
										</label>
									</div>
								</div>
							</FormSection>
						</div>
					</MkFolder>
				</SearchMarker>
			</template>
			<template v-else>
				<SearchMarker :keywords="['dark', 'theme']">
					<MkFolder :defaultOpen="true" :max-height="500">
						<template #icon><i class="ti ti-moon"></i></template>
						<template #label><SearchLabel>{{ i18n.ts.themeForDarkMode }}</SearchLabel></template>
						<template #caption>{{ darkThemeName }}</template>

						<div class="_gaps_m">
							<FormSection v-if="instanceDarkTheme != null" first>
								<template #label>{{ i18n.ts._theme.instanceTheme }}</template>
								<div :class="$style.themeSelect">
									<div :class="$style.themeItemOuter">
										<input
											:id="`themeRadio_${instanceDarkTheme.id}`"
											v-model="darkThemeId"
											type="radio"
											name="darkTheme"
											:class="$style.themeRadio"
											:value="instanceDarkTheme.id"
										/>
										<label :for="`themeRadio_${instanceDarkTheme.id}`" :class="$style.themeItemRoot" class="_button" draggable="true" @dragstart="onThemeDragstart($event, instanceDarkTheme)" @contextmenu.prevent.stop="onThemeContextmenu(instanceDarkTheme, $event)">
											<MkThemePreview :theme="instanceDarkTheme" :class="$style.themeItemPreview"/>
											<div :class="$style.themeItemCaption">{{ instanceDarkTheme.name }}</div>
										</label>
									</div>
								</div>
							</FormSection>

							<FormSection v-if="installedDarkThemes.length > 0" :first="instanceDarkTheme == null">
								<template #label>{{ i18n.ts._theme.installedThemes }}</template>
								<div :class="$style.themeSelect">
									<div v-for="theme in installedDarkThemes" :class="$style.themeItemOuter">
										<input
											:id="`themeRadio_${theme.id}`"
											v-model="darkThemeId"
											type="radio"
											name="darkTheme"
											:class="$style.themeRadio"
											:value="theme.id"
										/>
										<label :for="`themeRadio_${theme.id}`" :class="$style.themeItemRoot" class="_button" draggable="true" @dragstart="onThemeDragstart($event, theme)" @contextmenu.prevent.stop="onThemeContextmenu(theme, $event)">
											<MkThemePreview :theme="theme" :class="$style.themeItemPreview"/>
											<div :class="$style.themeItemCaption">{{ theme.name }}</div>
										</label>
									</div>
								</div>
							</FormSection>

							<FormSection :first="installedDarkThemes.length === 0 && instanceDarkTheme == null">
								<template #label>{{ i18n.ts._theme.builtinThemes }}</template>
								<div :class="$style.themeSelect">
									<div v-for="theme in builtinDarkThemes" :class="$style.themeItemOuter">
										<input
											:id="`themeRadio_${theme.id}`"
											v-model="darkThemeId"
											type="radio"
											name="darkTheme"
											:class="$style.themeRadio"
											:value="theme.id"
										/>
										<label :for="`themeRadio_${theme.id}`" :class="$style.themeItemRoot" class="_button" draggable="true" @dragstart="onThemeDragstart($event, theme)" @contextmenu.prevent.stop="onThemeContextmenu(theme, $event)">
											<MkThemePreview :theme="theme" :class="$style.themeItemPreview"/>
											<div :class="$style.themeItemCaption">{{ theme.name }}</div>
										</label>
									</div>
								</div>
							</FormSection>
						</div>
					</MkFolder>
				</SearchMarker>
			</template>
		</div>

		<SearchMarker :keywords="['sync', 'themes', 'devices']">
			<MkSwitch :modelValue="themesSyncEnabled" @update:modelValue="changeThemesSyncEnabled">
				<template #label><i class="ti ti-cloud-cog"></i> <SearchLabel>{{ i18n.ts._settings.enableSyncThemesBetweenDevices }}</SearchLabel></template>
			</MkSwitch>
		</SearchMarker>

		<FormSection>
			<div class="_formLinksGrid">
				<FormLink to="/settings/theme/manage"><template #icon><i class="ti ti-tool"></i></template>{{ i18n.ts._theme.manage }}<template #suffix>{{ themesCount }}</template></FormLink>
				<FormLink to="https://assets.misskey.io/theme/list" external><template #icon><i class="ti ti-world"></i></template>{{ i18n.ts._theme.explore }}</FormLink>
				<FormLink to="/settings/theme/install"><template #icon><i class="ti ti-download"></i></template>{{ i18n.ts._theme.install }}</FormLink>
				<FormLink to="/theme-editor"><template #icon><i class="ti ti-paint"></i></template>{{ i18n.ts._theme.make }}</FormLink>
			</div>
		</FormSection>
	</div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { computed, ref, watch } from 'vue';
import JSON5 from 'json5';
import defaultLightTheme from '@@/themes/l-light.json5';
import defaultDarkTheme from '@@/themes/d-green-lime.json5';
import { isSafeMode } from '@@/js/config.js';
import type { Theme } from '@@/js/theme.js';
import * as os from '@/os.js';
import MkSwitch from '@/components/MkSwitch.vue';
import FormSection from '@/components/form/section.vue';
import FormLink from '@/components/form/link.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkThemePreview from '@/components/MkThemePreview.vue';
import MkInfo from '@/components/MkInfo.vue';
import { handleThemeInstallError, installTheme, removeTheme } from '@/theme.js';
import { getBuiltinThemes } from '@@/js/theme.js';
import { EXPERIMENTAL_THEMES, setExperimentalTheme, readSavedExperimentalTheme, setExperimentalBg, readSavedExperimentalBg, type ExperimentalThemeId } from '@/experimental-theme.js';
import { isDeviceDarkmode } from '@/utility/is-device-darkmode.js';
import { store } from '@/store.js';
import { i18n } from '@/i18n.js';
import { instance } from '@/instance.js';
import { uniqueBy } from '@/utility/array.js';
import { definePage } from '@/page.js';
import { prefer } from '@/preferences.js';
import { copyToClipboard } from '@/utility/copy-to-clipboard.js';
import { checkDragDataType, getDragData, getPlainDragData, setDragData, setPlainDragData } from '@/drag-and-drop.js';

const installedThemes = prefer.r.themes;
const builtinThemes = ref<Theme[]>([]);
getBuiltinThemes().then(themes => {
	builtinThemes.value = themes;
});

const instanceDarkTheme = computed<Theme | null>(() => instance.defaultDarkTheme ? JSON5.parse(instance.defaultDarkTheme) : null);
const installedDarkThemes = computed(() => installedThemes.value.filter(t => t.base === 'dark' || t.kind === 'dark'));
const builtinDarkThemes = computed(() => builtinThemes.value.filter(t => t.base === 'dark' || t.kind === 'dark'));
const instanceLightTheme = computed<Theme | null>(() => instance.defaultLightTheme ? JSON5.parse(instance.defaultLightTheme) : null);
const installedLightThemes = computed(() => installedThemes.value.filter(t => t.base === 'light' || t.kind === 'light'));
const builtinLightThemes = computed(() => builtinThemes.value.filter(t => t.base === 'light' || t.kind === 'light'));
const themes = computed(() => uniqueBy([instanceDarkTheme.value, instanceLightTheme.value, ...builtinThemes.value, ...installedThemes.value].filter(x => x != null), theme => theme.id));

const darkTheme = prefer.r.darkTheme;
const darkThemeName = computed(() => darkTheme.value?.name ?? defaultDarkTheme.name);
const darkThemeId = computed({
	get() {
		return darkTheme.value ? darkTheme.value.id : defaultDarkTheme.id;
	},
	set(id) {
		const t = themes.value.find(x => x.id === id);
		if (t) { // テーマエディタでテーマを作成したときなどは、themesに反映されないため undefined になる
			prefer.commit('darkTheme', t);
		}
	},
});
const lightTheme = prefer.r.lightTheme;
const lightThemeName = computed(() => lightTheme.value?.name ?? defaultLightTheme.name);
const lightThemeId = computed({
	get() {
		return lightTheme.value ? lightTheme.value.id : defaultLightTheme.id;
	},
	set(id) {
		const t = themes.value.find(x => x.id === id);
		if (t) { // テーマエディタでテーマを作成したときなどは、themesに反映されないため undefined になる
			prefer.commit('lightTheme', t);
		}
	},
});

const syncDeviceDarkMode = prefer.model('syncDeviceDarkMode');
const themesCount = installedThemes.value.length;

// === Xtcymc 实验性主题 ===
const experimentalThemes = EXPERIMENTAL_THEMES;
const experimentalTheme = ref<string | null>(readSavedExperimentalTheme());
const experimentalThemeName = computed(() => {
	if (experimentalTheme.value == null) return '关闭';
	return EXPERIMENTAL_THEMES.find(t => t.id === experimentalTheme.value)?.name ?? '关闭';
});
const experimentalThemeChoice = computed({
	get: () => experimentalTheme.value,
	set: (value) => {
		const newVal = (value ?? null) as ExperimentalThemeId | null;
		if (newVal === experimentalTheme.value) return;
		experimentalTheme.value = newVal;
		setExperimentalTheme(newVal);
		prefer.commit('experimentalTheme', newVal);
		// 切换实验性主题需要 reload 让所有 Vue 组件用新 CSS 重新 mount
		// 否则部分在 mount 期计算 DOM 尺寸的组件可能保留旧布局
		window.setTimeout(() => window.location.reload(), 150);
	},
});

// 「背景与动效」开关：纯 CSS 即时生效，无需 reload
// 用 ref 持有状态（localStorage 非响应式，若 computed 的 getter 直接读它，
// 切换后 computed 不会失效重算 → 开关 UI 卡在旧值不动）。
const experimentalBg = ref<boolean>(readSavedExperimentalBg());
watch(experimentalBg, (value) => {
	setExperimentalBg(value);
	prefer.commit('experimentalThemeBg', value);
});

watch(syncDeviceDarkMode, () => {
	if (syncDeviceDarkMode.value) {
		store.set('darkMode', isDeviceDarkmode());
	}
});

async function toggleDarkMode() {
	const value = !store.r.darkMode.value;
	if (syncDeviceDarkMode.value) {
		const { canceled } = await os.confirm({
			type: 'question',
			text: i18n.tsx.switchDarkModeManuallyWhenSyncEnabledConfirm({ x: i18n.ts.syncDeviceDarkMode }),
		});
		if (canceled) return;

		syncDeviceDarkMode.value = false;
		store.set('darkMode', value);
	} else {
		store.set('darkMode', value);
	}
}

const themesSyncEnabled = ref(prefer.isSyncEnabled('themes'));

function changeThemesSyncEnabled(value: boolean) {
	if (value) {
		prefer.enableSync('themes').then((res) => {
			if (res == null) return;
			if (res.enabled) themesSyncEnabled.value = true;
		});
	} else {
		prefer.disableSync('themes');
		themesSyncEnabled.value = false;
	}
}

function onThemeContextmenu(theme: Theme, ev: PointerEvent) {
	os.contextMenu([{
		type: 'label',
		text: theme.name,
	}, {
		icon: 'ti ti-clipboard',
		text: i18n.ts._theme.copyThemeCode,
		action: () => {
			copyToClipboard(JSON5.stringify(theme, null, '\t'));
		},
	}, {
		icon: 'ti ti-trash',
		text: i18n.ts.delete,
		danger: true,
		action: () => {
			removeTheme(theme);
		},
	}], ev);
}

function onThemeDragstart(ev: DragEvent, theme: Theme) {
	if (!ev.dataTransfer) return;

	ev.dataTransfer.effectAllowed = 'copy';
	setPlainDragData(ev, JSON5.stringify(theme, null, '\t'));
}

function onDragover(ev: DragEvent) {
	if (!ev.dataTransfer) return;

	if (ev.dataTransfer.types[0] === 'text/plain') {
		ev.dataTransfer.dropEffect = 'copy';
	} else {
		ev.dataTransfer.dropEffect = 'none';
	}

	return false;
}

async function onDrop(ev: DragEvent) {
	if (!ev.dataTransfer) return;

	const code = getPlainDragData(ev);
	if (code != null) {
		try {
			await installTheme(code);
		} catch (err) {
			handleThemeInstallError(err);
		}
	}
}

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts.theme,
	icon: 'ti ti-palette',
}));
</script>

<style module>
.themeSelect {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
	gap: var(--MI-margin);
}

.themeItemOuter {
	position: relative;
}

.themeRadio {
	position: absolute;
	clip: rect(0, 0, 0, 0);
	pointer-events: none;
}

.themeItemRoot {
	position: relative;
	display: block;
	overflow: clip;
	box-sizing: border-box;
	border: 2px solid var(--MI_THEME-divider);
	border-radius: var(--MI-radius);
}

/* === Xtcymc 实验性主题预览卡片 === */
.expCard {
	aspect-ratio: 16 / 9;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 4px;
	padding: 14px 12px;
	text-align: center;
	color: #fff;
}
.expCard_newsprint {
	background: #FFFDF5;
	color: #1A1612;
	border-bottom: 3px double #1A1612;
	font-family: "Source Serif Pro", Georgia, serif;
}
.expCard_terminal {
	background: #0A0E14;
	color: #00FF88;
	font-family: "JetBrains Mono", Consolas, monospace;
	box-shadow: 0 0 24px rgba(0, 255, 136, .15) inset;
}
.expCard_glass {
	background:
		radial-gradient(circle at 30% 30%, rgba(107, 63, 160, .6), transparent 60%),
		radial-gradient(circle at 70% 70%, rgba(46, 143, 184, .6), transparent 60%),
		linear-gradient(135deg, #FFE6FB 0%, #E0F4FF 50%, #FFE0E8 100%);
	color: #1A1233;
	backdrop-filter: blur(10px);
}
.expCard_brutalist {
	background: #FFD9C2;
	color: #000;
	border: 3px solid #000;
	box-shadow: 6px 6px 0 #FF3D00;
	font-weight: 900;
	text-transform: uppercase;
}
.expCard_synthwave {
	background: linear-gradient(180deg, #2A0E4F 0%, #1A0B2E 60%, #3A1156 100%);
	color: #FF2E97;
	border: 1px solid #00E5FF;
	text-shadow: 0 0 8px rgba(255,46,151,.7);
}
.expCard_aurora {
	background: radial-gradient(circle at 30% 20%, rgba(94,234,212,.5), transparent 60%), radial-gradient(circle at 70% 80%, rgba(167,139,250,.5), transparent 60%), #04121C;
	color: #5EEAD4;
}
.expCard_eink {
	background: #F3F1EA;
	color: #1B1B1B;
	border: 1px solid #1B1B1B;
	font-family: Georgia, "Songti SC", serif;
}
.expCard_riso {
	background: #ECE3D0;
	color: #FF4D6D;
	border: 2px solid #2541B2;
	box-shadow: 4px 4px 0 rgba(37,65,178,.5);
}
.expCard_comic {
	background: #FBF7EC;
	color: #E63946;
	border: 3px solid #000;
	font-weight: 900;
	text-transform: uppercase;
}
.expCard_blueprint {
	background: #0A1A2F;
	color: #62B6F2;
	border: 1px solid #62B6F2;
	background-image: linear-gradient(rgba(98,182,242,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(98,182,242,.18) 1px, transparent 1px);
	background-size: 12px 12px;
}
.expCard_solarpunk {
	background: #F4F0E2;
	color: #5E8C5A;
	border: 1px solid #5E8C5A;
	font-family: Georgia, serif;
}
.expCard_deco {
	background: radial-gradient(circle at 50% 0%, rgba(200,162,75,.35), transparent 60%), #0E0E10;
	color: #C8A24B;
	border: 1px solid #C8A24B;
	letter-spacing: .12em;
	text-transform: uppercase;
}
.expCard_steam {
	background: #E9DCC0;
	color: #B0793A;
	border: 2px solid #B0793A;
	font-family: Georgia, serif;
}
.expCard_holo {
	background: linear-gradient(120deg, #f6d5f7, #d5e8f7, #d5f7e8, #f7e8d5, #e8d5f7);
	color: #5A4AA8;
	border: 1px solid #b9c2d6;
}
.expCard_aqua {
	background: linear-gradient(180deg, #03263A 0%, #061E2E 100%);
	color: #5EEAD4;
	border: 1px solid #34D6C8;
}
.expCard_notebook {
	background: repeating-linear-gradient(#FBF8EE 0 21px, #C9D6F0 21px 22px);
	color: #2E5AAC;
	border: 1px solid #C9D6F0;
	border-left: 3px solid #E2574C;
}

.themeRadio:focus-visible + .themeItemRoot {
	outline: 2px solid var(--MI_THEME-focus);
	outline-offset: 2px;
}

.themeRadio:checked + .themeItemRoot {
	border-color: var(--MI_THEME-accent);
}

.themeItemPreview {
	display: block;
	width: calc(100% + 2px);
	height: auto;
	margin-left: -1px;
	border-bottom: 1px solid var(--MI_THEME-divider);
}

.themeItemCaption {
	box-sizing: border-box;
	padding: 8px 12px;
	text-align: center;
	font-size: 80%;
}
</style>

<style lang="scss" scoped>
.rfqxtzch {
	border-radius: 6px;

	> .toggle {
		position: relative;
		padding: 26px 0;
		text-align: center;

		&.disabled {
			opacity: 0.7;

			&, * {
				cursor: not-allowed !important;
			}
		}

		> .toggleWrapper {
			display: inline-block;
			text-align: left;
			overflow: clip;
			padding: 0 100px;
			vertical-align: bottom;
		}

		.toggle {
			cursor: pointer;
			display: inline-block;
			position: relative;
			width: 90px;
			height: 50px;
			margin: 4px; // focus用のアウトライン
			background-color: #83D8FF;
			border-radius: 90px - 6;
			transition: background-color 200ms cubic-bezier(0.445, 0.05, 0.55, 0.95) !important;

			> .before, > .after {
				position: absolute;
				top: 15px;
				transition: color 1s ease;
			}

			> .before {
				left: -70px;
				color: var(--MI_THEME-accent);
			}

			> .after {
				right: -68px;
				color: var(--MI_THEME-fg);
			}

			&.checked {
				background-color: #749DD6;

				> .before {
					color: var(--MI_THEME-fg);
				}

				> .after {
					color: var(--MI_THEME-accent);
				}

				.toggle__handler {
					background-color: #FFE5B5;
					transform: translate3d(40px, 0, 0) rotate(0);

					.crater { opacity: 1; }
				}

				.star--1 {
					width: 2px;
					height: 2px;
				}

				.star--2 {
					width: 4px;
					height: 4px;
					transform: translate3d(-5px, 0, 0);
				}

				.star--3 {
					width: 2px;
					height: 2px;
					transform: translate3d(-7px, 0, 0);
				}

				.star--4,
				.star--5,
				.star--6 {
					opacity: 1;
					transform: translate3d(0,0,0);
				}

				.star--4 {
					transition: all 300ms 200ms cubic-bezier(0.445, 0.05, 0.55, 0.95) !important;
				}

				.star--5 {
					transition: all 300ms 300ms cubic-bezier(0.445, 0.05, 0.55, 0.95) !important;
				}

				.star--6 {
					transition: all 300ms 400ms cubic-bezier(0.445, 0.05, 0.55, 0.95) !important;
				}
			}
		}

		.toggle__handler {
			display: inline-block;
			position: relative;
			z-index: 1;
			top: 3px;
			left: 3px;
			width: 50px - 6;
			height: 50px - 6;
			background-color: #FFCF96;
			border-radius: 50px;
			box-shadow: 0 2px 6px rgba(0,0,0,.3);
			transition: all 400ms cubic-bezier(0.68, -0.55, 0.265, 1.55) !important;
			transform:  rotate(-45deg);

			.crater {
				position: absolute;
				background-color: #E8CDA5;
				opacity: 0;
				transition: opacity 200ms ease-in-out !important;
				border-radius: 100%;
			}

			.crater--1 {
				top: 18px;
				left: 10px;
				width: 4px;
				height: 4px;
			}

			.crater--2 {
				top: 28px;
				left: 22px;
				width: 6px;
				height: 6px;
			}

			.crater--3 {
				top: 10px;
				left: 25px;
				width: 8px;
				height: 8px;
			}
		}

		.star {
			position: absolute;
			background-color: #ffffff;
			transition: all 300ms cubic-bezier(0.445, 0.05, 0.55, 0.95) !important;
			border-radius: 50%;
		}

		.star--1 {
			top: 10px;
			left: 35px;
			z-index: 0;
			width: 30px;
			height: 3px;
		}

		.star--2 {
			top: 18px;
			left: 28px;
			z-index: 1;
			width: 30px;
			height: 3px;
		}

		.star--3 {
			top: 27px;
			left: 40px;
			z-index: 0;
			width: 30px;
			height: 3px;
		}

		.star--4,
		.star--5,
		.star--6 {
			opacity: 0;
			transition: all 300ms 0 cubic-bezier(0.445, 0.05, 0.55, 0.95) !important;
		}

		.star--4 {
			top: 16px;
			left: 11px;
			z-index: 0;
			width: 2px;
			height: 2px;
			transform: translate3d(3px,0,0);
		}

		.star--5 {
			top: 32px;
			left: 17px;
			z-index: 0;
			width: 3px;
			height: 3px;
			transform: translate3d(3px,0,0);
		}

		.star--6 {
			top: 36px;
			left: 28px;
			z-index: 0;
			width: 2px;
			height: 2px;
			transform: translate3d(3px,0,0);
		}
	}

	> .sync {
		padding: 14px 16px;
		border-top: solid 0.5px var(--MI_THEME-divider);
	}
}
</style>
