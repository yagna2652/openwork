import { describe, expect, test } from "bun:test";

import { buildDocumentSelectionPrompt } from "../../src/react-app/domains/document/document-task-prompt";

describe("buildDocumentSelectionPrompt", () => {
  test("includes the file path and selected text", () => {
    const prompt = buildDocumentSelectionPrompt({
      workspaceId: "workspace-1",
      path: "notes/today.md",
      selectedText: "## Draft\n\nMake this sharper.",
    });

    expect(prompt).toContain("Workspace id: workspace-1");
    expect(prompt).toContain("Markdown file path: notes/today.md");
    expect(prompt).toContain("## Draft\n\nMake this sharper.");
    expect(prompt).toContain("Operate on this exact file path: notes/today.md.");
    expect(prompt).toContain("Do not create a new document or a replacement file.");
    expect(prompt).toContain("directly edit that Markdown file on disk in place");
    expect(prompt).toContain("Do not return CriticMarkup suggestions");
  });

  test("uses the path in one explicit edit instruction", () => {
    const prompt = buildDocumentSelectionPrompt({
      workspaceId: "workspace-1",
      path: "chapter.md",
      selectedText: "A paragraph.",
    });

    const editInstructionMatches = prompt.match(/Please work on the selected Markdown text in the existing file chapter\.md\./g) ?? [];
    expect(editInstructionMatches).toHaveLength(1);
  });

  test("rejects empty selections", () => {
    expect(() =>
      buildDocumentSelectionPrompt({
        workspaceId: "workspace-1",
        path: "chapter.md",
        selectedText: "   ",
      }),
    ).toThrow("Select Markdown text before asking OpenWork.");
  });
});
