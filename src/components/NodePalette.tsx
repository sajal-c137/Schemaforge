import type { NodeKind } from "@/lib/pipeline/types";

// Subset of NodeKind the palette can currently add. Kept as Extract<>
// rather than `= NodeKind` so future non-palette kinds (if any) are
// excluded explicitly here instead of silently leaking into the palette.
export type PaletteKind = Extract<
  NodeKind,
  "filter" | "map" | "sort" | "limit"
>;

interface NodePaletteProps {
  onAdd: (kind: PaletteKind) => void;
}

export function NodePalette({ onAdd }: NodePaletteProps) {
  return (
    <div className="absolute right-4 top-4 z-10 flex gap-1.5 rounded-md border border-slate-700 bg-slate-900/90 p-1.5 shadow-lg backdrop-blur">
      <PaletteButton accent="blue" onClick={() => onAdd("filter")}>
        + Filter
      </PaletteButton>
      <PaletteButton accent="emerald" onClick={() => onAdd("map")}>
        + Map
      </PaletteButton>
      <PaletteButton accent="purple" onClick={() => onAdd("sort")}>
        + Sort
      </PaletteButton>
      <PaletteButton accent="orange" onClick={() => onAdd("limit")}>
        + Limit
      </PaletteButton>
    </div>
  );
}

type Accent = "blue" | "emerald" | "purple" | "orange";

interface PaletteButtonProps {
  accent: Accent;
  onClick: () => void;
  children: React.ReactNode;
}

const ACCENT_CLASSES: Record<Accent, string> = {
  blue: "bg-blue-600 hover:bg-blue-500",
  emerald: "bg-emerald-600 hover:bg-emerald-500",
  purple: "bg-purple-600 hover:bg-purple-500",
  orange: "bg-orange-600 hover:bg-orange-500",
};

function PaletteButton({ accent, onClick, children }: PaletteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded px-3 py-1 text-xs font-medium text-white shadow ${ACCENT_CLASSES[accent]}`}
    >
      {children}
    </button>
  );
}
