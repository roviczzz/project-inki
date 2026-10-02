# Phase 1 Data Model: Fix Concurrency Issues, Incomplete Tests, and Bugs

**Feature Branch**: `001-fix-concurrency-and-bugs`  
**Date**: 2026-10-02  
**Status**: Completed  
**Input**: Requirements from `spec.md` and Phase 0 Research

---

## 1. Entity Definitions & Schemas

### 1.1 `Note` Entity
Represents an individual note record within the application.

```typescript
interface Note {
  /** Unique UUID v4 identifier */
  id: string;

  /** User-defined or auto-generated title (trimmed, non-empty default) */
  title: string;

  /** Rich formatted HTML body content edited via contenteditable */
  content: string;

  /** Unix epoch timestamp (in milliseconds) when the note was created */
  createdAt: number;

  /** Unix epoch timestamp (in milliseconds) when the note was last modified */
  updatedAt: number;

  /** Zero-indexed contiguous integer position (0 <= position < totalNotes) */
  position: number;
}
```

#### Field Validation Rules
- `id`: Must be a non-empty string. If missing or invalid during storage load, generate a new `crypto.randomUUID()`.
- `title`: Must be a string. When modified via rename, trimmed of leading/trailing whitespace. If empty, fall back to `defaultTitle()`.
- `content`: Must be a string. Null or undefined values default to `''`.
- `createdAt`: Must be a positive integer timestamp (`> 0`). If missing/invalid, defaults to `Date.now()`.
- `updatedAt`: Must be a positive integer timestamp (`>= createdAt`). Updated automatically whenever `title` or `content` changes.
- `position`: Must be a non-negative integer (`>= 0`). Must be normalized during all collection mutations.

---

### 1.2 `NoteCollection` Entity (State Model)
Represents the ordered in-memory collection of notes managed within `src/lib/stores/notes.svelte.ts`.

```typescript
interface NoteCollectionState {
  /** In-memory array of notes maintained in position order */
  notes: Note[];

  /** Currently active/selected note ID, or null if no note is selected */
  selectedNoteId: string | null;

  /** Pending debounce timer ID for localStorage synchronization */
  saveTimeoutId: ReturnType<typeof setTimeout> | null;
}
```

#### Invariants & Normalization Rules
1. **Contiguous Index Invariant**: For any collection of $N$ notes, their positions MUST form the exact set of integers $\{0, 1, \dots, N - 1\}$ when sorted by `position`.
2. **Uniqueness Invariant**: Every note in the collection must possess a unique `id`.
3. **Selection Validity Invariant**: If `selectedNoteId` is non-null, there MUST exist a note in `notes` where `note.id === selectedNoteId`. If the referenced note is deleted, `selectedNoteId` must transition to an adjacent note or `null`.

---

### 1.3 `EditorSession` Entity (UI Interaction Model)
Represents the active editing state in `src/lib/components/NoteEditor.svelte`.

```typescript
interface EditorSession {
  /** ID of the note currently loaded in the editor */
  currentEditingId: string | null;

  /** Active title string in the title input field */
  editingTitle: string;

  /** Active HTML content string in the contenteditable area */
  editingContent: string;

  /** Flag indicating whether the editor has unsaved in-flight changes */
  isDirty: boolean;
}
```

---

### 1.4 `StoragePayload` Entity (Serialization Schema)
Represents the serialized JSON structure stored in browser `localStorage` under the key `'inki-notes'`.

```typescript
interface StoragePayload {
  /** Array of serialized note objects */
  notes: Note[];

  /** Serialized selected note ID or null */
  selectedNoteId: string | null;

  /** Schema version for future-proof migrations (optional, defaults to 1) */
  version?: number;
}
```

---

## 2. State Transitions & Lifecycle

### 2.1 Note Creation Lifecycle
```text
[User clicks "New Note" / Ctrl+N]
  │
  ├── 1. Flush any pending unsaved changes for currently active note: flushSave()
  ├── 2. Generate Note with id = UUID(), title = defaultTitle(), position = notes.length
  ├── 3. Append to notes array: notes = [...notes, newNote]
  ├── 4. Set selectedNoteId = newNote.id
  └── 5. Schedule debounced save (or immediate save) to localStorage
```

