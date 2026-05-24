import { Handle, Position, type NodeProps } from "reactflow";
import type { FieldType, SchemaShape } from "@/lib/schema/types";

export interface SourceNodeData {
  schema: SchemaShape;
}

export function SourceNode({ data }: NodeProps<SourceNodeData>) {
  const { schema } = data;
  return (
    <div className="min-w-[220px] rounded-md border border-slate-500 bg-slate-900 text-slate-100 shadow-lg">
      <header className="border-b border-slate-700 bg-slate-800 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
        Source · {schema.name}
      </header>
      <ul className="space-y-0.5 px-3 py-2 text-xs">
        {schema.fields.map((f) => (
          <li key={f.name} className="flex justify-between gap-3 font-mono">
            <span className="text-slate-200">
              {f.name}
              {f.optional ? "?" : ""}
            </span>
            <span className="text-slate-500">{renderType(f.type)}</span>
          </li>
        ))}
        {schema.fields.length === 0 && (
          <li className="text-slate-500 italic">(no fields)</li>
        )}
      </ul>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-slate-400"
      />
    </div>
  );
}

function renderType(t: FieldType): string {
  switch (t.kind) {
    case "primitive":
      return t.name;
    case "array":
      return `${renderType(t.element)}[]`;
    case "unknown":
      return t.raw;
  }
}

export default SourceNode;
