<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<PageWithHeader :tabs="headerTabs">
	<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 32px;">
		<SearchMarker path="/admin/email-settings" :label="i18n.ts.emailServer" :keywords="['email']" icon="ti ti-mail">
			<div class="_gaps_m">
				<SearchMarker>
					<MkSwitch v-model="enableEmail">
						<template #label><SearchLabel>{{ i18n.ts.enableEmail }}</SearchLabel> ({{ i18n.ts.recommended }})</template>
						<template #caption><SearchText>{{ i18n.ts.emailConfigInfo }}</SearchText></template>
					</MkSwitch>
				</SearchMarker>

				<template v-if="enableEmail">
					<SearchMarker>
						<MkInput v-model="email" type="email">
							<template #label><SearchLabel>{{ i18n.ts.emailAddress }}</SearchLabel></template>
						</MkInput>
					</SearchMarker>

					<SearchMarker>
						<FormSection>
							<template #label><SearchLabel>{{ i18n.ts.smtpConfig }}</SearchLabel></template>

							<div class="_gaps_m">
								<FormSplit :minWidth="280">
									<SearchMarker>
										<MkInput v-model="smtpHost">
											<template #label><SearchLabel>{{ i18n.ts.smtpHost }}</SearchLabel></template>
										</MkInput>
									</SearchMarker>
									<SearchMarker>
										<MkInput v-model="smtpPort" type="number">
											<template #label><SearchLabel>{{ i18n.ts.smtpPort }}</SearchLabel></template>
										</MkInput>
									</SearchMarker>
								</FormSplit>

								<FormSplit :minWidth="280">
									<SearchMarker>
										<MkInput v-model="smtpUser">
											<template #label><SearchLabel>{{ i18n.ts.smtpUser }}</SearchLabel></template>
										</MkInput>
									</SearchMarker>
									<SearchMarker>
										<MkInput v-model="smtpPass" type="password">
											<template #label><SearchLabel>{{ i18n.ts.smtpPass }}</SearchLabel></template>
										</MkInput>
									</SearchMarker>
								</FormSplit>

								<MkInfo>{{ i18n.ts.emptyToDisableSmtpAuth }}</MkInfo>

								<SearchMarker>
									<MkSwitch v-model="smtpSecure">
										<template #label><SearchLabel>{{ i18n.ts.smtpSecure }}</SearchLabel></template>
										<template #caption><SearchText>{{ i18n.ts.smtpSecureInfo }}</SearchText></template>
									</MkSwitch>
								</SearchMarker>
							</div>
						</FormSection>
					</SearchMarker>
				</template>

				<FormSection>
						<template #label><SearchLabel>SMTP 发信额度</SearchLabel></template>
						<div v-if="audit" class="_gaps_s">
							<div :class="$style.quota">
								<div :class="$style.quotaHeader">
									<div>
										<div :class="$style.quotaTitle">最近 60 分钟滚动消耗</div>
										<div :class="$style.muted">{{ quotaResetText }}</div>
									</div>
									<div :class="$style.quotaPercent">{{ quotaPercent }}%</div>
								</div>
								<div :class="$style.quotaBar">
									<div :class="$style.quotaBarValue" :style="{ width: quotaBarWidth }"></div>
								</div>
							</div>
							<div :class="$style.stats">
								<MkKeyValue>
									<template #key>已用</template>
									<template #value>{{ numberFormatter.format(audit.quota.used) }} / {{ numberFormatter.format(audit.quota.limit) }}</template>
								</MkKeyValue>
								<MkKeyValue>
									<template #key>剩余</template>
									<template #value>{{ numberFormatter.format(audit.quota.remaining) }}</template>
								</MkKeyValue>
								<MkKeyValue>
									<template #key>成功记录</template>
									<template #value>{{ numberFormatter.format(audit.stats.success) }}</template>
								</MkKeyValue>
								<MkKeyValue>
									<template #key>失败记录</template>
									<template #value>{{ numberFormatter.format(audit.stats.error) }}</template>
								</MkKeyValue>
							</div>
						</div>
				</FormSection>

				<FormSection>
						<template #label><SearchLabel>发信记录</SearchLabel></template>
						<div class="_gaps_s">
							<div :class="$style.filters">
								<MkSelect v-model="auditCategory" :items="auditCategoryDef" :class="$style.filterInput">
									<template #label>分类</template>
								</MkSelect>
								<MkSelect v-model="auditLevel" :items="auditLevelDef" :class="$style.filterInput">
									<template #label>级别</template>
								</MkSelect>
								<MkSelect v-model="auditLimit" :items="auditLimitDef" :class="$style.filterInput">
									<template #label>数量</template>
								</MkSelect>
							</div>

							<MkInput v-model="auditQuery" type="search" :placeholder="i18n.ts.search">
								<template #prefix><i class="ti ti-search"></i></template>
							</MkInput>

							<div :class="$style.auditActions">
								<div v-if="audit" :class="$style.muted">
									匹配 {{ numberFormatter.format(audit.total) }} 条，显示 {{ numberFormatter.format(audit.records.length) }} 条
								</div>
								<div class="_buttons">
									<MkButton rounded @click="fetchEmailAudit"><i class="ti ti-refresh"></i> {{ i18n.ts.reload }}</MkButton>
									<MkButton rounded danger @click="clearEmailAudit"><i class="ti ti-trash"></i> 清理记录</MkButton>
								</div>
							</div>

							<MkInfo>这里只保存邮件发送审计摘要和最近 60 分钟滚动额度计数；清理记录不会重置 Spacemail 的真实发送额度。</MkInfo>

							<MkLoading v-if="auditLoading"/>
							<MkInfo v-else-if="audit && audit.records.length === 0">没有符合筛选条件的发信记录。</MkInfo>
							<div v-else class="_gaps_s">
								<MkFolder v-for="record in audit?.records ?? []" :key="record.id" :defaultOpen="false">
									<template #icon>
										<i v-if="record.level === 'success'" class="ti ti-check" style="color: var(--MI_THEME-success);"></i>
										<i v-else class="ti ti-alert-triangle" style="color: var(--MI_THEME-error);"></i>
									</template>
									<template #label>{{ record.subject || '(no subject)' }}</template>
									<template #caption>{{ categoryLabel(record.category) }} / {{ record.source }} / {{ formatDate(record.createdAt) }}</template>
									<template #suffix>{{ record.username ? `@${record.username}` : (record.requestIp ?? '') }}</template>

									<div class="_gaps_s">
										<div :class="$style.recordMeta">
											<MkKeyValue>
												<template #key>级别</template>
												<template #value>{{ levelLabel(record.level) }}</template>
											</MkKeyValue>
											<MkKeyValue>
												<template #key>请求</template>
												<template #value>{{ record.source }}</template>
											</MkKeyValue>
											<MkKeyValue>
												<template #key>IP</template>
												<template #value>{{ record.requestIp ?? '-' }}</template>
											</MkKeyValue>
											<MkKeyValue>
												<template #key>用户</template>
												<template #value>{{ record.username ? `@${record.username}` : (record.userId ?? '-') }}</template>
											</MkKeyValue>
											<MkKeyValue>
												<template #key>收件人</template>
												<template #value>{{ record.to }}</template>
											</MkKeyValue>
											<MkKeyValue>
												<template #key>Message-ID</template>
												<template #value>{{ record.messageId ?? '-' }}</template>
											</MkKeyValue>
										</div>
										<div v-if="record.errorMessage" :class="$style.errorText">
											<i class="ti ti-alert-triangle"></i> {{ record.errorCode ? `${record.errorCode}: ` : '' }}{{ record.errorMessage }}
										</div>
										<div :class="$style.preview">
											<div :class="$style.previewLabel">邮件摘要</div>
											<div>{{ record.preview || '-' }}</div>
										</div>
									</div>
								</MkFolder>
							</div>
						</div>
				</FormSection>
			</div>
		</SearchMarker>
	</div>
	<template #footer>
		<div :class="$style.footer">
			<div class="_spacer" style="--MI_SPACER-w: 700px; --MI_SPACER-min: 16px; --MI_SPACER-max: 16px;">
				<div class="_buttons">
					<MkButton primary rounded @click="save"><i class="ti ti-check"></i> {{ i18n.ts.save }}</MkButton>
					<MkButton rounded @click="testEmail"><i class="ti ti-send"></i> {{ i18n.ts.testEmail }}</MkButton>
				</div>
			</div>
		</div>
	</template>
