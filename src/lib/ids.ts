export type NodeId = string & { readonly __brand: "NodeId" };
export type EdgeId = string & { readonly __brand: "EdgeId" };
export type SchemaId = string & { readonly __brand: "SchemaId" };

export const NodeId = (s: string): NodeId => s as NodeId;
export const EdgeId = (s: string): EdgeId => s as EdgeId;
export const SchemaId = (s: string): SchemaId => s as SchemaId;
