import type { NodeKind } from "@/lib/pipeline/types";

// Subset of NodeKind that the palette can currently add. Limit joins in
// Hour 11.
export type PaletteKind = Extract<NodeKind, "filter" | "map" | "sort">;

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
    </div>
  );
}

type Accent = "blue" | "emerald" | "purple";

interface PaletteButtonProps {
  accent: Accent;
  onClick: () => void;
  children: React.ReactNode;
}

const ACCENT_CLASSES: Record<Accent, string> = {
  blue: "bg-blue-600 hover:bg-blue-500",
  emerald: "bg-emerald-600 hover:bg-emerald-500",
  purple: "bg-purple-600 hover:bg-purple-500",
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
