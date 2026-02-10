/**
 * Formatting utility functions for the UI
 */

/**
 * Truncates a hash string to show only the beginning and end
 * @param hash - The hash string to truncate
 * @param length - Number of characters to show at each end (default: 8)
 * @returns Truncated hash string or "N/A" if empty
 * @example
 * truncateHash("abcdef1234567890", 4) // "abcd...7890"
 */
export const truncateHash = (hash: string, length: number = 8): string => {
    if (!hash) return "N/A";
    if (hash.length <= length * 2) return hash;
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
};

/**
 * Formats a timestamp as a relative time string (e.g., "5 minutes ago")
 * @param timestamp - ISO timestamp string or Date object
 * @returns Human-readable relative time string
 * @example
 * formatTimestampRelative("2024-01-01T12:00:00Z") // "2 hours ago"
 */
export const formatTimestampRelative = (timestamp: string | Date): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);

    if (diffSecs < 60) return `${diffSecs} second${diffSecs !== 1 ? "s" : ""} ago`;

    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
};

/**
 * Formats a timestamp as a localized date/time string
 * @param timestamp - ISO timestamp string or Date object
 * @returns Localized date/time string
 * @example
 * formatTimestampAbsolute("2024-01-01T12:00:00Z") // "1/1/2024, 12:00:00 PM"
 */
export const formatTimestampAbsolute = (timestamp: string | Date): string => {
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return date.toLocaleString();
};

/**
 * Formats a duration in seconds as MM:SS or HH:MM:SS
 * @param seconds - Duration in seconds
 * @returns Formatted time string
 * @example
 * formatDuration(125) // "02:05"
 * formatDuration(3665) // "01:01:05"
 */
export const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};
