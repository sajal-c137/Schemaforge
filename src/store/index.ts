import { create } from "zustand";
import type { EdgeId, NodeId } from "@/lib/ids";
import type { SchemaShape } from "@/lib/schema/types";
import type { PipelineNode } from "@/lib/pipeline/types";

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
      return { nodes: next };
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
