export type FancyTextMode = 'letter-swap' | 'breathing' | 'rotate';

export interface LetterSwapConfig {
	readonly mode: 'letter-swap';
	readonly text: string;
	readonly staggerMs?: number;
	readonly direction?: 'up' | 'down';
}

export interface BreathingTextConfig {
	readonly mode: 'breathing';
	readonly text: string;
	readonly staggerMs?: number;
	readonly durationMs?: number;
}

export interface TextRotateConfig {
	readonly mode: 'rotate';
	readonly words: readonly [string, ...string[]];
	readonly intervalMs?: number;
}

export type FancyTextConfig =
	| LetterSwapConfig
	| BreathingTextConfig
	| TextRotateConfig;

export interface GraphemeToken {
	readonly index: number;
	readonly displayChar: string;
	readonly isWhitespace: boolean;
}

export function splitGraphemes(text: string): readonly GraphemeToken[] {
	if (!text) return [];

	const rawSegments: string[] =
		typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
			? Array.from(new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(text), (s) => s.segment)
			: Array.from(text);

	return rawSegments.map((segment, index) => {
		const isWhitespace = /^\s+$/.test(segment);
		return {
			index,
			// Non-breaking space prevents inline-block character spans from collapsing to zero width.
			displayChar: isWhitespace ? '\u00A0' : segment,
			isWhitespace
		};
	});
}

export function resolveAccessibleLabel(
	config: FancyTextConfig,
	activeWordIndex: number = 0
): string {
	if (config.mode === 'rotate') {
		const maxIndex = config.words.length - 1;
		const clamped = Math.max(0, Math.min(Math.trunc(activeWordIndex), maxIndex));
		return config.words[clamped];
	}
	return config.text;
}

export function stepTickerValue(
	from: number,
	to: number,
	t: number,
	decimals: number = 0
): number {
	const clampedT = Math.max(0, Math.min(1, t));
	const eased = 1 - Math.pow(1 - clampedT, 3);
	const raw = from + (to - from) * eased;
	const factor = Math.pow(10, Math.max(0, Math.trunc(decimals)));
	return Math.round(raw * factor) / factor;
}
