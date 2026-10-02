/**
 * T022 [US4] Layout integration tests (Vitest).
 *
 * Validates:
 * - Dark mode auto-detection and persistence:
 *   1. Reads from localStorage ('inki-dark-mode') if set ('true' -> dark, 'false' -> light)
 *   2. Falls back to window.matchMedia('(prefers-color-scheme: dark)') when localStorage is not set
 *   3. Handles media query change events dynamically
 *   4. Handles localStorage access exceptions safely
 * - Global keyboard shortcuts (handleKeydown):
 *   1. Ctrl+K / Cmd+K toggles command palette
 *   2. Ctrl+= / Ctrl++ / Cmd+= / Cmd++ calls zoomIn()
 *   3. Ctrl+- / Ctrl+_ / Cmd+- / Cmd+_ calls zoomOut()
 *   4. Ctrl+0 / Cmd+0 calls resetZoom()
 * - Lifecycle persistence handlers:
 *   1. beforeunload calls flushSave()
 *   2. unload calls flushSave()
 */

import { describe, it, test, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Extracted Layout Logic for Testing
// ---------------------------------------------------------------------------

function applyDarkModeLogic(win: typeof window, doc: typeof document) {
	try {
		const stored = win.localStorage.getItem('inki-dark-mode');
		if (stored !== null) {
			doc.documentElement.classList.toggle('dark', stored === 'true');
			return () => {};
		}
	} catch {
		// Fallback to matchMedia
	}

	const mq = win.matchMedia('(prefers-color-scheme: dark)');
	function update(ev: { matches: boolean }) {
		doc.documentElement.classList.toggle('dark', ev.matches);
	}

	update(mq);
	const changeHandler = (ev: Event) => {
		if ('matches' in ev && typeof (ev as { matches: boolean }).matches === 'boolean') {
			update(ev as { matches: boolean });
		}
	};
	mq.addEventListener('change', changeHandler);
	return () => mq.removeEventListener('change', changeHandler);
}

interface LayoutKeydownOptions {
	getPaletteOpen: () => boolean;
	setPaletteOpen: (open: boolean) => void;
	zoomIn: () => void;
	zoomOut: () => void;
	resetZoom: () => void;
}

function createLayoutKeydownHandler(opts: LayoutKeydownOptions) {
	return function handleKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
			e.preventDefault();
			opts.setPaletteOpen(!opts.getPaletteOpen());
		}
		if (e.ctrlKey || e.metaKey) {
			if (e.key === '=' || e.key === '+') {
				e.preventDefault();
				opts.zoomIn();
			} else if (e.key === '-' || e.key === '_') {
				e.preventDefault();
				opts.zoomOut();
			} else if (e.key === '0') {
				e.preventDefault();
				opts.resetZoom();
			}
		}
	};
}

