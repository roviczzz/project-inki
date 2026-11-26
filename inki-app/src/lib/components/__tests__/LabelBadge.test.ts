import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface LabelInterface {
	id: string;
	name: string;
	color: string;
}

const labels: LabelInterface[] = [
	{ id: 'ui', name: 'UI Enhancement', color: '#a2eeef' },
	{ id: 'bug', name: 'Bug', color: '#d73a4a' },
	{ id: 'feature', name: 'Feature', color: '#0e8a16' },
	{ id: 'documentation', name: 'Documentation', color: '#534cb3' },
	{ id: 'refactor', name: 'Refactor', color: '#fcca42' },
	{ id: 'performance', name: 'Performance', color: '#fbca04' },
	{ id: 'design', name: 'Design', color: '#d876e3' },
	{ id: 'security', name: 'Security', color: '#6a737d' },
	{ id: 'accessibility', name: 'Accessibility', color: '#0052cc' },
	{ id: 'testing', name: 'Testing', color: '#008672' }
];

type LabelId =
	| 'ui'
	| 'bug'
	| 'feature'
	| 'documentation'
	| 'refactor'
	| 'performance'
	| 'design'
	| 'security'
	| 'accessibility'
	| 'testing';

const LABELS_BY_ID: Record<string, LabelInterface> = Object.fromEntries(
	labels.map((l) => [l.id, l])
);

function isLabelId(id: unknown): id is LabelId {
	return typeof id === 'string' && id in LABELS_BY_ID;
}

function resolveLabels(ids: readonly string[] | undefined): LabelInterface[] {
	if (!ids || ids.length === 0) return [];
	const result: LabelInterface[] = [];
	for (const id of ids) {
		const found = LABELS_BY_ID[id];
		if (found) result.push(found);
	}
	return result;
}

describe('LabelBadge domain model', () => {
	it('validates known LabelIds and rejects invalid values', () => {
		expect(isLabelId('ui')).toBe(true);
		expect(isLabelId('bug')).toBe(true);
		expect(isLabelId('testing')).toBe(true);
		expect(isLabelId('unknown')).toBe(false);
		expect(isLabelId('')).toBe(false);
		expect(isLabelId(null)).toBe(false);
		expect(isLabelId(42)).toBe(false);
	});

	it('resolves valid label ids to LabelInterface objects and skips unknown ids', () => {
		const resolved = resolveLabels(['ui', 'invalid', 'design']);
		expect(resolved).toEqual([
			{ id: 'ui', name: 'UI Enhancement', color: '#a2eeef' },
			{ id: 'design', name: 'Design', color: '#d876e3' }
		]);
	});

	it('returns an empty array when given undefined or empty ids', () => {
		expect(resolveLabels(undefined)).toEqual([]);
		expect(resolveLabels([])).toEqual([]);
	});

	it('toggles labels on a note without duplicates', () => {
		let noteLabels: LabelId[] = [];
		function toggle(labelId: LabelId) {
			if (!isLabelId(labelId)) return;
			noteLabels = noteLabels.includes(labelId)
				? noteLabels.filter((l) => l !== labelId)
				: [...noteLabels, labelId];
		}

		toggle('ui');
		expect(noteLabels).toEqual(['ui']);
		toggle('feature');
		expect(noteLabels).toEqual(['ui', 'feature']);
		toggle('ui');
		expect(noteLabels).toEqual(['feature']);
	});
});

describe('NoteSidebar card layout non-overlap invariants', () => {
	const sidebarSource = readFileSync(
		resolve(process.cwd(), 'src/lib/components/NoteSidebar.svelte'),
		'utf-8'
	);

	it('does not position card action buttons with absolute top-2 right-2', () => {
		expect(sidebarSource).not.toContain('absolute top-2 right-2');
	});

	it('separates title and action icons inside a justify-between flex row with min-w-0 flex-1', () => {
		expect(sidebarSource).toContain('flex items-start justify-between gap-2');
		expect(sidebarSource).toContain('min-w-0 flex-1');
		expect(sidebarSource).toContain('<LabelBadge labels={resolvedNoteLabels} />');
	});
});
