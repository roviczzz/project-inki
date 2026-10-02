# Store API Contract: `src/lib/stores/notes.svelte.ts`

**Feature Branch**: `001-fix-concurrency-and-bugs`  
**Date**: 2026-10-02  
**Status**: Contract Specification

---

## 1. Type Definitions

```typescript
export interface Note {
  id: string;
  title: string;
  content: string;
  updatedAt: number;
  createdAt: number;
  position: number;
}

export type MoveDirection = 'up' | 'down' | 'top' | 'bottom';
```

---

## 2. Store Functions & Signature Contracts

### 2.1 `getSelectedNote(): Note | null`
- **Description**: Returns the currently selected `Note` object, or `null` if no note is selected or the selected note ID no longer exists.
- **Contract**:
  - Pure getter reading reactive `$state`.
  - Guarantees return of `null` if `selectedNoteId` is `null` or unresolvable.

### 2.2 `getNotes(): Note[]`
- **Description**: Returns all notes sorted in ascending order by `position`.
- **Contract**:
  - Always returns a shallow copy of the notes array sorted by `a.position - b.position`.
  - Guarantees positions are contiguous integers $0 \dots N-1$.

### 2.3 `addNote(title?: string, content?: string): Note`
- **Description**: Creates a new note, appends it to the collection, flushes pending saves, and persists.
- **Parameters**:
  - `title` (optional): Initial note title. Defaults to `defaultTitle()`.
  - `content` (optional): Initial HTML content. Defaults to `''`.
- **Returns**: Newly created `Note` object.
- **Contract**:
  - Automatically calls `flushSave()` prior to adding.
  - Assigns `id = crypto.randomUUID()`.
  - Assigns `createdAt = Date.now()` and `updatedAt = Date.now()`.
  - Assigns `position = notes.length` (ensuring contiguous zero-indexing).
  - Triggers debounced/immediate persistence.

### 2.4 `updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'content'>>): void`
- **Description**: Updates the title and/or content of a specific note.
- **Parameters**:
  - `id`: Target note identifier.
  - `updates`: Object containing `title` and/or `content`.
- **Contract**:
  - Immediately updates the in-memory `$state(notes)` array so UI bindings reflect changes without latency.
  - Updates `updatedAt = Date.now()` for the target note.
  - Does NOT trigger a synchronous `localStorage` write on every call; instead resets and restarts a **300ms debounce timer** for `saveToLocalStorage()`.

### 2.5 `deleteNote(id: string): void`
- **Description**: Deletes a note by ID, transitions selection to an adjacent note if active, re-indexes positions, and immediately persists.
- **Parameters**:
  - `id`: Target note identifier to delete.
- **Contract**:
  - Flushes any pending saves via `flushSave()`.
  - If `id === selectedNoteId`:
    - Computes target adjacent note: index $k + 1$ if $k < N - 1$, else index $k - 1$ if $k > 0$, else `null` if $N == 1$.
    - Sets `selectedNoteId` to the calculated adjacent note ID.
  - Filters out the target note.
  - Re-indexes all remaining notes to strictly contiguous positions $0 \dots N - 2$.
  - Saves immediately to `localStorage`.

### 2.6 `selectNote(id: string | null): void`
- **Description**: Changes the active note selection.
- **Parameters**:
  - `id`: Target note ID to select, or `null` to deselect.
- **Contract**:
  - Immediately triggers `flushSave()` to guarantee that any in-flight edits to the previously active note are written to disk before changing selection.
  - Updates `selectedNoteId = id`.

### 2.7 `flushSave(): void`
- **Description**: Forces immediate synchronous persistence of current state to `localStorage` and clears any active debounce timer.
- **Contract**:
  - If a debounce timer is active (`saveTimeoutId !== null`), cancels the timer via `clearTimeout(saveTimeoutId)` and resets `saveTimeoutId = null`.
  - Immediately calls `saveToLocalStorage()`.
  - Safe to call multiple times idempotently.

### 2.8 `reorderNote(id: string, newPosition: number): void`
- **Description**: Moves a note to a new position index and renumbers all notes contiguously.
- **Parameters**:
  - `id`: Target note identifier.
  - `newPosition`: Target index ($0$-based).
- **Contract**:
  - Flushes pending saves.
  - Clamps `newPosition` to $[0, notes.length - 1]$.
  - Re-indexes all notes to contiguous positions $0 \dots N-1$.
  - Saves immediately to `localStorage`.

### 2.9 `duplicateNote(id: string): Note | null`
- **Description**: Duplicates an existing note, placing the copy immediately after the original.
- **Parameters**:
  - `id`: Target note identifier to duplicate.
- **Returns**: Duplicated `Note` object, or `null` if the target note is not found.
- **Contract**:
  - Flushes pending saves.
  - Creates a copy with `id = crypto.randomUUID()`, `title = "${original.title} (copy)"`, `content = original.content`.
  - Inserts copy at `originalIndex + 1`.
  - Re-indexes all notes to $0 \dots N$.
  - Saves immediately to `localStorage`.

### 2.10 `renameNote(id: string, title: string): void`
- **Description**: Renames a note with a trimmed title.
- **Parameters**:
  - `id`: Target note identifier.
  - `title`: New title string.
- **Contract**:
  - Trims whitespace.
  - If trimmed title is non-empty, calls `updateNote(id, { title: trimmedTitle })`.

### 2.11 `moveNote(id: string, direction: MoveDirection): void`
- **Description**: Shifts a note up, down, to top, or to bottom.
- **Parameters**:
  - `id`: Target note identifier.
  - `direction`: `'up' | 'down' | 'top' | 'bottom'`.
- **Contract**:
  - Flushes pending saves.
  - Repositions note within the sorted array.
  - Re-indexes all notes to $0 \dots N-1$.
  - Saves immediately to `localStorage`.

### 2.12 `loadFromLocalStorage(): void`
- **Description**: Loads, sanitizes, and normalizes persisted notes from `localStorage`.
- **Contract**:
  - Recovers gracefully from invalid JSON or corrupted entries.
  - Normalizes positions to strictly contiguous integers $0 \dots N-1$.
  - Validates `selectedNoteId`; if invalid, resets to first note or `null`.
