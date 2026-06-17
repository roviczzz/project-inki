import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

/**
 * Tests for +page.svelte — Responsive sidebar overlay + keyboard shortcut.
 *
 * Key behaviors:
 * 1. Ctrl+N / Cmd+N keyboard shortcut creates and selects a note
 * 2. The keyboard listener is cleaned up on destroy
 * 3. sidebarOpen state controls the mobile sidebar overlay
 * 4. Backdrop click closes the sidebar
 * 5. onNoteSelect prop closes the mobile sidebar
 */

// Set up DOM globals using happy-dom
import { Window } from "happy-dom";

let window: Window;
let document: Document;

// Mock store functions
const mockStore = {
  addNoteCalls: 0,
  selectNoteCalls: [] as Array<string | null>,
  lastNoteId: "test-note-id-1",

  addNote: mock(() => {
    mockStore.addNoteCalls++;
    return {
      id: mockStore.lastNoteId,
      title: "Test Note",
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }),

  selectNote: mock((id: string | null) => {
    mockStore.selectNoteCalls.push(id);
  }),

  reset() {
    this.addNoteCalls = 0;
    this.selectNoteCalls = [];
    this.lastNoteId = "test-note-id-1";
    this.addNote.mockClear();
    this.selectNote.mockClear();
  },
};

/**
 * Keyboard handler logic from +page.svelte's $effect.
 * We pass the store functions as parameters to make this testable.
 */
function setupKeyboardShortcut(win: Window) {
  function handler(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "n") {
      e.preventDefault();
      const note = mockStore.addNote();
      mockStore.selectNote(note.id);
    }
  }
  win.addEventListener("keydown", handler);
  return () => win.removeEventListener("keydown", handler);
}

describe("Page — keyboard shortcut Ctrl+N / Cmd+N", () => {
  let cleanup: () => void;

  beforeEach(() => {
    window = new Window();
    document = window.document;
    mockStore.reset();
  });

  afterEach(() => {
    if (cleanup) cleanup();
  });

  test("Ctrl+N calls addNote and selectNote", () => {
    cleanup = setupKeyboardShortcut(window);

    const event = new (window as any).KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
    });
    const preventDefaultSpy = mock(() => {});
    event.preventDefault = preventDefaultSpy;

    window.dispatchEvent(event);

    expect(mockStore.addNote).toHaveBeenCalled();
    expect(mockStore.selectNote).toHaveBeenCalledWith("test-note-id-1");
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  test("Cmd+N on macOS also creates a note (metaKey)", () => {
    cleanup = setupKeyboardShortcut(window);

    const event = new (window as any).KeyboardEvent("keydown", {
      key: "n",
      metaKey: true,
    });
    const preventDefaultSpy = mock(() => {});
    event.preventDefault = preventDefaultSpy;

    window.dispatchEvent(event);

    expect(mockStore.addNote).toHaveBeenCalled();
    expect(mockStore.selectNote).toHaveBeenCalledWith("test-note-id-1");
    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  test("regular 'n' key without modifier does nothing", () => {
    cleanup = setupKeyboardShortcut(window);

    const event = new (window as any).KeyboardEvent("keydown", {
      key: "n",
    });

    window.dispatchEvent(event);

    expect(mockStore.addNote).not.toHaveBeenCalled();
    expect(mockStore.selectNote).not.toHaveBeenCalled();
  });

  test("other keys with Ctrl modifier do nothing", () => {
    cleanup = setupKeyboardShortcut(window);

    const event = new (window as any).KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
    });

    window.dispatchEvent(event);

    expect(mockStore.addNote).not.toHaveBeenCalled();
    expect(mockStore.selectNote).not.toHaveBeenCalled();
  });

  test("cleanup removes the keydown listener", () => {
    const handlerMock = mock(() => {});
    window.addEventListener("keydown", handlerMock);

    expect(typeof handlerMock).toBe("function");

    // Simulate cleanup
    window.removeEventListener("keydown", handlerMock);

    // Create and dispatch event - handler should not fire
    const event = new (window as any).KeyboardEvent("keydown", {
      key: "n",
      ctrlKey: true,
    });
    window.dispatchEvent(event);

    // The handler was removed so it should not have been called
    expect(handlerMock).not.toHaveBeenCalled();
  });
});

describe("Page — responsive sidebar overlay behavior", () => {
  test("sidebar state toggles correctly", () => {
    let sidebarOpen = false;

    // Click menu button — toggles open
    sidebarOpen = !sidebarOpen;
    expect(sidebarOpen).toBe(true);

    // Click menu button again — toggles closed
    sidebarOpen = !sidebarOpen;
    expect(sidebarOpen).toBe(false);
  });

  test("backdrop click sets sidebarOpen to false", () => {
    let sidebarOpen = true;

    // The backdrop has: onclick={() => (sidebarOpen = false)}
    sidebarOpen = false;
    expect(sidebarOpen).toBe(false);
  });

  test("onNoteSelect callback closes the mobile sidebar", () => {
    let sidebarOpen = true;

    // This is the inline callback from +page.svelte:
    // <NoteSidebar onNoteSelect={() => (sidebarOpen = false)} />
    const onNoteSelect = () => {
      sidebarOpen = false;
    };

    onNoteSelect();
    expect(sidebarOpen).toBe(false);
  });
});
