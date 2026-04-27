import { useEffect, useState } from "react";

const THEMES = [
  { value: "indigo", label: "インディゴ" },
  { value: "green", label: "グリーン" },
  { value: "red", label: "レッド" },
] as const;

type Theme = (typeof THEMES)[number]["value"];

const STORAGE_KEY = "theme";

function applyTheme(theme: Theme) {
  if (theme === "indigo") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("indigo");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved && THEMES.some((t) => t.value === saved)) {
      setTheme(saved);
    }
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as Theme;
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  return (
    <select
      value={theme}
      onChange={handleChange}
      aria-label="テーマカラーを選択"
      className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 cursor-pointer"
    >
      {THEMES.map((t) => (
        <option key={t.value} value={t.value}>
          {t.label}
        </option>
      ))}
    </select>
  );
}
