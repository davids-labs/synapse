interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
}

export function GraphControls({ onZoomIn, onZoomOut, onZoomToFit }: GraphControlsProps) {
  return (
    <div className="absolute left-4 top-4 flex gap-2">
      <button
        className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-white hover:border-sky-400"
        onClick={onZoomIn}
      >
        +
      </button>
      <button
        className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-white hover:border-sky-400"
        onClick={onZoomOut}
      >
        -
      </button>
      <button
        className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-sm text-white hover:border-sky-400"
        onClick={onZoomToFit}
      >
        Fit
      </button>
    </div>
  );
}
