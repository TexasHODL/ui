import { useEffect, useState } from "react";
import { readAppliedTheme, type ThemeChoice } from "./theme";

/** Tracks the applied theme. The inline script in index.html sets it before paint. */
export function useAppliedTheme(): ThemeChoice {
    const [theme, setTheme] = useState<ThemeChoice>(() => readAppliedTheme());

    useEffect(() => {
        const sync = () => setTheme(readAppliedTheme());
        window.addEventListener("texas-hodl-theme", sync);
        window.addEventListener("storage", sync);
        return () => {
            window.removeEventListener("texas-hodl-theme", sync);
            window.removeEventListener("storage", sync);
        };
    }, []);

    return theme;
}
