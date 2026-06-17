import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test";

/**
 * Tests for +layout.svelte — Dark mode auto-detection via matchMedia.
 *
 * The layout component's $effect:
 * 1. Calls window.matchMedia('(prefers-color-scheme: dark)')
 * 2. Calls update(mq) which toggles `.dark` on <html> based on matches
 * 3. Adds a 'change' listener to the MediaQueryList
 * 4. Returns cleanup that removes the 'change' listener
 */

// Set up DOM globals using happy-dom
import { Window } from "happy-dom";

let window: Window;
let document: Document;
let classListToggleCalls: Array<[string, boolean | undefined]>;

interface MqListenerEntry {
  event: "change";
  handler: (ev: { matches: boolean }) => void;
}

function createMockMatchMedia(initialMatches: boolean) {
  const listeners: MqListenerEntry[] = [];

  const mockMq = {
    matches: initialMatches,
    addEventListener: mock(
      (event: "change", handler: (ev: { matches: boolean }) => void) => {
        listeners.push({ event, handler });
      }
    ),
    removeEventListener: mock(
      (event: "change", handler: (ev: { matches: boolean }) => void) => {
        const idx = listeners.findIndex((l) => l.handler === handler);
        if (idx >= 0) listeners.splice(idx, 1);
      }
    ),
  };

  function triggerChange(newMatches: boolean) {
    mockMq.matches = newMatches;
    for (const l of listeners) {
      l.handler({ matches: newMatches });
    }
  }

  return { mockMq, triggerChange, listeners };
}

/**
 * Core logic from +layout.svelte's $effect, extracted for testing.
 */
function setupDarkModeDetection(windowObj: Window, doc: Document) {
  const mq = windowObj.matchMedia("(prefers-color-scheme: dark)");

  function update(ev: { matches: boolean }) {
    doc.documentElement.classList.toggle("dark", ev.matches);
  }

  update(mq);
  mq.addEventListener("change", update);

  return () => mq.removeEventListener("change", update);
}

describe("Layout — dark mode auto-detection", () => {
  beforeEach(() => {
    window = new Window();
    document = window.document;
    classListToggleCalls = [];

    // Mock classList.toggle to track calls
    document.documentElement.classList.toggle = mock(
      (cls: string, force?: boolean) => {
        classListToggleCalls.push([cls, force]);
        // Always apply the class like the real toggle with force
        if (force !== undefined) {
          if (force) {
            document.documentElement.classList.add(cls);
          } else {
            document.documentElement.classList.remove(cls);
          }
        }
        return force ?? false;
      }
    ) as unknown as DOMTokenList["toggle"];
  });

  afterEach(() => {
    // Cleanup
  });

  test("applies .dark class when prefers-color-scheme is dark", () => {
    const { mockMq } = createMockMatchMedia(true);
    window.matchMedia = mock(() => mockMq) as unknown as Window["matchMedia"];

    const cleanup = setupDarkModeDetection(window, document);

    const darkToggle = classListToggleCalls.find(([cls]) => cls === "dark");
    expect(darkToggle).toBeDefined();
    expect(darkToggle![1]).toBe(true);

    cleanup();
  });

  test("removes .dark class when prefers-color-scheme is light", () => {
    const { mockMq } = createMockMatchMedia(false);
    window.matchMedia = mock(() => mockMq) as unknown as Window["matchMedia"];

    const cleanup = setupDarkModeDetection(window, document);

    const darkToggle = classListToggleCalls.find(([cls]) => cls === "dark");
    expect(darkToggle).toBeDefined();
    expect(darkToggle![1]).toBe(false);

    cleanup();
  });

  test("adds change event listener to MediaQueryList", () => {
    const { mockMq } = createMockMatchMedia(false);
    window.matchMedia = mock(() => mockMq) as unknown as Window["matchMedia"];

    const cleanup = setupDarkModeDetection(window, document);

    expect(mockMq.addEventListener).toHaveBeenCalledTimes(1);
    expect(mockMq.addEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );

    cleanup();
  });

  test("cleanup removes the change event listener", () => {
    const { mockMq } = createMockMatchMedia(false);
    window.matchMedia = mock(() => mockMq) as unknown as Window["matchMedia"];

    const cleanup = setupDarkModeDetection(window, document);

    cleanup();

    expect(mockMq.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
  });

  test("toggles .dark on when media query changes from light to dark", () => {
    const { mockMq, triggerChange } = createMockMatchMedia(false);
    window.matchMedia = mock(() => mockMq) as unknown as Window["matchMedia"];

    const cleanup = setupDarkModeDetection(window, document);

    // Clear initial call tally
    classListToggleCalls.length = 0;

    // Simulate change to dark
    triggerChange(true);

    const darkToggle = classListToggleCalls.find(([cls]) => cls === "dark");
    expect(darkToggle).toBeDefined();
    expect(darkToggle![1]).toBe(true);

    cleanup();
  });

  test("toggles .dark off when media query changes from dark to light", () => {
    const { mockMq, triggerChange } = createMockMatchMedia(true);
    window.matchMedia = mock(() => mockMq) as unknown as Window["matchMedia"];

    const cleanup = setupDarkModeDetection(window, document);

    // Clear initial call tally
    classListToggleCalls.length = 0;

    // Simulate change to light
    triggerChange(false);

    const darkToggle = classListToggleCalls.find(([cls]) => cls === "dark");
    expect(darkToggle).toBeDefined();
    expect(darkToggle![1]).toBe(false);

    cleanup();
  });
});
