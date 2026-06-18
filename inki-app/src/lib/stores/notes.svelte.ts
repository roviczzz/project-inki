interface Note {
	id: string;
	title: string;
	content: string;
	updatedAt: number;
	createdAt: number;
	position: number;
}

const STORAGE_KEY = 'inki-notes';

let notes = $state<Note[]>([]);
let selectedNoteId = $state<string | null>(null);

function getSelectedNote(): Note | null {
	return selectedNoteId ? notes.find((n) => n.id === selectedNoteId) ?? null : null;
}

function loadFromLocalStorage(): void {
	try {
		const data = localStorage.getItem(STORAGE_KEY);
		if (data) {
			const parsed = JSON.parse(data);
			if (Array.isArray(parsed.notes)) {
				notes = parsed.notes.map((n: Note, i: number) => ({
					...n,
					position: n.position ?? i
				}));
			}
			if (typeof parsed.selectedNoteId === 'string' || parsed.selectedNoteId === null) {
				selectedNoteId = parsed.selectedNoteId;
			}
		}
	} catch {
		// Silently ignore — localStorage may be unavailable or data corrupted
	}
}

function saveToLocalStorage(): void {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ notes, selectedNoteId }));
	} catch {
		// Silently ignore — localStorage may be full or unavailable
	}
}

loadFromLocalStorage();

function defaultTitle(): string {
	const now = new Date();
	return `Note - ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
}

function addNote(title?: string, content?: string): Note {
	const note: Note = {
		id: crypto.randomUUID(),
		title: title || defaultTitle(),
		content: content || '',
		createdAt: Date.now(),
		updatedAt: Date.now(),
		position: notes.length
	};
	notes = [...notes, note];
	saveToLocalStorage();
	return note;
}

function deleteNote(id: string): void {
	notes = notes.filter((n) => n.id !== id);
	if (selectedNoteId === id) {
		selectedNoteId = null;
	}
	saveToLocalStorage();
}

function updateNote(id: string, updates: Partial<Pick<Note, 'title' | 'content'>>): void {
	notes = notes.map((n) => {
		if (n.id !== id) return n;
		return { ...n, ...updates, updatedAt: Date.now() };
	});
	saveToLocalStorage();
}

function selectNote(id: string | null): void {
	selectedNoteId = id;
}

function getNotes(): Note[] {
	return [...notes].sort((a, b) => a.position - b.position);
}

function reorderNote(id: string, newPosition: number): void {
	const sorted = [...notes].sort((a, b) => a.position - b.position);
	const note = sorted.find((n) => n.id === id);
	if (!note) return;

	const clamped = Math.max(0, Math.min(newPosition, sorted.length - 1));
	sorted.splice(sorted.indexOf(note), 1);
	sorted.splice(clamped, 0, note);

	notes = sorted.map((n, i) => ({ ...n, position: i }));
	saveToLocalStorage();
}

function duplicateNote(id: string): Note | null {
	const original = notes.find((n) => n.id === id);
	if (!original) return null;

	const sorted = [...notes].sort((a, b) => a.position - b.position);
	const origIdx = sorted.indexOf(original);

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

function renameNote(id: string, title: string): void {
	updateNote(id, { title });
}

function moveNote(id: string, direction: 'up' | 'down' | 'top' | 'bottom'): void {
	const sorted = [...notes].sort((a, b) => a.position - b.position);
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
	type Note,
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
	moveNote
};
