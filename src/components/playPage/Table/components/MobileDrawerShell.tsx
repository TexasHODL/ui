import React from "react";
import { FaTimes } from "react-icons/fa";
import styles from "./TableHeader.module.css";

export interface MobileDrawerShellProps {
    title: string;
    closeLabel: string;
    onClose: () => void;
    testId: string;
    children: React.ReactNode;
}

/**
 * Right-hand mobile drawer chrome shared by the burger menu ("Table settings"),
 * the gear drawer ("Settings") and the mobile Blinds panel: backdrop, frame,
 * header title and close button. The drawer itself scrolls when its content is
 * taller than the screen (portrait or landscape).
 */
export const MobileDrawerShell: React.FC<MobileDrawerShellProps> = ({ title, closeLabel, onClose, testId, children }) => (
    <>
        <div className="fixed inset-0 z-[1999] bg-black/60" onClick={onClose} />
        <div
            data-testid={testId}
            className={`fixed top-0 right-0 bottom-0 z-[2000] w-[290px] max-w-[85vw] max-h-[100dvh] overflow-y-auto overscroll-contain border-l-2 ${styles.headerRoot}`}
            style={{
                // The last row must clear the home indicator; the top row
                // must clear the Dynamic Island.
                paddingTop: "env(safe-area-inset-top)",
                paddingBottom: "env(safe-area-inset-bottom)",
                paddingRight: "env(safe-area-inset-right)",
                WebkitOverflowScrolling: "touch",
                touchAction: "pan-y"
            }}
        >
            <div className="min-h-full flex flex-col">
                <div className="flex items-center justify-between pl-4 min-h-[44px] border-b border-white/10">
                    {/* Same title style as the PC Settings panel heading. */}
                    <span className="text-white text-sm font-semibold">{title}</span>
                    <button onClick={onClose} className="w-11 h-11 flex items-center justify-center text-white hover:opacity-80" aria-label={closeLabel}>
                        <FaTimes size={16} />
                    </button>
                </div>
                {children}
            </div>
        </div>
    </>
);
