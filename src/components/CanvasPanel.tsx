import { useCallback, useMemo } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Edge as RfEdge,
  type EdgeChange,
  type Node as RfNode,
  type NodeChange,
} from "reactflow";
import "reactflow/dist/style.css";
import { useAppStore, type Edge as StoreEdge } from "@/store";
import { EdgeId, NodeId } from "@/lib/ids";
import {
  SOURCE_NODE_ID,
  createFilterNode,
  createMapNode,
  type NodePosition,
  type PipelineNode,
} from "@/lib/pipeline/types";
import type { SchemaShape } from "@/lib/schema/types";
import { SourceNode, type SourceNodeData } from "@/components/nodes/SourceNode";
import { FilterNode, type FilterNodeData } from "@/components/nodes/FilterNode";
import { MapNode, type MapNodeData } from "@/components/nodes/MapNode";
import { NodePalette, type PaletteKind } from "@/components/NodePalette";

const nodeTypes = {
  source: SourceNode,
  filter: FilterNode,
  map: MapNode,
};

// Factory lookup keyed by addable kind. `satisfies` checks the shape
// without widening — adding a Sort/Limit factory in Hours 10/11 is a
// one-line change that the compiler will gate against the PaletteKind
// union.
const NODE_FACTORIES = {
  filter: createFilterNode,
  map: createMapNode,
} as const satisfies Record<
  PaletteKind,
  (id: NodeId, position: NodePosition) => PipelineNode
>;

export function CanvasPanel() {
  const parsed = useAppStore((s) => s.schema.parsed);
  const pipelineNodes = useAppStore((s) => s.nodes);
  const pipelineEdges = useAppStore((s) => s.edges);
  const addNode = useAppStore((s) => s.addNode);
  const addEdge = useAppStore((s) => s.addEdge);
  const removeNode = useAppStore((s) => s.removeNode);
  const removeEdge = useAppStore((s) => s.removeEdge);
  const moveNode = useAppStore((s) => s.moveNode);

  // RF runs in controlled mode: nodes/edges are derived directly from
  // the store, no shadow state. Every RF-emitted change commits to the
  // store synchronously inside the handler; React batches the resulting
  // re-render so drag previews stay smooth without a separate local
  // copy that could drift mid-edit.
  const rfNodes = useMemo(
    () => buildRfNodes(parsed, pipelineNodes),
    [parsed, pipelineNodes],
  );
  const rfEdges = useMemo(
    () => buildRfEdges(pipelineEdges),
    [pipelineEdges],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const change of changes) {
        if (
          change.type === "position" &&
          change.position &&
          change.id !== SOURCE_NODE_ID
        ) {
          // Commit on every position emit, not just drag-stop. With no
          // shadow state, RF expects the `position` prop on the next
          // render to reflect the change it just emitted, or the node
          // visually snaps back.
          moveNode(NodeId(change.id), change.position);
        } else if (change.type === "remove" && change.id !== SOURCE_NODE_ID) {
          removeNode(NodeId(change.id));
        }
      }
    },
    [moveNode, removeNode],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const change of changes) {
        if (change.type === "remove") removeEdge(EdgeId(change.id));
      }
    },
    [removeEdge],
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      addEdge({
        id: EdgeId(crypto.randomUUID()),
        source: NodeId(connection.source),
        target: NodeId(connection.target),
      });
    },
    [addEdge],
  );

  const handleAddNode = useCallback(
    (kind: PaletteKind) => {
      const offset = Object.keys(pipelineNodes).length * 30;
      const position: NodePosition = { x: 360 + offset, y: 140 + offset };
      addNode(NODE_FACTORIES[kind](NodeId(crypto.randomUUID()), position));
    },
    [addNode, pipelineNodes],
  );

  return (
    <section className="flex h-full flex-col border-r border-slate-800">
      <header className="border-b border-slate-800 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Canvas
      </header>
      <div className="relative min-h-0 flex-1">
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          proOptions={{ hideAttribution: true }}
          className="bg-slate-950"
        >
          <Background gap={16} size={1} color="#1e293b" />
          <Controls
            className="!border-slate-700 !bg-slate-900 [&>button]:!border-slate-700 [&>button]:!bg-slate-800 [&>button]:!fill-slate-200"
          />
          <MiniMap
            pannable
            zoomable
            className="!bg-slate-900"
            maskColor="rgba(2, 6, 23, 0.7)"
            nodeColor="#1e40af"
          />
        </ReactFlow>
        {parsed && <NodePalette onAdd={handleAddNode} />}
        {!parsed && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-slate-500">
            Define an interface in the Schema panel to begin.
          </div>
        )}
      </div>
    </section>
  );
}

function buildRfNodes(
  schema: SchemaShape | null,
  pipelineNodes: Record<NodeId, PipelineNode>,
): RfNode[] {
  const out: RfNode[] = [];
  if (schema) {
    out.push({
      id: SOURCE_NODE_ID,
      type: "source",
      position: { x: 40, y: 100 },
      data: { schema } satisfies SourceNodeData,
      deletable: false,
    });
  }
  for (const node of Object.values(pipelineNodes)) {
    out.push(pipelineNodeToRfNode(node, schema));
  }
  return out;
}

function pipelineNodeToRfNode(
  node: PipelineNode,
  schema: SchemaShape | null,
): RfNode {
  switch (node.kind) {
    case "filter":
      return {
        id: node.id,
        type: "filter",
        position: { x: node.position.x, y: node.position.y },
        data: { config: node.config, schema } satisfies FilterNodeData,
      };
    case "map":
      return {
        id: node.id,
        type: "map",
        position: { x: node.position.x, y: node.position.y },
        data: { config: node.config, schema } satisfies MapNodeData,
      };
    case "sort":
    case "limit":
      // Default RF node renderer until Hours 10/11 ship the real ones.
      return {
        id: node.id,
        position: { x: node.position.x, y: node.position.y },
        data: { label: node.kind },
      };
    default:
      return assertNeverNode(node);
  }
}

function assertNeverNode(node: never): RfNode {
  throw new Error(`Unhandled node kind: ${JSON.stringify(node)}`);
}

function buildRfEdges(edges: Record<EdgeId, StoreEdge>): RfEdge[] {
  return Object.values(edges).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
  }));
}
