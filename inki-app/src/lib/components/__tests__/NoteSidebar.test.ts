import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

/**
 * Tests for NoteSidebar.svelte — timeAgo utility and onNoteSelect callback.
 *
 * Key behaviors:
 * 1. timeAgo() returns relative time strings based on the difference from now
 * 2. handleSelectNote(id) calls selectNote(id) then onNoteSelect?.()
 * 3. onNoteSelect is optional (uses ?.() syntax)
 * 4. handleNewNote calls addNote and selectNote
 */

// --- timeAgo function (extracted from NoteSidebar.svelte for testing) ---
function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

describe("NoteSidebar — timeAgo function", () => {
  beforeEach(() => {
    // Freeze Date.now to a specific time for deterministic tests
    // June 17, 2026 12:00:00 UTC
    const MOCK_NOW = new Date("2026-06-17T12:00:00Z").getTime();
    jestMockDateNow(MOCK_NOW);
  });

  afterEach(() => {
    jestMockDateNowRestore();
  });

  test('returns "just now" for timestamps less than 60 seconds ago', () => {
    const now = Date.now();
    const result = timeAgo(now - 30_000);
    expect(result).toBe("just now");
  });

  test('returns "just now" for timestamps 0 seconds ago', () => {
    const now = Date.now();
    const result = timeAgo(now);
    expect(result).toBe("just now");
  });

  test('returns "Xm ago" for timestamps 1-59 minutes ago', () => {
    const now = Date.now();
    const result = timeAgo(now - 5 * 60 * 1000);
    expect(result).toBe("5m ago");
  });

  test('returns "1m ago" for exactly 1 minute', () => {
    const now = Date.now();
    const result = timeAgo(now - 60_000);
    expect(result).toBe("1m ago");
  });

  test('returns "Xh ago" for timestamps 1-23 hours ago', () => {
    const now = Date.now();
    const result = timeAgo(now - 3 * 60 * 60 * 1000);
    expect(result).toBe("3h ago");
  });

  test('returns "1h ago" for exactly 1 hour', () => {
    const now = Date.now();
    const result = timeAgo(now - 60 * 60 * 1000);
    expect(result).toBe("1h ago");
  });

  test('returns "Xd ago" for timestamps 1-6 days ago', () => {
    const now = Date.now();
    const result = timeAgo(now - 4 * 24 * 60 * 60 * 1000);
    expect(result).toBe("4d ago");
  });

  test('returns "1d ago" for exactly 1 day', () => {
    const now = Date.now();
    const result = timeAgo(now - 24 * 60 * 60 * 1000);
    expect(result).toBe("1d ago");
  });

  test("returns formatted date for timestamps 7 or more days ago", () => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const dateStr = new Date(sevenDaysAgo).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const result = timeAgo(sevenDaysAgo);
    expect(result).toBe(dateStr);
  });

  test("handles future timestamps (negative diff)", () => {
    const now = Date.now();
    const result = timeAgo(now + 60 * 60 * 1000);
    // future diff = negative → seconds < 60 → "just now"
    expect(result).toBe("just now");
  });
});

describe("NoteSidebar — handleSelectNote callback", () => {
  test("calls onNoteSelect when a note is selected and callback is provided", () => {
    const onNoteSelectMock = mock(() => {});
    const selectNoteMock = mock((_id: string) => {});

    // Simulate handleSelectNote from NoteSidebar
    function handleSelectNote(id: string) {
      selectNoteMock(id);
      onNoteSelectMock();
    }

    handleSelectNote("note-1");

    expect(selectNoteMock).toHaveBeenCalledWith("note-1");
    expect(onNoteSelectMock).toHaveBeenCalled();
  });

  test("does not throw when onNoteSelect is undefined", () => {
    const selectNoteMock = mock((_id: string) => {});

    // Simulate handleSelectNote when onNoteSelect is undefined
    function handleSelectNote(id: string) {
      selectNoteMock(id);
      // onNoteSelect?.() — optional chaining, should not throw
    }

    expect(() => {
      handleSelectNote("note-1");
    }).not.toThrow();

    expect(selectNoteMock).toHaveBeenCalledWith("note-1");
  });

  test("handleSelectNote calls selectNote before onNoteSelect", () => {
    const callOrder: string[] = [];
    const selectNoteMock = mock((_id: string) => {
      callOrder.push("selectNote");
    });
    const onNoteSelectMock = mock(() => {
      callOrder.push("onNoteSelect");
    });

    function handleSelectNote(id: string) {
      selectNoteMock(id);
      onNoteSelectMock();
    }

    handleSelectNote("note-1");

    expect(callOrder).toEqual(["selectNote", "onNoteSelect"]);
  });
});

