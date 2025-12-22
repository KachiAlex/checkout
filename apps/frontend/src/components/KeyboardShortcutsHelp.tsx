import { useState } from "react";

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  const shortcuts = [
    { key: "F1", description: "Focus search input" },
    { key: "F2", description: "Focus cart" },
    { key: "F3", description: "Pay with cash" },
    { key: "F4", description: "Pay with card" },
    { key: "F5", description: "Pay with QR" },
    { key: "Delete", description: "Remove last/selected cart item" },
    { key: "Enter", description: "Complete payment (when cart focused)" },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="theme-chip inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition hover:bg-white/10"
        aria-label="Show keyboard shortcuts"
        title="Keyboard shortcuts (?)"
      >
        <span>⌨️</span>
        <span className="hidden sm:inline">Shortcuts</span>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="theme-card w-full max-w-md rounded-3xl border p-6 shadow-2xl">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="theme-text-primary text-xl font-bold">
            Keyboard Shortcuts
          </h2>
          <button
            onClick={() => setIsOpen(false)}
            className="theme-chip rounded-full border p-2 transition hover:bg-white/10"
            aria-label="Close keyboard shortcuts"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3">
          {shortcuts.map((shortcut) => (
            <div
              key={shortcut.key}
              className="theme-surface flex items-center justify-between rounded-xl border p-3"
            >
              <span className="theme-text-secondary text-sm">
                {shortcut.description}
              </span>
              <kbd className="theme-chip rounded-lg border px-3 py-1.5 font-mono text-xs font-semibold">
                {shortcut.key}
              </kbd>
            </div>
          ))}
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="theme-chip mt-6 w-full rounded-full border px-4 py-2 text-sm font-semibold transition hover:bg-white/10"
        >
          Close
        </button>
      </div>
    </div>
  );
}
