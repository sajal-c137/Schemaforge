// Small formatting helpers for code generation. Pure functions only —
// any change to whitespace/quoting policy lives here so generate.ts can
// stay focused on pipeline semantics.

export function escapeStringLiteral(value: string): string {
  // JSON.stringify produces a valid JS string literal with all the
  // escaping (quotes, backslashes, control chars) handled. The output is
  // a superset of valid TS string literals.
  return JSON.stringify(value);
}

// A conservative ASCII identifier check. Anything that doesn't match is
// emitted as a quoted property key instead, which is always valid.
export function isSafeIdentifier(name: string): boolean {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name);
}

// Property key for an object literal: bare identifier if safe, quoted
// string otherwise. `{ ok: 1 }` vs `{ "with space": 1 }`.
export function propertyKey(name: string): string {
  return isSafeIdentifier(name) ? name : escapeStringLiteral(name);
}

export function indentLine(line: string, spaces: number): string {
  return line.length > 0 ? " ".repeat(spaces) + line : line;
}
