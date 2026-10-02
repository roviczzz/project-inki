/**
 * Pure export formatting utility module.
 * All functions are side-effect free and depend only on their arguments.
 */

import type { Note } from '$lib/stores/notes.svelte.ts';

// ---------------------------------------------------------------------------
// HTML Entity Escaping
// ---------------------------------------------------------------------------

/**
 * Escapes a plain string for safe use inside HTML text content or attributes.
 */
export function escapeHtml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

// ---------------------------------------------------------------------------
// HTML Export
// ---------------------------------------------------------------------------

/**
 * Formats a note as a standalone HTML5 document.
 * `content` is the raw HTML from the contenteditable editor.
 */
export function formatHtmlExport(note: Note, content: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(note.title)}</title>
</head>
<body>
  <h1>${escapeHtml(note.title)}</h1>
  ${content}
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Markdown Export
// ---------------------------------------------------------------------------

/**
 * Formats a note as a Markdown document with YAML frontmatter.
 * Content HTML is included as-is after the frontmatter (editors can post-process).
 */
export function formatMarkdownExport(note: Note, content: string): string {
	const frontmatter = `---
title: "${escapeHtml(note.title)}"
createdAt: ${note.createdAt}
updatedAt: ${note.updatedAt}
---`;

	// Basic HTML → Markdown: strip block tags and preserve text
	const body = content
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/?(p|div|h[1-6]|li|ul|ol)[^>]*>/gi, '\n')
		.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
		.replace(/<em[^>]*>(.*?)<\/em>/gi, '_$1_')
		.replace(/<[^>]+>/g, '')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&nbsp;/g, ' ')
		.trim();

	return `${frontmatter}\n\n${body}`;
}

// ---------------------------------------------------------------------------
// Plain Text Export
// ---------------------------------------------------------------------------

/**
 * Converts HTML editor content to plain text.
 * Block-level tags are converted to newlines; all remaining tags are stripped.
 * Standard HTML entities are decoded.
 */
export function formatPlainTextExport(note: Note, content: string): string {
	const text = content
		// Convert block-ending tags to newlines
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/p>/gi, '\n')
		.replace(/<\/div>/gi, '\n')
		.replace(/<\/h[1-6]>/gi, '\n')
		.replace(/<\/li>/gi, '\n')
		// Strip all remaining HTML tags
		.replace(/<\/?[^>]+(>|$)/g, '')
		// Decode HTML entities
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.trim();

	return `${note.title}\n\n${text}`;
}

// ---------------------------------------------------------------------------
// JSON Export
// ---------------------------------------------------------------------------

/**
 * Formats a note or array of notes as pretty-printed JSON (2-space indent).
 */
export function formatJsonExport(data: Note | Note[]): string {
	return JSON.stringify(data, null, 2);
}

// ---------------------------------------------------------------------------
// CSV Export — RFC 4180
// ---------------------------------------------------------------------------

const CSV_HEADER = '"id","title","content","createdAt","updatedAt","position"';

/**
 * Wraps a field value in RFC 4180 CSV quoting.
 * Internal double-quotes are escaped by doubling them.
 */
function csvField(value: string | number): string {
	const str = String(value);
	return `"${str.replace(/"/g, '""')}"`;
}

/**
 * Formats a note or array of notes as an RFC 4180 compliant CSV string.
 */
export function formatCsvExport(notes: Note | Note[]): string {
	const rows = Array.isArray(notes) ? notes : [notes];
	const lines = rows.map((n) =>
		[
			csvField(n.id),
			csvField(n.title),
			csvField(n.content),
			csvField(n.createdAt),
			csvField(n.updatedAt),
			csvField(n.position)
		].join(',')
	);
	return [CSV_HEADER, ...lines].join('\n');
}
