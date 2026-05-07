/** @jsxImportSource react */
import { useEffect, useRef } from "react";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { defaultHighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";

type DocumentEditorProps = {
  value: string;
  onChange: (value: string) => void;
  onSelectionChange: (selectedText: string) => void;
  readOnly?: boolean;
};

export function DocumentEditor(props: DocumentEditorProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const editableCompartmentRef = useRef(new Compartment());
  const onChangeRef = useRef(props.onChange);
  const onSelectionChangeRef = useRef(props.onSelectionChange);
  const valueRef = useRef(props.value);

  onChangeRef.current = props.onChange;
  onSelectionChangeRef.current = props.onSelectionChange;
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
