import { applyTheme, type ThemeChoice } from "../theme/theme";
import { useAppliedTheme } from "../theme/useTheme";
import styles from "./ThemeToggle.module.css";

function SunIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.1 5.1l1.6 1.6M17.3 17.3l1.6 1.6M18.9 5.1l-1.6 1.6M6.7 17.3l-1.6 1.6" />
            </g>
        </svg>
    );
}

function MoonIcon() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M21 14.6A8.6 8.6 0 0 1 9.4 3 7 7 0 1 0 21 14.6z" />
        </svg>
    );
}

/** Icon-only light/dark control. Sun selects light, moon selects dark. */
export function ThemeToggle() {
    const theme = useAppliedTheme();

    const choose = (next: ThemeChoice) => {
        applyTheme(next);
    };

    return (
        <div className={styles.group} role="group" aria-label="Color theme">
            <button type="button" aria-label="Light theme" aria-pressed={theme === "light"} title="Light theme" onClick={() => choose("light")}>
                <SunIcon />
            </button>
            <button type="button" aria-label="Dark theme" aria-pressed={theme === "dark"} title="Dark theme" onClick={() => choose("dark")}>
                <MoonIcon />
            </button>
        </div>
    );
}
