import { SchemaPanel } from "@/components/SchemaPanel";
import { CanvasPanel } from "@/components/CanvasPanel";
import { CodePanel } from "@/components/CodePanel";

export function App() {
  return (
    <main className="grid h-full w-full grid-cols-[360px_1fr_420px] bg-slate-900 text-slate-100">
      <SchemaPanel />
      <CanvasPanel />
      <CodePanel />
    </main>
  );
}
