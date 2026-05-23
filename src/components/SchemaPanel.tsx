import { useCallback, useEffect } from "react";
import Editor from "@monaco-editor/react";
import { useAppStore } from "@/store";
import { useDebounced } from "@/lib/useDebounced";
import { parseSchema } from "@/lib/schema/parse";

// The Monaco editor here is *uncontrolled*: we seed it once via `defaultValue`
// and let it own its buffer. Every render-cycle round-trip would fight the
// editor's own cursor/selection state. The store stays in sync via the
// debounced `commit` below. Hour 14 (URL hydration) runs before the editor
// mounts, so `defaultValue` picks up the hydrated source on first paint.
//
// On every commit we ALSO re-parse the source and push the result into the
// store via `setParsedSchema`. Downstream (canvas validation, codegen) reads
// `schema.parsed`, never `schema.source`. The initial parse runs once on
// mount so the store is never in a half-hydrated "source-without-parsed"
// state after the first render.
export function SchemaPanel() {
  const initialSource = useAppStore.getState().schema.source;
  const setSchemaSource = useAppStore((s) => s.setSchemaSource);
  const setParsedSchema = useAppStore((s) => s.setParsedSchema);
  const parseError = useAppStore((s) => s.schema.parseError);

  const commit = useDebounced((value: string) => {
    setSchemaSource(value);
    const { schema, error } = parseSchema(value);
    setParsedSchema(schema, error);
  }, 250);

  useEffect(() => {
    const { schema, error } = parseSchema(initialSource);
    setParsedSchema(schema, error);
  }, [initialSource, setParsedSchema]);

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (typeof value === "string") commit(value);
    },
    [commit],
  );

  return (
    <section className="flex h-full flex-col border-r border-slate-800 bg-slate-950">
      <header className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Schema
      </header>
      <div className="min-h-0 flex-1">
        <Editor
          defaultLanguage="typescript"
          defaultValue={initialSource}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            lineNumbers: "on",
            automaticLayout: true,
          }}
          onChange={handleChange}
        />
      </div>
      {parseError !== null && (
        <div className="border-t border-rose-900 bg-rose-950/60 px-3 py-2 text-xs text-rose-300">
          {parseError}
        </div>
      )}
    </section>
  );
}
