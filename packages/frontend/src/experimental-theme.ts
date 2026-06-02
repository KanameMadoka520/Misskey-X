/*
 * SPDX-FileCopyrightText: KanameMadoka520 and 糖醋鱼工坊
 * SPDX-License-Identifier: AGPL-3.0-only
 *
 * Xtcymc 实验性主题（Experimental Theme）系统
 *
 * 与「颜色主题」(themes JSON5) 的根本区别：
 *   - 颜色主题：只替换 --MI_THEME-* 变量，沿用 Misskey 原本的布局/字体/形态
 *   - 实验性主题：换字体、间距、圆角、边框、阴影、背景纹理…… 是「设计语言级」替换，
 *                 同时它自带一整套完整配色，启用后完全忽略浅色/深色与所选颜色主题。
 *
 * 实现策略（务必理解，避免重蹈“适配不完美”覆辙）：
 *   1. 配色靠「变量全量覆盖」。Misskey 组件几乎都用 var(--MI_THEME-*) 上色，
 *      只要在 html[data-xtcymc-exp="<id>"] 上用 !important 覆盖【全部 ~60 个】
 *      --MI_THEME-* 变量，侧栏/页眉/控件/弹层/网盘等所有面就自动跟随——
 *      之前漏掉 pageHeaderBg / infoBg / buttonGradateA/B 等才导致页眉、提示框、
 *      发帖按钮没变色。现在用 BASE_LIGHT/BASE_DARK 兜底，保证零遗漏。
 *   2. 形态/字体靠「稳定锚点」。Misskey 的组件 class 会被 hash，[class*=] 命中不可靠；
 *      只在【不会被 hash】的目标上加结构性规则：全局 ._ 类（._panel ._popup
 *      ._acrylic ._borderButton ._buttonGradate ._link ._shadow）、元素选择器
 *      （button input textarea article h1~3 a img）、以及带 inline style 的
 *      sticky 页眉容器 [style*="--MI-stickyTop"]。
 *
 * 启用：localStorage 'xtcymcExperimentalTheme' 是真相源（_boot_.ts 同步读取，
 *       注入 <style id> + html[data-xtcymc-exp]）。切换后自动 reload。
 */

export type ExperimentalThemeId = 'newsprint' | 'terminal' | 'glass' | 'brutalist' | 'synthwave' | 'aurora' | 'eink' | 'riso' | 'comic' | 'blueprint' | 'solarpunk' | 'deco' | 'steam' | 'holo' | 'aqua' | 'notebook';

export const EXPERIMENTAL_THEME_KEY = 'xtcymcExperimentalTheme';
export const EXPERIMENTAL_BG_KEY = 'xtcymcExperimentalBg';
const STYLE_TAG_ID = 'xtcymc-experimental-theme';
const BG_ATTR = 'data-xtcymc-exp-bg';

// 完整的 --MI_THEME-* 兜底调色板（与 _light.json5 / _dark.json5 的全部 props 对齐，
// 把 :func 引用解析成具体值）。每套实验性主题在此基础上覆盖，保证没有变量遗漏。
type Palette = Record<string, string>;

const BASE_LIGHT: Palette = {
	accent: '#86b300', accentedBg: 'rgba(134,179,0,0.15)', love: '#dd2e44', focus: 'rgba(134,179,0,0.3)',
	bg: '#ffffff', fg: '#5f5f5f', fgHighlighted: '#565656', fgOnAccent: '#ffffff', fgOnWhite: '#333333',
	divider: 'rgba(0,0,0,0.1)', indicator: '#86b300',
	panel: '#ffffff', panelHighlight: '#f5f5f5', panelHeaderBg: '#ffffff', panelHeaderFg: '#5f5f5f',
	panelBorder: 'solid 1px rgba(0,0,0,0.1)', windowHeader: 'rgba(255,255,255,0.85)', popup: '#ffffff',
	shadow: 'rgba(0,0,0,0.1)', header: 'rgba(255,255,255,0.7)',
	navBg: '#ffffff', navFg: '#5f5f5f', navActive: '#86b300', navIndicator: '#86b300',
	pageHeaderBg: '#ffffff', pageHeaderFg: '#5f5f5f',
	link: '#44a4c1', hashtag: '#ff9156', mention: '#86b300', mentionMe: '#86b300', renote: '#229e82',
	modalBg: 'rgba(0,0,0,0.3)', scrollbarHandle: 'rgba(0,0,0,0.2)', scrollbarHandleHover: 'rgba(0,0,0,0.4)',
	dateLabelFg: '#5f5f5f', infoBg: '#e5f5ff', infoFg: '#72818a', infoWarnBg: '#fff0db', infoWarnFg: '#8f6e31',
	folderHeaderBg: 'rgba(0,0,0,0.05)', folderHeaderHoverBg: 'rgba(0,0,0,0.1)',
	buttonBg: '#f2f2f2', buttonHoverBg: '#e6e6e6', buttonGradateA: '#86b300', buttonGradateB: '#a8b300',
	switchBg: 'rgba(0,0,0,0.15)', switchOffBg: 'rgba(0,0,0,0.1)', switchOffFg: '#ffffff', switchOnBg: '#86b300', switchOnFg: '#ffffff',
	inputBorder: 'rgba(0,0,0,0.1)', inputBorderHover: 'rgba(0,0,0,0.2)', badge: '#31b1ce', messageBg: '#ffffff',
	success: '#86b300', error: '#ec4137', warn: '#ecb637',
	codeString: '#b98710', codeNumber: '#0fbbbb', codeBoolean: '#62b70c', deckBg: '#f7f7f7', htmlThemeColor: '#ffffff',
};

const BASE_DARK: Palette = {
	accent: '#86b300', accentedBg: 'rgba(134,179,0,0.15)', love: '#dd2e44', focus: 'rgba(134,179,0,0.3)',
	bg: '#000000', fg: '#dadada', fgHighlighted: '#e3e3e3', fgOnAccent: '#ffffff', fgOnWhite: '#333333',
	divider: 'rgba(255,255,255,0.1)', indicator: '#86b300',
	panel: '#0a0a0a', panelHighlight: '#141414', panelHeaderBg: '#0f0f0f', panelHeaderFg: '#dadada',
	panelBorder: 'solid 1px rgba(255,255,255,0.1)', windowHeader: 'rgba(10,10,10,0.85)', popup: '#0f0f0f',
	shadow: 'rgba(0,0,0,0.3)', header: 'rgba(10,10,10,0.7)',
	navBg: '#0a0a0a', navFg: '#dadada', navActive: '#86b300', navIndicator: '#86b300',
	pageHeaderBg: '#000000', pageHeaderFg: '#dadada',
	link: '#44a4c1', hashtag: '#ff9156', mention: '#86b300', mentionMe: '#86b300', renote: '#229e82',
	modalBg: 'rgba(0,0,0,0.5)', scrollbarHandle: 'rgba(255,255,255,0.2)', scrollbarHandleHover: 'rgba(255,255,255,0.4)',
	dateLabelFg: '#dadada', infoBg: '#253142', infoFg: '#ffffff', infoWarnBg: '#42321c', infoWarnFg: '#ffbd3e',
	folderHeaderBg: 'rgba(255,255,255,0.05)', folderHeaderHoverBg: 'rgba(255,255,255,0.1)',
	buttonBg: '#151515', buttonHoverBg: '#1f1f1f', buttonGradateA: '#86b300', buttonGradateB: '#a8b300',
	switchBg: 'rgba(255,255,255,0.15)', switchOffBg: 'rgba(255,255,255,0.1)', switchOffFg: 'rgba(218,218,218,0.8)', switchOnBg: 'rgba(134,179,0,0.15)', switchOnFg: '#86b300',
	inputBorder: 'rgba(255,255,255,0.1)', inputBorderHover: 'rgba(255,255,255,0.2)', badge: '#31b1ce', messageBg: '#000000',
	success: '#86b300', error: '#ec4137', warn: '#ecb637',
	codeString: '#ffb675', codeNumber: '#cfff9e', codeBoolean: '#c59eff', deckBg: '#000000', htmlThemeColor: '#000000',
};

type ExpTheme = {
	id: ExperimentalThemeId;
	name: string;
	tagline: string;
	icon: string;
	scheme: 'light' | 'dark';
	radius: string;
	margin: string;
	blur: string;
	modalBgFilter: string;
	palette: Palette;     // overrides merged over BASE_LIGHT/DARK
	structural: string;   // shape / font / texture, scoped to html[data-xtcymc-exp="<id>"]
	aggressive?: string;  // 「背景与动效」开启时追加的更激进设计，scoped to html[data-xtcymc-exp="<id>"][data-xtcymc-exp-bg]
};

// ─────────────────────────────────────────────────────────────────────────────
//  NEWSPRINT · 晨报 — 黑白报纸排印：乳白纸、牛血红报头、双线分隔、衬线、零圆角
// ─────────────────────────────────────────────────────────────────────────────
const NEWSPRINT: ExpTheme = {
	id: 'newsprint', name: 'Newsprint · 晨报',
	tagline: '黑白报纸排印：乳白纸张、牛血红报头、双线分隔、宽行距衬线',
	icon: 'ti ti-news', scheme: 'light',
	radius: '0px', margin: '16px', blur: 'blur(0px)', modalBgFilter: 'blur(0px)',
	palette: {
		accent: '#8B0000', accentedBg: 'rgba(139,0,0,0.08)', love: '#8B0000', focus: 'rgba(139,0,0,0.35)',
		bg: '#FBFAF4', fg: '#1A1612', fgHighlighted: '#000000', fgOnAccent: '#FBFAF4', fgOnWhite: '#8B0000',
		divider: '#1A1612', indicator: '#8B0000',
		panel: '#FFFDF6', panelHighlight: '#EFEAD8', panelHeaderBg: '#1A1612', panelHeaderFg: '#FBFAF4',
		panelBorder: 'solid 1.5px #1A1612', windowHeader: '#FFFDF6', popup: '#FFFDF6',
		shadow: 'transparent', header: 'rgba(251,250,244,0.92)',
		navBg: '#FBFAF4', navFg: '#1A1612', navActive: '#8B0000', navIndicator: '#8B0000',
		pageHeaderBg: '#FBFAF4', pageHeaderFg: '#1A1612',
		link: '#3A2A10', hashtag: '#6B4A1B', mention: '#8B0000', mentionMe: '#B22222', renote: '#2F5D3A',
		modalBg: 'rgba(26,22,18,0.45)', scrollbarHandle: 'rgba(26,22,18,0.3)', scrollbarHandleHover: 'rgba(26,22,18,0.55)',
		dateLabelFg: '#1A1612', infoBg: '#EFEAD8', infoFg: '#5A4A28', infoWarnBg: '#F3E2C8', infoWarnFg: '#7A3B11',
		folderHeaderBg: 'rgba(26,22,18,0.05)', folderHeaderHoverBg: 'rgba(26,22,18,0.12)',
		buttonBg: '#EFEAD8', buttonHoverBg: '#E2DAC4', buttonGradateA: '#8B0000', buttonGradateB: '#5A0000',
		switchBg: 'rgba(26,22,18,0.2)', switchOffBg: 'rgba(26,22,18,0.15)', switchOffFg: '#FBFAF4', switchOnBg: '#8B0000', switchOnFg: '#FBFAF4',
		inputBorder: 'rgba(26,22,18,0.3)', inputBorderHover: 'rgba(26,22,18,0.5)', badge: '#8B0000', messageBg: '#FBFAF4',
		success: '#2F5D3A', error: '#8B0000', warn: '#A8741B',
		codeString: '#8B0000', codeNumber: '#1F4E66', codeBoolean: '#6B4A1B', deckBg: '#EFEAD8', htmlThemeColor: '#FBFAF4',
	},
	structural: `
html[data-xtcymc-exp="newsprint"],
html[data-xtcymc-exp="newsprint"] * {
	font-family: "Source Serif 4","Source Serif Pro",Georgia,"Times New Roman","Songti SC","Noto Serif CJK SC","FangSong",serif !important;
}
/* 还原图标字体：* 选择器特异性会盖过 tabler 的 .ti，必须显式恢复，否则图标变 □ */
html[data-xtcymc-exp="newsprint"] .ti,
html[data-xtcymc-exp="newsprint"] [class*="ti-"],
html[data-xtcymc-exp="newsprint"] i[class^="ti"] { font-family: "tabler-icons" !important; }
html[data-xtcymc-exp="newsprint"] * { border-radius: 0 !important; }
html[data-xtcymc-exp="newsprint"] body { background: #FBFAF4 !important; }
html[data-xtcymc-exp="newsprint"] ._panel { border: 1.5px solid #1A1612 !important; box-shadow: none !important; }
html[data-xtcymc-exp="newsprint"] ._shadow { box-shadow: none !important; }
html[data-xtcymc-exp="newsprint"] ._popup { border: 1.5px solid #1A1612 !important; }
/* 帖子之间用细黑横线，模拟报纸栏目分隔 */
html[data-xtcymc-exp="newsprint"] article { border-bottom: 1px solid rgba(26,22,18,0.35) !important; }
/* 标题用粗衬线，向报头致敬 */
html[data-xtcymc-exp="newsprint"] h1,
html[data-xtcymc-exp="newsprint"] h2,
html[data-xtcymc-exp="newsprint"] h3 {
	font-family: "Playfair Display","Source Serif 4",Georgia,"Songti SC",serif !important;
	font-weight: 900 !important; letter-spacing: -0.01em !important;
}
/* 链接（仅正文 ._link，不影响导航/菜单/启动台的 <a>） */
html[data-xtcymc-exp="newsprint"] ._link { text-decoration: underline !important; text-underline-offset: 2px !important; }
/* 描边按钮：大写、字距 */
html[data-xtcymc-exp="newsprint"] ._borderButton {
	border: 1.5px solid #1A1612 !important; text-transform: uppercase !important; letter-spacing: 0.04em !important;
}
/* 输入框：方框、墨色边 */
html[data-xtcymc-exp="newsprint"] input,
html[data-xtcymc-exp="newsprint"] textarea { border-color: rgba(26,22,18,0.35) !important; }
/* sticky 页眉：实色纸张 + 3px 双线报头线，去玻璃模糊 */
html[data-xtcymc-exp="newsprint"] [style*="--MI-stickyTop"] {
	background: #FBFAF4 !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
	border-bottom: 3px double #1A1612 !important;
}
/* 照片去色，报纸网点观感（排除自定义表情/反应） */
html[data-xtcymc-exp="newsprint"] img:not([class*="emoji"]):not([class*="mfm"]):not([class*="reaction"]) {
	filter: grayscale(0.55) contrast(1.05) !important;
}
`,
	aggressive: "html[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(251,250,244,0.42) !important;\n\t--MI_THEME-deckBg: rgba(239,234,216,0.4) !important;\n\t--MI_THEME-navBg: rgba(251,250,244,0.5) !important;\n\t--MI_THEME-pageHeaderBg: rgba(251,250,244,0.90) !important;\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] body {\n\tbackground:\n\t\tlinear-gradient(180deg, rgba(255,253,246,0.0) 0%, rgba(120,96,40,0.05) 100%),\n\t\trepeating-linear-gradient(90deg, rgba(26,22,18,0.05) 0 1px, transparent 1px 220px),\n\t\tlinear-gradient(180deg, #FFFDF6 0%, #FBFAF4 55%, #F4EFE0 100%) !important;\n\tbackground-attachment: fixed !important;\n\tbackground-size: 100% 100%, 220px 100%, 100% 100% !important;\n\tposition: relative !important;\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tpointer-events: none !important;\n\tz-index: 0 !important;\n\tbackground-image:\n\t\tradial-gradient(rgba(26,22,18,0.14) 0.6px, transparent 0.7px),\n\t\trepeating-linear-gradient(90deg, transparent 0 218px, rgba(26,22,18,0.07) 218px 220px),\n\t\tradial-gradient(ellipse at 50% 50%, transparent 56%, rgba(120,96,40,0.09) 100%) !important;\n\tbackground-size: 4px 4px, 220px 100%, 100% 100% !important;\n\tbackground-position: 0 0, 0 0, 0 0 !important;\n\tmix-blend-mode: multiply !important;\n\topacity: 0.55 !important;\n\tanimation: kf-newsprint-halftone 24s linear infinite !important;\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tpointer-events: none !important;\n\tz-index: 0 !important;\n\tbackground-image:\n\t\tlinear-gradient(180deg, rgba(139,0,0,0.18) 0 6px, transparent 6px),\n\t\trepeating-linear-gradient(0deg, rgba(26,22,18,0.045) 0, rgba(26,22,18,0.045) 1px, transparent 1px, transparent 3px) !important;\n\tbackground-size: 100% 100%, 100% 3px !important;\n\tbackground-position: 0 0, 0 0 !important;\n\tmix-blend-mode: multiply !important;\n\topacity: 0.5 !important;\n\tanimation: kf-newsprint-grain 6s steps(4) infinite !important;\n}\n\n@keyframes kf-newsprint-halftone {\n\t0%   { background-position: 0 0, 0 0, 0 0; opacity: 0.5; }\n\t50%  { background-position: 8px 6px, 0 0, 0 0; opacity: 0.62; }\n\t100% { background-position: 0 0, 0 0, 0 0; opacity: 0.5; }\n}\n\n@keyframes kf-newsprint-grain {\n\t0%   { transform: translate(0, 0); }\n\t25%  { transform: translate(-1px, 1px); }\n\t50%  { transform: translate(1px, -1px); }\n\t75%  { transform: translate(-1px, -1px); }\n\t100% { transform: translate(0, 0); }\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: rgba(255,253,246,0.94) !important;\n\tborder: 1.5px solid #1A1612 !important;\n\tbox-shadow: none !important;\n}\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: #FFFDF6 !important;\n\tborder: 1.5px solid #1A1612 !important;\n\t-webkit-backdrop-filter: none !important;\n\tbackdrop-filter: none !important;\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tposition: relative !important;\n\toverflow: hidden !important;\n}\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"]::before {\n\tcontent: \"★ BREAKING ★ 晨报 ★ NEWSPRINT ★ EXTRA EXTRA ★ READ ALL ABOUT IT ★ 号外 ★ BREAKING ★ 晨报 ★ NEWSPRINT ★ EXTRA EXTRA ★ READ ALL ABOUT IT ★ 号外 \" !important;\n\tposition: absolute !important;\n\ttop: 0 !important;\n\tleft: 0 !important;\n\tright: 0 !important;\n\theight: 16px !important;\n\tline-height: 16px !important;\n\twhite-space: nowrap !important;\n\tfont-size: 9px !important;\n\tfont-weight: 700 !important;\n\tletter-spacing: 0.22em !important;\n\tcolor: #FBFAF4 !important;\n\tbackground: #8B0000 !important;\n\tpointer-events: none !important;\n\tz-index: 5 !important;\n\twill-change: transform !important;\n\tanimation: kf-newsprint-marquee 28s linear infinite !important;\n}\n@keyframes kf-newsprint-marquee {\n\t0%   { transform: translateX(0); }\n\t100% { transform: translateX(-50%); }\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] h1,\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] h2,\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] h3 {\n\ttext-shadow: 0 1px 0 rgba(251,250,244,0.9), 0 -0.5px 0 rgba(26,22,18,0.25) !important;\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._link {\n\tbackground-image: linear-gradient(#1A1612, #1A1612) !important;\n\tbackground-repeat: no-repeat !important;\n\tbackground-position: 0 100% !important;\n\tbackground-size: 100% 1px !important;\n\ttext-decoration: none !important;\n\ttransition: background-size 0.28s ease, color 0.2s ease !important;\n}\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._link:hover {\n\tbackground-image: linear-gradient(#8B0000, #8B0000) !important;\n\tbackground-size: 100% 0.45em !important;\n\tcolor: #8B0000 !important;\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._panel,\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] article {\n\ttransition: transform 0.2s ease, box-shadow 0.2s ease !important;\n}\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._panel:hover {\n\ttransform: translate(-2px, -2px) !important;\n\tbox-shadow: 4px 4px 0 rgba(26,22,18,0.85) !important;\n}\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] article:hover {\n\ttransform: translateX(2px) !important;\n\tbox-shadow: -3px 0 0 #8B0000 !important;\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._buttonGradate {\n\tanimation: kf-newsprint-inkpulse 3.4s ease-in-out infinite !important;\n}\n@keyframes kf-newsprint-inkpulse {\n\t0%, 100% { box-shadow: 0 0 0 0 rgba(139,0,0,0.0); }\n\t50%      { box-shadow: 0 0 0 2px rgba(139,0,0,0.35); }\n}\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._borderButton {\n\ttransition: background-color 0.2s ease, color 0.2s ease !important;\n}\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tbackground: #1A1612 !important;\n\tcolor: #FBFAF4 !important;\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"]::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important;\n\tleft: 0 !important;\n\tright: 0 !important;\n\tbottom: 0 !important;\n\theight: 3px !important;\n\tpointer-events: none !important;\n\tz-index: 4 !important;\n\tbackground: repeating-linear-gradient(90deg, #1A1612 0 18px, transparent 18px 26px) !important;\n\tbackground-size: 26px 3px !important;\n\topacity: 0.6 !important;\n\tanimation: kf-newsprint-rule 9s linear infinite !important;\n}\n@keyframes kf-newsprint-rule {\n\t0%   { background-position: 0 0; }\n\t100% { background-position: 26px 0; }\n}\n\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] img:not([class*=\"emoji\"]):not([class*=\"mfm\"]):not([class*=\"reaction\"]):not([class*=\"avatar\"]) {\n\ttransition: filter 0.3s ease !important;\n}\nhtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] img:not([class*=\"emoji\"]):not([class*=\"mfm\"]):not([class*=\"reaction\"]):not([class*=\"avatar\"]):hover {\n\tfilter: grayscale(0.2) contrast(1.12) !important;\n}\n\n@media (prefers-reduced-motion: reduce) {\n\thtml[data-xtcymc-exp=\"newsprint\"][data-xtcymc-exp-bg] * {\n\t\tanimation: none !important;\n\t}\n}\n",
};

