import { describe, it, expect } from 'vitest';
import {
	splitGraphemes,
	resolveAccessibleLabel,
	stepTickerValue,
	type FancyTextConfig
} from '../fancy-text.ts';

describe('splitGraphemes', () => {
	it('returns an empty array for an empty string', () => {
		expect(splitGraphemes('')).toEqual([]);
	});

	it('splits ASCII characters and converts spaces to non-breaking spaces with isWhitespace true', () => {
		const tokens = splitGraphemes('New Note');
		expect(tokens).toHaveLength(8);
		expect(tokens[0]).toEqual({ index: 0, displayChar: 'N', isWhitespace: false });
		expect(tokens[3]).toEqual({ index: 3, displayChar: '\u00A0', isWhitespace: true });
		expect(tokens[4]).toEqual({ index: 4, displayChar: 'N', isWhitespace: false });
		expect(tokens[7]).toEqual({ index: 7, displayChar: 'e', isWhitespace: false });
	});

	it('preserves multi-codepoint emoji grapheme clusters as single tokens', () => {
		const tokens = splitGraphemes('Hi 👋🏽!');
		expect(tokens.map((t) => t.displayChar)).toEqual(['H', 'i', '\u00A0', '👋🏽', '!']);
		expect(tokens.map((t) => t.index)).toEqual([0, 1, 2, 3, 4]);
	});
});

describe('resolveAccessibleLabel', () => {
	it('returns full text for letter-swap mode', () => {
		const config: FancyTextConfig = { mode: 'letter-swap', text: 'Create New Note' };
		expect(resolveAccessibleLabel(config)).toBe('Create New Note');
	});

	it('returns full text for breathing mode', () => {
		const config: FancyTextConfig = { mode: 'breathing', text: 'No note selected' };
		expect(resolveAccessibleLabel(config)).toBe('No note selected');
	});

	it('returns the active phrase for rotate mode and clamps out-of-range indices', () => {
		const config: FancyTextConfig = {
			mode: 'rotate',
			words: ['First tip', 'Second tip', 'Third tip']
		};
		expect(resolveAccessibleLabel(config, 0)).toBe('First tip');
		expect(resolveAccessibleLabel(config, 1)).toBe('Second tip');
		expect(resolveAccessibleLabel(config, 2)).toBe('Third tip');
		expect(resolveAccessibleLabel(config, -4)).toBe('First tip');
		expect(resolveAccessibleLabel(config, 99)).toBe('Third tip');
	});
});

describe('stepTickerValue', () => {
	it('clamps progress below 0 to the starting value and above 1 to the target value', () => {
		expect(stepTickerValue(100, 150, -0.5)).toBe(100);
		expect(stepTickerValue(100, 150, 0)).toBe(100);
		expect(stepTickerValue(100, 150, 1)).toBe(150);
		expect(stepTickerValue(100, 150, 1.5)).toBe(150);
	});

	it('applies cubic-out easing at the midpoint', () => {
		expect(stepTickerValue(100, 200, 0.5)).toBe(188);
		expect(stepTickerValue(200, 100, 0.5)).toBe(113);
	});

	it('rounds to the requested decimal precision', () => {
		expect(stepTickerValue(0, 10, 0.5, 2)).toBe(8.75);
	});
});
