import { useMemo } from "react";
import Editor from "@monaco-editor/react";
import { useAppStore } from "@/store";
import { generateCode } from "@/lib/codegen/generate";

// Unlike SchemaPanel, this editor is *controlled* (`value` prop, not
// `defaultValue`). Monaco normally fights controlled mode because every
// render snaps the cursor/selection to the buffer start — but the
// editor is read-only here, so the user has no cursor to lose. Every
// schema/node/edge edit flows through the store, useMemo recomputes the
// generated string, and Monaco re-renders.
export function CodePanel() {
  const parsed = useAppStore((s) => s.schema.parsed);
  const nodes = useAppStore((s) => s.nodes);
  const edges = useAppStore((s) => s.edges);

  const code = useMemo(
    () => generateCode({ schema: parsed, nodes, edges }),
    [parsed, nodes, edges],
  );

  return (
    <section className="flex h-full flex-col bg-slate-950">
      <header className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Generated Code
      </header>
      <div className="min-h-0 flex-1">
        <Editor
          defaultLanguage="typescript"
          value={code}
          theme="vs-dark"
          options={{
            readOnly: true,
            domReadOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            scrollBeyondLastLine: false,
            wordWrap: "on",
            tabSize: 2,
            lineNumbers: "on",
            automaticLayout: true,
            renderLineHighlight: "none",
          }}
        />
      </div>
    </section>
  );
}