// ─────────────────────────────────────────────────────────────────────────────
//  TERMINAL · 终端 — 黑曜底、终端绿、monospace、绿框、ASCII 角括号链接
// ─────────────────────────────────────────────────────────────────────────────
const TERMINAL: ExpTheme = {
	id: 'terminal', name: 'Terminal · 终端',
	tagline: '深色等宽终端：黑曜底、终端绿、绿色框线、<尖括号>链接',
	icon: 'ti ti-terminal-2', scheme: 'dark',
	radius: '0px', margin: '12px', blur: 'blur(0px)', modalBgFilter: 'blur(0px)',
	palette: {
		accent: '#00FF88', accentedBg: 'rgba(0,255,136,0.12)', love: '#FB7185', focus: 'rgba(0,255,136,0.4)',
		bg: '#0A0E14', fg: '#B7C0D3', fgHighlighted: '#E6F0E6', fgOnAccent: '#04110B', fgOnWhite: '#00FF88',
		divider: 'rgba(0,255,136,0.22)', indicator: '#FFB454',
		panel: '#0E141C', panelHighlight: '#16202B', panelHeaderBg: '#050709', panelHeaderFg: '#00FF88',
		panelBorder: 'solid 1px rgba(0,255,136,0.28)', windowHeader: '#050709', popup: '#0E141C',
		shadow: 'rgba(0,255,136,0.10)', header: 'rgba(5,7,9,0.85)',
		navBg: '#050709', navFg: '#B7C0D3', navActive: '#00FF88', navIndicator: '#FFB454',
		pageHeaderBg: '#050709', pageHeaderFg: '#00FF88',
		link: '#59C2FF', hashtag: '#FFB454', mention: '#00FF88', mentionMe: '#FB7185', renote: '#FFB454',
		modalBg: 'rgba(0,8,5,0.7)', scrollbarHandle: 'rgba(0,255,136,0.25)', scrollbarHandleHover: 'rgba(0,255,136,0.45)',
		dateLabelFg: '#7FE9B5', infoBg: '#0C1F17', infoFg: '#7FE9B5', infoWarnBg: '#2A2410', infoWarnFg: '#FFB454',
		folderHeaderBg: 'rgba(0,255,136,0.06)', folderHeaderHoverBg: 'rgba(0,255,136,0.12)',
		buttonBg: '#0E141C', buttonHoverBg: 'rgba(0,255,136,0.15)', buttonGradateA: '#00FF88', buttonGradateB: '#00C46A',
		switchBg: 'rgba(0,255,136,0.2)', switchOffBg: 'rgba(0,255,136,0.12)', switchOffFg: '#0A0E14', switchOnBg: 'rgba(0,255,136,0.2)', switchOnFg: '#00FF88',
		inputBorder: 'rgba(0,255,136,0.3)', inputBorderHover: 'rgba(0,255,136,0.5)', badge: '#FFB454', messageBg: '#0A0E14',
		success: '#00FF88', error: '#FB7185', warn: '#FFB454',
		codeString: '#FFB454', codeNumber: '#00FF88', codeBoolean: '#F472B6', deckBg: '#05080C', htmlThemeColor: '#0A0E14',
	},
	structural: `
html[data-xtcymc-exp="terminal"],
html[data-xtcymc-exp="terminal"] * {
	font-family: "JetBrains Mono","Cascadia Code","Sarasa Mono SC","IBM Plex Mono",Consolas,"DejaVu Sans Mono",monospace !important;
	letter-spacing: 0 !important;
}
/* 还原图标字体：* 选择器特异性会盖过 tabler 的 .ti，必须显式恢复，否则图标变 □ */
html[data-xtcymc-exp="terminal"] .ti,
html[data-xtcymc-exp="terminal"] [class*="ti-"],
html[data-xtcymc-exp="terminal"] i[class^="ti"] { font-family: "tabler-icons" !important; }
html[data-xtcymc-exp="terminal"] { font-size: 13.5px !important; }
html[data-xtcymc-exp="terminal"] * { border-radius: 0 !important; }
html[data-xtcymc-exp="terminal"] body { background: #0A0E14 !important; }
html[data-xtcymc-exp="terminal"] ._panel { border: 1px solid rgba(0,255,136,0.28) !important; box-shadow: none !important; }
html[data-xtcymc-exp="terminal"] ._popup { border: 1px solid rgba(0,255,136,0.4) !important; }
html[data-xtcymc-exp="terminal"] article { border-bottom: 1px solid rgba(0,255,136,0.18) !important; }
/* 输入框：黑底绿字绿光标 */
html[data-xtcymc-exp="terminal"] input,
html[data-xtcymc-exp="terminal"] textarea {
	background: #050709 !important; border: 1px solid rgba(0,255,136,0.35) !important; color: #00FF88 !important; caret-color: #00FF88 !important;
}
html[data-xtcymc-exp="terminal"] input::placeholder,
html[data-xtcymc-exp="terminal"] textarea::placeholder { color: rgba(183,192,211,0.4) !important; }
/* 描边按钮：[ 方括号 ] 包裹、大写 */
html[data-xtcymc-exp="terminal"] ._borderButton { border: 1px solid rgba(0,255,136,0.5) !important; text-transform: uppercase !important; }
html[data-xtcymc-exp="terminal"] ._borderButton::before { content: "[ " !important; color: #00FF88 !important; }
html[data-xtcymc-exp="terminal"] ._borderButton::after { content: " ]" !important; color: #00FF88 !important; }
/* 显式链接：<尖括号> */
html[data-xtcymc-exp="terminal"] ._link::before { content: "<" !important; opacity: 0.6 !important; }
html[data-xtcymc-exp="terminal"] ._link::after { content: ">" !important; opacity: 0.6 !important; }
/* sticky 页眉：近黑 + 绿色下边线，去模糊 */
html[data-xtcymc-exp="terminal"] [style*="--MI-stickyTop"] {
	background: #050709 !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
	border-bottom: 1px solid rgba(0,255,136,0.3) !important;
}
`,
	aggressive: "/* ── TERMINAL · aggressive: CRT 显像管常驻背景 —— 绿色字符矩阵雨 + 磷光网格 + 慢速扫描线 + 暗角 ── */\n\n/* 1) 半透明表面：揭示 body 上的 CRT 背景层（双属性特异性高于 structural；深色主题 bg 压低更沉浸） */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(10,14,20,0.5) !important;\n\t--MI_THEME-deckBg: rgba(5,8,12,0.46) !important;\n\t--MI_THEME-navBg: rgba(5,7,9,0.6) !important;\n\t--MI_THEME-pageHeaderBg: rgba(5,7,9,0.90) !important;\n\t--MI_THEME-panelHeaderBg: rgba(5,7,9,0.92) !important;\n\t--MI_THEME-panel: rgba(14,20,28,0.92) !important;\n\t--MI_THEME-popup: rgba(14,20,28,0.94) !important;\n}\n\n/* 2) body：近黑磷光底 + 中心绿色辉光 + CRT 暗角，固定铺满视口，作为常驻背景与定位上下文 */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] body {\n\tbackground:\n\t\tradial-gradient(ellipse 70% 55% at 50% 40%, rgba(0,255,136,0.10), transparent 62%),\n\t\tradial-gradient(ellipse 120% 120% at 50% 50%, transparent 52%, rgba(0,0,0,0.62) 100%),\n\t\tlinear-gradient(180deg, #070B11 0%, #060A0F 55%, #04070B 100%) !important;\n\tbackground-attachment: fixed !important;\n\tposition: relative !important;\n}\n\n/* 3) body::before：鲜明的终端绿磷光网格 + 等宽字符矩阵雨竖列，置于内容之后(z-index 0)，每页常驻透出 */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground-image:\n\t\trepeating-linear-gradient(to bottom, rgba(0,255,136,0.65) 0, rgba(0,255,136,0.0) 2px, rgba(0,255,136,0.0) 14px, rgba(0,255,136,0.0) 22px),\n\t\trepeating-linear-gradient(90deg, rgba(0,255,136,0.10) 0, rgba(0,255,136,0.10) 1px, transparent 1px, transparent 36px),\n\t\tlinear-gradient(rgba(0,255,136,0.10) 1px, transparent 1px) !important;\n\tbackground-size:\n\t\t36px 220px,\n\t\t36px 36px,\n\t\t36px 36px !important;\n\tbackground-position: 0 0, 0 0, 0 0 !important;\n\topacity: 0.9 !important;\n\t-webkit-mask-image: radial-gradient(ellipse 95% 95% at 50% 45%, #000 55%, rgba(0,0,0,0.35) 100%) !important;\n\tmask-image: radial-gradient(ellipse 95% 95% at 50% 45%, #000 55%, rgba(0,0,0,0.35) 100%) !important;\n\tanimation: kf-terminal-rain 14s linear infinite, kf-terminal-grid 26s linear infinite, kf-terminal-flicker 7s steps(40) infinite !important;\n}\n\n/* 4) body::after：全屏 CRT 扫描线 + 边缘弧光暗角，缓慢向下滚动，置于内容之后(z-index 0)常驻 */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground:\n\t\trepeating-linear-gradient(to bottom, rgba(0,0,0,0) 0px, rgba(0,0,0,0) 2px, rgba(0,0,0,0.22) 3px, rgba(0,0,0,0.22) 4px),\n\t\tradial-gradient(ellipse 60% 50% at 50% 45%, rgba(0,255,136,0.06), transparent 60%) !important;\n\tbackground-size: 100% 4px, 100% 100% !important;\n\tanimation: kf-terminal-scan 8s linear infinite, kf-terminal-flicker 5.5s steps(33) infinite reverse !important;\n}\n\n/* 5) 薄扫描线置顶叠层（在内容之上，不挡点击）—— 强化“显示器玻璃”观感，挂在 ._spacer 上 */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._spacer::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 9998 !important;\n\tbackground: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,255,136,0.035) 3px, rgba(0,0,0,0) 4px) !important;\n\topacity: 0.55 !important;\n\tanimation: kf-terminal-scan 8s linear infinite !important;\n}\n\n/* 6) 面板/帖子：保持可读（>=.88 alpha 实色坐底），绿色描边随悬停脉冲发光、轻微上浮 */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: rgba(14,20,28,0.92) !important;\n\tanimation: kf-terminal-edge 4.2s ease-in-out infinite !important;\n}\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: rgba(14,20,28,0.94) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n}\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._panel,\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] article {\n\ttransition: box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease !important;\n}\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._panel:hover,\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] article:hover {\n\tborder-color: rgba(0,255,136,0.55) !important;\n\tbox-shadow: 0 0 0 1px rgba(0,255,136,0.35), 0 0 18px rgba(0,255,136,0.18) !important;\n\ttransform: translateY(-1px) !important;\n}\n\n/* 7) 标题：终端绿磷光余辉 + 缓慢闪烁 + 末尾闪烁方块光标 */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] h1,\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] h2 {\n\tcolor: #00FF88 !important;\n\ttext-shadow: 0 0 4px rgba(0,255,136,0.6), 0 0 12px rgba(0,255,136,0.35) !important;\n\tanimation: kf-terminal-textflicker 5s steps(1) infinite !important;\n}\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] h1::after,\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] h2::after {\n\tcontent: \"_\" !important;\n\tdisplay: inline-block !important;\n\tmargin-left: 0.12em !important;\n\tcolor: #00FF88 !important;\n\ttext-shadow: 0 0 6px rgba(0,255,136,0.7) !important;\n\tanimation: kf-terminal-cursor 1.06s steps(1) infinite !important;\n}\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] h3 {\n\ttext-shadow: 0 0 6px rgba(0,255,136,0.28) !important;\n}\n\n/* 8) 链接/强调 磷光描边 + 悬停亮起 */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._link {\n\ttext-shadow: 0 0 5px rgba(89,194,255,0.45) !important;\n}\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._link:hover {\n\ttext-shadow: 0 0 8px rgba(89,194,255,0.7), 0 0 16px rgba(0,255,136,0.4) !important;\n\ttransition: text-shadow 0.2s ease !important;\n}\n\n/* 9) 按钮：绿色辉光呼吸 + 悬停亮起 */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._buttonGradate {\n\tbox-shadow: 0 0 10px rgba(0,255,136,0.35) !important;\n\tanimation: kf-terminal-pulse 3.4s ease-in-out infinite !important;\n}\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._buttonGradate:hover { filter: brightness(1.15) !important; }\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._borderButton {\n\ttransition: box-shadow 0.2s ease, text-shadow 0.2s ease !important;\n}\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tbox-shadow: 0 0 12px rgba(0,255,136,0.5), inset 0 0 8px rgba(0,255,136,0.12) !important;\n\ttext-shadow: 0 0 6px rgba(0,255,136,0.6) !important;\n}\n\n/* 10) 输入框聚焦：绿色光标内辉光 */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] input:focus,\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] textarea:focus {\n\tbox-shadow: 0 0 0 1px rgba(0,255,136,0.5), inset 0 0 12px rgba(0,255,136,0.10) !important;\n\ttext-shadow: 0 0 5px rgba(0,255,136,0.5) !important;\n}\n\n/* 11) sticky 页眉：底部绿色扫描条缓慢左右掠过 */\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tborder-bottom: 1px solid rgba(0,255,136,0.4) !important;\n\tbox-shadow: 0 1px 14px rgba(0,255,136,0.16) !important;\n\tposition: relative !important;\n}\nhtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"]::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important; left: 0 !important; right: 0 !important; bottom: 0 !important;\n\theight: 2px !important; pointer-events: none !important;\n\tbackground: linear-gradient(90deg, transparent, rgba(0,255,136,0.85), transparent) !important;\n\tbackground-size: 40% 100% !important; background-repeat: no-repeat !important;\n\tanimation: kf-terminal-sweep 6s linear infinite !important;\n}\n\n@keyframes kf-terminal-rain {\n\t0%   { background-position: 0 0, 0 0, 0 0; }\n\t100% { background-position: 0 220px, 0 0, 0 0; }\n}\n@keyframes kf-terminal-grid {\n\t0%   { background-position: 0 0, 0 0, 0 0; }\n\t100% { background-position: 0 0, 36px 0, 0 36px; }\n}\n@keyframes kf-terminal-scan {\n\t0%   { background-position: 0 0; }\n\t100% { background-position: 0 64px; }\n}\n@keyframes kf-terminal-flicker {\n\t0%, 92%, 100% { opacity: 1; }\n\t93%  { opacity: 0.92; }\n\t95%  { opacity: 0.98; }\n\t97%  { opacity: 0.9; }\n}\n@keyframes kf-terminal-textflicker {\n\t0%, 92%, 100% { text-shadow: 0 0 4px rgba(0,255,136,0.6), 0 0 12px rgba(0,255,136,0.35); }\n\t94% { text-shadow: 0 0 2px rgba(0,255,136,0.2); }\n\t96% { text-shadow: 0 0 7px rgba(0,255,136,0.8), 0 0 16px rgba(0,255,136,0.45); }\n}\n@keyframes kf-terminal-cursor {\n\t0%, 49%  { opacity: 1; }\n\t50%, 100% { opacity: 0; }\n}\n@keyframes kf-terminal-edge {\n\t0%, 100% { box-shadow: 0 0 0 1px rgba(0,255,136,0.18), none; }\n\t50%      { box-shadow: 0 0 0 1px rgba(0,255,136,0.32), 0 0 14px rgba(0,255,136,0.12); }\n}\n@keyframes kf-terminal-pulse {\n\t0%, 100% { box-shadow: 0 0 8px rgba(0,255,136,0.28); }\n\t50%      { box-shadow: 0 0 16px rgba(0,255,136,0.5); }\n}\n@keyframes kf-terminal-sweep {\n\t0%   { background-position: -40% 0; }\n\t100% { background-position: 140% 0; }\n}\n\n/* MOTION SAFETY */\n@media (prefers-reduced-motion: reduce) {\n\thtml[data-xtcymc-exp=\"terminal\"][data-xtcymc-exp-bg] * { animation: none !important; }\n}\n",
};

// ─────────────────────────────────────────────────────────────────────────────
//  GLASS · 流光 — 彩虹渐变底、磨砂玻璃面板、柔光内阴影、胶囊按钮
// ─────────────────────────────────────────────────────────────────────────────
const GLASS: ExpTheme = {
	id: 'glass', name: 'Glass · 流光',
	tagline: '玻璃拟态：彩虹渐变背景、磨砂半透明面板、柔光内阴影、胶囊按钮',
	icon: 'ti ti-droplet-half-2-filled', scheme: 'light',
	radius: '22px', margin: '16px', blur: 'blur(28px) saturate(1.4)', modalBgFilter: 'blur(28px) saturate(1.4)',
	palette: {
		accent: '#7A3FF2', accentedBg: 'rgba(122,63,242,0.16)', love: '#E0608A', focus: 'rgba(122,63,242,0.4)',
		bg: '#ECE7FF', fg: '#1A1233', fgHighlighted: '#07061A', fgOnAccent: '#ffffff', fgOnWhite: '#7A3FF2',
		divider: 'rgba(255,255,255,0.6)', indicator: '#7A3FF2',
		panel: 'rgba(255,255,255,0.45)', panelHighlight: 'rgba(255,255,255,0.62)', panelHeaderBg: 'rgba(255,255,255,0.55)', panelHeaderFg: '#1A1233',
		panelBorder: 'solid 1px rgba(255,255,255,0.6)', windowHeader: 'rgba(255,255,255,0.55)', popup: 'rgba(255,255,255,0.6)',
		shadow: 'rgba(80,40,140,0.18)', header: 'rgba(255,255,255,0.45)',
		navBg: 'rgba(255,255,255,0.32)', navFg: '#1A1233', navActive: '#7A3FF2', navIndicator: '#7A3FF2',
		pageHeaderBg: 'rgba(255,255,255,0.5)', pageHeaderFg: '#1A1233',
		link: '#2E8FB8', hashtag: '#E0608A', mention: '#7A3FF2', mentionMe: '#D6457A', renote: '#2BB39A',
		modalBg: 'rgba(40,20,70,0.35)', scrollbarHandle: 'rgba(122,63,242,0.3)', scrollbarHandleHover: 'rgba(122,63,242,0.5)',
		dateLabelFg: '#3A2A66', infoBg: 'rgba(255,255,255,0.5)', infoFg: '#3A2A66', infoWarnBg: 'rgba(255,225,180,0.55)', infoWarnFg: '#7A5311',
		folderHeaderBg: 'rgba(255,255,255,0.35)', folderHeaderHoverBg: 'rgba(255,255,255,0.55)',
		buttonBg: 'rgba(255,255,255,0.5)', buttonHoverBg: 'rgba(255,255,255,0.72)', buttonGradateA: '#7A3FF2', buttonGradateB: '#2E8FB8',
		switchBg: 'rgba(122,63,242,0.2)', switchOffBg: 'rgba(0,0,0,0.12)', switchOffFg: '#ffffff', switchOnBg: '#7A3FF2', switchOnFg: '#ffffff',
		inputBorder: 'rgba(255,255,255,0.6)', inputBorderHover: 'rgba(255,255,255,0.85)', badge: '#7A3FF2', messageBg: 'rgba(255,255,255,0.45)',
		success: '#2BB39A', error: '#E0506A', warn: '#E0A23F',
		codeString: '#7A3FF2', codeNumber: '#2E8FB8', codeBoolean: '#E0608A', deckBg: '#E0DAFF', htmlThemeColor: '#C9B8FF',
	},
	structural: `
html[data-xtcymc-exp="glass"],
html[data-xtcymc-exp="glass"] body,
html[data-xtcymc-exp="glass"] button,
html[data-xtcymc-exp="glass"] input,
html[data-xtcymc-exp="glass"] textarea {
	font-family: "Inter","Hiragino Sans GB","PingFang SC","Segoe UI Variable","Segoe UI",system-ui,sans-serif !important;
}
/* 彩虹流光背景，固定在视口 */
html[data-xtcymc-exp="glass"] body {
	background:
		radial-gradient(ellipse at 12% 16%, rgba(122,63,242,0.55), transparent 48%),
		radial-gradient(ellipse at 88% 20%, rgba(46,143,184,0.50), transparent 48%),
		radial-gradient(ellipse at 16% 88%, rgba(224,96,138,0.48), transparent 50%),
		radial-gradient(ellipse at 84% 84%, rgba(43,179,154,0.48), transparent 50%),
		linear-gradient(135deg, #FFE6FB 0%, #E6F2FF 45%, #FFE6EC 100%) !important;
	background-attachment: fixed !important;
}
/* 面板 = 磨砂玻璃片 */
html[data-xtcymc-exp="glass"] ._panel {
	background: rgba(255,255,255,0.45) !important;
	border: 1px solid rgba(255,255,255,0.6) !important;
	box-shadow: 0 8px 32px rgba(80,40,140,0.12), inset 0 1px 0 rgba(255,255,255,0.85) !important;
	-webkit-backdrop-filter: blur(28px) saturate(1.4) !important; backdrop-filter: blur(28px) saturate(1.4) !important;
	border-radius: 22px !important;
}
html[data-xtcymc-exp="glass"] ._popup,
html[data-xtcymc-exp="glass"] ._acrylic {
	background: rgba(255,255,255,0.5) !important; border: 1px solid rgba(255,255,255,0.6) !important;
	-webkit-backdrop-filter: blur(28px) saturate(1.4) !important; backdrop-filter: blur(28px) saturate(1.4) !important;
}
/* 圆角胶囊按钮 */
html[data-xtcymc-exp="glass"] ._buttonPrimary,
html[data-xtcymc-exp="glass"] ._buttonGradate,
html[data-xtcymc-exp="glass"] ._borderButton { border-radius: 999px !important; }
html[data-xtcymc-exp="glass"] ._borderButton { border: 1px solid rgba(255,255,255,0.7) !important; background: rgba(255,255,255,0.45) !important; }
/* sticky 页眉：磨砂玻璃 */
html[data-xtcymc-exp="glass"] [style*="--MI-stickyTop"] {
	-webkit-backdrop-filter: blur(28px) saturate(1.4) !important; backdrop-filter: blur(28px) saturate(1.4) !important;
}
/* 头像柔光浮起 */
html[data-xtcymc-exp="glass"] img[class*="avatar"],
html[data-xtcymc-exp="glass"] [class*="avatar"] > img { box-shadow: 0 4px 14px rgba(80,40,140,0.22) !important; }
`,
	aggressive: "/* ── GLASS · 流光 — aggressive: 常驻极光/虹彩流光，磨砂玻璃面板后缓缓漂移 ── */\n\n/* 重声明半透明表面：让 body 上的极光色斑透过 UI 缝隙常驻显现（双属性特异性高于 structural） */\n/* 浅色主题：bg/deckBg 偏通透让 gutter 背景更亮，navBg/pageHeaderBg 取高 alpha 保侧栏与页眉文字清晰 */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(236,231,255,0.42) !important;\n\t--MI_THEME-deckBg: rgba(224,218,255,0.4) !important;\n\t--MI_THEME-navBg: rgba(245,242,255,0.5) !important;\n\t--MI_THEME-pageHeaderBg: rgba(248,246,255,0.90) !important;\n\t--MI_THEME-header: rgba(248,246,255,0.86) !important;\n}\n\n/* body：固定铺底的明亮虹彩渐变，作为定位上下文与最底层 */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] body {\n\tbackground:\n\t\tlinear-gradient(135deg, #F3ECFF 0%, #ECF4FF 38%, #FFEFF9 72%, #EAFBFF 100%) !important;\n\tbackground-attachment: fixed !important;\n\tposition: relative !important;\n}\n\n/* body::before：大块柔和的极光/虹彩色斑层（紫/青/粉），缓慢漂移 + 轻微缩放，透过半透明面板常驻显现 */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tinset: -25% !important;\n\tz-index: 0 !important;\n\tpointer-events: none !important;\n\tbackground:\n\t\tradial-gradient(closest-side at 20% 26%, rgba(122,63,242,0.62), transparent 72%),\n\t\tradial-gradient(closest-side at 80% 18%, rgba(46,143,184,0.58), transparent 72%),\n\t\tradial-gradient(closest-side at 24% 82%, rgba(224,96,138,0.56), transparent 72%),\n\t\tradial-gradient(closest-side at 82% 80%, rgba(43,179,154,0.54), transparent 72%),\n\t\tradial-gradient(closest-side at 52% 50%, rgba(173,224,255,0.42), transparent 70%) !important;\n\tbackground-size: 78% 78%, 72% 72%, 80% 80%, 74% 74%, 90% 90% !important;\n\tbackground-repeat: no-repeat !important;\n\tfilter: blur(46px) saturate(1.3) !important;\n\twill-change: transform, background-position !important;\n\tanimation: kf-glass-blobs 38s ease-in-out infinite alternate !important;\n}\n\n/* body::after：漂浮的散景光球层，固定全屏、不挡点击、明亮通透 */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tz-index: 0 !important;\n\tpointer-events: none !important;\n\topacity: 0.55 !important;\n\tbackground:\n\t\tradial-gradient(circle at 14% 70%, rgba(255,255,255,0.9) 0 6px, transparent 7px),\n\t\tradial-gradient(circle at 30% 30%, rgba(201,184,255,0.8) 0 9px, transparent 10px),\n\t\tradial-gradient(circle at 64% 80%, rgba(255,255,255,0.75) 0 5px, transparent 6px),\n\t\tradial-gradient(circle at 82% 40%, rgba(173,224,255,0.75) 0 11px, transparent 12px),\n\t\tradial-gradient(circle at 50% 18%, rgba(255,214,235,0.75) 0 7px, transparent 8px),\n\t\tradial-gradient(circle at 40% 58%, rgba(190,255,235,0.7) 0 8px, transparent 9px) !important;\n\tfilter: blur(2px) !important;\n\twill-change: transform !important;\n\tanimation: kf-glass-bokeh 28s ease-in-out infinite alternate !important;\n}\n\n/* 面板 = 磨砂玻璃片：保持可读（≥.88 alpha 实色卡片），正文坐在卡片上、背景只在缝隙透出 */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: rgba(255,255,255,0.9) !important;\n\tborder: 1px solid rgba(255,255,255,0.65) !important;\n\tbox-shadow: 0 8px 32px rgba(80,40,140,0.14), inset 0 1px 0 rgba(255,255,255,0.95) !important;\n\tposition: relative !important;\n\ttransition: transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s ease !important;\n}\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: rgba(255,255,255,0.92) !important;\n\tborder: 1px solid rgba(255,255,255,0.65) !important;\n}\n\n/* article 沿用面板浮起过渡 */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] article {\n\tposition: relative !important;\n\ttransition: transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s ease !important;\n}\n\n/* 面板/article 悬浮：轻微浮起 + 放大 + 提亮内阴影 */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._panel:hover,\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] article:hover {\n\ttransform: translateY(-3px) scale(1.006) !important;\n\tbox-shadow: 0 18px 48px rgba(80,40,140,0.24), inset 0 1px 0 rgba(255,255,255,0.98) !important;\n}\n\n/* 斜向光扫：悬浮触发，一道高光从左下扫到右上 */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._panel::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important;\n\tinset: 0 !important;\n\tz-index: 1 !important;\n\tpointer-events: none !important;\n\tborder-radius: inherit !important;\n\tbackground: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.55) 48%, rgba(255,255,255,0.0) 64%) !important;\n\tbackground-size: 250% 250% !important;\n\tbackground-position: 120% 120% !important;\n\topacity: 0 !important;\n\ttransition: opacity 0.2s ease !important;\n}\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._panel:hover::after {\n\topacity: 1 !important;\n\tanimation: kf-glass-sweep 0.9s ease-out !important;\n}\n\n/* 渐变按钮：流动的彩虹渐变 + 缓慢呼吸光晕 */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._buttonGradate,\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._buttonPrimary {\n\tbackground-image: linear-gradient(90deg, #7A3FF2, #2E8FB8, #2BB39A, #E0608A, #7A3FF2) !important;\n\tbackground-size: 300% 100% !important;\n\tanimation: kf-glass-flow 9s linear infinite, kf-glass-pulse 4.5s ease-in-out infinite !important;\n\ttransition: transform 0.25s ease !important;\n}\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._buttonGradate:hover,\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._buttonPrimary:hover {\n\ttransform: translateY(-1px) scale(1.03) !important;\n}\n\n/* 链接：悬浮时柔光渐显 */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] ._link:hover {\n\ttext-shadow: 0 0 10px rgba(122,63,242,0.45) !important;\n\ttransition: text-shadow 0.25s ease !important;\n}\n\n/* sticky 页眉：轻微的呼吸式高光带，强化流光气质（保持可读底色） */\nhtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tbackground-image: linear-gradient(90deg, rgba(122,63,242,0.12), rgba(46,143,184,0.12), rgba(224,96,138,0.12), rgba(122,63,242,0.12)) !important;\n\tbackground-size: 300% 100% !important;\n\tanimation: kf-glass-flow 16s linear infinite !important;\n}\n\n/* ── keyframes（全局唯一，kf-glass- 前缀） ── */\n@keyframes kf-glass-blobs {\n\t0%   { transform: translate3d(0,0,0) scale(1) rotate(0deg); background-position: 0% 0%, 100% 0%, 0% 100%, 100% 100%, 50% 50%; }\n\t50%  { transform: translate3d(2%,-2%,0) scale(1.08) rotate(2deg); background-position: 12% 8%, 88% 10%, 8% 90%, 90% 88%, 56% 44%; }\n\t100% { transform: translate3d(-2%,2%,0) scale(1.04) rotate(-2deg); background-position: 4% 16%, 96% 4%, 16% 84%, 84% 96%, 46% 56%; }\n}\n@keyframes kf-glass-bokeh {\n\t0%   { transform: translate3d(0,0,0) scale(1); }\n\t50%  { transform: translate3d(-1.5%,-2.5%,0) scale(1.05); }\n\t100% { transform: translate3d(2%,1.5%,0) scale(0.98); }\n}\n@keyframes kf-glass-sweep {\n\t0%   { background-position: 120% 120%; }\n\t100% { background-position: -40% -40%; }\n}\n@keyframes kf-glass-flow {\n\t0%   { background-position: 0% 50%; }\n\t100% { background-position: 300% 50%; }\n}\n@keyframes kf-glass-pulse {\n\t0%,100% { box-shadow: 0 4px 18px rgba(122,63,242,0.32), 0 0 0 rgba(46,143,184,0); }\n\t50%     { box-shadow: 0 8px 28px rgba(46,143,184,0.45), 0 0 16px rgba(122,63,242,0.30); }\n}\n\n/* ── 动效安全：尊重 prefers-reduced-motion ── */\n@media (prefers-reduced-motion: reduce) {\n\thtml[data-xtcymc-exp=\"glass\"][data-xtcymc-exp-bg] * { animation: none !important; }\n}\n",
};

// ─────────────────────────────────────────────────────────────────────────────
//  BRUTALIST · 粗野 — 米黄网格底、3px 黑硬边、6px 偏移硬阴影、多巴胺亮红、大写黑体
// ─────────────────────────────────────────────────────────────────────────────
const BRUTALIST: ExpTheme = {
	id: 'brutalist', name: 'Brutalist · 粗野',
	tagline: '新粗野主义：米黄网格底、3px 黑硬边、6px 偏移硬阴影、多巴胺亮红、大写黑体',
	icon: 'ti ti-brand-blender', scheme: 'light',
	radius: '0px', margin: '18px', blur: 'blur(0px)', modalBgFilter: 'blur(0px)',
	palette: {
		accent: '#FF3D00', accentedBg: '#FFEB00', love: '#FF3D00', focus: '#FF3D00',
		bg: '#F5F1E8', fg: '#000000', fgHighlighted: '#000000', fgOnAccent: '#ffffff', fgOnWhite: '#FF3D00',
		divider: '#000000', indicator: '#FF3D00',
		panel: '#FFFFFF', panelHighlight: '#FFE8D9', panelHeaderBg: '#000000', panelHeaderFg: '#FFEB00',
		panelBorder: 'solid 3px #000000', windowHeader: '#FFFFFF', popup: '#FFFFFF',
		shadow: '#000000', header: '#F5F1E8',
		navBg: '#FFD9C2', navFg: '#000000', navActive: '#FF3D00', navIndicator: '#FF3D00',
		pageHeaderBg: '#000000', pageHeaderFg: '#FFEB00',
		link: '#0033FF', hashtag: '#FF3D00', mention: '#00A33A', mentionMe: '#00A33A', renote: '#00A33A',
		modalBg: 'rgba(0,0,0,0.45)', scrollbarHandle: '#000000', scrollbarHandleHover: '#FF3D00',
		dateLabelFg: '#000000', infoBg: '#FFEB00', infoFg: '#000000', infoWarnBg: '#FF3D00', infoWarnFg: '#FFFFFF',
		folderHeaderBg: 'rgba(0,0,0,0.06)', folderHeaderHoverBg: '#FFEB00',
		buttonBg: '#FFFFFF', buttonHoverBg: '#FFEB00', buttonGradateA: '#FF3D00', buttonGradateB: '#FF3D00',
		switchBg: 'rgba(0,0,0,0.2)', switchOffBg: '#000000', switchOffFg: '#FFFFFF', switchOnBg: '#FF3D00', switchOnFg: '#FFFFFF',
		inputBorder: '#000000', inputBorderHover: '#FF3D00', badge: '#FF3D00', messageBg: '#FFFFFF',
		success: '#00A33A', error: '#FF3D00', warn: '#FFAA00',
		codeString: '#FF3D00', codeNumber: '#0033FF', codeBoolean: '#00A33A', deckBg: '#EDE7D8', htmlThemeColor: '#F5F1E8',
	},
	structural: `
html[data-xtcymc-exp="brutalist"],
html[data-xtcymc-exp="brutalist"] body,
html[data-xtcymc-exp="brutalist"] button,
html[data-xtcymc-exp="brutalist"] input,
html[data-xtcymc-exp="brutalist"] textarea {
	font-family: "Archivo","Inter","Helvetica Neue","Noto Sans CJK SC","PingFang SC",Arial,sans-serif !important;
	font-weight: 700 !important;
}
html[data-xtcymc-exp="brutalist"] * { border-radius: 0 !important; }
/* 米黄 + 22px 网格底 */
html[data-xtcymc-exp="brutalist"] body {
	background-color: #F5F1E8 !important;
	background-image: linear-gradient(rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.05) 1px, transparent 1px) !important;
	background-size: 22px 22px !important;
}
/* 面板 = 3px 黑边 + 6px 偏移硬阴影 */
html[data-xtcymc-exp="brutalist"] ._panel { border: 3px solid #000 !important; box-shadow: 6px 6px 0 #000 !important; }
html[data-xtcymc-exp="brutalist"] ._shadow { box-shadow: 6px 6px 0 #000 !important; }
html[data-xtcymc-exp="brutalist"] ._popup { border: 3px solid #000 !important; box-shadow: 6px 6px 0 #000 !important; }
/* 帖子独立成硬卡片 */
html[data-xtcymc-exp="brutalist"] article {
	border: 3px solid #000 !important; box-shadow: 4px 4px 0 #000 !important; background: #fff !important; margin: 0 0 8px !important;
}
/* 按钮：硬边 + 偏移阴影 + 按下位移 */
html[data-xtcymc-exp="brutalist"] ._buttonPrimary,
html[data-xtcymc-exp="brutalist"] ._buttonGradate,
html[data-xtcymc-exp="brutalist"] ._borderButton {
	border: 3px solid #000 !important; box-shadow: 4px 4px 0 #000 !important; text-transform: uppercase !important; font-weight: 800 !important;
}
html[data-xtcymc-exp="brutalist"] ._buttonPrimary:active,
html[data-xtcymc-exp="brutalist"] ._buttonGradate:active,
html[data-xtcymc-exp="brutalist"] ._borderButton:active { transform: translate(2px,2px) !important; box-shadow: 2px 2px 0 #000 !important; }
/* 输入框硬边 */
html[data-xtcymc-exp="brutalist"] input,
html[data-xtcymc-exp="brutalist"] textarea { border: 3px solid #000 !important; background: #fff !important; }
/* 标题大写黑体 */
html[data-xtcymc-exp="brutalist"] h1,
html[data-xtcymc-exp="brutalist"] h2,
html[data-xtcymc-exp="brutalist"] h3 { text-transform: uppercase !important; font-weight: 900 !important; letter-spacing: -0.02em !important; }
/* 链接（仅正文 ._link） */
html[data-xtcymc-exp="brutalist"] ._link { color: #0033FF !important; text-decoration: underline !important; text-decoration-thickness: 2px !important; text-underline-offset: 2px !important; }
/* 头像方形黑边 + 红阴影 */
html[data-xtcymc-exp="brutalist"] img[class*="avatar"],
html[data-xtcymc-exp="brutalist"] [class*="avatar"] { border: 3px solid #000 !important; box-shadow: 3px 3px 0 #FF3D00 !important; }
/* sticky 页眉：纯黑 + 红色硬投影 + 黄字 */
html[data-xtcymc-exp="brutalist"] [style*="--MI-stickyTop"] {
	background: #000 !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important;
	box-shadow: 0 6px 0 #FF3D00 !important; border-bottom: 0 !important;
}
html[data-xtcymc-exp="brutalist"] [style*="--MI-stickyTop"] i,
html[data-xtcymc-exp="brutalist"] [style*="--MI-stickyTop"] span,
html[data-xtcymc-exp="brutalist"] [style*="--MI-stickyTop"] div { color: #FFEB00 !important; }
`,
	aggressive: "\n/* ===== BRUTALIST · aggressive — raw concrete, heavy construction grid, caution-tape, persistent immersive bg ===== */\n\n/* the heavy construction grid floor slowly drifts so the whole page feels like a live site plan */\n@keyframes kf-brutalist-gridroll { 0%{ background-position:0 0,0 0,0 0,0 0; } 100%{ background-position:0 0,0 0,48px 0,0 48px; } }\n/* caution-tape diagonal stripes crawl across the header banner */\n@keyframes kf-brutalist-hazard { 0%{ background-position:0 0; } 100%{ background-position:128px 0; } }\n/* slow caution-tape crawl on the body decoration corners */\n@keyframes kf-brutalist-tapecrawl { 0%{ background-position:0 0; } 100%{ background-position:113px 0; } }\n/* concrete blueprint grid drifts diagonally on the rear decoration plane */\n@keyframes kf-brutalist-blueprint { 0%{ background-position:0 0,0 0; } 100%{ background-position:90px 90px,90px 90px; } }\n/* dopamine red pulse for the gradient/primary buttons */\n@keyframes kf-brutalist-redpulse { 0%,100%{ box-shadow:4px 4px 0 #000; background-color:#FF3D00; } 50%{ box-shadow:6px 6px 0 #000; background-color:#FF5722; } }\n/* tiny wiggle when a card is hovered */\n@keyframes kf-brutalist-wiggle { 0%{ transform:rotate(-0.6deg); } 25%{ transform:rotate(1.2deg); } 50%{ transform:rotate(-1deg); } 75%{ transform:rotate(0.8deg); } 100%{ transform:rotate(-0.6deg); } }\n/* marquee strip slides leftward forever */\n@keyframes kf-brutalist-marquee { 0%{ transform:translateX(0); } 100%{ transform:translateX(-50%); } }\n/* dashed outline crawl */\n@keyframes kf-brutalist-march { to{ background-position:200% 0,0 200%,0 0,100% 100%; } }\n/* yellow flash on the accent badge / indicator */\n@keyframes kf-brutalist-flash { 0%,100%{ background-color:#FF3D00; } 50%{ background-color:#FFEB00; } }\n\n/* re-declare semi-transparent surfaces so the concrete + grid decoration stays visible through every UI gutter (light theme: bg most translucent, nav/header kept readable >=0.86) */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(245,241,232,0.42) !important;\n\t--MI_THEME-deckBg: rgba(237,231,216,0.4) !important;\n\t--MI_THEME-header: rgba(245,241,232,0.86) !important;\n\t--MI_THEME-navBg: rgba(255,217,194,0.5) !important;\n\t--MI_THEME-pageHeaderBg: rgba(0,0,0,0.90) !important;\n}\n\n/* body = persistent fixed base: raw concrete wash + animated heavy black construction grid (22px hairline + 88px bold beams) */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] body {\n\tbackground-color:#E8E2D4 !important;\n\tbackground-image:\n\t\tradial-gradient(circle at 18% 22%, rgba(0,0,0,0.055) 0 2px, transparent 3px),\n\t\tradial-gradient(circle at 73% 64%, rgba(0,0,0,0.05) 0 1.5px, transparent 3px),\n\t\trepeating-linear-gradient(0deg, rgba(0,0,0,0.07) 0 1px, transparent 1px 22px),\n\t\trepeating-linear-gradient(90deg, rgba(0,0,0,0.07) 0 1px, transparent 1px 22px) !important;\n\tbackground-size: 9px 9px, 13px 13px, 100% 22px, 22px 100% !important;\n\tbackground-attachment: fixed !important;\n\tbackground-blend-mode: multiply, multiply, normal, normal !important;\n\tposition: relative !important;\n\tanimation: kf-brutalist-gridroll 14s linear infinite !important;\n}\n\n/* body::before = rear decoration plane: bold black construction beams + faint blueprint cross-grid, slowly drifting (fixed, never blocks clicks) */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] body::before {\n\tcontent:\"\" !important;\n\tposition:fixed !important; inset:0 !important;\n\tpointer-events:none !important; z-index:0 !important;\n\tbackground-image:\n\t\trepeating-linear-gradient(0deg, rgba(0,0,0,0.16) 0 3px, transparent 3px 88px),\n\t\trepeating-linear-gradient(90deg, rgba(0,0,0,0.16) 0 3px, transparent 3px 88px),\n\t\tradial-gradient(circle at 6% 90%, rgba(255,61,0,0.12) 0 130px, transparent 132px),\n\t\tradial-gradient(circle at 94% 10%, rgba(255,235,0,0.18) 0 150px, transparent 152px) !important;\n\tbackground-size: 88px 88px, 88px 88px, 100% 100%, 100% 100% !important;\n\tanimation: kf-brutalist-blueprint 26s linear infinite !important;\n}\n\n/* body::after = bottom-pinned caution-tape band: bold black/yellow diagonal hazard stripes crawling sideways (fixed, full-bleed, never blocks clicks) */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] body::after {\n\tcontent:\"\" !important;\n\tposition:fixed !important;\n\tleft:0 !important; right:0 !important; bottom:0 !important;\n\theight:34px !important;\n\tpointer-events:none !important; z-index:0 !important;\n\tbackground-image:repeating-linear-gradient(45deg, #FFEB00 0 32px, #000 32px 64px) !important;\n\tbackground-size:128px 128px !important;\n\tborder-top:3px solid #000 !important;\n\topacity:0.85 !important;\n\tanimation: kf-brutalist-tapecrawl 6s linear infinite !important;\n}\n\n/* heavy construction-grid floor (perspective, drifting toward the viewer) pinned behind everything — extra immersive depth at the base of the viewport */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._spacer::after {\n\tcontent:\"\" !important;\n\tposition:fixed !important;\n\tleft:-50% !important; right:-50% !important; bottom:-8% !important;\n\theight:46vh !important;\n\tpointer-events:none !important; z-index:0 !important;\n\tbackground-image:\n\t\trepeating-linear-gradient(to bottom, transparent 0 42px, rgba(0,0,0,0.22) 42px 45px),\n\t\trepeating-linear-gradient(to right, transparent 0 42px, rgba(0,0,0,0.22) 42px 45px) !important;\n\tbackground-size:100% 45px, 90px 100% !important;\n\ttransform:perspective(340px) rotateX(74deg) !important;\n\ttransform-origin:50% 0% !important;\n\t-webkit-mask-image:linear-gradient(to top, #000 0%, rgba(0,0,0,0.55) 50%, transparent 100%) !important;\n\tmask-image:linear-gradient(to top, #000 0%, rgba(0,0,0,0.55) 50%, transparent 100%) !important;\n\tanimation: kf-brutalist-gridroll 9s linear infinite !important;\n}\n\n/* a loud scrolling marquee strip pinned just above the caution band (relocated off body::after so the decoration is preserved) */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._spacer::before {\n\tcontent:\"★ BRUTALIST ★ 粗野 ★ NO ROUNDED CORNERS ★ HARD SHADOWS ONLY ★ RAW CONCRETE ★ CAUTION ★ ★ BRUTALIST ★ 粗野 ★ NO ROUNDED CORNERS ★ HARD SHADOWS ONLY ★ RAW CONCRETE ★ CAUTION ★ ★ BRUTALIST ★ 粗野 ★ NO ROUNDED CORNERS ★ HARD SHADOWS ONLY ★ RAW CONCRETE ★ CAUTION ★ ★ BRUTALIST ★ 粗野 ★ NO ROUNDED CORNERS ★ HARD SHADOWS ONLY ★ RAW CONCRETE ★ CAUTION ★ ★ BRUTALIST ★ 粗野 ★ NO ROUNDED CORNERS ★ HARD SHADOWS ONLY ★ RAW CONCRETE ★ CAUTION ★ ★ BRUTALIST ★ 粗野 ★ NO ROUNDED CORNERS ★ HARD SHADOWS ONLY ★ RAW CONCRETE ★ CAUTION ★ \" !important;\n\tposition:fixed !important; left:0 !important; width:max-content !important; max-width:none !important; bottom:34px !important;\n\tpointer-events:none !important; z-index:9998 !important;\n\twhite-space:nowrap !important; font-weight:900 !important; font-size:13px !important; letter-spacing:0.05em !important;\n\ttext-transform:uppercase !important; color:#000 !important; background:#FFEB00 !important;\n\tborder-top:3px solid #000 !important; border-bottom:3px solid #000 !important; padding:4px 0 !important;\n\tanimation: kf-brutalist-marquee 30s linear infinite !important; will-change:transform !important;\n}\n\n/* sticky header becomes an animated diagonal caution-tape banner (black/yellow) */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tbackground-color:#000 !important;\n\tbackground-image:repeating-linear-gradient(45deg, #000 0 32px, #FFEB00 32px 64px) !important;\n\tbackground-size:128px 128px !important;\n\t-webkit-backdrop-filter:none !important; backdrop-filter:none !important;\n\tanimation:kf-brutalist-hazard 3s linear infinite !important;\n\tbox-shadow:0 6px 0 #FF3D00 !important; border-bottom:0 !important;\n}\n/* keep header text/icons readable on the busy stripes: solid black chip behind glyphs */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] i,\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] span,\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] button._button {\n\tcolor:#FFEB00 !important; background:#000 !important; box-shadow:0 0 0 3px #000 !important;\n}\n/* restore icon font (we never touched * font, but be safe under both attrs) */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] .ti,\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] [class*=\"ti-\"] { font-family:\"tabler-icons\" !important; }\n\n/* panels & popups MUST stay readable: solid opaque concrete-white cards sit above the decoration; background only peeks through gutters */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._panel {\n\tbackground:#FFFFFF !important;\n\tposition:relative !important; z-index:1 !important;\n\ttransition:box-shadow 0.12s ease, transform 0.12s ease !important;\n}\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._panel:hover {\n\tbox-shadow:10px 10px 0 #000 !important; transform:translate(-2px,-2px) !important;\n}\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._popup {\n\tbackground:#FFFFFF !important;\n\tposition:relative !important; z-index:1 !important;\n}\n\n/* article cards sit on tiny static rotation; settle straight + POP shadow on hover, then wiggle */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] article {\n\tbackground:#fff !important;\n\ttransform:rotate(-0.5deg) !important;\n\ttransition:transform 0.12s ease, box-shadow 0.12s ease !important;\n\tposition:relative !important; z-index:1 !important;\n}\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] article:nth-child(even) { transform:rotate(0.5deg) !important; }\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] article:hover {\n\tbox-shadow:9px 9px 0 #000, -3px -3px 0 #FF3D00 !important;\n\tanimation:kf-brutalist-wiggle 0.45s ease-in-out !important; z-index:2 !important;\n}\n\n/* gradient + primary buttons pulse dopamine red, jump on hover, slam down on press */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._buttonGradate,\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._buttonPrimary {\n\tbackground-image:none !important; color:#fff !important;\n\tanimation:kf-brutalist-redpulse 1.6s ease-in-out infinite !important;\n\ttransition:transform 0.1s ease !important;\n}\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._buttonGradate:hover,\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._buttonPrimary:hover { transform:translate(-2px,-2px) !important; }\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._buttonGradate:active,\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._buttonPrimary:active {\n\ttransform:translate(3px,3px) !important; animation:none !important; box-shadow:1px 1px 0 #000 !important;\n}\n\n/* border buttons get a marching dashed outline on hover */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tbackground-image:\n\t\tlinear-gradient(90deg,#000 50%, transparent 50%),\n\t\tlinear-gradient(90deg,#000 50%, transparent 50%),\n\t\tlinear-gradient(0deg,#000 50%, transparent 50%),\n\t\tlinear-gradient(0deg,#000 50%, transparent 50%) !important;\n\tbackground-repeat:repeat-x,repeat-x,repeat-y,repeat-y !important;\n\tbackground-size:14px 3px,14px 3px,3px 14px,3px 14px !important;\n\tbackground-position:0 0,0 100%,0 0,100% 0 !important;\n\tanimation:kf-brutalist-march 0.6s linear infinite !important;\n}\n\n/* links: blue underline grows thicker on hover, with a yellow highlight */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._link:hover {\n\ttext-decoration-thickness:4px !important; background:#FFEB00 !important; color:#000 !important;\n}\n\n/* badge / counter flashes red↔yellow so notifications shout */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._indicateCounter,\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] ._indicatorCircle {\n\tanimation:kf-brutalist-flash 1s steps(1,end) infinite !important; color:#fff !important;\n}\n\n/* avatars get a louder red offset shadow on hover */\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] img[class*=\"avatar\"]:hover,\nhtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] [class*=\"avatar\"]:hover {\n\tbox-shadow:5px 5px 0 #FF3D00, 5px 5px 0 1px #000 !important;\n}\n\n/* MOTION SAFETY — kill all heavy animation when the user prefers reduced motion */\n@media (prefers-reduced-motion: reduce){\n\thtml[data-xtcymc-exp=\"brutalist\"][data-xtcymc-exp-bg] *{ animation:none !important; }\n}\n",
};

const SYNTHWAVE: ExpTheme = {
	id: "synthwave", name: "Synthwave · 暮色霓虹",
	tagline: "80年代复古未来：深靛紫夜空、霓虹品红/电青描边、发光渐变按钮、滚动透视网格地平线与霓虹落日",
	icon: "ti ti-sunset-2", scheme: "dark",
	radius: "6px", margin: "14px", blur: "blur(0px)", modalBgFilter: "blur(0px)",
	palette: {
		"accent": "#FF2E97",
		"accentedBg": "rgba(255,46,151,0.16)",
		"love": "#FF2E97",
		"focus": "rgba(0,229,255,0.55)",
		"bg": "#140426",
		"fg": "#E6D8FF",
		"fgHighlighted": "#FFFFFF",
		"fgOnAccent": "#1A0B2E",
		"fgOnWhite": "#FF2E97",
		"divider": "rgba(255,46,151,0.28)",
		"indicator": "#00E5FF",
		"panel": "#1F0E3A",
		"panelHighlight": "#2A1450",
		"panelHeaderBg": "#1A0B2E",
		"panelHeaderFg": "#00E5FF",
		"panelBorder": "solid 1px rgba(255,46,151,0.45)",
		"windowHeader": "#1A0B2E",
		"popup": "#1F0E3A",
		"shadow": "rgba(255,46,151,0.30)",
		"header": "rgba(20,4,38,0.82)",
		"navBg": "#140426",
		"navFg": "#E6D8FF",
		"navActive": "#FF2E97",
		"navIndicator": "#00E5FF",
		"pageHeaderBg": "#1A0B2E",
		"pageHeaderFg": "#00E5FF",
		"link": "#FF6FC8",
		"hashtag": "#FFB23E",
		"mention": "#00E5FF",
		"mentionMe": "#FF2E97",
		"renote": "#9D7BFF",
		"modalBg": "rgba(10,2,22,0.7)",
		"scrollbarHandle": "rgba(255,46,151,0.35)",
		"scrollbarHandleHover": "rgba(0,229,255,0.55)",
		"dateLabelFg": "#9D7BFF",
		"infoBg": "#102A3A",
		"infoFg": "#7FE9FF",
		"infoWarnBg": "#3A2410",
		"infoWarnFg": "#FFB23E",
		"folderHeaderBg": "rgba(255,46,151,0.08)",
		"folderHeaderHoverBg": "rgba(0,229,255,0.12)",
		"buttonBg": "#241046",
		"buttonHoverBg": "#311660",
		"buttonGradateA": "#FF2E97",
		"buttonGradateB": "#00E5FF",
		"switchBg": "rgba(255,46,151,0.25)",
		"switchOffBg": "rgba(157,123,255,0.18)",
		"switchOffFg": "#E6D8FF",
		"switchOnBg": "rgba(255,46,151,0.30)",
		"switchOnFg": "#FF2E97",
		"inputBorder": "rgba(0,229,255,0.30)",
		"inputBorderHover": "rgba(255,46,151,0.55)",
		"badge": "#00E5FF",
		"messageBg": "#140426",
		"success": "#3DF5C4",
		"error": "#FF4D6D",
		"warn": "#FFB23E",
		"codeString": "#FFB23E",
		"codeNumber": "#00E5FF",
		"codeBoolean": "#FF6FC8",
		"deckBg": "#0E021C",
		"htmlThemeColor": "#140426"
	},
	structural: "\nhtml[data-xtcymc-exp=\"synthwave\"],\nhtml[data-xtcymc-exp=\"synthwave\"] body,\nhtml[data-xtcymc-exp=\"synthwave\"] button,\nhtml[data-xtcymc-exp=\"synthwave\"] input,\nhtml[data-xtcymc-exp=\"synthwave\"] textarea {\n\tfont-family: \"Eurostile\",\"Rajdhani\",\"Orbitron\",\"Inter\",\"Segoe UI\",\"PingFang SC\",\"Noto Sans CJK SC\",system-ui,sans-serif !important;\n}\nhtml[data-xtcymc-exp=\"synthwave\"] { font-size: 14.5px !important; }\n/* 深靛紫夜空底，落日余晖渐变铺底 */\nhtml[data-xtcymc-exp=\"synthwave\"] body {\n\tbackground:\n\t\tradial-gradient(ellipse 60% 40% at 50% 8%, rgba(255,46,151,0.22), transparent 60%),\n\t\tlinear-gradient(180deg, #1A0B2E 0%, #140426 55%, #0E021C 100%) !important;\n\tbackground-attachment: fixed !important;\n}\n/* 面板：暗紫底 + 1px 霓虹品红边 + 微弱外发光 */\nhtml[data-xtcymc-exp=\"synthwave\"] ._panel {\n\tbackground: #1F0E3A !important;\n\tborder: 1px solid rgba(255,46,151,0.45) !important;\n\tbox-shadow: 0 0 0 1px rgba(0,229,255,0.10), 0 6px 22px rgba(10,2,22,0.55) !important;\n}\nhtml[data-xtcymc-exp=\"synthwave\"] ._popup,\nhtml[data-xtcymc-exp=\"synthwave\"] ._acrylic {\n\tbackground: #1F0E3A !important;\n\tborder: 1px solid rgba(0,229,255,0.45) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n}\nhtml[data-xtcymc-exp=\"synthwave\"] ._shadow { box-shadow: 0 4px 20px rgba(255,46,151,0.25) !important; }\n/* 帖子分隔：霓虹品红细线 */\nhtml[data-xtcymc-exp=\"synthwave\"] article { border-bottom: 1px solid rgba(255,46,151,0.22) !important; }\n/* 标题：电青霓虹文字辉光 */\nhtml[data-xtcymc-exp=\"synthwave\"] h1,\nhtml[data-xtcymc-exp=\"synthwave\"] h2,\nhtml[data-xtcymc-exp=\"synthwave\"] h3 {\n\tcolor: #00E5FF !important;\n\tletter-spacing: 0.03em !important;\n\ttext-shadow: 0 0 6px rgba(0,229,255,0.55), 0 0 14px rgba(0,229,255,0.30) !important;\n}\n/* 链接：热粉 + 轻微辉光 */\nhtml[data-xtcymc-exp=\"synthwave\"] ._link {\n\tcolor: #FF6FC8 !important;\n\ttext-shadow: 0 0 6px rgba(255,46,151,0.45) !important;\n}\n/* 发光的品红→电青渐变按钮 */\nhtml[data-xtcymc-exp=\"synthwave\"] ._buttonGradate {\n\tbackground: linear-gradient(90deg, #FF2E97, #00E5FF) !important;\n\tcolor: #1A0B2E !important;\n\tbox-shadow: 0 0 12px rgba(255,46,151,0.45), 0 0 18px rgba(0,229,255,0.30) !important;\n\tfont-weight: 700 !important;\n}\n/* 描边按钮：电青霓虹边 */\nhtml[data-xtcymc-exp=\"synthwave\"] ._borderButton {\n\tborder: 1px solid rgba(0,229,255,0.55) !important;\n\tcolor: #00E5FF !important;\n\tbox-shadow: inset 0 0 8px rgba(0,229,255,0.12) !important;\n}\n/* 输入框：暗紫底 + 电青边 + 粉色光标 */\nhtml[data-xtcymc-exp=\"synthwave\"] input,\nhtml[data-xtcymc-exp=\"synthwave\"] textarea {\n\tbackground: #180830 !important;\n\tborder: 1px solid rgba(0,229,255,0.30) !important;\n\tcolor: #E6D8FF !important; caret-color: #FF2E97 !important;\n}\nhtml[data-xtcymc-exp=\"synthwave\"] input::placeholder,\nhtml[data-xtcymc-exp=\"synthwave\"] textarea::placeholder { color: rgba(157,123,255,0.5) !important; }\n/* 还原图标字体（我们没有动 *，但显式保险，防止任何继承导致图标变 □） */\nhtml[data-xtcymc-exp=\"synthwave\"] .ti,\nhtml[data-xtcymc-exp=\"synthwave\"] [class*=\"ti-\"],\nhtml[data-xtcymc-exp=\"synthwave\"] i[class^=\"ti\"] { font-family: \"tabler-icons\" !important; }\n/* sticky 页眉：暗夜底 + 霓虹品红下划线，去玻璃模糊 */\nhtml[data-xtcymc-exp=\"synthwave\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: #1A0B2E !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tborder-bottom: 2px solid #FF2E97 !important;\n\tbox-shadow: 0 2px 10px rgba(255,46,151,0.40) !important;\n}\n",
	aggressive: "\n/* ── SYNTHWAVE 激进背景：滚动透视网格地平线 + 霓虹落日 + 扫描线 + 霓虹闪烁 ── */\n/* 重声明半透明配色，让网格与落日透过内容显现（双属性特异性高于基础单属性） */\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(20,4,38,0.55) !important;\n\t--MI_THEME-navBg: rgba(20,4,38,0.62) !important;\n\t--MI_THEME-pageHeaderBg: rgba(26,11,46,0.78) !important;\n}\n/* body 作为定位上下文与底层夜空 */\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] body {\n\tbackground: linear-gradient(180deg, #1A0B2E 0%, #140426 50%, #2A0A2E 100%) !important;\n\tbackground-attachment: fixed !important;\n\tposition: relative !important;\n}\n/* 霓虹落日：高悬的发光圆 + 同心晕染（位于上方天空），低层不挡点击 */\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground:\n\t\tradial-gradient(circle 130px at 50% 24%, #FFD23E 0%, #FF8A3E 32%, #FF2E97 62%, rgba(255,46,151,0) 72%),\n\t\tradial-gradient(circle 260px at 50% 24%, rgba(0,229,255,0.18) 0%, rgba(0,229,255,0) 70%) !important;\n\tfilter: drop-shadow(0 0 40px rgba(255,46,151,0.4)) !important;\n\tanimation: kf-synthwave-sun 9s ease-in-out infinite !important;\n}\n/* 透视网格地平线：底部向远处地平线收束、向观者滚动 */\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tleft: -50% !important; right: -50% !important; bottom: -10% !important;\n\theight: 55vh !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground-image:\n\t\trepeating-linear-gradient(to bottom, transparent 0, transparent 38px, rgba(0,229,255,0.55) 39px, rgba(0,229,255,0.55) 40px),\n\t\trepeating-linear-gradient(to right, transparent 0, transparent 38px, rgba(255,46,151,0.55) 39px, rgba(255,46,151,0.55) 40px) !important;\n\tbackground-size: 100% 40px, 80px 100% !important;\n\ttransform: perspective(320px) rotateX(72deg) !important;\n\ttransform-origin: 50% 0% !important;\n\t-webkit-mask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,0.65) 45%, transparent 100%) !important;\n\tmask-image: linear-gradient(to top, #000 0%, rgba(0,0,0,0.65) 45%, transparent 100%) !important;\n\tanimation: kf-synthwave-grid 1.6s linear infinite !important;\n}\n/* 扫描线叠层：薄、慢、置顶但不挡点击 */\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] ._spacer::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 9998 !important;\n\tbackground: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,229,255,0.05) 3px, rgba(0,0,0,0) 4px) !important;\n\tanimation: kf-synthwave-scan 8s linear infinite !important;\n\topacity: 0.6 !important;\n}\n/* 面板：保持可读（>=.82 alpha），霓虹边脉冲 */\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: rgba(31,14,58,0.88) !important;\n\tanimation: kf-synthwave-edge 4s ease-in-out infinite !important;\n}\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] ._panel:hover {\n\ttransform: translateY(-2px) !important;\n\ttransition: transform 0.25s ease !important;\n\tbox-shadow: 0 0 0 1px rgba(0,229,255,0.4), 0 10px 30px rgba(255,46,151,0.35) !important;\n}\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] ._popup {\n\tbackground: rgba(31,14,58,0.92) !important;\n}\n/* 标题与链接霓虹闪烁（缓慢、克制） */\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] h1,\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] h2,\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] h3 {\n\tanimation: kf-synthwave-flicker 5s steps(1) infinite !important;\n}\n/* 渐变按钮：流动光带 + 发光呼吸 */\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] ._buttonGradate {\n\tbackground: linear-gradient(90deg, #FF2E97, #00E5FF, #FF2E97) !important;\n\tbackground-size: 200% 100% !important;\n\tanimation: kf-synthwave-flow 3s linear infinite, kf-synthwave-glow 2.4s ease-in-out infinite !important;\n}\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] ._buttonGradate:hover { filter: brightness(1.15) !important; }\n/* 描边按钮 / 链接悬停微动 */\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tbox-shadow: 0 0 14px rgba(0,229,255,0.5) !important;\n\ttransition: box-shadow 0.2s ease !important;\n}\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] ._link:hover,\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] ._link:hover {\n\ttext-shadow: 0 0 8px rgba(255,46,151,0.7), 0 0 16px rgba(255,111,200,0.5) !important;\n\ttransition: text-shadow 0.2s ease !important;\n}\n/* sticky 页眉：霓虹下划线流光脉冲 */\nhtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tanimation: kf-synthwave-underline 3.5s ease-in-out infinite !important;\n}\n@keyframes kf-synthwave-grid {\n\t0% { background-position: 0 0, 0 0; }\n\t100% { background-position: 0 40px, 0 0; }\n}\n@keyframes kf-synthwave-sun {\n\t0%, 100% { filter: drop-shadow(0 0 40px rgba(255,46,151,0.4)); }\n\t50% { filter: drop-shadow(0 0 64px rgba(255,138,62,0.6)); }\n}\n@keyframes kf-synthwave-scan {\n\t0% { background-position: 0 0; }\n\t100% { background-position: 0 100vh; }\n}\n@keyframes kf-synthwave-edge {\n\t0%, 100% { box-shadow: 0 0 0 1px rgba(255,46,151,0.25), 0 6px 22px rgba(10,2,22,0.55); }\n\t50% { box-shadow: 0 0 0 1px rgba(0,229,255,0.35), 0 6px 26px rgba(255,46,151,0.30); }\n}\n@keyframes kf-synthwave-flicker {\n\t0%, 92%, 100% { text-shadow: 0 0 6px rgba(0,229,255,0.55), 0 0 14px rgba(0,229,255,0.30); }\n\t94% { text-shadow: 0 0 2px rgba(0,229,255,0.2); }\n\t96% { text-shadow: 0 0 8px rgba(0,229,255,0.7), 0 0 18px rgba(0,229,255,0.4); }\n}\n@keyframes kf-synthwave-flow {\n\t0% { background-position: 0% 0; }\n\t100% { background-position: 200% 0; }\n}\n@keyframes kf-synthwave-glow {\n\t0%, 100% { box-shadow: 0 0 12px rgba(255,46,151,0.45), 0 0 18px rgba(0,229,255,0.30); }\n\t50% { box-shadow: 0 0 20px rgba(255,46,151,0.65), 0 0 30px rgba(0,229,255,0.50); }\n}\n@keyframes kf-synthwave-underline {\n\t0%, 100% { box-shadow: 0 2px 10px rgba(255,46,151,0.40); }\n\t50% { box-shadow: 0 2px 18px rgba(0,229,255,0.55); }\n}\n@media (prefers-reduced-motion: reduce){\n\thtml[data-xtcymc-exp=\"synthwave\"][data-xtcymc-exp-bg] *{ animation: none !important; }\n}\n",
};

const AURORA: ExpTheme = {
	id: "aurora", name: "Aurora · 极光",
	tagline: "静谧宇宙夜：深青navy底、薄荷绿点缀、柔光圆角面板；开启动效后缓缓流动的极光丝带与微弱星空",
	icon: "ti ti-aurora", scheme: "dark",
	radius: "14px", margin: "16px", blur: "blur(10px)", modalBgFilter: "blur(10px)",
	palette: {
		"accent": "#5EEAD4",
		"accentedBg": "rgba(94,234,212,0.14)",
		"love": "#FB7185",
		"focus": "rgba(94,234,212,0.4)",
		"bg": "#04121C",
		"fg": "#D6E4EC",
		"fgHighlighted": "#F0F7FA",
		"fgOnAccent": "#04121C",
		"fgOnWhite": "#5EEAD4",
		"divider": "rgba(120,180,200,0.16)",
		"indicator": "#5EEAD4",
		"panel": "rgba(8,26,40,0.86)",
		"panelHighlight": "rgba(18,42,60,0.9)",
		"panelHeaderBg": "rgba(6,22,36,0.9)",
		"panelHeaderFg": "#D6E4EC",
		"panelBorder": "solid 1px rgba(120,180,200,0.18)",
		"windowHeader": "rgba(6,22,36,0.9)",
		"popup": "rgba(10,30,46,0.96)",
		"shadow": "rgba(0,8,16,0.55)",
		"header": "rgba(4,18,28,0.72)",
		"navBg": "rgba(5,20,32,0.92)",
		"navFg": "#C2D6E0",
		"navActive": "#5EEAD4",
		"navIndicator": "#5EEAD4",
		"pageHeaderBg": "rgba(5,20,32,0.9)",
		"pageHeaderFg": "#E4F0F5",
		"link": "#60A5FA",
		"hashtag": "#A78BFA",
		"mention": "#5EEAD4",
		"mentionMe": "#A78BFA",
		"renote": "#5EEAD4",
		"modalBg": "rgba(2,10,18,0.6)",
		"scrollbarHandle": "rgba(94,234,212,0.22)",
		"scrollbarHandleHover": "rgba(94,234,212,0.42)",
		"dateLabelFg": "#8FB3C4",
		"infoBg": "rgba(16,44,64,0.9)",
		"infoFg": "#AFD4E2",
		"infoWarnBg": "rgba(60,42,20,0.9)",
		"infoWarnFg": "#F5C97A",
		"folderHeaderBg": "rgba(94,234,212,0.06)",
		"folderHeaderHoverBg": "rgba(94,234,212,0.12)",
		"buttonBg": "rgba(16,40,58,0.85)",
		"buttonHoverBg": "rgba(94,234,212,0.16)",
		"buttonGradateA": "#5EEAD4",
		"buttonGradateB": "#60A5FA",
		"switchBg": "rgba(94,234,212,0.2)",
		"switchOffBg": "rgba(140,170,190,0.18)",
		"switchOffFg": "#04121C",
		"switchOnBg": "rgba(94,234,212,0.25)",
		"switchOnFg": "#5EEAD4",
		"inputBorder": "rgba(120,180,200,0.22)",
		"inputBorderHover": "rgba(94,234,212,0.45)",
		"badge": "#A78BFA",
		"messageBg": "#04121C",
		"success": "#5EEAD4",
		"error": "#FB7185",
		"warn": "#F5C97A",
		"codeString": "#5EEAD4",
		"codeNumber": "#60A5FA",
		"codeBoolean": "#A78BFA",
		"deckBg": "#030D16",
		"htmlThemeColor": "#04121C"
	},
	structural: "\nhtml[data-xtcymc-exp=\"aurora\"],\nhtml[data-xtcymc-exp=\"aurora\"] body,\nhtml[data-xtcymc-exp=\"aurora\"] button,\nhtml[data-xtcymc-exp=\"aurora\"] input,\nhtml[data-xtcymc-exp=\"aurora\"] textarea {\n\tfont-family: \"Inter\",\"Hiragino Sans GB\",\"PingFang SC\",\"Noto Sans CJK SC\",\"Segoe UI Variable\",\"Segoe UI\",system-ui,sans-serif !important;\n}\n/* 静态深青夜底：navy + 远处薄荷/紫晕染（不动，动效见 aggressive） */\nhtml[data-xtcymc-exp=\"aurora\"] body {\n\tbackground:\n\t\tradial-gradient(ellipse at 18% 12%, rgba(94,234,212,0.10), transparent 46%),\n\t\tradial-gradient(ellipse at 84% 18%, rgba(167,139,250,0.10), transparent 48%),\n\t\tradial-gradient(ellipse at 50% 95%, rgba(96,165,250,0.10), transparent 52%),\n\t\t#04121C !important;\n\tbackground-attachment: fixed !important;\n}\n/* 面板：深半透明 navy + 细边 + 柔光，圆角 14px */\nhtml[data-xtcymc-exp=\"aurora\"] ._panel {\n\tbackground: rgba(8,26,40,0.86) !important;\n\tborder: 1px solid rgba(120,180,200,0.18) !important;\n\tborder-radius: 14px !important;\n\tbox-shadow: 0 6px 26px rgba(0,8,16,0.45), inset 0 1px 0 rgba(150,210,230,0.06) !important;\n\t-webkit-backdrop-filter: blur(10px) !important; backdrop-filter: blur(10px) !important;\n}\nhtml[data-xtcymc-exp=\"aurora\"] ._popup,\nhtml[data-xtcymc-exp=\"aurora\"] ._acrylic {\n\tbackground: rgba(10,30,46,0.92) !important;\n\tborder: 1px solid rgba(120,180,200,0.18) !important;\n\tborder-radius: 14px !important;\n\t-webkit-backdrop-filter: blur(10px) !important; backdrop-filter: blur(10px) !important;\n}\nhtml[data-xtcymc-exp=\"aurora\"] ._shadow { box-shadow: 0 6px 26px rgba(0,8,16,0.45) !important; }\n/* 帖子分隔：极淡青色细线 */\nhtml[data-xtcymc-exp=\"aurora\"] article { border-bottom: 1px solid rgba(120,180,200,0.12) !important; }\n/* 薄荷渐变主按钮 + 圆角 + 柔光 */\nhtml[data-xtcymc-exp=\"aurora\"] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"aurora\"] ._buttonGradate {\n\tborder-radius: 12px !important;\n\tbox-shadow: 0 2px 14px rgba(94,234,212,0.22) !important;\n\tcolor: #04121C !important;\n}\nhtml[data-xtcymc-exp=\"aurora\"] ._borderButton {\n\tborder: 1px solid rgba(94,234,212,0.4) !important;\n\tborder-radius: 12px !important;\n\tbackground: rgba(94,234,212,0.05) !important;\n}\n/* 输入框：深底 + 青边 */\nhtml[data-xtcymc-exp=\"aurora\"] input,\nhtml[data-xtcymc-exp=\"aurora\"] textarea {\n\tborder-color: rgba(120,180,200,0.22) !important;\n\tborder-radius: 10px !important;\n}\nhtml[data-xtcymc-exp=\"aurora\"] input::placeholder,\nhtml[data-xtcymc-exp=\"aurora\"] textarea::placeholder { color: rgba(143,179,196,0.5) !important; }\n/* 标题：通透 pale 字 + 极轻字距 */\nhtml[data-xtcymc-exp=\"aurora\"] h1,\nhtml[data-xtcymc-exp=\"aurora\"] h2,\nhtml[data-xtcymc-exp=\"aurora\"] h3 {\n\tcolor: #F0F7FA !important; font-weight: 700 !important; letter-spacing: 0.01em !important;\n}\n/* 链接：柔蓝 */\nhtml[data-xtcymc-exp=\"aurora\"] ._link { color: #60A5FA !important; }\n/* sticky 页眉：深 navy 玻璃 + 底部青色微光线 */\nhtml[data-xtcymc-exp=\"aurora\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: rgba(5,20,32,0.9) !important;\n\t-webkit-backdrop-filter: blur(10px) !important; backdrop-filter: blur(10px) !important;\n\tborder-bottom: 1px solid rgba(94,234,212,0.18) !important;\n}\n/* 头像柔光浮起 */\nhtml[data-xtcymc-exp=\"aurora\"] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"aurora\"] [class*=\"avatar\"] > img {\n\tbox-shadow: 0 3px 14px rgba(94,234,212,0.18) !important;\n}\n",
	aggressive: "\r\n/* ── AURORA aggressive：深 navy 星空上大胆流动的极光丝带(薄荷/violet/蓝) + 微弱星点 ── */\r\n/* 半透明表面：让 body 上的极光常驻透过 gutters/列间/widgets 显现（双属性特异性高于 structural） */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] {\r\n\t--MI_THEME-bg: rgba(4,18,28,0.42) !important;\r\n\t--MI_THEME-deckBg: rgba(3,13,22,0.46) !important;\r\n\t--MI_THEME-navBg: rgba(5,20,32,0.4) !important;\r\n\t--MI_THEME-pageHeaderBg: rgba(5,20,32,0.88) !important;\r\n}\r\n/* body：固定的深 navy 星空底，作定位上下文；极光与星点由 ::before/::after 承担 */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] body {\r\n\tbackground:\r\n\t\tradial-gradient(ellipse 120% 80% at 50% -10%, rgba(10,32,50,0.9), transparent 60%),\r\n\t\tlinear-gradient(180deg, #061826 0%, #04121C 55%, #020A12 100%) !important;\r\n\tbackground-attachment: fixed !important;\r\n\tposition: relative !important;\r\n}\r\n/* 极光丝带层：大胆的薄荷/violet/蓝色带，超大模糊、缓慢漂移并色相旋转。z-index:0 在内容之后 */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] body::before {\r\n\tcontent: \"\" !important;\r\n\tposition: fixed !important; inset: -20% !important;\r\n\tpointer-events: none !important; z-index: 0 !important;\r\n\tbackground:\r\n\t\tradial-gradient(ellipse 60% 60% at 6% 30%, rgba(94,234,212,0.78) 0%, transparent 64%),\r\n\t\tradial-gradient(ellipse 70% 48% at 26% 12%, rgba(94,234,212,0.82) 0%, transparent 60%),\r\n\t\tradial-gradient(ellipse 62% 44% at 82% 26%, rgba(167,139,250,0.78) 0%, transparent 60%),\r\n\t\tradial-gradient(ellipse 130% 62% at 50% 110%, rgba(96,165,250,0.72) 0%, rgba(94,234,212,0.42) 36%, transparent 72%),\r\n\t\tconic-gradient(from 110deg at 30% 24%, rgba(94,234,212,0) 0deg, rgba(94,234,212,0.7) 55deg, rgba(96,165,250,0.4) 120deg, rgba(167,139,250,0) 175deg) !important;\r\n\tfilter: blur(26px) saturate(1.6) !important;\r\n\topacity: 1 !important;\r\n\tmix-blend-mode: screen !important;\r\n\twill-change: transform, filter !important;\r\n\tanimation: kf-aurora-drift 46s ease-in-out infinite alternate, kf-aurora-hue 60s linear infinite !important;\r\n}\r\n/* 星空层：多点 radial-gradient 微星，缓慢明灭闪烁。z-index:0 仍在内容之后 */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] body::after {\r\n\tcontent: \"\" !important;\r\n\tposition: fixed !important; inset: 0 !important;\r\n\tpointer-events: none !important; z-index: 0 !important;\r\n\tbackground-image:\r\n\t\tradial-gradient(1px 1px at 12% 22%, rgba(214,228,236,0.9), transparent),\r\n\t\tradial-gradient(1px 1px at 38% 64%, rgba(214,228,236,0.7), transparent),\r\n\t\tradial-gradient(1px 1px at 67% 14%, rgba(167,139,250,0.85), transparent),\r\n\t\tradial-gradient(1.5px 1.5px at 82% 48%, rgba(94,234,212,0.85), transparent),\r\n\t\tradial-gradient(1px 1px at 54% 88%, rgba(214,228,236,0.7), transparent),\r\n\t\tradial-gradient(1px 1px at 26% 80%, rgba(96,165,250,0.7), transparent),\r\n\t\tradial-gradient(1px 1px at 91% 78%, rgba(214,228,236,0.6), transparent),\r\n\t\tradial-gradient(1.5px 1.5px at 7% 52%, rgba(94,234,212,0.6), transparent),\r\n\t\tradial-gradient(1px 1px at 44% 32%, rgba(214,228,236,0.55), transparent),\r\n\t\tradial-gradient(1px 1px at 78% 88%, rgba(167,139,250,0.6), transparent) !important;\r\n\twill-change: opacity !important;\r\n\tanimation: kf-aurora-twinkle 9s ease-in-out infinite !important;\r\n}\r\n/* 确保内容浮在背景图层之上 */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] #misskey_app,\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] body > div { position: relative !important; z-index: 1 !important; }\r\n/* 面板：实色深 navy(>=0.92)，正文坐在不透明卡片上；极光只在缝隙透出 */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] ._panel {\r\n\tbackground: rgba(8,26,40,0.92) !important;\r\n\tbox-shadow: 0 6px 30px rgba(0,8,16,0.42), inset 0 1px 0 rgba(150,210,230,0.07) !important;\r\n\ttransition: box-shadow 0.5s ease, transform 0.5s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] ._panel:hover {\r\n\tbox-shadow: 0 10px 40px rgba(94,234,212,0.16), inset 0 1px 0 rgba(150,210,230,0.1) !important;\r\n\ttransform: translateY(-1px) !important;\r\n}\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] ._popup,\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] ._acrylic {\r\n\tbackground: rgba(10,30,46,0.95) !important;\r\n}\r\n/* 帖子悬浮微动 */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] article {\r\n\ttransition: background 0.5s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] article:hover {\r\n\tbackground: rgba(94,234,212,0.04) !important;\r\n}\r\n/* 主按钮：缓慢的薄荷柔光脉动 */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] ._buttonPrimary,\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] ._buttonGradate {\r\n\tanimation: kf-aurora-glow 5.5s ease-in-out infinite !important;\r\n}\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] ._buttonPrimary:hover,\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] ._buttonGradate:hover {\r\n\ttransform: translateY(-1px) scale(1.01) !important;\r\n}\r\n/* 链接 hover 柔蓝微亮 */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] ._link {\r\n\ttransition: color 0.4s ease, text-shadow 0.4s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] ._link:hover {\r\n\ttext-shadow: 0 0 10px rgba(96,165,250,0.55) !important;\r\n}\r\n/* sticky 页眉：可读深底 + 底部极光线缓缓呼吸 */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\r\n\tbackground: rgba(5,20,32,0.88) !important;\r\n\tanimation: kf-aurora-headerline 11s ease-in-out infinite !important;\r\n}\r\n/* 头像：极淡薄荷光晕脉动 */\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] img[class*=\"avatar\"],\r\nhtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img {\r\n\tanimation: kf-aurora-glow 7s ease-in-out infinite !important;\r\n}\r\n\r\n@keyframes kf-aurora-drift {\r\n\t0%   { transform: translate3d(-5%, -4%, 0) scale(1.06) rotate(0deg); }\r\n\t50%  { transform: translate3d(4%, 3%, 0) scale(1.14) rotate(5deg); }\r\n\t100% { transform: translate3d(6%, -3%, 0) scale(1.10) rotate(-4deg); }\r\n}\r\n@keyframes kf-aurora-hue {\r\n\t0%   { filter: blur(64px) saturate(1.45) hue-rotate(0deg); }\r\n\t100% { filter: blur(64px) saturate(1.45) hue-rotate(360deg); }\r\n}\r\n@keyframes kf-aurora-twinkle {\r\n\t0%, 100% { opacity: 0.45; }\r\n\t50%      { opacity: 0.95; }\r\n}\r\n@keyframes kf-aurora-glow {\r\n\t0%, 100% { box-shadow: 0 2px 12px rgba(94,234,212,0.18); }\r\n\t50%      { box-shadow: 0 2px 22px rgba(94,234,212,0.40); }\r\n}\r\n@keyframes kf-aurora-headerline {\r\n\t0%, 100% { border-bottom: 1px solid rgba(94,234,212,0.16) !important; box-shadow: 0 1px 12px rgba(94,234,212,0.06); }\r\n\t50%      { border-bottom: 1px solid rgba(167,139,250,0.32) !important; box-shadow: 0 1px 18px rgba(167,139,250,0.18); }\r\n}\r\n\r\n/* 动效安全：尊重 prefers-reduced-motion，停止全部动画 */\r\n@media (prefers-reduced-motion: reduce) {\r\n\thtml[data-xtcymc-exp=\"aurora\"][data-xtcymc-exp-bg] * { animation: none !important; }\r\n}\r\n",
};

const EINK: ExpTheme = {
	id: "eink", name: "E-Ink · 墨水屏",
	tagline: "电子墨水屏极简：暖纸米白、纯墨黑、零彩度灰阶、1px 发丝分隔、描边按钮、墨色下划线",
	icon: "ti ti-book-2", scheme: "light",
	radius: "2px", margin: "18px", blur: "blur(0px)", modalBgFilter: "blur(0px)",
	palette: {
		"accent": "#111111",
		"accentedBg": "rgba(27,27,27,0.07)",
		"love": "#1B1B1B",
		"focus": "rgba(27,27,27,0.45)",
		"bg": "#F3F1EA",
		"fg": "#1B1B1B",
		"fgHighlighted": "#000000",
		"fgOnAccent": "#F3F1EA",
		"fgOnWhite": "#1B1B1B",
		"divider": "rgba(27,27,27,0.18)",
		"indicator": "#1B1B1B",
		"panel": "#F7F5EE",
		"panelHighlight": "#ECEAE0",
		"panelHeaderBg": "#F7F5EE",
		"panelHeaderFg": "#1B1B1B",
		"panelBorder": "solid 1px rgba(27,27,27,0.22)",
		"windowHeader": "#F7F5EE",
		"popup": "#F7F5EE",
		"shadow": "transparent",
		"header": "rgba(243,241,234,0.92)",
		"navBg": "#F3F1EA",
		"navFg": "#1B1B1B",
		"navActive": "#111111",
		"navIndicator": "#1B1B1B",
		"pageHeaderBg": "#F3F1EA",
		"pageHeaderFg": "#1B1B1B",
		"link": "#1B1B1B",
		"hashtag": "#444444",
		"mention": "#222222",
		"mentionMe": "#000000",
		"renote": "#3A3A3A",
		"modalBg": "rgba(27,27,27,0.40)",
		"scrollbarHandle": "rgba(27,27,27,0.28)",
		"scrollbarHandleHover": "rgba(27,27,27,0.5)",
		"dateLabelFg": "#1B1B1B",
		"infoBg": "#ECEAE0",
		"infoFg": "#3A3A3A",
		"infoWarnBg": "#E2DFD3",
		"infoWarnFg": "#1B1B1B",
		"folderHeaderBg": "rgba(27,27,27,0.04)",
		"folderHeaderHoverBg": "rgba(27,27,27,0.10)",
		"buttonBg": "#ECEAE0",
		"buttonHoverBg": "#E2DFD3",
		"buttonGradateA": "#2A2A2A",
		"buttonGradateB": "#111111",
		"switchBg": "rgba(27,27,27,0.22)",
		"switchOffBg": "rgba(27,27,27,0.16)",
		"switchOffFg": "#F3F1EA",
		"switchOnBg": "#1B1B1B",
		"switchOnFg": "#F3F1EA",
		"inputBorder": "rgba(27,27,27,0.30)",
		"inputBorderHover": "rgba(27,27,27,0.55)",
		"badge": "#1B1B1B",
		"messageBg": "#F7F5EE",
		"success": "#2E2E2E",
		"error": "#000000",
		"warn": "#4A4A4A",
		"codeString": "#3A3A3A",
		"codeNumber": "#1B1B1B",
		"codeBoolean": "#555555",
		"deckBg": "#ECEAE0",
		"htmlThemeColor": "#F3F1EA"
	},
	structural: "\nhtml[data-xtcymc-exp=\"eink\"],\nhtml[data-xtcymc-exp=\"eink\"] body,\nhtml[data-xtcymc-exp=\"eink\"] button,\nhtml[data-xtcymc-exp=\"eink\"] input,\nhtml[data-xtcymc-exp=\"eink\"] textarea {\n\tfont-family: \"Source Serif 4\",\"Charter\",\"Iowan Old Style\",\"Songti SC\",\"Noto Serif CJK SC\",Georgia,\"Times New Roman\",serif !important;\n\tletter-spacing: 0.005em !important;\n}\n/* 还原图标字体：上面给 body/button/input 设了衬线，必须显式恢复 tabler，否则图标变 □ */\nhtml[data-xtcymc-exp=\"eink\"] .ti,\nhtml[data-xtcymc-exp=\"eink\"] [class*=\"ti-\"],\nhtml[data-xtcymc-exp=\"eink\"] i[class^=\"ti\"] { font-family: \"tabler-icons\" !important; }\n/* 几乎方角（墨水屏没有抗锯齿圆角的余裕），2px 极轻倒角 */\nhtml[data-xtcymc-exp=\"eink\"] * { border-radius: 2px !important; }\n/* 暖纸底，绝对零彩度 */\nhtml[data-xtcymc-exp=\"eink\"] body { background: #F3F1EA !important; }\n/* 面板：只有 1px 发丝边、零阴影、宽留白 */\nhtml[data-xtcymc-exp=\"eink\"] ._panel {\n\tbackground: #F7F5EE !important;\n\tborder: 1px solid rgba(27,27,27,0.18) !important;\n\tbox-shadow: none !important;\n}\nhtml[data-xtcymc-exp=\"eink\"] ._shadow { box-shadow: none !important; }\nhtml[data-xtcymc-exp=\"eink\"] ._popup,\nhtml[data-xtcymc-exp=\"eink\"] ._acrylic {\n\tbackground: #F7F5EE !important;\n\tborder: 1px solid rgba(27,27,27,0.22) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tbox-shadow: none !important;\n}\n/* 帖子间用 1px 发丝横线分栏，留白充裕 */\nhtml[data-xtcymc-exp=\"eink\"] article { border-bottom: 1px solid rgba(27,27,27,0.14) !important; }\n/* 标题：墨黑、紧凑字距，仍是衬线 */\nhtml[data-xtcymc-exp=\"eink\"] h1,\nhtml[data-xtcymc-exp=\"eink\"] h2,\nhtml[data-xtcymc-exp=\"eink\"] h3 { color: #000 !important; font-weight: 700 !important; letter-spacing: -0.005em !important; }\n/* 链接：墨色下划线，无彩 */\nhtml[data-xtcymc-exp=\"eink\"] ._link {\n\tcolor: #1B1B1B !important; text-decoration: underline !important;\n\ttext-decoration-thickness: 1px !important; text-underline-offset: 2px !important;\n}\n/* 按钮全部无填充——仅 1px 发丝描边 */\nhtml[data-xtcymc-exp=\"eink\"] ._button,\nhtml[data-xtcymc-exp=\"eink\"] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"eink\"] ._buttonGradate,\nhtml[data-xtcymc-exp=\"eink\"] ._borderButton {\n\tbackground: transparent !important;\n\tbackground-image: none !important;\n\tborder: 1px solid rgba(27,27,27,0.30) !important;\n\tcolor: #1B1B1B !important;\n\tbox-shadow: none !important;\n}\nhtml[data-xtcymc-exp=\"eink\"] ._button:hover,\nhtml[data-xtcymc-exp=\"eink\"] ._buttonPrimary:hover,\nhtml[data-xtcymc-exp=\"eink\"] ._borderButton:hover { border-color: rgba(27,27,27,0.6) !important; }\n/* 输入框：方框、墨色发丝边、无填充 */\nhtml[data-xtcymc-exp=\"eink\"] input,\nhtml[data-xtcymc-exp=\"eink\"] textarea {\n\tbackground: transparent !important;\n\tborder-color: rgba(27,27,27,0.30) !important;\n\tcolor: #1B1B1B !important;\n}\n/* sticky 页眉：实色暖纸 + 1px 发丝下边，去玻璃模糊 */\nhtml[data-xtcymc-exp=\"eink\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: #F3F1EA !important; -webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tborder-bottom: 1px solid rgba(27,27,27,0.18) !important;\n}\n/* 全部图像灰阶高反差，模拟墨水屏 1-bit 灰阶（排除自定义表情/反应） */\nhtml[data-xtcymc-exp=\"eink\"] img:not([class*=\"emoji\"]):not([class*=\"mfm\"]):not([class*=\"reaction\"]) {\n\tfilter: grayscale(1) contrast(1.12) !important;\n}\n",
	aggressive: "html[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(243,241,234,0.42) !important;\n\t--MI_THEME-deckBg: rgba(236,234,224,0.4) !important;\n\t--MI_THEME-navBg: rgba(243,241,234,0.5) !important;\n\t--MI_THEME-pageHeaderBg: rgba(243,241,234,0.90) !important;\n\t/* 注意：绝不能给 <html> 加 filter/transform/animation —— 会让所有 position:fixed\n\t   装饰层改以 <html> 为包含块、计入文档可滚动高度，导致页面抖动、滚动条时隐时现。\n\t   原先的 kf-eink-breathe 全局对比度呼吸即是此 bug 来源，已移除。 */\n}\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] body {\n\tbackground:\n\t\tradial-gradient(ellipse 120% 80% at 50% 0%, rgba(255,254,250,0.85) 0%, rgba(243,241,234,0.55) 55%, transparent 100%),\n\t\tlinear-gradient(180deg, #F6F4ED 0%, #F3F1EA 50%, #ECEAE0 100%) !important;\n\tbackground-attachment: fixed !important;\n\tposition: relative !important;\n}\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: -8px !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground-image:\n\t\trepeating-linear-gradient(22deg, rgba(27,27,27,0.022) 0 1px, transparent 1px 5px),\n\t\trepeating-linear-gradient(112deg, rgba(27,27,27,0.018) 0 1px, transparent 1px 7px),\n\t\tradial-gradient(rgba(27,27,27,0.10) 0.5px, transparent 0.6px) !important;\n\tbackground-size: auto, auto, 4px 4px !important;\n\topacity: 0.9 !important;\n\tmix-blend-mode: multiply !important;\n\tanimation: kf-eink-paper 26s ease-in-out infinite !important;\n}\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground: linear-gradient(180deg,\n\t\ttransparent 0%,\n\t\trgba(27,27,27,0.0) 40%,\n\t\trgba(27,27,27,0.05) 47%,\n\t\trgba(27,27,27,0.13) 50%,\n\t\trgba(27,27,27,0.05) 53%,\n\t\trgba(27,27,27,0.0) 60%,\n\t\ttransparent 100%) !important;\n\tbackground-size: 100% 240% !important;\n\tbackground-repeat: no-repeat !important;\n\tmix-blend-mode: multiply !important;\n\tanimation: kf-eink-sweep 11s linear infinite !important;\n}\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] ._spacer::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: -8px !important;\n\tpointer-events: none !important; z-index: 9998 !important;\n\tbackground-image:\n\t\trepeating-linear-gradient(0deg, rgba(27,27,27,0.05) 0 1px, transparent 1px 2px),\n\t\trepeating-linear-gradient(90deg, rgba(27,27,27,0.04) 0 1px, transparent 1px 2px) !important;\n\tbackground-size: 2px 2px, 2px 2px !important;\n\topacity: 0.4 !important;\n\tmix-blend-mode: multiply !important;\n\tanimation: kf-eink-dither 1.6s steps(3) infinite !important;\n}\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: rgba(247,245,238,0.92) !important;\n\tborder: 1px solid rgba(27,27,27,0.18) !important;\n\tbox-shadow: none !important;\n}\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: #F7F5EE !important;\n\tborder: 1px solid rgba(27,27,27,0.22) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tbox-shadow: none !important;\n}\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] ._panel:hover,\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] article:hover {\n\tanimation: kf-eink-refresh 0.12s steps(2,end) 1 !important;\n}\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] ._link:hover,\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] ._button:hover,\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tanimation: kf-eink-flash 0.12s steps(2,end) 1 !important;\n}\nhtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tbackground: rgba(243,241,234,0.90) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tborder-bottom: 1px solid rgba(27,27,27,0.18) !important;\n\tbox-shadow: 0 1px 0 rgba(27,27,27,0.22), 0 2px 0 rgba(27,27,27,0.06) !important;\n}\n@keyframes kf-eink-paper {\n\t0%, 100% { transform: translate(0,0); opacity: 0.9; }\n\t50% { transform: translate(-3px,2px); opacity: 0.78; }\n}\n@keyframes kf-eink-dither {\n\t0% { transform: translate(0,0); }\n\t33% { transform: translate(-1px,1px); }\n\t66% { transform: translate(1px,-1px); }\n\t100% { transform: translate(0,0); }\n}\n@keyframes kf-eink-sweep {\n\t0% { background-position: 0 -140%; }\n\t100% { background-position: 0 240%; }\n}\n@keyframes kf-eink-refresh {\n\t0% { filter: invert(1) grayscale(1); }\n\t100% { filter: invert(0) grayscale(0); }\n}\n@keyframes kf-eink-flash {\n\t0% { filter: invert(1); }\n\t100% { filter: invert(0); }\n}\n@media (prefers-reduced-motion: reduce){\n\thtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] *,\n\thtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] body::before,\n\thtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] body::after,\n\thtml[data-xtcymc-exp=\"eink\"][data-xtcymc-exp-bg] { animation: none !important; }\n}\n",
};

const RISO: ExpTheme = {
	id: "riso", name: "Riso · 拼贴",
	tagline: "Risograph 拼贴：牛皮纸底、荧光油墨粉与油墨蓝双色、彩边偏移硬阴影、贴纸感旋转标题、半调网点",
	icon: "ti ti-stack-2", scheme: "light",
	radius: "10px", margin: "16px", blur: "blur(0px)", modalBgFilter: "blur(0px)",
	palette: {
		"accent": "#FF4D6D",
		"accentedBg": "rgba(255,77,109,0.14)",
		"love": "#FF4D6D",
		"focus": "rgba(37,65,178,0.45)",
		"bg": "#ECE3D0",
		"fg": "#241C2E",
		"fgHighlighted": "#0E0A16",
		"fgOnAccent": "#FBF7EC",
		"fgOnWhite": "#FF4D6D",
		"divider": "rgba(36,28,46,0.18)",
		"indicator": "#FF4D6D",
		"panel": "#FBF7EC",
		"panelHighlight": "#F2E9D6",
		"panelHeaderBg": "#2541B2",
		"panelHeaderFg": "#FBF7EC",
		"panelBorder": "solid 2px #2541B2",
		"windowHeader": "#FBF7EC",
		"popup": "#FBF7EC",
		"shadow": "rgba(37,65,178,0.30)",
		"header": "rgba(236,227,208,0.92)",
		"navBg": "#ECE3D0",
		"navFg": "#241C2E",
		"navActive": "#FF4D6D",
		"navIndicator": "#FF4D6D",
		"pageHeaderBg": "#2541B2",
		"pageHeaderFg": "#FBF7EC",
		"link": "#2541B2",
		"hashtag": "#FF4D6D",
		"mention": "#2541B2",
		"mentionMe": "#FF4D6D",
		"renote": "#1FA774",
		"modalBg": "rgba(37,65,178,0.32)",
		"scrollbarHandle": "rgba(255,77,109,0.45)",
		"scrollbarHandleHover": "rgba(255,77,109,0.7)",
		"dateLabelFg": "#2541B2",
		"infoBg": "rgba(37,65,178,0.12)",
		"infoFg": "#2541B2",
		"infoWarnBg": "rgba(255,77,109,0.16)",
		"infoWarnFg": "#B11D3E",
		"folderHeaderBg": "rgba(37,65,178,0.08)",
		"folderHeaderHoverBg": "rgba(255,77,109,0.14)",
		"buttonBg": "#FBF7EC",
		"buttonHoverBg": "#F2E9D6",
		"buttonGradateA": "#FF4D6D",
		"buttonGradateB": "#2541B2",
		"switchBg": "rgba(36,28,46,0.2)",
		"switchOffBg": "rgba(36,28,46,0.18)",
		"switchOffFg": "#FBF7EC",
		"switchOnBg": "#FF4D6D",
		"switchOnFg": "#FBF7EC",
		"inputBorder": "rgba(37,65,178,0.4)",
		"inputBorderHover": "#FF4D6D",
		"badge": "#FF4D6D",
		"messageBg": "#FBF7EC",
		"success": "#1FA774",
		"error": "#E8344E",
		"warn": "#E89A1C",
		"codeString": "#1FA774",
		"codeNumber": "#2541B2",
		"codeBoolean": "#FF4D6D",
		"deckBg": "#E4DAC4",
		"htmlThemeColor": "#ECE3D0"
	},
	structural: "\nhtml[data-xtcymc-exp=\"riso\"],\nhtml[data-xtcymc-exp=\"riso\"] body,\nhtml[data-xtcymc-exp=\"riso\"] button,\nhtml[data-xtcymc-exp=\"riso\"] input,\nhtml[data-xtcymc-exp=\"riso\"] textarea {\n\tfont-family: \"Space Grotesk\",\"Hanken Grotesk\",\"Inter\",\"Hiragino Maru Gothic ProN\",\"Rounded Mplus 1c\",\"PingFang SC\",\"Noto Sans CJK SC\",system-ui,sans-serif !important;\n\tfont-weight: 600 !important;\n}\n/* 还原图标字体：scope 字体后特异性会盖过 tabler 的 .ti，必须显式恢复，否则图标变 □ */\nhtml[data-xtcymc-exp=\"riso\"] .ti,\nhtml[data-xtcymc-exp=\"riso\"] [class*=\"ti-\"],\nhtml[data-xtcymc-exp=\"riso\"] i[class^=\"ti\"] { font-family: \"tabler-icons\" !important; font-weight: 400 !important; }\n/* 牛皮纸底 + 淡淡的半调网点静态纹理（结构层不动画） */\nhtml[data-xtcymc-exp=\"riso\"] body {\n\tbackground-color: #ECE3D0 !important;\n\tbackground-image: radial-gradient(rgba(37,65,178,0.10) 1.4px, transparent 1.6px) !important;\n\tbackground-size: 11px 11px !important;\n\tbackground-position: 0 0 !important;\n}\n/* 面板 = 米白纸 + 2px 油墨蓝边 + 油墨粉偏移硬阴影（双色错位观感） */\nhtml[data-xtcymc-exp=\"riso\"] ._panel {\n\tbackground: #FBF7EC !important;\n\tborder: 2px solid #2541B2 !important;\n\tbox-shadow: 5px 5px 0 rgba(255,77,109,0.55) !important;\n\tborder-radius: 10px !important;\n}\nhtml[data-xtcymc-exp=\"riso\"] ._shadow { box-shadow: 5px 5px 0 rgba(255,77,109,0.45) !important; }\nhtml[data-xtcymc-exp=\"riso\"] ._popup,\nhtml[data-xtcymc-exp=\"riso\"] ._acrylic {\n\tbackground: #FBF7EC !important;\n\tborder: 2px solid #2541B2 !important;\n\tbox-shadow: 5px 5px 0 rgba(255,77,109,0.45) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n}\n/* 帖子卡片：米白纸 + 蓝边 + 小偏移阴影，像拼贴上去的纸片 */\nhtml[data-xtcymc-exp=\"riso\"] article {\n\tbackground: #FBF7EC !important;\n\tborder: 2px solid #2541B2 !important;\n\tbox-shadow: 4px 4px 0 rgba(255,77,109,0.4) !important;\n\tborder-radius: 10px !important;\n\tmargin: 0 0 8px !important;\n}\n/* 按钮：圆润、荧光粉填充、蓝边 + 偏移硬阴影，按下时贴纸压平 */\nhtml[data-xtcymc-exp=\"riso\"] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"riso\"] ._buttonGradate {\n\tborder-radius: 999px !important;\n\tborder: 2px solid #2541B2 !important;\n\tbox-shadow: 3px 3px 0 #2541B2 !important;\n\tfont-weight: 800 !important;\n\tletter-spacing: 0.01em !important;\n}\nhtml[data-xtcymc-exp=\"riso\"] ._borderButton {\n\tborder-radius: 999px !important;\n\tborder: 2px solid #FF4D6D !important;\n\tbox-shadow: 3px 3px 0 rgba(255,77,109,0.5) !important;\n\tfont-weight: 700 !important;\n}\nhtml[data-xtcymc-exp=\"riso\"] ._buttonPrimary:active,\nhtml[data-xtcymc-exp=\"riso\"] ._buttonGradate:active,\nhtml[data-xtcymc-exp=\"riso\"] ._borderButton:active { transform: translate(2px,2px) !important; box-shadow: 1px 1px 0 #2541B2 !important; }\n/* 输入框：圆角 + 蓝边，聚焦转荧光粉 */\nhtml[data-xtcymc-exp=\"riso\"] input,\nhtml[data-xtcymc-exp=\"riso\"] textarea {\n\tborder: 2px solid rgba(37,65,178,0.4) !important;\n\tborder-radius: 10px !important;\n\tbackground: #FBF7EC !important;\n}\nhtml[data-xtcymc-exp=\"riso\"] input:focus,\nhtml[data-xtcymc-exp=\"riso\"] textarea:focus { border-color: #FF4D6D !important; }\n/* 标题：略微旋转的贴纸感，荧光粉，配油墨蓝阴影错位 */\nhtml[data-xtcymc-exp=\"riso\"] h1,\nhtml[data-xtcymc-exp=\"riso\"] h2,\nhtml[data-xtcymc-exp=\"riso\"] h3 {\n\tfont-family: \"Space Grotesk\",\"Hanken Grotesk\",\"Rounded Mplus 1c\",sans-serif !important;\n\tfont-weight: 800 !important;\n\tcolor: #FF4D6D !important;\n\tletter-spacing: -0.01em !important;\n\tdisplay: inline-block !important;\n\ttransform: rotate(-1.5deg) !important;\n\ttext-shadow: 2px 2px 0 rgba(37,65,178,0.35) !important;\n}\n/* 链接：油墨蓝粗下划线 */\nhtml[data-xtcymc-exp=\"riso\"] ._link {\n\tcolor: #2541B2 !important;\n\ttext-decoration: underline !important;\n\ttext-decoration-thickness: 2px !important;\n\ttext-underline-offset: 2px !important;\n}\n/* 头像：圆角 + 油墨粉边 + 蓝色偏移阴影，像贴上去的圆贴纸 */\nhtml[data-xtcymc-exp=\"riso\"] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"riso\"] [class*=\"avatar\"] > img {\n\tborder: 2px solid #FF4D6D !important;\n\tbox-shadow: 3px 3px 0 rgba(37,65,178,0.45) !important;\n}\n/* sticky 页眉：油墨蓝实色 + 荧光粉硬投影，去玻璃模糊，米白字 */\nhtml[data-xtcymc-exp=\"riso\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: #2541B2 !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tbox-shadow: 0 5px 0 #FF4D6D !important;\n\tborder-bottom: 0 !important;\n}\nhtml[data-xtcymc-exp=\"riso\"] [style*=\"--MI-stickyTop\"] i,\nhtml[data-xtcymc-exp=\"riso\"] [style*=\"--MI-stickyTop\"] span,\nhtml[data-xtcymc-exp=\"riso\"] [style*=\"--MI-stickyTop\"] div { color: #FBF7EC !important; }\n",
	aggressive: "html[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(236,227,208,0.42) !important;\n\t--MI_THEME-deckBg: rgba(228,218,196,0.4) !important;\n\t--MI_THEME-navBg: rgba(236,227,208,0.5) !important;\n\t--MI_THEME-pageHeaderBg: rgba(37,65,178,0.90) !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] body {\n\tbackground-color: #ECE3D0 !important;\n\tbackground-image:\n\t\tradial-gradient(rgba(255,77,109,0.22) 2px, transparent 2.4px),\n\t\tradial-gradient(rgba(37,65,178,0.18) 2px, transparent 2.4px),\n\t\tlinear-gradient(180deg, #F0E8D6 0%, #ECE3D0 52%, #E4DAC4 100%) !important;\n\tbackground-size: 16px 16px, 16px 16px, 100% 100% !important;\n\tbackground-position: 0 0, 8px 8px, 0 0 !important;\n\tbackground-attachment: fixed, fixed, fixed !important;\n\tposition: relative !important;\n\tanimation: kf-riso-halftone 26s linear infinite !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground-image:\n\t\tradial-gradient(rgba(255,77,109,0.26) 2.6px, transparent 3px),\n\t\tradial-gradient(rgba(37,65,178,0.22) 2.6px, transparent 3px),\n\t\tradial-gradient(ellipse at 12% 10%, rgba(255,77,109,0.18), transparent 44%),\n\t\tradial-gradient(ellipse at 90% 88%, rgba(37,65,178,0.18), transparent 46%) !important;\n\tbackground-size: 22px 22px, 22px 22px, 100% 100%, 100% 100% !important;\n\tbackground-position: 1px 0, 12px 11px, 0 0, 0 0 !important;\n\tmix-blend-mode: multiply !important;\n\tanimation: kf-riso-misprint 22s ease-in-out infinite alternate !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground-image:\n\t\trepeating-linear-gradient(0deg, rgba(36,28,46,0.05) 0, rgba(36,28,46,0.05) 1px, transparent 1px, transparent 4px),\n\t\trepeating-linear-gradient(90deg, rgba(36,28,46,0.04) 0, rgba(36,28,46,0.04) 1px, transparent 1px, transparent 5px),\n\t\tradial-gradient(rgba(251,247,236,0.0) 60%, rgba(36,28,46,0.06) 100%) !important;\n\tbackground-size: 4px 4px, 5px 5px, 100% 100% !important;\n\tmix-blend-mode: multiply !important;\n\topacity: 0.85 !important;\n\tanimation: kf-riso-grain 7s steps(6,end) infinite !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: rgba(251,247,236,0.94) !important;\n\tanimation: kf-riso-breathe 7s ease-in-out infinite !important;\n\ttransition: transform .16s ease, box-shadow .16s ease !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] ._panel:hover {\n\ttransform: translate(-2px,-2px) !important;\n\tbox-shadow: 8px 8px 0 rgba(255,77,109,0.6) !important;\n\tanimation: kf-riso-misregister 0.45s steps(2,end) infinite !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: rgba(251,247,236,0.96) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] article {\n\tbackground: rgba(251,247,236,0.94) !important;\n\ttransition: transform .18s ease, box-shadow .18s ease !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] article:hover {\n\ttransform: rotate(-0.6deg) translate(-1px,-2px) !important;\n\tbox-shadow: 7px 7px 0 rgba(255,77,109,0.5) !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] h1,\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] h2,\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] h3 {\n\tanimation: kf-riso-split 4.5s steps(3,end) infinite !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] ._buttonGradate {\n\tanimation: kf-riso-glow 3.2s ease-in-out infinite !important;\n\ttransition: transform .14s ease !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] ._buttonPrimary:hover,\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] ._buttonGradate:hover,\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tanimation: kf-riso-bounce 0.5s ease !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img {\n\ttransition: transform .16s ease !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] img[class*=\"avatar\"]:hover,\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img:hover {\n\tanimation: kf-riso-bounce 0.55s ease !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] ._link:hover {\n\tanimation: kf-riso-split 0.4s steps(2,end) 2 !important;\n}\nhtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tanimation: kf-riso-headerpulse 5s ease-in-out infinite !important;\n}\n\n@keyframes kf-riso-halftone {\n\t0%   { background-position: 0 0, 8px 8px, 0 0; }\n\t100% { background-position: 32px 16px, 40px 24px, 0 0; }\n}\n@keyframes kf-riso-misprint {\n\t0%   { background-position: 1px 0, 12px 11px, 0 0, 0 0; transform: translate(0,0); }\n\t50%  { background-position: 3px 1px, 10px 13px, 0 0, 0 0; transform: translate(-1.2px,0.8px); }\n\t100% { background-position: 0 2px, 13px 9px, 0 0, 0 0; transform: translate(1.2px,-0.8px); }\n}\n@keyframes kf-riso-grain {\n\t0%   { background-position: 0 0, 0 0, 0 0; }\n\t100% { background-position: 4px -3px, -3px 4px, 0 0; }\n}\n@keyframes kf-riso-breathe {\n\t0%,100% { box-shadow: 5px 5px 0 rgba(255,77,109,0.50); }\n\t50%     { box-shadow: 6px 6px 0 rgba(255,77,109,0.62); }\n}\n@keyframes kf-riso-misregister {\n\t0%   { box-shadow: 8px 8px 0 rgba(255,77,109,0.6); }\n\t100% { box-shadow: 6px 9px 0 rgba(37,65,178,0.45); }\n}\n@keyframes kf-riso-split {\n\t0%   { text-shadow: 2px 2px 0 rgba(37,65,178,0.35); }\n\t33%  { text-shadow: -2px 1px 0 rgba(255,77,109,0.5), 2px -1px 0 rgba(37,65,178,0.4); }\n\t66%  { text-shadow: 2px -1px 0 rgba(37,65,178,0.4), -1px 2px 0 rgba(255,77,109,0.45); }\n\t100% { text-shadow: 2px 2px 0 rgba(37,65,178,0.35); }\n}\n@keyframes kf-riso-glow {\n\t0%,100% { box-shadow: 3px 3px 0 #2541B2, 0 0 0 rgba(255,77,109,0); }\n\t50%     { box-shadow: 3px 3px 0 #2541B2, 0 0 14px rgba(255,77,109,0.55); }\n}\n@keyframes kf-riso-bounce {\n\t0%   { transform: translateY(0) rotate(0deg) scale(1); }\n\t35%  { transform: translateY(-5px) rotate(-4deg) scale(1.06); }\n\t65%  { transform: translateY(-2px) rotate(3deg) scale(1.03); }\n\t100% { transform: translateY(0) rotate(0deg) scale(1); }\n}\n@keyframes kf-riso-headerpulse {\n\t0%,100% { box-shadow: 0 5px 0 #FF4D6D; }\n\t50%     { box-shadow: 0 6px 0 rgba(255,77,109,0.85); }\n}\n\n@media (prefers-reduced-motion: reduce){\n\thtml[data-xtcymc-exp=\"riso\"][data-xtcymc-exp-bg] *{ animation: none !important; }\n}\n",
};

const COMIC: ExpTheme = {
	id: "comic", name: "Comic · 漫画",
	tagline: "美式波普漫画：牛皮纸底、3px 黑墨描边、波普三原色，半调网点、大写粗体标题、漫画蓝下划线链接，开启动效后漂移的本戴网点、速度放射线与 POW/ZAP 弹跳",
	icon: "ti ti-bolt", scheme: "light",
	radius: "4px", margin: "16px", blur: "blur(0px)", modalBgFilter: "blur(0px)",
	palette: {
		"accent": "#E63946",
		"accentedBg": "rgba(230,57,70,0.14)",
		"love": "#E63946",
		"focus": "#FFD000",
		"bg": "#FBF6E9",
		"fg": "#111111",
		"fgHighlighted": "#000000",
		"fgOnAccent": "#FFFFFF",
		"fgOnWhite": "#E63946",
		"divider": "#111111",
		"indicator": "#E63946",
		"panel": "#FFFDF5",
		"panelHighlight": "#FFF1B8",
		"panelHeaderBg": "#111111",
		"panelHeaderFg": "#FFD000",
		"panelBorder": "solid 3px #111111",
		"windowHeader": "#FFFDF5",
		"popup": "#FFFDF5",
		"shadow": "#111111",
		"header": "#FBF6E9",
		"navBg": "#FFEC9E",
		"navFg": "#111111",
		"navActive": "#E63946",
		"navIndicator": "#E63946",
		"pageHeaderBg": "#111111",
		"pageHeaderFg": "#FFD000",
		"link": "#1D6FB8",
		"hashtag": "#1D6FB8",
		"mention": "#E63946",
		"mentionMe": "#E63946",
		"renote": "#118A4E",
		"modalBg": "rgba(17,17,17,0.45)",
		"scrollbarHandle": "#111111",
		"scrollbarHandleHover": "#E63946",
		"dateLabelFg": "#111111",
		"infoBg": "#CDE7FF",
		"infoFg": "#0E3A5E",
		"infoWarnBg": "#FFD000",
		"infoWarnFg": "#111111",
		"folderHeaderBg": "rgba(17,17,17,0.06)",
		"folderHeaderHoverBg": "#FFD000",
		"buttonBg": "#FFFDF5",
		"buttonHoverBg": "#FFD000",
		"buttonGradateA": "#E63946",
		"buttonGradateB": "#E63946",
		"switchBg": "rgba(17,17,17,0.2)",
		"switchOffBg": "#111111",
		"switchOffFg": "#FFFFFF",
		"switchOnBg": "#E63946",
		"switchOnFg": "#FFFFFF",
		"inputBorder": "#111111",
		"inputBorderHover": "#E63946",
		"badge": "#E63946",
		"messageBg": "#FFFDF5",
		"success": "#118A4E",
		"error": "#E63946",
		"warn": "#FFAA00",
		"codeString": "#E63946",
		"codeNumber": "#1D6FB8",
		"codeBoolean": "#118A4E",
		"deckBg": "#F2EAD3",
		"htmlThemeColor": "#FBF6E9"
	},
	structural: "\nhtml[data-xtcymc-exp=\"comic\"],\nhtml[data-xtcymc-exp=\"comic\"] body,\nhtml[data-xtcymc-exp=\"comic\"] button,\nhtml[data-xtcymc-exp=\"comic\"] input,\nhtml[data-xtcymc-exp=\"comic\"] textarea {\n\tfont-family: \"Bangers\",\"Anton\",\"Archivo Black\",\"Arial Black\",\"Helvetica Neue\",\"Noto Sans CJK SC\",\"PingFang SC\",Arial,sans-serif !important;\n\tfont-weight: 800 !important;\n}\n/* 还原图标字体：保险起见在主题作用域内显式恢复 tabler，避免图标变 □ */\nhtml[data-xtcymc-exp=\"comic\"] .ti,\nhtml[data-xtcymc-exp=\"comic\"] [class*=\"ti-\"],\nhtml[data-xtcymc-exp=\"comic\"] i[class^=\"ti\"] { font-family: \"tabler-icons\" !important; }\nhtml[data-xtcymc-exp=\"comic\"] * { border-radius: 4px !important; }\n/* 牛皮纸底 + 静态本戴半调网点（动效见 aggressive） */\nhtml[data-xtcymc-exp=\"comic\"] body {\n\tbackground-color: #FBF6E9 !important;\n\tbackground-image: radial-gradient(rgba(17,17,17,0.10) 1.4px, transparent 1.6px) !important;\n\tbackground-size: 14px 14px !important;\n}\n/* 面板 = 漫画分镜框：3px 黑墨边 + 硬黑投影 */\nhtml[data-xtcymc-exp=\"comic\"] ._panel {\n\tborder: 3px solid #111 !important;\n\tbox-shadow: 5px 5px 0 #111 !important;\n\tbackground: #FFFDF5 !important;\n}\nhtml[data-xtcymc-exp=\"comic\"] ._shadow { box-shadow: 5px 5px 0 #111 !important; }\nhtml[data-xtcymc-exp=\"comic\"] ._popup,\nhtml[data-xtcymc-exp=\"comic\"] ._acrylic {\n\tborder: 3px solid #111 !important; box-shadow: 5px 5px 0 #111 !important;\n\tbackground: #FFFDF5 !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n}\n/* 帖子独立成漫画格子，允许轻微倾斜 */\nhtml[data-xtcymc-exp=\"comic\"] article {\n\tborder: 3px solid #111 !important;\n\tbox-shadow: 4px 4px 0 #111 !important;\n\tbackground: #FFFDF5 !important;\n\tmargin: 0 0 10px !important;\n}\n/* 标题：大写、超粗、紧字距，速记气泡感 */\nhtml[data-xtcymc-exp=\"comic\"] h1,\nhtml[data-xtcymc-exp=\"comic\"] h2,\nhtml[data-xtcymc-exp=\"comic\"] h3 {\n\ttext-transform: uppercase !important;\n\tfont-weight: 900 !important;\n\tletter-spacing: 0.01em !important;\n\tcolor: #111 !important;\n\ttext-shadow: 2px 2px 0 #FFD000 !important;\n}\n/* 链接：漫画蓝 + 粗下划线 */\nhtml[data-xtcymc-exp=\"comic\"] ._link {\n\tcolor: #1D6FB8 !important;\n\ttext-decoration: underline !important;\n\ttext-decoration-thickness: 2px !important;\n\ttext-underline-offset: 2px !important;\n\tfont-weight: 800 !important;\n}\n/* 红色主按钮：黑墨描边 + 硬投影 + 大写 */\nhtml[data-xtcymc-exp=\"comic\"] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"comic\"] ._buttonGradate {\n\tbackground: #E63946 !important;\n\tbackground-image: none !important;\n\tcolor: #FFFFFF !important;\n\tborder: 3px solid #111 !important;\n\tbox-shadow: 3px 3px 0 #111 !important;\n\ttext-transform: uppercase !important;\n\tfont-weight: 900 !important;\n\tletter-spacing: 0.02em !important;\n}\n/* 描边按钮：黑墨硬边、黄底半调感 */\nhtml[data-xtcymc-exp=\"comic\"] ._borderButton {\n\tborder: 3px solid #111 !important;\n\tbox-shadow: 3px 3px 0 #111 !important;\n\ttext-transform: uppercase !important;\n\tfont-weight: 800 !important;\n\tletter-spacing: 0.02em !important;\n}\nhtml[data-xtcymc-exp=\"comic\"] ._buttonPrimary:active,\nhtml[data-xtcymc-exp=\"comic\"] ._buttonGradate:active,\nhtml[data-xtcymc-exp=\"comic\"] ._borderButton:active {\n\ttransform: translate(2px,2px) !important; box-shadow: 1px 1px 0 #111 !important;\n}\n/* 输入框：黑墨硬边、纸白底 */\nhtml[data-xtcymc-exp=\"comic\"] input,\nhtml[data-xtcymc-exp=\"comic\"] textarea {\n\tborder: 3px solid #111 !important;\n\tbackground: #FFFDF5 !important;\n\tcolor: #111 !important;\n}\nhtml[data-xtcymc-exp=\"comic\"] input::placeholder,\nhtml[data-xtcymc-exp=\"comic\"] textarea::placeholder { color: rgba(17,17,17,0.45) !important; }\n/* 头像：黑墨方边 + 黄色硬投影 */\nhtml[data-xtcymc-exp=\"comic\"] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"comic\"] [class*=\"avatar\"] > img {\n\tborder: 3px solid #111 !important;\n\tbox-shadow: 3px 3px 0 #FFD000 !important;\n}\n/* 角标/计数：红底黑边的漫画爆点 */\nhtml[data-xtcymc-exp=\"comic\"] ._indicateCounter,\nhtml[data-xtcymc-exp=\"comic\"] ._indicatorCircle {\n\tborder: 2px solid #111 !important;\n\tbackground: #E63946 !important;\n\tcolor: #FFFFFF !important;\n}\n/* sticky 页眉：纯黑墨条 + 黄字，去玻璃模糊，底部 4px 黑墨实线 */\nhtml[data-xtcymc-exp=\"comic\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: #111111 !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tborder-bottom: 4px solid #111 !important;\n\tbox-shadow: 0 4px 0 #E63946 !important;\n}\nhtml[data-xtcymc-exp=\"comic\"] [style*=\"--MI-stickyTop\"] i,\nhtml[data-xtcymc-exp=\"comic\"] [style*=\"--MI-stickyTop\"] span,\nhtml[data-xtcymc-exp=\"comic\"] [style*=\"--MI-stickyTop\"] div { color: #FFD000 !important; }\n/* 图片：略增对比，漫画印刷观感（排除表情/反应/头像） */\nhtml[data-xtcymc-exp=\"comic\"] img:not([class*=\"emoji\"]):not([class*=\"mfm\"]):not([class*=\"reaction\"]):not([class*=\"avatar\"]) {\n\tfilter: contrast(1.08) saturate(1.12) !important;\n}\n",
	aggressive: "\n/* ===== COMIC · 漫画 — aggressive：常驻本戴网点 + 放射速度线 + 漫画格能量 + POW/ZAP 弹跳 ===== */\n\n/* 半透明表面：揭示 body 上的本戴网点与放射线常驻显现；浅色主题 nav/pageHeader 取高 alpha 保字清晰 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(251,246,233,0.42) !important;\n\t--MI_THEME-deckBg: rgba(242,234,211,0.4) !important;\n\t--MI_THEME-navBg: rgba(255,236,158,0.5) !important;\n\t--MI_THEME-pageHeaderBg: rgba(17,17,17,0.88) !important;\n\t--MI_THEME-panel: rgba(255,253,245,0.94) !important;\n\t--MI_THEME-popup: rgba(255,253,245,0.97) !important;\n}\n\n/* body：醒目的波普黄底 + 大颗本戴网点（红/蓝对向漂移），固定铺满视口、常驻可见。\n   关键：底色用饱和黄而非奶白，与奶白面板形成强对比，缝隙处一眼就是\"漫画背景\" */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] body {\n\tbackground-color: #FFCE2E !important;\n\tbackground-image:\n\t\tradial-gradient(rgba(230,57,70,0.62) 4.5px, transparent 5px),\n\t\tradial-gradient(rgba(29,111,184,0.42) 3.5px, transparent 4px) !important;\n\tbackground-size: 22px 22px, 22px 22px !important;\n\tbackground-position: 0 0, 11px 11px !important;\n\tbackground-attachment: fixed !important;\n\tposition: relative !important;\n\tanimation: kf-comic-halftone 26s linear infinite !important;\n}\n\n/* body::before：四角放射状速度线（动作线）+ 黄色阳光爆点，缓慢旋转脉动，固定常驻、不挡点击 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground-image:\n\t\trepeating-conic-gradient(from 0deg at 12% 88%, rgba(230,57,70,0.10) 0deg 3deg, transparent 3deg 9deg),\n\t\trepeating-conic-gradient(from 0deg at 88% 12%, rgba(29,111,184,0.10) 0deg 3deg, transparent 3deg 9deg),\n\t\tradial-gradient(circle at 8% 92%, rgba(255,208,0,0.26) 0 80px, transparent 84px),\n\t\tradial-gradient(circle at 92% 8%, rgba(230,57,70,0.16) 0 100px, transparent 104px) !important;\n\tanimation: kf-comic-rays 40s linear infinite !important;\n}\n\n/* 确保内容浮在背景图层之上 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] #misskey_app,\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] body > div { position: relative !important; z-index: 1 !important; }\n\n/* sticky 页眉背后的速度放射线（重复锥形条纹），叠加在黑墨条上、黄字仍清晰 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tbackground-color: #111111 !important;\n\tbackground-image: repeating-conic-gradient(from 0deg at 50% 50%, rgba(255,208,0,0.16) 0deg 4deg, transparent 4deg 9deg) !important;\n\tborder-bottom: 4px solid #111 !important;\n\tbox-shadow: 0 4px 0 #E63946 !important;\n\tposition: relative !important;\n\tanimation: kf-comic-speed 14s linear infinite !important;\n}\n/* 页眉底部速度条左右掠过 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"]::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important; left: 0 !important; right: 0 !important; bottom: -4px !important;\n\theight: 4px !important; pointer-events: none !important; z-index: 4 !important;\n\tbackground: linear-gradient(90deg, transparent, #FFD000, transparent) !important;\n\tbackground-size: 40% 100% !important; background-repeat: no-repeat !important;\n\tanimation: kf-comic-sweep 5s linear infinite !important;\n}\n/* 保险：页眉作用域内再次还原图标字体 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] .ti,\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] [class*=\"ti-\"] { font-family: \"tabler-icons\" !important; }\n\n/* 面板 = 不透明漫画分镜框：实色卡片让正文清晰，背景只在缝隙透出；悬停弹起 POP */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: rgba(255,253,245,0.94) !important;\n\ttransition: transform 0.12s ease, box-shadow 0.12s ease !important;\n}\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._panel:hover {\n\ttransform: translate(-2px,-2px) !important;\n\tbox-shadow: 9px 9px 0 #111 !important;\n}\n/* 弹窗：高 alpha 实色，保证可读 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: rgba(255,253,245,0.97) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n}\n/* 帖子格子：奇偶轻微反向倾斜，悬停弹出。\n   关键：article 外层【保持透明】，让波普黄网点背景从帖子之间的缝隙常驻透出；\n   正文落在内层实色 ._panel 上，可读性不受影响（对齐 synthwave 的做法）。 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] article {\n\tbackground: transparent !important;\n\ttransform: rotate(-0.4deg) !important;\n\ttransition: transform 0.12s ease, box-shadow 0.12s ease !important;\n\tposition: relative !important; z-index: 1 !important;\n}\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] article:nth-child(even) { transform: rotate(0.4deg) !important; }\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] article:hover {\n\ttransform: rotate(0deg) translate(-2px,-2px) !important;\n\tbox-shadow: 8px 8px 0 #111, -3px -3px 0 #FFD000 !important;\n\tz-index: 2 !important;\n}\n\n/* 红色主按钮：POW 弹跳缩放脉冲，悬停跳起，按下砸下 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._buttonGradate {\n\tbackground: #E63946 !important; background-image: none !important; color: #FFFFFF !important;\n\tanimation: kf-comic-pow 1.8s ease-in-out infinite !important;\n\ttransition: transform 0.1s ease !important;\n}\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._buttonPrimary:hover,\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._buttonGradate:hover {\n\ttransform: translate(-2px,-2px) scale(1.03) !important;\n}\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._buttonPrimary:active,\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._buttonGradate:active {\n\ttransform: translate(2px,2px) !important; animation: none !important; box-shadow: 1px 1px 0 #111 !important;\n}\n/* 描边按钮：悬停翻黄底黑字 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._borderButton {\n\ttransition: background-color 0.12s ease, color 0.12s ease, transform 0.1s ease !important;\n}\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tbackground: #FFD000 !important; color: #111 !important; transform: translate(-2px,-2px) !important;\n}\n\n/* 头像：ZAP 心跳脉冲缩放 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img {\n\tanimation: kf-comic-zap 2.6s ease-in-out infinite !important;\n}\n/* 角标/计数：红黄爆点闪烁，漫画感叹 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._indicateCounter,\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._indicatorCircle {\n\tanimation: kf-comic-flash 1.1s steps(1,end) infinite !important;\n}\n/* 链接悬停：黄色高亮块、下划线增粗 */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] ._link:hover {\n\tbackground: #FFD000 !important; color: #111 !important; text-decoration-thickness: 4px !important;\n}\n\n/* 底部无缝漫画拟声词跑马灯（两段完全相同、各宽于视口，固定常驻） */\nhtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ POW ★ ZAP ★ BAM ★ WHAM ★ BOOM ★ KAPOW ★ \" !important;\n\tposition: fixed !important; left: 0 !important; bottom: 0 !important;\n\twidth: max-content !important; max-width: none !important;\n\twhite-space: nowrap !important;\n\tpointer-events: none !important; z-index: 9998 !important;\n\tfont-weight: 900 !important; font-size: 14px !important; letter-spacing: 0.06em !important;\n\ttext-transform: uppercase !important;\n\tcolor: #FFD000 !important; background: #E63946 !important;\n\tborder-top: 3px solid #111 !important; padding: 5px 0 !important;\n\ttext-shadow: 1px 1px 0 #111 !important;\n\twill-change: transform !important;\n\tanimation: kf-comic-marquee 34s linear infinite !important;\n}\n\n@keyframes kf-comic-halftone {\n\t0%   { background-position: 0 0, 11px 11px; }\n\t100% { background-position: 22px -22px, -11px 33px; }\n}\n@keyframes kf-comic-rays {\n\t0%   { transform: rotate(0deg) scale(1); opacity: 0.9; }\n\t50%  { opacity: 1; }\n\t100% { transform: rotate(360deg) scale(1); opacity: 0.9; }\n}\n@keyframes kf-comic-speed {\n\t0%   { background-position: 0 0; }\n\t100% { background-position: 0 0; transform: rotate(0deg); }\n}\n@keyframes kf-comic-sweep {\n\t0%   { background-position: -40% 0; }\n\t100% { background-position: 140% 0; }\n}\n@keyframes kf-comic-pow {\n\t0%, 100% { transform: scale(1); box-shadow: 3px 3px 0 #111; }\n\t50%      { transform: scale(1.04); box-shadow: 4px 4px 0 #111; }\n}\n@keyframes kf-comic-zap {\n\t0%, 100% { transform: scale(1) rotate(0deg); }\n\t50%      { transform: scale(1.06) rotate(-1.5deg); }\n}\n@keyframes kf-comic-flash {\n\t0%, 100% { background: #E63946 !important; color: #FFFFFF !important; }\n\t50%      { background: #FFD000 !important; color: #111 !important; }\n}\n@keyframes kf-comic-marquee {\n\t0%   { transform: translateX(0); }\n\t100% { transform: translateX(-50%); }\n}\n\n/* 动效安全：尊重 prefers-reduced-motion，停止全部动画 */\n@media (prefers-reduced-motion: reduce){\n\thtml[data-xtcymc-exp=\"comic\"][data-xtcymc-exp-bg] *{ animation: none !important; }\n}\n",
};

const BLUEPRINT: ExpTheme = {
	id: "blueprint", name: "Blueprint · 蓝图",
	tagline: "建筑制图蓝图：深靛蓝图纸、青色+白色细钢笔描边、工程网格底、尺寸线美学、扫描出图掠线、角部裁切标记",
	icon: "ti ti-ruler-2", scheme: "dark",
	radius: "2px", margin: "14px", blur: "blur(0px)", modalBgFilter: "blur(0px)",
	palette: {
		"accent": "#62B6F2",
		"accentedBg": "rgba(98,182,242,0.14)",
		"love": "#FF7B9C",
		"focus": "rgba(98,182,242,0.5)",
		"bg": "#0A1A2F",
		"fg": "#C8E4FB",
		"fgHighlighted": "#FFFFFF",
		"fgOnAccent": "#06182B",
		"fgOnWhite": "#62B6F2",
		"divider": "rgba(98,182,242,0.26)",
		"indicator": "#62B6F2",
		"panel": "#0E2542",
		"panelHighlight": "#143153",
		"panelHeaderBg": "#08182B",
		"panelHeaderFg": "#9FD2F7",
		"panelBorder": "solid 1px rgba(98,182,242,0.4)",
		"windowHeader": "#08182B",
		"popup": "#0E2542",
		"shadow": "rgba(6,18,38,0.55)",
		"header": "rgba(8,24,43,0.82)",
		"navBg": "#08182B",
		"navFg": "#C8E4FB",
		"navActive": "#62B6F2",
		"navIndicator": "#62B6F2",
		"pageHeaderBg": "#08182B",
		"pageHeaderFg": "#9FD2F7",
		"link": "#7FC5F7",
		"hashtag": "#8FE0E0",
		"mention": "#62B6F2",
		"mentionMe": "#9FD2F7",
		"renote": "#7DE0C8",
		"modalBg": "rgba(4,12,24,0.7)",
		"scrollbarHandle": "rgba(98,182,242,0.32)",
		"scrollbarHandleHover": "rgba(98,182,242,0.55)",
		"dateLabelFg": "#9FD2F7",
		"infoBg": "#10314F",
		"infoFg": "#A8D6F5",
		"infoWarnBg": "#3A3216",
		"infoWarnFg": "#E8C66A",
		"folderHeaderBg": "rgba(98,182,242,0.08)",
		"folderHeaderHoverBg": "rgba(98,182,242,0.16)",
		"buttonBg": "#10294A",
		"buttonHoverBg": "#173559",
		"buttonGradateA": "#62B6F2",
		"buttonGradateB": "#3D8FD6",
		"switchBg": "rgba(98,182,242,0.22)",
		"switchOffBg": "rgba(98,182,242,0.12)",
		"switchOffFg": "#0A1A2F",
		"switchOnBg": "rgba(98,182,242,0.22)",
		"switchOnFg": "#62B6F2",
		"inputBorder": "rgba(98,182,242,0.32)",
		"inputBorderHover": "rgba(98,182,242,0.55)",
		"badge": "#62B6F2",
		"messageBg": "#0A1A2F",
		"success": "#7DE0C8",
		"error": "#FF7B9C",
		"warn": "#E8C66A",
		"codeString": "#8FE0E0",
		"codeNumber": "#9FD2F7",
		"codeBoolean": "#7DE0C8",
		"deckBg": "#08182B",
		"htmlThemeColor": "#0A1A2F"
	},
	structural: "\nhtml[data-xtcymc-exp=\"blueprint\"],\nhtml[data-xtcymc-exp=\"blueprint\"] body,\nhtml[data-xtcymc-exp=\"blueprint\"] button,\nhtml[data-xtcymc-exp=\"blueprint\"] input,\nhtml[data-xtcymc-exp=\"blueprint\"] textarea {\n\tfont-family: \"IBM Plex Mono\",\"JetBrains Mono\",\"Sarasa Mono SC\",\"Space Mono\",Consolas,\"DejaVu Sans Mono\",monospace !important;\n\tletter-spacing: 0.01em !important;\n}\n/* 还原图标字体：上面把 button/input 等设成等宽，<i> 图标会从 html 继承等宽而变 □，必须显式恢复 */\nhtml[data-xtcymc-exp=\"blueprint\"] .ti,\nhtml[data-xtcymc-exp=\"blueprint\"] [class*=\"ti-\"],\nhtml[data-xtcymc-exp=\"blueprint\"] i[class^=\"ti\"] { font-family: \"tabler-icons\" !important; }\n/* 锐利制图圆角 */\nhtml[data-xtcymc-exp=\"blueprint\"] * { border-radius: 2px !important; }\n/* 深靛蓝图纸 + 精细工程网格底（粗 120px / 细 24px 双层青线） */\nhtml[data-xtcymc-exp=\"blueprint\"] body {\n\tbackground-color: #0A1A2F !important;\n\tbackground-image:\n\t\tlinear-gradient(rgba(98,182,242,0.16) 1px, transparent 1px),\n\t\tlinear-gradient(90deg, rgba(98,182,242,0.16) 1px, transparent 1px),\n\t\tlinear-gradient(rgba(98,182,242,0.07) 1px, transparent 1px),\n\t\tlinear-gradient(90deg, rgba(98,182,242,0.07) 1px, transparent 1px) !important;\n\tbackground-size: 120px 120px, 120px 120px, 24px 24px, 24px 24px !important;\n}\n/* 面板 = 1px 青色细钢笔描边、无填充质感、青色微光 */\nhtml[data-xtcymc-exp=\"blueprint\"] ._panel {\n\tborder: 1px solid rgba(98,182,242,0.4) !important;\n\tbox-shadow: 0 0 0 1px rgba(98,182,242,0.06), 0 2px 18px rgba(4,12,24,0.5) !important;\n}\nhtml[data-xtcymc-exp=\"blueprint\"] ._popup,\nhtml[data-xtcymc-exp=\"blueprint\"] ._acrylic {\n\tborder: 1px solid rgba(98,182,242,0.5) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n}\nhtml[data-xtcymc-exp=\"blueprint\"] ._shadow { box-shadow: 0 2px 18px rgba(4,12,24,0.5) !important; }\n/* 帖子之间：青色细 hairline 分隔，像图纸上的尺寸线 */\nhtml[data-xtcymc-exp=\"blueprint\"] article { border-bottom: 1px solid rgba(98,182,242,0.18) !important; }\n/* 输入框：深底 + 青色细边 + 青色光标 */\nhtml[data-xtcymc-exp=\"blueprint\"] input,\nhtml[data-xtcymc-exp=\"blueprint\"] textarea {\n\tbackground: #08182B !important;\n\tborder: 1px solid rgba(98,182,242,0.32) !important;\n\tcolor: #C8E4FB !important;\n\tcaret-color: #62B6F2 !important;\n}\nhtml[data-xtcymc-exp=\"blueprint\"] input::placeholder,\nhtml[data-xtcymc-exp=\"blueprint\"] textarea::placeholder { color: rgba(159,210,247,0.42) !important; }\n/* 描边按钮：制图风格，1px 青边、大写、技术字距 */\nhtml[data-xtcymc-exp=\"blueprint\"] ._borderButton {\n\tborder: 1px solid rgba(98,182,242,0.5) !important;\n\tbackground: rgba(98,182,242,0.05) !important;\n\ttext-transform: uppercase !important;\n\tletter-spacing: 0.08em !important;\n}\n/* 主按钮 / 渐变按钮：扁平青色、深字、细边 */\nhtml[data-xtcymc-exp=\"blueprint\"] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"blueprint\"] ._buttonGradate {\n\tborder: 1px solid rgba(159,210,247,0.6) !important;\n\tcolor: #06182B !important;\n}\n/* 标题：白/青字、宽字距、像图纸标注 */\nhtml[data-xtcymc-exp=\"blueprint\"] h1,\nhtml[data-xtcymc-exp=\"blueprint\"] h2,\nhtml[data-xtcymc-exp=\"blueprint\"] h3 {\n\tcolor: #FFFFFF !important;\n\tfont-weight: 600 !important;\n\tletter-spacing: 0.06em !important;\n\ttext-transform: uppercase !important;\n}\n/* 链接：青色下划线，像引出标注 */\nhtml[data-xtcymc-exp=\"blueprint\"] ._link {\n\tcolor: #7FC5F7 !important;\n\ttext-decoration: underline !important;\n\ttext-decoration-thickness: 1px !important;\n\ttext-underline-offset: 2px !important;\n}\n/* 图片：青色细描边裱框 + 轻微去饱和，像贴在图纸上的照片 */\nhtml[data-xtcymc-exp=\"blueprint\"] img:not([class*=\"emoji\"]):not([class*=\"mfm\"]):not([class*=\"reaction\"]):not([class*=\"avatar\"]) {\n\tborder: 1px solid rgba(98,182,242,0.3) !important;\n\tfilter: saturate(0.85) contrast(1.04) !important;\n}\n/* 头像：方形感（小圆角）+ 青色细边 */\nhtml[data-xtcymc-exp=\"blueprint\"] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"blueprint\"] [class*=\"avatar\"] > img {\n\tborder: 1px solid rgba(98,182,242,0.45) !important;\n\tborder-radius: 2px !important;\n}\n/* sticky 页眉：深 navy 实色 + 底部青色下划线、去玻璃模糊 */\nhtml[data-xtcymc-exp=\"blueprint\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: #08182B !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tborder-bottom: 1px solid rgba(98,182,242,0.45) !important;\n}\n",
	aggressive: "\r\n/* ── BLUEPRINT · 蓝图 aggressive：发光青色制图网格(细网+主网) + 制图标注/尺寸符号/圆规弧线 + 缓慢出图掠线 + 工程注记 ── */\r\n\r\n/* 1) 半透明表面：在双属性高特异性作用域重声明，让 body 上的发光制图网格透过 gutters/列间/widgets 常驻显现；侧栏与页眉保持可读 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] {\r\n\t--MI_THEME-bg: rgba(10,26,47,0.42) !important;\r\n\t--MI_THEME-deckBg: rgba(8,24,43,0.46) !important;\r\n\t--MI_THEME-navBg: rgba(8,24,43,0.42) !important;\r\n\t--MI_THEME-pageHeaderBg: rgba(8,24,43,0.88) !important;\r\n\t--MI_THEME-panelHeaderBg: rgba(8,24,43,0.92) !important;\r\n\t--MI_THEME-panel: rgba(14,37,66,0.9) !important;\r\n\t--MI_THEME-popup: rgba(14,37,66,0.94) !important;\r\n}\r\n\r\n/* 2) body：深 navy 图纸底 + 缓慢斜向平移的精细工程网格（主网 120px + 细网 24px 双层青线，发光感由叠加层负责），固定铺满视口 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] body {\r\n\tbackground-color: #07162A !important;\r\n\tbackground-image:\r\n\t\tradial-gradient(ellipse 70% 55% at 50% 38%, rgba(98,182,242,0.14), transparent 64%),\r\n\t\tlinear-gradient(rgba(120,200,255,0.46) 1.2px, transparent 1.2px),\r\n\t\tlinear-gradient(90deg, rgba(120,200,255,0.46) 1.2px, transparent 1.2px),\r\n\t\tlinear-gradient(rgba(98,182,242,0.2) 1px, transparent 1px),\r\n\t\tlinear-gradient(90deg, rgba(98,182,242,0.2) 1px, transparent 1px) !important;\r\n\tbackground-size: 100% 100%, 120px 120px, 120px 120px, 24px 24px, 24px 24px !important;\r\n\tbackground-attachment: fixed !important;\r\n\tbackground-position: 0 0, 0 0, 0 0, 0 0, 0 0 !important;\r\n\tposition: relative !important;\r\n\tanimation: kf-blueprint-pan 44s linear infinite !important;\r\n}\r\n\r\n/* 3) body::before 常驻装饰层：发光主网格交点 + 圆规绘出的同心制图弧线 + 中心定位十字（深底之上发青色辉光），固定铺满、不挡点击、置于内容之下 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] body::before {\r\n\tcontent: \"\" !important;\r\n\tposition: fixed !important; inset: 0 !important;\r\n\tpointer-events: none !important; z-index: 0 !important;\r\n\tbackground:\r\n\t\tradial-gradient(circle at 50% 50%, rgba(98,182,242,0.0) 0, rgba(98,182,242,0.0) 240px, rgba(98,182,242,0.16) 241px, rgba(98,182,242,0.16) 242px, rgba(98,182,242,0.0) 243px),\r\n\t\tradial-gradient(circle at 50% 50%, rgba(127,197,247,0.0) 0, rgba(127,197,247,0.0) 360px, rgba(127,197,247,0.13) 361px, rgba(127,197,247,0.13) 363px, rgba(127,197,247,0.0) 364px),\r\n\t\tradial-gradient(circle at 50% 50%, rgba(143,224,224,0.0) 0, rgba(143,224,224,0.0) 500px, rgba(143,224,224,0.10) 501px, rgba(143,224,224,0.10) 503px, rgba(143,224,224,0.0) 504px),\r\n\t\tlinear-gradient(90deg, rgba(98,182,242,0.28), rgba(98,182,242,0.28)) 50% 50% / 40px 1px no-repeat,\r\n\t\tlinear-gradient(0deg, rgba(98,182,242,0.28), rgba(98,182,242,0.28)) 50% 50% / 1px 40px no-repeat,\r\n\t\tradial-gradient(circle at 60px 60px, rgba(98,182,242,0.5) 0, rgba(98,182,242,0.5) 1.4px, transparent 2px) !important;\r\n\tbackground-repeat:\r\n\t\tno-repeat, no-repeat, no-repeat,\r\n\t\tno-repeat, no-repeat,\r\n\t\trepeat !important;\r\n\tbackground-size:\r\n\t\t100% 100%, 100% 100%, 100% 100%,\r\n\t\t40px 1px, 1px 40px,\r\n\t\t120px 120px !important;\r\n\tfilter: drop-shadow(0 0 6px rgba(98,182,242,0.35)) !important;\r\n\topacity: 0.9 !important;\r\n\tanimation: kf-blueprint-breathe 12s ease-in-out infinite !important;\r\n}\r\n\r\n/* 4) body::after 常驻装饰层：缓慢自上而下的青色「出图/扫描」掠线 + 四角 L 形裁切对位标记，固定铺满、不挡点击、置于内容之下 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] body::after {\r\n\tcontent: \"\" !important;\r\n\tposition: fixed !important; inset: 0 !important;\r\n\tpointer-events: none !important; z-index: 0 !important;\r\n\tbackground:\r\n\t\tlinear-gradient(to bottom,\r\n\t\t\ttransparent 0%,\r\n\t\t\trgba(98,182,242,0.0) 44%,\r\n\t\t\trgba(98,182,242,0.10) 48%,\r\n\t\t\trgba(159,210,247,0.55) 50%,\r\n\t\t\trgba(98,182,242,0.10) 52%,\r\n\t\t\trgba(98,182,242,0.0) 56%,\r\n\t\t\ttransparent 100%) top left / 100% 100% no-repeat,\r\n\t\tlinear-gradient(90deg, rgba(98,182,242,0.65), rgba(98,182,242,0.65)) 14px 14px / 30px 1px no-repeat,\r\n\t\tlinear-gradient(0deg, rgba(98,182,242,0.65), rgba(98,182,242,0.65)) 14px 14px / 1px 30px no-repeat,\r\n\t\tlinear-gradient(90deg, rgba(98,182,242,0.65), rgba(98,182,242,0.65)) right 14px top 14px / 30px 1px no-repeat,\r\n\t\tlinear-gradient(0deg, rgba(98,182,242,0.65), rgba(98,182,242,0.65)) right 14px top 14px / 1px 30px no-repeat,\r\n\t\tlinear-gradient(90deg, rgba(98,182,242,0.65), rgba(98,182,242,0.65)) left 14px bottom 14px / 30px 1px no-repeat,\r\n\t\tlinear-gradient(0deg, rgba(98,182,242,0.65), rgba(98,182,242,0.65)) left 14px bottom 14px / 1px 30px no-repeat,\r\n\t\tlinear-gradient(90deg, rgba(98,182,242,0.65), rgba(98,182,242,0.65)) right 14px bottom 14px / 30px 1px no-repeat,\r\n\t\tlinear-gradient(0deg, rgba(98,182,242,0.65), rgba(98,182,242,0.65)) right 14px bottom 14px / 1px 30px no-repeat !important;\r\n\tmix-blend-mode: screen !important;\r\n\topacity: 0.8 !important;\r\n\tanimation: kf-blueprint-plot 11s linear infinite !important;\r\n}\r\n\r\n/* 确保内容浮在背景图层之上 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] #misskey_app,\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] body > div { position: relative !important; z-index: 1 !important; }\r\n\r\n/* 可读性：面板/弹窗维持实色或 >=.88 alpha，让正文坐在不透明卡片上，背景只在缝隙透出 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] ._panel {\r\n\tbackground: rgba(14,37,66,0.9) !important;\r\n\tposition: relative !important;\r\n\ttransition: box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] ._popup,\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] ._acrylic {\r\n\tbackground: rgba(14,37,66,0.94) !important;\r\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\r\n}\r\n\r\n/* 5) 标题：白字 + 青色钢笔余辉 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] h1,\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] h2,\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] h3 {\r\n\ttext-shadow: 0 0 5px rgba(98,182,242,0.45), 0 0 12px rgba(98,182,242,0.22) !important;\r\n}\r\n\r\n/* 6) 链接/强调：青色细描边发光（悬停加强） */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] ._link {\r\n\ttransition: text-shadow 0.3s ease, color 0.3s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] ._link:hover {\r\n\ttext-shadow: 0 0 8px rgba(127,197,247,0.6) !important;\r\n}\r\n\r\n/* 7) 面板/帖子：悬停时青色描边脉冲发光 + 上浮，左缘画出尺寸刻度记号 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] article {\r\n\tposition: relative !important;\r\n\ttransition: box-shadow 0.3s ease, border-color 0.3s ease, transform 0.3s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] ._panel:hover,\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] article:hover {\r\n\tborder-color: rgba(98,182,242,0.6) !important;\r\n\tbox-shadow: 0 0 0 1px rgba(98,182,242,0.4), 0 0 18px rgba(98,182,242,0.18) !important;\r\n\ttransform: translateY(-1px) !important;\r\n}\r\n/* 尺寸线刻度：帖子左缘出现一排青色细 tick（像工程图的标尺） */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] article::before {\r\n\tcontent: \"\" !important;\r\n\tposition: absolute !important;\r\n\ttop: 0 !important; bottom: 0 !important; left: 0 !important;\r\n\twidth: 6px !important;\r\n\tpointer-events: none !important;\r\n\tz-index: 2 !important;\r\n\tbackground: repeating-linear-gradient(\r\n\t\tto bottom,\r\n\t\trgba(98,182,242,0.5) 0 1px,\r\n\t\ttransparent 1px 8px) !important;\r\n\topacity: 0 !important;\r\n\ttransition: opacity 0.3s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] article:hover::before { opacity: 0.85 !important; }\r\n\r\n/* 8) 按钮：青色辉光呼吸 + 悬停亮起，描边按钮悬停内发光 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] ._buttonPrimary,\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] ._buttonGradate {\r\n\tbox-shadow: 0 0 10px rgba(98,182,242,0.3) !important;\r\n\tanimation: kf-blueprint-pulse 3.6s ease-in-out infinite !important;\r\n}\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] ._borderButton {\r\n\ttransition: box-shadow 0.25s ease, text-shadow 0.25s ease, border-color 0.25s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] ._borderButton:hover {\r\n\tborder-color: rgba(98,182,242,0.8) !important;\r\n\tbox-shadow: 0 0 12px rgba(98,182,242,0.45), inset 0 0 8px rgba(98,182,242,0.1) !important;\r\n\ttext-shadow: 0 0 6px rgba(98,182,242,0.55) !important;\r\n}\r\n\r\n/* 9) 输入框聚焦：青色内辉光 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] input:focus,\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] textarea:focus {\r\n\tbox-shadow: 0 0 0 1px rgba(98,182,242,0.5), inset 0 0 12px rgba(98,182,242,0.08) !important;\r\n\ttext-shadow: 0 0 4px rgba(98,182,242,0.4) !important;\r\n}\r\n\r\n/* 10) sticky 页眉：底部青色出图扫描条缓慢左右掠过 */\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\r\n\tborder-bottom: 1px solid rgba(98,182,242,0.5) !important;\r\n\tbox-shadow: 0 1px 14px rgba(98,182,242,0.14) !important;\r\n\tposition: relative !important;\r\n}\r\nhtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"]::after {\r\n\tcontent: \"\" !important;\r\n\tposition: absolute !important; left: 0 !important; right: 0 !important; bottom: 0 !important;\r\n\theight: 2px !important; pointer-events: none !important;\r\n\tbackground: linear-gradient(90deg, transparent, rgba(98,182,242,0.85), transparent) !important;\r\n\tbackground-size: 40% 100% !important; background-repeat: no-repeat !important;\r\n\tanimation: kf-blueprint-sweep 6s linear infinite !important;\r\n}\r\n\r\n@keyframes kf-blueprint-pan {\r\n\t0%   { background-position: 0 0, 0 0, 0 0, 0 0, 0 0; }\r\n\t100% { background-position: 0 0, 120px 120px, 120px 120px, 24px 24px, 24px 24px; }\r\n}\r\n@keyframes kf-blueprint-breathe {\r\n\t0%, 100% { opacity: 0.78; filter: drop-shadow(0 0 5px rgba(98,182,242,0.28)); }\r\n\t50%      { opacity: 1; filter: drop-shadow(0 0 9px rgba(98,182,242,0.45)); }\r\n}\r\n@keyframes kf-blueprint-plot {\r\n\t0%   { background-position: 0 -100%, 14px 14px, 14px 14px, right 14px top 14px, right 14px top 14px, left 14px bottom 14px, left 14px bottom 14px, right 14px bottom 14px, right 14px bottom 14px; }\r\n\t8%   { opacity: 0.8; }\r\n\t92%  { opacity: 0.8; }\r\n\t100% { background-position: 0 200%, 14px 14px, 14px 14px, right 14px top 14px, right 14px top 14px, left 14px bottom 14px, left 14px bottom 14px, right 14px bottom 14px, right 14px bottom 14px; }\r\n}\r\n@keyframes kf-blueprint-pulse {\r\n\t0%, 100% { box-shadow: 0 0 8px rgba(98,182,242,0.24); }\r\n\t50%      { box-shadow: 0 0 16px rgba(98,182,242,0.5); }\r\n}\r\n@keyframes kf-blueprint-sweep {\r\n\t0%   { background-position: -40% 0; }\r\n\t100% { background-position: 140% 0; }\r\n}\r\n\r\n/* MOTION SAFETY：尊重 prefers-reduced-motion，停止全部动画 */\r\n@media (prefers-reduced-motion: reduce) {\r\n\thtml[data-xtcymc-exp=\"blueprint\"][data-xtcymc-exp-bg] * { animation: none !important; }\r\n}\r\n",
};

const SOLARPUNK: ExpTheme = {
	id: "solarpunk", name: "Solarpunk · 苔庭",
	tagline: "希望系生态植物园：暖亚麻奶油底、苔藓鼠尾草绿、赤陶红与蜂蜜金，柔软有机大圆角，摇曳藤叶与游移的阳光斑驳",
	icon: "ti ti-plant-2", scheme: "light",
	radius: "16px", margin: "16px", blur: "blur(4px)", modalBgFilter: "blur(4px)",
	palette: {
		"accent": "#5E8C5A",
		"accentedBg": "rgba(94,140,90,0.14)",
		"love": "#C76B49",
		"focus": "rgba(94,140,90,0.4)",
		"bg": "#F4F0E2",
		"fg": "#3D3A2E",
		"fgHighlighted": "#262318",
		"fgOnAccent": "#F7F4E8",
		"fgOnWhite": "#5E8C5A",
		"divider": "rgba(94,140,90,0.22)",
		"indicator": "#E0A33E",
		"panel": "#FBF8EE",
		"panelHighlight": "#F0EBD8",
		"panelHeaderBg": "#EFEAD6",
		"panelHeaderFg": "#3D3A2E",
		"panelBorder": "solid 1px rgba(94,140,90,0.3)",
		"windowHeader": "#FBF8EE",
		"popup": "#FBF8EE",
		"shadow": "rgba(94,120,70,0.16)",
		"header": "rgba(244,240,226,0.85)",
		"navBg": "#EFEAD6",
		"navFg": "#3D3A2E",
		"navActive": "#5E8C5A",
		"navIndicator": "#E0A33E",
		"pageHeaderBg": "#F4F0E2",
		"pageHeaderFg": "#3D3A2E",
		"link": "#C76B49",
		"hashtag": "#E0A33E",
		"mention": "#5E8C5A",
		"mentionMe": "#C76B49",
		"renote": "#7BA86F",
		"modalBg": "rgba(61,58,46,0.32)",
		"scrollbarHandle": "rgba(94,140,90,0.35)",
		"scrollbarHandleHover": "rgba(94,140,90,0.6)",
		"dateLabelFg": "#7A7355",
		"infoBg": "rgba(94,140,90,0.12)",
		"infoFg": "#4A6B45",
		"infoWarnBg": "rgba(224,163,62,0.16)",
		"infoWarnFg": "#9A6B17",
		"folderHeaderBg": "rgba(94,140,90,0.08)",
		"folderHeaderHoverBg": "rgba(94,140,90,0.14)",
		"buttonBg": "#F0EBD8",
		"buttonHoverBg": "#E6E0C8",
		"buttonGradateA": "#5E8C5A",
		"buttonGradateB": "#7BA86F",
		"switchBg": "rgba(94,140,90,0.2)",
		"switchOffBg": "rgba(61,58,46,0.18)",
		"switchOffFg": "#F7F4E8",
		"switchOnBg": "#5E8C5A",
		"switchOnFg": "#F7F4E8",
		"inputBorder": "rgba(94,140,90,0.3)",
		"inputBorderHover": "#5E8C5A",
		"badge": "#C76B49",
		"messageBg": "#FBF8EE",
		"success": "#5E8C5A",
		"error": "#C24E3A",
		"warn": "#E0A33E",
		"codeString": "#5E8C5A",
		"codeNumber": "#C76B49",
		"codeBoolean": "#E0A33E",
		"deckBg": "#ECE7D4",
		"htmlThemeColor": "#F4F0E2"
	},
	structural: "\nhtml[data-xtcymc-exp=\"solarpunk\"],\nhtml[data-xtcymc-exp=\"solarpunk\"] body,\nhtml[data-xtcymc-exp=\"solarpunk\"] button,\nhtml[data-xtcymc-exp=\"solarpunk\"] input,\nhtml[data-xtcymc-exp=\"solarpunk\"] textarea {\n\tfont-family: \"Nunito\",\"Quicksand\",\"Hiragino Maru Gothic ProN\",\"Rounded Mplus 1c\",\"PingFang SC\",\"Noto Sans CJK SC\",system-ui,sans-serif !important;\n\tfont-weight: 600 !important;\n\tletter-spacing: 0.005em !important;\n}\n/* 还原图标字体：scope 字体后特异性会盖过 tabler 的 .ti，必须显式恢复，否则图标变 □ */\nhtml[data-xtcymc-exp=\"solarpunk\"] .ti,\nhtml[data-xtcymc-exp=\"solarpunk\"] [class*=\"ti-\"],\nhtml[data-xtcymc-exp=\"solarpunk\"] i[class^=\"ti\"] { font-family: \"tabler-icons\" !important; font-weight: 400 !important; }\n/* 有机柔软的大圆角 */\nhtml[data-xtcymc-exp=\"solarpunk\"] * { border-radius: 16px !important; }\n/* 暖亚麻奶油纸底 + 极淡的苔点纹理（结构层不动画） */\nhtml[data-xtcymc-exp=\"solarpunk\"] body {\n\tbackground-color: #F4F0E2 !important;\n\tbackground-image:\n\t\tradial-gradient(ellipse at 18% 12%, rgba(94,140,90,0.08), transparent 42%),\n\t\tradial-gradient(ellipse at 84% 88%, rgba(224,163,62,0.08), transparent 44%),\n\t\tradial-gradient(rgba(94,140,90,0.05) 1.2px, transparent 1.4px) !important;\n\tbackground-size: 100% 100%, 100% 100%, 22px 22px !important;\n}\n/* 面板 = 柔白纸 + 苔绿发丝边 + 极柔阴影，像植物园里的小卡片 */\nhtml[data-xtcymc-exp=\"solarpunk\"] ._panel {\n\tbackground: #FBF8EE !important;\n\tborder: 1px solid rgba(94,140,90,0.3) !important;\n\tbox-shadow: 0 6px 22px rgba(94,120,70,0.12), inset 0 1px 0 rgba(255,255,255,0.6) !important;\n\tborder-radius: 16px !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"] ._shadow { box-shadow: 0 8px 26px rgba(94,120,70,0.14) !important; }\nhtml[data-xtcymc-exp=\"solarpunk\"] ._popup,\nhtml[data-xtcymc-exp=\"solarpunk\"] ._acrylic {\n\tbackground: #FBF8EE !important;\n\tborder: 1px solid rgba(94,140,90,0.3) !important;\n\tbox-shadow: 0 10px 30px rgba(94,120,70,0.16) !important;\n}\n/* 帖子卡片：柔白纸片 + 苔绿发丝边 + 左侧赤陶细茎 */\nhtml[data-xtcymc-exp=\"solarpunk\"] article {\n\tbackground: #FBF8EE !important;\n\tborder: 1px solid rgba(94,140,90,0.22) !important;\n\tborder-left: 3px solid rgba(199,107,73,0.55) !important;\n\tbox-shadow: 0 4px 16px rgba(94,120,70,0.08) !important;\n\tborder-radius: 16px !important;\n\tmargin: 0 0 8px !important;\n}\n/* 按钮：圆润叶绿填充、柔软投影，按下时轻压 */\nhtml[data-xtcymc-exp=\"solarpunk\"] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"solarpunk\"] ._buttonGradate {\n\tborder-radius: 999px !important;\n\tbox-shadow: 0 4px 14px rgba(94,140,90,0.32) !important;\n\tfont-weight: 800 !important;\n\tletter-spacing: 0.01em !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"] ._borderButton {\n\tborder-radius: 999px !important;\n\tborder: 1.5px solid rgba(94,140,90,0.5) !important;\n\tfont-weight: 700 !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"] ._buttonPrimary:active,\nhtml[data-xtcymc-exp=\"solarpunk\"] ._buttonGradate:active,\nhtml[data-xtcymc-exp=\"solarpunk\"] ._borderButton:active { transform: translateY(1px) scale(0.99) !important; }\n/* 输入框：柔软圆角 + 苔绿边，聚焦转鲜苔绿 */\nhtml[data-xtcymc-exp=\"solarpunk\"] input,\nhtml[data-xtcymc-exp=\"solarpunk\"] textarea {\n\tborder: 1.5px solid rgba(94,140,90,0.3) !important;\n\tborder-radius: 14px !important;\n\tbackground: #FBF8EE !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"] input:focus,\nhtml[data-xtcymc-exp=\"solarpunk\"] textarea:focus { border-color: #5E8C5A !important; }\n/* 标题：温暖人文衬线感的圆体，苔绿，亲切有机 */\nhtml[data-xtcymc-exp=\"solarpunk\"] h1,\nhtml[data-xtcymc-exp=\"solarpunk\"] h2,\nhtml[data-xtcymc-exp=\"solarpunk\"] h3 {\n\tfont-family: \"Fraunces\",\"Nunito\",\"Quicksand\",\"Rounded Mplus 1c\",\"Songti SC\",serif !important;\n\tfont-weight: 800 !important;\n\tcolor: #4A6B45 !important;\n\tletter-spacing: -0.005em !important;\n}\n/* 链接：赤陶红柔下划线 */\nhtml[data-xtcymc-exp=\"solarpunk\"] ._link {\n\tcolor: #C76B49 !important;\n\ttext-decoration: underline !important;\n\ttext-decoration-thickness: 1.5px !important;\n\ttext-underline-offset: 3px !important;\n\ttext-decoration-color: rgba(199,107,73,0.5) !important;\n}\n/* 头像：圆润 + 苔绿发丝边 + 柔软落影，像石庭里的圆叶 */\nhtml[data-xtcymc-exp=\"solarpunk\"] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"solarpunk\"] [class*=\"avatar\"] > img {\n\tborder: 1.5px solid rgba(94,140,90,0.4) !important;\n\tbox-shadow: 0 4px 12px rgba(94,120,70,0.18) !important;\n}\n/* 图片：柔和暖意，轻微提亮 */\nhtml[data-xtcymc-exp=\"solarpunk\"] img:not([class*=\"emoji\"]):not([class*=\"mfm\"]):not([class*=\"reaction\"]):not([class*=\"avatar\"]) {\n\tfilter: saturate(1.04) brightness(1.01) !important;\n}\n/* sticky 页眉：暖奶油纸实色 + 苔绿柔边，玻璃模糊保留一点点 */\nhtml[data-xtcymc-exp=\"solarpunk\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: rgba(244,240,226,0.92) !important;\n\tborder-bottom: 1px solid rgba(94,140,90,0.28) !important;\n\tbox-shadow: 0 4px 16px rgba(94,120,70,0.08) !important;\n}\n",
	aggressive: "html[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(244,240,226,0.42) !important;\n\t--MI_THEME-deckBg: rgba(236,231,212,0.4) !important;\n\t--MI_THEME-navBg: rgba(239,234,214,0.5) !important;\n\t--MI_THEME-pageHeaderBg: rgba(244,240,226,0.90) !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] body {\n\tbackground-color: #F4F0E2 !important;\n\tbackground-image:\n\t\tlinear-gradient(135deg, rgba(255,237,179,0.34) 0%, rgba(255,237,179,0) 30%),\n\t\tradial-gradient(ellipse 70% 50% at 8% 4%, rgba(224,163,62,0.30), transparent 60%),\n\t\tradial-gradient(ellipse 60% 55% at 96% 98%, rgba(123,168,111,0.26), transparent 62%),\n\t\tlinear-gradient(180deg, #F8F3E0 0%, #F4F0E2 52%, #EFEAD2 100%) !important;\n\tbackground-attachment: fixed !important;\n\tbackground-size: 200% 200%, 160% 160%, 160% 160%, 100% 100% !important;\n\tposition: relative !important;\n\tanimation: kf-solarpunk-dapple 30s ease-in-out infinite alternate !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tpointer-events: none !important;\n\tz-index: 0 !important;\n\tbackground:\n\t\tlinear-gradient(122deg, rgba(255,243,196,0.55) 0%, rgba(255,228,150,0.30) 14%, rgba(255,228,150,0) 40%),\n\t\tradial-gradient(ellipse 44% 64% at 0% 100%, rgba(94,140,90,0.34), transparent 60%),\n\t\tradial-gradient(ellipse 40% 58% at 100% 0%, rgba(123,168,111,0.30), transparent 60%),\n\t\tradial-gradient(ellipse 34% 52% at 100% 100%, rgba(94,140,90,0.24), transparent 62%),\n\t\tradial-gradient(ellipse 30% 48% at 0% 0%, rgba(123,168,111,0.22), transparent 62%) !important;\n\tfilter: blur(7px) !important;\n\ttransform-origin: 50% 100% !important;\n\twill-change: transform !important;\n\tanimation: kf-solarpunk-sway 11s ease-in-out infinite alternate !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tpointer-events: none !important;\n\tz-index: 9998 !important;\n\topacity: 0.62 !important;\n\tbackground-image:\n\t\tradial-gradient(circle at 12% 88%, rgba(224,163,62,0.85) 0 1.6px, transparent 2.2px),\n\t\tradial-gradient(circle at 32% 70%, rgba(247,244,232,0.9) 0 1.2px, transparent 1.8px),\n\t\tradial-gradient(circle at 54% 92%, rgba(123,168,111,0.8) 0 1.8px, transparent 2.4px),\n\t\tradial-gradient(circle at 72% 76%, rgba(224,163,62,0.78) 0 1.3px, transparent 1.9px),\n\t\tradial-gradient(circle at 88% 84%, rgba(247,244,232,0.85) 0 1.5px, transparent 2.1px),\n\t\tradial-gradient(circle at 46% 64%, rgba(224,163,62,0.7) 0 1.1px, transparent 1.7px) !important;\n\tbackground-size: 100% 130%, 100% 130%, 100% 130%, 100% 130%, 100% 130%, 100% 130% !important;\n\twill-change: background-position !important;\n\tanimation: kf-solarpunk-pollen 24s linear infinite !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._spacer::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\ttop: -10% !important;\n\tleft: -10% !important;\n\twidth: 70vw !important;\n\theight: 130vh !important;\n\tpointer-events: none !important;\n\tz-index: 0 !important;\n\tbackground:\n\t\tlinear-gradient(116deg, rgba(255,239,170,0) 0%, rgba(255,236,158,0.42) 30%, rgba(255,228,140,0.30) 46%, rgba(255,236,158,0) 64%) !important;\n\t-webkit-mask-image: linear-gradient(116deg, transparent 0%, #000 30%, #000 50%, transparent 70%) !important;\n\tmask-image: linear-gradient(116deg, transparent 0%, #000 30%, #000 50%, transparent 70%) !important;\n\tfilter: blur(2px) !important;\n\ttransform-origin: 0% 0% !important;\n\twill-change: opacity, transform !important;\n\tanimation: kf-solarpunk-sunbeam 16s ease-in-out infinite alternate !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._spacer::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tright: -6% !important;\n\ttop: -12% !important;\n\twidth: 38vw !important;\n\theight: 60vh !important;\n\tpointer-events: none !important;\n\tz-index: 0 !important;\n\tbackground:\n\t\tradial-gradient(ellipse 22% 40% at 70% 20%, rgba(94,140,90,0.40), transparent 62%),\n\t\tradial-gradient(ellipse 16% 30% at 84% 44%, rgba(123,168,111,0.34), transparent 64%),\n\t\tradial-gradient(ellipse 12% 24% at 60% 56%, rgba(94,140,90,0.28), transparent 66%) !important;\n\tfilter: blur(4px) !important;\n\ttransform-origin: 90% 10% !important;\n\twill-change: transform !important;\n\tanimation: kf-solarpunk-vine 14s ease-in-out infinite alternate !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._panel,\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] article {\n\tbackground: #FBF8EE !important;\n\ttransition: transform 0.5s cubic-bezier(0.22,1,0.36,1), box-shadow 0.5s ease !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: rgba(251,248,238,0.94) !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._panel:hover {\n\ttransform: translateY(-3px) scale(1.012) !important;\n\tbox-shadow: 0 16px 40px rgba(94,120,70,0.22), 0 0 0 1px rgba(94,140,90,0.4), inset 0 1px 0 rgba(255,255,255,0.7) !important;\n\tanimation: kf-solarpunk-bloom 0.6s cubic-bezier(0.22,1,0.36,1) !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] article:hover {\n\ttransform: translateX(2px) scale(1.004) !important;\n\tborder-left-color: rgba(199,107,73,0.85) !important;\n\tbox-shadow: -4px 0 0 rgba(199,107,73,0.25), 0 10px 28px rgba(94,120,70,0.14) !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._buttonGradate {\n\tanimation: kf-solarpunk-glow 4.2s ease-in-out infinite !important;\n\ttransition: transform 0.25s ease !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._buttonPrimary:hover,\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._buttonGradate:hover {\n\ttransform: translateY(-2px) scale(1.03) !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._borderButton {\n\ttransition: background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tbackground: rgba(94,140,90,0.14) !important;\n\tbox-shadow: 0 0 14px rgba(94,140,90,0.3) !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] ._link:hover {\n\ttext-shadow: 0 0 10px rgba(199,107,73,0.4) !important;\n\ttext-decoration-color: rgba(199,107,73,0.9) !important;\n\ttransition: text-shadow 0.25s ease, text-decoration-color 0.25s ease !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img {\n\ttransition: transform 0.4s cubic-bezier(0.22,1,0.36,1), box-shadow 0.4s ease !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] img[class*=\"avatar\"]:hover,\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img:hover {\n\ttransform: scale(1.06) rotate(-2deg) !important;\n\tbox-shadow: 0 6px 18px rgba(94,120,70,0.28) !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] h1,\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] h2 {\n\tanimation: kf-solarpunk-breathe 6s ease-in-out infinite !important;\n}\n\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tposition: relative !important;\n\tbackground: rgba(244,240,226,0.90) !important;\n}\nhtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"]::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important;\n\tleft: 0 !important; right: 0 !important; bottom: 0 !important;\n\theight: 2px !important;\n\tpointer-events: none !important;\n\tz-index: 4 !important;\n\tbackground: linear-gradient(90deg, transparent, rgba(94,140,90,0.7), rgba(224,163,62,0.7), transparent) !important;\n\tbackground-size: 50% 100% !important;\n\tbackground-repeat: no-repeat !important;\n\tanimation: kf-solarpunk-sweep 9s ease-in-out infinite !important;\n}\n\n@keyframes kf-solarpunk-dapple {\n\t0%   { background-position: 0% 0%, 0% 0%, 100% 100%, 0% 0%; }\n\t50%  { background-position: 30% 24%, 10% 12%, 88% 86%, 0% 50%; }\n\t100% { background-position: 60% 40%, 6% 18%, 94% 80%, 0% 100%; }\n}\n@keyframes kf-solarpunk-sway {\n\t0%   { transform: rotate(-1.4deg) translateY(0); }\n\t50%  { transform: rotate(0.8deg) translateY(-0.5%); }\n\t100% { transform: rotate(1.6deg) translateY(0); }\n}\n@keyframes kf-solarpunk-sunbeam {\n\t0%   { opacity: 0.55; transform: translateX(-4%) skewX(-3deg) scaleY(1); }\n\t50%  { opacity: 0.9; transform: translateX(2%) skewX(0deg) scaleY(1.04); }\n\t100% { opacity: 0.62; transform: translateX(6%) skewX(2deg) scaleY(1); }\n}\n@keyframes kf-solarpunk-vine {\n\t0%   { transform: rotate(-3deg) translateY(0); }\n\t50%  { transform: rotate(2deg) translateY(1.5%); }\n\t100% { transform: rotate(4deg) translateY(0); }\n}\n@keyframes kf-solarpunk-pollen {\n\t0%   { background-position: 0 0, 0 0, 0 0, 0 0, 0 0, 0 0; }\n\t100% { background-position: 6% -130%, -5% -130%, 4% -130%, -6% -130%, 5% -130%, -4% -130%; }\n}\n@keyframes kf-solarpunk-bloom {\n\t0%   { transform: translateY(-3px) scale(0.995); }\n\t60%  { transform: translateY(-3px) scale(1.02); }\n\t100% { transform: translateY(-3px) scale(1.012); }\n}\n@keyframes kf-solarpunk-glow {\n\t0%,100% { box-shadow: 0 4px 14px rgba(94,140,90,0.30), 0 0 0 rgba(224,163,62,0); }\n\t50%     { box-shadow: 0 6px 20px rgba(94,140,90,0.40), 0 0 16px rgba(224,163,62,0.35); }\n}\n@keyframes kf-solarpunk-breathe {\n\t0%,100% { text-shadow: 0 0 0 rgba(94,140,90,0); }\n\t50%     { text-shadow: 0 0 12px rgba(94,140,90,0.28); }\n}\n@keyframes kf-solarpunk-sweep {\n\t0%   { background-position: -60% 0; }\n\t100% { background-position: 160% 0; }\n}\n\n@media (prefers-reduced-motion: reduce){\n\thtml[data-xtcymc-exp=\"solarpunk\"][data-xtcymc-exp-bg] *{ animation: none !important; }\n}\n",
};

const DECO: ExpTheme = {
	id: "deco", name: "Deco · 鎏金",
	tagline: "1920年代装饰艺术：近黑底、鎏金描边与双线、阳光放射与人字纹、字距大写衬线标题；开启动效后页眉后缓转的金色阳光扇、面板与按钮的流金扫光",
	icon: "ti ti-diamond", scheme: "dark",
	radius: "0px", margin: "16px", blur: "blur(0px)", modalBgFilter: "blur(0px)",
	palette: {
		"accent": "#C8A24B",
		"accentedBg": "rgba(200,162,75,0.14)",
		"love": "#C46A5A",
		"focus": "rgba(200,162,75,0.5)",
		"bg": "#0E0E10",
		"fg": "#E6DCC4",
		"fgHighlighted": "#FBF3DD",
		"fgOnAccent": "#0E0E10",
		"fgOnWhite": "#C8A24B",
		"divider": "rgba(200,162,75,0.32)",
		"indicator": "#E6C674",
		"panel": "#141416",
		"panelHighlight": "#1C1C1F",
		"panelHeaderBg": "#0A0A0B",
		"panelHeaderFg": "#E6C674",
		"panelBorder": "solid 1px rgba(200,162,75,0.45)",
		"windowHeader": "#0A0A0B",
		"popup": "#141416",
		"shadow": "rgba(0,0,0,0.55)",
		"header": "rgba(10,10,11,0.88)",
		"navBg": "#0A0A0B",
		"navFg": "#D8CCB0",
		"navActive": "#E6C674",
		"navIndicator": "#C8A24B",
		"pageHeaderBg": "#0A0A0B",
		"pageHeaderFg": "#E6C674",
		"link": "#D9B45C",
		"hashtag": "#9FB08A",
		"mention": "#C8A24B",
		"mentionMe": "#E6C674",
		"renote": "#7FA88C",
		"modalBg": "rgba(6,6,7,0.72)",
		"scrollbarHandle": "rgba(200,162,75,0.32)",
		"scrollbarHandleHover": "rgba(230,198,116,0.55)",
		"dateLabelFg": "#B8A66E",
		"infoBg": "#14211C",
		"infoFg": "#A9C9B6",
		"infoWarnBg": "#2A2110",
		"infoWarnFg": "#E6C674",
		"folderHeaderBg": "rgba(200,162,75,0.08)",
		"folderHeaderHoverBg": "rgba(200,162,75,0.16)",
		"buttonBg": "#17171A",
		"buttonHoverBg": "#201F1B",
		"buttonGradateA": "#E6C674",
		"buttonGradateB": "#C8A24B",
		"switchBg": "rgba(200,162,75,0.25)",
		"switchOffBg": "rgba(200,162,75,0.14)",
		"switchOffFg": "#D8CCB0",
		"switchOnBg": "rgba(200,162,75,0.30)",
		"switchOnFg": "#E6C674",
		"inputBorder": "rgba(200,162,75,0.32)",
		"inputBorderHover": "rgba(230,198,116,0.6)",
		"badge": "#C8A24B",
		"messageBg": "#0E0E10",
		"success": "#7FA88C",
		"error": "#C46A5A",
		"warn": "#E6C674",
		"codeString": "#E6C674",
		"codeNumber": "#9FB08A",
		"codeBoolean": "#D9B45C",
		"deckBg": "#08080A",
		"htmlThemeColor": "#0E0E10"
	},
	structural: "\nhtml[data-xtcymc-exp=\"deco\"],\nhtml[data-xtcymc-exp=\"deco\"] body,\nhtml[data-xtcymc-exp=\"deco\"] button,\nhtml[data-xtcymc-exp=\"deco\"] input,\nhtml[data-xtcymc-exp=\"deco\"] textarea {\n\tfont-family: \"Cormorant Garamond\",\"Playfair Display\",\"Didot\",\"Bodoni MT\",\"Songti SC\",\"Noto Serif CJK SC\",\"Source Han Serif SC\",Georgia,serif !important;\n}\n/* 还原图标字体：字体作用域已限定到 html,body,button,input,textarea，但显式恢复 .ti 防止图标变 □ */\nhtml[data-xtcymc-exp=\"deco\"] .ti,\nhtml[data-xtcymc-exp=\"deco\"] [class*=\"ti-\"],\nhtml[data-xtcymc-exp=\"deco\"] i[class^=\"ti\"] { font-family: \"tabler-icons\" !important; }\nhtml[data-xtcymc-exp=\"deco\"] * { border-radius: 0 !important; }\nhtml[data-xtcymc-exp=\"deco\"] body {\n\tbackground-color: #0E0E10 !important;\n\tbackground-image:\n\t\tradial-gradient(ellipse 70% 38% at 50% -6%, rgba(20,46,38,0.55), transparent 60%),\n\t\tradial-gradient(ellipse 90% 60% at 50% 50%, transparent 60%, rgba(0,0,0,0.5) 100%) !important;\n\tbackground-attachment: fixed !important;\n}\nhtml[data-xtcymc-exp=\"deco\"] ._panel {\n\tbackground: #141416 !important;\n\tborder: 1px solid rgba(200,162,75,0.45) !important;\n\tbox-shadow: inset 0 0 0 3px #141416, inset 0 0 0 4px rgba(200,162,75,0.30), 0 6px 24px rgba(0,0,0,0.55) !important;\n}\nhtml[data-xtcymc-exp=\"deco\"] ._popup,\nhtml[data-xtcymc-exp=\"deco\"] ._acrylic {\n\tbackground: #141416 !important;\n\tborder: 1px solid rgba(200,162,75,0.5) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n}\nhtml[data-xtcymc-exp=\"deco\"] ._shadow { box-shadow: 0 8px 28px rgba(0,0,0,0.6), 0 0 0 1px rgba(200,162,75,0.18) !important; }\nhtml[data-xtcymc-exp=\"deco\"] article {\n\tborder-bottom: 1px solid transparent !important;\n\tborder-image: repeating-linear-gradient(135deg, rgba(200,162,75,0.55) 0 6px, transparent 6px 12px) 1 !important;\n}\nhtml[data-xtcymc-exp=\"deco\"] h1,\nhtml[data-xtcymc-exp=\"deco\"] h2,\nhtml[data-xtcymc-exp=\"deco\"] h3 {\n\tfont-family: \"Playfair Display\",\"Cormorant Garamond\",\"Didot\",\"Songti SC\",Georgia,serif !important;\n\tcolor: #E6C674 !important;\n\ttext-transform: uppercase !important;\n\tletter-spacing: 0.16em !important;\n\tfont-weight: 700 !important;\n}\nhtml[data-xtcymc-exp=\"deco\"] ._link {\n\tcolor: #D9B45C !important;\n\ttext-decoration: underline !important;\n\ttext-underline-offset: 3px !important;\n\ttext-decoration-thickness: 1px !important;\n\ttext-decoration-color: rgba(200,162,75,0.6) !important;\n}\nhtml[data-xtcymc-exp=\"deco\"] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"deco\"] ._buttonGradate {\n\tbackground: linear-gradient(180deg, #E6C674, #C8A24B) !important;\n\tcolor: #0E0E10 !important;\n\tborder: 1px solid rgba(230,198,116,0.7) !important;\n\ttext-transform: uppercase !important;\n\tletter-spacing: 0.08em !important;\n\tfont-weight: 700 !important;\n}\nhtml[data-xtcymc-exp=\"deco\"] ._borderButton {\n\tborder: 1px solid rgba(200,162,75,0.55) !important;\n\tcolor: #E6C674 !important;\n\ttext-transform: uppercase !important;\n\tletter-spacing: 0.1em !important;\n\tbox-shadow: inset 0 0 0 2px rgba(200,162,75,0.12) !important;\n}\nhtml[data-xtcymc-exp=\"deco\"] input,\nhtml[data-xtcymc-exp=\"deco\"] textarea {\n\tbackground: #0A0A0B !important;\n\tborder: 1px solid rgba(200,162,75,0.32) !important;\n\tcolor: #E6DCC4 !important; caret-color: #E6C674 !important;\n}\nhtml[data-xtcymc-exp=\"deco\"] input::placeholder,\nhtml[data-xtcymc-exp=\"deco\"] textarea::placeholder { color: rgba(184,166,110,0.5) !important; }\nhtml[data-xtcymc-exp=\"deco\"] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"deco\"] [class*=\"avatar\"] > img { box-shadow: 0 0 0 1px rgba(200,162,75,0.6) !important; }\nhtml[data-xtcymc-exp=\"deco\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: #0A0A0B !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tborder-bottom: 1px solid rgba(200,162,75,0.7) !important;\n\tbox-shadow: 0 3px 0 -1px rgba(200,162,75,0.35), 0 4px 16px rgba(0,0,0,0.5) !important;\n}\n",
	aggressive: "\n/* ── DECO · 鎏金 — aggressive：近黑底鎏金旭日扇 + V 形雪佛龙边纹 + 放射金线 + 面板/按钮流金扫光 + 金尘微闪 ── */\n/* 重声明半透明表面：最大揭示面 bg/deckBg 低 alpha 让旭日扇透出；nav/pageHeader 保持可读 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(14,14,16,0.5) !important;\n\t--MI_THEME-deckBg: rgba(8,8,10,0.46) !important;\n\t--MI_THEME-navBg: rgba(10,10,11,0.6) !important;\n\t--MI_THEME-pageHeaderBg: rgba(10,10,11,0.90) !important;\n\t--MI_THEME-panel: rgba(20,20,22,0.92) !important;\n\t--MI_THEME-popup: rgba(20,20,22,0.95) !important;\n}\n/* body：固定铺满视口的近黑夜色 + 中央暖金辉光，作为定位上下文与底层 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] body {\n\tbackground-color: #0A0A0B !important;\n\tbackground-image:\n\t\tradial-gradient(ellipse 80% 55% at 50% 50%, rgba(200,162,75,0.10) 0%, rgba(10,10,11,0) 60%),\n\t\tradial-gradient(ellipse 120% 80% at 50% 120%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 55%),\n\t\tlinear-gradient(180deg, #0E0E10 0%, #0A0A0B 60%, #060607 100%) !important;\n\tbackground-attachment: fixed !important;\n\tbackground-repeat: no-repeat !important;\n\tposition: relative !important;\n}\n/* body::before — 常驻背景层①：对称旭日扇形（金色放射扇叶）缓慢自转，固定铺满视口 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\ttop: 50% !important; left: 50% !important;\n\twidth: 150vmax !important; height: 150vmax !important;\n\tmargin-top: -75vmax !important; margin-left: -75vmax !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground:\n\t\tconic-gradient(from 0deg at 50% 50%,\n\t\t\trgba(200,162,75,0.0) 0deg, rgba(230,198,116,0.20) 3deg, rgba(200,162,75,0.0) 6deg,\n\t\t\trgba(200,162,75,0.0) 9deg, rgba(200,162,75,0.13) 12deg, rgba(200,162,75,0.0) 15deg,\n\t\t\trgba(200,162,75,0.0) 18deg, rgba(230,198,116,0.20) 21deg, rgba(200,162,75,0.0) 24deg,\n\t\t\trgba(200,162,75,0.0) 27deg, rgba(200,162,75,0.13) 30deg, rgba(200,162,75,0.0) 33deg,\n\t\t\trgba(200,162,75,0.0) 36deg, rgba(230,198,116,0.20) 39deg, rgba(200,162,75,0.0) 42deg,\n\t\t\trgba(200,162,75,0.0) 45deg, rgba(200,162,75,0.13) 48deg, rgba(200,162,75,0.0) 51deg,\n\t\t\trgba(200,162,75,0.0) 54deg, rgba(230,198,116,0.20) 57deg, rgba(200,162,75,0.0) 60deg,\n\t\t\trgba(200,162,75,0.0) 63deg, rgba(200,162,75,0.13) 66deg, rgba(200,162,75,0.0) 69deg,\n\t\t\trgba(200,162,75,0.0) 72deg, rgba(230,198,116,0.20) 75deg, rgba(200,162,75,0.0) 78deg,\n\t\t\trgba(200,162,75,0.0) 81deg, rgba(200,162,75,0.13) 84deg, rgba(200,162,75,0.0) 87deg,\n\t\t\trgba(200,162,75,0.0) 90deg, rgba(230,198,116,0.20) 93deg, rgba(200,162,75,0.0) 96deg,\n\t\t\trgba(200,162,75,0.0) 99deg, rgba(200,162,75,0.13) 102deg, rgba(200,162,75,0.0) 105deg,\n\t\t\trgba(200,162,75,0.0) 108deg, rgba(230,198,116,0.20) 111deg, rgba(200,162,75,0.0) 114deg,\n\t\t\trgba(200,162,75,0.0) 117deg, rgba(200,162,75,0.13) 120deg, rgba(200,162,75,0.0) 123deg,\n\t\t\trgba(200,162,75,0.0) 126deg, rgba(230,198,116,0.20) 129deg, rgba(200,162,75,0.0) 132deg,\n\t\t\trgba(200,162,75,0.0) 135deg, rgba(200,162,75,0.13) 138deg, rgba(200,162,75,0.0) 141deg,\n\t\t\trgba(200,162,75,0.0) 144deg, rgba(230,198,116,0.20) 147deg, rgba(200,162,75,0.0) 150deg,\n\t\t\trgba(200,162,75,0.0) 153deg, rgba(200,162,75,0.13) 156deg, rgba(200,162,75,0.0) 159deg,\n\t\t\trgba(200,162,75,0.0) 162deg, rgba(230,198,116,0.20) 165deg, rgba(200,162,75,0.0) 168deg,\n\t\t\trgba(200,162,75,0.0) 171deg, rgba(200,162,75,0.13) 174deg, rgba(200,162,75,0.0) 177deg,\n\t\t\trgba(200,162,75,0.0) 180deg, rgba(230,198,116,0.20) 183deg, rgba(200,162,75,0.0) 186deg,\n\t\t\trgba(200,162,75,0.0) 189deg, rgba(200,162,75,0.13) 192deg, rgba(200,162,75,0.0) 195deg,\n\t\t\trgba(200,162,75,0.0) 198deg, rgba(230,198,116,0.20) 201deg, rgba(200,162,75,0.0) 204deg,\n\t\t\trgba(200,162,75,0.0) 207deg, rgba(200,162,75,0.13) 210deg, rgba(200,162,75,0.0) 213deg,\n\t\t\trgba(200,162,75,0.0) 216deg, rgba(230,198,116,0.20) 219deg, rgba(200,162,75,0.0) 222deg,\n\t\t\trgba(200,162,75,0.0) 225deg, rgba(200,162,75,0.13) 228deg, rgba(200,162,75,0.0) 231deg,\n\t\t\trgba(200,162,75,0.0) 234deg, rgba(230,198,116,0.20) 237deg, rgba(200,162,75,0.0) 240deg,\n\t\t\trgba(200,162,75,0.0) 243deg, rgba(200,162,75,0.13) 246deg, rgba(200,162,75,0.0) 249deg,\n\t\t\trgba(200,162,75,0.0) 252deg, rgba(230,198,116,0.20) 255deg, rgba(200,162,75,0.0) 258deg,\n\t\t\trgba(200,162,75,0.0) 261deg, rgba(200,162,75,0.13) 264deg, rgba(200,162,75,0.0) 267deg,\n\t\t\trgba(200,162,75,0.0) 270deg, rgba(230,198,116,0.20) 273deg, rgba(200,162,75,0.0) 276deg,\n\t\t\trgba(200,162,75,0.0) 279deg, rgba(200,162,75,0.13) 282deg, rgba(200,162,75,0.0) 285deg,\n\t\t\trgba(200,162,75,0.0) 288deg, rgba(230,198,116,0.20) 291deg, rgba(200,162,75,0.0) 294deg,\n\t\t\trgba(200,162,75,0.0) 297deg, rgba(200,162,75,0.13) 300deg, rgba(200,162,75,0.0) 303deg,\n\t\t\trgba(200,162,75,0.0) 306deg, rgba(230,198,116,0.20) 309deg, rgba(200,162,75,0.0) 312deg,\n\t\t\trgba(200,162,75,0.0) 315deg, rgba(200,162,75,0.13) 318deg, rgba(200,162,75,0.0) 321deg,\n\t\t\trgba(200,162,75,0.0) 324deg, rgba(230,198,116,0.20) 327deg, rgba(200,162,75,0.0) 330deg,\n\t\t\trgba(200,162,75,0.0) 333deg, rgba(200,162,75,0.13) 336deg, rgba(200,162,75,0.0) 339deg,\n\t\t\trgba(200,162,75,0.0) 342deg, rgba(230,198,116,0.20) 345deg, rgba(200,162,75,0.0) 348deg,\n\t\t\trgba(200,162,75,0.0) 351deg, rgba(200,162,75,0.13) 354deg, rgba(200,162,75,0.0) 357deg,\n\t\t\trgba(200,162,75,0.0) 360deg) !important;\n\t-webkit-mask-image: radial-gradient(circle at 50% 50%, #000 0%, rgba(0,0,0,0.85) 28%, rgba(0,0,0,0.35) 50%, transparent 70%) !important;\n\tmask-image: radial-gradient(circle at 50% 50%, #000 0%, rgba(0,0,0,0.85) 28%, rgba(0,0,0,0.35) 50%, transparent 70%) !important;\n\topacity: 0.85 !important;\n\twill-change: transform !important;\n\tanimation: kf-deco-sunburst 90s linear infinite !important;\n}\n/* body::after — 常驻背景层②：装饰艺术 V 形雪佛龙边纹 + 同心放射金环，固定铺满、缓慢呼吸 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground-image:\n\t\trepeating-linear-gradient(45deg, rgba(200,162,75,0.07) 0 2px, transparent 2px 26px),\n\t\trepeating-linear-gradient(-45deg, rgba(200,162,75,0.07) 0 2px, transparent 2px 26px),\n\t\tradial-gradient(circle at 50% 50%, transparent 0 34vmax, rgba(200,162,75,0.10) 34vmax 34.3vmax, transparent 34.3vmax 46vmax),\n\t\tradial-gradient(circle at 50% 50%, transparent 0 46vmax, rgba(230,198,116,0.08) 46vmax 46.3vmax, transparent 46.3vmax) !important;\n\tbackground-size: 100% 100%, 100% 100%, 100% 100%, 100% 100% !important;\n\tbackground-position: center center !important;\n\t-webkit-mask-image: radial-gradient(ellipse 100% 100% at 50% 50%, transparent 0%, rgba(0,0,0,0.7) 55%, #000 100%) !important;\n\tmask-image: radial-gradient(ellipse 100% 100% at 50% 50%, transparent 0%, rgba(0,0,0,0.7) 55%, #000 100%) !important;\n\topacity: 0.8 !important;\n\twill-change: opacity !important;\n\tanimation: kf-deco-chevron 14s ease-in-out infinite !important;\n}\n/* 金尘微闪叠层：置顶但极薄、不挡点击，零散金点缓慢漂移闪烁 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._spacer::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 9998 !important;\n\tbackground-image:\n\t\tradial-gradient(circle at 12% 22%, rgba(230,198,116,0.5) 0 1px, transparent 2px),\n\t\tradial-gradient(circle at 78% 16%, rgba(200,162,75,0.45) 0 1px, transparent 2px),\n\t\tradial-gradient(circle at 34% 72%, rgba(230,198,116,0.4) 0 1px, transparent 2px),\n\t\tradial-gradient(circle at 88% 64%, rgba(200,162,75,0.5) 0 1px, transparent 2px),\n\t\tradial-gradient(circle at 56% 40%, rgba(230,198,116,0.4) 0 1px, transparent 2px),\n\t\tradial-gradient(circle at 22% 90%, rgba(200,162,75,0.4) 0 1px, transparent 2px) !important;\n\tbackground-size: 100% 100% !important;\n\topacity: 0.5 !important;\n\tanimation: kf-deco-gleam 9s ease-in-out infinite !important;\n}\n/* sticky 页眉：底部金色双线流光脉冲，相对定位承载扫光 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tposition: relative !important;\n\toverflow: hidden !important;\n\tanimation: kf-deco-rule 5s ease-in-out infinite !important;\n}\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"]::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important; left: 0 !important; right: 0 !important; bottom: 0 !important;\n\theight: 2px !important; pointer-events: none !important; z-index: 4 !important;\n\tbackground: linear-gradient(90deg, transparent, rgba(230,198,116,0.9), transparent) !important;\n\tbackground-size: 45% 100% !important; background-repeat: no-repeat !important;\n\tanimation: kf-deco-sweep 7s linear infinite !important;\n}\n/* 面板：保持可读实色底（>=.92），叠加斜向流金扫光；正文坐在不透明卡片上 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: rgba(20,20,22,0.94) !important;\n\tposition: relative !important;\n\ttransition: box-shadow 0.3s ease, transform 0.3s ease !important;\n}\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] article {\n\tposition: relative !important;\n\ttransition: box-shadow 0.3s ease, transform 0.3s ease !important;\n}\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: rgba(20,20,22,0.96) !important;\n}\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._panel::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 1 !important;\n\tbackground: linear-gradient(115deg, transparent 38%, rgba(230,198,116,0.22) 48%, rgba(230,198,116,0.0) 60%) !important;\n\tbackground-size: 280% 280% !important;\n\tanimation: kf-deco-shimmer 9s ease-in-out infinite !important;\n}\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._panel:hover {\n\tbox-shadow: inset 0 0 0 3px #141416, inset 0 0 0 4px rgba(230,198,116,0.6), 0 10px 32px rgba(0,0,0,0.65), 0 0 22px rgba(200,162,75,0.22) !important;\n\ttransform: translateY(-2px) !important;\n}\n/* 帖子：悬停时金色人字纹分隔线加亮 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] article:hover {\n\tborder-image: repeating-linear-gradient(135deg, rgba(230,198,116,0.85) 0 6px, transparent 6px 12px) 1 !important;\n}\n/* 标题：金色文字缓慢辉光呼吸 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] h1,\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] h2,\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] h3 {\n\tanimation: kf-deco-titleglow 6s ease-in-out infinite !important;\n}\n/* 金色填充按钮：流金扫光 + 缓慢光晕呼吸 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._buttonGradate {\n\tbackground: linear-gradient(115deg, #C8A24B 0%, #E6C674 42%, #FBF3DD 50%, #E6C674 58%, #C8A24B 100%) !important;\n\tbackground-size: 220% 100% !important;\n\tcolor: #0E0E10 !important;\n\tanimation: kf-deco-flow 6s linear infinite, kf-deco-btnglow 4s ease-in-out infinite !important;\n\ttransition: transform 0.2s ease !important;\n}\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._buttonPrimary:hover,\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._buttonGradate:hover {\n\ttransform: translateY(-1px) !important;\n\tfilter: brightness(1.08) !important;\n}\n/* 描边按钮：悬停金边辉光 + 内层暖光 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._borderButton {\n\ttransition: box-shadow 0.25s ease, color 0.25s ease !important;\n}\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tbox-shadow: 0 0 14px rgba(200,162,75,0.5), inset 0 0 10px rgba(200,162,75,0.18), inset 0 0 0 2px rgba(230,198,116,0.4) !important;\n\tcolor: #FBF3DD !important;\n}\n/* 链接：悬停鎏金辉光 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._link:hover {\n\ttext-shadow: 0 0 8px rgba(230,198,116,0.6), 0 0 16px rgba(200,162,75,0.35) !important;\n\ttext-decoration-color: rgba(230,198,116,0.9) !important;\n\ttransition: text-shadow 0.2s ease !important;\n}\n/* 徽标/计数：金色脉冲 */\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._indicateCounter,\nhtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] ._indicatorCircle {\n\tanimation: kf-deco-btnglow 3s ease-in-out infinite !important;\n}\n\n@keyframes kf-deco-sunburst {\n\t0%   { transform: rotate(0deg); }\n\t100% { transform: rotate(360deg); }\n}\n@keyframes kf-deco-chevron {\n\t0%, 100% { opacity: 0.6; }\n\t50%      { opacity: 0.9; }\n}\n@keyframes kf-deco-gleam {\n\t0%, 100% { opacity: 0.35; transform: translateY(0); }\n\t50%      { opacity: 0.6; transform: translateY(-4px); }\n}\n@keyframes kf-deco-rule {\n\t0%, 100% { box-shadow: 0 3px 0 -1px rgba(200,162,75,0.3), 0 4px 16px rgba(0,0,0,0.5); }\n\t50%      { box-shadow: 0 3px 0 -1px rgba(230,198,116,0.55), 0 4px 20px rgba(200,162,75,0.25); }\n}\n@keyframes kf-deco-sweep {\n\t0%   { background-position: -45% 0; }\n\t100% { background-position: 145% 0; }\n}\n@keyframes kf-deco-shimmer {\n\t0%   { background-position: 160% 160%; }\n\t55%  { background-position: -60% -60%; }\n\t100% { background-position: -60% -60%; }\n}\n@keyframes kf-deco-titleglow {\n\t0%, 100% { text-shadow: 0 0 4px rgba(200,162,75,0.3); }\n\t50%      { text-shadow: 0 0 10px rgba(230,198,116,0.6), 0 0 20px rgba(200,162,75,0.3); }\n}\n@keyframes kf-deco-flow {\n\t0%   { background-position: 0% 0; }\n\t100% { background-position: 220% 0; }\n}\n@keyframes kf-deco-btnglow {\n\t0%, 100% { box-shadow: 0 0 10px rgba(200,162,75,0.4); }\n\t50%      { box-shadow: 0 0 18px rgba(230,198,116,0.6), 0 0 28px rgba(200,162,75,0.35); }\n}\n\n/* MOTION SAFETY：尊重 prefers-reduced-motion */\n@media (prefers-reduced-motion: reduce){\n\thtml[data-xtcymc-exp=\"deco\"][data-xtcymc-exp-bg] *{ animation: none !important; }\n}\n",
};

const STEAM: ExpTheme = {
	id: "steam", name: "Steam · 黄铜",
	tagline: "蒸汽朋克维多利亚：陈年羊皮纸底、黄铜/紫铜描边与铆钉、氧化青链接、缓转齿轮、黄铜流光扫掠与升腾蒸汽",
	icon: "ti ti-settings", scheme: "light",
	radius: "4px", margin: "16px", blur: "blur(2px)", modalBgFilter: "blur(2px)",
	palette: {
		"accent": "#B0793A",
		"accentedBg": "rgba(176,121,58,0.14)",
		"love": "#B5462F",
		"focus": "rgba(176,121,58,0.4)",
		"bg": "#E9DCC0",
		"fg": "#3A2E1E",
		"fgHighlighted": "#241B0F",
		"fgOnAccent": "#F5ECD8",
		"fgOnWhite": "#B0793A",
		"divider": "rgba(58,46,30,0.25)",
		"indicator": "#B0793A",
		"panel": "#F1E6CC",
		"panelHighlight": "#E5D6B4",
		"panelHeaderBg": "#3A2E1E",
		"panelHeaderFg": "#E9DCC0",
		"panelBorder": "solid 2px #B0793A",
		"windowHeader": "#F1E6CC",
		"popup": "#F1E6CC",
		"shadow": "rgba(58,46,30,0.25)",
		"header": "rgba(233,220,192,0.9)",
		"navBg": "#E3D4B2",
		"navFg": "#3A2E1E",
		"navActive": "#B0793A",
		"navIndicator": "#B0793A",
		"pageHeaderBg": "#E9DCC0",
		"pageHeaderFg": "#3A2E1E",
		"link": "#3E7B74",
		"hashtag": "#8A6A2E",
		"mention": "#B0793A",
		"mentionMe": "#B5462F",
		"renote": "#3E7B74",
		"modalBg": "rgba(36,27,15,0.5)",
		"scrollbarHandle": "rgba(58,46,30,0.3)",
		"scrollbarHandleHover": "rgba(58,46,30,0.5)",
		"dateLabelFg": "#3A2E1E",
		"infoBg": "#DCEAE6",
		"infoFg": "#2E5A54",
		"infoWarnBg": "#F0DDB0",
		"infoWarnFg": "#7A5311",
		"folderHeaderBg": "rgba(58,46,30,0.06)",
		"folderHeaderHoverBg": "rgba(176,121,58,0.18)",
		"buttonBg": "#E5D6B4",
		"buttonHoverBg": "#D8C49A",
		"buttonGradateA": "#B0793A",
		"buttonGradateB": "#8A5E2A",
		"switchBg": "rgba(58,46,30,0.2)",
		"switchOffBg": "rgba(58,46,30,0.18)",
		"switchOffFg": "#F5ECD8",
		"switchOnBg": "#B0793A",
		"switchOnFg": "#F5ECD8",
		"inputBorder": "rgba(58,46,30,0.3)",
		"inputBorderHover": "rgba(176,121,58,0.6)",
		"badge": "#B0793A",
		"messageBg": "#E9DCC0",
		"success": "#3E7B74",
		"error": "#B5462F",
		"warn": "#B0793A",
		"codeString": "#B5462F",
		"codeNumber": "#3E7B74",
		"codeBoolean": "#8A6A2E",
		"deckBg": "#E3D4B2",
		"htmlThemeColor": "#E9DCC0"
	},
	structural: "\nhtml[data-xtcymc-exp=\"steam\"],\nhtml[data-xtcymc-exp=\"steam\"] body,\nhtml[data-xtcymc-exp=\"steam\"] button,\nhtml[data-xtcymc-exp=\"steam\"] input,\nhtml[data-xtcymc-exp=\"steam\"] textarea {\n\tfont-family: \"Cormorant Garamond\",\"EB Garamond\",\"Playfair Display\",Georgia,\"Times New Roman\",\"Songti SC\",\"Noto Serif CJK SC\",\"FangSong\",serif !important;\n}\n/* 还原图标字体：把字体设到 body/button 等元素仍可能波及图标继承，显式恢复以免侧栏/标签图标变 □ */\nhtml[data-xtcymc-exp=\"steam\"] .ti,\nhtml[data-xtcymc-exp=\"steam\"] [class*=\"ti-\"],\nhtml[data-xtcymc-exp=\"steam\"] i[class^=\"ti\"] { font-family: \"tabler-icons\" !important; }\nhtml[data-xtcymc-exp=\"steam\"] { font-size: 15px !important; }\nhtml[data-xtcymc-exp=\"steam\"] * { border-radius: 4px !important; }\n/* 陈年羊皮纸底：暖沙底 + 极淡的纤维纹理与边缘暗角 */\nhtml[data-xtcymc-exp=\"steam\"] body {\n\tbackground-color: #E9DCC0 !important;\n\tbackground-image:\n\t\tradial-gradient(ellipse at 50% 50%, transparent 62%, rgba(106,74,38,0.10) 100%),\n\t\tradial-gradient(rgba(106,74,38,0.04) 0.5px, transparent 0.6px),\n\t\tlinear-gradient(120deg, rgba(176,121,58,0.05), transparent 45%) !important;\n\tbackground-size: 100% 100%, 5px 5px, 100% 100% !important;\n\tbackground-attachment: fixed !important;\n}\n/* 面板 = 羊皮纸 + 2px 黄铜边 + 柔和 sepia 投影 */\nhtml[data-xtcymc-exp=\"steam\"] ._panel {\n\tbackground: #F2E7CD !important;\n\tborder: 2px solid #B0793A !important;\n\tbox-shadow: 0 3px 10px rgba(74,52,26,0.22), inset 0 0 0 1px rgba(251,243,223,0.5) !important;\n}\nhtml[data-xtcymc-exp=\"steam\"] ._popup,\nhtml[data-xtcymc-exp=\"steam\"] ._acrylic {\n\tbackground: #F2E7CD !important;\n\tborder: 2px solid #B0793A !important;\n\tbox-shadow: 0 4px 14px rgba(74,52,26,0.28) !important;\n}\nhtml[data-xtcymc-exp=\"steam\"] ._shadow { box-shadow: 0 3px 10px rgba(74,52,26,0.22) !important; }\n/* 帖子分隔：氧化铜色细线，宛如老机件接缝 */\nhtml[data-xtcymc-exp=\"steam\"] article { border-bottom: 1px solid rgba(106,74,38,0.28) !important; }\n/* 标题：华丽衬线、小字距，墨棕色 */\nhtml[data-xtcymc-exp=\"steam\"] h1,\nhtml[data-xtcymc-exp=\"steam\"] h2,\nhtml[data-xtcymc-exp=\"steam\"] h3 {\n\tfont-family: \"Playfair Display\",\"Cormorant Garamond\",Georgia,\"Songti SC\",serif !important;\n\tfont-weight: 700 !important; letter-spacing: 0.01em !important; color: #3A2E1E !important;\n\ttext-shadow: 0 1px 0 rgba(251,243,223,0.7) !important;\n}\n/* 链接：氧化青、细下划线 */\nhtml[data-xtcymc-exp=\"steam\"] ._link {\n\tcolor: #3E7B74 !important; text-decoration: underline !important; text-underline-offset: 2px !important; text-decoration-thickness: 1px !important;\n}\n/* 黄铜按钮：斜面立体感（上亮下暗渐变 + 内高光 + 黄铜外框） */\nhtml[data-xtcymc-exp=\"steam\"] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"steam\"] ._buttonGradate {\n\tbackground: linear-gradient(180deg, #D8A05A, #B0793A 55%, #8A5A24) !important;\n\tcolor: #FBF3DF !important;\n\tborder: 1px solid #6A4A26 !important;\n\tbox-shadow: inset 0 1px 0 rgba(255,240,210,0.6), inset 0 -2px 3px rgba(74,52,26,0.4), 0 2px 4px rgba(74,52,26,0.3) !important;\n\ttext-shadow: 0 1px 1px rgba(74,52,26,0.5) !important;\n\tfont-weight: 600 !important;\n}\n/* 描边按钮：黄铜双线边、字距、墨棕字 */\nhtml[data-xtcymc-exp=\"steam\"] ._borderButton {\n\tborder: 2px solid #B0793A !important;\n\tbox-shadow: inset 0 0 0 1px rgba(251,243,223,0.5) !important;\n\tcolor: #6A4A26 !important; letter-spacing: 0.03em !important;\n\tbackground: #E6D6B2 !important;\n}\n/* 输入框：羊皮纸凹陷感 + 黄铜边 */\nhtml[data-xtcymc-exp=\"steam\"] input,\nhtml[data-xtcymc-exp=\"steam\"] textarea {\n\tbackground: #F5ECD6 !important;\n\tborder: 1px solid rgba(106,74,38,0.4) !important;\n\tbox-shadow: inset 0 1px 3px rgba(74,52,26,0.18) !important;\n\tcolor: #3A2E1E !important; caret-color: #B0793A !important;\n}\nhtml[data-xtcymc-exp=\"steam\"] input::placeholder,\nhtml[data-xtcymc-exp=\"steam\"] textarea::placeholder { color: rgba(106,74,38,0.5) !important; }\n/* 照片：暖棕调旧照感（排除表情/反应/头像不去色） */\nhtml[data-xtcymc-exp=\"steam\"] img:not([class*=\"emoji\"]):not([class*=\"mfm\"]):not([class*=\"reaction\"]):not([class*=\"avatar\"]) {\n\tfilter: sepia(0.28) contrast(1.03) saturate(0.92) !important;\n}\n/* 头像：黄铜圆框，像怀表盖 */\nhtml[data-xtcymc-exp=\"steam\"] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"steam\"] [class*=\"avatar\"] > img {\n\tborder: 2px solid #B0793A !important; box-shadow: 0 0 0 1px rgba(74,52,26,0.4), 0 2px 5px rgba(74,52,26,0.3) !important;\n}\n/* sticky 页眉：羊皮纸 + 底部黄铜横线 + 上沿铆钉点 */\nhtml[data-xtcymc-exp=\"steam\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: #E6D6B2 !important;\n\t-webkit-backdrop-filter: blur(2px) !important; backdrop-filter: blur(2px) !important;\n\tborder-bottom: 2px solid #B0793A !important;\n\tbox-shadow: 0 2px 8px rgba(74,52,26,0.22) !important;\n\tbackground-image: radial-gradient(circle at 10px 50%, rgba(74,52,26,0.55) 0 1.5px, transparent 2.2px) !important;\n\tbackground-repeat: repeat-x !important;\n\tbackground-position: 0 0 !important;\n\tbackground-size: 26px 100% !important;\n}\n",
	aggressive: "\n/* ── STEAM · 黄铜 — aggressive: 黄铜仪表/齿轮蚀刻(静态母题) + 径向黄铜辉光 + 铆钉纹 + 淡淡蒸汽雾。暖、机械、惬意。无旋转物。 ── */\n\n/* 1) 重声明半透明表面，让 body 上的黄铜蚀刻与蒸汽透过 gutter/列间/widgets 常驻显现（双属性特异性高于基础单属性规则）。\n      浅色主题：bg 更通透以放大 gutter 揭示；navBg/pageHeaderBg/deckBg 取高 alpha 保持侧栏/页眉/列文字清晰。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(233,220,192,0.42) !important;\n\t--MI_THEME-deckBg: rgba(227,212,178,0.4) !important;\n\t--MI_THEME-navBg: rgba(227,212,178,0.5) !important;\n\t--MI_THEME-pageHeaderBg: rgba(233,220,192,0.9) !important;\n\t--MI_THEME-panel: rgba(242,231,205,0.92) !important;\n\t--MI_THEME-popup: rgba(242,231,205,0.95) !important;\n}\n\n/* 2) body：底层羊皮纸暖底 + 径向黄铜辉光 + 细密铆钉点阵，固定铺满视口、每页常驻。作为装饰层的定位上下文。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] body {\n\tbackground-color: #E9DCC0 !important;\n\tbackground-image:\n\t\tradial-gradient(ellipse 70% 55% at 50% 18%, rgba(176,121,58,0.22), transparent 60%),\n\t\tradial-gradient(ellipse at 50% 50%, transparent 58%, rgba(106,74,38,0.14) 100%),\n\t\tradial-gradient(rgba(106,74,38,0.05) 0.5px, transparent 0.6px),\n\t\tlinear-gradient(120deg, rgba(176,121,58,0.06), transparent 45%) !important;\n\tbackground-size: 100% 100%, 100% 100%, 5px 5px, 100% 100% !important;\n\tbackground-attachment: fixed !important;\n\tposition: relative !important;\n}\n\n/* 3) body::before — 静态齿轮蚀刻母题：两枚黄铜齿轮以 conic 齿廓蚀刻于角落，不旋转，只有极缓的辉光呼吸(opacity)。固定铺满、置于内容之后、不挡点击。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important; inset: 0 !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground:\n\t\tradial-gradient(circle 230px at -4% 104%,\n\t\t\ttransparent 27%, rgba(176,121,58,0.26) 28%, rgba(176,121,58,0.26) 33%, transparent 34%),\n\t\tradial-gradient(circle 230px at -4% 104%,\n\t\t\trgba(138,90,36,0.30) 0 11%, transparent 12%),\n\t\tradial-gradient(circle 150px at 104% 6%,\n\t\t\ttransparent 27%, rgba(176,121,58,0.22) 28%, rgba(176,121,58,0.22) 33%, transparent 34%),\n\t\tradial-gradient(circle 150px at 104% 6%,\n\t\t\trgba(138,90,36,0.26) 0 11%, transparent 12%) !important;\n\tbackground-repeat: no-repeat !important;\n\twill-change: opacity !important;\n\tanimation: kf-steam-cogglow 14s ease-in-out infinite !important;\n}\n\n/* 4) body::after — 升腾蒸汽雾：柔和模糊白色团雾自底部缓慢升腾并轻微漂移(transform/opacity)，固定铺满、置于内容之后、不挡点击。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tleft: 0 !important; right: 0 !important; bottom: 0 !important;\n\theight: 78vh !important;\n\tpointer-events: none !important; z-index: 0 !important;\n\tbackground:\n\t\tradial-gradient(closest-side at 18% 92%, rgba(255,252,244,0.5), transparent 70%),\n\t\tradial-gradient(closest-side at 48% 97%, rgba(255,252,244,0.42), transparent 70%),\n\t\tradial-gradient(closest-side at 78% 90%, rgba(255,250,238,0.46), transparent 70%),\n\t\tradial-gradient(closest-side at 64% 99%, rgba(255,252,244,0.38), transparent 70%) !important;\n\tbackground-size: 42% 60%, 50% 70%, 46% 64%, 38% 56% !important;\n\tbackground-repeat: no-repeat !important;\n\tfilter: blur(26px) !important;\n\topacity: 0.55 !important;\n\twill-change: transform, opacity !important;\n\tanimation: kf-steam-wisp 18s ease-in-out infinite !important;\n}\n\n/* 5) sticky 页眉：藏一道黄铜流光横扫底边铆钉线（保留 marquee 流光）。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tposition: relative !important;\n\toverflow: hidden !important;\n}\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"]::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important;\n\tleft: 0 !important; right: 0 !important; bottom: 0 !important;\n\theight: 2px !important; pointer-events: none !important; z-index: 5 !important;\n\tbackground: linear-gradient(90deg, transparent, rgba(255,228,168,0.95), rgba(176,121,58,0.6), transparent) !important;\n\tbackground-size: 45% 100% !important; background-repeat: no-repeat !important;\n\tanimation: kf-steam-gleam 7s linear infinite !important;\n}\n\n/* 6) 面板/帖子：保持可读（实色面板坐稳正文），黄铜边随悬停升温微亮、轻微上浮，似铜件被擦亮。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: #F2E7CD !important;\n}\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: #F2E7CD !important;\n}\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._panel,\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] article {\n\ttransition: box-shadow 0.3s ease, transform 0.3s ease, border-color 0.3s ease !important;\n}\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._panel:hover {\n\tborder-color: #C68B45 !important;\n\tbox-shadow: 0 8px 22px rgba(74,52,26,0.3), 0 0 0 1px rgba(255,228,168,0.6), inset 0 0 0 1px rgba(251,243,223,0.6) !important;\n\ttransform: translateY(-2px) !important;\n}\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] article:hover {\n\tbox-shadow: inset 0 0 0 1px rgba(176,121,58,0.35) !important;\n}\n\n/* 7) 黄铜按钮：擦亮的流光横扫 + 缓慢的暖光呼吸，按下时下沉如铆接。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._buttonGradate {\n\tposition: relative !important;\n\toverflow: hidden !important;\n\tanimation: kf-steam-brassbreath 4.2s ease-in-out infinite !important;\n\ttransition: transform 0.12s ease, box-shadow 0.12s ease !important;\n}\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._buttonPrimary::after,\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._buttonGradate::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important; inset: 0 !important;\n\tpointer-events: none !important;\n\tbackground: linear-gradient(115deg, transparent 35%, rgba(255,240,210,0.55) 50%, transparent 65%) !important;\n\tbackground-size: 250% 100% !important; background-repeat: no-repeat !important;\n\tbackground-position: 160% 0 !important;\n\tanimation: kf-steam-buttongleam 5.5s linear infinite !important;\n}\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._buttonPrimary:active,\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._buttonGradate:active {\n\ttransform: translateY(1px) !important;\n\tbox-shadow: inset 0 2px 4px rgba(74,52,26,0.5) !important;\n}\n\n/* 8) 描边按钮：悬停黄铜内辉。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._borderButton {\n\ttransition: box-shadow 0.25s ease, border-color 0.25s ease, color 0.25s ease !important;\n}\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tborder-color: #C68B45 !important; color: #8A5A24 !important;\n\tbox-shadow: inset 0 0 10px rgba(176,121,58,0.25), 0 0 8px rgba(176,121,58,0.3) !important;\n}\n\n/* 9) 链接：悬停氧化青柔光。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._link:hover {\n\ttext-shadow: 0 0 8px rgba(62,123,116,0.5) !important;\n\ttransition: text-shadow 0.2s ease !important;\n}\n\n/* 10) 铆钉微闪：徽标计数/指示点像被打磨的黄铜铆钉缓慢明灭。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._indicateCounter,\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] ._indicatorCircle {\n\tbox-shadow: inset 0 1px 1px rgba(255,240,210,0.7), 0 0 0 1px rgba(74,52,26,0.4) !important;\n\tanimation: kf-steam-rivet 3.6s ease-in-out infinite !important;\n}\n\n/* 11) 头像：悬停黄铜怀表盖光泽加强。 */\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] img[class*=\"avatar\"] {\n\ttransition: box-shadow 0.3s ease !important;\n}\nhtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] img[class*=\"avatar\"]:hover {\n\tbox-shadow: 0 0 0 1px rgba(74,52,26,0.5), 0 0 12px rgba(176,121,58,0.5) !important;\n}\n\n/* ── keyframes（全局唯一，kf-steam- 前缀；只动 opacity/transform/background-position，性能友好，无旋转物） ── */\n@keyframes kf-steam-cogglow {\n\t0%, 100% { opacity: 0.7; }\n\t50%      { opacity: 1; }\n}\n@keyframes kf-steam-gleam {\n\t0%   { background-position: -45% 0; }\n\t100% { background-position: 145% 0; }\n}\n@keyframes kf-steam-wisp {\n\t0%   { transform: translate3d(0, 12%, 0) scale(1); opacity: 0.42; }\n\t50%  { transform: translate3d(-2%, -4%, 0) scale(1.12); opacity: 0.62; }\n\t100% { transform: translate3d(2%, 12%, 0) scale(1); opacity: 0.42; }\n}\n@keyframes kf-steam-brassbreath {\n\t0%, 100% { box-shadow: inset 0 1px 0 rgba(255,240,210,0.6), inset 0 -2px 3px rgba(74,52,26,0.4), 0 2px 4px rgba(74,52,26,0.3); }\n\t50%      { box-shadow: inset 0 1px 0 rgba(255,240,210,0.8), inset 0 -2px 3px rgba(74,52,26,0.4), 0 2px 10px rgba(176,121,58,0.55); }\n}\n@keyframes kf-steam-buttongleam {\n\t0%   { background-position: 160% 0; }\n\t60%  { background-position: -60% 0; }\n\t100% { background-position: -60% 0; }\n}\n@keyframes kf-steam-rivet {\n\t0%, 100% { filter: brightness(1); }\n\t50%      { filter: brightness(1.22); }\n}\n\n/* MOTION SAFETY：尊重 prefers-reduced-motion，停止全部动效 */\n@media (prefers-reduced-motion: reduce) {\n\thtml[data-xtcymc-exp=\"steam\"][data-xtcymc-exp-bg] * { animation: none !important; }\n}\n",
};

