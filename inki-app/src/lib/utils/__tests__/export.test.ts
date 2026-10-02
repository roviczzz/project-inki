/**
 * T023 [US4] Export formatting unit tests (Vitest).
 *
 * Validates:
 * - Pure export formatting utilities: escapeHtml, formatHtmlExport,
 *   formatMarkdownExport, formatPlainTextExport, formatJsonExport, formatCsvExport
 * - HTML entity escaping for &, <, >, ", '
 * - HTML5 document generation with escaped title and raw content
 * - Markdown YAML frontmatter and tag stripping/formatting
 * - Plain text conversion with newline preservation and entity decoding
 * - JSON serialization (single Note and Note[]) with 2-space indentation
 * - RFC 4180 CSV generation with header, quoted fields, and quote escaping (" -> "")
 */

import { describe, it, expect } from 'vitest';
import type { Note } from '$lib/stores/notes.svelte.ts';
import {
	escapeHtml,
	formatHtmlExport,
	formatMarkdownExport,
	formatPlainTextExport,
	formatJsonExport,
	formatCsvExport
} from '../export.ts';

const mockNote: Note = {
	id: 'note-123-abc',
	title: 'Test Note & Title <Special>',
	content: '<p>First line</p><p>Second line with <strong>bold</strong> and <em>italic</em> text.</p>',
	createdAt: 1700000000000,
	updatedAt: 1700000050000,
	position: 0
};

const mockNote2: Note = {
	id: 'note-456-def',
	title: 'Second "Quoted" Note',
	content: '<div>Line with "quotes" and <br>break.</div>',
	createdAt: 1700000100000,
	updatedAt: 1700000150000,
	position: 1
};

describe('escapeHtml', () => {
	it('escapes &, <, >, ", and \' characters correctly', () => {
		const raw = `Tom & Jerry <script>alert("hello")</script> 'test'`;
		const expected = `Tom &amp; Jerry &lt;script&gt;alert(&quot;hello&quot;)&lt;/script&gt; &#39;test&#39;`;
		expect(escapeHtml(raw)).toBe(expected);
	});

	it('returns plain strings unmodified', () => {
		expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
		expect(escapeHtml('')).toBe('');
	});
});

describe('formatHtmlExport', () => {
	it('formats a note as a valid standalone HTML5 document', () => {
		const html = formatHtmlExport(mockNote, mockNote.content);

		expect(html).toContain('<!DOCTYPE html>');
		expect(html).toContain('<html lang="en">');
		expect(html).toContain('<meta charset="utf-8">');
		expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0">');
		expect(html).toContain(`<title>${escapeHtml(mockNote.title)}</title>`);
		expect(html).toContain(`<h1>${escapeHtml(mockNote.title)}</h1>`);
		expect(html).toContain(mockNote.content);
		expect(html).toContain('</body>');
		expect(html).toContain('</html>');
	});

	it('escapes special characters in title', () => {
		const specialNote: Note = {
			...mockNote,
			title: 'Note with <tag> & "quotes"'
		};
		const html = formatHtmlExport(specialNote, '<p>Body</p>');
		expect(html).toContain('<title>Note with &lt;tag&gt; &amp; &quot;quotes&quot;</title>');
		expect(html).toContain('<h1>Note with &lt;tag&gt; &amp; &quot;quotes&quot;</h1>');
	});
});