### 2.2 Note Editing & Persistence Lifecycle (FR-001, FR-002, FR-003)
```text
[User types into Title or Editor]
  │
  ├── 1. Update local editor state: editingTitle / editingContent
  ├── 2. Update in-memory reactive state: updateNote(currentEditingId, updates)
  │      └── note.updatedAt = Date.now() (sidebar & UI update immediately at 60 FPS)
  │
  ├── 3. Cancel existing debounce timer: clearTimeout(saveTimeoutId)
  └── 4. Schedule new timer (300ms): saveTimeoutId = setTimeout(saveToLocalStorage, 300)
```

```text
[User clicks Note B / triggers selectNote(noteB.id)]
  │
  ├── 1. Synchronously execute pending save: flushSave()
  │      └── localStorage.setItem('inki-notes', JSON.stringify(...))
  ├── 2. Switch selectedNoteId = noteB.id
  ├── 3. NoteEditor loads Note B's title and content cleanly
  └── 4. isDirty reset to false (Zero content bleed)
```

### 2.3 Note Deletion & Adjacent Selection Transition (FR-004)
```text
[User confirms delete for Note at index k in sorted list of N notes]
  │
  ├── 1. Calculate target selection ID:
  │      ├── If note.id != selectedNoteId: keep current selectedNoteId unchanged
  │      ├── If note.id == selectedNoteId:
  │      │     ├── If k < N - 1: targetId = sorted[k + 1].id (Next note)
  │      │     ├── If k == N - 1 and k > 0: targetId = sorted[k - 1].id (Previous note)
  │      │     └── If N == 1 (only note): targetId = null (Empty state)
  │
  ├── 2. Filter out deleted note: notes = notes.filter(n => n.id !== id)
  ├── 3. Re-index positions: notes = sortedRemaining.map((n, i) => ({ ...n, position: i }))
  ├── 4. Set selectedNoteId = targetId
  └── 5. Flush and persist state to localStorage
```

### 2.4 Reorder & Move Note Lifecycle
```text
[User drags Note from index sourceIdx to targetIdx OR uses Move Up/Down/Top/Bottom]
  │
  ├── 1. Flush any pending unsaved changes: flushSave()
  ├── 2. Extract note from source position and splice into target position
  ├── 3. Re-index all notes to 0 ... N - 1: notes = reordered.map((n, i) => ({ ...n, position: i }))
  └── 4. Persist updated positions to localStorage
```

### 2.5 Multi-Window Storage Synchronization Lifecycle (FR-005)
```text
[window.addEventListener('storage') receives key == 'inki-notes']
  │
  ├── 1. Parse incoming event.newValue
  ├── 2. Sanitize and normalize incoming note collection
  ├── 3. Compare with active editor state:
  │      ├── If active note has unsaved local draft (isDirty == true):
  │      │     └── Merge incoming list for other notes, preserve active note's draft
  │      └── If active note is clean (isDirty == false):
  │            └── Replace notes and update active note content in editor
  └── 4. If selectedNoteId was deleted remotely, select adjacent note or null
```

---

## 3. Data Integrity & Validation Matrix

| Operation | Invariant Checked | Recovery Action on Violation |
|-----------|-------------------|------------------------------|
| `loadFromLocalStorage` | Valid JSON format | Fall back to empty `notes = []`, `selectedNoteId = null` |
| `loadFromLocalStorage` | Array of notes | Ensure `notes` is an array; filter non-object elements |
| `loadFromLocalStorage` | Position contiguity ($0 \dots N-1$) | Sort by existing position/created timestamp and renumber $0 \dots N-1$ |
| `loadFromLocalStorage` | Valid `selectedNoteId` | Check if ID exists in notes; if not, fallback to first note or null |
| `deleteNote` | Contiguous positions after removal | Immediate sequential re-index $0 \dots N-2$ |
| `reorderNote` / `moveNote` | Index within bounds $[0, N-1]$ | Clamp target position to $[0, N-1]$ and re-index |
| `renameNote` | Non-empty trimmed title | Trim whitespace; if empty, retain existing title or generate default |
| `updateNote` | Note exists in collection | No-op if note ID not found; avoid state corruption |