const HOLO: ExpTheme = {
	id: "holo", name: "Holo · 虹彩",
	tagline: "全息镭射箔：银白铬底、银色玻璃面板与柔和铬阴影、虹彩渐变按钮、棱镜彩虹高光，明亮未来",
	icon: "ti ti-sparkles", scheme: "light",
	radius: "14px", margin: "16px", blur: "blur(12px)", modalBgFilter: "blur(12px)",
	palette: {
		"accent": "#7B6CF6",
		"accentedBg": "rgba(123,108,246,0.15)",
		"love": "#E85B9C",
		"focus": "rgba(123,108,246,0.4)",
		"bg": "#EEF0F4",
		"fg": "#2A2E3A",
		"fgHighlighted": "#0E1018",
		"fgOnAccent": "#ffffff",
		"fgOnWhite": "#7B6CF6",
		"divider": "rgba(120,130,160,0.22)",
		"indicator": "#7B6CF6",
		"panel": "#FBFCFE",
		"panelHighlight": "#EDF0F6",
		"panelHeaderBg": "#F4F6FB",
		"panelHeaderFg": "#2A2E3A",
		"panelBorder": "solid 1px rgba(150,160,190,0.45)",
		"windowHeader": "rgba(248,250,253,0.85)",
		"popup": "#FBFCFE",
		"shadow": "rgba(110,120,170,0.2)",
		"header": "rgba(244,246,251,0.7)",
		"navBg": "#F4F6FB",
		"navFg": "#2A2E3A",
		"navActive": "#7B6CF6",
		"navIndicator": "#46D6E0",
		"pageHeaderBg": "#F4F6FB",
		"pageHeaderFg": "#2A2E3A",
		"link": "#5A8FD6",
		"hashtag": "#C77BE6",
		"mention": "#7B6CF6",
		"mentionMe": "#E85B9C",
		"renote": "#2EC6B0",
		"modalBg": "rgba(40,46,70,0.32)",
		"scrollbarHandle": "rgba(123,108,246,0.3)",
		"scrollbarHandleHover": "rgba(123,108,246,0.5)",
		"dateLabelFg": "#5B6273",
		"infoBg": "#E6F4FB",
		"infoFg": "#41697D",
		"infoWarnBg": "#FBF1DD",
		"infoWarnFg": "#8A6A2B",
		"folderHeaderBg": "rgba(120,130,160,0.08)",
		"folderHeaderHoverBg": "rgba(123,108,246,0.14)",
		"buttonBg": "#EDF0F6",
		"buttonHoverBg": "#E1E6F0",
		"buttonGradateA": "#7B6CF6",
		"buttonGradateB": "#46D6E0",
		"switchBg": "rgba(123,108,246,0.2)",
		"switchOffBg": "rgba(120,130,160,0.2)",
		"switchOffFg": "#ffffff",
		"switchOnBg": "#7B6CF6",
		"switchOnFg": "#ffffff",
		"inputBorder": "rgba(150,160,190,0.45)",
		"inputBorderHover": "rgba(123,108,246,0.6)",
		"badge": "#7B6CF6",
		"messageBg": "#FBFCFE",
		"success": "#2EC6B0",
		"error": "#E85B6B",
		"warn": "#E0A23F",
		"codeString": "#7B6CF6",
		"codeNumber": "#46A7C6",
		"codeBoolean": "#C77BE6",
		"deckBg": "#E4E8F0",
		"htmlThemeColor": "#EEF0F4"
	},
	structural: "\nhtml[data-xtcymc-exp=\"holo\"],\nhtml[data-xtcymc-exp=\"holo\"] body,\nhtml[data-xtcymc-exp=\"holo\"] button,\nhtml[data-xtcymc-exp=\"holo\"] input,\nhtml[data-xtcymc-exp=\"holo\"] textarea {\n\tfont-family: \"Inter\",\"SF Pro Display\",\"Segoe UI Variable\",\"Segoe UI\",\"HarmonyOS Sans SC\",\"PingFang SC\",\"Noto Sans CJK SC\",system-ui,sans-serif !important;\n\tletter-spacing: 0.01em !important;\n}\n/* 还原图标字体（字体仅限定在 html,body,button,input,textarea，但显式保险，防止任何继承导致图标变 □） */\nhtml[data-xtcymc-exp=\"holo\"] .ti,\nhtml[data-xtcymc-exp=\"holo\"] [class*=\"ti-\"],\nhtml[data-xtcymc-exp=\"holo\"] i[class^=\"ti\"] { font-family: \"tabler-icons\" !important; }\n/* 银白铬底 + 柔和棱镜冷光铺底，固定视口 */\nhtml[data-xtcymc-exp=\"holo\"] body {\n\tbackground-color: #EEF0F4 !important;\n\tbackground-image:\n\t\tradial-gradient(ellipse at 16% 14%, rgba(123,108,246,0.14), transparent 52%),\n\t\tradial-gradient(ellipse at 86% 18%, rgba(70,214,224,0.13), transparent 52%),\n\t\tradial-gradient(ellipse at 20% 86%, rgba(199,123,230,0.12), transparent 54%),\n\t\tlinear-gradient(160deg, #F4F6FB 0%, #EAEDF4 50%, #EEF1F7 100%) !important;\n\tbackground-attachment: fixed !important;\n}\n/* 面板 = 玻璃光泽片：银色细边 + 柔和铬阴影 + 顶部高光 + 圆角 */\nhtml[data-xtcymc-exp=\"holo\"] ._panel {\n\tbackground: linear-gradient(160deg, rgba(255,255,255,0.96), rgba(248,250,254,0.9)) !important;\n\tborder: 1px solid rgba(150,160,190,0.45) !important;\n\tborder-radius: 14px !important;\n\tbox-shadow: 0 6px 22px rgba(110,120,170,0.16), inset 0 1px 0 rgba(255,255,255,0.95) !important;\n}\nhtml[data-xtcymc-exp=\"holo\"] ._popup,\nhtml[data-xtcymc-exp=\"holo\"] ._acrylic {\n\tbackground: rgba(252,253,255,0.9) !important;\n\tborder: 1px solid rgba(150,160,190,0.45) !important;\n\tborder-radius: 14px !important;\n\t-webkit-backdrop-filter: blur(12px) saturate(1.3) !important; backdrop-filter: blur(12px) saturate(1.3) !important;\n\tbox-shadow: 0 8px 28px rgba(110,120,170,0.2) !important;\n}\nhtml[data-xtcymc-exp=\"holo\"] ._shadow { box-shadow: 0 6px 22px rgba(110,120,170,0.18) !important; }\n/* 帖子分隔：银色细线 */\nhtml[data-xtcymc-exp=\"holo\"] article { border-bottom: 1px solid rgba(120,130,160,0.18) !important; }\n/* 标题：略带铬质冷调高光 */\nhtml[data-xtcymc-exp=\"holo\"] h1,\nhtml[data-xtcymc-exp=\"holo\"] h2,\nhtml[data-xtcymc-exp=\"holo\"] h3 {\n\tletter-spacing: 0.005em !important;\n\ttext-shadow: 0 1px 0 rgba(255,255,255,0.8) !important;\n}\n/* 链接：虹彩镭射文字渐变（紫→青→品红），玻璃光泽 */\nhtml[data-xtcymc-exp=\"holo\"] ._link {\n\tcolor: #7A5BEA !important; -webkit-text-fill-color: #7A5BEA !important;\n\tfont-weight: 600 !important;\n}\n/* 虹彩渐变填充按钮：紫→青镭射渐变 + 顶部光泽 */\nhtml[data-xtcymc-exp=\"holo\"] ._buttonGradate,\nhtml[data-xtcymc-exp=\"holo\"] ._buttonPrimary {\n\tbackground-image: linear-gradient(105deg, #7B6CF6, #46D6E0) !important;\n\tcolor: #ffffff !important;\n\tborder: 0 !important;\n\tborder-radius: 12px !important;\n\tbox-shadow: 0 4px 14px rgba(123,108,246,0.3), inset 0 1px 0 rgba(255,255,255,0.45) !important;\n\tfont-weight: 600 !important;\n}\n/* 描边按钮：镀铬玻璃感 + 银边 + 圆角 */\nhtml[data-xtcymc-exp=\"holo\"] ._borderButton {\n\tborder: 1px solid rgba(150,160,190,0.5) !important;\n\tborder-radius: 12px !important;\n\tbackground: linear-gradient(160deg, rgba(255,255,255,0.92), rgba(244,246,251,0.85)) !important;\n\tbox-shadow: inset 0 1px 0 rgba(255,255,255,0.9) !important;\n}\n/* 输入框：玻璃白底 + 银边 + 紫色光标 + 圆角 */\nhtml[data-xtcymc-exp=\"holo\"] input,\nhtml[data-xtcymc-exp=\"holo\"] textarea {\n\tbackground: rgba(255,255,255,0.85) !important;\n\tborder: 1px solid rgba(150,160,190,0.45) !important;\n\tborder-radius: 10px !important;\n\tcolor: #2A2E3A !important; caret-color: #7B6CF6 !important;\n}\nhtml[data-xtcymc-exp=\"holo\"] input::placeholder,\nhtml[data-xtcymc-exp=\"holo\"] textarea::placeholder { color: rgba(91,98,115,0.55) !important; }\n/* 头像：银色细边 + 柔和铬阴影 */\nhtml[data-xtcymc-exp=\"holo\"] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"holo\"] [class*=\"avatar\"] > img {\n\tborder: 1px solid rgba(150,160,190,0.4) !important;\n\tbox-shadow: 0 4px 14px rgba(110,120,170,0.22) !important;\n}\n/* 图片：略加饱和与对比，强化玻璃光泽观感（排除表情/反应/头像） */\nhtml[data-xtcymc-exp=\"holo\"] img:not([class*=\"emoji\"]):not([class*=\"mfm\"]):not([class*=\"reaction\"]):not([class*=\"avatar\"]) {\n\tborder-radius: 10px !important;\n}\n/* sticky 页眉：磨砂银色玻璃 + 银色下边线 */\nhtml[data-xtcymc-exp=\"holo\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: linear-gradient(160deg, rgba(248,250,253,0.78), rgba(240,243,249,0.72)) !important;\n\t-webkit-backdrop-filter: blur(12px) saturate(1.3) !important; backdrop-filter: blur(12px) saturate(1.3) !important;\n\tborder-bottom: 1px solid rgba(150,160,190,0.4) !important;\n}\n",
	aggressive: "\n/* ── HOLO · 虹彩 — aggressive: 彩虹全息箔片常驻背景。浅色铬底上，色相旋转的棱镜虹彩光泽缓慢斜扫，箔片光斑与对角虹光带固定铺满视口，每页常驻可见；正文坐在近实色玻璃卡片上始终深色清晰，链接为实色 #7A5BEA ── */\n\n/* 1) 半透明表面：让 body 上的全息箔片透过 gutters/列间/widgets 常驻显现。浅色主题 → navBg/pageHeaderBg 取高 alpha 保证侧栏/页眉文字清晰；bg/deckBg 更通透让缝隙背景明显；面板 >=.92 实感保证正文清晰可读 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(238,240,244,0.42) !important;\n\t--MI_THEME-deckBg: rgba(228,232,240,0.4) !important;\n\t--MI_THEME-navBg: rgba(244,246,251,0.44) !important;\n\t--MI_THEME-pageHeaderBg: rgba(244,246,251,0.9) !important;\n\t--MI_THEME-panel: rgba(251,252,254,0.92) !important;\n\t--MI_THEME-popup: rgba(252,253,255,0.95) !important;\n}\n\n/* 2) body：常驻浅色铬底 + 对角全息虹彩箔片渐变，固定视口 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] body {\n\tbackground-color: #EEF0F4 !important;\n\tbackground-image:\n\t\tlinear-gradient(115deg,\n\t\t\trgba(123,108,246,0.14) 0%,\n\t\t\trgba(70,214,224,0.14) 22%,\n\t\t\trgba(199,123,230,0.14) 44%,\n\t\t\trgba(46,198,176,0.14) 66%,\n\t\t\trgba(255,180,235,0.14) 84%,\n\t\t\trgba(123,108,246,0.14) 100%),\n\t\tlinear-gradient(160deg, #F4F6FB 0%, #EAEDF4 50%, #EEF1F7 100%) !important;\n\tbackground-size: 320% 320%, 100% 100% !important;\n\tbackground-attachment: fixed !important;\n\tbackground-repeat: no-repeat !important;\n\tposition: relative !important;\n\twill-change: background-position !important;\n\tanimation: kf-holo-foil 26s ease-in-out infinite alternate !important;\n}\n\n/* 3a) body::before：底层彩虹全息光晕箔片，色相缓慢旋转 + 飘移，固定铺满视口、不挡点击、位于内容之后 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tinset: -20% !important;\n\tpointer-events: none !important;\n\tz-index: 0 !important;\n\tbackground:\n\t\tradial-gradient(closest-side at 20% 24%, rgba(123,108,246,0.62), transparent 70%),\n\t\tradial-gradient(closest-side at 80% 18%, rgba(70,214,224,0.58), transparent 70%),\n\t\tradial-gradient(closest-side at 24% 82%, rgba(199,123,230,0.56), transparent 70%),\n\t\tradial-gradient(closest-side at 82% 80%, rgba(46,198,176,0.52), transparent 70%),\n\t\tlinear-gradient(120deg, rgba(255,210,245,0.42), rgba(210,235,255,0.42), rgba(220,255,240,0.42)) !important;\n\tbackground-size: 70% 70%, 66% 66%, 74% 74%, 68% 68%, 200% 200% !important;\n\tbackground-repeat: no-repeat !important;\n\tfilter: blur(34px) saturate(1.5) hue-rotate(0deg) !important;\n\twill-change: transform, filter, background-position !important;\n\tanimation: kf-holo-aurora 30s ease-in-out infinite alternate, kf-holo-hue 22s linear infinite !important;\n}\n\n/* 3b) body::after：棱镜对角光泽带 + 细密箔片纹理，缓慢斜扫，固定铺满视口、不挡点击、位于内容之后（浅色主题：留在内容下方，避免遮挡正文） */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tpointer-events: none !important;\n\tz-index: 0 !important;\n\topacity: 0.55 !important;\n\tbackground:\n\t\trepeating-linear-gradient(115deg,\n\t\t\trgba(255,255,255,0) 0px,\n\t\t\trgba(255,255,255,0) 26px,\n\t\t\trgba(255,255,255,0.35) 30px,\n\t\t\trgba(255,255,255,0) 34px),\n\t\tlinear-gradient(115deg,\n\t\t\trgba(123,108,246,0.22) 0%,\n\t\t\trgba(70,214,224,0.22) 20%,\n\t\t\trgba(199,123,230,0.22) 40%,\n\t\t\trgba(46,198,176,0.22) 60%,\n\t\t\trgba(255,200,240,0.22) 80%,\n\t\t\trgba(123,108,246,0.22) 100%) !important;\n\tbackground-size: 200% 100%, 320% 100% !important;\n\tbackground-repeat: repeat, no-repeat !important;\n\tfilter: blur(1.5px) saturate(1.4) hue-rotate(0deg) !important;\n\tmix-blend-mode: screen !important;\n\twill-change: background-position, filter !important;\n\tanimation: kf-holo-sweep 18s linear infinite, kf-holo-hue 16s linear infinite !important;\n}\n\n/* 4) 面板：近实色玻璃片（>=.92）保证正文深色可读，叠加一道色相旋转的全息彩虹斜光层缓慢横扫，仅在内容下方透出 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._panel,\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] article {\n\tposition: relative !important;\n\ttransition: transform 0.45s cubic-bezier(0.22,1,0.36,1), box-shadow 0.45s ease !important;\n}\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: linear-gradient(160deg, rgba(252,253,255,0.94), rgba(247,249,253,0.92)) !important;\n}\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: rgba(252,253,255,0.95) !important;\n}\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._panel::before {\n\tcontent: \"\" !important;\n\tposition: absolute !important;\n\tinset: 0 !important;\n\tz-index: 0 !important;\n\tpointer-events: none !important;\n\tborder-radius: inherit !important;\n\tbackground: linear-gradient(115deg,\n\t\trgba(123,108,246,0.14),\n\t\trgba(70,214,224,0.14),\n\t\trgba(199,123,230,0.14),\n\t\trgba(46,198,176,0.14),\n\t\trgba(123,108,246,0.14)) !important;\n\tbackground-size: 300% 100% !important;\n\tmix-blend-mode: screen !important;\n\twill-change: background-position, filter !important;\n\tanimation: kf-holo-sheen 12s linear infinite, kf-holo-hue 16s linear infinite !important;\n}\n/* 悬停：铬质反光 + 虹彩边缘辉光 + 轻微浮起；并扫过一道高光 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._panel:hover {\n\ttransform: translateY(-3px) scale(1.004) !important;\n\tbox-shadow: 0 18px 44px rgba(110,120,170,0.26), 0 0 0 1px rgba(123,108,246,0.4), 0 0 22px rgba(70,214,224,0.3), inset 0 1px 0 rgba(255,255,255,0.95) !important;\n}\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._panel::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important;\n\tinset: 0 !important;\n\tz-index: 1 !important;\n\tpointer-events: none !important;\n\tborder-radius: inherit !important;\n\tbackground: linear-gradient(118deg, transparent 32%, rgba(255,255,255,0.6) 48%, transparent 64%) !important;\n\tbackground-size: 250% 250% !important;\n\tbackground-position: 120% 120% !important;\n\topacity: 0 !important;\n\ttransition: opacity 0.2s ease !important;\n}\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._panel:hover::after {\n\topacity: 1 !important;\n\tanimation: kf-holo-shine 0.95s ease-out !important;\n}\n\n/* 5) 渐变/主按钮：流动的色相旋转镭射渐变 + 呼吸辉光 + 悬停提亮上浮 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._buttonGradate,\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._buttonPrimary {\n\tbackground-image: linear-gradient(110deg, #7B6CF6, #46D6E0, #C77BE6, #2EC6B0, #7B6CF6) !important;\n\tbackground-size: 320% 100% !important;\n\tcolor: #ffffff !important;\n\twill-change: background-position, filter, box-shadow !important;\n\tanimation: kf-holo-flow 8s linear infinite, kf-holo-glow 4.5s ease-in-out infinite, kf-holo-hue 14s linear infinite !important;\n\ttransition: transform 0.22s ease !important;\n}\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._buttonGradate:hover,\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._buttonPrimary:hover {\n\ttransform: translateY(-1px) scale(1.03) !important;\n\tfilter: brightness(1.08) !important;\n}\n\n/* 6) 描边按钮：悬停镀铬虹彩边辉光 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._borderButton {\n\ttransition: box-shadow 0.22s ease, border-color 0.22s ease !important;\n}\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tborder-color: rgba(123,108,246,0.6) !important;\n\tbox-shadow: 0 0 14px rgba(123,108,246,0.4), 0 0 18px rgba(70,214,224,0.3), inset 0 1px 0 rgba(255,255,255,0.95) !important;\n}\n\n/* 7) 链接：实色 #7A5BEA（不透明），悬停虹彩柔光，不改文字填充色 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._link {\n\tcolor: #7A5BEA !important;\n\t-webkit-text-fill-color: #7A5BEA !important;\n\tfont-weight: 600 !important;\n\ttransition: filter 0.25s ease, text-shadow 0.25s ease !important;\n}\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._link:hover {\n\tfilter: drop-shadow(0 0 6px rgba(123,108,246,0.4)) !important;\n\ttext-shadow: 0 0 8px rgba(70,214,224,0.35) !important;\n}\n\n/* 8) 头像：悬停虹彩环辉光 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img {\n\ttransition: box-shadow 0.25s ease !important;\n}\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] img[class*=\"avatar\"]:hover,\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img:hover {\n\tbox-shadow: 0 4px 16px rgba(110,120,170,0.3), 0 0 0 2px rgba(123,108,246,0.45), 0 0 16px rgba(70,214,224,0.4) !important;\n}\n\n/* 9) badge / 计数器：虹彩辉光呼吸 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._indicateCounter,\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] ._indicatorCircle {\n\tbox-shadow: 0 0 8px rgba(123,108,246,0.5) !important;\n\tanimation: kf-holo-glow 3.4s ease-in-out infinite !important;\n}\n\n/* 10) sticky 页眉：底部一道色相旋转的全息彩虹流光带缓慢横扫 */\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tposition: relative !important;\n}\nhtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"]::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important;\n\tleft: 0 !important; right: 0 !important; bottom: 0 !important;\n\theight: 2px !important;\n\tpointer-events: none !important;\n\tz-index: 4 !important;\n\tbackground: linear-gradient(90deg, #7B6CF6, #46D6E0, #C77BE6, #2EC6B0, #7B6CF6) !important;\n\tbackground-size: 300% 100% !important;\n\twill-change: background-position, filter !important;\n\tanimation: kf-holo-flow 7s linear infinite, kf-holo-hue 16s linear infinite !important;\n}\n\n/* ── keyframes（全局唯一，kf-holo- 前缀） ── */\n@keyframes kf-holo-hue {\n\t0%   { filter: hue-rotate(0deg); }\n\t100% { filter: hue-rotate(360deg); }\n}\n@keyframes kf-holo-foil {\n\t0%   { background-position: 0% 50%, 0% 0%; }\n\t100% { background-position: 100% 50%, 0% 0%; }\n}\n@keyframes kf-holo-aurora {\n\t0%   { transform: translate3d(0,0,0) scale(1); background-position: 0% 0%, 100% 0%, 0% 100%, 100% 100%, 0% 50%; }\n\t50%  { transform: translate3d(2%,-2%,0) scale(1.06); background-position: 12% 8%, 88% 10%, 8% 90%, 90% 88%, 60% 50%; }\n\t100% { transform: translate3d(-2%,2%,0) scale(1.03); background-position: 6% 14%, 94% 4%, 14% 86%, 86% 94%, 100% 50%; }\n}\n@keyframes kf-holo-sweep {\n\t0%   { background-position: 0% 0%, 0% 50%; }\n\t100% { background-position: 200% 0%, 320% 50%; }\n}\n@keyframes kf-holo-sheen {\n\t0%   { background-position: 0% 50%; }\n\t100% { background-position: 300% 50%; }\n}\n@keyframes kf-holo-shine {\n\t0%   { background-position: 120% 120%; }\n\t100% { background-position: -40% -40%; }\n}\n@keyframes kf-holo-flow {\n\t0%   { background-position: 0% 50%; }\n\t100% { background-position: 320% 50%; }\n}\n@keyframes kf-holo-glow {\n\t0%, 100% { box-shadow: 0 4px 14px rgba(123,108,246,0.3), 0 0 0 rgba(70,214,224,0); }\n\t50%      { box-shadow: 0 8px 24px rgba(70,214,224,0.4), 0 0 18px rgba(123,108,246,0.35); }\n}\n\n/* ── 动效安全：尊重 prefers-reduced-motion ── */\n@media (prefers-reduced-motion: reduce) {\n\thtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] * { animation: none !important; }\n\thtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] body,\n\thtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] body::before,\n\thtml[data-xtcymc-exp=\"holo\"][data-xtcymc-exp-bg] body::after { animation: none !important; }\n}\n",
};

