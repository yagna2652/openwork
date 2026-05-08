/** @jsxImportSource react */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, FileText, Loader2, RefreshCcw, Send } from "lucide-react";

import type { OpenworkServerClient, OpenworkWorkspaceFileContent } from "../../../app/lib/openwork-server";
import { Button } from "../../design-system/button";
import { buildDocumentSelectionPrompt } from "./document-task-prompt";
import { PrettyDocumentEditor, SourceDocumentEditor } from "./document-editor";
import { getPrettyModeAvailability } from "./document-safety";

type DocumentPageProps = {
  client: OpenworkServerClient;
  workspaceId: string;
  path: string;
  onAskOpenWork: (prompt: string) => void | Promise<void>;
};

function describeError(error: unknown) {
  return error instanceof Error ? error.message : "Unable to complete document operation.";
}

export function DocumentPage(props: DocumentPageProps) {
  const [content, setContent] = useState("");
  const [savedContent, setSavedContent] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [mode, setMode] = useState<"source" | "pretty">("source");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestContentRef = useRef("");
  const savedContentRef = useRef("");
  const updatedAtRef = useRef<number | null>(null);
  const savingRef = useRef(false);

  const dirty = content !== savedContent;
  const fileName = props.path.split("/").filter(Boolean).at(-1) || props.path;
  const prettyMode = useMemo(() => getPrettyModeAvailability(content), [content]);

  const load = useCallback(async () => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    setLoading(true);
    setError(null);
    try {
      const result = (await props.client.readWorkspaceFile(
        props.workspaceId,
        props.path,
      )) as OpenworkWorkspaceFileContent;
      setContent(result.content);
      setSavedContent(result.content);
      latestContentRef.current = result.content;
      savedContentRef.current = result.content;
      setSelectedText("");
      setUpdatedAt(result.updatedAt ?? null);
      updatedAtRef.current = result.updatedAt ?? null;
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [props.client, props.path, props.workspaceId]);

  const saveContent = useCallback(
    async (nextContent: string) => {
      if (savingRef.current) return;
      if (nextContent === savedContentRef.current) return;
      savingRef.current = true;
      setSaving(true);
      setError(null);
      try {
        const result = await props.client.writeWorkspaceFile(props.workspaceId, {
          path: props.path,
          content: nextContent,
          baseUpdatedAt: updatedAtRef.current,
        });
        setContent(nextContent);
        setSavedContent(nextContent);
        latestContentRef.current = nextContent;
        savedContentRef.current = nextContent;
        setUpdatedAt(result.updatedAt ?? null);
        updatedAtRef.current = result.updatedAt ?? null;
      } catch (err) {
        setError(describeError(err));
      } finally {
        savingRef.current = false;
        setSaving(false);
        if (latestContentRef.current !== nextContent) {
          if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
          saveTimerRef.current = setTimeout(() => {
            saveTimerRef.current = null;
            void saveContent(latestContentRef.current);
          }, 900);
        }
      }
    },
    [props.client, props.path, props.workspaceId],
  );

  const flushAutosave = useCallback(() => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    void saveContent(latestContentRef.current);
  }, [saveContent]);

  const scheduleAutosave = useCallback(
    (nextContent: string) => {
      setContent(nextContent);
      latestContentRef.current = nextContent;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void saveContent(latestContentRef.current);
      }, 1000);
    },
    [saveContent],
  );

  const switchMode = useCallback(
    (nextMode: "source" | "pretty") => {
      if (nextMode === "pretty" && !prettyMode.available) return;
      flushAutosave();
      setMode(nextMode);
      setSelectedText("");
    },
    [flushAutosave, prettyMode.available],
  );

  const askOpenWork = useCallback(async () => {
    flushAutosave();
    setAsking(true);
    setError(null);
    try {
      const prompt = buildDocumentSelectionPrompt({
        workspaceId: props.workspaceId,
        path: props.path,
        selectedText,
      });
      await props.onAskOpenWork(prompt);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setAsking(false);
    }
  }, [flushAutosave, props, selectedText]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (mode === "pretty" && !prettyMode.available) {
      flushAutosave();
      setMode("source");
    }
  }, [flushAutosave, mode, prettyMode.available]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (latestContentRef.current !== savedContentRef.current) {
        void saveContent(latestContentRef.current);
      }
    };
  }, [saveContent]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-dls-surface">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-dls-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <FileText size={16} className="shrink-0 text-dls-secondary" />
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold text-dls-text">{fileName}</div>
            <div className="truncate text-[11px] text-dls-secondary">{props.path}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-[12px] text-dls-secondary md:inline">
            {saving ? "Saving..." : dirty ? "Autosave pending" : updatedAt ? "Saved" : ""}
          </span>
          <div className="flex rounded-md border border-dls-border bg-dls-surface p-0.5">
            <button
              type="button"
              className={`h-7 rounded px-2 text-[12px] transition-colors ${mode === "source" ? "bg-dls-hover text-dls-text" : "text-dls-secondary hover:text-dls-text"}`}
              onClick={() => switchMode("source")}
              disabled={loading || saving || asking}
            >
              Source
            </button>
            <button
              type="button"
              className={`h-7 rounded px-2 text-[12px] transition-colors ${mode === "pretty" ? "bg-dls-hover text-dls-text" : "text-dls-secondary hover:text-dls-text disabled:cursor-not-allowed disabled:opacity-50"}`}
              onClick={() => switchMode("pretty")}
              disabled={loading || saving || asking || !prettyMode.available}
              title={prettyMode.available ? "Edit formatted Markdown" : prettyMode.reason}
            >
              Pretty
            </button>
          </div>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-dls-secondary transition-colors hover:bg-dls-hover hover:text-dls-text disabled:cursor-not-allowed disabled:opacity-60"
            onClick={() => void load()}
            disabled={loading || saving || asking}
            title="Reload document"
            aria-label="Reload document"
          >
            <RefreshCcw size={15} />
          </button>
          <Button
            className="h-8 px-3 py-1.5 text-[13px]"
            onClick={() => void askOpenWork()}
            disabled={loading || saving || asking || !selectedText.trim()}
            title={selectedText.trim() ? "Ask OpenWork about this selection" : "Select text first"}
          >
            {asking ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Ask OpenWork
          </Button>
        </div>
      </header>

      {error ? (
        <div className="border-b border-red-7 bg-red-3/30 px-4 py-2 text-[13px] text-red-11">
          <div className="flex items-center gap-2">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        </div>
      ) : null}

      {!prettyMode.available ? (
        <div className="border-b border-dls-border bg-dls-hover/20 px-4 py-2 text-[12px] text-dls-secondary">
          {prettyMode.reason}
        </div>
      ) : null}

      {selectedText.trim() ? (
        <div className="border-b border-dls-border bg-dls-hover/30 px-4 py-2 text-[12px] text-dls-secondary">
          Selection ready for OpenWork: {selectedText.length.toLocaleString()} characters
        </div>
      ) : null}

      <div className="min-h-0 flex-1">
        {loading ? (
          <div className="flex h-full items-center justify-center text-[13px] text-dls-secondary">
            <Loader2 size={16} className="mr-2 animate-spin" />
            Loading document
          </div>
        ) : (
          mode === "pretty" && prettyMode.available ? (
            <PrettyDocumentEditor
              value={content}
              onChange={scheduleAutosave}
              onSelectionChange={setSelectedText}
              onBlur={flushAutosave}
              readOnly={asking}
            />
          ) : (
            <SourceDocumentEditor
              value={content}
              onChange={scheduleAutosave}
              onSelectionChange={setSelectedText}
              onBlur={flushAutosave}
              readOnly={asking}
            />
          )
        )}
      </div>
    </div>
  );
}
