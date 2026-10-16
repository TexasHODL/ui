/**
 * Shared utility functions for Table components.
 */

import { toast } from "react-toastify";

/** Copy text to the clipboard and show a toast. */
export const copyToClipboard = (text: string, successMessage?: string): void => {
    navigator.clipboard.writeText(text);
    toast.success(successMessage || "Copied to clipboard!");
};