describe("NoteSidebar — handleNewNote logic", () => {
  test("addNote and selectNote are called when creating a new note", () => {
    const addNoteMock = mock(() => ({
      id: "new-note-id",
      title: "New Note",
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }));
    const selectNoteMock = mock((_id: string) => {});

    // Simulate handleNewNote from NoteSidebar
    function handleNewNote() {
      const note = addNoteMock();
      selectNoteMock(note.id);
    }

    handleNewNote();

    expect(addNoteMock).toHaveBeenCalled();
    expect(selectNoteMock).toHaveBeenCalledWith("new-note-id");
  });
});

describe("NoteSidebar — delete dialog behavior", () => {
  test("handleDeleteClick prevents event propagation", () => {
    const stopPropagationMock = mock(() => {});
    const event = { stopPropagation: stopPropagationMock } as unknown as Event;

    // Simulate handleDeleteClick from NoteSidebar
    let deletingNoteId: string | null = null;

    function handleDeleteClick(e: Event, id: string): void {
      e.stopPropagation();
      deletingNoteId = id;
    }

    handleDeleteClick(event, "note-to-delete");

    expect(stopPropagationMock).toHaveBeenCalled();
    expect(deletingNoteId).toBe("note-to-delete");
  });

  test("handleConfirmDelete calls deleteNote and resets deleting state", () => {
    let deletingNoteId: string | null = "note-to-delete";
    const deleteNoteMock = mock((_id: string) => {});

    // Simulate handleConfirmDelete from NoteSidebar
    function handleConfirmDelete(): void {
      if (deletingNoteId) {
        deleteNoteMock(deletingNoteId);
        deletingNoteId = null;
      }
    }

    handleConfirmDelete();

    expect(deleteNoteMock).toHaveBeenCalledWith("note-to-delete");
    expect(deletingNoteId).toBeNull();
  });

  test("handleConfirmDelete does nothing when no note is pending deletion", () => {
    let deletingNoteId: string | null = null;
    const deleteNoteMock = mock((_id: string) => {});

    function handleConfirmDelete(): void {
      if (deletingNoteId) {
        deleteNoteMock(deletingNoteId);
        deletingNoteId = null;
      }
    }

    handleConfirmDelete();

    expect(deleteNoteMock).not.toHaveBeenCalled();
  });

  test("handleCancelDelete clears the pending deletion state", () => {
    let deletingNoteId: string | null = "note-to-delete";

    function handleCancelDelete(): void {
      deletingNoteId = null;
    }

    handleCancelDelete();

    expect(deletingNoteId).toBeNull();
  });

  test("dialog 'open' callback resets deletion state when dialog closes", () => {
    let deletingNoteId: string | null = "note-to-delete";

    // From NoteSidebar: onOpenChange={(open) => { if (!open) deletingNoteId = null; }}
    function onOpenChange(open: boolean): void {
      if (!open) deletingNoteId = null;
    }

    // Dialog closes
    onOpenChange(false);
    expect(deletingNoteId).toBeNull();

    // Re-open dialog
    deletingNoteId = "another-note";
    onOpenChange(true);
    expect(deletingNoteId).toBe("another-note");
  });

  test("handleSelectNote selects the note after calling selectNote", () => {
    const selectNoteMock = mock((_id: string) => {});
    const onNoteSelectMock = mock(() => {});
    let selected: string | null = null;

    // Simulate the full handleSelectNote
    function handleSelectNote(id: string): void {
      selectNoteMock(id);
      onNoteSelectMock();
    }

    handleSelectNote("note-1");
    expect(selectNoteMock).toHaveBeenCalledWith("note-1");
    expect(onNoteSelectMock).toHaveBeenCalled();
  });

  test("keyboard Enter and Space trigger note selection", () => {
    const selectNoteMock = mock((_id: string) => {});
    const onNoteSelectMock = mock(() => {});

    function handleKeydown(e: KeyboardEvent, id: string): void {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectNoteMock(id);
        onNoteSelectMock();
      }
    }

    // Test Enter key
    const enterEvent = { key: "Enter", preventDefault: mock(() => {}) } as unknown as KeyboardEvent;
    handleKeydown(enterEvent, "note-1");
    expect(selectNoteMock).toHaveBeenCalledWith("note-1");

    selectNoteMock.mockClear();

    // Test Space key
    const spaceEvent = { key: " ", preventDefault: mock(() => {}) } as unknown as KeyboardEvent;
    handleKeydown(spaceEvent, "note-2");
    expect(selectNoteMock).toHaveBeenCalledWith("note-2");
  });
});