</PageWithHeader>
</template>

<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import MkSwitch from '@/components/MkSwitch.vue';
import MkInput from '@/components/MkInput.vue';
import MkInfo from '@/components/MkInfo.vue';
import FormSplit from '@/components/form/split.vue';
import FormSection from '@/components/form/section.vue';
import MkFolder from '@/components/MkFolder.vue';
import MkKeyValue from '@/components/MkKeyValue.vue';
import MkSelect, { type MkSelectItem } from '@/components/MkSelect.vue';
import * as os from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { fetchInstance, instance } from '@/instance.js';
import { i18n } from '@/i18n.js';
import { definePage } from '@/page.js';
import MkButton from '@/components/MkButton.vue';
import { debounce } from 'throttle-debounce';

const meta = await misskeyApi('admin/meta');

const enableEmail = ref(meta.enableEmail);
const email = ref(meta.email);
const smtpSecure = ref(meta.smtpSecure);
const smtpHost = ref(meta.smtpHost);
const smtpPort = ref(meta.smtpPort);
const smtpUser = ref(meta.smtpUser);
const smtpPass = ref(meta.smtpPass);
const numberFormatter = new Intl.NumberFormat();

type EmailAuditCategory = 'account' | 'security' | 'admin' | 'moderation' | 'system' | 'other';
type EmailAuditLevel = 'success' | 'error';

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

