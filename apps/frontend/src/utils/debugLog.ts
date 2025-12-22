import { useDebugLogStore } from "../stores/debugLogStore";

export function debugLog(message: string, payload?: unknown) {
  try {
    useDebugLogStore.getState().addLog(message, payload);
  } catch (error) {
    // Fallback to console in case Zustand store hasn't initialised yet
    console.debug("[debugLog]", message, payload, error);
  }
}
