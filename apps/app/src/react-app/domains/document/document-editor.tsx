/** @jsxImportSource react */
import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Markdown } from "@tiptap/markdown";

type DocumentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange: (selectedText: string) => void;
  onBlur?: () => void;
  readOnly?: boolean;
};

export function SourceDocumentEditor(props: DocumentEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editableCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(props.onChange);
  const onSelectionChangeRef = useRef(props.onSelectionChange);
  const onBlurRef = useRef(props.onBlur);
  const valueRef = useRef(props.value);

  onChangeRef.current = props.onChange;
  onSelectionChangeRef.current = props.onSelectionChange;
  onBlurRef.current = props.onBlur;
  valueRef.current = props.value;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || viewRef.current) return;

    const view = new EditorView({
      parent: host,
      state: EditorState.create({
        doc: valueRef.current,
        extensions: [
          history(),
          markdown(),
          syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          placeholder("Start writing..."),
          editableCompartmentRef.current.of(EditorView.editable.of(!props.readOnly)),
          EditorView.lineWrapping,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) {
              onChangeRef.current(update.state.doc.toString());
            }
            if (update.focusChanged && !update.view.hasFocus) {
              onBlurRef.current?.();
            }
            if (update.selectionSet || update.docChanged) {
              const ranges = update.state.selection.ranges
                .filter((range) => !range.empty)
                .map((range) => update.state.sliceDoc(range.from, range.to));
              onSelectionChangeRef.current(ranges.join("\n\n").trim());
            }
          }),
          EditorView.theme({
            "&": {
              height: "100%",
              backgroundColor: "transparent",
              color: "var(--dls-text, #f8fafc)",
              fontSize: "15px",
            },
            ".cm-scroller": {
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              lineHeight: "1.75",
              padding: "28px 32px",
            },
            ".cm-content": {
              maxWidth: "840px",
              minHeight: "100%",
              padding: "0",
            },
            ".cm-line": {
              padding: "0 2px",
            },
            ".cm-gutters": {
              display: "none",
            },
            ".cm-cursor": {
              borderLeftColor: "var(--dls-accent, #6d8bff)",
            },
            ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
              backgroundColor: "rgba(109,139,255,0.25)",
            },
            "&.cm-focused": {
              outline: "none",
            },
          }),
        ],
      }),
    });

    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current === props.value) return;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: props.value },
    });
  }, [props.value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: editableCompartmentRef.current.reconfigure(EditorView.editable.of(!props.readOnly)),
    });
  }, [props.readOnly]);

  return <div ref={hostRef} className="h-full min-h-0 w-full overflow-hidden" />;
}

export function PrettyDocumentEditor(props: DocumentEditorProps) {
  const valueRef = useRef(props.value);
  const onChangeRef = useRef(props.onChange);
  const onSelectionChangeRef = useRef(props.onSelectionChange);
  const onBlurRef = useRef(props.onBlur);

  valueRef.current = props.value;
  onChangeRef.current = props.onChange;
  onSelectionChangeRef.current = props.onSelectionChange;
  onBlurRef.current = props.onBlur;

  const editor = useEditor({
    immediatelyRender: false,
    editable: !props.readOnly,
    content: props.value,
    contentType: "markdown",
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
      }),
      Markdown.configure({
        indentation: {
          style: "space",
          size: 2,
        },
      }),
    ],
    onUpdate: ({ editor }) => {
      onChangeRef.current(editor.getMarkdown());
    },
    onSelectionUpdate: ({ editor }) => {
      const { from, to } = editor.state.selection;
      const selected = from === to ? "" : editor.state.doc.textBetween(from, to, "\n\n");
      onSelectionChangeRef.current(selected.trim());
    },
    onBlur: () => {
      onBlurRef.current?.();
    },
    editorProps: {
      attributes: {
        class: "document-pretty-editor",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!props.readOnly);
  }, [editor, props.readOnly]);

  useEffect(() => {
    if (!editor) return;
    if (editor.getMarkdown() === props.value) return;
    editor.commands.setContent(props.value, {
      contentType: "markdown",
      emitUpdate: false,
    });
  }, [editor, props.value]);

  return (
    <div className="h-full min-h-0 overflow-auto px-8 py-7">
      <div className="mx-auto max-w-[840px]">
        <EditorContent editor={editor} />
      </div>
      <style>{`
        .document-pretty-editor {
          min-height: calc(100vh - 160px);
          color: var(--dls-text, #f8fafc);
          font-size: 15px;
          line-height: 1.75;
          outline: none;
        }
        .document-pretty-editor p { margin: 0 0 1em; }
        .document-pretty-editor h1 { font-size: 1.9em; line-height: 1.2; margin: 0 0 0.75em; font-weight: 700; }
        .document-pretty-editor h2 { font-size: 1.5em; line-height: 1.25; margin: 1.25em 0 0.65em; font-weight: 650; }
        .document-pretty-editor h3 { font-size: 1.25em; line-height: 1.35; margin: 1.1em 0 0.55em; font-weight: 650; }
        .document-pretty-editor ul,
        .document-pretty-editor ol { padding-left: 1.4em; margin: 0 0 1em; }
        .document-pretty-editor li { margin: 0.2em 0; }
        .document-pretty-editor blockquote {
          margin: 0 0 1em;
          padding-left: 1em;
          border-left: 3px solid var(--dls-border, #334155);
          color: var(--dls-secondary, #94a3b8);
        }
        .document-pretty-editor code {
          border-radius: 4px;
          background: var(--dls-hover, rgba(148, 163, 184, 0.12));
          padding: 0.1em 0.35em;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          font-size: 0.92em;
        }
        .document-pretty-editor pre {
          margin: 0 0 1em;
          border-radius: 8px;
          background: var(--dls-hover, rgba(148, 163, 184, 0.12));
          padding: 1em;
          overflow-x: auto;
        }
        .document-pretty-editor pre code { background: transparent; padding: 0; }
        .document-pretty-editor a { color: var(--dls-accent, #7aa2ff); text-decoration: underline; }
        .document-pretty-editor.ProseMirror-focused { outline: none; }
      `}</style>
    </div>
  );
}
