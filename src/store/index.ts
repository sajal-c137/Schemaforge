import { create } from "zustand";
import type { EdgeId, NodeId } from "@/lib/ids";
import type { SchemaShape } from "@/lib/schema/types";
import type {
  FilterConfig,
  NodePosition,
  PipelineNode,
} from "@/lib/pipeline/types";

export interface Edge {
  id: EdgeId;
  source: NodeId;
  target: NodeId;
}

export interface SchemaSlice {
  source: string;
  parsed: SchemaShape | null;
  parseError: string | null;
}

export interface AppState {
  schema: SchemaSlice;
  nodes: Record<NodeId, PipelineNode>;
  edges: Record<EdgeId, Edge>;

  setSchemaSource: (src: string) => void;
  setParsedSchema: (parsed: SchemaShape | null, error: string | null) => void;
  addNode: (node: PipelineNode) => void;
  removeNode: (id: NodeId) => void;
  moveNode: (id: NodeId, position: NodePosition) => void;
  updateFilterConfig: (id: NodeId, patch: Partial<FilterConfig>) => void;
  addEdge: (edge: Edge) => void;
  removeEdge: (id: EdgeId) => void;
}

const DEFAULT_SCHEMA = `interface User {
  id: number;
  name: string;
  age: number;
  active: boolean;
}`;

export const useAppStore = create<AppState>((set) => ({
  schema: {
    source: DEFAULT_SCHEMA,
    parsed: null,
    parseError: null,
  },
  nodes: {},
  edges: {},

  setSchemaSource: (src) =>
    set((state) => ({ schema: { ...state.schema, source: src } })),

  setParsedSchema: (parsed, error) =>
    set((state) => ({
      schema: { ...state.schema, parsed, parseError: error },
    })),

  addNode: (node) =>
    set((state) => ({ nodes: { ...state.nodes, [node.id]: node } })),

  removeNode: (id) =>
    set((state) => {
      const next = { ...state.nodes };
      delete next[id];
      // Cascade: drop any edges that referenced this node.
      const nextEdges: Record<EdgeId, Edge> = {};
      for (const [eid, edge] of Object.entries(state.edges) as [EdgeId, Edge][]) {
        if (edge.source !== id && edge.target !== id) nextEdges[eid] = edge;
      }
      return { nodes: next, edges: nextEdges };
    }),

  moveNode: (id, position) =>
    set((state) => {
      const existing = state.nodes[id];
      if (!existing) return state;
      return { nodes: { ...state.nodes, [id]: { ...existing, position } } };
    }),

  updateFilterConfig: (id, patch) =>
    set((state) => {
      const existing = state.nodes[id];
      if (!existing || existing.kind !== "filter") return state;
      return {
        nodes: {
          ...state.nodes,
          [id]: { ...existing, config: { ...existing.config, ...patch } },
        },
      };
    }),

  addEdge: (edge) =>
    set((state) => ({ edges: { ...state.edges, [edge.id]: edge } })),

  removeEdge: (id) =>
    set((state) => {
      const next = { ...state.edges };
      delete next[id];
      return { edges: next };
    }),
}));
