import { SchemaPanel } from "@/components/SchemaPanel";

export function App() {
  return (
    <main className="grid h-full w-full grid-cols-[360px_1fr_420px] bg-slate-900 text-slate-100">
      <SchemaPanel />
      <section className="flex h-full flex-col border-r border-slate-800">
        <header className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Canvas
        </header>
        <div className="flex flex-1 items-center justify-center text-sm text-slate-500">
          Canvas mounts in Hour 5
        </div>
      </section>
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
