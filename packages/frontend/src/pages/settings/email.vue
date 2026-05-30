<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<SearchMarker path="/settings/email" :label="i18n.ts.email" :keywords="['email']" icon="ti ti-mail">
	<div class="_gaps_m">
		<MkInfo v-if="!instance.enableEmail">{{ i18n.ts.emailNotSupported }}</MkInfo>

		<MkDisableSection :disabled="!instance.enableEmail">
			<div class="_gaps_m">
				<SearchMarker :keywords="['email', 'address']">
					<FormSection first>
						<template #label><SearchLabel>{{ i18n.ts.emailAddress }}</SearchLabel></template>
						<MkInput v-model="emailAddress" type="email" manualSave>
							<template #prefix><i class="ti ti-mail"></i></template>
							<template v-if="$i.email && !$i.emailVerified" #caption>{{ i18n.ts.verificationEmailSent }}</template>
							<template v-else-if="emailAddress === $i.email && $i.emailVerified" #caption><i class="ti ti-check" style="color: var(--MI_THEME-success);"></i> {{ i18n.ts.emailVerified }}</template>
						</MkInput>
					</FormSection>
				</SearchMarker>

				<FormSection>
					<template #label><SearchLabel>本社区发信额度</SearchLabel></template>
					<div
						:class="[$style.quota, {
							[$style.quotaWarn]: emailQuotaUsageRate >= 0.8 && emailQuotaUsageRate < 0.92,
							[$style.quotaDanger]: emailQuotaUsageRate >= 0.92,
						}]"
					>
						<div :class="$style.quotaHeader">
							<div :class="$style.quotaIcon"><i class="ti ti-mail-heart"></i></div>
							<div :class="$style.quotaTitle">
								<div :class="$style.quotaName">Spacemail Pro</div>
								<div :class="$style.quotaCaption">最近 60 分钟 SMTP 发信消耗</div>
							</div>
							<div :class="$style.quotaPercent">{{ emailQuotaPercentText }}</div>
							<button
								type="button"
								:class="$style.quotaRefresh"
								:title="'刷新额度'"
								:disabled="emailQuotaLoading"
								@click="fetchEmailQuota"
							>
								<i class="ti ti-refresh" :class="{ [$style.spin]: emailQuotaLoading }"></i>
							</button>
						</div>
						<div :class="$style.quotaBar" aria-hidden="true">
							<div :class="$style.quotaBarValue" :style="{ width: emailQuotaBarWidth }"></div>
						</div>
						<div :class="$style.quotaNumbers">
							<span><b>{{ emailQuotaUsedText }}</b> / {{ emailQuotaLimitText }} 封</span>
							<span><i class="ti ti-battery-3"></i> {{ emailQuotaRemainingText }}</span>
						</div>
						<div :class="$style.quotaFooter">
							<span><i class="ti ti-clock-hour-4"></i> {{ emailQuotaResetText }}</span>
							<span>{{ emailQuotaStatusText }}</span>
						</div>
					</div>
				</FormSection>

				<FormSection>
					<SearchMarker :keywords="['announcement', 'email']">
						<MkSwitch :modelValue="$i.receiveAnnouncementEmail" @update:modelValue="onChangeReceiveAnnouncementEmail">
							<template #label><SearchLabel>{{ i18n.ts.receiveAnnouncementFromInstance }}</SearchLabel></template>
						</MkSwitch>
					</SearchMarker>
				</FormSection>

				<SearchMarker :keywords="['notification', 'email']">
					<FormSection>
						<template #label><SearchLabel>{{ i18n.ts.emailNotification }}</SearchLabel></template>

						<div class="_gaps_s">
							<MkInfo>x.tcymc.space站长提示：misskey官方仓库暂未完成此功能，这里的通知是无效的，后续我们二次开发时可能考虑实现。</MkInfo>
							<MkSwitch v-model="emailNotification_mention">
								{{ i18n.ts._notification._types.mention }}
							</MkSwitch>
							<MkSwitch v-model="emailNotification_reply">
								{{ i18n.ts._notification._types.reply }}
							</MkSwitch>
							<MkSwitch v-model="emailNotification_quote">
								{{ i18n.ts._notification._types.quote }}
							</MkSwitch>
							<MkSwitch v-model="emailNotification_follow">
								{{ i18n.ts._notification._types.follow }}
							</MkSwitch>
							<MkSwitch v-model="emailNotification_receiveFollowRequest">
								{{ i18n.ts._notification._types.receiveFollowRequest }}
							</MkSwitch>
						</div>
					</FormSection>
				</SearchMarker>
			</div>
		</MkDisableSection>
	</div>