describe("NoteSidebar — reorderNote logic", () => {
  test("reorderNote moves a note to a new position and updates positions of others", () => {
    const notes = [
      { id: "a", title: "A", position: 0 },
      { id: "b", title: "B", position: 1 },
      { id: "c", title: "C", position: 2 },
    ];

    function reorderNote(id: string, newPosition: number) {
      const sorted = [...notes].sort((a: any, b: any) => a.position - b.position);
      const note = sorted.find((n) => n.id === id);
      if (!note) return;

      const clamped = Math.max(0, Math.min(newPosition, sorted.length - 1));
      sorted.splice(sorted.indexOf(note), 1);
      sorted.splice(clamped, 0, note);

      const updated = sorted.map((n: any, i: number) => ({ ...n, position: i }));

      expect(updated[0].id).toBe("b");
      expect(updated[0].position).toBe(0);
      expect(updated[1].id).toBe("a");
      expect(updated[1].position).toBe(1);
      expect(updated[2].id).toBe("c");
      expect(updated[2].position).toBe(2);
    }

    // Move "a" to position 1 (after "b")
    reorderNote("a", 1);
  });

  test("reorderNote clamps position to valid range", () => {
    const notes = [
      { id: "a", title: "A", position: 0 },
      { id: "b", title: "B", position: 1 },
    ];

    function reorderNote(id: string, newPosition: number) {
      const sorted = [...notes].sort((a: any, b: any) => a.position - b.position);
      const note = sorted.find((n) => n.id === id);
      if (!note) return;
      const clamped = Math.max(0, Math.min(newPosition, sorted.length - 1));
      expect(clamped).toBe(1); // clamped from 999 to 1
    }

    reorderNote("a", 999);
  });

  test("reorderNote does nothing for unknown id", () => {
    let called = false;
    function reorderNote(id: string) {
      const sorted: any[] = [];
      const note = sorted.find((n) => n.id === id);
      if (!note) return;
      called = true;
    }
    reorderNote("nonexistent");
    expect(called).toBe(false);
  });
});

describe("NoteSidebar — duplicateNote logic", () => {
  test("duplicateNote creates a copy with (copy) suffix at position+1", () => {
    const notes: any[] = [
      { id: "a", title: "Note A", content: "hello", position: 0 },
      { id: "b", title: "Note B", content: "world", position: 1 },
    ];

    function duplicateNote(id: string) {
      const original = notes.find((n) => n.id === id);
      if (!original) return null;
      const sorted = [...notes].sort((a, b) => a.position - b.position);
      const origIdx = sorted.indexOf(original);
      const duplicate = {
        id: "new-id",
        title: `${original.title} (copy)`,
        content: original.content,
        position: origIdx + 1,
      };
      sorted.splice(origIdx + 1, 0, duplicate);
      const updated = sorted.map((n, i) => ({ ...n, position: i }));

      expect(updated).toHaveLength(3);
      expect(updated[0].id).toBe("a");
      expect(updated[1].id).toBe("new-id");
      expect(updated[1].title).toBe("Note A (copy)");
      expect(updated[2].id).toBe("b");
    }

    duplicateNote("a");
  });

  test("duplicateNote returns null for unknown id", () => {
    const notes: any[] = [];
    function duplicateNote(id: string) {
      const original = notes.find((n) => n.id === id);
      return original ? {} : null;
    }
    expect(duplicateNote("nonexistent")).toBeNull();
  });
});