type EmailAuditRecord = {
	id: string;
	createdAt: number;
	level: EmailAuditLevel;
	category: EmailAuditCategory;
	source: string;
	requestIp: string | null;
	userId: string | null;
	username: string | null;
	to: string;
	subject: string;
	preview: string;
	messageId: string | null;
	errorMessage: string | null;
	errorCode: string | null;
};

type EmailAuditResponse = {
	records: EmailAuditRecord[];
	total: number;
	stats: {
		total: number;
		success: number;
		error: number;
		categories: Record<EmailAuditCategory, number>;
	};
	quota: EmailQuotaUsage;
};

const audit = ref<EmailAuditResponse | null>(null);
const auditLoading = ref(false);
const auditCategory = ref<'all' | EmailAuditCategory>('all');
const auditLevel = ref<'all' | EmailAuditLevel>('all');
const auditLimit = ref<20 | 50 | 100 | 200>(50);
const auditQuery = ref('');

const auditCategoryDef = [
	{ label: '全部', value: 'all' },
	{ label: '账号', value: 'account' },
	{ label: '安全', value: 'security' },
	{ label: '管理', value: 'admin' },
	{ label: '审核', value: 'moderation' },
	{ label: '系统', value: 'system' },
	{ label: '其他', value: 'other' },
] satisfies MkSelectItem[];

const auditLevelDef = [
	{ label: '全部', value: 'all' },
	{ label: '成功', value: 'success' },
	{ label: '失败', value: 'error' },
] satisfies MkSelectItem[];

const auditLimitDef = [
	{ label: '20 条', value: 20 },
	{ label: '50 条', value: 50 },
	{ label: '100 条', value: 100 },
	{ label: '200 条', value: 200 },
] satisfies MkSelectItem[];

async function fetchEmailAudit() {
	auditLoading.value = true;
	try {
		audit.value = await misskeyApi<EmailAuditResponse>('admin/email-audit/list' as any, {
			category: auditCategory.value,
			level: auditLevel.value,
			limit: auditLimit.value,
			query: auditQuery.value.trim(),
		} as any);
	} finally {
		auditLoading.value = false;
	}
}

const fetchEmailAuditDebounced = debounce(350, () => fetchEmailAudit());

const quotaPercent = computed(() => audit.value == null ? 0 : Math.round(audit.value.quota.usageRate * 100));
const quotaBarWidth = computed(() => `${Math.min(100, quotaPercent.value)}%`);
const quotaResetText = computed(() => {
	if (audit.value == null) return '正在读取额度';
	if (audit.value.quota.resetAt == null) return '最近 60 分钟没有成功发信';

	const diff = audit.value.quota.resetAt - Date.now();
	if (diff <= 0) return '额度正在释放';

	const minutes = Math.max(1, Math.ceil(diff / (1000 * 60)));
	return `${minutes} 分钟后释放下一封额度`;
});

function categoryLabel(category: EmailAuditCategory): string {
	return ({
		account: '账号',
		security: '安全',
		admin: '管理',
		moderation: '审核',
		system: '系统',
		other: '其他',
	})[category];
}

function levelLabel(level: EmailAuditLevel): string {
	return level === 'success' ? '成功' : '失败';
}

function formatDate(value: number): string {
	return new Date(value).toLocaleString();
}