const AQUA: ExpTheme = {
	id: "aqua", name: "Aqua · 碧波",
	tagline: "深海生物荧光：深蓝渐变海水底、青/蓝绿强调、生物荧光与柔光圆角面板；开启动效后水下焦散光纹、上升气泡与缓慢洋流漂移",
	icon: "ti ti-ripple", scheme: "dark",
	radius: "16px", margin: "16px", blur: "blur(10px)", modalBgFilter: "blur(10px)",
	palette: {
		"accent": "#34D6C8",
		"accentedBg": "rgba(52,214,200,0.14)",
		"love": "#FB7185",
		"focus": "rgba(52,214,200,0.42)",
		"bg": "#04212F",
		"fg": "#CFE6EC",
		"fgHighlighted": "#EAF7FA",
		"fgOnAccent": "#03202E",
		"fgOnWhite": "#34D6C8",
		"divider": "rgba(94,234,212,0.16)",
		"indicator": "#5EEAD4",
		"panel": "rgba(7,36,52,0.88)",
		"panelHighlight": "rgba(14,52,72,0.92)",
		"panelHeaderBg": "rgba(5,30,46,0.9)",
		"panelHeaderFg": "#CFE6EC",
		"panelBorder": "solid 1px rgba(52,214,200,0.22)",
		"windowHeader": "rgba(5,30,46,0.9)",
		"popup": "rgba(9,42,60,0.96)",
		"shadow": "rgba(0,12,24,0.55)",
		"header": "rgba(4,33,47,0.72)",
		"navBg": "rgba(5,30,44,0.92)",
		"navFg": "#BBD8E0",
		"navActive": "#34D6C8",
		"navIndicator": "#5EEAD4",
		"pageHeaderBg": "rgba(5,30,44,0.9)",
		"pageHeaderFg": "#E4F4F7",
		"link": "#4FA8E0",
		"hashtag": "#5EEAD4",
		"mention": "#34D6C8",
		"mentionMe": "#4FA8E0",
		"renote": "#5EEAD4",
		"modalBg": "rgba(2,16,26,0.62)",
		"scrollbarHandle": "rgba(52,214,200,0.24)",
		"scrollbarHandleHover": "rgba(52,214,200,0.46)",
		"dateLabelFg": "#84B6C6",
		"infoBg": "rgba(12,48,68,0.9)",
		"infoFg": "#A8D6E2",
		"infoWarnBg": "rgba(58,44,20,0.9)",
		"infoWarnFg": "#F5CC7A",
		"folderHeaderBg": "rgba(52,214,200,0.06)",
		"folderHeaderHoverBg": "rgba(52,214,200,0.12)",
		"buttonBg": "rgba(13,46,64,0.85)",
		"buttonHoverBg": "rgba(52,214,200,0.16)",
		"buttonGradateA": "#34D6C8",
		"buttonGradateB": "#4FA8E0",
		"switchBg": "rgba(52,214,200,0.2)",
		"switchOffBg": "rgba(130,170,185,0.18)",
		"switchOffFg": "#03202E",
		"switchOnBg": "rgba(52,214,200,0.25)",
		"switchOnFg": "#5EEAD4",
		"inputBorder": "rgba(94,234,212,0.22)",
		"inputBorderHover": "rgba(52,214,200,0.46)",
		"badge": "#4FA8E0",
		"messageBg": "#04212F",
		"success": "#34D6C8",
		"error": "#FB7185",
		"warn": "#F5CC7A",
		"codeString": "#5EEAD4",
		"codeNumber": "#4FA8E0",
		"codeBoolean": "#7FD8FF",
		"deckBg": "#031824",
		"htmlThemeColor": "#04212F"
	},
	structural: "\nhtml[data-xtcymc-exp=\"aqua\"],\nhtml[data-xtcymc-exp=\"aqua\"] body,\nhtml[data-xtcymc-exp=\"aqua\"] button,\nhtml[data-xtcymc-exp=\"aqua\"] input,\nhtml[data-xtcymc-exp=\"aqua\"] textarea {\n\tfont-family: \"Inter\",\"Hiragino Sans GB\",\"PingFang SC\",\"Noto Sans CJK SC\",\"Segoe UI Variable\",\"Segoe UI\",system-ui,sans-serif !important;\n}\nhtml[data-xtcymc-exp=\"aqua\"] body {\n\tbackground:\n\t\tradial-gradient(ellipse at 16% 10%, rgba(52,214,200,0.12), transparent 46%),\n\t\tradial-gradient(ellipse at 86% 16%, rgba(79,168,224,0.12), transparent 48%),\n\t\tradial-gradient(ellipse at 50% 96%, rgba(94,234,212,0.10), transparent 52%),\n\t\tlinear-gradient(165deg, #03263A 0%, #052233 52%, #061E2E 100%) !important;\n\tbackground-attachment: fixed !important;\n}\nhtml[data-xtcymc-exp=\"aqua\"] ._panel {\n\tbackground: rgba(7,36,52,0.88) !important;\n\tborder: 1px solid rgba(52,214,200,0.22) !important;\n\tborder-radius: 16px !important;\n\tbox-shadow: 0 6px 28px rgba(0,12,24,0.45), 0 0 0 1px rgba(52,214,200,0.05), inset 0 1px 0 rgba(150,225,235,0.06) !important;\n\t-webkit-backdrop-filter: blur(10px) !important; backdrop-filter: blur(10px) !important;\n}\nhtml[data-xtcymc-exp=\"aqua\"] ._popup,\nhtml[data-xtcymc-exp=\"aqua\"] ._acrylic {\n\tbackground: rgba(9,42,60,0.92) !important;\n\tborder: 1px solid rgba(52,214,200,0.22) !important;\n\tborder-radius: 16px !important;\n\t-webkit-backdrop-filter: blur(10px) !important; backdrop-filter: blur(10px) !important;\n}\nhtml[data-xtcymc-exp=\"aqua\"] ._shadow { box-shadow: 0 6px 28px rgba(0,12,24,0.45) !important; }\nhtml[data-xtcymc-exp=\"aqua\"] article { border-bottom: 1px solid rgba(94,234,212,0.12) !important; }\nhtml[data-xtcymc-exp=\"aqua\"] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"aqua\"] ._buttonGradate {\n\tborder-radius: 14px !important;\n\tbox-shadow: 0 2px 16px rgba(52,214,200,0.24) !important;\n\tcolor: #03202E !important;\n}\nhtml[data-xtcymc-exp=\"aqua\"] ._borderButton {\n\tborder: 1px solid rgba(52,214,200,0.42) !important;\n\tborder-radius: 14px !important;\n\tbackground: rgba(52,214,200,0.05) !important;\n}\nhtml[data-xtcymc-exp=\"aqua\"] input,\nhtml[data-xtcymc-exp=\"aqua\"] textarea {\n\tborder-color: rgba(94,234,212,0.22) !important;\n\tborder-radius: 12px !important;\n}\nhtml[data-xtcymc-exp=\"aqua\"] input::placeholder,\nhtml[data-xtcymc-exp=\"aqua\"] textarea::placeholder { color: rgba(132,182,198,0.5) !important; }\nhtml[data-xtcymc-exp=\"aqua\"] h1,\nhtml[data-xtcymc-exp=\"aqua\"] h2,\nhtml[data-xtcymc-exp=\"aqua\"] h3 {\n\tcolor: #EAF7FA !important; font-weight: 700 !important; letter-spacing: 0.01em !important;\n}\nhtml[data-xtcymc-exp=\"aqua\"] ._link { color: #4FA8E0 !important; }\nhtml[data-xtcymc-exp=\"aqua\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: rgba(5,30,44,0.9) !important;\n\t-webkit-backdrop-filter: blur(10px) !important; backdrop-filter: blur(10px) !important;\n\tborder-bottom: 1px solid rgba(52,214,200,0.2) !important;\n}\nhtml[data-xtcymc-exp=\"aqua\"] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"aqua\"] [class*=\"avatar\"] > img {\n\tbox-shadow: 0 3px 16px rgba(52,214,200,0.2) !important;\n}\nhtml[data-xtcymc-exp=\"aqua\"] img:not([class*=\"emoji\"]):not([class*=\"mfm\"]):not([class*=\"reaction\"]):not([class*=\"avatar\"]) {\n\tborder-radius: 12px !important;\n}\n",
	aggressive: "/* ── AQUA · 碧波 — aggressive：水下焦散光纹 + 上升气泡 + 下沉光柱(god rays) + 缓慢洋流漂移 + 生物荧光脉动 ── */\r\n/* 重声明半透明表面：让 body 上的深青绿海水 + 焦散 + 气泡透过 UI 缝隙常驻显现（双属性特异性高于 structural） */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] {\r\n\t--MI_THEME-bg: rgba(4,33,47,0.42) !important;\r\n\t--MI_THEME-deckBg: rgba(3,24,36,0.46) !important;\r\n\t--MI_THEME-navBg: rgba(5,30,44,0.4) !important;\r\n\t--MI_THEME-pageHeaderBg: rgba(5,30,44,0.88) !important;\r\n\t--MI_THEME-panelHeaderBg: rgba(5,30,46,0.9) !important;\r\n\t--MI_THEME-panel: rgba(7,36,52,0.9) !important;\r\n\t--MI_THEME-popup: rgba(9,42,60,0.95) !important;\r\n}\r\n/* body：深海青绿渐变底，缓慢洋流漂移；作为固定背景与定位上下文 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] body {\r\n\tbackground:\r\n\t\tradial-gradient(ellipse 70% 50% at 50% -6%, rgba(127,216,255,0.18), transparent 60%),\r\n\t\tradial-gradient(ellipse at 18% 16%, rgba(52,214,200,0.14), transparent 50%),\r\n\t\tradial-gradient(ellipse at 84% 80%, rgba(79,168,224,0.13), transparent 54%),\r\n\t\tlinear-gradient(176deg, #053247 0%, #042538 46%, #03202E 74%, #02141F 100%) !important;\r\n\tbackground-size: 100% 100%, 160% 160%, 160% 160%, 100% 100% !important;\r\n\tbackground-attachment: fixed !important;\r\n\tbackground-repeat: no-repeat !important;\r\n\tposition: relative !important;\r\n\twill-change: background-position !important;\r\n\tanimation: kf-aqua-current 42s ease-in-out infinite alternate !important;\r\n}\r\n/* body::before — 焦散光纹层(caustics)：交织的光斑网纹 + 顶部下沉的光柱(god rays)，缓慢波动 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] body::before {\r\n\tcontent: \"\" !important;\r\n\tposition: fixed !important; inset: -25% !important;\r\n\tpointer-events: none !important; z-index: 0 !important;\r\n\tbackground:\r\n\t\tradial-gradient(closest-side at 6% 36%, rgba(94,234,212,0.4), transparent 74%),\r\n\t\tradial-gradient(closest-side at 26% 26%, rgba(94,234,212,0.42), transparent 72%),\r\n\t\tradial-gradient(closest-side at 72% 22%, rgba(127,216,255,0.38), transparent 72%),\r\n\t\tradial-gradient(closest-side at 48% 80%, rgba(52,214,200,0.4), transparent 74%),\r\n\t\trepeating-linear-gradient(58deg, rgba(94,234,212,0) 0 36px, rgba(94,234,212,0.16) 43px, rgba(94,234,212,0) 50px),\r\n\t\trepeating-linear-gradient(-50deg, rgba(127,216,255,0) 0 44px, rgba(127,216,255,0.14) 51px, rgba(127,216,255,0) 58px) !important;\r\n\tbackground-size: 60% 60%, 62% 62%, 56% 56%, 66% 66%, 230px 230px, 270px 270px !important;\r\n\tbackground-repeat: no-repeat, no-repeat, no-repeat, no-repeat, repeat, repeat !important;\r\n\tfilter: blur(22px) saturate(1.4) !important;\r\n\twill-change: transform, background-position !important;\r\n\tanimation: kf-aqua-caustics 32s ease-in-out infinite alternate !important;\r\n}\r\n/* body::after — 上升的气泡群 + 倾斜的光柱叠层；铺满视口固定，逐页常驻 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] body::after {\r\n\tcontent: \"\" !important;\r\n\tposition: fixed !important; left: 0 !important; right: 0 !important; top: 0 !important; bottom: 0 !important;\r\n\tpointer-events: none !important; z-index: 0 !important;\r\n\tbackground-image:\r\n\t\tlinear-gradient(102deg, transparent 0 16%, rgba(173,224,255,0.07) 22%, transparent 30%, transparent 58%, rgba(94,234,212,0.06) 64%, transparent 72%),\r\n\t\tradial-gradient(circle at 12% 50%, rgba(214,244,248,0.6) 0 2.5px, rgba(94,234,212,0.2) 3px, transparent 4px),\r\n\t\tradial-gradient(circle at 28% 50%, rgba(214,244,248,0.42) 0 1.5px, transparent 2.5px),\r\n\t\tradial-gradient(circle at 44% 50%, rgba(173,224,255,0.55) 0 3px, rgba(79,168,224,0.18) 4px, transparent 5px),\r\n\t\tradial-gradient(circle at 61% 50%, rgba(214,244,248,0.44) 0 2px, transparent 3px),\r\n\t\tradial-gradient(circle at 77% 50%, rgba(94,234,212,0.55) 0 2.5px, transparent 3.5px),\r\n\t\tradial-gradient(circle at 90% 50%, rgba(214,244,248,0.48) 0 1.5px, transparent 2.5px) !important;\r\n\tbackground-size: 100% 100%, 100% 56px, 100% 40px, 100% 72px, 100% 48px, 100% 60px, 100% 44px !important;\r\n\tbackground-repeat: no-repeat, repeat-y, repeat-y, repeat-y, repeat-y, repeat-y, repeat-y !important;\r\n\tbackground-position: 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0 !important;\r\n\topacity: 0.72 !important;\r\n\twill-change: background-position, opacity !important;\r\n\tanimation: kf-aqua-bubbles 18s linear infinite, kf-aqua-bubblefade 9s ease-in-out infinite !important;\r\n}\r\n/* 内容层抬到背景之上 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] #misskey_app,\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] body > div { position: relative !important; z-index: 1 !important; }\r\n/* 面板：保持可读(实色感 0.9 alpha) + 悬停上浮与青绿辉光 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._panel {\r\n\tbackground: rgba(7,36,52,0.9) !important;\r\n\tbox-shadow: 0 6px 30px rgba(0,12,24,0.42), inset 0 1px 0 rgba(150,225,235,0.07) !important;\r\n\ttransition: box-shadow 0.5s ease, transform 0.4s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._panel:hover {\r\n\tbox-shadow: 0 12px 44px rgba(52,214,200,0.2), inset 0 1px 0 rgba(150,225,235,0.1) !important;\r\n\ttransform: translateY(-2px) !important;\r\n}\r\n/* 弹窗：保持高可读 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._popup,\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._acrylic {\r\n\tbackground: rgba(9,42,60,0.95) !important;\r\n}\r\n/* 帖子悬停：淡青绿水光 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] article {\r\n\ttransition: background 0.5s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] article:hover {\r\n\tbackground: rgba(52,214,200,0.05) !important;\r\n}\r\n/* 标题：水光辉光呼吸 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] h1,\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] h2,\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] h3 {\r\n\tanimation: kf-aqua-titleglow 6s ease-in-out infinite !important;\r\n}\r\n/* 主按钮 / 渐变按钮：生物荧光脉动 + 悬停上浮 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._buttonPrimary,\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._buttonGradate {\r\n\tanimation: kf-aqua-glow 5s ease-in-out infinite !important;\r\n\ttransition: transform 0.25s ease, filter 0.25s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._buttonPrimary:hover,\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._buttonGradate:hover {\r\n\ttransform: translateY(-1px) scale(1.02) !important;\r\n\tfilter: brightness(1.1) !important;\r\n}\r\n/* 描边按钮悬停：青绿水光晕 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._borderButton:hover {\r\n\tbox-shadow: 0 0 16px rgba(52,214,200,0.45) !important;\r\n\ttransition: box-shadow 0.25s ease !important;\r\n}\r\n/* 链接悬停：荧光蓝辉光 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._link {\r\n\ttransition: color 0.4s ease, text-shadow 0.4s ease !important;\r\n}\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] ._link:hover {\r\n\ttext-shadow: 0 0 10px rgba(79,168,224,0.6), 0 0 18px rgba(127,216,255,0.4) !important;\r\n}\r\n/* 输入聚焦：内嵌水光 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] input:focus,\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] textarea:focus {\r\n\tbox-shadow: 0 0 0 1px rgba(52,214,200,0.42), inset 0 0 14px rgba(52,214,200,0.09) !important;\r\n}\r\n/* sticky 页眉：青绿下划线流光脉冲 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\r\n\tbackground: rgba(5,30,44,0.88) !important;\r\n\tanimation: kf-aqua-headerline 10s ease-in-out infinite !important;\r\n}\r\n/* 头像：缓慢荧光呼吸 */\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] img[class*=\"avatar\"],\r\nhtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img {\r\n\tanimation: kf-aqua-glow 7s ease-in-out infinite !important;\r\n}\r\n\r\n@keyframes kf-aqua-current {\r\n\t0%   { background-position: 50% 0%, 0% 0%, 100% 100%, 0 0; }\r\n\t100% { background-position: 50% 4%, 16% 12%, 84% 88%, 0 0; }\r\n}\r\n@keyframes kf-aqua-caustics {\r\n\t0%   { transform: translate3d(-3%, -2%, 0) scale(1.04); background-position: 0% 0%, 100% 0%, 50% 100%, 0 0, 0 0; }\r\n\t50%  { transform: translate3d(2%, 2%, 0) scale(1.1); background-position: 10% 8%, 88% 6%, 42% 92%, 70px 60px, -60px 50px; }\r\n\t100% { transform: translate3d(4%, -2%, 0) scale(1.06); background-position: 4% 14%, 95% 3%, 56% 84%, 140px 120px, -120px 100px; }\r\n}\r\n@keyframes kf-aqua-bubbles {\r\n\t0%   { background-position: 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0; }\r\n\t100% { background-position: 0 0, 0 -560px, 0 -400px, 0 -720px, 0 -480px, 0 -600px, 0 -440px; }\r\n}\r\n@keyframes kf-aqua-bubblefade {\r\n\t0%, 100% { opacity: 0.58; }\r\n\t50%      { opacity: 0.82; }\r\n}\r\n@keyframes kf-aqua-titleglow {\r\n\t0%, 100% { text-shadow: 0 0 8px rgba(52,214,200,0.28); }\r\n\t50%      { text-shadow: 0 0 16px rgba(94,234,212,0.5), 0 0 26px rgba(52,214,200,0.28); }\r\n}\r\n@keyframes kf-aqua-glow {\r\n\t0%, 100% { box-shadow: 0 2px 14px rgba(52,214,200,0.2); }\r\n\t50%      { box-shadow: 0 2px 24px rgba(52,214,200,0.44); }\r\n}\r\n@keyframes kf-aqua-headerline {\r\n\t0%, 100% { border-bottom: 1px solid rgba(52,214,200,0.18) !important; box-shadow: 0 1px 12px rgba(52,214,200,0.06); }\r\n\t50%      { border-bottom: 1px solid rgba(94,234,212,0.36) !important; box-shadow: 0 1px 18px rgba(94,234,212,0.22); }\r\n}\r\n\r\n@media (prefers-reduced-motion: reduce) {\r\n\thtml[data-xtcymc-exp=\"aqua\"][data-xtcymc-exp-bg] * { animation: none !important; }\r\n}\r\n",
};

