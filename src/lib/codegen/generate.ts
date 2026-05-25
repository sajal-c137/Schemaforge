// Pure, deterministic code generator. No I/O, no Date.now(), no
// randomness — same inputs always produce the same string. This matters
// because the output appears live in a Monaco panel and (in Hour 14)
// gets round-tripped through URL state.

import type { EdgeId, NodeId } from "@/lib/ids";
import type { FieldType, SchemaShape } from "@/lib/schema/types";
import {
  SOURCE_NODE_ID,
  type Edge,
  type FilterConfig,
  type MapConfig,
  type PipelineNode,
  type SortConfig,
} from "@/lib/pipeline/types";
import { assertNever } from "@/lib/assert";
import {
  escapeStringLiteral,
  indentLine,
  propertyKey,
} from "@/lib/codegen/format";

export interface GenerateInput {
  schema: SchemaShape | null;
  nodes: Record<NodeId, PipelineNode>;
  edges: Record<EdgeId, Edge>;
}

const PLACEHOLDER_NO_SCHEMA =
  "// Define a TypeScript interface in the Schema panel to begin.\n";

export function generateCode({ schema, nodes, edges }: GenerateInput): string {
  if (!schema) return PLACEHOLDER_NO_SCHEMA;

  const chain = walkPipeline(nodes, edges);
  const steps: string[] = [];
  for (const node of chain) {
    const step = emitStep(node, schema);
    if (step !== null) steps.push(step);
  }

  const header = `export const query = (input: ${schema.name}[]) =>`;
  if (steps.length === 0) {
    return `${header} input;\n`;
  }

  const lines = [header, indentLine("input", 2)];
  for (const step of steps) lines.push(indentLine(step, 4));
  // Tack the trailing semicolon onto the final method call so the
  // emitted statement is well-formed without an extra dangling line.
  const lastIndex = lines.length - 1;
  const last = lines[lastIndex];
  if (last !== undefined) lines[lastIndex] = `${last};`;
  return `${lines.join("\n")}\n`;
}

// Walk forward from the Source node along outgoing edges, returning the
// linear chain of pipeline nodes the codegen will emit. A pipeline with
// branches is collapsed to the first child by deterministic id sort —
// real branching is out of scope for v1.
function walkPipeline(
  nodes: Record<NodeId, PipelineNode>,
  edges: Record<EdgeId, Edge>,
): PipelineNode[] {
  const outgoing = new Map<string, string[]>();
  for (const edge of Object.values(edges)) {
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge.target);
    outgoing.set(edge.source, list);
  }
  // Sort each adjacency list so traversal order is independent of the
  // insertion order in the edges record.
  for (const list of outgoing.values()) list.sort();

  const chain: PipelineNode[] = [];
  const visited = new Set<string>();
  let current: string = SOURCE_NODE_ID;
  // Bounded by node count: every iteration consumes one fresh node id
  // or stops, so this cannot loop forever even on malformed input.
  while (true) {
    const next = outgoing.get(current);
    if (!next || next.length === 0) break;
    const targetId = next[0];
    if (targetId === undefined || visited.has(targetId)) break;
    visited.add(targetId);
    const node = nodes[targetId as NodeId];
    if (!node) break;
    chain.push(node);
    current = targetId;
  }
  return chain;
}

// Returns a single line like `.filter((row) => row.age > 18)`, or null
// when the step is a no-op (e.g. an empty Map = identity projection).
function emitStep(node: PipelineNode, schema: SchemaShape): string | null {
  // The `default` arm is the exhaustiveness check: if a new kind is added
  // to PipelineNode, `node` is no longer narrowed to `never` here and
  // `assertNever` fails to type-check, surfacing the missing case at the
  // compile step. Putting it inside the switch (not after) avoids the
  // TS7027 "unreachable code" hint that fires on dead code below an
  // already-exhaustive switch.
  switch (node.kind) {
    case "filter":
      return emitFilter(node.config, schema);
    case "map":
      return emitMap(node.config);
    case "sort":
      return emitSort(node.config, schema);
    case "limit":
      return "// .slice(0, n) — Limit node arrives in Hour 11";
    default:
      return assertNever(node);
  }
}

