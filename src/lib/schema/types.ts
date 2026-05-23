// A field's type, as understood by the parser. v1 supports primitives and
// arrays-of-primitives natively; anything else (unions, generics, nested
// object literals, references to user-defined types) falls into `unknown`
// with the original source text preserved for display.
//
// Downstream consumers (validation, codegen) discriminate on `kind` and
// must use the `assertNever` exhaustiveness check when switching.
export type FieldType =
  | { kind: "primitive"; name: "string" | "number" | "boolean" }
  | { kind: "array"; element: FieldType }
  | { kind: "unknown"; raw: string };

export interface SchemaField {
  name: string;
  type: FieldType;
  optional: boolean;
}

export interface SchemaShape {
  name: string;
  fields: readonly SchemaField[];
}
