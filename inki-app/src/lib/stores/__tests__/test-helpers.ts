/**
 * Shared test helpers for store unit tests.
 * Provides timer-advancing utilities and localStorage mock state resets.
 */
import { vi } from 'vitest';

// ---------------------------------------------------------------------------
// localStorage mock helpers
// ---------------------------------------------------------------------------

/**
 * Resets the in-memory localStorage mock to an empty state.
 * Call this in beforeEach to ensure test isolation.
 */
export function resetLocalStorage(): void {
	localStorage.clear();
}

/**
 * Seeds localStorage with a serialized notes payload.
 * Useful for pre-populating state before importing the store module.
 */
export function seedLocalStorage(payload: object): void {
	localStorage.setItem('inki-notes', JSON.stringify(payload));
}

/**
 * Reads and parses the current 'inki-notes' localStorage value.
 * Returns null if the key is absent or the value is not valid JSON.
 */
export function readStoragePayload(): { notes: unknown[]; selectedNoteId: string | null } | null {
	try {
		const raw = localStorage.getItem('inki-notes');
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}

// ---------------------------------------------------------------------------
// Timer helpers
// ---------------------------------------------------------------------------

/**
 * Advances fake timers by the given number of milliseconds and flushes
 * any pending microtasks.  Requires `vi.useFakeTimers()` to be active.
 */
export async function advanceTimersByMs(ms: number): Promise<void> {
	vi.advanceTimersByTime(ms);
	// Flush microtasks so that any Promise-based work triggered by the
	// timer callbacks is also settled before assertions run.
	await Promise.resolve();
}

/**
 * Flushes all pending fake timers (runs all setTimeout/setInterval callbacks
 * that are currently queued) and settles microtasks.
 */
export async function flushTimers(): Promise<void> {
	vi.runAllTimers();
	await Promise.resolve();
}