function emitFilter(config: FilterConfig, schema: SchemaShape): string {
  const { field, operator, value } = config;
  if (field === null || operator === null) {
    return ".filter(() => true) /* TODO: configure filter */";
  }
  const fieldType = lookupFieldType(schema, field);
  if (fieldType === null) {
    return `.filter(() => true) /* unknown field: ${field} */`;
  }
  const literal = coerceFilterValue(value, fieldType);
  if (operator === "includes") {
    // String#includes — Hour 12 will restrict this operator to string
    // fields in the UI; until then we emit it as the user picked.
    return `.filter((row) => row.${field}.includes(${literal}))`;
  }
  return `.filter((row) => row.${field} ${operator} ${literal})`;
}

function emitMap(config: MapConfig): string | null {
  const { projections } = config;
  // Empty projections is the identity map — emit nothing rather than a
  // useless `.map((row) => ({ }))` that would erase every field.
  if (projections.length === 0) return null;
  const props = projections.map((p) => {
    const key = p.alias && p.alias.length > 0 ? p.alias : p.sourceField;
    return `${propertyKey(key)}: row.${p.sourceField}`;
  });
  return `.map((row) => ({ ${props.join(", ")} }))`;
}

function emitSort(config: SortConfig, schema: SchemaShape): string {
  const { field, direction } = config;
  if (field === null) {
    return ".sort(() => 0) /* TODO: configure sort */";
  }
  const type = lookupFieldType(schema, field);
  if (type === null) {
    return `.sort(() => 0) /* unknown field: ${field} */`;
  }
  const body = comparatorForField(field, type);
  // For descending order, negate the comparator. Wrap in parens so the
  // sign applies to the whole expression and not just the leading term
  // (e.g. `-(a.x - b.x)` is correct; `-a.x - b.x` would be a bug).
  const expr = direction === "desc" ? `-(${body})` : body;
  return `.sort((a, b) => ${expr})`;
}

// Returns the *body* of an ascending Array#sort comparator for one
// field — the string dropped into `(a, b) => <body>`. emitSort negates
// it for descending, so this only ever produces the ascending form.
// Adding a new FieldType arm (e.g. dates in Hour 13) requires touching
// this switch; the `default: assertNever` makes that a compile error.
function comparatorForField(field: string, type: FieldType): string {
  switch (type.kind) {
    case "primitive":
      switch (type.name) {
        case "number":
          return `a.${field} - b.${field}`;
        case "string":
          return `a.${field}.localeCompare(b.${field})`;
        case "boolean":
          return `Number(a.${field}) - Number(b.${field})`;
        default:
          return assertNever(type.name);
      }
    case "array":
      return `0 /* cannot sort by array field: ${field} */`;
    case "unknown":
      return `0 /* cannot sort by unknown field: ${field} */`;
    default:
      return assertNever(type);
  }
}

// Coerce a raw string from a Filter node's value input into a TS literal
// appropriate for the target field's type. Numbers become numeric
// literals, booleans become `true`/`false`, strings get JSON-escaped.
// Invalid input emits a typed default with a comment so the generated
// code still compiles — codegen runs live as the user types, so throwing
// here would blank the CodePanel.
function coerceFilterValue(raw: string, type: FieldType): string {
  switch (type.kind) {
    case "primitive":
      switch (type.name) {
        case "number": {
          const n = Number(raw);
          if (Number.isFinite(n)) return String(n);
          return `0 /* invalid number: ${escapeStringLiteral(raw)} */`;
        }
        case "boolean":
          if (raw === "true") return "true";
          if (raw === "false") return "false";
          return `false /* invalid boolean: ${escapeStringLiteral(raw)} */`;
        case "string":
          return escapeStringLiteral(raw);
        default:
          return assertNever(type.name);
      }
    case "array":
      // No filter operator is meaningful against an array field in v1;
      // Hour 12 prevents this combination in the UI. Until then emit
      // the raw value as a string so the output stays parseable.
      return escapeStringLiteral(raw);
    case "unknown":
      return escapeStringLiteral(raw);
    default:
      return assertNever(type);
  }
}

function lookupFieldType(
  schema: SchemaShape,
  fieldName: string,
): FieldType | null {
  const field = schema.fields.find((f) => f.name === fieldName);
  return field ? field.type : null;
}
