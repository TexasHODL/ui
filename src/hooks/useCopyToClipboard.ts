import { useCallback, useRef, useState } from "react";

import { copyToClipboard } from "../utils/clipboard";

/**
 * Clipboard copy with transient "copied" feedback for showing a tick / "Copied!"
 * label. Wraps {@link copyToClipboard} (which handles the write, toast, and
 * error logging) and adds the short-lived `copied` flag.
 *
 * @param resetDelayMs - how long `copied` stays `true` after a successful copy
 * @returns `copy(text, successMessage?)` and a `copied` flag
 */
export const useCopyToClipboard = (resetDelayMs: number = 2000) => {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const copy = useCallback(
        async (text: string, successMessage?: string): Promise<boolean> => {
            const ok = await copyToClipboard(text, successMessage);
            if (ok) {
                setCopied(true);
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => setCopied(false), resetDelayMs);
            }
            return ok;
        },
        [resetDelayMs]
    );

    return { copy, copied };
};
