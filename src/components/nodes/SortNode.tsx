import { Handle, Position, type NodeProps } from "reactflow";
import { useAppStore } from "@/store";
import { NodeId } from "@/lib/ids";
import type { SortConfig, SortDirection } from "@/lib/pipeline/types";
import type { SchemaShape } from "@/lib/schema/types";

export interface SortNodeData {
  config: SortConfig;
  schema: SchemaShape | null;
}

const DIRECTIONS: readonly SortDirection[] = ["asc", "desc"];

function parseDirection(value: string): SortDirection {
  return value === "desc" ? "desc" : "asc";
}

export function SortNode({ id, data }: NodeProps<SortNodeData>) {
  const updateSortConfig = useAppStore((s) => s.updateSortConfig);
  const { config, schema } = data;
  const fieldNames = schema?.fields.map((f) => f.name) ?? [];

  return (
    <div className="min-w-[220px] rounded-md border border-purple-500 bg-slate-900 text-slate-100 shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-purple-400"
      />
      <header className="border-b border-purple-900/60 bg-purple-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-purple-300">
        Sort
      </header>
      <div className="space-y-2 px-3 py-2 text-xs">
        <label className="block">
          <span className="mb-0.5 block text-slate-400">Field</span>
          <select
            value={config.field ?? ""}
            onChange={(e) =>
              updateSortConfig(NodeId(id), {
                field: e.target.value === "" ? null : e.target.value,
              })
            }
            className="nodrag w-full rounded border border-slate-700 bg-slate-800 px-1.5 py-1 font-mono text-slate-100 focus:border-purple-500 focus:outline-none"
          >
            <option value="">—</option>
            {fieldNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-0.5 block text-slate-400">Direction</span>
          <select
            value={config.direction}
            onChange={(e) =>
              updateSortConfig(NodeId(id), {
                direction: parseDirection(e.target.value),
              })
            }
            className="nodrag w-full rounded border border-slate-700 bg-slate-800 px-1.5 py-1 font-mono text-slate-100 focus:border-purple-500 focus:outline-none"
          >
            {DIRECTIONS.map((d) => (
              <option key={d} value={d}>
                {d === "asc" ? "ascending" : "descending"}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-purple-400"
      />
    </div>
  );
}

export default SortNode;
