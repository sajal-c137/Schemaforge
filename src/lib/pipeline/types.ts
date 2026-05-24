import type { NodeId } from "@/lib/ids";

// React Flow needs a position for every visible node. We store position
// on the PipelineNode itself (not in a separate UI slice) so URL state
// in Hour 14 round-trips the visual layout along with the pipeline shape.
export interface NodePosition {
  readonly x: number;
  readonly y: number;
}

export type FilterOperator =
  | "==="
  | "!=="
  | ">"
  | ">="
  | "<"
  | "<="
  | "includes";

export interface FilterConfig {
  field: string | null;
  operator: FilterOperator | null;
  value: string;
}

export type PipelineNode =
  | { id: NodeId; kind: "filter"; position: NodePosition; config: FilterConfig }
  | { id: NodeId; kind: "map"; position: NodePosition }
  | { id: NodeId; kind: "sort"; position: NodePosition }
  | { id: NodeId; kind: "limit"; position: NodePosition };

export type NodeKind = PipelineNode["kind"];

export const FILTER_OPERATORS: readonly FilterOperator[] = [
  "===",
  "!==",
  ">",
  ">=",
  "<",
  "<=",
  "includes",
];

export const SOURCE_NODE_ID = "__source";

// Factory: every fresh filter node starts with an empty config. We do this
// in one place so the default shape is consistent and a future config
// change (e.g. adding `negate: boolean`) needs updating only here.
export function createFilterNode(
  id: NodeId,
  position: NodePosition,
): PipelineNode {
  return {
    id,
    kind: "filter",
    position,
    config: { field: null, operator: null, value: "" },
  };
}
