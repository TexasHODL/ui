import { useEffect, useRef, useCallback } from "react";
import { colors } from "../../utils/colorConfig";

/**
 * Default favicon path - can be overridden via environment variable if needed
 */
const DEFAULT_FAVICON_PATH = "/b52favicon.svg";

/**
 * Musical note frequencies for notification tone
 */
const NOTIFICATION_TONE_A5 = 880; // Hz
const NOTIFICATION_TONE_C6 = 1046.5; // Hz

/**
 * Validation constraints for notification options
 */
const MIN_FLASH_INTERVAL = 200; // milliseconds
const MAX_VOLUME = 1.0;
const MIN_VOLUME = 0.0;

/**
 * Custom hook to provide turn-to-act notifications
 * - Flashes browser tab favicon color when it's the user's turn
 * - Optional audible notification tone
 * - Automatically stops when user returns to tab or turn ends
 */
export const useTurnNotification = (
    isUserTurn: boolean,
    options: {
        enableSound?: boolean;
        soundVolume?: number; // 0 to 1
        flashInterval?: number; // milliseconds between favicon color changes
    } = {}
) => {
    const {
        enableSound = true,
        soundVolume: rawVolume = 0.3,
        flashInterval: rawInterval = 1000
    } = options;

    // Validate and constrain input values
    const soundVolume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, rawVolume));
    const flashInterval = Math.max(MIN_FLASH_INTERVAL, rawInterval);

    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const originalFaviconRef = useRef<string>("");
    const isFlashingRef = useRef<boolean>(false);
    const hasSoundedRef = useRef<boolean>(false);
    const audioContextRef = useRef<AudioContext | null>(null);

    // Store original favicon
    useEffect(() => {
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (favicon) {
            originalFaviconRef.current = favicon.href;
        }
    }, []);

    // Play notification sound using Web Audio API
    const playNotificationSound = useCallback(() => {
        try {
            // Create audio context if it doesn't exist
            if (!audioContextRef.current) {
                const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
                if (!AudioContextClass) {
                    return;
                }
                audioContextRef.current = new AudioContextClass();
            }

            const audioContext = audioContextRef.current;
            
            // Create oscillator for a pleasant notification tone
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            // Configure tone - a pleasant two-note chime
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(NOTIFICATION_TONE_A5, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(NOTIFICATION_TONE_C6, audioContext.currentTime + 0.1);

            // Configure volume envelope
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(soundVolume, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

            // Play the sound
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.3);
        } catch {
            // Audio playback failed - ignore silently
        }
    }, [soundVolume]);

    // Create a colored favicon for notification
    const createColoredFavicon = useCallback(() => {
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
            // Fill entire canvas with brand color for a strong visual flash
            ctx.fillStyle = colors.brand.primary;
            ctx.fillRect(0, 0, 32, 32);
            
            // Add a white border for contrast
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 3;
            ctx.strokeRect(0, 0, 32, 32);
        }
        
        return canvas.toDataURL("image/png");
    }, []);

    // Start flashing the favicon color
    const startFlashing = useCallback(() => {
        if (isFlashingRef.current) return;
        isFlashingRef.current = true;

        const coloredFavicon = createColoredFavicon();
        let isAlternate = false;
        
        intervalRef.current = setInterval(() => {
            const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (favicon) {
                favicon.href = isAlternate ? originalFaviconRef.current : coloredFavicon;
                isAlternate = !isAlternate;
            }
        }, flashInterval);
    }, [flashInterval, createColoredFavicon]);

    // Stop flashing and restore original favicon
    const stopFlashing = useCallback(() => {
        if (!isFlashingRef.current) return;
        isFlashingRef.current = false;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        
        // Restore original favicon
        const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (favicon && originalFaviconRef.current) {
            favicon.href = originalFaviconRef.current;
        }
        
        hasSoundedRef.current = false;
    }, []);

    // Handle user returning to tab
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && isFlashingRef.current) {
                // User returned to tab, stop flashing
                stopFlashing();
            }
        };

        const handleFocus = () => {
            if (isFlashingRef.current) {
                stopFlashing();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("focus", handleFocus);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("focus", handleFocus);
        };
    }, [stopFlashing]);

    // Main effect to handle turn notifications
    useEffect(() => {
        if (isUserTurn && document.hidden) {
            // It's user's turn and they're not on the tab
            startFlashing();

            // Play sound once when turn starts
            if (enableSound && !hasSoundedRef.current) {
                playNotificationSound();
                hasSoundedRef.current = true;
            }
        } else if (!isUserTurn) {
            // Turn ended, stop flashing
            stopFlashing();
        }

        // Cleanup on unmount
        return () => {
            stopFlashing();
        };
    }, [isUserTurn, enableSound, startFlashing, playNotificationSound, stopFlashing]);

    // Cleanup audio context on unmount
    useEffect(() => {
        return () => {
            if (audioContextRef.current) {
                audioContextRef.current.close();
                audioContextRef.current = null;
            }
        };
    }, []);
};

/**
 * Utility function to create a visual notification using favicon
 * 
 * This function draws a notification indicator (colored dot) on the favicon
 * to provide an additional visual cue in the browser tab. This is an alternative
 * or complementary approach to tab title flashing.
 * 
 * Note: Currently not used in the main implementation as tab title flashing
 * provides a more noticeable notification. This function is exported for
 * potential future use or customization by implementers who prefer favicon
 * notification over title flashing.
 * 
 * @param shouldNotify - Whether to show the notification indicator
 * 
 * Usage example:
 * ```typescript
 * useEffect(() => {
 *   createFaviconNotification(isUserTurn && document.hidden);
 * }, [isUserTurn]);
 * ```
 */
export const createFaviconNotification = (shouldNotify: boolean) => {
    const favicon = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    if (!favicon) return;

    if (shouldNotify) {
        // Create a canvas to draw a notification indicator
        const canvas = document.createElement("canvas");
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
            // Draw a colored circle indicator using brand color
            ctx.beginPath();
            ctx.arc(26, 6, 6, 0, 2 * Math.PI);
            ctx.fillStyle = colors.brand.primary;
            ctx.fill();
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        favicon.href = canvas.toDataURL("image/png");
    } else {
        // Reset to original favicon using constant
        favicon.href = DEFAULT_FAVICON_PATH;
    }
};
