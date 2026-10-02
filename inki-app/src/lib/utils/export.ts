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
 * Converts rich HTML from the contenteditable editor into standard Markdown.
 */
export function htmlToMarkdown(html: string): string {
	if (!html || !html.trim()) return '';

	let md = html;

	// Pre / Code blocks
	md = md.replace(/<pre[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/gi, (_, code) => {
		return `\n\`\`\`\n${code.replace(/<br\s*\/?>/gi, '\n')}\n\`\`\`\n`;
	});
	md = md.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, code) => {
		return `\n\`\`\`\n${code.replace(/<br\s*\/?>/gi, '\n')}\n\`\`\`\n`;
	});
	md = md.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`');

	// Blockquotes
	md = md.replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_, text) => {
		const lines = text
			.split(/<br\s*\/?>|\n|<\/?(?:p|div)[^>]*>/gi)
			.map((l: string) => l.trim())
			.filter(Boolean);
		return lines.length > 0 ? `\n> ${lines.join('\n> ')}\n\n` : '';
	});

	// Headings
	md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n\n');
	md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n\n');
	md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n\n');
	md = md.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n\n');
	md = md.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n\n');
	md = md.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n\n');

	// Unordered Lists
	md = md.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_, items) => {
		const listItems = items.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');
		return `\n${listItems}\n`;
	});

	// Ordered Lists
	md = md.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_, items) => {
		let index = 1;
		const listItems = items.replace(/<li[^>]*>(.*?)<\/li>/gi, (_: string, item: string) => {
			return `${index++}. ${item}\n`;
		});
		return `\n${listItems}\n`;
	});

	// Fallback for standalone <li>
	md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n');

	// Text formatting: bold, italic, strikethrough
	md = md.replace(/<(?:strong|b)[^>]*>(.*?)<\/(?:strong|b)>/gi, '**$1**');
	md = md.replace(/<(?:em|i)[^>]*>(.*?)<\/(?:em|i)>/gi, '_$1_');
	md = md.replace(/<(?:s|strike|del)[^>]*>(.*?)<\/(?:s|strike|del)>/gi, '~~$1~~');

	// Line breaks and paragraph/div blocks
	md = md.replace(/<br\s*\/?>/gi, '\n');
	md = md.replace(/<\/?(?:p|div)[^>]*>/gi, '\n');

	// Strip any remaining HTML tags
	md = md.replace(/<[^>]+>/g, '');

	// Decode standard HTML entities
	md = md
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");

	// Normalize spacing
	return md
		.split('\n')
		.map((line) => line.trimEnd())
		.join('\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/**
 * Formats a note as a Markdown document with YAML frontmatter.
 */
export function formatMarkdownExport(note: Note, content: string): string {
	const frontmatter = `---
title: "${escapeHtml(note.title)}"
createdAt: ${note.createdAt}
updatedAt: ${note.updatedAt}
---`;

	const body = htmlToMarkdown(content);
	return body ? `${frontmatter}\n\n${body}` : `${frontmatter}\n\n`;
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
