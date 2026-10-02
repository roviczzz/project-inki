/**
 * T008 [US1] Store concurrency tests.
 *
 * Validates:
 * - 300ms debounced saving (updateNote does NOT save synchronously on every call)
 * - flushSave() triggers immediate synchronous persistence
 * - selectNote() calls flushSave() before switching, preventing cross-note content bleed
 * - Simulated multi-window StorageEvent synchronization preserves active draft
 * - Zero content loss across 50 rapid consecutive note switches
 *
 * NOTE: notes.svelte.ts uses Svelte 5 $state runes and cannot be imported directly
 * in Vitest without Svelte compilation. These tests validate the same business logic
 * re-implemented here as plain TypeScript — the accepted pattern per AGENTS.md.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { resetLocalStorage, seedLocalStorage, readStoragePayload, advanceTimersByMs, flushTimers } from './test-helpers.ts';

// ---------------------------------------------------------------------------
// Re-implementation of the store's core logic for testability
// ---------------------------------------------------------------------------

interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  updatedAt: number;
  position: number;
}

function makeStore() {
  let notes: Note[] = [];
  let selectedNoteId: string | null = null;
  let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;
  const DEBOUNCE_MS = 300;
  const STORAGE_KEY = 'inki-notes';

  function saveToLocalStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, selectedNoteId }));
    } catch {
      // ignore
    }
  }

  function scheduleSave(): void {
    if (saveTimeoutId !== null) clearTimeout(saveTimeoutId);
    saveTimeoutId = setTimeout(() => {
      saveTimeoutId = null;
      saveToLocalStorage();
    }, DEBOUNCE_MS);
  }

  function flushSave(): void {
    if (saveTimeoutId !== null) {
      clearTimeout(saveTimeoutId);
      saveTimeoutId = null;
    }
    saveToLocalStorage();
  }

  function reindex(arr: Note[]): Note[] {
    return [...arr].sort((a, b) => a.position - b.position).map((n, i) => ({ ...n, position: i }));
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
    scheduleSave();
    return note;
  }

  function updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'content'>>): void {
    notes = notes.map((n) => (n.id !== id ? n : { ...n, ...updates, updatedAt: Date.now() }));
    scheduleSave();
  }

  function selectNote(id: string | null): void {
    flushSave();
    selectedNoteId = id;
  }

  function getNotes(): Note[] {
    return [...notes].sort((a, b) => a.position - b.position);
  }

  function getSelectedNote(): Note | null {
    return selectedNoteId ? (notes.find((n) => n.id === selectedNoteId) ?? null) : null;
  }

  function hasPendingSave(): boolean {
    return saveTimeoutId !== null;
  }

  // Simulate incoming StorageEvent (multi-window sync)
  function handleStorageEvent(newValue: string | null): void {
    if (newValue === null) {
      notes = [];
      selectedNoteId = null;
      return;
    }
    try {
      const parsed = JSON.parse(newValue) as Record<string, unknown>;
      const rawNotes = Array.isArray(parsed.notes) ? (parsed.notes as Note[]) : [];
      const incoming = reindex(rawNotes);
      const activeId = selectedNoteId;
      const hasDraft = saveTimeoutId !== null && activeId !== null;

      if (hasDraft) {
        const localActive = notes.find((n) => n.id === activeId);
        const merged = incoming.map((n) => (n.id === activeId && localActive ? localActive : n));
        const remoteHasActive = incoming.some((n) => n.id === activeId);
        if (!remoteHasActive && localActive) merged.push(localActive);
        notes = reindex(merged);
      } else {
        notes = incoming;
        if (activeId !== null && !notes.some((n) => n.id === activeId)) {
          selectedNoteId = notes.length > 0 ? notes[0].id : null;
        }
      }
    } catch {
      // keep local state
    }
  }

  return {
    addNote,
    updateNote,
    selectNote,
    getNotes,
    getSelectedNote,
    flushSave,
    hasPendingSave,
    handleStorageEvent,
    getState: () => ({ notes, selectedNoteId }),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Store concurrency — debounced persistence (T008)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLocalStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updateNote does NOT synchronously write to localStorage on every keystroke', () => {
    const store = makeStore();
    const note = store.addNote('A', '');
    // Flush so localStorage baseline includes the note with content = ''
    store.flushSave();

    // Now type 10 rapid keystrokes
    for (let i = 0; i < 10; i++) {
      store.updateNote(note.id, { content: 'x'.repeat(i + 1) });
    }
    // The in-memory note should have the latest content
    const inMemory = store.getSelectedNote();
    expect(inMemory?.content).toBe('x'.repeat(10));

    // But localStorage should still have the pre-update snapshot (content = '')
    const stored = readStoragePayload();
    const storedNote = stored?.notes.find((n: any) => n.id === note.id) as any;
    expect(storedNote?.content).toBe('');
  });

  it('updateNote schedules a pending save timer after keystroke', () => {
    const store = makeStore();
    const note = store.addNote('A', '');
    store.updateNote(note.id, { content: 'hello' });
    expect(store.hasPendingSave()).toBe(true);
  });

  it('debounce timer fires after 300ms and writes to localStorage', async () => {
    const store = makeStore();
    const note = store.addNote('A', '');
    store.updateNote(note.id, { content: 'typed text' });

    await advanceTimersByMs(300);

    const stored = readStoragePayload();
    const storedNote = stored?.notes.find((n: any) => n.id === note.id) as any;
    expect(storedNote?.content).toBe('typed text');
    expect(store.hasPendingSave()).toBe(false);
  });

  it('rapid keystrokes reset the 300ms timer (trailing debounce)', async () => {
    const store = makeStore();
    const note = store.addNote('A', '');

    // Type 5 characters with 50ms gaps (each resets the 300ms timer)
    for (let i = 1; i <= 5; i++) {
      store.updateNote(note.id, { content: 'x'.repeat(i) });
      await advanceTimersByMs(50);
    }

    // 250ms elapsed total — timer should still be pending
    expect(store.hasPendingSave()).toBe(true);

    // Wait the final 300ms for the trailing edge to fire
    await advanceTimersByMs(300);

    const stored = readStoragePayload();
    const storedNote = stored?.notes.find((n: any) => n.id === note.id) as any;
    expect(storedNote?.content).toBe('xxxxx');
  });

  it('flushSave() immediately persists and cancels pending timer', () => {
    const store = makeStore();
    const note = store.addNote('A', '');
    store.updateNote(note.id, { content: 'unsaved draft' });

    expect(store.hasPendingSave()).toBe(true);
    store.flushSave();

    expect(store.hasPendingSave()).toBe(false);
    const stored = readStoragePayload();
    const storedNote = stored?.notes.find((n: any) => n.id === note.id) as any;
    expect(storedNote?.content).toBe('unsaved draft');
  });

  it('flushSave() is idempotent — safe to call multiple times', () => {
    const store = makeStore();
    store.addNote('A', '');
    expect(() => {
      store.flushSave();
      store.flushSave();
      store.flushSave();
    }).not.toThrow();
  });
});

describe('Store concurrency — selectNote flushes on switch (T008)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLocalStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('selectNote() calls flushSave() — pending draft is written before switching', () => {
    const store = makeStore();
    const noteA = store.addNote('A', '');
    const noteB = store.addNote('B', '');

    // Type into Note A
    store.selectNote(noteA.id);
    store.updateNote(noteA.id, { content: 'draft in A' });

    expect(store.hasPendingSave()).toBe(true);

    // Switch to Note B — should flush A's draft
    store.selectNote(noteB.id);

    expect(store.hasPendingSave()).toBe(false);
    const stored = readStoragePayload();
    const storedA = stored?.notes.find((n: any) => n.id === noteA.id) as any;
    expect(storedA?.content).toBe('draft in A');
  });

  it('zero content bleed — Note B shows its own content after switching from Note A', () => {
    const store = makeStore();
    const noteA = store.addNote('A', 'content of A');
    const noteB = store.addNote('B', 'content of B');

    store.selectNote(noteA.id);
    store.updateNote(noteA.id, { content: 'edited A' });

    // Simulate rapid switch to B
    store.selectNote(noteB.id);

    const selectedB = store.getSelectedNote();
    expect(selectedB?.id).toBe(noteB.id);
    expect(selectedB?.content).toBe('content of B');
  });

  it('zero content loss — 50 rapid note switches preserve all edits', () => {
    const store = makeStore();
    const notes: Note[] = [];
    for (let i = 0; i < 10; i++) {
      notes.push(store.addNote(`Note ${i}`, ''));
    }

    // Simulate 50 rapid switches: type a unique content for each note, then switch away
    for (let round = 0; round < 5; round++) {
      for (const note of notes) {
        store.selectNote(note.id);
        store.updateNote(note.id, { content: `round-${round}-note-${note.id}` });
      }
    }

    // Final flush
    store.flushSave();

    // Every note's final content should be from the last round
    const stored = readStoragePayload();
    for (const note of notes) {
      const storedNote = stored?.notes.find((n: any) => n.id === note.id) as any;
      expect(storedNote?.content).toBe(`round-4-note-${note.id}`);
    }
  });
});

describe('Store concurrency — multi-window StorageEvent sync (T008)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetLocalStorage();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('absorbs remote note updates when no local draft is pending', () => {
    const store = makeStore();
    const note = store.addNote('A', 'original');
    store.flushSave();

    // Remote window updates the note content
    const remotePayload = JSON.stringify({
      notes: [{ ...store.getNotes()[0], content: 'remote edit' }],
      selectedNoteId: note.id,
    });
    store.handleStorageEvent(remotePayload);

    const updated = store.getSelectedNote();
    expect(updated?.content).toBe('remote edit');
  });

  it('preserves local draft when a pending save exists during storage event', () => {
    const store = makeStore();
    const note = store.addNote('A', 'original');
    store.flushSave();

    // User types locally — creates a pending draft
    store.updateNote(note.id, { content: 'local unsaved draft' });
    expect(store.hasPendingSave()).toBe(true);

    // Remote window fires a storage event
    const remotePayload = JSON.stringify({
      notes: [{ ...store.getNotes()[0], content: 'remote stale' }],
      selectedNoteId: note.id,
    });
    store.handleStorageEvent(remotePayload);

    // Local draft should be preserved
    const current = store.getSelectedNote();
    expect(current?.content).toBe('local unsaved draft');
  });

  it('transitions selection when remote deletes the active note (no pending draft)', () => {
    const store = makeStore();
    const noteA = store.addNote('A', '');
    store.addNote('B', '');
    store.flushSave();
    store.selectNote(noteA.id);

    // Remote deletes Note A
    const notesWithoutA = store.getNotes().filter((n) => n.id !== noteA.id);
    const remotePayload = JSON.stringify({
      notes: notesWithoutA,
      selectedNoteId: notesWithoutA[0]?.id ?? null,
    });
    store.handleStorageEvent(remotePayload);

    // Selection should have transitioned away from the deleted note
    const { selectedNoteId } = store.getState();
    expect(selectedNoteId).not.toBe(noteA.id);
  });

  it('null storage event clears all notes', () => {
    const store = makeStore();
    store.addNote('A', '');
    store.flushSave();

    store.handleStorageEvent(null);

    const { notes, selectedNoteId } = store.getState();
    expect(notes).toHaveLength(0);
    expect(selectedNoteId).toBeNull();
  });
});
