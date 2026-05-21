// Stub — expanded in Hour 4 (Schema parser).
// Right now `type` is a plain string so the store compiles before the parser
// exists. Hour 4 replaces it with a real union of FieldType variants.

export interface SchemaField {
  name: string;
  type: string;
}

export interface SchemaShape {
  name: string;
  fields: readonly SchemaField[];
}
