export type DocumentSelectionPromptInput = {
  workspaceId: string;
  path: string;
  selectedText: string;
};

export function buildDocumentSelectionPrompt(input: DocumentSelectionPromptInput) {
  const workspaceId = input.workspaceId.trim();
  const path = input.path.trim();
  const selectedText = input.selectedText.trim();

  if (!workspaceId) {
    throw new Error("Workspace id is required.");
  }
  if (!path) {
    throw new Error("Markdown file path is required.");
  }
  if (!selectedText) {
    throw new Error("Select Markdown text before asking OpenWork.");
  }

  return [
    `Please work on the selected Markdown text in the existing file ${path}.`,
    "",
    `Workspace id: ${workspaceId}`,
    `Markdown file path: ${path}`,
    "",
    "Selected Markdown text:",
    "```markdown",
    selectedText,
    "```",
    "",
    `Operate on this exact file path: ${path}.`,
    "Do not create a new document or a replacement file.",
    "When changes are needed, directly edit that Markdown file on disk in place.",
    "Do not return CriticMarkup suggestions for this MVP.",
  ].join("\n");
}
