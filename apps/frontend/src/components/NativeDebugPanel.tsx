import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useDebugLogStore } from "../stores/debugLogStore";

const isNativePlatform =
  typeof Capacitor?.isNativePlatform === "function"
    ? Capacitor.isNativePlatform()
    : Capacitor?.getPlatform?.() !== "web";

export function NativeDebugPanel() {
  const logs = useDebugLogStore((state) => state.logs);
  const clearLogs = useDebugLogStore((state) => state.clearLogs);
  const [open, setOpen] = useState(false);

  if (!isNativePlatform) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[9999] flex flex-col items-end gap-2">
      <button
        type="button"
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-sky-400/60 bg-sky-500/90 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-900/50 transition hover:bg-sky-500"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Hide Debug" : "Show Debug"}
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem]">
          {logs.length}
        </span>
      </button>

      {open && (
        <div className="pointer-events-auto w-[min(90vw,360px)] max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 p-3 text-[11px] text-slate-100 shadow-2xl shadow-black/70 backdrop-blur-md">
          <div className="mb-2 flex items-center justify-between text-[0.7rem] uppercase tracking-wider text-slate-300">
            <span>Debug Console</span>
            <button
              type="button"
              className="rounded-full border border-white/20 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-100 transition hover:border-white/40"
              onClick={clearLogs}
            >
              Clear
            </button>
          </div>

          {logs.length === 0 ? (
            <p className="text-xs text-slate-400">No debug entries yet.</p>
          ) : (
            <ul className="space-y-2">
              {logs.map((entry) => (
                <li key={entry.id} className="rounded-xl bg-white/5 p-2">
                  <p className="text-[0.65rem] text-slate-400">
                    {new Date(entry.timestamp).toLocaleString()}
                  </p>
                  <p className="mt-1 font-semibold text-slate-100">
                    {entry.message}
                  </p>
                  {entry.payload !== undefined && (
                    <pre className="mt-1 overflow-x-auto rounded-md bg-black/40 p-2 text-[0.65rem] text-emerald-200">
                      {JSON.stringify(entry.payload, null, 2)}
                    </pre>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
