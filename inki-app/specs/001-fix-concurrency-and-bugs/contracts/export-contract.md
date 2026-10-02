# Export Formats & Serialization Contract

**Feature Branch**: `001-fix-concurrency-and-bugs`  
**Date**: 2026-10-02  
**Status**: Contract Specification

---

## 1. Supported Formats & MIME Types

| Format | Extension | MIME Type | Description |
|--------|-----------|-----------|-------------|
| **HTML** | `.html` | `text/html;charset=utf-8` | Standalone HTML5 document with title, meta charset, and rich content |
| **Markdown** | `.md` | `text/markdown;charset=utf-8` | Markdown document with frontmatter and clean markdown formatting |
| **Plain Text** | `.txt` | `text/plain;charset=utf-8` | Raw text with HTML tags converted to line breaks / stripped |
| **JSON** | `.json` | `application/json;charset=utf-8` | Serialized Note object or array with full schema properties |
| **CSV** | `.csv` | `text/csv;charset=utf-8` | RFC 4180 compliant CSV table |

---

## 2. Formatting & Escaping Rules

### 2.1 HTML Export (`formatHtmlExport(note: Note, content: string): string`)
```html
<!DOCTYPE html>
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
</html>
```
- `escapeHtml(s)` replaces:
  - `&` → `&amp;`
  - `<` → `&lt;`
  - `>` → `&gt;`
  - `"` → `&quot;`
  - `'` → `&#39;`

### 2.2 CSV Export (`formatCsvExport(notes: Note[] | Note): string`)
- Conforms to **RFC 4180**:
  - Header row: `"id","title","content","createdAt","updatedAt","position"`
  - Field values are wrapped in double quotes (`"`).
  - Any internal double quote characters (`"`) within strings are escaped by doubling them (`""`).
  - Lines are separated with CRLF (`\r\n`) or LF (`\n`).

### 2.3 Plain Text Export (`formatPlainTextExport(note: Note, content: string): string`)
- Converts `<br>`, `<p>`, `<div>`, `</h1>`, `</h2>`, `</h3>`, `</li>` to newline characters (`\n`).
- Strips remaining HTML tags via regex `/<\/?[^>]+(>|$)/g`.
- Decodes standard HTML entities (`&nbsp;` → ` `, `&amp;` → `&`, `&lt;` → `<`, `&gt;` → `>`, `&quot;` → `"`).

### 2.4 JSON Export (`formatJsonExport(data: Note | Note[]): string`)
- Pretty-printed with 2-space indentation: `JSON.stringify(data, null, 2)`.
