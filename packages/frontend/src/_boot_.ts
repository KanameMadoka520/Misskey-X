/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// https://vitejs.dev/config/build-options.html#build-modulepreload
import 'vite/modulepreload-polyfill';

// Xtcymc 实验性主题：必须最早注入，先于 style.scss + 任何组件 CSS
// 防止用户开启实验性主题后首屏先闪一下默认 Misskey 设计再切换
import { applyExperimentalTheme, readSavedExperimentalTheme, readSavedExperimentalBg } from '@/experimental-theme.js';
applyExperimentalTheme(readSavedExperimentalTheme(), readSavedExperimentalBg());

if (import.meta.env.DEV) {
	await import('@tabler/icons-webfont/dist/tabler-icons.scss');
} else {
	await import('icons-subsetter/built/tabler-icons-frontend.css');
}

import '@/style.scss';
import { mainBoot } from '@/boot/main-boot.js';
import { subBoot } from '@/boot/sub-boot.js';

const subBootPaths = ['/share', '/auth', '/miauth', '/oauth', '/signup-complete', '/verify-email', '/install-extensions'];

if (subBootPaths.some(i => window.location.pathname === i || window.location.pathname.startsWith(i + '/'))) {
	subBoot();
} else {
	mainBoot();
}