describe('formatMarkdownExport', () => {
	it('includes YAML frontmatter with title, createdAt, and updatedAt', () => {
		const md = formatMarkdownExport(mockNote, mockNote.content);

		expect(md).toMatch(/^---\n/);
		expect(md).toContain(`title: "${escapeHtml(mockNote.title)}"`);
		expect(md).toContain(`createdAt: ${mockNote.createdAt}`);
		expect(md).toContain(`updatedAt: ${mockNote.updatedAt}`);
		expect(md).toContain('---\n\n');
	});

	it('converts strong and em tags to markdown syntax', () => {
		const md = formatMarkdownExport(mockNote, mockNote.content);

		expect(md).toContain('**bold**');
		expect(md).toContain('_italic_');
		expect(md).not.toContain('<strong>');
		expect(md).not.toContain('<em>');
	});

	it('converts line breaks and block tags to newlines', () => {
		const note: Note = {
			...mockNote,
			title: 'Breaks Note'
		};
		const content = '<p>Paragraph 1</p><br/><div>Div line</div>';
		const md = formatMarkdownExport(note, content);

		expect(md).toContain('Paragraph 1');
		expect(md).toContain('Div line');
		expect(md).not.toContain('<p>');
		expect(md).not.toContain('<br/>');
		expect(md).not.toContain('<div>');
	});

	it('decodes HTML entities in markdown body', () => {
		const note: Note = {
			...mockNote,
			title: 'Entity Note'
		};
		const content = '<p>A &amp; B &lt; C &gt; D &quot;E&quot; F&nbsp;G</p>';
		const md = formatMarkdownExport(note, content);

		expect(md).toContain('A & B < C > D "E" F G');
	});
});

describe('formatPlainTextExport', () => {
	it('formats note with title header and clean text body', () => {
		const text = formatPlainTextExport(mockNote, mockNote.content);

		expect(text.startsWith(`${mockNote.title}\n\n`)).toBe(true);
		expect(text).toContain('First line');
		expect(text).toContain('Second line with bold and italic text.');
		expect(text).not.toContain('<p>');
		expect(text).not.toContain('<strong>');
	});

	it('converts block endings and breaks to newlines and decodes entities', () => {
		const note: Note = {
			...mockNote,
			title: 'Plain Title'
		};
		const content = '<h2>Heading</h2><p>Paragraph with &amp; entity</p><div>Bottom&nbsp;line</div>';
		const text = formatPlainTextExport(note, content);

		expect(text).toContain('Heading');
		expect(text).toContain('Paragraph with & entity');
		expect(text).toContain('Bottom line');
		expect(text).not.toContain('<h2>');
		expect(text).not.toContain('<div>');
	});
});

describe('formatJsonExport', () => {
	it('formats a single note as pretty-printed JSON', () => {
		const json = formatJsonExport(mockNote);
		const parsed = JSON.parse(json);

		expect(parsed).toEqual(mockNote);
		expect(json).toBe(JSON.stringify(mockNote, null, 2));
	});

	it('formats an array of notes as pretty-printed JSON', () => {
		const notes = [mockNote, mockNote2];
		const json = formatJsonExport(notes);
		const parsed = JSON.parse(json);

		expect(parsed).toEqual(notes);
		expect(json).toBe(JSON.stringify(notes, null, 2));
	});
});

describe('formatCsvExport', () => {
	it('formats a single note with RFC 4180 CSV header and properly quoted fields', () => {
		const csv = formatCsvExport(mockNote);
		const lines = csv.split('\n');

		expect(lines[0]).toBe('"id","title","content","createdAt","updatedAt","position"');
		expect(lines[1]).toBe(
			`"${mockNote.id}","${mockNote.title}","${mockNote.content}","${mockNote.createdAt}","${mockNote.updatedAt}","${mockNote.position}"`
		);
	});

	it('properly escapes internal double-quotes by doubling them', () => {
		const csv = formatCsvExport(mockNote2);
		const lines = csv.split('\n');

		expect(lines[0]).toBe('"id","title","content","createdAt","updatedAt","position"');
		// "Second ""Quoted"" Note"
		expect(lines[1]).toContain('"Second ""Quoted"" Note"');
		expect(lines[1]).toContain('"<div>Line with ""quotes"" and <br>break.</div>"');
	});

	it('formats multiple notes with multiple rows', () => {
		const csv = formatCsvExport([mockNote, mockNote2]);
		const lines = csv.split('\n');

		expect(lines.length).toBe(3);
		expect(lines[0]).toBe('"id","title","content","createdAt","updatedAt","position"');
		expect(lines[1]).toContain(mockNote.id);
		expect(lines[2]).toContain(mockNote2.id);
	});
});