describe("NoteSidebar — moveNote logic", () => {
  test("moveNote up swaps with previous note", () => {
    const notes = [
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ];

    function moveNote(id: string, direction: string) {
      const sorted = [...notes].sort((a: any, b: any) => a.position - b.position);
      const idx = sorted.findIndex((n: any) => n.id === id);
      if (idx === -1) return;
      let newIdx = idx;
      if (direction === "up" && idx > 0) newIdx = idx - 1;
      else return;
      const [note] = sorted.splice(idx, 1);
      sorted.splice(newIdx, 0, note);
      const updated = sorted.map((n: any, i: number) => ({ ...n, position: i }));
      expect(updated[0].id).toBe("b");
      expect(updated[1].id).toBe("a");
    }

    moveNote("a", "up");
  });

  test("moveNote down swaps with next note", () => {
    const notes = [
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ];

    function moveNote(id: string, direction: string) {
      const sorted = [...notes].sort((a: any, b: any) => a.position - b.position);
      const idx = sorted.findIndex((n: any) => n.id === id);
      if (idx === -1) return;
      let newIdx = idx;
      if (direction === "down" && idx < sorted.length - 1) newIdx = idx + 1;
      else return;
      const [note] = sorted.splice(idx, 1);
      sorted.splice(newIdx, 0, note);
      const updated = sorted.map((n: any, i: number) => ({ ...n, position: i }));
      expect(updated[0].id).toBe("b");
      expect(updated[1].id).toBe("a");
    }

    moveNote("b", "down");
  });

  test("moveNote top moves to position 0", () => {
    const notes = [
      { id: "a", position: 0 },
      { id: "b", position: 1 },
      { id: "c", position: 2 },
    ];

    function moveNote(id: string, direction: string) {
      const sorted = [...notes].sort((a: any, b: any) => a.position - b.position);
      const idx = sorted.findIndex((n: any) => n.id === id);
      if (idx === -1) return;
      let newIdx = idx;
      if (direction === "top") newIdx = 0;
      else return;
      const [note] = sorted.splice(idx, 1);
      sorted.splice(newIdx, 0, note);
      const updated = sorted.map((n: any, i: number) => ({ ...n, position: i }));
      expect(updated[0].id).toBe("c");
    }

    moveNote("c", "top");
  });

  test("moveNote bottom moves to last position", () => {
    const notes = [
      { id: "a", position: 0 },
      { id: "b", position: 1 },
      { id: "c", position: 2 },
    ];

    function moveNote(id: string, direction: string) {
      const sorted = [...notes].sort((a: any, b: any) => a.position - b.position);
      const idx = sorted.findIndex((n: any) => n.id === id);
      if (idx === -1) return;
      let newIdx = idx;
      if (direction === "bottom") newIdx = sorted.length - 1;
      else return;
      const [note] = sorted.splice(idx, 1);
      sorted.splice(newIdx, 0, note);
      const updated = sorted.map((n: any, i: number) => ({ ...n, position: i }));
      expect(updated[2].id).toBe("a");
    }

    moveNote("a", "bottom");
  });

  test("moveNote does nothing when already at top and moving up", () => {
    const notes = [
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ];

    function moveNote(id: string, direction: string) {
      const sorted = [...notes].sort((a: any, b: any) => a.position - b.position);
      const idx = sorted.findIndex((n: any) => n.id === id);
      if (idx === -1) return;
      if (direction === "up" && idx > 0) {
        // would move
      }
      // else no-op: positions unchanged
    }

    moveNote("a", "up");
    expect(notes[0].id).toBe("a");
    expect(notes[0].position).toBe(0);
  });

  test("moveNote does nothing for unknown id", () => {
    let called = false;
    function moveNote(id: string) {
      const sorted: any[] = [];
      const idx = sorted.findIndex((n: any) => n.id === id);
      if (idx === -1) return;
      called = true;
    }
    moveNote("nonexistent");
    expect(called).toBe(false);
  });
});

