import { Handle, Position, type NodeProps } from "reactflow";
import { useAppStore } from "@/store";
import { NodeId } from "@/lib/ids";
import type { LimitConfig } from "@/lib/pipeline/types";

export interface LimitNodeData {
  config: LimitConfig;
}

// Boundary guard: <input type="number"> still emits a string. Empty
// input becomes null in the store (= "not configured yet"); anything
// non-finite or non-positive-integer also becomes null so the store is
// always a valid positive integer or null. Codegen defends a second
// time — see emitLimit — in case a hand-crafted URL state ever sneaks
// in a stale value.
function parseCount(raw: string): number | null {
  if (raw === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) return null;
  return n;
}

export function LimitNode({ id, data }: NodeProps<LimitNodeData>) {
  const updateLimitConfig = useAppStore((s) => s.updateLimitConfig);
  const { config } = data;
  const invalid = config.count === null;

  return (
    <div className="min-w-[220px] rounded-md border border-orange-500 bg-slate-900 text-slate-100 shadow-lg">
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-orange-400"
      />
      <header className="border-b border-orange-900/60 bg-orange-950/60 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-300">
        Limit
      </header>
      <div className="space-y-2 px-3 py-2 text-xs">
        <label className="block">
          <span className="mb-0.5 block text-slate-400">Count</span>
          <input
            type="number"
            min={1}
            step={1}
            value={config.count ?? ""}
            onChange={(e) =>
              updateLimitConfig(NodeId(id), { count: parseCount(e.target.value) })
            }
            placeholder="e.g. 10"
            className={`nodrag w-full rounded border bg-slate-800 px-1.5 py-1 font-mono text-slate-100 placeholder:text-slate-600 focus:outline-none ${
              invalid
                ? "border-rose-600 focus:border-rose-500"
                : "border-slate-700 focus:border-orange-500"
            }`}
          />
        </label>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-orange-400"
      />
    </div>
  );
}

export default LimitNode;
