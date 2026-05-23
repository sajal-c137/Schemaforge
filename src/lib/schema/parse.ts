import ts from "typescript";
import type { FieldType, SchemaField, SchemaShape } from "./types";

export interface ParseResult {
  schema: SchemaShape | null;
  error: string | null;
}

export function parseSchema(source: string): ParseResult {
  const file = ts.createSourceFile(
    "schema.ts",
    source,
    ts.ScriptTarget.Latest,
    /*setParentNodes*/ false,
    ts.ScriptKind.TS,
  );

  let target: ts.InterfaceDeclaration | undefined;
  for (const stmt of file.statements) {
    if (ts.isInterfaceDeclaration(stmt)) {
      target = stmt;
      break;
    }
  }

  if (!target) {
    return {
      schema: null,
      error:
        "No interface declaration found. Define one with `interface Name { ... }`.",
    };
  }

  const fields: SchemaField[] = [];
  for (const member of target.members) {
    // PropertySignature is the only member kind we care about. Skip method
    // signatures, index signatures, call signatures, etc.
    if (!ts.isPropertySignature(member)) continue;
    if (!ts.isIdentifier(member.name)) continue; // skip computed/string-literal names
    if (!member.type) continue; // skip fields without an annotation

    fields.push({
      name: member.name.text,
      optional: member.questionToken !== undefined,
      type: typeNodeToFieldType(member.type, file),
    });
  }

  return {
    schema: { name: target.name.text, fields },
    error: null,
  };
}

function typeNodeToFieldType(node: ts.TypeNode, file: ts.SourceFile): FieldType {
  switch (node.kind) {
    case ts.SyntaxKind.StringKeyword:
      return { kind: "primitive", name: "string" };
    case ts.SyntaxKind.NumberKeyword:
      return { kind: "primitive", name: "number" };
    case ts.SyntaxKind.BooleanKeyword:
      return { kind: "primitive", name: "boolean" };
  }

  if (ts.isArrayTypeNode(node)) {
    return { kind: "array", element: typeNodeToFieldType(node.elementType, file) };
  }

  if (
    ts.isTypeReferenceNode(node) &&
    ts.isIdentifier(node.typeName) &&
    node.typeName.text === "Array"
  ) {
    const arg = node.typeArguments?.[0];
    if (arg) return { kind: "array", element: typeNodeToFieldType(arg, file) };
  }

  return { kind: "unknown", raw: node.getText(file) };
}
