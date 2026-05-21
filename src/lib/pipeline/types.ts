import type { NodeId } from "@/lib/ids";

export type PipelineNode =
  | { id: NodeId; kind: "filter" }
  | { id: NodeId; kind: "map" }
  | { id: NodeId; kind: "sort" }
  | { id: NodeId; kind: "limit" };

export type NodeKind = PipelineNode["kind"];
