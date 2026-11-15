import React, { useEffect, useRef } from "react";

export interface MobileDrawerShellProps {
    title: string;
    closeLabel: string;
    onClose: () => void;
    testId: string;
    children: React.ReactNode;
}

/**
 * Phone panel chrome shared by the burger menu ("Table settings"), the gear
 * drawer ("Settings") and the mobile Blinds panel: backdrop, frame, header
 * title and close button.
 *
 * It wears the PC Settings / History panel chrome (SettingsPanelShell): the
 * same surface, border, radius, `.settings-heading` header and close button,
 * and a `.settings-content`-padded body. It floats below the banners
 * (--table-banner-end) like every other table dialog, capped to the visible
 * height, and its body scrolls when the content is taller than that
 * (portrait or landscape). Theme tokens only: the --table-bg-gradient-* build
 * colours do not reach it.
 *
 * Click off: the backdrop covers the whole screen, banner included (clear
 * there, dimmed below it), so a tap anywhere outside the panel closes it
 * without also pressing a banner button. Esc closes it too.
 */
export const MobileDrawerShell: React.FC<MobileDrawerShellProps> = ({ title, closeLabel, onClose, testId, children }) => {
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") onCloseRef.current();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    return (
        <>
            <div className="mobile-drawer-backdrop" data-testid={`${testId}-backdrop`} onClick={onClose} />
            <div data-testid={testId} className="mobile-drawer">
                <div className="settings-heading">
                    {/* Same title and close button as the PC Settings panel heading. */}
                    <span className="text-white font-semibold text-sm">{title}</span>
                    <button onClick={onClose} aria-label={closeLabel} className="mobile-drawer-close w-9 h-9 rounded-lg text-gray-300 hover:bg-white/10">
                        {"\u2715"}
                    </button>
                </div>
                <div className="mobile-drawer-content">{children}</div>
            </div>
        </>
    );
};