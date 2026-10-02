// T004: Note entity and collection state types with enforced field constraints
export interface Note {
	/** Unique UUID v4 identifier. Generated fresh if missing/invalid on load. */
	id: string;
	/** User-defined or auto-generated title. Trimmed on rename; falls back to defaultTitle() if empty. */
	title: string;
	/** Rich HTML body content from contenteditable. Null/undefined defaults to ''. */
	content: string;
	/** Unix epoch ms when created. Must be > 0; defaults to Date.now() if invalid. */
	createdAt: number;
	/** Unix epoch ms when last modified. Must be >= createdAt; updated on every title/content change. */
	updatedAt: number;
	/** Zero-indexed contiguous integer position (0 <= position < totalNotes). Normalized on every mutation. */
	position: number;
}

export type MoveDirection = 'up' | 'down' | 'top' | 'bottom';

// ---------------------------------------------------------------------------
// Collection state (T004)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'inki-notes';

let notes = $state<Note[]>([]);
let selectedNoteId = $state<string | null>(null);

// T005: Debounced persistence timer state
let saveTimeoutId: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 300;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function defaultTitle(): string {
	const now = new Date();
	return `Note - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

/** Normalize an array of notes to strictly contiguous positions 0…N-1. */
function reindex(arr: Note[]): Note[] {
	return [...arr].sort((a, b) => a.position - b.position).map((n, i) => ({ ...n, position: i }));
}

// ---------------------------------------------------------------------------
// T005: Debounced persistence + synchronous flushSave()
// ---------------------------------------------------------------------------

function saveToLocalStorage(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, selectedNoteId }));
	} catch {
		// Silently ignore — localStorage may be full or unavailable
	}
}

/** Schedule a trailing 300ms debounced save. Resets the timer on every call. */
function scheduleSave(): void {
	if (saveTimeoutId !== null) {
		clearTimeout(saveTimeoutId);
	}
	saveTimeoutId = setTimeout(() => {
		saveTimeoutId = null;
		saveToLocalStorage();
	}, DEBOUNCE_MS);
}

/** Flush any pending debounced save synchronously. Safe to call multiple times. */
function flushSave(): void {
	if (saveTimeoutId !== null) {
		clearTimeout(saveTimeoutId);
		saveTimeoutId = null;
	}
	saveToLocalStorage();
}

// ---------------------------------------------------------------------------
// T006: Robust loadFromLocalStorage() with sanitization + contiguous normalization
// ---------------------------------------------------------------------------

function sanitizeNote(raw: unknown, fallbackPosition: number): Note | null {
	if (typeof raw !== 'object' || raw === null) return null;
	const r = raw as Record<string, unknown>;

	const id =
		typeof r.id === 'string' && r.id.trim().length > 0 ? r.id : crypto.randomUUID();

	const title = typeof r.title === 'string' ? r.title : defaultTitle();

	const content = typeof r.content === 'string' ? r.content : '';

	const now = Date.now();
	const createdAt =
		typeof r.createdAt === 'number' && r.createdAt > 0 ? r.createdAt : now;

	const updatedAt =
		typeof r.updatedAt === 'number' && r.updatedAt >= createdAt ? r.updatedAt : createdAt;

	const position =
		typeof r.position === 'number' && Number.isInteger(r.position) && r.position >= 0
			? r.position
			: fallbackPosition;

	return { id, title, content, createdAt, updatedAt, position };
}

function loadFromLocalStorage(): void {
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		if (!data) return;

		const parsed = JSON.parse(data) as Record<string, unknown>;

		// Recover notes array
		const rawNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
		const sanitized: Note[] = rawNotes
			.map((raw: unknown, i: number) => sanitizeNote(raw, i))
			.filter((n): n is Note => n !== null);

		// Normalize positions to strictly 0…N-1 (sort by position then re-index)
		notes = reindex(sanitized);

		// Validate selectedNoteId
		const rawId = parsed.selectedNoteId;
		if (typeof rawId === 'string' && notes.some((n) => n.id === rawId)) {
			selectedNoteId = rawId;
		} else if (notes.length > 0) {
			selectedNoteId = notes[0].id;
		} else {
			selectedNoteId = null;
		}
	} catch {
		// Invalid JSON or corrupted payload — fall back to clean empty state
		notes = [];
		selectedNoteId = null;
	}
}

loadFromLocalStorage();

// ---------------------------------------------------------------------------
// T007: Multi-window cross-instance storage synchronization
// ---------------------------------------------------------------------------

function handleStorageEvent(event: StorageEvent): void {
	if (event.key !== STORAGE_KEY) return;

	const newValue = event.newValue;
	if (newValue === null) {
		// Storage was cleared externally
		notes = [];
		selectedNoteId = null;
		return;
	}

	try {
		const parsed = JSON.parse(newValue) as Record<string, unknown>;
		const rawNotes = Array.isArray(parsed.notes) ? parsed.notes : [];
		const incoming: Note[] = reindex(
			rawNotes
				.map((raw: unknown, i: number) => sanitizeNote(raw, i))
				.filter((n): n is Note => n !== null)
		);

		// Protect active editor draft: if local in-memory state has changes that
		// haven't been flushed yet (saveTimeoutId !== null), preserve the local
		// version of the currently selected note.
		const activeId = selectedNoteId;
		const hasPendingDraft = saveTimeoutId !== null && activeId !== null;

		if (hasPendingDraft) {
			// Keep the local draft for the active note; absorb all other remote changes
			const localActive = notes.find((n) => n.id === activeId);
			const merged = incoming.map((n) =>
				n.id === activeId && localActive ? localActive : n
			);
			// If remote deleted the active note, keep local draft as-is in the list
			const remoteHasActive = incoming.some((n) => n.id === activeId);
			if (!remoteHasActive && localActive) {
				merged.push(localActive);
			}
			notes = reindex(merged);
		} else {
			notes = incoming;

			// If the previously selected note was deleted remotely, transition selection
			if (activeId !== null && !notes.some((n) => n.id === activeId)) {
				selectedNoteId = notes.length > 0 ? notes[0].id : null;
			}
		}
	} catch {
		// Malformed remote payload — keep local state intact
	}
}

if (typeof window !== 'undefined') {
	window.addEventListener('storage', handleStorageEvent);
}

// ---------------------------------------------------------------------------
// Public store API
// ---------------------------------------------------------------------------

function getSelectedNote(): Note | null {
	return selectedNoteId ? (notes.find((n) => n.id === selectedNoteId) ?? null) : null;
}

function getNotes(): Note[] {
	return [...notes].sort((a, b) => a.position - b.position);
}

function addNote(title?: string, content?: string): Note {
	// Flush any pending draft before creating a new note (T005)
	flushSave();
	const note: Note = {
		id: crypto.randomUUID(),
		title: title || defaultTitle(),
		content: content || '',
		createdAt: Date.now(),
		updatedAt: Date.now(),
		position: notes.length
	};
	notes = [...notes, note];
	selectedNoteId = note.id;
	scheduleSave();
	return note;
}

function updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'content'>>): void {
	// Immediate in-memory update for 60 FPS UI (T005)
	notes = notes.map((n) => {
		if (n.id !== id) return n;
		return { ...n, ...updates, updatedAt: Date.now() };
	});
	// Debounced persistence — do NOT flush synchronously on every keystroke
	scheduleSave();
}

function selectNote(id: string | null): void {
	// Flush any pending draft before switching notes — zero content bleed (T005)
	flushSave();
	selectedNoteId = id;
}

function deleteNote(id: string): void {
	flushSave();
	const sorted = getNotes();
	const N = sorted.length;
	const k = sorted.findIndex((n) => n.id === id);
	if (k === -1) return;

	// Adjacent selection transition (data-model §2.3)
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

function renameNote(id: string, title: string): void {
	const trimmed = title.trim();
	if (trimmed.length > 0) {
		updateNote(id, { title: trimmed });
	}
	// If empty, leave existing title unchanged (no-op per contract §2.10)
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
		position: origIdx + 1
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

export {
	getSelectedNote,
	addNote,
	deleteNote,
	updateNote,
	selectNote,
	getNotes,
	loadFromLocalStorage,
	reorderNote,
	duplicateNote,
	renameNote,
	moveNote,
	flushSave
};