async function clearEmailAudit() {
	const { canceled } = await os.confirm({
		type: 'warning',
		title: '清理发信记录',
		text: '将清理本页面的发信审计记录；这不会重置 Spacemail 的真实滚动额度。',
		okText: i18n.ts.delete,
		cancelText: i18n.ts.cancel,
	});
	if (canceled) return;

	await os.apiWithDialog('admin/email-audit/clear' as any, {} as any);
	await fetchEmailAudit();
}

async function testEmail() {
	const { canceled, result: destination } = await os.inputText({
		title: 'To',
		type: 'email',
		default: instance.maintainerEmail ?? '',
		placeholder: 'test@example.com',
		minLength: 1,
	});
	if (canceled) return;
	os.apiWithDialog('admin/send-email', {
		to: destination,
		subject: '测试邮件 / Test email / テストメール',
		text: [
			'这是一封测试邮件。',
			'如果你收到了这封邮件，说明邮件发送设置正在工作。',
			'',
			'---------------',
			'',
			'This is a test email.',
			'If you received this email, your mail delivery settings are working.',
			'',
			'---------------',
			'',
			'これはテストメールです。',
			'このメールを受信できていれば、メール送信設定は正常に動作しています。',
		].join('\n'),
	});
}

function save() {
	os.apiWithDialog('admin/update-meta', {
		enableEmail: enableEmail.value,
		email: email.value,
		smtpSecure: smtpSecure.value,
		smtpHost: smtpHost.value,
		smtpPort: smtpPort.value,
		smtpUser: smtpUser.value,
		smtpPass: smtpPass.value,
	}).then(() => {
		fetchInstance(true);
	});
}

watch([auditCategory, auditLevel, auditLimit], () => {
	fetchEmailAudit();
});

watch(auditQuery, () => {
	fetchEmailAuditDebounced();
});

watch(enableEmail, () => {
	if (enableEmail.value) fetchEmailAudit();
});

await fetchEmailAudit();

const headerTabs = computed(() => []);

definePage(() => ({
	title: i18n.ts.emailServer,
	icon: 'ti ti-mail',
}));
</script>

<style lang="scss" module>
.footer {
	-webkit-backdrop-filter: var(--MI-blur, blur(15px));
	backdrop-filter: var(--MI-blur, blur(15px));
}

.quota {
	padding: 14px;
	border: solid 1px var(--MI_THEME-divider);
	border-radius: 8px;
	background: var(--MI_THEME-panel);
}

.quotaHeader {
	display: flex;
	gap: 12px;
	align-items: center;
	justify-content: space-between;
}

.quotaTitle {
	font-weight: 700;
}

.quotaPercent {
	font-weight: 700;
	font-size: 1.3em;
	color: var(--MI_THEME-accent);
	font-variant-numeric: tabular-nums;
}

.quotaBar {
	height: 8px;
	margin-top: 12px;
	overflow: hidden;
	border-radius: 999px;
	background: color-mix(in srgb, var(--MI_THEME-fg), transparent 90%);
}

.quotaBarValue {
	height: 100%;
	border-radius: inherit;
	background: var(--MI_THEME-accent);
	transition: width 0.2s ease;
}

.stats {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
	gap: 12px;
}

.filters {
	display: grid;
	grid-template-columns: repeat(3, minmax(0, 1fr));
	gap: 12px;
}

.filterInput {
	min-width: 0;
}

.auditActions {
	display: flex;
	gap: 12px;
	align-items: center;
	justify-content: space-between;
}

.muted {
	color: color-mix(in srgb, var(--MI_THEME-fg), transparent 35%);
	font-size: 0.9em;
}

.recordMeta {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
	gap: 12px;
}

.preview {
	padding: 12px;
	border: solid 1px var(--MI_THEME-divider);
	border-radius: 8px;
	background: color-mix(in srgb, var(--MI_THEME-panel), var(--MI_THEME-bg) 45%);
	white-space: pre-wrap;
	overflow-wrap: anywhere;
}

.previewLabel {
	margin-bottom: 4px;
	color: color-mix(in srgb, var(--MI_THEME-fg), transparent 35%);
	font-size: 0.85em;
}

.errorText {
	padding: 10px 12px;
	border-radius: 8px;
	background: color-mix(in srgb, var(--MI_THEME-error), transparent 88%);
	color: var(--MI_THEME-error);
	overflow-wrap: anywhere;
}

@media (max-width: 600px) {
	.filters {
		grid-template-columns: 1fr;
	}

	.auditActions {
		align-items: stretch;
		flex-direction: column;
	}
}
</style>