const NOTEBOOK: ExpTheme = {
	id: "notebook", name: "Notebook · 手帐",
	tagline: "手帐拼贴笔记本：奶油横线纸、蓝色横线与红色页边线、和纸胶带卡片、荧光笔下划线、手写感涂鸦",
	icon: "ti ti-notebook", scheme: "light",
	radius: "8px", margin: "16px", blur: "blur(0px)", modalBgFilter: "blur(0px)",
	palette: {
		"accent": "#2E5AAC",
		"accentedBg": "rgba(46,90,172,0.12)",
		"love": "#E2574C",
		"focus": "rgba(46,90,172,0.4)",
		"bg": "#FBF8EE",
		"fg": "#3A352C",
		"fgHighlighted": "#1F1B14",
		"fgOnAccent": "#FBF8EE",
		"fgOnWhite": "#2E5AAC",
		"divider": "rgba(46,90,172,0.22)",
		"indicator": "#E2574C",
		"panel": "#FFFDF5",
		"panelHighlight": "#FBF4DC",
		"panelHeaderBg": "#FFF3C4",
		"panelHeaderFg": "#3A352C",
		"panelBorder": "solid 1px rgba(58,53,44,0.18)",
		"windowHeader": "#FFFDF5",
		"popup": "#FFFDF5",
		"shadow": "rgba(58,53,44,0.18)",
		"header": "rgba(251,248,238,0.92)",
		"navBg": "#FBF8EE",
		"navFg": "#3A352C",
		"navActive": "#2E5AAC",
		"navIndicator": "#E2574C",
		"pageHeaderBg": "#FFF3C4",
		"pageHeaderFg": "#3A352C",
		"link": "#2E5AAC",
		"hashtag": "#E2574C",
		"mention": "#2E5AAC",
		"mentionMe": "#E2574C",
		"renote": "#2C9C6A",
		"modalBg": "rgba(58,53,44,0.38)",
		"scrollbarHandle": "rgba(46,90,172,0.35)",
		"scrollbarHandleHover": "rgba(46,90,172,0.6)",
		"dateLabelFg": "#2E5AAC",
		"infoBg": "rgba(46,90,172,0.1)",
		"infoFg": "#2E5AAC",
		"infoWarnBg": "rgba(255,227,110,0.45)",
		"infoWarnFg": "#8A6D12",
		"folderHeaderBg": "rgba(46,90,172,0.08)",
		"folderHeaderHoverBg": "rgba(255,227,110,0.4)",
		"buttonBg": "#FFFDF5",
		"buttonHoverBg": "#FBF4DC",
		"buttonGradateA": "#2E5AAC",
		"buttonGradateB": "#4E7FD0",
		"switchBg": "rgba(58,53,44,0.2)",
		"switchOffBg": "rgba(58,53,44,0.18)",
		"switchOffFg": "#FBF8EE",
		"switchOnBg": "#2E5AAC",
		"switchOnFg": "#FBF8EE",
		"inputBorder": "rgba(46,90,172,0.35)",
		"inputBorderHover": "#2E5AAC",
		"badge": "#E2574C",
		"messageBg": "#FFFDF5",
		"success": "#2C9C6A",
		"error": "#E2574C",
		"warn": "#E0A21C",
		"codeString": "#2C9C6A",
		"codeNumber": "#2E5AAC",
		"codeBoolean": "#E2574C",
		"deckBg": "#F3EEDD",
		"htmlThemeColor": "#FBF8EE"
	},
	structural: "\nhtml[data-xtcymc-exp=\"notebook\"],\nhtml[data-xtcymc-exp=\"notebook\"] body,\nhtml[data-xtcymc-exp=\"notebook\"] button,\nhtml[data-xtcymc-exp=\"notebook\"] input,\nhtml[data-xtcymc-exp=\"notebook\"] textarea {\n\tfont-family: \"Comic Sans MS\",\"Chalkboard SE\",\"Comic Neue\",\"Yuanti SC\",\"Hiragino Maru Gothic ProN\",\"Rounded Mplus 1c\",\"Noto Sans CJK SC\",\"PingFang SC\",system-ui,sans-serif !important;\n}\n/* 还原图标字体：scope 字体后特异性会盖过 tabler 的 .ti，必须显式恢复，否则图标变 □ */\nhtml[data-xtcymc-exp=\"notebook\"] .ti,\nhtml[data-xtcymc-exp=\"notebook\"] [class*=\"ti-\"],\nhtml[data-xtcymc-exp=\"notebook\"] i[class^=\"ti\"] { font-family: \"tabler-icons\" !important; }\nhtml[data-xtcymc-exp=\"notebook\"] * { border-radius: 8px !important; }\n/* 奶油横线纸：淡蓝横线 RULE LINES + 红色左页边线 MARGIN，固定在视口 */\nhtml[data-xtcymc-exp=\"notebook\"] body {\n\tbackground-color: #FBF8EE !important;\n\tbackground-image:\n\t\tlinear-gradient(90deg, transparent 0, transparent 52px, rgba(226,87,76,0.45) 52px, rgba(226,87,76,0.45) 54px, transparent 54px),\n\t\trepeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(46,90,172,0.18) 27px, rgba(46,90,172,0.18) 28px) !important;\n\tbackground-attachment: fixed !important;\n}\n/* 面板 = 贴在纸上的纸片卡：米白、极轻旋转、柔阴影，顶部一条和纸胶带 ::before */\nhtml[data-xtcymc-exp=\"notebook\"] ._panel {\n\tbackground: #FFFDF5 !important;\n\tborder: 1px solid rgba(58,53,44,0.16) !important;\n\tbox-shadow: 2px 4px 10px rgba(58,53,44,0.14) !important;\n\tborder-radius: 8px !important;\n\tposition: relative !important;\n\ttransform: rotate(-0.4deg) !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"] ._panel::before {\n\tcontent: \"\" !important;\n\tposition: absolute !important;\n\ttop: -9px !important;\n\tleft: 28px !important;\n\twidth: 78px !important;\n\theight: 20px !important;\n\tbackground: repeating-linear-gradient(45deg, rgba(255,227,110,0.85) 0 7px, rgba(255,210,70,0.85) 7px 14px) !important;\n\tborder-left: 1px dashed rgba(58,53,44,0.2) !important;\n\tborder-right: 1px dashed rgba(58,53,44,0.2) !important;\n\ttransform: rotate(-3deg) !important;\n\tbox-shadow: 0 1px 2px rgba(58,53,44,0.12) !important;\n\tz-index: 2 !important;\n\tpointer-events: none !important;\n\tborder-radius: 1px !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"] ._shadow { box-shadow: 2px 4px 10px rgba(58,53,44,0.16) !important; }\nhtml[data-xtcymc-exp=\"notebook\"] ._popup,\nhtml[data-xtcymc-exp=\"notebook\"] ._acrylic {\n\tbackground: #FFFDF5 !important;\n\tborder: 1px solid rgba(58,53,44,0.18) !important;\n\tbox-shadow: 2px 4px 12px rgba(58,53,44,0.18) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tborder-radius: 8px !important;\n}\n/* 帖子卡片：纸片便签，米白底，虚线分隔像撕页线 */\nhtml[data-xtcymc-exp=\"notebook\"] article {\n\tbackground: #FFFDF5 !important;\n\tborder-bottom: 1.5px dashed rgba(46,90,172,0.28) !important;\n}\n/* 按钮：圆润手写感，墨蓝边，便签气质 */\nhtml[data-xtcymc-exp=\"notebook\"] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"notebook\"] ._buttonGradate {\n\tborder-radius: 10px !important;\n\tbox-shadow: 2px 2px 0 rgba(46,90,172,0.5) !important;\n\tfont-weight: 700 !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"] ._borderButton {\n\tborder: 1.5px solid #2E5AAC !important;\n\tborder-radius: 10px !important;\n\tbox-shadow: 2px 2px 0 rgba(46,90,172,0.35) !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"] ._buttonPrimary:active,\nhtml[data-xtcymc-exp=\"notebook\"] ._buttonGradate:active,\nhtml[data-xtcymc-exp=\"notebook\"] ._borderButton:active { transform: translate(2px,2px) !important; box-shadow: 0 0 0 rgba(46,90,172,0.4) !important; }\n/* 输入框：横线纸气质，蓝色底线，聚焦转墨蓝 */\nhtml[data-xtcymc-exp=\"notebook\"] input,\nhtml[data-xtcymc-exp=\"notebook\"] textarea {\n\tborder: 1.5px solid rgba(46,90,172,0.32) !important;\n\tborder-radius: 8px !important;\n\tbackground: #FFFDF5 !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"] input:focus,\nhtml[data-xtcymc-exp=\"notebook\"] textarea:focus { border-color: #2E5AAC !important; }\n/* 标题：手写感，墨蓝，极轻旋转，像手帐里写下的小标题 */\nhtml[data-xtcymc-exp=\"notebook\"] h1,\nhtml[data-xtcymc-exp=\"notebook\"] h2,\nhtml[data-xtcymc-exp=\"notebook\"] h3 {\n\tfont-weight: 700 !important;\n\tcolor: #2E5AAC !important;\n\tletter-spacing: 0.01em !important;\n\tdisplay: inline-block !important;\n\ttransform: rotate(-0.8deg) !important;\n}\n/* 链接：荧光笔黄色高亮下划线（半透明黄色块压在文字下方） */\nhtml[data-xtcymc-exp=\"notebook\"] ._link {\n\tcolor: #2E5AAC !important;\n\ttext-decoration: none !important;\n\tbackground-image: linear-gradient(rgba(255,227,110,0.7), rgba(255,227,110,0.7)) !important;\n\tbackground-repeat: no-repeat !important;\n\tbackground-position: 0 88% !important;\n\tbackground-size: 100% 0.5em !important;\n\tpadding: 0 1px !important;\n}\n/* 头像：圆角 + 墨蓝细边 + 红色小偏移阴影，像贴上去的拍立得 */\nhtml[data-xtcymc-exp=\"notebook\"] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"notebook\"] [class*=\"avatar\"] > img {\n\tborder: 2px solid #FFFDF5 !important;\n\tbox-shadow: 2px 2px 0 rgba(226,87,76,0.4), 0 0 0 1px rgba(58,53,44,0.18) !important;\n}\n/* sticky 页眉：荧光黄纸标签 tab 观感，去玻璃模糊，墨蓝下边线 */\nhtml[data-xtcymc-exp=\"notebook\"] [style*=\"--MI-stickyTop\"] {\n\tbackground: #FFF3C4 !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tborder-bottom: 2px dashed rgba(46,90,172,0.45) !important;\n\tbox-shadow: 0 2px 6px rgba(58,53,44,0.1) !important;\n}\n",
	aggressive: "\n/* ── NOTEBOOK · 手帐 — aggressive: 奶油横线纸 + 红页边竖线 + 网格/点阵 + 和纸胶带与涂鸦星星常驻揭示。半透明表面让横线纸从 gutters/列间/widgets 缝隙常驻透出，正文坐在不透明米白卡片上始终清晰。 ── */\n\n/* 0) 半透明表面：照搬 Synthwave 分层 —— bg 最通透(揭示横线纸)，navBg/pageHeaderBg 偏高 alpha 保证侧栏/页眉文字清晰(浅色主题取 ≥0.88) */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] {\n\t--MI_THEME-bg: rgba(251,248,238,0.42) !important;\n\t--MI_THEME-deckBg: rgba(243,238,221,0.4) !important;\n\t--MI_THEME-navBg: rgba(251,248,238,0.42) !important;\n\t--MI_THEME-pageHeaderBg: rgba(255,243,196,0.90) !important;\n}\n\n/* 1) body 底色：奶油纸 + 红页边竖线 + 淡蓝横格 + 网格/点阵纸，固定铺满视口、随手帐轻轻漂移 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] body {\n\tbackground-color: #FBF8EE !important;\n\tbackground-image:\n\t\tlinear-gradient(90deg, transparent 0, transparent 52px, rgba(226,87,76,0.85) 52px, rgba(226,87,76,0.85) 55px, transparent 55px),\n\t\trepeating-linear-gradient(180deg, transparent 0, transparent 27px, rgba(46,90,172,0.48) 27px, rgba(46,90,172,0.48) 28px),\n\t\tlinear-gradient(180deg, rgba(255,243,196,0.5) 0%, rgba(251,248,238,0) 30%, rgba(243,238,221,0.5) 100%) !important;\n\tbackground-attachment: fixed !important;\n\tbackground-size: auto, auto, 100% 100% !important;\n\tposition: relative !important;\n\tanimation: kf-notebook-rule 16s ease-in-out infinite alternate !important;\n}\n\n/* 2) body::before —— 点阵/网格纸 + 和纸胶带斜贴片(washi tape)装饰层：固定全屏、不挡点击、底层(z-index 0)，缓慢漂移 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] body::before {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tpointer-events: none !important;\n\tz-index: 0 !important;\n\tbackground-image:\n\t\tradial-gradient(circle at 0 0, rgba(46,90,172,0.10) 0 1.4px, transparent 1.8px),\n\t\trepeating-linear-gradient(45deg, rgba(255,227,110,0.30) 0 9px, rgba(255,210,70,0.30) 9px 18px),\n\t\trepeating-linear-gradient(45deg, rgba(255,227,110,0.30) 0 9px, rgba(255,210,70,0.30) 9px 18px),\n\t\trepeating-linear-gradient(-50deg, rgba(46,90,172,0.16) 0 9px, rgba(78,127,208,0.16) 9px 18px) !important;\n\tbackground-repeat: repeat, no-repeat, no-repeat, no-repeat !important;\n\tbackground-size: 22px 22px, 150px 38px, 120px 34px, 130px 36px !important;\n\tbackground-position: 0 0, 4% 14%, 90% 8%, 84% 88% !important;\n\topacity: 0.85 !important;\n\tanimation: kf-notebook-drift 26s ease-in-out infinite alternate !important;\n}\n\n/* 3) body::after —— 手写涂鸦小星星 / 圆点闪烁层：固定全屏、不挡点击、底层(z-index 0)，缓慢明灭 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] body::after {\n\tcontent: \"\" !important;\n\tposition: fixed !important;\n\tinset: 0 !important;\n\tpointer-events: none !important;\n\tz-index: 0 !important;\n\topacity: 0.7 !important;\n\tbackground-image:\n\t\tradial-gradient(circle at 12% 22%, rgba(226,87,76,0.50) 0 2.4px, transparent 3.2px),\n\t\tradial-gradient(circle at 84% 30%, rgba(46,90,172,0.45) 0 2.4px, transparent 3.2px),\n\t\tradial-gradient(circle at 68% 78%, rgba(224,162,28,0.55) 0 2.4px, transparent 3.2px),\n\t\tradial-gradient(circle at 28% 84%, rgba(46,90,172,0.40) 0 1.8px, transparent 2.6px),\n\t\tradial-gradient(circle at 50% 16%, rgba(226,87,76,0.38) 0 1.8px, transparent 2.6px),\n\t\tradial-gradient(circle at 38% 52%, rgba(44,156,106,0.4) 0 1.8px, transparent 2.6px) !important;\n\tbackground-repeat: no-repeat !important;\n\tanimation: kf-notebook-twinkle 5.5s ease-in-out infinite !important;\n}\n\n/* 4) 面板：保持可读(实色米白) —— 贴纸 WOBBLE，hover 时左右摇摆像撕下的便签晃动，顶部和纸胶带保留 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._panel {\n\tbackground: #FFFDF5 !important;\n\tposition: relative !important;\n\tz-index: 1 !important;\n\ttransition: transform .2s ease, box-shadow .2s ease !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._panel:nth-child(even) { transform: rotate(0.5deg) !important; }\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._panel:hover {\n\tbox-shadow: 3px 7px 16px rgba(58,53,44,0.2) !important;\n\tanimation: kf-notebook-wobble 0.6s ease-in-out !important;\n\tz-index: 3 !important;\n}\n\n/* 5) 弹层/卡片：保持可读，实色米白 + 不透明 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._popup,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._acrylic {\n\tbackground: #FFFDF5 !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tposition: relative !important;\n\tz-index: 1 !important;\n}\n\n/* 6) 帖子卡片：纸片便签，米白底坐稳；hover 时纸片轻轻抬起 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] article {\n\tbackground: #FFFDF5 !important;\n\tposition: relative !important;\n\tz-index: 1 !important;\n\ttransition: transform .18s ease !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] article:hover {\n\ttransform: rotate(-0.4deg) translateY(-2px) !important;\n}\n\n/* 7) 链接：荧光笔黄色高亮从左向右 SWEEP 涂满 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._link {\n\tbackground-image: linear-gradient(rgba(255,227,110,0.75), rgba(255,227,110,0.75)) !important;\n\tbackground-repeat: no-repeat !important;\n\tbackground-position: 0 88% !important;\n\tbackground-size: 0% 0.55em !important;\n\ttransition: background-size .35s cubic-bezier(0.22,1,0.36,1) !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._link:hover {\n\tbackground-size: 100% 0.55em !important;\n}\n\n/* 8) 标题：钢笔 DRAW —— 标题下方一条墨蓝下划线从 0 生长到满宽，并伴荧光笔扫过的色块 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] h1,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] h2,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] h3 {\n\tposition: relative !important;\n\tbackground-image: linear-gradient(rgba(255,227,110,0.55), rgba(255,227,110,0.55)) !important;\n\tbackground-repeat: no-repeat !important;\n\tbackground-position: -8% 92% !important;\n\tbackground-size: 0% 0.5em !important;\n\tanimation: kf-notebook-highlight 6s ease-in-out infinite !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] h1::after,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] h2::after,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] h3::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important;\n\tleft: 0 !important;\n\tbottom: -3px !important;\n\theight: 2.5px !important;\n\twidth: 100% !important;\n\tbackground: #2E5AAC !important;\n\tborder-radius: 2px !important;\n\ttransform-origin: left center !important;\n\ttransform: scaleX(0) !important;\n\tanimation: kf-notebook-pendraw 6s ease-in-out infinite !important;\n\tpointer-events: none !important;\n}\n\n/* 9) 主按钮：墨蓝硬阴影柔和呼吸，hover 时贴纸弹跳 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._buttonPrimary,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._buttonGradate {\n\tanimation: kf-notebook-breathe 3.4s ease-in-out infinite !important;\n\ttransition: transform .14s ease !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._buttonPrimary:hover,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._buttonGradate:hover,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tanimation: kf-notebook-bounce 0.5s ease !important;\n}\n\n/* 10) 描边按钮 hover：虚线\"涂鸦\"边框 MARCH 行进 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._borderButton:hover {\n\tbackground-image:\n\t\tlinear-gradient(90deg, #2E5AAC 60%, transparent 40%),\n\t\tlinear-gradient(90deg, #2E5AAC 60%, transparent 40%),\n\t\tlinear-gradient(0deg, #2E5AAC 60%, transparent 40%),\n\t\tlinear-gradient(0deg, #2E5AAC 60%, transparent 40%) !important;\n\tbackground-repeat: repeat-x, repeat-x, repeat-y, repeat-y !important;\n\tbackground-size: 10px 2px, 10px 2px, 2px 10px, 2px 10px !important;\n\tbackground-position: 0 0, 0 100%, 0 0, 100% 0 !important;\n\tanimation: kf-notebook-march 0.7s linear infinite !important;\n}\n\n/* 11) 输入框聚焦：墨蓝柔光，像刚写下的钢笔字 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] input:focus,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] textarea:focus {\n\tbox-shadow: 0 0 0 2px rgba(46,90,172,0.25), 2px 2px 0 rgba(46,90,172,0.18) !important;\n}\n\n/* 12) 头像 hover：拍立得贴纸轻轻弹跳旋转 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] img[class*=\"avatar\"],\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img {\n\ttransition: transform .16s ease !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] img[class*=\"avatar\"]:hover,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] [class*=\"avatar\"] > img:hover {\n\tanimation: kf-notebook-bounce 0.55s ease !important;\n}\n\n/* 13) 角标 / 计数：红色便签贴纸轻轻摆动 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._indicateCounter,\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] ._indicatorCircle {\n\tanimation: kf-notebook-wobble 2.4s ease-in-out infinite !important;\n}\n\n/* 14) sticky 页眉：保持可读底，纸标签底部虚线像被钢笔反复描画，缓慢行进 */\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"] {\n\tbackground: rgba(255,243,196,0.92) !important;\n\t-webkit-backdrop-filter: none !important; backdrop-filter: none !important;\n\tposition: relative !important;\n\toverflow: hidden !important;\n\tz-index: 1 !important;\n}\nhtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] [style*=\"--MI-stickyTop\"]::after {\n\tcontent: \"\" !important;\n\tposition: absolute !important;\n\tleft: 0 !important; right: 0 !important; bottom: 0 !important;\n\theight: 2px !important;\n\tpointer-events: none !important;\n\tz-index: 4 !important;\n\tbackground: repeating-linear-gradient(90deg, #2E5AAC 0 12px, transparent 12px 20px) !important;\n\tbackground-size: 20px 2px !important;\n\tanimation: kf-notebook-dash 7s linear infinite !important;\n}\n\n/* ── keyframes（全局唯一，kf-notebook- 前缀） ── */\n@keyframes kf-notebook-rule {\n\t0%   { background-position: 0 0, 0 0, 0 0; }\n\t100% { background-position: 0 0, 0 6px, 0 0; }\n}\n@keyframes kf-notebook-drift {\n\t0%   { background-position: 0 0, 4% 14%, 90% 8%, 84% 88%; }\n\t100% { background-position: 22px 22px, 6% 16%, 88% 10%, 82% 86%; }\n}\n@keyframes kf-notebook-twinkle {\n\t0%, 100% { opacity: 0.35; }\n\t50%      { opacity: 0.85; }\n}\n@keyframes kf-notebook-wobble {\n\t0%   { transform: rotate(-0.4deg); }\n\t25%  { transform: rotate(1.6deg); }\n\t50%  { transform: rotate(-1.2deg); }\n\t75%  { transform: rotate(0.9deg); }\n\t100% { transform: rotate(-0.4deg); }\n}\n@keyframes kf-notebook-pendraw {\n\t0%   { transform: scaleX(0); }\n\t30%  { transform: scaleX(1); }\n\t85%  { transform: scaleX(1); }\n\t100% { transform: scaleX(0); }\n}\n@keyframes kf-notebook-highlight {\n\t0%   { background-size: 0% 0.5em; }\n\t30%  { background-size: 100% 0.5em; }\n\t85%  { background-size: 100% 0.5em; }\n\t100% { background-size: 0% 0.5em; }\n}\n@keyframes kf-notebook-breathe {\n\t0%, 100% { box-shadow: 2px 2px 0 rgba(46,90,172,0.5); }\n\t50%      { box-shadow: 2px 2px 0 rgba(46,90,172,0.5), 0 0 12px rgba(46,90,172,0.3); }\n}\n@keyframes kf-notebook-bounce {\n\t0%   { transform: translateY(0) rotate(0deg) scale(1); }\n\t35%  { transform: translateY(-4px) rotate(-3deg) scale(1.05); }\n\t65%  { transform: translateY(-1px) rotate(2deg) scale(1.02); }\n\t100% { transform: translateY(0) rotate(0deg) scale(1); }\n}\n@keyframes kf-notebook-march {\n\tto { background-position: 200% 0, 0 200%, 0 0, 100% 100%; }\n}\n@keyframes kf-notebook-dash {\n\t0%   { background-position: 0 0; }\n\t100% { background-position: 20px 0; }\n}\n\n/* ── 动效安全：尊重 prefers-reduced-motion ── */\n@media (prefers-reduced-motion: reduce){\n\thtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] *{ animation: none !important; }\n\thtml[data-xtcymc-exp=\"notebook\"][data-xtcymc-exp-bg] body{ animation: none !important; }\n}\n",
};

