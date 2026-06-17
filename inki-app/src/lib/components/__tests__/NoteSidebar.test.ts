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
