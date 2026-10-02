# Storage & Multi-Window Contract: `localStorage` & `StorageEvent`

**Feature Branch**: `001-fix-concurrency-and-bugs`  
**Date**: 2026-10-02  
**Status**: Contract Specification

---

## 1. Storage Keys & Payload Format

### 1.1 Key: `'inki-notes'`
Holds the serialized note collection and active selection pointer.

```json
{
  "notes": [
    {
      "id": "3b241101-e2bb-4255-877f-0f6244f777c6",
      "title": "Meeting Notes",
      "content": "<p>Discuss roadmap</p>",
      "createdAt": 1774000000000,
      "updatedAt": 1774000120000,
      "position": 0
    },
    {
      "id": "8a619022-f3cc-4991-911a-1d7355a888d7",
      "title": "Project Ideas",
      "content": "<p>New feature list</p>",
      "createdAt": 1774000050000,
      "updatedAt": 1774000180000,
      "position": 1
    }
  ],
  "selectedNoteId": "3b241101-e2bb-4255-877f-0f6244f777c6"
}
```

### 1.2 Key: `'inki-dark-mode'`
Holds the user's explicit theme preference: `'true'` (dark), `'false'` (light), or `null`/unset (follow system media query).

---

## 2. Normalization & Deserialization Pipeline

When reading from `localStorage.getItem('inki-notes')`, the parser executes the following deterministic steps:

1. **JSON Parse Guard**: If `JSON.parse` throws an error or returns a non-object, log a warning and initialize with an empty collection (`notes = []`, `selectedNoteId = null`).
2. **Array Validation**: Check if `parsed.notes` is an Array. If not, treat as empty array.
3. **Item Sanitization**: For each item in `parsed.notes`:
   - `id`: If non-empty string, keep; else generate `crypto.randomUUID()`.
   - `title`: If string, keep; else default to `defaultTitle()`.
   - `content`: If string, keep; else default to `''`.
   - `createdAt`: If positive number, keep; else default to `Date.now()`.
   - `updatedAt`: If positive number, keep; else default to `createdAt` or `Date.now()`.
   - `position`: If numeric, keep; else default to array index $i$.
4. **Position Normalization**: Sort valid notes by existing `position` ascending, then renumber strictly to $0, 1, \dots, N-1$.
5. **Selection Resolution**: Check if `parsed.selectedNoteId` exists in the sanitized notes array:
   - If match found, keep `selectedNoteId`.
   - If notes exist but ID not found, set `selectedNoteId = notes[0].id`.
   - If notes list is empty, set `selectedNoteId = null`.

---

## 3. Storage Event Contract (`window.onstorage`)

When a `storage` event fires on `window` (`event.key === 'inki-notes'`):

```typescript
function handleStorageEvent(event: StorageEvent): void {
  if (event.key !== 'inki-notes' || !event.newValue) return;
  
  try {
    const remoteData = parseAndNormalize(event.newValue);
    
    // Merge Strategy:
    // 1. Update notes list in memory
    // 2. If active note in current window has uncommitted local edits (dirty),
    //    preserve active note's content and title locally while updating non-active notes
    // 3. If selected note was deleted remotely, select adjacent note or null
    // 4. If active note is not dirty, update active note state with remote content
  } catch (err) {
    // Ignore malformed remote payloads
  }
}
```
