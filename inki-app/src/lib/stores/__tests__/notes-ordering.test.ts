/**
 * T013 [US2] Store ordering and deletion tests.
 *
 * Validates:
 * - Strictly contiguous positions (0 to N-1) after addNote, deleteNote,
 *   reorderNote, duplicateNote, moveNote
 * - Adjacent selection transitions on deleteNote:
 *   - Delete at index k < N-1 → select index k+1
 *   - Delete at index k === N-1 (last) → select index k-1
 *   - Delete only remaining note → select null
 *
 * NOTE: notes.svelte.ts uses Svelte 5 $state runes and cannot be imported
 * directly in Vitest without Svelte compilation. These tests re-implement
 * the same business logic as plain TypeScript — the accepted pattern per AGENTS.md.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
	resetLocalStorage,
	readStoragePayload,
} from './test-helpers.ts';

// ---------------------------------------------------------------------------
// Re-implementation of the store's ordering + deletion logic for testability
// ---------------------------------------------------------------------------

interface Note {
	id: string;
	title: string;
	content: string;
	createdAt: number;
	updatedAt: number;
	position: number;
}

type MoveDirection = 'up' | 'down' | 'top' | 'bottom';

function makeStore() {
	let notes: Note[] = [];
	let selectedNoteId: string | null = null;
	const STORAGE_KEY = 'inki-notes';

	function saveToLocalStorage(): void {
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, selectedNoteId }));
		} catch {
			// ignore
		}
	}

	function flushSave(): void {
		saveToLocalStorage();
	}

	function reindex(arr: Note[]): Note[] {
		return [...arr].sort((a, b) => a.position - b.position).map((n, i) => ({ ...n, position: i }));
	}

	function getNotes(): Note[] {
		return [...notes].sort((a, b) => a.position - b.position);
	}

	function getSelectedNote(): Note | null {
		return selectedNoteId ? (notes.find((n) => n.id === selectedNoteId) ?? null) : null;
	}

	function addNote(title?: string, content?: string): Note {
		flushSave();
		const note: Note = {
			id: crypto.randomUUID(),
			title: title || `Note-${notes.length}`,
			content: content || '',
			createdAt: Date.now(),
			updatedAt: Date.now(),
			position: notes.length,
		};
		notes = [...notes, note];
		selectedNoteId = note.id;
		saveToLocalStorage();
		return note;
	}

	function deleteNote(id: string): void {
		flushSave();
		const sorted = getNotes();
		const N = sorted.length;
		const k = sorted.findIndex((n) => n.id === id);
		if (k === -1) return;

		// Adjacent selection transition per contract §2.5
		if (id === selectedNoteId) {
			if (N === 1) {
				selectedNoteId = null;
			} else if (k < N - 1) {
				selectedNoteId = sorted[k + 1].id;
			} else {
				selectedNoteId = sorted[k - 1].id;
			}
		}

		const remaining = sorted.filter((n) => n.id !== id);
		notes = remaining.map((n, i) => ({ ...n, position: i }));
		saveToLocalStorage();
	}

	function reorderNote(id: string, newPosition: number): void {
		flushSave();
		const sorted = getNotes();
		const note = sorted.find((n) => n.id === id);
		if (!note) return;

		const clamped = Math.max(0, Math.min(newPosition, sorted.length - 1));
		sorted.splice(sorted.indexOf(note), 1);
		sorted.splice(clamped, 0, note);

		notes = sorted.map((n, i) => ({ ...n, position: i }));
		saveToLocalStorage();
	}

	function duplicateNote(id: string): Note | null {
		flushSave();
		const original = notes.find((n) => n.id === id);
		if (!original) return null;

		const sorted = getNotes();
		const origIdx = sorted.findIndex((n) => n.id === id);

		const duplicate: Note = {
			id: crypto.randomUUID(),
			title: `${original.title} (copy)`,
			content: original.content,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			position: origIdx + 1,
		};

		sorted.splice(origIdx + 1, 0, duplicate);
		notes = sorted.map((n, i) => ({ ...n, position: i }));
		saveToLocalStorage();
		return duplicate;
	}

	function moveNote(id: string, direction: MoveDirection): void {
		flushSave();
		const sorted = getNotes();
		const idx = sorted.findIndex((n) => n.id === id);
		if (idx === -1) return;

		let newIdx = idx;
		if (direction === 'up' && idx > 0) newIdx = idx - 1;
		else if (direction === 'down' && idx < sorted.length - 1) newIdx = idx + 1;
		else if (direction === 'top') newIdx = 0;
		else if (direction === 'bottom') newIdx = sorted.length - 1;
		else return;

		const [note] = sorted.splice(idx, 1);
		sorted.splice(newIdx, 0, note);
		notes = sorted.map((n, i) => ({ ...n, position: i }));
		saveToLocalStorage();
	}

	function selectNote(id: string | null): void {
		selectedNoteId = id;
	}

	function getState() {
		return { notes, selectedNoteId };
	}

	return {
		addNote,
		deleteNote,
		reorderNote,
		duplicateNote,
		moveNote,
		selectNote,
		getNotes,
		getSelectedNote,
		getState,
	};
}

// ---------------------------------------------------------------------------
// Helper: assert positions are strictly 0..N-1
// ---------------------------------------------------------------------------
function assertContiguousPositions(notes: Note[]): void {
	const sorted = [...notes].sort((a, b) => a.position - b.position);
	sorted.forEach((n, i) => {
		expect(n.position).toBe(i);
	});
}

// ---------------------------------------------------------------------------
// Tests: addNote contiguous positions
// ---------------------------------------------------------------------------

describe('Ordering — addNote produces contiguous positions (T013)', () => {
	beforeEach(() => {
		resetLocalStorage();
	});

	it('single addNote produces position 0', () => {
		const store = makeStore();
		store.addNote('A');
		assertContiguousPositions(store.getNotes());
		expect(store.getNotes()[0].position).toBe(0);
	});

	it('three addNote calls produce positions 0, 1, 2', () => {
		const store = makeStore();
		store.addNote('A');
		store.addNote('B');
		store.addNote('C');
		const notes = store.getNotes();
		expect(notes).toHaveLength(3);
		assertContiguousPositions(notes);
	});

	it('five addNote calls produce positions 0..4', () => {
		const store = makeStore();
		for (let i = 0; i < 5; i++) store.addNote(`Note ${i}`);
		assertContiguousPositions(store.getNotes());
	});
});

// ---------------------------------------------------------------------------
// Tests: deleteNote adjacent selection transitions
// ---------------------------------------------------------------------------

describe('Ordering — deleteNote adjacent selection transitions (T013)', () => {
	beforeEach(() => {
		resetLocalStorage();
	});

	it('delete the only note → selectedNoteId becomes null', () => {
		const store = makeStore();
		const n = store.addNote('Solo');
		store.selectNote(n.id);

		store.deleteNote(n.id);

		const { selectedNoteId, notes } = store.getState();
		expect(notes).toHaveLength(0);
		expect(selectedNoteId).toBeNull();
	});

	it('delete note at index k < N-1 → selection shifts to index k+1', () => {
		const store = makeStore();
		const notes: Note[] = [];
		for (let i = 0; i < 5; i++) notes.push(store.addNote(`Note ${i}`));

		// Select Note at index 2 (third note in position order)
		const sorted = store.getNotes();
		const target = sorted[2];
		const nextNote = sorted[3];
		store.selectNote(target.id);

		store.deleteNote(target.id);

		const { selectedNoteId } = store.getState();
		expect(selectedNoteId).toBe(nextNote.id);
	});

	it('delete last note in list → selection shifts to previous note', () => {
		const store = makeStore();
		const notes: Note[] = [];
		for (let i = 0; i < 5; i++) notes.push(store.addNote(`Note ${i}`));

		const sorted = store.getNotes();
		const lastNote = sorted[4];
		const prevNote = sorted[3];
		store.selectNote(lastNote.id);

		store.deleteNote(lastNote.id);

		const { selectedNoteId } = store.getState();
		expect(selectedNoteId).toBe(prevNote.id);
	});

	it('deleting an unselected note preserves current selection', () => {
		const store = makeStore();
		const a = store.addNote('A');
		const b = store.addNote('B');
		const c = store.addNote('C');
		store.selectNote(a.id);

		store.deleteNote(c.id);

		const { selectedNoteId } = store.getState();
		expect(selectedNoteId).toBe(a.id);
	});

	it('positions remain contiguous 0..N-2 after deletion', () => {
		const store = makeStore();
		for (let i = 0; i < 5; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		store.deleteNote(sorted[2].id);

		const remaining = store.getNotes();
		expect(remaining).toHaveLength(4);
		assertContiguousPositions(remaining);
	});

	it('independent test: create 5 notes, delete index 2, verify positions 0..3 and selection', () => {
		const store = makeStore();
		for (let i = 0; i < 5; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		const note3 = sorted[2]; // position 2 = "Note 3" (0-indexed)
		const note4 = sorted[3];
		store.selectNote(note3.id);

		store.deleteNote(note3.id);

		const remaining = store.getNotes();
		expect(remaining).toHaveLength(4);
		assertContiguousPositions(remaining);

		const { selectedNoteId } = store.getState();
		expect(selectedNoteId).toBe(note4.id);
	});

	it('delete last remaining note of 2 → selection shifts to the other note', () => {
		const store = makeStore();
		const a = store.addNote('A');
		const b = store.addNote('B');
		const sorted = store.getNotes();
		const last = sorted[1];
		const prev = sorted[0];
		store.selectNote(last.id);

		store.deleteNote(last.id);

		const { selectedNoteId } = store.getState();
		expect(selectedNoteId).toBe(prev.id);
		assertContiguousPositions(store.getNotes());
	});

	it('deletes persist to localStorage with re-indexed positions', () => {
		const store = makeStore();
		for (let i = 0; i < 3; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		store.deleteNote(sorted[1].id);

		const payload = readStoragePayload();
		const storedNotes = (payload?.notes ?? []) as Note[];
		expect(storedNotes).toHaveLength(2);
		assertContiguousPositions(storedNotes);
	});
});

// ---------------------------------------------------------------------------
// Tests: reorderNote contiguous positions
// ---------------------------------------------------------------------------

describe('Ordering — reorderNote produces contiguous positions (T013)', () => {
	beforeEach(() => {
		resetLocalStorage();
	});

	it('reorderNote clamps to valid range and keeps positions contiguous', () => {
		const store = makeStore();
		for (let i = 0; i < 4; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		store.reorderNote(sorted[0].id, 3);

		assertContiguousPositions(store.getNotes());
	});

	it('reorderNote to same position is a no-op that still produces contiguous positions', () => {
		const store = makeStore();
		for (let i = 0; i < 3; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		store.reorderNote(sorted[1].id, 1);

		assertContiguousPositions(store.getNotes());
	});

	it('reorderNote from end to beginning reverses order and re-indexes', () => {
		const store = makeStore();
		for (let i = 0; i < 4; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		const lastNote = sorted[3];
		store.reorderNote(lastNote.id, 0);

		const reordered = store.getNotes();
		expect(reordered[0].id).toBe(lastNote.id);
		assertContiguousPositions(reordered);
	});
});

// ---------------------------------------------------------------------------
// Tests: duplicateNote contiguous positions
// ---------------------------------------------------------------------------

describe('Ordering — duplicateNote produces contiguous positions (T013)', () => {
	beforeEach(() => {
		resetLocalStorage();
	});

	it('duplicate note appears immediately after original with contiguous positions', () => {
		const store = makeStore();
		for (let i = 0; i < 3; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		const targetNote = sorted[1];
		const copy = store.duplicateNote(targetNote.id);

		expect(copy).not.toBeNull();
		const after = store.getNotes();
		expect(after).toHaveLength(4);
		assertContiguousPositions(after);

		// Copy should appear right after the original
		const origIdx = after.findIndex((n) => n.id === targetNote.id);
		const copyIdx = after.findIndex((n) => n.id === copy!.id);
		expect(copyIdx).toBe(origIdx + 1);
	});

	it('duplicating first note places copy at position 1', () => {
		const store = makeStore();
		const a = store.addNote('A');
		store.addNote('B');

		const copy = store.duplicateNote(a.id);

		const notes = store.getNotes();
		expect(notes).toHaveLength(3);
		assertContiguousPositions(notes);
		const copyNote = notes.find((n) => n.id === copy!.id)!;
		expect(copyNote.position).toBe(1);
	});

	it('duplicateNote on non-existent id returns null', () => {
		const store = makeStore();
		store.addNote('A');
		const result = store.duplicateNote('does-not-exist');
		expect(result).toBeNull();
		expect(store.getNotes()).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Tests: moveNote contiguous positions
// ---------------------------------------------------------------------------

describe('Ordering — moveNote produces contiguous positions (T013)', () => {
	beforeEach(() => {
		resetLocalStorage();
	});

	it('moveNote up shifts note one position earlier and re-indexes', () => {
		const store = makeStore();
		for (let i = 0; i < 4; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		const noteC = sorted[2];
		store.moveNote(noteC.id, 'up');

		const after = store.getNotes();
		assertContiguousPositions(after);
		const movedIdx = after.findIndex((n) => n.id === noteC.id);
		expect(movedIdx).toBe(1);
	});

	it('moveNote down shifts note one position later and re-indexes', () => {
		const store = makeStore();
		for (let i = 0; i < 4; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		const noteB = sorted[1];
		store.moveNote(noteB.id, 'down');

		const after = store.getNotes();
		assertContiguousPositions(after);
		const movedIdx = after.findIndex((n) => n.id === noteB.id);
		expect(movedIdx).toBe(2);
	});

	it('moveNote to top places note at position 0 and re-indexes', () => {
		const store = makeStore();
		for (let i = 0; i < 5; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		const noteD = sorted[3];
		store.moveNote(noteD.id, 'top');

		const after = store.getNotes();
		assertContiguousPositions(after);
		expect(after[0].id).toBe(noteD.id);
	});

	it('moveNote to bottom places note at last position and re-indexes', () => {
		const store = makeStore();
		for (let i = 0; i < 5; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		const noteB = sorted[1];
		store.moveNote(noteB.id, 'bottom');

		const after = store.getNotes();
		assertContiguousPositions(after);
		expect(after[after.length - 1].id).toBe(noteB.id);
	});

	it('moveNote up on first note is a no-op that keeps contiguous positions', () => {
		const store = makeStore();
		for (let i = 0; i < 3; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		const firstNote = sorted[0];
		store.moveNote(firstNote.id, 'up');

		const after = store.getNotes();
		assertContiguousPositions(after);
		expect(after[0].id).toBe(firstNote.id);
	});

	it('moveNote down on last note is a no-op that keeps contiguous positions', () => {
		const store = makeStore();
		for (let i = 0; i < 3; i++) store.addNote(`Note ${i}`);

		const sorted = store.getNotes();
		const lastNote = sorted[2];
		store.moveNote(lastNote.id, 'down');

		const after = store.getNotes();
		assertContiguousPositions(after);
		expect(after[after.length - 1].id).toBe(lastNote.id);
	});
});