</SearchMarker>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref, watch, computed } from 'vue';
import FormSection from '@/components/form/section.vue';
import MkInfo from '@/components/MkInfo.vue';
import MkInput from '@/components/MkInput.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkDisableSection from '@/components/MkDisableSection.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { ensureSignin } from '@/i.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import { instance } from '@/instance.js';

const $i = ensureSignin();

const emailAddress = ref($i.email ?? '');
const EMAIL_QUOTA_POLL_INTERVAL = 1000 * 60;

type EmailQuotaUsage = {
	limit: number;
	used: number;
	remaining: number;
	usageRate: number;
	windowMs: number;
	windowStartedAt: number;
	resetAt: number | null;
	lastSentAt: number | null;
	updatedAt: number;
};

const emailQuota = ref<EmailQuotaUsage | null>(null);
const emailQuotaLoading = ref(false);
const emailQuotaError = ref(false);
let emailQuotaTimer: number | null = null;
const numberFormatter = new Intl.NumberFormat();

async function fetchEmailQuota() {
	if (!instance.enableEmail) return;

	emailQuotaLoading.value = true;
	emailQuotaError.value = false;

	try {
		emailQuota.value = await misskeyApi<EmailQuotaUsage>('email/quota' as any, {} as any);
	} catch (err) {
		emailQuotaError.value = true;
	} finally {
		emailQuotaLoading.value = false;
	}
}

function onChangeReceiveAnnouncementEmail(v: boolean) {
	misskeyApi('i/update', {
		receiveAnnouncementEmail: v,
	});
}

async function saveEmailAddress() {
	const auth = await os.authenticateDialog();
	if (auth.canceled) return;

	os.apiWithDialog('i/update-email', {
		password: auth.result.password,
		token: auth.result.token,
		email: emailAddress.value,
	});
}

const emailNotification_mention = ref($i.emailNotificationTypes.includes('mention'));
const emailNotification_reply = ref($i.emailNotificationTypes.includes('reply'));
const emailNotification_quote = ref($i.emailNotificationTypes.includes('quote'));
const emailNotification_follow = ref($i.emailNotificationTypes.includes('follow'));
const emailNotification_receiveFollowRequest = ref($i.emailNotificationTypes.includes('receiveFollowRequest'));

const emailQuotaUsageRate = computed(() => emailQuota.value?.usageRate ?? 0);
const emailQuotaPercent = computed(() => Math.round(emailQuotaUsageRate.value * 100));
const emailQuotaBarWidth = computed(() => `${Math.min(100, emailQuotaPercent.value)}%`);
const emailQuotaPercentText = computed(() => emailQuota.value == null && emailQuotaLoading.value ? '...' : `${emailQuotaPercent.value}%`);
const emailQuotaUsedText = computed(() => emailQuota.value == null ? '-' : numberFormatter.format(emailQuota.value.used));
const emailQuotaLimitText = computed(() => numberFormatter.format(emailQuota.value?.limit ?? 500));
const emailQuotaRemainingText = computed(() => {
	if (emailQuota.value == null) return emailQuotaError.value ? '读取失败' : '读取中';
	return `还可发送 ${numberFormatter.format(emailQuota.value.remaining)} 封`;
});
const emailQuotaResetText = computed(() => {
	if (emailQuota.value == null) return emailQuotaError.value ? '暂时无法读取' : '正在读取额度';
	if (emailQuota.value.resetAt == null) return '最近 60 分钟还没有成功发信';

	const diff = emailQuota.value.resetAt - Date.now();
	if (diff <= 0) return '额度正在释放';

	const minutes = Math.max(1, Math.ceil(diff / (1000 * 60)));
	return `${minutes} 分钟后释放下一封额度`;
});
const emailQuotaStatusText = computed(() => {
	if (emailQuota.value == null) return emailQuotaError.value ? '稍后再试' : '连接中';
	if (emailQuotaUsageRate.value >= 0.92) return '快满了';
	if (emailQuotaUsageRate.value >= 0.8) return '留意中';
	return '余量充足';
});

const saveNotificationSettings = () => {
	misskeyApi('i/update', {
		emailNotificationTypes: [
			...[emailNotification_mention.value ? 'mention' : null],
			...[emailNotification_reply.value ? 'reply' : null],
			...[emailNotification_quote.value ? 'quote' : null],
			...[emailNotification_follow.value ? 'follow' : null],
			...[emailNotification_receiveFollowRequest.value ? 'receiveFollowRequest' : null],
		].filter(x => x != null),
	});
};

