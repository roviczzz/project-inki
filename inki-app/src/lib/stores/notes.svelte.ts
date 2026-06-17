interface Note {
	id: string;
	title: string;
	content: string;
	updatedAt: number;
	createdAt: number;
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
				notes = parsed.notes;
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
		updatedAt: Date.now()
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
	return [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
}

export { type Note, getSelectedNote, addNote, deleteNote, updateNote, selectNote, getNotes, loadFromLocalStorage };
