import { Handle, Position, type NodeProps } from "reactflow";
import { useAppStore } from "@/store";
import { NodeId } from "@/lib/ids";
import type { MapConfig, MapProjection } from "@/lib/pipeline/types";
import type { SchemaShape } from "@/lib/schema/types";

export interface MapNodeData {
  config: MapConfig;
  schema: SchemaShape | null;
}

export function MapNode({ id, data }: NodeProps<MapNodeData>) {
  const updateMapConfig = useAppStore((s) => s.updateMapConfig);
  const { config, schema } = data;
  const fieldNames = schema?.fields.map((f) => f.name) ?? [];

  const setProjections = (projections: MapProjection[]) =>
    updateMapConfig(NodeId(id), { projections });

  const addProjection = () => {
    if (fieldNames.length === 0) return;
    setProjections([
      ...config.projections,
      {
        id: crypto.randomUUID(),
        sourceField: fieldNames[0]!,
        alias: null,
      },
    ]);
  };

  const removeProjection = (pid: string) =>
    setProjections(config.projections.filter((p) => p.id !== pid));

  const patchProjection = (
    pid: string,
    patch: Partial<Omit<MapProjection, "id">>,
  ) =>
    setProjections(
      config.projections.map((p) => (p.id === pid ? { ...p, ...patch } : p)),
    );

  return (
    <div className="min-w-[280px] rounded-md border border-emerald-500 bg-slate-900 text-slate-100 shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-emerald-400"
      />
      <header className="border-b border-emerald-900/60 bg-emerald-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
        Map
      </header>
      <div className="space-y-1.5 px-3 py-2 text-xs">
        {config.projections.length === 0 ? (
          <p className="italic text-slate-500">
            All fields pass through. Add a projection to pick a subset.
          </p>
        ) : (
          config.projections.map((p) => (
            <div key={p.id} className="flex items-center gap-1.5">
              <select
                value={p.sourceField}
                onChange={(e) =>
                  patchProjection(p.id, { sourceField: e.target.value })
                }
                className="nodrag flex-1 rounded border border-slate-700 bg-slate-800 px-1.5 py-1 font-mono text-slate-100 focus:border-emerald-500 focus:outline-none"
              >
                {fieldNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="text-slate-500">→</span>
              <input
                type="text"
                value={p.alias ?? ""}
                placeholder={p.sourceField}
                onChange={(e) =>
                  patchProjection(p.id, {
                    alias: e.target.value === "" ? null : e.target.value,
                  })
                }
                className="nodrag w-24 rounded border border-slate-700 bg-slate-800 px-1.5 py-1 font-mono text-slate-100 placeholder:text-slate-600 focus:border-emerald-500 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeProjection(p.id)}
                aria-label="Remove projection"
                className="nodrag rounded px-1.5 py-0.5 text-slate-500 hover:bg-slate-800 hover:text-rose-400"
              >
                ×
              </button>
            </div>
          ))
        )}
        <button
          type="button"
          onClick={addProjection}
          disabled={fieldNames.length === 0}
          className="nodrag mt-1 w-full rounded border border-emerald-800/60 bg-emerald-950/40 px-2 py-1 text-[11px] text-emerald-300 hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-40"
        >
          + Add projection
        </button>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-emerald-400"
      />
    </div>
  );
}

export default MapNode;