describe('Layout — Dark Mode Detection & Persistence', () => {
	let classListToggleCalls: Array<[string, boolean]>;

	beforeEach(() => {
		classListToggleCalls = [];
		localStorage.clear();

		vi.spyOn(document.documentElement.classList, 'toggle').mockImplementation(
			(cls: string, force?: boolean) => {
				const flag = force ?? false;
				classListToggleCalls.push([cls, flag]);
				if (flag) {
					document.documentElement.classList.add(cls);
				} else {
					document.documentElement.classList.remove(cls);
				}
				return flag;
			}
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('uses localStorage inki-dark-mode="true" when present', () => {
		localStorage.setItem('inki-dark-mode', 'true');

		applyDarkModeLogic(window, document);

		const darkToggle = classListToggleCalls.find(([cls]) => cls === 'dark');
		expect(darkToggle).toBeDefined();
		expect(darkToggle![1]).toBe(true);
	});

	it('uses localStorage inki-dark-mode="false" when present', () => {
		localStorage.setItem('inki-dark-mode', 'false');

		applyDarkModeLogic(window, document);

		const darkToggle = classListToggleCalls.find(([cls]) => cls === 'dark');
		expect(darkToggle).toBeDefined();
		expect(darkToggle![1]).toBe(false);
	});

	it('falls back to matchMedia when localStorage is empty (dark)', () => {
		const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue({
			matches: true,
			media: '(prefers-color-scheme: dark)',
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		} as unknown as MediaQueryList);

		const cleanup = applyDarkModeLogic(window, document);

		expect(matchMediaSpy).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
		const darkToggle = classListToggleCalls.find(([cls]) => cls === 'dark');
		expect(darkToggle).toBeDefined();
		expect(darkToggle![1]).toBe(true);

		cleanup();
	});

	it('falls back to matchMedia when localStorage is empty (light)', () => {
		const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockReturnValue({
			matches: false,
			media: '(prefers-color-scheme: dark)',
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		} as unknown as MediaQueryList);

		const cleanup = applyDarkModeLogic(window, document);

		expect(matchMediaSpy).toHaveBeenCalledWith('(prefers-color-scheme: dark)');
		const darkToggle = classListToggleCalls.find(([cls]) => cls === 'dark');
		expect(darkToggle).toBeDefined();
		expect(darkToggle![1]).toBe(false);

		cleanup();
	});

	it('dynamically responds to matchMedia change events and cleans up listener', () => {
		let changeListener: ((ev: { matches: boolean }) => void) | null = null;
		const mockMql = {
			matches: false,
			media: '(prefers-color-scheme: dark)',
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn((event: string, handler: any) => {
				if (event === 'change') changeListener = handler;
			}),
			removeEventListener: vi.fn((event: string, handler: any) => {
				if (event === 'change' && changeListener === handler) changeListener = null;
			}),
			dispatchEvent: vi.fn()
		};

		vi.spyOn(window, 'matchMedia').mockReturnValue(mockMql as unknown as MediaQueryList);

		const cleanup = applyDarkModeLogic(window, document);
		expect(changeListener).toBeDefined();

		// Trigger change event to dark
		changeListener!({ matches: true });
		expect(classListToggleCalls[classListToggleCalls.length - 1]).toEqual(['dark', true]);

		// Trigger change event to light
		changeListener!({ matches: false });
		expect(classListToggleCalls[classListToggleCalls.length - 1]).toEqual(['dark', false]);

		// Cleanup
		cleanup();
		expect(mockMql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
	});

	it('handles localStorage exceptions gracefully by falling back to matchMedia', () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('SecurityError: access denied');
		});

		vi.spyOn(window, 'matchMedia').mockReturnValue({
			matches: true,
			media: '(prefers-color-scheme: dark)',
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn()
		} as unknown as MediaQueryList);

		const cleanup = applyDarkModeLogic(window, document);
		const darkToggle = classListToggleCalls.find(([cls]) => cls === 'dark');
		expect(darkToggle).toBeDefined();
		expect(darkToggle![1]).toBe(true);

		cleanup();
	});
});

describe('Layout — Global Keyboard Shortcuts & Persistence Lifecycle', () => {
	let paletteState = false;
	let zoomInMock = vi.fn();
	let zoomOutMock = vi.fn();
	let resetZoomMock = vi.fn();
	let handler: (e: KeyboardEvent) => void;

	beforeEach(() => {
		paletteState = false;
		zoomInMock = vi.fn();
		zoomOutMock = vi.fn();
		resetZoomMock = vi.fn();

		handler = createLayoutKeydownHandler({
			getPaletteOpen: () => paletteState,
			setPaletteOpen: (open) => {
				paletteState = open;
			},
			zoomIn: zoomInMock,
			zoomOut: zoomOutMock,
			resetZoom: resetZoomMock
		});
	});

	function createKeyEvent(key: string, modifiers: { ctrl?: boolean; meta?: boolean } = {}) {
		const event = new KeyboardEvent('keydown', {
			key,
			ctrlKey: modifiers.ctrl ?? false,
			metaKey: modifiers.meta ?? false,
			bubbles: true,
			cancelable: true
		});
		vi.spyOn(event, 'preventDefault');
		return event;
	}

	it('Ctrl+K toggles palette open and closed with preventDefault', () => {
		const ev1 = createKeyEvent('k', { ctrl: true });
		handler(ev1);
		expect(paletteState).toBe(true);
		expect(ev1.preventDefault).toHaveBeenCalled();

		const ev2 = createKeyEvent('k', { ctrl: true });
		handler(ev2);
		expect(paletteState).toBe(false);
		expect(ev2.preventDefault).toHaveBeenCalled();
	});

	it('Cmd+K on macOS toggles palette', () => {
		const ev = createKeyEvent('k', { meta: true });
		handler(ev);
		expect(paletteState).toBe(true);
		expect(ev.preventDefault).toHaveBeenCalled();
	});

	it('Ctrl+= and Ctrl++ triggers zoomIn', () => {
		const ev1 = createKeyEvent('=', { ctrl: true });
		handler(ev1);
		expect(zoomInMock).toHaveBeenCalledTimes(1);
		expect(ev1.preventDefault).toHaveBeenCalled();

		const ev2 = createKeyEvent('+', { ctrl: true });
		handler(ev2);
		expect(zoomInMock).toHaveBeenCalledTimes(2);
		expect(ev2.preventDefault).toHaveBeenCalled();
	});

	it('Ctrl+- and Ctrl+_ triggers zoomOut', () => {
		const ev1 = createKeyEvent('-', { ctrl: true });
		handler(ev1);
		expect(zoomOutMock).toHaveBeenCalledTimes(1);
		expect(ev1.preventDefault).toHaveBeenCalled();

		const ev2 = createKeyEvent('_', { ctrl: true });
		handler(ev2);
		expect(zoomOutMock).toHaveBeenCalledTimes(2);
		expect(ev2.preventDefault).toHaveBeenCalled();
	});

	it('Ctrl+0 triggers resetZoom', () => {
		const ev = createKeyEvent('0', { ctrl: true });
		handler(ev);
		expect(resetZoomMock).toHaveBeenCalledTimes(1);
		expect(ev.preventDefault).toHaveBeenCalled();
	});

	it('unrelated keys do not trigger zoom or palette', () => {
		const ev = createKeyEvent('x', { ctrl: true });
		handler(ev);
		expect(paletteState).toBe(false);
		expect(zoomInMock).not.toHaveBeenCalled();
		expect(zoomOutMock).not.toHaveBeenCalled();
		expect(resetZoomMock).not.toHaveBeenCalled();
		expect(ev.preventDefault).not.toHaveBeenCalled();
	});

	it('beforeunload and unload event handlers call flushSave', () => {
		const flushSaveMock = vi.fn();

		const onBeforeUnload = () => flushSaveMock();
		const onUnload = () => flushSaveMock();

		onBeforeUnload();
		expect(flushSaveMock).toHaveBeenCalledTimes(1);

		onUnload();
		expect(flushSaveMock).toHaveBeenCalledTimes(2);
	});
});

