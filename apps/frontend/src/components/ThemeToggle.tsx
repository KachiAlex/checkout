import { useEffect } from "react";
import { useThemeStore } from "../stores/themeStore";

const sunIcon = (
  <span role="img" aria-hidden>
    ☀️
  </span>
);

const moonIcon = (
  <span role="img" aria-hidden>
    🌙
  </span>
);

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore();

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }
  }, [theme]);

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
    >
      {theme === "dark" ? sunIcon : moonIcon}
      <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
