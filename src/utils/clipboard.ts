import { toast } from "react-toastify";

/**
 * Copy text to the clipboard and surface a toast.
 *
 * Centralizes the `navigator.clipboard.writeText` + toast + error-handling
 * pattern that was reimplemented across the app. Safe to call from any context
 * (components, hooks, plain utils).
 *
 * @param text - the text to copy
 * @param successMessage - toast shown on success (defaults to a generic message)
 * @returns `true` on success, `false` if the clipboard write failed
 */
export const copyToClipboard = async (text: string, successMessage: string = "Copied to clipboard!"): Promise<boolean> => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success(successMessage);
        return true;
    } catch (error) {
        console.error("Failed to copy to clipboard:", error);
        toast.error("Failed to copy to clipboard");
        return false;
    }
};
