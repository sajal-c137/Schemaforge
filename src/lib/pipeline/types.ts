import type { EdgeId, NodeId } from "@/lib/ids";

// An edge in the pipeline graph: a directed connection between two nodes.
// Lives here (not in the Zustand store) so the pure codegen module can
// import edge shape without depending on the store.
export interface Edge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
}

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

// A Map node projects each input row to an output row. v1 is structured:
// pick existing source fields, optionally rename them. Computed expressions
// (e.g. `firstName + ' ' + lastName`) are deferred to Hour 13 as a stretch.
// Empty projections = passthrough (identity map, all fields preserved).
export interface MapProjection {
  id: string;
  sourceField: string;
  alias: string | null;
}

export interface MapConfig {
  projections: MapProjection[];
}

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  field: string | null;
  direction: SortDirection;
}

// `count` is `number | null`: null means the user hasn't entered a value
// yet (codegen emits a TODO no-op). The UI input enforces positive
// integers via type/min/step; codegen also defends with an integer/range
// check so a stale/malformed store value can never emit broken code.
export interface LimitConfig {
  count: number | null;
}

export type PipelineNode =
  | { id: NodeId; kind: "filter"; position: NodePosition; config: FilterConfig }
  | { id: NodeId; kind: "map"; position: NodePosition; config: MapConfig }
  | { id: NodeId; kind: "sort"; position: NodePosition; config: SortConfig }
  | { id: NodeId; kind: "limit"; position: NodePosition; config: LimitConfig };

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

export function createMapNode(
  id: NodeId,
  position: NodePosition,
): PipelineNode {
  return {
    id,
    kind: "map",
    position,
    config: { projections: [] },
  };
}

export function createSortNode(
  id: NodeId,
  position: NodePosition,
): PipelineNode {
  return {
    id,
    kind: "sort",
    position,
    config: { field: null, direction: "asc" },
  };
}

export function createLimitNode(
  id: NodeId,
  position: NodePosition,
): PipelineNode {
  return {
    id,
    kind: "limit",
    position,
    config: { count: null },
  };
}