const THEMES: ExpTheme[] = [NEWSPRINT, TERMINAL, GLASS, BRUTALIST, SYNTHWAVE, AURORA, EINK, RISO, COMIC, BLUEPRINT, SOLARPUNK, DECO, STEAM, HOLO, AQUA, NOTEBOOK];

function buildCss(t: ExpTheme): string {
	const base = t.scheme === 'dark' ? BASE_DARK : BASE_LIGHT;
	const merged: Palette = { ...base, ...t.palette };
	const decls = Object.entries(merged)
		.map(([k, v]) => `\t--MI_THEME-${k}: ${v} !important;`)
		.join('\n');
	const vars =
		`html[data-xtcymc-exp="${t.id}"] {\n${decls}\n` +
		`\t--MI-radius: ${t.radius} !important;\n` +
		`\t--MI-margin: ${t.margin} !important;\n` +
		`\t--MI-blur: ${t.blur} !important;\n` +
		`\t--MI-modalBgFilter: ${t.modalBgFilter} !important;\n` +
		`\tcolor-scheme: ${t.scheme} !important;\n}`;
	const X = `html[data-xtcymc-exp="${t.id}"]`;
	// 通用守卫：启动台(MkLaunchPad .szkkfdyq)与弹出菜单(._popup)的条目统一主题化 ——
	// 文字用 fg、图标用 accent，让"动作型按钮"(查询/关于/工具/重新加载/清除缓存/切换界面 的菜单等)
	// 与"链接型"条目表现一致；并强制 text-fill/背景裁剪复位，杜绝任何主题让条目文字透明看不见。
	const guard =
		`${X} .szkkfdyq .item, ${X} .szkkfdyq .item .text,\n` +
		`${X} ._popup .item, ${X} ._popup .item .text {\n` +
		`\tcolor: var(--MI_THEME-fg) !important; -webkit-text-fill-color: var(--MI_THEME-fg) !important;\n` +
		`\tbackground-image: none !important; -webkit-background-clip: border-box !important; background-clip: border-box !important;\n}\n` +
		`${X} .szkkfdyq .item .icon, ${X} ._popup .item .icon {\n` +
		`\tcolor: var(--MI_THEME-accent) !important; -webkit-text-fill-color: var(--MI_THEME-accent) !important;\n}\n` +
		// 弹出菜单里的任意 a/button 都不允许透明文字（holo 等渐变裁剪保险）
		`${X} ._popup a, ${X} ._popup button, ${X} .szkkfdyq a, ${X} .szkkfdyq button {\n` +
		`\t-webkit-text-fill-color: currentColor !important; -webkit-background-clip: border-box !important; background-clip: border-box !important;\n}`;
	// aggressive 块已自带 [data-xtcymc-exp-bg] 作用域，常驻注入，靠 html 上是否有该属性来开关
	return `${vars}\n${t.structural}\n${t.aggressive ?? ''}\n${guard}`;
}