watch([emailNotification_mention, emailNotification_reply, emailNotification_quote, emailNotification_follow, emailNotification_receiveFollowRequest], () => {
	saveNotificationSettings();
});

onMounted(() => {
	fetchEmailQuota();
	emailQuotaTimer = window.setInterval(fetchEmailQuota, EMAIL_QUOTA_POLL_INTERVAL);

	watch(emailAddress, () => {
		saveEmailAddress();
	});
});

onUnmounted(() => {
	if (emailQuotaTimer != null) {
		window.clearInterval(emailQuotaTimer);
		emailQuotaTimer = null;
	}
});

const headerActions = computed(() => []);

const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts.email,
	icon: 'ti ti-mail',
}));
</script>

<style lang="scss" module>
.quota {
	--quota-color: var(--MI_THEME-accent);

	position: relative;
	padding: 16px;
	overflow: hidden;
	border: solid 1px color-mix(in srgb, var(--quota-color), var(--MI_THEME-divider) 70%);
	border-radius: 8px;
	background: linear-gradient(135deg, color-mix(in srgb, var(--quota-color), var(--MI_THEME-panel) 88%), var(--MI_THEME-panel));
}

.quotaWarn {
	--quota-color: var(--MI_THEME-warn);
}

.quotaDanger {
	--quota-color: var(--MI_THEME-error);
}

.quotaHeader {
	display: grid;
	grid-template-columns: 40px minmax(0, 1fr) auto 36px;
	gap: 10px;
	align-items: center;
}

.quotaIcon {
	display: grid;
	place-items: center;
	width: 40px;
	height: 40px;
	border-radius: 8px;
	background: color-mix(in srgb, var(--quota-color), transparent 82%);
	color: var(--quota-color);
	font-size: 22px;
}

.quotaTitle {
	min-width: 0;
}

.quotaName {
	overflow: hidden;
	font-weight: 700;
	font-size: 1.02em;
	line-height: 1.35;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.quotaCaption {
	overflow: hidden;
	margin-top: 2px;
	color: color-mix(in srgb, var(--MI_THEME-fg), transparent 35%);
	font-size: 0.86em;
	line-height: 1.35;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.quotaPercent {
	font-weight: 800;
	font-size: 1.25em;
	color: var(--quota-color);
	font-variant-numeric: tabular-nums;
}

.quotaRefresh {
	display: grid;
	place-items: center;
	width: 36px;
	height: 36px;
	border-radius: 8px;
	background: color-mix(in srgb, var(--MI_THEME-fg), transparent 92%);
	color: var(--MI_THEME-fg);

	&:hover {
		background: color-mix(in srgb, var(--MI_THEME-fg), transparent 86%);
	}

	&:disabled {
		cursor: wait;
		opacity: 0.7;
	}
}

.quotaBar {
	height: 10px;
	margin-top: 14px;
	overflow: hidden;
	border-radius: 999px;
	background: color-mix(in srgb, var(--MI_THEME-fg), transparent 90%);
}

.quotaBarValue {
	height: 100%;
	border-radius: inherit;
	background: linear-gradient(90deg, var(--quota-color), color-mix(in srgb, var(--quota-color), var(--MI_THEME-success) 35%));
	transition: width 0.35s ease;
}

.quotaNumbers {
	display: flex;
	flex-wrap: wrap;
	gap: 8px 14px;
	align-items: center;
	justify-content: space-between;
	margin-top: 12px;
	font-size: 0.95em;
}

.quotaNumbers b {
	font-size: 1.12em;
	font-variant-numeric: tabular-nums;
}

.quotaFooter {
	display: flex;
	flex-wrap: wrap;
	gap: 6px 12px;
	align-items: center;
	justify-content: space-between;
	margin-top: 6px;
	color: color-mix(in srgb, var(--MI_THEME-fg), transparent 35%);
	font-size: 0.86em;
}

.spin {
	animation: spin 0.8s linear infinite;
}

@keyframes spin {
	to {
		transform: rotate(360deg);
	}
}

@media (prefers-reduced-motion: reduce) {
	.quotaBarValue {
		transition: none;
	}

	.spin {
		animation: none;
	}
}

@media (max-width: 420px) {
	.quotaHeader {
		grid-template-columns: 36px minmax(0, 1fr) auto 32px;
		gap: 8px;
	}

	.quotaIcon {
		width: 36px;
		height: 36px;
		font-size: 20px;
	}

	.quotaRefresh {
		width: 32px;
		height: 32px;
	}

	.quotaPercent {
		font-size: 1.08em;
	}
}
</style>