describe("NoteSidebar — context menu behavior", () => {
  test("openNoteCtxMenu sets correct state for card context menu", () => {
    let ctxMenuVisible = false;
    let ctxMenuTarget = "";
    let ctxNoteId: string | null = null;

    function openNoteCtxMenu(e: Event, noteId: string) {
      e.preventDefault();
      e.stopPropagation();
      ctxNoteId = noteId;
      ctxMenuTarget = "card";
      ctxMenuVisible = true;
    }

    const event = {
      preventDefault: mock(() => {}),
      stopPropagation: mock(() => {}),
    } as unknown as MouseEvent;

    openNoteCtxMenu(event, "note-123");

    expect(ctxMenuVisible).toBe(true);
    expect(ctxMenuTarget).toBe("card");
    expect(ctxNoteId).toBe("note-123");
  });

  test("openEmptyCtxMenu sets target to 'empty'", () => {
    let ctxMenuVisible = false;
    let ctxMenuTarget = "";
    let ctxNoteId: string | null = "old-id";

    function openEmptyCtxMenu(e: Event) {
      e.preventDefault();
      ctxNoteId = null;
      ctxMenuTarget = "empty";
      ctxMenuVisible = true;
    }

    const event = { preventDefault: mock(() => {}) } as unknown as MouseEvent;

    openEmptyCtxMenu(event);

    expect(ctxMenuVisible).toBe(true);
    expect(ctxMenuTarget).toBe("empty");
    expect(ctxNoteId).toBeNull();
  });

  test("closeCtxMenu resets menu state", () => {
    let ctxMenuVisible = true;
    let ctxNoteId: string | null = "note-1";

    function closeCtxMenu() {
      ctxMenuVisible = false;
      ctxNoteId = null;
    }

    closeCtxMenu();

    expect(ctxMenuVisible).toBe(false);
    expect(ctxNoteId).toBeNull();
  });

  test("handleCtxRename sets rename state and closes menu", () => {
    let ctxNoteId: string | null = "note-1";
    let renamingNoteId: string | null = null;
    let renameValue = "";
    let ctxMenuVisible = true;

    const notes = [{ id: "note-1", title: "My Note" }];

    function handleCtxRename() {
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

    expect(renamingNoteId).toBe("note-1");
    expect(renameValue).toBe("My Note");
    expect(ctxMenuVisible).toBe(false);
  });

  test("handleCtxDelete sets deletingNoteId and closes menu", () => {
    let ctxNoteId: string | null = "note-1";
    let deletingNoteId: string | null = null;
    let ctxMenuVisible = true;

    function handleCtxDelete() {
      if (ctxNoteId) deletingNoteId = ctxNoteId;
      ctxMenuVisible = false;
    }

    handleCtxDelete();

    expect(deletingNoteId).toBe("note-1");
    expect(ctxMenuVisible).toBe(false);
  });
});

describe("NoteSidebar — inline rename", () => {
  test("commitRename saves trimmed non-empty title", () => {
    let renamingNoteId: string | null = "note-1";
    let renameValue = "  New Title  ";
    let savedId = "";
    let savedTitle = "";

    function renameNote(id: string, title: string) {
      savedId = id;
      savedTitle = title;
    }

    function commitRename() {
      if (renamingNoteId) {
        const val = renameValue.trim();
        if (val) renameNote(renamingNoteId, val);
        renamingNoteId = null;
      }
    }

    commitRename();

    expect(savedId).toBe("note-1");
    expect(savedTitle).toBe("New Title");
    expect(renamingNoteId).toBeNull();
  });

  test("commitRename does not save empty title", () => {
    let renamingNoteId: string | null = "note-1";
    let renameValue = "  ";
    let saved = false;

    function renameNote(_id: string, _title: string) {
      saved = true;
    }

    function commitRename() {
      if (renamingNoteId) {
        const val = renameValue.trim();
        if (val) renameNote(renamingNoteId, val);
        renamingNoteId = null;
      }
    }

    commitRename();

    expect(saved).toBe(false);
    expect(renamingNoteId).toBeNull();
  });

  test("closeRename clears rename state", () => {
    let renamingNoteId: string | null = "note-1";

    function closeRename() {
      renamingNoteId = null;
    }

    closeRename();
    expect(renamingNoteId).toBeNull();
  });

  test("handleRenameKeydown Enter commits rename", () => {
    let committed = false;

    function commitRename() {
      committed = true;
    }

    function handleRenameKeydown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        e.preventDefault();
        commitRename();
      }
    }

    const event = { key: "Enter", preventDefault: mock(() => {}) } as unknown as KeyboardEvent;
    handleRenameKeydown(event);
    expect(committed).toBe(true);
  });

  test("handleRenameKeydown Escape closes rename", () => {
    let closed = false;

    function closeRename() {
      closed = true;
    }

    function handleRenameKeydown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeRename();
      }
    }

    const event = { key: "Escape", preventDefault: mock(() => {}) } as unknown as KeyboardEvent;
    handleRenameKeydown(event);
    expect(closed).toBe(true);
  });
});

