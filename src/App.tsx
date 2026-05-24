import { SchemaPanel } from "@/components/SchemaPanel";
import { CanvasPanel } from "@/components/CanvasPanel";

export function App() {
  return (
    <main className="grid h-full w-full grid-cols-[360px_1fr_420px] bg-slate-900 text-slate-100">
      <SchemaPanel />
      <CanvasPanel />
      <section className="flex h-full flex-col">
        <header className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Generated Code
        </header>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          Codegen wires up in Hour 8
        </div>
      </section>
    </main>
  );
}
