import { useCallback, useEffect } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useEdgesState,
  useNodesState,
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
  type PipelineNode,
} from "@/lib/pipeline/types";
import type { SchemaShape } from "@/lib/schema/types";
import { SourceNode, type SourceNodeData } from "@/components/nodes/SourceNode";
import { FilterNode, type FilterNodeData } from "@/components/nodes/FilterNode";

const nodeTypes = {
  source: SourceNode,
  filter: FilterNode,
};

export function CanvasPanel() {
  const parsed = useAppStore((s) => s.schema.parsed);
  const pipelineNodes = useAppStore((s) => s.nodes);
  const pipelineEdges = useAppStore((s) => s.edges);
  const addNode = useAppStore((s) => s.addNode);
  const addEdge = useAppStore((s) => s.addEdge);
  const removeNode = useAppStore((s) => s.removeNode);
  const removeEdge = useAppStore((s) => s.removeEdge);
  const moveNode = useAppStore((s) => s.moveNode);

  // Local RF state shadows the store so drag/select feel snappy. The two
  // effects below keep them aligned on store-driven changes; the
  // handler callbacks below push RF-originated changes back into the store.
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<RfNode["data"]>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    setRfNodes(buildRfNodes(parsed, pipelineNodes));
  }, [parsed, pipelineNodes, setRfNodes]);

  useEffect(() => {
    setRfEdges(buildRfEdges(pipelineEdges));
  }, [pipelineEdges, setRfEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      for (const change of changes) {
        if (
          change.type === "position" &&
          change.position &&
          change.dragging === false &&
          change.id !== SOURCE_NODE_ID
        ) {
          moveNode(NodeId(change.id), change.position);
        } else if (change.type === "remove" && change.id !== SOURCE_NODE_ID) {
          removeNode(NodeId(change.id));
        }
      }
    },
    [moveNode, onNodesChange, removeNode],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
      for (const change of changes) {
        if (change.type === "remove") removeEdge(EdgeId(change.id));
      }
    },
    [onEdgesChange, removeEdge],
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

  const handleAddFilter = useCallback(() => {
    const offset = Object.keys(pipelineNodes).length * 30;
    addNode(
      createFilterNode(NodeId(crypto.randomUUID()), {
        x: 360 + offset,
        y: 140 + offset,
      }),
    );
  }, [addNode, pipelineNodes]);

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
        <button
          type="button"
          onClick={handleAddFilter}
          className="absolute right-4 top-4 z-10 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-500"
        >
          + Filter
        </button>
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
  // Exhaustive switch on `kind` — TS will error if a new variant lands
  // without a branch here, because the function would no longer return
  // an RfNode on every path.
  switch (node.kind) {
    case "filter":
      return {
        id: node.id,
        type: "filter",
        position: { x: node.position.x, y: node.position.y },
        data: { config: node.config, schema } satisfies FilterNodeData,
      };
    case "map":
    case "sort":
    case "limit":
      // Default RF node renderer until Hours 6/10/11 ship the real ones.
      return {
        id: node.id,
        position: { x: node.position.x, y: node.position.y },
        data: { label: node.kind },
      };
  }
}

function buildRfEdges(edges: Record<EdgeId, StoreEdge>): RfEdge[] {
  return Object.values(edges).map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: true,
  }));
}