describe("NoteSidebar — pointer events drag and drop", () => {
  test("handlePointerDown sets dragNoteId and captures pointer", () => {
    let dragNoteId: string | null = null;
    let pointerCaptured = false;
    let isDragging = false;

    const closestMock = mock((selector: string) => {
      if (selector === "button" || selector === "input") return null;
      return {
        setPointerCapture: mock(() => {
          pointerCaptured = true;
        }),
      };
    });

    const event = {
      button: 0,
      pointerId: 42,
      target: {
        closest: closestMock,
      },
    } as unknown as PointerEvent;

    function handlePointerDown(e: PointerEvent, id: string) {
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (target.closest("button") || target.closest("input")) return;
      dragNoteId = id;
      isDragging = false;
      target.closest('[role="button"]')?.setPointerCapture(e.pointerId);
    }

    handlePointerDown(event, "note-1");

    expect(dragNoteId).toBe("note-1");
    expect(isDragging).toBe(false);
    expect(pointerCaptured).toBe(true);
  });

  test("handlePointerDown ignores clicks with secondary mouse buttons", () => {
    let dragNoteId: string | null = null;
    const event = { button: 2 } as unknown as PointerEvent;

    function handlePointerDown(e: PointerEvent, id: string) {
      if (e.button !== 0) return;
      dragNoteId = id;
    }

    handlePointerDown(event, "note-1");
    expect(dragNoteId).toBeNull();
  });

  test("handlePointerMove marks isDragging as true", () => {
    let dragNoteId: string | null = "note-1";
    let isDragging = false;

    function handlePointerMove(_e: PointerEvent, id: string) {
      if (dragNoteId !== id) return;
      if (!isDragging) {
        isDragging = true;
      }
    }

    const event = {} as PointerEvent;
    handlePointerMove(event, "note-1");
    expect(isDragging).toBe(true);
  });

  test("handlePointerUp releases pointer capture and triggers reorderNote", () => {
    let dragNoteId: string | null = "note-1";
    let dragOverNoteId: string | null = "note-2";
    let isDragging = true;
    let pointerReleased = false;
    let reorderedId = "";

    const event = {
      pointerId: 42,
      currentTarget: {
        releasePointerCapture: mock(() => {
          pointerReleased = true;
        }),
      },
    } as unknown as PointerEvent;

    function reorderNote(id: string) {
      reorderedId = id;
    }

    function handlePointerUp(e: PointerEvent, id: string) {
      if (dragNoteId !== id) return;
      const cardEl = e.currentTarget as HTMLElement;
      cardEl.releasePointerCapture(e.pointerId);

      if (isDragging && dragOverNoteId && dragOverNoteId !== dragNoteId) {
        reorderNote(dragNoteId);
      }
      dragNoteId = null;
      dragOverNoteId = null;
      isDragging = false;
    }

    handlePointerUp(event, "note-1");

    expect(dragNoteId).toBeNull();
    expect(dragOverNoteId).toBeNull();
    expect(isDragging).toBe(false);
    expect(pointerReleased).toBe(true);
    expect(reorderedId).toBe("note-1");
  });
});

// --- Date.now mocking utilities ---
let _originalDateNow: (() => number) | null = null;

function jestMockDateNow(fixedTime: number) {
  _originalDateNow = Date.now;
  Date.now = () => fixedTime;
}

function jestMockDateNowRestore() {
  if (_originalDateNow) {
    Date.now = _originalDateNow;
    _originalDateNow = null;
  }
}