export const EXPERIMENTAL_THEMES: {
	id: ExperimentalThemeId;
	name: string;
	tagline: string;
	icon: string;
	css: string;
}[] = THEMES.map(t => ({ id: t.id, name: t.name, tagline: t.tagline, icon: t.icon, css: buildCss(t) }));

/**
 * 把指定实验性主题立刻应用到 document。
 * @param id 主题 id；null/非法即清除
 * @param bg 是否开启「背景与动效」（在 html 上加 data-xtcymc-exp-bg，激活常驻的 aggressive 规则）
 * 幂等。
 */
export function applyExperimentalTheme(id: string | null | undefined, bg = false): void {
	const theme = id == null ? null : EXPERIMENTAL_THEMES.find(t => t.id === id) ?? null;
	const html = document.documentElement;
	const existing = document.getElementById(STYLE_TAG_ID);

	if (theme == null) {
		if (existing) existing.remove();
		html.removeAttribute('data-xtcymc-exp');
		html.removeAttribute(BG_ATTR);
		return;
	}

	html.setAttribute('data-xtcymc-exp', theme.id);
	applyExperimentalBgAttr(bg);

	if (existing) {
		if (existing.getAttribute('data-xtcymc-exp-id') !== theme.id) {
			existing.textContent = theme.css;
			existing.setAttribute('data-xtcymc-exp-id', theme.id);
		}
		return;
	}

	const style = document.createElement('style');
	style.id = STYLE_TAG_ID;
	style.setAttribute('data-xtcymc-exp-id', theme.id);
	style.textContent = theme.css;
	document.head.appendChild(style);
}

