import { Handle, Position, type NodeProps } from "reactflow";
import { useAppStore } from "@/store";
import { NodeId } from "@/lib/ids";
import {
  FILTER_OPERATORS,
  type FilterConfig,
  type FilterOperator,
} from "@/lib/pipeline/types";
import type { SchemaShape } from "@/lib/schema/types";

export interface FilterNodeData {
  config: FilterConfig;
  schema: SchemaShape | null;
}

// Boundary guard: <select> emits arbitrary string. Narrow it back into
// the FilterOperator union (or null) before storing. Hour 12 will further
// restrict which operators show up per field type.
function parseOperator(value: string): FilterOperator | null {
  if (value === "") return null;
  return (FILTER_OPERATORS as readonly string[]).includes(value)
    ? (value as FilterOperator)
    : null;
}

export function FilterNode({ id, data }: NodeProps<FilterNodeData>) {
  const updateFilterConfig = useAppStore((s) => s.updateFilterConfig);
  const { config, schema } = data;
  const fieldNames = schema?.fields.map((f) => f.name) ?? [];

  return (
    <div className="min-w-[220px] rounded-md border border-blue-500 bg-slate-900 text-slate-100 shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-blue-400"
      />
      <header className="border-b border-blue-900/60 bg-blue-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-blue-300">
        Filter
      </header>
      <div className="space-y-2 px-3 py-2 text-xs">
        <label className="block">
          <span className="mb-0.5 block text-slate-400">Field</span>
          <select
            value={config.field ?? ""}
            onChange={(e) =>
              updateFilterConfig(NodeId(id), {
                field: e.target.value === "" ? null : e.target.value,
              })
            }
            className="nodrag w-full rounded border border-slate-700 bg-slate-800 px-1.5 py-1 font-mono text-slate-100 focus:border-blue-500 focus:outline-none"
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
          <span className="mb-0.5 block text-slate-400">Operator</span>
          <select
            value={config.operator ?? ""}
            onChange={(e) =>
              updateFilterConfig(NodeId(id), {
                operator: parseOperator(e.target.value),
              })
            }
            className="nodrag w-full rounded border border-slate-700 bg-slate-800 px-1.5 py-1 font-mono text-slate-100 focus:border-blue-500 focus:outline-none"
          >
            <option value="">—</option>
            {FILTER_OPERATORS.map((op) => (
              <option key={op} value={op}>
                {op}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-0.5 block text-slate-400">Value</span>
          <input
            type="text"
            value={config.value}
            onChange={(e) =>
              updateFilterConfig(NodeId(id), { value: e.target.value })
            }
            placeholder='e.g. 18, "Alice", true'
            className="nodrag w-full rounded border border-slate-700 bg-slate-800 px-1.5 py-1 font-mono text-slate-100 placeholder:text-slate-600 focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-blue-400"
      />
    </div>
  );
}

export default FilterNode;
