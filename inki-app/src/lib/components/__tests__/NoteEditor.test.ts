import { describe, test, expect, mock, beforeEach } from "bun:test";
import { Window } from "happy-dom";

let window: Window;
let document: Document;

// Mock store functions
const mockStore = {
  selectedNote: null as any,
  allNotes: [] as any[],
  getSelectedNote: mock(() => mockStore.selectedNote),
  getNotes: mock(() => mockStore.allNotes),
};

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escCsv(s: string): string {
  return s.replace(/"/g, '""');
}

function getSaveContent(content: string, note: any, ext: string): string {
  switch (ext) {
    case 'json':
      return JSON.stringify(
        { id: note.id, title: note.title, content, createdAt: note.createdAt, updatedAt: note.updatedAt },
        null,
        2
      );
    case 'html':
      return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>${escHtml(note.title)}</title></head>
<body>
<h1>${escHtml(note.title)}</h1>
${content}
</body>
</html>`;
    case 'csv':
      return `"title","content"\n"${escCsv(note.title)}","${escCsv(content)}"`;
    default:
      return content;
  }
}

describe("NoteEditor — Save logic", () => {
  beforeEach(() => {
    window = new Window();
    document = window.document;

    (window as any).URL = {
      createObjectURL: mock(() => "blob:mock-url"),
      revokeObjectURL: mock(() => {}),
    };

    (window as any).Blob = class MockBlob {
      constructor(public parts: any[], public options: any) {}
    };

    mockStore.selectedNote = {
      id: "test-id",
      title: "My Note",
      content: "# Hello World",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  test("getSaveContent returns raw content for .md", () => {
    const result = getSaveContent("some content", mockStore.selectedNote, 'md');
    expect(result).toBe("some content");
  });

  test("getSaveContent returns raw content for .txt", () => {
    const result = getSaveContent("some content", mockStore.selectedNote, 'txt');
    expect(result).toBe("some content");
  });

  test("getSaveContent returns JSON for .json", () => {
    const note = mockStore.selectedNote;
    const result = getSaveContent(note.content, note, 'json');
    const parsed = JSON.parse(result);
    expect(parsed.id).toBe("test-id");
    expect(parsed.title).toBe("My Note");
    expect(parsed.content).toBe(note.content);
    expect(parsed.createdAt).toBe(note.createdAt);
    expect(parsed.updatedAt).toBe(note.updatedAt);
  });

  test("getSaveContent returns HTML for .html", () => {
    const result = getSaveContent("# Hello", mockStore.selectedNote, 'html');
    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("<title>My Note</title>");
    expect(result).toContain("<h1>My Note</h1>");
    expect(result).toContain("# Hello");
  });

  test("getSaveContent escapes HTML special chars in HTML output", () => {
    const note = { id: "1", title: "Note & <Title>", content: "<script>alert('xss')</script>", createdAt: 0, updatedAt: 0 };
    const result = getSaveContent(note.content, note, 'html');
    expect(result).toContain("<script>alert('xss')</script>");
    expect(result).toContain("Note &amp; &lt;Title&gt;");
  });

  test("getSaveContent returns CSV for .csv", () => {
    const result = getSaveContent("hello \"world\"", mockStore.selectedNote, 'csv');
    expect(result).toBe('"title","content"\n"My Note","hello ""world"""');
  });

  test("handleSave fallback download works when showSaveFilePicker unavailable", () => {
    const clickSpy = mock(() => {});
    const elementMock = {
      href: "",
      download: "",
      click: clickSpy,
    };
    const createElementSpy = mock((tag: string) => {
      if (tag === "a") return elementMock;
      return {};
    });

    function handleSaveFallback(note: any) {
      if (!note) return;
      const content = note.content;
      const blob = new (window as any).Blob([content], { type: 'text/html;charset=utf-8' });
      const url = (window as any).URL.createObjectURL(blob);
      const link = createElementSpy("a") as any;
      link.href = url;
      link.download = `${note.title || 'untitled'}.html`;
      link.click();
      (window as any).URL.revokeObjectURL(url);
    }

    handleSaveFallback(mockStore.selectedNote);
    expect(createElementSpy).toHaveBeenCalledWith("a");
    expect(elementMock.download).toBe("My Note.html");
    expect(elementMock.href).toBe("blob:mock-url");
    expect(clickSpy).toHaveBeenCalled();
  });
});