/** 仅切换 html 上的背景/动效属性（aggressive CSS 常驻，靠该属性即时开关，无需 reload）。 */
function applyExperimentalBgAttr(on: boolean): void {
	const html = document.documentElement;
	if (on) html.setAttribute(BG_ATTR, '1');
	else html.removeAttribute(BG_ATTR);
}

/** 从 localStorage 读取已保存的实验性主题 id（_boot_.ts 同步调用，避免首屏闪烁）。 */
export function readSavedExperimentalTheme(): string | null {
	try {
		return localStorage.getItem(EXPERIMENTAL_THEME_KEY);
	} catch {
		return null;
	}
}

/** 从 localStorage 读取「背景与动效」是否开启。 */
export function readSavedExperimentalBg(): boolean {
	try {
		return localStorage.getItem(EXPERIMENTAL_BG_KEY) === '1';
	} catch {
		return false;
	}
}

/** 持久化实验性主题选择并立即应用（沿用当前的背景/动效开关）。调用方负责按需 reload。 */
export function setExperimentalTheme(id: ExperimentalThemeId | null): void {
	try {
		if (id == null) localStorage.removeItem(EXPERIMENTAL_THEME_KEY);
		else localStorage.setItem(EXPERIMENTAL_THEME_KEY, id);
	} catch { /* localStorage 不可用时静默忽略 */ }
	applyExperimentalTheme(id, readSavedExperimentalBg());
}

/** 持久化并即时切换「背景与动效」开关（纯 CSS，无需 reload）。 */
export function setExperimentalBg(on: boolean): void {
	try {
		if (on) localStorage.setItem(EXPERIMENTAL_BG_KEY, '1');
		else localStorage.removeItem(EXPERIMENTAL_BG_KEY);
	} catch { /* ignore */ }
	applyExperimentalBgAttr(on);
}
