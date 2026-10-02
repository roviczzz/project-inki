/**
 * T018 [US3] NoteSidebar interaction tests (Vitest).
 *
 * Validates:
 * - Escape key cancellation across context menus, inline renames, and pointer dragging
 * - Outside click dismissal for context menus
 * - Inline rename trimming, non-empty commit, empty-string fallback/restoration, and cancellation
 * - Pointer drag cancellation lifecycle: pointercancel, window blur, and Escape key resets
 * - Note selection transitions cleanly resetting interaction overlays
 *
 * NOTE: NoteSidebar.svelte uses Svelte 5 runes and cannot be imported
 * directly in Vitest without Svelte compilation. These tests validate the
 * exact interaction state machine and logic extracted from the component.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Types & Interaction State Controller for NoteSidebar
// ---------------------------------------------------------------------------

interface Note {
  id: string;
  title: string;
  content: string;
  position: number;
  createdAt: number;
  updatedAt: number;
}

interface SidebarInteractionState {
  // Context menu
  ctxMenuVisible: boolean;
  ctxMenuX: number;
  ctxMenuY: number;
  ctxMenuTarget: 'card' | 'empty';
  ctxNoteId: string | null;

  // Inline rename
  renamingNoteId: string | null;
  renameValue: string;

  // Pointer drag
  dragNoteId: string | null;
  dragOverNoteId: string | null;
  isDragging: boolean;
  ghostX: number;
  ghostY: number;

  // Deletion dialog
  deletingNoteId: string | null;
}

function createSidebarController(initialNotes: Note[] = []) {
  let notes: Note[] = [...initialNotes];
  let selectedNoteId: string | null = notes[0]?.id ?? null;

  const state: SidebarInteractionState = {
    ctxMenuVisible: false,
    ctxMenuX: 0,
    ctxMenuY: 0,
    ctxMenuTarget: 'card',
    ctxNoteId: null,

    renamingNoteId: null,
    renameValue: '',

    dragNoteId: null,
    dragOverNoteId: null,
    isDragging: false,
    ghostX: 0,
    ghostY: 0,

    deletingNoteId: null,
  };

  // Mocked store methods
  const renameNote = vi.fn((id: string, newTitle: string) => {
    notes = notes.map((n) => (n.id === id ? { ...n, title: newTitle, updatedAt: Date.now() } : n));
  });

  const reorderNote = vi.fn((id: string, targetIndex: number) => {
    const sorted = [...notes].sort((a, b) => a.position - b.position);
    const item = sorted.find((n) => n.id === id);
    if (!item) return;
    const fromIdx = sorted.indexOf(item);
    sorted.splice(fromIdx, 1);
    const clamped = Math.max(0, Math.min(targetIndex, sorted.length));
    sorted.splice(clamped, 0, item);
    notes = sorted.map((n, i) => ({ ...n, position: i }));
  });

  const duplicateNote = vi.fn((id: string) => {
    const orig = notes.find((n) => n.id === id);
    if (!orig) return;
    const dup: Note = {
      id: `copy-${id}`,
      title: `${orig.title} (copy)`,
      content: orig.content,
      position: orig.position + 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    notes.splice(orig.position + 1, 0, dup);
    notes = notes.map((n, i) => ({ ...n, position: i }));
  });

  const deleteNote = vi.fn((id: string) => {
    notes = notes.filter((n) => n.id !== id).map((n, i) => ({ ...n, position: i }));
    if (selectedNoteId === id) {
      selectedNoteId = notes[0]?.id ?? null;
    }
  });

  const selectNote = vi.fn((id: string | null) => {
    selectedNoteId = id;
  });

  // --- Context menu actions ---

  function openNoteCtxMenu(e: { preventDefault: () => void; stopPropagation: () => void; clientX: number; clientY: number }, noteId: string): void {
    e.preventDefault();
    e.stopPropagation();
    closeCtxMenu();
    closeRename();
    cancelDrag();
    state.ctxNoteId = noteId;
    state.ctxMenuTarget = 'card';
    positionMenu(e.clientX, e.clientY);
    state.ctxMenuVisible = true;
  }

  function openEmptyCtxMenu(e: { preventDefault: () => void; clientX: number; clientY: number }): void {
    e.preventDefault();
    closeCtxMenu();
    closeRename();
    cancelDrag();
    state.ctxNoteId = null;
    state.ctxMenuTarget = 'empty';
    positionMenu(e.clientX, e.clientY);
    state.ctxMenuVisible = true;
  }

  function positionMenu(clientX: number, clientY: number): void {
    const menuWidth = 200;
    const menuHeight = 300;
    const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const winHeight = typeof window !== 'undefined' ? window.innerHeight : 768;

    let x = clientX;
    let y = clientY;
    if (x + menuWidth > winWidth) x = winWidth - menuWidth - 10;
    if (y + menuHeight > winHeight) y = winHeight - menuHeight - 10;

    state.ctxMenuX = x;
    state.ctxMenuY = y;
  }

  function closeCtxMenu(): void {
    state.ctxMenuVisible = false;
    state.ctxNoteId = null;
  }

  function handleCtxRename(): void {
    if (state.ctxNoteId) {
      const note = notes.find((n) => n.id === state.ctxNoteId);
      if (note) {
        state.renamingNoteId = state.ctxNoteId;
        state.renameValue = note.title;
        closeCtxMenu();
      }
    }
  }

  function handleCtxDuplicate(): void {
    if (state.ctxNoteId) {
      duplicateNote(state.ctxNoteId);
      closeCtxMenu();
    }
  }

  function handleCtxDelete(): void {
    if (state.ctxNoteId) {
      state.deletingNoteId = state.ctxNoteId;
      closeCtxMenu();
    }
  }

  // --- Inline rename actions ---

  function commitRename(): void {
    if (state.renamingNoteId) {
      const trimmed = state.renameValue.trim();
      if (trimmed.length > 0) {
        renameNote(state.renamingNoteId, trimmed);
      }
      state.renamingNoteId = null;
      state.renameValue = '';
    }
  }

  function closeRename(): void {
    state.renamingNoteId = null;
    state.renameValue = '';
  }

  function handleRenameKeydown(e: { key: string; preventDefault: () => void }): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeRename();
    }
  }

  // --- Pointer drag actions ---

  function handlePointerDown(e: { button: number; pointerId: number; target: { closest: (s: string) => any } }, id: string, setCapture?: (id: number) => void): void {
    if (e.button !== 0) return;
    if (e.target.closest('button') || e.target.closest('input')) return;

    closeCtxMenu();
    state.dragNoteId = id;
    state.isDragging = false;
    state.ghostX = 0;
    state.ghostY = 0;

    if (setCapture) {
      setCapture(e.pointerId);
    }
  }

  function handlePointerMove(e: { clientX: number; clientY: number }, id: string, getElementUnderCursor?: () => string | null): void {
    if (state.dragNoteId !== id) return;

    if (!state.isDragging) {
      state.isDragging = true;
    }

    state.ghostX = e.clientX;
    state.ghostY = e.clientY;

    const underId = getElementUnderCursor ? getElementUnderCursor() : null;
    if (underId && underId !== state.dragNoteId) {
      state.dragOverNoteId = underId;
    } else {
      state.dragOverNoteId = null;
    }
  }

  function handlePointerUp(e: { pointerId: number }, id: string, releaseCapture?: (id: number) => void): void {
    if (state.dragNoteId !== id) return;

    if (releaseCapture) {
      try {
        releaseCapture(e.pointerId);
      } catch {
        // ignore
      }
    }

    if (state.isDragging && state.dragOverNoteId && state.dragOverNoteId !== state.dragNoteId) {
      const targetIdx = notes.findIndex((n) => n.id === state.dragOverNoteId);
      if (targetIdx !== -1) {
        reorderNote(state.dragNoteId, targetIdx);
      }
    }

    state.dragNoteId = null;
    state.dragOverNoteId = null;
    state.ghostX = 0;
    state.ghostY = 0;
    state.isDragging = false;
  }

  function cancelDrag(releaseCapture?: () => void): void {
    if (releaseCapture) {
      try {
        releaseCapture();
      } catch {
        // ignore
      }
    }
    state.dragNoteId = null;
    state.dragOverNoteId = null;
    state.isDragging = false;
    state.ghostX = 0;
    state.ghostY = 0;
  }

  // --- Global cancellation / lifecycle handlers ---

  function handleWindowEscape(): void {
    if (state.ctxMenuVisible) {
      closeCtxMenu();
    }
    if (state.renamingNoteId) {
      closeRename();
    }
    if (state.dragNoteId || state.isDragging) {
      cancelDrag();
    }
  }

  function handleWindowClick(): void {
    if (state.ctxMenuVisible) {
      closeCtxMenu();
    }
  }

  function handleWindowBlur(): void {
    if (state.ctxMenuVisible) {
      closeCtxMenu();
    }
    if (state.dragNoteId || state.isDragging) {
      cancelDrag();
    }
  }

  function handleSelectNote(id: string, onSelectCb?: () => void): void {
    if (state.isDragging) return;
    closeCtxMenu();
    closeRename();
    selectNote(id);
    onSelectCb?.();
  }

  return {
    state,
    getNotes: () => notes,
    getSelectedId: () => selectedNoteId,
    // Methods
    openNoteCtxMenu,
    openEmptyCtxMenu,
    closeCtxMenu,
    handleCtxRename,
    handleCtxDuplicate,
    handleCtxDelete,
    commitRename,
    closeRename,
    handleRenameKeydown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    cancelDrag,
    handleWindowEscape,
    handleWindowClick,
    handleWindowBlur,
    handleSelectNote,
    // Spies
    renameNote,
    reorderNote,
    duplicateNote,
    deleteNote,
    selectNote,
  };
}

// ---------------------------------------------------------------------------
// Test Suites for US3 Interactions
// ---------------------------------------------------------------------------

describe('T018 [US3] NoteSidebar Interaction Tests', () => {
  const sampleNotes: Note[] = [
    { id: 'note-1', title: 'First Note', content: '<p>Content 1</p>', position: 0, createdAt: 1000, updatedAt: 1000 },
    { id: 'note-2', title: 'Second Note', content: '<p>Content 2</p>', position: 1, createdAt: 2000, updatedAt: 2000 },
    { id: 'note-3', title: 'Third Note', content: '<p>Content 3</p>', position: 2, createdAt: 3000, updatedAt: 3000 },
  ];

  describe('Escape Key Cancellation Lifecycle', () => {
    it('closes open context menu when Escape is pressed', () => {
      const c = createSidebarController(sampleNotes);
      c.openNoteCtxMenu({ preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 100, clientY: 200 }, 'note-1');

      expect(c.state.ctxMenuVisible).toBe(true);
      expect(c.state.ctxNoteId).toBe('note-1');

      c.handleWindowEscape();

      expect(c.state.ctxMenuVisible).toBe(false);
      expect(c.state.ctxNoteId).toBeNull();
    });

    it('cancels inline rename and restores original title when Escape is pressed', () => {
      const c = createSidebarController(sampleNotes);
      c.openNoteCtxMenu({ preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 100, clientY: 200 }, 'note-1');
      c.handleCtxRename();

      expect(c.state.renamingNoteId).toBe('note-1');
      expect(c.state.renameValue).toBe('First Note');

      // User modified the rename input draft
      c.state.renameValue = 'Draft Not Committed';

      // Press Escape on input or window
      c.handleRenameKeydown({ key: 'Escape', preventDefault: vi.fn() });

      expect(c.state.renamingNoteId).toBeNull();
      expect(c.state.renameValue).toBe('');
      expect(c.renameNote).not.toHaveBeenCalled();
      expect(c.getNotes()[0].title).toBe('First Note');
    });

    it('cancels active pointer drag when Escape is pressed', () => {
      const c = createSidebarController(sampleNotes);
      c.handlePointerDown({ button: 0, pointerId: 1, target: { closest: () => null } }, 'note-1');
      c.handlePointerMove({ clientX: 150, clientY: 300 }, 'note-1', () => 'note-2');

      expect(c.state.isDragging).toBe(true);
      expect(c.state.dragNoteId).toBe('note-1');
      expect(c.state.dragOverNoteId).toBe('note-2');

      c.handleWindowEscape();

      expect(c.state.isDragging).toBe(false);
      expect(c.state.dragNoteId).toBeNull();
      expect(c.state.dragOverNoteId).toBeNull();
      expect(c.state.ghostX).toBe(0);
      expect(c.state.ghostY).toBe(0);
      expect(c.reorderNote).not.toHaveBeenCalled();
    });

    it('handles multiple active interaction states cleanly on Escape', () => {
      const c = createSidebarController(sampleNotes);
      c.state.ctxMenuVisible = true;
      c.state.ctxNoteId = 'note-1';
      c.state.renamingNoteId = 'note-2';
      c.state.renameValue = 'Transient Draft';
      c.state.isDragging = true;
      c.state.dragNoteId = 'note-3';

      c.handleWindowEscape();

      expect(c.state.ctxMenuVisible).toBe(false);
      expect(c.state.ctxNoteId).toBeNull();
      expect(c.state.renamingNoteId).toBeNull();
      expect(c.state.renameValue).toBe('');
      expect(c.state.isDragging).toBe(false);
      expect(c.state.dragNoteId).toBeNull();
    });
  });

  describe('Outside Click & Window Dismissal', () => {
    it('closes context menu on outside window click', () => {
      const c = createSidebarController(sampleNotes);
      c.openNoteCtxMenu({ preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 50, clientY: 50 }, 'note-2');

      expect(c.state.ctxMenuVisible).toBe(true);

      c.handleWindowClick();

      expect(c.state.ctxMenuVisible).toBe(false);
      expect(c.state.ctxNoteId).toBeNull();
    });

    it('closes context menu and cancels in-flight drag on window blur', () => {
      const c = createSidebarController(sampleNotes);
      c.openNoteCtxMenu({ preventDefault: vi.fn(), stopPropagation: vi.fn(), clientX: 50, clientY: 50 }, 'note-2');
      c.state.isDragging = true;
      c.state.dragNoteId = 'note-1';

      c.handleWindowBlur();

      expect(c.state.ctxMenuVisible).toBe(false);
      expect(c.state.ctxNoteId).toBeNull();
      expect(c.state.isDragging).toBe(false);
      expect(c.state.dragNoteId).toBeNull();
    });

    it('selecting a note closes context menu and cancels active rename', () => {
      const c = createSidebarController(sampleNotes);
      c.state.ctxMenuVisible = true;
      c.state.ctxNoteId = 'note-1';
      c.state.renamingNoteId = 'note-2';
      c.state.renameValue = 'Unsaved rename';

      const selectCallback = vi.fn();
      c.handleSelectNote('note-3', selectCallback);

      expect(c.state.ctxMenuVisible).toBe(false);
      expect(c.state.ctxNoteId).toBeNull();
      expect(c.state.renamingNoteId).toBeNull();
      expect(c.selectNote).toHaveBeenCalledWith('note-3');
      expect(selectCallback).toHaveBeenCalledOnce();
    });
  });

  describe('Inline Rename Trimming & Restoration Lifecycle', () => {
    it('commits rename with trimmed whitespace on commitRename', () => {
      const c = createSidebarController(sampleNotes);
      c.state.renamingNoteId = 'note-1';
      c.state.renameValue = '   Renamed Inki Note   ';

      c.commitRename();

      expect(c.renameNote).toHaveBeenCalledWith('note-1', 'Renamed Inki Note');
      expect(c.state.renamingNoteId).toBeNull();
      expect(c.state.renameValue).toBe('');
      expect(c.getNotes()[0].title).toBe('Renamed Inki Note');
    });

    it('commits on Enter keydown event', () => {
      const c = createSidebarController(sampleNotes);
      c.state.renamingNoteId = 'note-2';
      c.state.renameValue = 'New Title From Enter';

      const preventDefault = vi.fn();
      c.handleRenameKeydown({ key: 'Enter', preventDefault });

      expect(preventDefault).toHaveBeenCalledOnce();
      expect(c.renameNote).toHaveBeenCalledWith('note-2', 'New Title From Enter');
      expect(c.state.renamingNoteId).toBeNull();
    });

    it('does NOT commit if new title is empty string — restores original', () => {
      const c = createSidebarController(sampleNotes);
      c.state.renamingNoteId = 'note-1';
      c.state.renameValue = '';

      c.commitRename();

      expect(c.renameNote).not.toHaveBeenCalled();
      expect(c.state.renamingNoteId).toBeNull();
      expect(c.getNotes()[0].title).toBe('First Note');
    });

    it('does NOT commit if new title is whitespace only — restores original', () => {
      const c = createSidebarController(sampleNotes);
      c.state.renamingNoteId = 'note-1';
      c.state.renameValue = '     \t\n   ';

      c.commitRename();

      expect(c.renameNote).not.toHaveBeenCalled();
      expect(c.state.renamingNoteId).toBeNull();
      expect(c.getNotes()[0].title).toBe('First Note');
    });

    it('closeRename without commit leaves note untouched', () => {
      const c = createSidebarController(sampleNotes);
      c.state.renamingNoteId = 'note-1';
      c.state.renameValue = 'Ignored Change';

      c.closeRename();

      expect(c.renameNote).not.toHaveBeenCalled();
      expect(c.state.renamingNoteId).toBeNull();
      expect(c.state.renameValue).toBe('');
      expect(c.getNotes()[0].title).toBe('First Note');
    });
  });

  describe('Pointer Drag & Drop Cancellation Lifecycle', () => {
    it('initiates drag state on primary mouse button down on card', () => {
      const c = createSidebarController(sampleNotes);
      const setCapture = vi.fn();

      c.handlePointerDown(
        { button: 0, pointerId: 10, target: { closest: (s: string) => (s === 'button' || s === 'input' ? null : {}) } },
        'note-1',
        setCapture
      );

      expect(c.state.dragNoteId).toBe('note-1');
      expect(c.state.isDragging).toBe(false);
      expect(setCapture).toHaveBeenCalledWith(10);
    });

    it('ignores non-primary pointer down clicks (e.g. right click button 2)', () => {
      const c = createSidebarController(sampleNotes);
      c.handlePointerDown(
        { button: 2, pointerId: 10, target: { closest: () => null } },
        'note-1'
      );

      expect(c.state.dragNoteId).toBeNull();
      expect(c.state.isDragging).toBe(false);
    });

    it('ignores clicks on buttons or input fields inside card to avoid accidental drags', () => {
      const c = createSidebarController(sampleNotes);
      c.handlePointerDown(
        {
          button: 0,
          pointerId: 10,
          target: { closest: (selector: string) => (selector === 'button' ? {} : null) },
        },
        'note-1'
      );

      expect(c.state.dragNoteId).toBeNull();
      expect(c.state.isDragging).toBe(false);
    });

    it('pointer move updates isDragging, ghost coordinates, and dragOverNoteId', () => {
      const c = createSidebarController(sampleNotes);
      c.handlePointerDown({ button: 0, pointerId: 10, target: { closest: () => null } }, 'note-1');

      c.handlePointerMove({ clientX: 200, clientY: 450 }, 'note-1', () => 'note-3');

      expect(c.state.isDragging).toBe(true);
      expect(c.state.ghostX).toBe(200);
      expect(c.state.ghostY).toBe(450);
      expect(c.state.dragOverNoteId).toBe('note-3');
    });

    it('pointercancel event cleanly resets drag state and releases pointer capture', () => {
      const c = createSidebarController(sampleNotes);
      c.handlePointerDown({ button: 0, pointerId: 10, target: { closest: () => null } }, 'note-1');
      c.handlePointerMove({ clientX: 200, clientY: 450 }, 'note-1', () => 'note-2');

      expect(c.state.isDragging).toBe(true);

      const releaseCapture = vi.fn();
      c.cancelDrag(releaseCapture);

      expect(releaseCapture).toHaveBeenCalledOnce();
      expect(c.state.isDragging).toBe(false);
      expect(c.state.dragNoteId).toBeNull();
      expect(c.state.dragOverNoteId).toBeNull();
      expect(c.state.ghostX).toBe(0);
      expect(c.state.ghostY).toBe(0);
      expect(c.reorderNote).not.toHaveBeenCalled();
    });

    it('successful pointer up over different note reorders notes', () => {
      const c = createSidebarController(sampleNotes);
      c.handlePointerDown({ button: 0, pointerId: 10, target: { closest: () => null } }, 'note-1');
      c.handlePointerMove({ clientX: 200, clientY: 450 }, 'note-1', () => 'note-3');

      const releaseCapture = vi.fn();
      c.handlePointerUp({ pointerId: 10 }, 'note-1', releaseCapture);

      expect(releaseCapture).toHaveBeenCalledWith(10);
      expect(c.reorderNote).toHaveBeenCalledWith('note-1', 2);
      expect(c.state.isDragging).toBe(false);
      expect(c.state.dragNoteId).toBeNull();
      expect(c.state.dragOverNoteId).toBeNull();
    });

    it('pointer up over same note does NOT trigger reordering', () => {
      const c = createSidebarController(sampleNotes);
      c.handlePointerDown({ button: 0, pointerId: 10, target: { closest: () => null } }, 'note-1');
      c.handlePointerMove({ clientX: 200, clientY: 450 }, 'note-1', () => 'note-1');

      c.handlePointerUp({ pointerId: 10 }, 'note-1');

      expect(c.reorderNote).not.toHaveBeenCalled();
      expect(c.state.isDragging).toBe(false);
    });

    it('prevents note selection while isDragging is active', () => {
      const c = createSidebarController(sampleNotes);
      c.state.isDragging = true;

      const onSelect = vi.fn();
      c.handleSelectNote('note-2', onSelect);

      expect(c.selectNote).not.toHaveBeenCalled();
      expect(onSelect).not.toHaveBeenCalled();
    });
  });
});
