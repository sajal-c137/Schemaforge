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
  type LimitConfig,
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

  const { segments, leafLabels } = planBranches(nodes, edges);
  const header = `export const query = (input: ${schema.name}[]) =>`;

  // 0 segments: no transformations reachable from source. Emit the
  // identity query so the panel always shows valid TS.
  if (segments.length === 0) {
    return `${header} input;\n`;
  }

  // Single linear branch (no fan-out points, exactly one leaf rooted
  // directly at source): emit the clean arrow-expression form. This
  // preserves the pre-branching output for the common case so users
  // don't see a wrapping `{ const branch1 = ...; return { branch1 }; }`
  // for a one-line pipeline.
  const only = segments[0];
  if (
    segments.length === 1 &&
    leafLabels.length === 1 &&
    only !== undefined &&
    only.fromLabel === "input"
  ) {
    return emitLinearForm(header, only.chain, schema);
  }

  // Branching form: every segment becomes a `const`, leaves are
  // collected into a return object.
  return emitBlockForm(header, segments, leafLabels, schema);
}

function emitLinearForm(
  header: string,
  chain: PipelineNode[],
  schema: SchemaShape,
): string {
  const steps: string[] = [];
  for (const node of chain) {
    const step = emitStep(node, schema);
    if (step !== null) steps.push(step);
  }
  if (steps.length === 0) return `${header} input;\n`;
  const lines = [header, indentLine("input", 2)];
  for (const step of steps) lines.push(indentLine(step, 4));
  const lastIndex = lines.length - 1;
  const last = lines[lastIndex];
  if (last !== undefined) lines[lastIndex] = `${last};`;
  return `${lines.join("\n")}\n`;
}

function emitBlockForm(
  header: string,
  segments: Segment[],
  leafLabels: string[],
  schema: SchemaShape,
): string {
  const lines: string[] = [`${header} {`];
  for (const seg of segments) {
    const steps: string[] = [];
    for (const node of seg.chain) {
      const step = emitStep(node, schema);
      if (step !== null) steps.push(step);
    }
    if (steps.length === 0) {
      // Segment is entirely identity steps (e.g. empty Map). Bind
      // through so downstream references resolve.
      lines.push(`  const ${seg.toLabel} = ${seg.fromLabel};`);
      continue;
    }
    if (steps.length === 1) {
      lines.push(`  const ${seg.toLabel} = ${seg.fromLabel}${steps[0]};`);
      continue;
    }
    lines.push(`  const ${seg.toLabel} = ${seg.fromLabel}`);
    for (let i = 0; i < steps.length - 1; i++) {
      const step = steps[i];
      if (step !== undefined) lines.push(indentLine(step, 4));
    }
    const lastStep = steps[steps.length - 1];
    if (lastStep !== undefined) {
      lines.push(`${indentLine(lastStep, 4)};`);
    }
  }
  lines.push(`  return { ${leafLabels.join(", ")} };`);
  lines.push(`};`);
  return `${lines.join("\n")}\n`;
}

// A segment is one straight-line chain of nodes between two anchors.
// `fromLabel` names the expression the chain is rooted on (`input` or
// a previously-bound `stepN`); `toLabel` is the const the segment
// declares (`stepN` for fan-out points, `branchN` for leaves). The
// chain ends with the to-anchor node — its transformation is the last
// method call in the emitted expression.
interface Segment {
  fromLabel: string;
  toLabel: string;
  chain: PipelineNode[];
}

interface BranchPlan {
  segments: Segment[];
  leafLabels: string[];
}

// Walk the edge graph from Source and decompose it into segments
// suitable for emit. A "linear" pipeline produces one segment whose
// chain is the whole pipeline; a "fan-out" pipeline produces one
// segment per anchor-to-anchor span. Multiple incoming edges to a
// single node are silently collapsed (BFS visits each node once) —
// fan-in / merge is explicitly out of scope; Hour 13+ might revisit.
function planBranches(
  nodes: Record<NodeId, PipelineNode>,
  edges: Record<EdgeId, Edge>,
): BranchPlan {
  // Build deduped, deterministically-sorted outgoing adjacency.
  const outgoing = new Map<string, string[]>();
  for (const edge of Object.values(edges)) {
    const list = outgoing.get(edge.source) ?? [];
    if (!list.includes(edge.target)) list.push(edge.target);
    outgoing.set(edge.source, list);
  }
  for (const list of outgoing.values()) list.sort();

  // BFS from source to find all reachable nodes in stable order. The
  // visited-set caps each node at one visit, so multiple incoming
  // edges produce one classification (no double-counting as fan-in).
  const reachableOrder: string[] = [];
  const reachable = new Set<string>([SOURCE_NODE_ID]);
  const queue: string[] = [SOURCE_NODE_ID];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const out = outgoing.get(id) ?? [];
    for (const target of out) {
      if (reachable.has(target)) continue;
      reachable.add(target);
      reachableOrder.push(target);
      queue.push(target);
    }
  }

  // Classify reachable non-source nodes. Anchors get labels; chain-
  // internal nodes (exactly 1 outgoing) stay unlabeled.
  const labels = new Map<string, string>([[SOURCE_NODE_ID, "input"]]);
  const anchorIds: string[] = [SOURCE_NODE_ID];
  const leafLabels: string[] = [];
  let stepCount = 0;
  let leafCount = 0;
  for (const id of reachableOrder) {
    const out = outgoing.get(id) ?? [];
    if (out.length === 0) {
      leafCount++;
      const label = `branch${leafCount}`;
      labels.set(id, label);
      leafLabels.push(label);
      anchorIds.push(id);
    } else if (out.length >= 2) {
      stepCount++;
      labels.set(id, `step${stepCount}`);
      anchorIds.push(id);
    }
  }

  // For each non-leaf anchor, follow every outgoing edge through chain-
  // internal nodes until we hit the next anchor. The to-anchor node is
  // included in the chain so its transformation gets emitted.
  const segments: Segment[] = [];
  for (const anchorId of anchorIds) {
    const fromLabel = labels.get(anchorId);
    if (fromLabel === undefined || fromLabel.startsWith("branch")) continue;
    const out = outgoing.get(anchorId) ?? [];
    for (const startId of out) {
      const chain: PipelineNode[] = [];
      const localVisited = new Set<string>();
      let current: string | undefined = startId;
      // Bounded by reachable count; the localVisited set guards against
      // any cycle the BFS might have permitted via stale edges.
      while (current !== undefined && !localVisited.has(current)) {
        localVisited.add(current);
        const node = nodes[current as NodeId];
        if (!node) break;
        chain.push(node);
        if (labels.has(current)) break;
        current = (outgoing.get(current) ?? [])[0];
      }
      const last = chain[chain.length - 1];
      if (!last || !labels.has(last.id)) continue;
      segments.push({
        fromLabel,
        toLabel: labels.get(last.id)!,
        chain,
      });
    }
  }

  return { segments, leafLabels };
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
      return emitLimit(node.config);
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

function emitLimit(config: LimitConfig): string {
  const { count } = config;
  // Second line of defense: LimitNode.tsx's parseCount already gates the
  // store to `number | null` and rejects non-integers / non-positives.
  // The codegen re-validates so a malformed URL state (Hour 14) or a
  // future schema migration can never emit broken TS.
  if (count === null || !Number.isInteger(count) || count < 1) {
    return ".slice(0) /* TODO: configure limit */";
  }
  return `.slice(0, ${count})`;
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
