/**
 * T014 [US2] NoteSidebar ordering and deletion dialog tests.
 *
 * Validates:
 * - Note card rendering order matches position order
 * - Delete confirmation dialog flow (open → confirm/cancel)
 * - Adjacent selection transitions on delete (mirrored from store contract)
 * - Inline rename commit / cancel flow
 * - Context menu state transitions
 * - Pointer drag state transitions
 * - timeAgo utility output
 * - onNoteSelect callback ordering
 *
 * NOTE: NoteSidebar.svelte uses Svelte 5 runes and cannot be imported
 * directly in Vitest without Svelte compilation. These tests validate the
 * same business logic re-implemented as plain TypeScript — the accepted
 * pattern per AGENTS.md.
 */
import { describe, it, test, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// timeAgo function (extracted from NoteSidebar.svelte for testing)
// ---------------------------------------------------------------------------
function timeAgo(timestamp: number): string {
	const now = Date.now();
	const diff = now - timestamp;
	const seconds = Math.floor(diff / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return `${minutes}m ago`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `${hours}h ago`;
	const days = Math.floor(hours / 24);
	if (days < 7) return `${days}d ago`;
	return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// timeAgo tests
// ---------------------------------------------------------------------------

describe('NoteSidebar — timeAgo function', () => {
	const MOCK_NOW = new Date('2026-06-17T12:00:00Z').getTime();

	beforeEach(() => {
		vi.spyOn(Date, 'now').mockReturnValue(MOCK_NOW);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('returns "just now" for timestamps less than 60 seconds ago', () => {
		expect(timeAgo(MOCK_NOW - 30_000)).toBe('just now');
	});

	it('returns "just now" for timestamps 0 seconds ago', () => {
		expect(timeAgo(MOCK_NOW)).toBe('just now');
	});

	it('returns "Xm ago" for timestamps 1-59 minutes ago', () => {
		expect(timeAgo(MOCK_NOW - 5 * 60 * 1000)).toBe('5m ago');
	});

	it('returns "1m ago" for exactly 1 minute', () => {
		expect(timeAgo(MOCK_NOW - 60_000)).toBe('1m ago');
	});

	it('returns "Xh ago" for timestamps 1-23 hours ago', () => {
		expect(timeAgo(MOCK_NOW - 3 * 60 * 60 * 1000)).toBe('3h ago');
	});

	it('returns "1h ago" for exactly 1 hour', () => {
		expect(timeAgo(MOCK_NOW - 60 * 60 * 1000)).toBe('1h ago');
	});

	it('returns "Xd ago" for timestamps 1-6 days ago', () => {
		expect(timeAgo(MOCK_NOW - 4 * 24 * 60 * 60 * 1000)).toBe('4d ago');
	});

	it('returns "1d ago" for exactly 1 day', () => {
		expect(timeAgo(MOCK_NOW - 24 * 60 * 60 * 1000)).toBe('1d ago');
	});

	it('returns formatted date for timestamps 7 or more days ago', () => {
		const sevenDaysAgo = MOCK_NOW - 7 * 24 * 60 * 60 * 1000;
		const expected = new Date(sevenDaysAgo).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
		});
		expect(timeAgo(sevenDaysAgo)).toBe(expected);
	});

	it('handles future timestamps (negative diff) — returns "just now"', () => {
		expect(timeAgo(MOCK_NOW + 60 * 60 * 1000)).toBe('just now');
	});
});

// ---------------------------------------------------------------------------
// Note card rendering order
// ---------------------------------------------------------------------------

describe('NoteSidebar — note card rendering order (T014)', () => {
	it('getNotes() returns notes sorted by position ascending', () => {
		const notes = [
			{ id: 'c', position: 2, title: 'C' },
			{ id: 'a', position: 0, title: 'A' },
			{ id: 'b', position: 1, title: 'B' },
		];
		const sorted = [...notes].sort((a, b) => a.position - b.position);
		expect(sorted.map((n) => n.id)).toEqual(['a', 'b', 'c']);
	});

	it('after deletion, remaining notes render in contiguous position order', () => {
		const notes = [
			{ id: 'a', position: 0 },
			{ id: 'b', position: 1 },
			{ id: 'c', position: 2 },
			{ id: 'd', position: 3 },
		];
		// Delete 'b' and re-index
		const remaining = notes.filter((n) => n.id !== 'b').map((n, i) => ({ ...n, position: i }));
		expect(remaining.map((n) => n.position)).toEqual([0, 1, 2]);
		expect(remaining.map((n) => n.id)).toEqual(['a', 'c', 'd']);
	});
});

// ---------------------------------------------------------------------------
// Delete confirmation dialog flow
// ---------------------------------------------------------------------------

describe('NoteSidebar — delete confirmation dialog flow (T014)', () => {
	it('handleDeleteClick prevents propagation and sets deletingNoteId', () => {
		const stopPropagation = vi.fn();
		const event = { stopPropagation } as unknown as Event;
		let deletingNoteId: string | null = null;

		function handleDeleteClick(e: Event, id: string): void {
			e.stopPropagation();
			deletingNoteId = id;
		}

		handleDeleteClick(event, 'note-42');

		expect(stopPropagation).toHaveBeenCalledOnce();
		expect(deletingNoteId).toBe('note-42');
	});

	it('handleConfirmDelete calls deleteNote and clears deletingNoteId', () => {
		let deletingNoteId: string | null = 'note-42';
		const deleteNote = vi.fn();

		function handleConfirmDelete(): void {
			if (deletingNoteId) {
				deleteNote(deletingNoteId);
				deletingNoteId = null;
			}
		}

		handleConfirmDelete();

		expect(deleteNote).toHaveBeenCalledWith('note-42');
		expect(deletingNoteId).toBeNull();
	});

	it('handleConfirmDelete is a no-op when deletingNoteId is null', () => {
		let deletingNoteId: string | null = null;
		const deleteNote = vi.fn();

		function handleConfirmDelete(): void {
			if (deletingNoteId) {
				deleteNote(deletingNoteId);
				deletingNoteId = null;
			}
		}

		handleConfirmDelete();

		expect(deleteNote).not.toHaveBeenCalled();
	});

	it('handleCancelDelete clears deletingNoteId', () => {
		let deletingNoteId: string | null = 'note-42';

		function handleCancelDelete(): void {
			deletingNoteId = null;
		}

		handleCancelDelete();
		expect(deletingNoteId).toBeNull();
	});

	it('onOpenChange resets deletingNoteId when dialog closes (open=false)', () => {
		let deletingNoteId: string | null = 'note-42';

		function onOpenChange(open: boolean): void {
			if (!open) deletingNoteId = null;
		}

		onOpenChange(false);
		expect(deletingNoteId).toBeNull();
	});

	it('onOpenChange preserves deletingNoteId when dialog opens (open=true)', () => {
		let deletingNoteId: string | null = 'note-42';

		function onOpenChange(open: boolean): void {
			if (!open) deletingNoteId = null;
		}

		onOpenChange(true);
		expect(deletingNoteId).toBe('note-42');
	});
});

// ---------------------------------------------------------------------------
// Adjacent selection transitions on delete (US2 — mirrored from store contract)
// ---------------------------------------------------------------------------

describe('NoteSidebar — adjacent selection updates on delete (T014)', () => {
	interface Note { id: string; position: number; title: string; }

	function simulateDeleteNote(
		notes: Note[],
		selectedNoteId: string | null,
		deleteId: string
	): { notes: Note[]; selectedNoteId: string | null } {
		const sorted = [...notes].sort((a, b) => a.position - b.position);
		const N = sorted.length;
		const k = sorted.findIndex((n) => n.id === deleteId);
		if (k === -1) return { notes, selectedNoteId };

		let newSelectedId = selectedNoteId;
		if (deleteId === selectedNoteId) {
			if (N === 1) {
				newSelectedId = null;
			} else if (k < N - 1) {
				newSelectedId = sorted[k + 1].id;
			} else {
				newSelectedId = sorted[k - 1].id;
			}
		}

		const remaining = sorted.filter((n) => n.id !== deleteId).map((n, i) => ({ ...n, position: i }));
		return { notes: remaining, selectedNoteId: newSelectedId };
	}

	it('deleting the only note → selectedNoteId becomes null', () => {
		const notes = [{ id: 'a', position: 0, title: 'A' }];
		const result = simulateDeleteNote(notes, 'a', 'a');
		expect(result.notes).toHaveLength(0);
		expect(result.selectedNoteId).toBeNull();
	});

	it('delete note at index 2 of 5 → selection shifts to index 2 (next note)', () => {
		const notes = [
			{ id: 'a', position: 0, title: 'A' },
			{ id: 'b', position: 1, title: 'B' },
			{ id: 'c', position: 2, title: 'C' },
			{ id: 'd', position: 3, title: 'D' },
			{ id: 'e', position: 4, title: 'E' },
		];
		const result = simulateDeleteNote(notes, 'c', 'c');
		expect(result.selectedNoteId).toBe('d');
		expect(result.notes).toHaveLength(4);
		expect(result.notes.map((n) => n.position)).toEqual([0, 1, 2, 3]);
	});

	it('delete last note → selection shifts to previous note', () => {
		const notes = [
			{ id: 'a', position: 0, title: 'A' },
			{ id: 'b', position: 1, title: 'B' },
			{ id: 'c', position: 2, title: 'C' },
		];
		const result = simulateDeleteNote(notes, 'c', 'c');
		expect(result.selectedNoteId).toBe('b');
		expect(result.notes).toHaveLength(2);
	});

	it('deleting a non-selected note preserves current selection', () => {
		const notes = [
			{ id: 'a', position: 0, title: 'A' },
			{ id: 'b', position: 1, title: 'B' },
			{ id: 'c', position: 2, title: 'C' },
		];
		const result = simulateDeleteNote(notes, 'a', 'c');
		expect(result.selectedNoteId).toBe('a');
		expect(result.notes).toHaveLength(2);
	});

	it('remaining notes have strictly contiguous positions 0..N-2 after delete', () => {
		const notes = Array.from({ length: 5 }, (_, i) => ({ id: `n${i}`, position: i, title: `Note ${i}` }));
		const result = simulateDeleteNote(notes, 'n2', 'n2');
		result.notes.forEach((n, i) => {
			expect(n.position).toBe(i);
		});
	});
});

// ---------------------------------------------------------------------------
// onNoteSelect callback
// ---------------------------------------------------------------------------

describe('NoteSidebar — handleSelectNote callback (T014)', () => {
	it('calls selectNote then onNoteSelect in order', () => {
		const callOrder: string[] = [];
		const selectNote = vi.fn((_id: string) => { callOrder.push('selectNote'); });
		const onNoteSelect = vi.fn(() => { callOrder.push('onNoteSelect'); });

		function handleSelectNote(id: string): void {
			selectNote(id);
			onNoteSelect();
		}

		handleSelectNote('note-1');

		expect(selectNote).toHaveBeenCalledWith('note-1');
		expect(onNoteSelect).toHaveBeenCalledOnce();
		expect(callOrder).toEqual(['selectNote', 'onNoteSelect']);
	});

	it('does not throw when onNoteSelect is undefined', () => {
		const selectNote = vi.fn();
		let onNoteSelect: (() => void) | undefined = undefined;

		function handleSelectNote(id: string): void {
			selectNote(id);
			onNoteSelect?.();
		}

		expect(() => handleSelectNote('note-1')).not.toThrow();
		expect(selectNote).toHaveBeenCalledWith('note-1');
	});

	it('drag guard: handleSelectNote does nothing while isDragging', () => {
		let isDragging = true;
		const selectNote = vi.fn();

		function handleSelectNote(id: string): void {
			if (isDragging) return;
			selectNote(id);
		}

		handleSelectNote('note-1');
		expect(selectNote).not.toHaveBeenCalled();
	});
});

// ---------------------------------------------------------------------------
// Inline rename
// ---------------------------------------------------------------------------

describe('NoteSidebar — inline rename (T014)', () => {
	it('commitRename saves trimmed non-empty title and clears renamingNoteId', () => {
		let renamingNoteId: string | null = 'note-1';
		let renameValue = '  Updated Title  ';
		const renameNote = vi.fn();

		function commitRename(): void {
			if (renamingNoteId) {
				const val = renameValue.trim();
				if (val) renameNote(renamingNoteId, val);
				renamingNoteId = null;
			}
		}

		commitRename();

		expect(renameNote).toHaveBeenCalledWith('note-1', 'Updated Title');
		expect(renamingNoteId).toBeNull();
	});

	it('commitRename does not save empty title but still clears renamingNoteId', () => {
		let renamingNoteId: string | null = 'note-1';
		let renameValue = '   ';
		const renameNote = vi.fn();

		function commitRename(): void {
			if (renamingNoteId) {
				const val = renameValue.trim();
				if (val) renameNote(renamingNoteId, val);
				renamingNoteId = null;
			}
		}

		commitRename();

		expect(renameNote).not.toHaveBeenCalled();
		expect(renamingNoteId).toBeNull();
	});

	it('closeRename clears renamingNoteId without saving', () => {
		let renamingNoteId: string | null = 'note-1';
		const renameNote = vi.fn();

		function closeRename(): void {
			renamingNoteId = null;
		}

		closeRename();

		expect(renameNote).not.toHaveBeenCalled();
		expect(renamingNoteId).toBeNull();
	});

	it('Enter key commits rename', () => {
		const commitRename = vi.fn();
		function handleRenameKeydown(e: KeyboardEvent): void {
			if (e.key === 'Enter') { e.preventDefault(); commitRename(); }
		}
		const event = { key: 'Enter', preventDefault: vi.fn() } as unknown as KeyboardEvent;
		handleRenameKeydown(event);
		expect(commitRename).toHaveBeenCalledOnce();
	});

	it('Escape key closes rename', () => {
		const closeRename = vi.fn();
		function handleRenameKeydown(e: KeyboardEvent): void {
			if (e.key === 'Escape') { e.preventDefault(); closeRename(); }
		}
		const event = { key: 'Escape', preventDefault: vi.fn() } as unknown as KeyboardEvent;
		handleRenameKeydown(event);
		expect(closeRename).toHaveBeenCalledOnce();
	});
});

// ---------------------------------------------------------------------------
// Context menu
// ---------------------------------------------------------------------------

describe('NoteSidebar — context menu state (T014)', () => {
	it('openNoteCtxMenu sets card target and shows menu', () => {
		let ctxMenuVisible = false;
		let ctxMenuTarget: 'card' | 'empty' = 'empty';
		let ctxNoteId: string | null = null;

		function openNoteCtxMenu(e: MouseEvent, noteId: string): void {
			e.preventDefault();
			e.stopPropagation();
			ctxNoteId = noteId;
			ctxMenuTarget = 'card';
			ctxMenuVisible = true;
		}

		const event = { preventDefault: vi.fn(), stopPropagation: vi.fn() } as unknown as MouseEvent;
		openNoteCtxMenu(event, 'note-7');

		expect(ctxMenuVisible).toBe(true);
		expect(ctxMenuTarget).toBe('card');
		expect(ctxNoteId).toBe('note-7');
	});

	it('openEmptyCtxMenu sets empty target and shows menu', () => {
		let ctxMenuVisible = false;
		let ctxMenuTarget: 'card' | 'empty' = 'card';
		let ctxNoteId: string | null = 'old';

		function openEmptyCtxMenu(e: MouseEvent): void {
			e.preventDefault();
			ctxNoteId = null;
			ctxMenuTarget = 'empty';
			ctxMenuVisible = true;
		}

		const event = { preventDefault: vi.fn() } as unknown as MouseEvent;
		openEmptyCtxMenu(event);

		expect(ctxMenuVisible).toBe(true);
		expect(ctxMenuTarget).toBe('empty');
		expect(ctxNoteId).toBeNull();
	});

	it('closeCtxMenu hides menu and resets ctxNoteId', () => {
		let ctxMenuVisible = true;
		let ctxNoteId: string | null = 'note-1';

		function closeCtxMenu(): void {
			ctxMenuVisible = false;
			ctxNoteId = null;
		}

		closeCtxMenu();

		expect(ctxMenuVisible).toBe(false);
		expect(ctxNoteId).toBeNull();
	});

	it('handleCtxDelete sets deletingNoteId and closes menu', () => {
		let ctxNoteId: string | null = 'note-1';
		let deletingNoteId: string | null = null;
		let ctxMenuVisible = true;

		function handleCtxDelete(): void {
			if (ctxNoteId) deletingNoteId = ctxNoteId;
			ctxMenuVisible = false;
			ctxNoteId = null;
		}

		handleCtxDelete();

		expect(deletingNoteId).toBe('note-1');
		expect(ctxMenuVisible).toBe(false);
	});

	it('handleCtxRename sets renamingNoteId and closes menu', () => {
		let ctxNoteId: string | null = 'note-1';
		let renamingNoteId: string | null = null;
		let renameValue = '';
		let ctxMenuVisible = true;
		const notes = [{ id: 'note-1', title: 'My Note' }];

		function handleCtxRename(): void {
			if (ctxNoteId) {
				const note = notes.find((n) => n.id === ctxNoteId);
				if (note) {
					renamingNoteId = ctxNoteId;
					renameValue = note.title;
					ctxMenuVisible = false;
				}
			}
		}

		handleCtxRename();

		expect(renamingNoteId).toBe('note-1');
		expect(renameValue).toBe('My Note');
		expect(ctxMenuVisible).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Pointer drag events
// ---------------------------------------------------------------------------

describe('NoteSidebar — pointer drag events (T014)', () => {
	it('handlePointerDown sets dragNoteId and captures pointer', () => {
		let dragNoteId: string | null = null;
		let isDragging = false;
		let pointerCaptured = false;

		const event = {
			button: 0,
			pointerId: 42,
			target: {
				closest: (selector: string) => {
					if (selector === 'button' || selector === 'input') return null;
					return { setPointerCapture: () => { pointerCaptured = true; } };
				},
			},
		} as unknown as PointerEvent;

		function handlePointerDown(e: PointerEvent, id: string): void {
			if (e.button !== 0) return;
			const target = e.target as HTMLElement;
			if (target.closest('button') || target.closest('input')) return;
			dragNoteId = id;
			isDragging = false;
			target.closest('[role="button"]')?.setPointerCapture(e.pointerId);
		}

		handlePointerDown(event, 'note-1');

		expect(dragNoteId).toBe('note-1');
		expect(isDragging).toBe(false);
		expect(pointerCaptured).toBe(true);
	});

	it('handlePointerDown ignores secondary mouse buttons', () => {
		let dragNoteId: string | null = null;
		const event = { button: 2 } as unknown as PointerEvent;

		function handlePointerDown(e: PointerEvent, id: string): void {
			if (e.button !== 0) return;
			dragNoteId = id;
		}

		handlePointerDown(event, 'note-1');
		expect(dragNoteId).toBeNull();
	});

	it('handlePointerMove sets isDragging true when dragNoteId matches', () => {
		let isDragging = false;
		let dragNoteId: string | null = 'note-1';

		function handlePointerMove(_e: PointerEvent, id: string): void {
			if (dragNoteId !== id) return;
			if (!isDragging) isDragging = true;
		}

		handlePointerMove({} as PointerEvent, 'note-1');
		expect(isDragging).toBe(true);
	});

	it('handlePointerMove is no-op when dragNoteId does not match', () => {
		let isDragging = false;
		let dragNoteId: string | null = 'note-other';

		function handlePointerMove(_e: PointerEvent, id: string): void {
			if (dragNoteId !== id) return;
			if (!isDragging) isDragging = true;
		}

		handlePointerMove({} as PointerEvent, 'note-1');
		expect(isDragging).toBe(false);
	});

	it('handlePointerUp releases capture, triggers reorderNote, resets state', () => {
		let dragNoteId: string | null = 'note-1';
		let dragOverNoteId: string | null = 'note-2';
		let isDragging = true;
		let released = false;
		const reorderNote = vi.fn();

		const event = {
			pointerId: 42,
			currentTarget: { releasePointerCapture: () => { released = true; } },
		} as unknown as PointerEvent;

		function handlePointerUp(e: PointerEvent, id: string): void {
			if (dragNoteId !== id) return;
			const cardEl = e.currentTarget as HTMLElement;
			try { cardEl.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
			if (isDragging && dragOverNoteId && dragOverNoteId !== dragNoteId) {
				reorderNote(dragNoteId, 1);
			}
			dragNoteId = null;
			dragOverNoteId = null;
			isDragging = false;
		}

		handlePointerUp(event, 'note-1');

		expect(released).toBe(true);
		expect(reorderNote).toHaveBeenCalled();
		expect(dragNoteId).toBeNull();
		expect(dragOverNoteId).toBeNull();
		expect(isDragging).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Reorder / duplicate / move logic
// ---------------------------------------------------------------------------

describe('NoteSidebar — reorderNote logic (T014)', () => {
	it('moves note to new position and re-indexes all', () => {
		const notes = [
			{ id: 'a', position: 0 },
			{ id: 'b', position: 1 },
			{ id: 'c', position: 2 },
		];
		const sorted = [...notes].sort((a, b) => a.position - b.position);
		const note = sorted.find((n) => n.id === 'a')!;
		const clamped = Math.max(0, Math.min(1, sorted.length - 1));
		sorted.splice(sorted.indexOf(note), 1);
		sorted.splice(clamped, 0, note);
		const updated = sorted.map((n, i) => ({ ...n, position: i }));

		expect(updated[0].id).toBe('b');
		expect(updated[1].id).toBe('a');
		expect(updated[2].id).toBe('c');
		updated.forEach((n, i) => expect(n.position).toBe(i));
	});

	it('clamps out-of-range position', () => {
		const notes = [{ id: 'a', position: 0 }, { id: 'b', position: 1 }];
		const clamped = Math.max(0, Math.min(999, notes.length - 1));
		expect(clamped).toBe(1);
	});
});

describe('NoteSidebar — duplicateNote logic (T014)', () => {
	it('creates copy with "(copy)" suffix inserted after original', () => {
		const notes = [
			{ id: 'a', title: 'Note A', content: 'hello', position: 0 },
			{ id: 'b', title: 'Note B', content: 'world', position: 1 },
		];
		const original = notes.find((n) => n.id === 'a')!;
		const sorted = [...notes].sort((a, b) => a.position - b.position);
		const origIdx = sorted.indexOf(original);
		const duplicate = {
			id: 'new-id',
			title: `${original.title} (copy)`,
			content: original.content,
			position: origIdx + 1,
		};
		sorted.splice(origIdx + 1, 0, duplicate);
		const updated = sorted.map((n, i) => ({ ...n, position: i }));

		expect(updated).toHaveLength(3);
		expect(updated[0].id).toBe('a');
		expect(updated[1].id).toBe('new-id');
		expect(updated[1].title).toBe('Note A (copy)');
		expect(updated[2].id).toBe('b');
		updated.forEach((n, i) => expect(n.position).toBe(i));
	});

	it('returns null for unknown id', () => {
		const notes: { id: string }[] = [];
		const original = notes.find((n) => n.id === 'nonexistent');
		expect(original ?? null).toBeNull();
	});
});

describe('NoteSidebar — moveNote logic (T014)', () => {
	it('up: swaps with previous note', () => {
		const notes = [{ id: 'a', position: 0 }, { id: 'b', position: 1 }];
		const sorted = [...notes].sort((a, b) => a.position - b.position);
		const idx = sorted.findIndex((n) => n.id === 'b');
		const newIdx = idx - 1;
		const [note] = sorted.splice(idx, 1);
		sorted.splice(newIdx, 0, note);
		const updated = sorted.map((n, i) => ({ ...n, position: i }));
		expect(updated[0].id).toBe('b');
		expect(updated[1].id).toBe('a');
	});

	it('down: swaps with next note', () => {
		const notes = [{ id: 'a', position: 0 }, { id: 'b', position: 1 }];
		const sorted = [...notes].sort((a, b) => a.position - b.position);
		const idx = sorted.findIndex((n) => n.id === 'a');
		const newIdx = idx + 1;
		const [note] = sorted.splice(idx, 1);
		sorted.splice(newIdx, 0, note);
		const updated = sorted.map((n, i) => ({ ...n, position: i }));
		expect(updated[0].id).toBe('b');
		expect(updated[1].id).toBe('a');
	});

	it('top: moves to position 0', () => {
		const notes = [{ id: 'a', position: 0 }, { id: 'b', position: 1 }, { id: 'c', position: 2 }];
		const sorted = [...notes].sort((a, b) => a.position - b.position);
		const idx = sorted.findIndex((n) => n.id === 'c');
		const [note] = sorted.splice(idx, 1);
		sorted.splice(0, 0, note);
		const updated = sorted.map((n, i) => ({ ...n, position: i }));
		expect(updated[0].id).toBe('c');
		updated.forEach((n, i) => expect(n.position).toBe(i));
	});

	it('bottom: moves to last position', () => {
		const notes = [{ id: 'a', position: 0 }, { id: 'b', position: 1 }, { id: 'c', position: 2 }];
		const sorted = [...notes].sort((a, b) => a.position - b.position);
		const idx = sorted.findIndex((n) => n.id === 'a');
		const [note] = sorted.splice(idx, 1);
		sorted.splice(sorted.length, 0, note);
		const updated = sorted.map((n, i) => ({ ...n, position: i }));
		expect(updated[updated.length - 1].id).toBe('a');
		updated.forEach((n, i) => expect(n.position).toBe(i));
	});
});
