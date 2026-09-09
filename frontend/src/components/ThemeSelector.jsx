import { PaletteIcon } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";
import { THEMES } from "../constants";

const ThemeSelector = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className="dropdown dropdown-end">
      {/* DROPDOWN TRIGGER */}
      <button
        tabIndex={0}
        className="btn btn-ghost hover:bg-base-300 btn-circle btn-xs sm:btn-sm text-base-content hover:text-base-content transition-colors shrink-0"
        title="Select Theme"
        aria-label="Select theme"
      >
        <PaletteIcon className="size-4 sm:size-5" />
      </button>

      <div
        tabIndex={0}
        className="dropdown-content mt-2 shadow-2xl bg-base-200 border border-base-300 rounded-2xl w-56 sm:w-64 max-w-[calc(100vw-1.5rem)] z-50 backdrop-blur-lg flex flex-col overflow-hidden right-0"
      >
        <div className="px-3 py-2 border-b border-base-300 bg-base-200 shrink-0 flex items-center justify-between">
          <span className="text-xs font-black text-base-content uppercase tracking-wider">
            Themes ({THEMES.length})
          </span>
          <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-primary text-primary-content capitalize">
            {theme}
          </span>
        </div>

        <div className="p-1.5 space-y-1 overflow-y-auto max-h-[300px]">
          {THEMES.map((themeOption) => (
            <button
              key={themeOption.name}
              type="button"
              className={`
              w-full px-3 py-2 rounded-xl flex items-center gap-2.5 transition-colors text-left
              ${
                theme === themeOption.name
                  ? "bg-primary text-primary-content font-bold shadow-xs hover:bg-primary/90 hover:text-primary-content"
                  : "text-base-content hover:bg-base-300 hover:text-base-content font-bold"
              }
            `}
              onClick={() => {
                setTheme(themeOption.name);
                if (document.activeElement && typeof document.activeElement.blur === "function") {
                  document.activeElement.blur();
                }
              }}
            >
              <PaletteIcon className="size-4 shrink-0 opacity-80" />
              <span className="text-xs truncate font-bold">{themeOption.label}</span>
              {/* THEME PREVIEW COLORS */}
              <div className="ml-auto flex gap-1 shrink-0">
                {themeOption.colors.map((color, i) => (
                  <span
                    key={i}
                    className="size-2.5 rounded-full border border-base-content/25 shadow-2xs"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
export default ThemeSelector;
